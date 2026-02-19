/**
 * @ada/core — Telegram Notification Sender
 *
 * Sends notifications to Telegram via Bot API.
 */

import type { NotificationMessage, TelegramConfig } from './types.js';
import { resolveEnvVars } from './config-loader.js';

/**
 * Send notification to Telegram via Bot API
 *
 * @param config - Telegram channel configuration
 * @param message - Notification message payload
 * @throws Error if bot token or chat ID is invalid or request fails
 */
export async function sendTelegramNotification(
  config: TelegramConfig,
  message: NotificationMessage
): Promise<void> {
  if (!config.enabled || !config.botToken || !config.chatId) {
    return;
  }

  const botToken = resolveEnvVars(config.botToken);
  const chatId = resolveEnvVars(config.chatId);

  if (!botToken || !chatId) {
    throw new Error('Invalid Telegram bot token or chat ID');
  }

  // Format message for Telegram (Markdown)
  const text = `*${message.role.emoji} Cycle ${message.cycle} Complete — ${message.role.name}*\n\n` +
    `*${message.subject}*\n\n` +
    `\`\`\`\n${message.body}\n\`\`\`\n\n` +
    `Commit: \`${message.commitSha}\` | Role: ${message.role.id}`;

  const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ description: 'Unknown error' }))) as { description?: string };
    throw new Error(`Telegram API failed: ${response.status} ${response.statusText} - ${errorData.description || 'Unknown error'}`);
  }
}
