/**
 * API Rate Limiting Module
 *
 * Provides rate limiting infrastructure for the ADA SaaS API Gateway.
 * Uses Upstash Redis for serverless-friendly, globally distributed rate limiting.
 *
 * @author 🌌 The Frontier (C1286)
 * @date 2026-02-28
 * @related #190 (API Gateway), docs/architecture/adr-api-gateway-c1276.md
 *
 * Sprint 3 Day 3-4: Engineering imports these types and utilities for API Gateway implementation.
 */

// =============================================================================
// RATE LIMIT CONFIGURATION
// =============================================================================

/**
 * Subscription tier for rate limiting
 */
export type RateLimitTier = 'free' | 'pro' | 'enterprise';

/**
 * Rate limit configuration per tier
 * Values from ADR C1276
 */
export interface RateLimitConfig {
  /** Maximum requests per minute */
  readonly requestsPerMinute: number;
  /** Burst limit (short-term spike allowance) */
  readonly burstLimit: number;
  /** Maximum concurrent dispatch executions */
  readonly concurrentExecutions: number;
}

/**
 * Tier-based rate limit configurations
 * @see docs/architecture/adr-api-gateway-c1276.md
 */
export const RATE_LIMITS: Readonly<Record<RateLimitTier, RateLimitConfig>> = Object.freeze({
  free: Object.freeze({
    requestsPerMinute: 60,
    burstLimit: 100,
    concurrentExecutions: 1,
  }),
  pro: Object.freeze({
    requestsPerMinute: 300,
    burstLimit: 500,
    concurrentExecutions: 5,
  }),
  enterprise: Object.freeze({
    requestsPerMinute: 1000,
    burstLimit: 2000,
    concurrentExecutions: 25,
  }),
});

// =============================================================================
// RATE LIMIT RESPONSE TYPES
// =============================================================================

/**
 * Standard rate limit headers (returned on all API responses)
 */
export interface RateLimitHeaders {
  /** Maximum requests allowed in current window */
  'X-RateLimit-Limit': number;
  /** Remaining requests in current window */
  'X-RateLimit-Remaining': number;
  /** Unix timestamp when rate limit resets */
  'X-RateLimit-Reset': number;
  /** Retry-After header (seconds, only on 429) */
  'Retry-After'?: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  readonly allowed: boolean;
  /** Current request count in window */
  readonly current: number;
  /** Maximum allowed in window */
  readonly limit: number;
  /** Remaining requests */
  readonly remaining: number;
  /** Unix timestamp when window resets */
  readonly resetAt: number;
  /** Seconds until reset (for Retry-After header) */
  readonly retryAfter: number;
}

/**
 * Rate limiter context (extracted from request)
 */
export interface RateLimitContext {
  /** User or API key identifier */
  readonly identifier: string;
  /** User's subscription tier */
  readonly tier: RateLimitTier;
  /** Request path (for per-endpoint limits) */
  readonly path?: string;
  /** Request method */
  readonly method?: string;
}

// =============================================================================
// UPSTASH INTEGRATION
// =============================================================================

/**
 * Upstash Redis configuration
 */
export interface UpstashConfig {
  /** Upstash REST URL */
  readonly url: string;
  /** Upstash REST token */
  readonly token: string;
}

/**
 * Upstash pipeline response item
 */
interface UpstashPipelineItem<T> {
  result: T;
}

/**
 * Sliding window rate limiter using Upstash Redis
 *
 * Uses the sliding window algorithm for smooth rate limiting:
 * - Divides time into windows (1 minute)
 * - Weights previous window by overlap percentage
 * - Provides smoother limiting than fixed windows
 *
 * @example
 * ```typescript
 * const limiter = createRateLimiter({
 *   url: process.env.UPSTASH_REDIS_REST_URL!,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
 * });
 *
 * const result = await limiter.check({
 *   identifier: 'user_123',
 *   tier: 'pro',
 * });
 *
 * if (!result.allowed) {
 *   return new Response('Rate limit exceeded', {
 *     status: 429,
 *     headers: {
 *       'Retry-After': String(result.retryAfter),
 *     },
 *   });
 * }
 * ```
 */
