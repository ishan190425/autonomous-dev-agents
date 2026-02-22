/**
 * @file Error types and interfaces for ADA CLI
 * @description Implements C1082 CLI Error Messages UX Spec
 * @see docs/design/cli-error-messages-ux-spec-c1082.md
 */

/**
 * Error categories for ADA CLI errors.
 * Each category has a distinct exit code range.
 */
export type ErrorCategory = 'config' | 'runtime' | 'network' | 'validation';

/**
 * Error codes follow pattern: ADA_<CATEGORY>_<NAME>
 * All codes are uppercase with underscores.
 */
export type ErrorCode =
  // Configuration errors (exit code 3)
  | 'ADA_NOT_INITIALIZED'
  | 'ADA_INVALID_CONFIG'
  | 'ADA_MISSING_PLAYBOOK'
  | 'ADA_CORRUPT_STATE'
  // Runtime errors (exit code 4)
  | 'ADA_CYCLE_IN_PROGRESS'
  | 'ADA_WRONG_ROLE'
  | 'ADA_GIT_DIRTY'
  | 'ADA_GIT_CONFLICT'
  // Network errors (exit code 5)
  | 'ADA_GITHUB_UNAUTHORIZED'
  | 'ADA_GITHUB_RATE_LIMIT'
  | 'ADA_GITHUB_NOT_FOUND'
  | 'ADA_NETWORK_OFFLINE'
  // Validation errors (exit code 2)
  | 'ADA_MISSING_ACTION'
  | 'ADA_INVALID_ROLE'
  | 'ADA_EMPTY_MEMORY'
  // Generic fallback
  | 'ADA_UNKNOWN_ERROR';

/**
 * Suggestion for resolving an error.
 */
export interface Suggestion {
  /** Suggestion text describing the action to take */
  action: string;
  /** Whether this is the primary (most likely) fix */
  primary: boolean;
  /** Optional command to run */
  command?: string;
}

/**
 * Error definition in the registry.
 */
export interface ErrorDefinition {
  /** Exit code for this error (1-6) */
  exitCode: number;
  /** Error category */
  category: ErrorCategory;
  /** Human-readable message template */
  template: string;
  /** URL to documentation for this error */
  docs: string;
  /** Default suggestions (can be overridden per-instance) */
  defaultSuggestions: Suggestion[];
}

/**
 * Context about the command that triggered the error.
 * Used to generate context-aware error messages.
 */
export interface ErrorContext {
  /** Command being executed (e.g., 'dispatch complete') */
  command?: string;
  /** Flags passed to the command */
  flags?: string[];
  /** Flag that was missing (for validation errors) */
  missingFlag?: string;
  /** Current working directory */
  workingDir?: string;
  /** Whether this is a git repository */
  hasGit?: boolean;
  /** Whether ADA is initialized in this directory */
  hasAda?: boolean;
}

/**
 * Structured error data for JSON output.
 */
export interface ErrorJson {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details: Record<string, unknown>;
    suggestions: Suggestion[];
    docs: string;
    exitCode: number;
  };
}

/**
 * Rendering options for error output.
 */
export interface RenderOptions {
  /** Whether to output JSON format */
  json?: boolean;
  /** Whether output is to a TTY (terminal) */
  tty?: boolean;
  /** Whether to use colors (respects NO_COLOR env) */
  color?: boolean;
  /** Whether running in CI environment */
  ci?: boolean;
}

/**
 * Standard exit codes per C1082 spec.
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  USAGE_ERROR: 2,
  CONFIG_ERROR: 3,
  RUNTIME_ERROR: 4,
  NETWORK_ERROR: 5,
  GIT_ERROR: 6,
} as const;

/**
 * Category to exit code mapping.
 */
export const CATEGORY_EXIT_CODES: Record<ErrorCategory, number> = {
  config: EXIT_CODES.CONFIG_ERROR,
  runtime: EXIT_CODES.RUNTIME_ERROR,
  network: EXIT_CODES.NETWORK_ERROR,
  validation: EXIT_CODES.USAGE_ERROR,
};
