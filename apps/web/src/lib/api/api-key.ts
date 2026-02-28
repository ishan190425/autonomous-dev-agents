/**
 * ADA API Key Validation
 *
 * Extracts and validates API keys from request headers.
 * Integrates with the database to verify key authenticity and scopes.
 *
 * @author 🌌 The Frontier (C1286)
 * @date 2026-02-28
 * @related #190 (API Gateway), docs/architecture/adr-api-gateway-c1276.md
 *
 * @example
 * ```typescript
 * import { extractApiKey, validateApiKey, hasScope } from '@/lib/api';
 *
 * // In API route handler
 * const apiKey = extractApiKey(request.headers);
 * if (!apiKey) {
 *   return unauthorized('API key required', requestId);
 * }
 *
 * const validated = await validateApiKey(apiKey);
 * if (!validated) {
 *   return unauthorized('Invalid API key', requestId, 'invalid_api_key');
 * }
 *
 * if (!hasScope(validated, 'dispatch:execute')) {
 *   return forbidden('Insufficient permissions', requestId, 'insufficient_scope');
 * }
 * ```
 */

import type {
  ApiKeyPrefix,
  ApiKeyScope,
  RateLimitTier,
  ValidatedApiKey,
  RateLimitConfig,
} from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Valid API key prefixes.
 */
export const API_KEY_PREFIXES: ApiKeyPrefix[] = ['ada_sk_live_', 'ada_sk_test_'];

/**
 * API key format: prefix + 32 random characters.
 * Total length: 12 (prefix) + 32 (random) = 44 characters.
 */
export const API_KEY_LENGTH = 44;

/**
 * Rate limits per tier (from ADR C1276).
 */
export const RATE_LIMITS: Record<RateLimitTier, RateLimitConfig> = {
  free: {
    requestsPerMinute: 60,
    burstLimit: 100,
    concurrentExecutions: 1,
  },
  pro: {
    requestsPerMinute: 300,
    burstLimit: 500,
    concurrentExecutions: 5,
  },
  enterprise: {
    requestsPerMinute: 1000,
    burstLimit: 2000,
    concurrentExecutions: 25,
  },
};

// =============================================================================
// API KEY EXTRACTION
// =============================================================================

/**
 * Extract API key from Authorization header.
 *
 * Supports:
 * - Bearer token: `Authorization: Bearer ada_sk_live_xxx`
 * - Direct key: `Authorization: ada_sk_live_xxx`
 *
 * @returns The raw API key string, or null if not present/invalid format
 */
export function extractApiKey(headers: Headers): string | null {
  const authHeader = headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  // Handle "Bearer <key>" format
  if (authHeader.startsWith('Bearer ')) {
    const key = authHeader.slice(7).trim();
    return isValidKeyFormat(key) ? key : null;
  }

  // Handle direct key format
  return isValidKeyFormat(authHeader) ? authHeader : null;
}

/**
 * Check if a string looks like a valid API key format.
 * Does NOT validate against the database — just format checking.
 */
export function isValidKeyFormat(key: string): boolean {
  if (!key || key.length !== API_KEY_LENGTH) {
    return false;
  }

  return API_KEY_PREFIXES.some(prefix => key.startsWith(prefix));
}

/**
 * Determine if key is test or live mode.
 */
export function isTestKey(key: string): boolean {
  return key.startsWith('ada_sk_test_');
}

/**
 * Extract the last 4 characters for display/logging.
 */
export function getKeyLastFour(key: string): string {
  return key.slice(-4);
}

// =============================================================================
// API KEY VALIDATION
// =============================================================================

/**
 * Validate an API key against the database.
 *
 * @returns Validated API key data, or null if invalid
 *
 * @todo Implement database lookup (Sprint 3 Day 3-4)
 * Current implementation is a placeholder that returns null.
 */
