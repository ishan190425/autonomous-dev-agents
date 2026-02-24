# ADR: Execution Queue and Job System

> Architecture Decision Record for ADA Managed Execution Queue (#189)
> **Author:** 🌌 The Frontier (C1196)
> **Date:** 2026-02-23
> **Status:** Proposed
> **Related Issues:** #155 (SaaS Container), #189 (Managed Execution), #190 (API Gateway)
> **Builds On:** C1066 (Container ADR), C1186 (Usage Metering ADR), C1195 (Auth-Billing Integration Spec)

---

## Context

Sprint 3 infrastructure includes three foundational specs:

1. **Container-per-dispatch ADR (C1066)** — Architecture for isolated execution containers
2. **Usage Metering ADR (C1186)** — Billing, rate limiting, cycle tracking
3. **Auth-Billing-Execution Integration Spec (C1195)** — How Auth/Billing/Execution connect

**Missing piece:** The execution queue system — how dispatch jobs flow from API request to container execution to completion, including:

- Job queue management
- Worker pool orchestration
- Retry and failure handling
- Execution logs and history
- Real-time status updates

This ADR fills that gap with implementation-ready patterns for Sprint 3 Week 1-2.

---

## Decision

Implement a **Redis-backed job queue with Bull** for dispatch orchestration, using a worker pool pattern with exponential backoff retries.

### Why Bull (Redis Queue)?

| Option                 | Pros                                                 | Cons                           | Verdict       |
| ---------------------- | ---------------------------------------------------- | ------------------------------ | ------------- |
| **Bull (Redis)**       | Battle-tested, great DX, built-in retries, dashboard | Single Redis point of failure  | ✅ Selected   |
| BullMQ                 | Newer, TypeScript-native                             | Less ecosystem support         | Alternative   |
| RabbitMQ               | Enterprise-grade, complex routing                    | Overkill for MVP               | Future option |
| AWS SQS                | Managed, scales infinitely                           | Vendor lock-in, higher latency | Cloud option  |
| PostgreSQL SKIP LOCKED | Simple, no extra infra                               | Not designed for job queues    | Rejected      |

**Decision:** Start with Bull on Redis for simplicity and upgrade path to BullMQ/RabbitMQ if needed.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Execution Queue System                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │   API Gateway    │────▶│   Job Producer   │────▶│   Redis Queue    │    │
│  │   /api/dispatch  │     │   (Bull)         │     │   (Bull)         │    │
│  └──────────────────┘     └──────────────────┘     └────────┬─────────┘    │
│                                                              │              │
│                                                              ▼              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        Worker Pool                                    │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │  Worker 1   │  │  Worker 2   │  │  Worker 3   │  │  Worker N   │  │  │
│  │  │  (active)   │  │  (active)   │  │  (idle)     │  │  (idle)     │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────────┘  └─────────────┘  │  │
│  │         │                │                                            │  │
│  └─────────┼────────────────┼────────────────────────────────────────────┘  │
│            │                │                                               │
│            ▼                ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Container Orchestrator                             │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │  │
│  │  │ Dispatch C1196  │  │ Dispatch C1197  │  │ Container Pool     │   │  │
│  │  │ user: abc123    │  │ user: def456    │  │ (warm containers)  │   │  │
│  │  │ role: frontier  │  │ role: qa        │  │                    │   │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────────────────┘   │  │
│  │           │                    │                                     │  │
│  └───────────┼────────────────────┼─────────────────────────────────────┘  │
│              │                    │                                        │
│              ▼                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Persistent Storage                               │   │
│  │  ┌──────────────┐  ┌───────────────┐  ┌────────────────────────┐   │   │
│  │  │ Execution    │  │ Container     │  │  Log Stream            │   │   │
│  │  │ History (DB) │  │ Logs (S3)     │  │  (Redis Pub/Sub)       │   │   │
│  │  └──────────────┘  └───────────────┘  └────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Job Producer

The API Gateway creates dispatch jobs via Bull:

```typescript
// packages/core/src/execution/dispatch-queue.ts

import Bull, { Queue, Job, JobOptions } from 'bull';
import { DispatchJob, DispatchPriority } from './types';

export class DispatchQueue {
  private queue: Queue<DispatchJob>;

  constructor(redisUrl: string) {
    this.queue = new Bull<DispatchJob>('ada-dispatch', redisUrl, {
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed
        removeOnFail: 1000, // Keep last 1000 failed for debugging
        attempts: 3, // 3 retry attempts
        backoff: {
          type: 'exponential',
          delay: 30000, // 30s, 60s, 120s
        },
      },
    });
  }

  async enqueue(job: DispatchJob): Promise<string> {
    const options: JobOptions = {
      priority: this.mapPriority(job.priority),
      jobId: job.dispatchId, // Idempotent — same ID = no duplicate
      timeout: job.timeoutMs ?? 300000, // 5 min default
    };

    const bullJob = await this.queue.add(job, options);
    return bullJob.id.toString();
  }

  async getJob(dispatchId: string): Promise<Job<DispatchJob> | null> {
    return this.queue.getJob(dispatchId);
  }

  async getStatus(dispatchId: string): Promise<DispatchStatus> {
    const job = await this.getJob(dispatchId);
    if (!job) return { status: 'not_found' };

    const state = await job.getState();
    return {
      status: state as DispatchStatus['status'],
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      logs: await this.getLogs(dispatchId),
    };
  }

  private mapPriority(priority: DispatchPriority): number {
    // Lower number = higher priority in Bull
    switch (priority) {
      case 'critical':
        return 1;
      case 'high':
        return 2;
      case 'normal':
        return 3;
      case 'low':
        return 4;
      default:
        return 3;
    }
  }

  async getLogs(dispatchId: string): Promise<string[]> {
    const job = await this.getJob(dispatchId);
    if (!job) return [];
    return job.data.logs ?? [];
  }
}

// Types
export interface DispatchJob {
  dispatchId: string; // Unique ID (uuid)
  userId: string; // User who triggered
  teamId: string; // Team (for billing)
  repoUrl: string; // e.g., "github.com/org/repo"
  role?: string; // Optional: specific role to dispatch
  priority: DispatchPriority; // Queue priority
  timeoutMs?: number; // Max execution time
  triggeredBy: 'manual' | 'cron' | 'webhook';
  triggeredAt: Date;
  metadata?: Record<string, unknown>;
  logs?: string[]; // Accumulated during execution
}

export type DispatchPriority = 'critical' | 'high' | 'normal' | 'low';

export interface DispatchStatus {
  status:
    | 'waiting'
    | 'active'
    | 'completed'
    | 'failed'
    | 'delayed'
    | 'not_found';
  progress?: number;
  attemptsMade?: number;
  failedReason?: string;
  logs?: string[];
}
```

### 2. Worker Pool

Workers consume jobs and execute dispatches:

```typescript
// packages/core/src/execution/dispatch-worker.ts

import Bull, { Job } from 'bull';
import { DispatchJob } from './dispatch-queue';
import { ContainerOrchestrator } from './container-orchestrator';
import { ExecutionLogger } from './execution-logger';
import { UsageRecorder } from '../billing/usage-recorder';

export class DispatchWorker {
  private queue: Bull.Queue<DispatchJob>;
  private orchestrator: ContainerOrchestrator;
  private logger: ExecutionLogger;
  private usageRecorder: UsageRecorder;

  constructor(
    redisUrl: string,
    orchestrator: ContainerOrchestrator,
    logger: ExecutionLogger,
    usageRecorder: UsageRecorder
  ) {
    this.queue = new Bull<DispatchJob>('ada-dispatch', redisUrl);
    this.orchestrator = orchestrator;
    this.logger = logger;
    this.usageRecorder = usageRecorder;
  }

  start(concurrency: number = 5): void {
    this.queue.process(concurrency, async (job: Job<DispatchJob>) => {
      return this.processDispatch(job);
    });

    // Event handlers for monitoring
    this.queue.on('completed', (job, result) => {
      console.log(`✅ Dispatch ${job.id} completed:`, result.summary);
    });

    this.queue.on('failed', (job, err) => {
      console.error(`❌ Dispatch ${job.id} failed:`, err.message);
    });

    this.queue.on('stalled', job => {
      console.warn(`⚠️ Dispatch ${job.id} stalled — will retry`);
    });

    console.log(`🚀 Worker started with concurrency=${concurrency}`);
  }

  private async processDispatch(
    job: Job<DispatchJob>
  ): Promise<DispatchResult> {
    const { data: dispatch } = job;
    const startTime = Date.now();

    // 1. Log start
    await this.log(job, `Starting dispatch ${dispatch.dispatchId}`);
    await this.log(job, `Repo: ${dispatch.repoUrl}`);
    await this.log(job, `Role: ${dispatch.role ?? 'auto (next in rotation)'}`);

    try {
      // 2. Spawn container
      await job.progress(10);
      await this.log(job, 'Spawning execution container...');
      const container = await this.orchestrator.spawn({
        dispatchId: dispatch.dispatchId,
        userId: dispatch.userId,
        teamId: dispatch.teamId,
        repoUrl: dispatch.repoUrl,
        timeoutMs: dispatch.timeoutMs ?? 300000,
      });
      await this.log(job, `Container ${container.id} spawned`);

      // 3. Clone repo
      await job.progress(20);
      await this.log(job, 'Cloning repository...');
      await container.exec('git', [
        'clone',
        '--depth',
        '1',
        dispatch.repoUrl,
        '/workspace',
      ]);
      await this.log(job, 'Repository cloned');

      // 4. Execute dispatch cycle
      await job.progress(40);
      await this.log(job, 'Executing dispatch cycle...');
      const dispatchResult = await container.exec(
        'ada',
        ['dispatch', 'start'],
        {
          cwd: '/workspace',
          stream: true,
          onOutput: line => this.log(job, line),
        }
      );

      // 5. Check result
      await job.progress(80);
      if (dispatchResult.exitCode !== 0) {
        throw new Error(
          `Dispatch failed with exit code ${dispatchResult.exitCode}`
        );
      }

      // 6. Record usage
      const durationMs = Date.now() - startTime;
      await this.usageRecorder.record({
        userId: dispatch.userId,
        teamId: dispatch.teamId,
        dispatchId: dispatch.dispatchId,
        cycleUsed: 1,
        durationMs,
        llmTokensUsed: dispatchResult.tokensUsed ?? 0,
      });
      await this.log(job, `Usage recorded: 1 cycle, ${durationMs}ms`);

      // 7. Cleanup container
      await job.progress(90);
      await container.destroy();
      await this.log(job, 'Container destroyed');

      await job.progress(100);
      return {
        success: true,
        summary: dispatchResult.summary,
        durationMs,
        cycleNumber: dispatchResult.cycleNumber,
      };
    } catch (error) {
      const err = error as Error;
      await this.log(job, `ERROR: ${err.message}`);

      // Record failed attempt for debugging
      await this.logger.recordFailure({
        dispatchId: dispatch.dispatchId,
        error: err.message,
        stack: err.stack,
        attempt: job.attemptsMade + 1,
      });

      throw error; // Let Bull handle retry
    }
  }

  private async log(job: Job<DispatchJob>, message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}`;

    // Append to job data
    job.data.logs = job.data.logs ?? [];
    job.data.logs.push(logLine);

    // Stream to real-time listeners
    await this.logger.stream(job.data.dispatchId, logLine);
  }
}

