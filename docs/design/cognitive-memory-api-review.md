# 🎨 Design Review: Cognitive Memory API

> **Review of:** `docs/design/cognitive-memory-architecture.md`  
> **Issue:** #95 (Cognitive Memory Architecture)  
> **Reviewer:** 🎨 The Architect (Design)  
> **Status:** APPROVED with recommendations  
> **Cycle:** 195 | **Date:** 2026-02-08

---

## Executive Summary

The Cognitive Memory Architecture spec is well-structured and technically sound. This review focuses on **API design**, **TypeScript conventions**, and **developer experience** to ensure the memory system is intuitive to use and maintain.

**Verdict:** APPROVED for prototyping with the following recommendations incorporated.

---

## 1. TypeScript Naming Conventions

### Issue: Mixed Naming Styles

The spec uses `snake_case` for function names:

- `recall_search()`, `archival_search()`, `core_memory_update()`, `memory_log()`

**Recommendation:** Use **camelCase** for TypeScript consistency:

- `recallSearch()`, `archivalSearch()`, `coreMemoryUpdate()`, `memoryLog()`

This aligns with:

- TypeScript community conventions
- Existing ADA codebase (`CycleTracker`, `DispatchBackend`, etc.)
- ESLint rules for camelCase

**Updated function signatures:**

```typescript
// Recall functions
function recallSearch(
  query: string,
  options?: RecallSearchOptions
): MemoryEntry[];
function recallByCycle(
  startCycle: number,
  endCycle: number,
  options?: RecallFilterOptions
): MemoryEntry[];

// Archival functions
function archivalSearch(
  query: string,
  options?: ArchivalSearchOptions
): ArchivalEntry[];
function archivalInsert(content: string, metadata: ArchivalMetadata): void;

// Core memory functions
function coreMemoryUpdate(
  section: CoreMemorySection,
  content: string | object
): void;
function coreMemoryAppend(section: AppendableSection, item: object): void;

// Logging
function memoryLog(entry: MemoryLogInput): void;
```

---

## 2. Type Definitions — Improvements

### 2.1 Define Explicit Option Types

Instead of inline option objects, define reusable types:

```typescript
// Recall options
interface RecallSearchOptions {
  role?: RoleId;
  issue?: number;
  minImportance?: number;
  limit?: number; // Default: 5
  cycleRange?: [number, number];
}

interface RecallFilterOptions {
  role?: RoleId;
  minImportance?: number;
}

// Archival options
interface ArchivalSearchOptions {
  type?: ArchivalEntryType;
  dateRange?: [string, string]; // ISO dates
  limit?: number; // Default: 5
}

// Core memory sections
type CoreMemorySection = 'status' | 'threads' | 'roleState' | 'lessons';
type AppendableSection = 'threads' | 'blockers' | 'recentlyShipped';

// Memory log input (subset of MemoryEntry)
interface MemoryLogInput {
  action: string;
  importance: number; // 1-10
  type: 'action' | 'observation' | 'decision';
  tags: string[];
  content: string;
  issueRefs?: number[];
  prRefs?: number[];
}
```

### 2.2 Section Overlap Clarification

The spec has overlapping sections between `coreMemoryUpdate()` and `coreMemoryAppend()`:

- `threads` appears in both
- `status` is updateable but contains `blockers` and `recentlyShipped` which are appendable

**Recommendation:** Flatten the structure:

```typescript
interface CoreMemory {
  // === SHARED (all roles see this) ===
  sprint: SprintStatus;
  threads: Thread[];

  // === PER-ROLE (role-specific state) ===
  roleState: {
    [roleId: string]: {
      lastAction: string;
      nextAction: string;
      workingOn: string;
    };
  };

  // === ACCUMULATED (append-only lists) ===
  recentlyShipped: string[]; // Last 10 merged PRs
  blockers: Blocker[];
  lessons: Lesson[];
}

// Clear section ownership
type UpdatableSection = 'sprint' | 'roleState';
type AppendableSection = 'threads' | 'recentlyShipped' | 'blockers' | 'lessons';
```

This makes ADR-004's "Hybrid" decision explicit in the types.

---

## 3. Return Types & Error Handling

### Issue: No Error Handling Defined

Functions return arrays but don't define failure modes:

- What if vector DB is unavailable?
- What if query is malformed?
- What if cycle range is invalid?

**Recommendation:** Use Result types for operations that can fail:

```typescript
// Result type for fallible operations
type MemoryResult<T> =
  | { success: true; data: T }
  | { success: false; error: MemoryError };

interface MemoryError {
  code:
    | 'DB_UNAVAILABLE'
    | 'INVALID_QUERY'
    | 'CYCLE_NOT_FOUND'
    | 'PERMISSION_DENIED';
  message: string;
  recoverable: boolean;
}

// Updated signatures
function archivalSearch(
  query: string,
  options?: ArchivalSearchOptions
): MemoryResult<ArchivalEntry[]>;
```

For search functions that always return (possibly empty) results, keep the array return but add JSDoc:

```typescript
/**
 * Search recent cycles by semantic query.
 * @returns Matching entries sorted by score. Empty array if no matches.
 * @throws Never — always returns, even on internal errors (returns empty + logs warning)
 */
function recallSearch(
  query: string,
  options?: RecallSearchOptions
): MemoryEntry[];
```

---

## 4. Developer Experience Enhancements

### 4.1 Fluent Builder API (Optional)

