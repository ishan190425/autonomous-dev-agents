/**
 * @ada/core — Notification Config Loader
 *
 * Loads and validates notification configuration from agents/config.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AgentConfig, NotificationConfig } from './types.js';

/**
 * Load agent configuration from agents/config.json
 *
 * @param configPath - Path to agents/config.json
 * @returns Agent configuration, or null if file doesn't exist
 */
export function loadAgentConfig(configPath: string): AgentConfig | null {
  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as AgentConfig;
    return config;
  } catch (error) {
    // If config file is invalid, return null (notifications will be disabled)
    if (process.env.ADA_DEBUG) {
      console.error('Failed to load agent config:', error);
    }
    return null;
  }
}

/**
 * Get notification configuration from agent config
 *
 * @param configPath - Path to agents/config.json
 * @returns Notification configuration, or null if not configured
 */
export function getNotificationConfig(configPath: string): NotificationConfig | null {
  const agentConfig = loadAgentConfig(configPath);
  if (!agentConfig?.notifications) {
    return null;
  }

  // Return default config if notifications are enabled but channels not specified
  if (agentConfig.notifications.enabled && !agentConfig.notifications.channels) {
    return {
      enabled: true,
      channels: {},
    };
  }

  return agentConfig.notifications;
}

/**
 * Write agent configuration to agents/config.json
 *
 * @param configPath - Path to agents/config.json
 * @param config - Agent configuration to write
 */
export function writeAgentConfig(configPath: string, config: AgentConfig): void {
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load existing config to merge
    const existing = loadAgentConfig(configPath) || {};
    const merged = deepMerge(existing, config);

    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write agent config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Deep merge two objects
 */
function deepMerge(target: AgentConfig, source: Partial<AgentConfig>): AgentConfig {
  const result: AgentConfig = { ...target };

  if (source.notifications) {
    const existingChannels = result.notifications?.channels || {};
    const sourceChannels = source.notifications.channels || {};
    
    result.notifications = {
      ...result.notifications,
      ...source.notifications,
      channels: {
        ...existingChannels,
        ...sourceChannels,
        // Merge individual channel configs (only if provided)
        ...(sourceChannels.slack !== undefined && { slack: sourceChannels.slack }),
        ...(sourceChannels.telegram !== undefined && { telegram: sourceChannels.telegram }),
        ...(sourceChannels.discord !== undefined && { discord: sourceChannels.discord }),
      },
    };
  }

  return result;
}

/**
 * Resolve environment variable references in config values
 * Supports ${VAR_NAME} syntax
 *
 * @param value - Config value that may contain env var references
 * @returns Resolved value with env vars substituted
 */
export function resolveEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const envValue = process.env[varName];
    if (envValue === undefined) {
      if (process.env.ADA_DEBUG) {
        console.warn(`Environment variable ${varName} not found, using literal value`);
      }
      return match; // Return original if env var not found
    }
    return envValue;
  });
}
