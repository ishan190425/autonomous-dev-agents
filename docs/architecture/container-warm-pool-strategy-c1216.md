# Container Warm Pool Strategy (C1216)

> **Architecture Specification for Warm Container Pool Management**
> Author: 🌌 The Frontier (C1216)
> Date: 2026-02-27
> Status: Proposed
> Related Issues: #155 (SaaS Container), #189 (Managed Execution)
> Builds On: C1066 (Container ADR), C1196 (Execution Queue ADR)
> Implements: Sprint 3 Day 8 — Warm Container Pool (per C1207 playbook)

---

## Context

Sprint 3 Implementation Playbook (C1207) identifies **container cold start latency** as a Medium Risk with target < 10s for first dispatch. The Execution Queue ADR (C1196) includes a `warmPool` placeholder but lacks detailed specification.

### Open Questions Resolved

From C1207 playbook:

| Question           | Resolution                    | Rationale                         |
| ------------------ | ----------------------------- | --------------------------------- |
| Warm pool size?    | Dynamic: 2-10 based on demand | Start minimal, scale with traffic |
| Scaling triggers?  | Queue depth + time-of-day     | Predictive + reactive hybrid      |
| Cold start target? | < 3s warm, < 10s cold         | Industry standard for dev tools   |

### Cold Start Components

Full cold start breakdown (measured baseline from OpenHands/Devin research):

| Component         | Duration  | Notes                 |
| ----------------- | --------- | --------------------- |
| Container spawn   | 2-4s      | Docker create + start |
| Network attach    | 0.5-1s    | Bridge/overlay setup  |
| Volume mount      | 0.5-2s    | PVC attachment        |
| Process init      | 0.5-1s    | Node.js startup       |
| Git clone         | 2-10s     | Varies by repo size   |
| Deps verification | 0.5-2s    | npm/workspace check   |
| **Total Cold**    | **6-20s** | Highly variable       |
| **Target Warm**   | **< 3s**  | Skip spawn + clone    |

---

## Decision

Implement a **predictive warm pool** with dynamic sizing based on queue depth and time-based demand patterns.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Warm Pool Manager                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     Pool Health Monitor                               │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │   │
│  │  │ Pool Size  │  │ Queue Depth│  │ Avg Wait   │  │ Hour Pattern │   │   │
│  │  │    4/8     │  │    3       │  │   1.2s     │  │  High Traffic│   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └──────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                    ┌─────────────────▼─────────────────┐                    │
│                    │       Scaling Controller          │                    │
│                    │  target = f(queue, hour, pattern) │                    │
│                    └─────────────────┬─────────────────┘                    │
│                                      │                                       │
│  ┌───────────────────────────────────▼───────────────────────────────────┐  │
│  │                        Warm Pool                                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐      │  │
│  │  │ Container  │  │ Container  │  │ Container  │  │ Container  │      │  │
│  │  │    W1      │  │    W2      │  │    W3      │  │    W4      │      │  │
│  │  │ (idle 30s) │  │ (idle 2m)  │  │ (acquired) │  │ (spawning) │      │  │
│  │  │  ⏳ ready   │  │  ⏳ ready   │  │  🏃 active │  │  🔄 init   │      │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘      │  │
│  │                                                                        │  │
│  │  Pool Status: 2 ready | 1 active | 1 spawning | target: 4            │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     Container Recycler                                │   │
│  │  • Max idle time: 5 minutes → recycle                                │   │
│  │  • Max dispatches: 50 → recreate (prevent resource leaks)            │   │
│  │  • Health check: every 30s → unhealthy = remove                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Warm Pool Manager

