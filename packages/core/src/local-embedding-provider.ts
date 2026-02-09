/**
 * @ada/core — Local Embedding Provider (Phase 3)
 *
 * Implements neural embedding using Transformers.js (@xenova/transformers).
 * Runs inference locally in Node.js without Python dependencies.
 *
 * Default model: all-MiniLM-L6-v2 (384 dimensions, ~23MB download)
 *
 * Features:
 * - First-run model download (cached for subsequent use)
 * - CPU inference (no GPU required)
 * - Batch embedding for efficiency
 * - Memory-efficient LRU cache for repeat queries
 *
 * @see docs/design/memory-stream-phase-3-semantic-search.md
 * @see Issue #95 — Cognitive Memory Phase 3
 * @packageDocumentation
 */

import type { EmbeddingProvider, Embedding } from './embedding.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Options for LocalEmbeddingProvider initialization
 */
export interface LocalEmbeddingProviderOptions {
  /** Model identifier (default: 'Xenova/all-MiniLM-L6-v2') */
  readonly model?: string;

  /** Maximum embeddings to cache in memory (default: 1000) */
  readonly cacheSize?: number;

  /** Whether to use quantized model (default: true, ~4x smaller) */
  readonly quantized?: boolean;

  /** Log progress during model download (default: false) */
  readonly verbose?: boolean;
}

/**
 * Model configuration
 */
interface ModelConfig {
  readonly name: string;
  readonly dimensions: number;
  readonly tokenLimit: number;
}

// ─── Model Registry ──────────────────────────────────────────────────────────

/**
 * Supported local embedding models
 */
const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'Xenova/all-MiniLM-L6-v2': {
    name: 'all-MiniLM-L6-v2',
    dimensions: 384,
    tokenLimit: 256,
  },
  'Xenova/all-MiniLM-L12-v2': {
    name: 'all-MiniLM-L12-v2',
    dimensions: 384,
    tokenLimit: 256,
  },
  'Xenova/paraphrase-MiniLM-L6-v2': {
    name: 'paraphrase-MiniLM-L6-v2',
    dimensions: 384,
    tokenLimit: 128,
  },
} as const;

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';

// ─── LRU Cache ───────────────────────────────────────────────────────────────

/**
 * Simple LRU cache for embeddings
 */
class LRUCache<T> {
  private cache = new Map<string, T>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// ─── Local Embedding Provider ────────────────────────────────────────────────

/**
 * Local embedding provider using Transformers.js
 *
 * Runs sentence embeddings locally using ONNX models.
 * No API keys required. First run downloads the model (~23MB).
 *
 * @example
 * ```ts
 * const provider = new LocalEmbeddingProvider();
 * await provider.isReady(); // Loads model
 *
 * const embedding = await provider.embed("Hello, world!");
 * console.log(embedding.length); // 384
 * ```
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;

  private pipeline: unknown | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly modelId: string;
  private readonly quantized: boolean;
  private readonly verbose: boolean;
  private readonly cache: LRUCache<Embedding>;

  constructor(options: LocalEmbeddingProviderOptions = {}) {
    this.modelId = options.model ?? DEFAULT_MODEL;
    this.quantized = options.quantized ?? true;
    this.verbose = options.verbose ?? false;

    const config = MODEL_REGISTRY[this.modelId];
    if (!config) {
      throw new Error(
        `Unknown model: ${this.modelId}. Supported: ${Object.keys(MODEL_REGISTRY).join(', ')}`
      );
    }

    this.name = `local-${config.name}`;
    this.dimensions = config.dimensions;
    this.cache = new LRUCache(options.cacheSize ?? 1000);
  }

  /**
   * Check if the model is ready (loaded).
   * Triggers initialization if not already started.
   */
  async isReady(): Promise<boolean> {
    if (this.pipeline) return true;

    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }

    await this.initPromise;
    return true;
  }

  /**
   * Initialize the embedding pipeline.
   * Downloads model on first run (cached for subsequent runs).
   */
  private async initialize(): Promise<void> {
    if (this.verbose) {
      console.warn(`[LocalEmbeddingProvider] Loading model: ${this.modelId}`);
    }

    try {
      // Dynamic import to avoid bundling issues
      const transformers = await import('@xenova/transformers');

      // Create feature extraction pipeline
      this.pipeline = await transformers.pipeline(
        'feature-extraction',
        this.modelId,
        { quantized: this.quantized }
      );

      if (this.verbose) {
        console.warn(`[LocalEmbeddingProvider] Model loaded: ${this.modelId}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load embedding model: ${message}. ` +
        'Install @xenova/transformers: npm install @xenova/transformers'
      );
    }
  }

  /**
   * Generate embedding for a single text.
   *
   * @param text - Text to embed
   * @returns 384-dimensional embedding vector
   */
  async embed(text: string): Promise<Embedding> {
    // Check cache first
    const cacheKey = this.getCacheKey(text);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    await this.isReady();

    if (!this.pipeline) {
      throw new Error('Embedding pipeline not initialized');
    }

    // Truncate text if too long (MiniLM handles ~256 tokens)
    const truncated = this.truncateText(text);

    // Run inference
    const output = await (this.pipeline as CallableFunction)(truncated, {
      pooling: 'mean',
      normalize: true,
    });

    // Extract embedding from output tensor
    const embedding = Array.from(output.data as Float32Array) as Embedding;

    // Cache the result
    this.cache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts (batch).
   *
   * @param texts - Array of texts to embed
   * @returns Array of embedding vectors
   */
  async embedBatch(texts: readonly string[]): Promise<readonly Embedding[]> {
    // Check cache for all texts
    const results: (Embedding | null)[] = texts.map((text) => {
      const cacheKey = this.getCacheKey(text);
      return this.cache.get(cacheKey) ?? null;
    });

    // Find texts that need embedding
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    for (let i = 0; i < texts.length; i++) {
      if (results[i] === null) {
        uncachedIndices.push(i);
        const text = texts[i];
        if (text !== undefined) {
          uncachedTexts.push(text);
        }
      }
    }

    // Embed uncached texts
    if (uncachedTexts.length > 0) {
      await this.isReady();

      // Embed one by one (Transformers.js batching is limited)
      for (let j = 0; j < uncachedTexts.length; j++) {
        const text = uncachedTexts[j];
        const idx = uncachedIndices[j];
        if (text !== undefined && idx !== undefined) {
          const embedding = await this.embed(text);
          results[idx] = embedding;
        }
      }
    }

    return results as Embedding[];
  }

  /**
   * Truncate text to fit model's token limit.
   * Simple word-based truncation (not perfect but good enough).
   */
  private truncateText(text: string): string {
    const config = MODEL_REGISTRY[this.modelId];
    if (!config) return text;

    // Rough estimate: 1 token ≈ 4 characters for English
    const maxChars = config.tokenLimit * 4;

    if (text.length <= maxChars) {
      return text;
    }

    // Truncate at word boundary
    const truncated = text.slice(0, maxChars);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  }

  /**
   * Generate cache key for text.
   */
  private getCacheKey(text: string): string {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${this.modelId}:${hash}`;
  }

  /**
   * Clear the embedding cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: 1000, // Default from options
    };
  }
}

// ─── Factory Function ────────────────────────────────────────────────────────

/**
 * Create and initialize a LocalEmbeddingProvider.
 *
 * @param options - Provider options
 * @returns Initialized provider ready for use
 */
export async function createLocalEmbeddingProvider(
  options?: LocalEmbeddingProviderOptions
): Promise<LocalEmbeddingProvider> {
  const provider = new LocalEmbeddingProvider(options);
  await provider.isReady();
  return provider;
}
