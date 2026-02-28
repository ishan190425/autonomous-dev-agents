/**
 * ADA SaaS Platform API Types
 * Generated from OpenAPI 3.1 Specification (C1246)
 *
 * @author 🌌 The Frontier (C1256)
 * @date 2026-02-27
 * @source docs/api/openapi-v1-c1246.yaml
 * @related #155 (SaaS Container), #181 (Auth), #189 (Execution), #190 (API Gateway)
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

/** Standard API response metadata */
export interface ResponseMeta {
  /** API version */
  version: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Request ID for tracing */
  requestId: string;
}

/** Pagination info for list responses */
export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** RFC 7807 Problem Details error format */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  /** ADA-specific error code */
  code?: string;
  /** Field validation errors */
  errors?: Record<string, string[]>;
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

/** Current user session info */
export interface User {
  id: string;
  githubId: number;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string;
  tier: SubscriptionTier;
}

/** Session response from /auth/me */
export interface SessionResponse {
  data: {
    user: User;
    expiresAt: string;
  };
  meta: ResponseMeta;
}

/** API key object */
export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export type ApiKeyScope = 'read' | 'write' | 'admin';

/** Request to create an API key */
export interface CreateApiKeyRequest {
  name: string;
  scopes: ApiKeyScope[];
  expiresInDays?: number;
}

/** Response when creating an API key (includes full key) */
export interface CreateApiKeyResponse {
  data: {
    key: ApiKey;
    /** Full API key - shown only once */
    secret: string;
  };
  meta: ResponseMeta;
}

export interface ApiKeyListResponse {
  data: ApiKey[];
  meta: ResponseMeta;
}

// =============================================================================
// REPOSITORIES
// =============================================================================

export type RepoStatus = 'active' | 'paused' | 'pending_setup';
export type RepoExecutor = 'openclaw' | 'claude-code';

/** Repository configuration */
export interface Repo {
  id: string;
  githubId: number;
  owner: string;
  name: string;
  fullName: string;
  status: RepoStatus;
  settings: RepoSettings;
  stats: RepoStats;
  createdAt: string;
  updatedAt: string;
}

/** Repository settings */
export interface RepoSettings {
  /** Branch for agent operations (default: main) */
  branch: string;
  /** Cron expression or interval */
  schedule: string;
  /** Agent executor backend */
  executor: RepoExecutor;
  /** Auto-merge PRs when CI passes */
  autoMerge: boolean;
  /** Notification channel (Slack/Discord) */
  notificationChannel?: string;
}

/** Repository statistics */
export interface RepoStats {
  cycleCount: number;
  consecutiveCycles: number;
  lastCycleAt: string | null;
  prsMerged: number;
  issuesClosed: number;
}

export interface RepoListResponse {
  data: Repo[];
  meta: ResponseMeta & { pagination: Pagination };
}

export interface RepoResponse {
  data: Repo;
  meta: ResponseMeta;
}

/** Available GitHub repos from user's installations */
export interface AvailableRepo {
  githubId: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  hasAgents: boolean;
}

export interface AvailableReposResponse {
  data: AvailableRepo[];
  meta: ResponseMeta;
}

/** Request to add a repo to ADA */
export interface SelectRepoRequest {
  githubId: number;
  templateId?: string;
  settings?: Partial<RepoSettings>;
}

/** Request to update repo settings */
export interface RepoUpdateRequest {
  status?: RepoStatus;
  settings?: Partial<RepoSettings>;
}

/** Sync response for GitHub data refresh */
export interface SyncResponse {
  data: {
    syncId: string;
    status: 'pending' | 'syncing';
  };
  meta: ResponseMeta;
}

// =============================================================================
// DISPATCH
// =============================================================================

export type DispatchStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'timeout'
  | 'cancelled';
export type DispatchPriority = 'low' | 'normal' | 'high';

/** Request to trigger a dispatch */
export interface DispatchRequest {
  repoId: string;
  priority?: DispatchPriority;
  /** Force execution for a specific role */
  forceRole?: string;
  /** Simulate without executing */
  dryRun?: boolean;
}

/** Response when dispatch is queued/started */
export interface DispatchResponse {
  data: {
    dispatchId: string;
    status: 'queued' | 'running';
    /** Position in queue (if queued) */
    position?: number;
    estimatedStartTime?: string;
  };
  meta: ResponseMeta;
}

/** Detailed dispatch status */
export interface DispatchStatusResponse {
  data: {
    dispatchId: string;
    repoId: string;
    status: DispatchStatus;
    role: string;
    cycleNumber: number;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    action?: string;
    reflection?: string;
    tokensUsed?: number;
    cost?: number;
  };
  meta: ResponseMeta;
}

/** Schedule for automated dispatch */
export interface Schedule {
  id: string;
  repoId: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
}

export interface ScheduleListResponse {
  data: Schedule[];
  meta: ResponseMeta;
}

export interface ScheduleResponse {
  data: Schedule;
  meta: ResponseMeta;
}

/** Request to create a schedule */
export interface ScheduleRequest {
  repoId: string;
  cron: string;
  timezone?: string;
  enabled?: boolean;
}

/** Request to update a schedule */
export interface ScheduleUpdateRequest {
  cron?: string;
  timezone?: string;
  enabled?: boolean;
}

// =============================================================================
// CYCLES
// =============================================================================

export type CycleStatus = DispatchStatus;
export type ReflectionOutcome = 'success' | 'partial' | 'blocked';
export type ArtifactType = 'pr' | 'issue' | 'commit' | 'comment';

