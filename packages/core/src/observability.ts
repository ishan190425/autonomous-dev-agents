/**
 * @ada/core — Agent Observability System
 *
 * Phase 1: Token Counter — Tracks token usage and cost per dispatch cycle.
 * Phase 2: Latency Timer — Tracks per-phase timing for performance analysis.
 *
 * Part of PLAT-003 (Agent Observability ADR).
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Token usage for a single phase or operation */
export interface TokenUsage {
  /** Input tokens consumed */
  readonly inputTokens: number;
  /** Output tokens generated */
  readonly outputTokens: number;
  /** Total tokens (input + output) */
  readonly totalTokens: number;
}

/** Cost in USD for a usage record */
export interface TokenCost {
  /** Input token cost in USD */
  readonly inputCost: number;
  /** Output token cost in USD */
  readonly outputCost: number;
  /** Total cost in USD */
  readonly totalCost: number;
}

/** Model pricing per 1M tokens */
export interface ModelPricing {
  /** Model identifier */
  readonly model: string;
  /** Input cost per 1M tokens in USD */
  readonly inputPer1M: number;
  /** Output cost per 1M tokens in USD */
  readonly outputPer1M: number;
}

/** Dispatch phases that can be tracked */
export type DispatchPhase =
  | 'context_load'
  | 'situational_awareness'
  | 'action_selection'
  | 'action_execution'
  | 'memory_update'
  | 'compression_check'
  | 'evolution_check'
  | 'state_update';

/** Latency metrics for a single phase (Phase 2) */
export interface PhaseLatency {
  /** ISO timestamp when phase started */
  readonly startedAt: string;
  /** ISO timestamp when phase ended */
  readonly endedAt: string;
  /** Duration in milliseconds */
  readonly durationMs: number;
}

/** Aggregated latency statistics for a phase across cycles */
export interface PhaseLatencyStats {
  /** Number of cycles with data for this phase */
  readonly count: number;
  /** Total duration across all cycles (ms) */
  readonly totalMs: number;
  /** Average duration (ms) */
  readonly avgMs: number;
  /** Minimum duration (ms) */
  readonly minMs: number;
  /** Maximum duration (ms) */
  readonly maxMs: number;
}

/** Token metrics for a single dispatch cycle */
export interface CycleMetrics {
  /** Cycle number */
  readonly cycle: number;
  /** Role that acted */
  readonly role: string;
  /** Model used */
  readonly model: string;
  /** ISO timestamp when cycle started */
  readonly startedAt: string;
  /** ISO timestamp when cycle completed */
  readonly completedAt: string;
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Token usage per phase */
  readonly phases: Partial<Record<DispatchPhase, TokenUsage>>;
  /** Latency per phase (Phase 2) */
  readonly latency?: Partial<Record<DispatchPhase, PhaseLatency>>;
  /** Aggregated token usage */
  readonly totals: TokenUsage;
  /** Estimated cost */
  readonly cost: TokenCost;
  /** Whether the cycle succeeded */
  readonly success: boolean;
  /** Error message if failed */
  readonly error?: string;
}

/** Aggregated metrics across multiple cycles */
export interface AggregatedMetrics {
  /** Total cycles tracked */
  readonly totalCycles: number;
  /** Successful cycles */
  readonly successfulCycles: number;
  /** Failed cycles */
  readonly failedCycles: number;
  /** Total tokens used */
  readonly totalTokens: TokenUsage;
  /** Total cost */
  readonly totalCost: TokenCost;
  /** Average tokens per cycle */
  readonly avgTokensPerCycle: TokenUsage;
  /** Average cost per cycle */
  readonly avgCostPerCycle: TokenCost;
  /** Per-role breakdown */
  readonly byRole: Record<string, { cycles: number; tokens: TokenUsage; cost: TokenCost }>;
  /** First cycle tracked */
  readonly firstCycle: number;
  /** Last cycle tracked */
  readonly lastCycle: number;
  /** Time range */
  readonly timeRange: {
    readonly start: string;
    readonly end: string;
  };
  /** Average cycle duration in milliseconds */
  readonly avgDurationMs: number;
  /** Per-phase latency statistics (Phase 2) */
  readonly phaseLatency?: Partial<Record<DispatchPhase, PhaseLatencyStats>>;
}

