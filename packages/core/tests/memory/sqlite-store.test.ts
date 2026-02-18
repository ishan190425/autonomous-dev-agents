/**
 * SqliteMemoryStore Tests
 *
 * Tests for the SQLite-based memory store implementation.
 *
 * @see docs/frontier/memory-migration-poc-c836.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateEffectiveScore,
  calculateHeatFromEntry,
  getTierFromHeat,
  generateEntryId,
  SqliteMemoryStore,
} from '../../src/memory/sqlite-store.js';
import type { MemoryEntry, EmbeddingProvider } from '../../src/memory/types.js';

// ==== Utility Function Tests ====

describe('calculateEffectiveScore', () => {
  it('should give innate entries a priority boost', () => {
    const distance = 0.2; // 80% similar
    const heat = 0.5;

    const innateScore = calculateEffectiveScore(distance, heat, true);
    const learnedScore = calculateEffectiveScore(distance, heat, false);

    // Innate should be higher due to +0.5 boost
    expect(innateScore).toBeGreaterThan(learnedScore);
    expect(innateScore).toBeCloseTo(1.3); // (1 - 0.2) + 0.5 = 1.3
    expect(learnedScore).toBeCloseTo(0.4); // (1 - 0.2) * 0.5 = 0.4
  });

  it('should scale learned scores by heat', () => {
    const distance = 0.3;

    const highHeat = calculateEffectiveScore(distance, 1.0, false);
    const lowHeat = calculateEffectiveScore(distance, 0.2, false);

    expect(highHeat).toBeCloseTo(0.7); // (1 - 0.3) * 1.0
    expect(lowHeat).toBeCloseTo(0.14); // (1 - 0.3) * 0.2
    expect(highHeat).toBeGreaterThan(lowHeat);
  });

  it('should handle edge cases', () => {
    // Perfect match (distance 0)
    expect(calculateEffectiveScore(0, 1, false)).toBeCloseTo(1.0);
    expect(calculateEffectiveScore(0, 1, true)).toBeCloseTo(1.5);

    // No similarity (distance 1)
    expect(calculateEffectiveScore(1, 1, false)).toBeCloseTo(0);
    expect(calculateEffectiveScore(1, 1, true)).toBeCloseTo(0.5);
  });
});

describe('calculateHeatFromEntry', () => {
  const baseEntry: MemoryEntry = {
    id: 'test-1',
    content: 'test content',
    entryType: 'observation',
    source: 'dispatch',
    heatScore: 0.5,
    baseImportance: 0.8,
    referenceCount: 0,
    tier: 'warm',
    isProtected: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should increase heat with reference count', () => {
    // Use lower base importance so we can see growth before cap
    const lowImportanceEntry = { ...baseEntry, baseImportance: 0.3 };
    const noRefs = calculateHeatFromEntry({ ...lowImportanceEntry, referenceCount: 0 });
    const someRefs = calculateHeatFromEntry({ ...lowImportanceEntry, referenceCount: 5 });
    const manyRefs = calculateHeatFromEntry({ ...lowImportanceEntry, referenceCount: 20 });

    // Heat should increase with more references (until capped at 1.0)
    expect(someRefs).toBeGreaterThan(noRefs);
    // manyRefs may be capped at 1.0, so use >= instead of >
    expect(manyRefs).toBeGreaterThanOrEqual(someRefs);
  });

  it('should decay based on time since last reference', () => {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recent = calculateHeatFromEntry({
      ...baseEntry,
      lastReferencedAt: now.toISOString(),
    });
    const hourOld = calculateHeatFromEntry({
      ...baseEntry,
      lastReferencedAt: hourAgo.toISOString(),
    });
    const dayOld = calculateHeatFromEntry({
      ...baseEntry,
      lastReferencedAt: dayAgo.toISOString(),
    });

    expect(recent).toBeGreaterThan(hourOld);
    expect(hourOld).toBeGreaterThan(dayOld);
  });

  it('should cap heat at 1.0', () => {
    const maxedEntry = {
      ...baseEntry,
      baseImportance: 1.0,
      referenceCount: 100,
      lastReferencedAt: new Date().toISOString(),
    };

    const heat = calculateHeatFromEntry(maxedEntry);
    expect(heat).toBeLessThanOrEqual(1.0);
  });
});

describe('getTierFromHeat', () => {
  const thresholds = { hot: 0.8, cold: 0.3 };

  it('should never change innate tier', () => {
    expect(getTierFromHeat(0.1, 'innate', thresholds)).toBe('innate');
    expect(getTierFromHeat(1.0, 'innate', thresholds)).toBe('innate');
  });

  it('should promote to hot when heat >= threshold', () => {
    expect(getTierFromHeat(0.9, 'warm', thresholds)).toBe('hot');
    expect(getTierFromHeat(0.8, 'cold', thresholds)).toBe('hot');
  });

  it('should keep warm when between thresholds', () => {
    expect(getTierFromHeat(0.5, 'warm', thresholds)).toBe('warm');
    expect(getTierFromHeat(0.5, 'hot', thresholds)).toBe('warm');
  });

  it('should demote to cold when below threshold', () => {
    expect(getTierFromHeat(0.2, 'warm', thresholds)).toBe('cold');
    expect(getTierFromHeat(0.1, 'hot', thresholds)).toBe('cold');
  });
});

describe('generateEntryId', () => {
  it('should generate deterministic ID for innate entries', () => {
    const entry = { tier: 'innate' as const, sourceFile: '/path/to/RULES.md' };

    const id1 = generateEntryId(entry);
    const id2 = generateEntryId(entry);

    expect(id1).toBe('innate-rules');
    expect(id2).toBe('innate-rules');
    expect(id1).toBe(id2); // Deterministic
  });

  it('should generate UUID for learned entries', () => {
    const entry = { tier: 'warm' as const };

    const id1 = generateEntryId(entry);
    const id2 = generateEntryId(entry);

    expect(id1).toMatch(/^[0-9a-f-]{36}$/);
    expect(id2).toMatch(/^[0-9a-f-]{36}$/);
    expect(id1).not.toBe(id2); // Unique each time
  });

  it('should handle various file paths', () => {
    expect(generateEntryId({ tier: 'innate', sourceFile: '/agents/playbooks/ceo.md' })).toBe('innate-ceo');
    expect(generateEntryId({ tier: 'innate', sourceFile: 'DISPATCH.md' })).toBe('innate-dispatch');
    expect(generateEntryId({ tier: 'innate', sourceFile: '/a/b/c/roster.json' })).toBe('innate-roster');
  });
});

// ==== SqliteMemoryStore Class Tests ====

describe('SqliteMemoryStore', () => {
  // Mock embedding provider
  const mockEmbeddingProvider: EmbeddingProvider = {
    name: 'mock',
    dimension: 384,
    embed: vi.fn().mockResolvedValue(new Float32Array(384).fill(0.1)),
    embedBatch: vi.fn().mockImplementation((texts: string[]) =>
      Promise.resolve(texts.map(() => new Float32Array(384).fill(0.1)))
    ),
  };

  describe('constructor', () => {
    it('should set default options', () => {
      const store = new SqliteMemoryStore(
        { dbPath: ':memory:' },
        mockEmbeddingProvider
      );

      expect(store.options.embeddingDimension).toBe(384);
      expect(store.options.enableHeatDecay).toBe(true);
      expect(store.options.heatDecayFactor).toBe(0.95);
      expect(store.options.coldTierThreshold).toBe(0.1);
      expect(store.options.hotTierThreshold).toBe(0.8);
    });

    it('should override defaults with provided options', () => {
      const store = new SqliteMemoryStore(
        {
          dbPath: ':memory:',
          embeddingDimension: 768,
          enableHeatDecay: false,
          coldTierThreshold: 0.2,
        },
        mockEmbeddingProvider
      );

      expect(store.options.embeddingDimension).toBe(768);
      expect(store.options.enableHeatDecay).toBe(false);
      expect(store.options.coldTierThreshold).toBe(0.2);
    });
  });

  describe('isInitialized', () => {
    it('should be false before initialization', () => {
      const store = new SqliteMemoryStore(
        { dbPath: ':memory:' },
        mockEmbeddingProvider
      );

      expect(store.isInitialized).toBe(false);
    });
  });

  describe('ensureInitialized', () => {
    it('should throw if not initialized', () => {
      const store = new SqliteMemoryStore(
        { dbPath: ':memory:' },
        mockEmbeddingProvider
      );

      // Access any method that requires initialization (throws synchronously)
      expect(() => store.get('test')).toThrow('not initialized');
    });
  });
});

// ==== Integration Tests (require better-sqlite3 + sqlite-vec) ====

describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)('SqliteMemoryStore Integration', () => {
  let store: SqliteMemoryStore;
  const mockEmbeddingProvider: EmbeddingProvider = {
    name: 'mock',
    dimension: 384,
    embed: vi.fn().mockResolvedValue(new Float32Array(384).fill(0.1)),
    embedBatch: vi.fn().mockImplementation((texts: string[]) =>
      Promise.resolve(texts.map(() => new Float32Array(384).fill(0.1)))
    ),
  };

  beforeEach(async () => {
    store = new SqliteMemoryStore(
      { dbPath: ':memory:', enableHeatDecay: false },
      mockEmbeddingProvider
    );
    await store.initialize();
  });

  afterEach(async () => {
    await store.close();
  });

  it('should initialize and close cleanly', async () => {
    expect(store.isInitialized).toBe(true);
    await store.close();
    expect(store.isInitialized).toBe(false);
  });

  it('should upsert and retrieve entries', async () => {
    const entry = await store.upsert({
      content: 'Test memory content',
      entryType: 'observation',
      source: 'dispatch',
      heatScore: 0.5,
      baseImportance: 0.5,
      referenceCount: 0,
      tier: 'warm',
      isProtected: false,
    });

    expect(entry.id).toBeDefined();
    expect(entry.content).toBe('Test memory content');

    const retrieved = await store.get(entry.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.content).toBe('Test memory content');
  });

  it('should protect innate entries from overwrite', async () => {
    // First upsert creates the protected entry
    await store.upsert({
      content: 'Innate content',
      entryType: 'rule',
      source: 'innate',
      heatScore: 1.0,
      baseImportance: 1.0,
      referenceCount: 0,
      tier: 'innate',
      isProtected: true,
      sourceFile: '/agents/rules/RULES.md',
    });

    await expect(store.upsert({
      content: 'Updated content',
      entryType: 'rule',
      source: 'innate',
      heatScore: 1.0,
      baseImportance: 1.0,
      referenceCount: 0,
      tier: 'innate',
      isProtected: true,
      sourceFile: '/agents/rules/RULES.md',
    })).rejects.toThrow('protected');
  });

  it('should not delete protected entries', async () => {
    const innate = await store.upsert({
      content: 'Innate content',
      entryType: 'rule',
      source: 'innate',
      heatScore: 1.0,
      baseImportance: 1.0,
      referenceCount: 0,
      tier: 'innate',
      isProtected: true,
      sourceFile: '/agents/rules/RULES.md',
    });

    const deleted = await store.delete(innate.id);
    expect(deleted).toBe(false);

    const stillExists = await store.get(innate.id);
    expect(stillExists).not.toBeNull();
  });

  it('should track references and update heat', async () => {
    const entry = await store.upsert({
      content: 'Test content',
      entryType: 'observation',
      source: 'dispatch',
      heatScore: 0.5,
      baseImportance: 0.5,
      referenceCount: 0,
      tier: 'warm',
      isProtected: false,
    });

    await store.recordReference(entry.id);

    const updated = await store.get(entry.id);
    expect(updated?.referenceCount).toBe(1);
    expect(updated?.lastReferencedAt).toBeDefined();
  });

  it('should return correct stats', async () => {
    await store.upsert({
      content: 'Warm entry',
      entryType: 'observation',
      source: 'dispatch',
      heatScore: 0.5,
      baseImportance: 0.5,
      referenceCount: 0,
      tier: 'warm',
      isProtected: false,
    });

    await store.upsert({
      content: 'Innate entry',
      entryType: 'rule',
      source: 'innate',
      heatScore: 1.0,
      baseImportance: 1.0,
      referenceCount: 0,
      tier: 'innate',
      isProtected: true,
      sourceFile: '/agents/rules/TEST.md',
    });

    const stats = await store.getStats();

    expect(stats.totalEntries).toBe(2);
    expect(stats.byTier.warm).toBe(1);
    expect(stats.byTier.innate).toBe(1);
    expect(stats.protectedCount).toBe(1);
  });
});
