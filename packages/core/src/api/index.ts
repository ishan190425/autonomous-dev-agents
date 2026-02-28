/**
 * ADA SaaS Platform API
 *
 * Type-safe client and types for the ADA REST API.
 * Generated from OpenAPI 3.1 Specification (C1246).
 *
 * @author 🌌 The Frontier (C1256)
 * @date 2026-02-27
 *
 * @example
 * ```ts
 * import { AdaApiClient, createApiClient, type Repo, type Cycle } from '@ada-ai/core/api';
 *
 * // Create client with API key
 * const client = createApiClient({
 *   apiKey: 'ada_...'
 * });
 *
 * // List repos
 * const { data: repos } = await client.repos.list();
 *
 * // Get cycle details
 * const { data: cycle } = await client.cycles.get(cycleId);
 * console.log(`Cycle ${cycle.cycleNumber}: ${cycle.action}`);
 * ```
 *
 * @packageDocumentation
 */

// Re-export types
export type {
  // Common
  ResponseMeta,
  Pagination,
  ProblemDetails,

  // Auth
  User,
  SessionResponse,
  ApiKey,
  ApiKeyScope,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ApiKeyListResponse,

  // Repos
  RepoStatus,
  RepoExecutor,
  Repo,
  RepoSettings,
  RepoStats,
  RepoListResponse,
  RepoResponse,
  AvailableRepo,
  AvailableReposResponse,
  SelectRepoRequest,
  RepoUpdateRequest,
  SyncResponse,

  // Dispatch
  DispatchStatus,
  DispatchPriority,
  DispatchRequest,
  DispatchResponse,
  DispatchStatusResponse,
  Schedule,
  ScheduleListResponse,
  ScheduleResponse,
  ScheduleRequest,
  ScheduleUpdateRequest,

  // Cycles
  CycleStatus,
  ReflectionOutcome,
  ArtifactType,
  CycleSummary,
  Cycle,
  CycleReflection,
  CycleArtifact,
  CycleMetrics,
  CycleListResponse,
  CycleResponse,
  LogEntry,
  LogsResponse,

  // Billing
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionLimits,
  Subscription,
  SubscriptionResponse,
  Usage,
  UsageResponse,
  CheckoutRequest,
  CheckoutResponse,
  PortalResponse,

  // Webhooks
  WebhookEvent,
  Webhook,
  WebhookListResponse,
  WebhookResponse,
  WebhookRequest,
  WebhookDelivery,
  WebhookDeliveriesResponse,
  WebhookPayload,
  WebhookPayloadData,
  DispatchEventData,
  CycleEventData,
  SubscriptionEventData,

  // Client options
  ApiClientOptions,
  ListOptions,
  CycleListOptions,
  LogOptions,
} from './types.js';

// Re-export client
export { AdaApiClient, AdaApiError, createApiClient, getDefaultClient } from './client.js';

// Re-export rate limiting
export {
  // Constants
  RATE_LIMITS,

  // Factory functions
  createRateLimiter,
  createConcurrencyLimiter,

  // Response helpers
  buildRateLimitHeaders,
  createRateLimitResponse,

  // Types
  type RateLimitTier,
  type RateLimitConfig,
  type RateLimitHeaders,
  type RateLimitResult,
  type RateLimitContext,
  type UpstashConfig,
  type RateLimiter,
  type ConcurrencyLimiter,
} from './rate-limit.js';
