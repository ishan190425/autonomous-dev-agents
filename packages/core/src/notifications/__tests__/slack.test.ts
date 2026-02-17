/**
 * @ada/core — Slack Notification Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendSlackNotification } from '../slack.js';
import type { NotificationMessage, SlackConfig } from '../types.js';

// Mock fetch
global.fetch = vi.fn();

describe('sendSlackNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMessage: NotificationMessage = {
    subject: 'chore(agents): cycle 1 — engineering — Test action',
    body: 'This is a test action description',
    cycle: 1,
    role: {
      id: 'engineering',
      emoji: '⚙️',
      name: 'Engineering',
    },
    commitSha: 'abc123',
    outcome: 'success',
  };

  it('should send notification when enabled with valid webhook', async () => {
    const config: SlackConfig = {
      enabled: true,
      webhookUrl: 'https://hooks.slack.com/services/TEST/WEBHOOK/URL',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    await sendSlackNotification(config, mockMessage);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe(config.webhookUrl);
    expect(call[1]?.method).toBe('POST');
    expect(call[1]?.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(call[1]?.body as string);
    expect(body.blocks).toBeDefined();
    expect(body.text).toContain('Cycle 1');
  });

  it('should not send when disabled', async () => {
    const config: SlackConfig = {
      enabled: false,
      webhookUrl: 'https://hooks.slack.com/services/TEST/WEBHOOK/URL',
    };

    await sendSlackNotification(config, mockMessage);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should not send when webhook URL is empty', async () => {
    const config: SlackConfig = {
      enabled: true,
      webhookUrl: '',
    };

    await sendSlackNotification(config, mockMessage);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should throw error for invalid webhook URL', async () => {
    const config: SlackConfig = {
      enabled: true,
      webhookUrl: 'https://invalid-url.com',
    };

    await expect(sendSlackNotification(config, mockMessage)).rejects.toThrow('Invalid Slack webhook URL');
  });

  it('should throw error when webhook request fails', async () => {
    const config: SlackConfig = {
      enabled: true,
      webhookUrl: 'https://hooks.slack.com/services/TEST/WEBHOOK/URL',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () => Promise.resolve('Invalid payload'),
    });

    await expect(sendSlackNotification(config, mockMessage)).rejects.toThrow('Slack webhook failed');
  });
});
