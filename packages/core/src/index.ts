/**
 * @ada/core — Autonomous Dev Agents Core Library
 *
 * Shared types, rotation logic, memory management, and dispatch protocol
 * for the ADA agent framework.
 *
 * @packageDocumentation
 */

// Types
export type {
  RoleId,
  RoleAction,
  Role,
  Roster,
  RotationState,
  RotationHistoryEntry,
  RoleState,
  ArchitectureDecision,
  LessonLearned,
  MemoryBank,
  DispatchResult,
  AdaConfig,
} from './types.js';

export { DEFAULT_CONFIG } from './types.js';

// Rotation
export {
  readRotationState,
  writeRotationState,
  readRoster,
  getCurrentRole,
  getCurrentRoleId,
  advanceRotation,
  getRotationSummary,
} from './rotation.js';

// Memory
export {
  readMemoryBank,
  writeMemoryBank,
  countLines,
  needsCompression,
  archiveBank,
  extractVersion,
  extractCycle,
  updateBankHeader,
} from './memory.js';

// Dispatch
export type { DispatchContext } from './dispatch.js';
export {
  resolvePaths,
  loadContext,
  checkCompression,
  completeDispatch,
} from './dispatch.js';

// Agent Execution
export type { ActionResult, AgentExecutor } from './agent.js';
export { ClawdbotAgentExecutor, executeAgentAction } from './agent.js';

// Embedding Memory
export type {
  MemoryEntryKind,
  MemoryEntry,
  Embedding,
  EmbeddedEntry,
  SearchResult,
  EmbeddingProvider,
  VectorStore,
} from './embedding.js';
export {
  cosineSimilarity,
  normalizeVector,
  extractMemoryEntries,
  TfIdfEmbeddingProvider,
  InMemoryVectorStore,
  SemanticMemoryManager,
} from './embedding.js';

// Dispatch Memory Integration (Phase 2)
export type {
  DispatchMemoryConfig,
  RoleQueryContext,
  RoleSearchResult,
  EnhancedDispatchContext,
} from './dispatch-memory.js';
export {
  DEFAULT_DISPATCH_MEMORY_CONFIG,
  DispatchMemoryManager,
  createDispatchMemoryManager,
  loadContextWithMemory,
  buildRoleQueryContext,
  formatRelevantContext,
  queryForIssue,
  queryForPRReview,
} from './dispatch-memory.js';
