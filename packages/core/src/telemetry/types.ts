/**
 * @ada/core — Telemetry Types
 *
 * Type definitions for structured logging and observability.
 *
 * @packageDocumentation
 */

// ─── Log Levels ──────────────────────────────────────────────────────────────

/**
 * Log levels in order of severity.
 * trace < debug < info < warn < error
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

/**
 * Numeric log level values for comparison.
 */
export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

// ─── Context ─────────────────────────────────────────────────────────────────

/**
 * Context that propagates through all log entries.
 * Enables filtering and correlation of related log entries.
 */
export interface LogContext {
  /** Current dispatch cycle number */
  readonly cycleId?: number;
  /** Active agent role */
  readonly role?: string;
  /** Unique session identifier */
  readonly sessionId?: string;
  /** Distributed trace identifier (for tracing integration) */
  readonly traceId?: string;
  /** Span identifier within a trace */
  readonly spanId?: string;
  /** Repository path or name */
  readonly repo?: string;
  /** Any additional context fields */
  readonly [key: string]: string | number | boolean | undefined;
}

// ─── Log Entry ───────────────────────────────────────────────────────────────

/**
 * A structured log entry.
 * Designed for JSON serialization and log aggregation systems.
 */
export interface LogEntry {
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** Log level */
  readonly level: LogLevel;
  /** Human-readable message */
  readonly message: string;
  /** Propagated context */
  readonly context: LogContext;
  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;
  /** Error details if present */
  readonly error?: {
    readonly name: string;
    readonly message: string;
    readonly stack?: string;
  };
}

// ─── Logger Interface ────────────────────────────────────────────────────────

/**
 * Structured logger with context propagation.
 *
 * Supports multiple output formats (JSON, human-readable) and
 * integrates with distributed tracing.
 *
 * @example
 * ```typescript
 * const logger = createLogger({ format: 'json', level: 'info' });
 *
 * // Create a child logger with context
 * const cycleLogger = logger.child({ cycleId: 896, role: 'frontier' });
 *
 * // Log with additional metadata
 * cycleLogger.info('Cycle started', { memoryVersion: 45 });
 *
 * // Error logging with error object
 * cycleLogger.error('Dispatch failed', new Error('Git push failed'), { retries: 3 });
 * ```
 */
export interface Logger {
  /**
   * Log at trace level (most verbose).
   * Use for fine-grained debugging.
   */
  trace(message: string, metadata?: Record<string, unknown>): void;

  /**
   * Log at debug level.
   * Use for detailed execution context.
   */
  debug(message: string, metadata?: Record<string, unknown>): void;

  /**
   * Log at info level.
   * Use for cycle milestones and significant events.
   */
  info(message: string, metadata?: Record<string, unknown>): void;

  /**
   * Log at warn level.
   * Use for degraded performance, retry scenarios.
   */
  warn(message: string, metadata?: Record<string, unknown>): void;

  /**
   * Log at error level.
   * Use for failures requiring attention.
   *
   * @param message - Error description
   * @param error - Optional Error object for stack trace
   * @param metadata - Additional context
   */
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void;

  /**
   * Create a child logger with additional context.
   * Child context is merged with parent context.
   */
  child(context: LogContext): Logger;

  /**
   * Get the current context of this logger.
   */
  getContext(): LogContext;

  /**
   * Get the current log level.
   */
  getLevel(): LogLevel;

  /**
   * Check if a log level is enabled.
   */
  isLevelEnabled(level: LogLevel): boolean;
}

// ─── Logger Configuration ────────────────────────────────────────────────────

/**
 * Output format for log entries.
 * - 'json': JSON Lines format (machine-readable)
 * - 'text': Human-readable with timestamps
 * - 'pretty': Colorized human-readable (for TTY)
 */
export type LogFormat = 'json' | 'text' | 'pretty';

/**
 * Output destination for log entries.
 */
export type LogOutput = 'stdout' | 'stderr' | 'file' | 'silent';

/**
 * Logger configuration options.
 */
export interface LoggerConfig {
  /** Minimum log level (default: 'info') */
  readonly level?: LogLevel;
  /** Output format (default: 'text') */
  readonly format?: LogFormat;
  /** Output destination (default: 'stderr') */
  readonly output?: LogOutput;
  /** File path if output is 'file' */
  readonly filePath?: string;
  /** Initial context (propagated to all log entries) */
  readonly context?: LogContext;
  /** Include timestamps in text format (default: true) */
  readonly timestamps?: boolean;
  /** Include stack traces for errors (default: true in debug/trace) */
  readonly stackTraces?: boolean;
}
