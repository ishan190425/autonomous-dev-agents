# ADR: Memory Lifecycle System

> **ID:** PLAT-002
> **Status:** Proposed
> **Author:** The Frontier 🌌
> **Date:** 2026-02-06
> **Relates to:** Issue #17 (Phase 3), PLAT-001 (Embedding Architecture), ADR-001 (monorepo)

---

## Context

ADA's memory system currently operates in two modes:

1. **Markdown bank** — Full-text, human-readable, read every cycle (~4k tokens)
2. **Semantic embeddings** — Vector search over extracted entries (Phase 1, PLAT-001)

As projects grow, memory accumulates indefinitely. The current compression protocol (R-002) archives snapshots at thresholds, but doesn't intelligently prioritize what stays "hot" vs. what can fade. This leads to:

- **Token waste:** Recent, relevant memories mixed with stale context
- **No forgetting:** Every decision ever made stays equally weighted
- **No learning signal:** Frequently-accessed memories aren't prioritized
- **Compression is all-or-nothing:** Either read full bank or compress everything

Issue #17 Phase 3 calls for a memory lifecycle system with hot/warm/cold tiers and intelligent forgetting. This ADR documents the architecture.

---

## Decision

Implement a **tiered memory lifecycle** with automatic promotion/demotion based on recency, access frequency, and relevance scoring.

### Memory Tiers

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HOT MEMORY                                 │
│   • Lives in bank.md (markdown, human-readable)                     │
│   • Read every cycle                                                │
│   • Last 10 cycles of role states, active blockers, sprint status   │
│   • Token budget: ~2,000 tokens                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ Demotion after 10 cycles of no access
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         WARM MEMORY                                 │
│   • Lives in vector store (embeddings)                              │
│   • Retrieved via semantic search when relevant                     │
│   • Architecture decisions, lessons, resolved threads               │
│   • Token budget: top-k retrieval (~500 tokens per query)           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ Demotion after 50 cycles of no retrieval
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         COLD MEMORY                                 │
│   • Lives in compressed archives (markdown files)                   │
│   • Never auto-retrieved, requires explicit `memory search`         │
│   • Historical snapshots, old sprint data, deprecated decisions     │
│   • Token budget: 0 per cycle (on-demand only)                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ Forgetting after 200 cycles of no access
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FORGOTTEN MEMORY                              │
│   • Deleted (with backup to cold archive first)                     │
│   • Entries that were never accessed and have low importance        │
│   • Recoverable via archive search, not indexed                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Lifecycle Transitions

| From | To        | Trigger                                | Action                                          |
| ---- | --------- | -------------------------------------- | ----------------------------------------------- |
| Hot  | Warm      | Entry older than 10 cycles, not active | Remove from bank.md, embed, add to vector store |
| Warm | Hot       | Retrieved 3+ times in last 5 cycles    | Promote back to bank.md                         |
| Warm | Cold      | Not retrieved in 50 cycles             | Remove from vector store, keep in archives      |
| Cold | Warm      | Explicit search retrieves entry        | Re-embed, add to vector store                   |
| Cold | Forgotten | 200 cycles, importance < 0.3           | Delete from archives (backup first)             |

### Entry Importance Scoring

Each memory entry gets an importance score (0.0 - 1.0):

```typescript
interface MemoryImportance {
  entryId: string;

  // Base importance by kind (immutable)
  kindWeight: number; // 1.0 for decisions, 0.8 for lessons, 0.5 for status

  // Access patterns (updated each cycle)
  accessCount: number; // Times retrieved via semantic search
  lastAccessCycle: number; // Most recent access
  createdCycle: number; // When entry was created

  // Derived score
  score: number; // Computed: kindWeight * recency * accessFrequency
}
```

**Kind weights:**

- `decision`: 1.0 — Architecture decisions are foundational
- `lesson`: 0.8 — Lessons inform future behavior
- `blocker`: 0.9 — Blockers are high-signal (but decay fast when resolved)
- `thread`: 0.7 — Active threads matter while active
- `status`: 0.5 — Status is ephemeral
- `role_state`: 0.4 — Role state is current-cycle focused
- `question`: 0.6 — Questions may become stale

