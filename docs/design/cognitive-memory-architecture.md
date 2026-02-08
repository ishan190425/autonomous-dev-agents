# 🧠 Cognitive Memory Architecture for ADA

> **Design Specification — Issue #95 (Cognitive Memory Architecture)**  
> **Synthesizes:** Generative Agents (Park et al.) + MemGPT (Packer et al.)  
> **Status:** PROPOSAL  
> **Created:** 2026-02-08 | **Author:** 🌌 The Frontier  
> **Related:** Issue #91 (Memory System), Issue #95 (Research)

---

## Executive Summary

This document proposes a cognitive memory architecture for ADA that synthesizes two landmark papers:

- **Generative Agents** → What to remember (importance scoring, reflection, memory stream)
- **MemGPT** → How to manage memory (tiered storage, agent-controlled paging, self-modification)

The result is a three-tier memory system where agents actively manage their own memory through function calls, with structured retrieval and periodic reflection cycles.

**Key architectural principles:**

1. **Agent-controlled memory** — The LLM decides what to retrieve, not passive RAG
2. **Tiered storage** — Core (always in context) → Recall (recent cycles) → Archival (long-term)
3. **Self-modification** — Agents can update their own state and insights
4. **Importance-weighted retrieval** — Recency × importance × relevance scoring
5. **Reflective consolidation** — Periodic synthesis of insights from raw events

---

## 1. Problem Statement

### Current State: bank.md

ADA's current memory is a flat markdown file (`agents/memory/bank.md`):

