/**
 * Heat Display Tests
 *
 * @see docs/engineering/terminal-mode-technical-spec.md §6
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  HEAT_TIERS,
  getHeatTier,
  formatHeatDisplay,
  detectHeatDisplayMode,
  generateHeatBar,
  formatHeatWithBar,
} from '../../src/terminal/heat-display.js';

describe('heat-display', () => {
  describe('HEAT_TIERS', () => {
    it('has tiers in descending min order', () => {
      for (let i = 0; i < HEAT_TIERS.length - 1; i++) {
        expect(HEAT_TIERS[i].min).toBeGreaterThan(HEAT_TIERS[i + 1].min);
      }
    });

    it('covers score 0', () => {
      const lowestTier = HEAT_TIERS[HEAT_TIERS.length - 1];
      expect(lowestTier.min).toBe(0);
    });
  });

  describe('getHeatTier', () => {
    it('returns HOT tier for scores >= 80', () => {
      expect(getHeatTier(80).text).toBe('HOT');
      expect(getHeatTier(100).text).toBe('HOT');
      expect(getHeatTier(95).emoji).toBe('🔥');
    });

    it('returns WARM tier for scores 50-79', () => {
      expect(getHeatTier(50).text).toBe('WARM');
      expect(getHeatTier(79).text).toBe('WARM');
      expect(getHeatTier(65).emoji).toBe('🟡');
    });

    it('returns COOL tier for scores 20-49', () => {
      expect(getHeatTier(20).text).toBe('COOL');
      expect(getHeatTier(49).text).toBe('COOL');
      expect(getHeatTier(35).emoji).toBe('🟢');
    });

    it('returns COLD tier for scores 0-19', () => {
      expect(getHeatTier(0).text).toBe('COLD');
      expect(getHeatTier(19).text).toBe('COLD');
      expect(getHeatTier(5).emoji).toBe('❄️');
    });

    it('clamps negative scores to COLD', () => {
      expect(getHeatTier(-10).text).toBe('COLD');
    });

    it('clamps scores > 100 to HOT', () => {
      expect(getHeatTier(150).text).toBe('HOT');
    });
  });

  describe('formatHeatDisplay', () => {
    it('formats in emoji mode', () => {
      expect(formatHeatDisplay(85, 'emoji')).toBe('🔥 85');
      expect(formatHeatDisplay(55, 'emoji')).toBe('🟡 55');
      expect(formatHeatDisplay(25, 'emoji')).toBe('🟢 25');
      expect(formatHeatDisplay(5, 'emoji')).toBe('❄️ 5');
    });

    it('formats in text mode', () => {
      expect(formatHeatDisplay(85, 'text')).toBe('HOT (85)');
      expect(formatHeatDisplay(55, 'text')).toBe('WARM (55)');
      expect(formatHeatDisplay(25, 'text')).toBe('COOL (25)');
      expect(formatHeatDisplay(5, 'text')).toBe('COLD (5)');
    });

    it('formats in numeric mode', () => {
      expect(formatHeatDisplay(85, 'numeric')).toBe('85.0');
      expect(formatHeatDisplay(55.5, 'numeric')).toBe('55.5');
      expect(formatHeatDisplay(0, 'numeric')).toBe('0.0');
    });

    it('rounds scores in emoji/text modes', () => {
      expect(formatHeatDisplay(85.7, 'emoji')).toBe('🔥 86');
      expect(formatHeatDisplay(85.2, 'text')).toBe('HOT (85)');
    });
  });

  describe('detectHeatDisplayMode', () => {
    const originalCI = process.env.CI;

    afterEach(() => {
      process.env.CI = originalCI;
    });

    it('returns override when provided', () => {
      expect(detectHeatDisplayMode('text')).toBe('text');
      expect(detectHeatDisplayMode('numeric')).toBe('numeric');
      expect(detectHeatDisplayMode('emoji')).toBe('emoji');
    });

    it('returns text in CI environment', () => {
      process.env.CI = 'true';
      expect(detectHeatDisplayMode()).toBe('text');
    });
  });

  describe('generateHeatBar', () => {
    it('generates full bar for 100', () => {
      expect(generateHeatBar(100, 10)).toBe('██████████');
    });

    it('generates empty bar for 0', () => {
      expect(generateHeatBar(0, 10)).toBe('░░░░░░░░░░');
    });

    it('generates proportional bar for intermediate values', () => {
      expect(generateHeatBar(50, 10)).toBe('█████░░░░░');
      expect(generateHeatBar(75, 10)).toBe('████████░░');
      expect(generateHeatBar(25, 10)).toBe('███░░░░░░░');
    });

    it('uses default width of 10', () => {
      expect(generateHeatBar(50).length).toBe(10);
    });

    it('clamps scores to 0-100', () => {
      expect(generateHeatBar(-10, 10)).toBe('░░░░░░░░░░');
      expect(generateHeatBar(150, 10)).toBe('██████████');
    });
  });

  describe('formatHeatWithBar', () => {
    it('combines display and bar', () => {
      const result = formatHeatWithBar(85, 'emoji');
      expect(result).toContain('🔥 85');
      expect(result).toContain('█');
    });

    it('excludes bar when includeBar is false', () => {
      const result = formatHeatWithBar(85, 'emoji', false);
      expect(result).toBe('🔥 85');
      expect(result).not.toContain('░');
    });
  });
});
