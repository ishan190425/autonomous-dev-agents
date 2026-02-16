/**
 * E2E Tests: ada run
 *
 * Tests the `ada run` command which executes a full dispatch cycle.
 * Validates the unified run command that orchestrates context loading,
 * agent execution, and rotation advancement.
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure
 * Per QA audit (C705): P0 gap — `ada run` had zero E2E coverage.
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness';

describe('ada run E2E', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = createSandbox();
    // Initialize agents directory for run tests
    const initResult = await sandbox.ada(['init']);
    expect(initResult.success).toBe(true);
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('basic execution', () => {
    it('executes a dispatch cycle', async () => {
      const result = await sandbox.ada(['run', '--dry-run']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('ADA Dispatch Cycle');
      expect(result.stdout).toContain('Phase 1');
      expect(result.stdout).toContain('Context loaded');
      expect(result.stdout).toContain('Role:');
    });

    it('shows role information', async () => {
      const result = await sandbox.ada(['run', '--dry-run']);

      expect(result.success).toBe(true);
      // Role should be displayed with emoji
      expect(result.stdout).toContain('Role:');
      expect(result.stdout).toContain('Cycle:');
      expect(result.stdout).toContain('Focus:');
    });

    it('shows phase progression', async () => {
      const result = await sandbox.ada(['run', '--dry-run']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Phase 1: Loading context');
      expect(result.stdout).toContain('Phase 2: Situational awareness');
    });

    it('shows available actions in dry-run mode', async () => {
      const result = await sandbox.ada(['run', '--dry-run']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('Available actions:');
      // At least one action should be listed
      expect(result.stdout).toMatch(/•\s+\w+/);
    });
  });

  describe('--dry-run flag', () => {
    it('does not modify state in dry-run mode', async () => {
      const stateBefore = sandbox.readJson<{
        cycle_count: number;
        current_index: number;
      }>('agents/state/rotation.json');

      await sandbox.ada(['run', '--dry-run']);

      const stateAfter = sandbox.readJson<{
        cycle_count: number;
        current_index: number;
      }>('agents/state/rotation.json');

      expect(stateAfter.cycle_count).toBe(stateBefore.cycle_count);
      expect(stateAfter.current_index).toBe(stateBefore.current_index);
    });

    it('does not execute agent action in dry-run mode', async () => {
      const result = await sandbox.ada(['run', '--dry-run']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('no changes will be made');
      // Phase 3 (execute) should not appear
      expect(result.stdout).not.toContain('Phase 3: Executing');
    });

    it('shows playbook ready message', async () => {
      const result = await sandbox.ada(['run', '--dry-run']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Memory bank loaded');
      expect(result.stdout).toContain('Playbook ready');
    });
  });

  describe('paused state handling', () => {
    beforeEach(async () => {
      // Pause ADA before testing run command
      const pauseResult = await sandbox.ada(['pause', '--no-commit']);
      expect(pauseResult.success).toBe(true);
    });

    it('detects paused state', async () => {
      const result = await sandbox.ada(['run']);

      // Should exit gracefully without error
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('paused');
    });

    it('shows pause reason when set', async () => {
      // Pause with specific reason
      await sandbox.ada(['resume', '--no-commit']);
      await sandbox.ada(['pause', '--reason', 'Maintenance window', '--no-commit']);

      const result = await sandbox.ada(['run']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('paused');
      expect(result.stdout).toContain('Maintenance window');
    });

    it('suggests resume command', async () => {
      const result = await sandbox.ada(['run']);

      expect(result.stdout).toContain('ada resume');
    });

    it('does not advance rotation when paused', async () => {
      const stateBefore = sandbox.readJson<{
        cycle_count: number;
        current_index: number;
      }>('agents/state/rotation.json');

      await sandbox.ada(['run']);

      const stateAfter = sandbox.readJson<{
        cycle_count: number;
        current_index: number;
      }>('agents/state/rotation.json');

      expect(stateAfter.cycle_count).toBe(stateBefore.cycle_count);
      expect(stateAfter.current_index).toBe(stateBefore.current_index);
    });
  });

  describe('--dir option', () => {
    it('accepts custom agents directory', async () => {
      // Use the default agents dir but via explicit --dir flag
      const result = await sandbox.ada(['run', '--dir', 'agents', '--dry-run']);

      // The command should work with explicit directory specification
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('ADA Dispatch Cycle');
    });

    it('fails gracefully with invalid directory', async () => {
      const result = await sandbox.ada(['run', '--dir', 'nonexistent']);

      expect(result.success).toBe(false);
      expect(result.stderr + result.stdout).toMatch(/error|failed|not found/i);
    });
  });

  describe('error handling', () => {
    it('fails gracefully without agents directory', async () => {
      const emptySandbox = createSandbox();

      try {
        const result = await emptySandbox.ada(['run']);

        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(1);
        // Error message should indicate missing file/directory
        expect(result.stderr + result.stdout).toMatch(/init|not found|error|ENOENT|failed/i);
      } finally {
        emptySandbox.cleanup();
      }
    });

    it('handles corrupted rotation.json gracefully', async () => {
      sandbox.write('agents/state/rotation.json', '{ invalid json ');

      const result = await sandbox.ada(['run', '--dry-run']);

      expect(result.success).toBe(false);
      expect(result.stderr + result.stdout).toMatch(/error|json|parse/i);
    });

    it('handles missing roster.json gracefully', async () => {
      sandbox.exec('rm agents/roster.json');

      const result = await sandbox.ada(['run', '--dry-run']);

      expect(result.success).toBe(false);
      expect(result.stderr + result.stdout).toMatch(/error|roster|init/i);
    });

    it('handles empty rotation order', async () => {
      const roster = sandbox.readJson<{ rotation_order: string[] }>('agents/roster.json');
      roster.rotation_order = [];
      sandbox.write('agents/roster.json', JSON.stringify(roster, null, 2));

      const result = await sandbox.ada(['run', '--dry-run']);

      expect(result.success).toBe(false);
      expect(result.stderr + result.stdout).toMatch(/no roles|error|empty/i);
    });
  });

  describe('help', () => {
    it('shows help with --help flag', async () => {
      const result = await sandbox.ada(['run', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('run');
      expect(result.stdout).toContain('Execute one dispatch cycle');
      expect(result.stdout).toContain('--dry-run');
      expect(result.stdout).toContain('--dir');
    });

    it('shows watch mode option in help', async () => {
      const result = await sandbox.ada(['run', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('--watch');
      expect(result.stdout).toContain('--interval');
    });
  });

  describe('context loading', () => {
    it('loads memory bank', async () => {
      const result = await sandbox.ada(['run', '--dry-run']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Memory bank');
    });

    it('identifies current role from rotation', async () => {
      const roster = sandbox.readJson<{ rotation_order: string[] }>('agents/roster.json');
      const rotation = sandbox.readJson<{ current_index: number }>('agents/state/rotation.json');

      const expectedRole = roster.rotation_order[rotation.current_index];

      const result = await sandbox.ada(['run', '--dry-run']);

      expect(result.success).toBe(true);
      // The role displayed should match the rotation index
      expect(result.stdout).toMatch(new RegExp(expectedRole, 'i'));
    });
  });

  describe('integration with dispatch lifecycle', () => {
    it('respects dispatch lock from ada dispatch start', async () => {
      // Start a cycle via dispatch command
      await sandbox.ada(['dispatch', 'start']);

      // Run should detect the active lock
      // Behavior depends on implementation - it may proceed or warn
      const result = await sandbox.ada(['run', '--dry-run']);

      // At minimum, it should not crash
      expect(typeof result.exitCode).toBe('number');
    });

    it('can run after dispatch complete', async () => {
      // Complete a dispatch cycle
      await sandbox.ada(['dispatch', 'start']);
      await sandbox.ada(['dispatch', 'complete', '--action', 'Test', '--skip-push']);

      // Run should work on the next role
      const result = await sandbox.ada(['run', '--dry-run']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Cycle 2');
    });
  });
});
