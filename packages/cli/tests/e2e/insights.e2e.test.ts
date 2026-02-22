/**
 * E2E Tests for `ada insights` command
 *
 * Tests cross-role pattern detection from rotation history.
 * Part of Reflexion Phase 1c (Issue #108).
 *
 * @see packages/cli/src/commands/insights.ts
 * @see Issue #34 (E2E Testing Infrastructure)
 *
 * 🔍 QA — Cycle 1069
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, Sandbox } from './harness.js';

describe('ada insights E2E', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('help output', () => {
    it('shows insights help', async () => {
      const result = await sandbox.ada(['insights', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('insights');
      expect(result.stdout).toContain('Detect cross-role patterns');
    });

    it('lists all subcommands', async () => {
      const result = await sandbox.ada(['insights', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('list');
      expect(result.stdout).toContain('retro');
      expect(result.stdout).toContain('issue');
    });

    it('shows list subcommand help', async () => {
      const result = await sandbox.ada(['insights', 'list', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('--cycles');
      expect(result.stdout).toContain('--min-roles');
      expect(result.stdout).toContain('--min-confidence');
      expect(result.stdout).toContain('--json');
      expect(result.stdout).toContain('--verbose');
    });

    it('shows retro subcommand help', async () => {
      const result = await sandbox.ada(['insights', 'retro', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('retro');
      expect(result.stdout).toContain('--json');
    });

    it('shows issue subcommand help', async () => {
      const result = await sandbox.ada(['insights', 'issue', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('issue');
      expect(result.stdout).toContain('<id>');
      expect(result.stdout).toContain('--json');
    });
  });

  describe('uninitialized repository', () => {
    it('handles missing agents directory gracefully', async () => {
      const result = await sandbox.ada(['insights', 'list']);

      // Should fail gracefully when no rotation.json exists
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('with initialized repo', () => {
    beforeEach(async () => {
      // Initialize ADA
      await sandbox.ada(['init']);
    });

    describe('empty history', () => {
      it('shows message when no rotation history exists', async () => {
        const result = await sandbox.ada(['insights', 'list']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('No rotation history');
      });

      it('outputs JSON for empty state', async () => {
        const result = await sandbox.ada(['insights', 'list', '--json']);

        expect(result.exitCode).toBe(0);
        const json = JSON.parse(result.stdout);
        expect(json).toHaveProperty('insights');
        expect(json.insights).toEqual([]);
        expect(json.count).toBe(0);
      });

      it('shows retro message for empty state', async () => {
        const result = await sandbox.ada(['insights', 'retro']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('No rotation history');
      });

      it('outputs JSON for retro empty state', async () => {
        const result = await sandbox.ada(['insights', 'retro', '--json']);

        expect(result.exitCode).toBe(0);
        const json = JSON.parse(result.stdout);
        expect(json).toHaveProperty('markdown');
        expect(json).toHaveProperty('insights');
        expect(json.insights).toEqual([]);
      });
    });

    describe('with history (no insights)', () => {
      beforeEach(() => {
        // Add minimal rotation history without enough data for insights
        const rotationState = sandbox.readJson<{
          current_index: number;
          last_role: string;
          cycle_count: number;
          history: unknown[];
        }>('agents/state/rotation.json');

        rotationState.history = [
          {
            role: 'engineering',
            timestamp: new Date().toISOString(),
            cycle: 1,
            action: 'Test action',
            reflection: { whatWorked: 'First test' },
          },
          {
            role: 'qa',
            timestamp: new Date().toISOString(),
            cycle: 2,
            action: 'Another action',
            reflection: { whatWorked: 'Second test' },
          },
        ];
        rotationState.cycle_count = 2;

        sandbox.write(
          'agents/state/rotation.json',
          JSON.stringify(rotationState, null, 2)
        );
      });

      it('shows no patterns detected message', async () => {
        const result = await sandbox.ada(['insights', 'list']);

        expect(result.exitCode).toBe(0);
        // Either no patterns or analysis ran
        expect(
          result.stdout.includes('Cross-Role Insights') ||
          result.stdout.includes('No cross-role patterns')
        ).toBe(true);
      });

      it('supports --cycles option', async () => {
        const result = await sandbox.ada(['insights', 'list', '--cycles', '5']);

        expect(result.exitCode).toBe(0);
      });

      it('supports --min-confidence option', async () => {
        const result = await sandbox.ada(['insights', 'list', '--min-confidence', '0.5']);

        expect(result.exitCode).toBe(0);
      });

      it('supports --min-roles option', async () => {
        const result = await sandbox.ada(['insights', 'list', '--min-roles', '2']);

        expect(result.exitCode).toBe(0);
      });

      it('supports --verbose option', async () => {
        const result = await sandbox.ada(['insights', 'list', '--verbose']);

        expect(result.exitCode).toBe(0);
      });

      it('outputs valid JSON', async () => {
        const result = await sandbox.ada(['insights', 'list', '--json']);

        expect(result.exitCode).toBe(0);
        expect(() => JSON.parse(result.stdout)).not.toThrow();

        const json = JSON.parse(result.stdout);
        expect(json).toHaveProperty('insights');
        expect(Array.isArray(json.insights)).toBe(true);
      });
    });

    describe('with rich history (potential insights)', () => {
      beforeEach(() => {
        // Add rich rotation history with repeated patterns across roles
        const rotationState = sandbox.readJson<{
          current_index: number;
          last_role: string;
          cycle_count: number;
          history: unknown[];
        }>('agents/state/rotation.json');

        // Create history with convergent patterns across multiple roles
        const roles = ['engineering', 'qa', 'ops', 'design', 'product'];
        const history = [];

        for (let i = 1; i <= 20; i++) {
          const role = roles[(i - 1) % roles.length];
          history.push({
            role,
            timestamp: new Date(Date.now() - (20 - i) * 3600000).toISOString(),
            cycle: i,
            action: `Cycle ${i} action for ${role}`,
            reflection: {
              whatWorked: 'Testing patterns work well when multiple roles align on shared goals',
              lesson: 'Cross-role alignment improves outcomes',
              outcome: 'success',
            },
          });
        }

        rotationState.history = history;
        rotationState.cycle_count = 20;

        sandbox.write(
          'agents/state/rotation.json',
          JSON.stringify(rotationState, null, 2)
        );
      });

      it('analyzes multiple cycles', async () => {
        const result = await sandbox.ada(['insights', 'list']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Cross-Role Insights');
      });

      it('outputs JSON with insights structure', async () => {
        const result = await sandbox.ada(['insights', 'list', '--json']);

        expect(result.exitCode).toBe(0);
        const json = JSON.parse(result.stdout);
        expect(json).toHaveProperty('insights');
        expect(json).toHaveProperty('count');
        expect(typeof json.count).toBe('number');
      });

      it('formats retro output', async () => {
        const result = await sandbox.ada(['insights', 'retro']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Cross-Role Insights');
      });

      it('retro JSON includes markdown field', async () => {
        const result = await sandbox.ada(['insights', 'retro', '--json']);

        expect(result.exitCode).toBe(0);
        const json = JSON.parse(result.stdout);
        expect(json).toHaveProperty('markdown');
        expect(typeof json.markdown).toBe('string');
        expect(json).toHaveProperty('insights');
      });
    });

    describe('ada insights issue', () => {
      beforeEach(() => {
        // Set up history with at least some reflection data
        const rotationState = sandbox.readJson<{
          current_index: number;
          last_role: string;
          cycle_count: number;
          history: unknown[];
        }>('agents/state/rotation.json');

        rotationState.history = [
          {
            role: 'engineering',
            timestamp: new Date().toISOString(),
            cycle: 1,
            action: 'Test action',
            reflection: { whatWorked: 'Testing works' },
          },
        ];
        rotationState.cycle_count = 1;

        sandbox.write(
          'agents/state/rotation.json',
          JSON.stringify(rotationState, null, 2)
        );
      });

      it('requires insight ID argument', async () => {
        const result = await sandbox.ada(['insights', 'issue']);

        // Should fail without ID
        expect(result.exitCode).not.toBe(0);
      });

      it('handles invalid insight ID gracefully', async () => {
        const result = await sandbox.ada(['insights', 'issue', 'nonexistent-id']);

        // Should fail with clear error
        expect(result.exitCode).not.toBe(0);
        expect(
          result.stderr.includes('not found') ||
          result.stdout.includes('not found')
        ).toBe(true);
      });

      it('supports --json flag', async () => {
        // Even with invalid ID, --json flag should be accepted
        const result = await sandbox.ada(['insights', 'issue', 'test-id', '--json']);

        // Will fail because ID doesn't exist, but JSON flag is valid
        expect(result.exitCode).not.toBe(0);
      });
    });

    describe('option validation', () => {
      it('accepts --dir option', async () => {
        const result = await sandbox.ada([
          'insights',
          'list',
          '--dir',
          sandbox.path,
        ]);

        expect(result.exitCode).toBe(0);
      });

      it('handles invalid directory gracefully', async () => {
        const result = await sandbox.ada([
          'insights',
          'list',
          '--dir',
          '/nonexistent/path',
        ]);

        // Should fail gracefully
        expect(result.exitCode).not.toBe(0);
      });
    });
  });

  describe('default behavior', () => {
    it('defaults to list subcommand when called without subcommand', async () => {
      // Initialize first
      await sandbox.ada(['init']);

      const explicitList = await sandbox.ada(['insights', 'list']);
      const implicit = await sandbox.ada(['insights']);

      // Both should behave similarly
      expect(explicitList.exitCode).toBe(implicit.exitCode);
    });
  });
});
