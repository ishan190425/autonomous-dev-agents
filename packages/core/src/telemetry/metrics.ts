/**
 * @ada/core — Metrics Collector Implementation
 *
 * In-memory metrics collection with persistence support.
 * Part of SaaS Observability & Telemetry Specification (C886).
 * Phase 2: Basic Metrics (C906)
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { setInterval, clearInterval } from 'node:timers';
import type {
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  HistogramStats,
  MetricExport,
  MetricLabels,
  Metrics,
  MetricsConfig,
} from './types.js';

// ─── Default Configuration ───────────────────────────────────────────────────

/**
 * Default histogram buckets for duration metrics (in seconds).
 * Based on common latency patterns: sub-second to minutes.
 */
const DEFAULT_BUCKETS = [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300] as const;

/**
 * Default auto-save interval: 1 minute.
 */
const DEFAULT_AUTO_SAVE_INTERVAL = 60_000;

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Create a stable string key from labels for Map lookups.
 */
function labelsToKey(labels: MetricLabels): string {
  const sorted = Object.keys(labels).sort();
  return sorted.map((k) => `${k}=${labels[k]}`).join(',');
}

// Note: keyToLabels is available for future use (e.g., metrics display)
// Keeping as comment to avoid TS6133 unused warning
// function keyToLabels(key: string): MetricLabels { ... }

/**
 * Compute statistics for a histogram.
 */
function computeHistogramStats(values: number[]): HistogramStats {
  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      min: 0,
      max: 0,
      mean: 0,
      p50: 0,
      p90: 0,
      p99: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const min = sorted[0]!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const max = sorted[count - 1]!;
  const mean = sum / count;

  // Percentile helper
  const percentile = (p: number): number => {
    const idx = Math.ceil((p / 100) * count) - 1;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return sorted[Math.max(0, Math.min(idx, count - 1))]!;
  };

  return {
    count,
    sum,
    min,
    max,
    mean,
    p50: percentile(50),
    p90: percentile(90),
    p99: percentile(99),
  };
}

/**
 * Convert Map to plain object for JSON serialization.
 */
function mapToRecord<T>(map: Map<string, T>): Record<string, T> {
  const record: Record<string, T> = {};
  for (const [key, value] of map) {
    record[key] = value;
  }
  return record;
}

// Note: recordToMap is available for future use (e.g., full histogram restoration)
// Keeping as comment to avoid TS6133 unused warning
// function recordToMap<T>(record: Record<string, T>): Map<string, T> { ... }

// ─── Metrics Implementation ──────────────────────────────────────────────────

/**
 * In-memory metrics collector with optional persistence.
 */
