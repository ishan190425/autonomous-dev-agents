/**
 * @ada/core — GitHub Backend Implementation
 *
 * Implements DispatchBackend using the GitHub CLI (`gh`) for normal operation mode.
 * This is the standard backend for interacting with GitHub issues, PRs, and repositories.
 *
 * Part of Issue #84 — Headless Mode Architecture, Phase 1 Step 2
 * @see docs/design/headless-mode-architecture.md
 *
 * @packageDocumentation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import {
  DispatchBackend,
  BackendType,
  Issue,
  IssueComment,
  ListIssuesOptions,
  CreateIssueInput,
  IssueResult,
  PullRequest,
  PRFile,
  ListPRsOptions,
  CreatePRInput,
  PRResult,
  CommentTarget,
  RepoState,
  CodeChange,
  ApplyResult,
  GitHubBackendConfig,
  DEFAULT_GITHUB_BACKEND_CONFIG,
  extractPriority,
  _registerGitHubBackend,
} from './backend.js';

const execAsync = promisify(exec);

/** Maximum buffer size for exec (10MB for large outputs) */
const MAX_BUFFER = 10 * 1024 * 1024;

/**
 * GitHub Backend for dispatch operations.
 *
 * Uses the `gh` CLI to interact with GitHub issues, PRs, and the repository.
 * This is the standard backend for normal ADA operation.
 *
 * @example
 * ```typescript
 * const backend = new GitHubBackend({
 *   rootDir: process.cwd(),
 * });
 *
 * const issues = await backend.listIssues({ state: 'open', limit: 50 });
 * ```
 */
export class GitHubBackend implements DispatchBackend {
  readonly name: BackendType = 'github';

  private readonly rootDir: string;
  private readonly ghPath: string;
  private readonly repo: string | undefined;

  constructor(options: { rootDir: string; config?: Partial<GitHubBackendConfig> }) {
    this.rootDir = options.rootDir;
    const config = { ...DEFAULT_GITHUB_BACKEND_CONFIG, ...options.config };
    this.ghPath = config.ghPath ?? 'gh';
    this.repo = config.repo ?? undefined;
  }

  /**
   * Execute a shell command in the repo directory.
   */
  private exec(command: string): Promise<{ stdout: string; stderr: string }> {
    return execAsync(command, {
      cwd: this.rootDir,
      maxBuffer: MAX_BUFFER,
    });
  }

  /**
   * Execute a gh CLI command.
   */
  private async gh(args: string): Promise<string> {
    const repoFlag = this.repo ? ` --repo ${this.repo}` : '';
    const { stdout } = await this.exec(`${this.ghPath}${repoFlag} ${args}`);
    return stdout.trim();
  }

  /**
   * Parse JSON output from gh CLI safely.
   */
  private parseJSON<T>(output: string): T {
    try {
      return JSON.parse(output);
    } catch {
      throw new Error(`Failed to parse gh CLI output: ${output.slice(0, 200)}...`);
    }
  }

  // ─── Issue Operations ────────────────────────────────────────────────────────

  async listIssues(options: ListIssuesOptions = {}): Promise<Issue[]> {
    const { state = 'open', labels, limit = 200, includeComments = false } = options;

    let args = 'issue list --json number,title,body,state,labels,author,createdAt,updatedAt';
    args += ` --state ${state}`;
    args += ` --limit ${limit}`;

    if (labels && labels.length > 0) {
      args += ` --label "${labels.join(',')}"`;
    }

    const output = await this.gh(args);
    const rawIssues = this.parseJSON<RawIssue[]>(output);

    const issues: Issue[] = await Promise.all(
      rawIssues.map(async raw => {
        const labelNames = raw.labels.map(l => l.name);
        const issue: Issue = {
          number: raw.number,
          title: raw.title,
          body: raw.body || '',
          state: raw.state.toLowerCase() as 'open' | 'closed',
          labels: labelNames,
          author: raw.author.login,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
          priority: extractPriority(labelNames),
        };

        if (includeComments) {
          const comments = await this.getIssueComments(raw.number);
          return { ...issue, comments };
        }

        return issue;
      })
    );

    return issues;
  }

  async getIssue(number: number): Promise<Issue | null> {
    try {
      const args = `issue view ${number} --json number,title,body,state,labels,author,createdAt,updatedAt,comments`;
      const output = await this.gh(args);
      const raw = this.parseJSON<RawIssueWithComments>(output);

      const labelNames = raw.labels.map(l => l.name);
      return {
        number: raw.number,
        title: raw.title,
        body: raw.body || '',
        state: raw.state.toLowerCase() as 'open' | 'closed',
        labels: labelNames,
        author: raw.author.login,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        priority: extractPriority(labelNames),
        comments: raw.comments.map(c => ({
          id: c.id,
          body: c.body,
          author: c.author.login,
          createdAt: c.createdAt,
        })),
      };
    } catch {
      return null;
    }
  }

