/**
 * API Handler Factory Tests
 *
 * Tests the createApiHandler factory and related utilities.
 *
 * @author 🌌 The Frontier (C1296)
 * @date 2026-02-28
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createApiHandler,
  createPublicHandler,
  createAuthenticatedHandler,
  createDispatchHandler,
  createOptionsHandler,
  composeMiddleware,
  withLogging,
  type HandlerContext,
} from '../handler';
import { _resetRateLimitStore } from '../rate-limiter';

// Mock API key validation
vi.mock('../api-key', () => ({
  extractApiKey: (headers: Headers) => headers.get('authorization')?.replace('Bearer ', ''),
  validateApiKey: async (key: string) => {
    if (key === 'ada_live_valid_key') {
      return {
        userId: 'user_123',
        tier: 'pro' as const,
        scopes: ['workspaces:read', 'workspaces:write'],
      };
    }
    if (key === 'ada_live_free_key') {
      return {
        userId: 'user_free',
        tier: 'free' as const,
        scopes: ['workspaces:read'],
      };
    }
    return null;
  },
}));

describe('API Handler Factory', () => {
  beforeEach(() => {
    _resetRateLimitStore();
  });

  describe('createApiHandler', () => {
    it('should execute handler and return response', async () => {
      const handler = createApiHandler({}, async () => {
        return NextResponse.json({ message: 'Hello' });
      });

      const request = new NextRequest('http://localhost/api/v1/test');
      const response = await handler(request, { params: {} });

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.message).toBe('Hello');
    });

    it('should add X-Request-Id header', async () => {
      const handler = createApiHandler({}, async () => {
        return NextResponse.json({ ok: true });
      });

      const request = new NextRequest('http://localhost/api/v1/test');
      const response = await handler(request, { params: {} });

      expect(response.headers.get('X-Request-Id')).toBeDefined();
      // Request ID is a UUID format
      expect(response.headers.get('X-Request-Id')).toMatch(/^[a-f0-9-]+$/);
    });

    it('should add X-Api-Version header', async () => {
      const handler = createApiHandler({}, async () => {
        return NextResponse.json({ ok: true });
      });

      const request = new NextRequest('http://localhost/api/v1/test');
      const response = await handler(request, { params: {} });

      expect(response.headers.get('X-Api-Version')).toBe('v1');
    });

    it('should add CORS headers', async () => {
      const handler = createApiHandler({}, async () => {
        return NextResponse.json({ ok: true });
      });

      const request = new NextRequest('http://localhost/api/v1/test');
      const response = await handler(request, { params: {} });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  describe('Authentication', () => {
    it('should pass context with user when authenticated', async () => {
      let capturedContext: HandlerContext | undefined;

      const handler = createApiHandler({ auth: 'optional' }, async (_, context) => {
        capturedContext = context;
        return NextResponse.json({ ok: true });
      });

      const request = new NextRequest('http://localhost/api/v1/test', {
        headers: { authorization: 'Bearer ada_live_valid_key' },
      });

      await handler(request, { params: {} });

      expect(capturedContext.userId).toBe('user_123');
      expect(capturedContext.tier).toBe('pro');
      expect(capturedContext.authMethod).toBe('api_key');
    });

    it('should return 401 when auth required but not provided', async () => {
      const handler = createApiHandler({ auth: 'required' }, async () => {
        return NextResponse.json({ ok: true });
      });

      const request = new NextRequest('http://localhost/api/v1/test');
      const response = await handler(request, { params: {} });

      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.status).toBe(401);
      expect(body.title).toContain('Unauthorized');
    });

    it('should return 401 when API key is invalid', async () => {
      const handler = createApiHandler({ auth: 'required' }, async () => {
        return NextResponse.json({ ok: true });
      });

      const request = new NextRequest('http://localhost/api/v1/test', {
        headers: { authorization: 'Bearer ada_live_invalid_key' },
      });

      const response = await handler(request, { params: {} });

      expect(response.status).toBe(401);
    });

    it('should allow request when auth is optional and not provided', async () => {
      const handler = createApiHandler({ auth: 'optional' }, async () => {
        return NextResponse.json({ ok: true });
      });

      const request = new NextRequest('http://localhost/api/v1/test');
      const response = await handler(request, { params: {} });

      expect(response.status).toBe(200);
    });

    it('should allow request when auth is none', async () => {
      const handler = createApiHandler({ auth: 'none' }, async () => {
        return NextResponse.json({ ok: true });
      });

      const request = new NextRequest('http://localhost/api/v1/test');
      const response = await handler(request, { params: {} });

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should add rate limit headers when enabled', async () => {
      const handler = createApiHandler({ rateLimit: true }, async () => {
        return NextResponse.json({ ok: true });
      });

      const request = new NextRequest('http://localhost/api/v1/test');
      const response = await handler(request, { params: {} });

      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should return 429 when rate limit exceeded', async () => {
      const handler = createApiHandler({ rateLimit: true }, async () => {
        return NextResponse.json({ ok: true });
      });

      // Exhaust rate limit (free tier = 60/min)
      for (let i = 0; i < 60; i++) {
        const request = new NextRequest('http://localhost/api/v1/test', {
          headers: { 'x-forwarded-for': '1.2.3.4' },
        });
        await handler(request, { params: {} });
      }

      // Next request should be rate limited
      const request = new NextRequest('http://localhost/api/v1/test', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });
      const response = await handler(request, { params: {} });

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeDefined();
    });

    it('should use tier-based rate limits when authenticated', async () => {
      let remaining: string | null = null;

      const handler = createApiHandler({ rateLimit: true }, async () => {
        return NextResponse.json({ ok: true });
      });

      // Pro user has 300/min limit
      const request = new NextRequest('http://localhost/api/v1/test', {
        headers: { authorization: 'Bearer ada_live_valid_key' },
      });

      const response = await handler(request, { params: {} });
      remaining = response.headers.get('X-RateLimit-Remaining');

      // Should show remaining from 300 limit
      expect(parseInt(remaining || '0')).toBe(299);
    });
  });

  describe('Body Validation', () => {
    it('should validate request body with Zod schema', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      let capturedBody: { name: string; email: string } | undefined;

      const handler = createApiHandler(
        { validateBody: schema },
        async (_, context) => {
          capturedBody = context.body as { name: string; email: string };
          return NextResponse.json({ ok: true });
        }
      );

      const request = new NextRequest('http://localhost/api/v1/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
      });

      const response = await handler(request, { params: {} });

      expect(response.status).toBe(200);
      expect(capturedBody.name).toBe('Test');
      expect(capturedBody.email).toBe('test@example.com');
    });

    it('should return 400 for invalid body', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      const handler = createApiHandler(
        { validateBody: schema },
        async () => {
          return NextResponse.json({ ok: true });
        }
      );

      const request = new NextRequest('http://localhost/api/v1/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: '', email: 'not-an-email' }),
      });

      const response = await handler(request, { params: {} });

      // 422 Unprocessable Entity is the correct status for validation errors per RFC 7807
      expect(response.status).toBe(422);

      const body = await response.json();
      expect(body.type).toContain('validation_error');
    });

    it('should return 400 for invalid JSON', async () => {
      const schema = z.object({
        name: z.string(),
      });

      const handler = createApiHandler(
        { validateBody: schema },
        async () => {
          return NextResponse.json({ ok: true });
        }
      );

      const request = new NextRequest('http://localhost/api/v1/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not valid json',
      });

      const response = await handler(request, { params: {} });

      expect(response.status).toBe(400);

      const body = await response.json();
      // RFC 7807 type is a URL format
      expect(body.type).toContain('invalid_request_body');
    });
  });

  describe('Pagination', () => {
    it('should parse pagination params from query string', async () => {
      let capturedPagination: { page: number; pageSize: number } | undefined;

      const handler = createApiHandler({}, async (_, context) => {
        capturedPagination = context.pagination;
        return NextResponse.json({ ok: true });
      });

      const request = new NextRequest('http://localhost/api/v1/test?page=3&pageSize=50');
      await handler(request, { params: {} });

      expect(capturedPagination.page).toBe(3);
      expect(capturedPagination.pageSize).toBe(50);
    });

    it('should use defaults when pagination params not provided', async () => {
      let capturedPagination: { page: number; pageSize: number } | undefined;

      const handler = createApiHandler({}, async (_, context) => {
        capturedPagination = context.pagination;
        return NextResponse.json({ ok: true });
      });

      const request = new NextRequest('http://localhost/api/v1/test');
      await handler(request, { params: {} });

      expect(capturedPagination.page).toBe(1);
      expect(capturedPagination.pageSize).toBe(20);
    });

    it('should cap pageSize at 100', async () => {
      let capturedPagination: { page: number; pageSize: number } | undefined;

      const handler = createApiHandler({}, async (_, context) => {
        capturedPagination = context.pagination;
        return NextResponse.json({ ok: true });
      });

      const request = new NextRequest('http://localhost/api/v1/test?pageSize=500');
      await handler(request, { params: {} });

      expect(capturedPagination.pageSize).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should catch and wrap unhandled errors', async () => {
      const handler = createApiHandler({}, async () => {
        throw new Error('Something went wrong');
      });

      const request = new NextRequest('http://localhost/api/v1/test');
      const response = await handler(request, { params: {} });

      expect(response.status).toBe(500);

      const body = await response.json();
      // RFC 7807 type is a URL format
      expect(body.type).toContain('internal_error');
    });
  });

  describe('Convenience Factories', () => {
    describe('createPublicHandler', () => {
      it('should not require auth', async () => {
        const handler = createPublicHandler(async () => {
          return NextResponse.json({ public: true });
        });

        const request = new NextRequest('http://localhost/api/v1/public');
        const response = await handler(request, { params: {} });

        expect(response.status).toBe(200);
      });
    });

    describe('createAuthenticatedHandler', () => {
      it('should require auth', async () => {
        const handler = createAuthenticatedHandler(async () => {
          return NextResponse.json({ authenticated: true });
        });

        const request = new NextRequest('http://localhost/api/v1/protected');
        const response = await handler(request, { params: {} });

        expect(response.status).toBe(401);
      });

      it('should allow authenticated requests', async () => {
        const handler = createAuthenticatedHandler(async () => {
          return NextResponse.json({ authenticated: true });
        });

        const request = new NextRequest('http://localhost/api/v1/protected', {
          headers: { authorization: 'Bearer ada_live_valid_key' },
        });
        const response = await handler(request, { params: {} });

        expect(response.status).toBe(200);
      });
    });

    describe('createOptionsHandler', () => {
      it('should return 204 with CORS headers', () => {
        const handler = createOptionsHandler();
        const request = new NextRequest('http://localhost/api/v1/test');
        const response = handler(request);

        expect(response.status).toBe(204);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      });
    });
  });

  describe('Middleware Composition', () => {
    it('should compose middleware in order', async () => {
      const calls: string[] = [];

      const middleware1 = async (
        _req: NextRequest,
        _ctx: HandlerContext,
        next: () => Promise<Response>
      ) => {
        calls.push('middleware1:before');
        const response = await next();
        calls.push('middleware1:after');
        return response;
      };

      const middleware2 = async (
        _req: NextRequest,
        _ctx: HandlerContext,
        next: () => Promise<Response>
      ) => {
        calls.push('middleware2:before');
        const response = await next();
        calls.push('middleware2:after');
        return response;
      };

      const composed = composeMiddleware(middleware1, middleware2);

      const handler = composed(async () => {
        calls.push('handler');
        return NextResponse.json({ ok: true });
      });

      const request = new NextRequest('http://localhost/api');
      await handler(request, { params: {} });

      expect(calls).toEqual([
        'middleware1:before',
        'middleware2:before',
        'handler',
        'middleware2:after',
        'middleware1:after',
      ]);
    });
  });
});
