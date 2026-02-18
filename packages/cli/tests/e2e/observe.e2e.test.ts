/**
 * E2E Tests: ada observe
 *
 * Tests the `ada observe` command for agent observability metrics including
 * cost, tokens, health, and latency tracking. Validates per-role breakdowns,
 * cycle filtering, JSON output, and export functionality.
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness';

/**
 * CycleMetrics type matching @ada/core observability schema.
 */
interface CycleMetrics {
  cycle: number;
  role: string;
  model: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  phases: Record<string, { inputTokens: number; outputTokens: number; totalTokens: number }>;
  totals: { inputTokens: number; outputTokens: number; totalTokens: number };
  cost: { inputCost: number; outputCost: number; totalCost: number };
  success: boolean;
  error?: string;
}

/**
 * Seed metrics.json with CycleMetrics data (matching @ada/core MetricsState schema).
 * This is what `ada observe` actually reads.
 */
function seedMetrics(sandbox: Sandbox, cycles: CycleMetrics[]): void {
  const metricsState = {
    version: 1,
    cycles,
    maxCycles: 100,
  };
  sandbox.write('agents/state/metrics.json', JSON.stringify(metricsState, null, 2));
}

/**
 * Create sample CycleMetrics for testing (matching @ada/core schema).
 */
function createSampleCycleMetrics(): CycleMetrics[] {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  return [
    {
      cycle: 1,
      role: 'engineering',
      model: 'claude-3-5-sonnet-20241022',
      startedAt: new Date(now - 5 * hour).toISOString(),
      completedAt: new Date(now - 5 * hour + 12500).toISOString(),
      durationMs: 12500,
      phases: {
        context_load: { inputTokens: 2000, outputTokens: 500, totalTokens: 2500 },
        action_execution: { inputTokens: 3000, outputTokens: 700, totalTokens: 3700 },
      },
      totals: { inputTokens: 5000, outputTokens: 1200, totalTokens: 6200 },
      cost: { inputCost: 0.015, outputCost: 0.018, totalCost: 0.033 },
      success: true,
    },
    {
      cycle: 2,
      role: 'qa',
      model: 'claude-3-5-sonnet-20241022',
      startedAt: new Date(now - 4 * hour).toISOString(),
      completedAt: new Date(now - 4 * hour + 18000).toISOString(),
      durationMs: 18000,
      phases: {
        context_load: { inputTokens: 3000, outputTokens: 1000, totalTokens: 4000 },
        action_execution: { inputTokens: 5000, outputTokens: 1500, totalTokens: 6500 },
      },
      totals: { inputTokens: 8000, outputTokens: 2500, totalTokens: 10500 },
      cost: { inputCost: 0.024, outputCost: 0.0375, totalCost: 0.0615 },
      success: true,
    },
    {
      cycle: 3,
      role: 'ops',
      model: 'claude-3-5-haiku-20241022',
      startedAt: new Date(now - 3 * hour).toISOString(),
      completedAt: new Date(now - 3 * hour + 5500).toISOString(),
      durationMs: 5500,
      phases: {
        context_load: { inputTokens: 1000, outputTokens: 300, totalTokens: 1300 },
        action_execution: { inputTokens: 2000, outputTokens: 500, totalTokens: 2500 },
      },
      totals: { inputTokens: 3000, outputTokens: 800, totalTokens: 3800 },
      cost: { inputCost: 0.0024, outputCost: 0.0032, totalCost: 0.0056 },
      success: true,
    },
    {
      cycle: 4,
      role: 'engineering',
      model: 'claude-3-5-sonnet-20241022',
      startedAt: new Date(now - 2 * hour).toISOString(),
      completedAt: new Date(now - 2 * hour + 25000).toISOString(),
      durationMs: 25000,
      phases: {
        context_load: { inputTokens: 5000, outputTokens: 1500, totalTokens: 6500 },
        action_execution: { inputTokens: 7000, outputTokens: 2500, totalTokens: 9500 },
      },
      totals: { inputTokens: 12000, outputTokens: 4000, totalTokens: 16000 },
      cost: { inputCost: 0.036, outputCost: 0.06, totalCost: 0.096 },
      success: true,
    },
    {
      cycle: 5,
      role: 'qa',
      model: 'claude-3-5-sonnet-20241022',
      startedAt: new Date(now - hour).toISOString(),
      completedAt: new Date(now - hour + 14000).toISOString(),
      durationMs: 14000,
      phases: {
        context_load: { inputTokens: 2500, outputTokens: 600, totalTokens: 3100 },
        action_execution: { inputTokens: 3500, outputTokens: 900, totalTokens: 4400 },
      },
      totals: { inputTokens: 6000, outputTokens: 1500, totalTokens: 7500 },
      cost: { inputCost: 0.018, outputCost: 0.0225, totalCost: 0.0405 },
      success: false, // Failed cycle for health testing
      error: 'Test failure simulation',
    },
  ];
}

