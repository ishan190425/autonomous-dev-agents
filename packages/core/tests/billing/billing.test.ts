/**
 * @ada-ai/core - Billing Module Tests
 *
 * Unit tests for billing infrastructure: types, constants, and Stripe client.
 */

import { describe, it, expect } from 'vitest';
import {
  TIER_CONFIG,
  DEFAULT_TIER,
  calculateCycleCost,
  getUsageWarning,
  tierAllows,
  getUpgradeRecommendation,
  createMockStripeClient,
  BillingError,
  BillingErrorCode,
  type Tier,
} from '../../src/billing/index.js';

describe('Billing Constants', () => {
  describe('TIER_CONFIG', () => {
    it('should have all tier configurations', () => {
      const tiers: Tier[] = ['free', 'pro', 'team', 'enterprise'];
      for (const tier of tiers) {
        expect(TIER_CONFIG[tier]).toBeDefined();
        expect(TIER_CONFIG[tier].name).toBeTruthy();
      }
    });

    it('should have proper limits for free tier', () => {
      expect(TIER_CONFIG.free.cyclesPerMonth).toBe(50);
      expect(TIER_CONFIG.free.maxConcurrent).toBe(1);
      expect(TIER_CONFIG.free.priceMonthly).toBe(0);
      expect(TIER_CONFIG.free.maxTeamMembers).toBe(0);
    });

    it('should have unlimited (-1) for enterprise tier', () => {
      expect(TIER_CONFIG.enterprise.cyclesPerMonth).toBe(-1);
      expect(TIER_CONFIG.enterprise.maxConcurrent).toBe(-1);
      expect(TIER_CONFIG.enterprise.maxRepos).toBe(-1);
    });

    it('should have higher limits for paid tiers', () => {
      expect(TIER_CONFIG.pro.cyclesPerMonth).toBeGreaterThan(TIER_CONFIG.free.cyclesPerMonth);
      expect(TIER_CONFIG.team.cyclesPerMonth).toBeGreaterThan(TIER_CONFIG.pro.cyclesPerMonth);
    });
  });

  describe('DEFAULT_TIER', () => {
    it('should be free', () => {
      expect(DEFAULT_TIER).toBe('free');
    });
  });
});

describe('Billing Utilities', () => {
  describe('calculateCycleCost', () => {
    it('should calculate cost based on tokens', () => {
      // 1000 input + 500 output
      const cost = calculateCycleCost(1000, 500);
      expect(cost).toBeGreaterThan(0);
    });

    it('should return 0 for 0 tokens', () => {
      expect(calculateCycleCost(0, 0)).toBe(0);
    });

    it('should weight output tokens higher than input', () => {
      // Output tokens are 5x more expensive for Claude
      const inputOnlyCost = calculateCycleCost(1000, 0);
      const outputOnlyCost = calculateCycleCost(0, 1000);
      expect(outputOnlyCost).toBeGreaterThan(inputOnlyCost);
    });
  });

  describe('getUsageWarning', () => {
    it('should return null for unlimited tiers', () => {
      expect(getUsageWarning(1000, -1)).toBeNull();
    });

    it('should return null for low usage', () => {
      expect(getUsageWarning(10, 100)).toBeNull();
    });

    it('should return notice at 75%', () => {
      const warning = getUsageWarning(75, 100);
      expect(warning).toContain('Notice');
      expect(warning).toContain('75%');
    });

    it('should return warning at 90%', () => {
      const warning = getUsageWarning(90, 100);
      expect(warning).toContain('Warning');
      expect(warning).toContain('90%');
    });

    it('should return critical at 95%+', () => {
      const warning = getUsageWarning(96, 100);
      expect(warning).toContain('Critical');
    });
  });

  describe('tierAllows', () => {
    it('should return true for allowed boolean features', () => {
      expect(tierAllows('pro', 'customRoles')).toBe(true);
      expect(tierAllows('team', 'prioritySupport')).toBe(true);
    });

    it('should return false for disallowed boolean features', () => {
      expect(tierAllows('free', 'prioritySupport')).toBe(false);
      expect(tierAllows('free', 'customRoles')).toBe(false);
    });

    it('should return true for non-zero numeric features', () => {
      expect(tierAllows('free', 'cyclesPerMonth')).toBe(true);
      expect(tierAllows('team', 'maxTeamMembers')).toBe(true);
    });

    it('should return false for zero numeric features', () => {
      expect(tierAllows('free', 'maxTeamMembers')).toBe(false);
      expect(tierAllows('pro', 'maxTeamMembers')).toBe(false);
    });
  });

  describe('getUpgradeRecommendation', () => {
    it('should return null for enterprise tier', () => {
      expect(getUpgradeRecommendation('enterprise', 100, 20)).toBeNull();
    });

    it('should return null if too early in period', () => {
      // Only 5 days elapsed (daysRemaining = 25)
      expect(getUpgradeRecommendation('free', 10, 25)).toBeNull();
    });

    it('should recommend upgrade if projected to exceed', () => {
      // 45 cycles used in 15 days = 3/day = 90 projected, but free is 50
      const result = getUpgradeRecommendation('free', 45, 15);
      expect(result).not.toBeNull();
      expect(result?.shouldUpgrade).toBe(true);
      expect(result?.recommendedTier).toBe('pro');
    });

    it('should not recommend if under limit', () => {
      // 15 cycles in 15 days = 1/day = 30 projected, free is 50
      const result = getUpgradeRecommendation('free', 15, 15);
      expect(result).toBeNull();
    });
  });
});

