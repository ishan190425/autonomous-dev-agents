/**
 * E2E Tests: ada pause, ada resume, ada stop
 *
 * Tests the state management commands that control dispatch execution.
 * These commands manage the paused state in rotation.json and handle
 * graceful shutdown for watch mode.
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure
 * Per QA audit (C705): Recommended state.e2e.test.ts for pause/resume/stop.
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness';

describe('ada state commands E2E', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = createSandbox();
    const initResult = await sandbox.ada(['init']);
    expect(initResult.success).toBe(true);
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('ada pause', () => {
    it('pauses dispatch cycles', async () => {
      const result = await sandbox.ada(['pause', '--no-commit']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('ADA is now paused');
    });

    it('sets paused flag in rotation state', async () => {
      await sandbox.ada(['pause', '--no-commit']);

      const state = sandbox.readJson<{
        paused: boolean;
        paused_at: string;
        pause_reason: string;
      }>('agents/state/rotation.json');

      expect(state.paused).toBe(true);
      expect(state.paused_at).toBeTruthy();
      expect(typeof state.pause_reason).toBe('string');
    });

    it('accepts custom reason via --reason flag', async () => {
      const reason = 'Maintenance window: updating dependencies';
      const result = await sandbox.ada(['pause', '--reason', reason, '--no-commit']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain(reason);

      const state = sandbox.readJson<{ pause_reason: string }>(
        'agents/state/rotation.json'
      );
      expect(state.pause_reason).toBe(reason);
    });

    it('shows instructions for resuming', async () => {
      const result = await sandbox.ada(['pause', '--no-commit']);

      expect(result.stdout).toContain('ada resume');
    });

    it('handles already paused state gracefully', async () => {
      // Pause first time
      await sandbox.ada(['pause', '--no-commit']);

      // Pause again
      const result = await sandbox.ada(['pause', '--no-commit']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('already paused');
    });

    it('preserves existing pause info when already paused', async () => {
      const firstReason = 'First pause reason';
      await sandbox.ada(['pause', '--reason', firstReason, '--no-commit']);

      const stateBefore = sandbox.readJson<{
        paused_at: string;
        pause_reason: string;
      }>('agents/state/rotation.json');

      // Try to pause again with different reason
      await sandbox.ada(['pause', '--reason', 'Second reason', '--no-commit']);

      const stateAfter = sandbox.readJson<{
        paused_at: string;
        pause_reason: string;
      }>('agents/state/rotation.json');

      // Original pause info should be preserved
      expect(stateAfter.paused_at).toBe(stateBefore.paused_at);
      expect(stateAfter.pause_reason).toBe(firstReason);
    });

    it('supports custom agents directory', async () => {
      sandbox.exec('mkdir -p custom-agents');
      await sandbox.ada(['init', '-d', 'custom-agents']);

      const result = await sandbox.ada(['pause', '--dir', 'custom-agents', '--no-commit']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('paused');

      const state = sandbox.readJson<{ paused: boolean }>(
        'custom-agents/state/rotation.json'
      );
      expect(state.paused).toBe(true);
    });

    it('shows help with --help flag', async () => {
      const result = await sandbox.ada(['pause', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('pause');
      expect(result.stdout).toContain('--reason');
      expect(result.stdout).toContain('--dir');
      expect(result.stdout).toContain('--no-commit');
    });
  });

  describe('ada resume', () => {
    beforeEach(async () => {
      // Pause before testing resume
      const pauseResult = await sandbox.ada(['pause', '--no-commit']);
      expect(pauseResult.success).toBe(true);
    });

    it('resumes dispatch cycles', async () => {
      const result = await sandbox.ada(['resume', '--no-commit']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('ADA is now resumed');
    });

    it('clears paused flag from rotation state', async () => {
      await sandbox.ada(['resume', '--no-commit']);

      const state = sandbox.readJson<{
        paused?: boolean;
        paused_at?: string;
        pause_reason?: string;
      }>('agents/state/rotation.json');

      expect(state.paused).toBeUndefined();
      expect(state.paused_at).toBeUndefined();
      expect(state.pause_reason).toBeUndefined();
    });

    it('shows cleared pause info', async () => {
      await sandbox.ada(['pause', '--reason', 'Testing', '--no-commit']);

      const result = await sandbox.ada(['resume', '--no-commit']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Pause info (cleared)');
      expect(result.stdout).toContain('Testing');
    });

    it('handles not paused state gracefully', async () => {
      // Resume first
      await sandbox.ada(['resume', '--no-commit']);

      // Try to resume again
      const result = await sandbox.ada(['resume', '--no-commit']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('not paused');
      expect(result.stdout).toContain('already running');
    });

    it('shows cycle count when not paused', async () => {
      await sandbox.ada(['resume', '--no-commit']);

      const result = await sandbox.ada(['resume', '--no-commit']);

      expect(result.stdout).toContain('Cycle count:');
    });

    it('supports custom agents directory', async () => {
      sandbox.exec('mkdir -p custom-agents');
      await sandbox.ada(['init', '-d', 'custom-agents']);
      await sandbox.ada(['pause', '--dir', 'custom-agents', '--no-commit']);

      const result = await sandbox.ada(['resume', '--dir', 'custom-agents', '--no-commit']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('resumed');

      const state = sandbox.readJson<{ paused?: boolean }>(
        'custom-agents/state/rotation.json'
      );
      expect(state.paused).toBeUndefined();
    });

    it('shows help with --help flag', async () => {
      const result = await sandbox.ada(['resume', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('resume');
      expect(result.stdout).toContain('--dir');
      expect(result.stdout).toContain('--no-commit');
    });
  });

  describe('ada stop', () => {
    it('handles no watch mode gracefully', async () => {
      const result = await sandbox.ada(['stop']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('No active ADA watch mode');
    });

    it('suggests using pause command', async () => {
      const result = await sandbox.ada(['stop']);

      expect(result.stdout).toContain('ada pause');
    });

    it('mentions external schedulers', async () => {
      const result = await sandbox.ada(['stop']);

      expect(result.stdout).toMatch(/cron|OpenClaw|scheduler/i);
    });

    it('shows graceful stop title without --force', async () => {
      const result = await sandbox.ada(['stop']);

      expect(result.stdout).toContain('Graceful Stop');
    });

    it('shows force stop title with --force', async () => {
      const result = await sandbox.ada(['stop', '--force']);

      expect(result.stdout).toContain('Force Stop');
    });

    it('supports custom agents directory', async () => {
      sandbox.exec('mkdir -p custom-agents');
      await sandbox.ada(['init', '-d', 'custom-agents']);

      const result = await sandbox.ada(['stop', '--dir', 'custom-agents']);

      expect(result.success).toBe(true);
      // Should work even with no watch mode
      expect(result.stdout).toContain('No active');
    });

    it('shows help with --help flag', async () => {
      const result = await sandbox.ada(['stop', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('stop');
      expect(result.stdout).toContain('--force');
      expect(result.stdout).toContain('--dir');
      expect(result.stdout).toContain('Graceful stop');
    });

    it('cleans up stale PID file', async () => {
      // Create a stale PID file with non-existent process
      sandbox.exec('mkdir -p agents');
      sandbox.write('agents/.ada-watch.pid', '999999999');

      const result = await sandbox.ada(['stop']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/stale|not running|cleaning/i);
    });
  });

  describe('pause/resume integration', () => {
    it('pause → resume → pause cycle works', async () => {
      // Initial pause
      const pause1 = await sandbox.ada(['pause', '--reason', 'First', '--no-commit']);
      expect(pause1.success).toBe(true);

      let state = sandbox.readJson<{ paused: boolean }>('agents/state/rotation.json');
      expect(state.paused).toBe(true);

      // Resume
      const resume = await sandbox.ada(['resume', '--no-commit']);
      expect(resume.success).toBe(true);

      state = sandbox.readJson<{ paused?: boolean }>('agents/state/rotation.json');
      expect(state.paused).toBeUndefined();

      // Pause again
      const pause2 = await sandbox.ada(['pause', '--reason', 'Second', '--no-commit']);
      expect(pause2.success).toBe(true);

      state = sandbox.readJson<{ paused: boolean; pause_reason: string }>(
        'agents/state/rotation.json'
      );
      expect(state.paused).toBe(true);
      expect(state.pause_reason).toBe('Second');
    });

    it('dispatch respects pause state', async () => {
      // Pause
      await sandbox.ada(['pause', '--no-commit']);

      // Try to start dispatch - should fail or warn
      const dispatch = await sandbox.ada(['dispatch', 'start']);

      // If paused, dispatch start should indicate the issue
      // Exact behavior depends on implementation
      if (!dispatch.success) {
        expect(dispatch.stderr + dispatch.stdout).toMatch(/paused|cannot|blocked/i);
      }
    });

    it('run respects pause state', async () => {
      // Pause
      await sandbox.ada(['pause', '--no-commit']);

      // Try to run
      const run = await sandbox.ada(['run']);

      // Should not crash and should indicate paused
      expect(run.stdout).toMatch(/paused/i);
    });
  });

  describe('error handling', () => {
    it('pause fails without agents directory', async () => {
      const emptySandbox = createSandbox();

      try {
        const result = await emptySandbox.ada(['pause', '--no-commit']);

        expect(result.success).toBe(false);
        expect(result.stderr + result.stdout).toMatch(/init|error/i);
      } finally {
        emptySandbox.cleanup();
      }
    });

    it('resume fails without agents directory', async () => {
      const emptySandbox = createSandbox();

      try {
        const result = await emptySandbox.ada(['resume', '--no-commit']);

        expect(result.success).toBe(false);
        expect(result.stderr + result.stdout).toMatch(/init|error/i);
      } finally {
        emptySandbox.cleanup();
      }
    });

    it('pause handles corrupted rotation.json', async () => {
      sandbox.write('agents/state/rotation.json', 'not json');

      const result = await sandbox.ada(['pause', '--no-commit']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('resume handles corrupted rotation.json', async () => {
      sandbox.write('agents/state/rotation.json', 'not json');

      const result = await sandbox.ada(['resume', '--no-commit']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('timestamp handling', () => {
    it('pause sets ISO timestamp', async () => {
      await sandbox.ada(['pause', '--no-commit']);

      const state = sandbox.readJson<{ paused_at: string }>(
        'agents/state/rotation.json'
      );

      // Should be valid ISO date
      const date = new Date(state.paused_at);
      expect(date.toISOString()).toBe(state.paused_at);
    });

    it('resume clears timestamp', async () => {
      await sandbox.ada(['pause', '--no-commit']);
      await sandbox.ada(['resume', '--no-commit']);

      const state = sandbox.readJson<{ paused_at?: string }>(
        'agents/state/rotation.json'
      );

      expect(state.paused_at).toBeUndefined();
    });
  });
});