/** Stored metrics state */
export interface MetricsState {
  /** Version for future migrations */
  readonly version: 1;
  /** All tracked cycles (kept in rolling window) */
  readonly cycles: CycleMetrics[];
  /** Maximum cycles to keep in state */
  readonly maxCycles: number;
}

// ─── Pricing Data ────────────────────────────────────────────────────────────

/**
 * Known model pricing (per 1M tokens).
 * Updated as of February 2026.
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic Claude models
  'claude-3-5-sonnet-20241022': { model: 'claude-3-5-sonnet', inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-3-5-haiku-20241022': { model: 'claude-3-5-haiku', inputPer1M: 0.8, outputPer1M: 4.0 },
  'claude-3-opus-20240229': { model: 'claude-3-opus', inputPer1M: 15.0, outputPer1M: 75.0 },
  'claude-4-sonnet': { model: 'claude-4-sonnet', inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-4-opus': { model: 'claude-4-opus', inputPer1M: 15.0, outputPer1M: 75.0 },
  // OpenAI models
  'gpt-4o': { model: 'gpt-4o', inputPer1M: 2.5, outputPer1M: 10.0 },
  'gpt-4o-mini': { model: 'gpt-4o-mini', inputPer1M: 0.15, outputPer1M: 0.6 },
  'gpt-4-turbo': { model: 'gpt-4-turbo', inputPer1M: 10.0, outputPer1M: 30.0 },
  'o1-preview': { model: 'o1-preview', inputPer1M: 15.0, outputPer1M: 60.0 },
  'o1-mini': { model: 'o1-mini', inputPer1M: 3.0, outputPer1M: 12.0 },
  // Default fallback (key is a reserved word, but we use DEFAULT_PRICING constant instead)
};

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * Create an empty TokenUsage object.
 */
export function emptyUsage(): TokenUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

/**
 * Create an empty TokenCost object.
 */
export function emptyCost(): TokenCost {
  return { inputCost: 0, outputCost: 0, totalCost: 0 };
}

/**
 * Add two TokenUsage objects together.
 */
export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

/**
 * Add two TokenCost objects together.
 */
export function addCost(a: TokenCost, b: TokenCost): TokenCost {
  return {
    inputCost: a.inputCost + b.inputCost,
    outputCost: a.outputCost + b.outputCost,
    totalCost: a.totalCost + b.totalCost,
  };
}

/**
 * Calculate cost from token usage and model pricing.
 */
export function calculateCost(usage: TokenUsage, pricing: ModelPricing): TokenCost {
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPer1M;
  return {
    inputCost: Math.round(inputCost * 1_000_000) / 1_000_000, // 6 decimal precision
    outputCost: Math.round(outputCost * 1_000_000) / 1_000_000,
    totalCost: Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000,
  };
}

/**
 * Get pricing for a model, with fallback to default.
 */
/** Default pricing when model is unknown */
const DEFAULT_PRICING: ModelPricing = { model: 'default', inputPer1M: 3.0, outputPer1M: 15.0 };

export function getPricing(model: string): ModelPricing {
  // Try exact match first
  const exactMatch = MODEL_PRICING[model];
  if (exactMatch) {
    return exactMatch;
  }
  // Try prefix matching (e.g., "claude-3-5-sonnet" matches "claude-3-5-sonnet-*")
  const modelLower = model.toLowerCase();
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (modelLower.startsWith(key.toLowerCase()) || key.toLowerCase().startsWith(modelLower)) {
      return pricing;
    }
  }
  // Fallback to default
  return DEFAULT_PRICING;
}

/**
 * Divide usage by a count for averaging.
 */
export function divideUsage(usage: TokenUsage, count: number): TokenUsage {
  if (count === 0) return emptyUsage();
  return {
    inputTokens: Math.round(usage.inputTokens / count),
    outputTokens: Math.round(usage.outputTokens / count),
    totalTokens: Math.round(usage.totalTokens / count),
  };
}

/**
 * Divide cost by a count for averaging.
 */
