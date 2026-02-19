/**
 * @ada/cli — CLI Logger Tests
 *
 * Tests for the CLI logger module.
 */

import { describe, it, expect } from 'vitest';
import {
  getOutputMode,
  initCliLogger,
  getCliLogger,
  isJsonMode,
  isVerboseMode,
  isQuietMode,
  getOutputModeActive,
  createCommandLogger,
} from '../logger.js';

describe('CLI Logger', () => {
  describe('getOutputMode', () => {
    it('returns "clean" by default', () => {
      expect(getOutputMode({})).toBe('clean');
    });

    it('returns "json" when json flag is set', () => {
      expect(getOutputMode({ json: true })).toBe('json');
    });

    it('returns "verbose" when verbose flag is set', () => {
      expect(getOutputMode({ verbose: true })).toBe('verbose');
    });

    it('returns "quiet" when quiet flag is set', () => {
      expect(getOutputMode({ quiet: true })).toBe('quiet');
    });

    it('json takes precedence over verbose', () => {
      expect(getOutputMode({ json: true, verbose: true })).toBe('json');
    });

    it('json takes precedence over quiet', () => {
      expect(getOutputMode({ json: true, quiet: true })).toBe('json');
    });

    it('verbose takes precedence over quiet', () => {
      expect(getOutputMode({ verbose: true, quiet: true })).toBe('verbose');
    });
  });

  describe('initCliLogger', () => {
    it('initializes with default clean mode', () => {
      const logger = initCliLogger();
      expect(logger).toBeDefined();
      expect(getOutputModeActive()).toBe('clean');
    });

    it('initializes with json mode', () => {
      const logger = initCliLogger({ json: true });
      expect(logger).toBeDefined();
      expect(getOutputModeActive()).toBe('json');
      expect(isJsonMode()).toBe(true);
    });

    it('initializes with verbose mode', () => {
      const logger = initCliLogger({ verbose: true });
      expect(logger).toBeDefined();
      expect(getOutputModeActive()).toBe('verbose');
      expect(isVerboseMode()).toBe(true);
    });

    it('initializes with quiet mode', () => {
      const logger = initCliLogger({ quiet: true });
      expect(logger).toBeDefined();
      expect(getOutputModeActive()).toBe('quiet');
      expect(isQuietMode()).toBe(true);
    });
  });

  describe('getCliLogger', () => {
    it('returns initialized logger', () => {
      initCliLogger({ verbose: true });
      const logger = getCliLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('auto-initializes if not already done', () => {
      // Force a fresh state by initializing with different options
      initCliLogger({});
      const logger = getCliLogger();
      expect(logger).toBeDefined();
    });
  });

  describe('createCommandLogger', () => {
    it('creates child logger with context', () => {
      initCliLogger();
      const logger = createCommandLogger({
        cycleId: 900,
        role: 'engineering',
        command: 'dispatch',
      });

      expect(logger).toBeDefined();
      const context = logger.getContext();
      expect(context.cycleId).toBe(900);
      expect(context.role).toBe('engineering');
      expect(context.command).toBe('dispatch');
    });

    it('inherits parent logger mode', () => {
      initCliLogger({ json: true });
      const logger = createCommandLogger({ cycleId: 900 });
      expect(logger).toBeDefined();
      // Logger should still be in JSON mode
      expect(isJsonMode()).toBe(true);
    });
  });

  describe('mode helpers', () => {
    it('isJsonMode returns correct state', () => {
      initCliLogger({});
      expect(isJsonMode()).toBe(false);

      initCliLogger({ json: true });
      expect(isJsonMode()).toBe(true);
    });

    it('isVerboseMode returns correct state', () => {
      initCliLogger({});
      expect(isVerboseMode()).toBe(false);

      initCliLogger({ verbose: true });
      expect(isVerboseMode()).toBe(true);
    });

    it('isQuietMode returns correct state', () => {
      initCliLogger({});
      expect(isQuietMode()).toBe(false);

      initCliLogger({ quiet: true });
      expect(isQuietMode()).toBe(true);
    });
  });
});