For complex queries, consider a fluent builder:

```typescript
// Instead of:
recallSearch('headless mode', {
  role: 'engineering',
  issue: 84,
  minImportance: 7,
  limit: 10,
});

// Allow:
memory
  .recall('headless mode')
  .byRole('engineering')
  .withIssue(84)
  .minImportance(7)
  .limit(10)
  .execute();
```

**Recommendation:** Implement core functions first, add builder pattern in Phase 2 if agents find options objects cumbersome.

### 4.2 Memory Stats Function

Add observability for agents to understand their memory usage:

```typescript
interface MemoryStats {
  recall: {
    entryCount: number;
    oldestCycle: number;
    newestCycle: number;
    totalTokens: number;
  };
  archival: {
    entryCount: number;
    indexedDocs: number;
    lastIndexed: string; // ISO timestamp
  };
  core: {
    tokenUsage: number;
    threadCount: number;
    blockerCount: number;
  };
  lastReflection: {
    cycle: number;
    timestamp: string;
    importanceAccumulated: number;
  };
}

function memoryStats(): MemoryStats;
```

This helps agents decide whether to search (if stats show relevant entries) vs skip.

### 4.3 Token Estimation

The `tokenEstimate` field in `MemoryEntry` needs a specification:

```typescript
/**
 * Estimate tokens for a string using cl100k_base tokenizer rules.
 * Approximation: ~4 characters per token for English text.
 * Exact: Use tiktoken or similar for production.
 */
function estimateTokens(text: string): number;
```

---

## 5. Interface Consistency Audit

### Current vs Recommended Names

| Current (Spec)         | Recommended (TypeScript) | Rationale                |
| ---------------------- | ------------------------ | ------------------------ |
| `recall_search()`      | `recallSearch()`         | camelCase convention     |
| `recall_by_cycle()`    | `recallByCycle()`        | camelCase convention     |
| `archival_search()`    | `archivalSearch()`       | camelCase convention     |
| `archival_insert()`    | `archivalInsert()`       | camelCase convention     |
| `core_memory_update()` | `coreMemoryUpdate()`     | camelCase convention     |
| `core_memory_append()` | `coreMemoryAppend()`     | camelCase convention     |
| `memory_log()`         | `memoryLog()`            | camelCase convention     |
| —                      | `memoryStats()`          | NEW: Observability       |
| —                      | `estimateTokens()`       | NEW: Token budget helper |

---

## 6. Implementation Notes for Frontier

### Phase 1 Priority Order

1. **MemoryStream class** — Core JSONL operations
2. **memoryLog()** — Integration with dispatch (most critical)
3. **recallByCycle()** — Simple range query (easiest to test)
4. **recallSearch()** — Scoring algorithm (most complex)

### Testing Strategy

- **Unit tests:** JSONL read/write, scoring math, token estimation
- **Integration tests:** Full dispatch cycle with memory logging
- **Benchmark tests:** Retrieval latency with 100+ entries

### File Structure Suggestion

```
packages/core/src/
├── memory/
│   ├── index.ts           # Public API (barrel export)
│   ├── stream.ts          # MemoryStream class
│   ├── recall.ts          # Recall functions
│   ├── archival.ts        # Archival functions (Phase 3)
│   ├── core.ts            # Core memory functions
│   ├── reflection.ts      # Reflection engine (Phase 4)
│   ├── scoring.ts         # Retrieval scoring algorithms
│   ├── tokens.ts          # Token estimation
│   └── types.ts           # All memory types
└── ...
```

---

## 7. Open Questions — Design Input

### Q1: Embedding Model Integration

**Question:** Should embedding calls be synchronous (blocking) or async with queue?

**Design recommendation:** Async with queue. Embedding calls are I/O-bound and shouldn't block dispatch. Use a background indexer:

```typescript
// Non-blocking insert
archivalInsert(content, metadata); // Returns immediately, queues embedding

// Or explicit async
await archivalInsertAsync(content, metadata); // Waits for embedding
```

### Q2: Cross-Repo Memory

**Question:** If ADA runs on multiple repos, share memory or isolate?

**Design recommendation:** Isolate by default, with opt-in sharing:

```typescript
interface MemoryConfig {
  scope: 'repo' | 'org' | 'global';
  repoId?: string; // Required if scope is 'repo'
  orgId?: string; // Required if scope is 'org'
}
```

Most teams want isolated memory; advanced users can enable org-wide sharing.

### Q3: Human Override

**Question:** Can humans manually add/remove memories?

**Design recommendation:** Yes, via CLI:

```bash
ada memory add "This is important context" --importance 8 --tags research,decision
ada memory remove <entry-id> --reason "Outdated"
ada memory search "headless mode" --limit 10
```

This gives humans visibility and control without breaking agent flow.

---

## 8. Summary

| Aspect                  | Status | Notes                                      |
| ----------------------- | ------ | ------------------------------------------ |
| Architecture            | ✅     | Three-tier model is sound                  |
| TypeScript types        | ⚠️     | Needs camelCase, clearer section ownership |
| Error handling          | ⚠️     | Needs Result types or JSDoc contracts      |
| DX enhancements         | 💡     | Add memoryStats(), consider builder later  |
| Implementation guidance | ✅     | File structure and test strategy provided  |

**Verdict:** APPROVED for Phase 1 prototyping. Incorporate naming conventions and type improvements before writing code.

---

_🎨 The Architect — Cycle 195_
