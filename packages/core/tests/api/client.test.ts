/**
 * ADA API Client Tests
 *
 * @author ⚙️ Engineering (C1260)
 * @date 2026-02-27
 * @related PR #263 (SDK), #155 (SaaS Container), #190 (API Gateway)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdaApiClient, AdaApiError, createApiClient, getDefaultClient } from '../../src/api/client.js';
import type { SessionResponse, ProblemDetails } from '../../src/api/types.js';

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Create a mock fetch response
 */
function mockResponse(data: unknown, options: { status?: number; ok?: boolean } = {}): Response {
  const { status = 200, ok = true } = options;
  return {
    ok,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(data),
    headers: new Headers(),
  } as unknown as Response;
}

/**
 * Create a mock error response with ProblemDetails
 */
function mockErrorResponse(
  status: number,
  problem: Partial<ProblemDetails>
): Response {
  const fullProblem: ProblemDetails = {
    type: 'about:blank',
    title: problem.title ?? 'Error',
    status,
    detail: problem.detail ?? `HTTP ${status}`,
    ...problem,
  };
  return mockResponse(fullProblem, { status, ok: false });
}

// =============================================================================
// AdaApiError TESTS
// =============================================================================

describe('AdaApiError', () => {
  const baseProblem: ProblemDetails = {
    type: 'about:blank',
    title: 'Test Error',
    status: 400,
    detail: 'Test error detail',
  };

  it('creates error with status and problem details', () => {
    const error = new AdaApiError(400, baseProblem);

    expect(error.name).toBe('AdaApiError');
    expect(error.status).toBe(400);
    expect(error.problem).toEqual(baseProblem);
    expect(error.message).toBe('Test error detail');
  });

  it('uses title as message when detail is missing', () => {
    const problem = { ...baseProblem, detail: undefined } as unknown as ProblemDetails;
    const error = new AdaApiError(400, problem);

    expect(error.message).toBe('Test Error');
  });

  describe('is()', () => {
    it('returns true for matching status', () => {
      const error = new AdaApiError(404, { ...baseProblem, status: 404 });
      expect(error.is(404)).toBe(true);
    });

    it('returns false for non-matching status', () => {
      const error = new AdaApiError(404, { ...baseProblem, status: 404 });
      expect(error.is(500)).toBe(false);
    });
  });

  describe('isValidationError()', () => {
    it('returns true for 400 with errors', () => {
      const error = new AdaApiError(400, {
        ...baseProblem,
        errors: { name: ['Required'] },
      });
      expect(error.isValidationError()).toBe(true);
    });

    it('returns false for 400 without errors', () => {
      const error = new AdaApiError(400, baseProblem);
      expect(error.isValidationError()).toBe(false);
    });

    it('returns false for non-400 status', () => {
      const error = new AdaApiError(500, {
        ...baseProblem,
        status: 500,
        errors: { name: ['Required'] },
      });
      expect(error.isValidationError()).toBe(false);
    });
  });

  describe('isUnauthorized()', () => {
    it('returns true for 401', () => {
      const error = new AdaApiError(401, { ...baseProblem, status: 401 });
      expect(error.isUnauthorized()).toBe(true);
    });

    it('returns false for non-401', () => {
      const error = new AdaApiError(403, { ...baseProblem, status: 403 });
      expect(error.isUnauthorized()).toBe(false);
    });
  });

  describe('isForbidden()', () => {
    it('returns true for 403', () => {
      const error = new AdaApiError(403, { ...baseProblem, status: 403 });
      expect(error.isForbidden()).toBe(true);
    });

    it('returns false for non-403', () => {
      const error = new AdaApiError(401, { ...baseProblem, status: 401 });
      expect(error.isForbidden()).toBe(false);
    });
  });

  describe('isNotFound()', () => {
    it('returns true for 404', () => {
      const error = new AdaApiError(404, { ...baseProblem, status: 404 });
      expect(error.isNotFound()).toBe(true);
    });

    it('returns false for non-404', () => {
      const error = new AdaApiError(400, baseProblem);
      expect(error.isNotFound()).toBe(false);
    });
  });

  describe('isRateLimited()', () => {
    it('returns true for 429', () => {
      const error = new AdaApiError(429, { ...baseProblem, status: 429 });
      expect(error.isRateLimited()).toBe(true);
    });

    it('returns false for non-429', () => {
      const error = new AdaApiError(500, { ...baseProblem, status: 500 });
      expect(error.isRateLimited()).toBe(false);
    });
  });
});

// =============================================================================
// AdaApiClient CONSTRUCTOR TESTS
// =============================================================================

