/**
 * ADA API Infrastructure Types
 *
 * Internal types for the API layer. These are used by middleware,
 * response builders, and route handlers.
 *
 * @author 🌌 The Frontier (C1286)
 * @date 2026-02-28
 * @related #190 (API Gateway), docs/architecture/adr-api-gateway-c1276.md
 */

import type { NextRequest } from 'next/server';

// =============================================================================
// API REQUEST CONTEXT
// =============================================================================

/**
 * Rate limiting tier for API requests.
 * Matches pricing tiers from ADR C1276.
 */
export type RateLimitTier = 'free' | 'pro' | 'enterprise';

/**
 * Rate limit configuration per tier.
 */
export interface RateLimitConfig {
  /** Maximum requests per minute */
  requestsPerMinute: number;
  /** Burst limit (max concurrent) */
  burstLimit: number;
  /** Maximum concurrent dispatch executions */
  concurrentExecutions: number;
}

/**
 * Rate limit state after checking.
 */
export interface RateLimitState {
  /** Whether the request is rate limited */
  limited: boolean;
  /** Maximum requests allowed */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp when limit resets */
  reset: number;
  /** Retry-After seconds (if limited) */
  retryAfter?: number;
}

/**
 * API authentication method.
 */
export type AuthMethod = 'api_key' | 'session' | 'none';

/**
 * Authenticated API context attached to requests.
 */
export interface ApiContext {
  /** Unique request ID for tracing */
  requestId: string;
  /** API version from URL */
  apiVersion: string;
  /** Authentication method used */
  authMethod: AuthMethod;
  /** Authenticated user ID (if any) */
  userId?: string;
  /** Rate limit tier */
  tier: RateLimitTier;
  /** Rate limit state */
  rateLimit: RateLimitState;
  /** Request timestamp */
  timestamp: Date;
}

/**
 * Extended NextRequest with API context.
 */
export interface ApiRequest extends NextRequest {
  apiContext?: ApiContext;
}

// =============================================================================
// API ERROR TYPES (RFC 7807)
// =============================================================================

/**
 * ADA-specific error codes.
 * Used in RFC 7807 `code` extension field.
 */
export type ApiErrorCode =
  // Authentication
  | 'unauthorized'
  | 'invalid_api_key'
  | 'expired_api_key'
  | 'insufficient_scope'
  // Authorization
  | 'forbidden'
  | 'resource_not_found'
  | 'workspace_not_found'
  | 'agent_not_found'
  // Rate limiting
  | 'rate_limited'
  | 'quota_exceeded'
  | 'concurrent_limit'
  // Validation
  | 'validation_error'
  | 'invalid_request_body'
  | 'missing_required_field'
  // Dispatch
  | 'dispatch_in_progress'
  | 'dispatch_failed'
  | 'execution_timeout'
  // Billing
  | 'subscription_required'
  | 'plan_limit_reached'
  | 'payment_required'
  // System
  | 'internal_error'
  | 'service_unavailable'
  | 'not_implemented';

/**
 * RFC 7807 Problem Details error response.
 * https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ProblemDetails {
  /** URI reference identifying the problem type */
  type: string;
  /** Short human-readable summary */
  title: string;
  /** HTTP status code */
  status: number;
  /** Human-readable explanation specific to this occurrence */
  detail: string;
  /** URI reference identifying the specific occurrence */
  instance?: string;
  /** ADA-specific error code */
  code?: ApiErrorCode;
  /** Field-level validation errors */
  errors?: Record<string, string[]>;
  /** Request ID for support/debugging */
  requestId?: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Standard response metadata.
 */
export interface ResponseMeta {
  /** API version */
  version: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Request ID for tracing */
  requestId: string;
}

/**
 * Pagination info for list responses.
 */
export interface PaginationInfo {
  /** Current page number (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total items across all pages */
  totalItems: number;
  /** Total pages */
  totalPages: number;
  /** Has next page */
  hasNext: boolean;
  /** Has previous page */
  hasPrev: boolean;
}

/**
 * Successful API response wrapper.
 */
export interface ApiResponse<T> {
  data: T;
  meta: ResponseMeta;
}

/**
 * List API response with pagination.
 */
export interface ApiListResponse<T> {
  data: T[];
  meta: ResponseMeta & {
    pagination: PaginationInfo;
  };
}

// =============================================================================
// API KEY TYPES
// =============================================================================

/**
 * API key prefix for different environments.
 */
export type ApiKeyPrefix = 'ada_sk_live_' | 'ada_sk_test_';

/**
 * API key scopes control what operations are allowed.
 */
export type ApiKeyScope =
  | 'workspaces:read'
  | 'workspaces:write'
  | 'agents:read'
  | 'agents:write'
  | 'dispatch:read'
  | 'dispatch:execute'
  | 'memory:read'
  | 'memory:write'
  | 'billing:read'
  | 'webhooks:manage';

/**
 * Validated API key data.
 */
export interface ValidatedApiKey {
  id: string;
  userId: string;
  name: string;
  scopes: ApiKeyScope[];
  tier: RateLimitTier;
  expiresAt?: Date;
}

// =============================================================================
// VERSIONING TYPES
// =============================================================================

/**
 * API version info for deprecation handling.
 */
export interface ApiVersionInfo {
  /** Current version (e.g., "v1") */
  version: string;
  /** Whether this version is deprecated */
  deprecated: boolean;
  /** Deprecation date (if deprecated) */
  deprecationDate?: string;
  /** Sunset date when version will be removed */
  sunsetDate?: string;
  /** Successor version (if deprecated) */
  successorVersion?: string;
}

/**
 * Supported API versions.
 */
export const API_VERSIONS = {
  v1: {
    version: 'v1',
    deprecated: false,
  },
} as const satisfies Record<string, ApiVersionInfo>;

export type ApiVersion = keyof typeof API_VERSIONS;
