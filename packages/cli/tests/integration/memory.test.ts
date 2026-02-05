/**
 * Integration tests for `ada memory` command.
 *
 * These tests verify:
 * - Memory search semantic similarity
 * - Memory list functionality
 * - Filter options (role, kind, limit)
 * - JSON output mode
 * - Error handling
 *
 * @see Issue #40 for specification
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

/**
 * Create a populated memory bank for testing.
 */
async function createTestMemoryBank(agentsDir: string): Promise<void> {
  const memoryDir = path.join(agentsDir, 'memory');
  await fs.mkdir(memoryDir, { recursive: true });
  await fs.mkdir(path.join(memoryDir, 'archives'), { recursive: true });

  const bankContent = `# 🧠 Memory Bank

> Test memory bank for integration tests.
> **Last updated:** 2026-02-05 12:00:00 EST | **Cycle:** 10 | **Version:** 1

---

## Current Status

### Completed ✅

- **JWT authentication** — Implemented in core library
- **API rate limiting** — Added middleware layer

### In Progress

- **OAuth integration** — Working on Google OAuth flow
- **Database migration** — Schema updates for v2

### Blockers

- Need security review for auth changes

---

## Architecture Decisions

| ID      | Decision                              | Date       | Author      |
| ------- | ------------------------------------- | ---------- | ----------- |
| ADR-001 | Use JWT for API authentication        | 2026-02-01 | engineering |
| ADR-002 | PostgreSQL with Prisma ORM            | 2026-02-02 | engineering |
| ADR-003 | Monorepo with npm workspaces          | 2026-02-03 | ops         |

---

## Lessons Learned

1. **Always test auth flows end-to-end** — Caught JWT expiry bug in staging
2. **Database migrations need rollback plans** — Production incident taught us
3. **CI caching saves significant time** — 50% build time reduction

---

## Role State

### 👔 CEO — The Founder

- **Last:** Strategic planning session
- **Working on:** Series A prep
- **Pipeline:** Investor outreach

### ⚙️ Engineering — The Builder

- **Last:** JWT authentication implementation
- **Working on:** OAuth integration
- **Pipeline:** API v2 endpoints

### 🛡️ Ops — The Guardian

- **Last:** CI/CD pipeline optimization
- **Working on:** Security audit
- **Pipeline:** Monitoring setup

---

## Active Threads

- Engineering → Security: Auth implementation review needed
- Ops → Engineering: Performance benchmarks pending

---

## Open Questions

- How to handle token refresh in mobile apps?
- Should we support SAML for enterprise?

---
`;

  await fs.writeFile(path.join(memoryDir, 'bank.md'), bankContent);
}

