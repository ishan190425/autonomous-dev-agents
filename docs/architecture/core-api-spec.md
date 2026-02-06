# @ada/core API Specification v3.0

> **Author:** 🎨 The Architect  
> **Date:** 2026-02-06 (v3.0), 2026-02-04 (v2.0), 2026-01-30 (v1.0)  
> **Status:** Draft  
> **Version:** 3.0

## Overview

The `@ada/core` library provides the foundational API for autonomous dev agent teams. It handles role rotation, memory management, dispatch coordination, and provides TypeScript types for the entire ADA ecosystem.

**Design Principles:**

- **Async-first:** All I/O operations return Promises
- **Type-safe:** Full TypeScript coverage with strict mode
- **Immutable:** State objects are readonly, mutations return new objects
- **Composable:** Clean separation between reading, processing, and writing
- **Error-resilient:** Graceful handling of missing files, corrupted data

---

## Core Types

### Role Definition

```typescript
interface Role {
  readonly id: RoleId;
  readonly name: string;        // "The Builder"
  readonly title: string;       // "Lead Engineer"
  readonly emoji: string;       // "⚙️"
  readonly focus: readonly string[];
  readonly actions: readonly RoleAction[];
  readonly memory_bank?: string;
}

type RoleId = 'ceo' | 'engineering' | 'ops' | ... | (string & {});
```

**Design Notes:**

- `readonly` prevents accidental mutations
- `RoleId` union provides autocomplete while allowing custom roles
- `actions` array enables dynamic capability discovery

### Team Roster

```typescript
interface Roster {
  readonly company: string;
  readonly product: string;
  readonly tagline: string;
  readonly roles: readonly Role[];
  readonly rotation_order: readonly RoleId[];
}
```

**Design Notes:**

- Simple flat structure, easy to serialize/deserialize
- `rotation_order` separate from roles for flexibility
- Immutable by default

### Rotation State Machine

```typescript
interface RotationState {
  current_index: number;
  last_role: RoleId | null;
  last_run: string | null; // ISO timestamp
  cycle_count: number;
  history: RotationHistoryEntry[];
}

interface RotationHistoryEntry {
  readonly role: RoleId;
  readonly timestamp: string; // ISO timestamp
  readonly cycle: number;
  readonly action?: string; // Brief description
}
```

**Design Notes:**

- State is mutable (CLI needs to update it)
- History provides audit trail and debugging
- `null` values indicate "never ran" state

---

## Rotation API

### Core Functions

```typescript
// State management
function readRotationState(statePath: string): Promise<RotationState>;
function writeRotationState(
  statePath: string,
  state: RotationState
): Promise<void>;
function readRoster(rosterPath: string): Promise<Roster>;

// Role resolution
function getCurrentRole(state: RotationState, roster: Roster): Role | null;
function getCurrentRoleId(state: RotationState, roster: Roster): RoleId | null;

// State transitions
function advanceRotation(
  state: RotationState,
  roster: Roster,
  actionDescription?: string
): RotationState;

// Utility
function getRotationSummary(state: RotationState, roster: Roster): string;
```

**Usage Example:**

```typescript
import {
  readRotationState,
  readRoster,
  getCurrentRole,
  advanceRotation,
} from '@ada/core';

const state = await readRotationState('./agents/state/rotation.json');
const roster = await readRoster('./agents/roster.json');
const currentRole = getCurrentRole(state, roster);

if (currentRole) {
  console.log(`Current role: ${currentRole.emoji} ${currentRole.name}`);

  // After executing an action:
  const newState = advanceRotation(state, roster, 'Implemented feature X');
  await writeRotationState('./agents/state/rotation.json', newState);
}
```

**Design Notes:**

- Pure functions where possible (advanceRotation)
- Async I/O separated from sync business logic
- Clear error handling (returns null for empty rosters)

---

## Memory API

### Core Functions

