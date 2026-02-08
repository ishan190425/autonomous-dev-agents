/**
 * @ada/core — Dispatch Backend Abstraction
 *
 * Defines the interface for dispatch operations, enabling both:
 * - GitHubBackend: Normal mode using GitHub API via `gh` CLI
 * - FileBackend: Headless mode for SWE-bench, CI/CD, and offline operation
 *
 * Part of Issue #84 — Headless Mode Architecture
 * @see docs/design/headless-mode-architecture.md
 *
 * @packageDocumentation
 */

// ─── Issue Types ─────────────────────────────────────────────────────────────

/** Priority levels for issues */
export type IssuePriority = 'P0' | 'P1' | 'P2' | 'P3' | null;

/** Issue state */
export type IssueState = 'open' | 'closed';

/** A GitHub issue (or file-based equivalent) */
export interface Issue {
  /** Issue number (or synthetic ID in headless mode) */
  readonly number: number;
  /** Issue title */
  readonly title: string;
  /** Issue body/description */
  readonly body: string;
  /** Current state */
  readonly state: IssueState;
  /** Labels attached to the issue */
  readonly labels: readonly string[];
  /** Author username */
  readonly author: string;
  /** ISO timestamp when created */
  readonly createdAt: string;
  /** ISO timestamp when last updated */
  readonly updatedAt: string;
  /** Priority (extracted from labels) */
  readonly priority: IssuePriority;
  /** Comments on the issue (optional, for detailed fetches) */
  readonly comments?: readonly IssueComment[];
}

/** A comment on an issue or PR */
export interface IssueComment {
  /** Comment ID */
  readonly id: number;
  /** Comment body */
  readonly body: string;
  /** Author username */
  readonly author: string;
  /** ISO timestamp */
  readonly createdAt: string;
}

/** Options for listing issues */
export interface ListIssuesOptions {
  /** Filter by state (default: 'open') */
  readonly state?: IssueState | 'all';
  /** Filter by labels */
  readonly labels?: readonly string[];
  /** Maximum number to return */
  readonly limit?: number;
  /** Include issue comments */
  readonly includeComments?: boolean;
}

/** Input for creating an issue */
export interface CreateIssueInput {
  /** Issue title */
  readonly title: string;
  /** Issue body */
  readonly body: string;
  /** Labels to attach */
  readonly labels?: readonly string[];
}

/** Result of creating an issue */
export interface IssueResult {
  /** Whether creation succeeded */
  readonly success: boolean;
  /** Issue number (or synthetic ID) */
  readonly number: number;
  /** URL to the issue (or file path in headless) */
  readonly url: string;
  /** Error message if failed */
  readonly error?: string;
}

// ─── Pull Request Types ──────────────────────────────────────────────────────

/** PR state */
export type PRState = 'open' | 'closed' | 'merged';

/** A GitHub pull request (or file-based equivalent) */
export interface PullRequest {
  /** PR number (or synthetic ID in headless mode) */
  readonly number: number;
  /** PR title */
  readonly title: string;
  /** PR body/description */
  readonly body: string;
  /** Current state */
  readonly state: PRState;
  /** Source branch */
  readonly headBranch: string;
  /** Target branch */
  readonly baseBranch: string;
  /** Author username */
  readonly author: string;
  /** ISO timestamp when created */
  readonly createdAt: string;
  /** ISO timestamp when last updated */
  readonly updatedAt: string;
  /** Labels attached */
  readonly labels: readonly string[];
  /** Whether PR is a draft */
  readonly isDraft: boolean;
  /** Files changed (optional, for detailed fetches) */
  readonly files?: readonly PRFile[];
}

/** A file changed in a PR */
export interface PRFile {
  /** File path */
  readonly path: string;
  /** Number of additions */
  readonly additions: number;
  /** Number of deletions */
  readonly deletions: number;
  /** Change type */
  readonly status: 'added' | 'modified' | 'deleted' | 'renamed';
}

/** Options for listing PRs */
export interface ListPRsOptions {
  /** Filter by state (default: 'open') */
  readonly state?: PRState | 'all';
  /** Filter by base branch */
  readonly baseBranch?: string;
  /** Maximum number to return */
  readonly limit?: number;
  /** Include file changes */
  readonly includeFiles?: boolean;
}

/** Input for creating a PR */
export interface CreatePRInput {
  /** PR title */
  readonly title: string;
  /** PR body */
  readonly body: string;
  /** Source branch */
  readonly headBranch: string;
  /** Target branch (default: main) */
  readonly baseBranch?: string;
  /** Labels to attach */
  readonly labels?: readonly string[];
  /** Create as draft */
  readonly draft?: boolean;
}

/** Result of creating a PR */
export interface PRResult {
  /** Whether creation succeeded */
  readonly success: boolean;
  /** PR number (or synthetic ID) */
  readonly number: number;
  /** URL to the PR (or file path in headless) */
  readonly url: string;
  /** Path to generated diff (headless mode) */
  readonly diffPath?: string;
  /** Error message if failed */
  readonly error?: string;
}

