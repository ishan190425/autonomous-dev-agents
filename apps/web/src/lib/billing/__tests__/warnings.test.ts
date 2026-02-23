/**
 * Billing Warnings Tests
 *
 * @author ⚙️ Engineering (Cycle 1190)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  WARNING_THRESHOLDS,
  getCycleWarning,
  getResetWarning,
  isUsageCritical,
  shouldSuggestUpgrade,
  getDailyLimitWarning,
  getHourlyLimitWarning,
  formatWarningForCLI,
  getUsageProgressBar,
} from '../warnings';

describe('WARNING_THRESHOLDS', () => {
  it('should have correct threshold values', () => {
    expect(WARNING_THRESHOLDS.LOW_CYCLES).toBe(0.2);
    expect(WARNING_THRESHOLDS.CRITICAL_CYCLES).toBe(0.1);
    expect(WARNING_THRESHOLDS.APPROACHING_RESET).toBe(3);
    expect(WARNING_THRESHOLDS.UPGRADE_SUGGESTION).toBe(5);
  });
});

describe('getCycleWarning', () => {
  it('should return null when cycles are plentiful', () => {
    // 250 of 500 used = 50% remaining, well above 20% threshold
    expect(getCycleWarning('PRO', 250)).toBeNull();
  });

  it('should return null for Enterprise (unlimited)', () => {
    expect(getCycleWarning('ENTERPRISE', 10000)).toBeNull();
  });

  it('should return warning at 20% remaining', () => {
    // 400 of 500 used = 100 remaining = 20%
    const warning = getCycleWarning('PRO', 400);
    expect(warning).not.toBeNull();
    expect(warning?.level).toBe('warning');
    expect(warning?.remaining).toBe(100);
  });

  it('should return critical warning at 10% remaining', () => {
    // 450 of 500 used = 50 remaining = 10%
    const warning = getCycleWarning('PRO', 450);
    expect(warning).not.toBeNull();
    expect(warning?.level).toBe('critical');
    expect(warning?.message).toContain('Critical');
    expect(warning?.showUpgrade).toBe(true);
  });

  it('should return critical warning when nearly exhausted', () => {
    // 495 of 500 used = 5 remaining = 1%
    const warning = getCycleWarning('PRO', 495);
    expect(warning).not.toBeNull();
    expect(warning?.level).toBe('critical');
    expect(warning?.remaining).toBe(5);
    expect(warning?.suggestion).toContain('Upgrade');
  });

  it('should handle FREE tier correctly', () => {
    // 45 of 50 used = 5 remaining = 10%
    const warning = getCycleWarning('FREE', 45);
    expect(warning).not.toBeNull();
    expect(warning?.level).toBe('critical');
    expect(warning?.remaining).toBe(5);
  });

  it('should handle TEAM tier correctly', () => {
    // 1800 of 2000 used = 200 remaining = 10%
    const warning = getCycleWarning('TEAM', 1800);
    expect(warning).not.toBeNull();
    expect(warning?.level).toBe('critical');
    expect(warning?.remaining).toBe(200);
  });
});

describe('getResetWarning', () => {
  beforeEach(() => {
    // Mock current date
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-23T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null when reset is far away', () => {
    const periodEnd = new Date('2026-03-15T00:00:00Z'); // 20 days away
    expect(getResetWarning(periodEnd)).toBeNull();
  });

  it('should return warning when reset is within 3 days', () => {
    const periodEnd = new Date('2026-02-25T00:00:00Z'); // 2 days away
    const warning = getResetWarning(periodEnd);
    expect(warning).not.toBeNull();
    expect(warning?.daysUntilReset).toBe(2);
    expect(warning?.message).toContain('2 days');
  });

  it('should show special message for tomorrow', () => {
    const periodEnd = new Date('2026-02-24T00:00:00Z'); // 1 day away
    const warning = getResetWarning(periodEnd);
    expect(warning?.daysUntilReset).toBe(1);
    expect(warning?.message).toContain('tomorrow');
  });

  it('should show special message for today', () => {
    const periodEnd = new Date('2026-02-23T18:00:00Z'); // Later today
    const warning = getResetWarning(periodEnd);
    expect(warning?.daysUntilReset).toBe(1);
  });
});

describe('isUsageCritical', () => {
  it('should return false when usage is normal', () => {
    expect(isUsageCritical('PRO', 250)).toBe(false);
  });

  it('should return true when usage is critical', () => {
    expect(isUsageCritical('PRO', 480)).toBe(true); // 4% remaining
  });

  it('should return false for Enterprise', () => {
    expect(isUsageCritical('ENTERPRISE', 10000)).toBe(false);
  });
});

describe('shouldSuggestUpgrade', () => {
  it('should not suggest for normal usage', () => {
    expect(shouldSuggestUpgrade('PRO', 250)).toBe(false);
  });

  it('should suggest when cycles are low', () => {
    expect(shouldSuggestUpgrade('PRO', 495)).toBe(true);
  });

  it('should never suggest for Enterprise', () => {
    expect(shouldSuggestUpgrade('ENTERPRISE', 10000)).toBe(false);
  });
});

describe('getDailyLimitWarning', () => {
  it('should return null when under limit', () => {
    expect(getDailyLimitWarning('FREE', 5)).toBeNull();
  });

  it('should return warning near limit', () => {
    // 9 of 10 used = 1 remaining = 10%
    const warning = getDailyLimitWarning('FREE', 9);
    expect(warning).not.toBeNull();
    expect(warning).toContain('1 cycle');
    expect(warning).toContain('remaining today');
  });

  it('should return blocked message at limit', () => {
    const warning = getDailyLimitWarning('FREE', 10);
    expect(warning).not.toBeNull();
    expect(warning).toContain('Daily limit reached');
  });

  it('should return null for Enterprise', () => {
    expect(getDailyLimitWarning('ENTERPRISE', 1000)).toBeNull();
  });
});

describe('getHourlyLimitWarning', () => {
  it('should return null when under limit', () => {
    expect(getHourlyLimitWarning('FREE', 1)).toBeNull();
  });

  it('should return warning near limit', () => {
    const warning = getHourlyLimitWarning('FREE', 2);
    expect(warning).not.toBeNull();
    expect(warning).toContain('1 cycle remaining this hour');
  });

  it('should return blocked message at limit', () => {
    const warning = getHourlyLimitWarning('FREE', 3);
    expect(warning).not.toBeNull();
    expect(warning).toContain('Hourly limit reached');
  });
});

describe('formatWarningForCLI', () => {
  it('should format warning with all fields', () => {
    const formatted = formatWarningForCLI({
      level: 'critical',
      message: '⚠️ Critical: Only 5 cycles remaining',
      remaining: 5,
      percentage: 0.01,
      suggestion: 'Upgrade now',
      showUpgrade: true,
    });

    expect(formatted).toContain('⚠️ Critical');
    expect(formatted).toContain('Upgrade now');
    expect(formatted).toContain('ada billing upgrade');
  });

  it('should format warning without upgrade', () => {
    const formatted = formatWarningForCLI({
      level: 'warning',
      message: '⚡ 100 cycles remaining (20%)',
      remaining: 100,
      percentage: 0.2,
      suggestion: null,
      showUpgrade: false,
    });

    expect(formatted).toContain('⚡ 100 cycles');
    expect(formatted).not.toContain('ada billing');
  });
});

describe('getUsageProgressBar', () => {
  it('should show empty bar at 0%', () => {
    const bar = getUsageProgressBar(0, 100);
    expect(bar).toContain('░'.repeat(20));
    expect(bar).toContain('0%');
  });

  it('should show half-filled bar at 50%', () => {
    const bar = getUsageProgressBar(50, 100);
    expect(bar).toContain('█'.repeat(10));
    expect(bar).toContain('░'.repeat(10));
    expect(bar).toContain('50%');
  });

  it('should show full bar at 100%', () => {
    const bar = getUsageProgressBar(100, 100);
    expect(bar).toContain('100%');
  });

  it('should cap at 100% for overuse', () => {
    const bar = getUsageProgressBar(150, 100);
    expect(bar).toContain('100%');
  });

  it('should show unlimited for -1 limit', () => {
    const bar = getUsageProgressBar(100, -1);
    expect(bar).toContain('unlimited');
  });

  it('should show unlimited for Infinity limit', () => {
    const bar = getUsageProgressBar(100, Infinity);
    expect(bar).toContain('unlimited');
  });

  it('should respect custom width', () => {
    const bar = getUsageProgressBar(50, 100, 10);
    expect(bar).toMatch(/\[.{10}\]/);
  });
});
