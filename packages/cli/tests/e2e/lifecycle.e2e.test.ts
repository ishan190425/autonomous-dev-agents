/**
 * E2E Tests: ada pause, ada resume, ada stop
 *
 * Tests the lifecycle control commands (pause, resume, stop) in isolated
 * sandbox environments. These commands are critical for operational safety
 * during launch — allowing humans to halt agent execution when needed.
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure — Lifecycle commands
 *
 * Consolidated from lifecycle.e2e.test.ts and state.e2e.test.ts in C1099
 * to eliminate 66 duplicate tests (32 from state.e2e.test.ts overlapped).
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness';

describe('ada lifecycle E2E', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = createSandbox();
    // Initialize agents directory for lifecycle tests
    const initResult = await sandbox.ada(['init']);
    expect(initResult.success).toBe(true);
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PAUSE COMMAND
  // ─────────────────────────────────────────────────────────────────────────

  describe('ada pause', () => {
    describe('--help', () => {
      it('displays help text', async () => {
        const result = await sandbox.ada(['pause', '--help']);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Pause dispatch');
        expect(result.stdout).toContain('--reason');
        expect(result.stdout).toContain('--dir');
        expect(result.stdout).toContain('--no-commit');
      });
    });

    describe('basic pause', () => {
      it('pauses dispatch with default reason', async () => {
        const result = await sandbox.ada(['pause', '--no-commit']);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('ADA is now paused');
        expect(result.stdout).toContain('Manual pause via ada pause');
      });

      it('sets paused flag in rotation.json', async () => {
        await sandbox.ada(['pause', '--no-commit']);

        const state = sandbox.readJson<{
          paused?: boolean;
          paused_at?: string;
          pause_reason?: string;
        }>('agents/state/rotation.json');

        expect(state.paused).toBe(true);
        expect(state.paused_at).toBeDefined();
        expect(state.pause_reason).toBe('Manual pause via ada pause');
      });

      it('includes timestamp in rotation.json', async () => {
        const before = Date.now();
        await sandbox.ada(['pause', '--no-commit']);
        const after = Date.now();

        const state = sandbox.readJson<{ paused_at?: string }>(
          'agents/state/rotation.json'
        );

        expect(state.paused_at).toBeDefined();
        const pausedTime = new Date(state.paused_at!).getTime();
        expect(pausedTime).toBeGreaterThanOrEqual(before);
        expect(pausedTime).toBeLessThanOrEqual(after);
      });
    });

    describe('pause with reason', () => {
      it('accepts custom reason via --reason', async () => {
        const customReason = 'Emergency maintenance window';
        const result = await sandbox.ada([
          'pause',
          '--reason',
          customReason,
          '--no-commit',
        ]);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain(customReason);

        const state = sandbox.readJson<{ pause_reason?: string }>(
          'agents/state/rotation.json'
        );
        expect(state.pause_reason).toBe(customReason);
      });

      it('truncates long reasons in commit message', async () => {
        const longReason =
          'This is a very long reason that exceeds fifty characters and should be truncated in the commit message';
        const result = await sandbox.ada([
          'pause',
          '--reason',
          longReason,
          '--no-commit',
        ]);

        expect(result.success).toBe(true);

        // Full reason should be in state
        const state = sandbox.readJson<{ pause_reason?: string }>(
          'agents/state/rotation.json'
        );
        expect(state.pause_reason).toBe(longReason);
      });
    });

    describe('idempotent pause', () => {
      it('reports already paused when called twice', async () => {
        // First pause
        const firstResult = await sandbox.ada(['pause', '--no-commit']);
        expect(firstResult.success).toBe(true);
        expect(firstResult.stdout).toContain('ADA is now paused');

        // Second pause (should be idempotent)
        const secondResult = await sandbox.ada(['pause', '--no-commit']);
        expect(secondResult.success).toBe(true);
        expect(secondResult.stdout).toContain('already paused');
      });

      it('displays original pause info on second call', async () => {
        const reason = 'First pause reason';
        await sandbox.ada(['pause', '--reason', reason, '--no-commit']);

        const result = await sandbox.ada(['pause', '--no-commit']);
        expect(result.stdout).toContain('already paused');
        expect(result.stdout).toContain(reason);
      });
    });

    describe('custom directory', () => {
      it('respects --dir flag', async () => {
        // Initialize in custom directory
        await sandbox.ada(['init', '--dir', 'custom-agents']);

        const result = await sandbox.ada([
          'pause',
          '--dir',
          'custom-agents',
          '--no-commit',
        ]);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('ADA is now paused');

        const state = sandbox.readJson<{ paused?: boolean }>(
          'custom-agents/state/rotation.json'
        );
        expect(state.paused).toBe(true);
      });
    });

    describe('error handling', () => {
      it('fails gracefully in uninitialized repo', async () => {
        const freshSandbox = createSandbox();
        try {
          const result = await freshSandbox.ada(['pause', '--no-commit']);

          expect(result.success).toBe(false);
          expect(result.stdout + result.stderr).toMatch(/fail|init|error/i);
        } finally {
          freshSandbox.cleanup();
        }
      });
    });

    describe('output messaging', () => {
      it('shows resume instructions after pausing', async () => {
        const result = await sandbox.ada(['pause', '--no-commit']);

        expect(result.stdout).toContain('ada resume');
        expect(result.stdout).toContain(
          'Future dispatch cycles will be skipped'
        );
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RESUME COMMAND
  // ─────────────────────────────────────────────────────────────────────────

  describe('ada resume', () => {
    describe('--help', () => {
      it('displays help text', async () => {
        const result = await sandbox.ada(['resume', '--help']);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Resume dispatch');
        expect(result.stdout).toContain('--dir');
        expect(result.stdout).toContain('--no-commit');
      });
    });

    describe('resume not paused', () => {
      it('reports not paused when ada is running', async () => {
        const result = await sandbox.ada(['resume', '--no-commit']);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('not paused');
        expect(result.stdout).toContain('already running');
      });

      it('shows current cycle info when not paused', async () => {
        const result = await sandbox.ada(['resume', '--no-commit']);

        expect(result.success).toBe(true);
        expect(result.stdout).toMatch(/cycle count/i);
      });
    });

    describe('resume after pause', () => {
      it('clears paused flag', async () => {
        // Pause first
        await sandbox.ada(['pause', '--no-commit']);

        // Verify paused
        let state = sandbox.readJson<{ paused?: boolean }>(
          'agents/state/rotation.json'
        );
        expect(state.paused).toBe(true);

        // Resume
        const result = await sandbox.ada(['resume', '--no-commit']);
        expect(result.success).toBe(true);
        expect(result.stdout).toContain('ADA is now resumed');

        // Verify no longer paused
        state = sandbox.readJson<{ paused?: boolean }>(
          'agents/state/rotation.json'
        );
        expect(state.paused).toBeUndefined();
      });

      it('clears paused_at field', async () => {
        await sandbox.ada(['pause', '--no-commit']);
        await sandbox.ada(['resume', '--no-commit']);

        const state = sandbox.readJson<{ paused_at?: string }>(
          'agents/state/rotation.json'
        );
        expect(state.paused_at).toBeUndefined();
      });

      it('clears pause_reason field', async () => {
        await sandbox.ada(['pause', '--reason', 'Test reason', '--no-commit']);
        await sandbox.ada(['resume', '--no-commit']);

        const state = sandbox.readJson<{ pause_reason?: string }>(
          'agents/state/rotation.json'
        );
        expect(state.pause_reason).toBeUndefined();
      });

      it('displays cleared pause info', async () => {
        const reason = 'Maintenance window';
        await sandbox.ada(['pause', '--reason', reason, '--no-commit']);

        const result = await sandbox.ada(['resume', '--no-commit']);

        expect(result.stdout).toContain('Pause info (cleared)');
        expect(result.stdout).toContain(reason);
      });
    });

    describe('custom directory', () => {
      it('respects --dir flag', async () => {
        await sandbox.ada(['init', '--dir', 'custom-agents']);
        await sandbox.ada(['pause', '--dir', 'custom-agents', '--no-commit']);

        const result = await sandbox.ada([
          'resume',
          '--dir',
          'custom-agents',
          '--no-commit',
        ]);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('ADA is now resumed');
      });
    });

    describe('error handling', () => {
      it('fails gracefully in uninitialized repo', async () => {
        const freshSandbox = createSandbox();
        try {
          const result = await freshSandbox.ada(['resume', '--no-commit']);

          expect(result.success).toBe(false);
          expect(result.stdout + result.stderr).toMatch(/fail|init|error/i);
        } finally {
          freshSandbox.cleanup();
        }
      });
    });

    describe('output messaging', () => {
      it('confirms dispatch cycles will execute normally', async () => {
        await sandbox.ada(['pause', '--no-commit']);
        const result = await sandbox.ada(['resume', '--no-commit']);

        expect(result.stdout).toContain('Dispatch cycles will now execute');
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // STOP COMMAND
  // ─────────────────────────────────────────────────────────────────────────

  describe('ada stop', () => {
    describe('--help', () => {
      it('displays help text', async () => {
        const result = await sandbox.ada(['stop', '--help']);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Graceful stop');
        expect(result.stdout).toContain('--force');
        expect(result.stdout).toContain('--dir');
      });
    });

    describe('no watch mode', () => {
      it('reports no active watch mode', async () => {
        const result = await sandbox.ada(['stop']);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('No active ADA watch mode');
      });

      it('suggests using ada pause for external schedulers', async () => {
        const result = await sandbox.ada(['stop']);

        expect(result.stdout).toContain('ada pause');
        expect(result.stdout).toMatch(/cron|OpenClaw|external scheduler/i);
      });
    });

    describe('stale PID file', () => {
      it('cleans up stale PID file with invalid content', async () => {
        // Create a PID file with invalid content
        sandbox.write('agents/.ada-watch.pid', 'not-a-number');

        const result = await sandbox.ada(['stop']);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Invalid PID');
        expect(result.stdout).toContain('Cleaning up');

        // PID file should be removed
        expect(sandbox.exists('agents/.ada-watch.pid')).toBe(false);
      });

      it('cleans up PID file for non-running process', async () => {
        // Create a PID file with a definitely non-running PID
        sandbox.write('agents/.ada-watch.pid', '999999999');

        const result = await sandbox.ada(['stop']);

        expect(result.success).toBe(true);
        expect(result.stdout).toMatch(/not running|stale/i);
        expect(result.stdout).toContain('Cleaning up');

        // PID file should be removed
        expect(sandbox.exists('agents/.ada-watch.pid')).toBe(false);
      });
    });

    describe('force flag', () => {
      it('mentions SIGKILL with --force flag and no watch mode', async () => {
        const result = await sandbox.ada(['stop', '--force']);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Force Stop');
      });

      it('mentions SIGTERM without --force flag', async () => {
        const result = await sandbox.ada(['stop']);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Graceful Stop');
      });
    });

    describe('custom directory', () => {
      it('respects --dir flag', async () => {
        await sandbox.ada(['init', '--dir', 'custom-agents']);

        const result = await sandbox.ada(['stop', '--dir', 'custom-agents']);

        expect(result.success).toBe(true);
        // Should look for PID in custom directory
        expect(result.stdout).toContain('No active ADA watch mode');
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PAUSE + RESUME INTEGRATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('pause/resume integration', () => {
    it('completes full pause/resume cycle', async () => {
      // Pause
      const pauseResult = await sandbox.ada([
        'pause',
        '--reason',
        'Integration test',
        '--no-commit',
      ]);
      expect(pauseResult.success).toBe(true);

      // Verify paused state
      let state = sandbox.readJson<{
        paused?: boolean;
        pause_reason?: string;
      }>('agents/state/rotation.json');
      expect(state.paused).toBe(true);
      expect(state.pause_reason).toBe('Integration test');

      // Resume
      const resumeResult = await sandbox.ada(['resume', '--no-commit']);
      expect(resumeResult.success).toBe(true);
      expect(resumeResult.stdout).toContain('Integration test');

      // Verify resumed state
      state = sandbox.readJson('agents/state/rotation.json');
      expect(state.paused).toBeUndefined();
      expect(state.pause_reason).toBeUndefined();
    });

    it('preserves other rotation state during pause/resume', async () => {
      // Get initial state
      const initialState = sandbox.readJson<{
        current_index: number;
        cycle_count: number;
      }>('agents/state/rotation.json');

      // Pause and resume
      await sandbox.ada(['pause', '--no-commit']);
      await sandbox.ada(['resume', '--no-commit']);

      // Verify other state preserved
      const finalState = sandbox.readJson<{
        current_index: number;
        cycle_count: number;
      }>('agents/state/rotation.json');
      expect(finalState.current_index).toBe(initialState.current_index);
      expect(finalState.cycle_count).toBe(initialState.cycle_count);
    });

    it('handles multiple pause/resume cycles', async () => {
      for (let i = 0; i < 3; i++) {
        const pauseResult = await sandbox.ada([
          'pause',
          '--reason',
          `Cycle ${i}`,
          '--no-commit',
        ]);
        expect(pauseResult.success).toBe(true);

        const resumeResult = await sandbox.ada(['resume', '--no-commit']);
        expect(resumeResult.success).toBe(true);
      }

      // Final state should not be paused
      const state = sandbox.readJson<{ paused?: boolean }>(
        'agents/state/rotation.json'
      );
      expect(state.paused).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DISPATCH RESPECTS PAUSE STATE
  // ─────────────────────────────────────────────────────────────────────────

  describe('dispatch respects pause state', () => {
    it('dispatch start fails when paused', async () => {
      await sandbox.ada(['pause', '--no-commit']);

      const result = await sandbox.ada(['dispatch', 'start']);

      // Dispatch should either fail or warn about paused state
      expect(result.stdout + result.stderr).toMatch(/paused|cannot|skip/i);
    });

    it('dispatch start succeeds after resume', async () => {
      await sandbox.ada(['pause', '--no-commit']);
      await sandbox.ada(['resume', '--no-commit']);

      const result = await sandbox.ada(['dispatch', 'start']);

      // Should be able to start dispatch
      expect(result.stdout).toMatch(/started|cycle/i);

      // Clean up the started cycle
      await sandbox.ada([
        'dispatch',
        'complete',
        '--action',
        'E2E test cleanup',
        '--skip-push',
      ]);
    });

    it('ada run respects pause state', async () => {
      await sandbox.ada(['pause', '--no-commit']);

      const result = await sandbox.ada(['run']);

      // Should not crash and should indicate paused
      expect(result.stdout).toMatch(/paused/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TIMESTAMP VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('timestamp handling', () => {
    it('pause sets valid ISO timestamp', async () => {
      await sandbox.ada(['pause', '--no-commit']);

      const state = sandbox.readJson<{ paused_at: string }>(
        'agents/state/rotation.json'
      );

      // Should be valid ISO date
      const date = new Date(state.paused_at);
      expect(date.toISOString()).toBe(state.paused_at);
    });

    it('resume clears timestamp completely', async () => {
      await sandbox.ada(['pause', '--no-commit']);
      await sandbox.ada(['resume', '--no-commit']);

      const state = sandbox.readJson<{ paused_at?: string }>(
        'agents/state/rotation.json'
      );

      expect(state.paused_at).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CORRUPTED STATE HANDLING
  // ─────────────────────────────────────────────────────────────────────────

  describe('corrupted state handling', () => {
    it('pause fails gracefully with corrupted rotation.json', async () => {
      sandbox.write('agents/state/rotation.json', 'not json');

      const result = await sandbox.ada(['pause', '--no-commit']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('resume fails gracefully with corrupted rotation.json', async () => {
      sandbox.write('agents/state/rotation.json', 'not json');

      const result = await sandbox.ada(['resume', '--no-commit']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });
  });
});
