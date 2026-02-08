/**
 * @ada/core — FileBackend tests
 *
 * Tests for the FileBackend implementation.
 * Part of Issue #84 — Headless Mode Architecture, Phase 1 Step 3.
 *
 * FileBackend reads issues from input files and writes artifacts to output.
 * No GitHub API calls — suitable for SWE-bench, CI/CD, and offline operation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileBackend } from '../../src/file-backend.js';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock fs
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
  },
}));

import { exec } from 'child_process';
import { promises as fs } from 'fs';

const mockExec = exec as unknown as ReturnType<typeof vi.fn>;

describe('FileBackend', () => {
  let backend: FileBackend;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new FileBackend({
      rootDir: '/tmp/test-repo',
      config: {
        inputDir: 'agents/input',
        outputDir: 'agents/output',
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const b = new FileBackend({ rootDir: '/tmp/repo' });
      expect(b.name).toBe('file');
    });

    it('should accept custom input/output directories', () => {
      const b = new FileBackend({
        rootDir: '/tmp/repo',
        config: {
          inputDir: 'custom/input',
          outputDir: 'custom/output',
        },
      });
      expect(b.name).toBe('file');
    });

    it('should accept dryRun option', () => {
      const b = new FileBackend({
        rootDir: '/tmp/repo',
        config: { inputDir: 'input', outputDir: 'output', dryRun: true },
      });
      expect(b.name).toBe('file');
    });
  });

  describe('cycle management', () => {
    it('should start at cycle 0', () => {
      expect(backend.getCycleNumber()).toBe(0);
    });

    it('should increment cycle number', () => {
      backend.incrementCycle();
      expect(backend.getCycleNumber()).toBe(1);
      backend.incrementCycle();
      expect(backend.getCycleNumber()).toBe(2);
    });
  });

  describe('listIssues', () => {
    it('should return empty array when no issues directory exists', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ENOENT'));

      const issues = await backend.listIssues();
      expect(issues).toEqual([]);
    });

    it('should parse issue markdown with frontmatter', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      (fs.readdir as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['current.md']);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(`---
id: 42
title: "Fix bug in parser"
state: open
labels: ["bug", "P1"]
author: "testuser"
createdAt: "2026-02-07T00:00:00Z"
---

## Description

The parser fails on empty input.

## Steps to Reproduce

1. Call parse("")
2. Observe crash
`);

      const issues = await backend.listIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0].number).toBe(42);
      expect(issues[0].title).toBe('Fix bug in parser');
      expect(issues[0].state).toBe('open');
      expect(issues[0].labels).toContain('bug');
      expect(issues[0].labels).toContain('P1');
      expect(issues[0].priority).toBe('P1');
      expect(issues[0].body).toContain('The parser fails');
    });

    it('should parse issue without frontmatter', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      (fs.readdir as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['issue-123.md']);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(`# Bug Report

Something is broken.
`);

      const issues = await backend.listIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0].number).toBe(123);
      expect(issues[0].title).toBe('Bug Report');
      expect(issues[0].state).toBe('open');
      expect(issues[0].labels).toEqual([]);
    });

    it('should filter by state', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      (fs.readdir as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['open.md', 'closed.md']);
      (fs.readFile as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(`---
id: 1
title: "Open issue"
state: open
labels: []
---
Body
`)
        .mockResolvedValueOnce(`---
id: 2
title: "Closed issue"
state: closed
labels: []
---
Body
`);

      const openIssues = await backend.listIssues({ state: 'open' });
      expect(openIssues).toHaveLength(1);
      expect(openIssues[0].title).toBe('Open issue');
    });

    it('should filter by labels', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      (fs.readdir as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['bug.md', 'feature.md']);
      (fs.readFile as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(`---
id: 1
title: "Bug"
state: open
labels: ["bug"]
---
Body
`)
        .mockResolvedValueOnce(`---
id: 2
title: "Feature"
state: open
labels: ["enhancement"]
---
Body
`);

      const bugIssues = await backend.listIssues({ labels: ['bug'] });
      expect(bugIssues).toHaveLength(1);
      expect(bugIssues[0].title).toBe('Bug');
    });

    it('should respect limit', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      (fs.readdir as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['1.md', '2.md', '3.md']);
      (fs.readFile as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(`---
id: 1
title: "Issue 1"
state: open
labels: []
---
`)
        .mockResolvedValueOnce(`---
id: 2
title: "Issue 2"
state: open
labels: []
---
`)
        .mockResolvedValueOnce(`---
id: 3
title: "Issue 3"
state: open
labels: []
---
`);

      const issues = await backend.listIssues({ limit: 2 });
      expect(issues).toHaveLength(2);
    });

    it('should only read .md files', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      (fs.readdir as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        'issue.md',
        'readme.txt',
        '.gitkeep',
      ]);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(`---
id: 1
title: "Issue"
state: open
labels: []
---
`);

      const issues = await backend.listIssues();
      expect(issues).toHaveLength(1);
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('getIssue', () => {
    it('should return issue by number', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      (fs.readdir as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['issue-42.md']);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(`---
id: 42
title: "Test issue"
state: open
labels: []
---
`);

      const issue = await backend.getIssue(42);
      expect(issue).not.toBeNull();
      if (issue) {
        expect(issue.number).toBe(42);
      }
    });

    it('should return null if issue not found', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      (fs.readdir as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['issue-1.md']);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(`---
id: 1
title: "Other issue"
state: open
labels: []
---
`);

      const issue = await backend.getIssue(999);
      expect(issue).toBeNull();
    });
  });

  describe('createIssue', () => {
    it('should write issue to output directory', async () => {
      backend.incrementCycle();

      const result = await backend.createIssue({
        title: 'New bug report',
        body: 'Description of the bug',
        labels: ['bug', 'P1'],
      });

      expect(result.success).toBe(true);
      expect(result.number).toBeGreaterThan(0);
      expect(result.url).toContain('file://');
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();

      // Verify written content
      const writeCall = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(writeCall[0]).toContain('agents/output/issues');
      expect(writeCall[0]).toContain('cycle-001');
      expect(writeCall[1]).toContain('title: "New bug report"');
      expect(writeCall[1]).toContain('labels: ["bug", "P1"]');
    });

    it('should not write in dryRun mode', async () => {
      const dryBackend = new FileBackend({
        rootDir: '/tmp/repo',
        config: { inputDir: 'input', outputDir: 'output', dryRun: true },
      });

      const result = await dryBackend.createIssue({
        title: 'Test',
        body: 'Body',
      });

      expect(result.success).toBe(true);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('listPRs', () => {
    it('should return empty array when no PRs file exists', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ENOENT'));

      const prs = await backend.listPRs();
      expect(prs).toEqual([]);
    });

    it('should parse PRs from JSON file', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify([
        {
          number: 93,
          title: 'feat(core): add backend',
          body: 'Adds DispatchBackend',
          state: 'open',
          headBranch: 'feat/backend',
          baseBranch: 'main',
          author: 'frontier',
          labels: ['enhancement'],
          isDraft: false,
        },
      ]));

      const prs = await backend.listPRs();

      expect(prs).toHaveLength(1);
      expect(prs[0].number).toBe(93);
      expect(prs[0].title).toBe('feat(core): add backend');
      expect(prs[0].headBranch).toBe('feat/backend');
    });

    it('should filter by state', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify([
        { number: 1, title: 'Open', state: 'open', headBranch: 'a', baseBranch: 'main' },
        { number: 2, title: 'Merged', state: 'merged', headBranch: 'b', baseBranch: 'main' },
      ]));

      const merged = await backend.listPRs({ state: 'merged' });
      expect(merged).toHaveLength(1);
      expect(merged[0].title).toBe('Merged');
    });

    it('should filter by base branch', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify([
        { number: 1, title: 'To main', state: 'open', headBranch: 'a', baseBranch: 'main' },
        { number: 2, title: 'To dev', state: 'open', headBranch: 'b', baseBranch: 'develop' },
      ]));

      const toMain = await backend.listPRs({ baseBranch: 'main' });
      expect(toMain).toHaveLength(1);
      expect(toMain[0].title).toBe('To main');
    });
  });

  describe('getPR', () => {
    it('should return PR by number', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify([
        { number: 42, title: 'PR 42', state: 'open', headBranch: 'a', baseBranch: 'main' },
      ]));

      const pr = await backend.getPR(42);
      expect(pr).not.toBeNull();
      if (pr) {
        expect(pr.number).toBe(42);
      }
    });

    it('should return null if PR not found', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify([
        { number: 1, title: 'PR 1', state: 'open', headBranch: 'a', baseBranch: 'main' },
      ]));

      const pr = await backend.getPR(999);
      expect(pr).toBeNull();
    });
  });

  describe('createPR', () => {
    it('should write PR metadata and diff', async () => {
      backend.incrementCycle();

      // Mock git diff
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (_cmd.includes('git diff')) {
          if (callback) {
            callback(null, { stdout: 'diff --git a/file.ts b/file.ts\n+new line', stderr: '' });
          }
        }
      });

      const result = await backend.createPR({
        title: 'feat: add feature',
        body: 'Adds new feature',
        headBranch: 'feat/new',
        baseBranch: 'main',
        labels: ['enhancement'],
      });

      expect(result.success).toBe(true);
      expect(result.number).toBeGreaterThan(0);
      expect(result.diffPath).toContain('agents/output/patches');

      // Check that both diff and PR metadata were written
      const writeCalls = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls;
      expect(writeCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should update final.diff', async () => {
      // First, no existing final.diff
      (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ENOENT'));

      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(null, { stdout: 'diff content', stderr: '' });
        }
      });

      await backend.createPR({
        title: 'PR 1',
        body: 'Body',
        headBranch: 'feat/1',
      });

      const finalDiffWrite = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => String(call[0]).includes('final.diff')
      );
      expect(finalDiffWrite).toBeDefined();
    });
  });

  describe('addComment', () => {
    it('should append comment to new file', async () => {
      (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ENOENT'));

      await backend.addComment({ type: 'issue', number: 42 }, 'Great work!');

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();

      const writeCall = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(writeCall[0]).toContain('comments/issue-42.md');
      expect(writeCall[1]).toContain('# Comments for issue #42');
      expect(writeCall[1]).toContain('Great work!');
    });

    it('should append comment to existing file', async () => {
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce('# Existing comments\n');

      await backend.addComment({ type: 'pr', number: 93 }, 'LGTM!');

      const writeCall = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(writeCall[0]).toContain('comments/pr-93.md');
      expect(writeCall[1]).toContain('# Existing comments');
      expect(writeCall[1]).toContain('LGTM!');
    });
  });

  describe('getRepoState', () => {
    it('should return mock state from file when available', async () => {
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify({
        branch: 'mock-branch',
        commit: 'abc1234',
        isDirty: false,
        ahead: 0,
        behind: 0,
      }));

      const state = await backend.getRepoState();

      expect(state.branch).toBe('mock-branch');
      expect(state.commit).toBe('abc1234');
      expect(state.isDirty).toBe(false);
    });

    it('should fall back to git when no mock file', async () => {
      (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ENOENT'));

      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        let stdout = '';
        if (_cmd.includes('--abbrev-ref HEAD')) {
          stdout = 'feat/test\n';
        } else if (_cmd.includes('--short HEAD')) {
          stdout = 'def5678\n';
        } else if (_cmd.includes('status --porcelain')) {
          stdout = 'M file.ts\n';
        }
        if (callback) {
          callback(null, { stdout, stderr: '' });
        }
      });

      const state = await backend.getRepoState();

      expect(state.branch).toBe('feat/test');
      expect(state.commit).toBe('def5678');
      expect(state.isDirty).toBe(true);
    });

    it('should handle non-git directory gracefully', async () => {
      (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ENOENT'));

      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(new Error('not a git repository'), { stdout: '', stderr: '' });
        }
      });

      const state = await backend.getRepoState();

      expect(state.branch).toBe('headless');
      expect(state.commit).toBe('0000000');
      expect(state.isDirty).toBe(false);
    });
  });

  describe('applyChanges', () => {
    it('should create new files', async () => {
      backend.incrementCycle();

      const result = await backend.applyChanges([
        { path: 'src/new-file.ts', type: 'create', content: 'export const x = 1;' },
      ]);

      expect(result.success).toBe(true);
      expect(result.modifiedFiles).toContain('src/new-file.ts');
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should modify existing files', async () => {
      // Mock reading original content for diff
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce('old content');

      const result = await backend.applyChanges([
        { path: 'src/existing.ts', type: 'modify', content: 'new content' },
      ]);

      expect(result.success).toBe(true);
      expect(result.modifiedFiles).toContain('src/existing.ts');
    });

    it('should delete files', async () => {
      // Mock reading file for diff generation
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce('content to delete');

      const result = await backend.applyChanges([
        { path: 'src/old-file.ts', type: 'delete' },
      ]);

      expect(result.success).toBe(true);
      expect(result.modifiedFiles).toContain('src/old-file.ts');
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should rename files', async () => {
      const result = await backend.applyChanges([
        { path: 'src/old.ts', type: 'rename', newPath: 'src/new.ts' },
      ]);

      expect(result.success).toBe(true);
      expect(result.modifiedFiles).toContain('src/old.ts');
      expect(result.modifiedFiles).toContain('src/new.ts');
      expect(fs.rename).toHaveBeenCalled();
    });

    it('should generate diff content', async () => {
      backend.incrementCycle();

      const result = await backend.applyChanges([
        { path: 'src/file.ts', type: 'create', content: 'line 1\nline 2' },
      ]);

      expect(result.success).toBe(true);
      expect(result.diff).toBeDefined();
      expect(result.diff).toContain('diff --git');
      expect(result.diff).toContain('+line 1');
    });

    it('should write incremental diff to patches directory', async () => {
      backend.incrementCycle();

      await backend.applyChanges([
        { path: 'src/file.ts', type: 'create', content: 'test' },
      ]);

      const patchWrite = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => String(call[0]).includes('patches/cycle-001.diff')
      );
      expect(patchWrite).toBeDefined();
    });

    it('should not write in dryRun mode', async () => {
      const dryBackend = new FileBackend({
        rootDir: '/tmp/repo',
        config: { inputDir: 'input', outputDir: 'output', dryRun: true },
      });

      const result = await dryBackend.applyChanges([
        { path: 'src/file.ts', type: 'create', content: 'test' },
      ]);

      expect(result.success).toBe(true);
      // writeFile is called for patch, but not for actual file in dryRun
      const fileWrites = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => !String(call[0]).includes('patches/')
      );
      expect(fileWrites).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      (fs.writeFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('EACCES'));

      const result = await backend.applyChanges([
        { path: 'src/file.ts', type: 'create', content: 'test' },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('EACCES');
    });

    it('should throw if content missing for create', async () => {
      const result = await backend.applyChanges([
        { path: 'src/file.ts', type: 'create' },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content required');
    });

    it('should throw if newPath missing for rename', async () => {
      const result = await backend.applyChanges([
        { path: 'src/old.ts', type: 'rename' },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('newPath required');
    });
  });

  describe('commit', () => {
    it('should write commit record to output', async () => {
      backend.incrementCycle();

      const result = await backend.commit('feat(core): add feature');

      expect(result.success).toBe(true);
      expect(result.sha).toBeDefined();
      expect(result.sha).toHaveLength(7);
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();

      const writeCall = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(writeCall[0]).toContain('commits/cycle-001');
      const commitData = JSON.parse(writeCall[1]);
      expect(commitData.message).toBe('feat(core): add feature');
      expect(commitData.cycle).toBe(1);
    });

    it('should generate synthetic SHA', async () => {
      const result = await backend.commit('test commit');

      expect(result.sha).toMatch(/^[0-9a-f]{7}$/);
    });

    it('should not write in dryRun mode', async () => {
      const dryBackend = new FileBackend({
        rootDir: '/tmp/repo',
        config: { inputDir: 'input', outputDir: 'output', dryRun: true },
      });

      const result = await dryBackend.commit('test');

      expect(result.success).toBe(true);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('push', () => {
    it('should always succeed (no-op)', async () => {
      const result = await backend.push();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('diff generation', () => {
    it('should generate proper create diff', async () => {
      backend.incrementCycle();

      const result = await backend.applyChanges([
        {
          path: 'src/new.ts',
          type: 'create',
          content: 'export const x = 1;\nexport const y = 2;',
        },
      ]);

      expect(result.diff).toContain('diff --git a/src/new.ts b/src/new.ts');
      expect(result.diff).toContain('new file mode 100644');
      expect(result.diff).toContain('--- /dev/null');
      expect(result.diff).toContain('+++ b/src/new.ts');
      expect(result.diff).toContain('+export const x = 1;');
      expect(result.diff).toContain('+export const y = 2;');
    });

    it('should generate proper delete diff', async () => {
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        'line 1\nline 2\nline 3'
      );

      backend.incrementCycle();

      const result = await backend.applyChanges([
        { path: 'src/old.ts', type: 'delete' },
      ]);

      expect(result.diff).toContain('diff --git a/src/old.ts b/src/old.ts');
      expect(result.diff).toContain('deleted file mode 100644');
      expect(result.diff).toContain('--- a/src/old.ts');
      expect(result.diff).toContain('+++ /dev/null');
      expect(result.diff).toContain('-line 1');
    });

    it('should generate proper rename diff', async () => {
      backend.incrementCycle();

      const result = await backend.applyChanges([
        { path: 'src/old.ts', type: 'rename', newPath: 'src/new.ts' },
      ]);

      expect(result.diff).toContain('diff --git a/src/old.ts b/src/new.ts');
      expect(result.diff).toContain('rename from src/old.ts');
      expect(result.diff).toContain('rename to src/new.ts');
    });

    it('should generate proper modify diff', async () => {
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce('old content');

      backend.incrementCycle();

      const result = await backend.applyChanges([
        { path: 'src/file.ts', type: 'modify', content: 'new content' },
      ]);

      expect(result.diff).toContain('diff --git a/src/file.ts b/src/file.ts');
      expect(result.diff).toContain('--- a/src/file.ts');
      expect(result.diff).toContain('+++ b/src/file.ts');
      expect(result.diff).toContain('-old content');
      expect(result.diff).toContain('+new content');
    });
  });
});

describe('FileBackend integration with createBackend', () => {
  it('should be creatable via factory', async () => {
    // Import to trigger registration
    await import('../../src/file-backend.js');
    const { createBackend } = await import('../../src/backend.js');

    const backend = createBackend({
      type: 'file',
      rootDir: '/tmp/repo',
      fileConfig: {
        inputDir: 'input',
        outputDir: 'output',
      },
    });

    expect(backend.name).toBe('file');
  });
});
