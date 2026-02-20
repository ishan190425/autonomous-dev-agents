/**
 * @ada/cli — CLI Logger Module
 *
 * Integrates @ada-ai/core structured logger with CLI global flags.
 * Supports --verbose, --json, and --quiet output modes.
 *
 * Part of Issue #186 (Structured Logging with JSON Format Option).
 * Implements Design Spec C892 (Observability Output UX).
 *
 * @packageDocumentation
 */

import {
  createLogger,
  createSilentLogger,
  setLogger,
  getLogger,
  resetLogger,
  type Logger,
  type LogFormat,
  type LogLevel,
} from '@ada-ai/core';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * CLI output mode configuration.
 *
 * | Mode    | Audience   | Log Level | Format | Use Case                    |
 * |---------|------------|-----------|--------|-----------------------------|
 * | default | Developers | info      | pretty | Day-to-day use, minimal noise |
 * | verbose | Operators  | debug     | pretty | Debugging, monitoring       |
 * | json    | Machines   | debug     | json   | Log aggregation, parsing    |
 * | quiet   | CI/Scripts | warn      | text   | Warnings/errors only        |
 */
export type OutputMode = 'default' | 'verbose' | 'json' | 'quiet';

/**
 * CLI logger options derived from global flags.
 */
export interface CLILoggerOptions {
  /** --verbose flag: detailed human-readable output */
  readonly verbose?: boolean;
  /** --json flag: machine-parseable JSON Lines output */
  readonly json?: boolean;
  /** --quiet flag: warnings and errors only */
  readonly quiet?: boolean;
}

// ─── Mode Detection ──────────────────────────────────────────────────────────

/**
 * Determine output mode from CLI flags.
 *
 * Flag precedence:
 * 1. --json (always wins - machine-parseable, no formatting)
 * 2. --quiet (suppress info-level output)
 * 3. --verbose (add detail to human output)
 * 4. default (clean output for developers)
 *
 * @param options - CLI global flag options
 * @returns Resolved output mode
 */
export function resolveOutputMode(options: CLILoggerOptions): OutputMode {
  // --json always wins (machine-parseable)
  if (options.json) {
    return 'json';
  }

  // --quiet suppresses info, only warn/error
  if (options.quiet) {
    return 'quiet';
  }

  // --verbose adds timestamps and debug level
  if (options.verbose) {
    return 'verbose';
  }

  // Default: clean output for developers
  return 'default';
}

/**
 * Get log level for an output mode.
 */
export function getLevelForMode(mode: OutputMode): LogLevel {
  switch (mode) {
    case 'verbose':
    case 'json':
      return 'debug';
    case 'quiet':
      return 'warn';
    case 'default':
    default:
      return 'info';
  }
}

/**
 * Get log format for an output mode.
 */
export function getFormatForMode(mode: OutputMode): LogFormat {
  switch (mode) {
    case 'json':
      return 'json';
    case 'quiet':
      return 'text';
    case 'verbose':
    case 'default':
    default:
      // Use pretty (colored) if TTY, else text
      return process.stdout.isTTY ? 'pretty' : 'text';
  }
}

// ─── Logger Factory ──────────────────────────────────────────────────────────

/**
 * Create a CLI logger from global flag options.
 *
 * @param options - CLI global flag options (--verbose, --json, --quiet)
 * @returns Configured Logger instance
 *
 * @example
 * ```typescript
 * // In preAction hook
 * const logger = createCLILogger({ verbose: true });
 * logger.debug('Detailed output enabled');
 *
 * // JSON mode for CI
 * const jsonLogger = createCLILogger({ json: true });
 * jsonLogger.info('Machine-readable output');
 * ```
 */
export function createCLILogger(options: CLILoggerOptions = {}): Logger {
  const mode = resolveOutputMode(options);
  const level = getLevelForMode(mode);
  const format = getFormatForMode(mode);

  // Include timestamps in verbose mode, exclude in default/quiet
  const timestamps = mode === 'verbose' || mode === 'json';

  return createLogger({
    level,
    format,
    output: 'stderr', // Logs go to stderr, output goes to stdout
    timestamps,
    stackTraces: level === 'debug',
  });
}

// ─── Global Logger Management ────────────────────────────────────────────────

/**
 * Initialize the global logger from CLI options.
 * Call this in the CLI preAction hook.
 *
 * @param options - CLI global flag options
 * @returns The initialized logger
 *
 * @example
 * ```typescript
 * program.hook('preAction', (thisCommand) => {
 *   initializeCLILogger(thisCommand.opts());
 * });
 * ```
 */
export function initializeCLILogger(options: CLILoggerOptions = {}): Logger {
  const logger = createCLILogger(options);
  setLogger(logger);
  return logger;
}

/**
 * Get the current CLI logger (alias for getLogger).
 * Returns the global logger instance.
 */
export function getCLILogger(): Logger {
  return getLogger();
}

/**
 * Reset the CLI logger to default state.
 * Mainly for testing.
 */
export function resetCLILogger(): void {
  resetLogger();
}

// ─── Silent Logger ───────────────────────────────────────────────────────────

/**
 * Create a silent logger for testing.
 * No output is produced.
 */
export { createSilentLogger };

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type { Logger, LogFormat, LogLevel };
