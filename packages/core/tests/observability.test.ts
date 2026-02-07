/**
 * Tests for the observability module.
 *
 * Phase 1 (Token Counter): utility functions, CycleTracker tokens, MetricsManager.
 * Phase 2 (Latency Timer): phase timing, latency aggregation, formatDuration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  // Types used in tests
  type TokenUsage,
  type TokenCost,
  type ModelPricing,
  type CycleMetrics,
  type MetricsState,
  // Constants
  MODEL_PRICING,
  DEFAULT_MAX_CYCLES,
  // Utility functions
  emptyUsage,
  emptyCost,
  addUsage,
  addCost,
  calculateCost,
  getPricing,
  divideUsage,
  divideCost,
  formatCost,
  formatTokens,
  formatDuration,
  calculateEfficiency,
  // Classes
  CycleTracker,
  MetricsManager,
  createCycleTracker,
  createMetricsManager,
} from '../src/observability.js';

// Helper for delays in tests
const delay = (ms: number): Promise<void> => new Promise(resolve => globalThis.setTimeout(resolve, ms));

// ─── Utility Function Tests ──────────────────────────────────────────────────

describe('observability utilities', () => {
  describe('emptyUsage', () => {
    it('should return zero usage', () => {
      const usage = emptyUsage();
      expect(usage.inputTokens).toBe(0);
      expect(usage.outputTokens).toBe(0);
      expect(usage.totalTokens).toBe(0);
    });
  });

  describe('emptyCost', () => {
    it('should return zero cost', () => {
      const cost = emptyCost();
      expect(cost.inputCost).toBe(0);
      expect(cost.outputCost).toBe(0);
      expect(cost.totalCost).toBe(0);
    });
  });

  describe('addUsage', () => {
    it('should add two usage objects', () => {
      const a: TokenUsage = { inputTokens: 100, outputTokens: 50, totalTokens: 150 };
      const b: TokenUsage = { inputTokens: 200, outputTokens: 100, totalTokens: 300 };
      const result = addUsage(a, b);
      expect(result.inputTokens).toBe(300);
      expect(result.outputTokens).toBe(150);
      expect(result.totalTokens).toBe(450);
    });

    it('should handle zero values', () => {
      const a = emptyUsage();
      const b: TokenUsage = { inputTokens: 100, outputTokens: 50, totalTokens: 150 };
      expect(addUsage(a, b)).toEqual(b);
    });
  });

  describe('addCost', () => {
    it('should add two cost objects', () => {
      const a: TokenCost = { inputCost: 0.01, outputCost: 0.05, totalCost: 0.06 };
      const b: TokenCost = { inputCost: 0.02, outputCost: 0.03, totalCost: 0.05 };
      const result = addCost(a, b);
      expect(result.inputCost).toBe(0.03);
      expect(result.outputCost).toBe(0.08);
      expect(result.totalCost).toBe(0.11);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost from usage and pricing', () => {
      const usage: TokenUsage = { inputTokens: 1_000_000, outputTokens: 500_000, totalTokens: 1_500_000 };
      const pricing: ModelPricing = { model: 'test', inputPer1M: 3.0, outputPer1M: 15.0 };
      const cost = calculateCost(usage, pricing);
      expect(cost.inputCost).toBe(3.0);
      expect(cost.outputCost).toBe(7.5);
      expect(cost.totalCost).toBe(10.5);
    });

    it('should handle small token counts', () => {
      const usage: TokenUsage = { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 };
      const pricing: ModelPricing = { model: 'test', inputPer1M: 3.0, outputPer1M: 15.0 };
      const cost = calculateCost(usage, pricing);
      expect(cost.inputCost).toBe(0.003);
      expect(cost.outputCost).toBe(0.0075);
      expect(cost.totalCost).toBe(0.0105);
    });
  });

  describe('getPricing', () => {
    it('should return exact match pricing', () => {
      const pricing = getPricing('gpt-4o');
      expect(pricing.model).toBe('gpt-4o');
      expect(pricing.inputPer1M).toBe(2.5);
    });

    it('should return prefix match pricing', () => {
      // Exact key match from MODEL_PRICING - the key includes the date suffix
      const pricing = getPricing('claude-3-5-sonnet-20241022');
      expect(pricing.model).toBe('claude-3-5-sonnet');
    });

    it('should match when input is prefix of a key', () => {
      // Input 'gpt-4' is a prefix of key 'gpt-4o' - should match
      const pricing = getPricing('gpt-4');
      expect(pricing.model).toBe('gpt-4o');
    });

    it('should fallback to default for unknown models', () => {
      const pricing = getPricing('unknown-model-xyz');
      expect(pricing.model).toBe('default');
      expect(pricing.inputPer1M).toBe(3.0);
    });
  });

  describe('divideUsage', () => {
    it('should divide usage by count', () => {
      const usage: TokenUsage = { inputTokens: 300, outputTokens: 150, totalTokens: 450 };
      const result = divideUsage(usage, 3);
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
      expect(result.totalTokens).toBe(150);
    });

    it('should return empty for zero count', () => {
      const usage: TokenUsage = { inputTokens: 300, outputTokens: 150, totalTokens: 450 };
      expect(divideUsage(usage, 0)).toEqual(emptyUsage());
    });
  });

  describe('divideCost', () => {
    it('should divide cost by count', () => {
      const cost: TokenCost = { inputCost: 0.30, outputCost: 0.60, totalCost: 0.90 };
      const result = divideCost(cost, 3);
      expect(result.inputCost).toBe(0.1);
      expect(result.outputCost).toBe(0.2);
      expect(result.totalCost).toBe(0.3);
    });

    it('should return empty for zero count', () => {
      const cost: TokenCost = { inputCost: 0.30, outputCost: 0.60, totalCost: 0.90 };
      expect(divideCost(cost, 0)).toEqual(emptyCost());
    });
  });

  describe('formatCost', () => {
    it('should format large costs with 2 decimals', () => {
      expect(formatCost(1.23)).toBe('$1.23');
      expect(formatCost(0.50)).toBe('$0.50');
    });

    it('should format small costs with 4 decimals', () => {
      expect(formatCost(0.0023)).toBe('$0.0023');
      expect(formatCost(0.0001)).toBe('$0.0001');
    });
  });

  describe('formatTokens', () => {
    it('should format millions', () => {
      expect(formatTokens(1_500_000)).toBe('1.5M');
    });

    it('should format thousands', () => {
      expect(formatTokens(45_600)).toBe('45.6K');
    });

    it('should format small numbers as-is', () => {
      expect(formatTokens(999)).toBe('999');
    });
  });

  describe('formatDuration (Phase 2)', () => {
    it('should format milliseconds for small durations', () => {
      expect(formatDuration(234)).toBe('234ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds for medium durations', () => {
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(12400)).toBe('12.4s');
      expect(formatDuration(59999)).toBe('60.0s');
    });

    it('should format minutes and seconds for long durations', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(154000)).toBe('2m 34s');
      expect(formatDuration(3600000)).toBe('60m 0s');
    });
  });

  describe('calculateEfficiency (Phase 2)', () => {
    it('should calculate tokens per second', () => {
      expect(calculateEfficiency(1000, 1000)).toBe(1000); // 1000 tokens/sec
      expect(calculateEfficiency(5000, 2000)).toBe(2500); // 2500 tokens/sec
    });

    it('should return 0 for zero duration', () => {
      expect(calculateEfficiency(1000, 0)).toBe(0);
    });
  });
});

// ─── CycleTracker Tests ──────────────────────────────────────────────────────

describe('CycleTracker', () => {
  describe('constructor', () => {
    it('should create a tracker with cycle, role, and model', () => {
      const tracker = new CycleTracker(42, 'engineering', 'gpt-4o');
      expect(tracker).toBeInstanceOf(CycleTracker);
    });

    it('should default to "default" model if not specified', () => {
      const tracker = new CycleTracker(42, 'engineering');
      const metrics = tracker.finalize(true);
      expect(metrics.model).toBe('default');
    });
  });

  describe('recordPhase', () => {
    it('should record tokens for a phase', () => {
      const tracker = new CycleTracker(42, 'engineering', 'gpt-4o');
      tracker.recordPhase('context_load', 1000, 500);
      const metrics = tracker.finalize(true);
      expect(metrics.phases.context_load?.inputTokens).toBe(1000);
      expect(metrics.phases.context_load?.outputTokens).toBe(500);
      expect(metrics.phases.context_load?.totalTokens).toBe(1500);
    });

    it('should accumulate tokens for the same phase', () => {
      const tracker = new CycleTracker(42, 'engineering', 'gpt-4o');
      tracker.recordPhase('action_execution', 500, 200);
      tracker.recordPhase('action_execution', 300, 100);
      const metrics = tracker.finalize(true);
      expect(metrics.phases.action_execution?.inputTokens).toBe(800);
      expect(metrics.phases.action_execution?.outputTokens).toBe(300);
    });

    it('should track multiple phases', () => {
      const tracker = new CycleTracker(42, 'engineering', 'gpt-4o');
      tracker.recordPhase('context_load', 1000, 500);
      tracker.recordPhase('action_execution', 2000, 1000);
      tracker.recordPhase('memory_update', 500, 250);
      const metrics = tracker.finalize(true);
      expect(Object.keys(metrics.phases)).toHaveLength(3);
    });

    it('should throw if recording after finalization', () => {
      const tracker = new CycleTracker(42, 'engineering');
      tracker.finalize(true);
      expect(() => tracker.recordPhase('context_load', 100, 50))
        .toThrow('Cannot record after finalization');
    });
  });

  describe('finalize', () => {
    it('should calculate totals across all phases', () => {
      const tracker = new CycleTracker(42, 'engineering', 'gpt-4o');
      tracker.recordPhase('context_load', 1000, 500);
      tracker.recordPhase('action_execution', 2000, 1000);
      const metrics = tracker.finalize(true);
      expect(metrics.totals.inputTokens).toBe(3000);
      expect(metrics.totals.outputTokens).toBe(1500);
      expect(metrics.totals.totalTokens).toBe(4500);
    });

    it('should calculate cost based on model pricing', () => {
      const tracker = new CycleTracker(42, 'engineering', 'gpt-4o');
      tracker.recordPhase('action_execution', 1_000_000, 500_000);
      const metrics = tracker.finalize(true);
      // gpt-4o: $2.5/1M input, $10/1M output
      expect(metrics.cost.inputCost).toBe(2.5);
      expect(metrics.cost.outputCost).toBe(5.0);
      expect(metrics.cost.totalCost).toBe(7.5);
    });

    it('should set timestamps and duration', () => {
      const tracker = new CycleTracker(42, 'engineering');
      tracker.recordPhase('context_load', 100, 50);
      const metrics = tracker.finalize(true);
      expect(metrics.startedAt).toBeDefined();
      expect(metrics.completedAt).toBeDefined();
      expect(metrics.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should record success state', () => {
      const successTracker = new CycleTracker(42, 'engineering');
      const successMetrics = successTracker.finalize(true);
      expect(successMetrics.success).toBe(true);
      expect(successMetrics.error).toBeUndefined();

      const failTracker = new CycleTracker(43, 'engineering');
      const failMetrics = failTracker.finalize(false, 'Something went wrong');
      expect(failMetrics.success).toBe(false);
      expect(failMetrics.error).toBe('Something went wrong');
    });

    it('should throw if finalized twice', () => {
      const tracker = new CycleTracker(42, 'engineering');
      tracker.finalize(true);
      expect(() => tracker.finalize(true)).toThrow('Already finalized');
    });
  });

  describe('Phase 2 — Latency Timer', () => {
    describe('startPhase/endPhase', () => {
      it('should record phase latency', async () => {
        const tracker = new CycleTracker(42, 'engineering');
        tracker.startPhase('context_load');
        await delay(10);
        const latency = tracker.endPhase();

        expect(latency.startedAt).toBeDefined();
        expect(latency.endedAt).toBeDefined();
        expect(latency.durationMs).toBeGreaterThanOrEqual(10);
      });

      it('should throw if starting phase while another is active', () => {
        const tracker = new CycleTracker(42, 'engineering');
        tracker.startPhase('context_load');
        expect(() => tracker.startPhase('action_execution'))
          .toThrow("Phase 'context_load' is already active");
      });

      it('should throw if ending phase when none is active', () => {
        const tracker = new CycleTracker(42, 'engineering');
        expect(() => tracker.endPhase())
          .toThrow('No phase is currently active');
      });

      it('should throw if starting phase after finalization', () => {
        const tracker = new CycleTracker(42, 'engineering');
        tracker.finalize(true);
        expect(() => tracker.startPhase('context_load'))
          .toThrow('Cannot start phase after finalization');
      });

      it('should throw if ending phase after finalization', () => {
        const tracker = new CycleTracker(42, 'engineering');
        tracker.startPhase('context_load');
        tracker.finalize(true); // Auto-ends the phase
        expect(() => tracker.endPhase())
          .toThrow('Cannot end phase after finalization');
      });
    });

    describe('isPhaseActive/getActivePhase', () => {
      it('should track active phase state', () => {
        const tracker = new CycleTracker(42, 'engineering');
        expect(tracker.isPhaseActive()).toBe(false);
        expect(tracker.getActivePhase()).toBeNull();

        tracker.startPhase('context_load');
        expect(tracker.isPhaseActive()).toBe(true);
        expect(tracker.getActivePhase()).toBe('context_load');

        tracker.endPhase();
        expect(tracker.isPhaseActive()).toBe(false);
        expect(tracker.getActivePhase()).toBeNull();
      });
    });

    describe('timePhase (async)', () => {
      it('should time async function execution', async () => {
        const tracker = new CycleTracker(42, 'engineering');
        const result = await tracker.timePhase('action_execution', async () => {
          await delay(10);
          return 'done';
        });

        expect(result).toBe('done');
        expect(tracker.isPhaseActive()).toBe(false);

        const metrics = tracker.finalize(true);
        expect(metrics.latency?.action_execution?.durationMs).toBeGreaterThanOrEqual(10);
      });

      it('should end phase even if function throws', async () => {
        const tracker = new CycleTracker(42, 'engineering');
        await expect(tracker.timePhase('action_execution', () => {
          throw new Error('Test error');
        })).rejects.toThrow('Test error');

        expect(tracker.isPhaseActive()).toBe(false);
        const metrics = tracker.finalize(false, 'Test error');
        expect(metrics.latency?.action_execution).toBeDefined();
      });
    });

    describe('timePhaseSync', () => {
      it('should time sync function execution', () => {
        const tracker = new CycleTracker(42, 'engineering');
        const result = tracker.timePhaseSync('memory_update', () => {
          let sum = 0;
          for (let i = 0; i < 1000; i++) sum += i;
          return sum;
        });

        expect(result).toBe(499500);
        expect(tracker.isPhaseActive()).toBe(false);

        const metrics = tracker.finalize(true);
        expect(metrics.latency?.memory_update?.durationMs).toBeGreaterThanOrEqual(0);
      });
    });

    describe('finalize with latency', () => {
      it('should include latency in metrics when tracked', () => {
        const tracker = new CycleTracker(42, 'engineering');
        tracker.startPhase('context_load');
        tracker.endPhase();
        tracker.startPhase('action_execution');
        tracker.endPhase();

        const metrics = tracker.finalize(true);
        expect(metrics.latency).toBeDefined();
        expect(metrics.latency?.context_load).toBeDefined();
        expect(metrics.latency?.action_execution).toBeDefined();
      });

      it('should not include latency when not tracked', () => {
        const tracker = new CycleTracker(42, 'engineering');
        tracker.recordPhase('context_load', 100, 50);

        const metrics = tracker.finalize(true);
        expect(metrics.latency).toBeUndefined();
      });

      it('should auto-end active phase on finalize', () => {
        const tracker = new CycleTracker(42, 'engineering');
        tracker.startPhase('context_load');
        // Don't call endPhase

        const metrics = tracker.finalize(true);
        expect(metrics.latency?.context_load).toBeDefined();
      });
    });
  });
});

// ─── MetricsManager Tests ────────────────────────────────────────────────────

describe('MetricsManager', () => {
  let tmpDir: string;
  let metricsPath: string;
  let manager: MetricsManager;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ada-obs-test-'));
    metricsPath = path.join(tmpDir, 'state', 'metrics.json');
    manager = new MetricsManager(metricsPath, 5); // Small max for testing
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const createMockMetrics = (cycle: number, role: string = 'engineering'): CycleMetrics => ({
    cycle,
    role,
    model: 'gpt-4o',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 1000,
    phases: { action_execution: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 } },
    totals: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
    cost: { inputCost: 0.0025, outputCost: 0.005, totalCost: 0.0075 },
    success: true,
  });

  describe('load', () => {
    it('should create empty state if file does not exist', async () => {
      const state = await manager.load();
      expect(state.version).toBe(1);
      expect(state.cycles).toHaveLength(0);
    });

    it('should load existing state from file', async () => {
      const existingState: MetricsState = {
        version: 1,
        cycles: [createMockMetrics(1)],
        maxCycles: 5,
      };
      await fs.mkdir(path.dirname(metricsPath), { recursive: true });
      await fs.writeFile(metricsPath, JSON.stringify(existingState));

      const state = await manager.load();
      expect(state.cycles).toHaveLength(1);
      expect(state.cycles[0].cycle).toBe(1);
    });

    it('should cache loaded state', async () => {
      const state1 = await manager.load();
      const state2 = await manager.load();
      expect(state1).toBe(state2);
    });
  });

  describe('save', () => {
    it('should create directory and save state', async () => {
      await manager.load();
      await manager.save();
      const content = await fs.readFile(metricsPath, 'utf-8');
      const saved = JSON.parse(content);
      expect(saved.version).toBe(1);
    });

    it('should throw if no state loaded', async () => {
      const freshManager = new MetricsManager(metricsPath);
      await expect(freshManager.save()).rejects.toThrow('No state to save');
    });
  });

  describe('record', () => {
    it('should add metrics to state', async () => {
      await manager.record(createMockMetrics(1));
      const state = await manager.load();
      expect(state.cycles).toHaveLength(1);
    });

    it('should trim old cycles when exceeding max', async () => {
      for (let i = 1; i <= 7; i++) {
        await manager.record(createMockMetrics(i));
      }
      const state = await manager.load();
      expect(state.cycles).toHaveLength(5);
      expect(state.cycles[0].cycle).toBe(3); // First two trimmed
      expect(state.cycles[4].cycle).toBe(7);
    });
  });

  describe('getCycle', () => {
    it('should return metrics for a specific cycle', async () => {
      await manager.record(createMockMetrics(42));
      await manager.record(createMockMetrics(43));
      const metrics = await manager.getCycle(42);
      expect(metrics?.cycle).toBe(42);
    });

    it('should return null for unknown cycle', async () => {
      await manager.record(createMockMetrics(42));
      const metrics = await manager.getCycle(999);
      expect(metrics).toBeNull();
    });
  });

  describe('getRecent', () => {
    it('should return recent cycles', async () => {
      for (let i = 1; i <= 5; i++) {
        await manager.record(createMockMetrics(i));
      }
      const recent = await manager.getRecent(3);
      expect(recent).toHaveLength(3);
      expect(recent[0].cycle).toBe(3);
      expect(recent[2].cycle).toBe(5);
    });

    it('should return all cycles if fewer than requested', async () => {
      await manager.record(createMockMetrics(1));
      const recent = await manager.getRecent(10);
      expect(recent).toHaveLength(1);
    });
  });

  describe('aggregate', () => {
    it('should return null for empty state', async () => {
      await manager.load();
      const agg = await manager.aggregate();
      expect(agg).toBeNull();
    });

    it('should aggregate metrics across cycles', async () => {
      await manager.record(createMockMetrics(1, 'engineering'));
      await manager.record(createMockMetrics(2, 'design'));
      await manager.record(createMockMetrics(3, 'engineering'));

      const agg = await manager.aggregate();
      expect(agg).not.toBeNull();
      expect(agg!.totalCycles).toBe(3);
      expect(agg!.successfulCycles).toBe(3);
      expect(agg!.failedCycles).toBe(0);
      expect(agg!.totalTokens.inputTokens).toBe(3000);
      expect(agg!.avgTokensPerCycle.inputTokens).toBe(1000);
    });

    it('should track per-role statistics', async () => {
      await manager.record(createMockMetrics(1, 'engineering'));
      await manager.record(createMockMetrics(2, 'engineering'));
      await manager.record(createMockMetrics(3, 'design'));

      const agg = await manager.aggregate();
      expect(agg!.byRole['engineering'].cycles).toBe(2);
      expect(agg!.byRole['design'].cycles).toBe(1);
    });

    it('should track failed cycles', async () => {
      const failedMetrics = createMockMetrics(1);
      (failedMetrics as { success: boolean }).success = false;
      await manager.record(failedMetrics);
      await manager.record(createMockMetrics(2));

      const agg = await manager.aggregate();
      expect(agg!.successfulCycles).toBe(1);
      expect(agg!.failedCycles).toBe(1);
    });

    it('should track time range', async () => {
      await manager.record(createMockMetrics(1));
      await manager.record(createMockMetrics(2));

      const agg = await manager.aggregate();
      expect(agg!.timeRange.start).toBeDefined();
      expect(agg!.timeRange.end).toBeDefined();
      expect(agg!.firstCycle).toBe(1);
      expect(agg!.lastCycle).toBe(2);
    });

    it('should calculate average duration', async () => {
      const metrics1 = createMockMetrics(1);
      const metrics2 = createMockMetrics(2);
      // Mock durations: 1000ms and 2000ms
      (metrics1 as { durationMs: number }).durationMs = 1000;
      (metrics2 as { durationMs: number }).durationMs = 2000;

      await manager.record(metrics1);
      await manager.record(metrics2);

      const agg = await manager.aggregate();
      expect(agg!.avgDurationMs).toBe(1500);
    });

    it('should aggregate phase latency stats (Phase 2)', async () => {
      const metricsWithLatency = (cycle: number): CycleMetrics => ({
        ...createMockMetrics(cycle),
        latency: {
          context_load: { startedAt: '', endedAt: '', durationMs: 100 },
          action_execution: { startedAt: '', endedAt: '', durationMs: 500 },
        },
      });

      await manager.record(metricsWithLatency(1));
      await manager.record(metricsWithLatency(2));

      const agg = await manager.aggregate();
      expect(agg!.phaseLatency).toBeDefined();
      expect(agg!.phaseLatency?.context_load?.count).toBe(2);
      expect(agg!.phaseLatency?.context_load?.avgMs).toBe(100);
      expect(agg!.phaseLatency?.action_execution?.count).toBe(2);
      expect(agg!.phaseLatency?.action_execution?.avgMs).toBe(500);
    });

    it('should calculate min/max latency correctly (Phase 2)', async () => {
      const metrics1: CycleMetrics = {
        ...createMockMetrics(1),
        latency: {
          context_load: { startedAt: '', endedAt: '', durationMs: 50 },
        },
      };
      const metrics2: CycleMetrics = {
        ...createMockMetrics(2),
        latency: {
          context_load: { startedAt: '', endedAt: '', durationMs: 150 },
        },
      };

      await manager.record(metrics1);
      await manager.record(metrics2);

      const agg = await manager.aggregate();
      expect(agg!.phaseLatency?.context_load?.minMs).toBe(50);
      expect(agg!.phaseLatency?.context_load?.maxMs).toBe(150);
      expect(agg!.phaseLatency?.context_load?.totalMs).toBe(200);
    });

    it('should not include phaseLatency when no latency data (Phase 2)', async () => {
      await manager.record(createMockMetrics(1)); // No latency

      const agg = await manager.aggregate();
      expect(agg!.phaseLatency).toBeUndefined();
    });
  });

  describe('getFilePath', () => {
    it('should return the configured file path', () => {
      expect(manager.getFilePath()).toBe(metricsPath);
    });
  });
});

// ─── Factory Function Tests ──────────────────────────────────────────────────

describe('factory functions', () => {
  describe('createCycleTracker', () => {
    it('should create a CycleTracker instance', () => {
      const tracker = createCycleTracker(42, 'engineering', 'gpt-4o');
      expect(tracker).toBeInstanceOf(CycleTracker);
    });
  });

  describe('createMetricsManager', () => {
    it('should create a MetricsManager with correct path', () => {
      const manager = createMetricsManager('/project', 'agents/', 50);
      expect(manager.getFilePath()).toBe('/project/agents/state/metrics.json');
    });

    it('should use default agents dir', () => {
      const manager = createMetricsManager('/project');
      expect(manager.getFilePath()).toBe('/project/agents/state/metrics.json');
    });
  });
});

// ─── Constants Tests ─────────────────────────────────────────────────────────

describe('constants', () => {
  describe('MODEL_PRICING', () => {
    it('should have pricing for common models', () => {
      expect(MODEL_PRICING['gpt-4o']).toBeDefined();
      expect(MODEL_PRICING['claude-3-5-sonnet-20241022']).toBeDefined();
      // Note: default pricing uses separate DEFAULT_PRICING constant, not a key in MODEL_PRICING
      // getPricing() handles fallback to DEFAULT_PRICING for unknown models
    });

    it('should have valid pricing structure for all models', () => {
      for (const pricing of Object.values(MODEL_PRICING)) {
        expect(pricing.model).toBeDefined();
        expect(pricing.inputPer1M).toBeGreaterThan(0);
        expect(pricing.outputPer1M).toBeGreaterThan(0);
      }
    });
  });

  describe('DEFAULT_MAX_CYCLES', () => {
    it('should be 100', () => {
      expect(DEFAULT_MAX_CYCLES).toBe(100);
    });
  });
});
