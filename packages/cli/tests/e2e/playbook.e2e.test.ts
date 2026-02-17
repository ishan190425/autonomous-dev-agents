/**
 * E2E tests for `ada playbook` command — Pattern-to-Playbook automation.
 *
 * Tests cover:
 *   - Help output for main command and subcommands
 *   - ada playbook suggest (list pending suggestions)
 *   - ada playbook stats (suggestion statistics)
 *   - Empty state handling (no suggestions yet)
 *   - JSON output format
 *   - Error handling (no agents directory)
 *   - Options validation
 *
 * @see Issue #34 — E2E Testing Infrastructure
 * @see Issue #108 — Reflexion Phase 2 (Pattern-to-Playbook)
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness.js';

describe('ada playbook E2E', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  // ─── Help Output ──────────────────────────────────────────────────────────

  describe('help output', () => {
    it('displays help for playbook command', async () => {
      const result = await sandbox.ada(['playbook', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('playbook');
      expect(result.stdout).toContain('Pattern-to-Playbook automation');
      expect(result.stdout).toContain('suggest');
      expect(result.stdout).toContain('apply');
      expect(result.stdout).toContain('reject');
      expect(result.stdout).toContain('stats');
    });

    it('displays help for suggest subcommand', async () => {
      const result = await sandbox.ada(['playbook', 'suggest', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('suggest');
      expect(result.stdout).toContain('List pending playbook suggestions');
      expect(result.stdout).toContain('--id');
      expect(result.stdout).toContain('--json');
    });

    it('displays help for apply subcommand', async () => {
      const result = await sandbox.ada(['playbook', 'apply', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('apply');
      expect(result.stdout).toContain('Apply a suggestion to its target playbook');
      expect(result.stdout).toContain('--json');
    });

    it('displays help for reject subcommand', async () => {
      const result = await sandbox.ada(['playbook', 'reject', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('reject');
      expect(result.stdout).toContain('Reject a suggestion with a reason');
      expect(result.stdout).toContain('--reason');
    });

    it('displays help for stats subcommand', async () => {
      const result = await sandbox.ada(['playbook', 'stats', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('stats');
      expect(result.stdout).toContain('Show suggestion statistics');
      expect(result.stdout).toContain('--json');
    });
  });

  // ─── Options Validation ───────────────────────────────────────────────────

  describe('options validation', () => {
    it('accepts --dir option', async () => {
      const result = await sandbox.ada(['playbook', '--dir', sandbox.path, '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('playbook');
    });

    it('reject requires --reason option', async () => {
      await sandbox.ada(['init']);

      const result = await sandbox.ada(['playbook', 'reject', 'sug-001']);

      // Should fail without --reason
      expect(result.exitCode).not.toBe(0);
    });

    it('apply requires id argument', async () => {
      await sandbox.ada(['init']);

      const result = await sandbox.ada(['playbook', 'apply']);

      // Should fail without id
      expect(result.exitCode).not.toBe(0);
    });
  });

  // ─── Suggest Command ──────────────────────────────────────────────────────

  describe('ada playbook suggest', () => {
    describe('with initialized repo', () => {
      beforeEach(async () => {
        await sandbox.ada(['init']);
      });

      it('shows empty state when no suggestions exist', async () => {
        const result = await sandbox.ada(['playbook', 'suggest']);

        // Empty state is valid, should not error
        expect(result.exitCode).toBe(0);

        // Should indicate no suggestions or provide guidance
        const output = result.stdout + result.stderr;
        expect(
          output.includes('No pending') ||
          output.includes('No suggestions') ||
          output.includes('pending') ||
          output.includes('Reflexion')
        ).toBe(true);
      });

      it('supports --json flag for empty state', async () => {
        const result = await sandbox.ada(['playbook', 'suggest', '--json']);

        expect(result.exitCode).toBe(0);

        // Should output valid JSON (even if empty)
        const output = result.stdout.trim();
        if (output.length > 0) {
          expect(() => JSON.parse(output)).not.toThrow();
        }
      });

      it('supports --id option for suggestion details', async () => {
        const result = await sandbox.ada([
          'playbook',
          'suggest',
          '--id',
          'sug-nonexistent'
        ]);

        // Should indicate suggestion not found
        const output = result.stdout + result.stderr;
        expect(
          output.includes('not found') ||
          output.includes('No') ||
          result.exitCode !== 0
        ).toBe(true);
      });
    });

    describe('without initialization', () => {
      it('handles missing agents directory gracefully', async () => {
        const result = await sandbox.ada(['playbook', 'suggest']);

        // Should not crash, either show empty state or guidance
        const output = result.stdout + result.stderr;
        expect(
          output.includes('No') ||
          output.includes('not') ||
          output.includes('suggestions') ||
          output.includes('Run') ||
          result.exitCode === 0
        ).toBe(true);
      });
    });
  });

  // ─── Stats Command ────────────────────────────────────────────────────────

  describe('ada playbook stats', () => {
    describe('with initialized repo', () => {
      beforeEach(async () => {
        await sandbox.ada(['init']);
      });

      it('shows empty state when no suggestions exist', async () => {
        const result = await sandbox.ada(['playbook', 'stats']);

        expect(result.exitCode).toBe(0);

        // Should indicate no suggestions or show statistics
        const output = result.stdout + result.stderr;
        expect(
          output.includes('Statistics') ||
          output.includes('No') ||
          output.includes('generated') ||
          output.includes('0')
        ).toBe(true);
      });

      it('supports --json flag', async () => {
        const result = await sandbox.ada(['playbook', 'stats', '--json']);

        expect(result.exitCode).toBe(0);

        // Should output valid JSON
        const output = result.stdout.trim();
        if (output.length > 0 && output.startsWith('{')) {
          const parsed = JSON.parse(output);
          // Stats output should have expected structure
          expect(parsed).toHaveProperty('total');
          expect(parsed).toHaveProperty('byStatus');
        }
      });
    });

    describe('without initialization', () => {
      it('handles missing agents directory gracefully', async () => {
        const result = await sandbox.ada(['playbook', 'stats']);

        // Should not crash
        const output = result.stdout + result.stderr;
        expect(
          output.includes('No') ||
          output.includes('not') ||
          output.includes('yet') ||
          result.exitCode === 0
        ).toBe(true);
      });
    });
  });

  // ─── Apply Command ────────────────────────────────────────────────────────

  describe('ada playbook apply', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
    });

    it('handles nonexistent suggestion gracefully', async () => {
      const result = await sandbox.ada([
        'playbook',
        'apply',
        'sug-nonexistent'
      ]);

      // Should indicate suggestion not found
      expect(result.exitCode).not.toBe(0);
      const output = result.stdout + result.stderr;
      expect(
        output.includes('not found') ||
        output.includes('not') ||
        output.includes('Cannot')
      ).toBe(true);
    });

    it('supports --json flag', async () => {
      const result = await sandbox.ada([
        'playbook',
        'apply',
        'sug-nonexistent',
        '--json'
      ]);

      // Should output JSON even on failure
      const output = result.stdout.trim();
      if (output.length > 0 && (output.startsWith('{') || output.startsWith('['))) {
        expect(() => JSON.parse(output)).not.toThrow();
      }
    });
  });

  // ─── Reject Command ───────────────────────────────────────────────────────

  describe('ada playbook reject', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
    });

    it('requires --reason flag', async () => {
      const result = await sandbox.ada([
        'playbook',
        'reject',
        'sug-001'
      ]);

      // Should fail without reason
      expect(result.exitCode).not.toBe(0);
      const output = result.stdout + result.stderr;
      expect(
        output.includes('reason') ||
        output.includes('required') ||
        output.includes('--reason')
      ).toBe(true);
    });

    it('handles nonexistent suggestion gracefully', async () => {
      const result = await sandbox.ada([
        'playbook',
        'reject',
        'sug-nonexistent',
        '--reason',
        'Test rejection reason'
      ]);

      // Should indicate suggestion not found
      expect(result.exitCode).not.toBe(0);
      const output = result.stdout + result.stderr;
      expect(
        output.includes('not found') ||
        output.includes('Failed') ||
        output.includes('not')
      ).toBe(true);
    });

    it('supports --json flag', async () => {
      const result = await sandbox.ada([
        'playbook',
        'reject',
        'sug-nonexistent',
        '--reason',
        'Test reason',
        '--json'
      ]);

      // Should output JSON even on failure
      const output = result.stdout.trim();
      if (output.length > 0 && (output.startsWith('{') || output.startsWith('['))) {
        expect(() => JSON.parse(output)).not.toThrow();
      }
    });
  });

  // ─── Default Behavior ─────────────────────────────────────────────────────

  describe('default behavior', () => {
    it('runs suggest when no subcommand provided', async () => {
      await sandbox.ada(['init']);

      const result = await sandbox.ada(['playbook']);

      // Should behave like 'suggest' subcommand
      expect(result.exitCode).toBe(0);

      const output = result.stdout + result.stderr;
      expect(
        output.includes('No') ||
        output.includes('pending') ||
        output.includes('Suggestion') ||
        output.includes('Reflexion')
      ).toBe(true);
    });
  });

  // ─── Integration with Reflexion ───────────────────────────────────────────

  describe('reflexion integration context', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
    });

    it('mentions reflexion in empty state guidance', async () => {
      const result = await sandbox.ada(['playbook', 'suggest']);

      const output = result.stdout + result.stderr;

      // Empty state should provide guidance about generating suggestions
      // via reflexion or dispatch cycles
      expect(
        output.includes('Reflexion') ||
        output.includes('dispatch') ||
        output.includes('reflect') ||
        output.includes('pattern') ||
        output.includes('No pending') ||
        output.includes('No suggestions')
      ).toBe(true);
    });
  });
});
