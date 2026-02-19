/**
 * @ada/core — Discord Notification Sender
 *
 * Sends notifications to Discord via webhook.
 */

import type { NotificationMessage, DiscordConfig } from './types.js';
import { resolveEnvVars } from './config-loader.js';

/**
 * Send notification to Discord via webhook
 *
 * @param config - Discord channel configuration
 * @param message - Notification message payload
 * @throws Error if webhook URL is invalid or request fails
 */
export async function sendDiscordNotification(
  config: DiscordConfig,
  message: NotificationMessage
): Promise<void> {
  if (!config.enabled || !config.webhookUrl) {
    return;
  }

  const webhookUrl = resolveEnvVars(config.webhookUrl);
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    throw new Error('Invalid Discord webhook URL');
  }

  // Determine color based on outcome (green for success, yellow for warnings, red for errors)
  const color = message.outcome === 'error' ? 0xff0000 : message.outcome === 'blocked' ? 0xffaa00 : 0x00ff00;

  // Format message for Discord (embed)
  const embed = {
    title: message.subject,
    description: message.body.length > 4096 ? `${message.body.substring(0, 4093)  }...` : message.body,
    color,
    footer: {
      text: `Cycle ${message.cycle} • ${message.role.emoji} ${message.role.name} • ${message.commitSha}`,
    },
    timestamp: new Date().toISOString(),
  };

  const payload = {
    embeds: [embed],
    username: 'ADA Agent',
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Discord webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
}
