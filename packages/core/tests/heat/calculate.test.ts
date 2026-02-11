/**
 * Heat Calculation Tests — @ada/core
 *
 * Tests for reference-based heat scoring.
 * Coverage target: 85%+ per Sprint 2 Implementation Contract.
 *
 * @see Issue #118 — Heat Scoring Implementation
 */

import { describe, it, expect } from 'vitest';
import {
  calculateHeat,
  calculateHeatScore,
  getHeatTier,
  isHot,
  isWarm,
  isCold,
  projectDecay,
  daysUntilTierDrop,
  normalizeImportance,
  calculateHeatStats,
  getHeatEmoji,
  formatHeatScore,
} from '../../src/heat/calculate.js';
import type { HeatMetadata, HeatConfig } from '../../src/heat/types.js';
import { DEFAULT_HEAT_CONFIG } from '../../src/heat/types.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function createMetadata(overrides: Partial<HeatMetadata> = {}): HeatMetadata {
  const now = Date.now();
  return {
    entityId: 'test-entity-1',
    memoryClass: 'learned',
    baseImportance: 0.7,
    referenceCount: 3,
    lastAccessedAt: now - MS_PER_DAY, // 1 day ago
    createdAt: now - 7 * MS_PER_DAY, // 7 days ago
    ...overrides,
  };
}

// ─── calculateHeat Tests ────────────────────────────────────────────────────

describe('calculateHeat', () => {
  it('returns 1.0 for innate memories', () => {
    const metadata = createMetadata({
      memoryClass: 'innate',
      baseImportance: 0.3, // Doesn't matter
      referenceCount: 0, // Doesn't matter
      lastAccessedAt: Date.now() - 30 * MS_PER_DAY, // Very old, doesn't matter
    });

    const heat = calculateHeat(metadata);
    expect(heat).toBe(1.0);
  });

  it('returns less than 1.0 for learned memories (capped at 0.99)', () => {
    const metadata = createMetadata({
      memoryClass: 'learned',
      baseImportance: 1.0,
      referenceCount: 1000, // Very high refs
      lastAccessedAt: Date.now(), // Just now
    });

    const heat = calculateHeat(metadata);
    expect(heat).toBeLessThanOrEqual(0.99);
    expect(heat).toBeGreaterThan(0.9);
  });

  it('decays over time for learned memories', () => {
    const now = Date.now();

    const recentMetadata = createMetadata({
      lastAccessedAt: now,
    });

    const oldMetadata = createMetadata({
      lastAccessedAt: now - 7 * MS_PER_DAY, // 7 days ago
    });

    const recentHeat = calculateHeat(recentMetadata, DEFAULT_HEAT_CONFIG, now);
    const oldHeat = calculateHeat(oldMetadata, DEFAULT_HEAT_CONFIG, now);

    expect(recentHeat).toBeGreaterThan(oldHeat);
  });

  it('decays faster for episodic memories than learned', () => {
    const now = Date.now();
    const fiveDaysAgo = now - 5 * MS_PER_DAY;

    const learnedMetadata = createMetadata({
      memoryClass: 'learned',
      lastAccessedAt: fiveDaysAgo,
    });

    const episodicMetadata = createMetadata({
      memoryClass: 'episodic',
      lastAccessedAt: fiveDaysAgo,
    });

    const learnedHeat = calculateHeat(learnedMetadata, DEFAULT_HEAT_CONFIG, now);
    const episodicHeat = calculateHeat(episodicMetadata, DEFAULT_HEAT_CONFIG, now);

    expect(learnedHeat).toBeGreaterThan(episodicHeat);
  });

  it('increases with reference count (with diminishing returns)', () => {
    const now = Date.now();

    const lowRefs = createMetadata({ referenceCount: 1 });
    const midRefs = createMetadata({ referenceCount: 5 });
    const highRefs = createMetadata({ referenceCount: 20 });

    const lowHeat = calculateHeat(lowRefs, DEFAULT_HEAT_CONFIG, now);
    const midHeat = calculateHeat(midRefs, DEFAULT_HEAT_CONFIG, now);
    const highHeat = calculateHeat(highRefs, DEFAULT_HEAT_CONFIG, now);

    expect(midHeat).toBeGreaterThan(lowHeat);
    expect(highHeat).toBeGreaterThan(midHeat);

    // Diminishing returns: difference between 5→20 should be less than 1→5
    const lowToMidDelta = midHeat - lowHeat;
    const midToHighDelta = highHeat - midHeat;
    expect(midToHighDelta).toBeLessThan(lowToMidDelta * 2); // Some diminishing effect
  });

  it('scales with base importance', () => {
    const now = Date.now();

    const lowImportance = createMetadata({ baseImportance: 0.2 });
    const highImportance = createMetadata({ baseImportance: 0.9 });

    const lowHeat = calculateHeat(lowImportance, DEFAULT_HEAT_CONFIG, now);
    const highHeat = calculateHeat(highImportance, DEFAULT_HEAT_CONFIG, now);

    expect(highHeat).toBeGreaterThan(lowHeat);
  });

  it('clamps negative importance to 0', () => {
    const metadata = createMetadata({ baseImportance: -0.5 });
    const heat = calculateHeat(metadata);

    expect(heat).toBeGreaterThanOrEqual(0);
  });

  it('uses custom config when provided', () => {
    const now = Date.now();
    const metadata = createMetadata({
      lastAccessedAt: now - 5 * MS_PER_DAY,
    });

    const aggressiveDecay: HeatConfig = {
      ...DEFAULT_HEAT_CONFIG,
      decayRates: {
        innate: 0,
        learned: 0.5, // Very fast decay
        episodic: 1.0,
      },
    };

    const defaultHeat = calculateHeat(metadata, DEFAULT_HEAT_CONFIG, now);
    const aggressiveHeat = calculateHeat(metadata, aggressiveDecay, now);

    expect(aggressiveHeat).toBeLessThan(defaultHeat);
  });
});

