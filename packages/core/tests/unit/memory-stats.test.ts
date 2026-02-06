/**
 * Tests for memory-stats.ts — Memory stats extraction
 *
 * Issue #52: `ada memory` Phase 2
 */

import { describe, it, expect } from 'vitest';
import {
  extractLastUpdated,
  extractLastCompression,
  extractBankInfo,
  extractRoleActivity,
  countBlockers,
  countActiveThreads,
  countDecisions,
  countLessons,
  hasMetricsSection,
  extractSectionCounts,
  calculateHealth,
  extractMemoryStats,
  formatActivityBar,
  getRelativeTime,
} from '../../src/memory-stats.js';

// ─── Sample Bank Content ─────────────────────────────────────────────────────

const SAMPLE_BANK = `# 🧠 Memory Bank

> The shared brain of the ADA autonomous development team.
> **Last updated:** 2026-02-06 02:18:00 EST | **Cycle:** 83 | **Version:** 4
> **Last compression:** 2026-02-05 (v3 archived)

---

## Current Status

### Active Sprint

- **Sprint 0: Foundation** (ends 2026-02-14, ~99% complete)

### Blockers

- None 🎉

---

## Architecture Decisions

| ID       | Decision                                    | Date       |
| -------- | ------------------------------------------- | ---------- |
| ADR-001  | npm workspaces monorepo + Commander CLI     | Init       |
| ADR-003  | Vitest, trunk-based dev                     | Init       |
| BIZ-001  | Freemium: CLI open-source → SaaS            | 2026-01-30 |

---

## Active Threads

- **CEO → All:** Go/No-Go Countdown Tracker v1.1
- **CEO → Ops:** npm publish pipeline
- **Engineering → Product → Growth:** Issue #41 ✅ COMPLETE

---

## Key Lessons

1. Dogfooding reveals real bugs
2. P0-P3 triage prevents scope creep
3. Pre-commit hooks prevent CI failures

---

## Project Metrics

- **Issues:** 54 total (8 closed, 46 open)
- **Open PRs:** 0 ✅
`;

const BANK_WITH_BLOCKERS = `# 🧠 Memory Bank

> **Last updated:** 2026-02-06 | **Cycle:** 50 | **Version:** 2

### Blockers

- CI pipeline failing on lint
- Waiting on external dependency release
- Need budget approval for cloud resources
`;

const EMPTY_BANK = `# 🧠 Memory Bank

> **Last updated:** 2026-02-06 | **Cycle:** 1 | **Version:** 1
`;

// ─── extractLastUpdated ──────────────────────────────────────────────────────

describe('extractLastUpdated', () => {
  it('should extract timestamp from standard header', () => {
    const result = extractLastUpdated(SAMPLE_BANK);
    expect(result).toBe('2026-02-06 02:18:00 EST');
  });

  it('should return null when not found', () => {
    const result = extractLastUpdated('# No header here');
    expect(result).toBeNull();
  });
});

// ─── extractLastCompression ──────────────────────────────────────────────────

describe('extractLastCompression', () => {
  it('should extract compression date from standard header', () => {
    const result = extractLastCompression(SAMPLE_BANK);
    expect(result).toBe('2026-02-05');
  });

  it('should return null when never compressed', () => {
    const result = extractLastCompression(EMPTY_BANK);
    expect(result).toBeNull();
  });
});

// ─── extractBankInfo ─────────────────────────────────────────────────────────

describe('extractBankInfo', () => {
  it('should extract all bank metadata', () => {
    const result = extractBankInfo(SAMPLE_BANK);

    expect(result.version).toBe(4);
    expect(result.lastUpdated).toBe('2026-02-06 02:18:00 EST');
    expect(result.lastCompression).toBe('2026-02-05');
    expect(result.lines).toBeGreaterThan(0);
  });

  it('should handle minimal bank', () => {
    const result = extractBankInfo(EMPTY_BANK);

    expect(result.version).toBe(1);
    expect(result.lines).toBe(4);
  });
});

// ─── extractRoleActivity ─────────────────────────────────────────────────────