export async function validateApiKey(key: string): Promise<ValidatedApiKey | null> {
  if (!isValidKeyFormat(key)) {
    return null;
  }

  // TODO: Implement database lookup
  // const keyHash = await hashApiKey(key);
  // const apiKey = await db.apiKey.findUnique({
  //   where: { keyHash },
  //   include: { user: true },
  // });
  //
  // if (!apiKey) return null;
  // if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
  //
  // // Update last used timestamp
  // await db.apiKey.update({
  //   where: { id: apiKey.id },
  //   data: { lastUsedAt: new Date() },
  // });
  //
  // return {
  //   id: apiKey.id,
  //   userId: apiKey.userId,
  //   name: apiKey.name,
  //   scopes: apiKey.scopes as ApiKeyScope[],
  //   tier: apiKey.user.tier as RateLimitTier,
  //   expiresAt: apiKey.expiresAt ?? undefined,
  // };

  // Placeholder: return null until database integration
  return null;
}

/**
 * Hash an API key for secure storage/lookup.
 *
 * Uses SHA-256 for fast comparison. The full key is never stored.
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a new API key.
 *
 * @param prefix - Key prefix (live or test)
 * @returns A new random API key
 */
export function generateApiKey(prefix: ApiKeyPrefix = 'ada_sk_live_'): string {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const randomPart = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}${randomPart}`;
}

// =============================================================================
// SCOPE CHECKING
// =============================================================================

/**
 * Check if a validated API key has a specific scope.
 */
export function hasScope(key: ValidatedApiKey, scope: ApiKeyScope): boolean {
  return key.scopes.includes(scope);
}

/**
 * Check if a validated API key has all specified scopes.
 */
export function hasAllScopes(key: ValidatedApiKey, scopes: ApiKeyScope[]): boolean {
  return scopes.every(scope => key.scopes.includes(scope));
}

/**
 * Check if a validated API key has any of the specified scopes.
 */
export function hasAnyScope(key: ValidatedApiKey, scopes: ApiKeyScope[]): boolean {
  return scopes.some(scope => key.scopes.includes(scope));
}

/**
 * Get rate limit config for a validated API key.
 */
export function getRateLimitConfig(key: ValidatedApiKey): RateLimitConfig {
  return RATE_LIMITS[key.tier];
}

// =============================================================================
// SCOPE DEFINITIONS
// =============================================================================

/**
 * Scope hierarchy — what each scope allows.
 */
export const SCOPE_DEFINITIONS: Record<
  ApiKeyScope,
  { description: string; includes?: ApiKeyScope[] }
> = {
  'workspaces:read': {
    description: 'Read workspace information',
  },
  'workspaces:write': {
    description: 'Create, update, and delete workspaces',
    includes: ['workspaces:read'],
  },
  'agents:read': {
    description: 'Read agent configurations and state',
  },
  'agents:write': {
    description: 'Create, update, and delete agents',
    includes: ['agents:read'],
  },
  'dispatch:read': {
    description: 'Read dispatch status and history',
  },
  'dispatch:execute': {
    description: 'Trigger dispatch cycles',
    includes: ['dispatch:read'],
  },
  'memory:read': {
    description: 'Read memory bank contents',
  },
  'memory:write': {
    description: 'Update memory bank',
    includes: ['memory:read'],
  },
  'billing:read': {
    description: 'Read billing and usage information',
  },
  'webhooks:manage': {
    description: 'Create, update, and delete webhooks',
  },
};

/**
 * Default scopes for new API keys by tier.
 */
export const DEFAULT_SCOPES: Record<RateLimitTier, ApiKeyScope[]> = {
  free: ['workspaces:read', 'agents:read', 'dispatch:read', 'memory:read'],
  pro: [
    'workspaces:read',
    'workspaces:write',
    'agents:read',
    'agents:write',
    'dispatch:read',
    'dispatch:execute',
    'memory:read',
    'memory:write',
    'billing:read',
  ],
  enterprise: [
    'workspaces:read',
    'workspaces:write',
    'agents:read',
    'agents:write',
    'dispatch:read',
    'dispatch:execute',
    'memory:read',
    'memory:write',
    'billing:read',
    'webhooks:manage',
  ],
};
