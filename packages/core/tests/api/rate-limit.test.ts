/**
 * Rate Limiting Module Tests
 *
 * @author 🌌 The Frontier (C1286)
 * @date 2026-02-28
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RATE_LIMITS,
  createRateLimiter,
  createConcurrencyLimiter,
  buildRateLimitHeaders,
  createRateLimitResponse,
  type RateLimitResult,
  type RateLimitTier,
} from '../../src/api/rate-limit';

// =============================================================================
// RATE LIMIT CONFIGURATION TESTS
// =============================================================================

describe('RATE_LIMITS configuration', () => {
  it('should have correct free tier limits', () => {
    expect(RATE_LIMITS.free).toEqual({
      requestsPerMinute: 60,
      burstLimit: 100,
      concurrentExecutions: 1,
    });
  });

  it('should have correct pro tier limits', () => {
    expect(RATE_LIMITS.pro).toEqual({
      requestsPerMinute: 300,
      burstLimit: 500,
      concurrentExecutions: 5,
    });
  });

  it('should have correct enterprise tier limits', () => {
    expect(RATE_LIMITS.enterprise).toEqual({
      requestsPerMinute: 1000,
      burstLimit: 2000,
      concurrentExecutions: 25,
    });
  });

  it('should be frozen (readonly)', () => {
    // Test that the type system prevents modification
    // At runtime, Object.freeze makes it immutable
    expect(Object.isFrozen(RATE_LIMITS)).toBe(true);
  });
});

// =============================================================================
// RATE LIMITER TESTS
// =============================================================================

describe('createRateLimiter', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  const mockConfig = {
    url: 'https://test.upstash.io',
    token: 'test-token',
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('check()', () => {
    it('should allow request when under limit', async () => {
      // Mock pipeline response: [currentCount, previousCount, expireResult]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { result: 5 }, // INCR current
            { result: '10' }, // GET previous
            { result: 1 }, // EXPIRE
          ]),
      });

      const limiter = createRateLimiter(mockConfig);
      const result = await limiter.check({
        identifier: 'user_123',
        tier: 'free',
      });

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(RATE_LIMITS.free.requestsPerMinute);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should deny request when over limit', async () => {
      // Mock response with high counts that exceed free tier (60)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { result: 100 }, // INCR current - way over limit
            { result: '0' }, // GET previous
            { result: 1 }, // EXPIRE
          ]),
      });

      const limiter = createRateLimiter(mockConfig);
      const result = await limiter.check({
        identifier: 'user_123',
        tier: 'free',
      });

      expect(result.allowed).toBe(false);
      expect(result.current).toBeGreaterThan(RATE_LIMITS.free.requestsPerMinute);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should use correct limits for each tier', async () => {
      const tiers: RateLimitTier[] = ['free', 'pro', 'enterprise'];

      for (const tier of tiers) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve([
              { result: 1 },
              { result: null },
              { result: 1 },
            ]),
        });

        const limiter = createRateLimiter(mockConfig);
        const result = await limiter.check({
          identifier: 'user_123',
          tier,
        });

        expect(result.limit).toBe(RATE_LIMITS[tier].requestsPerMinute);
      }
    });

    it('should include weighted previous window in calculation', async () => {
      // Mock: current = 30, previous = 40
      // With 50% window progress, weighted = 30 + (40 * 0.5) = 50
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { result: 30 },
            { result: '40' },
            { result: 1 },
          ]),
      });

      const limiter = createRateLimiter(mockConfig);
      const result = await limiter.check({
        identifier: 'user_123',
        tier: 'free',
      });

      // Should still be under limit (60 for free tier)
      expect(result.allowed).toBe(true);
    });

    it('should handle null previous window', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { result: 10 },
            { result: null }, // No previous window
            { result: 1 },
          ]),
      });

      const limiter = createRateLimiter(mockConfig);
      const result = await limiter.check({
        identifier: 'user_123',
        tier: 'free',
      });

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(10);
    });

    it('should throw on Upstash error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const limiter = createRateLimiter(mockConfig);

      await expect(
        limiter.check({ identifier: 'user_123', tier: 'free' })
      ).rejects.toThrow('Upstash pipeline error: 500');
    });
  });

  describe('peek()', () => {
    it('should return current usage without incrementing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { result: '25' }, // GET current
            { result: '10' }, // GET previous
          ]),
      });

      const limiter = createRateLimiter(mockConfig);
      const result = await limiter.peek({
        identifier: 'user_123',
        tier: 'free',
      });

      expect(result.limit).toBe(RATE_LIMITS.free.requestsPerMinute);
      // Current should be weighted: 25 + some portion of 10
      expect(result.current).toBeGreaterThanOrEqual(25);
    });
  });

  describe('reset()', () => {
    it('should delete both window keys', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { result: 1 }, // DEL current
            { result: 1 }, // DEL previous
          ]),
      });

      const limiter = createRateLimiter(mockConfig);
      await limiter.reset('user_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/pipeline'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});

// =============================================================================
// CONCURRENCY LIMITER TESTS
// =============================================================================

describe('createConcurrencyLimiter', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  const mockConfig = {
    url: 'https://test.upstash.io',
    token: 'test-token',
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('acquire()', () => {
    it('should acquire slot when under limit', async () => {
      // SCARD returns 0, then SADD and EXPIRE succeed
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: 1 }),
        });

      const limiter = createConcurrencyLimiter(mockConfig);
      const slotId = await limiter.acquire('user_123', 'free');

      expect(slotId).toBeTruthy();
      expect(slotId).toMatch(/^slot_\d+_[a-z0-9]+$/);
    });

    it('should return null when at limit', async () => {
      // SCARD returns limit value
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 1 }), // Free tier limit is 1
      });

      const limiter = createConcurrencyLimiter(mockConfig);
      const slotId = await limiter.acquire('user_123', 'free');

      expect(slotId).toBeNull();
    });

    it('should allow more slots for higher tiers', async () => {
      // Pro tier: 5 concurrent executions
      // Current count: 4, should allow one more
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: 4 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: 1 }),
        });

      const limiter = createConcurrencyLimiter(mockConfig);
      const slotId = await limiter.acquire('user_123', 'pro');

      expect(slotId).toBeTruthy();
    });
  });

  describe('release()', () => {
    it('should remove slot from set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 1 }),
      });

      const limiter = createConcurrencyLimiter(mockConfig);
      await limiter.release('user_123', 'slot_123_abc');

      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.url,
        expect.objectContaining({
          body: expect.stringContaining('SREM'),
        })
      );
    });
  });

  describe('count()', () => {
    it('should return current slot count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 3 }),
      });

      const limiter = createConcurrencyLimiter(mockConfig);
      const count = await limiter.count('user_123');

      expect(count).toBe(3);
    });
  });
});

// =============================================================================
// RESPONSE HELPER TESTS
// =============================================================================

describe('buildRateLimitHeaders', () => {
  it('should build headers for allowed request', () => {
    const result: RateLimitResult = {
      allowed: true,
      current: 10,
      limit: 60,
      remaining: 50,
      resetAt: 1709164800,
      retryAfter: 0,
    };

    const headers = buildRateLimitHeaders(result);

    expect(headers).toEqual({
      'X-RateLimit-Limit': 60,
      'X-RateLimit-Remaining': 50,
      'X-RateLimit-Reset': 1709164800,
    });
    expect(headers['Retry-After']).toBeUndefined();
  });

  it('should include Retry-After for denied request', () => {
    const result: RateLimitResult = {
      allowed: false,
      current: 65,
      limit: 60,
      remaining: 0,
      resetAt: 1709164800,
      retryAfter: 45,
    };

    const headers = buildRateLimitHeaders(result);

    expect(headers['Retry-After']).toBe(45);
  });
});

describe('createRateLimitResponse', () => {
  it('should create 429 response with correct body', () => {
    const result: RateLimitResult = {
      allowed: false,
      current: 65,
      limit: 60,
      remaining: 0,
      resetAt: 1709164800,
      retryAfter: 30,
    };

    const response = createRateLimitResponse(result, 'req_abc123');

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('rate_limited');
    expect(response.body.error.retryAfter).toBe(30);
    expect(response.body.error.requestId).toBe('req_abc123');
    expect(response.body.error.message).toContain('30 seconds');
  });
});

// =============================================================================
// INTEGRATION SCENARIO TESTS
// =============================================================================

describe('Rate Limiting Integration Scenarios', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  const mockConfig = {
    url: 'https://test.upstash.io',
    token: 'test-token',
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should handle burst traffic correctly', async () => {
    // Simulate 5 rapid requests
    const limiter = createRateLimiter(mockConfig);
    const results: RateLimitResult[] = [];

    for (let i = 1; i <= 5; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { result: i },
            { result: null },
            { result: 1 },
          ]),
      });

      const result = await limiter.check({
        identifier: 'user_burst',
        tier: 'free',
      });
      results.push(result);
    }

    // All should be allowed (under 60 limit)
    expect(results.every((r) => r.allowed)).toBe(true);
    // Remaining should decrease
    expect(results[0].remaining).toBeGreaterThan(results[4].remaining);
  });

  it('should enforce different limits per tier', async () => {
    // Test that same request count is denied for free but allowed for pro
    // Count of 100 exceeds free (60) but not pro (300)

    // Free tier - count 100 exceeds limit 60
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([{ result: 100 }, { result: null }, { result: 1 }]),
    });
    const freeLimiter = createRateLimiter(mockConfig);
    const freeResult = await freeLimiter.check({
      identifier: 'free_user',
      tier: 'free',
    });

    // Pro tier - same count 100 is within limit 300
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([{ result: 100 }, { result: null }, { result: 1 }]),
    });
    const proLimiter = createRateLimiter(mockConfig);
    const proResult = await proLimiter.check({
      identifier: 'pro_user',
      tier: 'pro',
    });

    expect(freeResult.allowed).toBe(false);
    expect(freeResult.limit).toBe(60);
    expect(proResult.allowed).toBe(true);
    expect(proResult.limit).toBe(300);
  });
});
