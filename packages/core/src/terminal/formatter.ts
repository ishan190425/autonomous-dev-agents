/**
 * @ada/core/terminal — Terminal Formatter
 *
 * Output formatting for Terminal Mode with visual separation between zones.
 * Implements the UX spec from C605 (docs/design/terminal-mode-ux-spec-c605.md).
 *
 * Zone types:
 * - ADA System (┃) — Role communication, state transitions
 * - Command (▶) — Shell command invocations
 * - stdout (│) — Command standard output
 * - stderr (│ red) — Command standard error
 * - Exit Code (◀) — Command completion with status
 * - Summary (box) — Cycle/section summaries
 *
 * @see docs/design/terminal-mode-ux-spec-c605.md
 * @see Issue #125 — Terminal Mode for shell-based benchmarks
 * @packageDocumentation
 */

import type { ExecutionResult } from './types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Output zone type for visual categorization.
 */
export type OutputZone = 'ada' | 'command' | 'stdout' | 'stderr' | 'exit' | 'summary';

/**
 * Role emoji mapping for ADA system messages.
 */
export type RoleId = 
  | 'ceo' | 'growth' | 'research' | 'frontier' | 'product' 
  | 'scrum' | 'qa' | 'engineering' | 'ops' | 'design';

/**
 * Formatter configuration options.
 */
export interface FormatterOptions {
  /** Whether to use colors (default: true if stdout is TTY) */
  color?: boolean;
  /** Whether output is being streamed (affects some formatting) */
  streaming?: boolean;
}

/**
 * Command history entry for cycle summary.
 */
export interface CommandEntry {
  /** Command sequence number */
  index: number;
  /** Role that executed the command */
  role: RoleId;
  /** Command string (truncated if long) */
  command: string;
  /** Exit code */
  exitCode: number;
  /** Duration in ms */
  durationMs: number;
}

/**
 * Cycle summary data for end-of-cycle display.
 */
export interface CycleSummaryData {
  /** Cycle number */
  cycle: number;
  /** Total commands executed */
  commandCount: number;
  /** Commands that succeeded (exit 0) */
  successCount: number;
  /** Commands that failed (non-zero exit) */
  failedCount: number;
  /** Total duration in ms */
  totalDurationMs: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Role display names with emojis.
 */
const ROLE_DISPLAY: Record<RoleId, string> = {
  ceo: '👔 CEO',
  growth: '🚀 Growth',
  research: '🔬 Research',
  frontier: '🌌 Frontier',
  product: '📦 Product',
  scrum: '📋 Scrum',
  qa: '🔍 QA',
  engineering: '⚙️ Engineering',
  ops: '🛡️ Ops',
  design: '🎨 Design',
};

/**
 * ANSI color codes for terminal output.
 */
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
} as const;

/**
 * Zone prefixes for colored output.
 */
const COLOR_PREFIXES: Record<OutputZone, string> = {
  ada: `${COLORS.cyan}┃${COLORS.reset} `,
  command: `${COLORS.yellow}▶${COLORS.reset} `,
  stdout: `${COLORS.gray}│${COLORS.reset} `,
  stderr: `${COLORS.gray}│${COLORS.reset} ${COLORS.red}`,
  exit: `${COLORS.gray}◀${COLORS.reset} `,
  summary: '', // Uses box drawing
};

/**
 * Zone prefixes for no-color output.
 */
const NOCOLOR_PREFIXES: Record<OutputZone, string> = {
  ada: '[ADA] ',
  command: '> ',
  stdout: '| ',
  stderr: '| [ERR] ',
  exit: '< ',
  summary: '',
};

/**
 * Box-drawing characters for summaries.
 */
const BOX = {
  tl: '┏', tr: '┓', bl: '┗', br: '┛',
  h: '━', v: '┃',
  ml: '┣', mr: '┫',
} as const;

// ============================================================================
// Terminal Formatter Class
// ============================================================================

/**
 * Formats terminal output for Terminal Mode with visual zone separation.
 *
 * @example
 * ```typescript
 * const formatter = new TerminalFormatter({ color: true });
 *
 * // ADA system message
 * console.log(formatter.ada('research', 'Analyzing task requirements...'));
 *
 * // Command invocation
 * console.log(formatter.command('npm test'));
 *
 * // Command output
 * console.log(formatter.stdout('PASS tests/unit/memory.test.ts'));
 *
 * // Exit code
 * console.log(formatter.exitCode(0, 1234));
 * ```
 */
export class TerminalFormatter {
  private readonly useColor: boolean;
  private readonly prefixes: Record<OutputZone, string>;

