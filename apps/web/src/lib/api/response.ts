/**
 * ADA API Response Builders
 *
 * Type-safe response builders and RFC 7807 error formatting.
 * All API routes should use these helpers for consistent responses.
 *
 * @author 🌌 The Frontier (C1286)
 * @date 2026-02-28
 * @related #190 (API Gateway), docs/architecture/adr-api-gateway-c1276.md
 *
 * @example
 * ```typescript
 * import {
 *   apiSuccess,
 *   apiList,
 *   apiError,
 *   notFound,
 *   unauthorized,
 *   validationError,
 * } from '@/lib/api';
 *
 * // Success response
 * return apiSuccess({ workspace }, requestId);
 *
 * // List with pagination
 * return apiList(workspaces, pagination, requestId);
 *
 * // Not found error
 * return notFound('Workspace not found', requestId, 'workspace_not_found');
 *
 * // Validation error with field errors
 * return validationError({ name: ['Required'] }, requestId);
 * ```
 */

import { NextResponse } from 'next/server';
import type {
  ApiErrorCode,
  ApiResponse,
  ApiListResponse,
  PaginationInfo,
  ProblemDetails,
  RateLimitState,
  ResponseMeta,
} from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const API_VERSION = '1.0.0';
const PROBLEM_TYPE_BASE = 'https://api.ada-ai.dev/problems';

// =============================================================================
// RESPONSE METADATA
// =============================================================================

/**
 * Build standard response metadata.
 */
export function buildMeta(requestId: string): ResponseMeta {
  return {
    version: API_VERSION,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

// =============================================================================
// SUCCESS RESPONSES
// =============================================================================

/**
 * Create a success response with data.
 */
export function apiSuccess<T>(
  data: T,
  requestId: string,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      data,
      meta: buildMeta(requestId),
    },
    { status }
  );
}

/**
 * Create a list response with pagination.
 */
export function apiList<T>(
  data: T[],
  pagination: PaginationInfo,
  requestId: string
): NextResponse<ApiListResponse<T>> {
  return NextResponse.json(
    {
      data,
      meta: {
        ...buildMeta(requestId),
        pagination,
      },
    },
    { status: 200 }
  );
}

/**
 * Create a 201 Created response.
 */
export function apiCreated<T>(
  data: T,
  requestId: string,
  location?: string
): NextResponse<ApiResponse<T>> {
  const response = apiSuccess(data, requestId, 201);

  if (location) {
    response.headers.set('Location', location);
  }

  return response;
}

/**
 * Create a 204 No Content response.
 */
export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// =============================================================================
// ERROR RESPONSES (RFC 7807)
// =============================================================================

/**
 * Build RFC 7807 Problem Details object.
 */
export function buildProblem(
  status: number,
  title: string,
  detail: string,
  requestId: string,
  code?: ApiErrorCode,
  errors?: Record<string, string[]>
): ProblemDetails {
  return {
    type: code ? `${PROBLEM_TYPE_BASE}/${code}` : 'about:blank',
    title,
    status,
    detail,
    code,
    errors,
    requestId,
  };
}

/**
 * Create a RFC 7807 error response.
 */
export function apiError(
  status: number,
  title: string,
  detail: string,
  requestId: string,
  code?: ApiErrorCode,
  errors?: Record<string, string[]>
): NextResponse<ProblemDetails> {
  const problem = buildProblem(status, title, detail, requestId, code, errors);

  return NextResponse.json(problem, {
    status,
    headers: {
      'Content-Type': 'application/problem+json',
    },
  });
}

// =============================================================================
// COMMON ERROR HELPERS
// =============================================================================

/**
 * 400 Bad Request
 */
export function badRequest(
  detail: string,
  requestId: string,
  code: ApiErrorCode = 'invalid_request_body'
): NextResponse<ProblemDetails> {
  return apiError(400, 'Bad Request', detail, requestId, code);
}

/**
 * 401 Unauthorized
 */
export function unauthorized(
  detail: string,
  requestId: string,
  code: ApiErrorCode = 'unauthorized'
): NextResponse<ProblemDetails> {
  return apiError(401, 'Unauthorized', detail, requestId, code);
}