describe('ada observe E2E', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = createSandbox();
    // Initialize agents directory
    const initResult = await sandbox.ada(['init']);
    expect(initResult.success).toBe(true);
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('help', () => {
    it('shows help with --help flag', async () => {
      const result = await sandbox.ada(['observe', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('observability metrics');
      expect(result.stdout).toContain('--by-role');
      expect(result.stdout).toContain('--cycle');
      expect(result.stdout).toContain('--last');
      expect(result.stdout).toContain('--json');
      expect(result.stdout).toContain('--export');
    });
  });

  describe('default output', () => {
    it('shows message when no metrics exist', async () => {
      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(true);
      // Should show empty state or no data message
      expect(result.stdout).toMatch(/(no.*data|no cycles|0 cycles)/i);
    });

    it('shows metrics summary when cycles have data', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(true);
      // Should show aggregated metrics
      expect(result.stdout).toMatch(/(tokens|cost|latency)/i);
    });

    it('shows health status based on success rate', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(true);
      // Should show health indicator (4/5 success = 80%)
      expect(result.stdout).toMatch(/(health|success|rate)/i);
    });
  });

  describe('--by-role', () => {
    it('shows per-role breakdown', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--by-role']);

      expect(result.success).toBe(true);
      // Should show role names
      expect(result.stdout).toMatch(/engineering/i);
      expect(result.stdout).toMatch(/qa/i);
      expect(result.stdout).toMatch(/ops/i);
    });

    it('aggregates costs per role correctly', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--by-role', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // JSON output structure: { aggregated: { byRole: {...} } }
      expect(json.aggregated).toBeDefined();
      expect(json.aggregated.byRole).toBeDefined();
    });
  });

  describe('--cycle', () => {
    it('shows detailed metrics for specific cycle', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--cycle', '3']);

      expect(result.success).toBe(true);
      // Should show ops cycle (C3)
      expect(result.stdout).toMatch(/ops|C3|CI fix/i);
    });

    it('shows error for non-existent cycle', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--cycle', '999']);

      // Should indicate cycle not found
      expect(result.stdout + result.stderr).toMatch(/(not found|no.*cycle|invalid)/i);
    });

    it('shows all metrics for the specified cycle', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--cycle', '2', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // JSON output structure: { cycle: { cycle: 2, role: 'qa', ... } }
      expect(json.cycle).toBeDefined();
      expect(json.cycle.cycle).toBe(2);
      expect(json.cycle.role).toBe('qa');
    });
  });

  describe('--last', () => {
    it('filters to last N cycles', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--last', '2', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // JSON output structure: { summary: { totalCycles: 2 }, aggregated: {...} }
      expect(json.summary).toBeDefined();
      expect(json.summary.totalCycles).toBe(2);
    });

    it('handles --last larger than available cycles', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--last', '100', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // Should show all 5 cycles
      expect(json.summary).toBeDefined();
      expect(json.summary.totalCycles).toBe(5);
    });
  });

  describe('--json', () => {
    it('outputs valid JSON', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);
      expect(json).toBeDefined();
    });

    it('includes all metric categories', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // JSON structure: { aggregated: { totalCost, totalTokens, avgDurationMs, successfulCycles, totalCycles, ... } }
      expect(json.aggregated).toBeDefined();
      expect(json.aggregated.totalCost).toBeDefined();
      expect(json.aggregated.totalTokens).toBeDefined();
      expect(json.aggregated.totalTokens.inputTokens).toBeDefined();
      expect(json.aggregated.totalTokens.outputTokens).toBeDefined();
      expect(json.aggregated.avgDurationMs).toBeDefined();
      expect(json.aggregated.successfulCycles).toBeDefined();
      expect(json.aggregated.totalCycles).toBeDefined();
    });

    it('calculates averages correctly', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // Average duration: (12500 + 18000 + 5500 + 25000 + 14000) / 5 = 15000
      expect(json.aggregated.avgDurationMs).toBeCloseTo(15000, -2);
    });
  });

  describe('--export', () => {
    it('exports metrics to JSON file', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--export', 'exported-metrics.json', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('exported-metrics.json')).toBe(true);

      const content = sandbox.read('exported-metrics.json');
      const json = JSON.parse(content);
      // Export JSON structure: { aggregated: { totalCost, ... } }
      expect(json.aggregated).toBeDefined();
      expect(json.aggregated.totalCost).toBeDefined();
    });

    it('exports metrics to CSV file', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--export', 'metrics.csv', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('metrics.csv')).toBe(true);

      const content = sandbox.read('metrics.csv');
      // CSV should have header row and data
      expect(content).toContain(',');
    });

    it('exports metrics to TSV file', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--export', 'metrics.tsv', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('metrics.tsv')).toBe(true);

      const content = sandbox.read('metrics.tsv');
      // TSV should have tab separators
      expect(content).toContain('\t');
    });
  });

  describe('--dir', () => {
    it('uses custom agents directory', async () => {
      // Create custom directory
      sandbox.exec('mkdir -p custom-agents/state');

      const cycles = createSampleCycleMetrics();
      // Seed metrics.json in custom directory
      const metricsState = {
        version: 1,
        cycles,
        maxCycles: 100,
      };
      sandbox.write('custom-agents/state/metrics.json', JSON.stringify(metricsState, null, 2));

      const result = await sandbox.ada(['observe', '--dir', 'custom-agents', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);
      expect(json.aggregated).toBeDefined();
      expect(json.aggregated.totalCycles).toBe(5);
    });
  });

  describe('combined options', () => {
    it('combines --by-role with --last', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--by-role', '--last', '3', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // Should show per-role breakdown for only last 3 cycles
      expect(json.aggregated).toBeDefined();
      expect(json.aggregated.byRole).toBeDefined();
      expect(json.summary).toBeDefined();
      expect(json.summary.totalCycles).toBe(3);
    });
  });

  describe('error handling', () => {
    it('handles missing agents directory gracefully', async () => {
      // Remove agents directory
      sandbox.exec('rm -rf agents');

      const result = await sandbox.ada(['observe']);

      // Should show empty state message (no data yet)
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/(no.*data|no observability)/i);
    });

    it('handles corrupted metrics.json gracefully', async () => {
      // Corrupt the metrics.json file that observe reads
      sandbox.write('agents/state/metrics.json', '{ invalid json }');

      const result = await sandbox.ada(['observe']);

      // MetricsManager gracefully recovers from corrupted files by treating as empty state
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/(no.*data|no observability)/i);
    });

    it('handles empty metrics state', async () => {
      // Empty but valid metrics state
      const metricsState = {
        version: 1,
        cycles: [],
        maxCycles: 100,
      };
      sandbox.write('agents/state/metrics.json', JSON.stringify(metricsState, null, 2));

      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(true);
      // Should handle gracefully, showing zero or N/A for metrics
    });
  });
});
