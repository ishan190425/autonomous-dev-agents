/**
 * E2E Tests: ada config
 *
 * Tests the `ada config` commands (show, path, edit) in isolated
 * sandbox environments. Validates configuration viewing and path resolution.
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure — Config commands
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness';

describe('ada config E2E', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = createSandbox();
    // Initialize agents directory for config tests
    const initResult = await sandbox.ada(['init']);
    expect(initResult.success).toBe(true);
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('config show', () => {
    it('displays current configuration', async () => {
      const result = await sandbox.ada(['config', 'show']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Configuration');
    });

    it('shows roster information', async () => {
      const result = await sandbox.ada(['config', 'show']);

      expect(result.success).toBe(true);
      // Should display roles from roster.json
      expect(result.stdout).toMatch(/role|team|rotation/i);
    });

    it('shows role count', async () => {
      const result = await sandbox.ada(['config', 'show']);

      expect(result.success).toBe(true);
      // Should show Roles: with a number
      expect(result.stdout).toMatch(/Roles:\s+\d+/);
    });
  });

  describe('config path', () => {
    it('prints the agents directory path', async () => {
      const result = await sandbox.ada(['config', 'path']);

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toContain('agents');
    });

    it('prints absolute path', async () => {
      const result = await sandbox.ada(['config', 'path']);

      expect(result.success).toBe(true);
      // Should be an absolute path (starts with /)
      expect(result.stdout.trim()).toMatch(/^[/~]/);
    });

    it('resolves to existing directory', async () => {
      const result = await sandbox.ada(['config', 'path']);

      expect(result.success).toBe(true);
      // The path should exist
      expect(sandbox.exists('agents')).toBe(true);
    });
  });

  describe('config with custom directory', () => {
    it('respects --dir flag for show', async () => {
      // Initialize in a custom directory
      const customInitResult = await sandbox.ada([
        'init',
        '--dir',
        'custom-agents',
      ]);
      expect(customInitResult.success).toBe(true);

      const result = await sandbox.ada([
        'config',
        'show',
        '--dir',
        'custom-agents',
      ]);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Configuration');
    });

    it('respects --dir flag for path', async () => {
      // Initialize in a custom directory
      await sandbox.ada(['init', '--dir', 'my-agents']);

      const result = await sandbox.ada(['config', 'path', '--dir', 'my-agents']);

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toContain('my-agents');
    });
  });

  describe('config — error handling', () => {
    it('fails gracefully when agents directory does not exist', async () => {
      // Create a fresh sandbox without init
      sandbox.cleanup();
      sandbox = createSandbox();

      const result = await sandbox.ada(['config', 'show']);

      expect(result.success).toBe(false);
      // Error message may contain ENOENT, "no such file", or other error indicators
      expect(result.stderr).toMatch(/not found|not initialized|doesn't exist|ENOENT|no such file|could not read/i);
    });

    it('fails gracefully when roster.json is invalid', async () => {
      // Corrupt the roster.json
      sandbox.write('agents/roster.json', 'not valid json {{{');

      const result = await sandbox.ada(['config', 'show']);

      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/invalid|parse|json|error/i);
    });

    it('shows helpful message when roster.json is missing', async () => {
      // Remove roster.json
      const fs = await import('node:fs/promises');
      await fs.unlink(sandbox.resolve('agents/roster.json'));

      const result = await sandbox.ada(['config', 'show']);

      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/roster|not found|missing/i);
    });
  });

  describe('config — help output', () => {
    it('shows help when invoked without subcommand', async () => {
      const result = await sandbox.ada(['config']);

      // Help may go to stderr or stdout depending on commander behavior
      const output = result.stdout + result.stderr;
      // Should display usage information
      expect(output).toContain('config');
      expect(output).toContain('show');
      expect(output).toContain('path');
    });

    it('shows help for show subcommand', async () => {
      const result = await sandbox.ada(['config', 'show', '--help']);

      expect(result.stdout).toContain('show');
      expect(result.stdout).toContain('configuration');
    });

    it('shows help for path subcommand', async () => {
      const result = await sandbox.ada(['config', 'path', '--help']);

      expect(result.stdout).toContain('path');
      expect(result.stdout).toContain('agents');
    });
  });

  describe('config show — roster details', () => {
    it('displays rotation order', async () => {
      const result = await sandbox.ada(['config', 'show']);

      expect(result.success).toBe(true);
      // Should show rotation order
      expect(result.stdout).toMatch(/rotation|order|sequence/i);
    });

    it('displays role emoji and descriptions', async () => {
      const result = await sandbox.ada(['config', 'show']);

      expect(result.success).toBe(true);
      // Should show roles with their descriptions
      expect(result.stdout).toContain('Roles');
    });

    it('shows product and company information', async () => {
      const result = await sandbox.ada(['config', 'show']);

      expect(result.success).toBe(true);
      // Should show product info
      expect(result.stdout).toMatch(/product|company|configuration/i);
    });
  });

  describe('config — roster.json structure validation', () => {
    it('validates roster has required fields', () => {
      // Read the default roster.json created by init
      const roster = sandbox.readJson<{
        roles?: unknown[];
        rotation_order?: string[];
      }>('agents/roster.json');

      // Should have roles or rotation_order
      expect(roster.roles || roster.rotation_order).toBeDefined();
    });

    it('roster contains valid role definitions', () => {
      const roster = sandbox.readJson<{
        roles?: Array<{ id: string; name: string }>;
        rotation_order?: string[];
      }>('agents/roster.json');

      if (roster.roles) {
        for (const role of roster.roles) {
          expect(role.id).toBeDefined();
          expect(typeof role.id).toBe('string');
        }
      }

      if (roster.rotation_order) {
        expect(Array.isArray(roster.rotation_order)).toBe(true);
        expect(roster.rotation_order.length).toBeGreaterThan(0);
      }
    });
  });
});
