/**
 * @ada/cli — CLI Logger Module
 *
 * Wraps the @ada-ai/core structured logger with CLI-specific configuration.
 * Supports --verbose and --json global flags per Design Spec (C892).
 *
 * @packageDocumentation
 */

import {
  createLogger,
  setLogger,
  type Logger,
  type LoggerConfig,
} from '@ada-ai/core';

// ─── CLI Output Configuration ────────────────────────────────────────────────

/**
 * CLI output mode based on flags.
 * - clean: Default, minimal output (info level)
 * - verbose: Detailed output with timestamps (debug level)
 * - json: JSON Lines for machine parsing (info level, JSON format)
 * - quiet: Minimal warnings/errors only (warn level)
 */
export type OutputMode = 'clean' | 'verbose' | 'json' | 'quiet';

/**
 * CLI output options from global flags.
 */
export interface OutputOptions {
  /** Enable verbose output (--verbose) */
  verbose?: boolean;
  /** Enable JSON output (--json) */
  json?: boolean;
  /** Enable quiet mode (--quiet) */
  quiet?: boolean;
}

/**
 * Determine output mode from CLI flags.
 * Flag precedence: --json > --verbose > --quiet > clean
 */
export function getOutputMode(options: OutputOptions): OutputMode {
  if (options.json) return 'json';
  if (options.verbose) return 'verbose';
  if (options.quiet) return 'quiet';
  return 'clean';
}

// ─── Logger Configuration ────────────────────────────────────────────────────

/**
 * Map output mode to logger configuration.
 */
function getLoggerConfig(mode: OutputMode): LoggerConfig {
  const baseConfig: LoggerConfig = {
    output: 'stderr',
    timestamps: mode === 'verbose',
  };

  switch (mode) {
    case 'json':
      return {
        ...baseConfig,
        format: 'json',
        level: 'info',
        timestamps: true, // Always include in JSON
      };
    case 'verbose':
      return {
        ...baseConfig,
        format: 'pretty', // Colorized for TTY
        level: 'debug',
        timestamps: true,
      };
    case 'quiet':
      return {
        ...baseConfig,
        format: 'text',
        level: 'warn',
        timestamps: false,
      };
    case 'clean':
    default:
      return {
        ...baseConfig,
        format: 'text',
        level: 'info',
        timestamps: false,
      };
  }
}

// ─── CLI Logger Instance ─────────────────────────────────────────────────────

let cliLogger: Logger | null = null;
let currentMode: OutputMode = 'clean';

/**
 * Initialize the CLI logger with the specified output options.
 * Call this early in the CLI lifecycle (e.g., in preAction hook).
 *
 * @param options - Output options from global CLI flags
 * @returns Configured logger instance
 *
 * @example
 * ```typescript
 * // In CLI preAction hook:
 * const logger = initCliLogger({
 *   verbose: thisCommand.opts().verbose,
 *   json: thisCommand.opts().json
 * });
 * ```
 */
export function initCliLogger(options: OutputOptions = {}): Logger {
  currentMode = getOutputMode(options);
  const config = getLoggerConfig(currentMode);
  cliLogger = createLogger(config);

  // Also set as global logger for core library
  setLogger(cliLogger);

  return cliLogger;
}

/**
 * Get the CLI logger instance.
 * Initializes with default config if not already initialized.
 */
export function getCliLogger(): Logger {
  if (!cliLogger) {
    return initCliLogger();
  }
  return cliLogger;
}

/**
 * Create a child logger with context for a specific command.
 * Used to add cycle/role context to command output.
 *
 * @param context - Context to add to the logger
 * @returns Child logger with context
 *
 * @example
 * ```typescript
 * const logger = createCommandLogger({ cycleId: 900, role: 'engineering' });
 * logger.info('Cycle started');
 * ```
 */
export function createCommandLogger(context: {
  cycleId?: number;
  role?: string;
  command?: string;
}): Logger {
  return getCliLogger().child(context);
}

/**
 * Get the current output mode.
 */
export function getOutputModeActive(): OutputMode {
  return currentMode;
}

/**
 * Check if JSON output mode is active.
 * Useful for commands that need to switch between JSON and formatted output.
 */
export function isJsonMode(): boolean {
  return currentMode === 'json';
}

/**
 * Check if verbose mode is active.
 */
export function isVerboseMode(): boolean {
  return currentMode === 'verbose';
}

/**
 * Check if quiet mode is active.
 */
export function isQuietMode(): boolean {
  return currentMode === 'quiet';
}
