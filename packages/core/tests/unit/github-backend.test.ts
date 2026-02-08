/**
 * @ada/core — GitHubBackend tests
 *
 * Tests for the GitHubBackend implementation.
 * Part of Issue #84 — Headless Mode Architecture, Phase 1 Step 2.
 *
 * Note: Most tests use mocked exec to avoid actual gh CLI calls.
 * Integration tests with real gh CLI should be in a separate e2e suite.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubBackend } from '../../src/github-backend.js';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock fs
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
  },
}));

import { exec } from 'child_process';
import { promises as fs } from 'fs';

const mockExec = exec as unknown as ReturnType<typeof vi.fn>;

describe('GitHubBackend', () => {
  let backend: GitHubBackend;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new GitHubBackend({ rootDir: '/tmp/test-repo' });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const b = new GitHubBackend({ rootDir: '/tmp/repo' });
      expect(b.name).toBe('github');
    });

    it('should accept custom gh path', () => {
      const b = new GitHubBackend({
        rootDir: '/tmp/repo',
        config: { ghPath: '/custom/gh' },
      });
      expect(b.name).toBe('github');
    });

    it('should accept repo override', () => {
      const b = new GitHubBackend({
        rootDir: '/tmp/repo',
        config: { repo: 'owner/repo' },
      });
      expect(b.name).toBe('github');
    });
  });

  describe('listIssues', () => {
    it('should parse gh issue list output', async () => {
      const mockOutput = JSON.stringify([
        {
          number: 1,
          title: 'Test issue',
          body: 'Description',
          state: 'OPEN',
          labels: [{ name: 'bug' }, { name: 'P1' }],
          author: { login: 'testuser' },
          createdAt: '2026-02-07T00:00:00Z',
          updatedAt: '2026-02-07T01:00:00Z',
        },
      ]);

      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(null, { stdout: mockOutput, stderr: '' });
        }
      });

      const issues = await backend.listIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0].number).toBe(1);
      expect(issues[0].title).toBe('Test issue');
      expect(issues[0].state).toBe('open');
      expect(issues[0].labels).toContain('bug');
      expect(issues[0].priority).toBe('P1');
    });

    it('should apply state filter', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        expect(_cmd).toContain('--state closed');
        if (callback) {
          callback(null, { stdout: '[]', stderr: '' });
        }
      });

      await backend.listIssues({ state: 'closed' });
    });

    it('should apply limit', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        expect(_cmd).toContain('--limit 50');
        if (callback) {
          callback(null, { stdout: '[]', stderr: '' });
        }
      });

      await backend.listIssues({ limit: 50 });
    });

    it('should apply label filter', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        expect(_cmd).toContain('--label "bug,P1"');
        if (callback) {
          callback(null, { stdout: '[]', stderr: '' });
        }
      });

      await backend.listIssues({ labels: ['bug', 'P1'] });
    });
  });

  describe('getIssue', () => {
    it('should fetch issue details with comments', async () => {
      const mockOutput = JSON.stringify({
        number: 42,
        title: 'Feature request',
        body: 'Description here',
        state: 'OPEN',
        labels: [{ name: 'enhancement' }],
        author: { login: 'developer' },
        createdAt: '2026-02-07T00:00:00Z',
        updatedAt: '2026-02-07T01:00:00Z',
        comments: [
          {
            id: 1,
            body: 'Good idea!',
            author: { login: 'reviewer' },
            createdAt: '2026-02-07T02:00:00Z',
          },
        ],
      });

      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(null, { stdout: mockOutput, stderr: '' });
        }
      });

      const issue = await backend.getIssue(42);

      expect(issue).not.toBeNull();
      expect(issue!.number).toBe(42);
      expect(issue!.comments).toHaveLength(1);
      expect(issue!.comments![0].body).toBe('Good idea!');
    });

    it('should return null for non-existent issue', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(new Error('issue not found'), { stdout: '', stderr: '' });
        }
      });

      const issue = await backend.getIssue(999);
      expect(issue).toBeNull();
    });
  });

  describe('createIssue', () => {
    it('should create issue and return result', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(null, { stdout: 'https://github.com/owner/repo/issues/123', stderr: '' });
        }
      });

      const result = await backend.createIssue({
        title: 'New issue',
        body: 'Description',
        labels: ['bug'],
      });

      expect(result.success).toBe(true);
      expect(result.number).toBe(123);
      expect(result.url).toBe('https://github.com/owner/repo/issues/123');
    });

    it('should handle creation failure', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(new Error('Permission denied'), { stdout: '', stderr: '' });
        }
      });

      const result = await backend.createIssue({
        title: 'New issue',
        body: 'Description',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should escape special characters in title and body', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        expect(_cmd).not.toContain('`uname`');
        if (callback) {
          callback(null, { stdout: 'https://github.com/owner/repo/issues/1', stderr: '' });
        }
      });

      await backend.createIssue({
        title: 'Test `command`',
        body: 'Body with $var and `backticks`',
      });
    });
  });

  describe('listPRs', () => {
    it('should parse gh pr list output', async () => {
      const mockOutput = JSON.stringify([
        {
          number: 42,
          title: 'feat: add feature',
          body: 'Adds new feature',
          state: 'OPEN',
          headRefName: 'feat/new-feature',
          baseRefName: 'main',
          author: { login: 'developer' },
          createdAt: '2026-02-07T00:00:00Z',
          updatedAt: '2026-02-07T01:00:00Z',
          labels: [{ name: 'enhancement' }],
          isDraft: false,
        },
      ]);

      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(null, { stdout: mockOutput, stderr: '' });
        }
      });

      const prs = await backend.listPRs();

      expect(prs).toHaveLength(1);
      expect(prs[0].number).toBe(42);
      expect(prs[0].title).toBe('feat: add feature');
      expect(prs[0].headBranch).toBe('feat/new-feature');
      expect(prs[0].baseBranch).toBe('main');
      expect(prs[0].isDraft).toBe(false);
    });

    it('should map merged state correctly', async () => {
      const mockOutput = JSON.stringify([
        {
          number: 1,
          title: 'Merged PR',
          body: '',
          state: 'MERGED',
          headRefName: 'feat/old',
          baseRefName: 'main',
          author: { login: 'dev' },
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
          labels: [],
          isDraft: false,
        },
      ]);

      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(null, { stdout: mockOutput, stderr: '' });
        }
      });

      const prs = await backend.listPRs({ state: 'merged' });
      expect(prs[0].state).toBe('merged');
    });
  });

  describe('getPR', () => {
    it('should fetch PR with files', async () => {
      const mockOutput = JSON.stringify({
        number: 93,
        title: 'feat(core): add backend',
        body: 'Description',
        state: 'OPEN',
        headRefName: 'feat/backend',
        baseRefName: 'main',
        author: { login: 'frontier' },
        createdAt: '2026-02-07T00:00:00Z',
        updatedAt: '2026-02-07T01:00:00Z',
        labels: [{ name: 'enhancement' }],
        isDraft: false,
        files: [
          { path: 'src/backend.ts', additions: 100, deletions: 0, status: 'added' },
          { path: 'src/index.ts', additions: 5, deletions: 2, status: 'modified' },
        ],
      });

      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(null, { stdout: mockOutput, stderr: '' });
        }
      });

      const pr = await backend.getPR(93);

      expect(pr).not.toBeNull();
      expect(pr!.number).toBe(93);
      expect(pr!.files).toHaveLength(2);
      expect(pr!.files![0].status).toBe('added');
      expect(pr!.files![1].status).toBe('modified');
    });
  });

  describe('createPR', () => {
    it('should create PR with all options', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        expect(_cmd).toContain('--head feat/test');
        expect(_cmd).toContain('--base main');
        expect(_cmd).toContain('--draft');
        if (callback) {
          callback(null, { stdout: 'https://github.com/owner/repo/pull/100', stderr: '' });
        }
      });

      const result = await backend.createPR({
        title: 'feat: new feature',
        body: 'Description',
        headBranch: 'feat/test',
        baseBranch: 'main',
        labels: ['enhancement'],
        draft: true,
      });

      expect(result.success).toBe(true);
      expect(result.number).toBe(100);
    });
  });

  describe('addComment', () => {
    it('should add comment to issue', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        expect(_cmd).toContain('issue comment 42');
        if (callback) {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      await backend.addComment({ type: 'issue', number: 42 }, 'Test comment');
    });

    it('should add comment to PR', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        expect(_cmd).toContain('pr comment 93');
        if (callback) {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      await backend.addComment({ type: 'pr', number: 93 }, 'LGTM!');
    });
  });

  describe('getRepoState', () => {
    it('should return repo state', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        let stdout = '';

        if (_cmd.includes('--abbrev-ref HEAD')) {
          stdout = 'feat/backend-interface\n';
        } else if (_cmd.includes('--short HEAD')) {
          stdout = 'abc1234\n';
        } else if (_cmd.includes('status --porcelain')) {
          stdout = 'M src/index.ts\n';
        } else if (_cmd.includes('rev-list --left-right')) {
          stdout = '2\t3\n';
        } else if (_cmd.includes('remote get-url')) {
          stdout = 'git@github.com:owner/repo.git\n';
        }

        if (callback) {
          callback(null, { stdout, stderr: '' });
        }
      });

      const state = await backend.getRepoState();

      expect(state.branch).toBe('feat/backend-interface');
      expect(state.commit).toBe('abc1234');
      expect(state.isDirty).toBe(true);
      expect(state.behind).toBe(2);
      expect(state.ahead).toBe(3);
      expect(state.remoteUrl).toBe('git@github.com:owner/repo.git');
    });

    it('should handle missing upstream gracefully', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (_cmd.includes('rev-list')) {
          if (callback) {
            callback(new Error('no upstream'), { stdout: '', stderr: '' });
          }
          return;
        }
        if (callback) {
          callback(null, { stdout: 'main\n', stderr: '' });
        }
      });

      const state = await backend.getRepoState();
      expect(state.ahead).toBe(0);
      expect(state.behind).toBe(0);
    });
  });

  describe('applyChanges', () => {
    it('should create new files', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await backend.applyChanges([
        { path: 'src/new-file.ts', type: 'create', content: 'export const x = 1;' },
      ]);

      expect(result.success).toBe(true);
      expect(result.modifiedFiles).toContain('src/new-file.ts');
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should delete files', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await backend.applyChanges([
        { path: 'src/old-file.ts', type: 'delete' },
      ]);

      expect(result.success).toBe(true);
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should rename files', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await backend.applyChanges([
        { path: 'src/old.ts', type: 'rename', newPath: 'src/new.ts' },
      ]);

      expect(result.success).toBe(true);
      expect(result.modifiedFiles).toContain('src/old.ts');
      expect(result.modifiedFiles).toContain('src/new.ts');
      expect(fs.rename).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (fs.writeFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('EACCES'));

      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (callback) {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await backend.applyChanges([
        { path: 'src/file.ts', type: 'create', content: 'test' },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('EACCES');
    });
  });

  describe('commit', () => {
    it('should commit and return SHA', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (_cmd.includes('git commit')) {
          if (callback) {
            callback(null, { stdout: '', stderr: '' });
          }
        } else if (_cmd.includes('rev-parse --short')) {
          if (callback) {
            callback(null, { stdout: 'def5678\n', stderr: '' });
          }
        }
      });

      const result = await backend.commit('feat(core): add feature');

      expect(result.success).toBe(true);
      expect(result.sha).toBe('def5678');
    });

    it('should handle commit failure', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (_cmd.includes('git commit')) {
          if (callback) {
            callback(new Error('nothing to commit'), { stdout: '', stderr: '' });
          }
        }
      });

      const result = await backend.commit('empty commit');

      expect(result.success).toBe(false);
      expect(result.error).toContain('nothing to commit');
    });
  });

  describe('push', () => {
    it('should push to remote', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (_cmd.includes('rev-parse --abbrev-ref')) {
          if (callback) {
            callback(null, { stdout: 'feat/test\n', stderr: '' });
          }
        } else if (_cmd.includes('git push')) {
          expect(_cmd).toContain('-u origin feat/test');
          if (callback) {
            callback(null, { stdout: '', stderr: '' });
          }
        }
      });

      const result = await backend.push();

      expect(result.success).toBe(true);
    });

    it('should handle push failure', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
        if (_cmd.includes('rev-parse')) {
          if (callback) {
            callback(null, { stdout: 'main\n', stderr: '' });
          }
        } else if (_cmd.includes('git push')) {
          if (callback) {
            callback(new Error('rejected'), { stdout: '', stderr: '' });
          }
        }
      });

      const result = await backend.push();

      expect(result.success).toBe(false);
      expect(result.error).toContain('rejected');
    });
  });
});

describe('GitHubBackend with repo override', () => {
  it('should include repo flag in gh commands', async () => {
    const backend = new GitHubBackend({
      rootDir: '/tmp/repo',
      config: { repo: 'owner/repo' },
    });

    mockExec.mockImplementation((_cmd: string, _opts: unknown, callback?: Function) => {
      expect(_cmd).toContain('--repo owner/repo');
      if (callback) {
        callback(null, { stdout: '[]', stderr: '' });
      }
    });

    await backend.listIssues();
  });
});
