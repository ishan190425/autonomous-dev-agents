/**
 * @ada/core — Notification Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { sendCycleNotifications, sendTestNotification } from '../index.js';
import { writeAgentConfig } from '../config-loader.js';
import type { NotificationMessage } from '../types.js';

// Mock the individual notification senders
vi.mock('../slack.js', () => ({
  sendSlackNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../telegram.js', () => ({
  sendTelegramNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../discord.js', () => ({
  sendDiscordNotification: vi.fn().mockResolvedValue(undefined),
}));

describe('sendCycleNotifications', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ada-test-'));
    configPath = path.join(tempDir, 'config.json');
    vi.clearAllMocks();
  });

  const mockMessage: NotificationMessage = {
    subject: 'chore(agents): cycle 1 — engineering — Test',
    body: 'Test action',
    cycle: 1,
    role: {
      id: 'engineering',
      emoji: '⚙️',
      name: 'Engineering',
    },
    commitSha: 'abc123',
    outcome: 'success',
  };

  it('should return empty array if notifications disabled', async () => {
    writeAgentConfig(configPath, {
      notifications: {
        enabled: false,
      },
    });

    const results = await sendCycleNotifications(configPath, mockMessage);
    expect(results).toEqual([]);
  });

  it('should return empty array if config does not exist', async () => {
    const results = await sendCycleNotifications(configPath, mockMessage);
    expect(results).toEqual([]);
  });

  it('should send to enabled channels only', async () => {
    writeAgentConfig(configPath, {
      notifications: {
        enabled: true,
        channels: {
          slack: {
            enabled: true,
            webhookUrl: 'https://hooks.slack.com/test',
          },
          telegram: {
            enabled: false,
            botToken: 'token',
            chatId: '123',
          },
          discord: {
            enabled: true,
            webhookUrl: 'https://discord.com/api/webhooks/test',
          },
        },
      },
    });

    const { sendSlackNotification } = await import('../slack.js');
    const { sendDiscordNotification } = await import('../discord.js');

    const results = await sendCycleNotifications(configPath, mockMessage);

    expect(results).toHaveLength(2);
    expect(results.find(r => r.channel === 'slack')?.success).toBe(true);
    expect(results.find(r => r.channel === 'discord')?.success).toBe(true);
    expect(sendSlackNotification).toHaveBeenCalledTimes(1);
    expect(sendDiscordNotification).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully', async () => {
    writeAgentConfig(configPath, {
      notifications: {
        enabled: true,
        channels: {
          slack: {
            enabled: true,
            webhookUrl: 'https://hooks.slack.com/test',
          },
        },
      },
    });

    const { sendSlackNotification } = await import('../slack.js');
    vi.mocked(sendSlackNotification).mockRejectedValueOnce(new Error('Network error'));

    const results = await sendCycleNotifications(configPath, mockMessage);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('Network error');
  });
});

describe('sendTestNotification', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ada-test-'));
    configPath = path.join(tempDir, 'config.json');
    vi.clearAllMocks();
  });

  it('should return error if notifications disabled', async () => {
    writeAgentConfig(configPath, {
      notifications: {
        enabled: false,
      },
    });

    const result = await sendTestNotification(configPath, 'slack');
    expect(result.success).toBe(false);
    expect(result.error).toContain('disabled');
  });

  it('should return error if channel not enabled', async () => {
    writeAgentConfig(configPath, {
      notifications: {
        enabled: true,
        channels: {
          slack: {
            enabled: false,
            webhookUrl: 'https://hooks.slack.com/test',
          },
        },
      },
    });

    const result = await sendTestNotification(configPath, 'slack');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not enabled');
  });

  it('should send test notification successfully', async () => {
    writeAgentConfig(configPath, {
      notifications: {
        enabled: true,
        channels: {
          slack: {
            enabled: true,
            webhookUrl: 'https://hooks.slack.com/test',
          },
        },
      },
    });

    const result = await sendTestNotification(configPath, 'slack');
    expect(result.success).toBe(true);

    const { sendSlackNotification } = await import('../slack.js');
    expect(sendSlackNotification).toHaveBeenCalledTimes(1);
  });

  it('should handle errors', async () => {
    writeAgentConfig(configPath, {
      notifications: {
        enabled: true,
        channels: {
          slack: {
            enabled: true,
            webhookUrl: 'https://hooks.slack.com/test',
          },
        },
      },
    });

    const { sendSlackNotification } = await import('../slack.js');
    vi.mocked(sendSlackNotification).mockRejectedValueOnce(new Error('Test error'));

    const result = await sendTestNotification(configPath, 'slack');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Test error');
  });
});