```
┌─────────────────────────────────────────────────────────────┐
│                     CURRENT: bank.md                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  • Unstructured markdown document (~200 lines)               │
│  • Manually compressed when it grows too large               │
│  • No importance scoring — everything is equal               │
│  • No retrieval — agents load the entire file                │
│  • No self-modification — agents can't update structure      │
│  • No episodic memory — cycles blur together                 │
│  • Single-pass read — no iterative lookup                    │
│                                                              │
│  Scaling limit: ~200 lines before context saturation         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### The Problem

At 188 cycles and growing:

1. **Context saturation** — Loading full bank.md consumes 15-20% of context window
2. **No relevance filtering** — Agent sees everything, even irrelevant history
3. **Passive loading** — Agent can't decide what's worth remembering
4. **No cross-cycle retrieval** — "What did Research do in Cycle 150?" is impossible
5. **No self-evolution** — Agents can't learn or update their own playbooks

### The Goal

A memory system where:

- Agents actively manage their own memory
- Relevant context is retrieved on demand
- Lessons compound over time through reflection
- Storage scales beyond 200 lines without quality degradation

---

## 2. Proposed Architecture

### 2.1 Three-Tier Memory Model

Combining Generative Agents' cognitive model with MemGPT's OS-inspired tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADA COGNITIVE MEMORY SYSTEM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   TIER 1: CORE MEMORY                                                        │
│   ═══════════════════                                                        │
│   📍 Location: Always in context window (~10k tokens reserved)               │
│   🔄 Mutability: WRITABLE by agent via memory functions                      │
│                                                                              │
│   ┌──────────────────┬──────────────────┬──────────────────┐                │
│   │    📋 Playbook    │   📊 Status      │   🔗 Threads     │                │
│   │    (my role)      │   (current       │   (active deps,  │                │
│   │                   │    sprint)       │    blockers)     │                │
│   └──────────────────┴──────────────────┴──────────────────┘                │
│                                 │                                            │
│                                 ▼                                            │
│   TIER 2: RECALL MEMORY                                                      │
│   ════════════════════                                                       │
│   📍 Location: JSONL stream file (agents/memory/stream.jsonl)                │
│   📏 Capacity: Last 100 cycles (~50k tokens stored, ~5k retrieved)           │
│   🔍 Access: Agent-controlled via recall_search(), recall_by_cycle()         │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  {"cycle": 188, "role": "research", "action": "MemGPT analysis",    │   │
│   │   "importance": 8, "tags": ["memory", "architecture"], ...}         │   │
│   │  {"cycle": 187, "role": "growth", "action": "Demo prep", ...}       │   │
│   │  ...                                                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│                                 ▼                                            │
│   TIER 3: ARCHIVAL MEMORY                                                    │
│   ═══════════════════════                                                    │
│   📍 Location: Vector-indexed storage (embeddings + raw content)             │
│   📏 Capacity: Unlimited (all history, all docs)                             │
│   🔍 Access: Agent-controlled via archival_search()                          │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  • Compressed bank.md versions (archives/)                          │   │
│   │  • Old cycle streams (> 100 cycles ago)                             │   │
│   │  • ADRs and key decisions (docs/decisions/)                         │   │
│   │  • Research docs and specs (docs/research/, docs/design/)           │   │
│   │  • Lessons learned (semantic memory)                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   REFLECTION LAYER (Generative Agents-inspired)                              │
│   ─────────────────                                                          │
│   📍 Trigger: Every 10 cycles OR sum(importance) > 100 OR sprint boundary    │
│   🔄 Process: Synthesize recent memories → Generate insights → Add to stream │
│   📊 Output: High-importance reflection entries (importance: 9-10)           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Memory Flow

```
                        DISPATCH CYCLE (with memory)
                        ════════════════════════════

    ┌─────────────────────────────────────────────────────────────────┐
    │  1. CONTEXT LOAD                                                 │
    │     • Load core memory (always)                                  │
    │     • Agent receives: playbook + status + active threads         │
    └───────────────────────────────────┬─────────────────────────────┘
                                        │
                                        ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │  2. MEMORY RETRIEVAL (Agent-Controlled)                          │
    │     • Agent MAY call recall_search("what's blocking #84?")       │
    │     • Agent MAY call archival_search("headless mode decisions")  │
    │     • Agent MAY call recall_by_cycle(180, 185)                   │
    │     • Zero or more lookups based on task needs                   │
    └───────────────────────────────────┬─────────────────────────────┘
                                        │
                                        ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │  3. ACTION (One per cycle)                                       │
    │     • Create issue / PR / comment                                │
    │     • Write docs                                                 │
    │     • Merge PR                                                   │
    │     • etc.                                                       │
    └───────────────────────────────────┬─────────────────────────────┘
                                        │
                                        ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │  4. MEMORY UPDATE (Agent-Controlled)                             │
    │     • Log action to stream with importance score                 │
    │     • MAY update core memory (status, threads)                   │
    │     • MAY add lesson learned                                     │
    └───────────────────────────────────┬─────────────────────────────┘
                                        │
                                        ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │  5. REFLECTION CHECK                                             │
    │     • If trigger condition met → run reflection                  │
    │     • Synthesize recent memories → generate insights             │
    │     • Add high-importance reflection to stream                   │
    └─────────────────────────────────────────────────────────────────┘
```

---

## 3. Memory Structures

### 3.1 Core Memory (Tier 1)

**Purpose:** Always-available context that defines current state and role.

**Structure:**

```typescript
interface CoreMemory {
  // Static (loaded from files, rarely changes)
  playbook: string; // Role's playbook content
  rules: string; // RULES.md summary

  // Dynamic (agent-updateable)
  status: {
    sprint: string; // Current sprint goal
    inProgress: string[]; // Active work items
    blockers: string[]; // Current blockers
    recentlyShipped: string[]; // Last 5 merged PRs
  };

  threads: {
    id: string;
    summary: string;
    roles: string[]; // Roles involved
    lastUpdate: string; // ISO timestamp
  }[];

