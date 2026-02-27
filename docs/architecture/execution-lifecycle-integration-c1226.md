# Execution Lifecycle Integration Spec

> **T-2 Front-Load:** Implementation-ready integration spec for Sprint 3 managed execution.
> **Author:** 🌌 The Frontier (C1226)
> **Date:** 2026-02-27
> **Status:** Proposed
> **Related:** #155, #189, C1196 (Queue), C1216 (Warm Pool), C1225 (Security), C1186 (Metering)

---

## Purpose

This spec is the **integration glue** that connects all Sprint 3 execution components. Individual ADRs define each piece; this spec shows how they work together at runtime with implementation-ready TypeScript code.

**Problem:** We have 5+ excellent specs (Queue, Warm Pool, Security, Metering, Auth-Billing), but no single doc showing the complete execution lifecycle with code-level integration points.

**Solution:** End-to-end execution flow from API request to completion notification, with copy-paste TypeScript for Day 1 implementation.

---

## Architecture Overview

```
                           EXECUTION LIFECYCLE
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │   Client    │──▶│ API Gateway │──▶│    Queue    │──▶│   Worker    │     │
│  │  (Browser)  │   │  (Next.js)  │   │   (Bull)    │   │   Pool      │     │
│  └─────────────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘     │
│                           │                  │                  │           │
│                    ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐   │
│                    │  Middleware │    │   Redis     │    │  Warm Pool  │   │
│                    │  - Auth     │    │  - Jobs     │    │  Manager    │   │
│                    │  - Billing  │    │  - Logs     │    │  (C1216)    │   │
│                    │  - Rate     │    │  - Pub/Sub  │    └──────┬──────┘   │
│                    └─────────────┘    └─────────────┘           │          │
│                                                          ┌──────┴──────┐   │
│                                                          │  Container  │   │
│                                                          │  Executor   │   │
│                                                          │  (gVisor)   │   │
│                                                          │  (C1225)    │   │
│                                                          └──────┬──────┘   │
│                                                                 │          │
│                    ┌────────────────────────────────────────────┴────────┐ │
│                    │                  Storage Layer                       │ │
│                    │  PostgreSQL (state) │ Redis (hot) │ S3 (logs/cold) │ │
│                    └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: API Request (Gateway Layer)

### 1.1 Route Handler

```typescript
// apps/web/src/app/api/dispatch/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { dispatchQueue } from '@/lib/queue/dispatch-queue';
import { checkBillingLimits, recordUsage } from '@/lib/billing/metering';
import { rateLimiter } from '@/lib/middleware/rate-limiter';
import { DispatchRequest, DispatchResponse } from '@/lib/types/dispatch';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest
): Promise<NextResponse<DispatchResponse>> {
  // 1. Auth check (C1195)
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Rate limiting (C1186)
  const rateLimitResult = await rateLimiter.check(
    session.user.id,
    session.user.tier
  );
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
      },
      { status: 429 }
    );
  }

  // 3. Billing check (C1186)
  const billingStatus = await checkBillingLimits(session.user.id);
  if (billingStatus.exceeded) {
    return NextResponse.json(
      {
        error: 'Cycle limit exceeded',
        usage: billingStatus.usage,
        limit: billingStatus.limit,
        upgradeUrl: '/dashboard/billing?upgrade=true',
      },
      { status: 402 }
    );
  }

  // 4. Parse and validate request
  const body = (await req.json()) as DispatchRequest;
  const validation = validateDispatchRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // 5. Create dispatch record
  const dispatch = await prisma.dispatch.create({
    data: {
      userId: session.user.id,
      repoUrl: body.repoUrl,
      role: body.role,
      status: 'queued',
      priority: mapTierToPriority(session.user.tier),
      config: body.config ?? {},
    },
  });

  // 6. Enqueue job (C1196)
  const job = await dispatchQueue.add(
    'dispatch',
    {
      dispatchId: dispatch.id,
      userId: session.user.id,
      repoUrl: body.repoUrl,
      role: body.role,
      tier: session.user.tier,
      config: body.config,
    },
    {
      priority: getPriorityWeight(session.user.tier),
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      timeout: getTimeoutForTier(session.user.tier),
    }
  );

  // 7. Pre-record usage (optimistic, refund on failure)
  await recordUsage(session.user.id, 'dispatch_started', {
    dispatchId: dispatch.id,
    jobId: job.id,
  });

  return NextResponse.json(
    {
      dispatchId: dispatch.id,
      jobId: job.id,
      status: 'queued',
      logsUrl: `/api/dispatch/${dispatch.id}/logs`,
    },
    { status: 202 }
  );
}

