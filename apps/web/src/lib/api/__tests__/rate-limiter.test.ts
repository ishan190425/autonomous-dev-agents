/**
 * Rate Limiter Integration Tests
 *
 * Tests the rate limiting infrastructure for the ADA API Gateway.
 *
 * @author 🌌 The Frontier (C1296)
 * @date 2026-02-28
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  checkRateLimit,
  getRateLimitHeaders,
  getClientIp,
  acquireExecutionSlot,
  releaseExecutionSlot,
  RATE_LIMIT_CONFIGS,
  _resetRateLimitStore,
} from '../rate-limiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    _resetRateLimitStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('RATE_LIMIT_CONFIGS', () => {
    it('should have correct free tier limits', () => {
      expect(RATE_LIMIT_CONFIGS.free).toEqual({
        requestsPerMinute: 60,
        burstLimit: 100,
        concurrentExecutions: 1,
      });
    });

    it('should have correct pro tier limits', () => {
      expect(RATE_LIMIT_CONFIGS.pro).toEqual({
        requestsPerMinute: 300,
        burstLimit: 500,
        concurrentExecutions: 5,
      });
    });

    it('should have correct enterprise tier limits', () => {
      expect(RATE_LIMIT_CONFIGS.enterprise).toEqual({
        requestsPerMinute: 1000,
        burstLimit: 2000,
        concurrentExecutions: 25,
      });
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      const result = await checkRateLimit({
        identifier: 'user_123',
        tier: 'free',
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59); // 60 - 1
      expect(result.limit).toBe(60);
    });

    it('should track requests across calls', async () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await checkRateLimit({
          identifier: 'user_456',
          tier: 'free',
        });
      }

      const result = await checkRateLimit({
        identifier: 'user_456',
        tier: 'free',
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(54); // 60 - 6
    });

    it('should block requests over limit', async () => {
      // Exhaust the limit
      for (let i = 0; i < 60; i++) {
        await checkRateLimit({
          identifier: 'user_789',
          tier: 'free',
        });
      }

      const result = await checkRateLimit({
        identifier: 'user_789',
        tier: 'free',
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should use different limits per tier', async () => {
      const freeResult = await checkRateLimit({
        identifier: 'free_user',
        tier: 'free',
      });

      const proResult = await checkRateLimit({
        identifier: 'pro_user',
        tier: 'pro',
      });

      const enterpriseResult = await checkRateLimit({
        identifier: 'enterprise_user',
        tier: 'enterprise',
      });

      expect(freeResult.limit).toBe(60);
      expect(proResult.limit).toBe(300);
      expect(enterpriseResult.limit).toBe(1000);
    });

    it('should separate limits per identifier', async () => {
      // Exhaust user A's limit
      for (let i = 0; i < 60; i++) {
        await checkRateLimit({
          identifier: 'user_A',
          tier: 'free',
        });
      }

      // User B should still have limit
      const result = await checkRateLimit({
        identifier: 'user_B',
        tier: 'free',
      });

      expect(result.allowed).toBe(true);
    });

    it('should include path in rate limit key when provided', async () => {
      // Same user, different paths
      const result1 = await checkRateLimit({
        identifier: 'user_123',
        tier: 'free',
        path: '/api/v1/workspaces',
      });

      const result2 = await checkRateLimit({
        identifier: 'user_123',
        tier: 'free',
        path: '/api/v1/agents',
      });

      // Both should be allowed (separate buckets)
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should normalize dynamic path segments', async () => {
      // These should be the same bucket
      const result1 = await checkRateLimit({
        identifier: 'user_123',
        tier: 'free',
        path: '/api/v1/workspaces/ws_abc123',
      });

      const result2 = await checkRateLimit({
        identifier: 'user_123',
        tier: 'free',
        path: '/api/v1/workspaces/ws_xyz789',
      });

      // Second request should show reduced remaining
      expect(result1.remaining).toBe(59);
      expect(result2.remaining).toBe(58);
    });

    it('should reset after window expires', async () => {
      // Exhaust limit
      for (let i = 0; i < 60; i++) {
        await checkRateLimit({
          identifier: 'user_reset',
          tier: 'free',
        });
      }

      // Should be blocked
      let result = await checkRateLimit({
        identifier: 'user_reset',
        tier: 'free',
      });
      expect(result.allowed).toBe(false);

      // Advance time by 61 seconds
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      result = await checkRateLimit({
        identifier: 'user_reset',
        tier: 'free',
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return standard rate limit headers', async () => {
      const result = await checkRateLimit({
        identifier: 'user_headers',
        tier: 'free',
      });

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('60');
      expect(headers['X-RateLimit-Remaining']).toBe('59');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should include Retry-After when rate limited', async () => {
      // Exhaust limit
      for (let i = 0; i < 60; i++) {
        await checkRateLimit({
          identifier: 'user_retry',
          tier: 'free',
        });
      }

      const result = await checkRateLimit({
        identifier: 'user_retry',
        tier: 'free',
      });

      const headers = getRateLimitHeaders(result);

      expect(headers['Retry-After']).toBeDefined();
      expect(parseInt(headers['Retry-After'])).toBeGreaterThan(0);
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from cf-connecting-ip', () => {
      const request = new NextRequest('http://localhost/api', {
        headers: {
          'cf-connecting-ip': '1.2.3.4',
        },
      });

      expect(getClientIp(request)).toBe('1.2.3.4');
    });

    it('should extract IP from x-real-ip', () => {
      const request = new NextRequest('http://localhost/api', {
        headers: {
          'x-real-ip': '5.6.7.8',
        },
      });

      expect(getClientIp(request)).toBe('5.6.7.8');
    });

    it('should extract first IP from x-forwarded-for', () => {
      const request = new NextRequest('http://localhost/api', {
        headers: {
          'x-forwarded-for': '9.10.11.12, 13.14.15.16',
        },
      });

      expect(getClientIp(request)).toBe('9.10.11.12');
    });

    it('should extract IP from x-vercel-forwarded-for', () => {
      const request = new NextRequest('http://localhost/api', {
        headers: {
          'x-vercel-forwarded-for': '17.18.19.20',
        },
      });

      expect(getClientIp(request)).toBe('17.18.19.20');
    });

    it('should return anonymous when no IP header present', () => {
      const request = new NextRequest('http://localhost/api');

      expect(getClientIp(request)).toBe('anonymous');
    });

    it('should prefer cf-connecting-ip over others', () => {
      const request = new NextRequest('http://localhost/api', {
        headers: {
          'cf-connecting-ip': '1.1.1.1',
          'x-real-ip': '2.2.2.2',
          'x-forwarded-for': '3.3.3.3',
        },
      });

      expect(getClientIp(request)).toBe('1.1.1.1');
    });
  });

  describe('Concurrent Execution Limiting', () => {
    describe('acquireExecutionSlot', () => {
      it('should allow acquisition within limit', async () => {
        const result = await acquireExecutionSlot('user_123', 'free');

        expect(result.allowed).toBe(true);
        expect(result.slotId).toBeDefined();
        expect(result.current).toBe(1);
        expect(result.limit).toBe(1);
      });

      it('should block when at limit', async () => {
        // Acquire the single free slot
        await acquireExecutionSlot('user_limit', 'free');

        // Second acquisition should fail
        const result = await acquireExecutionSlot('user_limit', 'free');

        expect(result.allowed).toBe(false);
        expect(result.current).toBe(1);
      });

      it('should respect tier limits', async () => {
        // Pro tier allows 5 concurrent
        for (let i = 0; i < 5; i++) {
          const result = await acquireExecutionSlot('user_pro', 'pro');
          expect(result.allowed).toBe(true);
        }

        // 6th should fail
        const result = await acquireExecutionSlot('user_pro', 'pro');
        expect(result.allowed).toBe(false);
      });
    });

    describe('releaseExecutionSlot', () => {
      it('should allow new acquisition after release', async () => {
        // Acquire
        const first = await acquireExecutionSlot('user_release', 'free');
        expect(first.allowed).toBe(true);

        // Should be blocked
        let second = await acquireExecutionSlot('user_release', 'free');
        expect(second.allowed).toBe(false);

        // Release
        await releaseExecutionSlot('user_release', first.slotId!);

        // Should be allowed again
        second = await acquireExecutionSlot('user_release', 'free');
        expect(second.allowed).toBe(true);
      });
    });
  });
});
