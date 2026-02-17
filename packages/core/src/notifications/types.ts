/**
 * @ada/core — Notification System Types
 *
 * TypeScript interfaces for notification configuration and payloads.
 */

/** Notification channel type */
export type NotificationChannel = 'slack' | 'telegram' | 'discord';

/** Slack channel configuration */
export interface SlackConfig {
  enabled: boolean;
  webhookUrl: string;
}

/** Telegram channel configuration */
export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

/** Discord channel configuration */
export interface DiscordConfig {
  enabled: boolean;
  webhookUrl: string;
}

/** Notification channels configuration */
export interface NotificationChannels {
  slack?: SlackConfig;
  telegram?: TelegramConfig;
  discord?: DiscordConfig;
}

/** Root notification configuration */
export interface NotificationConfig {
  enabled: boolean;
  channels?: NotificationChannels;
}

/** Agent configuration (includes notifications) */
export interface AgentConfig {
  notifications?: NotificationConfig;
}

/** Notification message payload */
export interface NotificationMessage {
  /** Git commit subject line */
  subject: string;
  /** Full git commit message body */
  body: string;
  /** Cycle number */
  cycle: number;
  /** Role information */
  role: {
    id: string;
    emoji: string;
    name: string;
  };
  /** Commit SHA (short) */
  commitSha: string;
  /** Outcome of the cycle */
  outcome?: 'success' | 'blocked' | 'error';
}