  private async getIssueComments(number: number): Promise<IssueComment[]> {
    try {
      const args = `issue view ${number} --json comments`;
      const output = await this.gh(args);
      const raw = this.parseJSON<{ comments: RawComment[] }>(output);

      return raw.comments.map(c => ({
        id: c.id,
        body: c.body,
        author: c.author.login,
        createdAt: c.createdAt,
      }));
    } catch {
      return [];
    }
  }

  async createIssue(issue: CreateIssueInput): Promise<IssueResult> {
    try {
      let args = `issue create --title "${escapeQuotes(issue.title)}" --body "${escapeQuotes(issue.body)}"`;

      if (issue.labels && issue.labels.length > 0) {
        args += ` --label "${issue.labels.join(',')}"`;
      }

      const output = await this.gh(args);

      // gh issue create outputs the URL
      const url = output.trim();
      const number = parseInt(url.split('/').pop() || '0', 10);

      return {
        success: true,
        number,
        url,
      };
    } catch (err) {
      return {
        success: false,
        number: 0,
        url: '',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ─── PR Operations ───────────────────────────────────────────────────────────

  async listPRs(options: ListPRsOptions = {}): Promise<PullRequest[]> {
    const { state = 'open', baseBranch, limit = 50, includeFiles = false } = options;

    let args = 'pr list --json number,title,body,state,headRefName,baseRefName,author,createdAt,updatedAt,labels,isDraft';
    args += ` --state ${state === 'merged' ? 'merged' : state}`;
    args += ` --limit ${limit}`;

    if (baseBranch) {
      args += ` --base ${baseBranch}`;
    }

    const output = await this.gh(args);
    const rawPRs = this.parseJSON<RawPR[]>(output);

    const prs: PullRequest[] = await Promise.all(
      rawPRs.map(async raw => {
        const pr: PullRequest = {
          number: raw.number,
          title: raw.title,
          body: raw.body || '',
          state: mapPRState(raw.state),
          headBranch: raw.headRefName,
          baseBranch: raw.baseRefName,
          author: raw.author.login,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
          labels: raw.labels.map(l => l.name),
          isDraft: raw.isDraft,
        };

        if (includeFiles) {
          const files = await this.getPRFiles(raw.number);
          return { ...pr, files };
        }

        return pr;
      })
    );

    return prs;
  }

  async getPR(number: number): Promise<PullRequest | null> {
    try {
      const args = `pr view ${number} --json number,title,body,state,headRefName,baseRefName,author,createdAt,updatedAt,labels,isDraft,files`;
      const output = await this.gh(args);
      const raw = this.parseJSON<RawPRWithFiles>(output);

      return {
        number: raw.number,
        title: raw.title,
        body: raw.body || '',
        state: mapPRState(raw.state),
        headBranch: raw.headRefName,
        baseBranch: raw.baseRefName,
        author: raw.author.login,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        labels: raw.labels.map(l => l.name),
        isDraft: raw.isDraft,
        files: raw.files.map(f => ({
          path: f.path,
          additions: f.additions,
          deletions: f.deletions,
          status: mapFileStatus(f.status),
        })),
      };
    } catch {
      return null;
    }
  }

  private async getPRFiles(number: number): Promise<PRFile[]> {
    try {
      const args = `pr view ${number} --json files`;
      const output = await this.gh(args);
      const raw = this.parseJSON<{ files: RawPRFile[] }>(output);

      return raw.files.map(f => ({
        path: f.path,
        additions: f.additions,
        deletions: f.deletions,
        status: mapFileStatus(f.status),
      }));
    } catch {
      return [];
    }
  }

  async createPR(pr: CreatePRInput): Promise<PRResult> {
    try {
      const baseBranch = pr.baseBranch ?? 'main';
      let args = `pr create --title "${escapeQuotes(pr.title)}" --body "${escapeQuotes(pr.body)}"`;
      args += ` --head ${pr.headBranch}`;
      args += ` --base ${baseBranch}`;

      if (pr.labels && pr.labels.length > 0) {
        args += ` --label "${pr.labels.join(',')}"`;
      }

      if (pr.draft) {
        args += ' --draft';
      }

      const output = await this.gh(args);

      // gh pr create outputs the URL
      const url = output.trim();
      const number = parseInt(url.split('/').pop() || '0', 10);

      return {
        success: true,
        number,
        url,
      };
    } catch (err) {
      return {
        success: false,
        number: 0,
        url: '',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ─── Comment Operations ──────────────────────────────────────────────────────

  async addComment(target: CommentTarget, body: string): Promise<void> {
    const cmd = target.type === 'issue' ? 'issue' : 'pr';
    const args = `${cmd} comment ${target.number} --body "${escapeQuotes(body)}"`;
    await this.gh(args);
  }

  // ─── Repository Operations ───────────────────────────────────────────────────

  async getRepoState(): Promise<RepoState> {
    // Get current branch
    const { stdout: branchOut } = await this.exec('git rev-parse --abbrev-ref HEAD');
    const branch = branchOut.trim();

    // Get current commit (short SHA)
    const { stdout: commitOut } = await this.exec('git rev-parse --short HEAD');
    const commit = commitOut.trim();

    // Check for uncommitted changes
    const { stdout: statusOut } = await this.exec('git status --porcelain');
    const isDirty = statusOut.trim().length > 0;

    // Get ahead/behind count
    let ahead = 0;
    let behind = 0;
    try {
      const { stdout: revListOut } = await this.exec('git rev-list --left-right --count @{upstream}...HEAD');
      const parts = revListOut.trim().split(/\s+/);
      const behindStr = parts[0] ?? '0';
      const aheadStr = parts[1] ?? '0';
      behind = parseInt(behindStr, 10) || 0;
      ahead = parseInt(aheadStr, 10) || 0;
    } catch {
      // No upstream configured, ignore
    }

    // Get remote URL
    let remoteUrl: string | undefined;
    try {
      const { stdout: remoteOut } = await this.exec('git remote get-url origin');
      remoteUrl = remoteOut.trim() || undefined;
    } catch {
      // No origin remote
      remoteUrl = undefined;
    }

    // Build result, only including remoteUrl if defined
    const result: RepoState = {
      branch,
      commit,
      isDirty,
      ahead,
      behind,
    };

    if (remoteUrl !== undefined) {
      return { ...result, remoteUrl };
    }

    return result;
  }

  // ─── Code Change Operations ──────────────────────────────────────────────────

  async applyChanges(changes: CodeChange[]): Promise<ApplyResult> {
    const modifiedFiles: string[] = [];

    try {
      for (const change of changes) {
        const fullPath = join(this.rootDir, change.path);

        switch (change.type) {
          case 'create':
          case 'modify':
            if (change.content === undefined) {
              throw new Error(`Content required for ${change.type} operation on ${change.path}`);
            }
            // Ensure directory exists
            await fs.mkdir(dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, change.content, 'utf-8');
            modifiedFiles.push(change.path);
            break;

          case 'delete':
            await fs.unlink(fullPath);
            modifiedFiles.push(change.path);
            break;

          case 'rename': {
            if (!change.newPath) {
              throw new Error(`newPath required for rename operation on ${change.path}`);
            }
            const newFullPath = join(this.rootDir, change.newPath);
            await fs.mkdir(dirname(newFullPath), { recursive: true });
            await fs.rename(fullPath, newFullPath);
            modifiedFiles.push(change.path);
            modifiedFiles.push(change.newPath);
            break;
          }
        }
      }

      // Stage all changes
      if (modifiedFiles.length > 0) {
        await this.exec('git add -A');
      }

      return {
        success: true,
        modifiedFiles,
      };
    } catch (err) {
      return {
        success: false,
        modifiedFiles,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async commit(message: string): Promise<{ success: boolean; sha?: string; error?: string }> {
    try {
      await this.exec(`git commit -m "${escapeQuotes(message)}"`);
      const { stdout: shaOut } = await this.exec('git rev-parse --short HEAD');
      return {
        success: true,
        sha: shaOut.trim(),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async push(): Promise<{ success: boolean; error?: string }> {
    try {
      // Push with -u to set upstream if needed
      const { stdout: branchOut } = await this.exec('git rev-parse --abbrev-ref HEAD');
      const branch = branchOut.trim();
      await this.exec(`git push -u origin ${branch}`);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ─── Raw Types (gh CLI output) ─────────────────────────────────────────────────

interface RawLabel {
  name: string;
}

interface RawAuthor {
  login: string;
}

interface RawComment {
  id: number;
  body: string;
  author: RawAuthor;
  createdAt: string;
}

interface RawIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: RawLabel[];
  author: RawAuthor;
  createdAt: string;
  updatedAt: string;
}

interface RawIssueWithComments extends RawIssue {
  comments: RawComment[];
}

interface RawPR {
  number: number;
  title: string;
  body: string;
  state: string;
  headRefName: string;
  baseRefName: string;
  author: RawAuthor;
  createdAt: string;
  updatedAt: string;
  labels: RawLabel[];
  isDraft: boolean;
}

interface RawPRFile {
  path: string;
  additions: number;
  deletions: number;
  status: string;
}

interface RawPRWithFiles extends RawPR {
  files: RawPRFile[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Escape double quotes for shell commands.
 */
function escapeQuotes(str: string): string {
  return str.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

/**
 * Map gh CLI PR state to our PRState type.
 */
function mapPRState(state: string): 'open' | 'closed' | 'merged' {
  const s = state.toLowerCase();
  if (s === 'merged') return 'merged';
  if (s === 'closed') return 'closed';
  return 'open';
}

/**
 * Map gh CLI file status to our PRFile status type.
 */
function mapFileStatus(status: string): 'added' | 'modified' | 'deleted' | 'renamed' {
  const s = status.toLowerCase();
  if (s === 'added' || s === 'a') return 'added';
  if (s === 'deleted' || s === 'd' || s === 'removed') return 'deleted';
  if (s === 'renamed' || s === 'r') return 'renamed';
  return 'modified';
}

// Auto-register with the factory when this module is imported
_registerGitHubBackend(GitHubBackend);
