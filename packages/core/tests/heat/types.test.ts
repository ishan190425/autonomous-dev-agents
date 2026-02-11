/**
 * Heat Types Tests — @ada/core
 *
 * Tests for heat type exports and constants.
 *
 * @see Issue #118 — Heat Scoring Implementation
 */

import { describe, it, expect } from 'vitest';
import {
  HEAT_THRESHOLDS,
  DEFAULT_HEAT_CONFIG,
} from '../../src/heat/types.js';
import type {
  MemoryClass,
  HeatTier,
  HeatMetadata,
  HeatScore,
  HeatSignal,
  HeatSignalType,
  HeatStats,
} from '../../src/heat/types.js';

describe('HEAT_THRESHOLDS', () => {
  it('exports hot threshold', () => {
    expect(HEAT_THRESHOLDS.HOT).toBe(0.8);
  });

  it('exports warm threshold', () => {
    expect(HEAT_THRESHOLDS.WARM).toBe(0.4);
  });

  it('exports cold threshold', () => {
    expect(HEAT_THRESHOLDS.COLD).toBe(0.0);
  });

  it('has correct ordering (hot > warm > cold)', () => {
    expect(HEAT_THRESHOLDS.HOT).toBeGreaterThan(HEAT_THRESHOLDS.WARM);
    expect(HEAT_THRESHOLDS.WARM).toBeGreaterThan(HEAT_THRESHOLDS.COLD);
  });
});

describe('DEFAULT_HEAT_CONFIG', () => {
  it('has valid threshold values', () => {
    expect(DEFAULT_HEAT_CONFIG.thresholds.hot).toBe(0.8);
    expect(DEFAULT_HEAT_CONFIG.thresholds.warm).toBe(0.4);
  });

  it('has valid decay rates', () => {
    expect(DEFAULT_HEAT_CONFIG.decayRates.innate).toBe(0);
    expect(DEFAULT_HEAT_CONFIG.decayRates.learned).toBe(0.05);
    expect(DEFAULT_HEAT_CONFIG.decayRates.episodic).toBe(0.15);
  });

  it('has innate decay rate of 0 (never decay)', () => {
    expect(DEFAULT_HEAT_CONFIG.decayRates.innate).toBe(0);
  });

  it('has faster episodic decay than learned', () => {
    expect(DEFAULT_HEAT_CONFIG.decayRates.episodic).toBeGreaterThan(
      DEFAULT_HEAT_CONFIG.decayRates.learned
    );
  });

  it('has valid reference boost values', () => {
    expect(DEFAULT_HEAT_CONFIG.referenceBoost.initial).toBe(0.1);
    expect(DEFAULT_HEAT_CONFIG.referenceBoost.diminishing).toBe(0.5);
  });
});

describe('Type Exports', () => {
  it('MemoryClass type allows valid values', () => {
    const innate: MemoryClass = 'innate';
    const learned: MemoryClass = 'learned';
    const episodic: MemoryClass = 'episodic';

    expect(innate).toBe('innate');
    expect(learned).toBe('learned');
    expect(episodic).toBe('episodic');
  });

  it('HeatTier type allows valid values', () => {
    const hot: HeatTier = 'hot';
    const warm: HeatTier = 'warm';
    const cold: HeatTier = 'cold';

    expect(hot).toBe('hot');
    expect(warm).toBe('warm');
    expect(cold).toBe('cold');
  });

  it('HeatSignalType allows valid values', () => {
    const types: HeatSignalType[] = [
      'file_access',
      'test_output',
      'git_diff',
      'stderr',
      'command_arg',
    ];

    expect(types).toHaveLength(5);
    types.forEach(type => expect(typeof type).toBe('string'));
  });

  it('HeatMetadata interface has required fields', () => {
    const metadata: HeatMetadata = {
      entityId: 'test-id',
      memoryClass: 'learned',
      baseImportance: 0.7,
      referenceCount: 3,
      lastAccessedAt: Date.now(),
      createdAt: Date.now() - 1000,
    };

    expect(metadata.entityId).toBe('test-id');
    expect(metadata.memoryClass).toBe('learned');
    expect(metadata.baseImportance).toBe(0.7);
    expect(metadata.referenceCount).toBe(3);
    expect(typeof metadata.lastAccessedAt).toBe('number');
    expect(typeof metadata.createdAt).toBe('number');
  });

  it('HeatScore interface has required fields', () => {
    const metadata: HeatMetadata = {
      entityId: 'test-id',
      memoryClass: 'learned',
      baseImportance: 0.7,
      referenceCount: 3,
      lastAccessedAt: Date.now(),
      createdAt: Date.now() - 1000,
    };

    const score: HeatScore = {
      entityId: 'test-id',
      score: 0.75,
      tier: 'warm',
      metadata,
      calculatedAt: Date.now(),
    };

    expect(score.entityId).toBe('test-id');
    expect(score.score).toBe(0.75);
    expect(score.tier).toBe('warm');
    expect(score.metadata).toBe(metadata);
    expect(typeof score.calculatedAt).toBe('number');
  });

  it('HeatSignal interface has required fields', () => {
    const signal: HeatSignal = {
      timestamp: Date.now(),
      signalType: 'file_access',
      filePath: '/src/index.ts',
      source: 'terminal:vim',
      weight: 0.5,
    };

    expect(typeof signal.timestamp).toBe('number');
    expect(signal.signalType).toBe('file_access');
    expect(signal.filePath).toBe('/src/index.ts');
    expect(signal.source).toBe('terminal:vim');
    expect(signal.weight).toBe(0.5);
  });

  it('HeatStats interface has required fields', () => {
    const stats: HeatStats = {
      total: 100,
      byClass: { innate: 10, learned: 70, episodic: 20 },
      byTier: { hot: 15, warm: 50, cold: 35 },
      averageHeat: 0.55,
      averageReferences: 4.2,
    };

    expect(stats.total).toBe(100);
    expect(stats.byClass.innate).toBe(10);
    expect(stats.byClass.learned).toBe(70);
    expect(stats.byClass.episodic).toBe(20);
    expect(stats.byTier.hot).toBe(15);
    expect(stats.byTier.warm).toBe(50);
    expect(stats.byTier.cold).toBe(35);
    expect(stats.averageHeat).toBe(0.55);
    expect(stats.averageReferences).toBe(4.2);
  });
});
