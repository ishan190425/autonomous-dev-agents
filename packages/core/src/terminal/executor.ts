/**
 * @ada/core/terminal — Command Executor
 *
 * Shell command execution with streaming output, timeouts, and safety limits.
 * Core runtime for Terminal Mode dispatch cycles.
 *
 * Features:
 * - Streaming stdout/stderr with real-time callbacks
 * - Per-command timeouts with clean termination
 * - Output truncation to prevent memory issues
 * - Command history tracking
 * - Max commands safety limit
 *
 * @see docs/design/terminal-mode-ux-spec-c605.md
 * @see docs/engineering/terminal-mode-technical-spec.md §3
 * @see Issue #125 — Terminal Mode for shell-based benchmarks
 * @packageDocumentation
 */

import { spawn } from 'node:child_process';
import type {
  ExecutionOptions,
  ExecutionResult,
  ShellConfig,
} from './types.js';
import { TerminalError } from './types.js';

// Node.js global timers
const { setTimeout, clearTimeout } = globalThis;

// ============================================================================
// Types
// ============================================================================

/**
 * Options for CommandExecutor configuration.
 */
export interface ExecutorConfig {
  /** Shell configuration to use */
  shell: ShellConfig;
  /** Default timeout per command in ms (default: 60000) */
  defaultTimeout?: number;
  /** Maximum commands per cycle (default: 50) */
  maxCommands?: number;
  /** Maximum output lines before truncation (default: 200) */
  maxOutputLines?: number;
  /** Maximum output bytes before truncation (default: 51200 = 50KB) */
  maxOutputBytes?: number;
  /** Working directory (default: process.cwd()) */
  cwd?: string;
  /** Additional environment variables */
  env?: Record<string, string>;
}

/**
 * Statistics for executed commands.
 */
export interface ExecutorStats {
  /** Total commands executed */
  total: number;
  /** Commands that succeeded (exit 0) */
  succeeded: number;
  /** Commands that failed (non-zero exit) */
  failed: number;
  /** Commands that timed out */
  timedOut: number;
  /** Total execution time in ms */
  totalDurationMs: number;
}

/**
 * Streaming callback for real-time output.
 */
export type StreamCallback = (line: string) => void;

// ============================================================================
// Command Executor Class
// ============================================================================

/**
 * Executes shell commands with streaming output and safety limits.
 *
 * @example
 * ```typescript
 * const executor = new CommandExecutor({
 *   shell: await detectShell(),
 *   maxCommands: 50,
 *   defaultTimeout: 60000,
 * });
 *
 * // Execute with streaming
 * const result = await executor.execute('npm test', {
 *   onStdout: (line) => console.log(formatter.stdout(line)),
 *   onStderr: (line) => console.log(formatter.stderr(line)),
 * });
 *
 * // Check stats
 * const stats = executor.getStats();
 * console.log(`${stats.total} commands, ${stats.succeeded} succeeded`);
 * ```
 */
export class CommandExecutor {
  private readonly config: Required<ExecutorConfig>;
  private history: ExecutionResult[] = [];
  private stats: ExecutorStats = {
    total: 0,
    succeeded: 0,
    failed: 0,
    timedOut: 0,
    totalDurationMs: 0,
  };

  /**
   * Create a new command executor.
   *
   * @param config - Executor configuration
   */
  constructor(config: ExecutorConfig) {
    this.config = {
      shell: config.shell,
      defaultTimeout: config.defaultTimeout ?? 60000,
      maxCommands: config.maxCommands ?? 50,
      maxOutputLines: config.maxOutputLines ?? 200,
      maxOutputBytes: config.maxOutputBytes ?? 51200,
      cwd: config.cwd ?? process.cwd(),
      env: config.env ?? {},
    };
  }

