/**
 * @ada/core — Structured Logger Implementation
 *
 * JSON Lines and human-readable logging with context propagation.
 * Part of SaaS Observability & Telemetry Specification (C886).
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import type {
  Logger,
  LoggerConfig,
  LogContext,
  LogEntry,
  LogFormat,
  LogLevel,
  LogOutput,
} from './types.js';
import { LOG_LEVEL_VALUES } from './types.js';

// ─── Formatters ──────────────────────────────────────────────────────────────

/**
 * Format a log entry as JSON Lines (one JSON object per line).
 */
function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Format a log entry as human-readable text.
 */
function formatText(entry: LogEntry, includeTimestamp: boolean): string {
  const parts: string[] = [];

  // Timestamp
  if (includeTimestamp) {
    const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    parts.push(`[${time}]`);
  }

  // Level
  const levelStr = entry.level.toUpperCase().padEnd(5);
  parts.push(levelStr);

  // Context (compact)
  const contextParts: string[] = [];
  if (entry.context.cycleId !== undefined) {
    contextParts.push(`C${entry.context.cycleId}`);
  }
  if (entry.context.role) {
    contextParts.push(entry.context.role);
  }
  if (contextParts.length > 0) {
    parts.push(`[${contextParts.join('/')}]`);
  }

  // Message
  parts.push(entry.message);

  // Metadata (inline key=value)
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    const metaStr = Object.entries(entry.metadata)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ');
    parts.push(`(${metaStr})`);
  }

  // Error
  if (entry.error) {
    parts.push(`— ${entry.error.name}: ${entry.error.message}`);
    if (entry.error.stack) {
      return `${parts.join(' ')  }\n${  entry.error.stack}`;
    }
  }

  return parts.join(' ');
}

/**
 * Format a log entry with ANSI colors (for TTY).
 */
function formatPretty(entry: LogEntry, includeTimestamp: boolean): string {
  const colors: Record<LogLevel, string> = {
    trace: '\x1b[90m', // gray
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m', // green
    warn: '\x1b[33m', // yellow
    error: '\x1b[31m', // red
  };
  const reset = '\x1b[0m';
  const dim = '\x1b[2m';

  const parts: string[] = [];

  // Timestamp (dimmed)
  if (includeTimestamp) {
    const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    parts.push(`${dim}[${time}]${reset}`);
  }

  // Level (colored)
  const levelColor = colors[entry.level];
  const levelStr = entry.level.toUpperCase().padEnd(5);
  parts.push(`${levelColor}${levelStr}${reset}`);

  // Context (dimmed)
  const contextParts: string[] = [];
  if (entry.context.cycleId !== undefined) {
    contextParts.push(`C${entry.context.cycleId}`);
  }
  if (entry.context.role) {
    contextParts.push(entry.context.role);
  }
  if (contextParts.length > 0) {
    parts.push(`${dim}[${contextParts.join('/')}]${reset}`);
  }

  // Message
  parts.push(entry.message);

  // Metadata (dimmed)
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    const metaStr = Object.entries(entry.metadata)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ');
    parts.push(`${dim}(${metaStr})${reset}`);
  }

  // Error (red)
  if (entry.error) {
    parts.push(`${colors.error}— ${entry.error.name}: ${entry.error.message}${reset}`);
    if (entry.error.stack) {
      return `${parts.join(' ')  }\n${  dim  }${entry.error.stack  }${reset}`;
    }
  }

  return parts.join(' ');
}

// ─── Output Writers ──────────────────────────────────────────────────────────

type Writer = (line: string) => void;

function createWriter(output: LogOutput, filePath?: string): Writer {
  switch (output) {
    case 'stdout':
      return (line: string) => process.stdout.write(`${line  }\n`);
    case 'stderr':
      return (line: string) => process.stderr.write(`${line  }\n`);
    case 'file': {
      if (!filePath) {
        throw new Error('filePath required when output is "file"');
      }
      const stream = fs.createWriteStream(filePath, { flags: 'a' });
      return (line: string) => stream.write(`${line  }\n`);
    }
    case 'silent':
      return () => {}; // No-op
    default:
      return (line: string) => process.stderr.write(`${line  }\n`);
  }
}

// ─── Logger Implementation ───────────────────────────────────────────────────

/**
 * Create a logger entry object.
 */