  /**
   * Create a new terminal formatter.
   *
   * @param options - Formatter configuration
   */
  constructor(options: FormatterOptions = {}) {
    this.useColor = options.color ?? (process.stdout.isTTY ?? false);
    // options.streaming reserved for future use
    this.prefixes = this.useColor ? COLOR_PREFIXES : NOCOLOR_PREFIXES;
  }

  /**
   * Format an ADA system message (role communication).
   *
   * @param role - Role sending the message
   * @param message - Message content
   * @returns Formatted output string
   */
  ada(role: RoleId, message: string): string {
    const roleDisplay = this.useColor
      ? `${COLORS.bold}[${ROLE_DISPLAY[role]}]${COLORS.reset}`
      : `[${ROLE_DISPLAY[role]}]`;
    return `${this.prefixes.ada}${roleDisplay} ${message}`;
  }

  /**
   * Format a command invocation line.
   *
   * @param cmd - Command being executed
   * @returns Formatted output string
   */
  command(cmd: string): string {
    if (this.useColor) {
      return `${this.prefixes.command}${COLORS.bold}${cmd}${COLORS.reset}`;
    }
    return `${this.prefixes.command}${cmd}`;
  }

  /**
   * Format stdout output line(s).
   *
   * @param content - stdout content (can be multi-line)
   * @returns Formatted output string
   */
  stdout(content: string): string {
    return content
      .split('\n')
      .map(line => `${this.prefixes.stdout}${line}`)
      .join('\n');
  }

  /**
   * Format stderr output line(s).
   *
   * @param content - stderr content (can be multi-line)
   * @returns Formatted output string
   */
  stderr(content: string): string {
    const suffix = this.useColor ? COLORS.reset : '';
    return content
      .split('\n')
      .map(line => `${this.prefixes.stderr}${line}${suffix}`)
      .join('\n');
  }

  /**
   * Format an exit code line.
   *
   * @param code - Exit code (0 = success)
   * @param durationMs - Execution duration in milliseconds
   * @returns Formatted output string
   */
  exitCode(code: number, durationMs: number): string {
    const durationStr = this.formatDuration(durationMs);
    const success = code === 0;
    
    if (this.useColor) {
      const statusColor = success ? COLORS.green : COLORS.red;
      const statusIcon = success ? '✓' : '✗';
      return `${this.prefixes.exit}exit ${code} (${durationStr}) ${statusColor}${statusIcon}${COLORS.reset}`;
    }
    
    const statusIcon = success ? '[OK]' : '[FAIL]';
    return `${this.prefixes.exit}exit ${code} (${durationStr}) ${statusIcon}`;
  }

  /**
   * Format a timeout indication.
   *
   * @param timeoutMs - Timeout duration in milliseconds
   * @returns Formatted output string
   */
  timeout(timeoutMs: number): string {
    const durationStr = this.formatDuration(timeoutMs);
    if (this.useColor) {
      return `${this.prefixes.exit}${COLORS.red}TIMEOUT (${durationStr} limit reached) ✗${COLORS.reset}`;
    }
    return `${this.prefixes.exit}TIMEOUT (${durationStr} limit reached) [FAIL]`;
  }

  /**
   * Format a streaming activity indicator.
   *
   * @returns Formatted activity indicator
   */
  activity(): string {
    return `${this.prefixes.stdout}·`;
  }

  /**
   * Format a cycle start header box.
   *
   * @param cycle - Cycle number
   * @param task - Task description (optional)
   * @returns Formatted header box
   */
  cycleStart(cycle: number, task?: string): string {
    const width = 60;
    const title = `🚀 Terminal Mode — Cycle ${cycle}`;
    const lines: string[] = [];
    
    lines.push(this.boxTop(width));
    lines.push(this.boxLine(title, width));
    if (task) {
      lines.push(this.boxLine(`Task: ${this.truncate(task, width - 12)}`, width));
    }
    lines.push(this.boxBottom(width));
    
    return lines.join('\n');
  }

  /**
   * Format a cycle completion summary box.
   *
   * @param data - Cycle summary data
   * @returns Formatted summary box
   */
  cycleSummary(data: CycleSummaryData): string {
    const width = 60;
    const icon = data.failedCount === 0 ? '✓' : '✗';
    const title = `${icon} Cycle ${data.cycle} Complete`;
    const stats = `Commands: ${data.commandCount} | Success: ${data.successCount} | Failed: ${data.failedCount} | Time: ${this.formatDuration(data.totalDurationMs)}`;
    
    const lines: string[] = [];
    lines.push(this.boxTop(width));
    lines.push(this.boxLine(title, width));
    lines.push(this.boxLine(stats, width));
    lines.push(this.boxBottom(width));
    
    return this.colorize(lines.join('\n'), data.failedCount === 0 ? 'green' : 'red');
  }