class MetricsCollector implements Metrics {
  private readonly counters = new Map<string, CounterMetric>();
  private readonly histograms = new Map<string, HistogramMetric>();
  private readonly gauges = new Map<string, GaugeMetric>();
  private readonly config: Required<MetricsConfig>;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: MetricsConfig = {}) {
    this.config = {
      persistPath: config.persistPath ?? '',
      autoSaveInterval: config.autoSaveInterval ?? DEFAULT_AUTO_SAVE_INTERVAL,
      loadOnCreate: config.loadOnCreate ?? true,
      defaultBuckets: config.defaultBuckets ?? DEFAULT_BUCKETS,
    };

    // Load persisted metrics if configured
    if (this.config.loadOnCreate && this.config.persistPath) {
      this.loadFromFile();
    }

    // Set up auto-save if persistence is configured
    if (this.config.persistPath && this.config.autoSaveInterval > 0) {
      this.startAutoSave();
    }
  }

  // ─── Counter Methods ─────────────────────────────────────────────────────────

  private getOrCreateCounter(name: string): CounterMetric {
    let counter = this.counters.get(name);
    if (!counter) {
      counter = {
        type: 'counter',
        name,
        description: '',
        value: 0,
        labeled: new Map(),
      };
      this.counters.set(name, counter);
    }
    return counter;
  }

  incrementCounter(name: string, labels?: MetricLabels, value = 1): void {
    const counter = this.getOrCreateCounter(name);
    counter.value += value;

    if (labels && Object.keys(labels).length > 0) {
      const key = labelsToKey(labels);
      const current = counter.labeled.get(key) ?? 0;
      counter.labeled.set(key, current + value);
    }
  }

  getCounter(name: string, labels?: MetricLabels): number {
    const counter = this.counters.get(name);
    if (!counter) return 0;

    if (labels && Object.keys(labels).length > 0) {
      const key = labelsToKey(labels);
      return counter.labeled.get(key) ?? 0;
    }

    return counter.value;
  }

  // ─── Histogram Methods ───────────────────────────────────────────────────────

  private getOrCreateHistogram(name: string): HistogramMetric {
    let histogram = this.histograms.get(name);
    if (!histogram) {
      histogram = {
        type: 'histogram',
        name,
        description: '',
        values: [],
        labeled: new Map(),
        buckets: this.config.defaultBuckets,
      };
      this.histograms.set(name, histogram);
    }
    return histogram;
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    const histogram = this.getOrCreateHistogram(name);
    histogram.values.push(value);

    if (labels && Object.keys(labels).length > 0) {
      const key = labelsToKey(labels);
      let labeledValues = histogram.labeled.get(key);
      if (!labeledValues) {
        labeledValues = [];
        histogram.labeled.set(key, labeledValues);
      }
      labeledValues.push(value);
    }
  }

  getHistogramStats(name: string, labels?: MetricLabels): HistogramStats | null {
    const histogram = this.histograms.get(name);
    if (!histogram) return null;

    if (labels && Object.keys(labels).length > 0) {
      const key = labelsToKey(labels);
      const values = histogram.labeled.get(key);
      if (!values || values.length === 0) return null;
      return computeHistogramStats(values);
    }

    if (histogram.values.length === 0) return null;
    return computeHistogramStats(histogram.values);
  }

  // ─── Gauge Methods ───────────────────────────────────────────────────────────

  private getOrCreateGauge(name: string): GaugeMetric {
    let gauge = this.gauges.get(name);
    if (!gauge) {
      gauge = {
        type: 'gauge',
        name,
        description: '',
        value: 0,
        labeled: new Map(),
      };
      this.gauges.set(name, gauge);
    }
    return gauge;
  }

  setGauge(name: string, value: number, labels?: MetricLabels): void {
    const gauge = this.getOrCreateGauge(name);

    if (labels && Object.keys(labels).length > 0) {
      const key = labelsToKey(labels);
      gauge.labeled.set(key, value);
    } else {
      gauge.value = value;
    }
  }

  getGauge(name: string, labels?: MetricLabels): number | null {
    const gauge = this.gauges.get(name);
    if (!gauge) return null;

    if (labels && Object.keys(labels).length > 0) {
      const key = labelsToKey(labels);
      const value = gauge.labeled.get(key);
      return value !== undefined ? value : null;
    }

    return gauge.value;
  }

  // ─── Export/Import ───────────────────────────────────────────────────────────

  export(): MetricExport {
    const counters: MetricExport['counters'] = {};
    for (const [name, counter] of this.counters) {
      counters[name] = {
        value: counter.value,
        labeled: mapToRecord(counter.labeled),
      };
    }

    const histograms: MetricExport['histograms'] = {};
    for (const [name, histogram] of this.histograms) {
      const labeled: Record<string, HistogramStats> = {};
      for (const [key, values] of histogram.labeled) {
        labeled[key] = computeHistogramStats(values);
      }
      histograms[name] = {
        stats: computeHistogramStats(histogram.values),
        labeled,
      };
    }

    const gauges: MetricExport['gauges'] = {};
    for (const [name, gauge] of this.gauges) {
      gauges[name] = {
        value: gauge.value,
        labeled: mapToRecord(gauge.labeled),
      };
    }

    return {
      timestamp: new Date().toISOString(),
      counters,
      histograms,
      gauges,
    };
  }

  import(data: MetricExport): void {
    // Import counters
    for (const [name, counterData] of Object.entries(data.counters)) {
      const counter = this.getOrCreateCounter(name);
      counter.value = counterData.value;
      for (const [key, value] of Object.entries(counterData.labeled)) {
        counter.labeled.set(key, value);
      }
    }

    // Import gauges
    for (const [name, gaugeData] of Object.entries(data.gauges)) {
      const gauge = this.getOrCreateGauge(name);
      gauge.value = gaugeData.value;
      for (const [key, value] of Object.entries(gaugeData.labeled)) {
        gauge.labeled.set(key, value);
      }
    }

    // Note: Histogram raw values are not preserved in export (only stats)
    // This is intentional — we export computed stats, not all raw values
    // For full histogram restoration, would need different export format
  }

  // ─── Utility Methods ─────────────────────────────────────────────────────────

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }

  listMetrics(): string[] {
    const names: string[] = [];
    for (const name of this.counters.keys()) names.push(`counter:${name}`);
    for (const name of this.histograms.keys()) names.push(`histogram:${name}`);
    for (const name of this.gauges.keys()) names.push(`gauge:${name}`);
    return names.sort();
  }

  // ─── Persistence ─────────────────────────────────────────────────────────────

  private loadFromFile(): void {
    if (!this.config.persistPath) return;

    try {
      if (fs.existsSync(this.config.persistPath)) {
        const content = fs.readFileSync(this.config.persistPath, 'utf-8');
        const data = JSON.parse(content) as MetricExport;
        this.import(data);
      }
    } catch {
      // Silently ignore load errors — start fresh
    }
  }

  /**
   * Save metrics to configured file path.
   * Called automatically if autoSaveInterval is set.
   */
  save(): void {
    if (!this.config.persistPath) return;

    try {
      const dir = path.dirname(this.config.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = this.export();
      fs.writeFileSync(this.config.persistPath, JSON.stringify(data, null, 2));
    } catch {
      // Silently ignore save errors
    }
  }

  private startAutoSave(): void {
    if (this.autoSaveTimer) return;
    this.autoSaveTimer = setInterval(() => {
      this.save();
    }, this.config.autoSaveInterval);
    // Unref so it doesn't keep the process alive
    this.autoSaveTimer.unref();
  }

  /**
   * Stop auto-save and optionally save one final time.
   */
  stopAutoSave(saveNow = true): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    if (saveNow) {
      this.save();
    }
  }
}

