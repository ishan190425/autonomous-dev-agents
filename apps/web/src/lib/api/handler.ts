/**
 * ADA API Route Handler Factory
 *
 * Provides a unified handler pattern for API routes that integrates:
 * - Authentication (API key or session)
 * - Rate limiting (sliding window + concurrent execution)
 * - Request context (request ID, version, user info)
 * - Error handling (RFC 7807 problem details)
 * - Response formatting (consistent JSON structure)
 * - CORS headers
 *
 * @author 🌌 The Frontier (C1296)
 * @date 2026-02-28
 * @related #190 (API Gateway), #269 (rate-limit module)
 *
 * @example
 * ```typescript
 * // In apps/web/src/app/api/v1/workspaces/route.ts
 * import { createApiHandler } from '@/lib/api/handler';
 * import { apiSuccess, apiList } from '@/lib/api/response';
 *
 * export const GET = createApiHandler({
 *   auth: 'required',
 *   rateLimit: true,
 * }, async (request, context) => {
 *   const workspaces = await db.workspaces.findMany({
 *     where: { userId: context.userId },
 *   });
 *
 *   return apiList(workspaces, {
 *     page: 1,
 *     pageSize: 20,
 *     total: workspaces.length,
 *   });
 * });
 *
 * export const POST = createApiHandler({
 *   auth: 'required',
 *   rateLimit: true,
 *   validateBody: workspaceSchema,
 * }, async (request, context) => {
 *   const body = await request.json();
 *   const workspace = await db.workspaces.create({
 *     data: { ...body, userId: context.userId },
 *   });
 *
 *   return apiCreated(workspace);
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';

import type { ApiContext, ApiVersion, AuthMethod, RateLimitTier } from './types';
import { API_VERSIONS } from './types';
import { extractApiKey, validateApiKey } from './api-key';
import {
  apiError,
  rateLimited,
  validationError,
  unauthorized,
  forbidden,
  internalError,
  generateRequestId,
} from './response';
import {
  checkRateLimit,
  getRateLimitHeaders,
  getClientIp,
  acquireExecutionSlot,
  releaseExecutionSlot,
} from './rate-limiter';
import { addCorsHeaders, parseApiVersion, parsePaginationParams } from './middleware';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Handler configuration options
 */
export interface HandlerOptions {
  /**
   * Authentication requirement:
   * - 'required': Must be authenticated (401 if not)
   * - 'optional': Auth is checked but not required
   * - 'none': No auth checking
   */
  auth?: 'required' | 'optional' | 'none';

  /**
   * Enable rate limiting for this endpoint
   */
  rateLimit?: boolean;

  /**
   * Enable concurrent execution limiting (for dispatch endpoints)
   */
  concurrencyLimit?: boolean;

  /**
   * Zod schema for request body validation
   */
  validateBody?: ZodSchema;

  /**
   * Zod schema for query params validation
   */
  validateQuery?: ZodSchema;

  /**
   * Custom rate limit tier override (for public endpoints)
   */
  rateLimitTier?: RateLimitTier;

  /**
   * Minimum required scope for API key auth
   */
  requiredScope?: string;

  /**
   * Whether to include deprecation warning headers
   */
  deprecated?: boolean;

  /**
   * Deprecation message
   */
  deprecationMessage?: string;

  /**
   * Sunset date for deprecated endpoint
   */
  sunsetDate?: string;
}

/**
 * Extended API context with handler-specific data
 */
export interface HandlerContext extends ApiContext {
  /** Parsed pagination parameters */
  pagination: {
    page: number;
    pageSize: number;
  };
  /** Path parameters extracted from URL */
  params: Record<string, string>;
  /** Validated request body (if validateBody was provided) */
  body?: unknown;
  /** Validated query params (if validateQuery was provided) */
  query?: unknown;
  /** Concurrent execution slot ID (if concurrencyLimit enabled) */
  executionSlotId?: string;
}

/**
 * Handler function signature
 */
export type HandlerFunction = (
  request: NextRequest,
  context: HandlerContext
) => Promise<NextResponse | Response>;

// =============================================================================
// HANDLER FACTORY
// =============================================================================

/**
 * Create an API route handler with built-in middleware.
 *
 * This is the primary abstraction for API routes. It handles:
 * 1. Request ID generation
 * 2. API version detection
 * 3. Authentication (API key or session)
 * 4. Rate limiting
 * 5. Request validation
 * 6. Error handling
 * 7. Response formatting
 *
 * @param options - Handler configuration
 * @param handler - The actual handler function
 * @returns Next.js route handler
 */