  /**
   * Execute a shell command.
   *
   * @param command - Shell command to execute
   * @param options - Execution options (overrides defaults)
   * @returns Execution result
   * @throws TerminalError if max commands exceeded
   */
  // eslint-disable-next-line require-await
  async execute(
    command: string,
    options: Partial<ExecutionOptions> = {}
  ): Promise<ExecutionResult> {
    // Check command limit
    if (this.stats.total >= this.config.maxCommands) {
      throw new TerminalError(
        `Command limit exceeded: ${this.config.maxCommands} commands maximum`,
        'COMMAND_LIMIT_EXCEEDED'
      );
    }

    const timeout = options.timeout ?? this.config.defaultTimeout;
    const maxLines = options.maxOutputLines ?? this.config.maxOutputLines;
    const maxBytes = options.maxOutputBytes ?? this.config.maxOutputBytes;
    const cwd = options.cwd ?? this.config.cwd;
    const env = { ...process.env, ...this.config.env, ...options.env };

    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let stdoutLines = 0;
    let stderrLines = 0;
    let totalBytes = 0;
    let truncated = false;

    return new Promise<ExecutionResult>((resolve) => {
      const proc = spawn(this.config.shell.path, ['-c', command], {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Timeout handling
      const timeoutId = setTimeout(() => {
        proc.kill('SIGTERM');
        // Force kill after 5s if SIGTERM doesn't work
        setTimeout(() => proc.kill('SIGKILL'), 5000);
      }, timeout);

      // Stdout handling
      proc.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (truncated) continue;
          
          // Check limits
          totalBytes += line.length + 1; // +1 for newline
          if (totalBytes > maxBytes || stdoutLines >= maxLines) {
            truncated = true;
            continue;
          }
          
          stdoutLines++;
          stdout += `${line}\n`;
          
          // Stream callback
          if (options.onStdout && line.length > 0) {
            options.onStdout(line);
          }
        }
      });

      // Stderr handling
      proc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (truncated) continue;
          
          // Check limits (shared with stdout)
          totalBytes += line.length + 1;
          if (totalBytes > maxBytes || stderrLines >= maxLines) {
            truncated = true;
            continue;
          }
          
          stderrLines++;
          stderr += `${line}\n`;
          
          // Stream callback
          if (options.onStderr && line.length > 0) {
            options.onStderr(line);
          }
        }
      });

      // Completion handling
      proc.on('close', (code, signal) => {
        clearTimeout(timeoutId);
        
        const durationMs = Date.now() - startTime;
        const timedOut = signal === 'SIGTERM' || signal === 'SIGKILL';
        
        // Use -1 for timeout, otherwise use exit code (0 if null)
        const exitCode = timedOut ? -1 : (code ?? 0);
        
        const result: ExecutionResult = {
          command,
          exitCode,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          durationMs,
          truncated,
        };
        
        // Update stats
        this.stats.total++;
        this.stats.totalDurationMs += durationMs;
        if (timedOut) {
          this.stats.timedOut++;
          this.stats.failed++; // Timeouts count as failures
        } else if (exitCode === 0) {
          this.stats.succeeded++;
        } else {
          this.stats.failed++;
        }
        
        // Add to history
        this.history.push(result);
        
        resolve(result);
      });

      // Error handling (spawn failure)
      proc.on('error', (err) => {
        clearTimeout(timeoutId);
        
        const durationMs = Date.now() - startTime;
        const result: ExecutionResult = {
          command,
          exitCode: -1,
          stdout: '',
          stderr: err.message,
          durationMs,
          truncated: false,
        };
        
        this.stats.total++;
        this.stats.failed++;
        this.stats.totalDurationMs += durationMs;
        this.history.push(result);
        
        resolve(result);
      });
    });
  }

  /**
   * Execute multiple commands in sequence.
   *
   * @param commands - Array of commands to execute
   * @param options - Execution options (applied to all)
   * @param stopOnError - Stop execution on first non-zero exit (default: false)
   * @returns Array of execution results
   */
  async executeMany(
    commands: string[],
    options: Partial<ExecutionOptions> = {},
    stopOnError = false
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    
    for (const command of commands) {
      const result = await this.execute(command, options);
      results.push(result);
      
      if (stopOnError && result.exitCode !== 0) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Get the number of remaining commands before limit.
   *
   * @returns Number of commands remaining
   */
  getRemainingCommands(): number {
    return Math.max(0, this.config.maxCommands - this.stats.total);
  }

  /**
   * Check if approaching command limit.
   *
   * @param threshold - Warning threshold (default: 5)
   * @returns True if remaining commands <= threshold
   */
  isNearLimit(threshold = 5): boolean {
    return this.getRemainingCommands() <= threshold;
  }

  /**
   * Get execution statistics.
   *
   * @returns Current execution stats
   */
  getStats(): Readonly<ExecutorStats> {
    return { ...this.stats };
  }

  /**
   * Get command history.
   *
   * @returns Array of execution results (copies)
   */
  getHistory(): ExecutionResult[] {
    return [...this.history];
  }

  /**
   * Get the last N commands from history.
   *
   * @param n - Number of commands to retrieve
   * @returns Last N execution results
   */
  getLastCommands(n: number): ExecutionResult[] {
    return this.history.slice(-n);
  }

  /**
   * Reset the executor state for a new cycle.
   * Clears history and resets stats.
   */
  reset(): void {
    this.history = [];
    this.stats = {
      total: 0,
      succeeded: 0,
      failed: 0,
      timedOut: 0,
      totalDurationMs: 0,
    };
  }

  /**
   * Get the current configuration.
   *
   * @returns Executor configuration
   */
  getConfig(): Readonly<Required<ExecutorConfig>> {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new command executor with the given configuration.
 *
 * @param config - Executor configuration
 * @returns New CommandExecutor instance
 */
export function createCommandExecutor(config: ExecutorConfig): CommandExecutor {
  return new CommandExecutor(config);
}

/**
 * Execute a single command with default settings.
 * Convenience function for one-off executions.
 *
 * @param shell - Shell configuration
 * @param command - Command to execute
 * @param options - Execution options
 * @returns Execution result
 */
export function executeCommand(
  shell: ShellConfig,
  command: string,
  options: Partial<ExecutionOptions> = {}
): Promise<ExecutionResult> {
  const executor = new CommandExecutor({ shell });
  return executor.execute(command, options);
}
