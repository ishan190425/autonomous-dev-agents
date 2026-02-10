/**
 * Signal Collector Tests
 *
 * @see docs/engineering/terminal-mode-technical-spec.md §4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SignalCollector, createSignalCollector } from '../../src/terminal/signal-collector.js';
import type { ExecutionResult } from '../../src/terminal/types.js';

describe('signal-collector', () => {
  let collector: SignalCollector;

  beforeEach(() => {
    collector = new SignalCollector(343);
  });

  describe('constructor', () => {
    it('initializes with cycle id', () => {
      const summary = collector.getSummary();
      expect(summary.cycleId).toBe(343);
      expect(summary.commandsExecuted).toBe(0);
    });
  });

  describe('record', () => {
    it('adds signals with timestamp', () => {
      collector.record({
        type: 'access',
        entityId: 'agents/memory/bank.md',
        weight: 1.0,
      });

      const summary = collector.getSummary();
      expect(summary.signals).toHaveLength(1);
      expect(summary.signals[0].entityId).toBe('agents/memory/bank.md');
      expect(summary.signals[0].timestamp).toBeGreaterThan(0);
    });

    it('accepts optional command', () => {
      collector.record({
        type: 'access',
        entityId: 'test.ts',
        weight: 1.0,
        command: 'cat test.ts',
      });

      const summary = collector.getSummary();
      expect(summary.signals[0].command).toBe('cat test.ts');
    });
  });

  describe('recordCommand', () => {
    it('updates command stats for success', () => {
      const result: ExecutionResult = {
        command: 'echo hello',
        exitCode: 0,
        stdout: 'hello',
        stderr: '',
        durationMs: 10,
        truncated: false,
      };

      collector.recordCommand(result);
      const stats = collector.getCommandStats();
      expect(stats.executed).toBe(1);
      expect(stats.succeeded).toBe(1);
      expect(stats.failed).toBe(0);
    });

    it('updates command stats for failure', () => {
      const result: ExecutionResult = {
        command: 'exit 1',
        exitCode: 1,
        stdout: '',
        stderr: 'error',
        durationMs: 10,
        truncated: false,
      };

      collector.recordCommand(result);
      const stats = collector.getCommandStats();
      expect(stats.executed).toBe(1);
      expect(stats.succeeded).toBe(0);
      expect(stats.failed).toBe(1);
    });

    it('infers file access signals', () => {
      const result: ExecutionResult = {
        command: 'cat agents/memory/bank.md',
        exitCode: 0,
        stdout: '# Memory Bank',
        stderr: '',
        durationMs: 10,
        truncated: false,
      };

      collector.recordCommand(result);
      const summary = collector.getSummary();
      const accessSignal = summary.signals.find(
        (s) => s.type === 'access' && s.entityId === 'agents/memory/bank.md'
      );
      expect(accessSignal).toBeDefined();
    });

    it('infers git operation signals', () => {
      const result: ExecutionResult = {
        command: 'git status',
        exitCode: 0,
        stdout: 'On branch main',
        stderr: '',
        durationMs: 100,
        truncated: false,
      };

      collector.recordCommand(result);
      const summary = collector.getSummary();
      const gitSignal = summary.signals.find((s) => s.entityId === 'git-operations');
      expect(gitSignal).toBeDefined();
      expect(gitSignal?.type).toBe('success');
    });

    it('infers test run signals with higher weight', () => {
      const result: ExecutionResult = {
        command: 'npm test',
        exitCode: 0,
        stdout: 'All tests passed',
        stderr: '',
        durationMs: 5000,
        truncated: false,
      };

      collector.recordCommand(result);
      const summary = collector.getSummary();
      const testSignal = summary.signals.find((s) => s.entityId === 'test-runs');
      expect(testSignal).toBeDefined();
      expect(testSignal?.weight).toBe(2.0); // Higher weight for tests
    });
  });

  describe('getSummary', () => {
    it('returns complete cycle summary', () => {
      collector.record({ type: 'access', entityId: 'file1.ts', weight: 1.0 });
      collector.record({ type: 'success', entityId: 'op1', weight: 1.0 });

      const result: ExecutionResult = {
        command: 'echo test',
        exitCode: 0,
        stdout: 'test',
        stderr: '',
        durationMs: 10,
        truncated: false,
      };
      collector.recordCommand(result);

      const summary = collector.getSummary();
      expect(summary.cycleId).toBe(343);
      expect(summary.startTime).toBeLessThanOrEqual(summary.endTime);
      expect(summary.commandsExecuted).toBe(1);
      expect(summary.signals.length).toBeGreaterThanOrEqual(2);
    });

    it('returns a copy of signals', () => {
      collector.record({ type: 'access', entityId: 'test.ts', weight: 1.0 });
      const summary1 = collector.getSummary();
      const summary2 = collector.getSummary();

      // Should be equal but not the same reference
      expect(summary1.signals).toEqual(summary2.signals);
      expect(summary1.signals).not.toBe(summary2.signals);
    });
  });

  describe('createSignalCollector', () => {
    it('creates a new SignalCollector instance', () => {
      const collector = createSignalCollector(500);
      expect(collector).toBeInstanceOf(SignalCollector);
      expect(collector.getSummary().cycleId).toBe(500);
    });
  });
});
