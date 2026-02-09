/**
 * Tests for LocalEmbeddingProvider (Phase 3)
 *
 * Tests the provider structure and error handling.
 * Full embedding tests require @xenova/transformers to be installed.
 */

import { describe, it, expect } from 'vitest';
import { LocalEmbeddingProvider } from '../../src/index.js';

describe('LocalEmbeddingProvider', () => {
  describe('construction', () => {
    it('creates provider with default model', () => {
      const provider = new LocalEmbeddingProvider();

      expect(provider.name).toBe('local-all-MiniLM-L6-v2');
      expect(provider.dimensions).toBe(384);
    });

    it('accepts custom model', () => {
      const provider = new LocalEmbeddingProvider({
        model: 'Xenova/all-MiniLM-L12-v2',
      });

      expect(provider.name).toBe('local-all-MiniLM-L12-v2');
      expect(provider.dimensions).toBe(384);
    });

    it('throws on unknown model', () => {
      expect(() => {
        new LocalEmbeddingProvider({
          model: 'unknown/model',
        });
      }).toThrow('Unknown model');
    });
  });

  describe('cache', () => {
    it('provides cache stats', () => {
      const provider = new LocalEmbeddingProvider();

      const stats = provider.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(1000);
    });

    it('clears cache', () => {
      const provider = new LocalEmbeddingProvider();
      provider.clearCache();

      const stats = provider.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('isReady', () => {
    it('returns false before initialization (no transformers installed)', async () => {
      const provider = new LocalEmbeddingProvider();

      // This will throw because @xenova/transformers isn't installed in test environment
      // but we're testing the error handling path
      await expect(provider.isReady()).rejects.toThrow();
    });
  });

  describe('embed (without transformers)', () => {
    it('throws helpful error when transformers not installed', async () => {
      const provider = new LocalEmbeddingProvider();

      await expect(provider.embed('test text')).rejects.toThrow(
        /Failed to load embedding model.*@xenova\/transformers/
      );
    });
  });
});

/**
 * Integration tests (run only when @xenova/transformers is installed)
 *
 * These tests are skipped by default because the model download takes time.
 * To run: TRANSFORMERS_AVAILABLE=1 npm test
 */
describe.skipIf(!process.env['TRANSFORMERS_AVAILABLE'])('LocalEmbeddingProvider (integration)', () => {
  it('embeds text to 384 dimensions', async () => {
    const { createLocalEmbeddingProvider } = await import('../../src/index.js');
    const provider = await createLocalEmbeddingProvider({ verbose: true });

    const embedding = await provider.embed('Hello, world!');

    expect(embedding).toHaveLength(384);
    expect(embedding.every((n) => typeof n === 'number')).toBe(true);
  });

  it('batch embeds multiple texts', async () => {
    const { createLocalEmbeddingProvider } = await import('../../src/index.js');
    const provider = await createLocalEmbeddingProvider();

    const embeddings = await provider.embedBatch(['Hello', 'World', 'Test']);

    expect(embeddings).toHaveLength(3);
    expect(embeddings[0]).toHaveLength(384);
    expect(embeddings[1]).toHaveLength(384);
    expect(embeddings[2]).toHaveLength(384);
  });

  it('produces similar embeddings for similar texts', async () => {
    const { createLocalEmbeddingProvider, cosineSimilarity } = await import('../../src/index.js');
    const provider = await createLocalEmbeddingProvider();

    const emb1 = await provider.embed('The cat sat on the mat');
    const emb2 = await provider.embed('A cat was sitting on a rug');
    const emb3 = await provider.embed('The stock market crashed yesterday');

    const simSimilar = cosineSimilarity(emb1, emb2);
    const simDifferent = cosineSimilarity(emb1, emb3);

    // Similar texts should have higher similarity
    expect(simSimilar).toBeGreaterThan(simDifferent);
    expect(simSimilar).toBeGreaterThan(0.5);
  });

  it('caches embeddings for repeat queries', async () => {
    const { createLocalEmbeddingProvider } = await import('../../src/index.js');
    const provider = await createLocalEmbeddingProvider({ cacheSize: 100 });

    // First call
    const start1 = Date.now();
    await provider.embed('Test caching');
    const time1 = Date.now() - start1;

    // Second call (should be cached)
    const start2 = Date.now();
    await provider.embed('Test caching');
    const time2 = Date.now() - start2;

    // Cached call should be much faster
    expect(time2).toBeLessThan(time1 / 2);

    const stats = provider.getCacheStats();
    expect(stats.size).toBe(1);
  });
});
