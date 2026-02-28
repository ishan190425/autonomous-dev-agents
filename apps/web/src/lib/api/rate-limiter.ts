/**
 * ADA API Rate Limiter Integration
 *
 * Web-specific integration layer that wraps the core rate-limit module
 * for use in Next.js API routes. Provides singleton limiter instance,
 * request-scoped rate limit checking, and response header utilities.
 *
 * @author 🌌 The Frontier (C1296)
 * @date 2026-02-28
 * @related #190 (API Gateway), #269 (rate-limit module)
 *
 * @example
 * ```typescript
 * import { checkRateLimit, getRateLimitHeaders } from '@/lib/api/rate-limiter';
 *
 * export async function GET(request: NextRequest) {
 *   const result = await checkRateLimit({
 *     identifier: userId || getClientIp(request),
 *     tier: userTier,
 *   });
 *
 *   if (!result.allowed) {
 *     return apiRateLimited(result);
 *   }
 *
 *   // ... handle request
 *   return NextResponse.json(data, {
 *     headers: getRateLimitHeaders(result),
 *   });
 * }
 * ```
 */

import type { NextRequest } from 'next/server';
import type { RateLimitTier } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Rate limit check input
 */
export interface RateLimitInput {
  /** User ID, API key hash, or IP address */
  identifier: string;
  /** User's subscription tier */
  tier: RateLimitTier;
  /** Optional: endpoint path for per-route limits */
  path?: string;
  /** Optional: HTTP method for method-specific limits */
  method?: string;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count in window */
  current: number;
  /** Maximum allowed in window */
  limit: number;
  /** Remaining requests */
  remaining: number;
  /** Unix timestamp (seconds) when window resets */
  resetAt: number;
  /** Seconds until reset (for Retry-After header) */
  retryAfter: number;
}

/**
 * Concurrent execution check result
 */
export interface ConcurrencyResult {
  /** Whether execution is allowed */
  allowed: boolean;
  /** Current active executions */
  current: number;
  /** Maximum concurrent executions */
  limit: number;
  /** Execution slot ID (for release) */
  slotId?: string;
}

// =============================================================================
// RATE LIMIT CONFIGS
// =============================================================================

/**
 * Tier-based rate limit configurations
 * @see docs/architecture/adr-api-gateway-c1276.md
 */
export const RATE_LIMIT_CONFIGS: Record<RateLimitTier, {
  requestsPerMinute: number;
  burstLimit: number;
  concurrentExecutions: number;
}> = {
  free: {
    requestsPerMinute: 60,
    burstLimit: 100,
    concurrentExecutions: 1,
  },
  pro: {
    requestsPerMinute: 300,
    burstLimit: 500,
    concurrentExecutions: 5,
  },
  enterprise: {
    requestsPerMinute: 1000,
    burstLimit: 2000,
    concurrentExecutions: 25,
  },
};

// =============================================================================
// IN-MEMORY RATE LIMITER (DEV/TEST)
// =============================================================================

/**
 * Sliding window entry for in-memory rate limiting
 */
interface WindowEntry {
  count: number;
  windowStart: number;
}

/**
 * In-memory rate limit storage (for development/testing)
 * Production uses Upstash Redis via @upstash/ratelimit
 */
const rateLimitStore = new Map<string, WindowEntry>();

/**
 * Window duration in milliseconds (1 minute)
 */
const WINDOW_MS = 60_000;

/**
 * Cleanup old entries every 5 minutes
 */
const CLEANUP_INTERVAL_MS = 300_000;

// Periodic cleanup of expired entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const cutoff = now - WINDOW_MS * 2;
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.windowStart < cutoff) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

// =============================================================================
// RATE LIMIT CHECKING
// =============================================================================

/**
 * Check rate limit for a request.
 *
 * In production with UPSTASH_REDIS_REST_URL set, uses Upstash sliding window.
 * Otherwise falls back to in-memory for development.
 */
export async function checkRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[input.tier];
  const key = buildRateLimitKey(input);

  // Use Upstash if configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return checkUpstashRateLimit(key, config.requestsPerMinute);
  }

  // Fall back to in-memory for dev/test
  return checkInMemoryRateLimit(key, config.requestsPerMinute);
}

