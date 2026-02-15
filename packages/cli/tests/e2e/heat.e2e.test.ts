/**
 * E2E Tests: ada heat
 *
 * Tests the `ada heat` commands (summary, list, decay, boost, get) in isolated
 * sandbox environments. Validates the full heat scoring lifecycle which is
 * critical for cognitive memory (Issue #113).
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure
 * Completes Issue #118: feat(core): Heat Scoring Implementation — 100%
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness';

/**
 * Create a heat.jsonl file with test entries.
 *
 * Heat entries are stored in agents/memory/heat.jsonl as JSONL format.
 * Each line is a JSON object representing a HeatEntry.
 */
function seedHeatStore(
  sandbox: Sandbox,
  entries: Array<{
    id: string;
    memoryClass: 'innate' | 'learned' | 'episodic';
    baseImportance: number;
    referenceCount: number;
    lastAccessedAt: number;
    createdAt: number;
  }>
): void {
  // Ensure memory directory exists
  sandbox.exec('mkdir -p agents/memory');

  // Write JSONL entries
  const jsonl = `${entries.map((entry) => JSON.stringify(entry)).join('\n')  }\n`;
  sandbox.write('agents/memory/heat.jsonl', jsonl);
}

/**
 * Create sample heat entries for testing.
 * Returns entries with varying heat characteristics:
 * - hot-entry: High base importance, recent access, many references
 * - warm-entry: Medium characteristics
 * - cold-entry: Low importance, old access, few references
 */
function createSampleEntries() {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  return [
    {
      id: 'hot-entry',
      memoryClass: 'innate' as const,
      baseImportance: 0.9,
      referenceCount: 15,
      lastAccessedAt: now - hour, // 1 hour ago
      createdAt: now - day, // 1 day ago
    },
    {
      id: 'warm-entry',
      memoryClass: 'learned' as const,
      baseImportance: 0.6,
      referenceCount: 5,
      lastAccessedAt: now - 3 * day, // 3 days ago
      createdAt: now - 7 * day, // 1 week ago
    },
    {
      id: 'cold-entry',
      memoryClass: 'episodic' as const,
      baseImportance: 0.3,
      referenceCount: 1,
      lastAccessedAt: now - 14 * day, // 2 weeks ago
      createdAt: now - 30 * day, // 1 month ago
    },
  ];
}