interface DispatchResult {
  success: boolean;
  summary: string;
  durationMs: number;
  cycleNumber?: number;
}
```

### 3. Container Orchestrator

Manages container lifecycle:

```typescript
// packages/core/src/execution/container-orchestrator.ts

import Docker from 'dockerode';

export class ContainerOrchestrator {
  private docker: Docker;
  private baseImage: string;
  private warmPool: Container[] = [];
  private maxWarmContainers = 5;

  constructor(
    dockerSocket?: string,
    baseImage = 'ada-ai/dispatch-runtime:latest'
  ) {
    this.docker = new Docker({
      socketPath: dockerSocket ?? '/var/run/docker.sock',
    });
    this.baseImage = baseImage;
  }

  async spawn(config: ContainerConfig): Promise<Container> {
    // Try warm pool first
    let container = this.warmPool.pop();

    if (!container) {
      container = await this.createContainer(config);
    } else {
      // Configure warm container for this dispatch
      await container.configure(config);
    }

    return container;
  }

  private async createContainer(config: ContainerConfig): Promise<Container> {
    const containerConfig = {
      Image: this.baseImage,
      name: `ada-dispatch-${config.dispatchId}`,
      Env: [
        `DISPATCH_ID=${config.dispatchId}`,
        `USER_ID=${config.userId}`,
        `TEAM_ID=${config.teamId}`,
        `REPO_URL=${config.repoUrl}`,
      ],
      HostConfig: {
        // Resource limits
        Memory: 2 * 1024 * 1024 * 1024, // 2GB
        CpuPeriod: 100000,
        CpuQuota: 100000, // 1 CPU

        // Security
        SecurityOpt: ['no-new-privileges'],
        ReadonlyRootfs: false, // Need to write to /workspace

        // Mounts
        Mounts: [
          {
            Target: '/mnt/memory',
            Source: `ada-memory-${config.teamId}`,
            Type: 'volume',
            ReadOnly: false,
          },
          {
            Target: '/mnt/credentials',
            Source: `ada-credentials-${config.teamId}`,
            Type: 'volume',
            ReadOnly: true,
          },
        ],

        // Network
        NetworkMode: 'bridge',
      },
      // Auto-remove after stop
      HostConfig: {
        AutoRemove: true,
      },
    };

    const dockerContainer = await this.docker.createContainer(containerConfig);
    await dockerContainer.start();

    return new Container(dockerContainer, config);
  }