```typescript
// File operations
function readMemoryBank(bankPath: string): Promise<string>;
function writeMemoryBank(bankPath: string, content: string): Promise<void>;

// Analysis
function countLines(content: string): number;
function needsCompression(
  content: string,
  cyclesSinceCompression: number,
  lineThreshold?: number,
  cycleThreshold?: number
): boolean;

// Compression workflow
function archiveBank(
  bankPath: string,
  archivesDir: string,
  version: number
): Promise<string>;

function extractVersion(content: string): number;
function extractCycle(content: string): number;
function updateBankHeader(
  content: string,
  cycle: number,
  version?: number
): string;
```

**Usage Example:**

```typescript
import { readMemoryBank, needsCompression, archiveBank } from '@ada/core';

const content = await readMemoryBank('./agents/memory/bank.md');
const shouldCompress = needsCompression(content, 5);

if (shouldCompress) {
  const version = extractVersion(content);
  await archiveBank(
    './agents/memory/bank.md',
    './agents/memory/archives',
    version
  );

  // Compress content here (implementation-specific)
  const compressedContent = compressMemoryBank(content);
  const updatedContent = updateBankHeader(
    compressedContent,
    cycle,
    version + 1
  );

  await writeMemoryBank('./agents/memory/bank.md', updatedContent);
}
```

**Design Notes:**

- String-based API (flexible content format)
- Compression logic separated from I/O
- Header metadata extraction via regex (simple, reliable)

---

## Dispatch API

### High-Level Orchestration

```typescript
interface DispatchContext {
  readonly agentsDir: string;
  readonly config: AdaConfig;
  readonly roster: Roster;
  readonly state: RotationState;
  readonly role: Role;
  readonly memoryContent: string;
}

interface DispatchResult {
  readonly success: boolean;
  readonly role: RoleId;
  readonly roleName: string;
  readonly cycle: number;
  readonly action: string;
  readonly timestamp: string;
  readonly modifiedFiles: readonly string[];
  readonly error?: string;
}

// Main orchestration functions
function loadContext(
  cwd: string,
  config?: Partial<AdaConfig>
): Promise<DispatchContext | null>;
function completeDispatch(
  context: DispatchContext,
  actionDescription: string
): Promise<DispatchResult>;
function checkCompression(context: DispatchContext): Promise<boolean>;
```

**Usage Example:**

```typescript
import { loadContext, completeDispatch, checkCompression } from '@ada/core';

const context = await loadContext(process.cwd());
if (!context) {
  throw new Error('No ADA configuration found. Run `ada init` first.');
}

console.log(`Acting as: ${context.role.name}`);

// Execute some action here...
const actionTaken = 'Created API specification document';

// Handle compression if needed
await checkCompression(context);

// Complete the cycle
const result = await completeDispatch(context, actionTaken);
console.log(`Cycle ${result.cycle} complete: ${result.action}`);
```

**Design Notes:**

- Context object provides all needed data in one place
- Result object provides audit trail
- Compression check separate from dispatch (can run independently)

---

## Configuration API

### ADA Configuration

```typescript
interface AdaConfig {
  readonly agentsDir: string; // "agents/"
  readonly templatesDir: string; // "templates/"
  readonly repo?: string; // "owner/name"
  readonly defaultBranch: string; // "main"
  readonly maxHistory: number; // 10
  readonly compressionThreshold: number; // 200 lines
}

const DEFAULT_CONFIG: AdaConfig = {
  agentsDir: 'agents/',
  templatesDir: 'templates/',
  defaultBranch: 'main',
  maxHistory: 10,
  compressionThreshold: 200,
};
```

**Design Notes:**

- Simple flat configuration object
- Sensible defaults provided
- Readonly to prevent accidental mutations

---

## Error Handling Strategy

### Error Types

```typescript
// File system errors
class AdaFileError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly cause?: Error
  ) {
    super(message);
  }
}

// Configuration errors
class AdaConfigError extends Error {
  constructor(
    message: string,
    public readonly configPath?: string
  ) {
    super(message);
  }
}

// State corruption errors
class AdaStateError extends Error {
  constructor(
    message: string,
    public readonly statePath?: string
  ) {
    super(message);
  }
}
```