// ─── Comment Types ───────────────────────────────────────────────────────────

/** Target for adding a comment */
export interface CommentTarget {
  /** Target type */
  readonly type: 'issue' | 'pr';
  /** Target number */
  readonly number: number;
}

// ─── Repository State Types ──────────────────────────────────────────────────

/** Current state of the repository */
export interface RepoState {
  /** Current branch name */
  readonly branch: string;
  /** Current commit SHA (short) */
  readonly commit: string;
  /** Whether there are uncommitted changes */
  readonly isDirty: boolean;
  /** Number of commits ahead of remote */
  readonly ahead: number;
  /** Number of commits behind remote */
  readonly behind: number;
  /** Remote URL (if available) */
  readonly remoteUrl?: string;
}

// ─── Code Change Types ───────────────────────────────────────────────────────

/** A single code change to apply */
export interface CodeChange {
  /** File path relative to repo root */
  readonly path: string;
  /** Type of change */
  readonly type: 'create' | 'modify' | 'delete' | 'rename';
  /** New content (for create/modify) */
  readonly content?: string;
  /** New path (for rename) */
  readonly newPath?: string;
}

/** Result of applying code changes */
export interface ApplyResult {
  /** Whether changes were applied successfully */
  readonly success: boolean;
  /** Files that were modified */
  readonly modifiedFiles: readonly string[];
  /** Generated diff content (headless mode) */
  readonly diff?: string;
  /** Path to diff file (headless mode) */
  readonly diffPath?: string;
  /** Error message if failed */
  readonly error?: string;
}

// ─── Backend Interface ───────────────────────────────────────────────────────

/** Backend identifier for dispatch operations */
export type BackendType = 'github' | 'file';

/**
 * Backend interface for dispatch operations.
 *
 * This abstraction allows the dispatch protocol to work with different
 * backends for different use cases:
 *
 * - **GitHubBackend**: Normal operation mode, uses `gh` CLI to interact
 *   with GitHub issues, PRs, and the repository.
 *
 * - **FileBackend**: Headless mode for SWE-bench evaluation, CI/CD, and
 *   local development. Reads issues from files, writes patches to output.
 *
 * All methods are async to support both local file I/O and remote API calls.
 */
export interface DispatchBackend {
  /** Backend identifier */
  readonly name: BackendType;

  /**
   * List open issues for situational awareness.
   *
   * In GitHub mode, this calls `gh issue list`.
   * In file mode, this reads from `input/issues/*.md`.
   *
   * @param options - Filtering and pagination options
   * @returns Array of issues
   */
  listIssues(options?: ListIssuesOptions): Promise<Issue[]>;

  /**
   * List open pull requests for situational awareness.
   *
   * In GitHub mode, this calls `gh pr list`.
   * In file mode, this reads from `input/prs/*.json` if present.
   *
   * @param options - Filtering and pagination options
   * @returns Array of pull requests
   */
  listPRs(options?: ListPRsOptions): Promise<PullRequest[]>;

  /**
   * Get details for a specific issue.
   *
   * @param number - Issue number
   * @returns Issue details or null if not found
   */
  getIssue(number: number): Promise<Issue | null>;

  /**
   * Get details for a specific PR.
   *
   * @param number - PR number
   * @returns PR details or null if not found
   */
  getPR(number: number): Promise<PullRequest | null>;

  /**
   * Create an issue.
   *
   * In GitHub mode, this calls `gh issue create`.
   * In file mode, this writes to `output/issues/<timestamp>-<slug>.md`.
   *
   * @param issue - Issue to create
   * @returns Result with issue number and URL
   */
  createIssue(issue: CreateIssueInput): Promise<IssueResult>;

  /**
   * Create a pull request.
   *
   * In GitHub mode, this calls `gh pr create`.
   * In file mode, this generates a diff and writes to `output/patches/`.
   *
   * @param pr - PR to create
   * @returns Result with PR number and URL/path
   */
  createPR(pr: CreatePRInput): Promise<PRResult>;

  /**
   * Add a comment to an issue or PR.
   *
   * In GitHub mode, this calls `gh issue comment` or `gh pr comment`.
   * In file mode, this appends to the relevant output file.
   *
   * @param target - Issue or PR to comment on
   * @param body - Comment body (markdown)
   */
  addComment(target: CommentTarget, body: string): Promise<void>;

  /**
   * Get current repository state.
   *
   * Returns the current branch, commit, and dirty status.
   * Works the same in both modes (reads from local git).
   *
   * @returns Repository state
   */
  getRepoState(): Promise<RepoState>;