```typescript
// packages/core/src/execution/warm-pool-manager.ts

import { EventEmitter } from 'events';
import { Container, ContainerOrchestrator } from './container-orchestrator';
import { DispatchQueue } from './dispatch-queue';
import { logger } from '../observability/logger';

interface WarmPoolConfig {
  /** Minimum containers to keep warm (even at zero traffic) */
  minSize: number;

  /** Maximum containers in pool (cost ceiling) */
  maxSize: number;

  /** Target warm containers per queued job (for scaling) */
  containersPerQueuedJob: number;

  /** Max idle time before recycling (ms) */
  maxIdleMs: number;

  /** Max dispatches before forced recreation */
  maxDispatchesPerContainer: number;

  /** Health check interval (ms) */
  healthCheckIntervalMs: number;

  /** Time-based scaling patterns (optional) */
  timePatterns?: TimePattern[];
}

interface TimePattern {
  /** Cron expression for when this pattern applies */
  schedule: string; // e.g., "0 9-18 * * 1-5" (9am-6pm weekdays)

  /** Minimum pool size during this window */
  minSize: number;

  /** Description for observability */
  label: string;
}

interface WarmContainer {
  container: Container;
  state: 'spawning' | 'ready' | 'acquired' | 'recycling';
  createdAt: Date;
  lastUsedAt: Date;
  dispatchCount: number;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
}

export class WarmPoolManager extends EventEmitter {
  private pool: Map<string, WarmContainer> = new Map();
  private orchestrator: ContainerOrchestrator;
  private queue: DispatchQueue;
  private config: WarmPoolConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private scalingTimer?: NodeJS.Timeout;

  // Metrics
  private metrics = {
    warmHits: 0,
    coldStarts: 0,
    avgWarmLatencyMs: 0,
    avgColdLatencyMs: 0,
    recycleCount: 0,
  };

  constructor(
    orchestrator: ContainerOrchestrator,
    queue: DispatchQueue,
    config: Partial<WarmPoolConfig> = {}
  ) {
    super();
    this.orchestrator = orchestrator;
    this.queue = queue;
    this.config = {
      minSize: 2,
      maxSize: 10,
      containersPerQueuedJob: 0.5, // 1 warm per 2 queued
      maxIdleMs: 5 * 60 * 1000, // 5 minutes
      maxDispatchesPerContainer: 50,
      healthCheckIntervalMs: 30 * 1000, // 30 seconds
      ...config,
    };
  }

  /**
   * Start warm pool management
   */
  async start(): Promise<void> {
    logger.info('Starting warm pool manager', {
      minSize: this.config.minSize,
      maxSize: this.config.maxSize,
    });

    // Initial warm-up to minimum
    await this.scaleToTarget(this.config.minSize);

    // Start health check loop
    this.healthCheckTimer = setInterval(
      () => this.healthCheck(),
      this.config.healthCheckIntervalMs
    );

    // Start scaling loop (every 10 seconds)
    this.scalingTimer = setInterval(() => this.adjustPoolSize(), 10 * 1000);

    // Listen to queue events for reactive scaling
    this.queue.on('job:waiting', () => this.handleJobWaiting());
  }

  /**
   * Acquire a warm container for dispatch (or cold start if none available)
   */
  async acquire(
    dispatchId: string
  ): Promise<{ container: Container; wasWarm: boolean }> {
    const startTime = Date.now();

    // Try warm pool first
    const warmContainer = this.getReadyContainer();

    if (warmContainer) {
      warmContainer.state = 'acquired';
      warmContainer.lastUsedAt = new Date();
      warmContainer.dispatchCount++;

      const latencyMs = Date.now() - startTime;
      this.updateMetrics('warm', latencyMs);

      logger.info('Acquired warm container', {
        dispatchId,
        containerId: warmContainer.container.id,
        latencyMs,
        dispatchCount: warmContainer.dispatchCount,
      });

      // Trigger background refill
      this.refillPoolAsync();

      return { container: warmContainer.container, wasWarm: true };
    }

    // Cold start path
    logger.info('No warm containers available, cold starting', { dispatchId });

    const container = await this.orchestrator.spawn({
      dispatchId,
      // Base config - will be enriched by caller
    });

    const latencyMs = Date.now() - startTime;
    this.updateMetrics('cold', latencyMs);

    return { container, wasWarm: false };
  }

  /**
   * Release a container back to the pool (or mark for recycling)
   */
  async release(containerId: string): Promise<void> {
    const warmContainer = this.pool.get(containerId);

    if (!warmContainer) {
      logger.warn('Attempted to release unknown container', { containerId });
      return;
    }

    // Check if container should be recycled
    if (this.shouldRecycle(warmContainer)) {
      await this.recycleContainer(containerId);
      return;
    }

    // Return to ready state
    warmContainer.state = 'ready';
    warmContainer.lastUsedAt = new Date();

    logger.debug('Container returned to warm pool', {
      containerId,
      dispatchCount: warmContainer.dispatchCount,
    });
  }

  /**
   * Get a ready container from the pool
   */
  private getReadyContainer(): WarmContainer | undefined {
    for (const [_, wc] of this.pool) {
      if (wc.state === 'ready' && wc.healthStatus === 'healthy') {
        return wc;
      }
    }
    return undefined;
  }

  /**
   * Calculate target pool size based on current conditions
   */
  private calculateTargetSize(): number {
    const queueDepth = this.queue.getWaitingCount();
    const hour = new Date().getHours();

    // Base target from queue depth
    let target = Math.ceil(queueDepth * this.config.containersPerQueuedJob);

    // Apply time-based patterns
    const activePattern = this.getActiveTimePattern();
    if (activePattern) {
      target = Math.max(target, activePattern.minSize);
    }

    // Clamp to configured bounds
    target = Math.max(target, this.config.minSize);
    target = Math.min(target, this.config.maxSize);

    return target;
  }

  /**
   * Adjust pool size based on demand
   */
  private async adjustPoolSize(): Promise<void> {
    const target = this.calculateTargetSize();
    const current = this.getReadyCount();

    if (current < target) {
      const toAdd = target - current;
      logger.info('Scaling up warm pool', { current, target, adding: toAdd });
      await this.scaleToTarget(target);
    } else if (current > target + 2) {
      // Only scale down if significantly over (hysteresis)
      const toRemove = current - target - 1;
      logger.info('Scaling down warm pool', {
        current,
        target,
        removing: toRemove,
      });
      await this.scaleDown(toRemove);
    }
  }

  /**
   * Scale pool to target size
   */
  private async scaleToTarget(target: number): Promise<void> {
    const current = this.pool.size;
    const toSpawn = Math.max(0, target - current);

    const spawnPromises: Promise<void>[] = [];

    for (let i = 0; i < toSpawn; i++) {
      spawnPromises.push(this.spawnWarmContainer());
    }

    await Promise.allSettled(spawnPromises);
  }

  /**
   * Spawn a new warm container
   */
  private async spawnWarmContainer(): Promise<void> {
    const warmId = `warm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const placeholder: WarmContainer = {
      container: null as any, // Will be set after spawn
      state: 'spawning',
      createdAt: new Date(),
      lastUsedAt: new Date(),
      dispatchCount: 0,
      healthStatus: 'unknown',
    };

    this.pool.set(warmId, placeholder);

    try {
      const container = await this.orchestrator.spawnWarm();
      placeholder.container = container;
      placeholder.state = 'ready';
      placeholder.healthStatus = 'healthy';

      // Update map key to actual container ID
      this.pool.delete(warmId);
      this.pool.set(container.id, placeholder);

      logger.info('Warm container spawned', { containerId: container.id });
    } catch (error) {
      this.pool.delete(warmId);
      logger.error('Failed to spawn warm container', { error });
    }
  }

  /**
   * Scale down pool by removing idle containers
   */
  private async scaleDown(count: number): Promise<void> {
    const toRemove: string[] = [];

    // Sort by idle time (oldest idle first)
    const sortedPool = Array.from(this.pool.entries())
      .filter(([_, wc]) => wc.state === 'ready')
      .sort((a, b) => a[1].lastUsedAt.getTime() - b[1].lastUsedAt.getTime());

    for (let i = 0; i < Math.min(count, sortedPool.length); i++) {
      toRemove.push(sortedPool[i][0]);
    }

    for (const containerId of toRemove) {
      await this.recycleContainer(containerId);
    }
  }

  /**
   * Check if container should be recycled
   */
  private shouldRecycle(wc: WarmContainer): boolean {
    // Max dispatch count reached
    if (wc.dispatchCount >= this.config.maxDispatchesPerContainer) {
      return true;
    }

    // Unhealthy
    if (wc.healthStatus === 'unhealthy') {
      return true;
    }

    // Over max idle time
    const idleMs = Date.now() - wc.lastUsedAt.getTime();
    if (idleMs > this.config.maxIdleMs) {
      return true;
    }

    return false;
  }

  /**
   * Recycle (destroy and optionally replace) a container
   */
  private async recycleContainer(containerId: string): Promise<void> {
    const wc = this.pool.get(containerId);
    if (!wc) return;

    wc.state = 'recycling';
    this.metrics.recycleCount++;

    try {
      await wc.container.destroy();
    } catch (error) {
      logger.error('Error destroying container', { containerId, error });
    }

    this.pool.delete(containerId);
    logger.info('Container recycled', { containerId });
  }

  /**
   * Health check all containers in pool
   */
  private async healthCheck(): Promise<void> {
    const checks: Promise<void>[] = [];

    for (const [containerId, wc] of this.pool) {
      if (wc.state === 'ready') {
        checks.push(this.checkContainerHealth(containerId, wc));
      }
    }

    await Promise.allSettled(checks);

    // Clean up unhealthy containers
    for (const [containerId, wc] of this.pool) {
      if (wc.healthStatus === 'unhealthy' || this.shouldRecycle(wc)) {
        await this.recycleContainer(containerId);
      }
    }

    this.emit('healthCheck', {
      poolSize: this.pool.size,
      ready: this.getReadyCount(),
      metrics: this.metrics,
    });
  }

  /**
   * Check single container health
   */
  private async checkContainerHealth(
    containerId: string,
    wc: WarmContainer
  ): Promise<void> {
    try {
      const healthy = await wc.container.healthCheck();
      wc.healthStatus = healthy ? 'healthy' : 'unhealthy';
    } catch (error) {
      wc.healthStatus = 'unhealthy';
      logger.warn('Container health check failed', { containerId, error });
    }
  }

  /**
   * Handle reactive scaling when jobs are waiting
   */
  private handleJobWaiting(): void {
    // Immediate refill if pool is empty
    if (this.getReadyCount() === 0) {
      this.refillPoolAsync();
    }
  }

  /**
   * Refill pool in background (non-blocking)
   */
  private refillPoolAsync(): void {
    setImmediate(async () => {
      try {
        await this.adjustPoolSize();
      } catch (error) {
        logger.error('Background pool refill failed', { error });
      }
    });
  }

  /**
   * Get active time pattern for current time
   */
  private getActiveTimePattern(): TimePattern | undefined {
    if (!this.config.timePatterns) return undefined;

    // Simplified: check hour ranges
    // Full implementation would use cron parser
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    // Default pattern: higher pool during business hours
    if (isWeekday && hour >= 9 && hour <= 18) {
      return this.config.timePatterns.find(p => p.label === 'business-hours');
    }

    return undefined;
  }

  /**
   * Update metrics
   */
  private updateMetrics(type: 'warm' | 'cold', latencyMs: number): void {
    if (type === 'warm') {
      this.metrics.warmHits++;
      this.metrics.avgWarmLatencyMs =
        (this.metrics.avgWarmLatencyMs * (this.metrics.warmHits - 1) +
          latencyMs) /
        this.metrics.warmHits;
    } else {
      this.metrics.coldStarts++;
      this.metrics.avgColdLatencyMs =
        (this.metrics.avgColdLatencyMs * (this.metrics.coldStarts - 1) +
          latencyMs) /
        this.metrics.coldStarts;
    }
  }

  /**
   * Get count of ready containers
   */
  private getReadyCount(): number {
    let count = 0;
    for (const wc of this.pool.values()) {
      if (wc.state === 'ready' && wc.healthStatus === 'healthy') {
        count++;
      }
    }
    return count;
  }

  /**
   * Get pool metrics for observability
   */
  getMetrics(): typeof this.metrics & { poolSize: number; readyCount: number } {
    return {
      ...this.metrics,
      poolSize: this.pool.size,
      readyCount: this.getReadyCount(),
    };
  }

  /**
   * Stop warm pool management
   */
  async stop(): Promise<void> {
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.scalingTimer) clearInterval(this.scalingTimer);

    // Drain pool
    for (const [containerId] of this.pool) {
      await this.recycleContainer(containerId);
    }

    logger.info('Warm pool manager stopped');
  }
}
```

---

## Configuration Profiles

### Profile: Starter (Low Traffic)

```typescript
const starterConfig: WarmPoolConfig = {
  minSize: 1,
  maxSize: 3,
  containersPerQueuedJob: 1,
  maxIdleMs: 10 * 60 * 1000, // 10 min (longer idle for low traffic)
  maxDispatchesPerContainer: 100,
  healthCheckIntervalMs: 60 * 1000, // 1 min (less frequent)
};
```

- **Use case:** Early beta, low user count
- **Cost:** ~$5-15/mo (1-3 containers)
- **Latency:** Some cold starts acceptable

### Profile: Growth (Medium Traffic)

```typescript
const growthConfig: WarmPoolConfig = {
  minSize: 2,
  maxSize: 10,
  containersPerQueuedJob: 0.5,
  maxIdleMs: 5 * 60 * 1000, // 5 min
  maxDispatchesPerContainer: 50,
  healthCheckIntervalMs: 30 * 1000,
  timePatterns: [
    { schedule: '0 9-18 * * 1-5', minSize: 4, label: 'business-hours' },
  ],
};
```

- **Use case:** Sprint 3 launch, growing user base
- **Cost:** ~$20-50/mo (2-10 containers)
- **Latency:** < 3s warm for 80%+ dispatches

### Profile: Scale (High Traffic)

```typescript
const scaleConfig: WarmPoolConfig = {
  minSize: 5,
  maxSize: 50,
  containersPerQueuedJob: 0.3,
  maxIdleMs: 3 * 60 * 1000, // 3 min
  maxDispatchesPerContainer: 30,
  healthCheckIntervalMs: 15 * 1000,
  timePatterns: [
    { schedule: '0 9-18 * * 1-5', minSize: 10, label: 'business-hours' },
    { schedule: '0 6-9,18-22 * * 1-5', minSize: 7, label: 'shoulder-hours' },
  ],
};
```

- **Use case:** Production scale, Enterprise customers
- **Cost:** ~$100-500/mo (5-50 containers)
- **Latency:** < 3s warm for 95%+ dispatches

---

## Integration Points

### 1. With Execution Queue (C1196)

The warm pool integrates with Bull queue lifecycle:

```typescript
// In dispatch-queue.ts
import { WarmPoolManager } from './warm-pool-manager';