  async warmUp(): Promise<void> {
    // Pre-warm containers for faster dispatch starts
    const needed = this.maxWarmContainers - this.warmPool.length;

    for (let i = 0; i < needed; i++) {
      const container = await this.createWarmContainer();
      this.warmPool.push(container);
    }
  }

  private async createWarmContainer(): Promise<Container> {
    const containerConfig = {
      Image: this.baseImage,
      name: `ada-warm-${Date.now()}`,
      Env: ['WARM_POOL=true'],
      HostConfig: {
        Memory: 2 * 1024 * 1024 * 1024,
        CpuPeriod: 100000,
        CpuQuota: 100000,
      },
    };

    const dockerContainer = await this.docker.createContainer(containerConfig);
    await dockerContainer.start();

    return new Container(dockerContainer, {
      dispatchId: 'warm',
      userId: '',
      teamId: '',
      repoUrl: '',
    });
  }
}

class Container {
  private docker: Docker.Container;
  private config: ContainerConfig;

  constructor(docker: Docker.Container, config: ContainerConfig) {
    this.docker = docker;
    this.config = config;
  }

  get id(): string {
    return this.docker.id;
  }

  async configure(config: ContainerConfig): Promise<void> {
    this.config = config;
    // Update environment variables for warm container
    // (In practice, may need to restart or use different approach)
  }

