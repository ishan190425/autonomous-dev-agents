/**
 * Tier Configuration Tests
 *
 * @author ⚙️ Engineering (Cycle 1190)
 */

import { describe, it, expect } from 'vitest';
import {
  TIER_CONFIG,
  getTierConfig,
  getTierDisplayName,
  getCycleLimit,
  getDailyCycleLimit,
  getHourlyCycleLimit,
  hasFeature,
  hasUnlimitedCycles,
  getFormattedPrice,
  canUseCycles,
  checkDailyLimit,
  checkHourlyLimit,
  isPlanHigherThan,
  isPlanAtLeast,
  getNextUpgrade,
  getUpgradeOptions,
} from '../tiers';
import type { Plan } from '../../auth/types';

describe('TIER_CONFIG', () => {
  it('should have all four tiers defined', () => {
    expect(TIER_CONFIG.FREE).toBeDefined();
    expect(TIER_CONFIG.PRO).toBeDefined();
    expect(TIER_CONFIG.TEAM).toBeDefined();
    expect(TIER_CONFIG.ENTERPRISE).toBeDefined();
  });

  it('should have correct pricing for each tier', () => {
    expect(TIER_CONFIG.FREE.monthlyPriceCents).toBe(0);
    expect(TIER_CONFIG.PRO.monthlyPriceCents).toBe(1900);
    expect(TIER_CONFIG.TEAM.monthlyPriceCents).toBe(4900);
    expect(TIER_CONFIG.ENTERPRISE.monthlyPriceCents).toBe(-1);
  });

  it('should have correct cycle limits for each tier', () => {
    expect(TIER_CONFIG.FREE.cyclesPerMonth).toBe(50);
    expect(TIER_CONFIG.PRO.cyclesPerMonth).toBe(500);
    expect(TIER_CONFIG.TEAM.cyclesPerMonth).toBe(2000);
    expect(TIER_CONFIG.ENTERPRISE.cyclesPerMonth).toBe(-1);
  });

  it('should have progressive rate limits', () => {
    expect(TIER_CONFIG.FREE.cyclesPerHour).toBe(3);
    expect(TIER_CONFIG.PRO.cyclesPerHour).toBe(10);
    expect(TIER_CONFIG.TEAM.cyclesPerHour).toBe(30);
    expect(TIER_CONFIG.ENTERPRISE.cyclesPerHour).toBe(-1);
  });
});

describe('getTierConfig', () => {
  it('should return config for each plan', () => {
    const plans: Plan[] = ['FREE', 'PRO', 'TEAM', 'ENTERPRISE'];
    for (const plan of plans) {
      const config = getTierConfig(plan);
      expect(config.name).toBe(plan);
    }
  });
});

describe('getTierDisplayName', () => {
  it('should return human-readable names', () => {
    expect(getTierDisplayName('FREE')).toBe('Free');
    expect(getTierDisplayName('PRO')).toBe('Pro');
    expect(getTierDisplayName('TEAM')).toBe('Team');
    expect(getTierDisplayName('ENTERPRISE')).toBe('Enterprise');
  });
});

describe('getCycleLimit', () => {
  it('should return correct limits for limited tiers', () => {
    expect(getCycleLimit('FREE')).toBe(50);
    expect(getCycleLimit('PRO')).toBe(500);
    expect(getCycleLimit('TEAM')).toBe(2000);
  });

  it('should return Infinity for unlimited tier', () => {
    expect(getCycleLimit('ENTERPRISE')).toBe(Infinity);
  });
});

describe('getDailyCycleLimit', () => {
  it('should return correct daily limits', () => {
    expect(getDailyCycleLimit('FREE')).toBe(10);
    expect(getDailyCycleLimit('PRO')).toBe(50);
    expect(getDailyCycleLimit('TEAM')).toBe(200);
    expect(getDailyCycleLimit('ENTERPRISE')).toBe(Infinity);
  });
});

describe('getHourlyCycleLimit', () => {
  it('should return correct hourly limits', () => {
    expect(getHourlyCycleLimit('FREE')).toBe(3);
    expect(getHourlyCycleLimit('PRO')).toBe(10);
    expect(getHourlyCycleLimit('TEAM')).toBe(30);
    expect(getHourlyCycleLimit('ENTERPRISE')).toBe(Infinity);
  });
});

describe('hasFeature', () => {
  it('should correctly report FREE tier features', () => {
    expect(hasFeature('FREE', 'dashboard')).toBe(false);
    expect(hasFeature('FREE', 'api')).toBe(false);
    expect(hasFeature('FREE', 'customPlaybooks')).toBe(false);
  });

  it('should correctly report PRO tier features', () => {
    expect(hasFeature('PRO', 'dashboard')).toBe(true);
    expect(hasFeature('PRO', 'api')).toBe(true);
    expect(hasFeature('PRO', 'customPlaybooks')).toBe(true);
    expect(hasFeature('PRO', 'teamWorkspaces')).toBe(false);
    expect(hasFeature('PRO', 'sso')).toBe(false);
  });

  it('should correctly report TEAM tier features', () => {
    expect(hasFeature('TEAM', 'dashboard')).toBe(true);
    expect(hasFeature('TEAM', 'teamWorkspaces')).toBe(true);
    expect(hasFeature('TEAM', 'priorityRouting')).toBe(true);
    expect(hasFeature('TEAM', 'sso')).toBe(false);
  });

  it('should correctly report ENTERPRISE tier features', () => {
    expect(hasFeature('ENTERPRISE', 'sso')).toBe(true);
    expect(hasFeature('ENTERPRISE', 'auditLogs')).toBe(true);
    expect(hasFeature('ENTERPRISE', 'dedicatedSupport')).toBe(true);
    expect(hasFeature('ENTERPRISE', 'onPrem')).toBe(true);
  });
});

