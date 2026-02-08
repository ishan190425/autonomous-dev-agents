/**
 * @ada/core — Memory Stream Tests
 *
 * Tests for the JSONL-based memory stream (Cognitive Memory Phase 1).
 *
 * @see Issue #95 — Cognitive Memory Architecture
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  MemoryStream,
  createMemoryStream,
  estimateTokens,
  calculateRecencyScore,
  normalizeImportance,
  calculateRelevanceScore,
  calculateRetrievalScore,
  extractIssueRefs,
  extractPRRefs,
  calculateDefaultImportance,
  type StreamEntry,
  type StreamEntryInput,
} from '../../src/memory-stream.js';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

const testDir = join(tmpdir(), 'ada-memory-stream-test');
const testFile = join(testDir, 'test-stream.jsonl');

function createTestInput(overrides: Partial<StreamEntryInput> = {}): StreamEntryInput {
  return {
    cycle: 100,
    role: 'engineering',
    action: 'Test action',
    content: 'This is a test entry for unit testing the memory stream.',
    importance: 7,
    tags: ['test'],
    issueRefs: [42],
    prRefs: [101],
    ...overrides,
  };
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  if (!existsSync(testDir)) {
    mkdirSync(testDir, { recursive: true });
  }
  // Clean up any existing test file
  if (existsSync(testFile)) {
    unlinkSync(testFile);
  }
});

afterEach(() => {
  // Clean up test directory
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

// ─── Token Estimation Tests ──────────────────────────────────────────────────

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates tokens for short text', () => {
    const tokens = estimateTokens('Hello, world!');
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(10);
  });

  it('estimates tokens for longer text', () => {
    const text = 'This is a longer piece of text that should result in more tokens.';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(10);
    expect(tokens).toBeLessThan(30);
  });

  it('handles undefined/null gracefully', () => {
    expect(estimateTokens(undefined as unknown as string)).toBe(0);
    expect(estimateTokens(null as unknown as string)).toBe(0);
  });
});

// ─── Scoring Function Tests ──────────────────────────────────────────────────

describe('calculateRecencyScore', () => {
  it('returns 1.0 for current cycle', () => {
    const score = calculateRecencyScore(100, 100);
    expect(score).toBeCloseTo(1.0, 5);
  });

  it('decays for older cycles', () => {
    const score10 = calculateRecencyScore(90, 100);
    const score50 = calculateRecencyScore(50, 100);
    const score100 = calculateRecencyScore(0, 100);

    expect(score10).toBeLessThan(1.0);
    expect(score50).toBeLessThan(score10);
    expect(score100).toBeLessThan(score50);
  });

  it('returns ~0.3 for 100 cycles ago', () => {
    const score = calculateRecencyScore(0, 100);
    expect(score).toBeGreaterThan(0.2);
    expect(score).toBeLessThan(0.5);
  });

  it('handles future cycles gracefully', () => {
    const score = calculateRecencyScore(110, 100);
    expect(score).toBeCloseTo(1.0, 5);
  });
});

describe('normalizeImportance', () => {
  it('normalizes to 0-1 scale', () => {
    expect(normalizeImportance(1)).toBeCloseTo(0.1, 5);
    expect(normalizeImportance(5)).toBeCloseTo(0.5, 5);
    expect(normalizeImportance(10)).toBeCloseTo(1.0, 5);
  });

  it('clamps values outside 1-10 range', () => {
    expect(normalizeImportance(0)).toBe(0);
    expect(normalizeImportance(-5)).toBe(0);
    expect(normalizeImportance(15)).toBe(1.0);
  });
});

describe('calculateRelevanceScore', () => {
  it('returns high score for matching content', () => {
    const score = calculateRelevanceScore('memory stream', 'This is about the memory stream implementation.');
    expect(score).toBeGreaterThan(0.5);
  });

  it('returns low score for non-matching content', () => {
    const score = calculateRelevanceScore('memory stream', 'This is about something completely different.');
    expect(score).toBeLessThan(0.3);
  });

  it('returns neutral score for empty query', () => {
    const score = calculateRelevanceScore('', 'Any content here.');
    expect(score).toBeCloseTo(0.5, 5);
  });

  it('is case-insensitive', () => {
    const score1 = calculateRelevanceScore('MEMORY', 'memory stream');
    const score2 = calculateRelevanceScore('memory', 'MEMORY STREAM');
    expect(score1).toBeGreaterThan(0.5);
    expect(score2).toBeGreaterThan(0.5);
  });
});

describe('calculateRetrievalScore', () => {
  const mockEntry: StreamEntry = {
    id: 'test-1',
    cycle: 95,
    timestamp: '2026-02-08T12:00:00.000Z',
    role: 'engineering',
    action: 'Memory stream prototype',
    content: 'Implemented the memory stream for cognitive architecture.',
    importance: 8,
    type: 'action',
    tags: ['memory', 'architecture'],
    issueRefs: [95],
    prRefs: [],
    tokenEstimate: 50,
  };

  it('returns score with components', () => {
    const result = calculateRetrievalScore(mockEntry, 'memory architecture', 100);

    expect(result.score).toBeGreaterThan(0);
    expect(result.components.recency).toBeGreaterThan(0);
    expect(result.components.importance).toBeCloseTo(0.8, 5);
    expect(result.components.relevance).toBeGreaterThan(0);
  });

  it('scores higher for more recent entries', () => {
    const recentEntry = { ...mockEntry, cycle: 99 };
    const oldEntry = { ...mockEntry, cycle: 50 };

    const recentResult = calculateRetrievalScore(recentEntry, 'test', 100);
    const oldResult = calculateRetrievalScore(oldEntry, 'test', 100);

    expect(recentResult.components.recency).toBeGreaterThan(oldResult.components.recency);
  });

  it('scores higher for more important entries', () => {
    const highImportance = { ...mockEntry, importance: 10 };
    const lowImportance = { ...mockEntry, importance: 3 };

    const highResult = calculateRetrievalScore(highImportance, 'test', 100);
    const lowResult = calculateRetrievalScore(lowImportance, 'test', 100);

    expect(highResult.components.importance).toBeGreaterThan(lowResult.components.importance);
  });
});

// ─── MemoryStream Class Tests ────────────────────────────────────────────────

describe('MemoryStream', () => {
  describe('constructor and factory', () => {
    it('creates instance with constructor', () => {
      const stream = new MemoryStream(testFile);
      expect(stream).toBeInstanceOf(MemoryStream);
    });

    it('creates instance with factory function', () => {
      const stream = createMemoryStream(testFile);
      expect(stream).toBeInstanceOf(MemoryStream);
    });

    it('starts with zero entries for new file', () => {
      const stream = new MemoryStream(testFile);
      expect(stream.count()).toBe(0);
    });
  });

  describe('memoryLog', () => {
    it('logs an entry and returns it', () => {
      const stream = new MemoryStream(testFile);
      const input = createTestInput();

      const entry = stream.memoryLog(input);

      expect(entry.id).toBeDefined();
      expect(entry.cycle).toBe(100);
      expect(entry.role).toBe('engineering');
      expect(entry.action).toBe('Test action');
      expect(entry.importance).toBe(7);
      expect(entry.type).toBe('action');
      expect(entry.tags).toContain('test');
      expect(entry.issueRefs).toContain(42);
      expect(entry.tokenEstimate).toBeGreaterThan(0);
    });

    it('persists entries to file', () => {
      const stream1 = new MemoryStream(testFile);
      stream1.memoryLog(createTestInput({ cycle: 1 }));
      stream1.memoryLog(createTestInput({ cycle: 2 }));

      // Create new instance to verify persistence
      const stream2 = new MemoryStream(testFile);
      expect(stream2.count()).toBe(2);
    });

    it('clamps importance to 1-10 range', () => {
      const stream = new MemoryStream(testFile);

      const tooLow = stream.memoryLog(createTestInput({ importance: -5 }));
      expect(tooLow.importance).toBe(1);

      const tooHigh = stream.memoryLog(createTestInput({ importance: 100 }));
      expect(tooHigh.importance).toBe(10);
    });

    it('uses default type of action', () => {
      const stream = new MemoryStream(testFile);
      const entry = stream.memoryLog(createTestInput({ type: undefined }));
      expect(entry.type).toBe('action');
    });

    it('generates unique IDs', () => {
      const stream = new MemoryStream(testFile);
      const entry1 = stream.memoryLog(createTestInput());
      const entry2 = stream.memoryLog(createTestInput());
      expect(entry1.id).not.toBe(entry2.id);
    });
  });

  describe('recallSearch', () => {
    let stream: MemoryStream;

    beforeEach(() => {
      stream = new MemoryStream(testFile);

      // Add diverse entries for testing
      stream.memoryLog(createTestInput({
        cycle: 90,
        role: 'research',
        action: 'Memory architecture research',
        content: 'Researched cognitive memory systems for agents.',
        importance: 8,
        tags: ['memory', 'research'],
        issueRefs: [95],
      }));

      stream.memoryLog(createTestInput({
        cycle: 95,
        role: 'frontier',
        action: 'Memory stream design',
        content: 'Designed the JSONL-based memory stream.',
        importance: 9,
        tags: ['memory', 'design'],
        issueRefs: [95],
      }));

      stream.memoryLog(createTestInput({
        cycle: 98,
        role: 'engineering',
        action: 'Bug fix',
        content: 'Fixed a timing bug in tests.',
        importance: 5,
        tags: ['bug', 'tests'],
        issueRefs: [101],
      }));

      stream.memoryLog(createTestInput({
        cycle: 100,
        role: 'frontier',
        action: 'Memory stream implementation',
        content: 'Implemented the MemoryStream class in TypeScript.',
        importance: 9,
        tags: ['memory', 'implementation'],
        issueRefs: [95],
      }));
    });

    it('returns results sorted by score', () => {
      const results = stream.recallSearch('memory stream', { limit: 10 });

      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        expect(prev!.score).toBeGreaterThanOrEqual(curr!.score);
      }
    });

    it('respects limit option', () => {
      const results = stream.recallSearch('memory', { limit: 2 });
      expect(results.length).toBe(2);
    });

    it('filters by role', () => {
      const results = stream.recallSearch('', { role: 'frontier' });

      for (const result of results) {
        expect(result.entry.role).toBe('frontier');
      }
    });

    it('filters by issue reference', () => {
      const results = stream.recallSearch('', { issue: 95 });

      for (const result of results) {
        expect(result.entry.issueRefs).toContain(95);
      }
    });

    it('filters by minimum importance', () => {
      const results = stream.recallSearch('', { minImportance: 8 });

      for (const result of results) {
        expect(result.entry.importance).toBeGreaterThanOrEqual(8);
      }
    });

    it('filters by cycle range', () => {
      const results = stream.recallSearch('', { cycleRange: [95, 100] });

      for (const result of results) {
        expect(result.entry.cycle).toBeGreaterThanOrEqual(95);
        expect(result.entry.cycle).toBeLessThanOrEqual(100);
      }
    });

    it('filters by type', () => {
      // Add a reflection entry
      stream.memoryLog(createTestInput({
        cycle: 99,
        type: 'reflection',
        action: 'Reflection on memory progress',
        content: 'The memory system is coming together nicely.',
      }));

      const reflections = stream.recallSearch('', { type: 'reflection' });
      expect(reflections.length).toBe(1);
      expect(reflections[0]!.entry.type).toBe('reflection');
    });

    it('includes score components', () => {
      const results = stream.recallSearch('memory');

      for (const result of results) {
        expect(result.components).toBeDefined();
        expect(result.components.recency).toBeGreaterThan(0);
        expect(result.components.importance).toBeGreaterThan(0);
        expect(result.components.relevance).toBeDefined();
      }
    });
  });

  describe('recallByCycle', () => {
    let stream: MemoryStream;

    beforeEach(() => {
      stream = new MemoryStream(testFile);
      for (let i = 1; i <= 10; i++) {
        stream.memoryLog(createTestInput({
          cycle: i * 10,
          role: i % 2 === 0 ? 'engineering' : 'research',
          importance: i,
        }));
      }
    });

    it('returns entries in cycle range', () => {
      const entries = stream.recallByCycle(30, 70);

      expect(entries.length).toBe(5);
      for (const entry of entries) {
        expect(entry.cycle).toBeGreaterThanOrEqual(30);
        expect(entry.cycle).toBeLessThanOrEqual(70);
      }
    });

    it('returns entries newest first', () => {
      const entries = stream.recallByCycle(10, 100);

      for (let i = 1; i < entries.length; i++) {
        expect(entries[i - 1]!.cycle).toBeGreaterThanOrEqual(entries[i]!.cycle);
      }
    });

    it('filters by role', () => {
      const entries = stream.recallByCycle(10, 100, { role: 'engineering' });

      expect(entries.length).toBe(5);
      for (const entry of entries) {
        expect(entry.role).toBe('engineering');
      }
    });

    it('filters by minimum importance', () => {
      const entries = stream.recallByCycle(10, 100, { minImportance: 7 });

      for (const entry of entries) {
        expect(entry.importance).toBeGreaterThanOrEqual(7);
      }
    });

    it('returns empty array for out-of-range cycles', () => {
      const entries = stream.recallByCycle(200, 300);
      expect(entries).toEqual([]);
    });
  });

  describe('recallByRole', () => {
    it('returns entries for specific role', () => {
      const stream = new MemoryStream(testFile);

      stream.memoryLog(createTestInput({ role: 'engineering', cycle: 1 }));
      stream.memoryLog(createTestInput({ role: 'research', cycle: 2 }));
      stream.memoryLog(createTestInput({ role: 'engineering', cycle: 3 }));

      const results = stream.recallByRole('engineering');

      expect(results.length).toBe(2);
      expect(results[0]!.cycle).toBe(3); // Newest first
      expect(results[1]!.cycle).toBe(1);
    });

    it('respects limit', () => {
      const stream = new MemoryStream(testFile);

      for (let i = 0; i < 20; i++) {
        stream.memoryLog(createTestInput({ role: 'ops', cycle: i }));
      }

      const results = stream.recallByRole('ops', 5);
      expect(results.length).toBe(5);
    });
  });

  describe('recallByIssue', () => {
    it('returns entries referencing specific issue', () => {
      const stream = new MemoryStream(testFile);

      stream.memoryLog(createTestInput({ issueRefs: [95], cycle: 1 }));
      stream.memoryLog(createTestInput({ issueRefs: [100], cycle: 2 }));
      stream.memoryLog(createTestInput({ issueRefs: [95, 100], cycle: 3 }));

      const results = stream.recallByIssue(95);

      expect(results.length).toBe(2);
      expect(results[0]!.cycle).toBe(3); // Newest first
    });
  });

  describe('getLastRoleEntry', () => {
    it('returns most recent entry for role', () => {
      const stream = new MemoryStream(testFile);

      stream.memoryLog(createTestInput({ role: 'engineering', cycle: 1, action: 'First' }));
      stream.memoryLog(createTestInput({ role: 'research', cycle: 2 }));
      stream.memoryLog(createTestInput({ role: 'engineering', cycle: 3, action: 'Last' }));

      const entry = stream.getLastRoleEntry('engineering');

      expect(entry).not.toBeNull();
      expect(entry!.action).toBe('Last');
      expect(entry!.cycle).toBe(3);
    });

    it('returns null for unknown role', () => {
      const stream = new MemoryStream(testFile);
      stream.memoryLog(createTestInput({ role: 'engineering' }));

      const entry = stream.getLastRoleEntry('nonexistent');
      expect(entry).toBeNull();
    });
  });

  describe('getStats', () => {
    it('returns empty stats for empty stream', () => {
      const stream = new MemoryStream(testFile);
      const stats = stream.getStats();

      expect(stats.entryCount).toBe(0);
      expect(stats.oldestCycle).toBeNull();
      expect(stats.newestCycle).toBeNull();
      expect(stats.totalTokens).toBe(0);
      expect(stats.lastTimestamp).toBeNull();
    });

    it('returns accurate stats for populated stream', () => {
      const stream = new MemoryStream(testFile);

      stream.memoryLog(createTestInput({ cycle: 10, role: 'engineering', type: 'action' }));
      stream.memoryLog(createTestInput({ cycle: 50, role: 'research', type: 'observation' }));
      stream.memoryLog(createTestInput({ cycle: 100, role: 'engineering', type: 'decision' }));

      const stats = stream.getStats();

      expect(stats.entryCount).toBe(3);
      expect(stats.oldestCycle).toBe(10);
      expect(stats.newestCycle).toBe(100);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.byRole['engineering']).toBe(2);
      expect(stats.byRole['research']).toBe(1);
      expect(stats.byType.action).toBe(1);
      expect(stats.byType.observation).toBe(1);
      expect(stats.byType.decision).toBe(1);
      expect(stats.lastTimestamp).toBeDefined();
    });
  });

  describe('reload', () => {
    it('reloads entries from disk', () => {
      const stream1 = new MemoryStream(testFile);
      stream1.memoryLog(createTestInput({ cycle: 1 }));

      const stream2 = new MemoryStream(testFile);
      stream2.memoryLog(createTestInput({ cycle: 2 }));

      // stream1 doesn't know about entry 2
      expect(stream1.count()).toBe(1);

      // After reload, it should
      stream1.reload();
      expect(stream1.count()).toBe(2);
    });
  });
});

// ─── Phase 2: Reference Extraction Tests ─────────────────────────────────────

describe('extractIssueRefs (Phase 2)', () => {
  it('extracts #N patterns', () => {
    expect(extractIssueRefs('Fixed #123')).toEqual([123]);
    expect(extractIssueRefs('See #42 and #43')).toEqual([42, 43]);
  });

  it('extracts Issue #N patterns', () => {
    expect(extractIssueRefs('Issue #95')).toEqual([95]);
    expect(extractIssueRefs('issue #100')).toEqual([100]);
  });

  it('extracts fix/close/resolve patterns', () => {
    expect(extractIssueRefs('Fixes #101')).toEqual([101]);
    expect(extractIssueRefs('closes #50')).toEqual([50]);
    expect(extractIssueRefs('resolves #25')).toEqual([25]);
    // Order may vary; check both are present
    const refs = extractIssueRefs('Fixed #10, resolved #20');
    expect(refs).toContain(10);
    expect(refs).toContain(20);
    expect(refs).toHaveLength(2);
  });

  it('returns unique values', () => {
    expect(extractIssueRefs('#5 and #5 and #5')).toEqual([5]);
    expect(extractIssueRefs('Issue #10, Fixes #10')).toEqual([10]);
  });

  it('returns empty array for no matches', () => {
    expect(extractIssueRefs('No issues here')).toEqual([]);
    expect(extractIssueRefs('')).toEqual([]);
  });

  it('ignores PR patterns', () => {
    expect(extractIssueRefs('PR #50 merged')).toEqual([]);
  });
});

describe('extractPRRefs (Phase 2)', () => {
  it('extracts PR #N patterns', () => {
    expect(extractPRRefs('Merged PR #103')).toEqual([103]);
    expect(extractPRRefs('See PR #50 and PR #51')).toEqual([50, 51]);
  });

  it('extracts pull #N patterns', () => {
    expect(extractPRRefs('pull #42')).toEqual([42]);
    expect(extractPRRefs('Pull request #99')).toEqual([99]);
  });

  it('is case insensitive', () => {
    expect(extractPRRefs('pr #10')).toEqual([10]);
    expect(extractPRRefs('PULL #20')).toEqual([20]);
  });

  it('returns unique values', () => {
    expect(extractPRRefs('PR #5 and PR #5')).toEqual([5]);
  });

  it('returns empty array for no matches', () => {
    expect(extractPRRefs('No PRs here')).toEqual([]);
    expect(extractPRRefs('Issue #50')).toEqual([]);
  });
});

describe('calculateDefaultImportance (Phase 2)', () => {
  it('returns base importance of 5 for neutral text', () => {
    const score = calculateDefaultImportance('Did something', 'Content', 'action');
    expect(score).toBe(5);
  });

  it('adds +3 for critical/blocker keywords', () => {
    expect(calculateDefaultImportance('CRITICAL bug', '', 'action')).toBe(8);
    expect(calculateDefaultImportance('Blocker issue', '', 'action')).toBe(8);
    expect(calculateDefaultImportance('Breaking change', '', 'action')).toBe(8);
  });

  it('adds +2 for fix/resolve/close keywords', () => {
    expect(calculateDefaultImportance('Fixed the bug', '', 'action')).toBe(7);
    expect(calculateDefaultImportance('Resolved issue', '', 'action')).toBe(7);
    expect(calculateDefaultImportance('Closes #50', '', 'action')).toBe(7);
  });

  it('adds +2 for merge/ship/launch keywords', () => {
    expect(calculateDefaultImportance('Merged PR #100', '', 'action')).toBe(7);
    expect(calculateDefaultImportance('Shipped v1.0', '', 'action')).toBe(7);
    expect(calculateDefaultImportance('Launched feature', '', 'action')).toBe(7);
    expect(calculateDefaultImportance('Released alpha', '', 'action')).toBe(7);
  });

  it('adds +1 for review/approve keywords', () => {
    expect(calculateDefaultImportance('Reviewed code', '', 'action')).toBe(6);
    expect(calculateDefaultImportance('Approved PR', '', 'action')).toBe(6);
    expect(calculateDefaultImportance('LGTM', '', 'action')).toBe(6);
  });

  it('adds +2 for decision type', () => {
    expect(calculateDefaultImportance('Chose JSONL', '', 'decision')).toBe(7);
  });

  it('adds +1 for reflection type', () => {
    expect(calculateDefaultImportance('Reflection on progress', '', 'reflection')).toBe(6);
  });

  it('stacks multiple bonuses', () => {
    // Critical (+3) + merged (+2) = 10
    expect(calculateDefaultImportance('CRITICAL: Merged hotfix', '', 'action')).toBe(10);
  });

  it('clamps to 1-10 range', () => {
    // Many bonuses stacked
    const score = calculateDefaultImportance(
      'CRITICAL merged shipped launched fixed resolved',
      '',
      'decision'
    );
    expect(score).toBe(10);
  });

  it('considers content in addition to action', () => {
    expect(calculateDefaultImportance('Did thing', 'Contains CRITICAL info', 'action')).toBe(8);
  });
});
