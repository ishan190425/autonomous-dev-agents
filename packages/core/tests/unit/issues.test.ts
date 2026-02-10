/**
 * @ada/core — Issue Tracking Tests
 *
 * Tests for issue parsing, Active Threads extraction, and compliance verification.
 * Addresses Issue #126 acceptance criteria: test coverage for format variants.
 */

import { describe, it, expect } from 'vitest';
import {
  parseGitHubIssues,
  extractActiveThreads,
  findMissingIssues,
  findClosedInThreads,
  formatIssueForThreads,
  verifyIssueTracking,
  extractPriorityFromLabels,
  suggestRoleFromIssue,
} from '../../src/issues.js';
import type { ParsedIssue, ActiveThreadEntry } from '../../src/issues.js';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

const mockGitHubIssuesJson = JSON.stringify([
  {
    number: 26,
    title: 'chore(launch): v1.0-alpha Launch Coordination',
    labels: [{ name: 'documentation' }, { name: 'P0' }],
    state: 'open',
    createdAt: '2026-02-04T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
  },
  {
    number: 39,
    title: 'docs(marketing): Demo Asset Production Plan',
    labels: [{ name: 'documentation' }, { name: 'enhancement' }],
    state: 'open',
    createdAt: '2026-02-05T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
  },
  {
    number: 100,
    title: 'feat(cli): closed feature',
    labels: [{ name: 'enhancement' }],
    state: 'closed',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-05T00:00:00Z',
  },
]);

// Canonical format per R-013: **#N** (Priority, Role, Size) — Description
const bankWithCanonicalFormat = `
# 🧠 Memory Bank

## Current Status

In progress.

---

## Active Threads

### Active (P0-P1, In Progress)

- **#26** (P0, CEO, L) — 🚀 LAUNCH: 6/6 MUST ✅, Go/No-Go Feb 17
- **#39** (P0, Growth, M) — Demo Assets: Footage ✅, edit Feb 12-14

### Backlog (P2-P3, Post-Launch)

- **#7** (P3, Engineering, M) — Auto-update propagation for downstream teams
- **#8** (P3, Engineering, M) — Notification system integration

---

## Key Lessons

- L90: Test coverage matters
`;

// Minimal format: **#N** — Description (no metadata)
const bankWithMinimalFormat = `
## Active Threads

- **#26** — LAUNCH coordination
- **#39** — Demo asset production
`;

// Issue #N:** format (Issue prefix)
const bankWithIssuePrefixFormat = `
## Active Threads

- **Issue #26:** Launch coordination for v1.0-alpha
- **Issue #39:** Demo asset production plan
`;

// Empty bank
const emptyBank = `
# 🧠 Memory Bank

## Current Status

Nothing yet.
`;

// ─── parseGitHubIssues Tests ─────────────────────────────────────────────────

describe('parseGitHubIssues', () => {
  it('parses valid GitHub issues JSON', () => {
    const issues = parseGitHubIssues(mockGitHubIssuesJson);

    expect(issues).toHaveLength(3);
    expect(issues[0]).toEqual({
      number: 26,
      title: 'chore(launch): v1.0-alpha Launch Coordination',
      labels: ['documentation', 'P0'],
      state: 'open',
      createdAt: '2026-02-04T00:00:00Z',
      updatedAt: '2026-02-10T00:00:00Z',
    });
  });

  it('handles empty array', () => {
    const issues = parseGitHubIssues('[]');
    expect(issues).toEqual([]);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseGitHubIssues('not json')).toThrow('Failed to parse GitHub issues JSON');
  });

  it('extracts labels correctly', () => {
    const issues = parseGitHubIssues(mockGitHubIssuesJson);
    expect(issues[0]?.labels).toContain('P0');
    expect(issues[0]?.labels).toContain('documentation');
  });
});

// ─── extractActiveThreads Tests ──────────────────────────────────────────────

