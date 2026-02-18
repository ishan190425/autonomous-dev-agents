/**
 * E2E Tests: ada observe
 *
 * Tests the `ada observe` command in isolated sandbox environments.
 * Validates observability dashboard, JSON output, --by-role breakdown,
 * --cycle details, --last filtering, and export functionality.
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure
 * Part of Issue #205: test(cli): E2E tests for observe command (Split from #202)
 *
 * @see packages/cli/src/commands/observe.ts for implementation
 * @see L483: E2E test schemas must match CLI output, not storage format
 * @see L486: Test data must match storage format — MetricsState wrapper required
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
  durationMs: number;
  latency: Record<string, { durationMs: number }>;
}> = {}): Record<string, unknown> {
  const now = new Date();
  const startedAt = overrides.startedAt ?? now.toISOString();
  const durationMs = overrides.durationMs ?? 5000;
  const completedAt = new Date(new Date(startedAt).getTime() + durationMs).toISOString();
  const cost = overrides.cost ?? 0.01;

  return {
    cycle: overrides.cycle ?? 1,
    role: overrides.role ?? 'engineering',
    model: overrides.model ?? 'sonnet',
    startedAt,
    completedAt,
    durationMs,
    phases: {
      context_load: { inputTokens: 1000, outputTokens: 0, totalTokens: 1000 },
      action_execution: { inputTokens: 500, outputTokens: 200, totalTokens: 700 },
    },
    totals: { inputTokens: 1500, outputTokens: 200, totalTokens: 1700 },
    cost: { inputCost: cost * 0.6, outputCost: cost * 0.4, totalCost: cost },
    success: overrides.success ?? true,
    ...(overrides.latency && { latency: overrides.latency }),
  };
}

/**
 * Create basic roster.json for testing.
 */
function createRoster(): Record<string, unknown> {
  return {
    product: 'Test Project',
    roles: [
      { id: 'engineering', name: 'The Builder', emoji: '⚙️' },
      { id: 'design', name: 'The Architect', emoji: '🎨' },
      { id: 'qa', name: 'The Inspector', emoji: '🔍' },
      { id: 'product', name: 'The PM', emoji: '📦' },
    ],
    rotation_order: ['engineering', 'design', 'qa', 'product'],
  };
}

/**
 * Seed metrics.json in the sandbox with test data.
 * The file lives at agents/state/metrics.json.
 *
 * IMPORTANT: MetricsManager expects MetricsState format:
 * { version: 1, cycles: [...], maxCycles: 100 }
 * NOT just the raw array of cycles.
 *
 * @see L486: Test data must match storage format — MetricsState wrapper required
 */
function seedMetrics(sandbox: Sandbox, cycles: Record<string, unknown>[]): void {
  const stateDir = join(sandbox.path, 'agents', 'state');
  mkdirSync(stateDir, { recursive: true });

  // MetricsManager.load() expects MetricsState format, not raw array
  const metricsState = {
    version: 1,
    cycles,
    maxCycles: 100,
  };

  writeFileSync(join(stateDir, 'metrics.json'), JSON.stringify(metricsState, null, 2));
}

/**
 * Seed roster.json for role display tests.
 */
function seedRoster(sandbox: Sandbox): void {
  const agentsDir = join(sandbox.path, 'agents');
  mkdirSync(agentsDir, { recursive: true });
  writeFileSync(join(agentsDir, 'roster.json'), JSON.stringify(createRoster(), null, 2));
}

