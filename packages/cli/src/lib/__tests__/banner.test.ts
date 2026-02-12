/**
 * Tests for CLI Banner functionality
 *
 * Per design spec docs/design/cli-banner-art-spec-c435.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock user-config before importing banner
vi.mock('../user-config.js', () => ({
  getUserConfig: vi.fn(() => ({})),
  updateUserConfig: vi.fn(),
  resetUserConfig: vi.fn(),
}));

import { showBanner, isCI, isNoColor, getVersionString } from '../banner.js';
import { getUserConfig, updateUserConfig } from '../user-config.js';

describe('banner', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalArgv: string[];
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalArgv = [...process.argv];
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(getUserConfig).mockReturnValue({});
    vi.mocked(updateUserConfig).mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
    consoleLogSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('isCI', () => {
    it('returns false when no CI env vars are set', () => {
      delete process.env.CI;
      delete process.env.CONTINUOUS_INTEGRATION;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      delete process.env.CIRCLECI;
      delete process.env.JENKINS_URL;
      
      // Mock stdout.isTTY
      const originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
      
      expect(isCI()).toBe(false);
      
      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
    });

    it('returns true when CI env var is set', () => {
      process.env.CI = 'true';
      expect(isCI()).toBe(true);
    });

    it('returns true when GITHUB_ACTIONS is set', () => {
      process.env.GITHUB_ACTIONS = 'true';
      expect(isCI()).toBe(true);
    });

    it('returns true when GITLAB_CI is set', () => {
      process.env.GITLAB_CI = 'true';
      expect(isCI()).toBe(true);
    });

    it('returns true when not a TTY', () => {
      delete process.env.CI;
      const originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
      
      expect(isCI()).toBe(true);
      
      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
    });
  });

  describe('isNoColor', () => {
    it('returns false when NO_COLOR is not set', () => {
      delete process.env.NO_COLOR;
      process.argv = ['node', 'ada'];
      expect(isNoColor()).toBe(false);
    });

    it('returns true when NO_COLOR env var is set', () => {
      process.env.NO_COLOR = '1';
      expect(isNoColor()).toBe(true);
    });

    it('returns true when --no-color flag is passed', () => {
      delete process.env.NO_COLOR;
      process.argv = ['node', 'ada', '--no-color'];
      expect(isNoColor()).toBe(true);
    });
  });

  describe('showBanner', () => {
    beforeEach(() => {
      // Ensure we're not in CI for these tests
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    });

    it('shows full banner on first run', () => {
      vi.mocked(getUserConfig).mockReturnValue({});
      
      const shown = showBanner();
      
      expect(shown).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('█████╗'); // ASCII art
      expect(output).toContain('Autonomous Dev Agents');
    });

    it('marks banner as seen after first display', () => {
      vi.mocked(getUserConfig).mockReturnValue({});
      
      showBanner();
      
      expect(updateUserConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          banner: expect.objectContaining({
            seenFullBanner: true,
          }),
        })
      );
    });

    it('skips banner if already seen (unless forced)', () => {
      vi.mocked(getUserConfig).mockReturnValue({
        banner: { seenFullBanner: true },
      });
      
      const shown = showBanner();
      
      expect(shown).toBe(false);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('shows banner when force=true even if seen', () => {
      vi.mocked(getUserConfig).mockReturnValue({
        banner: { seenFullBanner: true },
      });
      
      const shown = showBanner({ force: true });
      
      expect(shown).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('shows compact banner when compact=true', () => {
      vi.mocked(getUserConfig).mockReturnValue({});
      
      const shown = showBanner({ compact: true });
      
      expect(shown).toBe(true);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('🤖 ADA');
      expect(output).not.toContain('█████╗'); // No ASCII art in compact
    });

    it('does not mark as seen for compact banner', () => {
      vi.mocked(getUserConfig).mockReturnValue({});
      
      showBanner({ compact: true });
      
      expect(updateUserConfig).not.toHaveBeenCalled();
    });

    it('skips banner in CI environment', () => {
      process.env.CI = 'true';
      vi.mocked(getUserConfig).mockReturnValue({});
      
      const shown = showBanner();
      
      expect(shown).toBe(false);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('shows banner in CI when force=true', () => {
      process.env.CI = 'true';
      vi.mocked(getUserConfig).mockReturnValue({});
      
      const shown = showBanner({ force: true });
      
      expect(shown).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('shows ASCII-only banner when noColor=true', () => {
      vi.mocked(getUserConfig).mockReturnValue({});
      
      showBanner({ noColor: true });
      
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('+--');
      expect(output).toContain('A D A');
    });

    it('shows role panel when showRolePanel=true', () => {
      vi.mocked(getUserConfig).mockReturnValue({});
      
      showBanner({ showRolePanel: true });
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      const rolePanel = consoleLogSpy.mock.calls[1][0];
      expect(rolePanel).toContain('Your Team');
      expect(rolePanel).toContain('👔 CEO');
      expect(rolePanel).toContain('⚙️  Engineering');
    });
  });

  describe('getVersionString', () => {
    it('returns formatted version string', () => {
      delete process.env.NO_COLOR;
      process.argv = ['node', 'ada'];
      
      const version = getVersionString();
      
      expect(version).toContain('ADA');
      expect(version).toContain('1.0.0-alpha');
    });
  });
});