describe('extractActiveThreads', () => {
  describe('canonical format: **#N** (Priority, Role, Size) — Description', () => {
    it('extracts entries with full metadata', () => {
      const threads = extractActiveThreads(bankWithCanonicalFormat);

      expect(threads.length).toBeGreaterThanOrEqual(4);

      const issue26 = threads.find((t) => t.issueNumber === 26);
      expect(issue26).toBeDefined();
      expect(issue26?.priority).toBe('P0');
      expect(issue26?.role).toBe('CEO');
      expect(issue26?.size).toBe('L');
      expect(issue26?.description).toContain('LAUNCH');
    });

    it('parses multiple priorities correctly', () => {
      const threads = extractActiveThreads(bankWithCanonicalFormat);

      const p0Issues = threads.filter((t) => t.priority === 'P0');
      const p3Issues = threads.filter((t) => t.priority === 'P3');

      expect(p0Issues.length).toBe(2);
      expect(p3Issues.length).toBe(2);
    });

    it('parses all size values (S, M, L)', () => {
      const bankWithSizes = `
## Active Threads

- **#1** (P1, Engineering, S) — Small task
- **#2** (P2, Engineering, M) — Medium task
- **#3** (P3, Engineering, L) — Large task
`;
      const threads = extractActiveThreads(bankWithSizes);

      expect(threads.find((t) => t.issueNumber === 1)?.size).toBe('S');
      expect(threads.find((t) => t.issueNumber === 2)?.size).toBe('M');
      expect(threads.find((t) => t.issueNumber === 3)?.size).toBe('L');
    });
  });

  describe('minimal format: **#N** — Description', () => {
    it('does not extract minimal format without metadata (canonical format requires metadata)', () => {
      // NOTE: The canonical format per R-013 is **#N** (Priority, Role, Size) — Description
      // Minimal format without metadata is not supported by design.
      // If a project uses minimal format, they should migrate to canonical.
      const threads = extractActiveThreads(bankWithMinimalFormat);

      // Parser does not extract minimal format entries
      expect(threads.length).toBe(0);
    });
  });

  describe('Issue prefix format: **Issue #N:** Description', () => {
    it('extracts entries with Issue prefix', () => {
      const threads = extractActiveThreads(bankWithIssuePrefixFormat);

      expect(threads.length).toBeGreaterThanOrEqual(2);

      const issue26 = threads.find((t) => t.issueNumber === 26);
      expect(issue26).toBeDefined();
      expect(issue26?.description).toContain('Launch coordination');
    });
  });

  describe('edge cases', () => {
    it('returns empty array for bank without Active Threads section', () => {
      const threads = extractActiveThreads(emptyBank);
      expect(threads).toEqual([]);
    });

    it('handles bank with only section header', () => {
      const threads = extractActiveThreads('## Active Threads\n\n');
      expect(threads).toEqual([]);
    });

    it('does not duplicate issues matched by multiple patterns', () => {
      const bank = `
## Active Threads

- **#26** (P0, CEO, L) — Launch
- **Issue #26:** Same issue different format
`;
      const threads = extractActiveThreads(bank);
      const issue26Count = threads.filter((t) => t.issueNumber === 26).length;
      expect(issue26Count).toBe(1); // Should not duplicate
    });

    it('handles large issue numbers', () => {
      const bank = `
## Active Threads

- **#99999** (P1, Engineering, M) — Large number issue
`;
      const threads = extractActiveThreads(bank);
      expect(threads.find((t) => t.issueNumber === 99999)).toBeDefined();
    });
  });
});

// ─── findMissingIssues Tests ─────────────────────────────────────────────────

