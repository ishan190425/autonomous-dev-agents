/**
 * @ada/cli — CLI Logger Tests
 *
 * Unit tests for CLI logger module.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  resolveOutputMode,
  getLevelForMode,
  getFormatForMode,
  createCLILogger,
  initializeCLILogger,
  getCLILogger,
  resetCLILogger,
} from '../logger.js';

describe('CLI Logger', () => {
  afterEach(() => {
    resetCLILogger();
  });

  describe('resolveOutputMode', () => {
    it('returns "default" when no flags are set', () => {
      expect(resolveOutputMode({})).toBe('default');
    });

    it('returns "verbose" when --verbose is set', () => {
      expect(resolveOutputMode({ verbose: true })).toBe('verbose');
    });

    it('returns "json" when --json is set', () => {
      expect(resolveOutputMode({ json: true })).toBe('json');
    });

    it('returns "quiet" when --quiet is set', () => {
      expect(resolveOutputMode({ quiet: true })).toBe('quiet');
    });

    it('--json wins over --verbose (flag precedence)', () => {
      expect(resolveOutputMode({ json: true, verbose: true })).toBe('json');
    });

    it('--json wins over --quiet (flag precedence)', () => {
      expect(resolveOutputMode({ json: true, quiet: true })).toBe('json');
    });

    it('--quiet wins over --verbose (flag precedence)', () => {
      expect(resolveOutputMode({ quiet: true, verbose: true })).toBe('quiet');
    });

    it('--json wins over both --verbose and --quiet', () => {
      expect(resolveOutputMode({ json: true, verbose: true, quiet: true })).toBe('json');
    });
  });

  describe('getLevelForMode', () => {
    it('returns "info" for default mode', () => {
      expect(getLevelForMode('default')).toBe('info');
    });

    it('returns "debug" for verbose mode', () => {
      expect(getLevelForMode('verbose')).toBe('debug');
    });

    it('returns "debug" for json mode (machine-readable needs detail)', () => {
      expect(getLevelForMode('json')).toBe('debug');
    });

    it('returns "warn" for quiet mode', () => {
      expect(getLevelForMode('quiet')).toBe('warn');
    });
  });

  describe('getFormatForMode', () => {
    it('returns "json" for json mode', () => {
      expect(getFormatForMode('json')).toBe('json');
    });

    it('returns "text" for quiet mode (no colors in CI)', () => {
      expect(getFormatForMode('quiet')).toBe('text');
    });

    // Note: default/verbose format depends on TTY detection
    // In test environment, TTY is usually false, so expect 'text'
    it('returns "text" or "pretty" for default mode (TTY-dependent)', () => {
      const format = getFormatForMode('default');
      expect(['text', 'pretty']).toContain(format);
    });

    it('returns "text" or "pretty" for verbose mode (TTY-dependent)', () => {
      const format = getFormatForMode('verbose');
      expect(['text', 'pretty']).toContain(format);
    });
  });

  describe('createCLILogger', () => {
    it('creates a logger with default options', () => {
      const logger = createCLILogger();
      expect(logger).toBeDefined();
      expect(logger.getLevel()).toBe('info');
    });

    it('creates a debug-level logger with --verbose', () => {
      const logger = createCLILogger({ verbose: true });
      expect(logger.getLevel()).toBe('debug');
    });

    it('creates a warn-level logger with --quiet', () => {
      const logger = createCLILogger({ quiet: true });
      expect(logger.getLevel()).toBe('warn');
    });

    it('creates a debug-level logger with --json', () => {
      const logger = createCLILogger({ json: true });
      expect(logger.getLevel()).toBe('debug');
    });

    it('debug level is enabled in verbose mode', () => {
      const logger = createCLILogger({ verbose: true });
      expect(logger.isLevelEnabled('debug')).toBe(true);
      expect(logger.isLevelEnabled('info')).toBe(true);
    });

    it('info level is not enabled in quiet mode', () => {
      const logger = createCLILogger({ quiet: true });
      expect(logger.isLevelEnabled('info')).toBe(false);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);
    });
  });

  describe('initializeCLILogger / getCLILogger', () => {
    it('initializes global logger and returns it', () => {
      const logger = initializeCLILogger({ verbose: true });
      expect(logger.getLevel()).toBe('debug');

      const retrieved = getCLILogger();
      expect(retrieved.getLevel()).toBe('debug');
    });

    it('getCLILogger returns default logger if not initialized', () => {
      resetCLILogger();
      const logger = getCLILogger();
      expect(logger).toBeDefined();
      expect(logger.getLevel()).toBe('info'); // default level
    });
  });

  describe('Logger functionality', () => {
    it('logger.child creates a child logger with context', () => {
      const logger = createCLILogger();
      const childLogger = logger.child({ cycleId: 910, role: 'engineering' });

      expect(childLogger.getContext()).toEqual({
        cycleId: 910,
        role: 'engineering',
      });
    });

    it('logger methods do not throw', () => {
      const logger = createCLILogger();

      // These should not throw
      expect(() => logger.trace('trace message')).not.toThrow();
      expect(() => logger.debug('debug message')).not.toThrow();
      expect(() => logger.info('info message')).not.toThrow();
      expect(() => logger.warn('warn message')).not.toThrow();
      expect(() => logger.error('error message')).not.toThrow();
      expect(() => logger.error('error with object', new Error('test'))).not.toThrow();
    });

    it('logger.info accepts metadata', () => {
      const logger = createCLILogger();
      // Should not throw
      expect(() => logger.info('message with metadata', { key: 'value', count: 42 })).not.toThrow();
    });
  });
});