### Error Conventions

- **Missing files:** Return `null` or empty values (not errors)
- **Corrupted data:** Throw specific error types
- **Invalid config:** Throw `AdaConfigError` with helpful message
- **Network issues:** Let underlying errors bubble up (don't wrap)

**Example:**

```typescript
// Good: Returns null for missing files
function readRotationState(path: string): Promise<RotationState | null>;

// Good: Throws for corrupted JSON
function parseRoster(content: string): Roster; // throws AdaConfigError

// Good: Lets filesystem errors bubble up
function writeMemoryBank(path: string, content: string): Promise<void>;
```

---

## Embedding Memory API (v2.0)

> Added in v2.0 — implements Issue #17 (embedding-based memory retrieval)

### Memory Entry Types

```typescript
type MemoryEntryKind =
  | 'decision'
  | 'lesson'
  | 'status'
  | 'role_state'
  | 'blocker'
  | 'question'
  | 'metric'
  | 'thread';

interface MemoryEntry {
  readonly id: string;
  readonly kind: MemoryEntryKind;
  readonly content: string;
  readonly role?: string;
  readonly date?: string;
  readonly tags: readonly string[];
}

type Embedding = readonly number[];

interface EmbeddedEntry {
  readonly entry: MemoryEntry;
  readonly embedding: Embedding;
}

interface SearchResult {
  readonly entry: MemoryEntry;
  readonly score: number; // 0-1 cosine similarity
}
```

### Embedding Provider Interface

```typescript
interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(text: string): Promise<Embedding>;
  embedBatch(texts: string[]): Promise<Embedding[]>;
}
```

### Vector Store Interface

```typescript
interface VectorStore {
  add(entries: EmbeddedEntry[]): Promise<void>;
  search(
    query: Embedding,
    topK?: number,
    threshold?: number
  ): Promise<SearchResult[]>;
  size(): number;
  clear(): void;
}
```

### Semantic Memory Manager

```typescript
class SemanticMemoryManager {
  constructor(provider: EmbeddingProvider, store?: VectorStore);
  indexEntries(entries: MemoryEntry[]): Promise<number>;
  search(
    query: string,
    topK?: number,
    threshold?: number
  ): Promise<SearchResult[]>;
  size(): number;
}
```

### Built-in Implementations

- **TfIdfEmbeddingProvider** — Zero-dependency TF-IDF embeddings (default)
- **InMemoryVectorStore** — In-memory cosine similarity search (default)

### Utility Functions

```typescript
// Parse bank.md → structured entries
function extractMemoryEntries(bankContent: string): MemoryEntry[];
// Cosine similarity between two embeddings
function cosineSimilarity(a: Embedding, b: Embedding): number;
// L2-normalize an embedding
function normalizeVector(v: Embedding): number[];
```

---

## Agent Execution API (v2.0)

> Added in v2.0 — implements RES-001 (Hybrid Clawdbot orchestration)

### Agent Executor Interface

```typescript
interface ActionResult {
  success: boolean;
  action: string;
  details: string;
  modifiedFiles?: string[];
  createdIssues?: number[];
  createdPRs?: number[];
  error?: string;
}

interface AgentExecutor {
  executeAction(context: DispatchContext): Promise<ActionResult>;
}
```

### ClawdbotAgentExecutor

```typescript
class ClawdbotAgentExecutor implements AgentExecutor {
  async executeAction(context: DispatchContext): Promise<ActionResult>;
}

// Convenience function using default executor
function executeAgentAction(context: DispatchContext): Promise<ActionResult>;
```

**Design Notes:**

- Builds role-specific prompt from DispatchContext
- Extracts memory bank summary for context window
- Spawns Clawdbot session for execution (RES-001)
- Returns structured ActionResult for dispatch tracking

---

## Memory Importance API (v3.0)

> Added in v3.0 — implements Phase 3.1 of PLAT-002 (Memory Lifecycle System)

Tracks importance scores for memory entries to drive automatic tier transitions.

### Importance Types

```typescript
interface MemoryImportance {
  readonly id: string;
  readonly kind: MemoryEntryKind;
  score: number; // 0-1 composite importance
  accessCount: number;
  lastAccessCycle: number;
  createdCycle: number;
}

interface ImportanceConfig {
  readonly hotThreshold: number; // Default: 0.6
  readonly warmThreshold: number; // Default: 0.3
  readonly forgetThreshold: number; // Default: 0.1
  readonly decayFactor: number; // Default: 0.95
  readonly accessBoost: number; // Default: 0.1
  readonly maxAccessBoost: number; // Default: 0.4
}

interface LifecycleCheckResult {
  readonly demoteToWarm: readonly string[]; // hot → warm
  readonly demoteToCold: readonly string[]; // warm → cold
  readonly promoteToHot: readonly string[]; // warm → hot
  readonly canForget: readonly string[]; // cold → remove
}
```

### ImportanceTracker Class

```typescript
class ImportanceTracker {
  constructor(agentsDir: string, config?: Partial<ImportanceConfig>);

  // Load/save state
  async load(): Promise<void>;
  async save(): Promise<void>;

  // Entry management
  getOrCreate(
    id: string,
    kind: MemoryEntryKind,
    currentCycle: number
  ): MemoryImportance;
  trackAccess(id: string, kind: MemoryEntryKind, currentCycle: number): void;
  removeEntries(ids: readonly string[]): void;

  // Scoring
  updateAllScores(currentCycle: number): void;
  getScore(id: string): number | undefined;

  // Lifecycle decisions
  checkLifecycle(
    currentCycle: number,
    hotIds: readonly string[],
    warmIds: readonly string[],
    coldIds: readonly string[]
  ): LifecycleCheckResult;

  // Stats
  getStats(): {
    total: number;
    avgScore: number;
    byKind: Record<string, number>;
  };
  get lastUpdateCycle(): number;
}

// Factory function
async function createImportanceTracker(
  agentsDir: string,
  config?: Partial<ImportanceConfig>
): Promise<ImportanceTracker>;
```

### Importance Scoring Algorithm

Score = `(kindWeight × 0.4) + (recencyFactor × 0.3) + (accessFactor × 0.3)`

- **kindWeight:** `decision` > `blocker` > `lesson` > `thread` > `role_state` > `status` > `question` > `metric`
- **recencyFactor:** Exponential decay based on cycles since creation
- **accessFactor:** Log-scaled access count with configurable boost

---

## Persistent Vector Store API (v3.0)

> Added in v3.0 — implements Phase 3.2 of PLAT-002 (Memory Lifecycle System)

Zero-dependency JSON-based vector store for warm tier storage. Persists to `agents/state/vectors.json`.

### Vector Store Types

```typescript
interface StoredVectorEntry {
  readonly id: string;
  readonly kind: MemoryEntryKind;
  readonly content: string;
  readonly role?: string;
  readonly date?: string;
  readonly tags: readonly string[];
  readonly vector: readonly number[];
  tier: 'hot' | 'warm' | 'cold';
  readonly addedAt: string; // ISO timestamp
  lastAccessedAt?: string;
}

interface VectorStoreState {
  readonly version: 1;
  readonly embeddingProvider: string;
  readonly dimensions: number;
  lastModified: string;
  entryCount: number;
  entries: Record<string, StoredVectorEntry>;
}

interface VectorSearchFilter {
  readonly kinds?: readonly MemoryEntryKind[];
  readonly tiers?: readonly ('hot' | 'warm' | 'cold')[];
  readonly tags?: readonly string[];
  readonly role?: string;
}
```

### JsonVectorStore Class

```typescript
class JsonVectorStore implements VectorStore {
  constructor(agentsDir: string, providerName: string, dimensions: number);

  // Persistence
  async load(): Promise<void>;
  async save(): Promise<void>;

  // VectorStore interface
  upsert(entries: readonly EmbeddedEntry[]): Promise<void>;
  search(query: Embedding, topK: number): Promise<readonly SearchResult[]>;

  // Extended search with filters
  searchWithFilter(
    query: Embedding,
    topK: number,
    filter?: VectorSearchFilter,
    trackAccess?: boolean
  ): Promise<readonly SearchResult[]>;

  // Entry management
  remove(ids: readonly string[]): Promise<void>;
  listIds(): Promise<readonly string[]>;
  count(): Promise<number>;
  getEntry(id: string): StoredVectorEntry | undefined;

  // Tier management
  getEntriesByTier(tier: 'hot' | 'warm' | 'cold'): readonly string[];
  setTier(
    entryIds: readonly string[],
    targetTier: 'hot' | 'warm' | 'cold'
  ): void;

  // Statistics
  getStats(): {
    total: number;
    byTier: Record<'hot' | 'warm' | 'cold', number>;
    byKind: Record<string, number>;
    dimensions: number;
    provider: string;
    lastModified: string;
  };
}

// Factory function
async function createJsonVectorStore(
  agentsDir: string,
  providerName: string,
  dimensions: number
): Promise<JsonVectorStore>;
```

**Design Notes:**

- Atomic writes via temp file + rename (crash-safe)
- Provider/dimension validation on load (re-index if mismatch)
- Access tracking for importance scoring
- Suitable for <10K entries; migrate to SQLite-vec for larger corpora

---

## Memory Lifecycle Manager API (v3.0)

> Added in v3.0 — implements Phase 3.2 of PLAT-002 (Memory Lifecycle System)

Orchestrates the three-tier memory system:

- **Hot tier:** `bank.md` (markdown, read every cycle)
- **Warm tier:** Vector store (semantic search on demand)
- **Cold tier:** Archives (explicit search only)

### Lifecycle Types

```typescript
interface LifecycleTransitionResult {
  readonly timestamp: string;
  readonly cycle: number;
  readonly demotedToWarm: readonly string[];
  readonly demotedToCold: readonly string[];
  readonly promotedToHot: readonly string[];
  readonly forgotten: readonly string[];
  readonly newlyIndexed: readonly string[];
  readonly errors: readonly string[];
}

interface LifecycleConfig {
  readonly agentsDir: string;
  readonly bankPath: string; // Default: "memory/bank.md"
  readonly autoSave: boolean; // Default: true
  readonly minSearchScore: number; // Default: 0.1
}

interface TieredSearchResult extends SearchResult {
  readonly tier: 'hot' | 'warm' | 'cold';
}
```

### MemoryLifecycleManager Class

```typescript
class MemoryLifecycleManager {
  constructor(
    embeddingProvider: EmbeddingProvider,
    vectorStore: JsonVectorStore,
    importanceTracker: ImportanceTracker,
    config?: Partial<LifecycleConfig>
  );

  // Initialization
  async initialize(): Promise<void>;

  // Core lifecycle operation (call at end of each dispatch cycle)
  async runLifecycleCycle(
    currentCycle: number
  ): Promise<LifecycleTransitionResult>;

  // Semantic search across tiers
  async search(
    queryText: string,
    topK?: number,
    tiers?: readonly ('hot' | 'warm' | 'cold')[]
  ): Promise<readonly TieredSearchResult[]>;

  // State access
  getHotEntries(): readonly MemoryEntry[];
  getStats(): {
    hot: number;
    warm: number;
    cold: number;
    total: number;
    importanceTracked: number;
    avgImportance: number;
  };

  // Persistence
  async save(): Promise<void>;
  async reindex(currentCycle: number): Promise<number>;
}

// Factory function
async function createLifecycleManager(
  embeddingProvider: EmbeddingProvider,
  vectorStore: JsonVectorStore,
  importanceTracker: ImportanceTracker,
  config?: Partial<LifecycleConfig>
): Promise<MemoryLifecycleManager>;
```

**Usage Example:**

```typescript
import {
  TfIdfEmbeddingProvider,
  createJsonVectorStore,
  createImportanceTracker,
  createLifecycleManager,
} from '@ada/core';

// Initialize components
const provider = new TfIdfEmbeddingProvider();
const vectorStore = await createJsonVectorStore('./agents', 'tfidf', 256);
const tracker = await createImportanceTracker('./agents');

// Create lifecycle manager
const lifecycle = await createLifecycleManager(provider, vectorStore, tracker, {
  agentsDir: './agents',
});

// Each dispatch cycle:
const transitions = await lifecycle.runLifecycleCycle(42);
console.log(`Cycle ${transitions.cycle}:`, {
  newlyIndexed: transitions.newlyIndexed.length,
  demotedToWarm: transitions.demotedToWarm.length,
});

// Semantic search across memory tiers
const results = await lifecycle.search(
  'What embedding model did we choose?',
  5
);
for (const r of results) {
  console.log(
    `[${r.tier}] ${r.score.toFixed(2)}: ${r.entry.content.slice(0, 60)}...`
  );
}
```

**Design Notes:**

- Automatic tier transitions based on importance scores
- Unified search across hot + warm tiers by default
- Access patterns feed back into importance scoring
- Cold tier entries eventually "forgotten" when below threshold

---

## Plugin Architecture

> Full RFC: [Plugin Architecture RFC](./plugin-architecture-rfc.md)

### Plugin Interface (Summary)

```typescript
interface AdaPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly minCoreVersion?: string;
  setup?(config: PluginConfig): Promise<void>;
  teardown?(): Promise<void>;
}

interface LifecyclePlugin extends AdaPlugin {
  onBeforeLoad?(config: AdaConfig): Promise<AdaConfig>;
  onBeforeCycle?(context: Readonly<DispatchContext>): Promise<void>;
  onAfterAction?(
    context: Readonly<DispatchContext>,
    result: Readonly<ActionResult>
  ): Promise<void>;
  onAfterCycle?(result: Readonly<DispatchResult>): Promise<void>;
  onCompress?(content: string, version: number): Promise<string | undefined>;
  onError?(error: Error, phase: DispatchPhase): Promise<void>;
}

interface RolePlugin extends AdaPlugin {
  getRoles(): CustomRoleDefinition[];
}

interface MemoryPlugin extends AdaPlugin {
  readBank(): Promise<string>;
  writeBank(content: string): Promise<void>;
  archiveBank(version: number): Promise<string>;
  listArchives(): Promise<MemoryArchiveInfo[]>;
  restoreArchive(archiveId: string): Promise<string>;
}

interface EmbeddingPlugin extends AdaPlugin {
  getProvider(): EmbeddingProvider;
  getVectorStore?(): VectorStore;
}
```

**Design Notes:**

- Explicit registration via `ada.plugins.json`
- Fail-open error isolation (broken plugin ≠ broken dispatch)
- Type-safe lifecycle hooks with ordered execution
- Backwards compatible — all plugin params are optional

---

## Migration & Versioning Strategy

### Schema Evolution

```typescript
interface SchemaVersion {
  readonly version: string; // "1.0.0"
  readonly migration?: (old: unknown) => unknown;
}

// Migration registry
const MIGRATIONS: Record<string, SchemaVersion> = {
  '1.0.0': { version: '1.0.0' },
  '1.1.0': {
    version: '1.1.0',
    migration: old => ({ ...old, newField: 'defaultValue' }),
  },
};
```

**Design Notes:**

- Simple versioning in config files
- Migration functions transform old → new format
- Backwards compatibility maintained where possible

### Breaking Change Policy

- **Major version:** Breaking API changes (rare)
- **Minor version:** New features, optional fields
- **Patch version:** Bug fixes, no schema changes

---

## Performance Considerations

### File I/O Optimization

- **Batch reads:** Load all config files in parallel
- **Lazy loading:** Only read memory bank when needed
- **Caching:** In-memory cache for frequently accessed configs
- **Streaming:** Large memory banks read in chunks

### Memory Usage

- **Immutable objects:** Prevent memory leaks from retained references
- **History limits:** Cap rotation history at configurable size
- **Content compression:** Archive old memory banks

### TypeScript Performance

- **Barrel exports:** Clean public API surface
- **Interface segregation:** Small, focused interfaces
- **Generic constraints:** Constrain types for better inference

---

## Testing Strategy

### Unit Tests

```typescript
// Pure function testing
describe('advanceRotation', () => {
  it('should increment cycle count', () => {
    const state: RotationState = {
      /* ... */
    };
    const roster: Roster = {
      /* ... */
    };
    const result = advanceRotation(state, roster, 'test action');
    expect(result.cycle_count).toBe(state.cycle_count + 1);
  });
});

// Async I/O testing with mocks
describe('readRotationState', () => {
  it('should parse valid JSON', async () => {
    const mockFs = jest.mocked(fs);
    mockFs.readFile.mockResolvedValue('{"cycle_count": 5}');

    const result = await readRotationState('./test.json');
    expect(result.cycle_count).toBe(5);
  });
});
```

### Integration Tests

- **Full dispatch cycle:** Load context → execute → save state
- **File system integration:** Real files, temporary directories
- **Error scenarios:** Missing files, corrupted JSON, permission errors

### Property-Based Testing

- **State transitions:** Rotation advancement is deterministic
- **Serialization roundtrips:** JSON.parse(JSON.stringify(x)) === x
- **Memory bank parsing:** Header extraction works for all valid formats

---

## Documentation Requirements

### JSDoc Standards

````typescript
/**
 * Advance the agent rotation to the next role.
 *
 * Creates a new rotation state with the next role active,
 * updated timestamps, and history entry added.
 *
 * @param state - Current rotation state
 * @param roster - Team roster with rotation order
 * @param actionDescription - Brief description of action taken this cycle
 * @returns New rotation state (does not mutate input)
 *
 * @example
 * ```typescript
 * const newState = advanceRotation(currentState, roster, "Fixed bug #123");
 * console.log(`Advanced to cycle ${newState.cycle_count}`);
 * ```
 */
export function advanceRotation(
  state: RotationState,
  roster: Roster,
  actionDescription?: string
): RotationState;
````

### API Documentation

- **All public functions:** Complete JSDoc with examples
- **Type definitions:** Clear descriptions for each field
- **Error conditions:** When functions throw vs return null
- **Usage patterns:** Common workflows with code examples

---

## Future Considerations

### Web Dashboard Integration

- **Read-only API:** Dashboard queries state without mutations
- **Real-time updates:** WebSocket or SSE for live cycle monitoring
- **Authentication:** Token-based API access for dashboard

### Cloud Synchronization

- **State replication:** Sync rotation state across team members
- **Conflict resolution:** Handle concurrent cycle executions
- **Backup strategies:** Automatic memory bank backups

### Enterprise Features

- **Multi-tenant:** Support for multiple teams/projects
- **Audit logging:** Detailed action logs for compliance
- **Access control:** Role-based permissions for team management

---

**Design Philosophy:** _Simple things should be simple, complex things should be possible._

The @ada/core API prioritizes developer experience through clean types, predictable behavior, and comprehensive error handling. Every function should be self-explanatory, and the most common use cases should require minimal code.

---

**Version History:**

- v3.0 (2026-02-06): Added Memory Importance API (Phase 3.1), Persistent Vector Store API (Phase 3.2), Memory Lifecycle Manager API (Phase 3.2) — complete three-tier memory system documented
- v2.0 (2026-02-04): Added embedding memory API, agent execution API, updated plugin architecture with full RFC
- v1.0 (2026-01-30): Initial API specification

**Next Review:** After v1.0-alpha launch (Feb 24)