  roleState: {
    lastAction: string;
    nextAction: string;
    workingOn: string;
  };
}
```

**Token budget:** ~10,000 tokens reserved in context window.

**Update mechanism:** Agent calls `core_memory_update(section, content)`.

### 3.2 Recall Memory (Tier 2)

**Purpose:** Searchable history of recent cycles.

**Storage format:** JSONL (one entry per cycle/event)

**Location:** `agents/memory/stream.jsonl`

**Entry schema:**

```typescript
interface MemoryEntry {
  // Identification
  id: string; // UUID
  cycle: number; // Dispatch cycle number
  timestamp: string; // ISO timestamp

  // Source
  role: string; // Which role acted
  action: string; // What they did (summary)

  // Generative Agents-inspired
  importance: number; // 1-10 scale (LLM-assigned at creation)

  // Categorization
  type: 'action' | 'observation' | 'reflection' | 'decision';
  tags: string[]; // Semantic tags (e.g., ["memory", "pr", "issue-84"])

  // References
  issueRefs: number[]; // Issue numbers mentioned
  prRefs: number[]; // PR numbers mentioned

  // Full content
  content: string; // Detailed description

  // Metadata
  tokenEstimate: number; // Estimated tokens for retrieval budgeting
}
```

**Example entries:**

```jsonl
{"id":"abc123","cycle":188,"timestamp":"2026-02-08T13:23:00Z","role":"research","action":"MemGPT Literature Review","importance":8,"type":"action","tags":["memory","research","architecture"],"issueRefs":[95],"prRefs":[],"content":"Created docs/research/memgpt-analysis.md. Deep analysis of MemGPT paper showing tiered memory (core/recall/archival) and agent-controlled paging. Synthesized with Generative Agents for unified architecture proposal.","tokenEstimate":85}
{"id":"def456","cycle":187,"timestamp":"2026-02-08T13:05:00Z","role":"growth","action":"Demo Day Metrics Refresh","importance":6,"type":"action","tags":["demo","marketing"],"issueRefs":[39],"prRefs":[],"content":"Updated demo materials with current metrics: 186 cycles, 32 PRs, 676 tests, 83 docs.","tokenEstimate":45}
```

**Retrieval scoring (Generative Agents formula):**

```
score = α·recency(entry) + β·importance(entry) + γ·relevance(entry, query)

Where:
  recency(e) = exp(-λ·(now - e.timestamp))  // Exponential decay
  importance(e) = e.importance / 10          // Normalized 0-1
  relevance(e, q) = cosine_similarity(embed(e.content), embed(q))

  α = 1.0, β = 1.0, γ = 1.0  // Tunable weights
  λ = 0.995                   // Decay rate (~30% weight at 100 cycles ago)
```

**Retention policy:** Keep last 100 cycles in recall; older entries move to archival.

### 3.3 Archival Memory (Tier 3)

**Purpose:** Long-term, semantically-searchable storage.

**Storage:** Vector database (ChromaDB, SQLite-vec, or embedded FAISS)

**Contents:**

| Content Type      | Source                     | Indexing            |
| ----------------- | -------------------------- | ------------------- |
| Old cycle entries | stream.jsonl overflow      | Embedded + metadata |
| Bank archives     | archives/bank-\*.md        | Embedded chunks     |
| ADRs              | docs/decisions/\*.md       | Embedded full docs  |
| Research          | docs/research/\*.md        | Embedded chunks     |
| Specs             | docs/design/\*.md          | Embedded chunks     |
| Lessons           | Extracted from reflections | Embedded + tags     |

**Entry schema:**

```typescript
interface ArchivalEntry {
  id: string;
  source: string; // File path or "stream"
  content: string; // Raw text content
  embedding: number[]; // Vector embedding
  metadata: {
    type: 'cycle' | 'decision' | 'research' | 'spec' | 'lesson';
    date: string;
    roles?: string[];
    issues?: number[];
    importance?: number;
  };
}
```

---

## 4. Memory Functions

Agent-callable tools for memory management (MemGPT-inspired):

### 4.1 Recall Functions

```typescript
/**
 * Search recent cycles by semantic query
 * Returns top-k entries sorted by recency × importance × relevance
 */
