/**
 * @file AdaError class — structured error with actionable suggestions
 * @description Implements C1082 CLI Error Messages UX Spec
 * @see docs/design/cli-error-messages-ux-spec-c1082.md
 */

import type { ErrorCode, ErrorContext, Suggestion } from './types.js';
import { getErrorDefinition } from './registry.js';

/**
 * Structured error class for ADA CLI.
 *
 * Provides:
 * - Error code for programmatic handling
 * - Human-readable message with context
 * - Actionable suggestions for resolution
 * - Documentation link
 * - Appropriate exit code
 *
 * @example
 * ```typescript
 * throw new AdaError('ADA_NOT_INITIALIZED', {
 *   details: { missingFile: 'agents/state/rotation.json' },
 *   context: { command: 'dispatch start', workingDir: process.cwd() },
 * });
 * ```
 */
export class AdaError extends Error {
  /** Error code (e.g., ADA_NOT_INITIALIZED) */
  readonly code: ErrorCode;

  /** Error category (config, runtime, network, validation) */
  readonly category: string;

  /** Additional details about the error */
  readonly details: Record<string, unknown>;

  /** Suggestions for resolving the error */
  readonly suggestions: Suggestion[];

  /** URL to documentation */
  readonly docs: string;

  /** Exit code for CLI (1-6) */
  readonly exitCode: number;

  /** Command context when error occurred */
  readonly context?: ErrorContext;

  constructor(
    code: ErrorCode,
    options: {
      /** Override the default message template */
      message?: string;
      /** Additional details (e.g., missingFile, invalidField) */
      details?: Record<string, unknown>;
      /** Command context */
      context?: ErrorContext;
      /** Additional suggestions (merged with defaults) */
      suggestions?: Suggestion[];
      /** Replace default suggestions entirely */
      replaceSuggestions?: boolean;
      /** Original error that caused this */
      cause?: Error;
    } = {}
  ) {
    const definition = getErrorDefinition(code);
    const message = options.message ?? definition.template;

    super(message, { cause: options.cause });

    this.name = 'AdaError';
    this.code = code;
    this.category = definition.category;
    this.details = options.details ?? {};
    this.docs = definition.docs;
    this.exitCode = definition.exitCode;
    if (options.context) {
      this.context = options.context;
    }

    // Merge suggestions: defaults + custom, or replace entirely
    if (options.replaceSuggestions && options.suggestions) {
      this.suggestions = options.suggestions;
    } else {
      this.suggestions = [
        ...definition.defaultSuggestions,
        ...(options.suggestions ?? []),
      ];
    }

    // Capture stack trace properly
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AdaError);
    }
  }

  /**
   * Get the primary (most likely) suggestion.
   */
  get primarySuggestion(): Suggestion | undefined {
    return this.suggestions.find((s) => s.primary);
  }

  /**
   * Get secondary suggestions.
   */
  get secondarySuggestions(): Suggestion[] {
    return this.suggestions.filter((s) => !s.primary);
  }

  /**
   * Convert to JSON for structured output.
   */
  toJSON(): {
    ok: false;
    error: {
      code: ErrorCode;
      message: string;
      details: Record<string, unknown>;
      suggestions: Suggestion[];
      docs: string;
      exitCode: number;
      context?: ErrorContext;
    };
  } {
    return {
      ok: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        suggestions: this.suggestions,
        docs: this.docs,
        exitCode: this.exitCode,
        ...(this.context && { context: this.context }),
      },
    };
  }

  /**
   * Create an AdaError from an unknown error.
   * Wraps non-AdaError exceptions with ADA_UNKNOWN_ERROR.
   */
  static from(
    error: unknown,
    options?: {
      context?: ErrorContext;
      fallbackCode?: ErrorCode;
    }
  ): AdaError {
    if (error instanceof AdaError) {
      return error;
    }

    const code = options?.fallbackCode ?? 'ADA_UNKNOWN_ERROR';
    const cause = error instanceof Error ? error : undefined;
    const message = error instanceof Error ? error.message : String(error);

    const errorOptions: ConstructorParameters<typeof AdaError>[1] = {
      message,
      details: {
        originalError: message,
        ...(cause?.stack && { stack: cause.stack }),
      },
    };

    if (cause) {
      errorOptions.cause = cause;
    }
    if (options?.context) {
      errorOptions.context = options.context;
    }

    return new AdaError(code, errorOptions);
  }

  /**
   * Check if an error is an AdaError.
   */
  static isAdaError(error: unknown): error is AdaError {
    return error instanceof AdaError;
  }
}
