/**
 * Tests for SemanticMemoryStream (Phase 3)
 *
 * Tests semantic search, auto-embedding, and reindexing.
 * Uses TfIdfEmbeddingProvider for testing (no external dependencies).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  SemanticMemoryStream,
  createSemanticMemoryStream,
  TfIdfEmbeddingProvider,
} from '../../src/index.js';

// ─── Test Helpers ────────────────────────────────────────────────────────────

function createTestDir(): string {
  const dir = join(tmpdir(), `ada-semantic-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, 'agents', 'memory'), { recursive: true });
  mkdirSync(join(dir, 'agents', 'state'), { recursive: true });
  return dir;
}

function cleanupTestDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Create a TF-IDF provider with pre-built vocabulary for testing.
 */
function createTestProvider(): TfIdfEmbeddingProvider {
  const provider = new TfIdfEmbeddingProvider(128);

  // Build vocabulary from sample documents
  provider.buildVocabulary([
    'cognitive memory architecture semantic search',
    'embedding provider vector store',
    'recency importance relevance scoring',
    'dispatch cycle agent role',
    'issue PR merge commit',
    'test coverage quality assurance',
    'frontend backend API design',
    'performance optimization caching',
  ]);

  return provider;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SemanticMemoryStream', () => {
  let testDir: string;
  let provider: TfIdfEmbeddingProvider;

  beforeEach(() => {
    testDir = createTestDir();
    provider = createTestProvider();
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  describe('construction and loading', () => {
    it('creates empty stream and index', () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const stream = new SemanticMemoryStream(streamPath, provider, join(testDir, 'agents'));
      stream.load();

      expect(stream.count()).toBe(0);

      const status = stream.getIndexStatus();
      expect(status.streamCount).toBe(0);
      expect(status.indexCount).toBe(0);
      expect(status.inSync).toBe(true);
    });

    it('factory function creates loaded stream', () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const stream = createSemanticMemoryStream(
        streamPath,
        provider,
        join(testDir, 'agents')
      );

      expect(stream.count()).toBe(0);
    });
  });

  describe('memoryLog with auto-embedding', () => {
    it('logs entry and creates embedding', async () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const stream = createSemanticMemoryStream(
        streamPath,
        provider,
        join(testDir, 'agents')
      );

      const entry = await stream.memoryLog({
        cycle: 219,
        role: 'frontier',
        action: 'Implemented semantic search',
        content: 'Added embedding provider and vector store integration',
        importance: 8,
        type: 'action',
        tags: ['memory', 'search'],
      });

      expect(entry.id).toBeDefined();
      expect(entry.cycle).toBe(219);
      expect(entry.role).toBe('frontier');
      expect(entry.importance).toBe(8);

      // Check index was updated
      const status = stream.getIndexStatus();
      expect(status.streamCount).toBe(1);
      expect(status.indexCount).toBe(1);
      expect(status.inSync).toBe(true);
    });

    it('persists index to disk', async () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const agentsDir = join(testDir, 'agents');
      const stream = createSemanticMemoryStream(streamPath, provider, agentsDir);

      await stream.memoryLog({
        cycle: 1,
        role: 'test',
        action: 'Test entry',
        content: 'Content for testing',
        importance: 5,
      });

      // Force save
      await stream.flush();

      // Check file exists
      const indexPath = join(agentsDir, 'state', 'vectors.json');
      expect(existsSync(indexPath)).toBe(true);

      // Check file content
      const content = JSON.parse(readFileSync(indexPath, 'utf-8'));
      expect(content.version).toBe(1);
      expect(content.entryCount).toBe(1);
      expect(Object.keys(content.vectors)).toHaveLength(1);
    });
  });

  describe('recallSemantic', () => {
    it('finds similar entries by semantic query', async () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const stream = createSemanticMemoryStream(
        streamPath,
        provider,
        join(testDir, 'agents')
      );

      // Log diverse entries
      await stream.memoryLog({
        cycle: 1,
        role: 'research',
        action: 'Researched embedding models',
        content: 'Evaluated vector embedding approaches for semantic memory',
        importance: 7,
        tags: ['research', 'embedding'],
      });

      await stream.memoryLog({
        cycle: 2,
        role: 'engineering',
        action: 'Implemented API endpoints',
        content: 'Built REST API for frontend backend integration',
        importance: 6,
        tags: ['api', 'code'],
      });

      await stream.memoryLog({
        cycle: 3,
        role: 'qa',
        action: 'Added test coverage',
        content: 'Wrote unit tests for quality assurance',
        importance: 5,
        tags: ['test', 'quality'],
      });

      await stream.memoryLog({
        cycle: 4,
        role: 'frontier',
        action: 'Implemented semantic search',
        content: 'Added vector store with embedding provider',
        importance: 9,
        tags: ['memory', 'search', 'embedding'],
      });

      // Search for memory-related entries
      const results = await stream.recallSemantic('embedding vector memory', { k: 3 });

      expect(results.length).toBeGreaterThan(0);

      // Should find embedding/memory related entries first
      const topRoles = results.map((r) => r.entry.role);

      // frontier and research entries should be most relevant
      expect(topRoles).toContain('frontier');
    });

    it('respects minScore filter', async () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const stream = createSemanticMemoryStream(
        streamPath,
        provider,
        join(testDir, 'agents')
      );

      await stream.memoryLog({
        cycle: 1,
        role: 'test',
        action: 'Something completely unrelated',
        content: 'This is about cooking recipes',
        importance: 5,
      });

      // Search with high threshold
      const results = await stream.recallSemantic('cognitive memory architecture', {
        minScore: 0.9,
      });

      // Should find nothing with high threshold
      expect(results.length).toBe(0);
    });

    it('applies filter by role', async () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const stream = createSemanticMemoryStream(
        streamPath,
        provider,
        join(testDir, 'agents')
      );

      await stream.memoryLog({
        cycle: 1,
        role: 'research',
        action: 'Research on embeddings',
        content: 'Embedding research content',
        importance: 7,
      });

      await stream.memoryLog({
        cycle: 2,
        role: 'engineering',
        action: 'Implemented embeddings',
        content: 'Embedding implementation code',
        importance: 7,
      });

      // Filter by research only
      const results = await stream.recallSemantic('embedding', {
        filter: { roles: ['research'] },
      });

      expect(results.length).toBe(1);
      expect(results[0]?.entry.role).toBe('research');
    });

    it('applies recency decay', async () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const stream = createSemanticMemoryStream(
        streamPath,
        provider,
        join(testDir, 'agents')
      );

      // Old entry
      await stream.memoryLog({
        cycle: 1,
        role: 'test',
        action: 'Old memory entry',
        content: 'Memory semantic search implementation',
        importance: 5,
      });

      // New entry with same content
      await stream.memoryLog({
        cycle: 100,
        role: 'test',
        action: 'New memory entry',
        content: 'Memory semantic search implementation',
        importance: 5,
      });

      // With recency decay, newer should rank higher
      const results = await stream.recallSemantic('memory search', {
        useRecencyDecay: true,
        k: 2,
      });

      expect(results.length).toBe(2);
      // Newer entry (cycle 100) should have higher score
      expect(results[0]?.entry.cycle).toBe(100);
    });

    it('returns score components for debugging', async () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const stream = createSemanticMemoryStream(
        streamPath,
        provider,
        join(testDir, 'agents')
      );

      await stream.memoryLog({
        cycle: 50,
        role: 'test',
        action: 'Memory entry',
        content: 'Semantic search test',
        importance: 8,
      });

      const results = await stream.recallSemantic('memory search');

      expect(results.length).toBe(1);
      const result = results[0];
      expect(result).toBeDefined();
      expect(result?.components.similarity).toBeGreaterThan(0);
      expect(result?.components.recency).toBeGreaterThan(0);
      expect(result?.components.importance).toBe(0.8); // 8/10
    });
  });

  describe('reindex', () => {
    it('rebuilds index from stream', async () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const agentsDir = join(testDir, 'agents');

      // Create stream and add entries
      const stream1 = createSemanticMemoryStream(streamPath, provider, agentsDir);

      await stream1.memoryLog({
        cycle: 1,
        role: 'test',
        action: 'Entry one',
        content: 'First entry content',
        importance: 5,
      });

      await stream1.memoryLog({
        cycle: 2,
        role: 'test',
        action: 'Entry two',
        content: 'Second entry content',
        importance: 6,
      });

      await stream1.flush();

      // Create new stream instance (simulates restart)
      const stream2 = new SemanticMemoryStream(streamPath, provider, agentsDir);

      // Don't load — start fresh and reindex
      const reindexed = await stream2.reindex();

      expect(reindexed).toBe(2);

      const status = stream2.getIndexStatus();
      expect(status.inSync).toBe(true);
      expect(status.indexCount).toBe(2);
    });

    it('reports progress during reindex', async () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const agentsDir = join(testDir, 'agents');
      const stream = createSemanticMemoryStream(streamPath, provider, agentsDir);

      // Add entries
      for (let i = 0; i < 5; i++) {
        await stream.memoryLog({
          cycle: i + 1,
          role: 'test',
          action: `Entry ${i + 1}`,
          content: `Content for entry ${i + 1}`,
          importance: 5,
        });
      }

      // Track progress
      const progress: Array<[number, number]> = [];
      await stream.reindex((current, total) => {
        progress.push([current, total]);
      });

      expect(progress.length).toBe(5);
      expect(progress[0]).toEqual([1, 5]);
      expect(progress[4]).toEqual([5, 5]);
    });
  });

  describe('passthrough methods', () => {
    it('recallByCycle works', async () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const stream = createSemanticMemoryStream(
        streamPath,
        provider,
        join(testDir, 'agents')
      );

      await stream.memoryLog({
        cycle: 10,
        role: 'test',
        action: 'Cycle 10 entry',
        content: 'Content',
        importance: 5,
      });

      await stream.memoryLog({
        cycle: 20,
        role: 'test',
        action: 'Cycle 20 entry',
        content: 'Content',
        importance: 5,
      });

      const results = stream.recallByCycle(15, 25);
      expect(results.length).toBe(1);
      expect(results[0]?.cycle).toBe(20);
    });

    it('getStats works', async () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const stream = createSemanticMemoryStream(
        streamPath,
        provider,
        join(testDir, 'agents')
      );

      await stream.memoryLog({
        cycle: 5,
        role: 'frontier',
        action: 'Test action',
        content: 'Test content',
        importance: 7,
      });

      const stats = stream.getStats();
      expect(stats.entryCount).toBe(1);
      expect(stats.newestCycle).toBe(5);
      expect(stats.byRole['frontier']).toBe(1);
    });
  });

  describe('getSemanticStats', () => {
    it('returns provider and index info', async () => {
      const streamPath = join(testDir, 'agents', 'memory', 'stream.jsonl');
      const stream = createSemanticMemoryStream(
        streamPath,
        provider,
        join(testDir, 'agents')
      );

      await stream.memoryLog({
        cycle: 1,
        role: 'test',
        action: 'Test',
        content: 'Content',
        importance: 5,
      });

      const stats = stream.getSemanticStats();

      expect(stats.provider).toBe('tfidf');
      expect(stats.dimensions).toBe(128);
      expect(stats.indexedEntries).toBe(1);
      expect(stats.lastModified).toBeDefined();
    });
  });
});