**Score formula:**

```
recencyFactor = max(0, 1 - (currentCycle - lastAccessCycle) / 100)
accessFactor = min(1, accessCount / 10)
score = kindWeight * (0.4 + 0.3 * recencyFactor + 0.3 * accessFactor)
```

### Hot Memory Structure (bank.md)

The hot tier is the current `bank.md`, restructured:

```markdown
# 🧠 Memory Bank (v5)

> Last updated: 2026-02-06 | Cycle: 80

## 🔥 Hot Memory (read every cycle)

### Current Sprint

- Sprint 1: v1.0-alpha launch (Feb 24)
- Status: On track, 92% confidence

### Active Blockers

- (none)

### Role States (last 10 cycles)

[current role state entries]

### Active Threads

[unresolved cross-role threads]

## ⚡ Quick Reference (stable, rarely changes)

### Architecture Decisions

[ADR table — stays hot due to high kindWeight]

### Key Lessons

[Top lessons by importance score]

---

_Warm memory: 47 entries in vector store_
_Cold memory: 3 archives (bank-v1, v2, v3)_
```

### Warm Memory Store

The warm tier uses the embedding infrastructure from PLAT-001:

```typescript
interface WarmMemoryStore {
  // Existing VectorStore interface
  upsert(entries: EmbeddedEntry[]): Promise<void>;
  search(query: Embedding, topK: number): Promise<SearchResult[]>;

  // New lifecycle methods
  trackAccess(entryId: string, cycle: number): Promise<void>;
  getImportance(entryId: string): Promise<MemoryImportance>;
  demoteToCold(entryIds: string[]): Promise<void>;
  promoteToHot(entryIds: string[]): Promise<MemoryEntry[]>;
}
```

### Lifecycle Manager

New component orchestrating tier transitions:

```typescript
class MemoryLifecycleManager {
  constructor(
    private bank: MemoryBank, // Hot tier
    private warm: WarmMemoryStore, // Warm tier
    private cold: ColdArchiveStore, // Cold tier
    private config: LifecycleConfig
  ) {}

  // Run at end of each dispatch cycle
  async runCycle(currentCycle: number): Promise<LifecycleReport> {
    // 1. Identify hot entries that should demote
    const demotable = await this.findDemotableHotEntries(currentCycle);

    // 2. Identify warm entries that should promote or demote
    const promotable = await this.findPromotableWarmEntries(currentCycle);
    const coldable = await this.findColdableWarmEntries(currentCycle);

    // 3. Identify cold entries that should be forgotten
    const forgettable = await this.findForgettableEntries(currentCycle);

    // 4. Execute transitions
    await this.executeTransitions({
      demotable,
      promotable,
      coldable,
      forgettable,
    });

    return this.generateReport();
  }
}
```

---

## Integration with Dispatch Protocol

### Phase 1 (Context Load) Changes

**Current flow:**

1. Read entire `bank.md`

**New flow:**

1. Read hot tier from `bank.md` (trimmed, ~2k tokens)
2. Query warm tier: semantic search for task-relevant memories (~500 tokens)
3. Combine into context window

**Token budget per cycle:**

- Hot tier: ~2,000 tokens (fixed)
- Warm retrieval: ~500 tokens (top-5 × 100 tokens avg)
- Total: ~2,500 tokens (down from ~4,000 currently)
- **Savings: 37.5%** with better relevance

### Phase 4 (Memory Update) Changes

**Current flow:**

1. Update bank.md sections

**New flow:**

1. Update hot tier entries
2. Track access for any warm entries retrieved this cycle
3. Run lifecycle manager at end of cycle (async, non-blocking)

### Phase 5 (Compression Check) Changes

**Current flow:**

1. If bank > 200 lines: compress

**New flow:**

1. If hot tier > 150 lines: demote oldest non-essential entries to warm
2. Compression becomes "rebalancing" — tier-aware, not all-or-nothing
3. Manual full-archive still available: `ada memory compress --full`

---

## CLI Integration

New commands for Phase 2 of Issue #52:

