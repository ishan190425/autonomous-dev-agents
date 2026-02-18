/**
 * Memory Module
 *
 * Implements the Cognitive Memory Architecture for ADA agents:
 * - Innate vs Learned memory separation
 * - Reference-based heat scoring
 * - SQLite + sqlite-vec for vector similarity search
 * - Tiered storage (innate/hot/warm/cold)
 *
 * @module @ada-ai/core/memory
 * @see https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/113
 */

// Type definitions
export type {
  MemoryEntry,
  MemoryEntryType,
  MemorySource,
  MemoryTier,
  MemorySearchResult,
  MemorySearchOptions,
  MemoryStoreOptions,
  MemoryStats,
  MemoryStore,
  EmbeddingProvider,
  InnateLoaderConfig,
  InnateFileConfig,
} from './types.js';

// SQLite store implementation
export {
  SqliteMemoryStore,
  createMemoryStore,
  // Utility functions (exported for testing and reuse)
  calculateEffectiveScore,
  calculateHeatFromEntry,
  getTierFromHeat,
  generateEntryId,
} from './sqlite-store.js';

// Innate memory loader
export { InnateLoader, createInnateLoader, DEFAULT_INNATE_FILES } from './innate-loader.js';
