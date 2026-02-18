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
 * Seed a rotation.json with history entries that include cost data.
 * Cost tracking is embedded in the cycle history.
 */
function seedRotationWithCosts(
  sandbox: Sandbox,
  cycles: Array<{
    role: string;
    timestamp: string;
    cycle: number;
    action: string;
    cost?: {
      inputTokens: number;
      outputTokens: number;
      totalCost: number;
      model: string;
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
 * Create sample cycles with cost data for testing.
 */
function createSampleCyclesWithCosts(): Array<{
  role: string;
  timestamp: string;
  cycle: number;
  action: string;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    model: string;
  };
}> {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  return [
    {
      role: 'engineering',
      timestamp: new Date(now - 3 * hour).toISOString(),
      cycle: 1,
      action: '⚙️ Initial setup (C1)',
      cost: {
        inputTokens: 5000,
        outputTokens: 1200,
        totalCost: 0.025,
        model: 'claude-3-5-sonnet-20241022',
      },
    },
    {
      role: 'qa',
      timestamp: new Date(now - 2 * hour).toISOString(),
      cycle: 2,
      action: '🔍 Test implementation (C2)',
      cost: {
        inputTokens: 8000,
        outputTokens: 2500,
        totalCost: 0.042,
        model: 'claude-3-5-sonnet-20241022',
      },
    },
    {
      role: 'ops',
      timestamp: new Date(now - hour).toISOString(),
      cycle: 3,
      action: '🛡️ CI fix (C3)',
      cost: {
        inputTokens: 3000,
        outputTokens: 800,
        totalCost: 0.015,
        model: 'claude-3-5-haiku-20241022',
      },
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
      // Should show empty state or zero costs
      expect(result.stdout).toMatch(/(\$0\.00|no cost data|no cycles)/i);
    });

    it('shows cost summary when cycles have cost data', async () => {
      const cycles = createSampleCyclesWithCosts();
      seedRotationWithCosts(sandbox, cycles);

      const result = await sandbox.ada(['costs']);

      expect(result.success).toBe(true);
      // Should show total cost (0.025 + 0.042 + 0.015 = 0.082)
      expect(result.stdout).toMatch(/\$0\.08/);
    });

    it('handles cycles without cost data gracefully', async () => {
      // Cycles without cost field
      const cycles = [
        {
          role: 'engineering',
          timestamp: new Date().toISOString(),
          cycle: 1,
          action: '⚙️ Initial setup (C1)',
        },
      ];
      seedRotationWithCosts(sandbox, cycles);

      const result = await sandbox.ada(['costs']);

      expect(result.success).toBe(true);
      // Should not crash, show zero or "no cost data"
      expect(result.stdout).toBeDefined();
    });
  });

  describe('--json', () => {
    it('outputs valid JSON', async () => {
      const cycles = createSampleCyclesWithCosts();
      seedRotationWithCosts(sandbox, cycles);

      const result = await sandbox.ada(['costs', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);
      expect(json).toBeDefined();
      expect(typeof json.totalCost).toBe('number');
    });

    it('includes token breakdown in JSON', async () => {
      const cycles = createSampleCyclesWithCosts();
      seedRotationWithCosts(sandbox, cycles);

      const result = await sandbox.ada(['costs', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);
      expect(json.inputTokens).toBeDefined();
      expect(json.outputTokens).toBeDefined();
    });
  });

  describe('--savings', () => {
    it('shows savings analysis when enabled', async () => {
      const cycles = createSampleCyclesWithCosts();
      seedRotationWithCosts(sandbox, cycles);

      const result = await sandbox.ada(['costs', '--savings']);

      expect(result.success).toBe(true);
      // Should show savings analysis for model routing
      expect(result.stdout).toMatch(/(savings|routing|model)/i);
    });

    it('calculates potential savings from model routing', async () => {
      const cycles = createSampleCyclesWithCosts();
      seedRotationWithCosts(sandbox, cycles);

      const result = await sandbox.ada(['costs', '--savings', '--json']);

      expect(result.success).toBe(true);
      const json = JSON.parse(result.stdout);
      // Should have savings field
      expect(json.savings).toBeDefined();
    });
  });

  describe('--export', () => {
    it('exports costs to JSON file', async () => {
      const cycles = createSampleCyclesWithCosts();
      seedRotationWithCosts(sandbox, cycles);

      const result = await sandbox.ada(['costs', '--export', 'costs.json', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('costs.json')).toBe(true);

      const content = sandbox.read('costs.json');
      const json = JSON.parse(content);
      expect(json.totalCost).toBeDefined();
    });

    it('exports costs to CSV file', async () => {
      const cycles = createSampleCyclesWithCosts();
      seedRotationWithCosts(sandbox, cycles);

      const result = await sandbox.ada(['costs', '--export', 'costs.csv', '--force']);

      expect(result.success).toBe(true);
      expect(sandbox.exists('costs.csv')).toBe(true);

      const content = sandbox.read('costs.csv');
      // CSV should have header row
      expect(content).toContain(',');
    });

    it('prevents overwrite without --force', async () => {
      const cycles = createSampleCyclesWithCosts();
      seedRotationWithCosts(sandbox, cycles);

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

      const cycles = createSampleCyclesWithCosts();
      const rotation = {
        current_index: 0,
        last_role: 'engineering',
        last_run: new Date().toISOString(),
        cycle_count: cycles.length,
        history: cycles,
      };
      sandbox.write('custom-agents/state/rotation.json', JSON.stringify(rotation, null, 2));

      const result = await sandbox.ada(['costs', '--dir', 'custom-agents']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/\$0\.08/);
    });
  });

  describe('error handling', () => {
    it('handles missing agents directory gracefully', async () => {
      // Remove agents directory
      sandbox.exec('rm -rf agents');

      const result = await sandbox.ada(['costs']);

      // Should not crash
      expect(result.stderr + result.stdout).toMatch(/(not found|no.*directory|initialize)/i);
    });

    it('handles corrupted rotation.json gracefully', async () => {
      sandbox.write('agents/state/rotation.json', '{ invalid json }');

      const result = await sandbox.ada(['costs']);

      // Should show error message, not crash
      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/(error|invalid|parse)/i);
    });
  });
});
