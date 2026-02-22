/**
 * @file Tests for AdaError class
 * @description Tests error construction, JSON serialization, and error wrapping
 */

import { describe, it, expect } from 'vitest';
import { AdaError } from '../../src/errors/error.js';

describe('AdaError', () => {
  describe('constructor', () => {
    it('creates error with default message from registry', () => {
      const error = new AdaError('ADA_NOT_INITIALIZED');

      expect(error.code).toBe('ADA_NOT_INITIALIZED');
      expect(error.message).toBe(
        "This directory doesn't have an ADA agent team configured"
      );
      expect(error.category).toBe('config');
      expect(error.exitCode).toBe(3);
      expect(error.docs).toContain('ADA_NOT_INITIALIZED');
    });

    it('allows message override', () => {
      const error = new AdaError('ADA_NOT_INITIALIZED', {
        message: 'Custom message here',
      });

      expect(error.message).toBe('Custom message here');
      expect(error.code).toBe('ADA_NOT_INITIALIZED');
    });

    it('includes details', () => {
      const error = new AdaError('ADA_NOT_INITIALIZED', {
        details: {
          missingFile: 'rotation.json',
          workingDir: '/home/user/project',
        },
      });

      expect(error.details).toEqual({
        missingFile: 'rotation.json',
        workingDir: '/home/user/project',
      });
    });

    it('includes context', () => {
      const error = new AdaError('ADA_MISSING_ACTION', {
        context: {
          command: 'dispatch complete',
          flags: ['--reflection'],
          missingFlag: '--action',
        },
      });

      expect(error.context).toEqual({
        command: 'dispatch complete',
        flags: ['--reflection'],
        missingFlag: '--action',
      });
    });

    it('merges custom suggestions with defaults', () => {
      const error = new AdaError('ADA_NOT_INITIALIZED', {
        suggestions: [
          { action: 'Check parent directories', primary: false },
        ],
      });

      // Should have default suggestions plus custom one
      expect(error.suggestions.length).toBeGreaterThan(1);
      expect(error.suggestions.some((s) => s.action.includes('ada init'))).toBe(
        true
      );
      expect(
        error.suggestions.some((s) => s.action.includes('parent directories'))
      ).toBe(true);
    });

    it('replaces suggestions when replaceSuggestions is true', () => {
      const error = new AdaError('ADA_NOT_INITIALIZED', {
        suggestions: [{ action: 'Only this suggestion', primary: true }],
        replaceSuggestions: true,
      });

      expect(error.suggestions).toHaveLength(1);
      expect(error.suggestions[0].action).toBe('Only this suggestion');
    });

    it('preserves cause error', () => {
      const cause = new Error('Original error');
      const error = new AdaError('ADA_UNKNOWN_ERROR', {
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('primarySuggestion', () => {
    it('returns the first primary suggestion', () => {
      const error = new AdaError('ADA_NOT_INITIALIZED');
      const primary = error.primarySuggestion;

      expect(primary).toBeDefined();
      expect(primary?.primary).toBe(true);
      expect(primary?.action).toContain('ada init');
    });

    it('returns undefined when no primary suggestion', () => {
      const error = new AdaError('ADA_UNKNOWN_ERROR', {
        suggestions: [
          { action: 'Not primary', primary: false },
        ],
        replaceSuggestions: true,
      });

      expect(error.primarySuggestion).toBeUndefined();
    });
  });

  describe('secondarySuggestions', () => {
    it('returns non-primary suggestions', () => {
      const error = new AdaError('ADA_NOT_INITIALIZED');
      const secondary = error.secondarySuggestions;

      expect(secondary.every((s) => !s.primary)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('serializes to structured JSON format', () => {
      const error = new AdaError('ADA_NOT_INITIALIZED', {
        details: { missingFile: 'rotation.json' },
        context: { command: 'dispatch start' },
      });

      const json = error.toJSON();

      expect(json.ok).toBe(false);
      expect(json.error.code).toBe('ADA_NOT_INITIALIZED');
      expect(json.error.message).toBe(
        "This directory doesn't have an ADA agent team configured"
      );
      expect(json.error.details).toEqual({ missingFile: 'rotation.json' });
      expect(json.error.suggestions).toBeInstanceOf(Array);
      expect(json.error.docs).toContain('ADA_NOT_INITIALIZED');
      expect(json.error.exitCode).toBe(3);
      expect(json.error.context).toEqual({ command: 'dispatch start' });
    });

    it('omits context when not provided', () => {
      const error = new AdaError('ADA_NOT_INITIALIZED');
      const json = error.toJSON();

      expect(json.error.context).toBeUndefined();
    });
  });

  describe('from', () => {
    it('returns AdaError unchanged', () => {
      const original = new AdaError('ADA_NOT_INITIALIZED');
      const result = AdaError.from(original);

      expect(result).toBe(original);
    });

    it('wraps Error with ADA_UNKNOWN_ERROR', () => {
      const error = new Error('Something went wrong');
      const result = AdaError.from(error);

      expect(result.code).toBe('ADA_UNKNOWN_ERROR');
      expect(result.message).toBe('Something went wrong');
      expect(result.cause).toBe(error);
    });

    it('wraps string with ADA_UNKNOWN_ERROR', () => {
      const result = AdaError.from('String error');

      expect(result.code).toBe('ADA_UNKNOWN_ERROR');
      expect(result.message).toBe('String error');
    });

    it('uses fallbackCode when provided', () => {
      const error = new Error('Network issue');
      const result = AdaError.from(error, {
        fallbackCode: 'ADA_NETWORK_OFFLINE',
      });

      expect(result.code).toBe('ADA_NETWORK_OFFLINE');
      expect(result.message).toBe('Network issue');
    });

    it('includes context when provided', () => {
      const error = new Error('Something failed');
      const result = AdaError.from(error, {
        context: { command: 'dispatch complete' },
      });

      expect(result.context).toEqual({ command: 'dispatch complete' });
    });
  });

  describe('isAdaError', () => {
    it('returns true for AdaError', () => {
      const error = new AdaError('ADA_NOT_INITIALIZED');
      expect(AdaError.isAdaError(error)).toBe(true);
    });

    it('returns false for regular Error', () => {
      const error = new Error('Regular error');
      expect(AdaError.isAdaError(error)).toBe(false);
    });

    it('returns false for non-errors', () => {
      expect(AdaError.isAdaError('string')).toBe(false);
      expect(AdaError.isAdaError(null)).toBe(false);
      expect(AdaError.isAdaError(undefined)).toBe(false);
      expect(AdaError.isAdaError({})).toBe(false);
    });
  });

  describe('exit codes', () => {
    it('config errors have exit code 3', () => {
      expect(new AdaError('ADA_NOT_INITIALIZED').exitCode).toBe(3);
      expect(new AdaError('ADA_INVALID_CONFIG').exitCode).toBe(3);
      expect(new AdaError('ADA_MISSING_PLAYBOOK').exitCode).toBe(3);
      expect(new AdaError('ADA_CORRUPT_STATE').exitCode).toBe(3);
    });

    it('runtime errors have exit code 4', () => {
      expect(new AdaError('ADA_CYCLE_IN_PROGRESS').exitCode).toBe(4);
      expect(new AdaError('ADA_WRONG_ROLE').exitCode).toBe(4);
    });

    it('network errors have exit code 5', () => {
      expect(new AdaError('ADA_GITHUB_UNAUTHORIZED').exitCode).toBe(5);
      expect(new AdaError('ADA_GITHUB_RATE_LIMIT').exitCode).toBe(5);
      expect(new AdaError('ADA_GITHUB_NOT_FOUND').exitCode).toBe(5);
      expect(new AdaError('ADA_NETWORK_OFFLINE').exitCode).toBe(5);
    });

    it('validation errors have exit code 2', () => {
      expect(new AdaError('ADA_MISSING_ACTION').exitCode).toBe(2);
      expect(new AdaError('ADA_INVALID_ROLE').exitCode).toBe(2);
      expect(new AdaError('ADA_EMPTY_MEMORY').exitCode).toBe(2);
    });

    it('git errors have exit code 6', () => {
      expect(new AdaError('ADA_GIT_DIRTY').exitCode).toBe(6);
      expect(new AdaError('ADA_GIT_CONFLICT').exitCode).toBe(6);
    });
  });
});