export class DispatchQueue {
  private warmPool: WarmPoolManager;

  async processJob(job: Job<DispatchJob>): Promise<ActionResult> {
    // Acquire container (warm or cold)
    const { container, wasWarm } = await this.warmPool.acquire(
      job.data.dispatchId
    );

    try {
      const result = await container.execute(job.data);

      // Record warm/cold latency for observability
      this.recordDispatchLatency(job.data.dispatchId, wasWarm);

      return result;
    } finally {
      // Return to pool
      await this.warmPool.release(container.id);
    }
  }
}
```

### 2. With Usage Metering (C1186)

Warm pool metrics feed into tier-based cost allocation:

```typescript
// Warm pool costs are amortized across dispatches
const dispatchCost = {
  computeMs: result.durationMs,
  warmPoolOverhead: warmPool.getMetrics().avgWarmLatencyMs,
  coldStartPenalty: wasWarm ? 0 : warmPool.getMetrics().avgColdLatencyMs,
};
```

### 3. With Platform Observability (C1076)

Export warm pool metrics to Prometheus/Grafana:

```typescript
// Prometheus metrics
warm_pool_size{state="ready"} 4
warm_pool_size{state="acquired"} 2
warm_pool_size{state="spawning"} 1

dispatch_latency_seconds{type="warm"} 0.8
dispatch_latency_seconds{type="cold"} 8.2

