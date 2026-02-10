/**
 * @ada/core/terminal — Terminal Mode Types
 *
 * TypeScript interfaces for Terminal Mode shell-based benchmarks.
 * Based on Frontier's technical implementation spec (C339).
 *
 * @see docs/engineering/terminal-mode-technical-spec.md
 * @packageDocumentation
 */

// ============================================================================
// Shell Detection Types (§2 — Shell Detector)
// ============================================================================

/**
 * Supported shell types for Terminal Mode.
 * Limited to POSIX-compatible shells with reliable command execution.
 */
export type ShellType = 'bash' | 'zsh' | 'sh';

/**
 * Configuration for the detected or specified shell.
 */
export interface ShellConfig {
  /** Absolute path to the shell binary (e.g., /bin/bash) */
  path: string;
  /** Detected shell type */
  type: ShellType;
  /** Shell version string if available */
  version?: string;
  /** True if auto-detected from $SHELL, false if user-specified via --shell */
  detected: boolean;
}

/**
 * Options for shell detection.
 */
export interface ShellDetectorOptions {
  /** User-provided shell path override (--shell flag) */
  override?: string;
  /** Fallback shell if detection fails (default: /bin/bash) */
  fallback?: string;
}

// ============================================================================
// Command Execution Types (§3 — Command Executor)
// ============================================================================

/**
 * Result of a shell command execution.
 */
export interface ExecutionResult {
  /** The command that was executed */
  command: string;
  /** Process exit code (0 = success) */
  exitCode: number;
  /** Captured stdout output */
  stdout: string;
  /** Captured stderr output */
  stderr: string;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** True if output was truncated due to limits */
  truncated: boolean;
}

/**
 * Options for command execution.
 */
export interface ExecutionOptions {
  /** Shell configuration to use */
  shell: ShellConfig;
  /** Timeout in milliseconds (default: 60000) */
  timeout?: number;
  /** Maximum output lines before truncation (default: 50) */
  maxOutputLines?: number;
  /** Maximum output bytes before truncation (default: 10240) */
  maxOutputBytes?: number;
  /** Callback for real-time stdout streaming */
  onStdout?: (line: string) => void;
  /** Callback for real-time stderr streaming */
  onStderr?: (line: string) => void;
  /** Working directory for command execution */
  cwd?: string;
  /** Additional environment variables */
  env?: Record<string, string>;
}

// ============================================================================
// Heat Signal Types (§4 — Signal Collector)
// ============================================================================

/**
 * Type of heat signal collected during execution.
 */
export type HeatSignalType = 'access' | 'success' | 'failure';

/**
 * A single heat signal collected during a dispatch cycle.
 */
export interface HeatSignal {
  /** Signal type indicating the nature of the interaction */
  type: HeatSignalType;
  /** Entity identifier (e.g., "agents/memory/bank.md#current-status") */
  entityId: string;
  /** Signal strength/weight (1.0 = default, negative for failures) */
  weight: number;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Command that triggered this signal (optional) */
  command?: string;
}

/**
 * Summary of signals and stats for a completed cycle.
 */
export interface CycleSummary {
  /** Dispatch cycle number */
  cycleId: number;
  /** Cycle start timestamp (Unix ms) */
  startTime: number;
  /** Cycle end timestamp (Unix ms) */
  endTime: number;
  /** Total commands executed */
  commandsExecuted: number;
  /** Commands that succeeded (exit code 0) */
  commandsSucceeded: number;
  /** Commands that failed (non-zero exit code) */
  commandsFailed: number;
  /** All collected heat signals */
  signals: HeatSignal[];
}

// ============================================================================
// Heat Storage Types (§5 — Heat Storage)
// ============================================================================

/**
 * Heat data for a single tracked entity.
 */
export interface HeatEntity {
  /** Number of times this entity was accessed */
  accessCount: number;
  /** Accumulated weight from successful interactions */
  successWeight: number;
  /** Accumulated weight from failed interactions */
  failureWeight: number;
  /** Timestamp of last access (Unix ms) */
  lastAccessMs: number;
  /** Bonus from detected usage patterns */
  patternBonus: number;
  /** Final computed heat score (0-100) */
  computed: number;
}

/**
 * Persisted heat store structure (JSON file).
 */
export interface HeatStore {
  /** Schema version for migrations */
  version: 1;
  /** ISO timestamp of last update */
  lastUpdated: string;
  /** Map of entity ID to heat data */
  entities: Record<string, HeatEntity>;
}

/**
 * Options for heat storage configuration.
 */
export interface HeatStorageOptions {
  /** Base path for heat JSON files (default: agents/memory/heat/) */
  basePath?: string;
  /** Exponential decay rate λ per hour (default: 0.1, ~7hr half-life) */
  decayRate?: number;
}

// ============================================================================
// Heat Display Types (§6 — Visualization)
// ============================================================================

/**
 * Display mode for heat visualization.
 */
export type HeatDisplayMode = 'emoji' | 'text' | 'numeric';

/**
 * Heat tier for visual categorization.
 */
export interface HeatTier {
  /** Minimum score for this tier (inclusive) */
  min: number;
  /** Emoji representation */
  emoji: string;
  /** Text representation */
  text: string;
}

// ============================================================================
// Benchmark Types (§7 — Benchmarks)
// ============================================================================

/**
 * Cost tracking for a single command.
 */
export interface CommandCost {
  /** The command that was executed */
  command: string;
  /** LLM prompt tokens consumed */
  promptTokens: number;
  /** LLM completion tokens generated */
  completionTokens: number;
  /** Estimated cost in USD */
  costUsd: number;
}

/**
 * Aggregated cost for a benchmark task.
 */
export interface TaskCost {
  /** Task identifier */
  taskId: string;
  /** Total tokens across all commands */
  totalTokens: number;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Per-command breakdown (stored, displayed on --verbose) */
  commands: CommandCost[];
}

/**
 * Benchmark comparison metrics for single vs multi-agent runs.
 */
export interface BenchmarkComparison {
  /** Metric name (e.g., "Tasks Completed") */
  metric: string;
  /** Single-agent result */
  singleAgent: number;
  /** Multi-agent result */
  multiAgent: number;
  /** Percentage delta (positive = improvement) */
  deltaPercent: number;
  /** Whether this delta is an improvement */
  improved: boolean;
  /** Display unit (e.g., "%", "s", "$") */
  unit: string;
}

/**
 * Complete benchmark result for a Terminal-Bench run.
 */
export interface BenchmarkResult {
  /** Benchmark suite name */
  suite: string;
  /** Run timestamp (ISO) */
  timestamp: string;
  /** Execution mode */
  mode: 'single-agent' | 'multi-agent';
  /** Tasks attempted */
  tasksAttempted: number;
  /** Tasks completed successfully */
  tasksCompleted: number;
  /** Average time per task in seconds */
  avgTimePerTask: number;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Error rate as percentage */
  errorRate: number;
  /** Per-task cost breakdown */
  taskCosts: TaskCost[];
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Terminal mode specific error.
 */
export class TerminalError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'TerminalError';
  }
}
