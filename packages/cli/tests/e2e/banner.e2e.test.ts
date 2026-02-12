/**
 * E2E Tests: ada --banner flag
 *
 * Issue #136 regression test: --banner flag should work standalone
 * without requiring a subcommand.
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness';

describe('ada --banner E2E — Issue #136 regression', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('--banner flag standalone', () => {
    it('shows banner and exits cleanly without subcommand', async () => {
      // This is the regression test for Issue #136
      // Before the fix, `ada --banner` would show help and exit 1
      const result = await sandbox.ada(['--banner']);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      // Should contain ASCII art (the A D A letters)
      expect(result.stdout).toMatch(/A\s*D\s*A|ADA|Autonomous Dev Agents/i);
    });

    it('works with --banner flag in any position', async () => {
      const result = await sandbox.ada(['--banner']);

      // Should succeed and show banner content
      expect(result.success).toBe(true);
      expect(result.stdout.length).toBeGreaterThan(50); // Banner has substantial output
    });
  });

  describe('--banner flag with subcommand', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
    });

    it('shows banner before status command', async () => {
      const result = await sandbox.ada(['--banner', 'status']);

      expect(result.success).toBe(true);
      // Should contain both banner and status output
      expect(result.stdout).toMatch(/ADA|Autonomous/i);
      expect(result.stdout).toMatch(/role|cycle/i);
    });
  });
});