describe('BillingError', () => {
  it('should create error with code', () => {
    const error = new BillingError('Test error', BillingErrorCode.LIMIT_EXCEEDED);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(BillingErrorCode.LIMIT_EXCEEDED);
    expect(error.name).toBe('BillingError');
  });

  it('should include retryAfter when provided', () => {
    const error = new BillingError(
      'Rate limited',
      BillingErrorCode.RATE_LIMITED,
      60
    );
    expect(error.retryAfter).toBe(60);
  });
});

describe('Mock Stripe Client', () => {
  const client = createMockStripeClient();

  it('should be in test mode', () => {
    expect(client.isTestMode()).toBe(true);
  });

  it('should create checkout session', async () => {
    const session = await client.createCheckoutSession({
      userId: 'user_123',
      tier: 'pro',
      period: 'monthly',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    });

    expect(session.id).toMatch(/^cs_test_/);
    expect(session.url).toContain('stripe.com');
    expect(session.expiresAt).toBeInstanceOf(Date);
  });

  it('should create portal session', async () => {
    const session = await client.createPortalSession({
      customerId: 'cus_123',
      returnUrl: 'https://example.com/return',
    });

    expect(session.id).toMatch(/^bps_test_/);
    expect(session.url).toContain('stripe.com');
  });

  it('should get subscription', async () => {
    const subscription = await client.getSubscription('sub_123');

    expect(subscription.id).toBe('sub_123');
    expect(subscription.status).toBe('active');
    expect(subscription.currentPeriodEnd).toBeInstanceOf(Date);
  });

  it('should handle updateSubscription without error', async () => {
    await expect(
      client.updateSubscription({ subscriptionId: 'sub_123', cancelAtPeriodEnd: true })
    ).resolves.not.toThrow();
  });

  it('should handle cancelSubscription without error', async () => {
    await expect(client.cancelSubscription('sub_123')).resolves.not.toThrow();
  });

  it('should verify webhook from JSON', async () => {
    const payload = JSON.stringify({
      event: 'checkout.session.completed',
      customerId: 'cus_123',
    });

    const result = await client.verifyWebhook(payload, 'sig_test');
    expect(result.event).toBe('checkout.session.completed');
    expect(result.customerId).toBe('cus_123');
  });
});