  async exec(
    command: string,
    args: string[],
    options?: ExecOptions
  ): Promise<ExecResult> {
    const exec = await this.docker.exec({
      Cmd: [command, ...args],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: options?.cwd,
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    let stdout = '';
    let stderr = '';

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stdout += text;

        if (options?.stream && options.onOutput) {
          // Stream line by line
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.trim()) options.onOutput(line);
          }
        }
      });

      stream.on('end', async () => {
        const inspect = await exec.inspect();
        resolve({
          exitCode: inspect.ExitCode ?? 0,
          stdout,
          stderr,
          summary: this.extractSummary(stdout),
          tokensUsed: this.extractTokens(stdout),
          cycleNumber: this.extractCycle(stdout),
        });
      });

      stream.on('error', reject);
    });
  }

  private extractSummary(output: string): string {
    // Extract action summary from dispatch output
    const match = output.match(/--action "([^"]+)"/);
    return match?.[1] ?? 'Dispatch completed';
  }

  private extractTokens(output: string): number {
    // Extract token usage if reported
    const match = output.match(/tokens:\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  private extractCycle(output: string): number | undefined {
    const match = output.match(/Cycle (\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  async destroy(): Promise<void> {
    try {
      await this.docker.stop({ t: 5 }); // 5 second grace period
    } catch (e) {
      // Container may already be stopped
    }
    try {
      await this.docker.remove({ force: true });
    } catch (e) {
      // Container may be auto-removed
    }
  }
}

interface ContainerConfig {
  dispatchId: string;
  userId: string;
  teamId: string;
  repoUrl: string;
  timeoutMs?: number;
}

interface ExecOptions {
  cwd?: string;
  stream?: boolean;
  onOutput?: (line: string) => void;
}

interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  summary: string;
  tokensUsed: number;
  cycleNumber?: number;
}
```

### 4. Execution Logger

Real-time log streaming and persistence:

```typescript
// packages/core/src/execution/execution-logger.ts

import Redis from 'ioredis';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class ExecutionLogger {
  private redis: Redis;
  private s3: S3Client;
  private bucket: string;

  constructor(redisUrl: string, s3Config: S3Config) {
    this.redis = new Redis(redisUrl);
    this.s3 = new S3Client(s3Config);
    this.bucket = s3Config.bucket;
  }

  // Stream a log line to real-time subscribers
  async stream(dispatchId: string, line: string): Promise<void> {
    const channel = `dispatch:${dispatchId}:logs`;
    await this.redis.publish(channel, line);

    // Also append to Redis list for recent logs
    const key = `dispatch:${dispatchId}:log-buffer`;
    await this.redis.rpush(key, line);
    await this.redis.expire(key, 3600); // 1 hour TTL
  }

  // Subscribe to real-time logs
  subscribe(dispatchId: string, callback: (line: string) => void): () => void {
    const channel = `dispatch:${dispatchId}:logs`;
    const subscriber = this.redis.duplicate();

    subscriber.subscribe(channel);
    subscriber.on('message', (ch, message) => {
      if (ch === channel) callback(message);
    });

    return () => {
      subscriber.unsubscribe(channel);
      subscriber.disconnect();
    };
  }

  // Get buffered logs (for job status checks)
  async getRecentLogs(dispatchId: string): Promise<string[]> {
    const key = `dispatch:${dispatchId}:log-buffer`;
    return this.redis.lrange(key, 0, -1);
  }

  // Persist logs to S3 after completion
  async persist(
    dispatchId: string,
    userId: string,
    logs: string[]
  ): Promise<string> {
    const key = `logs/${userId}/${dispatchId}.log`;
    const content = logs.join('\n');

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: content,
        ContentType: 'text/plain',
      })
    );

    // Clean up Redis buffer
    await this.redis.del(`dispatch:${dispatchId}:log-buffer`);

    return `s3://${this.bucket}/${key}`;
  }

  // Record failure for debugging
  async recordFailure(failure: DispatchFailure): Promise<void> {
    const key = `dispatch:${failure.dispatchId}:failures`;
    await this.redis.rpush(
      key,
      JSON.stringify({
        ...failure,
        timestamp: new Date().toISOString(),
      })
    );
    await this.redis.expire(key, 86400 * 7); // 7 day TTL
  }
}