/** Cycle summary for list views */
export interface CycleSummary {
  id: string;
  repoId: string;
  cycleNumber: number;
  role: string;
  status: CycleStatus;
  action: string;
  startedAt: string;
  durationMs: number;
}

/** Full cycle details */
export interface Cycle {
  id: string;
  repoId: string;
  cycleNumber: number;
  role: string;
  roleEmoji: string;
  status: CycleStatus;
  action: string;
  reflection?: CycleReflection;
  artifacts: CycleArtifact[];
  metrics: CycleMetrics;
  startedAt: string;
  completedAt?: string;
}

export interface CycleReflection {
  outcome: ReflectionOutcome;
  whatWorked?: string;
  whatToImprove?: string;
  lesson?: string;
}

export interface CycleArtifact {
  type: ArtifactType;
  url: string;
  title: string;
}

export interface CycleMetrics {
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  durationMs: number;
}

export interface CycleListResponse {
  data: CycleSummary[];
  meta: ResponseMeta & { pagination: Pagination };
}

export interface CycleResponse {
  data: Cycle;
  meta: ResponseMeta;
}

/** Log entry for cycle execution */
export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
}

export interface LogsResponse {
  data: {
    logs: LogEntry[];
    hasMore: boolean;
  };
  meta: ResponseMeta;
}

// =============================================================================
// BILLING
// =============================================================================

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'team';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled';

/** Subscription limits per tier */
export interface SubscriptionLimits {
  cyclesPerMonth: number;
  reposLimit: number;
  /** Requests per hour */
  rateLimit: number;
}

/** Current subscription info */
export interface Subscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  limits: SubscriptionLimits;
  currentPeriod: {
    start: string;
    end: string;
  };
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface SubscriptionResponse {
  data: Subscription;
  meta: ResponseMeta;
}

/** Usage metrics for current billing period */
export interface Usage {
  period: {
    start: string;
    end: string;
  };
  cycles: {
    used: number;
    limit: number;
    percentUsed: number;
  };
  tokens: {
    used: number;
    cost: number;
  };
  repos: {
    active: number;
    limit: number;
  };
}

export interface UsageResponse {
  data: Usage;
  meta: ResponseMeta;
}

/** Request to create Stripe checkout session */
export interface CheckoutRequest {
  tier: Exclude<SubscriptionTier, 'free'>;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutResponse {
  data: {
    checkoutUrl: string;
    sessionId: string;
  };
  meta: ResponseMeta;
}

export interface PortalResponse {
  data: {
    portalUrl: string;
  };
  meta: ResponseMeta;
}

// =============================================================================
// WEBHOOKS
// =============================================================================

export type WebhookEvent =
  | 'dispatch.queued'
  | 'dispatch.started'
  | 'dispatch.completed'
  | 'dispatch.failed'
  | 'cycle.started'
  | 'cycle.completed'
  | 'subscription.updated';

/** Webhook configuration */
export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  enabled: boolean;
  createdAt: string;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: 'success' | 'failed';
}

export interface WebhookListResponse {
  data: Webhook[];
  meta: ResponseMeta;
}

export interface WebhookResponse {
  data: Webhook;
  meta: ResponseMeta;
}

/** Request to create a webhook */
export interface WebhookRequest {
  url: string;
  events: WebhookEvent[];
  secret?: string;
}

/** Webhook delivery record */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  status: 'pending' | 'success' | 'failed';
  requestPayload: Record<string, unknown>;
  responseStatus?: number;
  responseBody?: string;
  attemptCount: number;
  createdAt: string;
  deliveredAt?: string;
}

export interface WebhookDeliveriesResponse {
  data: WebhookDelivery[];
  meta: ResponseMeta & { pagination: Pagination };
}

// =============================================================================
// WEBHOOK PAYLOADS (Inbound events)
// =============================================================================

/** Base webhook payload structure */
export interface WebhookPayload<T extends WebhookEvent = WebhookEvent> {
  event: T;
  timestamp: string;
  data: WebhookPayloadData<T>;
}

export type WebhookPayloadData<T extends WebhookEvent> = T extends
  | 'dispatch.queued'
  | 'dispatch.started'
  | 'dispatch.completed'
  | 'dispatch.failed'
  ? DispatchEventData
  : T extends 'cycle.started' | 'cycle.completed'
    ? CycleEventData
    : T extends 'subscription.updated'
      ? SubscriptionEventData
      : never;

export interface DispatchEventData {
  dispatchId: string;
  repoId: string;
  repoFullName: string;
  status: DispatchStatus;
  role?: string;
  cycleNumber?: number;
  action?: string;
  error?: string;
}

export interface CycleEventData {
  cycleId: string;
  repoId: string;
  repoFullName: string;
  cycleNumber: number;
  role: string;
  status: CycleStatus;
  action?: string;
  metrics?: CycleMetrics;
}

export interface SubscriptionEventData {
  userId: string;
  previousTier: SubscriptionTier;
  newTier: SubscriptionTier;
  status: SubscriptionStatus;
}

// =============================================================================
// API CLIENT OPTIONS
// =============================================================================

/** Options for API client initialization */
export interface ApiClientOptions {
  /** Base URL for API requests */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Session token (browser) */
  sessionToken?: string;
  /** Request timeout in ms */
  timeout?: number;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
}

/** Options for list requests */
export interface ListOptions {
  page?: number;
  pageSize?: number;
}

/** Options for cycle list requests */
export interface CycleListOptions extends ListOptions {
  repoId?: string;
  status?: CycleStatus;
  role?: string;
}

/** Options for log requests */
export interface LogOptions {
  level?: 'debug' | 'info' | 'warn' | 'error';
  since?: string;
  limit?: number;
}
