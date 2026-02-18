/**
 * E2E Tests: ada costs
 *
 * Tests the `ada costs` command in isolated sandbox environments.
 * Validates cost display and export in various repository states.
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure
 * Part of Issue #206: test(cli): E2E tests for costs command
 *
 * @see docs/research/costs-e2e-schema-investigation-c845.md for schema details
 * @see L483: E2E test schemas must match CLI output, not storage format
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createSandbox, type Sandbox } from './harness';

/**
 * Create a valid CycleMetrics record for seeding metrics.json.
 * This matches the storage format in agents/state/metrics.json.
 */
function createCycleMetrics(overrides: Partial<{
  cycle: number;
  role: string;
  model: string;
  startedAt: string;
  cost: number;
  success: boolean;
}> = {}): Record<string, unknown> {
  const now = new Date();
  const startedAt = overrides.startedAt ?? now.toISOString();
  const completedAt = new Date(new Date(startedAt).getTime() + 5000).toISOString();
  const cost = overrides.cost ?? 0.01;

  return {
    cycle: overrides.cycle ?? 1,
    role: overrides.role ?? 'engineering',
    model: overrides.model ?? 'sonnet',
    startedAt,
    completedAt,
    durationMs: 5000,
    phases: {
      context_load: { inputTokens: 1000, outputTokens: 0, totalTokens: 1000 },
      action_execution: { inputTokens: 500, outputTokens: 200, totalTokens: 700 },
    },
    totals: { inputTokens: 1500, outputTokens: 200, totalTokens: 1700 },
    cost: { inputCost: cost * 0.6, outputCost: cost * 0.4, totalCost: cost },
    success: overrides.success ?? true,
  };
}

/**
 * Seed metrics.json in the sandbox with test data.
 * The file lives at agents/state/metrics.json.
 */
function seedMetrics(sandbox: Sandbox, cycles: Record<string, unknown>[]): void {
  const stateDir = join(sandbox.path, 'agents', 'state');
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, 'metrics.json'), JSON.stringify(cycles, null, 2));
}