```bash
# Show tier distribution
ada memory stats
# Output includes:
#   Hot: 45 entries (2.1k tokens)
#   Warm: 47 entries (indexed)
#   Cold: 3 archives
#   Health: ✅ Balanced

# Force lifecycle evaluation
ada memory gc
# Runs lifecycle manager, reports transitions

# Promote entry back to hot
ada memory promote ADR-001

# Search across all tiers (cold + warm)
ada memory search "authentication" --all-tiers
```

---

## Implementation Phases

### Phase 3.1: Importance Tracking (2 cycles)

- Add `importance.json` tracking file
- Track access counts during semantic retrieval
- Compute importance scores

### Phase 3.2: Warm → Cold Demotion (2 cycles)

- Implement `demoteToCold()` in vector store
- Create archive format for cold entries
- Add `--all-tiers` flag to search

### Phase 3.3: Hot → Warm Demotion (3 cycles)

- Bank rewriter: split hot/warm sections
- Implement `demoteToWarm()` for bank entries
- Update DISPATCH.md to read split format

### Phase 3.4: Promotion & Forgetting (2 cycles)

- Implement promotion from warm to hot
- Implement forgetting with backup safety
- Add `ada memory gc` command

### Phase 3.5: Integration & Testing (2 cycles)

- End-to-end lifecycle tests
- Performance benchmarks
- Documentation update

**Total: 11 cycles (~2 weeks at current velocity)**

---

## Consequences

### Positive

- **Token efficiency:** 37%+ reduction in context tokens per cycle
- **Better relevance:** Active memories surface, stale ones fade
- **Infinite scaling:** Memory grows indefinitely without token explosion
- **Human-readable hot tier:** bank.md stays clean and focused
- **No information loss:** Cold archives preserve everything

### Negative

- **Complexity:** Three-tier system is more complex than flat file
- **Latency:** Warm retrieval adds ~50ms per cycle (acceptable)
- **State management:** importance.json adds another state file to manage
- **Cold tier is harder to search:** Requires explicit flag, not auto-retrieved

### Neutral

- **Backwards compatible:** Old bank.md format still works (everything starts hot)
- **Gradual adoption:** Can enable per-role or per-project
- **Config-driven thresholds:** All cycle counts are configurable

---

## Alternatives Considered

### 1. LRU Cache Only

Simple recency-based eviction. Rejected because:

- Doesn't account for importance (would evict ADR-001)
- No semantic retrieval, just FIFO

### 2. Single Vector Store (No Hot Tier)

Everything in embeddings, no markdown. Rejected because:

- Loses human readability
- Semantic search adds latency to every read
- Current sprint context is always needed — no point embedding it

### 3. External Memory Service

Dedicated memory server (Redis, separate process). Rejected because:

- Adds operational complexity
- ADA is a CLI tool — should work standalone
- SQLite-vec handles persistence needs

---

## Success Metrics

| Metric                      | Current    | Target     | Measurement                       |
| --------------------------- | ---------- | ---------- | --------------------------------- |
| Context tokens/cycle        | ~4,000     | <2,500     | Count tokens in loadContext()     |
| Retrieval relevance         | N/A        | >85%       | Manual audit of retrieved entries |
| Lifecycle overhead          | N/A        | <100ms     | Benchmark runCycle()              |
| Hot tier size               | ~200 lines | <100 lines | Line count                        |
| Forgotten entries recovered | N/A        | <1%        | Track promotion from cold         |

---

## Open Questions

1. **Threshold tuning:** Are 10/50/200 cycles the right thresholds? May need adjustment based on project velocity.

2. **Cross-project learning:** Should high-importance lessons propagate to new ADA projects? (Future: shared embedding space)

3. **Role-specific importance:** Should each role have its own importance view? (e.g., Engineering cares more about architecture decisions)

4. **Backpressure on warm tier:** What if vector store grows unbounded? May need periodic compaction.

---

## References

- PLAT-001: Embedding-Based Memory Retrieval System
- Issue #17: Sophisticated memory retrieval with embeddings
- Issue #52: `ada memory` Phase 2 — stats, filters, export
- R-002: Compression Protocol (to be updated)

---

_ADR by 🌌 The Frontier — Cycle 80_
_Phase 3 of Issue #17: Memory Lifecycle_
