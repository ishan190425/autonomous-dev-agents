/**
 * Terminal Mode Runner — Shell-based dispatch execution
 *
 * Provides terminal mode execution for dispatch cycles, enabling
 * shell command execution within agent actions. Required for
 * Terminal-Bench evaluation and CLI-based benchmarks.
 *
 * @see docs/engineering/terminal-mode-technical-spec.md
 * @see Issue #125 — Terminal Mode for shell-based benchmarks
 * @packageDocumentation
 */

import {
  CommandExecutor,
  createCommandExecutor,
  detectShell,
  TerminalFormatter,
  createTerminalFormatter,
  type ExecutorConfig,
  type ExecutionOptions,
  type ExecutionResult,
  type ShellConfig,
} from '@ada-ai/core';
import chalk from 'chalk';

// ============================================================================
// Types
// ============================================================================

/**
 * Terminal mode configuration options.
 */
export interface TerminalModeOptions {
  /** Maximum commands per cycle (default: 50) */
  maxCommands?: number;
  /** Per-command timeout in ms (default: 60000) */
  commandTimeout?: number;
  /** Maximum output lines before truncation (default: 200) */
  maxOutputLines?: number;
  /** Working directory (default: process.cwd()) */
  cwd?: string;
  /** User-specified shell path override */
  shell?: string;
  /** Enable verbose output */
  verbose?: boolean;
  /** JSON output mode */
  json?: boolean;
  /** Quiet mode (minimal output) */
  quiet?: boolean;
}

/**
 * Terminal action types as defined in Issue #125.
 */
export type TerminalActionType = 'execute' | 'verify' | 'diagnose' | 'complete';

/**
 * Terminal action request from agent.
 */
export interface TerminalAction {
  /** Action type */
  type: TerminalActionType;
  /** Shell command to execute (for 'execute' type) */
  command?: string;
  /** Verification command (for 'verify' type) */
  verification?: string;
  /** Role's reasoning for this action */
  explanation?: string;
}

/**
 * Terminal action result.
 */
export interface TerminalActionResult {
  /** Action type that was executed */
  type: TerminalActionType;
  /** Whether the action succeeded */
  success: boolean;
  /** Execution result (if command was run) */
  execution?: ExecutionResult;
  /** Error message (if failed) */
  error?: string;
  /** Commands remaining in budget */
  commandsRemaining: number;
}

/**
 * Terminal session result for a complete cycle.
 */
export interface TerminalSessionResult {
  /** Whether the session completed successfully */
  success: boolean;
  /** Total commands executed */
  commandsExecuted: number;
  /** Commands that succeeded */
  commandsSucceeded: number;
  /** Commands that failed */
  commandsFailed: number;
  /** Total execution time in ms */
  totalDurationMs: number;
  /** Final action result (may be undefined) */
  finalAction: string | undefined;
  /** Error message (if session failed, may be undefined) */
  error: string | undefined;
  /** Command history */
  history: ExecutionResult[];
}

// ============================================================================
// Terminal Runner Class
// ============================================================================

/**
 * Manages terminal mode execution for a dispatch cycle.
 *
 * @example
 * ```typescript
 * const runner = new TerminalRunner({
 *   maxCommands: 50,
 *   commandTimeout: 60000,
 * });
 *
 * await runner.initialize();
 *
 * const result = await runner.executeAction({
 *   type: 'execute',
 *   command: 'npm test',
 *   explanation: 'Running test suite',
 * });
 *
 * const session = runner.finalize();
 * ```
 */
export class TerminalRunner {
  private readonly options: Required<TerminalModeOptions>;
  private executor: CommandExecutor | null = null;
  private formatter: TerminalFormatter | null = null;
  private shell: ShellConfig | null = null;
  private initialized = false;