describe('ada costs E2E', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('uninitialized repository', () => {
    it('indicates no ADA installation', async () => {
      const result = await sandbox.ada(['costs']);

      // Should fail with helpful message
      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/ada init|no such file|ENOENT|Could not load/i);
    });
  });

  describe('empty state (no metrics)', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
    });

    it('shows friendly empty message', async () => {
      const result = await sandbox.ada(['costs']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/no cost data|collected yet/i);
    });

    it('outputs JSON error for empty state', async () => {
      const result = await sandbox.ada(['costs', '--json']);

      expect(result.success).toBe(true);

      let parsed: unknown;
      expect(() => {
        parsed = JSON.parse(result.stdout);
      }).not.toThrow();

      // Per L483: CLI outputs { error: "No cost data collected yet." } for empty state
      expect(parsed).toEqual({ error: 'No cost data collected yet.' });
    });
  });

  describe('with metrics data', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);

      // Seed metrics with varied timestamps
      const now = new Date();
      const today = new Date(now);
      today.setHours(10, 0, 0, 0);

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(14, 0, 0, 0);

      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 8);

      seedMetrics(sandbox, [
        createCycleMetrics({ cycle: 1, startedAt: lastWeek.toISOString(), cost: 0.05 }),
        createCycleMetrics({ cycle: 2, startedAt: yesterday.toISOString(), cost: 0.03 }),
        createCycleMetrics({ cycle: 3, startedAt: today.toISOString(), cost: 0.02 }),
      ]);
    });

    it('shows cost breakdown', async () => {
      const result = await sandbox.ada(['costs']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/today/i);
      expect(result.stdout).toMatch(/week/i);
      expect(result.stdout).toMatch(/all time|total/i);
      expect(result.stdout).toMatch(/avg|per.?cycle/i);
    });

    it('outputs valid JSON with correct schema', async () => {
      const result = await sandbox.ada(['costs', '--json']);

      expect(result.success).toBe(true);

      let parsed: Record<string, unknown>;
      expect(() => {
        parsed = JSON.parse(result.stdout);
      }).not.toThrow();

      // Per L483/C845: CLI outputs aggregated summaries, NOT raw CycleMetrics
      // Schema: { today, week, total, avgPerCycle, model }
      expect(parsed).toMatchObject({
        today: { cost: expect.any(Number), cycles: expect.any(Number) },
        week: { cost: expect.any(Number), cycles: expect.any(Number) },
        total: { cost: expect.any(Number), cycles: expect.any(Number) },
        avgPerCycle: expect.any(Number),
        model: expect.any(String),
      });

      // Validate the nested structure types
      expect(typeof (parsed as { today: { cost: number } }).today.cost).toBe('number');
      expect(typeof (parsed as { today: { cycles: number } }).today.cycles).toBe('number');
      expect(typeof (parsed as { week: { cost: number } }).week.cost).toBe('number');
      expect(typeof (parsed as { week: { cycles: number } }).week.cycles).toBe('number');
      expect(typeof (parsed as { total: { cost: number } }).total.cost).toBe('number');
      expect(typeof (parsed as { total: { cycles: number } }).total.cycles).toBe('number');
    });

    it('calculates totals correctly', async () => {
      const result = await sandbox.ada(['costs', '--json']);
      const parsed = JSON.parse(result.stdout) as {
        total: { cost: number; cycles: number };
        avgPerCycle: number;
      };

      // 3 cycles seeded
      expect(parsed.total.cycles).toBe(3);

      // Total cost = 0.05 + 0.03 + 0.02 = 0.10
      expect(parsed.total.cost).toBeCloseTo(0.10, 2);

      // Avg per cycle = 0.10 / 3 ≈ 0.0333
      expect(parsed.avgPerCycle).toBeCloseTo(0.0333, 3);
    });
  });

  describe('--savings flag', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);

      // Seed metrics with different models for savings analysis
      const now = new Date();
      seedMetrics(sandbox, [
        createCycleMetrics({ cycle: 1, model: 'haiku', cost: 0.001, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 2, model: 'haiku', cost: 0.001, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 3, model: 'sonnet', cost: 0.01, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 4, model: 'sonnet', cost: 0.01, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 5, model: 'opus', cost: 0.10, startedAt: now.toISOString() }),
      ]);
    });

    it('shows savings analysis', async () => {
      const result = await sandbox.ada(['costs', '--savings']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/model distribution|distribution/i);
      expect(result.stdout).toMatch(/savings|cost/i);
    });

    it('outputs valid JSON with savings schema', async () => {
      const result = await sandbox.ada(['costs', '--savings', '--json']);

      expect(result.success).toBe(true);

      let parsed: Record<string, unknown>;
      expect(() => {
        parsed = JSON.parse(result.stdout);
      }).not.toThrow();

      // Per C845 research: --savings has different output schema
      expect(parsed).toMatchObject({
        modelDistribution: {
          haiku: { cycles: expect.any(Number), percentage: expect.any(Number) },
          sonnet: { cycles: expect.any(Number), percentage: expect.any(Number) },
          opus: { cycles: expect.any(Number), percentage: expect.any(Number) },
        },
        actualCost: expect.any(Number),
        baselineCost: expect.any(Number),
        savings: { amount: expect.any(Number), percentage: expect.any(Number) },
        perCycle: {
          actual: expect.any(Number),
          baseline: expect.any(Number),
          savings: expect.any(Number),
        },
        status: expect.stringMatching(/on_track|above_target|below_target/),
        target: expect.any(Number),
        projected: expect.any(Number),
        cycleCount: expect.any(Number),
      });
    });

    it('calculates model distribution correctly', async () => {
      const result = await sandbox.ada(['costs', '--savings', '--json']);
      const parsed = JSON.parse(result.stdout) as {
        modelDistribution: {
          haiku: { cycles: number; percentage: number };
          sonnet: { cycles: number; percentage: number };
          opus: { cycles: number; percentage: number };
        };
        cycleCount: number;
      };

      expect(parsed.cycleCount).toBe(5);
      expect(parsed.modelDistribution.haiku.cycles).toBe(2);
      expect(parsed.modelDistribution.sonnet.cycles).toBe(2);
      expect(parsed.modelDistribution.opus.cycles).toBe(1);
    });
  });

  describe('--export flag', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);

      const now = new Date();
      seedMetrics(sandbox, [
        createCycleMetrics({ cycle: 1, cost: 0.05, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 2, cost: 0.03, startedAt: now.toISOString() }),
      ]);
    });

    it('exports to JSON file', async () => {
      const result = await sandbox.ada(['costs', '--export', 'costs.json', '--force']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/exported/i);
      expect(sandbox.exists('costs.json')).toBe(true);

      const exported = sandbox.readJson<{
        today: { cost: number; cycles: number };
        total: { cost: number; cycles: number };
      }>('costs.json');
      expect(exported).toHaveProperty('today');
      expect(exported).toHaveProperty('total');
    });

    it('exports to CSV file', async () => {
      const result = await sandbox.ada(['costs', '--export', 'costs.csv', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('costs.csv')).toBe(true);

      const csv = sandbox.read('costs.csv');
      // CSV should have headers and data rows
      expect(csv).toContain('period');
      expect(csv).toContain('cost');
      expect(csv).toContain('today');
    });

    it('exports to TSV file', async () => {
      const result = await sandbox.ada(['costs', '--export', 'costs.tsv', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('costs.tsv')).toBe(true);

      const tsv = sandbox.read('costs.tsv');
      // TSV should use tabs
      expect(tsv).toContain('\t');
    });

    it('rejects unsupported formats', async () => {
      const result = await sandbox.ada(['costs', '--export', 'costs.txt']);

      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/unsupported|format/i);
    });
  });

  describe('--help flag', () => {
    it('shows help information', async () => {
      const result = await sandbox.ada(['costs', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('costs');
      expect(result.stdout).toMatch(/usage|options|help/i);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
    });

    it('handles malformed metrics.json gracefully', async () => {
      const stateDir = join(sandbox.path, 'agents', 'state');
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(join(stateDir, 'metrics.json'), 'not valid json{{{');

      const result = await sandbox.ada(['costs']);

      // Should fail gracefully with error message
      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/error|could not|invalid|parse/i);
    });

    it('handles empty array metrics gracefully', async () => {
      seedMetrics(sandbox, []);

      const result = await sandbox.ada(['costs', '--json']);

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toEqual({ error: 'No cost data collected yet.' });
    });
  });
});
