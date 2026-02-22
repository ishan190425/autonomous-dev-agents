/**
 * @file ErrorBuilder — fluent API for constructing AdaError instances
 * @description Implements C1082 CLI Error Messages UX Spec
 * @see docs/design/cli-error-messages-ux-spec-c1082.md
 */

import type { ErrorCode, ErrorContext, Suggestion } from './types.js';
import { AdaError } from './error.js';

/**
 * Fluent builder for constructing AdaError instances.
 *
 * @example
 * ```typescript
 * throw new ErrorBuilder('ADA_NOT_INITIALIZED')
 *   .context('dispatch start')
 *   .detail('missingFile', 'agents/state/rotation.json')
 *   .suggest('Run `ada init` to set up an agent team', { primary: true })
 *   .suggest('Navigate to a directory with ADA configured')
 *   .build();
 * ```
 */
export class ErrorBuilder {
  private readonly code: ErrorCode;
  private messageOverride?: string;
  private errorContext: ErrorContext = {};
  private errorDetails: Record<string, unknown> = {};
  private errorSuggestions: Suggestion[] = [];
  private replaceSuggestionsFlag = false;
  private errorCause?: Error;

  constructor(code: ErrorCode) {
    this.code = code;
  }

  /**
   * Override the default message template.
   */
  message(msg: string): this {
    this.messageOverride = msg;
    return this;
  }

  /**
   * Set the command context (command name).
   */
  context(command: string): this {
    this.errorContext.command = command;
    return this;
  }

  /**
   * Set the working directory context.
   */
  workDir(dir: string): this {
    this.errorContext.workingDir = dir;
    return this;
  }

  /**
   * Set flags passed to the command.
   */
  flags(flags: string[]): this {
    this.errorContext.flags = flags;
    return this;
  }

  /**
   * Set a missing flag (for validation errors).
   */
  missingFlag(flag: string): this {
    this.errorContext.missingFlag = flag;
    return this;
  }

  /**
   * Set git status in context.
   */
  git(hasGit: boolean): this {
    this.errorContext.hasGit = hasGit;
    return this;
  }

  /**
   * Set ADA initialization status in context.
   */
  ada(hasAda: boolean): this {
    this.errorContext.hasAda = hasAda;
    return this;
  }

  /**
   * Add a detail key-value pair.
   */
  detail(key: string, value: unknown): this {
    this.errorDetails[key] = value;
    return this;
  }

  /**
   * Add multiple details at once.
   */
  details(details: Record<string, unknown>): this {
    Object.assign(this.errorDetails, details);
    return this;
  }

  /**
   * Add a suggestion.
   *
   * @param action - The suggestion text
   * @param options - Optional: { primary: boolean, command: string }
   */
  suggest(
    action: string,
    options?: { primary?: boolean; command?: string }
  ): this {
    const suggestion: Suggestion = {
      action,
      primary: options?.primary ?? false,
    };
    if (options?.command) {
      suggestion.command = options.command;
    }
    this.errorSuggestions.push(suggestion);
    return this;
  }

  /**
   * Add a primary suggestion (shorthand for suggest with primary: true).
   */
  suggestPrimary(action: string, command?: string): this {
    if (command) {
      return this.suggest(action, { primary: true, command });
    }
    return this.suggest(action, { primary: true });
  }

  /**
   * Replace default suggestions instead of merging.
   */
  replaceSuggestions(): this {
    this.replaceSuggestionsFlag = true;
    return this;
  }

  /**
   * Set the cause (original error).
   */
  cause(error: Error): this {
    this.errorCause = error;
    return this;
  }

  /**
   * Build and return the AdaError instance.
   */
  build(): AdaError {
    const options: {
      message?: string;
      details?: Record<string, unknown>;
      context?: ErrorContext;
      suggestions?: Suggestion[];
      replaceSuggestions?: boolean;
      cause?: Error;
    } = {};

    if (this.messageOverride) {
      options.message = this.messageOverride;
    }
    if (Object.keys(this.errorDetails).length > 0) {
      options.details = this.errorDetails;
    }
    if (Object.keys(this.errorContext).length > 0) {
      options.context = this.errorContext;
    }
    if (this.errorSuggestions.length > 0) {
      options.suggestions = this.errorSuggestions;
    }
    if (this.replaceSuggestionsFlag) {
      options.replaceSuggestions = true;
    }
    if (this.errorCause) {
      options.cause = this.errorCause;
    }

    return new AdaError(this.code, options);
  }

  /**
   * Build and throw the error immediately.
   */
  throw(): never {
    throw this.build();
  }
}

/**
 * Factory function for creating an ErrorBuilder.
 * Shorthand for `new ErrorBuilder(code)`.
 *
 * @example
 * ```typescript
 * throw adaError('ADA_NOT_INITIALIZED')
 *   .detail('missingFile', 'rotation.json')
 *   .build();
 * ```
 */
export function adaError(code: ErrorCode): ErrorBuilder {
  return new ErrorBuilder(code);
}
