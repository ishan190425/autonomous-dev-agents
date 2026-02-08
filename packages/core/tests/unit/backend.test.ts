/**
 * @ada/core — Backend abstraction tests
 *
 * Tests for the DispatchBackend interface and utility functions.
 * Part of Issue #84 — Headless Mode Architecture.
 */

import { describe, it, expect } from 'vitest';
import {
  extractPriority,
  slugify,
  DEFAULT_FILE_BACKEND_CONFIG,
  DEFAULT_GITHUB_BACKEND_CONFIG,
  createBackend,
  type Issue,
  type PullRequest,
  type DispatchBackend,
  type BackendType,
} from '../../src/index.js';

describe('backend utilities', () => {
  describe('extractPriority', () => {
    it('should extract P0 priority', () => {
      expect(extractPriority(['bug', 'P0', 'urgent'])).toBe('P0');
    });

    it('should extract P1 priority', () => {
      expect(extractPriority(['enhancement', 'P1'])).toBe('P1');
    });

    it('should extract P2 priority', () => {
      expect(extractPriority(['P2', 'feature'])).toBe('P2');
    });

    it('should extract P3 priority', () => {
      expect(extractPriority(['documentation', 'p3'])).toBe('P3');
    });

    it('should return null for no priority', () => {
      expect(extractPriority(['bug', 'enhancement'])).toBe(null);
    });

    it('should return null for empty labels', () => {
      expect(extractPriority([])).toBe(null);
    });

    it('should be case-insensitive', () => {
      expect(extractPriority(['p0'])).toBe('P0');
      expect(extractPriority(['P1'])).toBe('P1');
    });

    it('should return first priority if multiple', () => {
      expect(extractPriority(['P2', 'P1'])).toBe('P2');
    });
  });

  describe('slugify', () => {
    it('should convert title to lowercase slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should replace special characters with dashes', () => {
      expect(slugify('feat(cli): add --help flag')).toBe('feat-cli-add-help-flag');
    });

    it('should remove leading/trailing dashes', () => {
      expect(slugify('--hello--')).toBe('hello');
    });

    it('should collapse multiple dashes', () => {
      expect(slugify('hello   world')).toBe('hello-world');
    });

    it('should truncate to 50 characters', () => {
      const longTitle = 'a'.repeat(100);
      expect(slugify(longTitle).length).toBe(50);
    });

    it('should handle empty string', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle unicode characters', () => {
      expect(slugify('héllo wörld')).toBe('h-llo-w-rld');
    });

    it('should handle emojis', () => {
      expect(slugify('🎨 Design: new feature')).toBe('design-new-feature');
    });
  });
});

describe('default configs', () => {
  it('should have correct file backend defaults', () => {
    expect(DEFAULT_FILE_BACKEND_CONFIG).toEqual({
      inputDir: 'agents/input',
      outputDir: 'agents/output',
      dryRun: false,
    });
  });

  it('should have correct github backend defaults', () => {
    expect(DEFAULT_GITHUB_BACKEND_CONFIG).toEqual({
      ghPath: 'gh',
    });
  });
});

describe('createBackend', () => {
  it('should throw for file backend (not yet implemented)', () => {
    expect(() =>
      createBackend({ type: 'file', rootDir: '/tmp' })
    ).toThrow('FileBackend not yet implemented');
  });

  it('should throw for github backend (not yet implemented)', () => {
    expect(() =>
      createBackend({ type: 'github', rootDir: '/tmp' })
    ).toThrow('GitHubBackend not yet implemented');
  });
});

describe('type definitions', () => {
  it('should allow constructing Issue type', () => {
    const issue: Issue = {
      number: 1,
      title: 'Test issue',
      body: 'Description',
      state: 'open',
      labels: ['bug'],
      author: 'test-user',
      createdAt: '2026-02-07T00:00:00Z',
      updatedAt: '2026-02-07T00:00:00Z',
      priority: 'P1',
    };
    expect(issue.number).toBe(1);
    expect(issue.state).toBe('open');
    expect(issue.priority).toBe('P1');
  });

  it('should allow constructing PullRequest type', () => {
    const pr: PullRequest = {
      number: 42,
      title: 'feat(cli): add help command',
      body: 'Adds help',
      state: 'open',
      headBranch: 'feat/help',
      baseBranch: 'main',
      author: 'developer',
      createdAt: '2026-02-07T00:00:00Z',
      updatedAt: '2026-02-07T00:00:00Z',
      labels: ['enhancement'],
      isDraft: false,
    };
    expect(pr.number).toBe(42);
    expect(pr.state).toBe('open');
    expect(pr.headBranch).toBe('feat/help');
  });

  it('should have BackendType as union of github | file', () => {
    const github: BackendType = 'github';
    const file: BackendType = 'file';
    expect(github).toBe('github');
    expect(file).toBe('file');
  });

  it('should allow partial interface implementation for testing', () => {
    // This verifies the interface shape is correct
    const mockBackend: Partial<DispatchBackend> = {
      name: 'github',
      listIssues: () => Promise.resolve([]),
      listPRs: () => Promise.resolve([]),
    };
    expect(mockBackend.name).toBe('github');
  });
});
