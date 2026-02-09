/**
 * E2E Tests: ada status
 *
 * Tests the `ada status` command in isolated sandbox environments.
 * Validates status display in various repository states.
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness';

describe('ada status E2E', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('uninitialized repository', () => {
    it('indicates no ADA installation', async () => {
      const result = await sandbox.ada(['status']);

      // Should fail with helpful message pointing to init
      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/ada init|no such file|ENOENT/i);
    });
  });

  describe('initialized repository', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
    });

    it('shows current rotation state', async () => {
      const result = await sandbox.ada(['status']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/role|cycle|status/i);
    });

    it('shows cycle count', async () => {
      const result = await sandbox.ada(['status']);

      expect(result.success).toBe(true);
      // Should show cycle 0 for fresh init
      expect(result.stdout).toMatch(/cycle|#?\s*0/i);
    });

    it('shows current role', async () => {
      const result = await sandbox.ada(['status']);

      // Load roster to know what roles exist
      const roster = sandbox.readJson<{ rotation_order: string[] }>(
        'agents/roster.json'
      );
      const firstRole = roster.rotation_order[0];

      expect(result.success).toBe(true);
      // Should mention the first role in rotation
      expect(result.stdout.toLowerCase()).toContain(firstRole.toLowerCase());
    });
  });

  describe('--json flag', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
    });

    it('outputs valid JSON', async () => {
      const result = await sandbox.ada(['status', '--json']);

      expect(result.success).toBe(true);

      // Should be valid JSON
      let parsed: unknown;
      expect(() => {
        parsed = JSON.parse(result.stdout);
      }).not.toThrow();

      // Should have expected structure (nested under rotation)
      expect(parsed).toHaveProperty('rotation');
      expect(parsed).toHaveProperty('rotation.currentIndex');
      expect(parsed).toHaveProperty('rotation.cycleCount');
    });
  });

  describe('--verbose flag', () => {
    beforeEach(async () => {
      await sandbox.ada(['init']);
    });

    it('produces more detailed output', async () => {
      const normalResult = await sandbox.ada(['status']);
      const verboseResult = await sandbox.ada(['status', '--verbose']);

      expect(verboseResult.success).toBe(true);
      // Verbose output should be longer than normal
      expect(verboseResult.stdout.length).toBeGreaterThan(
        normalResult.stdout.length
      );
    });
  });

  describe('--help flag', () => {
    it('shows help information', async () => {
      const result = await sandbox.ada(['status', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('status');
      expect(result.stdout).toMatch(/usage|options|help/i);
    });
  });
});
