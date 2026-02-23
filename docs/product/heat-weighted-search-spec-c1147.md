# 📦 Enhanced Memory Search with Heat-Weighted Results

> Feature Specification for Issue #173
> **Author:** 📦 Product (The PM) | **Cycle:** 1147
> **Priority:** P2 | **Target Sprint:** 5 (Mar 29 - Apr 11, 2026)
> **Dependencies:** Heat Scoring (#113), Auto Memory Compression (#172)

---

## Executive Summary

Enhance `ada memory search` to leverage the heat-based memory infrastructure. Currently, search returns results in chronological order without considering relevance or activity level. This spec defines heat-weighted search that surfaces high-importance memories first, with filters for tier, role, cycle range, and memory type.

**Key Outcomes:**

- Search results ranked by heat × semantic relevance (not just recency)
- Filter by tier (hot/warm/cold) to focus searches
- Filter by role, cycle range, and memory type for precision queries
- Rich result formatting with heat indicators and context
- Archived memory search for historical research

---

## Problem Statement

### Current State

**`ada memory search "query"`:**

- Returns semantic matches from SQLite + sqlite-vec
- Results ordered by vector similarity score only
- No heat consideration — cold memories rank equal to hot
- No filtering — must wade through all results
- Basic formatting — entry content only, no metadata

**Issues:**

- **Signal buried in noise:** Agents search for context but get cold memories that haven't been relevant in 50+ cycles
- **No tier awareness:** Can't ask "what hot memories mention OAuth?"
- **No temporal scope:** Can't limit to "last 10 cycles" or "Sprint 3 only"
- **No role filtering:** CEO searching gets Engineering implementation details
- **Verbose output:** Results show full content, not actionable summaries

### Root Cause

Search was built before heat scoring. The infrastructure exists (SqliteMemoryStore has effective_score), but CLI doesn't expose it.

---

## Proposed Solution

### Overview

Heat-weighted search combines semantic similarity with heat score for relevance ranking:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                      HEAT-WEIGHTED SEARCH ARCHITECTURE                         │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│   ada memory search "OAuth" --tier hot --role engineering --last 20           │
│                                                                                │
│   ┌────────────────────────────────────────────────────────────────────────┐  │
│   │  1. PARSE FILTERS                                                      │  │
│   │     tier: hot | role: engineering | cycles: last 20                    │  │
│   └────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                 │
│                              ▼                                                 │
│   ┌────────────────────────────────────────────────────────────────────────┐  │
│   │  2. VECTOR SEARCH (sqlite-vec)                                         │  │
│   │     Embed query → Find top-K similar entries → similarity scores       │  │
│   └────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                 │
│                              ▼                                                 │
│   ┌────────────────────────────────────────────────────────────────────────┐  │
│   │  3. HEAT WEIGHTING                                                     │  │
│   │     composite_score = (similarity * 0.6) + (heat * 0.4)                │  │
│   │     Re-rank by composite_score                                         │  │
│   └────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                 │
│                              ▼                                                 │
│   ┌────────────────────────────────────────────────────────────────────────┐  │
│   │  4. APPLY FILTERS                                                      │  │
│   │     Filter by: tier ∈ {hot} ∧ role = engineering ∧ cycle ≥ (max-20)   │  │
│   └────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                 │
│                              ▼                                                 │
│   ┌────────────────────────────────────────────────────────────────────────┐  │
│   │  5. FORMAT OUTPUT                                                      │  │
│   │     Rich display with heat indicator, role, cycle, summary             │  │
│   └────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Core Behaviors

#### 1. Heat-Weighted Ranking

Results ranked by composite score combining semantic similarity and heat:

```
composite_score = (similarity_score × SIMILARITY_WEIGHT) + (heat_score × HEAT_WEIGHT)

Default weights:
  SIMILARITY_WEIGHT = 0.6  (semantic relevance still primary)
  HEAT_WEIGHT = 0.4        (heat boosts active memories)
```

**Configurable via flags:**

- `--heat-weight 0.7` — Prioritize hot memories more
- `--pure-similarity` — Ignore heat, pure vector search (debugging)

#### 2. Tier Filtering

Filter results by memory tier:

```bash
ada memory search "deployment" --tier hot        # Only hot memories
ada memory search "OAuth" --tier hot,warm        # Hot and warm
ada memory search "legacy" --tier cold           # Only cold (rare use)
```

Tier definitions (from #172):

- 🔥 **Hot** (heat ≥ 0.8): Recent, frequently referenced, active blockers
- 🟠 **Warm** (0.4 ≤ heat < 0.8): Moderately active
- 🧊 **Cold** (heat < 0.4): Inactive, candidates for archival

#### 3. Role Filtering

Filter by originating role:

```bash
ada memory search "API design" --role design
ada memory search "test coverage" --role qa,engineering
ada memory search "metrics" --role ceo,growth
```

Accepts single role or comma-separated list.

#### 4. Cycle Range Filtering

Temporal scoping by cycle:

```bash
ada memory search "sprint planning" --last 20           # Last 20 cycles
ada memory search "authentication" --cycles 1100-1147   # Specific range
ada memory search "launch" --since 1100                 # Since cycle 1100
```

#### 5. Memory Type Filtering

Filter by entry type:

```bash
ada memory search "OAuth" --type action         # Dispatch actions only
ada memory search "tokens" --type decision      # ADR decisions only
ada memory search "blocked" --type blocker      # Blockers only
```

Types: action, decision, blocker, lesson, rule, question, metric

#### 6. Archive Search

Include archived memories:

```bash
ada memory search "2025 strategy" --include-archived
ada memory search "old design" --archived-only   # Only archived
```

Archive search is slower (scans JSONL files) — warn user on large archives.

---

## User Stories

### US1: Heat-Weighted Search Results

**As an** agent searching for context,  
**I want** results weighted by both relevance and activity,  
**So that** hot memories surface above stale matches.

**Acceptance Criteria:**

- [ ] Search results combine similarity (60%) and heat (40%) by default
- [ ] Hot memories with moderate similarity rank above cold memories with high similarity
- [ ] Weight ratios configurable via `--heat-weight` flag
- [ ] `--pure-similarity` flag disables heat weighting

### US2: Tier Filtering

**As an** agent focused on active work,  
**I want** to filter search to hot memories only,  
**So that** I don't wade through cold history.

**Acceptance Criteria:**

- [ ] `--tier hot` returns only entries with heat ≥ 0.8
- [ ] `--tier hot,warm` returns entries with heat ≥ 0.4
- [ ] Invalid tier values rejected with helpful error
- [ ] Tier filter applied after vector search (performance)

### US3: Role-Scoped Search

**As a** role-specific agent,  
**I want** to filter search to my role's memories,  
**So that** I get role-relevant context.

**Acceptance Criteria:**

- [ ] `--role engineering` returns only entries from Engineering role
- [ ] Multiple roles: `--role engineering,qa` returns entries from either
- [ ] Invalid role names rejected with suggestions
- [ ] Case-insensitive role matching

### US4: Temporal Search

**As an** agent researching recent changes,  
**I want** to limit search to recent cycles,  
**So that** I don't get outdated information.

**Acceptance Criteria:**

- [ ] `--last N` returns entries from last N cycles only
- [ ] `--cycles START-END` returns entries in cycle range
- [ ] `--since CYCLE` returns entries from cycle onwards
- [ ] Filters combine: `--last 20 --role engineering`

### US5: Rich Result Formatting

**As a** user scanning search results,  
**I want** results with heat indicators and context,  
**So that** I can quickly assess relevance.

**Acceptance Criteria:**

- [ ] Each result shows: heat tier emoji, role, cycle, summary
- [ ] Composite score shown (for transparency)
- [ ] Content truncated with `...` for readability
- [ ] `--verbose` shows full content
- [ ] `--json` outputs structured JSON for scripting

### US6: Archive Search

**As a** user researching history,  
**I want** to search archived memories,  
**So that** I can find context from before compression.

**Acceptance Criteria:**

- [ ] `--include-archived` adds archived entries to results
- [ ] `--archived-only` searches archives exclusively
- [ ] Archive search warns about performance on large archives
- [ ] Archived results marked with `[archived]` prefix

---

## Technical Design

### 1. Search Options Interface

```typescript
// packages/core/src/memory/types.ts

export interface MemorySearchOptions {
  /** Search query (semantic search) */
  query: string;

  /** Maximum results to return (default: 10) */
  limit?: number;

  /** Minimum similarity threshold (default: 0.3) */
  minSimilarity?: number;

  // === NEW: Heat-weighted options ===

  /** Heat weight in composite score (default: 0.4, range 0-1) */
  heatWeight?: number;

  /** Filter by tier(s) */
  tierFilter?: MemoryTier[];

  /** Filter by role(s) */
  roleFilter?: string[];

  /** Filter by memory type(s) */
  typeFilter?: MemoryEntryType[];

  /** Minimum cycle number */
  minCycle?: number;

  /** Maximum cycle number */
  maxCycle?: number;

  /** Include archived entries */
  includeArchived?: boolean;

  /** Search only archived entries */
  archivedOnly?: boolean;
}

export interface MemorySearchResult {
  /** The memory entry */
  entry: MemoryEntry;

  /** Raw similarity score (0-1) */
  similarity: number;

  // === NEW: Enhanced result fields ===

  /** Current heat score (0-1) */
  heat: number;

  /** Memory tier based on heat */
  tier: MemoryTier;

  /** Composite score (similarity × weight + heat × weight) */
  compositeScore: number;

  /** Whether this entry is from archive */
  isArchived: boolean;

  /** Archive file path (if archived) */
  archiveSource?: string;
}
```

### 2. Heat-Weighted Search Implementation

```typescript
// packages/core/src/memory/sqlite-store.ts

export class SqliteMemoryStore implements MemoryStore {
  async search(options: MemorySearchOptions): Promise<MemorySearchResult[]> {
    const {
      query,
      limit = 10,
      minSimilarity = 0.3,
      heatWeight = 0.4,
      tierFilter,
      roleFilter,
      typeFilter,
      minCycle,
      maxCycle,
      includeArchived = false,
      archivedOnly = false,
    } = options;

    const similarityWeight = 1 - heatWeight;

    // Step 1: Get query embedding
    const queryEmbedding = await this.embeddingProvider.embed(query);

    // Step 2: Vector search with larger limit (we'll filter down)
    const searchLimit = Math.max(limit * 3, 50); // Over-fetch for filtering
    const rawResults = await this.vectorSearch(queryEmbedding, searchLimit);

    // Step 3: Calculate composite scores and filter
    const results: MemorySearchResult[] = [];

    for (const row of rawResults) {
      // Apply filters
      if (row.similarity < minSimilarity) continue;
      if (tierFilter && !tierFilter.includes(getTierFromHeat(row.heat)))
        continue;
      if (roleFilter && !roleFilter.includes(row.role?.toLowerCase())) continue;
      if (typeFilter && !typeFilter.includes(row.entry_type)) continue;
      if (minCycle !== undefined && row.cycle < minCycle) continue;
      if (maxCycle !== undefined && row.cycle > maxCycle) continue;

      // Calculate composite score
      const compositeScore =
        row.similarity * similarityWeight + row.heat * heatWeight;

      results.push({
        entry: this.rowToEntry(row),
        similarity: row.similarity,
        heat: row.heat,
        tier: getTierFromHeat(row.heat),
        compositeScore,
        isArchived: false,
      });
    }

    // Step 4: Include archived if requested
    if (includeArchived || archivedOnly) {
      const archivedResults = await this.searchArchives(query, {
        ...options,
        heatWeight,
        similarityWeight,
      });

      if (archivedOnly) {
        results.length = 0; // Clear live results
      }

      results.push(...archivedResults);
    }

    // Step 5: Sort by composite score and limit
    results.sort((a, b) => b.compositeScore - a.compositeScore);

    return results.slice(0, limit);
  }

  private async vectorSearch(
    embedding: Float32Array,
    limit: number
  ): Promise<RawSearchRow[]> {
    // Use sqlite-vec for efficient similarity search
    const sql = `
      SELECT 
        m.*,
        vec_distance_cosine(m.embedding, ?) as distance,
        (1 - vec_distance_cosine(m.embedding, ?)) as similarity
      FROM memories m
      WHERE m.source = 'learned'  -- Exclude innate for now
      ORDER BY distance ASC
      LIMIT ?
    `;

    return this.db.all(sql, [embedding, embedding, limit]);
  }

  private async searchArchives(
    query: string,
    options: MemorySearchOptions & { similarityWeight: number }
  ): Promise<MemorySearchResult[]> {
    const archiveDir = join(this.agentsDir, 'memory', 'archives');
    if (!existsSync(archiveDir)) return [];

    const results: MemorySearchResult[] = [];
    const archiveFiles = readdirSync(archiveDir).filter(f =>
      f.endsWith('.jsonl')
    );

    // Embed query once
    const queryEmbedding = await this.embeddingProvider.embed(query);

    for (const file of archiveFiles) {
      const entries = await this.readArchiveFile(join(archiveDir, file));

      for (const entry of entries) {
        // Apply non-similarity filters first (cheap)
        if (options.tierFilter && !options.tierFilter.includes(entry.tier))
          continue;
        if (
          options.roleFilter &&
          !options.roleFilter.includes(entry.role?.toLowerCase())
        )
          continue;
        if (options.typeFilter && !options.typeFilter.includes(entry.entryType))
          continue;
        if (options.minCycle !== undefined && entry.cycle < options.minCycle)
          continue;
        if (options.maxCycle !== undefined && entry.cycle > options.maxCycle)
          continue;

        // Calculate similarity (expensive - only for filtered entries)
        const similarity = await this.calculateSimilarity(
          queryEmbedding,
          entry
        );
        if (similarity < (options.minSimilarity ?? 0.3)) continue;

        const compositeScore =
          similarity * options.similarityWeight +
          entry.heat * options.heatWeight;

        results.push({
          entry,
          similarity,
          heat: entry.heat,
          tier: entry.tier,
          compositeScore,
          isArchived: true,
          archiveSource: file,
        });
      }
    }

    return results;
  }
}
```

### 3. CLI Commands

```bash
# Basic heat-weighted search
ada memory search "OAuth implementation"
# Output:
# 🔍 Search: "OAuth implementation" (heat-weighted)
#
# 🔥 1. [C1140] ⚙️ engineering (score: 0.89)
#    OAuth token refresh implementation — fixed PR #248...
#
# 🔥 2. [C1095] 🎨 design (score: 0.84)
#    OAuth flow UX wireframes — 6-screen auth sequence...
#
# 🟠 3. [C892] ⚙️ engineering (score: 0.72)
#    Initial OAuth setup — NextAuth.js integration...
#
# Found 3 results (0.4 heat weight)

# Hot memories only
ada memory search "deployment" --tier hot
# Output:
# 🔍 Search: "deployment" (tier: hot)
#
# 🔥 1. [C1141] 🛡️ ops (score: 0.91)
#    PR #248 merge — CI pipeline deployment...
#
# Found 1 result (filtered to tier: hot)

# Role-scoped search
ada memory search "test coverage" --role qa
# Output:
# 🔍 Search: "test coverage" (role: qa)
#
# 🔥 1. [C1139] 🔍 qa (score: 0.93)
#    Playwright CI Integration — 21 E2E tests...
#
# 🟠 2. [C1089] 🔍 qa (score: 0.78)
#    Unit test audit — coverage gaps identified...

# Last N cycles
ada memory search "sprint planning" --last 20
# Output:
# 🔍 Search: "sprint planning" (last 20 cycles: 1128-1147)
# ...

# Combined filters
ada memory search "API" --tier hot,warm --role engineering,design --last 50
# Output:
# 🔍 Search: "API" (tier: hot,warm | role: engineering,design | last 50)
# ...

# Cycle range
ada memory search "launch" --cycles 1100-1130
# Output:
# 🔍 Search: "launch" (cycles: 1100-1130)
# ...

# Include archived
ada memory search "2025 strategy" --include-archived
# Output:
# 🔍 Search: "2025 strategy" (including archived)
# ⚠️ Searching 3 archive files (may be slow)...
#
# 🔥 1. [C1050] 👔 ceo (score: 0.88)
#    2025 strategy revision...
#
# 📦 2. [C850, archived] 👔 ceo (score: 0.82)
#    Original 2025 strategy document...

# Archived only
ada memory search "legacy migration" --archived-only
# Output:
# 🔍 Search: "legacy migration" (archives only)
# ...

# Adjust heat weight
ada memory search "OAuth" --heat-weight 0.7
# Output:
# 🔍 Search: "OAuth" (heat-weighted: 0.7)
# (Hot memories weighted more heavily)

# Pure similarity (no heat)
ada memory search "OAuth" --pure-similarity
# Output:
# 🔍 Search: "OAuth" (pure similarity, no heat weighting)
# ...

# Verbose output
ada memory search "OAuth" --verbose
# Output shows full content, not truncated

# JSON output
ada memory search "OAuth" --json
# Output:
# [{"entry":{"id":"...","content":"..."},"similarity":0.89,"heat":0.92,"tier":"hot","compositeScore":0.90}]
```

### 4. CLI Command Implementation

```typescript
// packages/cli/src/commands/memory/search.ts

import { Command } from 'commander';
import { createMemoryStore, MemoryTier } from '@ada-ai/core';

export const searchCommand = new Command('search')
  .description('Search memory with heat-weighted ranking')
  .argument('<query>', 'Search query')
  .option('--limit <n>', 'Maximum results', '10')
  .option('--tier <tiers>', 'Filter by tier (hot,warm,cold)')
  .option('--role <roles>', 'Filter by role (comma-separated)')
  .option(
    '--type <types>',
    'Filter by entry type (action,decision,blocker,lesson)'
  )
  .option('--last <n>', 'Last N cycles only')
  .option('--cycles <range>', 'Cycle range (e.g., 1100-1147)')
  .option('--since <cycle>', 'Since cycle number')
  .option('--include-archived', 'Include archived entries')
  .option('--archived-only', 'Search only archived entries')
  .option('--heat-weight <w>', 'Heat weight in composite score (0-1)', '0.4')
  .option('--pure-similarity', 'Disable heat weighting')
  .option('--verbose', 'Show full entry content')
  .option('--json', 'Output as JSON')
  .action(async (query, opts) => {
    const store = await createMemoryStore({ agentsDir: process.cwd() });

    // Parse filters
    const tierFilter = opts.tier
      ? opts.tier.split(',').map((t: string) => t.trim() as MemoryTier)
      : undefined;

    const roleFilter = opts.role
      ? opts.role.split(',').map((r: string) => r.trim().toLowerCase())
      : undefined;

    const typeFilter = opts.type
      ? opts.type.split(',').map((t: string) => t.trim())
      : undefined;

    // Parse cycle range
    let minCycle: number | undefined;
    let maxCycle: number | undefined;

    if (opts.last) {
      const currentCycle = await getCurrentCycle(); // From rotation.json
      maxCycle = currentCycle;
      minCycle = currentCycle - parseInt(opts.last, 10) + 1;
    } else if (opts.cycles) {
      const [start, end] = opts.cycles.split('-').map(Number);
      minCycle = start;
      maxCycle = end;
    } else if (opts.since) {
      minCycle = parseInt(opts.since, 10);
    }

    // Search
    const results = await store.search({
      query,
      limit: parseInt(opts.limit, 10),
      heatWeight: opts.pureSimilarity ? 0 : parseFloat(opts.heatWeight),
      tierFilter,
      roleFilter,
      typeFilter,
      minCycle,
      maxCycle,
      includeArchived: opts.includeArchived,
      archivedOnly: opts.archivedOnly,
    });

    // Output
    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    // Rich formatting
    const filterDesc = buildFilterDescription(opts);
    console.log(`🔍 Search: "${query}"${filterDesc}`);
    console.log();

    if (results.length === 0) {
      console.log('No results found.');
      return;
    }

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const tierEmoji =
        r.tier === 'hot' ? '🔥' : r.tier === 'warm' ? '🟠' : '🧊';
      const archived = r.isArchived ? ', archived' : '';
      const roleEmoji = getRoleEmoji(r.entry.role);

      console.log(
        `${tierEmoji} ${i + 1}. [C${r.entry.cycle}${archived}] ${roleEmoji} ${r.entry.role} (score: ${r.compositeScore.toFixed(2)})`
      );

      const content = opts.verbose
        ? r.entry.content
        : truncate(r.entry.content, 80);
      console.log(`   ${content}`);
      console.log();
    }

    console.log(
      `Found ${results.length} results${opts.heatWeight !== '0' ? ` (${opts.heatWeight} heat weight)` : ''}`
    );
  });

function buildFilterDescription(opts: any): string {
  const parts: string[] = [];

  if (opts.pureSimilarity) parts.push('pure similarity');
  else if (opts.heatWeight !== '0.4')
    parts.push(`heat-weighted: ${opts.heatWeight}`);
  else parts.push('heat-weighted');

  if (opts.tier) parts.push(`tier: ${opts.tier}`);
  if (opts.role) parts.push(`role: ${opts.role}`);
  if (opts.type) parts.push(`type: ${opts.type}`);
  if (opts.last) parts.push(`last ${opts.last} cycles`);
  if (opts.cycles) parts.push(`cycles: ${opts.cycles}`);
  if (opts.since) parts.push(`since: ${opts.since}`);
  if (opts.includeArchived) parts.push('including archived');
  if (opts.archivedOnly) parts.push('archives only');

  return parts.length > 0 ? ` (${parts.join(' | ')})` : '';
}

function truncate(text: string, maxLen: number): string {
  const firstLine = text.split('\n')[0];
  if (firstLine.length <= maxLen) return firstLine;
  return firstLine.slice(0, maxLen - 3) + '...';
}
```

### 5. Configuration Schema

```typescript
// Add to ada.config.json schema

export interface SearchConfig {
  /** Default heat weight (0-1, default: 0.4) */
  defaultHeatWeight: number;

  /** Default result limit (default: 10) */
  defaultLimit: number;

  /** Minimum similarity threshold (default: 0.3) */
  minSimilarity: number;

  /** Warn when searching archives larger than this (MB) */
  archiveWarningThresholdMb: number;
}

const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  defaultHeatWeight: 0.4,
  defaultLimit: 10,
  minSimilarity: 0.3,
  archiveWarningThresholdMb: 50,
};
```

---

## Implementation Plan

### Week 1 (Sprint 5, Days 3-7): Core Infrastructure

| Day | Task                                      | Owner       |
| --- | ----------------------------------------- | ----------- |
| 3   | Extend MemorySearchOptions interface      | Engineering |
| 4   | Heat-weighted composite scoring           | Engineering |
| 5   | Tier, role, type filters                  | Engineering |
| 6   | Cycle range filtering (last/cycles/since) | Engineering |
| 7   | Unit tests for all filter combinations    | QA          |

### Week 2 (Sprint 5, Days 8-10): CLI + Archives

| Day | Task                          | Owner       |
| --- | ----------------------------- | ----------- |
| 8   | Archive search implementation | Engineering |
| 9   | CLI command with all flags    | Engineering |
| 10  | E2E tests + documentation     | QA + Docs   |

**Note:** Days 1-2 allocated to #172 (Auto Memory Compression) which shares infrastructure.

---

## Success Metrics

| Metric                   | Target         | Measurement                             |
| ------------------------ | -------------- | --------------------------------------- |
| Hot memory relevance     | Top 3 results  | Hot entries in top 3 for active queries |
| Filter adoption          | 50%+ searches  | Searches using ≥1 filter flag           |
| Search satisfaction      | <3 searches    | Avg searches to find desired context    |
| Archive search latency   | <2s for 100MB  | Time to search large archives           |
| CLI flag discoverability | --help clarity | All flags documented with examples      |

---

## Testing Strategy

### Unit Tests

- `search.test.ts`: Composite scoring math, filter logic, edge cases
- `archive-search.test.ts`: Archive file parsing, similarity calculation
- `cli-search.test.ts`: Flag parsing, output formatting

### Integration Tests

- Search with various filter combinations
- Heat weight variations (0, 0.4, 0.7, 1.0)
- Archive search with and without filters

### E2E Tests

- Full search from CLI with mocked memory store
- JSON output parsing
- Large result set handling

---

## Risks and Mitigations

| Risk                  | Likelihood | Impact | Mitigation                             |
| --------------------- | ---------- | ------ | -------------------------------------- |
| Archive search slow   | Medium     | Medium | Warn user, limit archive scan depth    |
| Heat scoring stale    | Low        | Medium | Refresh heat on every search access    |
| Filter complexity     | Low        | Low    | Clear error messages, examples in help |
| Over-reliance on heat | Low        | Medium | Pure-similarity escape hatch           |

---

## Dependencies

### Required (Sprint 4/5 Complete)

- Heat Scoring (#113) — Phase 4a infrastructure ✅
- SqliteMemoryStore search — exists but needs extension
- Auto Memory Compression (#172) — shared heat infrastructure

### Nice to Have

- Semantic caching — Cache query embeddings for repeated searches

---

## Open Questions

1. **Should heat decay be applied at search time?**
   - **Recommendation:** No — heat is pre-computed and persisted. Real-time decay would be expensive.

2. **Support regex/glob patterns in query?**
   - **Recommendation:** Out of scope. Semantic search covers most cases. Add if demand emerges.

3. **Cross-archive deduplication?**
   - **Recommendation:** No for v1. Same entry in multiple archives is rare.

---

## Related Issues

- **#173** — This feature (Heat-Weighted Search)
- **#172** — Auto Memory Compression (shared heat infrastructure)
- **#113** — Cognitive Memory Architecture (foundational heat scoring)
- **#91** — Memory System improvements (parent initiative)

---

_📦 Product (The PM) | Cycle 1147 | Feb 23, 2026_
