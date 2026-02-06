/**
 * Tests for MemoryLifecycleManager — Phase 3.2 Tier Management
 *
 * @see Issue #17 — feat(core): sophisticated memory retrieval with embeddings
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MemoryLifecycleManager, createLifecycleManager } from '../src/lifecycle.js';
import { JsonVectorStore } from '../src/json-vector-store.js';
import { ImportanceTracker } from '../src/importance.js';
import type { EmbeddingProvider, Embedding } from '../src/embedding.js';

// ─── Mock Embedding Provider ─────────────────────────────────────────────────

class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'mock';
  readonly dimensions = 4;

  embed(text: string): Promise<Embedding> {
    return Promise.resolve(this.hashToVector(text));
  }

  embedBatch(texts: readonly string[]): Promise<readonly Embedding[]> {
    return Promise.resolve(texts.map((t) => this.hashToVector(t)));
  }

  private hashToVector(text: string): number[] {
    const vec = new Array(this.dimensions).fill(0);
    for (let i = 0; i < text.length; i++) {
      vec[i % this.dimensions] += text.charCodeAt(i) / 1000;
    }
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return vec.map((v) => (norm > 0 ? v / norm : 0));
  }
}

// ─── Test Fixtures ───────────────────────────────────────────────────────────

// Note: The extractor looks for "## Lessons Learned" and "## Role State" sections
const SAMPLE_BANK_MD = `# 🧠 Memory Bank

> The shared brain of the ADA autonomous development team.
> **Last updated:** 2026-02-06 12:00:00 EST | **Cycle:** 100 | **Version:** 5

---

## Architecture Decisions

| ID | Decision | Date | Author |
|---|---|---|---|
| ADR-001 | Use TypeScript for all packages | 2026-02-01 | engineering |
| ADR-002 | npm workspaces monorepo | 2026-02-02 | ops |

---

## Role State

### 👔 CEO — The CEO

- **Last:** Strategic review completed
- **Next:** Go/No-Go decision

### ⚙️ Engineering — The Engineering

- **Last:** Implemented memory system
- **Working on:** Vector store integration

---

## Lessons Learned

1. **Test early** — Catching bugs early saves time
2. **Document decisions** — ADRs prevent revisiting old debates

---

### Blockers

- None 🎉

---

## Project Metrics

- **Issues:** 50 total
- **Tests:** 300 passing
`;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MemoryLifecycleManager', () => {
  let testDir: string;
  let provider: MockEmbeddingProvider;
  let vectorStore: JsonVectorStore;
  let importanceTracker: ImportanceTracker;
  let manager: MemoryLifecycleManager;

  beforeEach(async () => {
    // Create unique temp directory
    testDir = join(tmpdir(), `lifecycle-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(join(testDir, 'memory'), { recursive: true });
    await mkdir(join(testDir, 'state'), { recursive: true });

    // Write sample bank.md
    await writeFile(join(testDir, 'memory', 'bank.md'), SAMPLE_BANK_MD);

    // Initialize components
    provider = new MockEmbeddingProvider();
    vectorStore = new JsonVectorStore(testDir, provider.name, provider.dimensions);
    await vectorStore.load();
    importanceTracker = new ImportanceTracker(testDir);
    await importanceTracker.load();

    manager = new MemoryLifecycleManager(provider, vectorStore, importanceTracker, {
      agentsDir: testDir,
      autoSave: false, // Manual save for tests
    });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should load entries from bank.md on initialize', async () => {
      await manager.initialize();

      const hotEntries = manager.getHotEntries();
      expect(hotEntries.length).toBeGreaterThan(0);

      // Should have extracted decisions, lessons, role states
      const ids = hotEntries.map((e) => e.id);
      expect(ids).toContain('decision-ADR-001');
      expect(ids).toContain('decision-ADR-002');
      expect(ids).toContain('lesson-1');
      expect(ids).toContain('lesson-2');
    });

    it('should index all hot entries in vector store', async () => {
      await manager.initialize();

      const hotCount = manager.getHotEntries().length;
      const vectorCount = await vectorStore.count();

      expect(vectorCount).toBe(hotCount);
    });

    it('should mark all initial entries as hot tier', async () => {
      await manager.initialize();

      const hotIds = vectorStore.getEntriesByTier('hot');
      const warmIds = vectorStore.getEntriesByTier('warm');
      const coldIds = vectorStore.getEntriesByTier('cold');

      expect(hotIds.length).toBeGreaterThan(0);
      expect(warmIds.length).toBe(0);
      expect(coldIds.length).toBe(0);
    });
  });

  describe('lifecycle cycles', () => {
    it('should run a lifecycle cycle without errors', async () => {
      await manager.initialize();

      const result = await manager.runLifecycleCycle(100);

      expect(result.cycle).toBe(100);
      expect(result.errors).toEqual([]);
      expect(result.timestamp).toBeDefined();
    });

    it('should detect newly added entries on subsequent cycles', async () => {
      await manager.initialize();

      // Add a new architecture decision to bank.md (which the extractor reliably finds)
      const updatedBank = `# 🧠 Memory Bank

> Updated bank with new decision
> **Last updated:** 2026-02-06 12:00:00 EST | **Cycle:** 101 | **Version:** 5

---

## Architecture Decisions

| ID | Decision | Date | Author |
|---|---|---|---|
| ADR-001 | Use TypeScript for all packages | 2026-02-01 | engineering |
| ADR-002 | npm workspaces monorepo | 2026-02-02 | ops |
| ADR-003 | JSON for vector persistence | 2026-02-06 | frontier |

---
`;
      await writeFile(join(testDir, 'memory', 'bank.md'), updatedBank);

      const result = await manager.runLifecycleCycle(101);

      // Should detect the new ADR-003 decision entry
      // The bank now has only 3 decision entries vs the original entries
      expect(result.newlyIndexed.some((id) => id.includes('ADR-003'))).toBe(true);
    });
  });

  describe('tier transitions', () => {
    it('should demote hot entries to warm after inactivity', async () => {
      // Use custom config with shorter demotion threshold for testing
      const customImportanceTracker = new ImportanceTracker(testDir, {
        hotDemotionCycles: 3, // Demote after just 3 cycles
        warmDemotionCycles: 5,
        coldForgetCycles: 10,
      });
      await customImportanceTracker.load();

      const customManager = new MemoryLifecycleManager(
        provider,
        vectorStore,
        customImportanceTracker,
        { agentsDir: testDir, autoSave: false }
      );
      await customManager.initialize();

      // Initial state: all entries should be hot
      expect(vectorStore.getEntriesByTier('hot').length).toBeGreaterThan(0);
      expect(vectorStore.getEntriesByTier('warm').length).toBe(0);

      // Run 5 cycles without accessing entries (3 for demotion + buffer)
      for (let cycle = 100; cycle < 105; cycle++) {
        await customManager.runLifecycleCycle(cycle);
      }

      // Some entries should have been demoted to warm
      const warmIds = vectorStore.getEntriesByTier('warm');
      expect(warmIds.length).toBeGreaterThan(0);
    });

    it('should track lifecycle transitions in result', async () => {
      // Use custom config with shorter thresholds
      const customImportanceTracker = new ImportanceTracker(testDir, {
        hotDemotionCycles: 2,
        warmDemotionCycles: 3,
        coldForgetCycles: 5,
      });
      await customImportanceTracker.load();

      const customManager = new MemoryLifecycleManager(
        provider,
        vectorStore,
        customImportanceTracker,
        { agentsDir: testDir, autoSave: false }
      );
      await customManager.initialize();

      // Run multiple cycles
      let totalDemoted = 0;
      for (let cycle = 100; cycle < 110; cycle++) {
        const result = await customManager.runLifecycleCycle(cycle);
        totalDemoted += result.demotedToWarm.length + result.demotedToCold.length;
        expect(result.errors).toEqual([]);
      }

      // Should have had some transitions
      expect(totalDemoted).toBeGreaterThan(0);
    });
  });

  describe('search', () => {
    it('should search across specified tiers', async () => {
      await manager.initialize();

      // Search for something that exists in the bank
      const results = await manager.search('TypeScript', 5, ['hot', 'warm']);

      // Should return results (mock embedding doesn't do semantic search,
      // so we just verify the search mechanism works)
      expect(results.length).toBeGreaterThan(0);

      // Verify results have the expected structure
      for (const result of results) {
        expect(result.entry.id).toBeDefined();
        expect(result.entry.content).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.tier).toBeDefined();
      }
    });

    it('should include tier information in results', async () => {
      await manager.initialize();

      const results = await manager.search('TypeScript', 5);

      for (const result of results) {
        expect(['hot', 'warm', 'cold']).toContain(result.tier);
      }
    });

    it('should respect minimum score threshold', async () => {
      // Create manager with high min score
      const strictManager = new MemoryLifecycleManager(provider, vectorStore, importanceTracker, {
        agentsDir: testDir,
        autoSave: false,
        minSearchScore: 0.9, // Very high threshold
      });
      await strictManager.initialize();

      const results = await strictManager.search('completely unrelated query xyz', 5);

      // Should filter out low-scoring results
      for (const result of results) {
        expect(result.score).toBeGreaterThanOrEqual(0.9);
      }
    });
  });

  describe('stats', () => {
    it('should return accurate statistics', async () => {
      await manager.initialize();

      const stats = manager.getStats();

      expect(stats.hot).toBeGreaterThan(0);
      expect(stats.total).toBe(stats.hot + stats.warm + stats.cold);
      expect(stats.importanceTracked).toBeGreaterThanOrEqual(0);
    });
  });

  describe('reindex', () => {
    it('should reindex all entries from bank.md', async () => {
      await manager.initialize();
      const initialCount = await vectorStore.count();

      // Reindex
      const reindexedCount = await manager.reindex(150);

      expect(reindexedCount).toBe(initialCount);
      expect(await vectorStore.count()).toBe(reindexedCount);
    });

    it('should reset all entries to hot tier on reindex', async () => {
      await manager.initialize();

      // Demote some entries first
      const ids = (await vectorStore.listIds()).slice(0, 2);
      vectorStore.setTier(ids, 'warm');
      expect(vectorStore.getEntriesByTier('warm').length).toBe(2);

      // Reindex
      await manager.reindex(150);

      // All should be hot again
      expect(vectorStore.getEntriesByTier('warm').length).toBe(0);
      expect(vectorStore.getEntriesByTier('hot').length).toBeGreaterThan(0);
    });
  });

  describe('persistence', () => {
    it('should save state on manual save call', async () => {
      await manager.initialize();

      // Verify entries are in the vector store
      const initialCount = await vectorStore.count();
      expect(initialCount).toBeGreaterThan(0);

      // Run a lifecycle cycle (this registers entries with importance tracker)
      await manager.runLifecycleCycle(100);

      // Verify importance tracker has entries
      expect(importanceTracker.count).toBeGreaterThan(0);

      // Manual save
      await manager.save();

      // Create new instances and load
      const newVectorStore = new JsonVectorStore(testDir, provider.name, provider.dimensions);
      await newVectorStore.load();

      const newImportanceTracker = new ImportanceTracker(testDir);
      await newImportanceTracker.load();

      // Both should have persisted data
      expect(await newVectorStore.count()).toBe(initialCount);
      expect(newImportanceTracker.count).toBeGreaterThan(0);
    });
  });

  describe('factory function', () => {
    it('should create and initialize manager via factory', async () => {
      const factoryManager = await createLifecycleManager(
        provider,
        vectorStore,
        importanceTracker,
        { agentsDir: testDir, autoSave: false }
      );

      // Should be initialized
      expect(factoryManager.getHotEntries().length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle missing bank.md gracefully', async () => {
      // Delete bank.md
      await rm(join(testDir, 'memory', 'bank.md'));

      // Should not throw
      await manager.initialize();
      expect(manager.getHotEntries()).toEqual([]);
    });

    it('should handle empty bank.md', async () => {
      await writeFile(join(testDir, 'memory', 'bank.md'), '# Empty Bank\n');

      await manager.initialize();
      // No entries, but no error
      expect(manager.getHotEntries()).toEqual([]);
    });
  });
});