  /**
   * Create a new terminal runner.
   *
   * @param options - Terminal mode configuration
   */
  constructor(options: TerminalModeOptions = {}) {
    this.options = {
      maxCommands: options.maxCommands ?? 50,
      commandTimeout: options.commandTimeout ?? 60000,
      maxOutputLines: options.maxOutputLines ?? 200,
      cwd: options.cwd ?? process.cwd(),
      shell: options.shell ?? '',
      verbose: options.verbose ?? false,
      json: options.json ?? false,
      quiet: options.quiet ?? false,
    };
  }

  /**
   * Initialize the terminal runner.
   * Detects shell and sets up the command executor.
   *
   * @throws Error if shell detection fails
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Detect shell
    const shellOptions = this.options.shell ? { override: this.options.shell } : {};
    this.shell = await detectShell(shellOptions);

    if (!this.options.quiet && !this.options.json) {
      console.log(chalk.gray(`  Shell: ${this.shell.type} (${this.shell.path})`));
    }

    // Create executor
    const executorConfig: ExecutorConfig = {
      shell: this.shell,
      defaultTimeout: this.options.commandTimeout,
      maxCommands: this.options.maxCommands,
      maxOutputLines: this.options.maxOutputLines,
      cwd: this.options.cwd,
    };

    this.executor = createCommandExecutor(executorConfig);

    // Create formatter for output
    this.formatter = createTerminalFormatter({
      color: !this.options.json && !this.options.quiet,
      streaming: true,
    });

    this.initialized = true;
  }

  /**
   * Build execution options with optional streaming callbacks.
   */
  private buildExecOptions(): Partial<ExecutionOptions> {
    if (this.options.quiet || this.options.json) {
      return {};
    }
    return {
      onStdout: (line: string) => console.log(chalk.gray(`    ${line}`)),
      onStderr: (line: string) => console.log(chalk.yellow(`    ${line}`)),
    };
  }

  /**
   * Execute a terminal action.
   *
   * @param action - Terminal action to execute
   * @returns Action result
   */
  async executeAction(action: TerminalAction): Promise<TerminalActionResult> {
    if (!this.initialized || !this.executor || !this.formatter) {
      throw new Error('TerminalRunner not initialized. Call initialize() first.');
    }

    const result: TerminalActionResult = {
      type: action.type,
      success: false,
      commandsRemaining: this.executor.getRemainingCommands(),
    };

    // Log action explanation if provided
    if (action.explanation && !this.options.quiet && !this.options.json) {
      console.log(chalk.gray(`  💭 ${action.explanation}`));
    }

    switch (action.type) {
      case 'execute': {
        if (!action.command) {
          result.error = 'No command provided for execute action';
          return result;
        }

        // Display command
        if (!this.options.quiet && !this.options.json) {
          console.log(chalk.cyan(`  $ ${action.command}`));
        }

        // Execute with streaming
        const execOptions = this.buildExecOptions();
        const execution = await this.executor.execute(action.command, execOptions);

        result.execution = execution;
        result.success = execution.exitCode === 0;
        result.commandsRemaining = this.executor.getRemainingCommands();

        // Display result
        if (!this.options.quiet && !this.options.json) {
          if (result.success) {
            console.log(chalk.green(`  ✓ Exit: ${execution.exitCode} (${execution.durationMs}ms)`));
          } else {
            console.log(chalk.red(`  ✗ Exit: ${execution.exitCode} (${execution.durationMs}ms)`));
          }
        }
        break;
      }

      case 'verify': {
        const verifyCmd = action.verification ?? action.command;
        if (!verifyCmd) {
          result.error = 'No verification command provided';
          return result;
        }

        if (!this.options.quiet && !this.options.json) {
          console.log(chalk.blue(`  🔍 Verifying: ${verifyCmd}`));
        }

        const execution = await this.executor.execute(verifyCmd);
        result.execution = execution;
        result.success = execution.exitCode === 0;
        result.commandsRemaining = this.executor.getRemainingCommands();
        break;
      }

      case 'diagnose': {
        // Diagnose mode — run command but don't treat failure as terminal
        if (!action.command) {
          result.error = 'No command provided for diagnose action';
          return result;
        }

        if (!this.options.quiet && !this.options.json) {
          console.log(chalk.magenta(`  🔬 Diagnosing: ${action.command}`));
        }

        const execution = await this.executor.execute(action.command);
        result.execution = execution;
        result.success = true; // Diagnose always "succeeds" — it's information gathering
        result.commandsRemaining = this.executor.getRemainingCommands();
        break;
      }

      case 'complete': {
        // Signal cycle completion
        result.success = true;
        result.commandsRemaining = this.executor.getRemainingCommands();

        if (!this.options.quiet && !this.options.json) {
          console.log(chalk.green('  ✅ Terminal session marked complete'));
        }
        break;
      }

      default:
        result.error = `Unknown action type: ${action.type}`;
    }

    return result;
  }