/**
 * Build rate limit key from input
 */
function buildRateLimitKey(input: RateLimitInput): string {
  const parts = ['ratelimit', input.identifier];
  if (input.path) {
    // Normalize path: /api/v1/workspaces/ws_123/agents -> /api/v1/workspaces/:id/agents
    const normalizedPath = input.path.replace(/\/[a-zA-Z0-9_-]{8,}(?=\/|$)/g, '/:id');
    parts.push(normalizedPath);
  }
  if (input.method) {
    parts.push(input.method.toUpperCase());
  }
  return parts.join(':');
}

/**
 * In-memory sliding window rate limit check
 */
function checkInMemoryRateLimit(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const prevWindowStart = windowStart - WINDOW_MS;

  // Get current and previous window
  const currentEntry = rateLimitStore.get(`${key}:${windowStart}`) || { count: 0, windowStart };
  const prevEntry = rateLimitStore.get(`${key}:${prevWindowStart}`);

  // Calculate weighted count (sliding window)
  const windowProgress = (now - windowStart) / WINDOW_MS;
  const prevWeight = 1 - windowProgress;
  const prevCount = prevEntry ? prevEntry.count * prevWeight : 0;
  const totalCount = Math.floor(prevCount + currentEntry.count);

  // Check if allowed
  const allowed = totalCount < limit;
  const resetAt = Math.floor((windowStart + WINDOW_MS) / 1000);

  if (allowed) {
    // Increment counter
    currentEntry.count += 1;
    rateLimitStore.set(`${key}:${windowStart}`, currentEntry);
  }

  return {
    allowed,
    current: totalCount + (allowed ? 1 : 0),
    limit,
    remaining: Math.max(0, limit - totalCount - (allowed ? 1 : 0)),
    resetAt,
    retryAfter: Math.ceil((windowStart + WINDOW_MS - now) / 1000),
  };
}

/**
 * Upstash sliding window rate limit check
 */
async function checkUpstashRateLimit(key: string, limit: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  const now = Date.now();
  const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const prevWindowStart = windowStart - WINDOW_MS;

  const currentKey = `${key}:${windowStart}`;
  const prevKey = `${key}:${prevWindowStart}`;

  try {
    // Get current and previous counts
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['GET', currentKey],
        ['GET', prevKey],
      ]),
    });

    if (!response.ok) {
      // Fail open on Redis errors
      console.error('[rate-limiter] Upstash error:', response.statusText);
      return {
        allowed: true,
        current: 0,
        limit,
        remaining: limit,
        resetAt: Math.floor((windowStart + WINDOW_MS) / 1000),
        retryAfter: 0,
      };
    }

    const results = await response.json();
    const currentCount = parseInt(results[0]?.result || '0', 10);
    const prevCount = parseInt(results[1]?.result || '0', 10);

    // Calculate weighted count
    const windowProgress = (now - windowStart) / WINDOW_MS;
    const prevWeight = 1 - windowProgress;
    const totalCount = Math.floor(prevCount * prevWeight + currentCount);

    const allowed = totalCount < limit;
    const resetAt = Math.floor((windowStart + WINDOW_MS) / 1000);

    if (allowed) {
      // Increment counter (fire and forget)
      fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', currentKey],
          ['EXPIRE', currentKey, '120'], // 2 minute TTL
        ]),
      }).catch(() => {
        // Ignore increment errors
      });
    }

    return {
      allowed,
      current: totalCount + (allowed ? 1 : 0),
      limit,
      remaining: Math.max(0, limit - totalCount - (allowed ? 1 : 0)),
      resetAt,
      retryAfter: Math.ceil((windowStart + WINDOW_MS - now) / 1000),
    };
  } catch (error) {
    // Fail open on network errors
    console.error('[rate-limiter] Upstash error:', error);
    return {
      allowed: true,
      current: 0,
      limit,
      remaining: limit,
      resetAt: Math.floor((windowStart + WINDOW_MS) / 1000),
      retryAfter: 0,
    };
  }
}

