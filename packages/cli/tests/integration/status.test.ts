/**
 * Integration tests for `ada status` command.
 *
 * These tests verify the status output:
 * - Rotation state display
 * - Memory bank summary
 * - Team overview
 * - JSON output mode
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
function runAda(
  args: string[],
  options: Partial<ExecSyncOptions> = {}
): string {
  const cmd = `node ${cliPath} ${args.join(' ')}`;
  return execSync(cmd, {
    cwd: testDir,
    encoding: 'utf-8',
    timeout: 30_000,
    ...options,
  });
}

describe('ada status — integration tests', () => {
  beforeEach(async () => {
    // Create unique temp directory
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'ada-status-test-'));

    // Initialize an agent team first (required for status to work)
    runAda(['init']);
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('displays team status without errors', () => {
    const output = runAda(['status']);

    // Should display the header
    expect(output).toContain('ADA — Agent Team Status');
  });

  it('shows company and product info from roster', () => {
    const output = runAda(['status']);

    // The status should include company/product (from roster.json)
    // Default values from init
    expect(output).toContain('Company:');
    expect(output).toContain('Product:');
  });

  it('shows current role in rotation', () => {
    const output = runAda(['status']);

    // Should show the team with current marker
    expect(output).toContain('Team');
    expect(output).toContain('CURRENT');
  });

  it('shows memory bank summary', () => {
    const output = runAda(['status']);

    // Memory bank section
    expect(output).toContain('Memory Bank');
    expect(output).toContain('Lines:');
    expect(output).toContain('Version:');
    expect(output).toContain('Cycle:');
  });

  it('supports --json flag for machine-readable output', () => {
    const output = runAda(['status', '--json']);

    // Parse JSON output
    const status = JSON.parse(output);

    // Verify structure
    expect(status).toHaveProperty('rotation');
    expect(status).toHaveProperty('roster');
    expect(status).toHaveProperty('memoryBank');

    // Rotation state
    expect(status.rotation).toHaveProperty('current_index');
    expect(status.rotation).toHaveProperty('cycle_count');
    expect(status.rotation.cycle_count).toBe(0);

    // Roster summary
    expect(status.roster).toHaveProperty('company');
    expect(status.roster).toHaveProperty('product');
    expect(status.roster).toHaveProperty('roleCount');
    expect(status.roster).toHaveProperty('rotationOrder');

    // Memory bank stats
    expect(status.memoryBank).toHaveProperty('lines');
    expect(status.memoryBank).toHaveProperty('version');
    expect(status.memoryBank).toHaveProperty('cycle');
  });

  it('respects --dir option for custom agents directory', async () => {
    // Re-init with custom directory
    await fs.rm(path.join(testDir, 'agents'), { recursive: true, force: true });
    runAda(['init', '--dir', 'my-agents']);

    const output = runAda(['status', '--dir', 'my-agents']);

    expect(output).toContain('ADA — Agent Team Status');
  });

  it('fails gracefully when agents directory does not exist', async () => {
    // Remove agents directory
    await fs.rm(path.join(testDir, 'agents'), { recursive: true, force: true });

    let error: Error | null = null;
    try {
      runAda(['status']);
    } catch (e) {
      error = e as Error;
    }

    expect(error).not.toBeNull();
    expect(error?.message).toContain('ada init');
  });

  it('shows correct cycle count after initialization', () => {
    const output = runAda(['status', '--json']);
    const status = JSON.parse(output);

    // Fresh init should be at cycle 0
    expect(status.rotation.cycle_count).toBe(0);
    expect(status.rotation.current_index).toBe(0);
    expect(status.memoryBank.cycle).toBe(0);
  });

  it('shows correct role count based on team size', () => {
    // Default is small (3 roles)
    const output = runAda(['status', '--json']);
    const status = JSON.parse(output);

    expect(status.roster.roleCount).toBe(3);
    expect(status.roster.rotationOrder.length).toBe(3);
  });

  it('shows all team roles in human output', () => {
    const output = runAda(['status']);

    // Small team roles
    expect(output).toContain('CEO');
    expect(output).toContain('Engineer');
    expect(output).toContain('Ops');
  });
});