  /**
   * Format a command limit warning.
   *
   * @param current - Current command count
   * @param max - Maximum allowed commands
   * @returns Formatted warning
   */
  commandLimitWarning(current: number, max: number): string {
    const remaining = max - current;
    const msg = `⚠ Command limit approaching: ${current}/${max}`;
    const submsg = `${remaining} commands remaining. Prioritize completion.`;
    
    if (this.useColor) {
      return `${this.prefixes.ada}${COLORS.yellow}${msg}${COLORS.reset}\n${this.prefixes.ada}${submsg}`;
    }
    return `${this.prefixes.ada}${msg}\n${this.prefixes.ada}${submsg}`;
  }

  /**
   * Format command history table.
   *
   * @param cycle - Cycle number
   * @param commands - Command entries
   * @returns Formatted history table
   */
  commandHistory(cycle: number, commands: CommandEntry[]): string {
    const width = 70;
    const lines: string[] = [];
    
    lines.push(this.boxTop(width));
    lines.push(this.boxLine(`Command History — Cycle ${cycle}`, width));
    lines.push(this.boxDivider(width));
    lines.push(this.boxLine('#  │ Role        │ Command                     │ Exit │ Time', width));
    lines.push(this.boxLine('───┼─────────────┼─────────────────────────────┼──────┼─────', width));
    
    for (const entry of commands) {
      const role = this.padRight(entry.role, 11);
      const cmd = this.truncate(entry.command, 27);
      const exit = this.padRight(String(entry.exitCode), 4);
      const time = this.formatDuration(entry.durationMs);
      lines.push(this.boxLine(`${this.padRight(String(entry.index), 2)} │ ${role} │ ${cmd} │ ${exit} │ ${time}`, width));
    }
    
    lines.push(this.boxBottom(width));
    return lines.join('\n');
  }

  /**
   * Format a full execution result.
   *
   * @param result - Execution result
   * @returns Formatted output string (command + output + exit code)
   */
  executionResult(result: ExecutionResult): string {
    const lines: string[] = [];
    
    lines.push(this.command(result.command));
    
    if (result.stdout.trim()) {
      lines.push(this.stdout(result.stdout.trim()));
    }
    
    if (result.stderr.trim()) {
      lines.push(this.stderr(result.stderr.trim()));
    }
    
    if (result.truncated) {
      lines.push(this.stdout('... (output truncated)'));
    }
    
    lines.push(this.exitCode(result.exitCode, result.durationMs));
    
    return lines.join('\n');
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Format duration in human-readable form.
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(0);
    return `${minutes}m${secs}s`;
  }

  /**
   * Truncate a string to max length with ellipsis.
   */
  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return this.padRight(str, maxLen);
    return `${str.slice(0, maxLen - 3)}...`;
  }

  /**
   * Pad a string to the right with spaces.
   */
  private padRight(str: string, len: number): string {
    return str.padEnd(len);
  }

  /**
   * Create a box top line.
   */
  private boxTop(width: number): string {
    return `${BOX.tl}${BOX.h.repeat(width - 2)}${BOX.tr}`;
  }

  /**
   * Create a box bottom line.
   */
  private boxBottom(width: number): string {
    return `${BOX.bl}${BOX.h.repeat(width - 2)}${BOX.br}`;
  }

  /**
   * Create a box divider line.
   */
  private boxDivider(width: number): string {
    return `${BOX.ml}${BOX.h.repeat(width - 2)}${BOX.mr}`;
  }

  /**
   * Create a box content line.
   */
  private boxLine(content: string, width: number): string {
    // Account for ANSI codes when calculating padding
    const visibleLen = this.stripAnsi(content).length;
    const padding = Math.max(0, width - 4 - visibleLen);
    return `${BOX.v} ${content}${' '.repeat(padding)} ${BOX.v}`;
  }

  /**
   * Strip ANSI escape codes from a string.
   */
  private stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }

  /**
   * Apply a color to a string (if color enabled).
   */
  private colorize(str: string, color: 'green' | 'red' | 'yellow'): string {
    if (!this.useColor) return str;
    return `${COLORS[color]}${str}${COLORS.reset}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new terminal formatter with the given options.
 *
 * @param options - Formatter configuration
 * @returns New TerminalFormatter instance
 */
export function createTerminalFormatter(options?: FormatterOptions): TerminalFormatter {
  return new TerminalFormatter(options);
}

/**
 * Check if color output should be enabled.
 *
 * @returns True if colors should be used
 */
export function shouldUseColor(): boolean {
  // Check NO_COLOR env var (https://no-color.org/)
  if (process.env.NO_COLOR !== undefined) return false;
  // Check FORCE_COLOR env var
  if (process.env.FORCE_COLOR !== undefined) return true;
  // Check if stdout is a TTY
  return process.stdout.isTTY ?? false;
}