describe('hasUnlimitedCycles', () => {
  it('should return false for limited tiers', () => {
    expect(hasUnlimitedCycles('FREE')).toBe(false);
    expect(hasUnlimitedCycles('PRO')).toBe(false);
    expect(hasUnlimitedCycles('TEAM')).toBe(false);
  });

  it('should return true for Enterprise', () => {
    expect(hasUnlimitedCycles('ENTERPRISE')).toBe(true);
  });
});

describe('getFormattedPrice', () => {
  it('should format monthly prices correctly', () => {
    expect(getFormattedPrice('FREE')).toBe('Free');
    expect(getFormattedPrice('PRO')).toBe('$19/mo');
    expect(getFormattedPrice('TEAM')).toBe('$49/mo');
    expect(getFormattedPrice('ENTERPRISE')).toBe('Custom');
  });

  it('should format annual prices correctly', () => {
    expect(getFormattedPrice('FREE', true)).toBe('Free');
    expect(getFormattedPrice('PRO', true)).toBe('$190/year');
    expect(getFormattedPrice('TEAM', true)).toBe('$490/year');
    expect(getFormattedPrice('ENTERPRISE', true)).toBe('Custom');
  });
});

describe('canUseCycles', () => {
  it('should allow cycles when under limit', () => {
    const result = canUseCycles('PRO', 100);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(399);
    expect(result.reason).toBeUndefined();
  });

  it('should deny cycles when at limit', () => {
    const result = canUseCycles('PRO', 500);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toContain('Cycle limit reached');
  });

  it('should deny cycles when over limit', () => {
    const result = canUseCycles('FREE', 55);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should account for requested cycles', () => {
    const result = canUseCycles('FREE', 48, 5);
    expect(result.allowed).toBe(false); // Only 2 remaining, want 5
    expect(result.remaining).toBe(2);
  });

  it('should always allow Enterprise', () => {
    const result = canUseCycles('ENTERPRISE', 10000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(Infinity);
  });
});

describe('checkDailyLimit', () => {
  it('should allow when under daily limit', () => {
    const result = checkDailyLimit('FREE', 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it('should deny when at daily limit', () => {
    const result = checkDailyLimit('FREE', 10);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toContain('Daily limit reached');
  });

  it('should always allow Enterprise', () => {
    const result = checkDailyLimit('ENTERPRISE', 1000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(Infinity);
  });
});

describe('checkHourlyLimit', () => {
  it('should allow when under hourly limit', () => {
    const result = checkHourlyLimit('FREE', 2);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('should deny when at hourly limit', () => {
    const result = checkHourlyLimit('FREE', 3);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toContain('Hourly limit reached');
  });
});

describe('isPlanHigherThan', () => {
  it('should correctly compare plan levels', () => {
    expect(isPlanHigherThan('PRO', 'FREE')).toBe(true);
    expect(isPlanHigherThan('TEAM', 'PRO')).toBe(true);
    expect(isPlanHigherThan('ENTERPRISE', 'TEAM')).toBe(true);
    expect(isPlanHigherThan('FREE', 'PRO')).toBe(false);
    expect(isPlanHigherThan('PRO', 'PRO')).toBe(false);
  });
});

describe('isPlanAtLeast', () => {
  it('should correctly check minimum plan level', () => {
    expect(isPlanAtLeast('PRO', 'FREE')).toBe(true);
    expect(isPlanAtLeast('PRO', 'PRO')).toBe(true);
    expect(isPlanAtLeast('PRO', 'TEAM')).toBe(false);
    expect(isPlanAtLeast('ENTERPRISE', 'FREE')).toBe(true);
    expect(isPlanAtLeast('FREE', 'ENTERPRISE')).toBe(false);
  });
});

describe('getNextUpgrade', () => {
  it('should return next tier for upgradeable plans', () => {
    expect(getNextUpgrade('FREE')).toBe('PRO');
    expect(getNextUpgrade('PRO')).toBe('TEAM');
    expect(getNextUpgrade('TEAM')).toBe('ENTERPRISE');
  });

  it('should return null for Enterprise', () => {
    expect(getNextUpgrade('ENTERPRISE')).toBeNull();
  });
});

describe('getUpgradeOptions', () => {
  it('should return all higher tiers', () => {
    expect(getUpgradeOptions('FREE')).toEqual(['PRO', 'TEAM', 'ENTERPRISE']);
    expect(getUpgradeOptions('PRO')).toEqual(['TEAM', 'ENTERPRISE']);
    expect(getUpgradeOptions('TEAM')).toEqual(['ENTERPRISE']);
  });

  it('should return empty array for Enterprise', () => {
    expect(getUpgradeOptions('ENTERPRISE')).toEqual([]);
  });
});