// ─── Factory Functions ───────────────────────────────────────────────────────

/**
 * Create a metrics collector.
 *
 * @param config - Configuration options
 * @returns Metrics collector instance
 *
 * @example
 * ```typescript
 * // In-memory only
 * const metrics = createMetrics();
 *
 * // With persistence
 * const metrics = createMetrics({
 *   persistPath: '.ada/metrics.json',
 *   autoSaveInterval: 30000 // 30 seconds
 * });
 * ```
 */
export function createMetrics(config: MetricsConfig = {}): Metrics {
  return new MetricsCollector(config);
}

/**
 * Create a metrics collector from environment variables.
 *
 * Environment variables:
 * - ADA_METRICS_PATH: Path to persist metrics
 * - ADA_METRICS_INTERVAL: Auto-save interval in seconds
 */
export function createMetricsFromEnv(defaultConfig: MetricsConfig = {}): Metrics {
  const persistPath = process.env.ADA_METRICS_PATH ?? defaultConfig.persistPath;
  const intervalStr = process.env.ADA_METRICS_INTERVAL;
  const autoSaveInterval = intervalStr
    ? parseInt(intervalStr, 10) * 1000
    : defaultConfig.autoSaveInterval;

  const config: MetricsConfig = {
    ...defaultConfig,
  };

  if (persistPath !== undefined) {
    (config as { persistPath?: string }).persistPath = persistPath;
  }
  if (autoSaveInterval !== undefined) {
    (config as { autoSaveInterval?: number }).autoSaveInterval = autoSaveInterval;
  }

  return createMetrics(config);
}

// ─── Global Metrics ──────────────────────────────────────────────────────────

let globalMetrics: Metrics | null = null;

/**
 * Get or create the global metrics instance.
 * Uses environment variables for configuration.
 */
export function getMetrics(): Metrics {
  if (!globalMetrics) {
    globalMetrics = createMetricsFromEnv();
  }
  return globalMetrics;
}

/**
 * Set the global metrics instance.
 * Useful for initializing with specific configuration at startup.
 */
export function setMetrics(metrics: Metrics): void {
  globalMetrics = metrics;
}

/**
 * Reset the global metrics instance (mainly for testing).
 */
export function resetMetrics(): void {
  globalMetrics = null;
}

// ─── Pre-defined ADA Metrics ─────────────────────────────────────────────────

/**
 * Standard ADA metric names for consistency.
 * Use these constants instead of raw strings.
 */
export const ADA_METRICS = {
  // Cycle metrics
  CYCLES_TOTAL: 'ada_cycles_total',
  CYCLES_SUCCESS: 'ada_cycles_success',
  CYCLES_FAILED: 'ada_cycles_failed',
  CYCLE_DURATION_SECONDS: 'ada_cycle_duration_seconds',

  // LLM metrics
  LLM_TOKENS_TOTAL: 'ada_llm_tokens_total',
  LLM_TOKENS_INPUT: 'ada_llm_tokens_input',
  LLM_TOKENS_OUTPUT: 'ada_llm_tokens_output',
  LLM_COST_USD: 'ada_llm_cost_usd',
  LLM_CALLS_TOTAL: 'ada_llm_calls_total',
  LLM_LATENCY_SECONDS: 'ada_llm_latency_seconds',

  // Memory metrics
  MEMORY_COMPRESSIONS: 'ada_memory_compressions',
  MEMORY_VERSION: 'ada_memory_version',
  MEMORY_LINES: 'ada_memory_lines',

  // Git metrics
  GIT_OPERATIONS: 'ada_git_operations',
  GIT_COMMITS: 'ada_git_commits',
  GIT_PUSHES: 'ada_git_pushes',

  // Role metrics
  ROLE_CYCLES: 'ada_role_cycles',
  ROLE_ACTIONS: 'ada_role_actions',

  // Error metrics
  ERRORS_TOTAL: 'ada_errors_total',
} as const;

/**
 * Standard label names for ADA metrics.
 */
export const ADA_LABELS = {
  ROLE: 'role',
  REPO: 'repo',
  OUTCOME: 'outcome',
  MODEL: 'model',
  ERROR_TYPE: 'error_type',
  OPERATION: 'operation',
} as const;