describe('extractRoleActivity', () => {
  const sampleHistory = [
    { role: 'engineering', cycle: 83, timestamp: '2026-02-06T07:00:00Z' },
    { role: 'ops', cycle: 82, timestamp: '2026-02-06T06:00:00Z' },
    { role: 'engineering', cycle: 81, timestamp: '2026-02-06T05:00:00Z' },
    { role: 'research', cycle: 80, timestamp: '2026-02-06T04:00:00Z' },
    { role: 'ops', cycle: 79, timestamp: '2026-02-06T03:00:00Z' },
  ];

  it('should count role occurrences', () => {
    const result = extractRoleActivity(sampleHistory);

    expect(result.engineering).toBe(2);
    expect(result.ops).toBe(2);
    expect(result.research).toBe(1);
  });

  it('should respect limit parameter', () => {
    const result = extractRoleActivity(sampleHistory, 3);

    expect(result.engineering).toBe(2);
    expect(result.ops).toBe(1);
    expect(result.research).toBeUndefined();
  });

  it('should handle empty history', () => {
    const result = extractRoleActivity([]);
    expect(Object.keys(result).length).toBe(0);
  });
});

// ─── countBlockers ───────────────────────────────────────────────────────────

describe('countBlockers', () => {
  it('should return 0 for "None" patterns', () => {
    expect(countBlockers(SAMPLE_BANK)).toBe(0);
  });

  it('should count actual blockers', () => {
    expect(countBlockers(BANK_WITH_BLOCKERS)).toBe(3);
  });

  it('should handle missing blockers section', () => {
    expect(countBlockers('# No blockers section')).toBe(0);
  });
});

// ─── countActiveThreads ──────────────────────────────────────────────────────

describe('countActiveThreads', () => {
  it('should count thread items', () => {
    const result = countActiveThreads(SAMPLE_BANK);
    expect(result).toBe(3);
  });

  it('should return 0 when section missing', () => {
    expect(countActiveThreads('# No threads')).toBe(0);
  });
});

// ─── countDecisions ──────────────────────────────────────────────────────────

describe('countDecisions', () => {
  it('should count decision table rows', () => {
    const result = countDecisions(SAMPLE_BANK);
    expect(result).toBe(3);
  });

  it('should return 0 when no decisions', () => {
    expect(countDecisions(EMPTY_BANK)).toBe(0);
  });
});

// ─── countLessons ────────────────────────────────────────────────────────────

describe('countLessons', () => {
  it('should count numbered lessons', () => {
    const result = countLessons(SAMPLE_BANK);
    expect(result).toBe(3);
  });

  it('should return 0 when no lessons', () => {
    expect(countLessons(EMPTY_BANK)).toBe(0);
  });
});

// ─── hasMetricsSection ───────────────────────────────────────────────────────

describe('hasMetricsSection', () => {
  it('should detect metrics section', () => {
    expect(hasMetricsSection(SAMPLE_BANK)).toBe(true);
  });

  it('should return false when missing', () => {
    expect(hasMetricsSection(EMPTY_BANK)).toBe(false);
  });
});

// ─── extractSectionCounts ────────────────────────────────────────────────────

describe('extractSectionCounts', () => {
  it('should extract all section counts', () => {
    const result = extractSectionCounts(SAMPLE_BANK);

    expect(result.blockers).toBe(0);
    expect(result.activeThreads).toBe(3);
    expect(result.decisions).toBe(3);
    expect(result.lessons).toBe(3);
    expect(result.hasMetrics).toBe(true);
  });
});

// ─── calculateHealth ─────────────────────────────────────────────────────────