// Helper: Map tier to job priority
function mapTierToPriority(tier: string): 'low' | 'normal' | 'high' {
  return tier === 'enterprise' ? 'high' : tier === 'pro' ? 'normal' : 'low';
}

// Helper: Priority weight for Bull queue (lower = higher priority)
function getPriorityWeight(tier: string): number {
  return tier === 'enterprise' ? 1 : tier === 'pro' ? 5 : 10;
}

// Helper: Timeout per tier
function getTimeoutForTier(tier: string): number {
  const timeouts = {
    enterprise: 30 * 60 * 1000,
    pro: 10 * 60 * 1000,
    free: 5 * 60 * 1000,
  };
  return timeouts[tier as keyof typeof timeouts] ?? timeouts.free;
}
```

### 1.2 Middleware Stack

```typescript
// apps/web/src/lib/middleware/dispatch-middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from './rate-limiter';
import { BillingChecker } from './billing-checker';
import { AuditLogger } from './audit-logger';

export type MiddlewareResult =
  | { proceed: true; context: DispatchContext }
  | { proceed: false; response: NextResponse };

export interface DispatchContext {
  userId: string;
  tier: 'free' | 'pro' | 'enterprise';
  remainingCycles: number;
  rateLimit: { remaining: number; resetAt: Date };
}

export async function dispatchMiddleware(
  req: NextRequest,
  session: Session
): Promise<MiddlewareResult> {
  // Layer 1: Rate limiting (per-minute)
  const rateLimit = await RateLimiter.check(session.user.id, session.user.tier);
  if (!rateLimit.allowed) {
    AuditLogger.log('rate_limit_exceeded', { userId: session.user.id });
    return {
      proceed: false,
      response: NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.resetAt },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retrySeconds) },
        }
      ),
    };
  }

  // Layer 2: Billing check (per-month cycles)
  const billing = await BillingChecker.check(session.user.id);
  if (billing.exceeded) {
    AuditLogger.log('billing_limit_exceeded', {
      userId: session.user.id,
      usage: billing.usage,
    });
    return {
      proceed: false,
      response: NextResponse.json(
        {
          error: 'Monthly cycle limit reached',
          usage: billing.usage,
          limit: billing.limit,
        },
        { status: 402 }
      ),
    };
  }

  // Layer 3: Abuse detection (optional, future)
  // const abuse = await AbuseDetector.check(session.user.id, req);

  return {
    proceed: true,
    context: {
      userId: session.user.id,
      tier: session.user.tier as 'free' | 'pro' | 'enterprise',
      remainingCycles: billing.remaining,
      rateLimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt },
    },
  };
}
```

---

## Phase 2: Queue Processing (Bull Layer)

### 2.1 Queue Configuration

```typescript
// apps/web/src/lib/queue/dispatch-queue.ts

import Queue from 'bull';
import { DispatchJob, DispatchResult } from '@/lib/types/dispatch';
import { dispatchWorker } from './dispatch-worker';

// Redis connection from environment
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const dispatchQueue = new Queue<DispatchJob>('dispatch', REDIS_URL, {
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
  },
  settings: {
    maxStalledCount: 2, // Retry stalled jobs twice
    stalledInterval: 30000, // Check for stalled jobs every 30s
  },
});

// Register worker
dispatchQueue.process('dispatch', 5, dispatchWorker); // 5 concurrent workers

// Queue event handlers
dispatchQueue.on('completed', async (job, result: DispatchResult) => {
  console.log(`[Queue] Job ${job.id} completed:`, result.summary);
  await updateDispatchStatus(job.data.dispatchId, 'completed', result);
});

dispatchQueue.on('failed', async (job, error) => {
  console.error(`[Queue] Job ${job?.id} failed:`, error.message);
  if (job) {
    await updateDispatchStatus(job.data.dispatchId, 'failed', {
      error: error.message,
    });
    await refundUsage(job.data.userId, job.data.dispatchId); // Refund on failure
  }
});

