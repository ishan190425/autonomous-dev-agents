/**
 * `ada terminal` — Terminal Mode CLI commands for shell-based execution.
 *
 * Enables ADA agents to execute shell commands within dispatch cycles
 * with visual formatting per the UX spec (C605).
 *
 * Commands:
 *   ada terminal          Show terminal mode status and shell info
 *   ada terminal detect   Detect and display current shell environment
 *   ada terminal exec     Execute a command with formatted output
 *   ada terminal history  Show command history for current session
 *
 * @see Issue #125 — Terminal Mode for shell-based benchmarks
 * @see docs/design/terminal-mode-ux-spec-c605.md
 * @packageDocumentation
 */

import { Command } from 'commander';
import chalk from 'chalk';

// Import terminal module from core
import {
  detectShell,
  isSupported,
  getShellType,
  createTerminalFormatter,
  createCommandExecutor,
  shouldUseColor,
  type ShellConfig,
  type ExecutorStats,
  type CommandEntry,
  type RoleId,
} from '@ada-ai/core/terminal';

// ============================================================================
// Types
// ============================================================================

/** Options for terminal commands */
interface TerminalOptions {
  dir: string;
  json?: boolean;
  color?: boolean;
}

/** Options for terminal exec command */
interface TerminalExecOptions extends TerminalOptions {
  shell?: string;
  timeout?: string;
  maxLines?: string;
  role?: RoleId;
}

