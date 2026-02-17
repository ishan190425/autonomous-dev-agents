/**
 * @ada/core — Notification Service
 *
 * Main notification service orchestrator for sending agent cycle completion
 * notifications to Slack, Telegram, and Discord.
 */

import type { NotificationChannel, NotificationMessage } from './types.js';
import { getNotificationConfig } from './config-loader.js';
import { sendSlackNotification } from './slack.js';
import { sendTelegramNotification } from './telegram.js';
import { sendDiscordNotification } from './discord.js';

/**
 * Send cycle completion notifications to all enabled channels
 *
 * @param configPath - Path to agents/config.json
 * @param message - Notification message payload
 * @returns Array of results for each channel attempted
 */
export async function sendCycleNotifications(
  configPath: string,
  message: NotificationMessage
): Promise<Array<{ channel: NotificationChannel; success: boolean; error?: string }>> {
  const config = getNotificationConfig(configPath);

  // If notifications are disabled or not configured, skip
  if (!config || !config.enabled) {
    return [];
  }

  const results: Array<{ channel: NotificationChannel; success: boolean; error?: string }> = [];

  // Send to Slack if enabled
  if (config.channels?.slack?.enabled) {
    try {
      await sendSlackNotification(config.channels.slack, message);
      results.push({ channel: 'slack', success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({ channel: 'slack', success: false, error: errorMessage });
    }
  }

  // Send to Telegram if enabled
  if (config.channels?.telegram?.enabled) {
    try {
      await sendTelegramNotification(config.channels.telegram, message);
      results.push({ channel: 'telegram', success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({ channel: 'telegram', success: false, error: errorMessage });
    }
  }

  // Send to Discord if enabled
  if (config.channels?.discord?.enabled) {
    try {
      await sendDiscordNotification(config.channels.discord, message);
      results.push({ channel: 'discord', success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({ channel: 'discord', success: false, error: errorMessage });
    }
  }

  return results;
}

/**
 * Send a test notification to a specific channel
 *
 * @param configPath - Path to agents/config.json
 * @param channel - Channel to send test notification to
 * @returns Success status and optional error message
 */
export async function sendTestNotification(
  configPath: string,
  channel: NotificationChannel
): Promise<{ success: boolean; error?: string }> {
  const config = getNotificationConfig(configPath);

  if (!config || !config.enabled) {
    return { success: false, error: 'Notifications are disabled' };
  }

  const testMessage: NotificationMessage = {
    subject: 'Test Notification from ADA',
    body: 'This is a test notification to verify your notification configuration is working correctly.',
    cycle: 0,
    role: {
      id: 'test',
      emoji: '🧪',
      name: 'Test Agent',
    },
    commitSha: 'test123',
    outcome: 'success',
  };

  try {
    switch (channel) {
      case 'slack':
        if (!config.channels?.slack?.enabled) {
          return { success: false, error: 'Slack notifications are not enabled' };
        }
        await sendSlackNotification(config.channels.slack, testMessage);
        break;
      case 'telegram':
        if (!config.channels?.telegram?.enabled) {
          return { success: false, error: 'Telegram notifications are not enabled' };
        }
        await sendTelegramNotification(config.channels.telegram, testMessage);
        break;
      case 'discord':
        if (!config.channels?.discord?.enabled) {
          return { success: false, error: 'Discord notifications are not enabled' };
        }
        await sendDiscordNotification(config.channels.discord, testMessage);
        break;
      default:
        return { success: false, error: `Unknown channel: ${channel}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
