/**
 * @ada/core/terminal — Signal Collector
 *
 * Collects heat signals during dispatch cycles for later persistence.
 * Signals are batched per-cycle and flushed to heat storage on cycle complete.
 *
 * @see docs/engineering/terminal-mode-technical-spec.md §4
 * @packageDocumentation
 */

import type {
  CycleSummary,
  ExecutionResult,
  HeatSignal,
  HeatSignalType,
} from './types.js';

/**
 * Patterns for detecting file access commands.
 */
const FILE_ACCESS_PATTERNS: readonly RegExp[] = [
  /cat\s+([^\s|>]+)/,
  /less\s+([^\s]+)/,
  /head\s+([^\s]+)/,
  /tail\s+([^\s]+)/,
  /vim?\s+([^\s]+)/,
  /nano\s+([^\s]+)/,
  /code\s+([^\s]+)/,
];

/**
 * Command stats tracked during a cycle.
 */
interface CommandStats {
  executed: number;
  succeeded: number;
  failed: number;
}

/**
 * Collects and aggregates heat signals during a dispatch cycle.
 *
 * @example
 * ```typescript
 * const collector = new SignalCollector(343);
 *
 * // Record signals during execution
 * collector.record({ type: 'access', entityId: 'agents/memory/bank.md', weight: 1.0 });
 * collector.recordCommand({ command: 'cat README.md', exitCode: 0, ... });
 *
 * // Get summary at cycle end
 * const summary = collector.getSummary();
 * await heatStorage.applySignals('files', summary.signals);
 * ```
 */
export class SignalCollector {
  private signals: HeatSignal[] = [];
  private commandStats: CommandStats = { executed: 0, succeeded: 0, failed: 0 };
  private readonly cycleId: number;
  private readonly startTime: number;

  /**
   * Create a new signal collector for a dispatch cycle.
   *
   * @param cycleId - The dispatch cycle number
   */
  constructor(cycleId: number) {
    this.cycleId = cycleId;
    this.startTime = Date.now();
  }

  /**
   * Record a heat signal manually.
   *
   * @param signal - Signal to record (timestamp added automatically)
   */
  record(signal: Omit<HeatSignal, 'timestamp'>): void {
    this.signals.push({
      ...signal,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a command execution result.
   * Updates command stats and infers heat signals from command patterns.
   *
   * @param result - Command execution result
   */
  recordCommand(result: ExecutionResult): void {
    this.commandStats.executed++;
    if (result.exitCode === 0) {
      this.commandStats.succeeded++;
    } else {
      this.commandStats.failed++;
    }

    // Auto-generate heat signals based on command patterns
    this.inferSignalsFromCommand(result);
  }

  /**
   * Generate cycle summary for flushing to heat storage.
   *
   * @returns Summary of the completed cycle
   */
  getSummary(): CycleSummary {
    return {
      cycleId: this.cycleId,
      startTime: this.startTime,
      endTime: Date.now(),
      commandsExecuted: this.commandStats.executed,
      commandsSucceeded: this.commandStats.succeeded,
      commandsFailed: this.commandStats.failed,
      signals: [...this.signals], // Return a copy
    };
  }

  /**
   * Get the current signal count.
   *
   * @returns Number of signals collected so far
   */
  getSignalCount(): number {
    return this.signals.length;
  }

  /**
   * Get the current command stats.
   *
   * @returns Command execution statistics
   */
  getCommandStats(): Readonly<CommandStats> {
    return { ...this.commandStats };
  }

  /**
   * Infer heat signals from command patterns.
   * Detects file accesses, git operations, and other recognizable patterns.
   *
   * @param result - Command execution result to analyze
   */
  private inferSignalsFromCommand(result: ExecutionResult): void {
    const { command, exitCode } = result;

    // Detect file access patterns
    for (const pattern of FILE_ACCESS_PATTERNS) {
      const match = command.match(pattern);
      if (match && match[1]) {
        this.record({
          type: 'access',
          entityId: match[1],
          weight: 1.0,
          command,
        });
      }
    }

    // Detect git operations
    if (command.startsWith('git ')) {
      const type: HeatSignalType = exitCode === 0 ? 'success' : 'failure';
      this.record({
        type,
        entityId: 'git-operations',
        weight: exitCode === 0 ? 1.0 : -0.5,
        command,
      });
    }

    // Detect npm/node operations
    if (command.startsWith('npm ') || command.startsWith('node ')) {
      const type: HeatSignalType = exitCode === 0 ? 'success' : 'failure';
      this.record({
        type,
        entityId: 'npm-operations',
        weight: exitCode === 0 ? 1.0 : -0.5,
        command,
      });
    }

    // Detect test runs
    if (
      command.includes('test') ||
      command.includes('vitest') ||
      command.includes('jest')
    ) {
      const type: HeatSignalType = exitCode === 0 ? 'success' : 'failure';
      this.record({
        type,
        entityId: 'test-runs',
        weight: exitCode === 0 ? 2.0 : -1.0, // Tests weighted higher
        command,
      });
    }
  }
}

/**
 * Create a new signal collector for a dispatch cycle.
 *
 * @param cycleId - The dispatch cycle number
 * @returns New SignalCollector instance
 */
export function createSignalCollector(cycleId: number): SignalCollector {
  return new SignalCollector(cycleId);
}
