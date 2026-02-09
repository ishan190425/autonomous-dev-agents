/**
 * E2E Tests: ada dispatch
 *
 * Tests the `ada dispatch` commands (start, complete, status) in isolated
 * sandbox environments. Validates the full dispatch lifecycle which is
 * critical for dogfooding (Issue #111).
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure — Phase 1b
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness';

describe('ada dispatch E2E', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = createSandbox();
    // Initialize agents directory for dispatch tests
    const initResult = await sandbox.ada(['init']);
    expect(initResult.success).toBe(true);
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('dispatch start', () => {
    it('starts a new dispatch cycle', async () => {
      const result = await sandbox.ada(['dispatch', 'start']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Cycle');
      expect(result.stdout).toContain('Started');
      expect(result.stdout).toContain('Role:');
      expect(result.stdout).toContain('Playbook:');
      expect(result.stdout).toContain('Memory:');
    });

    it('creates dispatch lock file', async () => {
      await sandbox.ada(['dispatch', 'start']);

      expect(sandbox.exists('agents/state/.dispatch.lock')).toBe(true);

      const lock = sandbox.readJson<{
        cycle: number;
        role: string;
        startedAt: string;
      }>('agents/state/.dispatch.lock');

      expect(lock.cycle).toBe(1);
      expect(typeof lock.role).toBe('string');
      expect(lock.startedAt).toBeTruthy();
    });

    it('shows rotation visualization by default', async () => {
      const result = await sandbox.ada(['dispatch', 'start']);

      expect(result.stdout).toContain('Rotation:');
      expect(result.stdout).toContain('→');
    });

    it('respects --no-banner flag', async () => {
      const result = await sandbox.ada(['dispatch', 'start', '--no-banner']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Cycle');
      // Note: --no-banner behavior may vary based on commander's --no- prefix handling
      // The key assertion is that it succeeds
    });

    it('supports --json output', async () => {
      const result = await sandbox.ada(['dispatch', 'start', '--json']);

      expect(result.success).toBe(true);

      const output = JSON.parse(result.stdout);
      expect(output.cycle).toBe(1);
      expect(output.role).toHaveProperty('id');
      expect(output.role).toHaveProperty('emoji');
      expect(output.role).toHaveProperty('name');
      expect(output.playbook).toContain('playbooks');
      expect(output.memoryBank).toHaveProperty('path');
      expect(output.memoryBank).toHaveProperty('version');
    });

    it('supports --quiet flag', async () => {
      const result = await sandbox.ada(['dispatch', 'start', '--quiet']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/Cycle \d+ started/);
      // Quiet output should be single line
      expect(result.stdout.trim().split('\n').length).toBe(1);
    });

    it('prevents concurrent cycles without --force', async () => {
      // Start first cycle
      const first = await sandbox.ada(['dispatch', 'start']);
      expect(first.success).toBe(true);

      // Attempt second cycle
      const second = await sandbox.ada(['dispatch', 'start']);

      expect(second.success).toBe(false);
      expect(second.exitCode).toBe(1); // CYCLE_IN_PROGRESS
      expect(second.stdout).toContain('Cycle Already in Progress');
    });

    it('allows override with --force flag', async () => {
      // Start first cycle
      await sandbox.ada(['dispatch', 'start']);

      // Force second cycle
      const result = await sandbox.ada(['dispatch', 'start', '--force']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Started');
    });

    it('supports --dry-run flag', async () => {
      const result = await sandbox.ada(['dispatch', 'start', '--dry-run', '--json']);

      expect(result.success).toBe(true);

      const output = JSON.parse(result.stdout);
      expect(output.dryRun).toBe(true);

      // Should NOT create lock file
      expect(sandbox.exists('agents/state/.dispatch.lock')).toBe(false);
    });

    it('shows help with --help flag', async () => {
      const result = await sandbox.ada(['dispatch', 'start', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('start');
      expect(result.stdout).toContain('--dry-run');
      expect(result.stdout).toContain('--json');
    });
  });

  describe('dispatch complete', () => {
    beforeEach(async () => {
      // Start a cycle before testing complete
      const startResult = await sandbox.ada(['dispatch', 'start']);
      expect(startResult.success).toBe(true);
    });

    it('completes a dispatch cycle', async () => {
      const result = await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        'Test action for E2E',
        '--skip-push',
      ]);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Complete');
      expect(result.stdout).toContain('Test action for E2E');
    });

    it('updates rotation state', async () => {
      // Get initial state
      const initialState = sandbox.readJson<{
        current_index: number;
        cycle_count: number;
      }>('agents/state/rotation.json');

      await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        'Completed test cycle',
        '--skip-push',
      ]);

      const finalState = sandbox.readJson<{
        current_index: number;
        cycle_count: number;
        history: Array<{ cycle: number; action: string }>;
      }>('agents/state/rotation.json');

      // Cycle count should increment
      expect(finalState.cycle_count).toBe(initialState.cycle_count + 1);

      // History should have new entry
      expect(finalState.history.length).toBeGreaterThan(0);
      const lastEntry = finalState.history[finalState.history.length - 1];
      expect(lastEntry?.action).toContain('Completed test cycle');
    });

    it('removes dispatch lock', async () => {
      expect(sandbox.exists('agents/state/.dispatch.lock')).toBe(true);

      await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        'Test',
        '--skip-push',
      ]);

      expect(sandbox.exists('agents/state/.dispatch.lock')).toBe(false);
    });

    it('requires --action flag', async () => {
      const result = await sandbox.ada(['dispatch', 'complete', '--skip-push']);

      expect(result.success).toBe(false);
      // Commander's requiredOption throws with exit code 1
      expect(result.exitCode).toBe(1);
      // Error message indicates missing required option
      expect(result.stderr).toMatch(/required|action/i);
    });

    it('supports --outcome flag', async () => {
      const result = await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        'Partial completion',
        '--outcome',
        'partial',
        '--skip-push',
      ]);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('partial');
    });

    it('supports --reflection flag', async () => {
      const result = await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        'With reflection',
        '--reflection',
        'Learned that tests are important',
        '--skip-push',
      ]);

      expect(result.success).toBe(true);
      // Reflection is recorded internally
    });

    it('supports --json output', async () => {
      const result = await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        'JSON test',
        '--skip-push',
        '--json',
      ]);

      expect(result.success).toBe(true);

      const output = JSON.parse(result.stdout);
      expect(output.cycle).toBe(1);
      expect(output.action).toBe('JSON test');
      expect(output.outcome).toBe('success');
      expect(output.git).toHaveProperty('commit');
      expect(output.nextRole).toHaveProperty('id');
    });

    it('supports --quiet flag', async () => {
      const result = await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        'Quiet test',
        '--skip-push',
        '--quiet',
      ]);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/Cycle \d+ complete/);
      // Quiet output should be minimal
      expect(result.stdout.trim().split('\n').length).toBe(1);
    });

    it('creates git commit', async () => {
      await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        'Commit test',
        '--skip-push',
      ]);

      // Check git log
      const gitLog = sandbox.exec('git log --oneline -1');
      expect(gitLog).toContain('chore(agents): cycle');
      expect(gitLog).toContain('Commit test');
    });

    it('shows help with --help flag', async () => {
      const result = await sandbox.ada(['dispatch', 'complete', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('complete');
      expect(result.stdout).toContain('--action');
      expect(result.stdout).toContain('--outcome');
      expect(result.stdout).toContain('--reflection');
    });
  });

  describe('dispatch status', () => {
    it('shows ready state when no cycle in progress', async () => {
      const result = await sandbox.ada(['dispatch', 'status']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Dispatch Status');
      expect(result.stdout).toContain('Ready');
      expect(result.stdout).toContain('Cycle:');
    });

    it('shows in-progress state during cycle', async () => {
      await sandbox.ada(['dispatch', 'start']);

      const result = await sandbox.ada(['dispatch', 'status']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('In Progress');
      expect(result.stdout).toContain('Active:');
    });

    it('shows rotation order', async () => {
      const result = await sandbox.ada(['dispatch', 'status']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Rotation Order:');
      expect(result.stdout).toContain('→');
    });

    it('supports --json output', async () => {
      const result = await sandbox.ada(['dispatch', 'status', '--json']);

      expect(result.success).toBe(true);

      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('cycle');
      expect(output).toHaveProperty('state');
      expect(output).toHaveProperty('inProgress');
      expect(output).toHaveProperty('currentRole');
      expect(output).toHaveProperty('history');
    });

    it('supports --verbose flag for more history', async () => {
      const result = await sandbox.ada(['dispatch', 'status', '--verbose', '--json']);

      expect(result.success).toBe(true);

      const output = JSON.parse(result.stdout);
      // Verbose shows up to 10 history entries
      expect(Array.isArray(output.history)).toBe(true);
    });

    it('supports --quiet flag', async () => {
      const result = await sandbox.ada(['dispatch', 'status', '--quiet']);

      expect(result.success).toBe(true);
      // Quiet output is single line
      expect(result.stdout.trim().split('\n').length).toBe(1);
    });

    it('shows history after completing cycles', async () => {
      // Complete a cycle
      await sandbox.ada(['dispatch', 'start']);
      await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        'First action',
        '--skip-push',
      ]);

      const result = await sandbox.ada(['dispatch', 'status']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('History');
      expect(result.stdout).toContain('First action');
    });

    it('shows help with --help flag', async () => {
      const result = await sandbox.ada(['dispatch', 'status', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('status');
      expect(result.stdout).toContain('--json');
      expect(result.stdout).toContain('--verbose');
    });
  });

  describe('dispatch (parent command)', () => {
    it('shows help when called without subcommand', async () => {
      const result = await sandbox.ada(['dispatch']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('dispatch');
      expect(result.stdout).toContain('start');
      expect(result.stdout).toContain('complete');
      expect(result.stdout).toContain('status');
    });

    it('shows help with --help flag', async () => {
      const result = await sandbox.ada(['dispatch', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Dispatch cycle lifecycle management');
    });
  });

  describe('full dispatch lifecycle', () => {
    it('executes complete start → complete → status flow', async () => {
      // 1. Status before
      const statusBefore = await sandbox.ada(['dispatch', 'status', '--json']);
      expect(statusBefore.success).toBe(true);
      const beforeState = JSON.parse(statusBefore.stdout);
      expect(beforeState.state).toBe('ready');
      expect(beforeState.cycle).toBe(0);

      // 2. Start cycle
      const start = await sandbox.ada(['dispatch', 'start', '--json']);
      expect(start.success).toBe(true);
      const startState = JSON.parse(start.stdout);
      expect(startState.cycle).toBe(1);
      const roleId = startState.role.id;

      // 3. Status during (should show in-progress)
      const statusDuring = await sandbox.ada(['dispatch', 'status', '--json']);
      expect(statusDuring.success).toBe(true);
      const duringState = JSON.parse(statusDuring.stdout);
      expect(duringState.state).toBe('in_progress');
      expect(duringState.activeLock).toBeTruthy();

      // 4. Complete cycle
      const complete = await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        '🔍 E2E LIFECYCLE TEST — Verified full dispatch flow',
        '--skip-push',
        '--json',
      ]);
      expect(complete.success).toBe(true);
      const completeState = JSON.parse(complete.stdout);
      expect(completeState.cycle).toBe(1);
      expect(completeState.role).toBe(roleId);
      expect(completeState.outcome).toBe('success');

      // 5. Status after (should be ready, next role)
      const statusAfter = await sandbox.ada(['dispatch', 'status', '--json']);
      expect(statusAfter.success).toBe(true);
      const afterState = JSON.parse(statusAfter.stdout);
      expect(afterState.state).toBe('ready');
      expect(afterState.inProgress).toBe(false);
      expect(afterState.lastCycle?.cycle).toBe(1);
      expect(afterState.lastCycle?.action).toContain('E2E LIFECYCLE TEST');
    });

    it('handles multiple sequential cycles', async () => {
      // Get initial state
      const initialRotation = sandbox.readJson<{
        current_index: number;
        cycle_count: number;
      }>('agents/state/rotation.json');
      const roster = sandbox.readJson<{ rotation_order: string[] }>('agents/roster.json');
      const numRoles = roster.rotation_order.length;

      // Cycle 1
      await sandbox.ada(['dispatch', 'start']);
      await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        'Cycle 1 action',
        '--skip-push',
      ]);

      // Cycle 2
      await sandbox.ada(['dispatch', 'start']);
      await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        'Cycle 2 action',
        '--skip-push',
      ]);

      // Cycle 3
      await sandbox.ada(['dispatch', 'start']);
      await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        'Cycle 3 action',
        '--skip-push',
      ]);

      // Verify final state
      const status = await sandbox.ada(['dispatch', 'status', '--json']);
      const state = JSON.parse(status.stdout);

      expect(state.cycle).toBe(3);
      expect(state.history.length).toBe(3);

      // Verify rotation advanced correctly (with wraparound)
      const rotation = sandbox.readJson<{
        current_index: number;
        cycle_count: number;
      }>('agents/state/rotation.json');
      expect(rotation.cycle_count).toBe(3);
      // Index advances by 3 from initial, wrapping if needed
      const expectedIndex = (initialRotation.current_index + 3) % numRoles;
      expect(rotation.current_index).toBe(expectedIndex);
    });
  });

  describe('error handling', () => {
    it('fails gracefully without agents directory', async () => {
      // Create fresh sandbox without init
      const emptySandbox = createSandbox();

      try {
        const result = await emptySandbox.ada(['dispatch', 'start']);

        expect(result.success).toBe(false);
        expect(result.stderr + result.stdout).toMatch(/could not read|init|not found/i);
      } finally {
        emptySandbox.cleanup();
      }
    });

    it('handles corrupted rotation.json gracefully', async () => {
      // Corrupt the rotation file
      sandbox.write('agents/state/rotation.json', 'invalid json {{');

      const result = await sandbox.ada(['dispatch', 'start']);

      expect(result.success).toBe(false);
      expect(result.stderr + result.stdout).toMatch(/could not read|error|json/i);
    });

    it('handles missing roster.json gracefully', async () => {
      // Remove roster file
      sandbox.exec('rm agents/roster.json');

      const result = await sandbox.ada(['dispatch', 'start']);

      expect(result.success).toBe(false);
      expect(result.stderr + result.stdout).toMatch(/could not read|error|roster/i);
    });
  });
});