describe('calculateHealth', () => {
  it('should return healthy for good stats', () => {
    const bank = { version: 4, lastUpdated: null, lastCompression: null, lines: 100 };
    const cycles = { total: 50, sinceCompression: 5, perDay: null };
    const sections = { blockers: 0, activeThreads: 10, decisions: 5, lessons: 10, hasMetrics: true };

    const result = calculateHealth(bank, cycles, sections);

    expect(result.status).toBe('healthy');
    expect(result.warnings.length).toBe(0);
  });

  it('should warn on approaching compression threshold', () => {
    const bank = { version: 4, lastUpdated: null, lastCompression: null, lines: 175 };
    const cycles = { total: 50, sinceCompression: 5, perDay: null };
    const sections = { blockers: 0, activeThreads: 10, decisions: 5, lessons: 10, hasMetrics: true };

    const result = calculateHealth(bank, cycles, sections);

    expect(result.status).toBe('warning');
    expect(result.warnings.some(w => w.includes('approaching'))).toBe(true);
  });

  it('should return unhealthy when bank exceeds threshold', () => {
    const bank = { version: 4, lastUpdated: null, lastCompression: null, lines: 250 };
    const cycles = { total: 50, sinceCompression: 5, perDay: null };
    const sections = { blockers: 0, activeThreads: 10, decisions: 5, lessons: 10, hasMetrics: true };

    const result = calculateHealth(bank, cycles, sections);

    expect(result.status).toBe('unhealthy');
    expect(result.warnings.some(w => w.includes('needs compression'))).toBe(true);
  });

  it('should warn on multiple blockers', () => {
    const bank = { version: 4, lastUpdated: null, lastCompression: null, lines: 100 };
    const cycles = { total: 50, sinceCompression: 5, perDay: null };
    const sections = { blockers: 3, activeThreads: 10, decisions: 5, lessons: 10, hasMetrics: true };

    const result = calculateHealth(bank, cycles, sections);

    expect(result.status).toBe('unhealthy');
    expect(result.warnings.some(w => w.includes('blockers'))).toBe(true);
  });

  it('should warn on high thread count', () => {
    const bank = { version: 4, lastUpdated: null, lastCompression: null, lines: 100 };
    const cycles = { total: 50, sinceCompression: 5, perDay: null };
    const sections = { blockers: 0, activeThreads: 18, decisions: 5, lessons: 10, hasMetrics: true };

    const result = calculateHealth(bank, cycles, sections);

    expect(result.status).toBe('warning');
    expect(result.warnings.some(w => w.includes('thread count'))).toBe(true);
  });
});

// ─── extractMemoryStats ──────────────────────────────────────────────────────

describe('extractMemoryStats', () => {
  it('should extract complete stats', () => {
    const history = [
      { role: 'engineering', cycle: 83, timestamp: '2026-02-06T07:00:00Z' },
      { role: 'ops', cycle: 82, timestamp: '2026-02-06T06:00:00Z' },
    ];

    const result = extractMemoryStats(SAMPLE_BANK, history);

    expect(result.bank.version).toBe(4);
    expect(result.cycles.total).toBe(83);
    expect(result.roleActivity.engineering).toBe(1);
    expect(result.roleActivity.ops).toBe(1);
    expect(result.sections.blockers).toBe(0);
    expect(result.health.status).toBeDefined();
  });
});

// ─── formatActivityBar ───────────────────────────────────────────────────────

describe('formatActivityBar', () => {
  it('should return full bar for max value', () => {
    const result = formatActivityBar(10, 10, 12);
    expect(result.length).toBe(12);
    expect(result).toBe('████████████');
  });

  it('should return proportional bar', () => {
    const result = formatActivityBar(5, 10, 12);
    expect(result.length).toBe(6);
  });

  it('should return minimum 1 char for non-zero', () => {
    const result = formatActivityBar(1, 100, 12);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('should return empty for zero count', () => {
    expect(formatActivityBar(0, 10)).toBe('');
  });
});

// ─── getRelativeTime ─────────────────────────────────────────────────────────

describe('getRelativeTime', () => {
  it('should return "just now" for recent time', () => {
    const now = new Date().toISOString();
    const result = getRelativeTime(now);
    expect(result).toBe('just now');
  });

  it('should return minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = getRelativeTime(fiveMinAgo);
    expect(result).toMatch(/\d+ minutes? ago/);
  });

  it('should return hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const result = getRelativeTime(twoHoursAgo);
    expect(result).toMatch(/\d+ hours? ago/);
  });

  it('should return days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const result = getRelativeTime(threeDaysAgo);
    expect(result).toMatch(/\d+ days? ago/);
  });

  it('should return date string for old timestamps', () => {
    const result = getRelativeTime('2025-01-01T00:00:00Z');
    expect(result).toBe('2025-01-01');
  });

  it('should return original string for unparseable input', () => {
    const result = getRelativeTime('not a date');
    expect(result).toBe('not a date');
  });
});