// ─── calculateHeatScore Tests ───────────────────────────────────────────────

describe('calculateHeatScore', () => {
  it('returns full HeatScore object', () => {
    const now = Date.now();
    const metadata = createMetadata();

    const result = calculateHeatScore(metadata, DEFAULT_HEAT_CONFIG, now);

    expect(result.entityId).toBe(metadata.entityId);
    expect(typeof result.score).toBe('number');
    expect(['hot', 'warm', 'cold']).toContain(result.tier);
    expect(result.metadata).toBe(metadata);
    expect(result.calculatedAt).toBe(now);
  });
});

// ─── Tier Classification Tests ──────────────────────────────────────────────

describe('getHeatTier', () => {
  it('returns hot for scores >= 0.8', () => {
    expect(getHeatTier(0.8)).toBe('hot');
    expect(getHeatTier(0.85)).toBe('hot');
    expect(getHeatTier(0.99)).toBe('hot');
    expect(getHeatTier(1.0)).toBe('hot');
  });

  it('returns warm for scores >= 0.4 and < 0.8', () => {
    expect(getHeatTier(0.4)).toBe('warm');
    expect(getHeatTier(0.5)).toBe('warm');
    expect(getHeatTier(0.79)).toBe('warm');
  });

  it('returns cold for scores < 0.4', () => {
    expect(getHeatTier(0.0)).toBe('cold');
    expect(getHeatTier(0.1)).toBe('cold');
    expect(getHeatTier(0.39)).toBe('cold');
  });

  it('respects custom thresholds', () => {
    const customConfig: HeatConfig = {
      ...DEFAULT_HEAT_CONFIG,
      thresholds: { hot: 0.9, warm: 0.5 },
    };

    expect(getHeatTier(0.85, customConfig)).toBe('warm'); // Would be hot with defaults
    expect(getHeatTier(0.45, customConfig)).toBe('cold'); // Would be warm with defaults
  });
});

