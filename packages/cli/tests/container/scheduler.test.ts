/**
 * Container Scheduler Tests
 *
 * Unit tests for cron-based dispatch scheduler.
 * Per QA test plan C716: 6 tests for cron scheduler.
 *
 * @author ⚙️ Engineering | Cycle 717 | Phase 1 Container MVP
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startScheduler,
  stopScheduler,
  parseIntervalToMs,
  getSchedulerStatus,
  resetSchedulerState,
} from '../../src/container/scheduler.js';

describe('Container Cron Scheduler', () => {
  beforeEach(() => {
    resetSchedulerState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopScheduler();
    vi.useRealTimers();
  });

  describe('Interval Parsing', () => {
    it('parses 15m interval correctly', () => {
      expect(parseIntervalToMs('15m')).toBe(15 * 60 * 1000);
    });

    it('parses 30m interval correctly', () => {
      expect(parseIntervalToMs('30m')).toBe(30 * 60 * 1000);
    });

    it('parses 1h interval correctly', () => {
      expect(parseIntervalToMs('1h')).toBe(60 * 60 * 1000);
    });

    it('defaults to 15m for invalid format', () => {
      expect(parseIntervalToMs('invalid')).toBe(15 * 60 * 1000);
    });
  });

  describe('Scheduler Lifecycle', () => {
    it('schedules first dispatch after initial delay', async () => {
      const onDispatch = vi.fn().mockResolvedValue(undefined);

      startScheduler({
        interval: '15m',
        onDispatch,
        initialDelayMs: 1000, // 1 second for testing
      });

      // Should not dispatch immediately
      expect(onDispatch).not.toHaveBeenCalled();

      // Fast-forward past initial delay
      await vi.advanceTimersByTimeAsync(1000);

      expect(onDispatch).toHaveBeenCalledTimes(1);
    });

    it('schedules subsequent dispatches at configured interval', async () => {
      const onDispatch = vi.fn().mockResolvedValue(undefined);

      startScheduler({
        interval: '15m',
        onDispatch,
        initialDelayMs: 0,
      });

      // First dispatch
      await vi.advanceTimersByTimeAsync(0);
      expect(onDispatch).toHaveBeenCalledTimes(1);

      // Wait for interval (15 minutes)
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
      expect(onDispatch).toHaveBeenCalledTimes(2);

      // Another interval
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
      expect(onDispatch).toHaveBeenCalledTimes(3);
    });

    it('continues scheduling after dispatch failure', async () => {
      const onDispatch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValue(undefined);
      const onError = vi.fn();

      startScheduler({
        interval: '15m',
        onDispatch,
        onError,
        initialDelayMs: 0,
      });

      // First dispatch (fails)
      await vi.advanceTimersByTimeAsync(0);
      expect(onDispatch).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);

      // Second dispatch (succeeds)
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
      expect(onDispatch).toHaveBeenCalledTimes(2);
    });

    it('stops scheduling when stopScheduler is called', async () => {
      const onDispatch = vi.fn().mockResolvedValue(undefined);

      startScheduler({
        interval: '15m',
        onDispatch,
        initialDelayMs: 0,
      });

      await vi.advanceTimersByTimeAsync(0);
      expect(onDispatch).toHaveBeenCalledTimes(1);

      stopScheduler();

      // No more dispatches
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
      expect(onDispatch).toHaveBeenCalledTimes(1);
    });

    it('reports running status correctly', () => {
      const onDispatch = vi.fn().mockResolvedValue(undefined);

      expect(getSchedulerStatus().running).toBe(false);

      startScheduler({
        interval: '15m',
        onDispatch,
      });

      expect(getSchedulerStatus().running).toBe(true);
      expect(getSchedulerStatus().interval).toBe('15m');

      stopScheduler();

      expect(getSchedulerStatus().running).toBe(false);
    });
  });
});