dispatchQueue.on('stalled', async job => {
  console.warn(`[Queue] Job ${job.id} stalled, will be retried`);
  await updateDispatchStatus(job.data.dispatchId, 'stalled');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await dispatchQueue.close();
});
```

### 2.2 Worker Implementation

```typescript
// apps/web/src/lib/queue/dispatch-worker.ts

import { Job } from 'bull';
import { DispatchJob, DispatchResult } from '@/lib/types/dispatch';
import { WarmPoolManager } from '../containers/warm-pool-manager';
import { ContainerExecutor } from '../containers/container-executor';
import { LogStreamer } from '../logging/log-streamer';
import { SecurityContextFactory } from '../containers/security-context';

export async function dispatchWorker(
  job: Job<DispatchJob>
): Promise<DispatchResult> {
  const { dispatchId, userId, repoUrl, role, tier, config } = job.data;
  const logStreamer = new LogStreamer(dispatchId);

  // Update status to active
  await job.progress(10);
  await logStreamer.emit(
    'info',
    `Starting dispatch ${dispatchId} for role: ${role ?? 'auto'}`
  );

  // Phase 1: Acquire container from warm pool (C1216)
  const warmPool = WarmPoolManager.getInstance();
  const container = await warmPool.acquire(tier);

  if (!container) {
    // Cold start path
    await logStreamer.emit(
      'info',
      'No warm container available, cold starting...'
    );
    const coldContainer = await ContainerExecutor.coldStart(tier);
    return await executeInContainer(coldContainer, job, logStreamer);
  }

  await logStreamer.emit('info', `Acquired warm container: ${container.id}`);
  await job.progress(20);

  try {
    return await executeInContainer(container, job, logStreamer);
  } finally {
    // Release container back to pool (C1216)
    await warmPool.release(container.id, container.healthy);
  }
}

async function executeInContainer(
  container: Container,
  job: Job<DispatchJob>,
  logStreamer: LogStreamer
): Promise<DispatchResult> {
  const { dispatchId, userId, repoUrl, role, tier, config } = job.data;

  // Phase 2: Apply security context (C1225)
  const securityContext = SecurityContextFactory.create(tier);
  await container.applySecurityContext(securityContext);
  await logStreamer.emit('info', 'Security context applied');
  await job.progress(30);

  // Phase 3: Clone repository
  await logStreamer.emit('info', `Cloning repository: ${repoUrl}`);
  const cloneResult = await container.exec(
    ['git', 'clone', '--depth', '1', repoUrl, '/workspace'],
    { timeout: 60000 }
  );

  if (cloneResult.exitCode !== 0) {
    throw new Error(`Git clone failed: ${cloneResult.stderr}`);
  }
  await job.progress(50);

  // Phase 4: Run dispatch cycle
  await logStreamer.emit(
    'info',
    `Running dispatch cycle for role: ${role ?? 'auto'}`
  );

  const dispatchResult = await container.exec(
    ['ada', 'dispatch', 'run', '--role', role ?? 'auto', '--output', 'json'],
    {
      cwd: '/workspace',
      timeout: getTimeoutForTier(tier),
      onStdout: line => logStreamer.emit('stdout', line),
      onStderr: line => logStreamer.emit('stderr', line),
    }
  );

  await job.progress(90);

  // Phase 5: Parse result
  let result: DispatchResult;
  try {
    result = JSON.parse(dispatchResult.stdout);
  } catch {
    result = {
      dispatchId,
      success: dispatchResult.exitCode === 0,
      cycle: null,
      role: role ?? 'unknown',
      action: dispatchResult.stdout.slice(0, 500),
      duration: Date.now() - job.timestamp,
    };
  }

  await logStreamer.emit(
    'info',
    `Dispatch complete: ${result.success ? '✅' : '❌'}`
  );
  await job.progress(100);

  return result;
}
```

---

## Phase 3: Container Orchestration (Warm Pool + Security)

### 3.1 Warm Pool Manager (C1216 Integration)

```typescript
// apps/web/src/lib/containers/warm-pool-manager.ts

import Docker from 'dockerode';
import { Redis } from 'ioredis';
import { SecurityContextFactory, TierSecurityConfig } from './security-context';

interface WarmContainer {
  id: string;
  tier: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  lastUsed: Date;
  healthy: boolean;
}

