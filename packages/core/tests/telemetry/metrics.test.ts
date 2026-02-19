/**
 * Tests for metrics collector implementation.
 *
 * Phase 2: Basic Metrics (C906)
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  createMetrics,
  createMetricsFromEnv,
  getMetrics,
  setMetrics,
  resetMetrics,
  ADA_METRICS,
  ADA_LABELS,
} from '../../src/telemetry/metrics.js';

describe('Metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createMetrics', () => {
    it('should create a metrics collector with default config', () => {
      const metrics = createMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.listMetrics()).toEqual([]);
    });
  });

  describe('Counter', () => {
    it('should increment counter without labels', () => {
      const metrics = createMetrics();

      metrics.incrementCounter('test_counter');
      expect(metrics.getCounter('test_counter')).toBe(1);

      metrics.incrementCounter('test_counter');
      expect(metrics.getCounter('test_counter')).toBe(2);

      metrics.incrementCounter('test_counter', undefined, 5);
      expect(metrics.getCounter('test_counter')).toBe(7);
    });

    it('should increment counter with labels', () => {
      const metrics = createMetrics();

      metrics.incrementCounter('test_counter', { role: 'frontier' });
      metrics.incrementCounter('test_counter', { role: 'frontier' });
      metrics.incrementCounter('test_counter', { role: 'product' });

      expect(metrics.getCounter('test_counter')).toBe(3);
      expect(metrics.getCounter('test_counter', { role: 'frontier' })).toBe(2);
      expect(metrics.getCounter('test_counter', { role: 'product' })).toBe(1);
      expect(metrics.getCounter('test_counter', { role: 'engineering' })).toBe(0);
    });

    it('should return 0 for non-existent counter', () => {
      const metrics = createMetrics();
      expect(metrics.getCounter('does_not_exist')).toBe(0);
      expect(metrics.getCounter('does_not_exist', { label: 'value' })).toBe(0);
    });

    it('should support multiple label combinations', () => {
      const metrics = createMetrics();

      metrics.incrementCounter('cycles', { role: 'frontier', outcome: 'success' });
      metrics.incrementCounter('cycles', { role: 'frontier', outcome: 'failed' });
      metrics.incrementCounter('cycles', { role: 'product', outcome: 'success' });

      expect(metrics.getCounter('cycles', { role: 'frontier', outcome: 'success' })).toBe(1);
      expect(metrics.getCounter('cycles', { role: 'frontier', outcome: 'failed' })).toBe(1);
      expect(metrics.getCounter('cycles', { role: 'product', outcome: 'success' })).toBe(1);
      expect(metrics.getCounter('cycles')).toBe(3);
    });
  });

  describe('Histogram', () => {
    it('should record values and compute stats', () => {
      const metrics = createMetrics();

      metrics.recordHistogram('duration', 1.0);
      metrics.recordHistogram('duration', 2.0);
      metrics.recordHistogram('duration', 3.0);
      metrics.recordHistogram('duration', 4.0);
      metrics.recordHistogram('duration', 5.0);

      const stats = metrics.getHistogramStats('duration');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(5);
      expect(stats!.sum).toBe(15);
      expect(stats!.min).toBe(1);
      expect(stats!.max).toBe(5);
      expect(stats!.mean).toBe(3);
      expect(stats!.p50).toBe(3);
    });

    it('should record values with labels', () => {
      const metrics = createMetrics();

      metrics.recordHistogram('duration', 1.0, { role: 'frontier' });
      metrics.recordHistogram('duration', 2.0, { role: 'frontier' });
      metrics.recordHistogram('duration', 10.0, { role: 'product' });

      const frontierStats = metrics.getHistogramStats('duration', { role: 'frontier' });
      expect(frontierStats).not.toBeNull();
      expect(frontierStats!.count).toBe(2);
      expect(frontierStats!.mean).toBe(1.5);

      const productStats = metrics.getHistogramStats('duration', { role: 'product' });
      expect(productStats).not.toBeNull();
      expect(productStats!.count).toBe(1);
      expect(productStats!.mean).toBe(10);

      // Total stats include all values
      const totalStats = metrics.getHistogramStats('duration');
      expect(totalStats!.count).toBe(3);
    });

    it('should return null for non-existent histogram', () => {
      const metrics = createMetrics();
      expect(metrics.getHistogramStats('does_not_exist')).toBeNull();
    });

    it('should return null for empty histogram', () => {
      const metrics = createMetrics();
      // Access creates the histogram but with no values
      expect(metrics.getHistogramStats('empty', { label: 'missing' })).toBeNull();
    });

    it('should compute percentiles correctly', () => {
      const metrics = createMetrics();

      // Add 100 values from 1 to 100
      for (let i = 1; i <= 100; i++) {
        metrics.recordHistogram('latency', i);
      }

      const stats = metrics.getHistogramStats('latency');
      expect(stats!.count).toBe(100);
      expect(stats!.p50).toBe(50);
      expect(stats!.p90).toBe(90);
      expect(stats!.p99).toBe(99);
    });
  });

  describe('Gauge', () => {
    it('should set and get gauge value', () => {
      const metrics = createMetrics();

      metrics.setGauge('memory_version', 45);
      expect(metrics.getGauge('memory_version')).toBe(45);

      metrics.setGauge('memory_version', 46);
      expect(metrics.getGauge('memory_version')).toBe(46);
    });

    it('should support labeled gauges', () => {
      const metrics = createMetrics();

      metrics.setGauge('active_sessions', 5, { repo: 'ada' });
      metrics.setGauge('active_sessions', 3, { repo: 'payflow' });

      expect(metrics.getGauge('active_sessions', { repo: 'ada' })).toBe(5);
      expect(metrics.getGauge('active_sessions', { repo: 'payflow' })).toBe(3);
      expect(metrics.getGauge('active_sessions')).toBe(0); // Default gauge value
    });

    it('should return null for non-existent gauge', () => {
      const metrics = createMetrics();
      expect(metrics.getGauge('does_not_exist')).toBeNull();
      expect(metrics.getGauge('does_not_exist', { label: 'value' })).toBeNull();
    });
  });

  describe('listMetrics', () => {
    it('should list all registered metrics', () => {
      const metrics = createMetrics();

      metrics.incrementCounter('counter1');
      metrics.incrementCounter('counter2');
      metrics.recordHistogram('histogram1', 1);
      metrics.setGauge('gauge1', 10);

      const list = metrics.listMetrics();
      expect(list).toContain('counter:counter1');
      expect(list).toContain('counter:counter2');
      expect(list).toContain('histogram:histogram1');
      expect(list).toContain('gauge:gauge1');
      expect(list.length).toBe(4);
    });

    it('should return sorted list', () => {
      const metrics = createMetrics();

      metrics.setGauge('z_gauge', 1);
      metrics.incrementCounter('a_counter');
      metrics.recordHistogram('m_histogram', 1);

      const list = metrics.listMetrics();
      expect(list[0]).toBe('counter:a_counter');
      expect(list[1]).toBe('gauge:z_gauge');
      expect(list[2]).toBe('histogram:m_histogram');
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      const metrics = createMetrics();

      metrics.incrementCounter('counter', undefined, 100);
      metrics.recordHistogram('histogram', 50);
      metrics.setGauge('gauge', 25);

      metrics.reset();

      expect(metrics.getCounter('counter')).toBe(0);
      expect(metrics.getHistogramStats('histogram')).toBeNull();
      expect(metrics.getGauge('gauge')).toBeNull();
      expect(metrics.listMetrics()).toEqual([]);
    });
  });

  describe('export', () => {
    it('should export all metrics as snapshot', () => {
      const metrics = createMetrics();

      metrics.incrementCounter('cycles_total', { role: 'frontier' }, 5);
      metrics.recordHistogram('cycle_duration', 2.5, { role: 'frontier' });
      metrics.recordHistogram('cycle_duration', 3.5, { role: 'frontier' });
      metrics.setGauge('memory_version', 46);

      const snapshot = metrics.export();

      expect(snapshot.timestamp).toBeDefined();
      expect(new Date(snapshot.timestamp).getTime()).toBeGreaterThan(0);

      // Counters
      expect(snapshot.counters.cycles_total.value).toBe(5);
      expect(snapshot.counters.cycles_total.labeled['role=frontier']).toBe(5);

      // Histograms
      expect(snapshot.histograms.cycle_duration.stats.count).toBe(2);
      expect(snapshot.histograms.cycle_duration.stats.mean).toBe(3);
      expect(snapshot.histograms.cycle_duration.labeled['role=frontier'].count).toBe(2);

      // Gauges
      expect(snapshot.gauges.memory_version.value).toBe(46);
    });
  });

  describe('import', () => {
    it('should import counter and gauge values', () => {
      const metrics = createMetrics();

      const snapshot = {
        timestamp: new Date().toISOString(),
        counters: {
          cycles_total: { value: 100, labeled: { 'role=frontier': 60, 'role=product': 40 } },
        },
        histograms: {},
        gauges: {
          memory_version: { value: 45, labeled: {} },
        },
      };

      metrics.import(snapshot);

      expect(metrics.getCounter('cycles_total')).toBe(100);
      expect(metrics.getCounter('cycles_total', { role: 'frontier' })).toBe(60);
      expect(metrics.getCounter('cycles_total', { role: 'product' })).toBe(40);
      expect(metrics.getGauge('memory_version')).toBe(45);
    });
  });

  describe('global metrics', () => {
    it('should return same instance on repeated calls', () => {
      const metrics1 = getMetrics();
      const metrics2 = getMetrics();
      expect(metrics1).toBe(metrics2);
    });

    it('should allow setting custom global metrics', () => {
      const customMetrics = createMetrics();
      setMetrics(customMetrics);
      expect(getMetrics()).toBe(customMetrics);
    });

    it('should reset to new instance after resetMetrics', () => {
      const metrics1 = getMetrics();
      resetMetrics();
      const metrics2 = getMetrics();
      expect(metrics1).not.toBe(metrics2);
    });
  });

  describe('createMetricsFromEnv', () => {
    it('should use environment variables', () => {
      const originalPath = process.env.ADA_METRICS_PATH;
      const originalInterval = process.env.ADA_METRICS_INTERVAL;

      process.env.ADA_METRICS_PATH = '/tmp/test-metrics.json';
      process.env.ADA_METRICS_INTERVAL = '30';

      const metrics = createMetricsFromEnv();
      // Just verify it doesn't throw
      expect(metrics).toBeDefined();

      // Restore
      if (originalPath !== undefined) {
        process.env.ADA_METRICS_PATH = originalPath;
      } else {
        delete process.env.ADA_METRICS_PATH;
      }
      if (originalInterval !== undefined) {
        process.env.ADA_METRICS_INTERVAL = originalInterval;
      } else {
        delete process.env.ADA_METRICS_INTERVAL;
      }
    });
  });
});

describe('ADA_METRICS constants', () => {
  it('should define standard metric names', () => {
    expect(ADA_METRICS.CYCLES_TOTAL).toBe('ada_cycles_total');
    expect(ADA_METRICS.CYCLES_SUCCESS).toBe('ada_cycles_success');
    expect(ADA_METRICS.CYCLES_FAILED).toBe('ada_cycles_failed');
    expect(ADA_METRICS.CYCLE_DURATION_SECONDS).toBe('ada_cycle_duration_seconds');
    expect(ADA_METRICS.LLM_TOKENS_TOTAL).toBe('ada_llm_tokens_total');
    expect(ADA_METRICS.MEMORY_VERSION).toBe('ada_memory_version');
    expect(ADA_METRICS.GIT_COMMITS).toBe('ada_git_commits');
  });

  it('should define standard label names', () => {
    expect(ADA_LABELS.ROLE).toBe('role');
    expect(ADA_LABELS.REPO).toBe('repo');
    expect(ADA_LABELS.OUTCOME).toBe('outcome');
    expect(ADA_LABELS.MODEL).toBe('model');
  });
});

describe('Metrics persistence', () => {
  let tempDir: string;
  let metricsPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ada-metrics-test-'));
    metricsPath = path.join(tempDir, 'metrics.json');
  });

  afterEach(() => {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should save metrics to file', () => {
    const metrics = createMetrics({ persistPath: metricsPath }) as unknown as {
      save(): void;
    } & ReturnType<typeof createMetrics>;

    metrics.incrementCounter('test_counter', undefined, 42);
    metrics.save();

    expect(fs.existsSync(metricsPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
    expect(content.counters.test_counter.value).toBe(42);
  });

  it('should load metrics from file on create', () => {
    // First, create and save metrics
    const metrics1 = createMetrics({ persistPath: metricsPath }) as unknown as {
      save(): void;
      stopAutoSave(saveNow?: boolean): void;
    } & ReturnType<typeof createMetrics>;
    metrics1.incrementCounter('loaded_counter', undefined, 99);
    metrics1.save();
    metrics1.stopAutoSave(false);

    // Create new instance - should load the saved data
    const metrics2 = createMetrics({ persistPath: metricsPath, loadOnCreate: true });
    expect(metrics2.getCounter('loaded_counter')).toBe(99);
  });

  it('should not load when loadOnCreate is false', () => {
    // Create metrics file
    fs.writeFileSync(metricsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      counters: { existing: { value: 50, labeled: {} } },
      histograms: {},
      gauges: {},
    }));

    const metrics = createMetrics({ persistPath: metricsPath, loadOnCreate: false });
    expect(metrics.getCounter('existing')).toBe(0);
  });
});

describe('Metrics integration', () => {
  it('should support typical dispatch cycle metrics pattern', () => {
    const metrics = createMetrics();
    const role = 'frontier';
    const repo = 'ada';

    // Cycle start
    const cycleStart = Date.now();
    metrics.incrementCounter(ADA_METRICS.CYCLES_TOTAL, { [ADA_LABELS.ROLE]: role });

    // Simulate some work
    const workDuration = 0.5; // seconds

    // Cycle complete - success
    const cycleDuration = (Date.now() - cycleStart) / 1000 + workDuration;
    metrics.incrementCounter(ADA_METRICS.CYCLES_SUCCESS, { [ADA_LABELS.ROLE]: role });
    metrics.recordHistogram(ADA_METRICS.CYCLE_DURATION_SECONDS, cycleDuration, {
      [ADA_LABELS.ROLE]: role,
      [ADA_LABELS.REPO]: repo,
    });

    // Update gauges
    metrics.setGauge(ADA_METRICS.MEMORY_VERSION, 46);

    // Verify
    expect(metrics.getCounter(ADA_METRICS.CYCLES_TOTAL, { [ADA_LABELS.ROLE]: role })).toBe(1);
    expect(metrics.getCounter(ADA_METRICS.CYCLES_SUCCESS, { [ADA_LABELS.ROLE]: role })).toBe(1);
    expect(metrics.getGauge(ADA_METRICS.MEMORY_VERSION)).toBe(46);

    const durationStats = metrics.getHistogramStats(ADA_METRICS.CYCLE_DURATION_SECONDS, {
      [ADA_LABELS.ROLE]: role,
      [ADA_LABELS.REPO]: repo,
    });
    expect(durationStats).not.toBeNull();
    expect(durationStats!.count).toBe(1);
  });

  it('should track LLM usage metrics', () => {
    const metrics = createMetrics();
    const model = 'sonnet';

    // Record LLM call
    metrics.incrementCounter(ADA_METRICS.LLM_CALLS_TOTAL, { [ADA_LABELS.MODEL]: model });
    metrics.incrementCounter(ADA_METRICS.LLM_TOKENS_INPUT, { [ADA_LABELS.MODEL]: model }, 1500);
    metrics.incrementCounter(ADA_METRICS.LLM_TOKENS_OUTPUT, { [ADA_LABELS.MODEL]: model }, 500);
    metrics.recordHistogram(ADA_METRICS.LLM_LATENCY_SECONDS, 2.3, { [ADA_LABELS.MODEL]: model });

    // Verify
    expect(metrics.getCounter(ADA_METRICS.LLM_CALLS_TOTAL, { [ADA_LABELS.MODEL]: model })).toBe(1);
    expect(metrics.getCounter(ADA_METRICS.LLM_TOKENS_INPUT, { [ADA_LABELS.MODEL]: model })).toBe(1500);
    expect(metrics.getCounter(ADA_METRICS.LLM_TOKENS_OUTPUT, { [ADA_LABELS.MODEL]: model })).toBe(500);

    const latencyStats = metrics.getHistogramStats(ADA_METRICS.LLM_LATENCY_SECONDS, { [ADA_LABELS.MODEL]: model });
    expect(latencyStats!.mean).toBe(2.3);
  });

  it('should track error metrics', () => {
    const metrics = createMetrics();

    // Simulate various errors
    metrics.incrementCounter(ADA_METRICS.ERRORS_TOTAL, { [ADA_LABELS.ERROR_TYPE]: 'git_push_failed' });
    metrics.incrementCounter(ADA_METRICS.ERRORS_TOTAL, { [ADA_LABELS.ERROR_TYPE]: 'git_push_failed' });
    metrics.incrementCounter(ADA_METRICS.ERRORS_TOTAL, { [ADA_LABELS.ERROR_TYPE]: 'llm_timeout' });

    expect(metrics.getCounter(ADA_METRICS.ERRORS_TOTAL)).toBe(3);
    expect(metrics.getCounter(ADA_METRICS.ERRORS_TOTAL, { [ADA_LABELS.ERROR_TYPE]: 'git_push_failed' })).toBe(2);
    expect(metrics.getCounter(ADA_METRICS.ERRORS_TOTAL, { [ADA_LABELS.ERROR_TYPE]: 'llm_timeout' })).toBe(1);
  });
});
