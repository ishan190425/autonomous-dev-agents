/**
 * @ada/core/terminal — Terminal Mode Module
 *
 * Shell-based benchmark execution for ADA dispatch cycles.
 * Provides shell detection, command execution, heat signal collection,
 * and visualization utilities.
 *
 * @see docs/engineering/terminal-mode-technical-spec.md
 * @see Issue #125 — Terminal Mode for shell-based benchmarks
 * @packageDocumentation
 */

// Types — Core interfaces for Terminal Mode
export type {
  // Shell Detection
  ShellType,
  ShellConfig,
  ShellDetectorOptions,
  // Command Execution
  ExecutionResult,
  ExecutionOptions,
  // Heat Signals
  HeatSignalType,
  HeatSignal,
  CycleSummary,
  // Heat Storage
  HeatEntity,
  HeatStore,
  HeatStorageOptions,
  // Heat Display
  HeatDisplayMode,
  HeatTier,
  // Benchmarks
  CommandCost,
  TaskCost,
  BenchmarkComparison,
  BenchmarkResult,
} from './types.js';

export { TerminalError } from './types.js';

// Shell Detector — Auto-detection and validation
export {
  detectShell,
  validateShell,
  getShellType,
  isSupported,
} from './shell-detector.js';

// Signal Collector — Per-cycle heat signal batching
export {
  SignalCollector,
  createSignalCollector,
} from './signal-collector.js';

// Heat Display — Visualization utilities
export {
  HEAT_TIERS,
  getHeatTier,
  formatHeatDisplay,
  detectHeatDisplayMode,
  generateHeatBar,
  formatHeatWithBar,
} from './heat-display.js';
