/**
 * @file Error renderer — formats AdaError for terminal output
 * @description Implements C1082 CLI Error Messages UX Spec
 * @see docs/design/cli-error-messages-ux-spec-c1082.md
 */

import type { RenderOptions, Suggestion } from './types.js';
import { AdaError } from './error.js';

/**
 * ANSI color codes for terminal output.
 */
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
} as const;

/**
 * Symbols for different message types.
 */
const SYMBOLS = {
  error: '✖',
  warning: '⚠',
  success: '✔',
  suggestion: '💡',
  secondary: '→',
  docs: '📖',
} as const;

/**
 * Check if colors should be used based on environment.
 */
export function shouldUseColors(): boolean {
  // Respect NO_COLOR standard
  if (process.env.NO_COLOR !== undefined) {
    return false;
  }

  // Check for explicit color enable
  if (process.env.FORCE_COLOR !== undefined) {
    return true;
  }

  // Check CI environment
  if (process.env.CI !== undefined) {
    return false;
  }

  // Check if stdout is a TTY
  return process.stdout?.isTTY ?? false;
}

/**
 * Check if output should be JSON.
 */
export function shouldUseJson(): boolean {
  return (
    process.env.ADA_OUTPUT === 'json' ||
    process.argv.includes('--json') ||
    process.argv.includes('-j')
  );
}

/**
 * Detect render options from environment.
 */
export function detectRenderOptions(): RenderOptions {
  const json = shouldUseJson();
  const tty = process.stdout?.isTTY ?? false;
  const ci = process.env.CI !== undefined;
  const color = !json && shouldUseColors();

  return { json, tty, color, ci };
}

/**
 * Apply color formatting if enabled.
 */
function colorize(text: string, color: string, options: RenderOptions): string {
  if (!options.color) return text;
  return `${color}${text}${ANSI.reset}`;
}

/**
 * Format suggestion for terminal output.
 */
function formatSuggestion(
  suggestion: Suggestion,
  options: RenderOptions
): string {
  const symbol = suggestion.primary ? SYMBOLS.suggestion : SYMBOLS.secondary;
  const color = suggestion.primary ? ANSI.cyan : ANSI.dim;

  let line = `  ${symbol} ${suggestion.action}`;

  if (suggestion.command && options.tty) {
    // Show command on same line if short, separate line if long
    const commandFormatted = colorize(suggestion.command, ANSI.bold, options);
    if (suggestion.action.length < 40) {
      line = `  ${symbol} ${suggestion.action}:\n     ${commandFormatted}`;
    } else {
      line = `  ${symbol} ${suggestion.action}\n     ${commandFormatted}`;
    }
  } else if (suggestion.command) {
    line += `\n     ${suggestion.command}`;
  }

  return colorize(line, color, options);
}

/**
 * Render error for TTY terminal (colorful, with emoji).
 */
function renderTty(error: AdaError, options: RenderOptions): string {
  const lines: string[] = [];

  // Header: ✖ Error Title (CODE)
  const marker = colorize(SYMBOLS.error, ANSI.red, options);
  const title = colorize(
    `${error.message} (${error.code})`,
    ANSI.bold,
    options
  );
  lines.push(`${marker} ${title}`);
  lines.push('');

  // Details (if any)
  if (Object.keys(error.details).length > 0) {
    for (const [key, value] of Object.entries(error.details)) {
      const formattedKey = colorize(`  ${key}:`, ANSI.dim, options);
      lines.push(`${formattedKey} ${String(value)}`);
    }
    lines.push('');
  }

  // Primary suggestion
  const primary = error.primarySuggestion;
  if (primary) {
    lines.push(formatSuggestion(primary, options));
    lines.push('');
  }

  // Secondary suggestions
  const secondary = error.secondarySuggestions;
  if (secondary.length > 0) {
    for (const suggestion of secondary) {
      lines.push(formatSuggestion(suggestion, options));
    }
    lines.push('');
  }

  // Docs link
  const docsIcon = SYMBOLS.docs;
  const docsLink = colorize(error.docs, ANSI.dim, options);
  lines.push(`  ${docsIcon} Docs: ${docsLink}`);

  return lines.join('\n');
}

/**
 * Render error for non-TTY (plain text, CI-friendly).
 */
function renderPlain(error: AdaError, _opts: RenderOptions): string {
  void _opts; // Reserved for future use
  const lines: string[] = [];

  // Header
  lines.push(`ERROR [${error.code}]: ${error.message}`);

  // Details
  if (Object.keys(error.details).length > 0) {
    for (const [key, value] of Object.entries(error.details)) {
      lines.push(`  ${key}: ${String(value)}`);
    }
  }

  // Suggestions
  const primary = error.primarySuggestion;
  if (primary) {
    const cmd = primary.command ? ` (${primary.command})` : '';
    lines.push(`  Fix: ${primary.action}${cmd}`);
  }

  for (const suggestion of error.secondarySuggestions) {
    const cmd = suggestion.command ? ` (${suggestion.command})` : '';
    lines.push(`  Alt: ${suggestion.action}${cmd}`);
  }

  // Docs
  lines.push(`  Docs: ${error.docs}`);

  return lines.join('\n');
}

/**
 * Render error as JSON.
 */
function renderJson(error: AdaError, _opts: RenderOptions): string {
  void _opts; // Reserved for future use
  return JSON.stringify(error.toJSON(), null, 2);
}

/**
 * Render an AdaError for terminal output.
 *
 * Automatically detects the appropriate format based on:
 * - `--json` flag or `ADA_OUTPUT=json` → JSON
 * - TTY terminal with colors → Colorful with emoji
 * - Non-TTY or CI → Plain text
 *
 * @param error - The AdaError to render
 * @param options - Optional render options (auto-detected if not provided)
 * @returns Formatted error string
 */
export function renderError(
  error: AdaError,
  options?: Partial<RenderOptions>
): string {
  const opts: RenderOptions = {
    ...detectRenderOptions(),
    ...options,
  };

  if (opts.json) {
    return renderJson(error, opts);
  }

  if (opts.tty && opts.color) {
    return renderTty(error, opts);
  }

  return renderPlain(error, opts);
}

/**
 * Print an error to stderr and return the exit code.
 *
 * @param error - The error to print (AdaError or any Error)
 * @param options - Optional render options
 * @returns The exit code to use
 */
export function printError(
  error: unknown,
  options?: Partial<RenderOptions>
): number {
  const adaError = AdaError.isAdaError(error)
    ? error
    : AdaError.from(error);

  const output = renderError(adaError, options);
  console.error(output);

  return adaError.exitCode;
}

/**
 * Error handler for CLI commands.
 * Wraps a function to catch errors and render them properly.
 *
 * @example
 * ```typescript
 * const handler = withErrorHandler(async () => {
 *   // command logic that might throw AdaError
 * });
 *
 * handler().catch((exitCode) => process.exit(exitCode));
 * ```
 */
export function withErrorHandler<T>(
  fn: () => T | Promise<T>,
  options?: Partial<RenderOptions>
): () => Promise<T> {
  return async () => {
    try {
      return await fn();
    } catch (error) {
      const exitCode = printError(error, options);
      throw exitCode;
    }
  };
}
