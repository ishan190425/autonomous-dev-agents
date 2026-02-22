/**
 * @file Tests for error registry
 * @description Tests error code registry and definitions
 */

import { describe, it, expect } from 'vitest';
import {
  ERROR_REGISTRY,
  DOCS_BASE_URL,
  getErrorDefinition,
  isValidErrorCode,
} from '../../src/errors/registry.js';
import { EXIT_CODES } from '../../src/errors/types.js';

describe('ERROR_REGISTRY', () => {
  it('contains all documented error codes', () => {
    const expectedCodes = [
      // Config errors
      'ADA_NOT_INITIALIZED',
      'ADA_INVALID_CONFIG',
      'ADA_MISSING_PLAYBOOK',
      'ADA_CORRUPT_STATE',
      // Runtime errors
      'ADA_CYCLE_IN_PROGRESS',
      'ADA_WRONG_ROLE',
      'ADA_GIT_DIRTY',
      'ADA_GIT_CONFLICT',
      // Network errors
      'ADA_GITHUB_UNAUTHORIZED',
      'ADA_GITHUB_RATE_LIMIT',
      'ADA_GITHUB_NOT_FOUND',
      'ADA_NETWORK_OFFLINE',
      // Validation errors
      'ADA_MISSING_ACTION',
      'ADA_INVALID_ROLE',
      'ADA_EMPTY_MEMORY',
      // Generic
      'ADA_UNKNOWN_ERROR',
    ];

    for (const code of expectedCodes) {
      expect(ERROR_REGISTRY[code as keyof typeof ERROR_REGISTRY]).toBeDefined();
    }
  });

  it('all entries have required fields', () => {
    for (const [, definition] of Object.entries(ERROR_REGISTRY)) {
      expect(definition.exitCode).toBeTypeOf('number');
      expect(definition.category).toBeTypeOf('string');
      expect(definition.template).toBeTypeOf('string');
      expect(definition.docs).toBeTypeOf('string');
      expect(definition.defaultSuggestions).toBeInstanceOf(Array);
      expect(definition.defaultSuggestions.length).toBeGreaterThan(0);
    }
  });

  it('all entries have at least one primary suggestion', () => {
    for (const [, definition] of Object.entries(ERROR_REGISTRY)) {
      const hasPrimary = definition.defaultSuggestions.some((s) => s.primary);
      expect(hasPrimary).toBe(true);
    }
  });

  it('all docs URLs use DOCS_BASE_URL', () => {
    for (const [code, definition] of Object.entries(ERROR_REGISTRY)) {
      expect(definition.docs).toContain(DOCS_BASE_URL);
      expect(definition.docs).toContain(code);
    }
  });

  describe('exit codes', () => {
    it('config errors have exit code 3', () => {
      expect(ERROR_REGISTRY.ADA_NOT_INITIALIZED.exitCode).toBe(EXIT_CODES.CONFIG_ERROR);
      expect(ERROR_REGISTRY.ADA_INVALID_CONFIG.exitCode).toBe(EXIT_CODES.CONFIG_ERROR);
      expect(ERROR_REGISTRY.ADA_MISSING_PLAYBOOK.exitCode).toBe(EXIT_CODES.CONFIG_ERROR);
      expect(ERROR_REGISTRY.ADA_CORRUPT_STATE.exitCode).toBe(EXIT_CODES.CONFIG_ERROR);
    });

    it('runtime errors have exit code 4', () => {
      expect(ERROR_REGISTRY.ADA_CYCLE_IN_PROGRESS.exitCode).toBe(EXIT_CODES.RUNTIME_ERROR);
      expect(ERROR_REGISTRY.ADA_WRONG_ROLE.exitCode).toBe(EXIT_CODES.RUNTIME_ERROR);
    });

    it('network errors have exit code 5', () => {
      expect(ERROR_REGISTRY.ADA_GITHUB_UNAUTHORIZED.exitCode).toBe(EXIT_CODES.NETWORK_ERROR);
      expect(ERROR_REGISTRY.ADA_GITHUB_RATE_LIMIT.exitCode).toBe(EXIT_CODES.NETWORK_ERROR);
      expect(ERROR_REGISTRY.ADA_GITHUB_NOT_FOUND.exitCode).toBe(EXIT_CODES.NETWORK_ERROR);
      expect(ERROR_REGISTRY.ADA_NETWORK_OFFLINE.exitCode).toBe(EXIT_CODES.NETWORK_ERROR);
    });

    it('validation errors have exit code 2', () => {
      expect(ERROR_REGISTRY.ADA_MISSING_ACTION.exitCode).toBe(EXIT_CODES.USAGE_ERROR);
      expect(ERROR_REGISTRY.ADA_INVALID_ROLE.exitCode).toBe(EXIT_CODES.USAGE_ERROR);
      expect(ERROR_REGISTRY.ADA_EMPTY_MEMORY.exitCode).toBe(EXIT_CODES.USAGE_ERROR);
    });

    it('git errors have exit code 6', () => {
      expect(ERROR_REGISTRY.ADA_GIT_DIRTY.exitCode).toBe(EXIT_CODES.GIT_ERROR);
      expect(ERROR_REGISTRY.ADA_GIT_CONFLICT.exitCode).toBe(EXIT_CODES.GIT_ERROR);
    });
  });

  describe('categories', () => {
    it('config errors have config category', () => {
      expect(ERROR_REGISTRY.ADA_NOT_INITIALIZED.category).toBe('config');
      expect(ERROR_REGISTRY.ADA_INVALID_CONFIG.category).toBe('config');
    });

    it('runtime errors have runtime category', () => {
      expect(ERROR_REGISTRY.ADA_CYCLE_IN_PROGRESS.category).toBe('runtime');
      expect(ERROR_REGISTRY.ADA_WRONG_ROLE.category).toBe('runtime');
    });

    it('network errors have network category', () => {
      expect(ERROR_REGISTRY.ADA_GITHUB_UNAUTHORIZED.category).toBe('network');
      expect(ERROR_REGISTRY.ADA_NETWORK_OFFLINE.category).toBe('network');
    });

    it('validation errors have validation category', () => {
      expect(ERROR_REGISTRY.ADA_MISSING_ACTION.category).toBe('validation');
      expect(ERROR_REGISTRY.ADA_INVALID_ROLE.category).toBe('validation');
    });
  });
});

