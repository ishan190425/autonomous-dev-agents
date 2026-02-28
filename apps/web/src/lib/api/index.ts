/**
 * ADA API Infrastructure
 *
 * Shared utilities for the ADA REST API. All v1 endpoints import from here.
 *
 * @author 🌌 The Frontier (C1286)
 * @date 2026-02-28
 * @related #190 (API Gateway), docs/architecture/adr-api-gateway-c1276.md
 *
 * @example
 * ```typescript
 * // In any API route handler
 * import {
 *   // Response builders
 *   apiSuccess,
 *   apiList,
 *   apiCreated,
 *   apiNoContent,
 *   apiError,
 *
 *   // Error helpers
 *   badRequest,
 *   unauthorized,
 *   forbidden,
 *   notFound,
 *   validationError,
 *   rateLimited,
 *   internalError,
 *
 *   // API key utilities
 *   extractApiKey,
 *   validateApiKey,
 *   hasScope,
 *   generateApiKey,
 *
 *   // Middleware utilities
 *   isApiRoute,
 *   parseApiVersion,
 *   buildApiContext,
 *   parsePaginationParams,
 *   calculatePagination,
 *
 *   // Types
 *   type ApiContext,
 *   type ApiResponse,
 *   type ProblemDetails,
 * } from '@/lib/api';
 *
 * export async function GET(request: NextRequest) {
 *   const requestId = getRequestId(request.headers);
 *
 *   // Extract and validate API key
 *   const apiKey = extractApiKey(request.headers);
 *   if (!apiKey) {
 *     return unauthorized('API key required', requestId);
 *   }
 *
 *   const key = await validateApiKey(apiKey);
 *   if (!key) {
 *     return unauthorized('Invalid API key', requestId, 'invalid_api_key');
 *   }
 *
 *   // Check scopes
 *   if (!hasScope(key, 'workspaces:read')) {
 *     return forbidden('Insufficient permissions', requestId, 'insufficient_scope');
 *   }
 *
 *   // Return data
 *   const workspaces = await getWorkspaces(key.userId);
 *   return apiSuccess({ workspaces }, requestId);
 * }
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  // API Context
  RateLimitTier,
  RateLimitConfig,
  RateLimitState,
  AuthMethod,
  ApiContext,
  ApiRequest,

  // Errors
  ApiErrorCode,
  ProblemDetails,

  // Responses
  ResponseMeta,
  PaginationInfo,
  ApiResponse,
  ApiListResponse,

  // API Keys
  ApiKeyPrefix,
  ApiKeyScope,
  ValidatedApiKey,

  // Versioning
  ApiVersionInfo,
  ApiVersion,
} from './types';

export { API_VERSIONS } from './types';

// =============================================================================
// RESPONSE BUILDERS
// =============================================================================

export {
  // Metadata
  buildMeta,

  // Success responses
  apiSuccess,
  apiList,
  apiCreated,
  apiNoContent,

  // Error responses
  apiError,
  buildProblem,

  // Error helpers
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

  // Headers
  addRateLimitHeaders,
  addDeprecationHeaders,

  // Request ID
  generateRequestId,
  getRequestId,
} from './response';

// =============================================================================
// API KEY UTILITIES
// =============================================================================

export {
  // Constants
  API_KEY_PREFIXES,
  API_KEY_LENGTH,
  RATE_LIMITS,

  // Extraction
  extractApiKey,
  isValidKeyFormat,
  isTestKey,
  getKeyLastFour,

  // Validation
  validateApiKey,
  hashApiKey,
  generateApiKey,

  // Scopes
  hasScope,
  hasAllScopes,
  hasAnyScope,
  getRateLimitConfig,
  SCOPE_DEFINITIONS,
  DEFAULT_SCOPES,
} from './api-key';

// =============================================================================
// MIDDLEWARE UTILITIES
// =============================================================================

export {
  // Route matching
  isApiRoute,
  isVersionedApiRoute,
  parseApiVersion,
  getVersionInfo,

  // Context
  buildApiContext,

  // Rate limiting (legacy - use rate-limiter module)
  checkRateLimit as checkRateLimitLegacy,
  checkConcurrencyLimit as checkConcurrencyLimitLegacy,

  // URL parsing
  extractWorkspaceId,
  extractAgentId,

  // Pagination
  parsePaginationParams,
  calculatePagination,

  // CORS
  CORS_HEADERS,
  addCorsHeaders,
} from './middleware';

// =============================================================================
// RATE LIMITER (C1296)
// =============================================================================

export {
  // Types
  type RateLimitInput,
  type RateLimitResult,
  type ConcurrencyResult,

  // Config
  RATE_LIMIT_CONFIGS,

  // Rate limiting
  checkRateLimit,
  getRateLimitHeaders,

  // Concurrent execution
  acquireExecutionSlot,
  releaseExecutionSlot,

  // Utilities
  getClientIp,

  // Testing
  _resetRateLimitStore,
} from './rate-limiter';

// =============================================================================
// HANDLER FACTORY (C1296)
// =============================================================================

export {
  // Types
  type HandlerOptions,
  type HandlerContext,
  type HandlerFunction,

  // Primary factory
  createApiHandler,

  // Convenience factories
  createPublicHandler,
  createAuthenticatedHandler,
  createDispatchHandler,
  createOptionsHandler,

  // Middleware composition
  composeMiddleware,
  withLogging,
  withSlotCleanup,
} from './handler';
