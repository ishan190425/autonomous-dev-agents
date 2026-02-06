/**
 * Tests for the embedding-based memory retrieval system.
 *
 * @see packages/core/src/embedding.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  cosineSimilarity,
  normalizeVector,
  extractMemoryEntries,
  InMemoryVectorStore,
  TfIdfEmbeddingProvider,
  SemanticMemoryManager,
  type EmbeddedEntry,
} from '../../src/embedding.js';

// ─── Vector Math ─────────────────────────────────────────────────────────────

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it('throws on dimension mismatch', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
      'dimension mismatch'
    );
  });

  it('returns 0 for zero vectors', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it('computes correctly for non-trivial vectors', () => {
    // cos([1,2,3], [4,5,6]) = 32 / (sqrt(14) * sqrt(77)) ≈ 0.9746
    const score = cosineSimilarity([1, 2, 3], [4, 5, 6]);
    expect(score).toBeCloseTo(0.9746, 3);
  });
});

describe('normalizeVector', () => {
  it('normalizes to unit length', () => {
    const result = normalizeVector([3, 4]);
    expect(result[0]).toBeCloseTo(0.6, 5);
    expect(result[1]).toBeCloseTo(0.8, 5);
  });

  it('handles zero vector', () => {
    const result = normalizeVector([0, 0, 0]);
    expect(result).toEqual([0, 0, 0]);
  });

  it('produces unit vector', () => {
    const result = normalizeVector([1, 2, 3, 4]);
    const norm = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });
});

// ─── Memory Entry Extraction ─────────────────────────────────────────────────

describe('extractMemoryEntries', () => {
  const sampleBank = `# 🧠 Memory Bank

> **Last updated:** 2026-02-03 | **Cycle:** 29 | **Version:** 2

---

## Current Status

### Completed ✅

- **LLM orchestration architecture decision (Issue #1) — ✅ RESOLVED**
- **CLI command structure (Issue #5) — ✅ RESOLVED**
- **ada run LLM integration (Issue #6) — ✅ COMPLETED**

### In Progress

- **Issue #15: Agent testing patterns research** — Research role investigating validation strategies
- **Template system design** — Design exploring template validation UX

### Blockers

- (none)

### Open Questions

- ~~Q1: Should ada run call an LLM directly?~~ **✅ RESOLVED:** Hybrid architecture
- Q2: What's the right default template? (Product → Design)

---

## Architecture Decisions

| ID | Decision | Date | Author |
| -- | -------- | ---- | ------ |
| ADR-001 | npm workspaces monorepo | Init | Builder |
| ADR-002 | Commander.js for CLI | Init | Builder |
| BIZ-001 | Freemium model (CLI open-source → SaaS) | 2026-01-30 | Founder |

---

## Role State

### 👔 CEO — The Founder

- **Last:** ✅ DELIVERED CLI Launch Readiness Assessment
- **Next:** Coordinate launch timeline

### 🔬 Research — The Scout

- **Last:** ✅ CREATED Issue #15 — Research on agent testing patterns
- **Next:** Execute research deliverables

---

## Lessons Learned

1. **Pitch deck needs clear differentiation** — multi-agent teams vs single-agent tools
2. **Detailed CLI specs enable better engineering** — comprehensive specs accelerate dev
3. **Sprint organization reveals critical dependencies** — map packages early

---
`;

  it('extracts architecture decisions', () => {
    const entries = extractMemoryEntries(sampleBank);
    const decisions = entries.filter((e) => e.kind === 'decision');

    expect(decisions.length).toBe(3);
    expect(decisions[0]).toBeDefined();
    expect(decisions[0]?.id).toBe('decision-ADR-001');
    expect(decisions[0]?.content).toContain('npm workspaces monorepo');
    expect(decisions[0]?.role).toBe('Builder');
  });

  it('extracts lessons learned', () => {
    const entries = extractMemoryEntries(sampleBank);
    const lessons = entries.filter((e) => e.kind === 'lesson');

    expect(lessons.length).toBe(3);
    expect(lessons[0]?.content).toContain('Pitch deck');
    expect(lessons[0]?.tags).toContain('lesson');
  });

  it('extracts role state entries', () => {
    const entries = extractMemoryEntries(sampleBank);
    const roleStates = entries.filter((e) => e.kind === 'role_state');

    expect(roleStates.length).toBeGreaterThanOrEqual(2);
    const founder = roleStates.find((e) => e.role === 'founder');
    expect(founder).toBeDefined();
    expect(founder?.content).toContain('Launch Readiness');
  });

  it('extracts completed items', () => {
    const entries = extractMemoryEntries(sampleBank);
    const completed = entries.filter(
      (e) => e.kind === 'status' && e.tags.includes('completed')
    );

    expect(completed.length).toBe(3);
    expect(completed[0]?.content).toContain('LLM orchestration');
  });

  it('extracts in-progress items', () => {
    const entries = extractMemoryEntries(sampleBank);
    const inProgress = entries.filter(
      (e) => e.kind === 'status' && e.tags.includes('in-progress')
    );

    expect(inProgress.length).toBe(2);
  });

  it('extracts open questions', () => {
    const entries = extractMemoryEntries(sampleBank);
    const questions = entries.filter((e) => e.kind === 'question');

    expect(questions.length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty content gracefully', () => {
    const entries = extractMemoryEntries('');
    expect(entries).toEqual([]);
  });

  it('handles malformed content gracefully', () => {
    const entries = extractMemoryEntries('# Just a title\nSome random text.');
    expect(entries).toEqual([]);
  });

  // ─── P0/P1 Parser Fixes (Issue #50) ─────────────────────────────────────────

  describe('P0: Blocker parsing — filters "None" patterns', () => {
    it('returns no blockers when section says "None 🎉"', () => {
      const bank = `# Memory Bank

### Blockers

- None 🎉

---
`;
      const entries = extractMemoryEntries(bank);
      const blockers = entries.filter((e) => e.kind === 'blocker');
      expect(blockers.length).toBe(0);
    });

    it('returns no blockers when section says "(none)"', () => {
      const bank = `# Memory Bank

### Blockers

- (none)

---
`;
      const entries = extractMemoryEntries(bank);
      const blockers = entries.filter((e) => e.kind === 'blocker');
      expect(blockers.length).toBe(0);
    });

    it('returns no blockers when section says "N/A"', () => {
      const bank = `# Memory Bank

### Blockers

- N/A

---
`;
      const entries = extractMemoryEntries(bank);
      const blockers = entries.filter((e) => e.kind === 'blocker');
      expect(blockers.length).toBe(0);
    });

    it('returns no blockers for dashes only', () => {
      const bank = `# Memory Bank

### Blockers

- --

---
`;
      const entries = extractMemoryEntries(bank);
      const blockers = entries.filter((e) => e.kind === 'blocker');
      expect(blockers.length).toBe(0);
    });

    it('extracts real blockers correctly', () => {
      const bank = `# Memory Bank

### Blockers

- CI pipeline failing on lint step
- Waiting for API key from vendor

---
`;
      const entries = extractMemoryEntries(bank);
      const blockers = entries.filter((e) => e.kind === 'blocker');
      expect(blockers.length).toBe(2);
      expect(blockers[0]?.content).toContain('CI pipeline');
      expect(blockers[1]?.content).toContain('API key');
    });
  });

  describe('P1: Decision extraction — section-aware parsing', () => {
    it('only extracts decisions from Architecture Decisions section', () => {
      const bank = `# Memory Bank

## Backlog Priority

| Priority | Issue | Title | Status |
| -------- | ----- | ----- | ------ |
| P0 | #1 | Critical bug | Open |
| P1 | #2 | Feature request | In Progress |

## Architecture Decisions

| ID | Decision | Date | Author |
| -- | -------- | ---- | ------ |
| ADR-001 | Use TypeScript | 2026-01-01 | Builder |

---
`;
      const entries = extractMemoryEntries(bank);
      const decisions = entries.filter((e) => e.kind === 'decision');

      // Should only have ADR-001, not the backlog rows
      expect(decisions.length).toBe(1);
      expect(decisions[0]?.id).toBe('decision-ADR-001');
      expect(decisions[0]?.content).toContain('TypeScript');
    });

    it('does not parse priority tables as decisions', () => {
      const bank = `# Memory Bank

## Backlog Priority

| Priority | Issue | Title | Status |
| -------- | ----- | ----- | ------ |
| P0 | #10 | Fix login | Done |
| P1 | #15 | Add search | Open |
| P2 | #20 | Polish UI | Backlog |

---
`;
      const entries = extractMemoryEntries(bank);
      const decisions = entries.filter((e) => e.kind === 'decision');

      // No Architecture Decisions section = no decisions
      expect(decisions.length).toBe(0);
    });
  });

  describe('P1: Role state extraction — emoji headings', () => {
    it('extracts roles from emoji headings like "### 👔 CEO"', () => {
      const bank = `# Memory Bank

## Role State

### 👔 CEO

- **Last:** Reviewed launch plan
- **Next:** Investor meeting

### 🔬 Research

- **Last:** Completed benchmark
- **Next:** Write report

---
`;
      const entries = extractMemoryEntries(bank);
      const roleStates = entries.filter((e) => e.kind === 'role_state');

      expect(roleStates.length).toBe(2);
      expect(roleStates.find((e) => e.role === 'ceo')).toBeDefined();
      expect(roleStates.find((e) => e.role === 'research')).toBeDefined();
    });

    it('extracts roles from traditional "— The X" format', () => {
      const bank = `# Memory Bank

## Role State

### 👔 CEO — The Founder

- **Last:** Strategic review
- **Next:** Board meeting

---
`;
      const entries = extractMemoryEntries(bank);
      const roleStates = entries.filter((e) => e.kind === 'role_state');

      expect(roleStates.length).toBe(1);
      expect(roleStates[0]?.role).toBe('founder');
    });
  });
});

// ─── TF-IDF Embedding Provider ──────────────────────────────────────────────

describe('TfIdfEmbeddingProvider', () => {
  let provider: TfIdfEmbeddingProvider;

  const corpus = [
    'npm workspaces monorepo architecture',
    'CLI command structure and implementation',
    'LLM orchestration with Clawdbot integration',
    'Sprint planning and velocity tracking',
    'TypeScript strict mode and ESLint configuration',
    'Investor pitch deck and fundraising strategy',
  ];

  beforeEach(() => {
    provider = new TfIdfEmbeddingProvider(64);
    provider.buildVocabulary(corpus);
  });

  it('produces embeddings of correct dimension', async () => {
    const emb = await provider.embed('monorepo architecture');
    expect(emb.length).toBe(64);
  });

  it('produces normalized embeddings', async () => {
    const emb = await provider.embed('CLI implementation');
    const norm = Math.sqrt(
      emb.reduce((s, v) => s + v * v, 0)
    );
    // Either normalized to ~1 or zero vector
    expect(norm).toBeLessThanOrEqual(1.01);
  });

  it('similar texts have higher similarity', async () => {
    const embA = await provider.embed('monorepo architecture npm workspaces');
    const embB = await provider.embed('npm workspaces monorepo setup');
    const embC = await provider.embed('investor pitch deck fundraising');

    const simAB = cosineSimilarity(embA, embB);
    const simAC = cosineSimilarity(embA, embC);

    expect(simAB).toBeGreaterThan(simAC);
  });

  it('batch embedding matches individual', async () => {
    const texts = ['hello world', 'test query'];
    const batch = await provider.embedBatch(texts);
    const individual0 = await provider.embed(texts[0] ?? '');
    const individual1 = await provider.embed(texts[1] ?? '');

    expect(batch[0]).toEqual(individual0);
    expect(batch[1]).toEqual(individual1);
  });
});

// ─── In-Memory Vector Store ──────────────────────────────────────────────────

describe('InMemoryVectorStore', () => {
  let store: InMemoryVectorStore;

  const makeEntry = (
    id: string,
    content: string,
    embedding: number[]
  ): EmbeddedEntry => ({
    entry: { id, kind: 'status', content, tags: [] },
    embedding,
  });

  beforeEach(() => {
    store = new InMemoryVectorStore();
  });

  it('starts empty', async () => {
    expect(await store.count()).toBe(0);
    expect(await store.listIds()).toEqual([]);
  });

  it('upserts and retrieves entries', async () => {
    await store.upsert([
      makeEntry('a', 'hello', [1, 0, 0]),
      makeEntry('b', 'world', [0, 1, 0]),
    ]);

    expect(await store.count()).toBe(2);
    expect(await store.listIds()).toEqual(['a', 'b']);
  });

  it('updates existing entries on upsert', async () => {
    await store.upsert([makeEntry('a', 'old', [1, 0, 0])]);
    await store.upsert([makeEntry('a', 'new', [0, 1, 0])]);

    expect(await store.count()).toBe(1);
    const results = await store.search([0, 1, 0], 1);
    expect(results[0]?.entry.content).toBe('new');
  });

  it('searches by cosine similarity', async () => {
    await store.upsert([
      makeEntry('a', 'close', [0.9, 0.1, 0]),
      makeEntry('b', 'far', [0, 0, 1]),
      makeEntry('c', 'closest', [1, 0, 0]),
    ]);

    const results = await store.search([1, 0, 0], 2);
    expect(results.length).toBe(2);
    expect(results[0]?.entry.id).toBe('c'); // Most similar
    expect(results[1]?.entry.id).toBe('a');
  });

  it('removes entries by ID', async () => {
    await store.upsert([
      makeEntry('a', 'hello', [1, 0]),
      makeEntry('b', 'world', [0, 1]),
    ]);

    await store.remove(['a']);
    expect(await store.count()).toBe(1);
    expect(await store.listIds()).toEqual(['b']);
  });

  it('handles remove of non-existent ID', async () => {
    await store.remove(['nonexistent']);
    expect(await store.count()).toBe(0);
  });
});

// ─── Semantic Memory Manager ─────────────────────────────────────────────────

describe('SemanticMemoryManager', () => {
  let manager: SemanticMemoryManager;
  let provider: TfIdfEmbeddingProvider;
  let store: InMemoryVectorStore;

  const bankContent = `# 🧠 Memory Bank

## Architecture Decisions

| ID | Decision | Date | Author |
| -- | -------- | ---- | ------ |
| ADR-001 | npm workspaces monorepo for package management | Init | Builder |
| ADR-002 | Commander.js for CLI framework | Init | Builder |
| ADR-003 | Vitest for testing framework | Init | Builder |

## Lessons Learned

1. **Pitch deck needs clear differentiation** — multi-agent teams vs single-agent tools are fundamentally different products
2. **Detailed CLI specs enable better engineering** — comprehensive specifications with acceptance criteria accelerate development
3. **Pre-commit hooks prevent CI failures** — Husky and lint-staged catches issues before reaching CI pipeline

## Role State

### 👔 CEO — The Founder

- **Last:** ✅ DELIVERED CLI Launch Readiness Assessment
- **Next:** Coordinate launch timeline with Engineering

### ⚙️ Engineering — The Builder

- **Last:** ✅ MERGED PR #13 — completed ada run LLM integration
- **Next:** Real Clawdbot session spawning integration
`;

  beforeEach(() => {
    provider = new TfIdfEmbeddingProvider(128);
    store = new InMemoryVectorStore();
    manager = new SemanticMemoryManager(provider, store);
  });

  it('indexes a memory bank', async () => {
    const entries = extractMemoryEntries(bankContent);
    provider.buildVocabulary(entries.map((e) => e.content));

    const count = await manager.indexBank(bankContent);
    expect(count).toBeGreaterThan(0);
    expect(await manager.entryCount()).toBe(count);
  });

  it('queries for relevant entries', async () => {
    const entries = extractMemoryEntries(bankContent);
    provider.buildVocabulary(entries.map((e) => e.content));

    await manager.indexBank(bankContent);

    const results = await manager.query('CLI framework decision', 3);
    expect(results.length).toBeGreaterThan(0);
    // The Commander.js decision should rank high
    const hasCommanderResult = results.some((r) =>
      r.entry.content.toLowerCase().includes('commander')
    );
    expect(hasCommanderResult).toBe(true);
  });

  it('respects minimum score threshold', async () => {
    const entries = extractMemoryEntries(bankContent);
    provider.buildVocabulary(entries.map((e) => e.content));

    await manager.indexBank(bankContent);

    // Very high threshold should filter most results
    const results = await manager.query('something completely unrelated xyz', 10, 0.99);
    // With TF-IDF, unrelated queries should score low
    expect(results.length).toBeLessThan(10);
  });

  it('removes entries', async () => {
    const entries = extractMemoryEntries(bankContent);
    provider.buildVocabulary(entries.map((e) => e.content));

    await manager.indexBank(bankContent);
    const initialCount = await manager.entryCount();

    await manager.removeEntries(['decision-ADR-001']);
    expect(await manager.entryCount()).toBe(initialCount - 1);
  });
});
