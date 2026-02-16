import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectModel,
  getFallbackModel,
  calculateCycleCost,
  getModelTier,
  isComplexRole,
  inferActionType,
  getModelDistribution,
  calculateProjectedCycleCost,
  ModelRouter,
  MODEL_INFO,
  DEFAULT_ROUTING_CONFIG,
} from '../../src/models/router.js';
import type { ClaudeModel } from '../../src/models/types.js';

describe('ModelRouter', () => {
  describe('selectModel', () => {
    it('should select Haiku for Scrum role', () => {
      const result = selectModel('scrum');
      expect(result.model).toBe('claude-3-5-haiku-20241022');
      expect(result.tier).toBe('fast');
      expect(result.isFallback).toBe(false);
    });

    it('should select Haiku for Evangelist role', () => {
      const result = selectModel('evangelist');
      expect(result.model).toBe('claude-3-5-haiku-20241022');
      expect(result.tier).toBe('fast');
    });

    it('should select Sonnet as default for Engineering role', () => {
      const result = selectModel('engineering');
      expect(result.model).toBe('claude-3-5-sonnet-20241022');
      expect(result.tier).toBe('balanced');
    });

    it('should select Sonnet as default for Research role', () => {
      const result = selectModel('research');
      expect(result.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should select Sonnet as default for Frontier role', () => {
      const result = selectModel('frontier');
      expect(result.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should select Sonnet for Design role', () => {
      const result = selectModel('design');
      expect(result.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should select Haiku for Ops merge action', () => {
      const result = selectModel('ops', 'PR #159 merged — Container MVP Foundation');
      expect(result.model).toBe('claude-3-5-haiku-20241022');
      expect(result.reason).toContain('merge');
    });

    it('should select Haiku for Ops triage action', () => {
      const result = selectModel('ops', 'PR triage and review');
      expect(result.model).toBe('claude-3-5-haiku-20241022');
    });

    it('should select Sonnet for Ops infra action', () => {
      const result = selectModel('ops', 'Update CI workflow');
      expect(result.model).toBe('claude-3-5-sonnet-20241022');
      expect(result.reason).toContain('infra');
    });

    it('should select Opus for CEO strategic endorsement', () => {
      const result = selectModel('ceo', 'Strategic cost strategy endorsement');
      expect(result.model).toBe('claude-3-opus-20240229');
      expect(result.tier).toBe('premium');
    });

    it('should select Opus for CEO pivot decision', () => {
      const result = selectModel('ceo', 'Strategic pivot to Bootstrap via SaaS');
      expect(result.model).toBe('claude-3-opus-20240229');
    });

    it('should select Opus for CEO ADR decision', () => {
      const result = selectModel('ceo', 'Architecture Decision Record for new system');
      expect(result.model).toBe('claude-3-opus-20240229');
    });

    it('should select Opus for CEO launch decision', () => {
      const result = selectModel('ceo', 'Launch go/no-go decision for v1.0');
      expect(result.model).toBe('claude-3-opus-20240229');
    });

    it('should select Sonnet for CEO status update', () => {
      const result = selectModel('ceo', 'Weekly status review and sync');
      expect(result.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should prevent complex roles from using Haiku even if configured', () => {
      // Create a custom config that tries to route engineering to Haiku
      const badConfig = {
        ...DEFAULT_ROUTING_CONFIG,
        roleOverrides: {
          ...DEFAULT_ROUTING_CONFIG.roleOverrides,
          engineering: 'claude-3-5-haiku-20241022' as ClaudeModel,
        },
      };

      const result = selectModel('engineering', undefined, badConfig);
      // Should upgrade to Sonnet because engineering is a complex role
      expect(result.model).toBe('claude-3-5-sonnet-20241022');
      expect(result.reason).toContain('complex role');
    });
  });

  describe('inferActionType', () => {
    it('should detect merge action for Ops', () => {
      expect(inferActionType('ops', 'PR #159 merged')).toBe('merge');
    });

    it('should detect triage action for Ops', () => {
      expect(inferActionType('ops', 'PR review and triage')).toBe('triage');
    });

    it('should detect infra action for Ops', () => {
      expect(inferActionType('ops', 'Update CI workflow for npm')).toBe('infra');
    });

    it('should detect endorse action for CEO', () => {
      expect(inferActionType('ceo', 'Cost strategy endorsement')).toBe('endorse');
    });

    it('should detect pivot action for CEO', () => {
      expect(inferActionType('ceo', 'Strategic pivot decision')).toBe('pivot');
    });

    it('should return default for unrecognized actions', () => {
      expect(inferActionType('engineering', 'Implement new feature')).toBe('default');
    });
  });

  describe('getFallbackModel', () => {
    it('should fallback Haiku to Sonnet on validation failure', () => {
      const result = getFallbackModel('claude-3-5-haiku-20241022', 'validation_failure');
      expect(result).toBeDefined();
      if (result) {
        expect(result.model).toBe('claude-3-5-sonnet-20241022');
        expect(result.isFallback).toBe(true);
        expect(result.originalModel).toBe('claude-3-5-haiku-20241022');
      }
    });

    it('should fallback Haiku to Sonnet on incomplete output', () => {
      const result = getFallbackModel('claude-3-5-haiku-20241022', 'incomplete_output');
      expect(result).toBeDefined();
      if (result) {
        expect(result.model).toBe('claude-3-5-sonnet-20241022');
      }
    });

    it('should fallback Sonnet to Opus on critical task', () => {
      const result = getFallbackModel('claude-3-5-sonnet-20241022', 'critical_task');
      expect(result).toBeDefined();
      if (result) {
        expect(result.model).toBe('claude-3-opus-20240229');
        expect(result.tier).toBe('premium');
      }
    });

    it('should not fallback Opus (already premium tier)', () => {
      const result = getFallbackModel('claude-3-opus-20240229', 'validation_failure');
      expect(result).toBeNull();
    });

    it('should not fallback Haiku on non-matching trigger', () => {
      const result = getFallbackModel('claude-3-5-haiku-20241022', 'critical_task');
      expect(result).toBeNull();
    });
  });

  describe('calculateCycleCost', () => {
    it('should calculate Haiku cost correctly', () => {
      const cost = calculateCycleCost('claude-3-5-haiku-20241022');
      // (5000/1M * 0.8) + (2000/1M * 4.0) + (1000/1M * 0.8) = 0.004 + 0.008 + 0.0008 = 0.0128
      expect(cost).toBeCloseTo(0.0128, 4);
    });

    it('should calculate Sonnet cost correctly', () => {
      const cost = calculateCycleCost('claude-3-5-sonnet-20241022');
      // (5000/1M * 3.0) + (2000/1M * 15.0) + (1000/1M * 3.0) = 0.015 + 0.03 + 0.003 = 0.048
      expect(cost).toBeCloseTo(0.048, 4);
    });

    it('should calculate Opus cost correctly', () => {
      const cost = calculateCycleCost('claude-3-opus-20240229');
      // (5000/1M * 15.0) + (2000/1M * 75.0) + (1000/1M * 15.0) = 0.075 + 0.15 + 0.015 = 0.24
      expect(cost).toBeCloseTo(0.24, 4);
    });

    it('should show Haiku is cheapest', () => {
      const haiku = calculateCycleCost('claude-3-5-haiku-20241022');
      const sonnet = calculateCycleCost('claude-3-5-sonnet-20241022');
      const opus = calculateCycleCost('claude-3-opus-20240229');

      expect(haiku).toBeLessThan(sonnet);
      expect(sonnet).toBeLessThan(opus);
    });
  });

  describe('getModelTier', () => {
    it('should return fast for Haiku', () => {
      expect(getModelTier('claude-3-5-haiku-20241022')).toBe('fast');
    });

    it('should return balanced for Sonnet', () => {
      expect(getModelTier('claude-3-5-sonnet-20241022')).toBe('balanced');
    });

    it('should return premium for Opus', () => {
      expect(getModelTier('claude-3-opus-20240229')).toBe('premium');
    });
  });

  describe('isComplexRole', () => {
    it('should return true for Engineering', () => {
      expect(isComplexRole('engineering')).toBe(true);
    });

    it('should return true for Research', () => {
      expect(isComplexRole('research')).toBe(true);
    });

    it('should return true for Frontier', () => {
      expect(isComplexRole('frontier')).toBe(true);
    });

    it('should return true for Design', () => {
      expect(isComplexRole('design')).toBe(true);
    });

    it('should return false for Scrum', () => {
      expect(isComplexRole('scrum')).toBe(false);
    });

    it('should return false for Evangelist', () => {
      expect(isComplexRole('evangelist')).toBe(false);
    });

    it('should return false for Ops', () => {
      expect(isComplexRole('ops')).toBe(false);
    });
  });

  describe('getModelDistribution', () => {
    it('should sum to approximately 1', () => {
      const dist = getModelDistribution();
      const total = Object.values(dist).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 1);
    });

    it('should have significant Haiku usage', () => {
      const dist = getModelDistribution();
      // Scrum + Evangelist = ~19% base, plus some Ops merge/triage
      expect(dist['claude-3-5-haiku-20241022']).toBeGreaterThan(0.15);
    });

    it('should have majority Sonnet usage', () => {
      const dist = getModelDistribution();
      expect(dist['claude-3-5-sonnet-20241022']).toBeGreaterThan(0.5);
    });

    it('should have minimal Opus usage', () => {
      const dist = getModelDistribution();
      // Only CEO strategic actions, which are rare
      expect(dist['claude-3-opus-20240229']).toBeLessThan(0.1);
    });
  });

  describe('calculateProjectedCycleCost', () => {
    it('should be less than all-Sonnet baseline', () => {
      const projected = calculateProjectedCycleCost();
      const allSonnet = calculateCycleCost('claude-3-5-sonnet-20241022');

      expect(projected).toBeLessThan(allSonnet);
    });

    it('should be more than all-Haiku baseline', () => {
      const projected = calculateProjectedCycleCost();
      const allHaiku = calculateCycleCost('claude-3-5-haiku-20241022');

      expect(projected).toBeGreaterThan(allHaiku);
    });
  });

  describe('ModelRouter class', () => {
    let router: ModelRouter;

    beforeEach(() => {
      router = new ModelRouter();
    });

    it('should select model for cycle', () => {
      const result = router.selectForCycle('scrum');
      expect(result.model).toBe('claude-3-5-haiku-20241022');
    });

    it('should handle failure with fallback', () => {
      const fallback = router.handleFailure(1, 'claude-3-5-haiku-20241022', 'validation_failure');
      expect(fallback).toBeDefined();
      if (fallback) {
        expect(fallback.model).toBe('claude-3-5-sonnet-20241022');
      }
    });

    it('should respect max retries', () => {
      // First failure
      const fallback1 = router.handleFailure(1, 'claude-3-5-haiku-20241022', 'validation_failure');
      expect(fallback1).not.toBeNull();

      // Second failure on same cycle - should return null (max retries = 1)
      const fallback2 = router.handleFailure(1, 'claude-3-5-sonnet-20241022', 'validation_failure');
      expect(fallback2).toBeNull();
    });

    it('should return config', () => {
      const config = router.getConfig();
      expect(config.default).toBe('claude-3-5-sonnet-20241022');
    });

    it('should return projected stats', () => {
      const stats = router.getProjectedStats();
      expect(stats.avgCostPerCycle).toBeGreaterThan(0);
      expect(stats.distribution).toBeDefined();
      expect(stats.savingsVsAllSonnet).toBeGreaterThan(0);
    });

    it('should disable fallback when configured', () => {
      const noFallbackRouter = new ModelRouter({
        ...DEFAULT_ROUTING_CONFIG,
        enableFallback: false,
      });

      const fallback = noFallbackRouter.handleFailure(
        1,
        'claude-3-5-haiku-20241022',
        'validation_failure'
      );
      expect(fallback).toBeNull();
    });
  });

  describe('MODEL_INFO', () => {
    it('should have correct Haiku info', () => {
      const haiku = MODEL_INFO['claude-3-5-haiku-20241022'];
      expect(haiku.tier).toBe('fast');
      expect(haiku.inputCostPerMillion).toBe(0.8);
      expect(haiku.contextWindow).toBe(200_000);
    });

    it('should have correct Sonnet info', () => {
      const sonnet = MODEL_INFO['claude-3-5-sonnet-20241022'];
      expect(sonnet.tier).toBe('balanced');
      expect(sonnet.inputCostPerMillion).toBe(3.0);
    });

    it('should have correct Opus info', () => {
      const opus = MODEL_INFO['claude-3-opus-20240229'];
      expect(opus.tier).toBe('premium');
      expect(opus.inputCostPerMillion).toBe(15.0);
    });
  });
});