interface S3Config {
  region: string;
  bucket: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

interface DispatchFailure {
  dispatchId: string;
  error: string;
  stack?: string;
  attempt: number;
}
```

### 5. Execution History (Database)

```typescript
// packages/core/src/execution/execution-history.ts

import { PrismaClient, Dispatch, DispatchStatus } from '@prisma/client';

export class ExecutionHistory {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(dispatch: CreateDispatchInput): Promise<Dispatch> {
    return this.prisma.dispatch.create({
      data: {
        id: dispatch.dispatchId,
        userId: dispatch.userId,
        teamId: dispatch.teamId,
        repoUrl: dispatch.repoUrl,
        role: dispatch.role,
        triggeredBy: dispatch.triggeredBy,
        status: 'queued',
        queuedAt: new Date(),
      },
    });
  }

  async updateStatus(
    dispatchId: string,
    status: DispatchStatus,
    result?: DispatchResultInput
  ): Promise<Dispatch> {
    const data: any = { status };

    if (status === 'active') {
      data.startedAt = new Date();
    }

    if (status === 'completed' || status === 'failed') {
      data.completedAt = new Date();
      if (result) {
        data.summary = result.summary;
        data.cycleNumber = result.cycleNumber;
        data.durationMs = result.durationMs;
        data.logsUrl = result.logsUrl;
        data.errorMessage = result.errorMessage;
      }
    }

    return this.prisma.dispatch.update({
      where: { id: dispatchId },
      data,
    });
  }