function createEntry(
  level: LogLevel,
  message: string,
  context: LogContext,
  metadata?: Record<string, unknown>,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  if (metadata && Object.keys(metadata).length > 0) {
    (entry as { metadata: Record<string, unknown> }).metadata = metadata;
  }

  if (error) {
    const errorEntry: { name: string; message: string; stack?: string } = {
      name: error.name,
      message: error.message,
    };
    if (error.stack !== undefined) {
      errorEntry.stack = error.stack;
    }
    (entry as { error: typeof errorEntry }).error = errorEntry;
  }

  return entry;
}

/**
 * Internal logger implementation.
 */
class LoggerImpl implements Logger {
  private readonly level: LogLevel;
  private readonly levelValue: number;
  private readonly format: LogFormat;
  private readonly context: LogContext;
  private readonly write: Writer;
  private readonly includeTimestamps: boolean;
  private readonly includeStackTraces: boolean;

  constructor(config: LoggerConfig, writer?: Writer) {
    this.level = config.level ?? 'info';
    this.levelValue = LOG_LEVEL_VALUES[this.level];
    this.format = config.format ?? 'text';
    this.context = config.context ?? {};
    this.write = writer ?? createWriter(config.output ?? 'stderr', config.filePath);
    this.includeTimestamps = config.timestamps ?? true;
    this.includeStackTraces =
      config.stackTraces ?? (this.level === 'debug' || this.level === 'trace');
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): void {
    // Check if level is enabled
    if (LOG_LEVEL_VALUES[level] < this.levelValue) {
      return;
    }

    // Create entry
    const entry = createEntry(level, message, this.context, metadata, error);

    // Remove stack trace if not included
    if (!this.includeStackTraces && entry.error?.stack) {
      (entry as { error: { name: string; message: string } }).error = {
        name: entry.error.name,
        message: entry.error.message,
      };
    }

    // Format and write
    let output: string;
    switch (this.format) {
      case 'json':
        output = formatJson(entry);
        break;
      case 'pretty':
        output = formatPretty(entry, this.includeTimestamps);
        break;
      case 'text':
      default:
        output = formatText(entry, this.includeTimestamps);
        break;
    }

    this.write(output);
  }

  trace(message: string, metadata?: Record<string, unknown>): void {
    this.log('trace', message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log('error', message, metadata, error);
  }

  child(additionalContext: LogContext): Logger {
    return new LoggerImpl(
      {
        level: this.level,
        format: this.format,
        timestamps: this.includeTimestamps,
        stackTraces: this.includeStackTraces,
        context: { ...this.context, ...additionalContext },
      },
      this.write
    );
  }

  getContext(): LogContext {
    return { ...this.context };
  }

  getLevel(): LogLevel {
    return this.level;
  }

  isLevelEnabled(level: LogLevel): boolean {
    return LOG_LEVEL_VALUES[level] >= this.levelValue;
  }
}

// ─── Factory Functions ───────────────────────────────────────────────────────

/**
 * Create a structured logger.
 *
 * @param config - Logger configuration
 * @returns Logger instance
 *
 * @example
 * ```typescript
 * // JSON output for machine parsing
 * const logger = createLogger({ format: 'json', level: 'debug' });
 *
 * // Human-readable with context
 * const cycleLogger = createLogger({
 *   format: 'pretty',
 *   context: { cycleId: 896, role: 'frontier' }
 * });
 * ```
 */
export function createLogger(config: LoggerConfig = {}): Logger {
  return new LoggerImpl(config);
}

/**
 * Create a silent logger (no output).
 * Useful for testing or when logging is disabled.
 */
export function createSilentLogger(): Logger {
  return createLogger({ output: 'silent' });
}

/**
 * Create a logger from environment variables.
 *
 * Environment variables:
 * - ADA_LOG_LEVEL: trace, debug, info, warn, error
 * - ADA_LOG_FORMAT: json, text, pretty
 *
 * @param defaultConfig - Defaults if env vars not set
 */
export function createLoggerFromEnv(defaultConfig: LoggerConfig = {}): Logger {
  const level = (process.env.ADA_LOG_LEVEL as LogLevel) ?? defaultConfig.level;
  const format = (process.env.ADA_LOG_FORMAT as LogFormat) ?? defaultConfig.format;

  return createLogger({
    ...defaultConfig,
    level,
    format,
  });
}

// ─── Global Logger ───────────────────────────────────────────────────────────

let globalLogger: Logger | null = null;

/**
 * Get or create the global logger instance.
 * Uses environment variables for configuration.
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = createLoggerFromEnv({ level: 'info', format: 'text' });
  }
  return globalLogger;
}

/**
 * Set the global logger instance.
 * Useful for initializing with specific configuration at startup.
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Reset the global logger (mainly for testing).
 */
export function resetLogger(): void {
  globalLogger = null;
}
