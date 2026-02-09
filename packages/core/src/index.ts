/**
 * @ada/core — Autonomous Dev Agents Core Library
 *
 * Shared types, rotation logic, memory management, dispatch protocol,
 * and observability for the ADA agent framework.
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

// Dispatch (Phase 2: MemoryStream integration)
export type {
  DispatchContext,
  LoadContextOptions,
  CompleteDispatchOptions,
} from './dispatch.js';
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

// Memory Stats (Phase 2)
export type {
  BankInfo,
  CycleInfo,
  SectionCounts,
  HealthStatusLevel,
  HealthStatus,
  MemoryStats,
  ArchiveInfo,
} from './memory-stats.js';
export {
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
  listArchives,
  formatActivityBar,
  getRelativeTime,
} from './memory-stats.js';

// Observability (Phase 1 — Token Counter, Phase 2 — Latency Timer)
export type {
  TokenUsage,
  TokenCost,
  ModelPricing,
  DispatchPhase,
  PhaseLatency,
  PhaseLatencyStats,
  CycleMetrics,
  AggregatedMetrics,
  MetricsState,
} from './observability.js';
export {
  MODEL_PRICING,
  DEFAULT_MAX_CYCLES,
  emptyUsage,
  emptyCost,
  addUsage,
  addCost,
  calculateCost,
  getPricing,
  divideUsage,
  divideCost,
  CycleTracker,
  MetricsManager,
  createCycleTracker,
  createMetricsManager,
  formatCost,
  formatTokens,
  formatDuration,
  calculateEfficiency,
} from './observability.js';

// Memory Importance Tracking (Phase 3.1)
export type {
  MemoryImportance,
  ImportanceConfig,
  ImportanceState,
  LifecycleCheckResult,
} from './importance.js';
export {
  KIND_WEIGHTS,
  DEFAULT_IMPORTANCE_CONFIG,
  getKindWeight,
  calculateRecencyFactor,
  calculateAccessFactor,
  calculateImportanceScore,
  calculateImportance,
  ImportanceTracker,
  createImportanceTracker,
} from './importance.js';

// JSON Vector Store (Phase 3.2)
export type {
  StoredVectorEntry,
  VectorStoreState,
  VectorSearchFilter,
} from './json-vector-store.js';
export {
  JsonVectorStore,
  createJsonVectorStore,
} from './json-vector-store.js';

// Memory Lifecycle Manager (Phase 3.2)
export type {
  LifecycleTransitionResult,
  LifecycleConfig,
  TieredSearchResult,
} from './lifecycle.js';
export {
  DEFAULT_LIFECYCLE_CONFIG,
  MemoryLifecycleManager,
  createLifecycleManager,
} from './lifecycle.js';

// Backend Abstraction (Issue #84 — Headless Mode)
export type {
  Issue,
  IssueComment,
  IssueState,
  IssuePriority,
  ListIssuesOptions,
  CreateIssueInput,
  IssueResult,
  PullRequest,
  PRFile,
  PRState,
  ListPRsOptions,
  CreatePRInput,
  PRResult,
  CommentTarget,
  RepoState,
  CodeChange,
  ApplyResult,
  BackendType,
  DispatchBackend,
  FileBackendConfig,
  GitHubBackendConfig,
  BackendOptions,
} from './backend.js';
export {
  DEFAULT_FILE_BACKEND_CONFIG,
  DEFAULT_GITHUB_BACKEND_CONFIG,
  createBackend,
  extractPriority,
  slugify,
} from './backend.js';

// GitHub Backend Implementation (Issue #84 — Phase 1 Step 2)
export { GitHubBackend } from './github-backend.js';

// File Backend Implementation (Issue #84 — Phase 1 Step 3)
export { FileBackend } from './file-backend.js';

// Memory Stream (Issue #95 — Cognitive Memory Phase 1 + Phase 2)
export type {
  StreamEntryType,
  StreamRoleId,
  StreamEntry,
  StreamEntryInput,
  RecallSearchOptions,
  RecallFilterOptions,
  StreamSearchResult,
  StreamStats,
} from './memory-stream.js';
export {
  estimateTokens,
  calculateRecencyScore,
  normalizeImportance,
  calculateRelevanceScore,
  calculateRetrievalScore,
  MemoryStream,
  createMemoryStream,
  DEFAULT_STREAM_PATH,
  // Phase 2: Reference extraction and importance calculation
  extractIssueRefs,
  extractPRRefs,
  calculateDefaultImportance,
} from './memory-stream.js';

// Semantic Memory Stream (Issue #95 — Cognitive Memory Phase 3)
export type {
  VectorMetadata,
  VectorFilter,
  SemanticSearchOptions,
  SemanticSearchResult,
} from './semantic-memory-stream.js';
export {
  SemanticMemoryStream,
  createSemanticMemoryStream,
} from './semantic-memory-stream.js';

// Local Embedding Provider (Issue #95 — Cognitive Memory Phase 3)
export type {
  LocalEmbeddingProviderOptions,
} from './local-embedding-provider.js';
export {
  LocalEmbeddingProvider,
  createLocalEmbeddingProvider,
} from './local-embedding-provider.js';
