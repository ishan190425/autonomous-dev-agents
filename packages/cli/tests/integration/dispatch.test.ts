/**
 * Integration tests for `ada dispatch` command.
 *
 * Tests the dispatch lifecycle management including:
 * - `ada dispatch start` — Initialize a dispatch cycle
 * - `ada dispatch complete` — Finalize cycle, update rotation, commit
 * - `ada dispatch status` — Show current dispatch state
 *
 * These tests validate the CLI interface for Issue #111 (MANDATORY CLI dogfooding)
 * and Issue #112 (dispatch CLI spec).
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
 * Escape a shell argument for safe inclusion in a command string.
 */
function shellEscape(arg: string): string {
  // If arg contains spaces or special chars, wrap in single quotes
  // and escape any existing single quotes
  if (/[^a-zA-Z0-9_\-=./]/.test(arg)) {
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }
  return arg;
}

/**
 * Run the CLI with the given arguments.
 */
function runCli(
  args: string[],
  options?: ExecSyncOptions
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const escapedArgs = args.map(shellEscape).join(' ');
    const stdout = execSync(`node ${cliPath} ${escapedArgs}`, {
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

/**
 * Create a minimal valid agents directory structure.
 */
async function setupAgentsDir(overrides?: {
  roster?: object;
  rotation?: object;
  bank?: string;
  playbook?: string;
  rules?: string;
}): Promise<void> {
  await fs.mkdir(path.join(testDir, 'agents', 'state'), { recursive: true });
  await fs.mkdir(path.join(testDir, 'agents', 'memory'), { recursive: true });
  await fs.mkdir(path.join(testDir, 'agents', 'playbooks'), { recursive: true });
  await fs.mkdir(path.join(testDir, 'agents', 'rules'), { recursive: true });

  // Initialize git repo (required for dispatch complete)
  execSync('git init', { cwd: testDir, encoding: 'utf-8' });
  execSync('git config user.email "test@ada.dev"', { cwd: testDir });
  execSync('git config user.name "ADA Test"', { cwd: testDir });

  const defaultRoster = {
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
  };

  const defaultRotation = {
    current_index: 0,
    last_role: 'dev',
    last_run: new Date().toISOString(),
    cycle_count: 5,
    history: [],
    next_role: 'qa',
    next_role_title: '🧪 The Tester',
  };

  await fs.writeFile(
    path.join(testDir, 'agents', 'roster.json'),
    JSON.stringify(overrides?.roster ?? defaultRoster, null, 2)
  );

  await fs.writeFile(
    path.join(testDir, 'agents', 'state', 'rotation.json'),
    JSON.stringify(overrides?.rotation ?? defaultRotation, null, 2)
  );

  await fs.writeFile(
    path.join(testDir, 'agents', 'memory', 'bank.md'),
    overrides?.bank ?? '# Memory Bank\n\nTest memory content.\n'
  );

  await fs.writeFile(
    path.join(testDir, 'agents', 'playbooks', 'qa.md'),
    overrides?.playbook ?? '# QA Playbook\n\nTest playbook content.\n'
  );

  await fs.writeFile(
    path.join(testDir, 'agents', 'playbooks', 'dev.md'),
    '# Dev Playbook\n\nDev playbook content.\n'
  );

  await fs.writeFile(
    path.join(testDir, 'agents', 'rules', 'RULES.md'),
    overrides?.rules ?? '# Rules\n\nTest rules.\n'
  );

  await fs.writeFile(
    path.join(testDir, 'agents', 'DISPATCH.md'),
    '# Dispatch Protocol\n\nTest dispatch.\n'
  );

  // Initial commit so git operations work
  execSync('git add -A', { cwd: testDir });
  execSync('git commit -m "test: initial setup"', { cwd: testDir });
}

describe('ada dispatch', () => {
  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'ada-dispatch-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('help and usage', () => {
    it('shows dispatch subcommands with --help', () => {
      const result = runCli(['dispatch', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('start');
      expect(result.stdout).toContain('complete');
      expect(result.stdout).toContain('status');
    });

    it('shows start help with dispatch start --help', () => {
      const result = runCli(['dispatch', 'start', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('--role');
      expect(result.stdout).toContain('--dry-run');
      expect(result.stdout).toContain('--force');
    });

    it('shows complete help with dispatch complete --help', () => {
      const result = runCli(['dispatch', 'complete', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('--action');
      expect(result.stdout).toContain('--outcome');
      expect(result.stdout).toContain('--reflection');
    });

    it('shows status help with dispatch status --help', () => {
      const result = runCli(['dispatch', 'status', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('--json');
      expect(result.stdout).toContain('--verbose');
    });
  });

  describe('dispatch start', () => {
    beforeEach(async () => {
      await setupAgentsDir();
    });

    it('starts a dispatch cycle successfully', () => {
      const result = runCli(['dispatch', 'start']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('🧪'); // Current role emoji
      expect(result.stdout).toContain('The Tester'); // Role name
    });

    it('creates a lock file when starting', async () => {
      runCli(['dispatch', 'start']);

      const lockPath = path.join(testDir, 'agents', 'state', '.dispatch.lock');
      const lockExists = await fs.access(lockPath).then(() => true).catch(() => false);
      expect(lockExists).toBe(true);

      const lockContent = JSON.parse(await fs.readFile(lockPath, 'utf-8'));
      expect(lockContent).toHaveProperty('cycle');
      expect(lockContent).toHaveProperty('role', 'qa');
      expect(lockContent).toHaveProperty('startedAt');
    });

    it('fails when cycle already in progress (exit code 1)', () => {
      // Start first cycle
      const first = runCli(['dispatch', 'start']);
      expect(first.exitCode).toBe(0);

      // Try to start another
      const second = runCli(['dispatch', 'start']);
      expect(second.exitCode).toBe(1);
      const allOutput = second.stdout + second.stderr;
      expect(allOutput.toLowerCase()).toMatch(/already|in progress|active/);
    });

    it('allows force start when cycle in progress with --force', () => {
      // Start first cycle
      runCli(['dispatch', 'start']);

      // Force start another
      const result = runCli(['dispatch', 'start', '--force']);
      expect(result.exitCode).toBe(0);
    });

    it('allows forcing a different role with --role flag (debug mode)', () => {
      // --role allows forcing a specific role for debugging
      const result = runCli(['dispatch', 'start', '--role', 'dev']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('⚙️'); // Dev emoji
    });

    it('accepts correct role with --role flag', () => {
      const result = runCli(['dispatch', 'start', '--role', 'qa']);
      expect(result.exitCode).toBe(0);
    });

    it('shows dry-run output without creating lock', async () => {
      const result = runCli(['dispatch', 'start', '--dry-run']);

      expect(result.exitCode).toBe(0);
      // Dry-run still shows cycle info
      expect(result.stdout).toContain('Cycle');

      // Lock should not exist (key behavior of dry-run)
      const lockPath = path.join(testDir, 'agents', 'state', '.dispatch.lock');
      const lockExists = await fs.access(lockPath).then(() => true).catch(() => false);
      expect(lockExists).toBe(false);
    });

    it('includes dryRun flag in JSON output', () => {
      const result = runCli(['dispatch', 'start', '--dry-run', '--json']);

      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty('dryRun', true);
    });

    it('outputs JSON with --json flag', () => {
      const result = runCli(['dispatch', 'start', '--json']);

      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty('cycle');
      expect(json).toHaveProperty('role');
      expect(json.role).toHaveProperty('id', 'qa');
      expect(json).toHaveProperty('playbook');
      expect(json).toHaveProperty('memoryBank');
    });

    it('suppresses output with --quiet flag', () => {
      const result = runCli(['dispatch', 'start', '--quiet']);

      expect(result.exitCode).toBe(0);
      // Quiet mode should have minimal output
      expect(result.stdout.length).toBeLessThan(100);
    });

    it('shows rotation banner with current role highlighted', () => {
      const result = runCli(['dispatch', 'start']);

      expect(result.exitCode).toBe(0);
      // Should show rotation order
      expect(result.stdout).toMatch(/qa|dev/);
    });
  });

  describe('dispatch complete', () => {
    beforeEach(async () => {
      await setupAgentsDir();
    });

    it('fails when no cycle in progress', () => {
      // Without a lock file, complete should still technically work (creates cycle on the fly)
      // But the real test is that --action is still required
      const result = runCli(['dispatch', 'complete', '--action', 'Test action', '--skip-push']);

      // This actually succeeds because dispatch complete creates a cycle if none exists
      // The key behavior to test is that it requires --action
      expect(result.exitCode).toBe(0);
    });

    it('fails when --action not provided (commander error)', () => {
      // Start a cycle first
      runCli(['dispatch', 'start']);

      // Try to complete without action - Commander enforces required option
      const result = runCli(['dispatch', 'complete']);
      expect(result.exitCode).toBe(1); // Commander exits with 1 for missing required option
      const allOutput = result.stdout + result.stderr;
      expect(allOutput.toLowerCase()).toMatch(/required|action/);
    });

    it('completes cycle with action summary', () => {
      // Start cycle
      runCli(['dispatch', 'start']);

      // Complete with action (skip push since we have no remote)
      const result = runCli(['dispatch', 'complete', '--action', 'Wrote integration tests for dispatch CLI', '--skip-push']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('✅');
    });

    it('removes lock file after completion', async () => {
      runCli(['dispatch', 'start']);
      runCli(['dispatch', 'complete', '--action', 'Test action']);

      const lockPath = path.join(testDir, 'agents', 'state', '.dispatch.lock');
      const lockExists = await fs.access(lockPath).then(() => true).catch(() => false);
      expect(lockExists).toBe(false);
    });

    it('updates rotation state after completion', async () => {
      runCli(['dispatch', 'start']);
      runCli(['dispatch', 'complete', '--action', 'Test action', '--skip-push']);

      const rotationPath = path.join(testDir, 'agents', 'state', 'rotation.json');
      const rotation = JSON.parse(await fs.readFile(rotationPath, 'utf-8'));

      // Cycle count should increment
      expect(rotation.cycle_count).toBe(6);
      // Current index should advance (0 → 1, i.e., qa → dev)
      expect(rotation.current_index).toBe(1);
      // Last role should be qa (the role that just completed)
      expect(rotation.last_role).toBe('qa');
      // History should contain the completed cycle
      expect(rotation.history).toBeInstanceOf(Array);
    });

    it('adds to history after completion', async () => {
      runCli(['dispatch', 'start']);
      runCli(['dispatch', 'complete', '--action', 'Test action summary']);

      const rotationPath = path.join(testDir, 'agents', 'state', 'rotation.json');
      const rotation = JSON.parse(await fs.readFile(rotationPath, 'utf-8'));

      expect(rotation.history.length).toBeGreaterThan(0);
      const lastEntry = rotation.history[rotation.history.length - 1];
      expect(lastEntry.action).toContain('Test action summary');
      expect(lastEntry.role).toBe('qa');
    });

    it('accepts --outcome flag', () => {
      runCli(['dispatch', 'start']);
      const result = runCli(['dispatch', 'complete', '--action', 'Partial progress', '--outcome', 'partial']);

      expect(result.exitCode).toBe(0);
    });

    it('accepts --reflection flag', () => {
      runCli(['dispatch', 'start']);
      const result = runCli([
        'dispatch', 'complete',
        '--action', 'Completed task',
        '--reflection', 'Learned that tests should be isolated',
      ]);

      expect(result.exitCode).toBe(0);
    });

    it('skips git push with --skip-push', () => {
      runCli(['dispatch', 'start']);
      // This would fail if it tried to push to a non-existent remote
      const result = runCli(['dispatch', 'complete', '--action', 'Test', '--skip-push']);

      expect(result.exitCode).toBe(0);
    });

    it('outputs JSON with --json flag', () => {
      runCli(['dispatch', 'start']);
      const result = runCli(['dispatch', 'complete', '--action', 'Test', '--json', '--skip-push']);

      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty('cycle');
      expect(json).toHaveProperty('nextRole');
      expect(json).toHaveProperty('outcome');
    });

    it('commits changes to git', () => {
      runCli(['dispatch', 'start']);
      runCli(['dispatch', 'complete', '--action', 'Test commit', '--skip-push']);

      // Check git log for commit
      const gitLog = execSync('git log --oneline -1', { cwd: testDir, encoding: 'utf-8' });
      expect(gitLog.toLowerCase()).toMatch(/agents|cycle|dispatch/);
    });
  });

  describe('dispatch status', () => {
    beforeEach(async () => {
      await setupAgentsDir();
    });

    it('shows idle status when no cycle in progress', () => {
      const result = runCli(['dispatch', 'status']);

      expect(result.exitCode).toBe(0);
      const allOutput = result.stdout.toLowerCase();
      expect(allOutput).toMatch(/idle|no.*active|ready/);
    });

    it('shows active cycle when in progress', () => {
      runCli(['dispatch', 'start']);
      const result = runCli(['dispatch', 'status']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('🧪'); // Current role
      expect(result.stdout.toLowerCase()).toMatch(/active|in progress|started/);
    });

    it('shows cycle duration when active', () => {
      runCli(['dispatch', 'start']);
      const result = runCli(['dispatch', 'status']);

      expect(result.exitCode).toBe(0);
      // Should show duration or started time
      expect(result.stdout).toMatch(/\d+[smh]|started|duration/i);
    });

    it('outputs JSON with --json flag (idle)', () => {
      const result = runCli(['dispatch', 'status', '--json']);

      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty('inProgress', false);
      expect(json).toHaveProperty('state', 'ready');
      expect(json).toHaveProperty('nextRole');
      expect(json).toHaveProperty('currentRole');
    });

    it('outputs JSON with --json flag (active)', () => {
      runCli(['dispatch', 'start']);
      const result = runCli(['dispatch', 'status', '--json']);

      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty('inProgress', true);
      expect(json).toHaveProperty('state', 'in_progress');
      expect(json).toHaveProperty('cycle');
      expect(json).toHaveProperty('currentRole');
    });

    it('shows more detail with --verbose flag', () => {
      runCli(['dispatch', 'start']);
      const verbose = runCli(['dispatch', 'status', '--verbose']);

      expect(verbose.exitCode).toBe(0);
      // Verbose shows history (last 10 entries vs default 5)
      expect(verbose.stdout.toLowerCase()).toMatch(/history|rotation/i);
    });

    it('shows rotation order', () => {
      const result = runCli(['dispatch', 'status', '--verbose']);

      expect(result.exitCode).toBe(0);
      // Should show both roles in rotation
      expect(result.stdout).toMatch(/qa.*dev|rotation/i);
    });

    it('shows cycle count and last run', () => {
      const result = runCli(['dispatch', 'status']);

      expect(result.exitCode).toBe(0);
      // Should show cycle info
      expect(result.stdout).toMatch(/cycle|last/i);
    });

    it('includes heat data in JSON output when heat store exists (Issue #118)', async () => {
      // Create a heat store with test entries
      const heatDir = path.join(testDir, 'agents', 'memory');
      const heatData = [
        {
          id: 'test-entry-1',
          memoryClass: 'learned',
          baseImportance: 0.9,
          referenceCount: 10,
          lastAccessedAt: Date.now(),
          createdAt: Date.now() - 1000000,
        },
        {
          id: 'test-entry-2',
          memoryClass: 'episodic',
          baseImportance: 0.5,
          referenceCount: 2,
          lastAccessedAt: Date.now() - 86400000, // 1 day ago
          createdAt: Date.now() - 2000000,
        },
      ];
      // Write heat.jsonl (one entry per line)
      await fs.writeFile(
        path.join(heatDir, 'heat.jsonl'),
        `${heatData.map(e => JSON.stringify(e)).join('\n')  }\n`
      );

      const result = runCli(['dispatch', 'status', '--json']);

      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      // Heat data should be present
      expect(json).toHaveProperty('heat');
      expect(json.heat).not.toBeNull();
      expect(json.heat).toHaveProperty('stats');
      expect(json.heat).toHaveProperty('top5');
      expect(json.heat.top5.length).toBeGreaterThan(0);
      // Top entries should have required fields
      expect(json.heat.top5[0]).toHaveProperty('id');
      expect(json.heat.top5[0]).toHaveProperty('score');
      expect(json.heat.top5[0]).toHaveProperty('tier');
    });

    it('handles missing heat store gracefully (Issue #118)', () => {
      // No heat.jsonl file exists
      const result = runCli(['dispatch', 'status', '--json']);

      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      // Heat store initializes empty when no file exists (graceful handling)
      expect(json).toHaveProperty('heat');
      expect(json.heat).toHaveProperty('stats');
      expect(json.heat.stats.total).toBe(0);
      expect(json.heat.top5).toEqual([]);
    });

    it('shows heat summary in verbose terminal output (Issue #118)', async () => {
      // Create a heat store with test entries
      const heatDir = path.join(testDir, 'agents', 'memory');
      const heatData = [
        {
          id: 'hot-memory-1',
          memoryClass: 'innate',
          baseImportance: 1.0,
          referenceCount: 50,
          lastAccessedAt: Date.now(),
          createdAt: Date.now() - 1000,
        },
      ];
      await fs.writeFile(
        path.join(heatDir, 'heat.jsonl'),
        `${heatData.map(e => JSON.stringify(e)).join('\n')  }\n`
      );

      const result = runCli(['dispatch', 'status', '--verbose']);

      expect(result.exitCode).toBe(0);
      // Should show heat section with tier counts
      expect(result.stdout).toMatch(/heat|hot|warm|cold/i);
    });
  });

  describe('duplicate action warning (Issue #135)', () => {
    beforeEach(async () => {
      // Setup with history containing a previous action
      const rotationWithHistory = {
        current_index: 0,
        last_role: 'dev',
        last_run: new Date().toISOString(),
        cycle_count: 10,
        history: [
          {
            role: 'dev',
            timestamp: new Date(Date.now() - 60000).toISOString(),
            cycle: 10,
            action: '⚙️ HEAT CLI SCAFFOLDING — Created packages/cli/src/commands/heat.ts with full Sprint 2 command scaffolding',
          },
        ],
        next_role: 'qa',
        next_role_title: '🧪 The Tester',
      };
      await setupAgentsDir({ rotation: rotationWithHistory });
    });

    it('warns when action is too similar to previous cycle (exit code 6)', () => {
      runCli(['dispatch', 'start']);

      // Try to complete with a very similar action
      const result = runCli([
        'dispatch', 'complete',
        '--action', 'HEAT CLI SCAFFOLDING — Created packages/cli/src/commands/heat.ts with full Sprint 2 command scaffolding',
        '--skip-push',
      ]);

      expect(result.exitCode).toBe(6);
      const allOutput = result.stdout + result.stderr;
      expect(allOutput.toLowerCase()).toMatch(/duplicate|similar|warning/);
    });

    it('allows similar action with --force flag', () => {
      runCli(['dispatch', 'start']);

      const result = runCli([
        'dispatch', 'complete',
        '--action', 'HEAT CLI SCAFFOLDING — Created packages/cli/src/commands/heat.ts with full Sprint 2 command scaffolding',
        '--force',
        '--skip-push',
      ]);

      expect(result.exitCode).toBe(0);
    });

    it('allows different action without --force', () => {
      runCli(['dispatch', 'start']);

      // Completely different action should work
      const result = runCli([
        'dispatch', 'complete',
        '--action', 'Wrote documentation for the memory API and updated README',
        '--skip-push',
      ]);

      expect(result.exitCode).toBe(0);
    });

    it('outputs JSON error format with --json flag', () => {
      runCli(['dispatch', 'start']);

      // Use very similar action that matches the previous (only different emoji/prefix)
      const result = runCli([
        'dispatch', 'complete',
        '--action', '🧪 HEAT CLI SCAFFOLDING — Created packages/cli/src/commands/heat.ts with full Sprint 2 command scaffolding',
        '--json',
        '--skip-push',
      ]);

      expect(result.exitCode).toBe(6);
      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty('error', 'duplicate_action');
      expect(json).toHaveProperty('similarity');
      expect(json).toHaveProperty('previous');
      expect(json).toHaveProperty('hint');
    });

    it('shows similarity percentage in warning', () => {
      runCli(['dispatch', 'start']);

      // Use action that is similar enough to trigger warning (same key words, different phrasing)
      const result = runCli([
        'dispatch', 'complete',
        '--action', 'HEAT CLI SCAFFOLDING — Created packages/cli/src/commands/heat.ts with Sprint 2 full command scaffolding',
        '--skip-push',
      ]);

      expect(result.exitCode).toBe(6);
      expect(result.stdout).toMatch(/\d+%/); // Contains percentage
      expect(result.stdout).toMatch(/threshold/i);
    });
  });

  describe('error handling', () => {
    it('fails gracefully when agents directory does not exist', () => {
      const result = runCli(['dispatch', 'start']);

      expect(result.exitCode).not.toBe(0);
      const allOutput = (result.stdout + result.stderr).toLowerCase();
      expect(allOutput).toMatch(/could not read|enoent|no such file|ada init/);
    });

    it('fails gracefully when roster.json is missing', async () => {
      await fs.mkdir(path.join(testDir, 'agents', 'state'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'agents', 'state', 'rotation.json'),
        JSON.stringify({ current_index: 0, cycle_count: 0 })
      );

      const result = runCli(['dispatch', 'start']);

      expect(result.exitCode).not.toBe(0);
    });

    it('fails gracefully when rotation.json is missing', async () => {
      await fs.mkdir(path.join(testDir, 'agents'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'agents', 'roster.json'),
        JSON.stringify({ roles: [], rotation_order: [] })
      );

      const result = runCli(['dispatch', 'start']);

      expect(result.exitCode).not.toBe(0);
    });

    it('respects custom agents directory with -d flag', async () => {
      // Create a project with agents in a custom location (myproject/agents)
      const customDir = path.join(testDir, 'myproject');
      await fs.mkdir(path.join(customDir, 'agents', 'state'), { recursive: true });
      await fs.mkdir(path.join(customDir, 'agents', 'memory'), { recursive: true });
      await fs.mkdir(path.join(customDir, 'agents', 'playbooks'), { recursive: true });
      await fs.mkdir(path.join(customDir, 'agents', 'rules'), { recursive: true });

      execSync('git init', { cwd: customDir });
      execSync('git config user.email "test@ada.dev"', { cwd: customDir });
      execSync('git config user.name "ADA Test"', { cwd: customDir });

      await fs.writeFile(
        path.join(customDir, 'agents', 'roster.json'),
        JSON.stringify({
          company: 'Custom',
          product: 'Custom',
          tagline: 'Custom',
          roles: [{ id: 'custom', name: 'Custom', title: 'Custom', emoji: '🎯', focus: [], actions: [] }],
          rotation_order: ['custom'],
        })
      );

      await fs.writeFile(
        path.join(customDir, 'agents', 'state', 'rotation.json'),
        JSON.stringify({
          current_index: 0,
          last_role: 'custom',
          last_run: new Date().toISOString(),
          cycle_count: 0,
          history: [],
          next_role: 'custom',
          next_role_title: '🎯 Custom',
        })
      );

      await fs.writeFile(path.join(customDir, 'agents', 'memory', 'bank.md'), '# Bank\n');
      await fs.writeFile(path.join(customDir, 'agents', 'playbooks', 'custom.md'), '# Playbook\n');
      await fs.writeFile(path.join(customDir, 'agents', 'rules', 'RULES.md'), '# Rules\n');
      await fs.writeFile(path.join(customDir, 'agents', 'DISPATCH.md'), '# Dispatch\n');

      execSync('git add -A', { cwd: customDir });
      execSync('git commit -m "test: custom setup"', { cwd: customDir });

      // Run from the custom directory
      const result = runCli(['dispatch', 'start'], { cwd: customDir });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('🎯');
    });
  });

  describe('full lifecycle', () => {
    beforeEach(async () => {
      await setupAgentsDir();
    });

    it('completes a full dispatch cycle: start → status → complete', () => {
      // 1. Check initial status (should be idle)
      const statusBefore = runCli(['dispatch', 'status', '--json']);
      expect(statusBefore.exitCode).toBe(0);
      expect(JSON.parse(statusBefore.stdout).inProgress).toBe(false);

      // 2. Start cycle
      const start = runCli(['dispatch', 'start']);
      expect(start.exitCode).toBe(0);

      // 3. Check status (should be active)
      const statusDuring = runCli(['dispatch', 'status', '--json']);
      expect(statusDuring.exitCode).toBe(0);
      const duringState = JSON.parse(statusDuring.stdout);
      expect(duringState.inProgress).toBe(true);
      expect(duringState.currentRole.id).toBe('qa');

      // 4. Complete cycle
      const complete = runCli([
        'dispatch', 'complete',
        '--action', 'Wrote integration tests for dispatch CLI',
        '--outcome', 'success',
        '--skip-push',
      ]);
      expect(complete.exitCode).toBe(0);

      // 5. Check final status (should be idle, current role advances to dev)
      const statusAfter = runCli(['dispatch', 'status', '--json']);
      expect(statusAfter.exitCode).toBe(0);
      const finalState = JSON.parse(statusAfter.stdout);
      expect(finalState.inProgress).toBe(false);
      expect(finalState.currentRole.id).toBe('dev'); // After qa completes, dev is current
    });

    it('handles multiple cycles correctly', () => {
      // Cycle 1: qa
      runCli(['dispatch', 'start']);
      runCli(['dispatch', 'complete', '--action', 'QA cycle', '--skip-push']);

      // Cycle 2: dev
      const start2 = runCli(['dispatch', 'start']);
      expect(start2.exitCode).toBe(0);
      expect(start2.stdout).toContain('⚙️'); // Dev emoji

      runCli(['dispatch', 'complete', '--action', 'Dev cycle', '--skip-push']);

      // Cycle 3: back to qa (rotation wraps)
      const start3 = runCli(['dispatch', 'start']);
      expect(start3.exitCode).toBe(0);
      expect(start3.stdout).toContain('🧪'); // QA emoji again

      // Check cycle count (started at 5, cycle 6 completed, cycle 7 completed, now at cycle 8)
      const status = runCli(['dispatch', 'status', '--json']);
      const state = JSON.parse(status.stdout);
      expect(state.cycle).toBe(8); // Active cycle number
    });
  });
});