warm_pool_hit_ratio 0.85
warm_pool_recycle_total 142
```

---

## Benchmarks & Targets

### Sprint 3 Launch Targets

| Metric           | Target | Measurement                        |
| ---------------- | ------ | ---------------------------------- |
| Warm hit rate    | > 80%  | Warm dispatches / Total dispatches |
| Warm latency P50 | < 2s   | Container acquire time             |
| Warm latency P99 | < 5s   | Including queue wait               |
| Cold latency P50 | < 8s   | Full spawn + clone                 |
| Cold latency P99 | < 15s  | Large repos                        |
| Pool efficiency  | > 60%  | Active time / Total container time |

### Benchmarking Script

```bash
# Add to packages/core/scripts/benchmark-warm-pool.ts

import { WarmPoolManager } from '../src/execution/warm-pool-manager';

async function benchmark() {
  const results = {
    warmLatencies: [] as number[],
    coldLatencies: [] as number[],
    hitRate: 0,
  };

  // Simulate 100 dispatches with varying arrival patterns
  for (let i = 0; i < 100; i++) {
    const start = Date.now();
    const { container, wasWarm } = await warmPool.acquire(`benchmark-${i}`);
    const latency = Date.now() - start;

    if (wasWarm) {
      results.warmLatencies.push(latency);
    } else {
      results.coldLatencies.push(latency);
    }

    // Simulate dispatch execution
    await sleep(Math.random() * 5000 + 1000);

    await warmPool.release(container.id);

    // Vary arrival rate
    await sleep(Math.random() * 2000);
  }

  // Calculate results
  results.hitRate = results.warmLatencies.length / 100;

  console.log('Benchmark Results:');
  console.log(`  Warm hit rate: ${(results.hitRate * 100).toFixed(1)}%`);
  console.log(`  Warm P50: ${percentile(results.warmLatencies, 50)}ms`);
  console.log(`  Warm P99: ${percentile(results.warmLatencies, 99)}ms`);
  console.log(`  Cold P50: ${percentile(results.coldLatencies, 50)}ms`);
  console.log(`  Cold P99: ${percentile(results.coldLatencies, 99)}ms`);
}
```

---

## Cost Model

### Per-Container Cost (Estimated)

| Resource  | Spec               | Hourly Cost     |
| --------- | ------------------ | --------------- |
| CPU       | 1 vCPU             | ~$0.02          |
| Memory    | 2GB                | ~$0.01          |
| Storage   | 10GB ephemeral     | ~$0.001         |
| **Total** | Per warm container | **~$0.03/hour** |

### Monthly Cost by Profile

| Profile | Min Pool | Max Pool | Estimated Monthly |
| ------- | -------- | -------- | ----------------- |
| Starter | 1        | 3        | $22 - $66         |
| Growth  | 2        | 10       | $44 - $220        |
| Scale   | 5        | 50       | $110 - $1,100     |

### Break-Even Analysis

At Pro tier ($19/mo) with 1,000 cycles:

- **Revenue per cycle:** $0.019
- **Container cost per cycle:** ~$0.001 (amortized)
- **Margin:** ~95%

Warm pool cost is negligible compared to tier revenue.

---

## Failure Modes & Recovery

### 1. Pool Exhaustion

**Scenario:** All containers acquired, queue backing up.

**Detection:** `ready_count == 0 && waiting_jobs > 0`

**Recovery:**

- Immediate: Fall back to cold start
- Background: Emergency scale-up (bypass normal scaling)
- Alert: Page on-call if persists > 5 min

### 2. Container Leak

**Scenario:** Containers not released after dispatch.

**Detection:** `acquired_duration > max_dispatch_time * 2`

**Recovery:**

- Force-recycle containers held > 30 minutes
- Log dispatch ID for investigation
- Alert: Track leak rate, page if > 5%

### 3. Health Check Cascade

**Scenario:** Many containers fail health checks simultaneously.

**Detection:** `unhealthy_count > pool_size * 0.5`

**Recovery:**

- Investigate underlying issue (Docker daemon, network)
- Aggressive respawn with backoff
- Alert: Immediate page

---

## Implementation Plan

### Day 8 (Sprint 3) Tasks

1. **Implement `WarmPoolManager` class** (Engineering, 4h)
   - Core acquire/release logic
   - Basic scaling (min/max bounds)

2. **Integrate with `DispatchQueue`** (Engineering, 2h)
   - Replace direct container spawn with warm pool
   - Add metrics recording

3. **Add Prometheus metrics** (Ops, 2h)
   - Export warm pool gauges
   - Add Grafana dashboard panel

4. **Benchmark and tune** (QA, 2h)
   - Run benchmark script
   - Adjust config for < 3s warm target

### Day 9 Follow-up

- Time-based scaling patterns
- Advanced health checks
- Cost tracking integration

---

## Related Documents

- C1066: Container-per-Dispatch ADR (container architecture)
- C1186: Usage Metering ADR (billing integration)
- C1196: Execution Queue ADR (Bull queue)
- C1076: Platform Observability Spec (metrics)
- C1207: Sprint 3 Implementation Playbook (Day 8 tasks)

---

_🌌 Frontier | Cycle 1216 | Container Warm Pool Strategy_