interface PoolConfig {
  minSize: number;
  maxSize: number;
  ttlMs: number;
  healthCheckIntervalMs: number;
}

const POOL_CONFIG: Record<string, PoolConfig> = {
  free: { minSize: 2, maxSize: 5, ttlMs: 300000, healthCheckIntervalMs: 30000 },
  pro: { minSize: 3, maxSize: 10, ttlMs: 600000, healthCheckIntervalMs: 30000 },
  enterprise: {
    minSize: 5,
    maxSize: 20,
    ttlMs: 900000,
    healthCheckIntervalMs: 30000,
  },
};

export class WarmPoolManager {
  private static instance: WarmPoolManager;
  private docker: Docker;
  private redis: Redis;
  private pools: Map<string, WarmContainer[]> = new Map();

  private constructor() {
    this.docker = new Docker();
    this.redis = new Redis(process.env.REDIS_URL!);
    this.initializePools();
  }

  static getInstance(): WarmPoolManager {
    if (!WarmPoolManager.instance) {
      WarmPoolManager.instance = new WarmPoolManager();
    }
    return WarmPoolManager.instance;
  }

  /**
   * Acquire a warm container for the given tier.
   * Returns null if no warm container available (triggers cold start).
   */
  async acquire(tier: string): Promise<WarmContainer | null> {
    const pool = this.pools.get(tier) ?? [];
    const container = pool.find(c => c.healthy);

    if (!container) {
      // Emit metric for cold start
      await this.emitMetric('warm_pool_miss', { tier });
      return null;
    }

    // Remove from pool
    this.pools.set(
      tier,
      pool.filter(c => c.id !== container.id)
    );
    container.lastUsed = new Date();

    await this.emitMetric('warm_pool_hit', { tier, containerId: container.id });

    // Trigger background replenishment if below min
    this.replenishIfNeeded(tier);

    return container;
  }

  /**
   * Release a container back to the pool or destroy if unhealthy.
   */
  async release(containerId: string, healthy: boolean): Promise<void> {
    if (!healthy) {
      await this.destroyContainer(containerId);
      return;
    }

    // Reset container state (clear workspace, env)
    await this.resetContainer(containerId);

    // Return to pool if not at max
    const container = await this.getContainerInfo(containerId);
    if (container) {
      const pool = this.pools.get(container.tier) ?? [];
      const config = POOL_CONFIG[container.tier];

      if (pool.length < config.maxSize) {
        container.healthy = true;
        container.lastUsed = new Date();
        pool.push(container);
        this.pools.set(container.tier, pool);
      } else {
        await this.destroyContainer(containerId);
      }
    }
  }

  /**
   * Pre-warm containers to min pool size.
   */
  private async initializePools(): Promise<void> {
    for (const tier of Object.keys(POOL_CONFIG)) {
      const config = POOL_CONFIG[tier];
      this.pools.set(tier, []);

      for (let i = 0; i < config.minSize; i++) {
        const container = await this.createWarmContainer(tier);
        if (container) {
          this.pools.get(tier)!.push(container);
        }
      }

      console.log(
        `[WarmPool] Initialized ${tier} pool with ${this.pools.get(tier)!.length} containers`
      );
    }

    // Start health check loop
    this.startHealthChecks();
  }