export function createApiHandler(
  options: HandlerOptions,
  handler: HandlerFunction
): (request: NextRequest, params: { params: Record<string, string> }) => Promise<Response> {
  return async (
    request: NextRequest,
    { params }: { params: Record<string, string> }
  ): Promise<Response> => {
    const requestId = generateRequestId();
    const timestamp = new Date();

    try {
      // Parse API version
      const pathname = request.nextUrl.pathname;
      const version = parseApiVersion(pathname) || 'v1';

      // Check version status
      const versionInfo = API_VERSIONS[version as ApiVersion];
      if (!versionInfo) {
        return apiError(400, 'Invalid Version', 'Invalid API version', requestId, 'validation_error');
      }
      // Note: Currently only v1 exists and is not deprecated
      // Future versions will have deprecated/sunset handling

      // Resolve authentication
      const { authMethod, userId, tier, scopes } = await resolveAuth(request);

      // Check auth requirement
      if (options.auth === 'required' && !userId) {
        return unauthorized('Authentication required', requestId);
      }

      // Check required scope
      if (options.requiredScope && scopes && !scopes.includes(options.requiredScope)) {
        return forbidden(`Missing required scope: ${options.requiredScope}`, requestId);
      }

      // Rate limiting
      let rateLimitHeaders: Record<string, string> = {};
      if (options.rateLimit !== false) {
        const effectiveTier = options.rateLimitTier || tier;
        const identifier = userId || getClientIp(request);

        const rateLimitResult = await checkRateLimit({
          identifier,
          tier: effectiveTier,
          path: pathname,
          method: request.method,
        });

        rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

        if (!rateLimitResult.allowed) {
          // Convert RateLimitResult to RateLimitState for response helper
          const rateLimitState = {
            limited: true,
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            reset: rateLimitResult.resetAt,
            retryAfter: rateLimitResult.retryAfter,
          };
          return rateLimited(requestId, rateLimitState);
        }
      }

      // Concurrent execution limiting
      let executionSlotId: string | undefined;
      if (options.concurrencyLimit && userId) {
        const slot = await acquireExecutionSlot(userId, tier);
        if (!slot.allowed) {
          return apiError(
            429,
            'Too Many Requests',
            `Maximum concurrent executions reached (${slot.current}/${slot.limit})`,
            requestId,
            'concurrent_limit'
          );
        }
        executionSlotId = slot.slotId;
      }

      // Parse pagination
      const pagination = parsePaginationParams(request.nextUrl.searchParams);

      // Validate request body
      let body: unknown;
      if (options.validateBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const rawBody = await request.json();
          const result = options.validateBody.safeParse(rawBody);
          if (!result.success) {
            // Convert Zod errors to Record<string, string[]>
            const errors: Record<string, string[]> = {};
            for (const error of result.error.errors) {
              const path = error.path.join('.') || 'root';
              if (!errors[path]) errors[path] = [];
              errors[path].push(error.message);
            }
            return validationError(errors, requestId);
          }
          body = result.data;
        } catch {
          return apiError(400, 'Bad Request', 'Invalid JSON in request body', requestId, 'invalid_request_body');
        }
      }

      // Validate query params
      let query: unknown;
      if (options.validateQuery) {
        const queryObj = Object.fromEntries(request.nextUrl.searchParams);
        const result = options.validateQuery.safeParse(queryObj);
        if (!result.success) {
          // Convert Zod errors to Record<string, string[]>
          const errors: Record<string, string[]> = {};
          for (const error of result.error.errors) {
            const path = error.path.join('.') || 'root';
            if (!errors[path]) errors[path] = [];
            errors[path].push(error.message);
          }
          return validationError(errors, requestId);
        }
        query = result.data;
      }

      // Build context
      const context: HandlerContext = {
        requestId,
        apiVersion: version,
        authMethod,
        userId,
        tier,
        rateLimit: {
          limited: false,
          limit: 0,
          remaining: 0,
          reset: 0,
        },
        timestamp,
        pagination,
        params,
        body,
        query,
        executionSlotId,
      };

      // Execute handler
      const response = await handler(request, context);

      // Convert to NextResponse if needed
      const nextResponse = response instanceof NextResponse
        ? response
        : NextResponse.json(await response.json(), {
            status: response.status,
            headers: response.headers,
          });

      // Add standard headers
      nextResponse.headers.set('X-Request-Id', requestId);
      nextResponse.headers.set('X-Api-Version', version);

      // Add rate limit headers
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        nextResponse.headers.set(key, value);
      });

      // Add deprecation headers
      if (options.deprecated || versionInfo.deprecated) {
        nextResponse.headers.set('Deprecation', options.sunsetDate || 'true');
        if (options.deprecationMessage) {
          nextResponse.headers.set('X-Deprecation-Notice', options.deprecationMessage);
        }
      }

      // Add CORS headers
      addCorsHeaders(nextResponse.headers);

      return nextResponse;
    } catch (error) {
      console.error('[api-handler] Unhandled error:', error);

      // Release execution slot on error
      if (options.concurrencyLimit) {
        // We can't easily release here since we don't have context
        // The slot will expire after TTL (1 hour)
      }

      return internalError(requestId);
    }
  };
}