export function divideCost(cost: TokenCost, count: number): TokenCost {
  if (count === 0) return emptyCost();
  return {
    inputCost: Math.round((cost.inputCost / count) * 1_000_000) / 1_000_000,
    outputCost: Math.round((cost.outputCost / count) * 1_000_000) / 1_000_000,
    totalCost: Math.round((cost.totalCost / count) * 1_000_000) / 1_000_000,
  };
}

// ─── Cycle Tracker ───────────────────────────────────────────────────────────

/** Active phase timer state */
interface PhaseTimer {
  readonly phase: DispatchPhase;
  readonly startedAt: Date;
}

/**
 * Tracks token usage and latency during a single dispatch cycle.
 *
 * Create at the start of a cycle, record usage per phase,
 * optionally use startPhase/endPhase for timing, then finalize.
 *
 * Phase 1: Token tracking via recordPhase()
 * Phase 2: Latency tracking via startPhase()/endPhase()
 */
export class CycleTracker {
  private readonly cycle: number;
  private readonly role: string;
  private readonly model: string;
  private readonly startedAt: Date;
  private readonly phases: Partial<Record<DispatchPhase, TokenUsage>> = {};
  private readonly latency: Partial<Record<DispatchPhase, PhaseLatency>> = {};
  private activeTimer: PhaseTimer | null = null;
  private finalized = false;

  constructor(cycle: number, role: string, model: string = 'default') {
    this.cycle = cycle;
    this.role = role;
    this.model = model;
    this.startedAt = new Date();
  }

  /**
   * Record token usage for a specific phase.
   * Call multiple times for the same phase to accumulate.
   */
  recordPhase(phase: DispatchPhase, inputTokens: number, outputTokens: number): void {
    if (this.finalized) {
      throw new Error('Cannot record after finalization');
    }
    const existing = this.phases[phase] ?? emptyUsage();
    const additional: TokenUsage = {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
    this.phases[phase] = addUsage(existing, additional);
  }

  /**
   * Start timing a phase (Phase 2 — Latency Timer).
   * Call endPhase() when the phase completes.
   * Only one phase can be active at a time.
   */
  startPhase(phase: DispatchPhase): void {
    if (this.finalized) {
      throw new Error('Cannot start phase after finalization');
    }
    if (this.activeTimer !== null) {
      throw new Error(`Phase '${this.activeTimer.phase}' is already active. Call endPhase() first.`);
    }
    this.activeTimer = { phase, startedAt: new Date() };
  }

  /**
   * End timing the current phase (Phase 2 — Latency Timer).
   * Returns the phase latency for convenience.
   */
  endPhase(): PhaseLatency {
    if (this.finalized) {
      throw new Error('Cannot end phase after finalization');
    }
    if (this.activeTimer === null) {
      throw new Error('No phase is currently active. Call startPhase() first.');
    }

    const endedAt = new Date();
    const phaseLatency: PhaseLatency = {
      startedAt: this.activeTimer.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: endedAt.getTime() - this.activeTimer.startedAt.getTime(),
    };

    this.latency[this.activeTimer.phase] = phaseLatency;
    this.activeTimer = null;
    return phaseLatency;
  }

  /**
   * Check if a phase timer is currently active.
   */
  isPhaseActive(): boolean {
    return this.activeTimer !== null;
  }

  /**
   * Get the currently active phase, if any.
   */
  getActivePhase(): DispatchPhase | null {
    return this.activeTimer?.phase ?? null;
  }

  /**
   * Convenience method: time a phase using a callback.
   * Automatically calls startPhase before and endPhase after.
   */
  async timePhase<T>(phase: DispatchPhase, fn: () => Promise<T>): Promise<T> {
    this.startPhase(phase);
    try {
      return await fn();
    } finally {
      this.endPhase();
    }
  }

  /**
   * Synchronous version of timePhase for non-async code.
   */
  timePhaseSync<T>(phase: DispatchPhase, fn: () => T): T {
    this.startPhase(phase);
    try {
      return fn();
    } finally {
      this.endPhase();
    }
  }

  /**
   * Finalize the cycle and get complete metrics.
   * Any active phase timer is automatically ended.
   */
  finalize(success: boolean, error?: string): CycleMetrics {
    if (this.finalized) {
      throw new Error('Already finalized');
    }

    // Auto-end any active phase timer
    if (this.activeTimer !== null) {
      this.endPhase();
    }

    this.finalized = true;

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - this.startedAt.getTime();

    // Aggregate totals
    let totals = emptyUsage();
    for (const usage of Object.values(this.phases)) {
      totals = addUsage(totals, usage);
    }

    // Calculate cost
    const pricing = getPricing(this.model);
    const cost = calculateCost(totals, pricing);

    // Build result with optional latency
    const hasLatency = Object.keys(this.latency).length > 0;

    const result: CycleMetrics = {
      cycle: this.cycle,
      role: this.role,
      model: this.model,
      startedAt: this.startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs,
      phases: this.phases,
      ...(hasLatency && { latency: this.latency }),
      totals,
      cost,
      success,
    };

    // Only include error if defined (exactOptionalPropertyTypes)
    if (error !== undefined) {
      return { ...result, error };
    }
    return result;
  }
}

// ─── Metrics Manager ─────────────────────────────────────────────────────────

/** Default maximum cycles to keep in metrics state */
export const DEFAULT_MAX_CYCLES = 100;

/**
 * Manages persistent metrics state.
 *
 * Stores cycle metrics in a JSON file, provides aggregation,
 * and manages the rolling window.
 */
export class MetricsManager {
  private readonly filePath: string;
  private readonly maxCycles: number;
  private state: MetricsState | null = null;