  /**
   * Execute multiple commands in sequence.
   *
   * @param commands - Array of commands to execute
   * @param stopOnError - Stop on first failure (default: false)
   * @returns Array of execution results
   */
  // eslint-disable-next-line require-await
  async executeCommands(
    commands: string[],
    stopOnError = false
  ): Promise<ExecutionResult[]> {
    if (!this.initialized || !this.executor) {
      throw new Error('TerminalRunner not initialized. Call initialize() first.');
    }

    const execOptions = this.buildExecOptions();
    return this.executor.executeMany(commands, execOptions, stopOnError);
  }

  /**
   * Get remaining command budget.
   *
   * @returns Number of commands remaining
   */
  getRemainingCommands(): number {
    return this.executor?.getRemainingCommands() ?? this.options.maxCommands;
  }

  /**
   * Check if approaching command limit.
   *
   * @param threshold - Warning threshold (default: 5)
   * @returns True if near limit
   */
  isNearLimit(threshold = 5): boolean {
    return this.executor?.isNearLimit(threshold) ?? false;
  }

  /**
   * Finalize the terminal session.
   *
   * @param finalAction - Description of final action taken
   * @returns Session result
   */
  finalize(finalAction?: string): TerminalSessionResult {
    if (!this.executor) {
      return {
        success: false,
        commandsExecuted: 0,
        commandsSucceeded: 0,
        commandsFailed: 0,
        totalDurationMs: 0,
        finalAction: undefined,
        error: 'TerminalRunner not initialized',
        history: [],
      };
    }

    const stats = this.executor.getStats();
    const history = this.executor.getHistory();

    return {
      success: stats.failed === 0,
      commandsExecuted: stats.total,
      commandsSucceeded: stats.succeeded,
      commandsFailed: stats.failed,
      totalDurationMs: stats.totalDurationMs,
      finalAction,
      error: undefined,
      history,
    };
  }

  /**
   * Reset the runner for a new cycle.
   */
  reset(): void {
    this.executor?.reset();
  }

  /**
   * Get current shell configuration.
   */
  getShellConfig(): ShellConfig | null {
    return this.shell;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new terminal runner.
 *
 * @param options - Terminal mode configuration
 * @returns New TerminalRunner instance
 */
export function createTerminalRunner(
  options: TerminalModeOptions = {}
): TerminalRunner {
  return new TerminalRunner(options);
}

/**
 * Run a single command in terminal mode.
 * Convenience function for simple cases.
 *
 * @param command - Command to execute
 * @param options - Terminal mode options
 * @returns Execution result
 */
export async function runTerminalCommand(
  command: string,
  options: TerminalModeOptions = {}
): Promise<ExecutionResult> {
  const runner = new TerminalRunner(options);
  await runner.initialize();

  const result = await runner.executeAction({
    type: 'execute',
    command,
  });

  if (!result.execution) {
    throw new Error(result.error ?? 'No execution result');
  }

  return result.execution;
}
