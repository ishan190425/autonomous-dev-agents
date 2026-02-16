/**
 * Unit tests for Model Routing Savings Analysis (C735)
 *
 * Tests the calculateSavingsAnalysis function that validates
 * the 14% projected cost savings from model routing.
 *
 * @see docs/frontier/model-routing-validation-spec-c735.md
 */

import { describe, it, expect } from 'vitest';
import {
  detectModelTier,
  calculateBaselineCost,
  calculateModelDistribution,
  calculateSavingsAnalysis,
  type CycleMetrics,
} from '../../src/observability.js';

// ─── Test Data ───────────────────────────────────────────────────────────────

/**
 * Create a mock cycle metrics object for testing.
 */
function createMockCycle(
  cycle: number,
  model: string,
  inputTokens: number = 5000,
  outputTokens: number = 2000
): CycleMetrics {
  // Calculate cost based on model
  let inputCostPer1M: number;
  let outputCostPer1M: number;

  if (model.includes('haiku')) {
    inputCostPer1M = 0.8;
    outputCostPer1M = 4.0;
  } else if (model.includes('opus')) {
    inputCostPer1M = 15.0;
    outputCostPer1M = 75.0;
  } else {
    // Sonnet
    inputCostPer1M = 3.0;
    outputCostPer1M = 15.0;
  }

  const inputCost = (inputTokens / 1_000_000) * inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * outputCostPer1M;

  return {
    cycle,
    role: 'test',
    model,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 1000,
    phases: {},
    totals: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
    cost: {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    },
    success: true,
  };
}

// ─── detectModelTier Tests ───────────────────────────────────────────────────

describe('detectModelTier', () => {
  it('detects haiku from model name', () => {
    expect(detectModelTier('claude-3-5-haiku-20241022')).toBe('haiku');
    expect(detectModelTier('HAIKU-something')).toBe('haiku');
  });

  it('detects opus from model name', () => {
    expect(detectModelTier('claude-3-opus-20240229')).toBe('opus');
    expect(detectModelTier('claude-opus-4')).toBe('opus');
  });

  it('defaults to sonnet for other models', () => {
    expect(detectModelTier('claude-3-5-sonnet-20241022')).toBe('sonnet');
    expect(detectModelTier('claude-4-sonnet')).toBe('sonnet');
    expect(detectModelTier('gpt-4o')).toBe('sonnet'); // Non-Claude defaults to sonnet
    expect(detectModelTier('unknown')).toBe('sonnet');
  });
});

// ─── calculateBaselineCost Tests ─────────────────────────────────────────────

describe('calculateBaselineCost', () => {
  it('calculates baseline cost using Sonnet pricing', () => {
    const cycles = [
      createMockCycle(1, 'claude-3-5-haiku-20241022', 1_000_000, 0), // 1M input tokens
    ];

    // Baseline should be Sonnet pricing: 1M tokens * $3.00/1M = $3.00
    const baseline = calculateBaselineCost(cycles);
    expect(baseline).toBe(3.0);
  });

  it('returns 0 for empty cycles', () => {
    expect(calculateBaselineCost([])).toBe(0);
  });

  it('sums baseline cost across multiple cycles', () => {
    const cycles = [
      createMockCycle(1, 'claude-3-5-haiku-20241022', 1_000_000, 0),
      createMockCycle(2, 'claude-3-5-haiku-20241022', 1_000_000, 0),
    ];

    const baseline = calculateBaselineCost(cycles);
    expect(baseline).toBe(6.0); // 2 * $3.00
  });
});

// ─── calculateModelDistribution Tests ────────────────────────────────────────

describe('calculateModelDistribution', () => {
  it('calculates correct distribution for mixed models', () => {
    const cycles = [
      createMockCycle(1, 'claude-3-5-haiku-20241022'),
      createMockCycle(2, 'claude-3-5-haiku-20241022'),
      createMockCycle(3, 'claude-3-5-sonnet-20241022'),
      createMockCycle(4, 'claude-3-5-sonnet-20241022'),
      createMockCycle(5, 'claude-3-5-sonnet-20241022'),
      createMockCycle(6, 'claude-3-opus-20240229'),
    ];

    const dist = calculateModelDistribution(cycles);

    expect(dist.haiku.cycles).toBe(2);
    expect(dist.haiku.percentage).toBe(33); // 2/6 = 33%
    expect(dist.sonnet.cycles).toBe(3);
    expect(dist.sonnet.percentage).toBe(50); // 3/6 = 50%
    expect(dist.opus.cycles).toBe(1);
    expect(dist.opus.percentage).toBe(17); // 1/6 = 17%
  });

  it('handles empty cycles', () => {
    const dist = calculateModelDistribution([]);

    expect(dist.haiku.cycles).toBe(0);
    expect(dist.sonnet.cycles).toBe(0);
    expect(dist.opus.cycles).toBe(0);
  });

  it('handles all same model', () => {
    const cycles = [
      createMockCycle(1, 'claude-3-5-sonnet-20241022'),
      createMockCycle(2, 'claude-3-5-sonnet-20241022'),
    ];

    const dist = calculateModelDistribution(cycles);

    expect(dist.haiku.percentage).toBe(0);
    expect(dist.sonnet.percentage).toBe(100);
    expect(dist.opus.percentage).toBe(0);
  });
});

// ─── calculateSavingsAnalysis Tests ──────────────────────────────────────────

