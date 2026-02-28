/**
 * ADA SaaS Platform API Client
 * Type-safe client generated from OpenAPI 3.1 Specification (C1246)
 *
 * @author 🌌 The Frontier (C1256)
 * @date 2026-02-27
 * @source docs/api/openapi-v1-c1246.yaml
 * @related #155 (SaaS Container), #181 (Auth), #189 (Execution), #190 (API Gateway)
 *
 * @example
 * ```ts
 * import { AdaApiClient } from '@ada-ai/core/api';
 *
 * const client = new AdaApiClient({
 *   baseUrl: 'https://api.ada.dev/v1',
 *   apiKey: 'ada_...'
 * });
 *
 * // List repos
 * const repos = await client.repos.list();
 *
 * // Trigger dispatch
 * const dispatch = await client.dispatch.create({ repoId: '...' });
 *
 * // Check subscription
 * const sub = await client.billing.getSubscription();
 * ```
 */

import type {
  ApiClientOptions,
  ApiKeyListResponse,
  AvailableReposResponse,
  CheckoutRequest,
  CheckoutResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  CycleListOptions,
  CycleListResponse,
  CycleResponse,
  DispatchRequest,
  DispatchResponse,
  DispatchStatusResponse,
  ListOptions,
  LogOptions,
  LogsResponse,
  PortalResponse,
  ProblemDetails,
  RepoListResponse,
  RepoResponse,
  RepoUpdateRequest,
  ScheduleListResponse,
  ScheduleRequest,
  ScheduleResponse,
  ScheduleUpdateRequest,
  SelectRepoRequest,
  SessionResponse,
  SubscriptionResponse,
  SyncResponse,
  UsageResponse,
  WebhookDeliveriesResponse,
  WebhookListResponse,
  WebhookRequest,
  WebhookResponse,
} from './types.js';

/** Default API base URL */
const DEFAULT_BASE_URL = 'https://api.ada.dev/v1';

/** Default request timeout (30s) */
const DEFAULT_TIMEOUT = 30_000;

/**
 * API error with structured problem details
 */
export class AdaApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ProblemDetails
  ) {
    super(problem.detail || problem.title);
    this.name = 'AdaApiError';
  }

  /** Check if error is a specific HTTP status */
  is(status: number): boolean {
    return this.status === status;
  }

  /** Check if error is a validation error (400) */
  isValidationError(): boolean {
    return this.is(400) && !!this.problem.errors;
  }

  /** Check if error is unauthorized (401) */
  isUnauthorized(): boolean {
    return this.is(401);
  }

  /** Check if error is forbidden (403) */
  isForbidden(): boolean {
    return this.is(403);
  }

  /** Check if error is not found (404) */
  isNotFound(): boolean {
    return this.is(404);
  }

  /** Check if error is rate limited (429) */
  isRateLimited(): boolean {
    return this.is(429);
  }
}

/**
 * Type-safe ADA SaaS Platform API Client
 */