  async getByUser(
    userId: string,
    options?: { limit?: number; offset?: number; status?: DispatchStatus }
  ): Promise<Dispatch[]> {
    return this.prisma.dispatch.findMany({
      where: {
        userId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { queuedAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
  }

  async getById(dispatchId: string): Promise<Dispatch | null> {
    return this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
    });
  }

  async getStats(userId: string, periodStart: Date): Promise<DispatchStats> {
    const [total, successful, failed] = await Promise.all([
      this.prisma.dispatch.count({
        where: { userId, queuedAt: { gte: periodStart } },
      }),
      this.prisma.dispatch.count({
        where: { userId, queuedAt: { gte: periodStart }, status: 'completed' },
      }),
      this.prisma.dispatch.count({
        where: { userId, queuedAt: { gte: periodStart }, status: 'failed' },
      }),
    ]);

    const avgDuration = await this.prisma.dispatch.aggregate({
      where: {
        userId,
        queuedAt: { gte: periodStart },
        status: 'completed',
        durationMs: { not: null },
      },
      _avg: { durationMs: true },
    });

    return {
      total,
      successful,
      failed,
      avgDurationMs: avgDuration._avg.durationMs ?? 0,
      successRate: total > 0 ? successful / total : 0,
    };
  }
}

interface CreateDispatchInput {
  dispatchId: string;
  userId: string;
  teamId: string;
  repoUrl: string;
  role?: string;
  triggeredBy: 'manual' | 'cron' | 'webhook';
}

interface DispatchResultInput {
  summary?: string;
  cycleNumber?: number;
  durationMs?: number;
  logsUrl?: string;
  errorMessage?: string;
}

interface DispatchStats {
  total: number;
  successful: number;
  failed: number;
  avgDurationMs: number;
  successRate: number;
}
```

---

## Retry Strategy

### Exponential Backoff

```typescript
// Default retry configuration
const RETRY_CONFIG = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 30000, // 30s base
  },
  // Retry timeline: 30s → 60s → 120s (total ~3.5 min)
};
```

### Failure Classification

| Failure Type             | Retryable | Action                             |
| ------------------------ | --------- | ---------------------------------- |
| Container spawn timeout  | ✅ Yes    | Retry with fresh container         |
| Git clone failure        | ✅ Yes    | Retry (may be transient network)   |
| Dispatch execution error | ✅ Yes    | Retry (agent may succeed on retry) |
| Memory bank conflict     | ✅ Yes    | Retry with fresh pull              |
| Auth/credential invalid  | ❌ No     | Fail immediately, notify user      |
| Cycle limit exceeded     | ❌ No     | Fail immediately, prompt upgrade   |
| Container OOM killed     | ⚠️ Maybe  | Retry once, then fail              |

### Non-Retryable Error Handling

```typescript
// In dispatch-worker.ts processDispatch()

// Check for non-retryable errors
if (this.isNonRetryable(error)) {
  // Mark job as permanently failed
  throw new Bull.UnrecoverableError(error.message);
}

private isNonRetryable(error: Error): boolean {
  const nonRetryablePatterns = [
    /authentication failed/i,
    /invalid credentials/i,
    /cycle limit exceeded/i,
    /subscription expired/i,
    /access denied/i,
  ];

  return nonRetryablePatterns.some(p => p.test(error.message));
}
```

---

## API Integration

### Dispatch Endpoint

```typescript
// apps/web/src/app/api/v1/dispatch/route.ts

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { authorizeDispatch } from '@ada-ai/core';
import { dispatchQueue, executionHistory } from '@/lib/execution';

export async function POST(req: Request) {
  // 1. Auth (from C1195 integration spec)
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Authorize (from C1195)
  const authResult = authorizeDispatch({
    userId: session.user.id,
    tier: session.user.tier,
    cyclesUsed: session.user.cyclesUsed,
    cyclesLimit: session.user.cyclesLimit,
    periodEnd: new Date(session.user.periodEnd),
  });

  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.reason, upgradeUrl: '/dashboard/billing' },
      { status: 402 }
    );
  }

  // 3. Parse request
  const { repoUrl, role, priority = 'normal' } = await req.json();

  if (!repoUrl) {
    return NextResponse.json({ error: 'repoUrl required' }, { status: 400 });
  }

  // 4. Create dispatch record
  const dispatchId = crypto.randomUUID();
  await executionHistory.create({
    dispatchId,
    userId: session.user.id,
    teamId: session.user.teamId,
    repoUrl,
    role,
    triggeredBy: 'manual',
  });

  // 5. Enqueue job
  await dispatchQueue.enqueue({
    dispatchId,
    userId: session.user.id,
    teamId: session.user.teamId,
    repoUrl,
    role,
    priority,
    triggeredBy: 'manual',
    triggeredAt: new Date(),
  });

  // 6. Return dispatch ID for status polling
  return NextResponse.json({
    dispatchId,
    status: 'queued',
    warning: authResult.warning,
    remainingCycles: authResult.remainingCycles - 1,
  });
}
```

### Status Endpoint

```typescript
// apps/web/src/app/api/v1/dispatch/[id]/route.ts

