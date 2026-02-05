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
 * Updated for enhanced status command (PR #37).
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

    // Should display the header (new format: 🤖 ADA Status — <project>)
    expect(output).toContain('🤖 ADA Status');
  });

  it('shows current and next role info', () => {
    const output = runAda(['status']);

    // The status should show current and next role
    expect(output).toContain('Current Role:');
    expect(output).toContain('Next Role:');
    expect(output).toContain('Cycle:');
  });

  it('shows last action in rotation', () => {
    const output = runAda(['status']);

    // Should show last action (might be "(none)" for fresh init)
    expect(output).toContain('Last Action:');
  });

  it('shows memory bank summary', () => {
    const output = runAda(['status']);

    // Memory bank line with path, version, and lines
    expect(output).toContain('Memory Bank:');
    expect(output).toContain('agents/memory/bank.md');
    expect(output).toMatch(/v\d+/); // version number
    expect(output).toMatch(/\d+ lines/); // line count
  });

  it('supports --json flag for machine-readable output', () => {
    const output = runAda(['status', '--json']);

    // Parse JSON output
    const status = JSON.parse(output);

    // Verify structure (camelCase keys per PR #37)
    expect(status).toHaveProperty('rotation');
    expect(status).toHaveProperty('roster');
    expect(status).toHaveProperty('memoryBank');

    // Rotation state (camelCase)
    expect(status.rotation).toHaveProperty('currentIndex');
    expect(status.rotation).toHaveProperty('cycleCount');
    expect(status.rotation.cycleCount).toBe(0);

    // Roster summary
    expect(status.roster).toHaveProperty('company');
    expect(status.roster).toHaveProperty('product');
    expect(status.roster).toHaveProperty('roleCount');
    expect(status.roster).toHaveProperty('rotationOrder');

    // Memory bank stats
    expect(status.memoryBank).toHaveProperty('lines');
    expect(status.memoryBank).toHaveProperty('version');
  });

  it('respects --dir option for custom agents directory', async () => {
    // Re-init with custom directory
    await fs.rm(path.join(testDir, 'agents'), { recursive: true, force: true });
    runAda(['init', '--dir', 'my-agents']);

    const output = runAda(['status', '--dir', 'my-agents']);

    expect(output).toContain('🤖 ADA Status');
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
    expect(status.rotation.cycleCount).toBe(0);
    expect(status.rotation.currentIndex).toBe(0);
  });

  it('shows correct role count based on team size', () => {
    // Default is small (3 roles)
    const output = runAda(['status', '--json']);
    const status = JSON.parse(output);

    expect(status.roster.roleCount).toBe(3);
    expect(status.roster.rotationOrder.length).toBe(3);
  });

  it('shows role emoji and names in human output', () => {
    const output = runAda(['status']);

    // Should show role info with emoji (checking for emoji presence)
    expect(output).toMatch(/[\u{1F300}-\u{1F9FF}]/u); // Unicode emoji range
    expect(output).toContain('CEO'); // Default small team has CEO
  });
});
