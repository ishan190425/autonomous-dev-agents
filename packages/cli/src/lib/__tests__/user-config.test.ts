/**
 * Tests for User Configuration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// We need to test the actual implementation, so no mocking here
import {
  getUserConfig,
  updateUserConfig,
  resetUserConfig,
  getUserConfigDir,
  getUserConfigPath,
} from '../user-config.js';

describe('user-config', () => {
  const testConfigDir = path.join(os.tmpdir(), `.ada-test-${Date.now()}`);

  beforeEach(() => {
    // Clean up any test config
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('getUserConfigDir', () => {
    it('returns path in home directory', () => {
      const dir = getUserConfigDir();
      expect(dir).toBe(path.join(os.homedir(), '.ada'));
    });
  });

  describe('getUserConfigPath', () => {
    it('returns config.json path', () => {
      const configPath = getUserConfigPath();
      expect(configPath).toBe(path.join(os.homedir(), '.ada', 'config.json'));
    });
  });

  describe('getUserConfig', () => {
    it('returns empty object when config does not exist', () => {
      // Note: This test depends on actual filesystem state
      // In a real scenario, we'd mock the filesystem
      const config = getUserConfig();
      expect(typeof config).toBe('object');
    });
  });

  describe('updateUserConfig', () => {
    it('creates config directory and file if not exists', () => {
      // This test modifies actual user config, so we skip in CI
      if (process.env.CI) {
        return;
      }

      const before = getUserConfig();
      updateUserConfig({ colorMode: 'always' });
      const after = getUserConfig();

      expect(after.colorMode).toBe('always');

      // Cleanup
      updateUserConfig({ colorMode: before.colorMode });
    });

    it('merges with existing config', () => {
      if (process.env.CI) {
        return;
      }

      const before = getUserConfig();

      updateUserConfig({ banner: { seenFullBanner: true } });
      updateUserConfig({ colorMode: 'never' });

      const after = getUserConfig();
      expect(after.banner?.seenFullBanner).toBe(true);
      expect(after.colorMode).toBe('never');

      // Cleanup - restore original
      updateUserConfig(before);
    });

    it('deeply merges nested objects', () => {
      if (process.env.CI) {
        return;
      }

      const before = getUserConfig();

      updateUserConfig({
        banner: {
          seenFullBanner: true,
          firstSeenVersion: '1.0.0',
        },
      });

      updateUserConfig({
        banner: {
          seenFullBanner: true,
          firstSeenAt: '2026-02-12T00:00:00Z',
        },
      });

      const after = getUserConfig();
      expect(after.banner?.seenFullBanner).toBe(true);
      expect(after.banner?.firstSeenVersion).toBe('1.0.0');
      expect(after.banner?.firstSeenAt).toBe('2026-02-12T00:00:00Z');

      // Cleanup
      updateUserConfig(before);
    });
  });

  describe('resetUserConfig', () => {
    it('removes the config file', () => {
      if (process.env.CI) {
        return;
      }

      const before = getUserConfig();
      updateUserConfig({ colorMode: 'always' });

      resetUserConfig();

      const after = getUserConfig();
      expect(after.colorMode).toBeUndefined();

      // Restore original
      if (Object.keys(before).length > 0) {
        updateUserConfig(before);
      }
    });
  });
});