  /**
   * Apply code changes to the repository.
   *
   * In GitHub mode, this modifies files and stages them for commit.
   * In file mode, this writes changes and generates a unified diff.
   *
   * @param changes - Array of code changes to apply
   * @returns Result with modified files and diff
   */
  applyChanges(changes: CodeChange[]): Promise<ApplyResult>;

  /**
   * Create a git commit with the staged changes.
   *
   * In GitHub mode, this runs `git commit`.
   * In file mode, this records the commit metadata to output.
   *
   * @param message - Commit message (conventional commit format)
   * @returns Success status
   */
  commit(message: string): Promise<{ success: boolean; sha?: string; error?: string }>;

  /**
   * Push commits to remote.
   *
   * In GitHub mode, this runs `git push`.
   * In file mode, this is a no-op (returns success).
   *
   * @returns Success status
   */
  push(): Promise<{ success: boolean; error?: string }>;
}

// ─── Backend Configuration ───────────────────────────────────────────────────

/** Configuration for FileBackend */
export interface FileBackendConfig {
  /** Directory to read input from (default: 'agents/input') */
  readonly inputDir: string;
  /** Directory to write output to (default: 'agents/output') */
  readonly outputDir: string;
  /** Whether to actually modify files or just generate diffs */
  readonly dryRun?: boolean;
}

/** Default FileBackend configuration */
export const DEFAULT_FILE_BACKEND_CONFIG: FileBackendConfig = {
  inputDir: 'agents/input',
  outputDir: 'agents/output',
  dryRun: false,
};

/** Configuration for GitHubBackend */
export interface GitHubBackendConfig {
  /** Path to gh CLI (default: 'gh') */
  readonly ghPath?: string;
  /** Repository in owner/repo format (auto-detected if not provided) */
  readonly repo?: string;
}

/** Default GitHubBackend configuration */
export const DEFAULT_GITHUB_BACKEND_CONFIG: GitHubBackendConfig = {
  ghPath: 'gh',
};

// ─── Backend Factory ─────────────────────────────────────────────────────────

/** Options for creating a backend */
export interface BackendOptions {
  /** Backend type to create */
  readonly type: BackendType;
  /** Root directory of the repository */
  readonly rootDir: string;
  /** File backend configuration (if type is 'file') */
  readonly fileConfig?: Partial<FileBackendConfig>;
  /** GitHub backend configuration (if type is 'github') */
  readonly githubConfig?: Partial<GitHubBackendConfig>;
}

/**
 * Create a dispatch backend based on configuration.
 *
 * This factory function creates the appropriate backend based on the
 * specified type. Use this to get a backend instance for dispatch operations.
 *
 * @example
 * ```typescript
 * // Normal mode with GitHub
 * const backend = createBackend({ type: 'github', rootDir: process.cwd() });
 *
 * // Headless mode for SWE-bench
 * const backend = createBackend({
 *   type: 'file',
 *   rootDir: '/tmp/repo',
 *   fileConfig: { inputDir: 'input', outputDir: 'output' }
 * });
 * ```
 *
 * @param options - Backend creation options
 * @returns Backend instance
 */
// GitHubBackend is lazily imported to be set by the module loader
let _GitHubBackendClass: typeof import('./github-backend.js').GitHubBackend | null = null;

/**
 * Register the GitHubBackend class for the factory.
 * Called automatically when github-backend.ts is imported.
 * @internal
 */
export function _registerGitHubBackend(
  backendClass: typeof import('./github-backend.js').GitHubBackend
): void {
  _GitHubBackendClass = backendClass;
}

export function createBackend(options: BackendOptions): DispatchBackend {
  if (options.type === 'file') {
    // TODO: Implement FileBackend (Phase 1, Step 3)
    throw new Error('FileBackend not yet implemented — see Issue #84');
  }

  if (!_GitHubBackendClass) {
    // Auto-import GitHubBackend if not already registered
    // This happens when createBackend is called before github-backend is imported
    throw new Error(
      'GitHubBackend not registered. Import github-backend.js first, or use GitHubBackend directly.'
    );
  }

  const constructorArgs: { rootDir: string; config?: Partial<GitHubBackendConfig> } = {
    rootDir: options.rootDir,
  };
  if (options.githubConfig !== undefined) {
    constructorArgs.config = options.githubConfig;
  }
  return new _GitHubBackendClass(constructorArgs);
}

// ─── Utility Types ───────────────────────────────────────────────────────────

/**
 * Extract priority from issue labels.
 *
 * @param labels - Array of label names
 * @returns Priority level or null
 */
export function extractPriority(labels: readonly string[]): IssuePriority {
  const priorityLabel = labels.find(l =>
    ['P0', 'P1', 'P2', 'P3'].includes(l.toUpperCase())
  );
  return priorityLabel ? (priorityLabel.toUpperCase() as IssuePriority) : null;
}

/**
 * Generate a slug from a title.
 *
 * @param title - Issue or PR title
 * @returns URL-safe slug
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}
