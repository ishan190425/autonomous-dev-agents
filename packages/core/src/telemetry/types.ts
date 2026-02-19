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

// ─── Metrics Types ───────────────────────────────────────────────────────────

/**
 * Metric type for categorization.
 */
export type MetricType = 'counter' | 'histogram' | 'gauge';

/**
 * Labels for metric data points.
 * Used for filtering and aggregation.
 */
export type MetricLabels = Record<string, string>;

/**
 * A counter metric that only goes up.
 * Used for counting events (cycles, errors, operations).
 */
export interface CounterMetric {
  readonly type: 'counter';
  readonly name: string;
  readonly description: string;
  /** Total count value */
  value: number;
  /** Count per label combination */
  readonly labeled: Map<string, number>;
}

/**
 * A histogram metric for measuring distributions.
 * Used for durations, sizes, and other measurable values.
 */
export interface HistogramMetric {
  readonly type: 'histogram';
  readonly name: string;
  readonly description: string;
  /** All recorded values */
  readonly values: number[];
  /** Values per label combination */
  readonly labeled: Map<string, number[]>;
  /** Bucket boundaries for histogram */
  readonly buckets: readonly number[];
}

/**
 * A gauge metric that can go up or down.
 * Used for current values (memory usage, active sessions).
 */
export interface GaugeMetric {
  readonly type: 'gauge';
  readonly name: string;
  readonly description: string;
  /** Current value */
  value: number;
  /** Value per label combination */
  readonly labeled: Map<string, number>;
}

/**
 * Union type for all metric types.
 */
export type Metric = CounterMetric | HistogramMetric | GaugeMetric;

/**
 * Histogram statistics computed from recorded values.
 */
export interface HistogramStats {
  readonly count: number;
  readonly sum: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly p50: number;
  readonly p90: number;
  readonly p99: number;
}

/**
 * Exported metric data for serialization.
 */
export interface MetricExport {
  readonly timestamp: string;
  readonly counters: Record<string, { value: number; labeled: Record<string, number> }>;
  readonly histograms: Record<string, { stats: HistogramStats; labeled: Record<string, HistogramStats> }>;
  readonly gauges: Record<string, { value: number; labeled: Record<string, number> }>;
}

/**
 * Metrics collector interface.
 * Collects counters, histograms, and gauges for observability.
 *
 * @example
 * ```typescript
 * const metrics = createMetrics();
 *
 * // Count cycles
 * metrics.incrementCounter('ada_cycles_total', { role: 'frontier', outcome: 'success' });
 *
 * // Record cycle duration
 * metrics.recordHistogram('ada_cycle_duration_seconds', 12.5, { role: 'frontier' });
 *
 * // Set current memory version
 * metrics.setGauge('ada_memory_version', 46);
 *
 * // Export all metrics
 * const snapshot = metrics.export();
 * ```
 */
export interface Metrics {
  /**
   * Increment a counter metric.
   * Counters only go up (or stay the same).
   *
   * @param name - Metric name (e.g., 'ada_cycles_total')
   * @param labels - Optional labels for filtering
   * @param value - Increment amount (default: 1)
   */
  incrementCounter(name: string, labels?: MetricLabels, value?: number): void;

  /**
   * Record a value in a histogram metric.
   * Used for measuring distributions (durations, sizes).
   *
   * @param name - Metric name (e.g., 'ada_cycle_duration_seconds')
   * @param value - Value to record
   * @param labels - Optional labels for filtering
   */
  recordHistogram(name: string, value: number, labels?: MetricLabels): void;

  /**
   * Set a gauge metric to a specific value.
   * Gauges can go up or down.
   *
   * @param name - Metric name (e.g., 'ada_memory_version')
   * @param value - Current value
   * @param labels - Optional labels for filtering
   */
  setGauge(name: string, value: number, labels?: MetricLabels): void;

  /**
   * Get the current value of a counter.
   * Returns 0 if counter doesn't exist.
   */
  getCounter(name: string, labels?: MetricLabels): number;

  /**
   * Get histogram statistics.
   * Returns null if histogram doesn't exist or has no values.
   */
  getHistogramStats(name: string, labels?: MetricLabels): HistogramStats | null;

  /**
   * Get the current value of a gauge.
   * Returns null if gauge doesn't exist.
   */
  getGauge(name: string, labels?: MetricLabels): number | null;

  /**
   * Export all metrics as a snapshot.
   * Used for persistence and external reporting.
   */
  export(): MetricExport;

  /**
   * Import metrics from a snapshot.
   * Used for loading persisted metrics on startup.
   */
  import(data: MetricExport): void;

  /**
   * Reset all metrics to initial state.
   * Counters go to 0, histograms clear values, gauges go to 0.
   */
  reset(): void;

  /**
   * List all registered metric names.
   */
  listMetrics(): string[];
}

/**
 * Metrics configuration options.
 */
export interface MetricsConfig {
  /** File path to persist metrics (optional) */
  readonly persistPath?: string;
  /** Auto-save interval in milliseconds (default: 60000 = 1 minute) */
  readonly autoSaveInterval?: number;
  /** Load persisted metrics on creation (default: true) */
  readonly loadOnCreate?: boolean;
  /** Default histogram buckets (for durations in seconds) */
  readonly defaultBuckets?: readonly number[];
}