function recall_search(
  query: string,
  options?: {
    role?: string; // Filter by role
    issue?: number; // Filter by issue reference
    minImportance?: number; // Minimum importance (1-10)
    limit?: number; // Max results (default: 5)
    cycleRange?: [number, number]; // Cycle range filter
  }
): MemoryEntry[];

/**
 * Get entries for specific cycle range
 */
function recall_by_cycle(
  startCycle: number,
  endCycle: number,
  options?: {
    role?: string;
    minImportance?: number;
  }
): MemoryEntry[];
```

### 4.2 Archival Functions

```typescript
/**
 * Semantic search over long-term memory
 */
function archival_search(
  query: string,
  options?: {
    type?: 'cycle' | 'decision' | 'research' | 'spec' | 'lesson';
    dateRange?: [string, string]; // ISO dates
    limit?: number; // Max results (default: 5)
  }
): ArchivalEntry[];

/**
 * Insert new entry into archival memory
 * (Primarily used by reflection layer)
 */
function archival_insert(
  content: string,
  metadata: {
    type: ArchivalEntry['metadata']['type'];
    roles?: string[];
    issues?: number[];
    importance?: number;
  }
): void;
```

### 4.3 Core Memory Functions

```typescript
/**
 * Update a section of core memory
 * Agent can modify their own state
 */
function core_memory_update(
  section: 'status' | 'threads' | 'roleState' | 'lessons',
  content: string | object
): void;

/**
 * Append to a list section (e.g., adding a new thread)
 */
function core_memory_append(
  section: 'threads' | 'recentlyShipped' | 'blockers',
  item: object
): void;
```

### 4.4 Logging Function

```typescript
/**
 * Log current action to memory stream
 * Called at end of every dispatch cycle
 */
function memory_log(entry: {
  action: string;
  importance: number; // Agent self-rates 1-10
  type: 'action' | 'observation' | 'decision';
  tags: string[];
  content: string;
  issueRefs?: number[];
  prRefs?: number[];
}): void;
```

---

## 5. Reflection Mechanism

### 5.1 Trigger Conditions

Reflection runs when ANY of:

1. **Importance threshold:** `sum(importance of unprocessed entries) > 100`
2. **Cycle count:** 10 cycles since last reflection
3. **Sprint boundary:** Sprint ends or starts
4. **Manual trigger:** Human requests reflection

### 5.2 Reflection Process

```
┌─────────────────────────────────────────────────────────────────┐
│                       REFLECTION CYCLE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. GATHER                                                       │
│     • Retrieve all entries since last reflection                 │
│     • Filter to importance >= 5                                  │
│     • Retrieve related archival context                          │
│                                                                  │
│  2. PROMPT                                                       │
│     "Given these recent memories, generate 3-5 high-level        │
│      insights. Focus on:                                         │
│      - Patterns you notice                                       │
│      - Lessons learned                                           │
│      - Emerging themes                                           │
│      - Cross-role dynamics                                       │
│      - Strategic implications"                                   │
│                                                                  │
│  3. GENERATE                                                     │
│     • LLM produces reflection entries                            │
│     • Each insight rated importance 9-10 (reflections are high)  │
│                                                                  │
│  4. PERSIST                                                      │
│     • Add reflection entries to stream.jsonl                     │
│     • Update archival with synthesized lessons                   │
│     • Update core memory if strategic changes identified         │
│                                                                  │
│  5. RECORD                                                       │
│     • Mark reflection timestamp in state                         │
│     • Reset importance accumulator                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Example Reflection Output

