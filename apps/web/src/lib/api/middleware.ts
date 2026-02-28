/**
 * ADA API Middleware Utilities
 *
 * Helper functions for building API middleware. These are used in
 * Next.js middleware and route handlers for consistent request processing.
 *
 * @author 🌌 The Frontier (C1286)
 * @date 2026-02-28
 * @related #190 (API Gateway), docs/architecture/adr-api-gateway-c1276.md
 *
 * @example
 * ```typescript
 * // In middleware.ts
 * import {
 *   isApiRoute,
 *   parseApiVersion,
 *   buildApiContext,
 * } from '@/lib/api';
 *
 * export async function middleware(request: NextRequest) {
 *   if (!isApiRoute(request.nextUrl.pathname)) {
 *     return NextResponse.next();
 *   }
 *
 *   const version = parseApiVersion(request.nextUrl.pathname);
 *   const context = await buildApiContext(request, version);
 *
 *   // Attach context to request for route handlers
 *   // ...
 * }
 * ```
 */

import type { NextRequest } from 'next/server';
import type {
  ApiContext,
  ApiVersion,
  AuthMethod,
  RateLimitState,
  RateLimitTier,
} from './types';
import { API_VERSIONS } from './types';
import { extractApiKey, validateApiKey, RATE_LIMITS } from './api-key';
import { generateRequestId } from './response';

// =============================================================================
// ROUTE MATCHING
// =============================================================================

/**
 * Check if a pathname is an API route.
 */
export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/v');
}

/**
 * Check if a pathname is a versioned API route (v1, v2, etc.).
 */
export function isVersionedApiRoute(pathname: string): boolean {
  return /^\/api\/v\d+\//.test(pathname);
}

/**
 * Parse API version from pathname.
 *
 * @returns Version string (e.g., "v1") or null if not versioned
 */
export function parseApiVersion(pathname: string): ApiVersion | null {
  const match = pathname.match(/^\/api\/(v\d+)\//);
  if (!match) return null;

  const version = match[1] as ApiVersion;
  return version in API_VERSIONS ? version : null;
}

/**
 * Get API version info for deprecation handling.
 */
export function getVersionInfo(version: ApiVersion) {
  return API_VERSIONS[version];
}

// =============================================================================
// CONTEXT BUILDING
// =============================================================================

/**
 * Build API context for a request.
 *
 * This attaches request metadata, authentication info, and rate limit state
 * that route handlers can access.
 */
export async function buildApiContext(
  request: NextRequest,
  version: ApiVersion
): Promise<ApiContext> {
  const requestId = generateRequestId();
  const timestamp = new Date();

  // Determine authentication method and user
  const { authMethod, userId, tier } = await resolveAuth(request);

  // Check rate limit (placeholder until Upstash integration)
  const rateLimit = await checkRateLimit(userId, tier);

  return {
    requestId,
    apiVersion: version,
    authMethod,
    userId,
    tier,
    rateLimit,
    timestamp,
  };
}

/**
 * Resolve authentication from request.
 *
 * Checks for:
 * 1. API key in Authorization header
 * 2. Session cookie (for dashboard)
 *
 * @returns Auth method, user ID, and rate limit tier
 */
async function resolveAuth(
  request: NextRequest
): Promise<{ authMethod: AuthMethod; userId?: string; tier: RateLimitTier }> {
  // Check for API key
  const apiKey = extractApiKey(request.headers);
  if (apiKey) {
    const validated = await validateApiKey(apiKey);
    if (validated) {
      return {
        authMethod: 'api_key',
        userId: validated.userId,
        tier: validated.tier,
      };
    }
    // Invalid API key — still return api_key method for proper error handling
    return { authMethod: 'api_key', tier: 'free' };
  }

  // Check for session cookie
  // TODO: Integrate with NextAuth.js session validation
  // const session = await getSession(request);
  // if (session?.user) {
  //   return {
  //     authMethod: 'session',
  //     userId: session.user.id,
  //     tier: session.user.tier as RateLimitTier,
  //   };
  // }

  // No authentication
  return { authMethod: 'none', tier: 'free' };
}

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Check rate limit for a user.
 *
 * @todo Implement Upstash Redis rate limiting (Sprint 3 Day 3-4)
 * Current implementation is a placeholder that always allows requests.
 */
export async function checkRateLimit(
  userId: string | undefined,
  tier: RateLimitTier
): Promise<RateLimitState> {
  const config = RATE_LIMITS[tier];

  // TODO: Implement with Upstash Redis sliding window
  // const identifier = userId || 'anonymous';
  // const { success, remaining, reset } = await ratelimit.limit(identifier);
  //
  // return {
  //   limited: !success,
  //   limit: config.requestsPerMinute,
  //   remaining,
  //   reset,
  //   retryAfter: success ? undefined : Math.ceil((reset - Date.now()) / 1000),
  // };

  // Placeholder: always allow
  return {
    limited: false,
    limit: config.requestsPerMinute,
    remaining: config.requestsPerMinute - 1,
    reset: Math.floor(Date.now() / 1000) + 60,
  };
}

/**
 * Check concurrent execution limit for dispatch operations.
 *
 * @todo Implement with Upstash Redis (Sprint 3 Day 3-4)
 */
export async function checkConcurrencyLimit(
  userId: string,
  tier: RateLimitTier
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const config = RATE_LIMITS[tier];

  // TODO: Implement with Redis INCR/DECR
  // const key = `concurrency:${userId}`;
  // const current = await redis.incr(key);
  // if (current === 1) await redis.expire(key, 3600);
  //
  // return {
  //   allowed: current <= config.concurrentExecutions,
  //   current,
  //   limit: config.concurrentExecutions,
  // };

  // Placeholder: always allow
  return {
    allowed: true,
    current: 0,
    limit: config.concurrentExecutions,
  };
}

// =============================================================================
// REQUEST HELPERS
// =============================================================================

/**
 * Extract workspace ID from URL pathname.
 *
 * @example
 * extractWorkspaceId('/api/v1/workspaces/ws_123/agents')
 * // => 'ws_123'
 */
export function extractWorkspaceId(pathname: string): string | null {
  const match = pathname.match(/\/workspaces\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Extract agent ID from URL pathname.
 *
 * @example
 * extractAgentId('/api/v1/workspaces/ws_123/agents/agent_456')
 * // => 'agent_456'
 */
export function extractAgentId(pathname: string): string | null {
  const match = pathname.match(/\/agents\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Parse pagination params from URL search params.
 */
export function parsePaginationParams(
  searchParams: URLSearchParams
): { page: number; pageSize: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  return { page, pageSize };
}

/**
 * Calculate pagination info for a list response.
 */
export function calculatePagination(
  page: number,
  pageSize: number,
  totalItems: number
): {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  offset: number;
} {
  const totalPages = Math.ceil(totalItems / pageSize);
  const offset = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    offset,
  };
}

// =============================================================================
// CORS HELPERS
// =============================================================================

/**
 * CORS headers for API routes.
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Request-Id, X-Api-Version',
  'Access-Control-Max-Age': '86400',
};

/**
 * Add CORS headers to a response.
 */
export function addCorsHeaders(headers: Headers): void {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
}