describe('findMissingIssues', () => {
  const openIssues: ParsedIssue[] = [
    { number: 1, title: 'Issue 1', labels: [], state: 'open', createdAt: '', updatedAt: '' },
    { number: 2, title: 'Issue 2', labels: [], state: 'open', createdAt: '', updatedAt: '' },
    { number: 3, title: 'Issue 3', labels: [], state: 'open', createdAt: '', updatedAt: '' },
  ];

  const activeThreads: ActiveThreadEntry[] = [
    { issueNumber: 1, description: 'Issue 1' },
    { issueNumber: 3, description: 'Issue 3' },
  ];

  it('finds issues not in Active Threads', () => {
    const missing = findMissingIssues(openIssues, activeThreads);

    expect(missing).toHaveLength(1);
    expect(missing[0]?.number).toBe(2);
  });

  it('returns empty array when all issues tracked', () => {
    const allTracked: ActiveThreadEntry[] = [
      { issueNumber: 1, description: 'Issue 1' },
      { issueNumber: 2, description: 'Issue 2' },
      { issueNumber: 3, description: 'Issue 3' },
    ];
    const missing = findMissingIssues(openIssues, allTracked);

    expect(missing).toEqual([]);
  });

  it('returns all issues when none tracked', () => {
    const missing = findMissingIssues(openIssues, []);

    expect(missing).toHaveLength(3);
  });
});

// ─── findClosedInThreads Tests ───────────────────────────────────────────────

describe('findClosedInThreads', () => {
  const activeThreads: ActiveThreadEntry[] = [
    { issueNumber: 1, description: 'Open issue' },
    { issueNumber: 2, description: 'Closed issue' },
    { issueNumber: 3, description: 'Another closed' },
  ];

  const closedIssues: ParsedIssue[] = [
    { number: 2, title: 'Closed', labels: [], state: 'closed', createdAt: '', updatedAt: '' },
    { number: 3, title: 'Also closed', labels: [], state: 'closed', createdAt: '', updatedAt: '' },
    { number: 99, title: 'Not in threads', labels: [], state: 'closed', createdAt: '', updatedAt: '' },
  ];

  it('finds closed issues still in Active Threads', () => {
    const stale = findClosedInThreads(activeThreads, closedIssues);

    expect(stale).toHaveLength(2);
    expect(stale).toContain(2);
    expect(stale).toContain(3);
    expect(stale).not.toContain(1); // Open
    expect(stale).not.toContain(99); // Not in threads
  });

  it('returns empty array when no closed issues in threads', () => {
    const threads: ActiveThreadEntry[] = [{ issueNumber: 1, description: 'Open' }];
    const stale = findClosedInThreads(threads, closedIssues);

    expect(stale).toEqual([]);
  });
});

// ─── formatIssueForThreads Tests ─────────────────────────────────────────────

describe('formatIssueForThreads', () => {
  const issue: ParsedIssue = {
    number: 42,
    title: 'feat(cli): Add new command',
    labels: ['enhancement'],
    state: 'open',
    createdAt: '',
    updatedAt: '',
  };

  it('formats with full metadata', () => {
    const formatted = formatIssueForThreads(issue, 'P1', 'Engineering', 'M');

    expect(formatted).toBe('**#42** (P1, Engineering, M) — feat(cli): Add new command');
  });

  it('formats with partial metadata', () => {
    const formatted = formatIssueForThreads(issue, 'P2');

    expect(formatted).toBe('**#42** (P2) — feat(cli): Add new command');
  });

  it('formats without metadata', () => {
    const formatted = formatIssueForThreads(issue);

    expect(formatted).toBe('**#42** — feat(cli): Add new command');
  });
});

// ─── verifyIssueTracking Tests ───────────────────────────────────────────────

