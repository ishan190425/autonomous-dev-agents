/**
 * @ada/core — Discord Notification Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendDiscordNotification } from '../discord.js';
import type { NotificationMessage, DiscordConfig } from '../types.js';

// Mock fetch
global.fetch = vi.fn();

describe('sendDiscordNotification', () => {
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
    const config: DiscordConfig = {
      enabled: true,
      webhookUrl: 'https://discord.com/api/webhooks/123456789/abcdefghijklmnop',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    await sendDiscordNotification(config, mockMessage);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe(config.webhookUrl);
    expect(call[1]?.method).toBe('POST');
    expect(call[1]?.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(call[1]?.body as string);
    expect(body.embeds).toBeDefined();
    expect(body.embeds[0].title).toBe(mockMessage.subject);
    expect(body.embeds[0].description).toBe(mockMessage.body);
  });

  it('should use correct color based on outcome', async () => {
    const config: DiscordConfig = {
      enabled: true,
      webhookUrl: 'https://discord.com/api/webhooks/123456789/abcdefghijklmnop',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 204,
    });

    // Test success (green)
    await sendDiscordNotification(config, { ...mockMessage, outcome: 'success' });
    let call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    let body = JSON.parse(call[1]?.body as string);
    expect(body.embeds[0].color).toBe(0x00ff00);

    vi.clearAllMocks();

    // Test error (red)
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 204,
    });
    await sendDiscordNotification(config, { ...mockMessage, outcome: 'error' });
    call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    body = JSON.parse(call[1]?.body as string);
    expect(body.embeds[0].color).toBe(0xff0000);

    vi.clearAllMocks();

    // Test blocked (yellow)
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 204,
    });
    await sendDiscordNotification(config, { ...mockMessage, outcome: 'blocked' });
    call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    body = JSON.parse(call[1]?.body as string);
    expect(body.embeds[0].color).toBe(0xffaa00);
  });

  it('should truncate long body text', async () => {
    const config: DiscordConfig = {
      enabled: true,
      webhookUrl: 'https://discord.com/api/webhooks/123456789/abcdefghijklmnop',
    };

    const longBody = 'x'.repeat(5000);
    const longMessage = { ...mockMessage, body: longBody };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    await sendDiscordNotification(config, longMessage);

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1]?.body as string);
    expect(body.embeds[0].description.length).toBeLessThanOrEqual(4096);
    expect(body.embeds[0].description.endsWith('...')).toBe(true);
  });

  it('should not send when disabled', async () => {
    const config: DiscordConfig = {
      enabled: false,
      webhookUrl: 'https://discord.com/api/webhooks/123456789/abcdefghijklmnop',
    };

    await sendDiscordNotification(config, mockMessage);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should not send when webhook URL is empty', async () => {
    const config: DiscordConfig = {
      enabled: true,
      webhookUrl: '',
    };

    await sendDiscordNotification(config, mockMessage);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should throw error for invalid webhook URL', async () => {
    const config: DiscordConfig = {
      enabled: true,
      webhookUrl: 'https://invalid-url.com',
    };

    await expect(sendDiscordNotification(config, mockMessage)).rejects.toThrow('Invalid Discord webhook URL');
  });

  it('should throw error when webhook request fails', async () => {
    const config: DiscordConfig = {
      enabled: true,
      webhookUrl: 'https://discord.com/api/webhooks/123456789/abcdefghijklmnop',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('Webhook not found'),
    });

    await expect(sendDiscordNotification(config, mockMessage)).rejects.toThrow('Discord webhook failed');
  });
});
