/**
 * @file ADA Error Handling Module
 * @description Structured errors with actionable suggestions for ADA CLI
 * @see docs/design/cli-error-messages-ux-spec-c1082.md
 *
 * ## Overview
 *
 * This module provides a comprehensive error handling system for the ADA CLI.
 * Every error includes:
 * - A standardized error code (e.g., `ADA_NOT_INITIALIZED`)
 * - A human-readable message explaining what went wrong
 * - Actionable suggestions for resolution
 * - Documentation link for more details
 * - Appropriate exit code for scripting
 *
 * ## Usage
 *
 * ### Basic Error Throwing
 *
 * ```typescript
 * import { AdaError } from '@ada-ai/core';
 *
 * throw new AdaError('ADA_NOT_INITIALIZED', {
 *   details: { missingFile: 'rotation.json' },
 * });
 * ```
 *
 * ### Using ErrorBuilder (Fluent API)
 *
 * ```typescript
 * import { ErrorBuilder, adaError } from '@ada-ai/core';
 *
 * // Long form
 * throw new ErrorBuilder('ADA_NOT_INITIALIZED')
 *   .context('dispatch start')
 *   .detail('missingFile', 'rotation.json')
 *   .suggest('Run `ada init`', { primary: true })
 *   .build();
 *
 * // Short form with factory
 * throw adaError('ADA_NOT_INITIALIZED')
 *   .detail('missingFile', 'rotation.json')
 *   .build();
 * ```
 *
 * ### Rendering Errors
 *
 * ```typescript
 * import { renderError, printError } from '@ada-ai/core';
 *
 * try {
 *   // ... code that throws AdaError
 * } catch (error) {
 *   // Print to stderr and get exit code
 *   const exitCode = printError(error);
 *   process.exit(exitCode);
 * }
 * ```
 *
 * ### JSON Output
 *
 * ```typescript
 * const output = renderError(error, { json: true });
 * // { "ok": false, "error": { "code": "ADA_NOT_INITIALIZED", ... } }
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  ErrorCategory,
  ErrorCode,
  Suggestion,
  ErrorDefinition,
  ErrorContext,
  ErrorJson,
  RenderOptions,
} from './types.js';

export { EXIT_CODES, CATEGORY_EXIT_CODES } from './types.js';

// Registry
export {
  ERROR_REGISTRY,
  DOCS_BASE_URL,
  getErrorDefinition,
  isValidErrorCode,
} from './registry.js';

// Error class
export { AdaError } from './error.js';

// Builder
export { ErrorBuilder, adaError } from './builder.js';

// Renderer
export {
  shouldUseColors,
  shouldUseJson,
  detectRenderOptions,
  renderError,
  printError,
  withErrorHandler,
} from './renderer.js';
