/**
 * E2E Tests: ada init
 *
 * Tests the `ada init` command in isolated sandbox environments.
 * Validates the full initialization flow including file creation,
 * template application, and error handling.
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness';

describe('ada init E2E', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('fresh repository', () => {
    it('creates agent directory structure', async () => {
      const result = await sandbox.ada(['init']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('initialized successfully');

      // Core files should exist
      expect(sandbox.exists('agents/DISPATCH.md')).toBe(true);
      expect(sandbox.exists('agents/roster.json')).toBe(true);
      expect(sandbox.exists('agents/state/rotation.json')).toBe(true);
      expect(sandbox.exists('agents/memory/bank.md')).toBe(true);
      expect(sandbox.exists('agents/rules/RULES.md')).toBe(true);
    });

    it('creates valid roster.json with roles', async () => {
      await sandbox.ada(['init']);

      const roster = sandbox.readJson<{
        roles: Array<{ id: string; name: string }>;
        rotation_order: string[];
      }>('agents/roster.json');

      expect(roster.roles).toBeInstanceOf(Array);
      expect(roster.roles.length).toBeGreaterThan(0);
      expect(roster.rotation_order).toBeInstanceOf(Array);
      expect(roster.rotation_order.length).toBeGreaterThan(0);

      // Each role in rotation_order should exist in roles
      const roleIds = roster.roles.map((r) => r.id);
      for (const orderedRole of roster.rotation_order) {
        expect(roleIds).toContain(orderedRole);
      }
    });

    it('creates valid rotation.json with initial state', async () => {
      await sandbox.ada(['init']);

      const rotation = sandbox.readJson<{
        current_index: number;
        cycle_count: number;
        history: unknown[];
      }>('agents/state/rotation.json');

      expect(rotation.current_index).toBe(0);
      expect(rotation.cycle_count).toBe(0);
      expect(rotation.history).toEqual([]);
    });

    it('creates DISPATCH.md with protocol', async () => {
      await sandbox.ada(['init']);

      const dispatch = sandbox.read('agents/DISPATCH.md');
      expect(dispatch).toContain('Agent Dispatch Protocol');
      expect(dispatch).toContain('Phase 1');
      expect(dispatch).toContain('Context Load');
    });

    it('creates playbooks directory with role files', async () => {
      await sandbox.ada(['init']);

      expect(sandbox.exists('agents/playbooks')).toBe(true);

      // At minimum, should have some playbook files
      const roster = sandbox.readJson<{ rotation_order: string[] }>(
        'agents/roster.json'
      );

      // Check that playbooks exist for roles in rotation
      for (const roleId of roster.rotation_order) {
        expect(sandbox.exists(`agents/playbooks/${roleId}.md`)).toBe(true);
      }
    });
  });

  describe('existing agents directory', () => {
    it('detects existing installation', async () => {
      // First init
      await sandbox.ada(['init']);

      // Second init should detect existing
      const result = await sandbox.ada(['init']);

      // Should either warn or succeed gracefully
      // (exact behavior depends on implementation)
      expect(result.stdout + result.stderr).toMatch(
        /already|exist|overwrite|skip/i
      );
    });
  });

  describe('non-git directory', () => {
    it('handles non-git directory gracefully', async () => {
      // Create sandbox without git
      const noGitSandbox = createSandbox({ git: false });

      try {
        const result = await noGitSandbox.ada(['init']);

        // Should either succeed (git not required) or fail with clear error
        if (!result.success) {
          expect(result.stderr).toMatch(/git|repository/i);
        }
      } finally {
        noGitSandbox.cleanup();
      }
    });
  });

  describe('--help flag', () => {
    it('shows help information', async () => {
      const result = await sandbox.ada(['init', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('init');
      expect(result.stdout).toMatch(/usage|options|help/i);
    });
  });
});