export class AdaApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly sessionToken: string | undefined;
  private readonly timeout: number;
  private readonly customFetch: typeof fetch;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.apiKey = options.apiKey ?? undefined;
    this.sessionToken = options.sessionToken ?? undefined;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.customFetch = options.fetch ?? fetch;
  }

  // ===========================================================================
  // HTTP HELPERS
  // ===========================================================================

  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
    } = {}
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    // Add query params
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    } else if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      // Only add body if present
      if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await this.customFetch(url.toString(), fetchOptions);

      clearTimeout(timeoutId);

      // Handle errors
      if (!response.ok) {
        const problem = (await response.json().catch(() => ({
          type: 'about:blank',
          title: response.statusText,
          status: response.status,
          detail: `HTTP ${response.status} ${response.statusText}`,
        }))) as ProblemDetails;
        throw new AdaApiError(response.status, problem);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AdaApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AdaApiError(408, {
          type: 'about:blank',
          title: 'Request Timeout',
          status: 408,
          detail: `Request timed out after ${this.timeout}ms`,
        });
      }

      throw error;
    }
  }

  private get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>('GET', path, params ? { params } : {});
  }

  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }

  private patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body });
  }

  private delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  // ===========================================================================
  // AUTH API
  // ===========================================================================

  /** Authentication endpoints */
  readonly auth = {
    /** Get current session user */
    me: (): Promise<SessionResponse> => this.get('/auth/me'),

    /** List API keys */
    listApiKeys: (): Promise<ApiKeyListResponse> => this.get('/auth/api-keys'),

    /** Create API key */
    createApiKey: (data: CreateApiKeyRequest): Promise<CreateApiKeyResponse> =>
      this.post('/auth/api-keys', data),

    /** Delete API key */
    deleteApiKey: (keyId: string): Promise<void> =>
      this.delete(`/auth/api-keys/${keyId}`),

    /** Sign out (invalidate session) */
    signOut: (): Promise<void> => this.post('/auth/signout'),
  };

  // ===========================================================================
  // REPOS API
  // ===========================================================================

  /** Repository management endpoints */
  readonly repos = {
    /** List configured repos */
    list: (options?: ListOptions): Promise<RepoListResponse> =>
      this.get('/repos', {
        page: options?.page,
        pageSize: options?.pageSize,
      }),

    /** Get repo by ID */
    get: (repoId: string): Promise<RepoResponse> => this.get(`/repos/${repoId}`),

    /** List available GitHub repos for selection */
    available: (): Promise<AvailableReposResponse> =>
      this.get('/repos/available'),

    /** Add a repo to ADA */
    select: (data: SelectRepoRequest): Promise<RepoResponse> =>
      this.post('/repos', data),

    /** Update repo settings */
    update: (repoId: string, data: RepoUpdateRequest): Promise<RepoResponse> =>
      this.patch(`/repos/${repoId}`, data),

    /** Remove repo from ADA */
    delete: (repoId: string): Promise<void> => this.delete(`/repos/${repoId}`),

    /** Sync repo data from GitHub */
    sync: (repoId: string): Promise<SyncResponse> =>
      this.post(`/repos/${repoId}/sync`),
  };

  // ===========================================================================
  // DISPATCH API
  // ===========================================================================

  /** Dispatch (agent execution) endpoints */
  readonly dispatch = {
    /** Trigger a new dispatch */
    create: (data: DispatchRequest): Promise<DispatchResponse> =>
      this.post('/dispatch', data),

    /** Get dispatch status */
    status: (dispatchId: string): Promise<DispatchStatusResponse> =>
      this.get(`/dispatch/${dispatchId}`),

    /** Cancel a dispatch */
    cancel: (dispatchId: string): Promise<void> =>
      this.delete(`/dispatch/${dispatchId}`),

    /** List schedules */
    listSchedules: (): Promise<ScheduleListResponse> =>
      this.get('/dispatch/schedules'),

    /** Create a schedule */
    createSchedule: (data: ScheduleRequest): Promise<ScheduleResponse> =>
      this.post('/dispatch/schedules', data),

    /** Get a schedule */
    getSchedule: (scheduleId: string): Promise<ScheduleResponse> =>
      this.get(`/dispatch/schedules/${scheduleId}`),

    /** Update a schedule */
    updateSchedule: (
      scheduleId: string,
      data: ScheduleUpdateRequest
    ): Promise<ScheduleResponse> =>
      this.patch(`/dispatch/schedules/${scheduleId}`, data),

    /** Delete a schedule */
    deleteSchedule: (scheduleId: string): Promise<void> =>
      this.delete(`/dispatch/schedules/${scheduleId}`),
  };

  // ===========================================================================
  // CYCLES API
  // ===========================================================================

  /** Cycle history endpoints */
  readonly cycles = {
    /** List cycles */
    list: (options?: CycleListOptions): Promise<CycleListResponse> =>
      this.get('/cycles', {
        page: options?.page,
        pageSize: options?.pageSize,
        repoId: options?.repoId,
        status: options?.status,
        role: options?.role,
      }),

    /** Get cycle by ID */
    get: (cycleId: string): Promise<CycleResponse> =>
      this.get(`/cycles/${cycleId}`),

    /** Get cycle logs */
    logs: (cycleId: string, options?: LogOptions): Promise<LogsResponse> =>
      this.get(`/cycles/${cycleId}/logs`, {
        level: options?.level,
        since: options?.since,
        limit: options?.limit,
      }),
  };

  // ===========================================================================
  // BILLING API
  // ===========================================================================

  /** Billing and subscription endpoints */
  readonly billing = {
    /** Get current subscription */
    getSubscription: (): Promise<SubscriptionResponse> =>
      this.get('/billing/subscription'),

    /** Get current usage */
    getUsage: (): Promise<UsageResponse> => this.get('/billing/usage'),

    /** Create Stripe checkout session */
    createCheckout: (data: CheckoutRequest): Promise<CheckoutResponse> =>
      this.post('/billing/checkout', data),

    /** Get Stripe customer portal URL */
    getPortal: (): Promise<PortalResponse> => this.get('/billing/portal'),
  };

  // ===========================================================================
  // WEBHOOKS API
  // ===========================================================================

  /** Webhook management endpoints */
  readonly webhooks = {
    /** List webhooks */
    list: (): Promise<WebhookListResponse> => this.get('/webhooks'),

    /** Create a webhook */
    create: (data: WebhookRequest): Promise<WebhookResponse> =>
      this.post('/webhooks', data),

    /** Get a webhook */
    get: (webhookId: string): Promise<WebhookResponse> =>
      this.get(`/webhooks/${webhookId}`),

    /** Update a webhook */
    update: (
      webhookId: string,
      data: Partial<WebhookRequest>
    ): Promise<WebhookResponse> => this.patch(`/webhooks/${webhookId}`, data),

    /** Delete a webhook */
    delete: (webhookId: string): Promise<void> =>
      this.delete(`/webhooks/${webhookId}`),

    /** List webhook deliveries */
    deliveries: (
      webhookId: string,
      options?: ListOptions
    ): Promise<WebhookDeliveriesResponse> =>
      this.get(`/webhooks/${webhookId}/deliveries`, {
        page: options?.page,
        pageSize: options?.pageSize,
      }),

    /** Retry a failed delivery */
    retry: (webhookId: string, deliveryId: string): Promise<void> =>
      this.post(`/webhooks/${webhookId}/deliveries/${deliveryId}/retry`),
  };
}

/**
 * Create a new API client instance
 */
export function createApiClient(options?: ApiClientOptions): AdaApiClient {
  return new AdaApiClient(options);
}

/**
 * Default client instance (configured via environment)
 */
let defaultClient: AdaApiClient | null = null;

/**
 * Get or create the default API client
 *
 * Uses environment variables:
 * - ADA_API_URL: Base URL (default: https://api.ada.dev/v1)
 * - ADA_API_KEY: API key for authentication
 */
export function getDefaultClient(): AdaApiClient {
  if (!defaultClient) {
    const baseUrl = process.env.ADA_API_URL;
    const apiKey = process.env.ADA_API_KEY;
    defaultClient = new AdaApiClient({
      ...(baseUrl && { baseUrl }),
      ...(apiKey && { apiKey }),
    });
  }
  return defaultClient;
}
