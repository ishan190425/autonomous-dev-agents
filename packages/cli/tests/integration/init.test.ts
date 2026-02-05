/**
 * Integration tests for `ada init` command.
 *
 * These tests verify the full command behavior:
 * - Template file creation
 * - Roster customization
 * - Rotation state initialization
 * - Memory bank generation
 * - Error handling
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
 * Execute `ada` CLI command in the test directory.
 */
function runAda(args: string[], options: Partial<ExecSyncOptions> = {}): string {
  const cmd = `node ${cliPath} ${args.join(' ')}`;
  return execSync(cmd, {
    cwd: testDir,
    encoding: 'utf-8',
    timeout: 30_000,
    ...options,
  });
}

/**
 * Check if a file exists.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read JSON file from test directory.
 */
async function readJson<T>(relativePath: string): Promise<T> {
  const content = await fs.readFile(path.join(testDir, relativePath), 'utf-8');
  return JSON.parse(content) as T;
}

describe('ada init — integration tests', () => {
  beforeEach(async () => {
    // Create unique temp directory
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'ada-init-test-'));
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('creates agents directory with required files', async () => {
    const output = runAda(['init']);

    // Verify success message
    expect(output).toContain('Agent team initialized successfully');

    // Verify required files exist
    expect(await fileExists(path.join(testDir, 'agents/DISPATCH.md'))).toBe(true);
    expect(await fileExists(path.join(testDir, 'agents/roster.json'))).toBe(true);
    expect(await fileExists(path.join(testDir, 'agents/state/rotation.json'))).toBe(true);
    expect(await fileExists(path.join(testDir, 'agents/memory/bank.md'))).toBe(true);
    expect(await fileExists(path.join(testDir, 'agents/config.json'))).toBe(true);
    expect(await fileExists(path.join(testDir, 'agents/rules/RULES.md'))).toBe(true);
  });

  it('creates valid roster.json with roles and rotation order', async () => {
    runAda(['init']);

    const roster = await readJson<{
      company: string;
      product: string;
      roles: Array<{ id: string; name: string; emoji: string }>;
      rotation_order: string[];
    }>('agents/roster.json');

    // Verify roster structure
    expect(roster).toHaveProperty('company');
    expect(roster).toHaveProperty('product');
    expect(roster).toHaveProperty('roles');
    expect(roster).toHaveProperty('rotation_order');

    // Roles should be non-empty
    expect(roster.roles.length).toBeGreaterThan(0);

    // Each role should have required fields
    for (const role of roster.roles) {
      expect(role).toHaveProperty('id');
      expect(role).toHaveProperty('name');
      expect(role).toHaveProperty('emoji');
    }

    // Rotation order should match role ids
    for (const roleId of roster.rotation_order) {
      const roleExists = roster.roles.some((r) => r.id === roleId);
      expect(roleExists).toBe(true);
    }
  });

  it('creates valid rotation.json initialized at cycle 0', async () => {
    runAda(['init']);

    const rotation = await readJson<{
      current_index: number;
      cycle_count: number;
      history: unknown[];
      last_role: string | null;
      last_run: string | null;
    }>('agents/state/rotation.json');

    expect(rotation.current_index).toBe(0);
    expect(rotation.cycle_count).toBe(0);
    expect(rotation.history).toEqual([]);
    expect(rotation.last_role).toBeNull();
    expect(rotation.last_run).toBeNull();
  });

  it('creates memory bank with initial structure', async () => {
    runAda(['init']);

    const bankContent = await fs.readFile(
      path.join(testDir, 'agents/memory/bank.md'),
      'utf-8'
    );

    // Verify memory bank has required sections
    expect(bankContent).toContain('# 🧠 Memory Bank');
    expect(bankContent).toContain('## Current Status');
    expect(bankContent).toContain('## Architecture Decisions');
    expect(bankContent).toContain('## Role State');
    expect(bankContent).toContain('## Project Metrics');
  });

  it('respects --dir option for custom agents directory', async () => {
    runAda(['init', '--dir', 'custom-agents']);

    // Custom directory should exist
    expect(await fileExists(path.join(testDir, 'custom-agents/roster.json'))).toBe(true);
    expect(await fileExists(path.join(testDir, 'custom-agents/state/rotation.json'))).toBe(true);

    // Default agents/ should NOT exist
    expect(await fileExists(path.join(testDir, 'agents'))).toBe(false);
  });

  it('fails if agents directory exists without --overwrite', async () => {
    // Create agents directory first
    await fs.mkdir(path.join(testDir, 'agents'), { recursive: true });

    // Running init without --overwrite should fail
    let error: Error | null = null;
    let output = '';
    try {
      // Capture combined stdout/stderr
      output = runAda(['init'], { stdio: 'pipe' });
    } catch (e: unknown) {
      error = e as Error;
      // execSync throws an error with stdout captured
      if (e && typeof e === 'object' && 'stdout' in e) {
        output = String((e as { stdout: Buffer }).stdout);
      }
    }

    expect(error).not.toBeNull();
    // The "already exists" message goes to stdout before exit(1)
    expect(output).toContain('already exists');
  });

  it('overwrites existing directory with --overwrite flag', async () => {
    // Create existing directory with marker file
    const agentsDir = path.join(testDir, 'agents');
    await fs.mkdir(agentsDir, { recursive: true });
    await fs.writeFile(path.join(agentsDir, 'marker.txt'), 'should be removed');

    // Run init with --overwrite
    const output = runAda(['init', '--overwrite']);

    // Verify success
    expect(output).toContain('Agent team initialized successfully');

    // Marker file should be gone
    expect(await fileExists(path.join(agentsDir, 'marker.txt'))).toBe(false);

    // New files should exist
    expect(await fileExists(path.join(agentsDir, 'roster.json'))).toBe(true);
  });

  it('uses small team size by default', async () => {
    runAda(['init']);

    const roster = await readJson<{
      rotation_order: string[];
    }>('agents/roster.json');

    // Small team has 3 roles: ceo, engineering, ops
    expect(roster.rotation_order.length).toBe(3);
    expect(roster.rotation_order).toContain('ceo');
    expect(roster.rotation_order).toContain('engineering');
    expect(roster.rotation_order).toContain('ops');
  });

  it('respects --team-size=medium option', async () => {
    runAda(['init', '--team-size', 'medium']);

    const roster = await readJson<{
      rotation_order: string[];
    }>('agents/roster.json');

    // Medium team has 5 roles: ceo, product, engineering, ops, research
    expect(roster.rotation_order.length).toBe(5);
    expect(roster.rotation_order).toContain('ceo');
    expect(roster.rotation_order).toContain('product');
    expect(roster.rotation_order).toContain('engineering');
    expect(roster.rotation_order).toContain('ops');
    expect(roster.rotation_order).toContain('research');
  });

  it('respects --team-size=large option', async () => {
    runAda(['init', '--team-size', 'large']);

    const roster = await readJson<{
      rotation_order: string[];
    }>('agents/roster.json');

    // Large team has 8 roles
    expect(roster.rotation_order.length).toBe(8);
    expect(roster.rotation_order).toContain('ceo');
    expect(roster.rotation_order).toContain('growth');
    expect(roster.rotation_order).toContain('design');
    expect(roster.rotation_order).toContain('scrum');
  });

  it('creates config.json with default settings', async () => {
    runAda(['init']);

    const config = await readJson<{
      agentsDir: string;
      templatesDir: string;
      defaultBranch: string;
      maxHistory: number;
      compressionThreshold: number;
    }>('agents/config.json');

    // Verify required config fields from DEFAULT_CONFIG
    expect(config).toHaveProperty('agentsDir');
    expect(config).toHaveProperty('templatesDir');
    expect(config).toHaveProperty('defaultBranch');
    expect(config).toHaveProperty('maxHistory');
    expect(config).toHaveProperty('compressionThreshold');
    expect(config.agentsDir).toBe('agents');
    expect(config.defaultBranch).toBe('main');
  });

  it('creates playbooks directory with role playbooks', async () => {
    runAda(['init', '--team-size', 'large']); // Large to get all playbooks

    const playbooksDir = path.join(testDir, 'agents/playbooks');
    expect(await fileExists(playbooksDir)).toBe(true);

    // Should have at least the base playbooks
    expect(await fileExists(path.join(playbooksDir, 'ceo.md'))).toBe(true);
    expect(await fileExists(path.join(playbooksDir, 'engineering.md'))).toBe(true);
  });
});