export interface RateLimiter {
  /**
   * Check if a request is allowed under rate limits
   */
  check(context: RateLimitContext): Promise<RateLimitResult>;

  /**
   * Get current usage without incrementing
   */
  peek(context: RateLimitContext): Promise<RateLimitResult>;

  /**
   * Reset rate limit for an identifier (admin use)
   */
  reset(identifier: string): Promise<void>;
}

// =============================================================================
// RATE LIMITER FACTORY
// =============================================================================

/**
 * Create a rate limiter instance
 *
 * @param config - Upstash configuration
 * @returns Rate limiter instance
 *
 * @example
 * ```typescript
 * // In API middleware
 * import { createRateLimiter, RATE_LIMITS } from '@ada-ai/core/api/rate-limit';
 *
 * const limiter = createRateLimiter({
 *   url: process.env.UPSTASH_REDIS_REST_URL!,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
 * });
 *
 * export async function rateLimitMiddleware(req: Request, user: User) {
 *   const result = await limiter.check({
 *     identifier: user.id,
 *     tier: user.tier as RateLimitTier,
 *   });
 *
 *   if (!result.allowed) {
 *     return rateLimitResponse(result);
 *   }
 *
 *   // Continue to handler...
 * }
 * ```
 */
export function createRateLimiter(config: UpstashConfig): RateLimiter {
  const WINDOW_SIZE_MS = 60_000; // 1 minute

  /**
   * Generate Redis key for rate limit bucket
   */
  function getKey(identifier: string, windowStart: number): string {
    return `ratelimit:${identifier}:${windowStart}`;
  }

  /**
   * Execute pipeline of commands
   */
  async function pipeline<T>(commands: string[][]): Promise<T[]> {
    const response = await fetch(`${config.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      throw new Error(`Upstash pipeline error: ${response.status}`);
    }

    const data = (await response.json()) as UpstashPipelineItem<T>[];
    return data.map((r) => r.result);
  }

  return {
    async check(context: RateLimitContext): Promise<RateLimitResult> {
      const now = Date.now();
      const currentWindow = Math.floor(now / WINDOW_SIZE_MS) * WINDOW_SIZE_MS;
      const previousWindow = currentWindow - WINDOW_SIZE_MS;
      const windowProgress = (now - currentWindow) / WINDOW_SIZE_MS;

      const tierConfig = RATE_LIMITS[context.tier];
      const limit = tierConfig.requestsPerMinute;

      const currentKey = getKey(context.identifier, currentWindow);
      const previousKey = getKey(context.identifier, previousWindow);

      // Atomic increment and get both windows
      const results = await pipeline<number | string | null>([
        ['INCR', currentKey],
        ['GET', previousKey],
        ['EXPIRE', currentKey, '120'], // 2 minutes TTL
      ]);

      const currentCount = typeof results[0] === 'number' ? results[0] : 0;
      const previousCount = results[1] ? Number(results[1]) : 0;

      // Sliding window: weight previous window by remaining time
      const weightedCount = Math.floor(
        currentCount + previousCount * (1 - windowProgress)
      );

      const allowed = weightedCount <= limit;
      const remaining = Math.max(0, limit - weightedCount);
      const resetAt = currentWindow + WINDOW_SIZE_MS;
      const retryAfter = Math.ceil((resetAt - now) / 1000);

      return {
        allowed,
        current: weightedCount,
        limit,
        remaining,
        resetAt: Math.floor(resetAt / 1000), // Unix seconds
        retryAfter: allowed ? 0 : retryAfter,
      };
    },

    async peek(context: RateLimitContext): Promise<RateLimitResult> {
      const now = Date.now();
      const currentWindow = Math.floor(now / WINDOW_SIZE_MS) * WINDOW_SIZE_MS;
      const previousWindow = currentWindow - WINDOW_SIZE_MS;
      const windowProgress = (now - currentWindow) / WINDOW_SIZE_MS;

      const tierConfig = RATE_LIMITS[context.tier];
      const limit = tierConfig.requestsPerMinute;

      const currentKey = getKey(context.identifier, currentWindow);
      const previousKey = getKey(context.identifier, previousWindow);

      const results = await pipeline<string | null>([
        ['GET', currentKey],
        ['GET', previousKey],
      ]);

      const currentCount = results[0] ? Number(results[0]) : 0;
      const previousCount = results[1] ? Number(results[1]) : 0;

      const weightedCount = Math.floor(
        currentCount + previousCount * (1 - windowProgress)
      );

      const allowed = weightedCount < limit;
      const remaining = Math.max(0, limit - weightedCount);
      const resetAt = currentWindow + WINDOW_SIZE_MS;

      return {
        allowed,
        current: weightedCount,
        limit,
        remaining,
        resetAt: Math.floor(resetAt / 1000),
        retryAfter: allowed ? 0 : Math.ceil((resetAt - now) / 1000),
      };
    },

    async reset(identifier: string): Promise<void> {
      const now = Date.now();
      const currentWindow = Math.floor(now / WINDOW_SIZE_MS) * WINDOW_SIZE_MS;
      const previousWindow = currentWindow - WINDOW_SIZE_MS;

      await pipeline<number>([
        ['DEL', getKey(identifier, currentWindow)],
        ['DEL', getKey(identifier, previousWindow)],
      ]);
    },
  };
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/**
 * Build rate limit headers from check result
 */
export function buildRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': result.limit,
    'X-RateLimit-Remaining': result.remaining,
    'X-RateLimit-Reset': result.resetAt,
  };

  if (!result.allowed) {
    headers['Retry-After'] = result.retryAfter;
  }

  return headers;
}

/**
 * Create a 429 Too Many Requests response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  requestId: string
): {
  status: 429;
  headers: RateLimitHeaders;
  body: {
    error: {
      code: 'rate_limited';
      message: string;
      retryAfter: number;
      requestId: string;
    };
  };
} {
  return {
    status: 429,
    headers: buildRateLimitHeaders(result),
    body: {
      error: {
        code: 'rate_limited',
        message: `Rate limit exceeded. Retry after ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
        requestId,
      },
    },
  };
}