  private async createWarmContainer(
    tier: string
  ): Promise<WarmContainer | null> {
    try {
      const securityConfig = SecurityContextFactory.getBaseConfig(tier);
      const container = await this.docker.createContainer({
        Image: 'ada-dispatch:latest',
        Cmd: ['sleep', 'infinity'], // Keep alive
        HostConfig: {
          Memory: securityConfig.memoryLimitMb * 1024 * 1024,
          CpuPeriod: 100000,
          CpuQuota: Math.floor(securityConfig.cpuLimit * 100000),
          ReadonlyRootfs: true,
          SecurityOpt: ['no-new-privileges'],
          CapDrop: ['ALL'],
          Tmpfs: { '/workspace': 'rw,noexec,nosuid,size=512m' },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            'ada-isolated': {
              /* Per C1225 network policy */
            },
          },
        },
      });

      await container.start();

      return {
        id: container.id,
        tier: tier as 'free' | 'pro' | 'enterprise',
        createdAt: new Date(),
        lastUsed: new Date(),
        healthy: true,
      };
    } catch (error) {
      console.error(`[WarmPool] Failed to create ${tier} container:`, error);
      return null;
    }
  }

  private async replenishIfNeeded(tier: string): Promise<void> {
    const pool = this.pools.get(tier) ?? [];
    const config = POOL_CONFIG[tier];

    if (pool.length < config.minSize) {
      // Background replenishment
      setImmediate(async () => {
        const needed = config.minSize - pool.length;
        for (let i = 0; i < needed; i++) {
          const container = await this.createWarmContainer(tier);
          if (container) {
            this.pools.get(tier)!.push(container);
          }
        }
      });
    }
  }

  private startHealthChecks(): void {
    setInterval(async () => {
      for (const [tier, pool] of this.pools) {
        for (const container of pool) {
          const healthy = await this.checkHealth(container.id);
          container.healthy = healthy;

          // Evict unhealthy or expired containers
          const config = POOL_CONFIG[tier];
          const age = Date.now() - container.createdAt.getTime();
          if (!healthy || age > config.ttlMs) {
            await this.destroyContainer(container.id);
            this.pools.set(
              tier,
              pool.filter(c => c.id !== container.id)
            );
          }
        }
      }
    }, 30000); // Every 30s
  }

  private async checkHealth(containerId: string): Promise<boolean> {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      return info.State.Running && !info.State.OOMKilled;
    } catch {
      return false;
    }
  }

  private async resetContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.exec({
      Cmd: ['rm', '-rf', '/workspace/*'],
      AttachStdout: false,
      AttachStderr: false,
    });
  }

  private async destroyContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: 5 });
      await container.remove();
    } catch (error) {
      console.error(
        `[WarmPool] Failed to destroy container ${containerId}:`,
        error
      );
    }
  }

  private async getContainerInfo(
    containerId: string
  ): Promise<WarmContainer | null> {
    for (const [tier, pool] of this.pools) {
      const container = pool.find(c => c.id === containerId);
      if (container) return container;
    }
    // Check Docker directly
    try {
      const info = await this.docker.getContainer(containerId).inspect();
      const tier = info.Config.Labels?.['ada.tier'] ?? 'free';
      return {
        id: containerId,
        tier: tier as 'free' | 'pro' | 'enterprise',
        createdAt: new Date(info.Created),
        lastUsed: new Date(),
        healthy: info.State.Running,
      };
    } catch {
      return null;
    }
  }

  private async emitMetric(
    name: string,
    labels: Record<string, string>
  ): Promise<void> {
    await this.redis.xadd(
      'metrics:warm_pool',
      '*',
      'name',
      name,
      'labels',
      JSON.stringify(labels)
    );
  }
}
```

### 3.2 Security Context (C1225 Integration)

```typescript
// apps/web/src/lib/containers/security-context.ts

export interface TierSecurityConfig {
  memoryLimitMb: number;
  cpuLimit: number; // 0.5 = 50% of one core
  networkPolicy: 'restricted' | 'standard' | 'permissive';
  egressAllowlist: string[];
  maxProcesses: number;
  maxOpenFiles: number;
}

const TIER_SECURITY: Record<string, TierSecurityConfig> = {
  free: {
    memoryLimitMb: 512,
    cpuLimit: 0.5,
    networkPolicy: 'restricted',
    egressAllowlist: [
      'github.com',
      'api.anthropic.com',
      'api.openai.com',
      'registry.npmjs.org',
    ],
    maxProcesses: 50,
    maxOpenFiles: 1024,
  },
  pro: {
    memoryLimitMb: 1024,
    cpuLimit: 1.0,
    networkPolicy: 'standard',
    egressAllowlist: ['*'], // Pro can access any domain
    maxProcesses: 100,
    maxOpenFiles: 4096,
  },
  enterprise: {
    memoryLimitMb: 4096,
    cpuLimit: 2.0,
    networkPolicy: 'permissive',
    egressAllowlist: ['*'],
    maxProcesses: 500,
    maxOpenFiles: 65536,
  },
};

export class SecurityContextFactory {
  static getBaseConfig(tier: string): TierSecurityConfig {
    return TIER_SECURITY[tier] ?? TIER_SECURITY.free;
  }