describe('calculateSavingsAnalysis', () => {
  it('returns empty analysis for no cycles', () => {
    const analysis = calculateSavingsAnalysis([]);

    expect(analysis.cycleCount).toBe(0);
    expect(analysis.actualCost).toBe(0);
    expect(analysis.baselineCost).toBe(0);
    expect(analysis.savings.percentage).toBe(0);
    expect(analysis.status).toBe('below_target');
  });

  it('calculates savings when using cheaper models', () => {
    // Use Haiku which is cheaper than Sonnet
    const cycles = [
      createMockCycle(1, 'claude-3-5-haiku-20241022', 1_000_000, 0),
    ];

    const analysis = calculateSavingsAnalysis(cycles);

    // Actual: Haiku = $0.80/1M = $0.80
    // Baseline: Sonnet = $3.00/1M = $3.00
    // Savings: $3.00 - $0.80 = $2.20 = 73.3%
    expect(analysis.actualCost).toBe(0.8);
    expect(analysis.baselineCost).toBe(3.0);
    expect(analysis.savings.amount).toBe(2.2);
    expect(analysis.savings.percentage).toBeGreaterThan(70);
    expect(analysis.status).toBe('above_target');
  });

  it('shows no savings when all Sonnet', () => {
    const cycles = [
      createMockCycle(1, 'claude-3-5-sonnet-20241022', 1_000_000, 0),
    ];

    const analysis = calculateSavingsAnalysis(cycles);

    // Actual = Baseline = $3.00
    expect(analysis.actualCost).toBe(3.0);
    expect(analysis.baselineCost).toBe(3.0);
    expect(analysis.savings.amount).toBe(0);
    expect(analysis.savings.percentage).toBe(0);
    expect(analysis.status).toBe('below_target');
  });

  it('shows negative savings when using Opus', () => {
    const cycles = [
      createMockCycle(1, 'claude-3-opus-20240229', 1_000_000, 0),
    ];

    const analysis = calculateSavingsAnalysis(cycles);

    // Actual: Opus = $15.00/1M = $15.00
    // Baseline: Sonnet = $3.00/1M = $3.00
    // Savings: -$12.00 (negative)
    expect(analysis.actualCost).toBe(15.0);
    expect(analysis.baselineCost).toBe(3.0);
    expect(analysis.savings.amount).toBeLessThan(0);
    expect(analysis.status).toBe('below_target');
  });

  it('uses correct status thresholds', () => {
    // Test on_track: >= target (10%) but <= projected (14%)
    // With 40% Haiku, savings are ~29% which is above projected, so above_target
    // Let's use a smaller Haiku percentage to get closer to 10-14% range

    // Test below_target (< 10%)
    const belowTargetCycles = [
      // 1 Haiku + 9 Sonnet = 10% Haiku → ~7.3% savings
      createMockCycle(1, 'claude-3-5-haiku-20241022'),
      createMockCycle(2, 'claude-3-5-sonnet-20241022'),
      createMockCycle(3, 'claude-3-5-sonnet-20241022'),
      createMockCycle(4, 'claude-3-5-sonnet-20241022'),
      createMockCycle(5, 'claude-3-5-sonnet-20241022'),
      createMockCycle(6, 'claude-3-5-sonnet-20241022'),
      createMockCycle(7, 'claude-3-5-sonnet-20241022'),
      createMockCycle(8, 'claude-3-5-sonnet-20241022'),
      createMockCycle(9, 'claude-3-5-sonnet-20241022'),
      createMockCycle(10, 'claude-3-5-sonnet-20241022'),
    ];

    const belowTarget = calculateSavingsAnalysis(belowTargetCycles);
    expect(belowTarget.savings.percentage).toBeLessThan(10);
    expect(belowTarget.status).toBe('below_target');

    // Test above_target (> projected 14%)
    // With 40% Haiku, savings should be ~29% which is above 14%
    const aboveTargetCycles = [
      // 2 Haiku + 3 Sonnet = 40% Haiku → ~29% savings
      createMockCycle(1, 'claude-3-5-haiku-20241022'),
      createMockCycle(2, 'claude-3-5-haiku-20241022'),
      createMockCycle(3, 'claude-3-5-sonnet-20241022'),
      createMockCycle(4, 'claude-3-5-sonnet-20241022'),
      createMockCycle(5, 'claude-3-5-sonnet-20241022'),
    ];

    const aboveTarget = calculateSavingsAnalysis(aboveTargetCycles);
    expect(aboveTarget.savings.percentage).toBeGreaterThan(14);
    expect(aboveTarget.status).toBe('above_target');
  });

  it('includes per-cycle averages', () => {
    const cycles = [
      createMockCycle(1, 'claude-3-5-haiku-20241022', 5000, 2000),
      createMockCycle(2, 'claude-3-5-sonnet-20241022', 5000, 2000),
    ];

    const analysis = calculateSavingsAnalysis(cycles);

    expect(analysis.cycleCount).toBe(2);
    expect(analysis.perCycle.actual).toBeGreaterThan(0);
    expect(analysis.perCycle.baseline).toBeGreaterThan(0);
    expect(analysis.perCycle.savings).toBeDefined();
  });

  it('respects custom target and projected values', () => {
    const cycles = [createMockCycle(1, 'claude-3-5-haiku-20241022')];

    const analysis = calculateSavingsAnalysis(cycles, 5, 20);

    expect(analysis.targetPercentage).toBe(5);
    expect(analysis.projectedPercentage).toBe(20);
  });
});
