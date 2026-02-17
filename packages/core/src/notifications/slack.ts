/**
 * @ada/core — Slack Notification Sender
 *
 * Sends notifications to Slack via webhook.
 */

import type { NotificationMessage, SlackConfig } from './types.js';
import { resolveEnvVars } from './config-loader.js';

/**
 * Send notification to Slack via webhook
 *
 * @param config - Slack channel configuration
 * @param message - Notification message payload
 * @throws Error if webhook URL is invalid or request fails
 */
export async function sendSlackNotification(
  config: SlackConfig,
  message: NotificationMessage
): Promise<void> {
  if (!config.enabled || !config.webhookUrl) {
    return;
  }

  const webhookUrl = resolveEnvVars(config.webhookUrl);
  if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
    throw new Error('Invalid Slack webhook URL');
  }

  // Format message for Slack
  const blocks = [
    {
      type: 'header' as const,
      text: {
        type: 'plain_text' as const,
        text: `Cycle ${message.cycle} Complete — ${message.role.emoji} ${message.role.name}`,
        emoji: true,
      },
    },
    {
      type: 'section' as const,
      text: {
        type: 'mrkdwn' as const,
        text: `*${message.subject}*\n\n\`\`\`${message.body}\`\`\``,
      },
    },
    {
      type: 'context' as const,
      elements: [
        {
          type: 'mrkdwn' as const,
          text: `Commit: \`${message.commitSha}\` | Role: ${message.role.id}`,
        },
      ],
    },
  ];

  const payload = {
    blocks,
    text: `${message.role.emoji} Cycle ${message.cycle}: ${message.subject}`, // Fallback text
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
    throw new Error(`Slack webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
}