describe('getErrorDefinition', () => {
  it('returns definition for valid code', () => {
    const definition = getErrorDefinition('ADA_NOT_INITIALIZED');

    expect(definition.category).toBe('config');
    expect(definition.exitCode).toBe(3);
    expect(definition.template).toContain('ADA agent team');
  });

  it('returns unknown error for invalid code', () => {
    // @ts-expect-error Testing invalid code
    const definition = getErrorDefinition('INVALID_CODE');

    expect(definition.exitCode).toBe(EXIT_CODES.GENERAL_ERROR);
    expect(definition).toBe(ERROR_REGISTRY.ADA_UNKNOWN_ERROR);
  });
});

describe('isValidErrorCode', () => {
  it('returns true for valid codes', () => {
    expect(isValidErrorCode('ADA_NOT_INITIALIZED')).toBe(true);
    expect(isValidErrorCode('ADA_GITHUB_UNAUTHORIZED')).toBe(true);
    expect(isValidErrorCode('ADA_MISSING_ACTION')).toBe(true);
  });

  it('returns false for invalid codes', () => {
    expect(isValidErrorCode('INVALID_CODE')).toBe(false);
    expect(isValidErrorCode('')).toBe(false);
    expect(isValidErrorCode('ADA_FAKE_ERROR')).toBe(false);
  });
});

describe('DOCS_BASE_URL', () => {
  it('is a valid URL', () => {
    expect(DOCS_BASE_URL).toMatch(/^https?:\/\//);
  });

  it('ends with /errors', () => {
    expect(DOCS_BASE_URL).toMatch(/\/errors$/);
  });
});
