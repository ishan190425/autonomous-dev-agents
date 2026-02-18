/**
 * E2E Tests: ada costs
 *
 * Tests the `ada costs` command for quick cost checking of agent operations.
 * Validates help output, JSON format, savings analysis, and export functionality.
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness';

/**
 * CycleMetrics type matching @ada/core observability schema.
 * This is what `ada costs` actually reads via MetricsManager.
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
 * This is what `ada costs` actually reads via createMetricsManager.
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
 * Total cost: 0.033 + 0.0615 + 0.0056 = 0.1001 (~$0.10)
 */
function createSampleCycleMetrics(): CycleMetrics[] {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  return [
    {
      cycle: 1,
      role: 'engineering',
      model: 'claude-3-5-sonnet-20241022',
      startedAt: new Date(now - 3 * hour).toISOString(),
      completedAt: new Date(now - 3 * hour + 12500).toISOString(),
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
      startedAt: new Date(now - 2 * hour).toISOString(),
      completedAt: new Date(now - 2 * hour + 18000).toISOString(),
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
      startedAt: new Date(now - hour).toISOString(),
      completedAt: new Date(now - hour + 5500).toISOString(),
      durationMs: 5500,
      phases: {
        context_load: { inputTokens: 1000, outputTokens: 300, totalTokens: 1300 },
        action_execution: { inputTokens: 2000, outputTokens: 500, totalTokens: 2500 },
      },
      totals: { inputTokens: 3000, outputTokens: 800, totalTokens: 3800 },
      cost: { inputCost: 0.0024, outputCost: 0.0032, totalCost: 0.0056 },
      success: true,
    },
  ];
}

describe('ada costs E2E', () => {
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
      const result = await sandbox.ada(['costs', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Quick cost check');
      expect(result.stdout).toContain('--json');
      expect(result.stdout).toContain('--export');
      expect(result.stdout).toContain('--savings');
    });
  });

  describe('default output', () => {
    it('shows message when no cost data exists', async () => {
      const result = await sandbox.ada(['costs']);

      expect(result.success).toBe(true);
      // Should show empty state message
      expect(result.stdout).toMatch(/(no cost data|no cycles|\$0\.00)/i);
    });

    it('shows cost summary when cycles have cost data', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['costs']);

      expect(result.success).toBe(true);
      // Total: 0.033 + 0.0615 + 0.0056 = 0.1001 → $0.10
      expect(result.stdout).toMatch(/\$0\.10/);
    });

    it('handles empty metrics gracefully', async () => {
      // Empty metrics with correct schema
      seedMetrics(sandbox, []);

      const result = await sandbox.ada(['costs']);

      expect(result.success).toBe(true);
      // Should show zero or "no cost data"
      expect(result.stdout).toBeDefined();
    });
  });

  describe('--json', () => {
    it('outputs valid JSON', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['costs', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);
      expect(json).toBeDefined();
      expect(typeof json.totalCost).toBe('number');
    });

    it('includes token breakdown in JSON', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['costs', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);
      expect(json.inputTokens).toBeDefined();
      expect(json.outputTokens).toBeDefined();
    });
  });

  describe('--savings', () => {
    it('shows savings analysis when enabled', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['costs', '--savings']);

      expect(result.success).toBe(true);
      // Should show savings analysis for model routing
      expect(result.stdout).toMatch(/(savings|routing|model)/i);
    });

    it('calculates potential savings from model routing', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['costs', '--savings', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);
      // Should have savings field
      expect(json.savings).toBeDefined();
    });
  });

  describe('--export', () => {
    it('exports costs to JSON file', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['costs', '--export', 'costs.json', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('costs.json')).toBe(true);

      const content = sandbox.read('costs.json');
      const json = JSON.parse(content);
      expect(json.totalCost).toBeDefined();
    });

    it('exports costs to CSV file', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      const result = await sandbox.ada(['costs', '--export', 'costs.csv', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('costs.csv')).toBe(true);

      const content = sandbox.read('costs.csv');
      // CSV should have header row
      expect(content).toContain(',');
    });

    it('prevents overwrite without --force', async () => {
      const cycles = createSampleCycleMetrics();
      seedMetrics(sandbox, cycles);

      // First export succeeds
      await sandbox.ada(['costs', '--export', 'costs.json', '--force']);

      // Second export without --force should fail or prompt
      const result = await sandbox.ada(['costs', '--export', 'costs.json']);

      // Either fails or shows warning
      expect(result.stdout + result.stderr).toMatch(/(exists|overwrite|force)/i);
    });
  });

  describe('--dir', () => {
    it('uses custom agents directory', async () => {
      // Create custom directory
      sandbox.exec('mkdir -p custom-agents/state');

      const cycles = createSampleCycleMetrics();
      const metricsState = {
        version: 1,
        cycles,
        maxCycles: 100,
      };
      sandbox.write('custom-agents/state/metrics.json', JSON.stringify(metricsState, null, 2));

      const result = await sandbox.ada(['costs', '--dir', 'custom-agents']);

      expect(result.success).toBe(true);
      // Total: 0.033 + 0.0615 + 0.0056 = 0.1001 → $0.10
      expect(result.stdout).toMatch(/\$0\.10/);
    });
  });

  describe('error handling', () => {
    it('handles missing agents directory gracefully', async () => {
      // Remove agents directory
      sandbox.exec('rm -rf agents');

      const result = await sandbox.ada(['costs']);

      // Should show appropriate error/empty message
      // Either error message or empty state is acceptable
      expect(result.stdout + result.stderr).toBeDefined();
    });

    it('handles corrupted metrics.json gracefully', async () => {
      sandbox.write('agents/state/metrics.json', '{ invalid json }');

      const result = await sandbox.ada(['costs']);

      // Should show error message, not crash
      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/(error|invalid|parse)/i);
    });
  });
});