```jsonl
{"id":"refl001","cycle":190,"timestamp":"2026-02-08T15:00:00Z","role":"system","action":"Reflection: Cycles 180-190","importance":9,"type":"reflection","tags":["meta","patterns"],"content":"Pattern: Double-merge cycles (174, 184) are 2x efficient when PRs have pre-approval. Implication: QA+Design review should happen before Ops rotation for faster merges.","tokenEstimate":55}
{"id":"refl002","cycle":190,"timestamp":"2026-02-08T15:00:00Z","role":"system","action":"Reflection: Memory Architecture Research","importance":10,"type":"reflection","tags":["memory","strategic"],"content":"Strategic: Research completed foundational memory work (Generative Agents + MemGPT). This unblocks Sprint 2-3 memory implementation. Priority: Frontier should prototype memory stream before Sprint 2 ends.","tokenEstimate":60}
```

---

## 6. Implementation Roadmap

### Phase 1: Memory Stream (Sprint 2, Weeks 1-2)

**Goal:** Replace append-only bank.md with structured JSONL stream.

**Deliverables:**

1. `MemoryStream` class in `@ada/core`
   - Write entries to `stream.jsonl`
   - Read entries with filtering
   - Basic recency + importance scoring

2. `memory_log()` integration in dispatch
   - Auto-log after every cycle
   - LLM rates importance 1-10

3. Migration script: Extract Role State from bank.md → stream format

**Tests:** Unit tests for stream operations, scoring, filtering

**Acceptance criteria:**

- [ ] Dispatch cycles log to stream.jsonl
- [ ] Can query by role, cycle range, importance
- [ ] Basic relevance scoring works

### Phase 2: Memory Functions (Sprint 2, Weeks 3-4)

**Goal:** Add agent-callable memory tools to dispatch.

**Deliverables:**

1. `MemoryTools` interface
   - `recall_search()` with scoring
   - `recall_by_cycle()`
   - `core_memory_update()`

2. Tool injection into dispatch
   - Agents receive memory tools alongside GitHub tools
   - Tools executed in dispatch loop

3. Updated playbooks: Document memory tool usage for each role

**Tests:** Integration tests for tool calls, retrieval accuracy

**Acceptance criteria:**

- [ ] Agents can call recall_search() during dispatch
- [ ] Retrieved memories appear in context
- [ ] Agents can update core memory sections

### Phase 3: Archival + Vector Search (Sprint 3)

**Goal:** Long-term semantic memory with embeddings.

**Deliverables:**

1. Vector storage integration
   - Evaluate: ChromaDB vs SQLite-vec vs embedded FAISS
   - Implement `ArchivalMemory` class

2. `archival_search()` and `archival_insert()`

3. Automatic archival pipeline
   - Stream entries > 100 cycles → archival
   - Bank archives → archival
   - Docs → archival (on change)

4. Embedding model selection
   - Evaluate: OpenAI ada-002 vs local models (e5, bge)

**Tests:** Retrieval accuracy benchmarks, latency tests

**Acceptance criteria:**

- [ ] archival_search() returns semantically relevant results
- [ ] Old entries automatically archive
- [ ] Docs are searchable

### Phase 4: Reflection Layer (Sprint 3-4)

**Goal:** Periodic synthesis of insights.

**Deliverables:**

1. `ReflectionEngine` class
   - Trigger detection
   - Context gathering
   - Prompt construction
   - Output parsing

2. Reflection scheduling in dispatch
   - Check triggers at cycle end
   - Run reflection async if triggered

3. Insight surfacing
   - High-importance reflections appear in core memory
   - Lessons extracted to semantic memory

**Tests:** Reflection quality evaluation (human review)

**Acceptance criteria:**

- [ ] Reflections generate every ~10 cycles
- [ ] Insights are coherent and actionable
- [ ] Lessons accumulate in archival

### Phase 5: Self-Modification (Sprint 4+)

**Goal:** Agents can evolve their own playbooks and rules.

**Deliverables:**

1. Safe self-modification bounds
   - Allowed: Role state, lessons, threads
   - Proposal required: Playbook changes, rule changes

2. Playbook evolution system
   - Agent proposes change → issue created
   - Human or CEO approves → change applies

3. Rule learning
   - Patterns in failures → proposed rules
   - Ops reviews and codifies

**Tests:** Safety tests (no unauthorized modifications)

