/**
 * Container Dispatch Scheduler
 *
 * Cron-based scheduler for automated dispatch cycles.
 * Configurable interval with first dispatch within 2 minutes of start per Product spec C714.
 *
 * @module container/scheduler
 * @author ⚙️ Engineering | Cycle 717 | Phase 1 Container MVP
 */

import { recordCycleComplete, markHealthy } from './health.js';

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  /** Dispatch interval (e.g., '15m', '30m', '1h') */
  interval: string;

  /** Callback to execute on each dispatch cycle */
  onDispatch: () => Promise<void>;

  /** Optional callback on dispatch failure */
  onError?: (error: Error) => void;

  /** Initial delay before first dispatch in ms (default: 30000 = 30s) */
  initialDelayMs?: number;
}

/**
 * Scheduler state
 */
interface SchedulerState {
  running: boolean;
  intervalId: NodeJS.Timeout | null;
  initialTimeoutId: NodeJS.Timeout | null;
  dispatchCount: number;
  lastDispatchTime: Date | null;
  config: SchedulerConfig | null;
}

let state: SchedulerState = {
  running: false,
  intervalId: null,
  initialTimeoutId: null,
  dispatchCount: 0,
  lastDispatchTime: null,
  config: null,
};

/**
 * Parses interval string to milliseconds
 *
 * @param interval - Interval string (e.g., '15m', '30m', '1h')
 * @returns Interval in milliseconds
 */
export function parseIntervalToMs(interval: string): number {
  const match = interval.match(/^(\d+)(m|h)$/);
  if (!match || !match[1] || !match[2]) {
    // Default to 15 minutes if invalid
    return 15 * 60 * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit: string = match[2];

  switch (unit) {
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
}

/**
 * Executes a single dispatch cycle
 */
async function executeDispatch(): Promise<void> {
  if (!state.config) return;

  const cycleNum = state.dispatchCount + 1;

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Starting dispatch cycle ${cycleNum}`,
    })
  );

  try {
    await state.config.onDispatch();

    state.dispatchCount++;
    state.lastDispatchTime = new Date();
    recordCycleComplete();

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Dispatch cycle ${cycleNum} completed successfully`,
      })
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Dispatch cycle ${cycleNum} failed`,
        error: err.message,
      })
    );

    // Call error handler but don't throw - container should stay up
    state.config.onError?.(err);
  }
}

/**
 * Starts the dispatch scheduler
 *
 * @param config - Scheduler configuration
 */
export function startScheduler(config: SchedulerConfig): void {
  if (state.running) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Scheduler already running',
      })
    );
    return;
  }

  state.config = config;
  state.running = true;

  const intervalMs = parseIntervalToMs(config.interval);
  const initialDelayMs = config.initialDelayMs ?? 30000; // Default 30s

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Starting dispatch scheduler',
      interval: config.interval,
      intervalMs,
      initialDelayMs,
    })
  );

  // Schedule first dispatch (within 2 minutes per spec)
  state.initialTimeoutId = globalThis.setTimeout(async () => {
    markHealthy(); // Mark container as healthy after startup
    await executeDispatch();

    // Schedule recurring dispatches
    state.intervalId = globalThis.setInterval(executeDispatch, intervalMs);
  }, initialDelayMs);
}

/**
 * Stops the dispatch scheduler
 */
export function stopScheduler(): void {
  if (!state.running) {
    return;
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Stopping dispatch scheduler',
      totalDispatches: state.dispatchCount,
    })
  );

  if (state.initialTimeoutId) {
    globalThis.clearTimeout(state.initialTimeoutId);
    state.initialTimeoutId = null;
  }

  if (state.intervalId) {
    globalThis.clearInterval(state.intervalId);
    state.intervalId = null;
  }

  state.running = false;
}

/**
 * Gets scheduler status
 */
export function getSchedulerStatus(): {
  running: boolean;
  dispatchCount: number;
  lastDispatchTime: Date | null;
  interval: string | null;
} {
  return {
    running: state.running,
    dispatchCount: state.dispatchCount,
    lastDispatchTime: state.lastDispatchTime,
    interval: state.config?.interval ?? null,
  };
}

/**
 * Resets scheduler state (for testing)
 */
export function resetSchedulerState(): void {
  stopScheduler();
  state = {
    running: false,
    intervalId: null,
    initialTimeoutId: null,
    dispatchCount: 0,
    lastDispatchTime: null,
    config: null,
  };
}
