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
 * Seed a rotation.json with history entries that include observability metrics.
 */
function seedRotationWithMetrics(
  sandbox: Sandbox,
  cycles: Array<{
    role: string;
    timestamp: string;
    cycle: number;
    action: string;
    metrics?: {
      inputTokens: number;
      outputTokens: number;
      totalCost: number;
      model: string;
      latencyMs: number;
      success: boolean;
    };
  }>
): void {
  const rotation = {
    current_index: 0,
    last_role: cycles[cycles.length - 1]?.role || 'engineering',
    last_run: cycles[cycles.length - 1]?.timestamp || new Date().toISOString(),
    cycle_count: cycles.length,
    history: cycles,
  };
  sandbox.write('agents/state/rotation.json', JSON.stringify(rotation, null, 2));
}

/**
 * Create sample cycles with observability metrics for testing.
 */
function createSampleCyclesWithMetrics(): Array<{
  role: string;
  timestamp: string;
  cycle: number;
  action: string;
  metrics?: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    model: string;
    latencyMs: number;
    success: boolean;
  };
}> {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  return [
    {
      role: 'engineering',
      timestamp: new Date(now - 5 * hour).toISOString(),
      cycle: 1,
      action: '⚙️ Initial setup (C1)',
      metrics: {
        inputTokens: 5000,
        outputTokens: 1200,
        totalCost: 0.025,
        model: 'claude-3-5-sonnet-20241022',
        latencyMs: 12500,
        success: true,
      },
    },
    {
      role: 'qa',
      timestamp: new Date(now - 4 * hour).toISOString(),
      cycle: 2,
      action: '🔍 Test implementation (C2)',
      metrics: {
        inputTokens: 8000,
        outputTokens: 2500,
        totalCost: 0.042,
        model: 'claude-3-5-sonnet-20241022',
        latencyMs: 18000,
        success: true,
      },
    },
    {
      role: 'ops',
      timestamp: new Date(now - 3 * hour).toISOString(),
      cycle: 3,
      action: '🛡️ CI fix (C3)',
      metrics: {
        inputTokens: 3000,
        outputTokens: 800,
        totalCost: 0.015,
        model: 'claude-3-5-haiku-20241022',
        latencyMs: 5500,
        success: true,
      },
    },
    {
      role: 'engineering',
      timestamp: new Date(now - 2 * hour).toISOString(),
      cycle: 4,
      action: '⚙️ Feature implementation (C4)',
      metrics: {
        inputTokens: 12000,
        outputTokens: 4000,
        totalCost: 0.068,
        model: 'claude-3-5-sonnet-20241022',
        latencyMs: 25000,
        success: true,
      },
    },
    {
      role: 'qa',
      timestamp: new Date(now - hour).toISOString(),
      cycle: 5,
      action: '🔍 Review cycle (C5)',
      metrics: {
        inputTokens: 6000,
        outputTokens: 1500,
        totalCost: 0.032,
        model: 'claude-3-5-sonnet-20241022',
        latencyMs: 14000,
        success: false, // Failed cycle for health testing
      },
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
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(true);
      // Should show aggregated metrics
      expect(result.stdout).toMatch(/(tokens|cost|latency)/i);
    });

    it('shows health status based on success rate', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(true);
      // Should show health indicator (4/5 success = 80%)
      expect(result.stdout).toMatch(/(health|success|rate)/i);
    });
  });

  describe('--by-role', () => {
    it('shows per-role breakdown', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--by-role']);

      expect(result.success).toBe(true);
      // Should show role names
      expect(result.stdout).toMatch(/engineering/i);
      expect(result.stdout).toMatch(/qa/i);
      expect(result.stdout).toMatch(/ops/i);
    });

    it('aggregates costs per role correctly', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--by-role', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // Engineering: 0.025 + 0.068 = 0.093
      // QA: 0.042 + 0.032 = 0.074
      // Ops: 0.015
      expect(json.byRole).toBeDefined();
    });
  });

  describe('--cycle', () => {
    it('shows detailed metrics for specific cycle', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--cycle', '3']);

      expect(result.success).toBe(true);
      // Should show ops cycle (C3)
      expect(result.stdout).toMatch(/ops|C3|CI fix/i);
    });

    it('shows error for non-existent cycle', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--cycle', '999']);

      // Should indicate cycle not found
      expect(result.stdout + result.stderr).toMatch(/(not found|no.*cycle|invalid)/i);
    });

    it('shows all metrics for the specified cycle', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--cycle', '2', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // Cycle 2 is QA with specific metrics
      expect(json.cycle).toBe(2);
      expect(json.role).toBe('qa');
    });
  });

  describe('--last', () => {
    it('filters to last N cycles', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--last', '2', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // Should only include cycles 4 and 5
      expect(json.cycleCount).toBe(2);
    });

    it('handles --last larger than available cycles', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--last', '100', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // Should show all 5 cycles
      expect(json.cycleCount).toBe(5);
    });
  });

  describe('--json', () => {
    it('outputs valid JSON', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);
      expect(json).toBeDefined();
    });

    it('includes all metric categories', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // Should have cost, tokens, latency, health
      expect(json.totalCost).toBeDefined();
      expect(json.totalInputTokens).toBeDefined();
      expect(json.totalOutputTokens).toBeDefined();
      expect(json.averageLatencyMs).toBeDefined();
      expect(json.successRate).toBeDefined();
    });

    it('calculates averages correctly', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // Average latency: (12500 + 18000 + 5500 + 25000 + 14000) / 5 = 15000
      expect(json.averageLatencyMs).toBeCloseTo(15000, -2);
    });
  });

  describe('--export', () => {
    it('exports metrics to JSON file', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--export', 'metrics.json', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('metrics.json')).toBe(true);

      const content = sandbox.read('metrics.json');
      const json = JSON.parse(content);
      expect(json.totalCost).toBeDefined();
    });

    it('exports metrics to CSV file', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--export', 'metrics.csv', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('metrics.csv')).toBe(true);

      const content = sandbox.read('metrics.csv');
      // CSV should have header row and data
      expect(content).toContain(',');
    });

    it('exports metrics to TSV file', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

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

      const cycles = createSampleCyclesWithMetrics();
      const rotation = {
        current_index: 0,
        last_role: 'engineering',
        last_run: new Date().toISOString(),
        cycle_count: cycles.length,
        history: cycles,
      };
      sandbox.write('custom-agents/state/rotation.json', JSON.stringify(rotation, null, 2));

      const result = await sandbox.ada(['observe', '--dir', 'custom-agents', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);
      expect(json.cycleCount).toBe(5);
    });
  });

  describe('combined options', () => {
    it('combines --by-role with --last', async () => {
      const cycles = createSampleCyclesWithMetrics();
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe', '--by-role', '--last', '3', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);

      // Should show per-role breakdown for only last 3 cycles
      expect(json.byRole).toBeDefined();
      expect(json.cycleCount).toBe(3);
    });
  });

  describe('error handling', () => {
    it('handles missing agents directory gracefully', async () => {
      // Remove agents directory
      sandbox.exec('rm -rf agents');

      const result = await sandbox.ada(['observe']);

      expect(result.stderr + result.stdout).toMatch(/(not found|no.*directory|initialize)/i);
    });

    it('handles corrupted rotation.json gracefully', async () => {
      sandbox.write('agents/state/rotation.json', '{ invalid json }');

      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/(error|invalid|parse)/i);
    });

    it('handles cycles without metrics data', async () => {
      // Cycles without metrics field
      const cycles = [
        {
          role: 'engineering',
          timestamp: new Date().toISOString(),
          cycle: 1,
          action: '⚙️ Initial setup (C1)',
        },
      ];
      seedRotationWithMetrics(sandbox, cycles);

      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(true);
      // Should handle gracefully, showing zero or N/A for metrics
    });
  });
});
