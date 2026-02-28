/**
 * API Key Validation Tests
 *
 * @author 🌌 The Frontier (C1286)
 */

import { describe, it, expect } from 'vitest';
import {
  extractApiKey,
  isValidKeyFormat,
  isTestKey,
  getKeyLastFour,
  generateApiKey,
  hashApiKey,
  hasScope,
  hasAllScopes,
  hasAnyScope,
  getRateLimitConfig,
  API_KEY_LENGTH,
  API_KEY_PREFIXES,
  RATE_LIMITS,
  DEFAULT_SCOPES,
} from '../api-key';
import type { ValidatedApiKey } from '../types';

describe('API Key Format Validation', () => {
  it('should validate correct live key format', () => {
    const key = 'ada_sk_live_0123456789abcdef0123456789abcdef';
    expect(isValidKeyFormat(key)).toBe(true);
  });

  it('should validate correct test key format', () => {
    const key = 'ada_sk_test_0123456789abcdef0123456789abcdef';
    expect(isValidKeyFormat(key)).toBe(true);
  });

  it('should reject key with wrong prefix', () => {
    const key = 'ada_pk_live_0123456789abcdef0123456789abcdef';
    expect(isValidKeyFormat(key)).toBe(false);
  });

  it('should reject key with wrong length', () => {
    const key = 'ada_sk_live_short';
    expect(isValidKeyFormat(key)).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidKeyFormat('')).toBe(false);
  });

  it('should reject null/undefined', () => {
    expect(isValidKeyFormat(null as unknown as string)).toBe(false);
    expect(isValidKeyFormat(undefined as unknown as string)).toBe(false);
  });
});

describe('API Key Extraction', () => {
  it('should extract from Bearer token', () => {
    const headers = new Headers();
    const key = 'ada_sk_live_0123456789abcdef0123456789abcdef';
    headers.set('Authorization', `Bearer ${key}`);
    expect(extractApiKey(headers)).toBe(key);
  });

  it('should extract direct key', () => {
    const headers = new Headers();
    const key = 'ada_sk_live_0123456789abcdef0123456789abcdef';
    headers.set('Authorization', key);
    expect(extractApiKey(headers)).toBe(key);
  });

  it('should return null when no Authorization header', () => {
    const headers = new Headers();
    expect(extractApiKey(headers)).toBe(null);
  });

  it('should return null for invalid key format', () => {
    const headers = new Headers();
    headers.set('Authorization', 'Bearer invalid_key');
    expect(extractApiKey(headers)).toBe(null);
  });

  it('should handle Bearer with extra whitespace', () => {
    const headers = new Headers();
    const key = 'ada_sk_live_0123456789abcdef0123456789abcdef';
    headers.set('Authorization', `Bearer   ${key}  `);
    expect(extractApiKey(headers)).toBe(key);
  });
});

describe('API Key Type Detection', () => {
  it('should detect test key', () => {
    const key = 'ada_sk_test_0123456789abcdef0123456789abcdef';
    expect(isTestKey(key)).toBe(true);
  });

  it('should detect live key as not test', () => {
    const key = 'ada_sk_live_0123456789abcdef0123456789abcdef';
    expect(isTestKey(key)).toBe(false);
  });
});

describe('API Key Utilities', () => {
  it('should get last four characters', () => {
    const key = 'ada_sk_live_0123456789abcdef0123456789abcdef';
    expect(getKeyLastFour(key)).toBe('cdef');
  });

  it('should generate valid live key', () => {
    const key = generateApiKey('ada_sk_live_');
    expect(isValidKeyFormat(key)).toBe(true);
    expect(key.startsWith('ada_sk_live_')).toBe(true);
    expect(key.length).toBe(API_KEY_LENGTH);
  });

  it('should generate valid test key', () => {
    const key = generateApiKey('ada_sk_test_');
    expect(isValidKeyFormat(key)).toBe(true);
    expect(key.startsWith('ada_sk_test_')).toBe(true);
  });

  it('should generate unique keys', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateApiKey());
    }
    expect(keys.size).toBe(100);
  });
});

describe('API Key Hashing', () => {
  it('should produce consistent hash for same key', async () => {
    const key = 'ada_sk_live_0123456789abcdef0123456789abcdef';
    const hash1 = await hashApiKey(key);
    const hash2 = await hashApiKey(key);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different keys', async () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    const hash1 = await hashApiKey(key1);
    const hash2 = await hashApiKey(key2);
    expect(hash1).not.toBe(hash2);
  });

  it('should produce 64-character hex hash', async () => {
    const key = 'ada_sk_live_0123456789abcdef0123456789abcdef';
    const hash = await hashApiKey(key);
    expect(hash.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });
});

describe('Scope Checking', () => {
  const mockKey: ValidatedApiKey = {
    id: 'key_123',
    userId: 'user_456',
    name: 'Test Key',
    scopes: ['workspaces:read', 'agents:read', 'dispatch:execute'],
    tier: 'pro',
  };

  it('should return true when key has scope', () => {
    expect(hasScope(mockKey, 'workspaces:read')).toBe(true);
    expect(hasScope(mockKey, 'dispatch:execute')).toBe(true);
  });

  it('should return false when key lacks scope', () => {
    expect(hasScope(mockKey, 'billing:read')).toBe(false);
    expect(hasScope(mockKey, 'webhooks:manage')).toBe(false);
  });

  it('should check all scopes', () => {
    expect(hasAllScopes(mockKey, ['workspaces:read', 'agents:read'])).toBe(true);
    expect(hasAllScopes(mockKey, ['workspaces:read', 'billing:read'])).toBe(false);
  });

  it('should check any scope', () => {
    expect(hasAnyScope(mockKey, ['billing:read', 'workspaces:read'])).toBe(true);
    expect(hasAnyScope(mockKey, ['billing:read', 'webhooks:manage'])).toBe(false);
  });
});

describe('Rate Limit Config', () => {
  it('should return correct config for each tier', () => {
    const freeKey: ValidatedApiKey = {
      id: 'key_123',
      userId: 'user_456',
      name: 'Free Key',
      scopes: [],
      tier: 'free',
    };

    const proKey: ValidatedApiKey = {
      id: 'key_456',
      userId: 'user_789',
      name: 'Pro Key',
      scopes: [],
      tier: 'pro',
    };

    expect(getRateLimitConfig(freeKey)).toEqual(RATE_LIMITS.free);
    expect(getRateLimitConfig(proKey)).toEqual(RATE_LIMITS.pro);
  });

  it('should have increasing limits by tier', () => {
    expect(RATE_LIMITS.free.requestsPerMinute).toBeLessThan(
      RATE_LIMITS.pro.requestsPerMinute
    );
    expect(RATE_LIMITS.pro.requestsPerMinute).toBeLessThan(
      RATE_LIMITS.enterprise.requestsPerMinute
    );
  });
});

describe('Constants', () => {
  it('should have correct API key length', () => {
    // prefix (12) + random (32) = 44
    expect(API_KEY_LENGTH).toBe(44);
  });

  it('should have correct prefixes', () => {
    expect(API_KEY_PREFIXES).toContain('ada_sk_live_');
    expect(API_KEY_PREFIXES).toContain('ada_sk_test_');
  });

  it('should have default scopes for all tiers', () => {
    expect(DEFAULT_SCOPES.free.length).toBeGreaterThan(0);
    expect(DEFAULT_SCOPES.pro.length).toBeGreaterThan(DEFAULT_SCOPES.free.length);
    expect(DEFAULT_SCOPES.enterprise.length).toBeGreaterThanOrEqual(
      DEFAULT_SCOPES.pro.length
    );
  });
});