/** Options for terminal history command */
interface TerminalHistoryOptions extends TerminalOptions {
  limit?: string;
  cycle?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format shell configuration for display
 */
function formatShellInfo(shell: ShellConfig, useColor: boolean): string {
  const lines: string[] = [];
  const dim = useColor ? chalk.dim : (s: string): string => s;
  const bold = useColor ? chalk.bold : (s: string): string => s;
  const green = useColor ? chalk.green : (s: string): string => s;
  const yellow = useColor ? chalk.yellow : (s: string): string => s;

  lines.push(bold('Shell Configuration'));
  lines.push('');
  lines.push(`  ${dim('Type:')}     ${shell.type}`);
  lines.push(`  ${dim('Path:')}     ${shell.path}`);
  lines.push(`  ${dim('Detected:')} ${shell.detected ? green('auto') : yellow('manual')}`);

  return lines.join('\n');
}

/**
 * Format executor stats for display
 */
function formatStats(stats: ExecutorStats, useColor: boolean): string {
  const lines: string[] = [];
  const dim = useColor ? chalk.dim : (s: string): string => s;
  const bold = useColor ? chalk.bold : (s: string): string => s;
  const green = useColor ? chalk.green : (s: string): string => s;
  const red = useColor ? chalk.red : (s: string): string => s;
  const yellow = useColor ? chalk.yellow : (s: string): string => s;

  lines.push(bold('Execution Statistics'));
  lines.push('');
  lines.push(`  ${dim('Total:')}     ${stats.total}`);
  lines.push(`  ${dim('Succeeded:')} ${green(String(stats.succeeded))}`);
  lines.push(`  ${dim('Failed:')}    ${stats.failed > 0 ? red(String(stats.failed)) : '0'}`);
  lines.push(`  ${dim('Timed Out:')} ${stats.timedOut > 0 ? yellow(String(stats.timedOut)) : '0'}`);
  lines.push(`  ${dim('Duration:')}  ${formatDuration(stats.totalDurationMs)}`);

  return lines.join('\n');
}

// Exported for potential future use in status display
export { formatStats };

/**
 * Format duration in human-readable form
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(0);
  return `${minutes}m${secs}s`;
}

// ============================================================================
// Commands
// ============================================================================

/**
 * ada terminal — Show terminal mode status
 */
async function terminalStatus(options: TerminalOptions): Promise<void> {
  const useColor = options.color ?? shouldUseColor();

  try {
    const shell = await detectShell();

    if (options.json) {
      console.log(JSON.stringify({
        shell,
        supported: true,
        colorEnabled: useColor,
      }, null, 2));
      return;
    }

    console.log('');
    console.log(useColor ? chalk.bold('🚀 Terminal Mode') : '=== Terminal Mode ===');
    console.log('');
    console.log(formatShellInfo(shell, useColor));
    console.log('');
    console.log(useColor ? chalk.dim('Use `ada terminal exec <command>` to execute commands.') : 'Use `ada terminal exec <command>` to execute commands.');
    console.log(useColor ? chalk.dim('Use `ada terminal detect` for detailed shell info.') : 'Use `ada terminal detect` for detailed shell info.');
    console.log('');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(useColor ? chalk.red(`Error: ${message}`) : `Error: ${message}`);
    process.exit(1);
  }
}

/**
 * ada terminal detect — Detect shell environment
 */
async function terminalDetect(options: TerminalOptions & { shell?: string }): Promise<void> {
  const useColor = options.color ?? shouldUseColor();

  try {
    const shell = await detectShell(options.shell ? { override: options.shell } : {});

    if (options.json) {
      console.log(JSON.stringify({
        shell,
        environment: {
          SHELL: process.env.SHELL,
          PATH: process.env.PATH?.split(':').slice(0, 5), // First 5 PATH entries
        },
        supported: isSupported(shell.type),
      }, null, 2));
      return;
    }

    const dim = useColor ? chalk.dim : (s: string): string => s;
    const bold = useColor ? chalk.bold : (s: string): string => s;
    const green = useColor ? chalk.green : (s: string): string => s;

    console.log('');
    console.log(bold('Shell Detection'));
    console.log('');
    console.log(`  ${dim('Detected Shell:')} ${shell.type}`);
    console.log(`  ${dim('Shell Path:')}     ${shell.path}`);
    console.log(`  ${dim('Auto-detected:')}  ${shell.detected ? 'yes' : 'no'}`);
    console.log('');
    console.log(bold('Environment'));
    console.log('');
    console.log(`  ${dim('$SHELL:')} ${process.env.SHELL || '(not set)'}`);
    console.log(`  ${dim('Type:')}   ${getShellType(process.env.SHELL || '')}`);
    console.log('');
    console.log(`  ${green('✓')} Shell validated and ready for Terminal Mode`);
    console.log('');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(useColor ? chalk.red(`Error: ${message}`) : `Error: ${message}`);
    process.exit(1);
  }
}

/**
 * ada terminal exec — Execute a command with formatted output
 */
async function terminalExec(
  command: string,
  options: TerminalExecOptions
): Promise<void> {
  const useColor = options.color ?? shouldUseColor();
  const timeout = options.timeout ? parseInt(options.timeout, 10) : 60000;
  const maxLines = options.maxLines ? parseInt(options.maxLines, 10) : 200;
  const role: RoleId = options.role || 'engineering';

  try {
    const shell = await detectShell(options.shell ? { override: options.shell } : {});
    const formatter = createTerminalFormatter({ color: useColor });
    const executor = createCommandExecutor({
      shell,
      defaultTimeout: timeout,
      maxOutputLines: maxLines,
      cwd: options.dir,
    });

    // Show command invocation message
    console.log('');
    console.log(formatter.ada(role, 'Executing command...'));
    console.log('');

    // Execute with streaming output
    const result = await executor.execute(command, {
      onStdout: (line: string) => console.log(formatter.stdout(line)),
      onStderr: (line: string) => console.log(formatter.stderr(line)),
    });

    // Show exit code
    console.log('');
    if (result.exitCode === -1) {
      console.log(formatter.timeout(timeout));
    } else {
      console.log(formatter.exitCode(result.exitCode, result.durationMs));
    }

    if (result.truncated) {
      console.log(formatter.ada(role, 'Output was truncated due to size limits.'));
    }

    console.log('');

    // Exit with command's exit code (unless it was -1 for timeout)
    if (result.exitCode !== 0) {
      process.exit(result.exitCode === -1 ? 124 : result.exitCode);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(useColor ? chalk.red(`Error: ${message}`) : `Error: ${message}`);
    process.exit(1);
  }
}

/**
 * ada terminal history — Show command history
 *
 * Note: This shows session-based history. Currently reads from state file
 * if available, otherwise shows empty history.
 */
function terminalHistory(options: TerminalHistoryOptions): void {
  const useColor = options.color ?? shouldUseColor();
  const maxEntries = options.limit ? parseInt(options.limit, 10) : 20;
  const cycle = options.cycle ? parseInt(options.cycle, 10) : undefined;

  try {
    // For now, we show placeholder - full integration requires dispatch cycle tracking
    const formatter = createTerminalFormatter({ color: useColor });

    if (options.json) {
      console.log(JSON.stringify({
        cycle: cycle || 'current',
        commands: [],
        maxEntries,
        note: 'Command history is tracked per dispatch cycle. Run commands via `ada dispatch --mode=terminal` to populate history.',
      }, null, 2));
      return;
    }

    console.log('');
    console.log(formatter.commandHistory(cycle || 0, []));
    console.log('');
    console.log(useColor 
      ? chalk.dim('Command history is tracked per dispatch cycle.')
      : 'Command history is tracked per dispatch cycle.');
    console.log(useColor
      ? chalk.dim('Run `ada dispatch --mode=terminal` to execute with history tracking.')
      : 'Run `ada dispatch --mode=terminal` to execute with history tracking.');
    console.log('');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(useColor ? chalk.red(`Error: ${message}`) : `Error: ${message}`);
    process.exit(1);
  }
}

/**
 * ada terminal demo — Demonstrate terminal mode formatting
 */
async function terminalDemo(options: TerminalOptions): Promise<void> {
  const useColor = options.color ?? shouldUseColor();

  try {
    // Validate shell is available (but we don't use it for demo output)
    await detectShell();
    const formatter = createTerminalFormatter({ color: useColor });

    console.log('');
    console.log(formatter.cycleStart(42, 'Demonstrate terminal mode formatting'));
    console.log('');

    // ADA system message
    console.log(formatter.ada('research', 'Analyzing task requirements...'));
    console.log(formatter.ada('research', 'Need to verify test output formatting.'));
    console.log('');

    // Simulated command
    console.log(formatter.command('echo "Hello from Terminal Mode"'));
    console.log(formatter.stdout('Hello from Terminal Mode'));
    console.log(formatter.exitCode(0, 12));
    console.log('');

    // Simulated test command
    console.log(formatter.ada('qa', 'Running test suite...'));
    console.log('');
    console.log(formatter.command('npm test -- --reporter=min'));
    console.log(formatter.stdout('PASS  tests/unit/memory.test.ts'));
    console.log(formatter.stdout('PASS  tests/unit/rotation.test.ts'));
    console.log(formatter.stdout(''));
    console.log(formatter.stdout('Test Suites: 2 passed, 2 total'));
    console.log(formatter.stdout('Tests:       42 passed, 42 total'));
    console.log(formatter.exitCode(0, 1234));
    console.log('');

    // Error example
    console.log(formatter.ada('engineering', 'Attempting risky operation...'));
    console.log('');
    console.log(formatter.command('npm run nonexistent'));
    console.log(formatter.stderr('npm ERR! Missing script: "nonexistent"'));
    console.log(formatter.exitCode(1, 156));
    console.log('');

    // Summary
    console.log(formatter.cycleSummary({
      cycle: 42,
      commandCount: 3,
      successCount: 2,
      failedCount: 1,
      totalDurationMs: 1402,
    }));
    console.log('');

    // Command history
    const history: CommandEntry[] = [
      { index: 1, role: 'research', command: 'echo "Hello"', exitCode: 0, durationMs: 12 },
      { index: 2, role: 'qa', command: 'npm test', exitCode: 0, durationMs: 1234 },
      { index: 3, role: 'engineering', command: 'npm run nonexistent', exitCode: 1, durationMs: 156 },
    ];
    console.log(formatter.commandHistory(42, history));
    console.log('');

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(useColor ? chalk.red(`Error: ${message}`) : `Error: ${message}`);
    process.exit(1);
  }
}

// ============================================================================
// Command Definition
// ============================================================================

export const terminalCommand = new Command('terminal')
  .description('Terminal Mode — shell-based command execution with visual formatting')
  .option('-d, --dir <path>', 'Working directory', process.cwd())
  .option('--json', 'Output as JSON')
  .option('--color', 'Force color output')
  .option('--no-color', 'Disable color output')
  .action(terminalStatus);

terminalCommand
  .command('detect')
  .description('Detect and display current shell environment')
  .option('-s, --shell <path>', 'Override shell path')
  .option('--json', 'Output as JSON')
  .action(async (cmdOptions) => {
    const parentOptions = terminalCommand.opts();
    await terminalDetect({ ...parentOptions, ...cmdOptions });
  });

terminalCommand
  .command('exec <command>')
  .description('Execute a command with formatted Terminal Mode output')
  .option('-s, --shell <path>', 'Override shell path')
  .option('-t, --timeout <ms>', 'Command timeout in milliseconds', '60000')
  .option('--max-lines <n>', 'Maximum output lines before truncation', '200')
  .option('-r, --role <role>', 'Role executing the command (for formatting)', 'engineering')
  .option('--json', 'Output as JSON')
  .action(async (command, cmdOptions) => {
    const parentOptions = terminalCommand.opts();
    await terminalExec(command, { ...parentOptions, ...cmdOptions });
  });

terminalCommand
  .command('history')
  .description('Show command history for a dispatch cycle')
  .option('-l, --limit <n>', 'Maximum entries to show', '20')
  .option('-c, --cycle <n>', 'Cycle number (defaults to current/last)')
  .option('--json', 'Output as JSON')
  .action(async (cmdOptions) => {
    const parentOptions = terminalCommand.opts();
    await terminalHistory({ ...parentOptions, ...cmdOptions });
  });

terminalCommand
  .command('demo')
  .description('Demonstrate terminal mode formatting (no real commands executed)')
  .option('--json', 'Output as JSON')
  .action(async (cmdOptions) => {
    const parentOptions = terminalCommand.opts();
    await terminalDemo({ ...parentOptions, ...cmdOptions });
  });