describe('ada observe E2E', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('--help flag', () => {
    it('shows help information', async () => {
      const result = await sandbox.ada(['observe', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('observe');
      expect(result.stdout).toMatch(/observability|metrics/i);
      expect(result.stdout).toMatch(/--by-role|--cycle|--json|--last/i);
    });
  });

  describe('uninitialized repository', () => {
    it('shows friendly empty message without crashing', async () => {
      const result = await sandbox.ada(['observe']);

      // CLI gracefully handles uninitialized state by showing empty message
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/no observability data|collected yet/i);
    });

    it('outputs JSON error for uninitialized state', async () => {
      const result = await sandbox.ada(['observe', '--json']);

      expect(result.success).toBe(true);

      let parsed: unknown;
      expect(() => {
        parsed = JSON.parse(result.stdout);
      }).not.toThrow();

      // Same behavior as empty initialized state
      expect(parsed).toEqual({ error: 'No observability data collected yet.' });
    });
  });

  describe('empty state (no metrics)', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
    });

    it('shows friendly empty message', async () => {
      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/no observability data|collected yet/i);
    });

    it('outputs JSON error for empty state', async () => {
      const result = await sandbox.ada(['observe', '--json']);

      expect(result.success).toBe(true);

      let parsed: unknown;
      expect(() => {
        parsed = JSON.parse(result.stdout);
      }).not.toThrow();

      expect(parsed).toEqual({ error: 'No observability data collected yet.' });
    });
  });

  describe('default dashboard (with metrics data)', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
      seedRoster(sandbox);

      // Seed metrics with varied timestamps and roles
      const now = new Date();
      const today = new Date(now);
      today.setHours(10, 0, 0, 0);

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(14, 0, 0, 0);

      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 8);

      seedMetrics(sandbox, [
        createCycleMetrics({ cycle: 1, role: 'engineering', startedAt: lastWeek.toISOString(), cost: 0.05 }),
        createCycleMetrics({ cycle: 2, role: 'design', startedAt: yesterday.toISOString(), cost: 0.03 }),
        createCycleMetrics({ cycle: 3, role: 'qa', startedAt: today.toISOString(), cost: 0.02 }),
      ]);
    });

    it('shows observability dashboard', async () => {
      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/observability/i);
      expect(result.stdout).toMatch(/cost summary/i);
      expect(result.stdout).toMatch(/token usage/i);
      expect(result.stdout).toMatch(/health/i);
    });

    it('shows cycle count and period', async () => {
      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/cycles.*3|3.*tracked/i);
    });

    it('shows success rate', async () => {
      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/success rate/i);
      expect(result.stdout).toMatch(/100%|healthy/i);
    });
  });

  describe('--json flag', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
      seedRoster(sandbox);

      const now = new Date();
      seedMetrics(sandbox, [
        createCycleMetrics({ cycle: 1, role: 'engineering', cost: 0.05, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 2, role: 'design', cost: 0.03, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 3, role: 'qa', cost: 0.02, startedAt: now.toISOString() }),
      ]);
    });

    it('outputs valid JSON with aggregated schema', async () => {
      const result = await sandbox.ada(['observe', '--json']);

      expect(result.success).toBe(true);

      let parsed: Record<string, unknown>;
      expect(() => {
        parsed = JSON.parse(result.stdout);
      }).not.toThrow();

      // Observe outputs aggregated metrics structure
      expect(parsed).toHaveProperty('aggregated');
      expect(parsed).toHaveProperty('recentCycles');

      // Check aggregated structure
      const aggregated = parsed.aggregated as Record<string, unknown>;
      expect(aggregated).toMatchObject({
        totalCycles: 3,
        successfulCycles: expect.any(Number),
        failedCycles: expect.any(Number),
        totalTokens: expect.any(Object),
        totalCost: expect.any(Object),
        avgTokensPerCycle: expect.any(Object),
        avgCostPerCycle: expect.any(Object),
        byRole: expect.any(Object),
        firstCycle: expect.any(Number),
        lastCycle: expect.any(Number),
        timeRange: expect.any(Object),
      });
    });

    it('includes recent cycles array', async () => {
      const result = await sandbox.ada(['observe', '--json']);
      const parsed = JSON.parse(result.stdout) as { recentCycles: unknown[] };

      expect(Array.isArray(parsed.recentCycles)).toBe(true);
      expect(parsed.recentCycles.length).toBeGreaterThan(0);
    });
  });

  describe('--by-role flag', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
      seedRoster(sandbox);

      const now = new Date();
      seedMetrics(sandbox, [
        createCycleMetrics({ cycle: 1, role: 'engineering', cost: 0.05, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 2, role: 'engineering', cost: 0.04, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 3, role: 'design', cost: 0.03, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 4, role: 'qa', cost: 0.02, startedAt: now.toISOString() }),
      ]);
    });

    it('shows per-role breakdown', async () => {
      const result = await sandbox.ada(['observe', '--by-role']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/cost by role/i);
      expect(result.stdout).toMatch(/engineering/i);
      expect(result.stdout).toMatch(/design/i);
      expect(result.stdout).toMatch(/qa/i);
    });

    it('shows role cycle counts', async () => {
      const result = await sandbox.ada(['observe', '--by-role']);

      expect(result.success).toBe(true);
      // Engineering has 2 cycles
      expect(result.stdout).toMatch(/engineering.*2|2.*engineering/i);
    });

    it('shows TOTAL row', async () => {
      const result = await sandbox.ada(['observe', '--by-role']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/total/i);
    });

    it('outputs valid JSON with by-role structure', async () => {
      const result = await sandbox.ada(['observe', '--by-role', '--json']);

      expect(result.success).toBe(true);

      const parsed = JSON.parse(result.stdout) as { aggregated: { byRole: Record<string, unknown> } };
      expect(parsed.aggregated).toHaveProperty('byRole');
      expect(parsed.aggregated.byRole).toHaveProperty('engineering');
      expect(parsed.aggregated.byRole).toHaveProperty('design');
      expect(parsed.aggregated.byRole).toHaveProperty('qa');
    });
  });

  describe('--cycle flag', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
      seedRoster(sandbox);

      const now = new Date();
      seedMetrics(sandbox, [
        createCycleMetrics({ cycle: 100, role: 'engineering', cost: 0.05, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 101, role: 'design', cost: 0.03, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 102, role: 'qa', cost: 0.02, startedAt: now.toISOString() }),
      ]);
    });

    it('shows specific cycle details', async () => {
      const result = await sandbox.ada(['observe', '--cycle', '101']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/cycle 101/i);
      expect(result.stdout).toMatch(/design/i);
      expect(result.stdout).toMatch(/token usage by phase/i);
    });

    it('shows cycle cost and status', async () => {
      const result = await sandbox.ada(['observe', '--cycle', '101']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/cost/i);
      expect(result.stdout).toMatch(/status/i);
      expect(result.stdout).toMatch(/success/i);
    });

    it('shows error for non-existent cycle', async () => {
      const result = await sandbox.ada(['observe', '--cycle', '999']);

      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/not found|not tracked/i);
    });

    it('outputs valid JSON for specific cycle', async () => {
      const result = await sandbox.ada(['observe', '--cycle', '101', '--json']);

      expect(result.success).toBe(true);

      const parsed = JSON.parse(result.stdout) as { cycle: Record<string, unknown> };
      expect(parsed).toHaveProperty('cycle');
      expect(parsed.cycle).toMatchObject({
        cycle: 101,
        role: 'design',
        success: true,
        totals: expect.any(Object),
        cost: expect.any(Object),
      });
    });
  });

  describe('--last flag', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
      seedRoster(sandbox);

      // Seed 5 cycles
      const now = new Date();
      seedMetrics(sandbox, [
        createCycleMetrics({ cycle: 1, role: 'engineering', cost: 0.01, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 2, role: 'design', cost: 0.02, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 3, role: 'qa', cost: 0.03, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 4, role: 'product', cost: 0.04, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 5, role: 'engineering', cost: 0.05, startedAt: now.toISOString() }),
      ]);
    });

    it('filters to last N cycles', async () => {
      const result = await sandbox.ada(['observe', '--last', '2', '--json']);

      expect(result.success).toBe(true);

      const parsed = JSON.parse(result.stdout) as {
        filter: { last: number };
        aggregated: { totalCycles: number };
        recentCycles: unknown[];
      };
      
      expect(parsed.filter).toEqual({ last: 2, cycleRange: [4, 5] });
      expect(parsed.aggregated.totalCycles).toBe(2);
      expect(parsed.recentCycles.length).toBe(2);
    });

    it('shows filter indicator in output', async () => {
      const result = await sandbox.ada(['observe', '--last', '3']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/last 3 cycles/i);
    });

    it('rejects invalid --last value', async () => {
      const result = await sandbox.ada(['observe', '--last', '0']);

      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/invalid|at least 1/i);
    });

    it('rejects non-numeric --last value', async () => {
      const result = await sandbox.ada(['observe', '--last', 'abc']);

      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/invalid|at least 1/i);
    });

    it('handles --last greater than total cycles', async () => {
      const result = await sandbox.ada(['observe', '--last', '100', '--json']);

      expect(result.success).toBe(true);

      const parsed = JSON.parse(result.stdout) as { aggregated: { totalCycles: number } };
      // Should show all 5 cycles (not error)
      expect(parsed.aggregated.totalCycles).toBe(5);
    });
  });

  describe('--export flag', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
      seedRoster(sandbox);

      const now = new Date();
      seedMetrics(sandbox, [
        createCycleMetrics({ cycle: 1, role: 'engineering', cost: 0.05, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 2, role: 'design', cost: 0.03, startedAt: now.toISOString() }),
      ]);
    });

    it('exports to JSON file', async () => {
      const result = await sandbox.ada(['observe', '--export', 'metrics.json', '--force']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/exported/i);
      expect(sandbox.exists('metrics.json')).toBe(true);

      const exported = sandbox.readJson<{ aggregated: Record<string, unknown>; cycles: unknown[] }>('metrics.json');
      expect(exported).toHaveProperty('aggregated');
      expect(exported).toHaveProperty('cycles');
    });

    it('exports to CSV file', async () => {
      const result = await sandbox.ada(['observe', '--export', 'metrics.csv', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('metrics.csv')).toBe(true);

      const csv = sandbox.read('metrics.csv');
      // CSV should have headers and data rows
      expect(csv).toContain('cycle');
      expect(csv).toContain('role');
      expect(csv).toContain('cost');
    });

    it('exports to TSV file', async () => {
      const result = await sandbox.ada(['observe', '--export', 'metrics.tsv', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('metrics.tsv')).toBe(true);

      const tsv = sandbox.read('metrics.tsv');
      // TSV should use tabs
      expect(tsv).toContain('\t');
    });

    it('exports --by-role to CSV', async () => {
      const result = await sandbox.ada(['observe', '--by-role', '--export', 'roles.csv', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('roles.csv')).toBe(true);

      const csv = sandbox.read('roles.csv');
      expect(csv).toContain('role');
      expect(csv).toContain('engineering');
      expect(csv).toContain('design');
    });

    it('exports specific cycle to file', async () => {
      const result = await sandbox.ada(['observe', '--cycle', '1', '--export', 'cycle1.json', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('cycle1.json')).toBe(true);

      const exported = sandbox.readJson<{ cycle: { cycle: number } }>('cycle1.json');
      expect(exported.cycle.cycle).toBe(1);
    });

    it('rejects unsupported formats', async () => {
      const result = await sandbox.ada(['observe', '--export', 'metrics.txt']);

      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/unsupported|format/i);
    });
  });

  describe('with latency data (Phase 2)', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
      seedRoster(sandbox);

      // Seed cycles with latency data
      const now = new Date();
      const latency = {
        context_load: { durationMs: 500 },
        action_execution: { durationMs: 3000 },
        memory_update: { durationMs: 200 },
      };

      seedMetrics(sandbox, Array.from({ length: 15 }, (_, i) =>
        createCycleMetrics({
          cycle: i + 1,
          role: ['engineering', 'design', 'qa'][i % 3],
          cost: 0.01 + i * 0.005,
          durationMs: 4000 + i * 100,
          startedAt: now.toISOString(),
          latency,
        })
      ));
    });

    it('shows latency section when sufficient data', async () => {
      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/latency/i);
    });

    it('shows phase timing for specific cycle', async () => {
      const result = await sandbox.ada(['observe', '--cycle', '10']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/phase timing/i);
    });

    it('includes efficiency metrics in JSON', async () => {
      const result = await sandbox.ada(['observe', '--json']);

      expect(result.success).toBe(true);

      const parsed = JSON.parse(result.stdout) as { aggregated: { efficiency: Record<string, unknown> } };
      expect(parsed.aggregated).toHaveProperty('efficiency');
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

      const result = await sandbox.ada(['observe']);

      // MetricsManager.load() catches parse errors and returns empty state
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/no observability data|collected yet/i);
    });

    it('handles empty array metrics gracefully', async () => {
      seedMetrics(sandbox, []);

      const result = await sandbox.ada(['observe', '--json']);

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toEqual({ error: 'No observability data collected yet.' });
    });

    it('handles metrics with only failed cycles', async () => {
      const now = new Date();
      seedMetrics(sandbox, [
        createCycleMetrics({ cycle: 1, success: false, startedAt: now.toISOString() }),
        createCycleMetrics({ cycle: 2, success: false, startedAt: now.toISOString() }),
      ]);

      const result = await sandbox.ada(['observe']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/failed|unhealthy|0%/i);
    });
  });
});