describe('AdaApiClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('uses default options when none provided', () => {
      const client = new AdaApiClient({ fetch: mockFetch });
      // Verify by making a request and checking the URL
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      // Trigger a request to verify defaults
      client.auth.me();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ada.dev/v1/auth/me',
        expect.any(Object)
      );
    });

    it('uses custom baseUrl', () => {
      const client = new AdaApiClient({
        baseUrl: 'https://custom.api.dev/v2',
        fetch: mockFetch,
      });
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      client.auth.me();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.dev/v2/auth/me',
        expect.any(Object)
      );
    });

    it('uses apiKey authentication', async () => {
      const client = new AdaApiClient({
        apiKey: 'ada_test_key',
        fetch: mockFetch,
      });
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.auth.me();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'ada_test_key',
          }),
        })
      );
    });

    it('uses sessionToken authentication', async () => {
      const client = new AdaApiClient({
        sessionToken: 'session_xyz',
        fetch: mockFetch,
      });
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.auth.me();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer session_xyz',
          }),
        })
      );
    });

    it('prefers apiKey over sessionToken', async () => {
      const client = new AdaApiClient({
        apiKey: 'ada_test_key',
        sessionToken: 'session_xyz',
        fetch: mockFetch,
      });
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.auth.me();

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers['X-API-Key']).toBe('ada_test_key');
      expect(callArgs.headers['Authorization']).toBeUndefined();
    });
  });

  // ===========================================================================
  // HTTP REQUEST TESTS
  // ===========================================================================

  describe('HTTP requests', () => {
    let client: AdaApiClient;

    beforeEach(() => {
      client = new AdaApiClient({ fetch: mockFetch });
    });

    it('handles successful JSON response', async () => {
      const responseData: SessionResponse = {
        data: {
          user: {
            id: 'user_123',
            githubId: 12345,
            login: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            avatarUrl: 'https://github.com/testuser.png',
            tier: 'pro',
          },
          expiresAt: '2026-03-01T00:00:00Z',
        },
        meta: {
          version: 'v1',
          timestamp: '2026-02-27T21:00:00Z',
          requestId: 'req_abc',
        },
      };
      mockFetch.mockResolvedValue(mockResponse(responseData));

      const result = await client.auth.me();

      expect(result).toEqual(responseData);
    });

    it('handles 204 No Content response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
        json: vi.fn().mockRejectedValue(new Error('No body')),
      } as unknown as Response);

      const result = await client.auth.signOut();

      expect(result).toBeUndefined();
    });

    it('throws AdaApiError on error response', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(404, {
          title: 'Not Found',
          detail: 'Repo not found',
        })
      );

      await expect(client.repos.get('repo_123')).rejects.toThrow(AdaApiError);

      try {
        await client.repos.get('repo_123');
      } catch (error) {
        expect(error).toBeInstanceOf(AdaApiError);
        expect((error as AdaApiError).status).toBe(404);
        expect((error as AdaApiError).isNotFound()).toBe(true);
      }
    });

    it('handles malformed error response gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as Response);

      await expect(client.repos.list()).rejects.toThrow(AdaApiError);

      try {
        await client.repos.list();
      } catch (error) {
        expect((error as AdaApiError).problem.title).toBe('Internal Server Error');
      }
    });

    it('handles timeout with AbortError', async () => {
      // Create client with very short timeout
      const shortTimeoutClient = new AdaApiClient({
        timeout: 1,
        fetch: mockFetch,
      });

      mockFetch.mockImplementation(() => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(shortTimeoutClient.repos.list()).rejects.toThrow(AdaApiError);

      try {
        await shortTimeoutClient.repos.list();
      } catch (error) {
        expect((error as AdaApiError).status).toBe(408);
        expect((error as AdaApiError).problem.title).toBe('Request Timeout');
      }
    });

    it('passes query params correctly', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: [], meta: {} }));

      await client.repos.list({ page: 2, pageSize: 25 });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('pageSize=25');
    });

    it('omits undefined query params', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: [], meta: {} }));

      await client.cycles.list({ page: 1, status: undefined, role: 'engineering' });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('page=1');
      expect(callUrl).toContain('role=engineering');
      expect(callUrl).not.toContain('status=');
    });

    it('sends JSON body for POST requests', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.dispatch.create({ repoId: 'repo_123', priority: 'high' });

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.method).toBe('POST');
      expect(JSON.parse(callArgs.body)).toEqual({
        repoId: 'repo_123',
        priority: 'high',
      });
    });

    it('sends JSON body for PATCH requests', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.repos.update('repo_123', { status: 'paused' });

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.method).toBe('PATCH');
      expect(JSON.parse(callArgs.body)).toEqual({ status: 'paused' });
    });

    it('sends DELETE requests without body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
        json: vi.fn(),
      } as unknown as Response);

      await client.repos.delete('repo_123');

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.method).toBe('DELETE');
      expect(callArgs.body).toBeUndefined();
    });
  });

  // ===========================================================================
  // AUTH ENDPOINTS TESTS
  // ===========================================================================

  describe('auth endpoints', () => {
    let client: AdaApiClient;

    beforeEach(() => {
      client = new AdaApiClient({ fetch: mockFetch });
    });

    it('auth.me() calls GET /auth/me', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.auth.me();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('auth.listApiKeys() calls GET /auth/api-keys', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: [], meta: {} }));

      await client.auth.listApiKeys();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/api-keys'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('auth.createApiKey() calls POST /auth/api-keys', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.auth.createApiKey({
        name: 'Test Key',
        scopes: ['read', 'write'],
        expiresInDays: 30,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/api-keys'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('auth.deleteApiKey() calls DELETE /auth/api-keys/:id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: vi.fn(),
      } as unknown as Response);

      await client.auth.deleteApiKey('key_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/api-keys/key_123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('auth.signOut() calls POST /auth/signout', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: vi.fn(),
      } as unknown as Response);

      await client.auth.signOut();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/signout'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // ===========================================================================
  // REPOS ENDPOINTS TESTS
  // ===========================================================================

  describe('repos endpoints', () => {
    let client: AdaApiClient;

    beforeEach(() => {
      client = new AdaApiClient({ fetch: mockFetch });
    });

    it('repos.list() calls GET /repos with pagination', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: [], meta: {} }));

      await client.repos.list({ page: 1, pageSize: 10 });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('/repos');
      expect(callUrl).toContain('page=1');
      expect(callUrl).toContain('pageSize=10');
    });

    it('repos.get() calls GET /repos/:id', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.repos.get('repo_abc');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/repo_abc'),
        expect.any(Object)
      );
    });

    it('repos.available() calls GET /repos/available', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: [], meta: {} }));

      await client.repos.available();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/available'),
        expect.any(Object)
      );
    });

    it('repos.select() calls POST /repos', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.repos.select({ githubId: 12345 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('repos.update() calls PATCH /repos/:id', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.repos.update('repo_123', { status: 'active' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/repo_123'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('repos.delete() calls DELETE /repos/:id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: vi.fn(),
      } as unknown as Response);

      await client.repos.delete('repo_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/repo_123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('repos.sync() calls POST /repos/:id/sync', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.repos.sync('repo_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/repo_123/sync'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // ===========================================================================
  // DISPATCH ENDPOINTS TESTS
  // ===========================================================================

  describe('dispatch endpoints', () => {
    let client: AdaApiClient;

    beforeEach(() => {
      client = new AdaApiClient({ fetch: mockFetch });
    });

    it('dispatch.create() calls POST /dispatch', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.dispatch.create({
        repoId: 'repo_123',
        priority: 'high',
        forceRole: 'engineering',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dispatch'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('dispatch.status() calls GET /dispatch/:id', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.dispatch.status('dispatch_xyz');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dispatch/dispatch_xyz'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('dispatch.cancel() calls DELETE /dispatch/:id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: vi.fn(),
      } as unknown as Response);

      await client.dispatch.cancel('dispatch_xyz');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dispatch/dispatch_xyz'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('dispatch.listSchedules() calls GET /dispatch/schedules', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: [], meta: {} }));

      await client.dispatch.listSchedules();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dispatch/schedules'),
        expect.any(Object)
      );
    });

    it('dispatch.createSchedule() calls POST /dispatch/schedules', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.dispatch.createSchedule({
        repoId: 'repo_123',
        cron: '0 */4 * * *',
        timezone: 'America/New_York',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dispatch/schedules'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('dispatch.updateSchedule() calls PATCH /dispatch/schedules/:id', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.dispatch.updateSchedule('sched_123', { enabled: false });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dispatch/schedules/sched_123'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('dispatch.deleteSchedule() calls DELETE /dispatch/schedules/:id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: vi.fn(),
      } as unknown as Response);

      await client.dispatch.deleteSchedule('sched_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dispatch/schedules/sched_123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // ===========================================================================
  // CYCLES ENDPOINTS TESTS
  // ===========================================================================

  describe('cycles endpoints', () => {
    let client: AdaApiClient;

    beforeEach(() => {
      client = new AdaApiClient({ fetch: mockFetch });
    });

    it('cycles.list() calls GET /cycles with filters', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: [], meta: {} }));

      await client.cycles.list({
        page: 1,
        pageSize: 25,
        repoId: 'repo_123',
        status: 'success',
        role: 'engineering',
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('/cycles');
      expect(callUrl).toContain('repoId=repo_123');
      expect(callUrl).toContain('status=success');
      expect(callUrl).toContain('role=engineering');
    });

    it('cycles.get() calls GET /cycles/:id', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.cycles.get('cycle_abc');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cycles/cycle_abc'),
        expect.any(Object)
      );
    });

    it('cycles.logs() calls GET /cycles/:id/logs with options', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.cycles.logs('cycle_abc', {
        level: 'error',
        limit: 100,
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('/cycles/cycle_abc/logs');
      expect(callUrl).toContain('level=error');
      expect(callUrl).toContain('limit=100');
    });
  });

  // ===========================================================================
  // BILLING ENDPOINTS TESTS
  // ===========================================================================

  describe('billing endpoints', () => {
    let client: AdaApiClient;

    beforeEach(() => {
      client = new AdaApiClient({ fetch: mockFetch });
    });

    it('billing.getSubscription() calls GET /billing/subscription', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.billing.getSubscription();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/billing/subscription'),
        expect.any(Object)
      );
    });

    it('billing.getUsage() calls GET /billing/usage', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.billing.getUsage();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/billing/usage'),
        expect.any(Object)
      );
    });

    it('billing.createCheckout() calls POST /billing/checkout', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.billing.createCheckout({
        tier: 'pro',
        successUrl: 'https://app.ada.dev/success',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/billing/checkout'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('billing.getPortal() calls GET /billing/portal', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.billing.getPortal();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/billing/portal'),
        expect.any(Object)
      );
    });
  });

  // ===========================================================================
  // WEBHOOKS ENDPOINTS TESTS
  // ===========================================================================

  describe('webhooks endpoints', () => {
    let client: AdaApiClient;

    beforeEach(() => {
      client = new AdaApiClient({ fetch: mockFetch });
    });

    it('webhooks.list() calls GET /webhooks', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: [], meta: {} }));

      await client.webhooks.list();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhooks'),
        expect.any(Object)
      );
    });

    it('webhooks.create() calls POST /webhooks', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.webhooks.create({
        url: 'https://example.com/webhook',
        events: ['dispatch.completed', 'cycle.completed'],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhooks'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('webhooks.get() calls GET /webhooks/:id', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.webhooks.get('hook_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhooks/hook_123'),
        expect.any(Object)
      );
    });

    it('webhooks.update() calls PATCH /webhooks/:id', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: {}, meta: {} }));

      await client.webhooks.update('hook_123', { enabled: false });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhooks/hook_123'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('webhooks.delete() calls DELETE /webhooks/:id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: vi.fn(),
      } as unknown as Response);

      await client.webhooks.delete('hook_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhooks/hook_123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('webhooks.deliveries() calls GET /webhooks/:id/deliveries', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: [], meta: {} }));

      await client.webhooks.deliveries('hook_123', { page: 1, pageSize: 20 });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('/webhooks/hook_123/deliveries');
      expect(callUrl).toContain('page=1');
    });

    it('webhooks.retry() calls POST /webhooks/:id/deliveries/:deliveryId/retry', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: vi.fn(),
      } as unknown as Response);

      await client.webhooks.retry('hook_123', 'delivery_456');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhooks/hook_123/deliveries/delivery_456/retry'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});

// =============================================================================
// FACTORY FUNCTIONS TESTS
// =============================================================================

describe('createApiClient()', () => {
  it('creates a new client instance', () => {
    const client = createApiClient();
    expect(client).toBeInstanceOf(AdaApiClient);
  });

  it('passes options to client', () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: {}, meta: {} }),
    });

    const client = createApiClient({
      baseUrl: 'https://custom.api',
      apiKey: 'test_key',
      fetch: mockFetch,
    });

    client.auth.me();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://custom.api/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-API-Key': 'test_key',
        }),
      })
    );
  });
});

describe('getDefaultClient()', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns same instance on multiple calls', () => {
    // Note: This test may fail in isolation due to module caching
    // In a real test suite, you'd need to reset the module between tests
    const client1 = getDefaultClient();
    const client2 = getDefaultClient();
    expect(client1).toBe(client2);
  });

  it('returns an AdaApiClient instance', () => {
    const client = getDefaultClient();
    expect(client).toBeInstanceOf(AdaApiClient);
  });
});