  static create(tier: string): SecurityContext {
    const config = this.getBaseConfig(tier);
    return new SecurityContext(config);
  }
}

export class SecurityContext {
  constructor(private config: TierSecurityConfig) {}

  /**
   * Apply security context to a running container.
   */
  async applyTo(container: Docker.Container): Promise<void> {
    // cgroups v2 limits
    await container.update({
      Memory: this.config.memoryLimitMb * 1024 * 1024,
      CpuQuota: Math.floor(this.config.cpuLimit * 100000),
      CpuPeriod: 100000,
      PidsLimit: this.config.maxProcesses,
    });

    // Network policy applied via Docker network
    // (Container should already be on the correct network from pool creation)
  }

  /**
   * Get Docker HostConfig for container creation.
   */
  toHostConfig(): Partial<Docker.HostConfig> {
    return {
      Memory: this.config.memoryLimitMb * 1024 * 1024,
      MemorySwap: this.config.memoryLimitMb * 1024 * 1024, // No swap
      CpuPeriod: 100000,
      CpuQuota: Math.floor(this.config.cpuLimit * 100000),
      PidsLimit: this.config.maxProcesses,
      Ulimits: [
        {
          Name: 'nofile',
          Soft: this.config.maxOpenFiles,
          Hard: this.config.maxOpenFiles,
        },
      ],
      ReadonlyRootfs: true,
      SecurityOpt: ['no-new-privileges'],
      CapDrop: ['ALL'],
      CapAdd: ['SETUID', 'SETGID'], // Minimum needed for git
    };
  }
}
```

---

## Phase 4: Logging & Real-Time Updates

### 4.1 Log Streamer (Redis Pub/Sub)

```typescript
// apps/web/src/lib/logging/log-streamer.ts

import { Redis } from 'ioredis';

export type LogLevel = 'info' | 'stdout' | 'stderr' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  dispatchId: string;
}

export class LogStreamer {
  private redis: Redis;
  private channel: string;

  constructor(private dispatchId: string) {
    this.redis = new Redis(process.env.REDIS_URL!);
    this.channel = `logs:${dispatchId}`;
  }

  async emit(level: LogLevel, message: string): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      dispatchId: this.dispatchId,
    };

    // Publish for real-time subscribers
    await this.redis.publish(this.channel, JSON.stringify(entry));

    // Also append to stream for persistence (last 1000 entries)
    await this.redis.xadd(
      `stream:${this.dispatchId}`,
      'MAXLEN',
      '~',
      '1000',
      '*',
      'entry',
      JSON.stringify(entry)
    );
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
```

### 4.2 SSE Endpoint

```typescript
// apps/web/src/app/api/dispatch/[id]/logs/route.ts

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { Redis } from 'ioredis';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Verify ownership
  const dispatch = await prisma.dispatch.findUnique({
    where: { id: params.id, userId: session.user.id },
  });
  if (!dispatch) {
    return new Response('Not found', { status: 404 });
  }

  const redis = new Redis(process.env.REDIS_URL!);
  const channel = `logs:${params.id}`;

  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send historical logs first
      const history = await redis.xrange(
        `stream:${params.id}`,
        '-',
        '+',
        'COUNT',
        100
      );
      for (const [, fields] of history) {
        const entry = fields.find((_, i, arr) => arr[i - 1] === 'entry');
        if (entry) {
          controller.enqueue(encoder.encode(`data: ${entry}\n\n`));
        }
      }

      // Subscribe to real-time updates
      const subscriber = redis.duplicate();
      await subscriber.subscribe(channel);

      subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        }
      });

      // Handle abort
      req.signal.addEventListener('abort', async () => {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
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
```

---

## Phase 5: Metering & Billing Integration (C1186)

### 5.1 Usage Recording

```typescript
// apps/web/src/lib/billing/metering.ts

import { prisma } from '@/lib/prisma';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export interface BillingStatus {
  exceeded: boolean;
  usage: number;
  limit: number;
  remaining: number;
  percentUsed: number;
}

const TIER_LIMITS: Record<string, number> = {
  free: 10,
  pro: 1000,
  enterprise: Infinity,
};

/**
 * Check if user has remaining cycles.
 */
export async function checkBillingLimits(
  userId: string
): Promise<BillingStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });
  const tier = user?.tier ?? 'free';
  const limit = TIER_LIMITS[tier];

  // Get current month usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usage = await prisma.usage.count({
    where: {
      userId,
      event: 'dispatch_completed',
      createdAt: { gte: startOfMonth },
    },
  });

  return {
    exceeded: usage >= limit,
    usage,
    limit,
    remaining: Math.max(0, limit - usage),
    percentUsed: limit === Infinity ? 0 : (usage / limit) * 100,
  };
}