describe('ada memory — integration tests', () => {
  beforeEach(async () => {
    // Create unique temp directory
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'ada-memory-test-'));

    // Initialize an agent team
    runAda(['init']);

    // Replace the default memory bank with test data
    const agentsDir = path.join(testDir, 'agents');
    await createTestMemoryBank(agentsDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('ada memory search', () => {
    it('finds memories by semantic similarity', () => {
      const output = runAda(['memory', 'search', 'authentication']);

      // Should find JWT-related entries
      expect(output).toContain('Found');
      expect(output).toContain('memories');
    });

    it('shows similarity scores in output', () => {
      const output = runAda(['memory', 'search', 'authentication']);

      // Score format: [XXX%]
      expect(output).toMatch(/\[\s*\d+%\]/);
    });

    it('respects --limit option', () => {
      // Use a broad query that will match multiple entries (single argument)
      const output = runAda([
        'memory',
        'search',
        'authentication',
        '--limit',
        '2',
        '--threshold',
        '0.1',
      ]);

      // Should either find results (limited to 2) or report no results
      const match = output.match(/Found (\d+)/);
      if (match) {
        const count = parseInt(match[1], 10);
        expect(count).toBeLessThanOrEqual(2);
      } else {
        // No results is also acceptable if threshold isn't met
        expect(output).toContain('No memories found');
      }
    });

    it('supports --json flag for machine-readable output', () => {
      const output = runAda(['memory', 'search', 'authentication', '--json']);

      // Should be valid JSON
      const results = JSON.parse(output);
      expect(Array.isArray(results)).toBe(true);

      // Each result should have score and entry
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('score');
        expect(results[0]).toHaveProperty('entry');
        expect(results[0].entry).toHaveProperty('id');
        expect(results[0].entry).toHaveProperty('kind');
        expect(results[0].entry).toHaveProperty('content');
      }
    });

    it('filters by role with --role option', () => {
      const output = runAda([
        'memory',
        'search',
        'implementation',
        '--role',
        'engineering',
        '--json',
      ]);

      const results = JSON.parse(output);

      // All results should be from engineering role
      for (const result of results) {
        if (result.entry.role) {
          expect(result.entry.role.toLowerCase()).toBe('engineering');
        }
      }
    });

    it('shows verbose output with --verbose flag', () => {
      const output = runAda([
        'memory',
        'search',
        'authentication',
        '--verbose',
      ]);

      // Verbose output should include tags and full content
      expect(output).toContain('Tags:');
    });

    it('handles no results gracefully', () => {
      const output = runAda([
        'memory',
        'search',
        'xyznonexistentquery123',
        '--threshold',
        '0.9',
      ]);

      expect(output).toContain('No memories found');
    });
  });

  describe('ada memory list', () => {
    it('lists memory entries', () => {
      const output = runAda(['memory', 'list']);

      // Should show the memory entries header
      expect(output).toContain('Memory Entries');
    });

    it('groups entries by kind', () => {
      const output = runAda(['memory', 'list']);

      // Should have section headers for different kinds
      expect(output).toMatch(/DECISION|LESSON|STATUS/);
    });

    it('respects --limit option', () => {
      const output = runAda(['memory', 'list', '--limit', '3', '--json']);

      const result = JSON.parse(output);
      expect(result.entries.length).toBeLessThanOrEqual(3);
    });

    it('supports --json flag for machine-readable output', () => {
      const output = runAda(['memory', 'list', '--json']);

      const result = JSON.parse(output);
      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.entries)).toBe(true);
    });

    it('filters by role with --role option', () => {
      const output = runAda([
        'memory',
        'list',
        '--role',
        'engineering',
        '--json',
      ]);

      const result = JSON.parse(output);

      for (const entry of result.entries) {
        if (entry.role) {
          expect(entry.role.toLowerCase()).toBe('engineering');
        }
      }
    });

    it('filters by kind with --kind option', () => {
      const output = runAda(['memory', 'list', '--kind', 'decision', '--json']);

      const result = JSON.parse(output);

      for (const entry of result.entries) {
        expect(entry.kind).toBe('decision');
      }
    });
  });

  describe('ada memory — error handling', () => {
    it('fails gracefully when agents directory does not exist', async () => {
      await fs.rm(path.join(testDir, 'agents'), { recursive: true, force: true });

      let error: Error | null = null;
      try {
        runAda(['memory', 'search', 'test']);
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain('Memory bank not found');
    });

    it('shows help when invoked without subcommand', () => {
      const output = runAda(['memory']);

      // Should display usage information
      expect(output).toContain('memory');
      expect(output).toContain('search');
      expect(output).toContain('list');
    });
  });

  describe('ada memory — help output', () => {
    it('shows help for search subcommand', () => {
      const output = runAda(['memory', 'search', '--help']);

      expect(output).toContain('search');
      expect(output).toContain('query');
      expect(output).toContain('--limit');
      expect(output).toContain('--threshold');
      expect(output).toContain('--role');
      expect(output).toContain('--json');
    });

    it('shows help for list subcommand', () => {
      const output = runAda(['memory', 'list', '--help']);

      expect(output).toContain('list');
      expect(output).toContain('--limit');
      expect(output).toContain('--role');
      expect(output).toContain('--kind');
      expect(output).toContain('--json');
    });
  });
});
