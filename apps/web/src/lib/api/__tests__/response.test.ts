/**
 * API Response Builder Tests
 *
 * @author 🌌 The Frontier (C1286)
 */

import { describe, it, expect } from 'vitest';
import {
  buildMeta,
  apiSuccess,
  apiList,
  apiCreated,
  apiNoContent,
  apiError,
  buildProblem,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  rateLimited,
  internalError,
  notImplemented,
  serviceUnavailable,
  addRateLimitHeaders,
  addDeprecationHeaders,
  generateRequestId,
  getRequestId,
} from '../response';
import type { RateLimitState } from '../types';

describe('Response Metadata', () => {
  it('should build valid meta object', () => {
    const requestId = 'test-123';
    const meta = buildMeta(requestId);

    expect(meta.requestId).toBe(requestId);
    expect(meta.version).toBe('1.0.0');
    expect(new Date(meta.timestamp).getTime()).not.toBeNaN();
  });
});

describe('Success Responses', () => {
  it('should create success response with data', async () => {
    const data = { id: '123', name: 'Test' };
    const response = apiSuccess(data, 'req-123');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual(data);
    expect(body.meta.requestId).toBe('req-123');
  });

  it('should create success response with custom status', async () => {
    const response = apiSuccess({ ok: true }, 'req-123', 202);
    expect(response.status).toBe(202);
  });

  it('should create list response with pagination', async () => {
    const items = [{ id: '1' }, { id: '2' }];
    const pagination = {
      page: 1,
      pageSize: 20,
      totalItems: 2,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    const response = apiList(items, pagination, 'req-123');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual(items);
    expect(body.meta.pagination).toEqual(pagination);
  });

  it('should create created response with Location header', async () => {
    const data = { id: '123' };
    const response = apiCreated(data, 'req-123', '/api/v1/resources/123');

    expect(response.status).toBe(201);
    expect(response.headers.get('Location')).toBe('/api/v1/resources/123');
  });

  it('should create no content response', () => {
    const response = apiNoContent();
    expect(response.status).toBe(204);
  });
});

describe('Problem Details (RFC 7807)', () => {
  it('should build problem details object', () => {
    const problem = buildProblem(
      404,
      'Not Found',
      'Resource not found',
      'req-123',
      'resource_not_found'
    );

    expect(problem.status).toBe(404);
    expect(problem.title).toBe('Not Found');
    expect(problem.detail).toBe('Resource not found');
    expect(problem.code).toBe('resource_not_found');
    expect(problem.requestId).toBe('req-123');
    expect(problem.type).toBe('https://api.ada-ai.dev/problems/resource_not_found');
  });

  it('should build problem with validation errors', () => {
    const errors = {
      name: ['Required', 'Must be at least 3 characters'],
      email: ['Invalid email format'],
    };
    const problem = buildProblem(
      422,
      'Validation Error',
      'Request validation failed',
      'req-123',
      'validation_error',
      errors
    );

    expect(problem.errors).toEqual(errors);
  });

  it('should use about:blank type when no code', () => {
    const problem = buildProblem(500, 'Error', 'Something went wrong', 'req-123');
    expect(problem.type).toBe('about:blank');
  });
});

describe('Error Responses', () => {
  it('should create error response with problem+json content type', async () => {
    const response = apiError(400, 'Bad Request', 'Invalid input', 'req-123');

    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toBe('application/problem+json');
    const body = await response.json();
    expect(body.status).toBe(400);
    expect(body.title).toBe('Bad Request');
  });

  it('should create bad request response', async () => {
    const response = badRequest('Missing field', 'req-123');
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('invalid_request_body');
  });

  it('should create unauthorized response', async () => {
    const response = unauthorized('Invalid token', 'req-123', 'invalid_api_key');
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('invalid_api_key');
  });

  it('should create forbidden response', async () => {
    const response = forbidden('Access denied', 'req-123');
    expect(response.status).toBe(403);
  });

  it('should create not found response', async () => {
    const response = notFound('Workspace not found', 'req-123', 'workspace_not_found');
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe('workspace_not_found');
  });

  it('should create conflict response', async () => {
    const response = conflict('Resource already exists', 'req-123');
    expect(response.status).toBe(409);
  });

  it('should create validation error response', async () => {
    const errors = { email: ['Invalid format'] };
    const response = validationError(errors, 'req-123');

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.code).toBe('validation_error');
    expect(body.errors).toEqual(errors);
  });

  it('should create rate limited response with headers', async () => {
    const rateLimit: RateLimitState = {
      limited: true,
      limit: 60,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 30,
      retryAfter: 30,
    };
    const response = rateLimited('req-123', rateLimit);

    expect(response.status).toBe(429);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('Retry-After')).toBe('30');
  });

  it('should create internal error response', async () => {
    const response = internalError('req-123');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe('internal_error');
  });

  it('should create not implemented response', async () => {
    const response = notImplemented('req-123');
    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.code).toBe('not_implemented');
  });

  it('should create service unavailable response', async () => {
    const response = serviceUnavailable('req-123', 60);
    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe('60');
  });
});

describe('Rate Limit Headers', () => {
  it('should add rate limit headers to response', async () => {
    const response = apiSuccess({ ok: true }, 'req-123');
    const rateLimit: RateLimitState = {
      limited: false,
      limit: 60,
      remaining: 45,
      reset: 1709164800,
    };

    const updatedResponse = addRateLimitHeaders(response, rateLimit);

    expect(updatedResponse.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(updatedResponse.headers.get('X-RateLimit-Remaining')).toBe('45');
    expect(updatedResponse.headers.get('X-RateLimit-Reset')).toBe('1709164800');
  });
});

describe('Deprecation Headers', () => {
  it('should add deprecation headers', async () => {
    const response = apiSuccess({ ok: true }, 'req-123');
    const deprecationDate = '2026-01-01';
    const sunsetDate = '2026-07-01';
    const successorUrl = 'https://api.ada-ai.dev/v2/resource';

    const updatedResponse = addDeprecationHeaders(
      response,
      deprecationDate,
      sunsetDate,
      successorUrl
    );

    expect(updatedResponse.headers.has('Deprecation')).toBe(true);
    expect(updatedResponse.headers.has('Sunset')).toBe(true);
    expect(updatedResponse.headers.get('Link')).toContain('successor-version');
  });
});

describe('Request ID', () => {
  it('should generate UUID request ID', () => {
    const id = generateRequestId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateRequestId());
    }
    expect(ids.size).toBe(100);
  });

  it('should extract request ID from headers', () => {
    const headers = new Headers();
    headers.set('X-Request-Id', 'existing-id-123');
    expect(getRequestId(headers)).toBe('existing-id-123');
  });

  it('should generate new ID if header not present', () => {
    const headers = new Headers();
    const id = getRequestId(headers);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});