import { NextResponse } from 'next/server';
import { dispatchQueue, executionHistory } from '@/lib/execution';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const dispatch = await executionHistory.getById(params.id);

  if (!dispatch) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Get real-time status from queue if still active
  let queueStatus = null;
  if (dispatch.status === 'queued' || dispatch.status === 'active') {
    queueStatus = await dispatchQueue.getStatus(params.id);
  }

  return NextResponse.json({
    id: dispatch.id,
    status: queueStatus?.status ?? dispatch.status,
    repoUrl: dispatch.repoUrl,
    role: dispatch.role,
    triggeredBy: dispatch.triggeredBy,
    queuedAt: dispatch.queuedAt,
    startedAt: dispatch.startedAt,
    completedAt: dispatch.completedAt,
    summary: dispatch.summary,
    cycleNumber: dispatch.cycleNumber,
    durationMs: dispatch.durationMs,
    logsUrl: dispatch.logsUrl,
    progress: queueStatus?.progress,
    attemptsMade: queueStatus?.attemptsMade,
    failedReason: queueStatus?.failedReason ?? dispatch.errorMessage,
  });
}
```

### Log Streaming Endpoint

```typescript
// apps/web/src/app/api/v1/dispatch/[id]/logs/route.ts

import { executionLogger } from '@/lib/execution';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  // Check for SSE request
  const accept = req.headers.get('accept');

  if (accept?.includes('text/event-stream')) {
    // Server-Sent Events for real-time streaming
    const stream = new ReadableStream({
      start(controller) {
        const unsubscribe = executionLogger.subscribe(params.id, line => {
          controller.enqueue(`data: ${JSON.stringify({ line })}\n\n`);
        });

        req.signal.addEventListener('abort', () => {
          unsubscribe();
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  // Regular request — return buffered logs
  const logs = await executionLogger.getRecentLogs(params.id);
  return Response.json({ logs });
}
```

---

## Prisma Schema Addition

```prisma
// packages/core/prisma/schema.prisma

model Dispatch {
  id            String         @id @default(uuid())
  userId        String
  teamId        String
  repoUrl       String
  role          String?
  triggeredBy   TriggerType
  status        DispatchStatus @default(QUEUED)
  queuedAt      DateTime       @default(now())
  startedAt     DateTime?
  completedAt   DateTime?
  summary       String?
  cycleNumber   Int?
  durationMs    Int?
  logsUrl       String?
  errorMessage  String?

  user          User           @relation(fields: [userId], references: [id])
  team          Team           @relation(fields: [teamId], references: [id])

  @@index([userId, queuedAt])
  @@index([teamId, queuedAt])
  @@index([status])
}

enum DispatchStatus {
  QUEUED
  ACTIVE
  COMPLETED
  FAILED
}

enum TriggerType {
  MANUAL
  CRON
  WEBHOOK
}
```

---

## Implementation Phases

### Week 1 (Mar 1-7)

- [ ] **Queue Infrastructure**
  - [ ] Set up Bull queue with Redis
  - [ ] Implement DispatchQueue producer
  - [ ] Implement DispatchWorker consumer
  - [ ] Add basic retry logic

- [ ] **Container Orchestrator (MVP)**
  - [ ] Docker container spawn/destroy
  - [ ] Basic exec with output capture
  - [ ] Resource limits (CPU/memory)

### Week 2 (Mar 8-14)

- [ ] **Logging & History**
  - [ ] ExecutionLogger with Redis streaming
  - [ ] S3 log persistence
  - [ ] ExecutionHistory with Prisma
  - [ ] SSE log streaming endpoint

- [ ] **API Endpoints**
  - [ ] POST /api/v1/dispatch
  - [ ] GET /api/v1/dispatch/:id
  - [ ] GET /api/v1/dispatch/:id/logs (SSE)
  - [ ] GET /api/v1/dispatches (list)

### Week 3-4 (Sprint 3 Polish)

- [ ] **Warm Container Pool**
  - [ ] Pre-warm containers for faster starts
  - [ ] Pool management and recycling

- [ ] **Observability**
  - [ ] Prometheus metrics (queue depth, latency, success rate)
  - [ ] Structured logging
  - [ ] Alerting on failures

---

## Success Metrics

| Metric                 | Target  | Measurement                              |
| ---------------------- | ------- | ---------------------------------------- |
| Queue-to-start latency | < 30s   | Time from enqueue to container start     |
| Dispatch success rate  | > 99%   | Completed / (Completed + Failed)         |
| P95 dispatch duration  | < 5 min | Container spawn to completion            |
| Retry effectiveness    | > 80%   | Retried failures that eventually succeed |
| Log streaming latency  | < 1s    | Time from log write to SSE delivery      |

---

## Dependencies

- **Bull** — Redis-backed job queue
- **dockerode** — Docker API client
- **ioredis** — Redis client
- **@aws-sdk/client-s3** — S3 for log storage
- **@prisma/client** — Database ORM

---

## References

- C1066: Container-per-dispatch ADR
- C1186: Usage Metering ADR
- C1195: Auth-Billing-Execution Integration Spec
- #155: SaaS Container (THE PRIORITY)
- #189: Managed Agent Execution
- #190: API Gateway and REST API
- Bull documentation: https://github.com/OptimalBits/bull

---

_This ADR completes the execution infrastructure trilogy for Sprint 3, bridging the container architecture (C1066) and auth/billing integration (C1195) with concrete job queue implementation._
