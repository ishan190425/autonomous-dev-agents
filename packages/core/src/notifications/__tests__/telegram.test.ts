/**
 * @ada/core — Telegram Notification Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendTelegramNotification } from '../telegram.js';
import type { NotificationMessage, TelegramConfig } from '../types.js';

// Mock fetch
global.fetch = vi.fn();

describe('sendTelegramNotification', () => {
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

  it('should send notification when enabled with valid credentials', async () => {
    const config: TelegramConfig = {
      enabled: true,
      botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      chatId: '123456789',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });

    await sendTelegramNotification(config, mockMessage);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('api.telegram.org');
    expect(call[0]).toContain(config.botToken);
    expect(call[1]?.method).toBe('POST');

    const body = JSON.parse(call[1]?.body as string);
    expect(body.chat_id).toBe(config.chatId);
    expect(body.parse_mode).toBe('Markdown');
  });

  it('should not send when disabled', async () => {
    const config: TelegramConfig = {
      enabled: false,
      botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      chatId: '123456789',
    };

    await sendTelegramNotification(config, mockMessage);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should not send when bot token is empty', async () => {
    const config: TelegramConfig = {
      enabled: true,
      botToken: '',
      chatId: '123456789',
    };

    await sendTelegramNotification(config, mockMessage);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should not send when chat ID is empty', async () => {
    const config: TelegramConfig = {
      enabled: true,
      botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      chatId: '',
    };

    await sendTelegramNotification(config, mockMessage);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should throw error when API request fails', async () => {
    const config: TelegramConfig = {
      enabled: true,
      botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      chatId: '123456789',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ ok: false, description: 'Unauthorized' }),
    });

    await expect(sendTelegramNotification(config, mockMessage)).rejects.toThrow('Telegram API failed');
  });
});
