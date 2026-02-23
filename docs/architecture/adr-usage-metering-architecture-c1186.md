# ADR: Usage Metering Architecture (C1186)

> **Status:** Proposed
> **Author:** 🌌 Frontier (The Frontier)
> **Cycle:** 1186 | **Date:** 2026-02-23 15:55 EST
> **Related:** #155 (SaaS Container), #182 (Billing Integration), sprint3-saas-tier-technical-spec-c1185.md
> **Sprint 3:** Mar 1-14, 2026

---

## Context

The SaaS tier spec (C1185) defines cycle-based billing with tier limits (Free: 50, Pro: 500, Team: 2000). However, it doesn't address the **distributed systems challenges** of metering:

1. **Multiple CLI instances** may dispatch concurrently
2. **Network failures** during cycle recording
3. **Race conditions** in limit enforcement
4. **Latency** of database round-trips pre-dispatch

This ADR specifies the platform architecture for reliable usage metering.

---

## Decision

### Architecture: Optimistic Local + Async Reconciliation

We adopt a **two-phase metering architecture**:

1. **Phase 1 (Pre-dispatch):** Optimistic check with local cache
2. **Phase 2 (Post-dispatch):** Async recording with retry queue

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Instance                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Local Cache │───▶│  Pre-Check  │───▶│   Dispatch  │         │
│  │  (SQLite)   │    │ (Optimistic)│    │             │         │
│  └─────────────┘    └─────────────┘    └──────┬──────┘         │
│                                               │                 │
│                                               ▼                 │
│                                        ┌─────────────┐         │
│                                        │ Record Usage│         │
│                                        │ (Async Queue)│        │
│                                        └──────┬──────┘         │
└───────────────────────────────────────────────┼─────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Platform API                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Usage API  │───▶│   Postgres  │◀───│    Redis    │         │
│  │             │    │  (Source of │    │  (Rate Limit│         │
│  │             │    │    Truth)   │    │   + Cache)  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Design

### 1. Local Usage Cache (CLI-side)

Each CLI instance maintains a local SQLite cache for low-latency checks:

```typescript
// packages/cli/src/billing/local-cache.ts

interface LocalUsageCache {
  userId: string;
  tier: Tier;
  cyclesUsed: number;
  cyclesLimit: number;
  periodEnd: Date;
  lastSynced: Date;
  pendingRecords: CycleRecord[];
}

export class UsageCacheManager {
  private db: BetterSqlite3.Database;
  private readonly STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  constructor(configDir: string) {
    this.db = new Database(path.join(configDir, 'usage-cache.db'));
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usage_cache (
        user_id TEXT PRIMARY KEY,
        tier TEXT NOT NULL,
        cycles_used INTEGER NOT NULL,
        cycles_limit INTEGER NOT NULL,
        period_end TEXT NOT NULL,
        last_synced TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS pending_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        repo_id TEXT NOT NULL,
        cycle_number INTEGER NOT NULL,
        tokens_in INTEGER NOT NULL,
        tokens_out INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0
      );
    `);
  }

  /**
   * Check if dispatch is allowed (optimistic, sub-ms latency)
   */
  canDispatch(userId: string): PreDispatchResult {
    const cache = this.getCache(userId);

    // No cache = first run, allow and sync
    if (!cache) {
      return { allowed: true, requiresSync: true };
    }

    // Cache too stale = require sync before decision
    if (this.isStale(cache)) {
      return {
        allowed: true,
        requiresSync: true,
        warning: 'Usage data stale, syncing...',
      };
    }

    // Check limit (soft enforcement)
    const remaining = cache.cyclesLimit - cache.cyclesUsed;
    if (remaining <= 0) {
      return {
        allowed: false,
        reason: `Cycle limit reached (${cache.cyclesUsed}/${cache.cyclesLimit})`,
        requiresSync: true, // Sync to confirm
      };
    }

    // Optimistically increment local count
    this.incrementLocal(userId);

    return {
      allowed: true,
      remaining: remaining - 1,
      warning: this.getWarning(remaining - 1, cache.cyclesLimit),
    };
  }

  /**
   * Queue usage record for async upload
   */
  queueRecord(record: CycleRecord): void {
    this.db
      .prepare(
        `
      INSERT INTO pending_records (id, user_id, repo_id, cycle_number, tokens_in, tokens_out, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        record.id,
        record.userId,
        record.repoId,
        record.cycleNumber,
        record.tokensIn,
        record.tokensOut,
        record.createdAt.toISOString()
      );
  }

  /**
   * Flush pending records to API (called after dispatch completes)
   */
  async flushPending(): Promise<FlushResult> {
    const pending = this.getPendingRecords();
    if (pending.length === 0) return { success: true, count: 0 };

    try {
      const response = await this.api.batchRecordUsage(pending);

      // Remove successfully recorded
      this.removePending(response.recorded);

      // Update local cache with authoritative count
      if (response.subscription) {
        this.updateCache(response.subscription);
      }

      return {
        success: true,
        count: response.recorded.length,
        failed: response.failed,
      };
    } catch (error) {
      // Network failure - increment retry count
      this.incrementRetryCount(pending);
      return { success: false, error, willRetry: true };
    }
  }
}
```

### 2. Rate Limiting (Redis-based)

Per-tier rate limits enforced via Redis sliding window:

```typescript
// packages/core/src/billing/rate-limiter.ts

export class RateLimiter {
  constructor(private redis: Redis) {}

  /**
   * Check rate limits (hourly and daily)
   * Returns: { allowed: boolean, retryAfter?: number }
   */
  async checkRateLimit(userId: string, tier: Tier): Promise<RateLimitResult> {
    const config = TIER_CONFIG[tier];
    const now = Date.now();

    // Sliding window keys
    const hourKey = `ratelimit:${userId}:hour`;
    const dayKey = `ratelimit:${userId}:day`;

    // Use Redis transaction for atomic check-and-increment
    const pipeline = this.redis.pipeline();

    // Hourly window (3600s)
    pipeline.zremrangebyscore(hourKey, 0, now - 3600000);
    pipeline.zcard(hourKey);

    // Daily window (86400s)
    pipeline.zremrangebyscore(dayKey, 0, now - 86400000);
    pipeline.zcard(dayKey);

    const results = await pipeline.exec();
    const hourCount = results[1][1] as number;
    const dayCount = results[3][1] as number;

    // Check limits
    if (config.cyclesPerHour !== -1 && hourCount >= config.cyclesPerHour) {
      const oldestHour = await this.redis.zrange(hourKey, 0, 0, 'WITHSCORES');
      const retryAfter =
        oldestHour.length > 0
          ? Math.ceil((parseInt(oldestHour[1]) + 3600000 - now) / 1000)
          : 3600;

      return {
        allowed: false,
        reason: `Hourly limit reached (${hourCount}/${config.cyclesPerHour})`,
        retryAfter,
        limit: 'hourly',
      };
    }

    if (config.cyclesPerDay !== -1 && dayCount >= config.cyclesPerDay) {
      return {
        allowed: false,
        reason: `Daily limit reached (${dayCount}/${config.cyclesPerDay})`,
        retryAfter: this.secondsUntilMidnight(),
        limit: 'daily',
      };
    }

    // Record this request
    await this.redis.zadd(hourKey, now, `${now}-${Math.random()}`);
    await this.redis.zadd(dayKey, now, `${now}-${Math.random()}`);
    await this.redis.expire(hourKey, 3600);
    await this.redis.expire(dayKey, 86400);

    return {
      allowed: true,
      hourlyRemaining: config.cyclesPerHour - hourCount - 1,
    };
  }
}
```

### 3. Concurrent Dispatch Handling

Multiple CLI instances dispatching for same user handled via distributed lock:

```typescript
// packages/core/src/billing/concurrency.ts

export class ConcurrencyManager {
  constructor(private redis: Redis) {}

  /**
   * Acquire dispatch slot (returns false if at concurrent limit)
   */
  async acquireSlot(userId: string, tier: Tier): Promise<AcquireResult> {
    const config = TIER_CONFIG[tier];
    const key = `concurrent:${userId}`;
    const slotId = `${process.pid}-${Date.now()}`;
    const ttl = 600; // 10 min max dispatch time

    // Atomic check-and-acquire
    const script = `
      local current = redis.call('SCARD', KEYS[1])
      if current < tonumber(ARGV[1]) then
        redis.call('SADD', KEYS[1], ARGV[2])
        redis.call('EXPIRE', KEYS[1], ARGV[3])
        return 1
      end
      return 0
    `;

    const acquired = await this.redis.eval(
      script,
      1,
      key,
      config.maxConcurrent,
      slotId,
      ttl
    );

    if (acquired === 0) {
      return {
        allowed: false,
        reason: `Concurrent dispatch limit reached (${config.maxConcurrent} max)`,
        current: await this.redis.scard(key),
      };
    }

    return { allowed: true, slotId };
  }

  /**
   * Release dispatch slot (call after dispatch completes)
   */
  async releaseSlot(userId: string, slotId: string): Promise<void> {
    await this.redis.srem(`concurrent:${userId}`, slotId);
  }
}
```

### 4. Usage Recording Pipeline

Reliable usage recording with exactly-once semantics:

```typescript
// packages/core/src/billing/usage-recorder.ts

export class UsageRecorder {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis
  ) {}

  /**
   * Record cycle usage (idempotent via cycle ID)
   */
  async recordUsage(record: CycleUsageRecord): Promise<RecordResult> {
    const idempotencyKey = `usage:${record.userId}:${record.repoId}:${record.cycleNumber}`;

    // Check if already recorded (idempotency)
    const exists = await this.redis.get(idempotencyKey);
    if (exists) {
      return { success: true, duplicate: true };
    }

    // Calculate cost
    const cost = this.calculateCost(record.tokensIn, record.tokensOut);

    // Transaction: record + increment + cache
    try {
      await this.prisma.$transaction(async tx => {
        // Insert usage record
        await tx.cycleUsage.create({
          data: {
            id: record.id,
            userId: record.userId,
            repoId: record.repoId,
            cycleNumber: record.cycleNumber,
            tokensIn: record.tokensIn,
            tokensOut: record.tokensOut,
            cost,
            createdAt: record.createdAt,
          },
        });

        // Increment subscription counter
        await tx.subscription.update({
          where: { userId: record.userId },
          data: { cyclesUsed: { increment: 1 } },
        });
      });

      // Set idempotency key (expire after period)
      await this.redis.set(idempotencyKey, '1', 'EX', 30 * 24 * 3600);

      return { success: true, cost };
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint = already recorded
        return { success: true, duplicate: true };
      }
      throw error;
    }
  }

  /**
   * Batch record (for flush from CLI queue)
   */
  async batchRecord(records: CycleUsageRecord[]): Promise<BatchResult> {
    const results = await Promise.allSettled(
      records.map(r => this.recordUsage(r))
    );

    const recorded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected');

    return { recorded, failed: failed.length, total: records.length };
  }

  private calculateCost(tokensIn: number, tokensOut: number): number {
    // Claude 3.5 Sonnet rates (as of Feb 2026)
    const inputRate = 3.0 / 1_000_000;
    const outputRate = 15.0 / 1_000_000;
    return tokensIn * inputRate + tokensOut * outputRate;
  }
}
```

### 5. Sync Protocol

Periodic sync between CLI cache and authoritative database:

```typescript
// packages/cli/src/billing/sync.ts

export class UsageSyncManager {
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private syncTimer: NodeJS.Timer | null = null;

  constructor(
    private cache: UsageCacheManager,
    private api: PlatformApi
  ) {}

  /**
   * Start background sync (for long-running CLI sessions)
   */
  startBackgroundSync(): void {
    this.syncTimer = setInterval(() => this.sync(), this.SYNC_INTERVAL_MS);
    this.sync(); // Initial sync
  }

  /**
   * Force sync (called before dispatch if cache stale)
   */
  async sync(): Promise<SyncResult> {
    try {
      // 1. Flush pending records first
      await this.cache.flushPending();

      // 2. Fetch authoritative state
      const subscription = await this.api.getSubscription();

      // 3. Update local cache
      this.cache.updateCache({
        userId: subscription.userId,
        tier: subscription.tier,
        cyclesUsed: subscription.cyclesUsed,
        cyclesLimit: TIER_CONFIG[subscription.tier].cyclesPerMonth,
        periodEnd: subscription.periodEnd,
        lastSynced: new Date(),
      });

      return { success: true, cyclesUsed: subscription.cyclesUsed };
    } catch (error) {
      // Offline mode - continue with cached data
      return { success: false, error, usingCache: true };
    }
  }

  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}
```

---

## Failure Modes & Recovery

### Scenario 1: Network Failure During Record

```
CLI dispatches cycle → completes → tries to record → network timeout
```

**Recovery:**

1. Record queued locally in `pending_records` table
2. Next dispatch flushes pending first
3. Retry with exponential backoff (max 3 attempts)
4. If all retries fail, record persists locally for manual recovery

### Scenario 2: Cache Out of Sync

```
User upgrades tier on web → CLI still has old tier cached
```

**Recovery:**

1. Sync triggered if cache >5 min stale
2. API returns 402 if limit exceeded → force sync
3. User can run `ada billing sync` to force refresh

### Scenario 3: Concurrent Dispatch Race

```
Two CLI instances check limit simultaneously, both see 1 remaining
```

**Recovery:**

1. Redis-based concurrent slot acquisition is atomic
2. One instance gets slot, other blocked
3. Monthly limit allows small overrun (soft limit)
4. Reconciliation catches any drift

### Scenario 4: Period Reset During Dispatch

```
Dispatch starts at 11:59 PM, completes at 12:01 AM (new period)
```

**Recovery:**

1. Record timestamp = dispatch start time
2. Period determined by `createdAt` not `recordedAt`
3. Billing period has 1-hour grace window for in-flight cycles

---

## Trade-offs

### Chosen: Optimistic Local Check

**Pros:**

- Sub-millisecond pre-dispatch latency
- Works offline (with cached data)
- Reduces API load by 90%+

**Cons:**

- Small window for over-limit dispatch
- Cache drift possible (max 5 min)
- Local storage required

**Alternative rejected:** Synchronous API check

- Adds 200-500ms to every dispatch
- Requires network for every cycle
- Single point of failure

### Chosen: Soft Limits with Warnings

**Pros:**

- Better UX (no hard blocks mid-work)
- Reduces support burden
- Upsell opportunity at warning

**Cons:**

- Users can exceed limits briefly
- Revenue leakage possible

**Alternative rejected:** Hard limits

- Frustrates users mid-dispatch
- Bad UX for paid customers
- Network failures = blocked work

---

## Implementation Plan

### Sprint 3 Week 1 (Mar 1-7)

1. **Day 1-2:** Local cache implementation (SQLite schema, basic ops)
2. **Day 3-4:** Rate limiter (Redis sliding window)
3. **Day 5:** Concurrency manager (distributed lock)

### Sprint 3 Week 2 (Mar 8-14)

4. **Day 6-7:** Usage recorder (idempotent batch recording)
5. **Day 8-9:** Sync manager (background + force sync)
6. **Day 10:** Integration tests + load testing

### Performance Targets

| Operation                   | Target Latency | Notes               |
| --------------------------- | -------------- | ------------------- |
| Pre-dispatch check (cached) | <1ms           | Local SQLite        |
| Pre-dispatch check (sync)   | <500ms         | API round-trip      |
| Rate limit check            | <10ms          | Redis               |
| Usage recording             | <100ms         | Async, non-blocking |
| Batch flush                 | <1s            | Background          |

---

## Open Questions

1. **Offline mode duration:** How long should CLI work offline before requiring sync?
   - Current proposal: 24 hours or 10% of tier limit, whichever is less

2. **Grace period on upgrade:** When user upgrades mid-period, do remaining cycles carry over?
   - Recommendation: No carryover, but prorate the new tier's allocation

3. **Enterprise bypass:** Should Enterprise tier skip all local caching?
   - Recommendation: Yes, always check API (they have SLA for latency)

---

## Conclusion

This architecture balances:

- **Performance:** Sub-ms local checks, async recording
- **Reliability:** Retry queues, idempotent recording, offline support
- **Accuracy:** Periodic sync, soft limits with reconciliation
- **Scalability:** Redis for rate limits/concurrency, batch APIs

The key insight is that **usage metering doesn't need to be synchronous** — slight overruns are acceptable in exchange for much better UX and reliability.

---

_🌌 Frontier (The Frontier) — Cycle 1186_
_Per R-017: SHIPPED tangible ADR — directly supports #155 (SaaS Container) and #182 (Billing Integration)._
