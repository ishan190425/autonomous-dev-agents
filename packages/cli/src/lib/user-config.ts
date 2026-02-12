/**
 * User Configuration — Persistent user preferences for ADA CLI
 *
 * Stores user-specific settings (like banner seen state) in
 * ~/.ada/config.json. Separate from project-level config.
 *
 * @module user-config
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Banner tracking state
 */
export interface BannerConfig {
  /** User has seen the full banner */
  seenFullBanner: boolean;
  /** First version where banner was shown */
  firstSeenVersion?: string;
  /** Timestamp of first banner display */
  firstSeenAt?: string;
}

/**
 * User configuration schema
 */
export interface UserConfig {
  /** Banner display tracking */
  banner?: BannerConfig;
  /** User's preferred color mode */
  colorMode?: 'auto' | 'always' | 'never';
  /** Telemetry opt-out (future use) */
  telemetryOptOut?: boolean;
}

/**
 * Get the user config directory path (~/.ada)
 */
export function getUserConfigDir(): string {
  return path.join(os.homedir(), '.ada');
}

/**
 * Get the user config file path (~/.ada/config.json)
 */
export function getUserConfigPath(): string {
  return path.join(getUserConfigDir(), 'config.json');
}

/**
 * Ensure the config directory exists
 */
function ensureConfigDir(): void {
  const configDir = getUserConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

/**
 * Read the current user configuration
 *
 * @returns The user config, or empty object if not found
 */
export function getUserConfig(): UserConfig {
  try {
    const configPath = getUserConfigPath();
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content) as UserConfig;
    }
  } catch {
    // Config doesn't exist or is invalid — return empty
  }
  return {};
}

/**
 * Update user configuration (merges with existing)
 *
 * @param updates - Partial config to merge
 */
export function updateUserConfig(updates: Partial<UserConfig>): void {
  try {
    ensureConfigDir();
    const current = getUserConfig();
    const updated = deepMerge(current, updates);
    const configPath = getUserConfigPath();
    fs.writeFileSync(configPath, `${JSON.stringify(updated, null, 2)}\n`);
  } catch (error) {
    // Silently fail — config is non-critical
    // In debug mode we could log this
    if (process.env.ADA_DEBUG) {
      console.error('Failed to update user config:', error);
    }
  }
}

/**
 * Reset user configuration (for testing)
 */
export function resetUserConfig(): void {
  try {
    const configPath = getUserConfigPath();
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  } catch {
    // Silently fail
  }
}

/**
 * Deep merge two objects
 */
function deepMerge(
  target: UserConfig,
  source: Partial<UserConfig>
): UserConfig {
  const result: UserConfig = { ...target };

  // Handle banner specifically (it's the only nested object)
  if (source.banner) {
    result.banner = {
      ...result.banner,
      ...source.banner,
    };
  }

  // Handle simple properties
  if (source.colorMode !== undefined) {
    result.colorMode = source.colorMode;
  }
  if (source.telemetryOptOut !== undefined) {
    result.telemetryOptOut = source.telemetryOptOut;
  }

  return result;
}