describe('isHot / isWarm / isCold', () => {
  it('isHot returns true only for hot tier', () => {
    expect(isHot(0.9)).toBe(true);
    expect(isHot(0.7)).toBe(false);
    expect(isHot(0.3)).toBe(false);
  });

  it('isWarm returns true only for warm tier', () => {
    expect(isWarm(0.6)).toBe(true);
    expect(isWarm(0.9)).toBe(false);
    expect(isWarm(0.3)).toBe(false);
  });

  it('isCold returns true only for cold tier', () => {
    expect(isCold(0.2)).toBe(true);
    expect(isCold(0.5)).toBe(false);
    expect(isCold(0.9)).toBe(false);
  });
});

// ─── Decay Projection Tests ─────────────────────────────────────────────────

describe('projectDecay', () => {
  it('returns 1.0 for innate memories regardless of days', () => {
    const metadata = createMetadata({ memoryClass: 'innate' });

    expect(projectDecay(metadata, 0)).toBe(1.0);
    expect(projectDecay(metadata, 30)).toBe(1.0);
    expect(projectDecay(metadata, 365)).toBe(1.0);
  });

  it('decreases heat score over time for learned memories', () => {
    const now = Date.now();
    const metadata = createMetadata({
      memoryClass: 'learned',
      lastAccessedAt: now, // Just accessed
    });

    const heatNow = projectDecay(metadata, 0, DEFAULT_HEAT_CONFIG, now);
    const heatIn7Days = projectDecay(metadata, 7, DEFAULT_HEAT_CONFIG, now);
    const heatIn30Days = projectDecay(metadata, 30, DEFAULT_HEAT_CONFIG, now);

    expect(heatIn7Days).toBeLessThan(heatNow);
    expect(heatIn30Days).toBeLessThan(heatIn7Days);
  });
});

describe('daysUntilTierDrop', () => {
  it('returns Infinity for innate memories', () => {
    const metadata = createMetadata({ memoryClass: 'innate' });
    expect(daysUntilTierDrop(metadata)).toBe(Infinity);
  });

  it('returns Infinity for already cold memories', () => {
    const now = Date.now();
    const metadata = createMetadata({
      baseImportance: 0.1,
      referenceCount: 0,
      lastAccessedAt: now - 60 * MS_PER_DAY, // Very old, definitely cold
    });

    expect(daysUntilTierDrop(metadata, DEFAULT_HEAT_CONFIG, now)).toBe(Infinity);
  });

  it('returns positive days for hot/warm memories', () => {
    const now = Date.now();
    const hotMetadata = createMetadata({
      memoryClass: 'learned',
      baseImportance: 0.9,
      referenceCount: 10,
      lastAccessedAt: now, // Just accessed
    });

    const days = daysUntilTierDrop(hotMetadata, DEFAULT_HEAT_CONFIG, now);
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThan(365); // Reasonable upper bound
  });
});

// ─── Importance Normalization Tests ─────────────────────────────────────────

describe('normalizeImportance', () => {
  it('normalizes 1-10 scale to 0-1', () => {
    expect(normalizeImportance(1, 'action')).toBeCloseTo(0.1);
    expect(normalizeImportance(5, 'action')).toBeCloseTo(0.5);
    expect(normalizeImportance(10, 'action')).toBeCloseTo(1.0);
  });

  it('clamps values outside 1-10 range', () => {
    expect(normalizeImportance(0, 'action')).toBe(0);
    expect(normalizeImportance(-5, 'action')).toBe(0);
    expect(normalizeImportance(15, 'action')).toBe(1.0);
  });

  it('applies type-based weighting', () => {
    const base = normalizeImportance(5, 'action');
    const decision = normalizeImportance(5, 'decision');
    const reflection = normalizeImportance(5, 'reflection');
    const observation = normalizeImportance(5, 'observation');

    expect(decision).toBeGreaterThan(base);
    expect(reflection).toBeGreaterThan(base);
    expect(observation).toBeLessThan(base);
  });

  it('caps weighted values at 1.0', () => {
    const decision = normalizeImportance(10, 'decision');
    expect(decision).toBe(1.0); // 10/10 × 1.2 = 1.2 → capped to 1.0
  });
});

