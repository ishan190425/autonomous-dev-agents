/**
 * Progress indicators for CLI operations.
 *
 * Provides spinners, progress bars, and step indicators for long-running
 * operations. Automatically handles TTY detection, NO_COLOR, CI environments.
 *
 * @see docs/design/cli-progress-indicators-ux-spec-c1072.md
 * @see Issue #175 — Progress Indicators for Long-Running Operations
 */

import ora, { type Ora, type Options as OraOptions } from 'ora';
import chalk from 'chalk';

// Node.js globals for timer functions
declare const setInterval: typeof globalThis.setInterval;
declare const clearInterval: typeof globalThis.clearInterval;

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Progress indicator options.
 */
export interface ProgressOptions {
  /** Initial text to display */
  text: string;
  /** Show elapsed time after specified ms (default: 5000) */
  showElapsedAfterMs?: number;
  /** Use JSON output mode (suppress UI) */
  json?: boolean;
  /** Quiet mode (minimal output) */
  quiet?: boolean;
}

/**
 * Step status in multi-step progress.
 */
export type StepStatus = 'pending' | 'in-progress' | 'complete' | 'failed' | 'skipped';

/**
 * Step definition for multi-step progress.
 */
export interface Step {
  name: string;
  status: StepStatus;
  detail?: string;
}

// ─── Environment Detection ───────────────────────────────────────────────────

/**
 * Check if we're in an interactive TTY environment.
 */
export function isTTY(): boolean {
  return Boolean(
    process.stdout.isTTY &&
    !process.env.CI &&
    !process.env.GITHUB_ACTIONS
  );
}

/**
 * Check if colors are disabled.
 */
export function isNoColor(): boolean {
  return Boolean(
    process.env.NO_COLOR ||
    process.env.TERM === 'dumb'
  );
}

/**
 * Check if we're in CI environment.
 */
export function isCI(): boolean {
  return Boolean(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.JENKINS_URL ||
    process.env.GITLAB_CI
  );
}

// ─── Spinner Class ───────────────────────────────────────────────────────────

/**
 * Spinner for indeterminate progress.
 *
 * @example
 * const spin = spinner('Loading...');
 * // ... do work ...
 * spin.succeed('Done!');
 */
export class Spinner {
  private ora: Ora | null = null;
  private startTime: number;
  private elapsedInterval: ReturnType<typeof setInterval> | null = null;
  private baseText: string;
  private options: ProgressOptions;

  constructor(options: ProgressOptions) {
    this.options = options;
    this.baseText = options.text;
    this.startTime = Date.now();

    // Skip spinner in non-TTY, JSON, or quiet modes
    if (!isTTY() || options.json || options.quiet) {
      if (!options.json && !options.quiet) {
        // CI mode: just log the text
        console.log(`[INFO] ${options.text}`);
      }
      return;
    }

    const oraOptions: OraOptions = {
      text: options.text,
      spinner: 'dots', // Braille dots spinner
      ...(isNoColor() ? {} : { color: 'cyan' as const }),
    };

    this.ora = ora(oraOptions).start();

    // Show elapsed time after threshold
    const elapsedThreshold = options.showElapsedAfterMs ?? 5000;
    this.elapsedInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - this.startTime) / 1000);
      if (elapsed >= elapsedThreshold / 1000 && this.ora) {
        this.ora.text = `${this.baseText} (${elapsed}s elapsed)`;
      }
    }, 1000);
  }

  /**
   * Update the spinner text.
   */
  text(newText: string): void {
    this.baseText = newText;
    if (this.ora) {
      this.ora.text = newText;
    } else if (!this.options.json && !this.options.quiet && !isTTY()) {
      console.log(`[INFO] ${newText}`);
    }
  }

  /**
   * Mark operation as successful.
   */
  succeed(text?: string): void {
    this.cleanup();
    const finalText = text ?? this.baseText;

    if (this.ora) {
      this.ora.succeed(finalText);
    } else if (!this.options.json && !this.options.quiet) {
      console.log(`[OK] ${finalText}`);
    }
  }

  /**
   * Mark operation as failed.
   */
  fail(text?: string): void {
    this.cleanup();
    const finalText = text ?? this.baseText;

    if (this.ora) {
      this.ora.fail(finalText);
    } else if (!this.options.json && !this.options.quiet) {
      console.log(`[FAIL] ${finalText}`);
    }
  }

  /**
   * Mark operation with a warning.
   */
  warn(text?: string): void {
    this.cleanup();
    const finalText = text ?? this.baseText;

    if (this.ora) {
      this.ora.warn(finalText);
    } else if (!this.options.json && !this.options.quiet) {
      console.log(`[WARN] ${finalText}`);
    }
  }

  /**
   * Stop the spinner without a final state.
   */
  stop(): void {
    this.cleanup();
    if (this.ora) {
      this.ora.stop();
    }
  }

  /**
   * Get elapsed time in seconds.
   */
  elapsed(): number {
    return Math.round((Date.now() - this.startTime) / 1000);
  }

  private cleanup(): void {
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
      this.elapsedInterval = null;
    }
  }
}

// ─── Step Progress Class ─────────────────────────────────────────────────────

/**
 * Multi-step progress indicator.
 *
 * @example
 * const steps = stepProgress([
 *   'Validate rotation',
 *   'Load memory bank',
 *   'Build context',
 *   'Create lock'
 * ]);
 * steps.start(0); // Start step 0
 * steps.complete(0); // Mark step 0 complete
 * steps.start(1);
 * // etc.
 */