// =============================================================================
// CONCURRENT EXECUTION LIMITER
// =============================================================================

/**
 * Concurrent execution limiter for dispatch operations
 *
 * Tracks active dispatch executions per user to enforce tier limits.
 */
export interface ConcurrencyLimiter {
  /**
   * Acquire a slot for execution
   * @returns Slot ID if acquired, null if limit reached
   */
  acquire(userId: string, tier: RateLimitTier): Promise<string | null>;

  /**
   * Release an execution slot
   */
  release(userId: string, slotId: string): Promise<void>;

  /**
   * Get current active execution count
   */
  count(userId: string): Promise<number>;
}

/**
 * Upstash single command response
 */
interface UpstashSingleResponse<T> {
  result: T;
}

/**
 * Create a concurrent execution limiter
 */
export function createConcurrencyLimiter(config: UpstashConfig): ConcurrencyLimiter {
  const SLOT_TTL_SECONDS = 3600; // 1 hour max execution time

  async function execute<T>(command: string[]): Promise<T> {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`Upstash error: ${response.status}`);
    }

    const data = (await response.json()) as UpstashSingleResponse<T>;
    return data.result;
  }

  return {
    async acquire(userId: string, tier: RateLimitTier): Promise<string | null> {
      const key = `concurrency:${userId}`;
      const limit = RATE_LIMITS[tier].concurrentExecutions;
      const slotId = `slot_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      // Check current count
      const currentCount = await execute<number>(['SCARD', key]);

      if (currentCount >= limit) {
        return null;
      }

      // Add slot (with TTL via separate EXPIRE call)
      await execute<number>(['SADD', key, slotId]);
      await execute<number>(['EXPIRE', key, String(SLOT_TTL_SECONDS)]);

      return slotId;
    },

    async release(userId: string, slotId: string): Promise<void> {
      const key = `concurrency:${userId}`;
      await execute<number>(['SREM', key, slotId]);
    },

    async count(userId: string): Promise<number> {
      const key = `concurrency:${userId}`;
      const result = await execute<number>(['SCARD', key]);
      return result;
    },
  };
}
