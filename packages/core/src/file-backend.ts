/**
 * @ada/core — File Backend Implementation
 *
 * Implements DispatchBackend using local files for headless mode.
 * Enables SWE-bench evaluation, CI/CD integration, and offline operation.
 *
 * Part of Issue #84 — Headless Mode Architecture, Phase 1 Step 3
 * @see docs/design/headless-mode-architecture.md
 *
 * @packageDocumentation
 */

import { promises as fs } from 'fs';
import { join, dirname, extname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  DispatchBackend,
  BackendType,
  Issue,
  IssueState,
  ListIssuesOptions,
  CreateIssueInput,
  IssueResult,
  PullRequest,
  PRState,
  ListPRsOptions,
  CreatePRInput,
  PRResult,
  CommentTarget,
  RepoState,
  CodeChange,
  ApplyResult,
  FileBackendConfig,
  DEFAULT_FILE_BACKEND_CONFIG,
  IssuePriority,
  slugify,
} from './backend.js';

const execAsync = promisify(exec);

/** Maximum buffer size for exec (10MB for large outputs) */
const MAX_BUFFER = 10 * 1024 * 1024;

/** Counter for synthetic issue/PR numbers */
let issueCounter = 1000;
let prCounter = 1000;

/**
 * File-based backend for headless dispatch mode.
 *
 * Reads issues from input files, writes artifacts to output directory.
 * No GitHub API calls — suitable for SWE-bench, CI/CD, and offline operation.
 *
 * @example
 * ```typescript
 * const backend = new FileBackend({
 *   rootDir: process.cwd(),
 *   config: {
 *     inputDir: 'agents/input',
 *     outputDir: 'agents/output',
 *   }
 * });
 *
 * const issues = await backend.listIssues();
 * ```
 */
export class FileBackend implements DispatchBackend {
  readonly name: BackendType = 'file';

  private readonly rootDir: string;
  private readonly inputDir: string;
  private readonly outputDir: string;
  private readonly dryRun: boolean;

  /** Track applied changes for diff generation */
  private stagedChanges: CodeChange[] = [];
  private cycleNumber = 0;

  constructor(options: { rootDir: string; config?: Partial<FileBackendConfig> }) {
    this.rootDir = options.rootDir;
    const config = { ...DEFAULT_FILE_BACKEND_CONFIG, ...options.config };
    this.inputDir = join(this.rootDir, config.inputDir);
    this.outputDir = join(this.rootDir, config.outputDir);
    this.dryRun = config.dryRun ?? false;
  }

  /**
   * Increment cycle number for output file naming.
   */
  incrementCycle(): void {
    this.cycleNumber++;
  }

