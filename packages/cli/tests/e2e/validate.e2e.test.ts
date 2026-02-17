/**
 * E2E Tests: ada validate
 *
 * Tests the `ada validate` command that checks all 6 Phase 2 dogfooding
 * success criteria (SC-1 through SC-6) for the Feb 26 Go/No-Go decision.
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure — Validate command
 * Supports Issue #155: SaaS Container launch criteria validation
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createSandbox, type Sandbox } from './harness';

describe('ada validate E2E', () => {
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

  describe('basic validation', () => {
    it('displays validation header', async () => {
      const result = await sandbox.ada(['validate', '--quick']);

      // Should show Phase 2 validation header
      expect(result.stdout).toContain('Phase 2 Dogfooding Validation');
      expect(result.stdout).toContain('SC-');
    });

    it('checks all success criteria (SC-1 through SC-6)', async () => {
      const result = await sandbox.ada(['validate', '--quick']);

      // Should check at least SC-1, SC-2, SC-4, SC-6 (quick mode skips SC-3, SC-5)
      expect(result.stdout).toContain('SC-1');
      expect(result.stdout).toContain('SC-2');
      expect(result.stdout).toContain('SC-4');
      expect(result.stdout).toContain('SC-6');
    });

    it('shows summary line', async () => {
      const result = await sandbox.ada(['validate', '--quick']);

      // Should show summary with passed/warnings/failed/skipped counts
      expect(result.stdout).toMatch(/passed|warnings?|failed|skipped/i);
    });

    it('shows GO/NO-GO verdict', async () => {
      const result = await sandbox.ada(['validate', '--quick']);

      // Should include GO/NO-GO decision
      expect(result.stdout).toContain('GO/NO-GO');
    });
  });

  describe('SC-1: Dispatch Lifecycle', () => {
    it('passes with valid rotation.json', async () => {
      // Set up valid rotation.json with recent activity
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        current_index: 3,
        cycle_count: 50,
        last_role: 'engineering',
        last_run: new Date().toISOString(),
        history: [
          { role: 'ceo', timestamp: new Date().toISOString(), cycle: 49 },
          { role: 'engineering', timestamp: new Date().toISOString(), cycle: 50 }
        ]
      }));

      const result = await sandbox.ada(['validate', '--quick']);

      expect(result.stdout).toContain('SC-1');
      expect(result.stdout).toContain('Dispatch Lifecycle');
      // Should pass or have details
      expect(result.stdout).toMatch(/Cycle \d+ completed|pass/i);
    });

    it('warns when last cycle is stale (>24h)', async () => {
      // Set up rotation.json with old last_run
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h ago
      writeFileSync(rotationPath, JSON.stringify({
        current_index: 0,
        cycle_count: 10,
        last_role: 'ceo',
        last_run: oldDate.toISOString(),
        history: []
      }));

      const result = await sandbox.ada(['validate', '--quick']);

      expect(result.stdout).toContain('SC-1');
      // Should warn about stale cycle
      expect(result.stdout).toMatch(/Last cycle was \d+h ago|warn/i);
    });

    it('fails with missing required fields', async () => {
      // Set up invalid rotation.json
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        // Missing required fields
        broken: true
      }));

      const result = await sandbox.ada(['validate', '--quick']);

      expect(result.stdout).toContain('SC-1');
      expect(result.stdout).toMatch(/missing required fields|fail/i);
    });
  });

  describe('SC-2: Model Routing', () => {
    it('shows model routing status', async () => {
      const result = await sandbox.ada(['validate', '--quick']);

      expect(result.stdout).toContain('SC-2');
      expect(result.stdout).toContain('Model Routing');
    });

    it('handles no history gracefully', async () => {
      // Fresh init has no history
      const result = await sandbox.ada(['validate', '--quick']);

      expect(result.stdout).toContain('SC-2');
      // Should skip or pass (no history to analyze)
      expect(result.stdout).toMatch(/Model routing|skip|pass/i);
    });
  });

  describe('SC-4: Memory Persistence', () => {
    it('passes with valid bank.md', async () => {
      // Create valid memory bank with required sections
      const bankPath = join(sandbox.path, 'agents/memory/bank.md');
      mkdirSync(join(sandbox.path, 'agents/memory'), { recursive: true });
      writeFileSync(bankPath, `# Memory Bank
**Version:** 5

## Current Status
Active development ongoing.

## Role State
All roles healthy.

## Active Threads
- #1 Issue tracking
`);

      const result = await sandbox.ada(['validate', '--quick']);

      expect(result.stdout).toContain('SC-4');
      expect(result.stdout).toContain('Memory Persistence');
      // Should pass
      expect(result.stdout).toMatch(/Memory bank v\d+|up to date|pass/i);
    });

    it('warns with missing required sections', async () => {
      // Create bank.md without required sections
      const bankPath = join(sandbox.path, 'agents/memory/bank.md');
      mkdirSync(join(sandbox.path, 'agents/memory'), { recursive: true });
      writeFileSync(bankPath, `# Memory Bank
Just some notes.
`);

      const result = await sandbox.ada(['validate', '--quick']);

      expect(result.stdout).toContain('SC-4');
      // Should warn about missing sections
      expect(result.stdout).toMatch(/Missing sections|Current Status|warn/i);
    });

    it('fails when bank.md does not exist', async () => {
      // Don't create memory bank
      const result = await sandbox.ada(['validate', '--quick']);

      expect(result.stdout).toContain('SC-4');
      // Should fail or warn
      expect(result.stdout).toMatch(/could not read|fail|ENOENT/i);
    });
  });

  describe('SC-6: Consecutive Cycles', () => {
    it('passes with 5+ successful cycles', async () => {
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        current_index: 5,
        cycle_count: 100,
        last_role: 'ops',
        last_run: new Date().toISOString(),
        history: [
          { role: 'ceo', timestamp: new Date().toISOString(), cycle: 96, reflection: { outcome: 'success' } },
          { role: 'product', timestamp: new Date().toISOString(), cycle: 97, reflection: { outcome: 'success' } },
          { role: 'engineering', timestamp: new Date().toISOString(), cycle: 98, reflection: { outcome: 'success' } },
          { role: 'qa', timestamp: new Date().toISOString(), cycle: 99, reflection: { outcome: 'success' } },
          { role: 'ops', timestamp: new Date().toISOString(), cycle: 100, reflection: { outcome: 'success' } }
        ]
      }));

      const result = await sandbox.ada(['validate', '--quick']);

      expect(result.stdout).toContain('SC-6');
      expect(result.stdout).toContain('Consecutive Cycles');
      expect(result.stdout).toMatch(/cycles|last 5 successful|pass/i);
    });

    it('warns with fewer than 5 cycles', async () => {
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        current_index: 2,
        cycle_count: 3,
        last_role: 'ceo',
        last_run: new Date().toISOString(),
        history: [
          { role: 'ceo', cycle: 1 },
          { role: 'product', cycle: 2 },
          { role: 'engineering', cycle: 3 }
        ]
      }));

      const result = await sandbox.ada(['validate', '--quick']);

      expect(result.stdout).toContain('SC-6');
      // Should warn about needing more cycles
      expect(result.stdout).toMatch(/Only \d+ cycles|need 5\+|warn/i);
    });

    it('warns with failures in recent cycles', async () => {
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        current_index: 5,
        cycle_count: 10,
        last_role: 'qa',
        last_run: new Date().toISOString(),
        history: [
          { role: 'ceo', cycle: 6, reflection: { outcome: 'success' } },
          { role: 'product', cycle: 7, reflection: { outcome: 'blocked' } }, // failure
          { role: 'engineering', cycle: 8, reflection: { outcome: 'success' } },
          { role: 'ops', cycle: 9, reflection: { outcome: 'partial' } }, // partial
          { role: 'qa', cycle: 10, reflection: { outcome: 'success' } }
        ]
      }));

      const result = await sandbox.ada(['validate', '--quick']);

      expect(result.stdout).toContain('SC-6');
      // Should warn about issues in recent cycles
      expect(result.stdout).toMatch(/recent cycles had issues|warn/i);
    });
  });

  describe('--quick mode', () => {
    it('skips network-dependent checks (SC-3, SC-5)', async () => {
      // Set up valid local state so local checks (SC-1, SC-2, SC-4, SC-6) pass
      // Without this, SC-1 fails because ada init template has last_role: null
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        current_index: 3,
        cycle_count: 50,
        last_role: 'engineering',
        last_run: new Date().toISOString(),
        history: [
          { role: 'ceo', timestamp: new Date().toISOString(), cycle: 49, action: 'test', reflection: { outcome: 'success' } },
          { role: 'engineering', timestamp: new Date().toISOString(), cycle: 50, action: 'test', reflection: { outcome: 'success' } }
        ]
      }));

      const result = await sandbox.ada(['validate', '--quick']);

      // With --quick, should NOT attempt SC-3 (GitHub) or SC-5 (Cost Savings)
      // These checks require network access — they should be skipped, not failed
      expect(result.success).toBe(true);
      // Should complete quickly without network calls
    });

    it('still checks local criteria (SC-1, SC-2, SC-4, SC-6)', async () => {
      const result = await sandbox.ada(['validate', '--quick']);

      expect(result.stdout).toContain('SC-1');
      expect(result.stdout).toContain('SC-2');
      expect(result.stdout).toContain('SC-4');
      expect(result.stdout).toContain('SC-6');
    });
  });

  describe('--json output', () => {
    it('outputs valid JSON', async () => {
      const result = await sandbox.ada(['validate', '--quick', '--json']);

      expect(result.success).toBe(true);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });

    it('includes overall status', async () => {
      const result = await sandbox.ada(['validate', '--quick', '--json']);

      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty('overall');
      expect(['pass', 'fail', 'warn']).toContain(json.overall);
    });

    it('includes results array', async () => {
      const result = await sandbox.ada(['validate', '--quick', '--json']);

      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty('results');
      expect(Array.isArray(json.results)).toBe(true);
      expect(json.results.length).toBeGreaterThan(0);
    });

    it('each result has required fields', async () => {
      const result = await sandbox.ada(['validate', '--quick', '--json']);

      const json = JSON.parse(result.stdout);
      for (const r of json.results) {
        expect(r).toHaveProperty('id');
        expect(r).toHaveProperty('name');
        expect(r).toHaveProperty('status');
        expect(r).toHaveProperty('message');
        expect(['pass', 'fail', 'warn', 'skip']).toContain(r.status);
      }
    });
  });

  describe('--verbose output', () => {
    it('shows additional details', async () => {
      // Set up a scenario with details to show
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        current_index: 0,
        cycle_count: 25,
        last_role: 'ceo',
        last_run: new Date().toISOString(),
        history: [
          { role: 'ceo', timestamp: new Date().toISOString(), cycle: 25 }
        ]
      }));

      const normalResult = await sandbox.ada(['validate', '--quick']);
      const verboseResult = await sandbox.ada(['validate', '--quick', '--verbose']);

      // Verbose output should be longer (more details)
      expect(verboseResult.stdout.length).toBeGreaterThanOrEqual(normalResult.stdout.length);
    });
  });

  describe('--dir option', () => {
    it('validates custom agents directory', async () => {
      // Initialize in custom directory
      const customInitResult = await sandbox.ada(['init', '--dir', 'custom-agents']);
      expect(customInitResult.success).toBe(true);

      // Set up valid state in custom directory
      const rotationPath = join(sandbox.path, 'custom-agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        current_index: 0,
        cycle_count: 10,
        last_role: 'ceo',
        last_run: new Date().toISOString(),
        history: []
      }));

      const result = await sandbox.ada(['validate', '--quick', '--dir', 'custom-agents']);

      expect(result.stdout).toContain('SC-1');
      expect(result.stdout).toContain('Dispatch Lifecycle');
    });

    it('fails for non-existent directory', async () => {
      const result = await sandbox.ada(['validate', '--quick', '--dir', 'non-existent-dir']);

      // Should fail gracefully
      expect(result.stdout).toMatch(/Could not read|fail|ENOENT/i);
    });
  });

  describe('exit codes', () => {
    it('exits 0 when all checks pass', async () => {
      // Set up all checks to pass
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        current_index: 0,
        cycle_count: 50,
        last_role: 'ceo',
        last_run: new Date().toISOString(),
        history: [
          { role: 'ceo', cycle: 46, reflection: { outcome: 'success' } },
          { role: 'product', cycle: 47, reflection: { outcome: 'success' } },
          { role: 'engineering', cycle: 48, reflection: { outcome: 'success' } },
          { role: 'qa', cycle: 49, reflection: { outcome: 'success' } },
          { role: 'ops', cycle: 50, reflection: { outcome: 'success' } }
        ]
      }));

      const bankPath = join(sandbox.path, 'agents/memory/bank.md');
      mkdirSync(join(sandbox.path, 'agents/memory'), { recursive: true });
      writeFileSync(bankPath, `# Memory Bank
**Version:** 10

## Current Status
All systems operational.

## Role State
All roles healthy.

## Active Threads
- #155 SaaS Container
`);

      const result = await sandbox.ada(['validate', '--quick']);

      // Should pass with exit code 0
      expect(result.exitCode).toBe(0);
    });

    it('exits 0 with warnings (non-blocking)', async () => {
      // Set up a warning condition (not enough cycles)
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        current_index: 0,
        cycle_count: 2,
        last_role: 'ceo',
        last_run: new Date().toISOString(),
        history: [
          { role: 'ceo', cycle: 1 },
          { role: 'product', cycle: 2 }
        ]
      }));

      const bankPath = join(sandbox.path, 'agents/memory/bank.md');
      mkdirSync(join(sandbox.path, 'agents/memory'), { recursive: true });
      writeFileSync(bankPath, `# Memory Bank
**Version:** 1

## Current Status
Starting up.

## Role State
Initial state.

## Active Threads
None yet.
`);

      const result = await sandbox.ada(['validate', '--quick']);

      // Warnings don't cause non-zero exit
      expect(result.exitCode).toBe(0);
    });

    it('exits 1 when any check fails', async () => {
      // Set up a failure condition (invalid rotation.json)
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        // Missing all required fields
        invalid: true
      }));

      const result = await sandbox.ada(['validate', '--quick']);

      // Failures cause exit code 1
      expect(result.exitCode).toBe(1);
    });
  });

  describe('overall status calculation', () => {
    it('overall is "pass" when all checks pass', async () => {
      // Set up all checks to pass
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        current_index: 0,
        cycle_count: 100,
        last_role: 'ceo',
        last_run: new Date().toISOString(),
        history: [
          { role: 'a', cycle: 96, reflection: { outcome: 'success' } },
          { role: 'b', cycle: 97, reflection: { outcome: 'success' } },
          { role: 'c', cycle: 98, reflection: { outcome: 'success' } },
          { role: 'd', cycle: 99, reflection: { outcome: 'success' } },
          { role: 'e', cycle: 100, reflection: { outcome: 'success' } }
        ]
      }));

      const bankPath = join(sandbox.path, 'agents/memory/bank.md');
      mkdirSync(join(sandbox.path, 'agents/memory'), { recursive: true });
      writeFileSync(bankPath, `# Memory Bank
**Version:** 20

## Current Status
Active.

## Role State
Healthy.

## Active Threads
Tracked.
`);

      const result = await sandbox.ada(['validate', '--quick', '--json']);
      const json = JSON.parse(result.stdout);

      expect(json.overall).toBe('pass');
    });

    it('overall is "warn" when has warnings but no failures', async () => {
      // Set up warning condition (not enough cycles)
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        current_index: 0,
        cycle_count: 3,
        last_role: 'ceo',
        last_run: new Date().toISOString(),
        history: [
          { role: 'a', cycle: 1 },
          { role: 'b', cycle: 2 },
          { role: 'c', cycle: 3 }
        ]
      }));

      const bankPath = join(sandbox.path, 'agents/memory/bank.md');
      mkdirSync(join(sandbox.path, 'agents/memory'), { recursive: true });
      writeFileSync(bankPath, `# Memory Bank
**Version:** 1

## Current Status
Active.

## Role State
Healthy.

## Active Threads
Tracked.
`);

      const result = await sandbox.ada(['validate', '--quick', '--json']);
      const json = JSON.parse(result.stdout);

      expect(json.overall).toBe('warn');
    });

    it('overall is "fail" when any check fails', async () => {
      // Set up failure condition
      const rotationPath = join(sandbox.path, 'agents/state/rotation.json');
      writeFileSync(rotationPath, JSON.stringify({
        broken: true
      }));

      const result = await sandbox.ada(['validate', '--quick', '--json']);
      const json = JSON.parse(result.stdout);

      expect(json.overall).toBe('fail');
    });
  });
});