// =============================================================================
// CONCURRENT EXECUTION LIMITING
// =============================================================================

/**
 * In-memory concurrency tracking
 */
const concurrencyStore = new Map<string, Set<string>>();

/**
 * Check and acquire concurrent execution slot
 */
export async function acquireExecutionSlot(
  userId: string,
  tier: RateLimitTier
): Promise<ConcurrencyResult> {
  const config = RATE_LIMIT_CONFIGS[tier];
  const key = `concurrency:${userId}`;

  // Use Upstash if configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return acquireUpstashSlot(key, config.concurrentExecutions);
  }

  // Fall back to in-memory
  return acquireInMemorySlot(key, config.concurrentExecutions);
}

/**
 * Release concurrent execution slot
 */
export async function releaseExecutionSlot(
  userId: string,
  slotId: string
): Promise<void> {
  const key = `concurrency:${userId}`;

  // Use Upstash if configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    await releaseUpstashSlot(key, slotId);
    return;
  }

  // Fall back to in-memory
  releaseInMemorySlot(key, slotId);
}

/**
 * In-memory slot acquisition
 */
function acquireInMemorySlot(key: string, limit: number): ConcurrencyResult {
  let slots = concurrencyStore.get(key);
  if (!slots) {
    slots = new Set();
    concurrencyStore.set(key, slots);
  }

  if (slots.size >= limit) {
    return {
      allowed: false,
      current: slots.size,
      limit,
    };
  }

  const slotId = `slot_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  slots.add(slotId);

  return {
    allowed: true,
    current: slots.size,
    limit,
    slotId,
  };
}

/**
 * In-memory slot release
 */
function releaseInMemorySlot(key: string, slotId: string): void {
  const slots = concurrencyStore.get(key);
  if (slots) {
    slots.delete(slotId);
    if (slots.size === 0) {
      concurrencyStore.delete(key);
    }
  }
}

/**
 * Upstash slot acquisition
 */
async function acquireUpstashSlot(key: string, limit: number): Promise<ConcurrencyResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  const slotId = `slot_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  try {
    // Use SETNX with expiry for slot acquisition
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['SCARD', key], // Get current count
        ['SADD', key, slotId], // Try to add slot
      ]),
    });

    if (!response.ok) {
      // Fail open
      return { allowed: true, current: 0, limit, slotId };
    }

    const results = await response.json();
    const currentCount = results[0]?.result || 0;

    if (currentCount >= limit) {
      // Remove the slot we just added
      fetch(`${url}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SREM', key, slotId]),
      }).catch(() => {});

      return { allowed: false, current: currentCount, limit };
    }

    // Set slot expiry (1 hour max execution time)
    fetch(`${url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['EXPIRE', key, '3600']),
    }).catch(() => {});

    return {
      allowed: true,
      current: currentCount + 1,
      limit,
      slotId,
    };
  } catch (error) {
    // Fail open
    console.error('[rate-limiter] Upstash concurrency error:', error);
    return { allowed: true, current: 0, limit, slotId };
  }
}

/**
 * Upstash slot release
 */
async function releaseUpstashSlot(key: string, slotId: string): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  try {
    await fetch(`${url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SREM', key, slotId]),
    });
  } catch (error) {
    console.error('[rate-limiter] Upstash release error:', error);
  }
}

// =============================================================================
// HEADER UTILITIES
// =============================================================================

/**
 * Build rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

// =============================================================================
// REQUEST UTILITIES
// =============================================================================

/**
 * Extract client IP from request headers
 * Handles common proxy headers (Cloudflare, Vercel, etc.)
 */
export function getClientIp(request: NextRequest): string {
  // Check headers in order of trust
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp;

  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Take the first IP (client IP)
    return xForwardedFor.split(',')[0].trim();
  }

  // Vercel specific
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  // Fallback to anonymous
  return 'anonymous';
}

// =============================================================================
// TESTING UTILITIES
// =============================================================================

/**
 * Reset rate limit store (for testing)
 * @internal
 */
export function _resetRateLimitStore(): void {
  rateLimitStore.clear();
  concurrencyStore.clear();
}
