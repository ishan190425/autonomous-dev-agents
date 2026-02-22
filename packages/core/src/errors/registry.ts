/**
 * @file Error registry for ADA CLI
 * @description Centralized error definitions with messages, codes, and suggestions
 * @see docs/design/cli-error-messages-ux-spec-c1082.md
 */

import type { ErrorCode, ErrorDefinition } from './types.js';
import { EXIT_CODES } from './types.js';

/**
 * Base URL for error documentation.
 */
export const DOCS_BASE_URL = 'https://ada.dev/errors';

/**
 * Registry of all ADA error codes.
 * Each error has a standardized structure for consistent UX.
 */
export const ERROR_REGISTRY: Record<ErrorCode, ErrorDefinition> = {
  // ============================================
  // Configuration Errors (exit code 3)
  // ============================================

  ADA_NOT_INITIALIZED: {
    exitCode: EXIT_CODES.CONFIG_ERROR,
    category: 'config',
    template: "This directory doesn't have an ADA agent team configured",
    docs: `${DOCS_BASE_URL}/ADA_NOT_INITIALIZED`,
    defaultSuggestions: [
      {
        action: 'Run `ada init` to set up an agent team here',
        primary: true,
        command: 'ada init',
      },
      {
        action: 'Navigate to a directory that has ADA configured',
        primary: false,
      },
    ],
  },

  ADA_INVALID_CONFIG: {
    exitCode: EXIT_CODES.CONFIG_ERROR,
    category: 'config',
    template: 'Invalid configuration detected',
    docs: `${DOCS_BASE_URL}/ADA_INVALID_CONFIG`,
    defaultSuggestions: [
      {
        action: 'Run `ada doctor` to diagnose and fix configuration issues',
        primary: true,
        command: 'ada doctor',
      },
      {
        action: 'Check roster.json and rotation.json for syntax errors',
        primary: false,
      },
    ],
  },

  ADA_MISSING_PLAYBOOK: {
    exitCode: EXIT_CODES.CONFIG_ERROR,
    category: 'config',
    template: 'Playbook file not found for role',
    docs: `${DOCS_BASE_URL}/ADA_MISSING_PLAYBOOK`,
    defaultSuggestions: [
      {
        action: 'Create the missing playbook file',
        primary: true,
      },
      {
        action: 'Run `ada roles add` to add a role with its playbook',
        primary: false,
        command: 'ada roles add',
      },
    ],
  },

  ADA_CORRUPT_STATE: {
    exitCode: EXIT_CODES.CONFIG_ERROR,
    category: 'config',
    template: 'Rotation state file is corrupted or invalid JSON',
    docs: `${DOCS_BASE_URL}/ADA_CORRUPT_STATE`,
    defaultSuggestions: [
      {
        action: 'Run `ada repair` to restore from backup',
        primary: true,
        command: 'ada repair',
      },
      {
        action: 'Manually fix agents/state/rotation.json',
        primary: false,
      },
    ],
  },

  // ============================================
  // Runtime Errors (exit code 4)
  // ============================================

  ADA_CYCLE_IN_PROGRESS: {
    exitCode: EXIT_CODES.RUNTIME_ERROR,
    category: 'runtime',
    template: 'A dispatch cycle is already in progress',
    docs: `${DOCS_BASE_URL}/ADA_CYCLE_IN_PROGRESS`,
    defaultSuggestions: [
      {
        action: 'Complete the current cycle first',
        primary: true,
        command: 'ada dispatch complete --action "..."',
      },
      {
        action: 'If the cycle is stale, force a new start',
        primary: false,
        command: 'ada dispatch start --force',
      },
    ],
  },

  ADA_WRONG_ROLE: {
    exitCode: EXIT_CODES.RUNTIME_ERROR,
    category: 'runtime',
    template: "It's not your turn in the rotation",
    docs: `${DOCS_BASE_URL}/ADA_WRONG_ROLE`,
    defaultSuggestions: [
      {
        action: 'Check current rotation with `ada status`',
        primary: true,
        command: 'ada status',
      },
      {
        action: 'Wait for your turn or coordinate with the team',
        primary: false,
      },
    ],
  },

  ADA_GIT_DIRTY: {
    exitCode: EXIT_CODES.GIT_ERROR,
    category: 'runtime',
    template: 'Uncommitted changes detected in working directory',
    docs: `${DOCS_BASE_URL}/ADA_GIT_DIRTY`,
    defaultSuggestions: [
      {
        action: 'Include changes in your dispatch (they will be committed)',
        primary: true,
      },
      {
        action: 'Stash changes first',
        primary: false,
        command: 'git stash',
      },
      {
        action: 'Commit changes separately before dispatch',
        primary: false,
      },
    ],
  },

  ADA_GIT_CONFLICT: {
    exitCode: EXIT_CODES.GIT_ERROR,
    category: 'runtime',
    template: 'Git merge conflict during push',
    docs: `${DOCS_BASE_URL}/ADA_GIT_CONFLICT`,
    defaultSuggestions: [
      {
        action: 'Pull latest changes and resolve conflicts',
        primary: true,
        command: 'git pull --rebase',
      },
      {
        action: 'Then retry the push',
        primary: false,
        command: 'git push origin main',
      },
    ],
  },

  // ============================================
  // Network Errors (exit code 5)
  // ============================================

  ADA_GITHUB_UNAUTHORIZED: {
    exitCode: EXIT_CODES.NETWORK_ERROR,
    category: 'network',
    template: 'GitHub authorization failed — token invalid or expired',
    docs: `${DOCS_BASE_URL}/ADA_GITHUB_UNAUTHORIZED`,
    defaultSuggestions: [
      {
        action: 'Re-authenticate with GitHub',
        primary: true,
        command: 'gh auth login',
      },
      {
        action: 'Set GH_TOKEN environment variable',
        primary: false,
      },
      {
        action: 'Check token scopes — needs repo access',
        primary: false,
      },
    ],
  },

  ADA_GITHUB_RATE_LIMIT: {
    exitCode: EXIT_CODES.NETWORK_ERROR,
    category: 'network',
    template: 'GitHub API rate limit exceeded',
    docs: `${DOCS_BASE_URL}/ADA_GITHUB_RATE_LIMIT`,
    defaultSuggestions: [
      {
        action: 'Wait for rate limit to reset (usually 1 hour)',
        primary: true,
      },
      {
        action: 'Use --skip-github flag to bypass GitHub operations',
        primary: false,
      },
    ],
  },

  ADA_GITHUB_NOT_FOUND: {
    exitCode: EXIT_CODES.NETWORK_ERROR,
    category: 'network',
    template: "GitHub resource not found — repo or issue doesn't exist",
    docs: `${DOCS_BASE_URL}/ADA_GITHUB_NOT_FOUND`,
    defaultSuggestions: [
      {
        action: 'Check the repository URL in your config',
        primary: true,
      },
      {
        action: 'Verify the issue/PR number exists',
        primary: false,
      },
    ],
  },

  ADA_NETWORK_OFFLINE: {
    exitCode: EXIT_CODES.NETWORK_ERROR,
    category: 'network',
    template: 'No internet connection available',
    docs: `${DOCS_BASE_URL}/ADA_NETWORK_OFFLINE`,
    defaultSuggestions: [
      {
        action: 'Check your internet connection',
        primary: true,
      },
      {
        action: 'Use --offline flag for local-only operations',
        primary: false,
      },
    ],
  },

  // ============================================
  // Validation Errors (exit code 2)
  // ============================================

  ADA_MISSING_ACTION: {
    exitCode: EXIT_CODES.USAGE_ERROR,
    category: 'validation',
    template: 'The --action flag is required to describe what you did',
    docs: `${DOCS_BASE_URL}/ADA_MISSING_ACTION`,
    defaultSuggestions: [
      {
        action: 'Add the action flag to describe your work',
        primary: true,
        command: 'ada dispatch complete --action "Brief description"',
      },
      {
        action: 'Add reflection for Reflexion learning',
        primary: false,
        command: '--reflection "What worked: ... Lesson: ..."',
      },
    ],
  },

  ADA_INVALID_ROLE: {
    exitCode: EXIT_CODES.USAGE_ERROR,
    category: 'validation',
    template: 'Role name not found in roster',
    docs: `${DOCS_BASE_URL}/ADA_INVALID_ROLE`,
    defaultSuggestions: [
      {
        action: 'Check available roles with `ada roles list`',
        primary: true,
        command: 'ada roles list',
      },
      {
        action: 'Add the role to roster.json',
        primary: false,
      },
    ],
  },

  ADA_EMPTY_MEMORY: {
    exitCode: EXIT_CODES.USAGE_ERROR,
    category: 'validation',
    template: 'Memory bank has no entries',
    docs: `${DOCS_BASE_URL}/ADA_EMPTY_MEMORY`,
    defaultSuggestions: [
      {
        action: 'Run a dispatch cycle to populate memory',
        primary: true,
        command: 'ada dispatch start',
      },
      {
        action: 'Check if agents/memory/bank.md exists',
        primary: false,
      },
    ],
  },

  // ============================================
  // Generic Fallback
  // ============================================

  ADA_UNKNOWN_ERROR: {
    exitCode: EXIT_CODES.GENERAL_ERROR,
    category: 'runtime',
    template: 'An unexpected error occurred',
    docs: `${DOCS_BASE_URL}/ADA_UNKNOWN_ERROR`,
    defaultSuggestions: [
      {
        action: 'Check the full error output for details',
        primary: true,
      },
      {
        action: 'Report this issue at https://github.com/ada-ai/ada/issues',
        primary: false,
      },
    ],
  },
};

/**
 * Get error definition by code.
 * Returns unknown error definition if code not found.
 */
export function getErrorDefinition(code: ErrorCode): ErrorDefinition {
  return ERROR_REGISTRY[code] ?? ERROR_REGISTRY.ADA_UNKNOWN_ERROR;
}

/**
 * Check if a code is a valid error code.
 */
export function isValidErrorCode(code: string): code is ErrorCode {
  return code in ERROR_REGISTRY;
}
