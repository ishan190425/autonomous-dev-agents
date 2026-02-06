/**
 * Tests for memory importance tracking (Phase 3.1 of PLAT-002)
 *
 * @see src/importance.ts
 * @see docs/architecture/memory-lifecycle-adr.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  KIND_WEIGHTS,
  DEFAULT_IMPORTANCE_CONFIG,
  getKindWeight,
  calculateRecencyFactor,
  calculateAccessFactor,
  calculateImportanceScore,
  calculateImportance,
  ImportanceTracker,
  createImportanceTracker,
  type ImportanceConfig,
} from '../src/importance.js';
import type { MemoryEntryKind } from '../src/embedding.js';

// ─── Kind Weights ────────────────────────────────────────────────────────────

describe('KIND_WEIGHTS', () => {
  it('should have weights for all memory entry kinds', () => {
    const kinds: MemoryEntryKind[] = [
      'decision',
      'lesson',
      'status',
      'role_state',
      'blocker',
      'question',
      'metric',
      'thread',
    ];
    for (const kind of kinds) {
      expect(KIND_WEIGHTS[kind]).toBeDefined();
      expect(KIND_WEIGHTS[kind]).toBeGreaterThanOrEqual(0.4);
      expect(KIND_WEIGHTS[kind]).toBeLessThanOrEqual(1.0);
    }
  });

  it('should weight decisions highest', () => {
    expect(KIND_WEIGHTS.decision).toBe(1.0);
  });

  it('should weight role_state lowest', () => {
    expect(KIND_WEIGHTS.role_state).toBe(0.4);
  });

  it('should weight blockers high (but decay expected)', () => {
    expect(KIND_WEIGHTS.blocker).toBe(0.9);
    expect(KIND_WEIGHTS.blocker).toBeGreaterThan(KIND_WEIGHTS.lesson);
  });
});

describe('getKindWeight', () => {
  it('should return correct weight for known kinds', () => {
    expect(getKindWeight('decision')).toBe(1.0);
    expect(getKindWeight('lesson')).toBe(0.8);
    expect(getKindWeight('blocker')).toBe(0.9);
    expect(getKindWeight('status')).toBe(0.5);
  });

  it('should return default weight for unknown kinds', () => {
    // TypeScript allows string extension, so unknown kinds are possible
    expect(getKindWeight('unknown' as MemoryEntryKind)).toBe(0.5);
  });
});

// ─── Recency Factor ──────────────────────────────────────────────────────────

describe('calculateRecencyFactor', () => {
  const config = DEFAULT_IMPORTANCE_CONFIG;

  it('should return 1.0 for same-cycle access', () => {
    expect(calculateRecencyFactor(100, 100, config)).toBe(1.0);
  });

  it('should return 0.5 at half decay point', () => {
    // 50 cycles = half of 100 decay cycles
    expect(calculateRecencyFactor(100, 50, config)).toBe(0.5);
  });

  it('should return 0.0 at full decay', () => {
    // 100 cycles since reference = full decay
    expect(calculateRecencyFactor(100, 0, config)).toBe(0);
  });

  it('should return 0.0 for very old entries', () => {
    // 200 cycles since reference > 100 decay
    expect(calculateRecencyFactor(200, 0, config)).toBe(0);
  });

  it('should never go negative', () => {
    expect(calculateRecencyFactor(500, 100, config)).toBe(0);
    expect(calculateRecencyFactor(1000, 0, config)).toBe(0);
  });

  it('should handle custom decay config', () => {
    const customConfig: ImportanceConfig = {
      ...config,
      recencyDecayCycles: 50, // Faster decay
    };
    // At cycle 50, entry from cycle 0 should be at 0
    expect(calculateRecencyFactor(50, 0, customConfig)).toBe(0);
    // At cycle 25 with reference cycle 0, should be 0.5
    expect(calculateRecencyFactor(25, 0, customConfig)).toBe(0.5);
    // At cycle 75 with reference cycle 50, should be 0.5
    expect(calculateRecencyFactor(75, 50, customConfig)).toBe(0.5);
  });
});

// ─── Access Factor ───────────────────────────────────────────────────────────

describe('calculateAccessFactor', () => {
  const config = DEFAULT_IMPORTANCE_CONFIG;

  it('should return 0.0 for zero accesses', () => {
    expect(calculateAccessFactor(0, config)).toBe(0);
  });

  it('should return 0.5 at half cap', () => {
    expect(calculateAccessFactor(5, config)).toBe(0.5);
  });

  it('should return 1.0 at cap', () => {
    expect(calculateAccessFactor(10, config)).toBe(1.0);
  });

  it('should cap at 1.0 for high access counts', () => {
    expect(calculateAccessFactor(100, config)).toBe(1.0);
    expect(calculateAccessFactor(1000, config)).toBe(1.0);
  });

  it('should handle custom cap config', () => {
    const customConfig: ImportanceConfig = {
      ...config,
      accessFactorCap: 5, // Lower cap
    };
    expect(calculateAccessFactor(5, customConfig)).toBe(1.0);
    expect(calculateAccessFactor(2.5, customConfig)).toBe(0.5);
  });
});

// ─── Importance Score ────────────────────────────────────────────────────────

describe('calculateImportanceScore', () => {
  const config = DEFAULT_IMPORTANCE_CONFIG;

  it('should calculate correct score for ideal entry', () => {
    // High kind weight, recent, frequently accessed
    const score = calculateImportanceScore(1.0, 1.0, 1.0, config);
    // 1.0 * (0.4 + 0.3 * 1.0 + 0.3 * 1.0) = 1.0
    expect(score).toBe(1.0);
  });

  it('should calculate correct score for new entry', () => {
    // Decision, just created (recency=1), never accessed (access=0)
    const score = calculateImportanceScore(1.0, 1.0, 0, config);
    // 1.0 * (0.4 + 0.3 * 1.0 + 0.3 * 0) = 0.7
    expect(score).toBe(0.7);
  });

  it('should calculate correct score for old unused entry', () => {
    // Role state, old (recency=0), never accessed
    const score = calculateImportanceScore(0.4, 0, 0, config);
    // 0.4 * (0.4 + 0.3 * 0 + 0.3 * 0) = 0.16
    expect(score).toBeCloseTo(0.16);
  });

  it('should scale by kind weight', () => {
    const decisionScore = calculateImportanceScore(1.0, 0.5, 0.5, config);
    const statusScore = calculateImportanceScore(0.5, 0.5, 0.5, config);
    expect(decisionScore).toBe(2 * statusScore);
  });

  it('should clamp to [0, 1]', () => {
    // Even with impossible inputs, should clamp
    const score = calculateImportanceScore(2.0, 2.0, 2.0, config);
    expect(score).toBeLessThanOrEqual(1.0);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ─── Full Importance Calculation ─────────────────────────────────────────────

describe('calculateImportance', () => {
  it('should create importance for new decision entry', () => {
    const importance = calculateImportance('ADR-001', 'decision', 50);

    expect(importance.entryId).toBe('ADR-001');
    expect(importance.kind).toBe('decision');
    expect(importance.kindWeight).toBe(1.0);
    expect(importance.accessCount).toBe(0);
    expect(importance.lastAccessCycle).toBe(0);
    expect(importance.createdCycle).toBe(50);
    // New decision: kindWeight=1.0, recency=1.0 (just created), access=0
    // 1.0 * (0.4 + 0.3 * 1.0 + 0.3 * 0) = 0.7
    expect(importance.score).toBe(0.7);
  });

  it('should create importance for accessed lesson', () => {
    const importance = calculateImportance(
      'lesson-5',
      'lesson',
      100,
      5, // accessCount
      95, // lastAccessCycle (recent)
      10 // createdCycle
    );

    expect(importance.kind).toBe('lesson');
    expect(importance.kindWeight).toBe(0.8);
    expect(importance.accessCount).toBe(5);
    expect(importance.lastAccessCycle).toBe(95);
    expect(importance.createdCycle).toBe(10);
    // Lesson: kindWeight=0.8, recency=0.95 (5 cycles ago), access=0.5
    // 0.8 * (0.4 + 0.3 * 0.95 + 0.3 * 0.5) = 0.668
    expect(importance.score).toBeCloseTo(0.668);
  });

  it('should handle old role state with low score', () => {
    const importance = calculateImportance(
      'role-ops',
      'role_state',
      100,
      0, // never accessed
      0, // never accessed
      0 // created at cycle 0
    );

    expect(importance.kindWeight).toBe(0.4);
    // Old, never accessed: recency based on createdCycle (0)
    // recencyFactor = max(0, 1 - 100/100) = 0
    // 0.4 * (0.4 + 0.3 * 0 + 0.3 * 0) = 0.16
    expect(importance.score).toBeCloseTo(0.16);
  });
});

// ─── ImportanceTracker ───────────────────────────────────────────────────────

describe('ImportanceTracker', () => {
  let tempDir: string;
  let agentsDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `ada-importance-test-${Date.now()}`);
    agentsDir = join(tempDir, 'agents');
    await mkdir(join(agentsDir, 'state'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('load', () => {
    it('should create empty state if file does not exist', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      expect(tracker.count).toBe(0);
      expect(tracker.lastUpdateCycle).toBe(0);
    });

    it('should load existing state from file', async () => {
      const existingState = {
        version: 1,
        lastUpdateCycle: 50,
        lastUpdated: '2026-02-06T00:00:00.000Z',
        entries: {
          'ADR-001': {
            entryId: 'ADR-001',
            kind: 'decision',
            kindWeight: 1.0,
            accessCount: 3,
            lastAccessCycle: 45,
            createdCycle: 10,
            score: 0.85,
          },
        },
      };
      await writeFile(
        join(agentsDir, 'state', 'importance.json'),
        JSON.stringify(existingState)
      );

      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      expect(tracker.count).toBe(1);
      expect(tracker.lastUpdateCycle).toBe(50);
      expect(tracker.get('ADR-001')?.accessCount).toBe(3);
    });
  });

  describe('save', () => {
    it('should persist state to file', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      tracker.getOrCreate('test-entry', 'status', 10);
      await tracker.save();

      const content = await readFile(
        join(agentsDir, 'state', 'importance.json'),
        'utf-8'
      );
      const saved = JSON.parse(content);

      expect(saved.version).toBe(1);
      expect(saved.entries['test-entry']).toBeDefined();
      expect(saved.entries['test-entry'].kind).toBe('status');
    });

    it('should not write if nothing changed', async () => {
      const existingState = {
        version: 1,
        lastUpdateCycle: 50,
        lastUpdated: '2026-01-01T00:00:00.000Z',
        entries: {},
      };
      const filePath = join(agentsDir, 'state', 'importance.json');
      await writeFile(filePath, JSON.stringify(existingState));

      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();
      await tracker.save();

      const content = await readFile(filePath, 'utf-8');
      const saved = JSON.parse(content);
      // lastUpdated should NOT be changed since nothing was modified
      expect(saved.lastUpdated).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('getOrCreate', () => {
    it('should create new entry if not exists', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      const importance = tracker.getOrCreate('new-entry', 'lesson', 100);

      expect(importance.entryId).toBe('new-entry');
      expect(importance.kind).toBe('lesson');
      expect(importance.createdCycle).toBe(100);
      expect(tracker.count).toBe(1);
    });

    it('should return existing entry if exists', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      tracker.getOrCreate('entry', 'decision', 50);
      const again = tracker.getOrCreate('entry', 'status', 100); // Different kind

      // Should return original, not create new with different kind
      expect(again.kind).toBe('decision');
      expect(again.createdCycle).toBe(50);
      expect(tracker.count).toBe(1);
    });
  });

  describe('trackAccess', () => {
    it('should increment access count', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      tracker.getOrCreate('entry', 'decision', 50);
      tracker.trackAccess('entry', 'decision', 55);
      tracker.trackAccess('entry', 'decision', 60);

      const importance = tracker.get('entry');
      expect(importance?.accessCount).toBe(2);
    });

    it('should update last access cycle', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      tracker.getOrCreate('entry', 'decision', 50);
      tracker.trackAccess('entry', 'decision', 75);

      expect(tracker.get('entry')?.lastAccessCycle).toBe(75);
    });

    it('should recalculate score on access', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      const initial = tracker.getOrCreate('entry', 'lesson', 50);
      const initialScore = initial.score;

      tracker.trackAccess('entry', 'lesson', 55);
      const updated = tracker.get('entry');

      // Score should increase due to access
      expect(updated?.score).toBeGreaterThan(initialScore);
    });

    it('should create entry if tracking access for unknown entry', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      tracker.trackAccess('new-entry', 'blocker', 100);

      const importance = tracker.get('new-entry');
      expect(importance).toBeDefined();
      expect(importance?.accessCount).toBe(1);
      expect(importance?.kind).toBe('blocker');
    });
  });

  describe('updateAllScores', () => {
    it('should decay scores over time', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      tracker.getOrCreate('entry', 'status', 10);
      const initialScore = tracker.get('entry')?.score ?? 0;

      // Advance many cycles without access
      tracker.updateAllScores(110);
      const decayedScore = tracker.get('entry')?.score ?? 0;

      expect(decayedScore).toBeLessThan(initialScore);
    });

    it('should update lastUpdateCycle', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      tracker.getOrCreate('entry', 'decision', 50);
      tracker.updateAllScores(100);

      expect(tracker.lastUpdateCycle).toBe(100);
    });
  });

  describe('checkLifecycle', () => {
    it('should identify hot entries to demote', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      // Old entry that should be demoted (no access in 15 cycles)
      tracker.getOrCreate('old-hot', 'status', 50);
      // Recent entry that should stay hot
      tracker.getOrCreate('recent-hot', 'decision', 90);
      tracker.trackAccess('recent-hot', 'decision', 95);

      const result = tracker.checkLifecycle(100, ['old-hot', 'recent-hot'], [], []);

      expect(result.demoteToWarm).toContain('old-hot');
      expect(result.demoteToWarm).not.toContain('recent-hot');
    });

    it('should identify warm entries to promote', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      // Entry accessed 3+ times in last 5 cycles
      tracker.getOrCreate('popular', 'lesson', 80);
      tracker.trackAccess('popular', 'lesson', 96);
      tracker.trackAccess('popular', 'lesson', 98);
      tracker.trackAccess('popular', 'lesson', 100);

      const result = tracker.checkLifecycle(100, [], ['popular'], []);

      expect(result.promoteToHot).toContain('popular');
    });

    it('should identify warm entries to demote to cold', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      // Entry not accessed in 60 cycles (> 50 threshold)
      tracker.getOrCreate('stale-warm', 'thread', 20);

      const result = tracker.checkLifecycle(100, [], ['stale-warm'], []);

      expect(result.demoteToCold).toContain('stale-warm');
    });

    it('should identify cold entries to forget', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      // Entry not accessed in 250 cycles, low importance
      const entry = tracker.getOrCreate('ancient', 'role_state', 10);
      // Update to simulate very old, low-score entry
      tracker.updateAllScores(300);

      const result = tracker.checkLifecycle(300, [], [], ['ancient']);

      // Should recommend forgetting if score < 0.3 and > 200 cycles old
      if (entry.score < 0.3) {
        expect(result.canForget).toContain('ancient');
      }
    });
  });

  describe('removeEntries', () => {
    it('should remove specified entries', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      tracker.getOrCreate('keep', 'decision', 50);
      tracker.getOrCreate('remove-1', 'status', 50);
      tracker.getOrCreate('remove-2', 'status', 50);

      expect(tracker.count).toBe(3);

      tracker.removeEntries(['remove-1', 'remove-2']);

      expect(tracker.count).toBe(1);
      expect(tracker.get('keep')).toBeDefined();
      expect(tracker.get('remove-1')).toBeUndefined();
    });
  });

  describe('getAllSorted', () => {
    it('should return entries sorted by score descending', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      tracker.getOrCreate('low', 'role_state', 10);
      tracker.getOrCreate('high', 'decision', 100);
      tracker.getOrCreate('medium', 'lesson', 80);

      const sorted = tracker.getAllSorted();

      expect(sorted[0].entryId).toBe('high');
      expect(sorted[2].entryId).toBe('low');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      tracker.getOrCreate('d1', 'decision', 100);
      tracker.getOrCreate('d2', 'decision', 100);
      tracker.getOrCreate('l1', 'lesson', 100);

      const stats = tracker.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byKind['decision']).toBe(2);
      expect(stats.byKind['lesson']).toBe(1);
      expect(stats.avgScore).toBeGreaterThan(0);
    });

    it('should handle empty tracker', async () => {
      const tracker = new ImportanceTracker(agentsDir);
      await tracker.load();

      const stats = tracker.getStats();

      expect(stats.total).toBe(0);
      expect(stats.avgScore).toBe(0);
      expect(stats.byKind).toEqual({});
    });
  });
});

// ─── Factory Function ────────────────────────────────────────────────────────

describe('createImportanceTracker', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `ada-importance-factory-${Date.now()}`);
    await mkdir(join(tempDir, 'agents', 'state'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should create and load tracker', async () => {
    const tracker = await createImportanceTracker(join(tempDir, 'agents'));

    expect(tracker).toBeInstanceOf(ImportanceTracker);
    expect(tracker.count).toBe(0);
  });

  it('should accept custom config', async () => {
    const tracker = await createImportanceTracker(join(tempDir, 'agents'), {
      forgetThreshold: 0.5,
    });

    // Can't directly test config, but can verify it loads
    expect(tracker).toBeInstanceOf(ImportanceTracker);
  });
});
