# Cognitive Memory Implementation Plan

> **Author:** 🌌 The Frontier | **Cycle:** 816 | **Date:** 2026-02-17
> **Related Issues:** #113 (Cognitive Memory Architecture), #180 (SQLite Warm Tier)
> **Sprint Target:** Sprint 3 (Mar 1-14)

---

## Executive Summary

This document translates the Cognitive Memory research (#113) into actionable implementation specifications for Sprint 3. It defines the SQLite-based warm memory tier (#180), heat scoring algorithm, and API design that Engineering can implement.

**Goal:** Replace flat JSON memory files with a tiered, heat-scored memory system that reduces hallucination and improves retrieval relevance.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     COGNITIVE MEMORY SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    🔥 HOT TIER (Working)                    │ │
│  │                    In-Memory (LRU Cache)                    │ │
│  │                    < 100 items, instant access              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ▲ ▼                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   🟠 WARM TIER (Active)                     │ │
│  │                   SQLite + sqlite-vec                       │ │
│  │                   ~10K items, <50ms retrieval               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ▲ ▼                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   🧊 COLD TIER (Archive)                    │ │
│  │                   Compressed JSON / SQLite                  │ │
│  │                   Unlimited, explicit recall only           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   📛 INNATE TIER (Protected)                │ │
│  │                   Static files (SOUL.md, RULES.md, etc.)    │ │
│  │                   Cannot be overwritten by learned memory   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. SQLite Database Schema (#180)

### Core Tables

```sql
-- Main memory entries table
CREATE TABLE memory_entries (
    id TEXT PRIMARY KEY,                    -- UUID
    content TEXT NOT NULL,                  -- The memory content
    entry_type TEXT NOT NULL,               -- 'observation' | 'decision' | 'lesson' | 'context'
    source TEXT NOT NULL,                   -- 'dispatch' | 'user' | 'system' | 'compression'
    role TEXT,                              -- Role that created it (nullable for system)
    cycle INTEGER,                          -- Dispatch cycle number

    -- Heat scoring fields
    heat_score REAL DEFAULT 0.5,            -- Current heat score (0.0 - 1.0)
    base_importance REAL DEFAULT 0.5,       -- Initial importance (0.0 - 1.0)
    reference_count INTEGER DEFAULT 0,      -- Times retrieved/referenced
    last_referenced_at TEXT,                -- ISO timestamp of last retrieval

    -- Timestamps
    created_at TEXT NOT NULL,               -- ISO timestamp
    updated_at TEXT NOT NULL,               -- ISO timestamp

    -- Tier management
    tier TEXT DEFAULT 'warm',               -- 'hot' | 'warm' | 'cold'
    promoted_at TEXT,                       -- When promoted to higher tier
    demoted_at TEXT                         -- When demoted to lower tier
);

-- Vector embeddings for semantic search (sqlite-vec)
CREATE VIRTUAL TABLE memory_embeddings USING vec0(
    id TEXT PRIMARY KEY,
    embedding FLOAT[384]                    -- all-MiniLM-L6-v2 dimension
);

-- Reference tracking (which memories cite which)
CREATE TABLE memory_references (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,                -- Memory that made the reference
    target_id TEXT NOT NULL,                -- Memory that was referenced
    reference_type TEXT NOT NULL,           -- 'retrieval' | 'citation' | 'update'
    cycle INTEGER,                          -- When the reference was made
    created_at TEXT NOT NULL,
    FOREIGN KEY (source_id) REFERENCES memory_entries(id),
    FOREIGN KEY (target_id) REFERENCES memory_entries(id)
);

-- Heat score history for analytics
CREATE TABLE heat_history (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL,
    heat_score REAL NOT NULL,
    recorded_at TEXT NOT NULL,
    FOREIGN KEY (memory_id) REFERENCES memory_entries(id)
);

-- Indexes for performance
CREATE INDEX idx_entries_heat ON memory_entries(heat_score DESC);
CREATE INDEX idx_entries_tier ON memory_entries(tier);
CREATE INDEX idx_entries_type ON memory_entries(entry_type);
CREATE INDEX idx_entries_role ON memory_entries(role);
CREATE INDEX idx_entries_cycle ON memory_entries(cycle DESC);
CREATE INDEX idx_refs_source ON memory_references(source_id);
CREATE INDEX idx_refs_target ON memory_references(target_id);
```

### Database Location

```
{repo_root}/
├── .ada/
│   ├── memory.db          # SQLite database (warm + cold tiers)
│   ├── memory.db-wal      # Write-ahead log
│   └── memory.db-shm      # Shared memory
```

---

## 2. Heat Scoring Algorithm (#113)

### Formula

```typescript
function calculateHeatScore(entry: MemoryEntry): number {
  const now = Date.now();

  // Recency factor: exponential decay over 7 days
  const hoursSinceReference = entry.lastReferencedAt
    ? (now - new Date(entry.lastReferencedAt).getTime()) / (1000 * 60 * 60)
    : (now - new Date(entry.createdAt).getTime()) / (1000 * 60 * 60);
  const recencyFactor = Math.exp(-hoursSinceReference / 168); // 168 hours = 7 days

  // Reference boost: logarithmic scaling (diminishing returns)
  const referenceBoost = Math.log10(entry.referenceCount + 1) / 3; // max ~0.33 at 1000 refs

  // Combine factors
  const rawScore = entry.baseImportance * recencyFactor + referenceBoost;

  // Normalize to 0.0 - 1.0
  return Math.min(1.0, Math.max(0.0, rawScore));
}
```

### Tier Thresholds

| Tier    | Heat Range  | Max Items | Promotion Trigger       | Demotion Trigger    |
| ------- | ----------- | --------- | ----------------------- | ------------------- |
| 🔥 Hot  | ≥ 0.75      | 100       | heat ≥ 0.75 + LRU space | heat < 0.70 for 24h |
| 🟠 Warm | 0.25 - 0.75 | 10,000    | —                       | heat < 0.20 for 7d  |
| 🧊 Cold | < 0.25      | Unlimited | explicit recall         | —                   |

### Heat Update Events

```typescript
type HeatEvent =
  | { type: 'retrieval'; boost: 0.1 } // Memory was retrieved in search
  | { type: 'citation'; boost: 0.15 } // Memory was explicitly cited
  | { type: 'update'; boost: 0.2 } // Memory was updated/appended
  | { type: 'dispatch_use'; boost: 0.25 }; // Memory influenced a dispatch action
```

---

## 3. Innate Memory System (#113)

### Definition

**Innate memory** = protected knowledge that cannot be overwritten by learned experience.

### Innate Sources (Static Files)

```typescript
const INNATE_SOURCES = [
  'agents/rules/RULES.md', // Operational rules
  'agents/roster.json', // Team structure
  'agents/playbooks/*.md', // Role playbooks
  'CONTRIBUTING.md', // Contribution guidelines
  '.github/PULL_REQUEST_TEMPLATE.md', // PR template
] as const;
```

### Innate vs Learned Boundaries

| Property           | Innate Memory | Learned Memory   |
| ------------------ | ------------- | ---------------- |
| Source             | Static files  | Dispatch cycles  |
| Mutability         | Read-only     | Read-write       |
| Heat Score         | Always 1.0    | 0.0 - 1.0        |
| Tier               | Always hot    | Hot/Warm/Cold    |
| Override           | Never         | By newer entries |
| Retrieval Priority | First         | After innate     |

### Loading Innate Memory

```typescript
async function loadInnateMemory(repoRoot: string): Promise<InnateMemory> {
  const innate: InnateMemory = {
    rules: await parseRulesFile(path.join(repoRoot, 'agents/rules/RULES.md')),
    roster: await loadRoster(path.join(repoRoot, 'agents/roster.json')),
    playbooks: await loadPlaybooks(path.join(repoRoot, 'agents/playbooks')),
    templates: await loadTemplates(path.join(repoRoot, '.github')),
  };
  return Object.freeze(innate); // Immutable
}
```

---

## 4. TypeScript API Design

### Core Types

```typescript
// packages/core/src/memory/types.ts

export type MemoryTier = 'hot' | 'warm' | 'cold';
export type MemoryType = 'observation' | 'decision' | 'lesson' | 'context';
export type MemorySource = 'dispatch' | 'user' | 'system' | 'compression';

export interface MemoryEntry {
  id: string;
  content: string;
  entryType: MemoryType;
  source: MemorySource;
  role?: string;
  cycle?: number;

  // Heat scoring
  heatScore: number;
  baseImportance: number;
  referenceCount: number;
  lastReferencedAt?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Tier
  tier: MemoryTier;
  promotedAt?: string;
  demotedAt?: string;
}

export interface MemoryQuery {
  query: string; // Semantic search query
  tier?: MemoryTier | 'all'; // Filter by tier (default: 'all')
  types?: MemoryType[]; // Filter by entry types
  roles?: string[]; // Filter by roles
  minHeat?: number; // Minimum heat score
  limit?: number; // Max results (default: 10)
  includeCold?: boolean; // Include cold tier (default: false)
}

export interface MemoryResult {
  entry: MemoryEntry;
  score: number; // Semantic similarity score
  highlights?: string[]; // Relevant excerpts
}
```

### Service Interface

```typescript
// packages/core/src/memory/cognitive-memory.ts

export interface CognitiveMemoryService {
  // Core CRUD
  store(content: string, options: StoreOptions): Promise<MemoryEntry>;
  retrieve(id: string): Promise<MemoryEntry | null>;
  update(id: string, content: string): Promise<MemoryEntry>;
  delete(id: string): Promise<void>;

  // Semantic search
  search(query: MemoryQuery): Promise<MemoryResult[]>;

  // Heat management
  recordReference(id: string, event: HeatEvent): Promise<void>;
  getHeatScore(id: string): Promise<number>;

  // Tier management
  promoteTier(id: string): Promise<void>;
  demoteTier(id: string): Promise<void>;
  runTierMaintenance(): Promise<TierMaintenanceResult>;

  // Innate memory
  getInnate(): Promise<InnateMemory>;

  // Analytics
  getStats(): Promise<MemoryStats>;
  getHeatDistribution(): Promise<HeatDistribution>;
}
```

### CLI Commands

```bash
# Search memory
ada memory search "reflexion" --min-heat 0.5 --limit 5

# View heat distribution
ada memory heat

# Tier maintenance
ada memory maintain

# Promote/demote specific entry
ada memory promote <id>
ada memory demote <id>

# Export memory stats
ada memory stats --json
```

---

## 5. Migration Path (JSON → SQLite)

### Phase 1: Parallel Operation (Sprint 3, Week 1-2)

```
bank.md (existing) ←──read──→ CognitiveMemoryService ←──write──→ memory.db (new)
```

- Continue reading from `bank.md` for dispatch
- Write all new entries to SQLite
- Sync on each dispatch cycle

### Phase 2: Primary Switch (Sprint 3, Week 3)

```
memory.db (primary) ←──────→ CognitiveMemoryService ──────→ bank.md (backup export)
```

- SQLite becomes primary storage
- `bank.md` generated as human-readable export
- Existing compressions become cold tier imports

### Migration Script

```typescript
// packages/cli/src/commands/memory/migrate.ts

async function migrateToSQLite(
  bankPath: string,
  dbPath: string
): Promise<MigrationResult> {
  // 1. Parse existing bank.md
  const entries = await parseBankMarkdown(bankPath);

  // 2. Assign initial heat scores based on section
  const scoredEntries = entries.map(entry => ({
    ...entry,
    baseImportance: getSectionImportance(entry.section),
    heatScore: calculateInitialHeat(entry),
  }));

  // 3. Generate embeddings
  const embeddings = await generateEmbeddings(scoredEntries);

  // 4. Insert into SQLite
  await insertEntries(dbPath, scoredEntries, embeddings);

  // 5. Import archived compressions as cold tier
  await importArchives(dbPath, 'agents/memory/archives/');

  return {
    entriesImported: scoredEntries.length,
    archivesImported: archiveCount,
  };
}
```

### Backward Compatibility

```typescript
// Feature flag during migration
const USE_COGNITIVE_MEMORY = process.env.ADA_COGNITIVE_MEMORY === 'true';

export function getMemoryService(repoRoot: string): MemoryService {
  if (USE_COGNITIVE_MEMORY) {
    return new CognitiveMemoryService(repoRoot);
  }
  return new LegacyBankMemoryService(repoRoot); // Current implementation
}
```

---

## 6. Implementation Roadmap

### Sprint 3, Week 1 (Mar 1-7)

| Task                              | Owner       | Depends On |
| --------------------------------- | ----------- | ---------- |
| Create SQLite schema + migrations | Engineering | —          |
| Implement `MemoryEntry` types     | Engineering | —          |
| Add sqlite-vec embedding support  | Frontier    | Schema     |
| Heat scoring algorithm            | Engineering | Types      |
| Unit tests for heat calculation   | QA          | Algorithm  |

### Sprint 3, Week 2 (Mar 8-14)

| Task                                  | Owner       | Depends On |
| ------------------------------------- | ----------- | ---------- |
| CognitiveMemoryService implementation | Engineering | Week 1     |
| CLI commands (search, heat, maintain) | Engineering | Service    |
| Migration script (bank.md → SQLite)   | Frontier    | Service    |
| E2E tests for memory operations       | QA          | CLI        |
| Performance benchmarks                | QA          | Service    |

### Post-Sprint 3

| Task                            | Owner    | Depends On     |
| ------------------------------- | -------- | -------------- |
| Primary switch to SQLite        | Ops      | Sprint 3       |
| Innate memory protection        | Frontier | Service        |
| Heat visualization in dashboard | Design   | #120 Dashboard |
| Network graph of memory refs    | Design   | Service        |

---

## 7. Success Metrics

| Metric                   | Current            | Target          | How to Measure    |
| ------------------------ | ------------------ | --------------- | ----------------- |
| Memory retrieval latency | ~100ms (file read) | <50ms           | Benchmark suite   |
| Relevant retrieval rate  | ~60% (keyword)     | >85% (semantic) | Manual evaluation |
| Memory size on disk      | ~500KB (bank.md)   | <10MB (SQLite)  | File size         |
| Cold tier retrieval rate | 0% (no cold tier)  | <5% of queries  | Analytics         |

---

## 8. Dependencies

### npm Packages

```json
{
  "better-sqlite3": "^9.4.0",
  "sqlite-vec": "^0.1.0",
  "@xenova/transformers": "^2.15.0" // For local embeddings (all-MiniLM-L6-v2)
}
```

### Why Local Embeddings?

- No API costs per embedding
- Works offline (critical for dispatch)
- ~23ms per embedding (acceptable for batch)
- 384-dimensional vectors (efficient storage)

---

## 9. Acceptance Criteria

- [ ] SQLite database schema created and migrations work
- [ ] Heat scoring algorithm implemented with unit tests
- [ ] `ada memory search` returns semantic results from SQLite
- [ ] `ada memory heat` shows heat distribution
- [ ] Migration from bank.md → SQLite successful
- [ ] Performance: <50ms retrieval for warm tier
- [ ] Backward compatible: existing dispatch works during migration
- [ ] Innate memory sources identified and protected

---

## Related Documents

- [#113 Cognitive Memory Architecture](https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/113) — Research foundation
- [#180 SQLite Warm Tier](https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/180) — Implementation issue
- [C806 Sprint 3 Implementation Architecture](../sprint3-implementation-architecture-c806.md) — SaaS blueprint
- [PLAT-002 Memory Lifecycle ADR](../../architecture/decisions/) — Architecture decision (pending)

---

_"Memory is not what we remember, but what retrieval tells us is important."_