**Acceptance criteria:**

- [ ] Agents can safely update allowed sections
- [ ] Playbook proposals create issues
- [ ] No unauthorized self-modification

---

## 7. Design Decisions

### ADR-001: JSONL Over SQLite for Recall

**Context:** Recall memory needs to store cycle entries with fast append and filtered reads.

**Options:**

1. SQLite — Structured, queryable, heavier
2. JSONL — Append-only, simple, git-friendly
3. In-memory only — Fast but volatile

**Decision:** JSONL

**Rationale:**

- Git-friendly (can diff, review changes)
- Append-only matches memory stream semantics
- Simple to implement and debug
- 100 cycles ≈ 1MB, easily loaded
- Can upgrade to SQLite later if needed

### ADR-002: Agent-Controlled vs Automatic Retrieval

**Context:** Should memory retrieval be automatic (RAG-style) or agent-controlled (MemGPT-style)?

**Options:**

1. Automatic — Always retrieve before action
2. Agent-controlled — Agent calls functions
3. Hybrid — Auto-retrieve basics, agent calls for more

**Decision:** Agent-controlled (with minimal auto-load of core memory)

**Rationale:**

- MemGPT shows agents make better retrieval decisions
- Reduces token waste on irrelevant context
- Enables multi-step retrieval (search → refine → search again)
- Agents learn what's worth remembering

### ADR-003: Importance Scoring at Creation vs Retrieval

**Context:** When should importance be assigned — when memory is created or when retrieved?

**Options:**

1. At creation — LLM rates importance immediately
2. At retrieval — Score based on query relevance only
3. Both — Creation importance + retrieval relevance

**Decision:** Both (Generative Agents model)

**Rationale:**

- Creation importance captures inherent significance
- Retrieval relevance captures query-specific utility
- Combined scoring produces best results (per paper)

### ADR-004: Shared vs Per-Role Core Memory

**Context:** Should each role have separate core memory, or share one?

**Options:**

1. Shared — One core memory, all roles see it
2. Per-role — Each role has separate state
3. Hybrid — Shared status, per-role state

**Decision:** Hybrid

**Rationale:**

- Status/threads need to be shared (coordination)
- Role state is role-specific (what I'm doing)
- Avoids conflicts while maintaining coordination
- Matches current bank.md structure

---

## 8. Open Questions

These need resolution before implementation:

1. **Embedding model cost:** OpenAI ada-002 is ~$0.0001/1k tokens. At 100+ entries/day, what's the budget?

2. **Reflection model:** Same model as dispatch, or cheaper model for reflection?

3. **Retrieval latency:** Vector search adds latency. Acceptable threshold?

4. **Cross-repo memory:** If ADA is used on multiple repos, share memory or isolate?

5. **Human override:** Can humans manually add/remove memories?

---

## 9. Success Metrics

| Metric                     | Current | Target                   | Measurement       |
| -------------------------- | ------- | ------------------------ | ----------------- |
| Context tokens for memory  | ~15k    | ~5k (core) + on-demand   | Token counter     |
| Relevant context rate      | Unknown | >80% retrieved is useful | Human eval        |
| Cross-cycle recall         | 0%      | >90% accurate            | Benchmark queries |
| Reflection insight quality | N/A     | 4/5 human rating         | Periodic review   |
| Self-modification safety   | N/A     | 0 unauthorized changes   | Audit log         |

---

## 10. References

- Park, J. S., et al. (2023). _Generative Agents: Interactive Simulacra of Human Behavior_. arXiv:2304.03442
- Packer, C., et al. (2023). _MemGPT: Towards LLMs as Operating Systems_. arXiv:2310.08560
- Related: `docs/research/generative-agents-analysis.md`
- Related: `docs/research/memgpt-analysis.md`
- Issue #95: Cognitive Memory Architecture
- Issue #91: Memory System Implementation

---

_🌌 The Frontier — Cycle 189_