  /**
   * Get current cycle number.
   */
  getCycleNumber(): number {
    return this.cycleNumber;
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

  // ─── Issue Operations ────────────────────────────────────────────────────────

  async listIssues(options: ListIssuesOptions = {}): Promise<Issue[]> {
    const { state = 'open', labels, limit = 200 } = options;

    const issuesDir = join(this.inputDir, 'issues');

    try {
      await fs.access(issuesDir);
    } catch {
      // No issues directory — return empty
      return [];
    }

    const files = await fs.readdir(issuesDir);
    const mdFiles = files.filter(f => extname(f) === '.md');

    const issues: Issue[] = [];

    for (const file of mdFiles) {
      const filePath = join(issuesDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const issue = parseIssueMd(content, file);

      if (issue) {
        // Apply filters
        if (state !== 'all' && issue.state !== state) continue;
        if (labels && labels.length > 0) {
          const hasLabel = labels.some(l => issue.labels.includes(l));
          if (!hasLabel) continue;
        }

        issues.push(issue);

        if (issues.length >= limit) break;
      }
    }

    return issues;
  }

  async getIssue(number: number): Promise<Issue | null> {
    const issues = await this.listIssues({ state: 'all', limit: 1000 });
    return issues.find(i => i.number === number) ?? null;
  }

  async createIssue(issue: CreateIssueInput): Promise<IssueResult> {
    try {
      const outputIssuesDir = join(this.outputDir, 'issues');
      await fs.mkdir(outputIssuesDir, { recursive: true });

      const number = issueCounter++;
      const slug = slugify(issue.title);
      const timestamp = Date.now();
      const filename = `cycle-${String(this.cycleNumber).padStart(3, '0')}-${timestamp}-${slug}.md`;
      const filePath = join(outputIssuesDir, filename);

      const labels = issue.labels ?? [];
      const frontmatter = [
        '---',
        `id: ${number}`,
        `title: "${escapeYaml(issue.title)}"`,
        'state: open',
        `labels: [${labels.map(l => `"${l}"`).join(', ')}]`,
        `createdAt: "${new Date().toISOString()}"`,
        '---',
        '',
      ].join('\n');

      const content = frontmatter + issue.body;

      if (!this.dryRun) {
        await fs.writeFile(filePath, content, 'utf-8');
      }

      return {
        success: true,
        number,
        url: `file://${filePath}`,
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
    const { state = 'open', baseBranch, limit = 50 } = options;

    const contextFile = join(this.inputDir, 'context', 'existing-prs.json');

    try {
      await fs.access(contextFile);
    } catch {
      // No PRs file — return empty
      return [];
    }

    const content = await fs.readFile(contextFile, 'utf-8');
    const rawPRs = JSON.parse(content) as RawFilePR[];

    let prs: PullRequest[] = rawPRs.map(raw => ({
      number: raw.number,
      title: raw.title,
      body: raw.body || '',
      state: (raw.state as PRState) || 'open',
      headBranch: raw.headBranch,
      baseBranch: raw.baseBranch,
      author: raw.author || 'file-backend',
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
      labels: raw.labels || [],
      isDraft: raw.isDraft ?? false,
    }));

    // Apply filters
    if (state !== 'all') {
      prs = prs.filter(p => p.state === state);
    }
    if (baseBranch) {
      prs = prs.filter(p => p.baseBranch === baseBranch);
    }

    return prs.slice(0, limit);
  }

  async getPR(number: number): Promise<PullRequest | null> {
    const prs = await this.listPRs({ state: 'all', limit: 1000 });
    return prs.find(p => p.number === number) ?? null;
  }

  async createPR(pr: CreatePRInput): Promise<PRResult> {
    try {
      // Ensure output directories exist
      const patchesDir = join(this.outputDir, 'patches');
      const prsDir = join(this.outputDir, 'prs');
      await fs.mkdir(patchesDir, { recursive: true });
      await fs.mkdir(prsDir, { recursive: true });

      const number = prCounter++;
      const slug = slugify(pr.title);
      const cycleStr = String(this.cycleNumber).padStart(3, '0');
      const timestamp = Date.now();

      // Generate diff from staged changes
      const diff = await this.generateDiff();
      const diffFilename = `cycle-${cycleStr}-${timestamp}-${slug}.diff`;
      const diffPath = join(patchesDir, diffFilename);

      // Write the diff
      if (!this.dryRun) {
        await fs.writeFile(diffPath, diff, 'utf-8');

        // Also update final.diff (aggregate patch)
        const finalDiffPath = join(this.outputDir, 'final.diff');
        try {
          const existingFinal = await fs.readFile(finalDiffPath, 'utf-8');
          await fs.writeFile(finalDiffPath, `${existingFinal  }\n${  diff}`, 'utf-8');
        } catch {
          // No existing final.diff, create it
          await fs.writeFile(finalDiffPath, diff, 'utf-8');
        }
      }

      // Write PR metadata
      const prMetadata = {
        number,
        title: pr.title,
        body: pr.body,
        headBranch: pr.headBranch,
        baseBranch: pr.baseBranch ?? 'master',
        labels: pr.labels ?? [],
        isDraft: pr.draft ?? false,
        createdAt: new Date().toISOString(),
        diffPath,
        changedFiles: this.stagedChanges.map(c => c.path),
      };

      const prFilename = `cycle-${cycleStr}-${timestamp}-${slug}.json`;
      const prPath = join(prsDir, prFilename);

      if (!this.dryRun) {
        await fs.writeFile(prPath, JSON.stringify(prMetadata, null, 2), 'utf-8');
      }

      // Clear staged changes
      this.stagedChanges = [];

      return {
        success: true,
        number,
        url: `file://${prPath}`,
        diffPath,
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
    const commentsDir = join(this.outputDir, 'comments');
    await fs.mkdir(commentsDir, { recursive: true });

    const targetType = target.type;
    const targetNumber = target.number;
    const filename = `${targetType}-${targetNumber}.md`;
    const filePath = join(commentsDir, filename);

    const timestamp = new Date().toISOString();
    const commentBlock = `\n---\n**Comment** (${timestamp})\n\n${body}\n`;

    if (!this.dryRun) {
      try {
        const existing = await fs.readFile(filePath, 'utf-8');
        await fs.writeFile(filePath, existing + commentBlock, 'utf-8');
      } catch {
        // File doesn't exist, create with header
        const header = `# Comments for ${targetType} #${targetNumber}\n`;
        await fs.writeFile(filePath, header + commentBlock, 'utf-8');
      }
    }
  }

  // ─── Repository Operations ───────────────────────────────────────────────────

  async getRepoState(): Promise<RepoState> {
    // Check for mock repo state file first
    const mockStatePath = join(this.inputDir, 'context', 'repo-state.json');
    try {
      const mockContent = await fs.readFile(mockStatePath, 'utf-8');
      const mock = JSON.parse(mockContent) as RepoState;
      return mock;
    } catch {
      // No mock — read from actual git
    }

    // Get current branch
    let branch = 'headless';
    try {
      const { stdout: branchOut } = await this.exec('git rev-parse --abbrev-ref HEAD');
      branch = branchOut.trim();
    } catch {
      // Not a git repo or git not available
    }

    // Get current commit (short SHA)
    let commit = '0000000';
    try {
      const { stdout: commitOut } = await this.exec('git rev-parse --short HEAD');
      commit = commitOut.trim();
    } catch {
      // Not a git repo
    }

    // Check for uncommitted changes
    let isDirty = false;
    try {
      const { stdout: statusOut } = await this.exec('git status --porcelain');
      isDirty = statusOut.trim().length > 0;
    } catch {
      // Not a git repo
    }

    return {
      branch,
      commit,
      isDirty,
      ahead: 0,
      behind: 0,
    };
  }

  // ─── Code Change Operations ──────────────────────────────────────────────────

  async applyChanges(changes: CodeChange[]): Promise<ApplyResult> {
    const modifiedFiles: string[] = [];

    try {
      for (const change of changes) {
        const fullPath = join(this.rootDir, change.path);

        if (!this.dryRun) {
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

        // Track for diff generation
        this.stagedChanges.push(change);
      }

      // Generate diff content
      const diff = await this.generateDiffFromChanges(changes);

      // Write incremental diff to patches dir
      const patchesDir = join(this.outputDir, 'patches');
      await fs.mkdir(patchesDir, { recursive: true });
      const cycleStr = String(this.cycleNumber).padStart(3, '0');
      const incrementalDiffPath = join(patchesDir, `cycle-${cycleStr}.diff`);

      if (!this.dryRun && diff) {
        await fs.writeFile(incrementalDiffPath, diff, 'utf-8');
      }

      return {
        success: true,
        modifiedFiles,
        diff,
        diffPath: incrementalDiffPath,
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
      const commitsDir = join(this.outputDir, 'commits');
      await fs.mkdir(commitsDir, { recursive: true });

      const cycleStr = String(this.cycleNumber).padStart(3, '0');
      const timestamp = Date.now();
      const syntheticSha = generateSyntheticSha();
      const filename = `cycle-${cycleStr}-${timestamp}.json`;
      const filePath = join(commitsDir, filename);

      const commitRecord = {
        sha: syntheticSha,
        message,
        timestamp: new Date().toISOString(),
        cycle: this.cycleNumber,
        changedFiles: this.stagedChanges.map(c => ({
          path: c.path,
          type: c.type,
          newPath: c.newPath,
        })),
      };

      if (!this.dryRun) {
        await fs.writeFile(filePath, JSON.stringify(commitRecord, null, 2), 'utf-8');
      }

      return {
        success: true,
        sha: syntheticSha,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  push(): Promise<{ success: boolean; error?: string }> {
    // No-op in file backend — there's no remote to push to
    return Promise.resolve({ success: true });
  }

  // ─── Diff Generation ─────────────────────────────────────────────────────────

  /**
   * Generate unified diff from staged changes using git diff if available,
   * or manual diff generation if not.
   */
  private async generateDiff(): Promise<string> {
    // Try to use git diff if in a git repo
    try {
      const { stdout } = await this.exec('git diff HEAD');
      if (stdout.trim()) {
        return stdout;
      }
    } catch {
      // Not a git repo or no changes
    }

    // Fall back to generating diff from staged changes
    return this.generateDiffFromChanges(this.stagedChanges);
  }

  /**
   * Generate unified diff from a list of code changes.
   */
  private async generateDiffFromChanges(changes: CodeChange[]): Promise<string> {
    const diffParts: string[] = [];

    for (const change of changes) {
      const fullPath = join(this.rootDir, change.path);

      switch (change.type) {
        case 'create':
          if (change.content) {
            const lines = change.content.split('\n');
            diffParts.push(
              `diff --git a/${change.path} b/${change.path}`,
              'new file mode 100644',
              '--- /dev/null',
              `+++ b/${change.path}`,
              `@@ -0,0 +1,${lines.length} @@`,
              ...lines.map(l => `+${l}`),
              ''
            );
          }
          break;

        case 'modify':
          if (change.content) {
            // Try to read original content for proper diff
            let originalContent = '';
            try {
              originalContent = await fs.readFile(fullPath, 'utf-8');
            } catch {
              // File doesn't exist yet, treat as create
            }

            if (originalContent) {
              const originalLines = originalContent.split('\n');
              const newLines = change.content.split('\n');
              diffParts.push(
                `diff --git a/${change.path} b/${change.path}`,
                `--- a/${change.path}`,
                `+++ b/${change.path}`,
                `@@ -1,${originalLines.length} +1,${newLines.length} @@`,
                ...originalLines.map(l => `-${l}`),
                ...newLines.map(l => `+${l}`),
                ''
              );
            } else {
              // No original, treat as create
              const lines = change.content.split('\n');
              diffParts.push(
                `diff --git a/${change.path} b/${change.path}`,
                'new file mode 100644',
                '--- /dev/null',
                `+++ b/${change.path}`,
                `@@ -0,0 +1,${lines.length} @@`,
                ...lines.map(l => `+${l}`),
                ''
              );
            }
          }
          break;

        case 'delete':
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            diffParts.push(
              `diff --git a/${change.path} b/${change.path}`,
              'deleted file mode 100644',
              `--- a/${change.path}`,
              '+++ /dev/null',
              `@@ -1,${lines.length} +0,0 @@`,
              ...lines.map(l => `-${l}`),
              ''
            );
          } catch {
            // File already deleted or doesn't exist
          }
          break;

        case 'rename':
          if (change.newPath) {
            diffParts.push(
              `diff --git a/${change.path} b/${change.newPath}`,
              'similarity index 100%',
              `rename from ${change.path}`,
              `rename to ${change.newPath}`,
              ''
            );
          }
          break;
      }
    }

    return diffParts.join('\n');
  }
}

// ─── Parsing Helpers ─────────────────────────────────────────────────────────

/**
 * Parse issue markdown file with frontmatter.
 */
function parseIssueMd(content: string, filename: string): Issue | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch || !frontmatterMatch[1]) {
    // No frontmatter — try to parse as plain markdown
    return {
      number: extractNumberFromFilename(filename),
      title: extractTitleFromContent(content),
      body: content,
      state: 'open' as IssueState,
      labels: [],
      author: 'file-backend',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority: null,
    };
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);

  // Parse YAML-like frontmatter
  const fields: Record<string, string> = {};
  for (const line of frontmatter.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      fields[key] = value;
    }
  }

  // Parse labels array
  let labels: string[] = [];
  const labelsField = fields['labels'];
  if (labelsField) {
    const labelsMatch = labelsField.match(/\[(.*)\]/);
    if (labelsMatch && labelsMatch[1]) {
      labels = labelsMatch[1]
        .split(',')
        .map(l => l.trim().replace(/^["']|["']$/g, ''))
        .filter(l => l.length > 0);
    }
  }

  // Extract priority from labels
  const priority = extractPriorityFromLabels(labels);

  // Parse issue number
  const idField = fields['id'];
  const issueNumber = idField ? parseInt(idField, 10) : NaN;

  // Get timestamps
  const now = new Date().toISOString();
  const createdAt = fields['createdAt'] ?? now;
  const updatedAt = fields['updatedAt'] ?? createdAt;

  return {
    number: isNaN(issueNumber) ? extractNumberFromFilename(filename) : issueNumber,
    title: fields['title'] ?? extractTitleFromContent(body),
    body,
    state: (fields['state'] as IssueState) ?? 'open',
    labels,
    author: fields['author'] ?? 'file-backend',
    createdAt,
    updatedAt,
    priority,
  };
}

/**
 * Extract issue number from filename.
 */
function extractNumberFromFilename(filename: string): number {
  const match = filename.match(/(\d+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return issueCounter++;
}

/**
 * Extract title from markdown content (first heading or first line).
 */
function extractTitleFromContent(content: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch && headingMatch[1]) {
    return headingMatch[1];
  }
  const lines = content.split('\n');
  const firstLine = lines.length > 0 ? lines[0] : undefined;
  return firstLine ? firstLine.slice(0, 100) : 'Untitled Issue';
}

/**
 * Extract priority from labels.
 */
function extractPriorityFromLabels(labels: string[]): IssuePriority {
  const priorityLabel = labels.find(l =>
    ['P0', 'P1', 'P2', 'P3'].includes(l.toUpperCase())
  );
  return priorityLabel ? (priorityLabel.toUpperCase() as IssuePriority) : null;
}

/**
 * Escape special characters for YAML.
 */
function escapeYaml(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

/**
 * Generate a synthetic SHA for headless commits.
 */
function generateSyntheticSha(): string {
  const chars = '0123456789abcdef';
  let sha = '';
  for (let i = 0; i < 7; i++) {
    sha += chars[Math.floor(Math.random() * chars.length)];
  }
  return sha;
}

// ─── Raw Types ─────────────────────────────────────────────────────────────────

interface RawFilePR {
  number: number;
  title: string;
  body?: string;
  state?: string;
  headBranch: string;
  baseBranch: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  labels?: string[];
  isDraft?: boolean;
}

// ─── Factory Registration ──────────────────────────────────────────────────────

import { _registerFileBackend } from './backend.js';

// Auto-register with the factory when this module is imported
_registerFileBackend(FileBackend);