// =============================================================================
// AUTH RESOLUTION
// =============================================================================

/**
 * Resolve authentication from request
 */
async function resolveAuth(request: NextRequest): Promise<{
  authMethod: AuthMethod;
  userId?: string;
  tier: RateLimitTier;
  scopes?: string[];
}> {
  // Check for API key
  const apiKey = extractApiKey(request.headers);
  if (apiKey) {
    const validated = await validateApiKey(apiKey);
    if (validated) {
      return {
        authMethod: 'api_key',
        userId: validated.userId,
        tier: validated.tier,
        scopes: validated.scopes,
      };
    }
    // Invalid API key
    return { authMethod: 'api_key', tier: 'free' };
  }

  // Check for session cookie
  // TODO: Integrate with NextAuth.js session validation
  // const session = await getServerSession(authOptions);
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
// HANDLER VARIANTS
// =============================================================================

/**
 * Create a public API handler (no auth required, rate limited by IP)
 */
export function createPublicHandler(
  handler: HandlerFunction
): (request: NextRequest, params: { params: Record<string, string> }) => Promise<Response> {
  return createApiHandler(
    {
      auth: 'none',
      rateLimit: true,
      rateLimitTier: 'free',
    },
    handler
  );
}

/**
 * Create an authenticated API handler (auth required)
 */
export function createAuthenticatedHandler(
  handler: HandlerFunction
): (request: NextRequest, params: { params: Record<string, string> }) => Promise<Response> {
  return createApiHandler(
    {
      auth: 'required',
      rateLimit: true,
    },
    handler
  );
}

/**
 * Create a dispatch execution handler (auth required, concurrency limited)
 */
export function createDispatchHandler(
  handler: HandlerFunction
): (request: NextRequest, params: { params: Record<string, string> }) => Promise<Response> {
  return createApiHandler(
    {
      auth: 'required',
      rateLimit: true,
      concurrencyLimit: true,
    },
    handler
  );
}

// =============================================================================
// OPTIONS HANDLER
// =============================================================================

/**
 * Standard OPTIONS handler for CORS preflight
 */
export function createOptionsHandler(): (request: NextRequest) => Response {
  return () => {
    const response = new Response(null, { status: 204 });
    addCorsHeaders(response.headers);
    return response;
  };
}

// =============================================================================
// HANDLER COMPOSITION
// =============================================================================

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware(
  ...middlewares: Array<(
    request: NextRequest,
    context: HandlerContext,
    next: () => Promise<Response>
  ) => Promise<Response>>
): (handler: HandlerFunction) => HandlerFunction {
  return (handler: HandlerFunction): HandlerFunction => {
    return async (request: NextRequest, context: HandlerContext): Promise<Response> => {
      let index = 0;

      const next = async (): Promise<Response> => {
        if (index >= middlewares.length) {
          return handler(request, context);
        }
        const middleware = middlewares[index++];
        return middleware(request, context, next);
      };

      return next();
    };
  };
}

/**
 * Logging middleware
 */
export function withLogging(
  request: NextRequest,
  context: HandlerContext,
  next: () => Promise<Response>
): Promise<Response> {
  const start = Date.now();

  return next().then((response) => {
    const duration = Date.now() - start;
    console.log(
      `[api] ${request.method} ${request.nextUrl.pathname} - ${response.status} (${duration}ms) [${context.requestId}]`
    );
    return response;
  });
}

/**
 * Execution slot cleanup middleware (for dispatch handlers)
 */
export async function withSlotCleanup(
  request: NextRequest,
  context: HandlerContext,
  next: () => Promise<Response>
): Promise<Response> {
  try {
    return await next();
  } finally {
    if (context.executionSlotId && context.userId) {
      await releaseExecutionSlot(context.userId, context.executionSlotId);
    }
  }
}