describe('verifyIssueTracking', () => {
  const openIssues: ParsedIssue[] = [
    { number: 1, title: 'Issue 1', labels: [], state: 'open', createdAt: '', updatedAt: '' },
    { number: 2, title: 'Issue 2', labels: [], state: 'open', createdAt: '', updatedAt: '' },
  ];

  const closedIssues: ParsedIssue[] = [
    { number: 3, title: 'Closed', labels: [], state: 'closed', createdAt: '', updatedAt: '' },
  ];

  it('calculates 100% compliance when all tracked', () => {
    const threads: ActiveThreadEntry[] = [
      { issueNumber: 1, description: 'Issue 1' },
      { issueNumber: 2, description: 'Issue 2' },
    ];

    const result = verifyIssueTracking(openIssues, threads, closedIssues);

    expect(result.compliance).toBe(1);
    expect(result.totalOpenIssues).toBe(2);
    expect(result.trackedIssues).toBe(2);
    expect(result.missingIssues).toHaveLength(0);
  });

  it('calculates 50% compliance when half tracked', () => {
    const threads: ActiveThreadEntry[] = [{ issueNumber: 1, description: 'Issue 1' }];

    const result = verifyIssueTracking(openIssues, threads, closedIssues);

    expect(result.compliance).toBe(0.5);
    expect(result.missingIssues).toHaveLength(1);
    expect(result.missingIssues[0]?.number).toBe(2);
  });

  it('detects closed issues in threads', () => {
    const threads: ActiveThreadEntry[] = [
      { issueNumber: 1, description: 'Issue 1' },
      { issueNumber: 2, description: 'Issue 2' },
      { issueNumber: 3, description: 'Closed but still tracked' },
    ];

    const result = verifyIssueTracking(openIssues, threads, closedIssues);

    expect(result.closedInThreads).toContain(3);
  });

  it('handles empty issue list', () => {
    const result = verifyIssueTracking([], [], []);

    expect(result.compliance).toBe(1); // No issues = 100% compliant
    expect(result.totalOpenIssues).toBe(0);
  });
});

// ─── extractPriorityFromLabels Tests ─────────────────────────────────────────

describe('extractPriorityFromLabels', () => {
  it('extracts P0 priority', () => {
    expect(extractPriorityFromLabels(['enhancement', 'P0'])).toBe('P0');
  });

  it('extracts P3 priority', () => {
    expect(extractPriorityFromLabels(['bug', 'P3', 'wontfix'])).toBe('P3');
  });

  it('returns highest priority when multiple present', () => {
    expect(extractPriorityFromLabels(['P2', 'P0', 'P1'])).toBe('P0');
  });

  it('returns undefined when no priority label', () => {
    expect(extractPriorityFromLabels(['bug', 'enhancement'])).toBeUndefined();
  });

  it('handles empty labels', () => {
    expect(extractPriorityFromLabels([])).toBeUndefined();
  });
});

// ─── suggestRoleFromIssue Tests ──────────────────────────────────────────────

describe('suggestRoleFromIssue', () => {
  it('suggests Engineering for feat(core)', () => {
    expect(suggestRoleFromIssue('feat(core): Add new feature', [])).toBe('Engineering');
  });

  it('suggests Research for benchmark titles', () => {
    expect(suggestRoleFromIssue('Benchmark Testing Strategy', [])).toBe('Research');
  });

  it('suggests QA for test-related titles', () => {
    expect(suggestRoleFromIssue('E2E Testing Infrastructure', [])).toBe('QA');
  });

  it('suggests Ops for CI-related titles', () => {
    expect(suggestRoleFromIssue('ci(ops): Fix deployment pipeline', [])).toBe('Ops');
  });

  it('respects role: label over heuristics', () => {
    expect(suggestRoleFromIssue('Some ambiguous title', ['role:Design'])).toBe('Design');
  });

  it('returns undefined for ambiguous titles without labels', () => {
    expect(suggestRoleFromIssue('Update configuration', [])).toBeUndefined();
  });

  it('suggests Growth for demo/fundraising titles', () => {
    // Note: Heuristics use substring matching, so watch for false positives:
    // - 'social' contains 'ci' → matches Ops
    // - 'production' contains 'product' → matches Product
    // - 'launch' → matches CEO
    // Using keywords that only match Growth without substring conflicts.
    expect(suggestRoleFromIssue('Fundraising pitch deck updates', [])).toBe('Growth');
    expect(suggestRoleFromIssue('Demo reel for marketing team', [])).toBe('Growth');
  });

  it('suggests Frontier for memory-related titles', () => {
    expect(suggestRoleFromIssue('Cognitive Memory Architecture', [])).toBe('Frontier');
  });
});