  constructor(filePath: string, maxCycles: number = DEFAULT_MAX_CYCLES) {
    this.filePath = filePath;
    this.maxCycles = maxCycles;
  }

  /**
   * Load metrics state from disk.
   * Creates empty state if file doesn't exist.
   */
  async load(): Promise<MetricsState> {
    if (this.state) return this.state;

    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      this.state = JSON.parse(content) as MetricsState;
    } catch {
      // File doesn't exist or is invalid — start fresh
      this.state = {
        version: 1,
        cycles: [],
        maxCycles: this.maxCycles,
      };
    }
    return this.state;
  }

  /**
   * Save metrics state to disk.
   */
  async save(): Promise<void> {
    if (!this.state) {
      throw new Error('No state to save — call load() first');
    }
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  /**
   * Record a completed cycle's metrics.
   * Trims old cycles to maintain rolling window.
   */
  async record(metrics: CycleMetrics): Promise<void> {
    const state = await this.load();

    // Add new metrics
    state.cycles.push(metrics);

    // Trim to max cycles
    while (state.cycles.length > this.maxCycles) {
      state.cycles.shift();
    }

    await this.save();
  }

  /**
   * Get metrics for a specific cycle.
   */
  async getCycle(cycleNumber: number): Promise<CycleMetrics | null> {
    const state = await this.load();
    return state.cycles.find(c => c.cycle === cycleNumber) ?? null;
  }

  /**
   * Get metrics for recent cycles.
   */
  async getRecent(count: number = 10): Promise<readonly CycleMetrics[]> {
    const state = await this.load();
    return state.cycles.slice(-count);
  }

  /**
   * Get aggregated metrics across all stored cycles.
   */
  async aggregate(): Promise<AggregatedMetrics | null> {
    const state = await this.load();
    const cycles = state.cycles;

    if (cycles.length === 0) {
      return null;
    }

    let totalTokens = emptyUsage();
    let totalCost = emptyCost();
    let totalDurationMs = 0;
    let successfulCycles = 0;
    let failedCycles = 0;
    const byRole: Record<string, { cycles: number; tokens: TokenUsage; cost: TokenCost }> = {};

    // Phase latency aggregation (Phase 2)
    const phaseLatencyData: Partial<Record<DispatchPhase, { durations: number[] }>> = {};

    for (const cycle of cycles) {
      totalTokens = addUsage(totalTokens, cycle.totals);
      totalCost = addCost(totalCost, cycle.cost);
      totalDurationMs += cycle.durationMs;

      if (cycle.success) {
        successfulCycles++;
      } else {
        failedCycles++;
      }

      // Aggregate by role
      let roleStats = byRole[cycle.role];
      if (!roleStats) {
        roleStats = { cycles: 0, tokens: emptyUsage(), cost: emptyCost() };
        byRole[cycle.role] = roleStats;
      }
      roleStats.cycles++;
      roleStats.tokens = addUsage(roleStats.tokens, cycle.totals);
      roleStats.cost = addCost(roleStats.cost, cycle.cost);

      // Aggregate phase latency (Phase 2)
      if (cycle.latency) {
        for (const [phase, latency] of Object.entries(cycle.latency)) {
          const phaseKey = phase as DispatchPhase;
          let data = phaseLatencyData[phaseKey];
          if (!data) {
            data = { durations: [] };
            phaseLatencyData[phaseKey] = data;
          }
          data.durations.push(latency.durationMs);
        }
      }
    }

    const totalCycleCount = cycles.length;
    const firstCycle = cycles[0]!; // Safe: we checked cycles.length > 0 above
    const lastCycle = cycles[cycles.length - 1]!;

    // Calculate phase latency stats (Phase 2)
    const hasLatencyData = Object.keys(phaseLatencyData).length > 0;
    let phaseLatency: Partial<Record<DispatchPhase, PhaseLatencyStats>> | undefined;

    if (hasLatencyData) {
      phaseLatency = {};
      for (const [phase, data] of Object.entries(phaseLatencyData)) {
        const durations = data.durations;
        const count = durations.length;
        const totalMs = durations.reduce((sum, d) => sum + d, 0);
        phaseLatency[phase as DispatchPhase] = {
          count,
          totalMs,
          avgMs: Math.round(totalMs / count),
          minMs: Math.min(...durations),
          maxMs: Math.max(...durations),
        };
      }
    }

    return {
      totalCycles: totalCycleCount,
      successfulCycles,
      failedCycles,
      totalTokens,
      totalCost,
      avgTokensPerCycle: divideUsage(totalTokens, totalCycleCount),
      avgCostPerCycle: divideCost(totalCost, totalCycleCount),
      byRole,
      firstCycle: firstCycle.cycle,
      lastCycle: lastCycle.cycle,
      timeRange: {
        start: firstCycle.startedAt,
        end: lastCycle.completedAt,
      },
      avgDurationMs: Math.round(totalDurationMs / totalCycleCount),
      ...(phaseLatency && { phaseLatency }),
    };
  }

  /**
   * Get the file path for this manager.
   */
  getFilePath(): string {
    return this.filePath;
  }
}

// ─── Factory Functions ───────────────────────────────────────────────────────

/**
 * Create a CycleTracker for the current dispatch cycle.
 */
export function createCycleTracker(
  cycle: number,
  role: string,
  model?: string
): CycleTracker {
  return new CycleTracker(cycle, role, model);
}

/**
 * Create a MetricsManager for a project.
 *
 * @param rootDir - Project root directory
 * @param agentsDir - Agents directory (default: "agents/")
 * @param maxCycles - Maximum cycles to keep (default: 100)
 */
export function createMetricsManager(
  rootDir: string,
  agentsDir: string = 'agents/',
  maxCycles: number = DEFAULT_MAX_CYCLES
): MetricsManager {
  const metricsPath = path.join(rootDir, agentsDir, 'state', 'metrics.json');
  return new MetricsManager(metricsPath, maxCycles);
}

/**
 * Format cost for display (e.g., "$0.0234").
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Format token count for display (e.g., "1.2K", "45.6K").
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return `${tokens}`;
}

/**
 * Format duration for display (Phase 2 — Latency Timer).
 * Intelligently formats based on magnitude:
 * - < 1s: "234ms"
 * - < 60s: "12.4s"
 * - >= 60s: "2m 34s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Calculate efficiency: tokens per second (Phase 2 — Latency Timer).
 * Useful for comparing roles or models.
 */
export function calculateEfficiency(tokens: number, durationMs: number): number {
  if (durationMs === 0) return 0;
  return Math.round((tokens / durationMs) * 1000);
}
