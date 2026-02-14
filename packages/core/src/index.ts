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
  // Reflexion types (Issue #108 — Phase 1a)
  ReflectionOutcome,
  Reflection,
} from './types.js';

export { DEFAULT_CONFIG } from './types.js';

// Reflection (Issue #108 — Reflexion Pattern Phase 1a)
export {
  MAX_SHORT_FIELD_LENGTH,
  MAX_LESSON_LENGTH,
  DEFAULT_REFLECTION_COUNT,
  generateReflectionPrompt,
  parseReflection,
  getRecentReflections,
  formatReflectionsForContext,
  isValidReflection,
  createEmptyReflection,
} from './reflection.js';

// Rotation
export type { AdvanceRotationOptions } from './rotation.js';
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

// Cross-Role Insights (Issue #108 — Reflexion Phase 1c + Phase 1c-b)
export type {
  InsightType,
  InsightAction,
  CrossRoleInsight,
  ReflectionSource,
  ReflectionCluster,
  DetectionOptions,
  ConfidenceFactors,
} from './cross-role-insights.js';
export {
  DEFAULT_DETECTION_OPTIONS,
  extractKeywords,
  jaccardSimilarity,
  extractReflectionSources,
  clusterReflections,
  calculateConfidenceFactors,
  calculateConfidence,
  generateInsightId,
  synthesizeInsight,
  generateRuleProposal,
  determineAction,
  // Phase 1c-a: Convergent detection
  detectConvergentInsights,
  // Phase 1c-b: Complementary & Cascading detection
  detectThemes,
  detectComplementaryInsights,
  detectCascadingFailures,
  // Main entry point
  detectCrossRoleInsights,
  formatInsightsForRetro,
  generateInsightIssueBody,
} from './cross-role-insights.js';

// Issue Tracking (R-013: Issue Tracking Protocol)
export type {
  ParsedIssue,
  ActiveThreadEntry,
  IssueTrackingResult,
} from './issues.js';
export {
  parseGitHubIssues,
  extractActiveThreads,
  findMissingIssues,
  findClosedInThreads,
  formatIssueForThreads,
  verifyIssueTracking,
  extractPriorityFromLabels,
  suggestRoleFromIssue,
} from './issues.js';

// Heat Scoring (Issue #118 — Cognitive Memory Phase 4, Sprint 2)
// Core heat calculation for reference-based memory scoring.
// Terminal mode will integrate with these types in Sprint 2.
export type {
  MemoryClass,
  HeatConfig,
  HeatMetadata,
  HeatScore,
  HeatStats,
} from './heat/index.js';
export {
  HEAT_THRESHOLDS,
  DEFAULT_HEAT_CONFIG,
  calculateHeat,
  calculateHeatScore,
  isHot,
  isWarm,
  isCold,
  projectDecay,
  daysUntilTierDrop,
  calculateHeatStats,
  getHeatEmoji,
  formatHeatScore,
} from './heat/index.js';
export type { EntryType as HeatEntryType } from './heat/index.js';
export { normalizeImportance as normalizeHeatImportance } from './heat/index.js';
// Note: HeatTier, HeatSignalType, HeatSignal, getHeatTier exported from terminal for now.
// Sprint 2 will refactor terminal to import from heat module.

// Heat-Aware Retrieval (Issue #118 — Phase 4 Task 6: Heat + Memory Stream Integration)
export type {
  HeatRetrievalOptions,
  HeatAwareResult,
  RetrievalHeatStats,
} from './heat-retrieval.js';
export {
  combineWithHeat,
  calculateRetrievalStats,
  initializeHeatData,
  syncHeatWithStream,
  formatHeatResults,
} from './heat-retrieval.js';

// Terminal Mode (Issue #125 — Shell-based benchmarks, Sprint 2)
export type {
  // Shell Detection
  ShellType,
  ShellConfig,
  ShellDetectorOptions,
  // Command Execution
  ExecutionResult,
  ExecutionOptions,
  // Heat Signals
  HeatSignalType,
  HeatSignal,
  CycleSummary,
  // Heat Storage
  HeatEntity,
  HeatStore,
  HeatStorageOptions,
  // Heat Display
  HeatDisplayMode,
  HeatTier,
  // Benchmarks
  CommandCost,
  TaskCost,
  BenchmarkComparison,
  BenchmarkResult,
} from './terminal/index.js';
export {
  TerminalError,
  // Shell Detector
  detectShell,
  validateShell,
  getShellType,
  isSupported,
  // Signal Collector
  SignalCollector,
  createSignalCollector,
  // Heat Display
  HEAT_TIERS,
  getHeatTier,
  formatHeatDisplay,
  detectHeatDisplayMode,
  generateHeatBar,
  formatHeatWithBar,
} from './terminal/index.js';