/**
 * Record a usage event.
 */
export async function recordUsage(
  userId: string,
  event: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await prisma.usage.create({
    data: {
      userId,
      event,
      metadata,
    },
  });

  // Increment real-time counter for rate limiting
  const key = `usage:${userId}:${new Date().toISOString().slice(0, 7)}`; // YYYY-MM
  await redis.incr(key);
  await redis.expire(key, 60 * 60 * 24 * 32); // 32 days TTL
}

/**
 * Refund a cycle (on dispatch failure).
 */
export async function refundUsage(
  userId: string,
  dispatchId: string
): Promise<void> {
  await prisma.usage.deleteMany({
    where: {
      userId,
      event: 'dispatch_started',
      metadata: { path: ['dispatchId'], equals: dispatchId },
    },
  });
}
```

### 5.2 Warning Banners

```typescript
// apps/web/src/components/billing/usage-warning.tsx

'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface UsageWarningProps {
  percentUsed: number;
  remaining: number;
  tier: string;
}

export function UsageWarning({ percentUsed, remaining, tier }: UsageWarningProps) {
  if (percentUsed < 80) return null;

  const isHardBlock = percentUsed >= 100;
  const variant = isHardBlock ? 'destructive' : 'warning';

  return (
    <Alert variant={variant} className="mb-4">
      <AlertDescription className="flex items-center justify-between">
        <span>
          {isHardBlock
            ? `You've used all ${tier} cycles this month.`
            : `${remaining} cycles remaining this month (${Math.round(percentUsed)}% used).`}
        </span>
        <Button asChild size="sm" variant={isHardBlock ? 'default' : 'outline'}>
          <Link href="/dashboard/billing?upgrade=true">
            {isHardBlock ? 'Upgrade Now' : 'View Plans'}
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

---

## Phase 6: Completion & Notification

### 6.1 Dispatch Completion Handler

```typescript
// apps/web/src/lib/queue/completion-handler.ts

import { prisma } from '@/lib/prisma';
import { recordUsage } from '@/lib/billing/metering';
import { NotificationService } from '@/lib/notifications';
import { DispatchResult } from '@/lib/types/dispatch';

export async function handleDispatchCompletion(
  dispatchId: string,
  result: DispatchResult
): Promise<void> {
  // 1. Update dispatch record
  await prisma.dispatch.update({
    where: { id: dispatchId },
    data: {
      status: result.success ? 'completed' : 'failed',
      completedAt: new Date(),
      result: result as any,
    },
  });

  // 2. Record successful usage (for billing)
  const dispatch = await prisma.dispatch.findUnique({
    where: { id: dispatchId },
    include: { user: true },
  });

  if (dispatch && result.success) {
    await recordUsage(dispatch.userId, 'dispatch_completed', {
      dispatchId,
      role: result.role,
      cycle: result.cycle,
      duration: result.duration,
    });
  }

  // 3. Send notification (if enabled)
  if (dispatch?.user) {
    await NotificationService.send(dispatch.user.id, {
      type: result.success ? 'dispatch_success' : 'dispatch_failure',
      title: result.success ? 'Dispatch Complete' : 'Dispatch Failed',
      body: result.success
        ? `Cycle ${result.cycle} completed by ${result.role}`
        : `Dispatch failed: ${result.error}`,
      data: { dispatchId, url: `/dashboard/executions/${dispatchId}` },
    });
  }

  // 4. Update user streak (if success)
  if (dispatch && result.success) {
    await updateStreak(dispatch.userId);
  }
}

async function updateStreak(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const lastDispatch = await prisma.dispatch.findFirst({
    where: { userId, status: 'completed' },
    orderBy: { completedAt: 'desc' },
    skip: 1, // Skip current one
  });

  const now = new Date();
  const lastDate = lastDispatch?.completedAt;

  // Streak continues if last dispatch was within 24h
  const streakContinues =
    lastDate && now.getTime() - lastDate.getTime() < 24 * 60 * 60 * 1000;

  await prisma.user.update({
    where: { id: userId },
    data: {
      streak: streakContinues ? { increment: 1 } : 1,
      lastDispatch: now,
    },
  });
}
```

---

## Integration Test Suite

```typescript
// apps/web/tests/integration/execution-lifecycle.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dispatchQueue } from '@/lib/queue/dispatch-queue';
import { WarmPoolManager } from '@/lib/containers/warm-pool-manager';
import { createTestUser, cleanupTestUser } from '../helpers/test-users';

describe('Execution Lifecycle Integration', () => {
  let testUserId: string;

  beforeAll(async () => {
    testUserId = await createTestUser({ tier: 'pro' });
  });

  afterAll(async () => {
    await cleanupTestUser(testUserId);
  });

  it('completes full lifecycle: API → Queue → Container → Completion', async () => {
    // 1. Enqueue job
    const job = await dispatchQueue.add('dispatch', {
      dispatchId: 'test-dispatch-1',
      userId: testUserId,
      repoUrl: 'https://github.com/ada-ai/test-repo',
      role: 'qa',
      tier: 'pro',
      config: {},
    });

    // 2. Wait for completion
    const result = await job.finished();

    // 3. Verify result
    expect(result).toBeDefined();
    expect(result.dispatchId).toBe('test-dispatch-1');
    expect(result.success).toBe(true);
  });

  it('acquires warm container when available', async () => {
    const warmPool = WarmPoolManager.getInstance();
    const container = await warmPool.acquire('pro');

    expect(container).not.toBeNull();
    expect(container?.tier).toBe('pro');
    expect(container?.healthy).toBe(true);

    // Release back to pool
    await warmPool.release(container!.id, true);
  });

  it('refunds usage on dispatch failure', async () => {
    // ... test implementation
  });
});
```

---

## Day-by-Day Integration Guide

| Sprint Day | Component         | Integration Point                          |
| ---------- | ----------------- | ------------------------------------------ |
| Day 1-2    | Auth (C1195)      | Session → Middleware → Billing check       |
| Day 3-4    | Billing (C1186)   | Middleware → Usage check → Rate limit      |
| Day 5      | API Gateway       | Route handler → Dispatch middleware        |
| Day 6      | Queue (C1196)     | Route → Queue → Worker registration        |
| Day 7      | Integration test  | Full middleware stack test                 |
| Day 8      | Warm Pool (C1216) | Worker → Pool acquire → Container executor |
| Day 9      | Logs (this spec)  | Executor → Log streamer → SSE endpoint     |
| Day 10     | UI (C1197)        | SSE client → Log viewer component          |
| Day 11-12  | Completion        | Worker → Completion handler → Notification |
| Day 13-14  | E2E + Polish      | Full lifecycle test + error handling       |

---

## Metrics & Observability

```typescript
// Key metrics to emit (per C1076)
const METRICS = {
  // Warm pool
  'warm_pool.hit': 'Counter - warm container acquired',
  'warm_pool.miss': 'Counter - cold start triggered',
  'warm_pool.size': 'Gauge - current pool size by tier',

  // Execution
  'dispatch.duration': 'Histogram - total execution time',
  'dispatch.queue_time': 'Histogram - time in queue',
  'dispatch.container_time': 'Histogram - time in container',

  // Billing
  'billing.check': 'Counter - billing checks',
  'billing.exceeded': 'Counter - limit exceeded events',
  'rate_limit.hit': 'Counter - rate limit triggers',
};
```

---

## Summary

This spec provides **implementation-ready code** for Sprint 3 execution lifecycle:

1. **API Layer:** Route handler + middleware stack with auth/billing/rate limiting
2. **Queue Layer:** Bull queue setup + worker registration + event handlers
3. **Container Layer:** Warm pool manager + security context application
4. **Logging Layer:** Redis pub/sub + SSE endpoint for real-time logs
5. **Billing Layer:** Usage recording + refunds + warning components
6. **Completion Layer:** Result handling + notifications + streak tracking

All code integrates with existing specs (C1196, C1216, C1225, C1186) and follows Sprint 3 playbook (C1207) day-by-day breakdown.

---

_🌌 The Frontier | C1226 | Execution Lifecycle Integration Spec_
