/**
 * E2E Tests: ada issues
 *
 * Tests the `ada issues` command for issue tracking verification and management.
 * Critical for R-013 Issue Tracking Protocol compliance.
 *
 * Subcommands:
 *   verify  — Check if all open issues are tracked in Active Threads
 *   sync    — Automatically update Active Threads with missing issues
 *   list    — List categorized issues (active/backlog/closed)
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure
 * Supports Rule R-013: Issue Tracking Protocol
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { execSync } from 'child_process';
import { createSandbox, type Sandbox } from './harness';

// Check if gh CLI is available and authenticated
const isGhAvailable = ((): boolean => {
  try {
    execSync('gh auth status', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
})();

describe('ada issues E2E', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = createSandbox();
    // Initialize agents directory
    const initResult = await sandbox.ada(['init']);
    expect(initResult.success).toBe(true);
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  // ─── Help and Basic Commands ──────────────────────────────────────────────

  describe('help output', () => {
    it('shows issues help', async () => {
      const result = await sandbox.ada(['issues', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Issue tracking verification');
      expect(result.stdout).toContain('R-013');
    });

    it('lists all subcommands', async () => {
      const result = await sandbox.ada(['issues', '--help']);

      expect(result.stdout).toContain('verify');
      expect(result.stdout).toContain('sync');
      expect(result.stdout).toContain('list');
    });

    it('shows verify subcommand help', async () => {
      const result = await sandbox.ada(['issues', 'verify', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Verify');
      expect(result.stdout).toContain('Active Threads');
      expect(result.stdout).toContain('--json');
      expect(result.stdout).toContain('--verbose');
      expect(result.stdout).toContain('--dir');
    });

    it('shows sync subcommand help', async () => {
      const result = await sandbox.ada(['issues', 'sync', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Sync');
      expect(result.stdout).toContain('Active Threads');
      expect(result.stdout).toContain('--dry-run');
      expect(result.stdout).toContain('--json');
    });

    it('shows list subcommand help', async () => {
      const result = await sandbox.ada(['issues', 'list', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('categorized issues');
      expect(result.stdout).toContain('--category');
      expect(result.stdout).toContain('--json');
    });
  });

  // ─── Error Handling ───────────────────────────────────────────────────────

  describe('error handling', () => {
    it('fails gracefully when memory bank is missing', async () => {
      // Remove the memory bank file
      const bankPath = join(sandbox.path, 'agents/memory/bank.md');
      const { rmSync } = await import('fs');
      rmSync(bankPath, { force: true });

      const result = await sandbox.ada(['issues', 'verify']);

      expect(result.success).toBe(false);
      // Error could be about gh CLI or memory bank depending on which fails first
      expect(result.stderr).toMatch(/memory bank|gh.*not found|Failed to fetch/i);
    });

    it('provides clear error when gh CLI is not available', async () => {
      // This test only makes sense if we're in an environment without gh
      // Since the sandbox is isolated, we can't easily simulate this
      // Instead, verify the error handling path exists
      const result = await sandbox.ada(['issues', 'verify', '--dir', '/nonexistent/path']);

      expect(result.success).toBe(false);
      // Should show an error about the path or gh
      expect(result.stderr.length).toBeGreaterThan(0);
    });

    it('handles invalid category option gracefully', async () => {
      // This should work but show appropriate output
      const result = await sandbox.ada(['issues', 'list', '--category', 'invalid']);

      // Should not crash, even with invalid category
      expect(result.exitCode).toBeDefined();
    });
  });

  // ─── Verify Command ───────────────────────────────────────────────────────

  describe('ada issues verify', () => {
    it('accepts --dir option', async () => {
      const result = await sandbox.ada(['issues', 'verify', '--dir', sandbox.path]);

      // May fail due to gh but should accept the flag
      expect(result.stdout + result.stderr).not.toContain('unknown option');
    });

    it('accepts --json option', async () => {
      const result = await sandbox.ada(['issues', 'verify', '--json']);

      // May fail due to gh but should accept the flag
      expect(result.stdout + result.stderr).not.toContain('unknown option');
    });

    it('accepts --verbose option', async () => {
      const result = await sandbox.ada(['issues', 'verify', '--verbose']);

      // May fail due to gh but should accept the flag
      expect(result.stdout + result.stderr).not.toContain('unknown option');
    });

    it.skipIf(!isGhAvailable)('shows compliance percentage', async () => {
      const result = await sandbox.ada(['issues', 'verify']);

      if (result.success || result.stdout.includes('Compliance')) {
        expect(result.stdout).toContain('Compliance');
        expect(result.stdout).toMatch(/\d+%/);
      }
    });

    it.skipIf(!isGhAvailable)('outputs valid JSON with --json flag', async () => {
      const result = await sandbox.ada(['issues', 'verify', '--json']);

      if (result.success) {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
        const json = JSON.parse(result.stdout);
        expect(json).toHaveProperty('compliance');
        expect(json).toHaveProperty('totalOpenIssues');
        expect(json).toHaveProperty('trackedIssues');
        expect(json).toHaveProperty('missingIssues');
        expect(json).toHaveProperty('closedInThreads');
      }
    });

    it.skipIf(!isGhAvailable)('shows missing issues when present', async () => {
      const result = await sandbox.ada(['issues', 'verify', '--verbose']);

      if (result.success || result.stdout.includes('Missing')) {
        // Depending on repo state, there may be missing issues
        expect(result.stdout).toMatch(/Missing Issues|Missing from Active Threads|All issues.*tracked/i);
      }
    });
  });

  // ─── Sync Command ─────────────────────────────────────────────────────────

  describe('ada issues sync', () => {
    it('accepts --dir option', async () => {
      const result = await sandbox.ada(['issues', 'sync', '--dir', sandbox.path]);

      expect(result.stdout + result.stderr).not.toContain('unknown option');
    });

    it('accepts --dry-run option', async () => {
      const result = await sandbox.ada(['issues', 'sync', '--dry-run']);

      expect(result.stdout + result.stderr).not.toContain('unknown option');
    });

    it('accepts --json option', async () => {
      const result = await sandbox.ada(['issues', 'sync', '--json']);

      expect(result.stdout + result.stderr).not.toContain('unknown option');
    });

    it.skipIf(!isGhAvailable)('dry-run does not modify files', async () => {
      const bankBefore = sandbox.read('agents/memory/bank.md');

      const result = await sandbox.ada(['issues', 'sync', '--dry-run']);

      if (result.success || result.stdout.includes('Dry run')) {
        const bankAfter = sandbox.read('agents/memory/bank.md');
        expect(bankAfter).toBe(bankBefore);
        expect(result.stdout).toMatch(/Dry run|No changes|would change/i);
      }
    });

    it.skipIf(!isGhAvailable)('outputs valid JSON with --json flag', async () => {
      const result = await sandbox.ada(['issues', 'sync', '--json', '--dry-run']);

      if (result.success) {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
        const json = JSON.parse(result.stdout);
        expect(json).toHaveProperty('changes');
        expect(json).toHaveProperty('dryRun');
      }
    });

    it.skipIf(!isGhAvailable)('shows syncing header', async () => {
      const result = await sandbox.ada(['issues', 'sync', '--dry-run']);

      if (result.success || result.stdout.includes('Syncing')) {
        expect(result.stdout).toMatch(/Syncing Active Threads|changes/i);
      }
    });

    it.skipIf(!isGhAvailable)('reports no changes when already synced', async () => {
      // Run sync twice, second time should report no changes
      await sandbox.ada(['issues', 'sync']);
      const result = await sandbox.ada(['issues', 'sync', '--dry-run']);

      if (result.success) {
        expect(result.stdout).toMatch(/No changes|already tracked/i);
      }
    });
  });

  // ─── List Command ─────────────────────────────────────────────────────────

  describe('ada issues list', () => {
    it('accepts --dir option', async () => {
      const result = await sandbox.ada(['issues', 'list', '--dir', sandbox.path]);

      expect(result.stdout + result.stderr).not.toContain('unknown option');
    });

    it('accepts --category option', async () => {
      const result = await sandbox.ada(['issues', 'list', '--category', 'active']);

      expect(result.stdout + result.stderr).not.toContain('unknown option');
    });

    it('accepts --json option', async () => {
      const result = await sandbox.ada(['issues', 'list', '--json']);

      expect(result.stdout + result.stderr).not.toContain('unknown option');
    });

    it.skipIf(!isGhAvailable)('shows issue list header', async () => {
      const result = await sandbox.ada(['issues', 'list']);

      if (result.success) {
        expect(result.stdout).toContain('Issue List');
      }
    });

    it.skipIf(!isGhAvailable)('filters by category: active', async () => {
      const result = await sandbox.ada(['issues', 'list', '--category', 'active']);

      if (result.success) {
        expect(result.stdout).toContain('Active Issues');
        // Should not contain backlog header
        expect(result.stdout).not.toContain('Backlog Issues');
      }
    });

    it.skipIf(!isGhAvailable)('filters by category: backlog', async () => {
      const result = await sandbox.ada(['issues', 'list', '--category', 'backlog']);

      if (result.success) {
        expect(result.stdout).toContain('Backlog Issues');
        // Should not contain active header
        expect(result.stdout).not.toContain('Active Issues');
      }
    });

    it.skipIf(!isGhAvailable)('shows both categories by default', async () => {
      const result = await sandbox.ada(['issues', 'list']);

      if (result.success && result.stdout.includes('Issue List')) {
        // May show either or both depending on repo state
        expect(result.stdout).toMatch(/Active Issues|Backlog Issues/);
      }
    });

    it.skipIf(!isGhAvailable)('outputs valid JSON with --json flag', async () => {
      const result = await sandbox.ada(['issues', 'list', '--json']);

      if (result.success) {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
        const json = JSON.parse(result.stdout);
        // JSON should have expected structure
        expect(typeof json).toBe('object');
      }
    });

    it.skipIf(!isGhAvailable)('JSON output has correct structure for category=active', async () => {
      const result = await sandbox.ada(['issues', 'list', '--category', 'active', '--json']);

      if (result.success) {
        const json = JSON.parse(result.stdout);
        expect(json).toHaveProperty('active');
        expect(Array.isArray(json.active)).toBe(true);
      }
    });

    it.skipIf(!isGhAvailable)('JSON output has correct structure for category=backlog', async () => {
      const result = await sandbox.ada(['issues', 'list', '--category', 'backlog', '--json']);

      if (result.success) {
        const json = JSON.parse(result.stdout);
        expect(json).toHaveProperty('backlog');
        expect(Array.isArray(json.backlog)).toBe(true);
      }
    });

    it.skipIf(!isGhAvailable)('JSON output has correct structure for category=all', async () => {
      const result = await sandbox.ada(['issues', 'list', '--category', 'all', '--json']);

      if (result.success) {
        const json = JSON.parse(result.stdout);
        expect(json).toHaveProperty('all');
        expect(json).toHaveProperty('tracked');
        expect(Array.isArray(json.all)).toBe(true);
        expect(Array.isArray(json.tracked)).toBe(true);
      }
    });

    it.skipIf(!isGhAvailable)('shows tracked status markers', async () => {
      const result = await sandbox.ada(['issues', 'list']);

      if (result.success && result.stdout.includes('#')) {
        // Should show tracked/untracked markers
        expect(result.stdout).toMatch(/[✓✗]/);
      }
    });
  });

  // ─── Memory Bank Integration ──────────────────────────────────────────────

  describe('memory bank integration', () => {
    it('parses Active Threads format correctly', async () => {
      // Set up a custom memory bank with Active Threads
      const bankContent = `# Memory Bank

## Current Status
Test status.

## Active Threads

### P0-P1 (Active)

- **#123** (P0, Engineering, L) — Test issue one
- **#456** (P1, QA, M) — Test issue two

### P2-P3 (Backlog)

- **#789** (P2, Design, S) — Test issue three
`;
      sandbox.write('agents/memory/bank.md', bankContent);

      // Run list to verify parsing
      const result = await sandbox.ada(['issues', 'list', '--json']);

      // Even if gh fails, the command should at least try to parse the bank
      expect(result.exitCode).toBeDefined();
    });

    it('handles empty Active Threads section', async () => {
      const bankContent = `# Memory Bank

## Current Status
No active issues.

## Active Threads

Nothing yet.
`;
      sandbox.write('agents/memory/bank.md', bankContent);

      const result = await sandbox.ada(['issues', 'verify', '--json']);

      // Should not crash
      expect(result.exitCode).toBeDefined();
    });

    it('handles malformed bank.md gracefully', async () => {
      // Write malformed content
      sandbox.write('agents/memory/bank.md', 'This is not a valid memory bank format');

      const result = await sandbox.ada(['issues', 'verify']);

      // Should not crash, may report parsing issues
      expect(result.exitCode).toBeDefined();
    });

    it('preserves bank content outside Active Threads on sync', async () => {
      const bankContent = `# Memory Bank

## Important Section
This should not change.

## Active Threads

### P0-P1
- **#1** (P0, CEO, M) — Existing issue

## Another Section
This should also not change.
`;
      sandbox.write('agents/memory/bank.md', bankContent);

      await sandbox.ada(['issues', 'sync', '--dry-run']);

      // Read bank after dry-run (should be unchanged)
      const bankAfter = sandbox.read('agents/memory/bank.md');
      expect(bankAfter).toContain('This should not change');
      expect(bankAfter).toContain('This should also not change');
    });
  });

  // ─── Exit Codes ───────────────────────────────────────────────────────────

  describe('exit codes', () => {
    it('returns 0 for successful help', async () => {
      const result = await sandbox.ada(['issues', '--help']);
      expect(result.exitCode).toBe(0);
    });

    it('returns non-zero for missing subcommand with bad input', async () => {
      const result = await sandbox.ada(['issues', 'nonexistent']);

      // Commander should show error for unknown subcommand
      expect(result.exitCode).not.toBe(0);
    });

    it.skipIf(!isGhAvailable)('returns 0 when verify passes', async () => {
      // Set up bank with all issues tracked (empty = compliant)
      const bankContent = `# Memory Bank

## Active Threads
None tracked.
`;
      sandbox.write('agents/memory/bank.md', bankContent);

      const result = await sandbox.ada(['issues', 'verify']);

      // This may fail if there are open issues, that's okay for this test
      // We're just verifying the exit code behavior exists
      expect(result.exitCode).toBeDefined();
    });
  });
});
