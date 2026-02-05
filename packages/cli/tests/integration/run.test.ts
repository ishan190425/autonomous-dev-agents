/**
 * Integration tests for `ada run` command.
 *
 * Tests the core dispatch cycle functionality including:
 * - Dry-run mode (shows what would happen without executing)
 * - Error handling when agents directory doesn't exist
 * - Output format verification
 *
 * Note: Full integration tests with LLM execution are complex
 * because they require mocking the AI backend. These tests focus
 * on the CLI interface and error paths.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { execSync, ExecSyncOptions } from 'node:child_process';

/**
 * Unique temp directory for each test.
 */
let testDir: string;

/**
 * Path to the CLI's dist/index.js (built CLI entry point).
 */
const cliPath = path.resolve(__dirname, '../../dist/index.js');

/**
 * Run the CLI with the given arguments.
 */
function runCli(
  args: string[],
  options?: ExecSyncOptions
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${cliPath} ${args.join(' ')}`, {
      cwd: testDir,
      encoding: 'utf-8',
      timeout: 30000,
      ...options,
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error) {
    const execError = error as { status: number; stdout: string; stderr: string };
    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || '',
      exitCode: execError.status ?? 1,
    };
  }
}

describe('ada run', () => {
  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'ada-run-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('error handling', () => {
    it('fails gracefully when agents directory does not exist', () => {
      const result = runCli(['run']);
      
      expect(result.exitCode).toBe(1);
      // Error message may be in stdout or stderr depending on where console.error writes
      const allOutput = (result.stdout + result.stderr).toLowerCase();
      expect(allOutput).toMatch(/no roles configured|could not read|dispatch failed/i);
    });

    it('fails gracefully when roster.json is missing', async () => {
      // Create agents dir but no roster
      await fs.mkdir(path.join(testDir, 'agents'));

      const result = runCli(['run']);
      
      expect(result.exitCode).toBe(1);
    });

    it('fails gracefully when rotation.json is missing', async () => {
      // Create agents dir with roster but no rotation state
      await fs.mkdir(path.join(testDir, 'agents'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'agents', 'roster.json'),
        JSON.stringify({
          company: 'Test',
          product: 'Test Product',
          tagline: 'Testing',
          roles: [
            {
              id: 'test',
              name: 'Tester',
              title: 'QA',
              emoji: '🧪',
              focus: ['testing'],
              actions: ['test'],
            },
          ],
          rotation_order: ['test'],
        })
      );

      const result = runCli(['run']);
      
      expect(result.exitCode).toBe(1);
    });
  });

  describe('dry-run mode', () => {
    beforeEach(async () => {
      // Set up a minimal valid agents directory
      await fs.mkdir(path.join(testDir, 'agents', 'state'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'agents', 'memory'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'agents', 'playbooks'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'agents', 'rules'), { recursive: true });

      // roster.json
      await fs.writeFile(
        path.join(testDir, 'agents', 'roster.json'),
        JSON.stringify({
          company: 'Test Company',
          product: 'Test Product',
          tagline: 'Testing ADA',
          roles: [
            {
              id: 'qa',
              name: 'The Tester',
              title: 'QA Lead',
              emoji: '🧪',
              focus: ['testing', 'quality'],
              actions: ['write_tests', 'run_tests', 'file_bugs'],
            },
            {
              id: 'dev',
              name: 'The Developer',
              title: 'Lead Developer',
              emoji: '⚙️',
              focus: ['coding', 'architecture'],
              actions: ['write_code', 'review_code'],
            },
          ],
          rotation_order: ['qa', 'dev'],
        })
      );

      // rotation.json
      await fs.writeFile(
        path.join(testDir, 'agents', 'state', 'rotation.json'),
        JSON.stringify({
          current_index: 0,
          last_role: 'dev',
          last_run: new Date().toISOString(),
          cycle_count: 5,
          history: [],
          next_role: 'qa',
          next_role_title: '🧪 The Tester',
        })
      );

      // memory bank
      await fs.writeFile(
        path.join(testDir, 'agents', 'memory', 'bank.md'),
        '# Memory Bank\n\nTest memory content.\n'
      );

      // playbook for current role
      await fs.writeFile(
        path.join(testDir, 'agents', 'playbooks', 'qa.md'),
        '# QA Playbook\n\nTest playbook content.\n'
      );

      // rules
      await fs.writeFile(
        path.join(testDir, 'agents', 'rules', 'RULES.md'),
        '# Rules\n\nTest rules.\n'
      );

      // DISPATCH.md
      await fs.writeFile(
        path.join(testDir, 'agents', 'DISPATCH.md'),
        '# Dispatch Protocol\n\nTest dispatch.\n'
      );
    });

    it('shows role information in dry-run mode', () => {
      const result = runCli(['run', '--dry-run']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DRY RUN');
      expect(result.stdout).toContain('🧪'); // Role emoji
      expect(result.stdout).toContain('The Tester'); // Role name
      expect(result.stdout).toContain('QA Lead'); // Role title
    });

    it('shows available actions in dry-run mode', () => {
      const result = runCli(['run', '--dry-run']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Available actions');
      expect(result.stdout).toContain('write_tests');
      expect(result.stdout).toContain('run_tests');
      expect(result.stdout).toContain('file_bugs');
    });

    it('shows cycle number in dry-run mode', () => {
      const result = runCli(['run', '--dry-run']);

      expect(result.exitCode).toBe(0);
      // Cycle should be 6 (5 + 1)
      expect(result.stdout).toContain('Cycle');
      expect(result.stdout).toMatch(/6/);
    });

    it('shows phase information in dry-run mode', () => {
      const result = runCli(['run', '--dry-run']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Phase 1');
      expect(result.stdout).toContain('Phase 2');
      expect(result.stdout).toContain('Loading context');
      expect(result.stdout).toContain('Context loaded');
    });

    it('respects custom agents directory with -d flag', async () => {
      // Create a custom agents directory
      await fs.mkdir(path.join(testDir, 'custom-agents', 'state'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'custom-agents', 'memory'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'custom-agents', 'playbooks'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'custom-agents', 'rules'), { recursive: true });

      await fs.writeFile(
        path.join(testDir, 'custom-agents', 'roster.json'),
        JSON.stringify({
          company: 'Custom Company',
          product: 'Custom Product',
          tagline: 'Custom testing',
          roles: [
            {
              id: 'custom',
              name: 'Custom Role',
              title: 'Custom Title',
              emoji: '🎯',
              focus: ['custom'],
              actions: ['custom_action'],
            },
          ],
          rotation_order: ['custom'],
        })
      );

      await fs.writeFile(
        path.join(testDir, 'custom-agents', 'state', 'rotation.json'),
        JSON.stringify({
          current_index: 0,
          last_role: 'custom',
          last_run: new Date().toISOString(),
          cycle_count: 1,
          history: [],
          next_role: 'custom',
          next_role_title: '🎯 Custom Role',
        })
      );

      await fs.writeFile(
        path.join(testDir, 'custom-agents', 'memory', 'bank.md'),
        '# Memory Bank\n\nCustom memory.\n'
      );

      await fs.writeFile(
        path.join(testDir, 'custom-agents', 'playbooks', 'custom.md'),
        '# Custom Playbook\n\nCustom content.\n'
      );

      await fs.writeFile(
        path.join(testDir, 'custom-agents', 'rules', 'RULES.md'),
        '# Rules\n\nCustom rules.\n'
      );

      const result = runCli(['run', '--dry-run', '-d', 'custom-agents']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('🎯'); // Custom role emoji
      expect(result.stdout).toContain('Custom Role');
    });

    it('does not modify files in dry-run mode', async () => {
      const rotationBefore = await fs.readFile(
        path.join(testDir, 'agents', 'state', 'rotation.json'),
        'utf-8'
      );

      runCli(['run', '--dry-run']);

      const rotationAfter = await fs.readFile(
        path.join(testDir, 'agents', 'state', 'rotation.json'),
        'utf-8'
      );

      expect(rotationAfter).toBe(rotationBefore);
    });
  });

  describe('output format', () => {
    beforeEach(async () => {
      // Set up minimal valid agents directory (same as dry-run setup)
      await fs.mkdir(path.join(testDir, 'agents', 'state'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'agents', 'memory'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'agents', 'playbooks'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'agents', 'rules'), { recursive: true });

      await fs.writeFile(
        path.join(testDir, 'agents', 'roster.json'),
        JSON.stringify({
          company: 'Test Company',
          product: 'Test Product',
          tagline: 'Testing ADA',
          roles: [
            {
              id: 'qa',
              name: 'The Tester',
              title: 'QA Lead',
              emoji: '🧪',
              focus: ['testing'],
              actions: ['write_tests'],
            },
          ],
          rotation_order: ['qa'],
        })
      );

      await fs.writeFile(
        path.join(testDir, 'agents', 'state', 'rotation.json'),
        JSON.stringify({
          current_index: 0,
          last_role: 'qa',
          last_run: new Date().toISOString(),
          cycle_count: 10,
          history: [],
          next_role: 'qa',
          next_role_title: '🧪 The Tester',
        })
      );

      await fs.writeFile(
        path.join(testDir, 'agents', 'memory', 'bank.md'),
        '# Memory Bank\n\nTest memory.\n'
      );

      await fs.writeFile(
        path.join(testDir, 'agents', 'playbooks', 'qa.md'),
        '# QA Playbook\n\nTest playbook.\n'
      );

      await fs.writeFile(
        path.join(testDir, 'agents', 'rules', 'RULES.md'),
        '# Rules\n\nTest rules.\n'
      );
    });

    it('displays dispatch cycle header', () => {
      const result = runCli(['run', '--dry-run']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('🏭 ADA Dispatch Cycle');
    });

    it('uses emojis for visual clarity', () => {
      const result = runCli(['run', '--dry-run']);

      expect(result.exitCode).toBe(0);
      // Check for key emojis used in output
      expect(result.stdout).toContain('📋'); // Phase indicator
      expect(result.stdout).toContain('✅'); // Success indicator
      expect(result.stdout).toContain('🎭'); // Role indicator
      expect(result.stdout).toContain('🔄'); // Cycle indicator
    });

    it('shows focus areas for current role', () => {
      const result = runCli(['run', '--dry-run']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Focus');
      expect(result.stdout).toContain('testing');
    });
  });

  describe('help and usage', () => {
    it('shows help text with --help flag', () => {
      const result = runCli(['run', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Execute one dispatch cycle');
      expect(result.stdout).toContain('--dry-run');
      expect(result.stdout).toContain('--dir');
      expect(result.stdout).toContain('--watch');
      expect(result.stdout).toContain('--interval');
    });

    it('shows agents directory option in help', () => {
      const result = runCli(['run', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('-d, --dir');
      expect(result.stdout).toContain('agents/');
    });
  });
});