/**
 * 403 Forbidden
 */
export function forbidden(
  detail: string,
  requestId: string,
  code: ApiErrorCode = 'forbidden'
): NextResponse<ProblemDetails> {
  return apiError(403, 'Forbidden', detail, requestId, code);
}

/**
 * 404 Not Found
 */
export function notFound(
  detail: string,
  requestId: string,
  code: ApiErrorCode = 'resource_not_found'
): NextResponse<ProblemDetails> {
  return apiError(404, 'Not Found', detail, requestId, code);
}

/**
 * 409 Conflict
 */
export function conflict(
  detail: string,
  requestId: string,
  code?: ApiErrorCode
): NextResponse<ProblemDetails> {
  return apiError(409, 'Conflict', detail, requestId, code);
}

/**
 * 422 Unprocessable Entity (validation errors)
 */
export function validationError(
  errors: Record<string, string[]>,
  requestId: string,
  detail = 'Request validation failed'
): NextResponse<ProblemDetails> {
  return apiError(422, 'Validation Error', detail, requestId, 'validation_error', errors);
}

/**
 * 429 Too Many Requests (rate limited)
 */
export function rateLimited(
  requestId: string,
  rateLimit: RateLimitState,
  detail = 'Rate limit exceeded'
): NextResponse<ProblemDetails> {
  const response = apiError(429, 'Too Many Requests', detail, requestId, 'rate_limited');

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', String(rateLimit.limit));
  response.headers.set('X-RateLimit-Remaining', '0');
  response.headers.set('X-RateLimit-Reset', String(rateLimit.reset));
  if (rateLimit.retryAfter) {
    response.headers.set('Retry-After', String(rateLimit.retryAfter));
  }

  return response;
}

/**
 * 500 Internal Server Error
 */
export function internalError(
  requestId: string,
  detail = 'An unexpected error occurred'
): NextResponse<ProblemDetails> {
  return apiError(500, 'Internal Server Error', detail, requestId, 'internal_error');
}

/**
 * 501 Not Implemented
 */
export function notImplemented(
  requestId: string,
  detail = 'This endpoint is not yet implemented'
): NextResponse<ProblemDetails> {
  return apiError(501, 'Not Implemented', detail, requestId, 'not_implemented');
}

/**
 * 503 Service Unavailable
 */
export function serviceUnavailable(
  requestId: string,
  retryAfter?: number,
  detail = 'Service temporarily unavailable'
): NextResponse<ProblemDetails> {
  const response = apiError(
    503,
    'Service Unavailable',
    detail,
    requestId,
    'service_unavailable'
  );

  if (retryAfter) {
    response.headers.set('Retry-After', String(retryAfter));
  }

  return response;
}

// =============================================================================
// RATE LIMIT HEADERS
// =============================================================================

/**
 * Add rate limit headers to a response.
 */
export function addRateLimitHeaders(
  response: NextResponse,
  rateLimit: RateLimitState
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(rateLimit.limit));
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
  response.headers.set('X-RateLimit-Reset', String(rateLimit.reset));
  return response;
}

// =============================================================================
// DEPRECATION HEADERS
// =============================================================================

/**
 * Add deprecation headers to a response.
 * Per RFC 8594 (Sunset Header) and draft-ietf-httpapi-deprecation-header.
 */
export function addDeprecationHeaders(
  response: NextResponse,
  deprecationDate: string,
  sunsetDate: string,
  successorUrl?: string
): NextResponse {
  // Deprecation date (when it was deprecated)
  response.headers.set('Deprecation', `@${new Date(deprecationDate).getTime() / 1000}`);

  // Sunset date (when it will be removed)
  response.headers.set('Sunset', new Date(sunsetDate).toUTCString());

  // Link to successor version
  if (successorUrl) {
    response.headers.set('Link', `<${successorUrl}>; rel="successor-version"`);
  }

  return response;
}

// =============================================================================
// REQUEST ID
// =============================================================================

/**
 * Generate a unique request ID.
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Extract request ID from headers or generate one.
 */
export function getRequestId(headers: Headers): string {
  return headers.get('X-Request-Id') || generateRequestId();
}