export class StepProgress {
  private steps: Step[];
  private options: ProgressOptions;
  private currentSpinner: Ora | null = null;

  constructor(stepNames: string[], options: Partial<ProgressOptions> = {}) {
    this.options = { text: '', ...options };
    this.steps = stepNames.map(name => ({
      name,
      status: 'pending' as StepStatus,
    }));

    // Initial render
    if (isTTY() && !options.json && !options.quiet) {
      this.render();
    }
  }

  /**
   * Start a step (mark as in-progress).
   */
  start(index: number, detail?: string): void {
    if (index < 0 || index >= this.steps.length) return;

    const step = this.steps[index];
    if (!step) return;
    step.status = 'in-progress';
    if (detail) step.detail = detail;

    if (isTTY() && !this.options.json && !this.options.quiet) {
      this.render();
      // Start spinner for this step
      this.currentSpinner = ora({
        text: step.name + (detail ? ` ${chalk.dim(detail)}` : ''),
        prefixText: '  ',
        color: 'cyan',
        spinner: 'dots',
      }).start();
    } else if (!this.options.json && !this.options.quiet) {
      console.log(`[...] ${step.name}${detail ? ` — ${detail}` : ''}`);
    }
  }

  /**
   * Mark a step as complete.
   */
  complete(index: number, detail?: string): void {
    if (index < 0 || index >= this.steps.length) return;

    const step = this.steps[index];
    if (!step) return;
    step.status = 'complete';
    if (detail) step.detail = detail;

    if (this.currentSpinner) {
      this.currentSpinner.stop();
      this.currentSpinner = null;
    }

    if (isTTY() && !this.options.json && !this.options.quiet) {
      // Clear and re-render
      this.render();
    } else if (!this.options.json && !this.options.quiet) {
      console.log(`[OK] ${step.name}${detail ? ` — ${detail}` : ''}`);
    }
  }

  /**
   * Mark a step as failed.
   */
  fail(index: number, detail?: string): void {
    if (index < 0 || index >= this.steps.length) return;

    const step = this.steps[index];
    if (!step) return;
    step.status = 'failed';
    if (detail) step.detail = detail;

    if (this.currentSpinner) {
      this.currentSpinner.stop();
      this.currentSpinner = null;
    }

    if (isTTY() && !this.options.json && !this.options.quiet) {
      this.render();
    } else if (!this.options.json && !this.options.quiet) {
      console.log(`[FAIL] ${step.name}${detail ? ` — ${detail}` : ''}`);
    }
  }

  /**
   * Skip a step.
   */
  skip(index: number, detail?: string): void {
    if (index < 0 || index >= this.steps.length) return;

    const step = this.steps[index];
    if (!step) return;
    step.status = 'skipped';
    if (detail) step.detail = detail;

    if (!this.options.json && !this.options.quiet) {
      if (isTTY()) {
        this.render();
      } else {
        console.log(`[SKIP] ${step.name}${detail ? ` — ${detail}` : ''}`);
      }
    }
  }

  /**
   * Finish all steps (call after last step completes).
   */
  finish(): void {
    if (this.currentSpinner) {
      this.currentSpinner.stop();
      this.currentSpinner = null;
    }
    // Final render in TTY mode
    if (isTTY() && !this.options.json && !this.options.quiet) {
      this.render();
      console.log(); // Extra newline after steps
    }
  }

  private render(): void {
    // In TTY mode, we'd ideally use cursor positioning to update in place
    // For simplicity, just output each completed step
    // Future enhancement: use blessed or similar for true in-place updates
  }
}

// ─── Factory Functions ───────────────────────────────────────────────────────

/**
 * Create a spinner for indeterminate progress.
 *
 * @example
 * const spin = spinner('Loading...');
 * await doWork();
 * spin.succeed('Done!');
 */
export function spinner(text: string, options: Partial<ProgressOptions> = {}): Spinner {
  return new Spinner({ text, ...options });
}

/**
 * Create a multi-step progress indicator.
 *
 * @example
 * const progress = stepProgress(['Step 1', 'Step 2', 'Step 3']);
 * progress.start(0);
 * await step1();
 * progress.complete(0);
 * progress.start(1);
 * // etc.
 */
export function stepProgress(
  steps: string[],
  options: Partial<ProgressOptions> = {}
): StepProgress {
  return new StepProgress(steps, options);
}

// ─── Progress Bar (Future Enhancement) ───────────────────────────────────────

/**
 * Create a progress bar for determinate progress.
 * Currently returns a simple logging wrapper.
 *
 * @example
 * const bar = progressBar('Processing', 100);
 * for (let i = 0; i <= 100; i++) {
 *   bar.update(i);
 * }
 * bar.finish();
 */
/** Progress bar interface */
export interface ProgressBarHandle {
  update: (current: number, text?: string) => void;
  finish: (text?: string) => void;
}

export function progressBar(text: string, total: number): ProgressBarHandle {
  let lastPercent = -1;

  return {
    update(current: number, newText?: string): void {
      const percent = Math.round((current / total) * 100);
      // Only log at 10% increments to avoid spam
      if (percent !== lastPercent && percent % 10 === 0) {
        lastPercent = percent;
        const displayText = newText ?? text;
        if (!isCI()) {
          console.log(`${displayText} ${percent}%`);
        }
      }
    },
    finish(finalText?: string): void {
      console.log(finalText ?? `${text} complete`);
    },
  };
}
