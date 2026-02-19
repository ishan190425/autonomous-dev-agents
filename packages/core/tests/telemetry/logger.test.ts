/**
 * Tests for structured logger implementation.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createLogger,
  createSilentLogger,
  createLoggerFromEnv,
  getLogger,
  setLogger,
  resetLogger,
} from '../../src/telemetry/logger.js';

describe('Logger', () => {
  let output: string[] = [];

  beforeEach(() => {
    output = [];
    resetLogger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger with default config', () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(logger.getLevel()).toBe('info');
    });

    it('should respect configured log level', () => {
      const logger = createLogger({ level: 'debug' });
      expect(logger.getLevel()).toBe('debug');
    });

    it('should create child logger with merged context', () => {
      const parent = createLogger({
        context: { cycleId: 896, repo: 'ada' },
      });
      const child = parent.child({ role: 'frontier' });

      expect(parent.getContext()).toEqual({ cycleId: 896, repo: 'ada' });
      expect(child.getContext()).toEqual({ cycleId: 896, repo: 'ada', role: 'frontier' });
    });

    it('child context should override parent context', () => {
      const parent = createLogger({
        context: { cycleId: 896, role: 'product' },
      });
      const child = parent.child({ role: 'frontier' });

      expect(child.getContext()).toEqual({ cycleId: 896, role: 'frontier' });
    });
  });

  describe('isLevelEnabled', () => {
    it('should return true for same or higher levels', () => {
      const logger = createLogger({ level: 'info' });

      expect(logger.isLevelEnabled('error')).toBe(true);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('trace')).toBe(false);
    });

    it('should enable all levels at trace', () => {
      const logger = createLogger({ level: 'trace' });

      expect(logger.isLevelEnabled('error')).toBe(true);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('debug')).toBe(true);
      expect(logger.isLevelEnabled('trace')).toBe(true);
    });

    it('should only enable error at error level', () => {
      const logger = createLogger({ level: 'error' });

      expect(logger.isLevelEnabled('error')).toBe(true);
      expect(logger.isLevelEnabled('warn')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(false);
      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('trace')).toBe(false);
    });
  });

  describe('createSilentLogger', () => {
    it('should create a logger that produces no output', () => {
      const logger = createSilentLogger();

      // Should not throw
      logger.info('test message');
      logger.error('error message', new Error('test'));
      logger.debug('debug message');
    });
  });

  describe('JSON format', () => {
    it('should produce valid JSON output', () => {
      // Capture stderr
      const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
        output.push(String(chunk).trim());
        return true;
      });

      const logger = createLogger({
        level: 'info',
        format: 'json',
        output: 'stderr',
        context: { cycleId: 896, role: 'frontier' },
      });

      logger.info('Test message', { key: 'value' });

      expect(output.length).toBe(1);
      const parsed = JSON.parse(output[0]);

      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test message');
      expect(parsed.context.cycleId).toBe(896);
      expect(parsed.context.role).toBe('frontier');
      expect(parsed.metadata.key).toBe('value');
      expect(parsed.timestamp).toBeDefined();

      stderrWrite.mockRestore();
    });

    it('should include error details in JSON', () => {
      const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
        output.push(String(chunk).trim());
        return true;
      });

      const logger = createLogger({
        level: 'error',
        format: 'json',
        output: 'stderr',
        stackTraces: true,
      });

      const error = new Error('Test error');
      logger.error('Operation failed', error, { operation: 'test' });

      expect(output.length).toBe(1);
      const parsed = JSON.parse(output[0]);

      expect(parsed.level).toBe('error');
      expect(parsed.message).toBe('Operation failed');
      expect(parsed.error.name).toBe('Error');
      expect(parsed.error.message).toBe('Test error');
      expect(parsed.error.stack).toBeDefined();
      expect(parsed.metadata.operation).toBe('test');

      stderrWrite.mockRestore();
    });
  });

  describe('text format', () => {
    it('should produce human-readable output', () => {
      const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
        output.push(String(chunk).trim());
        return true;
      });

      const logger = createLogger({
        level: 'info',
        format: 'text',
        output: 'stderr',
        context: { cycleId: 896, role: 'frontier' },
        timestamps: false,
      });

      logger.info('Cycle started', { memoryVersion: 45 });

      expect(output.length).toBe(1);
      expect(output[0]).toContain('INFO');
      expect(output[0]).toContain('[C896/frontier]');
      expect(output[0]).toContain('Cycle started');
      expect(output[0]).toContain('memoryVersion=45');

      stderrWrite.mockRestore();
    });
  });

  describe('level filtering', () => {
    it('should not log below configured level', () => {
      const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
        output.push(String(chunk).trim());
        return true;
      });

      const logger = createLogger({
        level: 'warn',
        format: 'json',
        output: 'stderr',
      });

      logger.trace('trace message');
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      // Only warn and error should be logged
      expect(output.length).toBe(2);
      expect(JSON.parse(output[0]).level).toBe('warn');
      expect(JSON.parse(output[1]).level).toBe('error');

      stderrWrite.mockRestore();
    });
  });

  describe('global logger', () => {
    it('should return same instance on repeated calls', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });

    it('should allow setting custom global logger', () => {
      const customLogger = createLogger({ level: 'debug' });
      setLogger(customLogger);
      expect(getLogger()).toBe(customLogger);
    });

    it('should reset to new instance after resetLogger', () => {
      const logger1 = getLogger();
      resetLogger();
      const logger2 = getLogger();
      expect(logger1).not.toBe(logger2);
    });
  });

  describe('createLoggerFromEnv', () => {
    it('should use environment variables', () => {
      const originalLevel = process.env.ADA_LOG_LEVEL;
      const originalFormat = process.env.ADA_LOG_FORMAT;

      process.env.ADA_LOG_LEVEL = 'debug';
      process.env.ADA_LOG_FORMAT = 'json';

      const logger = createLoggerFromEnv();
      expect(logger.getLevel()).toBe('debug');

      // Restore
      if (originalLevel !== undefined) {
        process.env.ADA_LOG_LEVEL = originalLevel;
      } else {
        delete process.env.ADA_LOG_LEVEL;
      }
      if (originalFormat !== undefined) {
        process.env.ADA_LOG_FORMAT = originalFormat;
      } else {
        delete process.env.ADA_LOG_FORMAT;
      }
    });

    it('should fall back to defaults when env not set', () => {
      const originalLevel = process.env.ADA_LOG_LEVEL;
      delete process.env.ADA_LOG_LEVEL;

      const logger = createLoggerFromEnv({ level: 'warn' });
      expect(logger.getLevel()).toBe('warn');

      if (originalLevel !== undefined) {
        process.env.ADA_LOG_LEVEL = originalLevel;
      }
    });
  });
});

describe('Logger integration', () => {
  it('should support typical dispatch cycle logging pattern', () => {
    const output: string[] = [];
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      output.push(String(chunk).trim());
      return true;
    });

    // Create logger for dispatch cycle
    const logger = createLogger({
      level: 'info',
      format: 'json',
      output: 'stderr',
    });

    // Start of cycle
    const cycleLogger = logger.child({ cycleId: 896, role: 'frontier', sessionId: 'sess-123' });

    cycleLogger.info('Cycle started', { memoryVersion: 45 });

    // Phase logging
    const phaseLogger = cycleLogger.child({ phase: 'context_load' });
    phaseLogger.debug('Loading memory bank');
    phaseLogger.info('Memory loaded', { entries: 42 });

    // Action execution
    cycleLogger.info('Executing action', { action: 'create_logger_impl' });

    // Completion
    cycleLogger.info('Cycle completed', { durationMs: 3500, success: true });

    // Verify output structure
    expect(output.length).toBeGreaterThanOrEqual(3); // debug filtered at info level
    const entries = output.map(line => JSON.parse(line));

    // All entries should have base context
    for (const entry of entries) {
      expect(entry.context.cycleId).toBe(896);
      expect(entry.context.role).toBe('frontier');
      expect(entry.context.sessionId).toBe('sess-123');
    }

    stderrWrite.mockRestore();
  });
});