// ─── Statistics Tests ───────────────────────────────────────────────────────

describe('calculateHeatStats', () => {
  it('returns zero stats for empty array', () => {
    const stats = calculateHeatStats([]);

    expect(stats.total).toBe(0);
    expect(stats.byClass).toEqual({ innate: 0, learned: 0, episodic: 0 });
    expect(stats.byTier).toEqual({ hot: 0, warm: 0, cold: 0 });
    expect(stats.averageHeat).toBe(0);
    expect(stats.averageReferences).toBe(0);
  });

  it('counts entries by class', () => {
    const entries: HeatMetadata[] = [
      createMetadata({ entityId: '1', memoryClass: 'innate' }),
      createMetadata({ entityId: '2', memoryClass: 'learned' }),
      createMetadata({ entityId: '3', memoryClass: 'learned' }),
      createMetadata({ entityId: '4', memoryClass: 'episodic' }),
    ];

    const stats = calculateHeatStats(entries);

    expect(stats.byClass.innate).toBe(1);
    expect(stats.byClass.learned).toBe(2);
    expect(stats.byClass.episodic).toBe(1);
  });

  it('counts entries by tier', () => {
    const now = Date.now();
    const entries: HeatMetadata[] = [
      createMetadata({
        entityId: '1',
        memoryClass: 'innate', // Always hot
      }),
      createMetadata({
        entityId: '2',
        baseImportance: 0.8,
        referenceCount: 5,
        lastAccessedAt: now, // Should be hot/warm
      }),
      createMetadata({
        entityId: '3',
        baseImportance: 0.1,
        referenceCount: 0,
        lastAccessedAt: now - 30 * MS_PER_DAY, // Should be cold
      }),
    ];

    const stats = calculateHeatStats(entries, DEFAULT_HEAT_CONFIG, now);

    expect(stats.byTier.hot).toBeGreaterThanOrEqual(1); // At least innate
    expect(stats.total).toBe(3);
  });

  it('calculates averages correctly', () => {
    const entries: HeatMetadata[] = [
      createMetadata({ entityId: '1', referenceCount: 2 }),
      createMetadata({ entityId: '2', referenceCount: 4 }),
      createMetadata({ entityId: '3', referenceCount: 6 }),
    ];

    const stats = calculateHeatStats(entries);

    expect(stats.averageReferences).toBe(4); // (2+4+6)/3
    expect(stats.averageHeat).toBeGreaterThan(0);
    expect(stats.averageHeat).toBeLessThanOrEqual(1);
  });
});

// ─── Display Utility Tests ──────────────────────────────────────────────────

describe('getHeatEmoji', () => {
  it('returns correct emoji for each tier', () => {
    expect(getHeatEmoji('hot')).toBe('🔥');
    expect(getHeatEmoji('warm')).toBe('🟠');
    expect(getHeatEmoji('cold')).toBe('🧊');
  });
});

describe('formatHeatScore', () => {
  it('formats score as percentage', () => {
    expect(formatHeatScore(0)).toBe('0%');
    expect(formatHeatScore(0.5)).toBe('50%');
    expect(formatHeatScore(0.85)).toBe('85%');
    expect(formatHeatScore(1.0)).toBe('100%');
  });

  it('rounds to nearest integer', () => {
    expect(formatHeatScore(0.333)).toBe('33%');
    expect(formatHeatScore(0.666)).toBe('67%');
  });
});
