/**
 * @ada/core — Notification Config Loader Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { loadAgentConfig, getNotificationConfig, writeAgentConfig, resolveEnvVars } from '../config-loader.js';
import type { AgentConfig } from '../types.js';

describe('config-loader', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ada-test-'));
    configPath = path.join(tempDir, 'config.json');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadAgentConfig', () => {
    it('should return null if config file does not exist', () => {
      const result = loadAgentConfig(configPath);
      expect(result).toBeNull();
    });

    it('should load valid config file', () => {
      const config: AgentConfig = {
        notifications: {
          enabled: true,
          channels: {
            slack: {
              enabled: true,
              webhookUrl: 'https://hooks.slack.com/test',
            },
          },
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = loadAgentConfig(configPath);
      expect(result).toEqual(config);
    });

    it('should return null for invalid JSON', () => {
      fs.writeFileSync(configPath, 'invalid json');

      const result = loadAgentConfig(configPath);
      expect(result).toBeNull();
    });
  });

  describe('getNotificationConfig', () => {
    it('should return null if config file does not exist', () => {
      const result = getNotificationConfig(configPath);
      expect(result).toBeNull();
    });

    it('should return null if notifications not configured', () => {
      const config: AgentConfig = {};
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = getNotificationConfig(configPath);
      expect(result).toBeNull();
    });

    it('should return notification config when enabled', () => {
      const config: AgentConfig = {
        notifications: {
          enabled: true,
          channels: {
            slack: {
              enabled: true,
              webhookUrl: 'https://hooks.slack.com/test',
            },
          },
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = getNotificationConfig(configPath);
      expect(result).toEqual(config.notifications);
    });

    it('should return default config if enabled but no channels', () => {
      const config: AgentConfig = {
        notifications: {
          enabled: true,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = getNotificationConfig(configPath);
      expect(result).toEqual({
        enabled: true,
        channels: {},
      });
    });
  });

  describe('writeAgentConfig', () => {
    it('should write config to file', () => {
      const config: AgentConfig = {
        notifications: {
          enabled: true,
          channels: {
            slack: {
              enabled: true,
              webhookUrl: 'https://hooks.slack.com/test',
            },
          },
        },
      };

      writeAgentConfig(configPath, config);

      expect(fs.existsSync(configPath)).toBe(true);
      const loaded = loadAgentConfig(configPath);
      expect(loaded).toEqual(config);
    });

    it('should create directory if it does not exist', () => {
      const nestedPath = path.join(tempDir, 'nested', 'config.json');
      const config: AgentConfig = {
        notifications: {
          enabled: true,
        },
      };

      writeAgentConfig(nestedPath, config);

      expect(fs.existsSync(nestedPath)).toBe(true);
    });

    it('should merge with existing config', () => {
      const existing: AgentConfig = {
        notifications: {
          enabled: true,
          channels: {
            slack: {
              enabled: true,
              webhookUrl: 'https://hooks.slack.com/existing',
            },
          },
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(existing, null, 2));

      const update: AgentConfig = {
        notifications: {
          enabled: true,
          channels: {
            telegram: {
              enabled: true,
              botToken: 'token',
              chatId: '123',
            },
          },
        },
      };

      writeAgentConfig(configPath, update);

      const loaded = loadAgentConfig(configPath);
      expect(loaded?.notifications?.channels?.slack).toEqual(existing.notifications?.channels?.slack);
      expect(loaded?.notifications?.channels?.telegram).toEqual(update.notifications?.channels?.telegram);
    });
  });

  describe('resolveEnvVars', () => {
    beforeEach(() => {
      process.env.TEST_VAR = 'test_value';
      process.env.ANOTHER_VAR = 'another_value';
    });

    afterEach(() => {
      delete process.env.TEST_VAR;
      delete process.env.ANOTHER_VAR;
    });

    it('should resolve environment variables', () => {
      const result = resolveEnvVars('${TEST_VAR}');
      expect(result).toBe('test_value');
    });

    it('should resolve multiple environment variables', () => {
      const result = resolveEnvVars('${TEST_VAR} and ${ANOTHER_VAR}');
      expect(result).toBe('test_value and another_value');
    });

    it('should return original if env var not found', () => {
      const result = resolveEnvVars('${NONEXISTENT_VAR}');
      expect(result).toBe('${NONEXISTENT_VAR}');
    });

    it('should return original if no env vars', () => {
      const result = resolveEnvVars('plain text');
      expect(result).toBe('plain text');
    });
  });
});