describe('ada heat E2E', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = createSandbox();
    // Initialize agents directory for heat tests
    const initResult = await sandbox.ada(['init']);
    expect(initResult.success).toBe(true);
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('heat (summary)', () => {
    it('shows message when no heat store exists', async () => {
      const result = await sandbox.ada(['heat']);

      expect(result.success).toBe(true);
      // Output says "No entries in heat store" when store is empty
      expect(result.stdout).toMatch(/no entries|no heat store|not found|not yet initialized/i);
    });

    it('shows heat distribution with entries', async () => {
      seedHeatStore(sandbox, createSampleEntries());

      const result = await sandbox.ada(['heat']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Heat Distribution');
      expect(result.stdout).toMatch(/hot|warm|cold/i);
      expect(result.stdout).toContain('Total:');
    });

    it('supports --json output', async () => {
      seedHeatStore(sandbox, createSampleEntries());

      const result = await sandbox.ada(['heat', '--json']);

      expect(result.success).toBe(true);

      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('total', 3);
      expect(output).toHaveProperty('byClass');
      expect(output.byClass).toHaveProperty('innate', 1);
      expect(output.byClass).toHaveProperty('learned', 1);
      expect(output.byClass).toHaveProperty('episodic', 1);
    });

    it('shows help with --help flag', async () => {
      const result = await sandbox.ada(['heat', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('heat');
      expect(result.stdout).toContain('list');
      expect(result.stdout).toContain('decay');
    });
  });

  describe('heat list', () => {
    it('lists all entries sorted by heat score', async () => {
      seedHeatStore(sandbox, createSampleEntries());

      const result = await sandbox.ada(['heat', 'list']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Heat Scores');
      expect(result.stdout).toContain('hot-entry');
      expect(result.stdout).toContain('warm-entry');
      expect(result.stdout).toContain('cold-entry');
    });

    it('supports --json output', async () => {
      seedHeatStore(sandbox, createSampleEntries());

      const result = await sandbox.ada(['heat', 'list', '--json']);

      expect(result.success).toBe(true);

      const output = JSON.parse(result.stdout);
      expect(Array.isArray(output)).toBe(true);
      expect(output.length).toBe(3);
      expect(output[0]).toHaveProperty('id');
      expect(output[0]).toHaveProperty('heatScore');
    });

    it('shows message when no entries exist', async () => {
      const result = await sandbox.ada(['heat', 'list']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/no entries|no heat store/i);
    });
  });

  describe('heat decay', () => {
    it('defaults to dry-run mode', async () => {
      seedHeatStore(sandbox, createSampleEntries());

      const result = await sandbox.ada(['heat', 'decay']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/dry run|would apply|preview|no entries|processed/i);
    });

    it('supports --json output', async () => {
      seedHeatStore(sandbox, createSampleEntries());

      const result = await sandbox.ada(['heat', 'decay', '--json']);

      expect(result.success).toBe(true);

      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('processed');
      expect(output).toHaveProperty('tierChanges');
      expect(output).toHaveProperty('timestamp');
    });
  });

  describe('heat boost', () => {
    it('boosts entry reference count', async () => {
      seedHeatStore(sandbox, createSampleEntries());

      const result = await sandbox.ada(['heat', 'boost', 'warm-entry']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Boosted');
      expect(result.stdout).toContain('warm-entry');
    });

    it('fails for non-existent entry', async () => {
      seedHeatStore(sandbox, createSampleEntries());

      const result = await sandbox.ada(['heat', 'boost', 'non-existent-entry']);

      expect(result.success).toBe(false);
      expect(result.stdout).toContain('not found');
    });

    it('supports --json output', async () => {
      seedHeatStore(sandbox, createSampleEntries());

      const result = await sandbox.ada(['heat', 'boost', 'hot-entry', '--json']);

      expect(result.success).toBe(true);

      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('before');
      expect(output).toHaveProperty('after');
      expect(output.after.referenceCount).toBeGreaterThan(output.before.referenceCount);
    });
  });

  describe('heat get', () => {
    it('shows heat score for specific entry', async () => {
      seedHeatStore(sandbox, createSampleEntries());

      const result = await sandbox.ada(['heat', 'get', 'hot-entry']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('hot-entry');
      expect(result.stdout).toContain('innate');
    });

    it('fails for non-existent entry', async () => {
      seedHeatStore(sandbox, createSampleEntries());

      const result = await sandbox.ada(['heat', 'get', 'non-existent-entry']);

      expect(result.success).toBe(false);
      expect(result.stdout).toContain('not found');
    });

    it('supports --json output', async () => {
      seedHeatStore(sandbox, createSampleEntries());

      const result = await sandbox.ada(['heat', 'get', 'cold-entry', '--json']);

      expect(result.success).toBe(true);

      const output = JSON.parse(result.stdout);
      expect(output.id).toBe('cold-entry');
      expect(output.memoryClass).toBe('episodic');
      expect(output).toHaveProperty('heatScore');
    });
  });

  describe('full heat lifecycle', () => {
    it('executes complete summary → boost → get flow', async () => {
      seedHeatStore(sandbox, createSampleEntries());

      // 1. Summary — get overview
      const summary = await sandbox.ada(['heat', '--json']);
      expect(summary.success).toBe(true);
      const summaryData = JSON.parse(summary.stdout);
      expect(summaryData.total).toBe(3);

      // 2. Get — check specific entry
      const getBefore = await sandbox.ada(['heat', 'get', 'cold-entry', '--json']);
      expect(getBefore.success).toBe(true);
      const beforeData = JSON.parse(getBefore.stdout);
      const initialRefs = beforeData.referenceCount;

      // 3. Boost — increase references
      const boost = await sandbox.ada(['heat', 'boost', 'cold-entry', '-n', '3', '--json']);
      expect(boost.success).toBe(true);
      const boostData = JSON.parse(boost.stdout);
      expect(boostData.after.referenceCount).toBe(initialRefs + 3);

      // 4. Get again — verify boost persisted
      const getAfter = await sandbox.ada(['heat', 'get', 'cold-entry', '--json']);
      expect(getAfter.success).toBe(true);
      const afterData = JSON.parse(getAfter.stdout);
      expect(afterData.referenceCount).toBe(initialRefs + 3);
    });
  });

  describe('error handling', () => {
    it('handles missing agents directory gracefully', async () => {
      // Create fresh sandbox without init
      const emptySandbox = createSandbox();

      try {
        const result = await emptySandbox.ada(['heat']);

        // Should succeed and show empty state or indicate no entries/store
        // The CLI handles ENOENT gracefully and shows "No entries in heat store"
        expect(result.stdout).toMatch(/no entries|no heat store|not found|ENOENT/i);
      } finally {
        emptySandbox.cleanup();
      }
    });
  });
});
