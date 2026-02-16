/**
 * Container Environment Validation Tests
 *
 * Unit tests for environment variable validation.
 * Per QA test plan C716: 15 tests for env validation.
 *
 * @author ⚙️ Engineering | Cycle 717 | Phase 1 Container MVP
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv } from '../../src/container/env.js';

describe('Container Environment Validation', () => {
  // Save original env
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear relevant env vars before each test
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPO;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ADA_DISPATCH_INTERVAL;
    delete process.env.ADA_ROLES_MODE;
    delete process.env.ADA_LOG_LEVEL;
    delete process.env.ADA_HEALTH_PORT;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('Required Variables', () => {
    it('fails with clear error when GITHUB_TOKEN missing', () => {
      process.env.GITHUB_REPO = 'owner/repo';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-xxx';

      const result = validateEnv();

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'GITHUB_TOKEN',
        message: 'GITHUB_TOKEN is required but not set',
      });
    });

    it('fails with clear error when GITHUB_REPO missing', () => {
      process.env.GITHUB_TOKEN = 'ghp_xxx';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-xxx';

      const result = validateEnv();

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'GITHUB_REPO',
        message: 'GITHUB_REPO is required but not set',
      });
    });

    it('fails with clear error when ANTHROPIC_API_KEY missing', () => {
      process.env.GITHUB_TOKEN = 'ghp_xxx';
      process.env.GITHUB_REPO = 'owner/repo';

      const result = validateEnv();

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'ANTHROPIC_API_KEY',
        message: 'ANTHROPIC_API_KEY is required but not set',
      });
    });

    it('validates GITHUB_TOKEN format (ghp_ prefix)', () => {
      process.env.GITHUB_TOKEN = 'invalid_token';
      process.env.GITHUB_REPO = 'owner/repo';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-xxx';

      const result = validateEnv();

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'GITHUB_TOKEN',
          message: expect.stringContaining("must start with 'ghp_'"),
        })
      );
    });

    it('accepts GITHUB_TOKEN with github_pat_ prefix', () => {
      process.env.GITHUB_TOKEN = 'github_pat_xxx';
      process.env.GITHUB_REPO = 'owner/repo';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-xxx';

      const result = validateEnv();

      expect(result.success).toBe(true);
      expect(result.config?.githubToken).toBe('github_pat_xxx');
    });

    it('validates GITHUB_REPO format (owner/repo)', () => {
      process.env.GITHUB_TOKEN = 'ghp_xxx';
      process.env.GITHUB_REPO = 'invalid-format';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-xxx';

      const result = validateEnv();

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'GITHUB_REPO',
          message: expect.stringContaining("'owner/repo' format"),
        })
      );
    });

    it('validates ANTHROPIC_API_KEY format (sk-ant- prefix)', () => {
      process.env.GITHUB_TOKEN = 'ghp_xxx';
      process.env.GITHUB_REPO = 'owner/repo';
      process.env.ANTHROPIC_API_KEY = 'invalid_key';

      const result = validateEnv();

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'ANTHROPIC_API_KEY',
          message: expect.stringContaining("must start with 'sk-ant-'"),
        })
      );
    });
  });

  describe('Optional Variables', () => {
    beforeEach(() => {
      // Set valid required vars
      process.env.GITHUB_TOKEN = 'ghp_xxx';
      process.env.GITHUB_REPO = 'owner/repo';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-xxx';
    });

    it('uses default ADA_DISPATCH_INTERVAL of 15m when not set', () => {
      const result = validateEnv();

      expect(result.success).toBe(true);
      expect(result.config?.dispatchInterval).toBe('15m');
    });

    it('parses ADA_DISPATCH_INTERVAL formats: 15m, 30m, 1h', () => {
      process.env.ADA_DISPATCH_INTERVAL = '30m';
      let result = validateEnv();
      expect(result.success).toBe(true);
      expect(result.config?.dispatchInterval).toBe('30m');

      process.env.ADA_DISPATCH_INTERVAL = '1h';
      result = validateEnv();
      expect(result.success).toBe(true);
      expect(result.config?.dispatchInterval).toBe('1h');
    });

    it('rejects invalid ADA_DISPATCH_INTERVAL values', () => {
      process.env.ADA_DISPATCH_INTERVAL = 'invalid';

      const result = validateEnv();

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'ADA_DISPATCH_INTERVAL',
        })
      );
    });

    it('uses default ADA_ROLES_MODE of read-write when not set', () => {
      const result = validateEnv();

      expect(result.success).toBe(true);
      expect(result.config?.rolesMode).toBe('read-write');
    });

    it('validates ADA_ROLES_MODE is read-only or read-write', () => {
      process.env.ADA_ROLES_MODE = 'invalid';

      const result = validateEnv();

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'ADA_ROLES_MODE',
          message: expect.stringContaining("'read-only' or 'read-write'"),
        })
      );
    });

    it('uses default ADA_LOG_LEVEL of info when not set', () => {
      const result = validateEnv();

      expect(result.success).toBe(true);
      expect(result.config?.logLevel).toBe('info');
    });

    it('validates ADA_LOG_LEVEL is debug, info, or warn', () => {
      process.env.ADA_LOG_LEVEL = 'invalid';

      const result = validateEnv();

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'ADA_LOG_LEVEL',
          message: expect.stringContaining("'debug', 'info', or 'warn'"),
        })
      );
    });
  });

  describe('Startup Validation', () => {
    it('validates all env vars on startup, returning all errors', () => {
      // No env vars set - should get 3 errors (all required vars)
      const result = validateEnv();

      expect(result.success).toBe(false);
      expect(result.errors?.length).toBe(3);
    });

    it('provides actionable error messages for each validation failure', () => {
      const result = validateEnv();

      expect(result.success).toBe(false);
      result.errors?.forEach((error) => {
        expect(error.field).toBeTruthy();
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(10); // Meaningful message
      });
    });

    it('returns complete config when all validations pass', () => {
      process.env.GITHUB_TOKEN = 'ghp_xxx';
      process.env.GITHUB_REPO = 'owner/repo';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-xxx';

      const result = validateEnv();

      expect(result.success).toBe(true);
      expect(result.config).toEqual({
        githubToken: 'ghp_xxx',
        githubRepo: 'owner/repo',
        anthropicApiKey: 'sk-ant-xxx',
        dispatchInterval: '15m',
        rolesMode: 'read-write',
        logLevel: 'info',
        healthPort: 8080,
      });
    });
  });
});
