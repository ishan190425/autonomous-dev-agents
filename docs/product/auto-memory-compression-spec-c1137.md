# 📦 Automatic Memory Compression with Intelligent Tiering

> Feature Specification for Issue #172
> **Author:** 📦 Product (The PM) | **Cycle:** 1137
> **Priority:** P2 | **Target Sprint:** 5 (Mar 29 - Apr 11, 2026)
> **Dependencies:** Heat Scoring (#113), MemoryStream (Phase 3)

---

## Executive Summary

Automate memory compression using heat-based intelligent tiering. Currently, compression is manual per R-002 (triggered at 200 lines, 10+ cycles, or sprint end). This spec defines automatic compression that preserves high-heat memories while archiving cold ones, reducing token overhead without losing critical context.

**Key Outcomes:**

- 40-60% reduction in memory token overhead per cycle
- Zero manual compression interventions required
- High-heat memories always preserved in active context
- Cold memories archived but retrievable via search
- Compression metrics visible in `ada status`

---

## Problem Statement

### Current State

**R-002 (Manual Compression Protocol):**

1. Triggered when bank.md exceeds 200 lines OR 10+ cycles since last compression OR sprint ends
2. Manual archive: Copy bank.md → `archives/bank-YYYY-MM-DD-vN.md`
3. Manual compress: Rewrite bank.md preserving active items
4. Manual commit: `chore(agents): compress memory bank v{N} → v{N+1}`

**Issues:**

- **Agent overhead:** ~10-15 minutes per compression (read + archive + rewrite + commit)
- **Inconsistent quality:** Different roles compress differently
- **No intelligence:** All content treated equally regardless of heat
- **Token waste:** Cold memories stay in active context until manual compression
- **Lost context:** Sometimes important hot memories get compressed out

### Root Cause

Compression is a chore that distracts from role-specific work. Agents have no objective criteria for what to preserve vs archive — they guess based on "seems important."

---

## Proposed Solution

### Overview

Integrate automatic compression into the dispatch cycle (Phase 6) using heat scores to intelligently tier memories:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                      AUTOMATIC COMPRESSION ARCHITECTURE                        │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│   ┌────────────────────────────────────────────────────────────────────────┐  │
│   │  DISPATCH PHASE 6: Compression Check                                   │  │
│   │                                                                        │  │
│   │  1. Check triggers (any true = compress):                              │  │
│   │     • Bank > 200 lines                                                 │  │
│   │     • 10+ cycles since last compression                                │  │
│   │     • Sprint boundary                                                  │  │
│   │     • Cold tier > 50% of total entries                                 │  │
│   │                                                                        │  │
│   │  2. If triggered, run auto-compression:                                │  │
│   │     • Calculate heat scores for all entries                            │  │
│   │     • Archive cold entries → archival tier                             │  │
│   │     • Summarize warm entries → compact form                            │  │
│   │     • Preserve hot entries → verbatim                                  │  │
│   │     • Update version, commit                                           │  │
│   │                                                                        │  │
│   │  3. Report compression metrics                                         │  │
│   └────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│   HEAT TIERS (from heat-scoring-implementation-spec.md):                       │
│   ├─ 🔥 HOT  (≥0.8): Always in active context, never compressed               │
│   ├─ 🟠 WARM (0.4-0.8): Summarized, kept in recall tier                       │
│   └─ 🧊 COLD (<0.4): Archived, retrievable via archival_search()              │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Core Behaviors

#### 1. Hot Memory Preservation (Heat ≥ 0.8)

- **Never compressed** — always retained verbatim in active bank
- **Includes:** Recent high-importance actions, frequently referenced entries, active blockers
- **Rationale:** Hot memories are actively used; compressing them loses critical context

#### 2. Warm Memory Summarization (Heat 0.4 - 0.8)

- **Summarized** — condensed to 30-50% of original token count
- **Kept in:** Recall tier (stream.jsonl) for quick retrieval
- **Summarization rules:**
  - Remove verbose descriptions, keep action + outcome
  - Preserve issue/PR references
  - Keep tags for searchability
  - Maintain role attribution

#### 3. Cold Memory Archival (Heat < 0.4)

- **Archived** — moved to archival tier, removed from active bank
- **Retrievable via:** `ada memory search` with `--include-archived` flag
- **Archive format:** JSONL in `agents/memory/archives/stream-YYYY-MM.jsonl`
- **Retention:** Indefinite (never deleted, only compressed further over time)

---

## User Stories

### US1: Agent Auto-Compression

**As an** agent running dispatch cycles,  
**I want** compression to happen automatically when triggers fire,  
**So that** I don't waste cycles on memory housekeeping.

**Acceptance Criteria:**

- [ ] Compression triggers checked in Phase 6 of every dispatch cycle
- [ ] If any trigger fires, auto-compression runs without agent intervention
- [ ] Agent receives summary: "Compressed 45 entries: 8 hot (kept), 22 warm (summarized), 15 cold (archived)"
- [ ] No manual `chore(agents): compress` commits needed

### US2: Heat-Aware Preservation

**As a** role relying on recent context,  
**I want** hot memories preserved verbatim,  
**So that** I don't lose critical active context during compression.

**Acceptance Criteria:**

- [ ] Entries with heat ≥ 0.8 never modified during compression
- [ ] Hot entries include: last 3 cycles per role, entries with >5 references, active blockers
- [ ] Hot tier visible in `ada memory list --tier hot`

### US3: Warm Summarization

**As a** role that needs historical context,  
**I want** warm memories summarized not deleted,  
**So that** I can still find relevant past actions without full verbosity.

**Acceptance Criteria:**

- [ ] Warm entries condensed to 30-50% token count
- [ ] Original entry preserved in archive for full retrieval if needed
- [ ] Summarization preserves: action type, outcome, issue refs, role, cycle

### US4: Cold Archival

**As a** user managing long-running projects,  
**I want** cold memories archived not deleted,  
**So that** I can retrieve old context when needed without bloating active memory.

**Acceptance Criteria:**

- [ ] Cold entries moved to monthly archive files
- [ ] Archive files searchable via `ada memory search --include-archived`
- [ ] Cold entries never permanently deleted
- [ ] Archive files compressed (gzip) for storage efficiency

### US5: Compression CLI

**As a** user who wants manual control,  
**I want** CLI commands for compression management,  
**So that** I can trigger, preview, and configure compression behavior.

**Acceptance Criteria:**

- [ ] `ada memory compress --auto` — Check triggers, compress if needed
- [ ] `ada memory compress --force` — Compress regardless of triggers
- [ ] `ada memory compress --dry-run` — Show what would be compressed without acting
- [ ] `ada memory compress --config` — View/set compression thresholds

### US6: Compression Metrics

**As a** user optimizing memory efficiency,  
**I want** compression metrics in `ada status`,  
**So that** I can track token savings and compression history.

**Acceptance Criteria:**

- [ ] `ada status` shows: Hot/Warm/Cold counts, last compression cycle, token savings
- [ ] `ada memory stats` shows detailed compression history
- [ ] Metrics include: compressions/sprint, avg token reduction, archive size

---

## Technical Design

### 1. Compression Trigger Interface

```typescript
// packages/core/src/compression.ts

export interface CompressionTrigger {
  /** Unique trigger identifier */
  readonly id: string;
  /** Human-readable description */
  readonly description: string;
  /** Check if trigger should fire */
  check(context: CompressionContext): boolean;
}

export interface CompressionContext {
  /** Current bank line count */
  readonly bankLineCount: number;
  /** Cycles since last compression */
  readonly cyclesSinceCompression: number;
  /** Is this a sprint boundary? */
  readonly isSprintBoundary: boolean;
  /** Current heat tier distribution */
  readonly tierCounts: {
    readonly hot: number;
    readonly warm: number;
    readonly cold: number;
  };
  /** Current memory version */
  readonly memoryVersion: number;
  /** Last compression timestamp */
  readonly lastCompressionAt: string | null;
}

export const DEFAULT_TRIGGERS: CompressionTrigger[] = [
  {
    id: 'line-count',
    description: 'Bank exceeds 200 lines',
    check: ctx => ctx.bankLineCount > 200,
  },
  {
    id: 'cycle-count',
    description: '10+ cycles since compression',
    check: ctx => ctx.cyclesSinceCompression >= 10,
  },
  {
    id: 'sprint-boundary',
    description: 'Sprint boundary reached',
    check: ctx => ctx.isSprintBoundary,
  },
  {
    id: 'cold-ratio',
    description: 'Cold tier exceeds 50% of entries',
    check: ctx => {
      const total =
        ctx.tierCounts.hot + ctx.tierCounts.warm + ctx.tierCounts.cold;
      return total > 0 && ctx.tierCounts.cold / total > 0.5;
    },
  },
];
```

### 2. Compression Engine

```typescript
// packages/core/src/compression.ts

export interface CompressionResult {
  /** Whether compression was performed */
  readonly compressed: boolean;
  /** Trigger that fired (if compressed) */
  readonly triggeredBy: string | null;
  /** Entries by final state */
  readonly stats: {
    readonly hotPreserved: number;
    readonly warmSummarized: number;
    readonly coldArchived: number;
    readonly totalBefore: number;
    readonly totalAfter: number;
  };
  /** Token savings */
  readonly tokenSavings: {
    readonly before: number;
    readonly after: number;
    readonly reduction: number;
    readonly percentReduction: number;
  };
  /** Archive file created (if any) */
  readonly archiveFile: string | null;
  /** New memory version */
  readonly newVersion: number;
}

export interface CompressionOptions {
  /** Force compression regardless of triggers */
  force?: boolean;
  /** Preview only, don't modify files */
  dryRun?: boolean;
  /** Custom triggers (overrides defaults) */
  triggers?: CompressionTrigger[];
  /** Summarization target ratio (default: 0.4 = 40% of original) */
  summarizationRatio?: number;
}

/**
 * Run automatic memory compression.
 */
export async function compressMemory(
  stream: MemoryStream,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const { force = false, dryRun = false, summarizationRatio = 0.4 } = options;
  const triggers = options.triggers ?? DEFAULT_TRIGGERS;

  // 1. Build compression context
  const context = await buildCompressionContext(stream);

  // 2. Check triggers
  const firedTrigger = force
    ? 'force'
    : (triggers.find(t => t.check(context))?.id ?? null);
  if (!firedTrigger) {
    return {
      compressed: false,
      triggeredBy: null,
      stats: {
        hotPreserved: 0,
        warmSummarized: 0,
        coldArchived: 0,
        totalBefore: 0,
        totalAfter: 0,
      },
      tokenSavings: { before: 0, after: 0, reduction: 0, percentReduction: 0 },
      archiveFile: null,
      newVersion: context.memoryVersion,
    };
  }

  // 3. Calculate heat scores and tier all entries
  const entries = await stream.getEntriesWithHeat();
  const tiered = tierEntries(entries);

  // 4. Process each tier
  const preserved = tiered.hot; // Keep verbatim
  const summarized = await summarizeEntries(tiered.warm, summarizationRatio);
  const archived = tiered.cold;

  // 5. Archive cold entries
  let archiveFile: string | null = null;
  if (!dryRun && archived.length > 0) {
    archiveFile = await archiveEntries(archived, stream);
  }

  // 6. Update stream with preserved + summarized
  if (!dryRun) {
    await stream.replaceEntries([...preserved, ...summarized]);
    await stream.incrementVersion();
  }

  // 7. Calculate token savings
  const tokensBefore = entries.reduce(
    (sum, e) => sum + (e.tokenEstimate ?? 0),
    0
  );
  const tokensAfter = [...preserved, ...summarized].reduce(
    (sum, e) => sum + (e.tokenEstimate ?? 0),
    0
  );

  return {
    compressed: true,
    triggeredBy: firedTrigger,
    stats: {
      hotPreserved: preserved.length,
      warmSummarized: summarized.length,
      coldArchived: archived.length,
      totalBefore: entries.length,
      totalAfter: preserved.length + summarized.length,
    },
    tokenSavings: {
      before: tokensBefore,
      after: tokensAfter,
      reduction: tokensBefore - tokensAfter,
      percentReduction:
        tokensBefore > 0
          ? Math.round((1 - tokensAfter / tokensBefore) * 100)
          : 0,
    },
    archiveFile,
    newVersion: context.memoryVersion + 1,
  };
}
```

### 3. Summarization Engine

```typescript
// packages/core/src/summarization.ts

export interface SummarizationOptions {
  /** Target ratio (0.0-1.0, default 0.4) */
  targetRatio: number;
  /** Minimum output tokens (don't over-compress) */
  minTokens: number;
  /** Preserve these fields verbatim */
  preserveFields: ('issueRefs' | 'prRefs' | 'tags' | 'role' | 'cycle')[];
}

const DEFAULT_SUMMARIZATION_OPTIONS: SummarizationOptions = {
  targetRatio: 0.4,
  minTokens: 50,
  preserveFields: ['issueRefs', 'prRefs', 'tags', 'role', 'cycle'],
};

/**
 * Summarize a collection of warm entries.
 * Uses rule-based summarization (no LLM call) for determinism and speed.
 */
export async function summarizeEntries(
  entries: StreamEntryWithHeat[],
  targetRatio: number = 0.4
): Promise<StreamEntryWithHeat[]> {
  return entries.map(entry =>
    summarizeEntry(entry, { ...DEFAULT_SUMMARIZATION_OPTIONS, targetRatio })
  );
}

function summarizeEntry(
  entry: StreamEntryWithHeat,
  options: SummarizationOptions
): StreamEntryWithHeat {
  const originalTokens = entry.tokenEstimate ?? estimateTokens(entry.content);
  const targetTokens = Math.max(
    options.minTokens,
    Math.round(originalTokens * options.targetRatio)
  );

  // Rule-based summarization
  const summarized = compactContent(entry.content, targetTokens);

  return {
    ...entry,
    content: summarized,
    tokenEstimate: estimateTokens(summarized),
    // Mark as summarized for audit trail
    summarizedFrom: entry.id,
    summarizedAt: new Date().toISOString(),
  };
}

/**
 * Compact content to target token count using rule-based extraction.
 */
function compactContent(content: string, targetTokens: number): string {
  // Extract key components
  const lines = content.split('\n').filter(l => l.trim());

  // Priority extraction:
  // 1. First line (usually summary/title)
  // 2. Lines with issue/PR refs (#\d+)
  // 3. Lines with key verbs (created, merged, fixed, updated, etc.)
  // 4. Remaining lines by position

  const prioritized = prioritizeLines(lines);

  // Build summary until target tokens reached
  let result = '';
  let tokens = 0;

  for (const line of prioritized) {
    const lineTokens = estimateTokens(line);
    if (tokens + lineTokens > targetTokens && tokens > 0) break;
    result += (result ? '\n' : '') + line;
    tokens += lineTokens;
  }

  return result || lines[0] || '(summarized)';
}

function prioritizeLines(lines: string[]): string[] {
  const scored = lines.map((line, index) => ({
    line,
    score: linePriority(line, index, lines.length),
  }));

  return scored.sort((a, b) => b.score - a.score).map(s => s.line);
}

function linePriority(line: string, index: number, total: number): number {
  let score = 0;

  // First line bonus
  if (index === 0) score += 100;

  // Issue/PR reference bonus
  if (/#\d+/.test(line)) score += 50;

  // Key action verbs bonus
  const actionVerbs =
    /\b(created|merged|fixed|updated|implemented|added|removed|closed)\b/i;
  if (actionVerbs.test(line)) score += 30;

  // Emoji prefix bonus (typically section headers)
  if (/^[\u{1F300}-\u{1F9FF}]/u.test(line.trim())) score += 20;

  // Position penalty (later lines less important)
  score -= (index / total) * 10;

  return score;
}
```

### 4. Archive Management

```typescript
// packages/core/src/archive.ts

export interface ArchiveEntry extends StreamEntryWithHeat {
  /** Original entry ID before archival */
  readonly originalId: string;
  /** Archival timestamp */
  readonly archivedAt: string;
  /** Reason for archival */
  readonly archiveReason: 'cold' | 'sprint-end' | 'manual';
}

/**
 * Archive cold entries to monthly archive file.
 */
export async function archiveEntries(
  entries: StreamEntryWithHeat[],
  stream: MemoryStream
): Promise<string> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const archiveFile = `agents/memory/archives/stream-${monthKey}.jsonl`;

  const archiveEntries: ArchiveEntry[] = entries.map(entry => ({
    ...entry,
    originalId: entry.id,
    archivedAt: now.toISOString(),
    archiveReason: 'cold',
  }));

  await appendToArchive(archiveFile, archiveEntries);

  return archiveFile;
}

/**
 * Search archived entries.
 */
export async function searchArchives(
  query: string,
  options: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
): Promise<ArchiveEntry[]> {
  const archiveFiles = await listArchiveFiles();
  const results: ArchiveEntry[] = [];

  for (const file of archiveFiles) {
    // Filter by date range if specified
    if (options.startDate || options.endDate) {
      const fileMonth = extractMonthFromFilename(file);
      if (options.startDate && fileMonth < options.startDate) continue;
      if (options.endDate && fileMonth > options.endDate) continue;
    }

    const entries = await readArchiveFile(file);
    const matches = entries.filter(e => matchesQuery(e, query));
    results.push(...matches);

    if (options.limit && results.length >= options.limit) {
      return results.slice(0, options.limit);
    }
  }

  return results;
}
```

### 5. CLI Commands

```bash
# Check triggers and compress if needed
ada memory compress --auto
# Output:
# ✅ Compression triggered (line-count: 245 > 200)
# 📊 Compressed 52 entries:
#    🔥 Hot: 12 preserved
#    🟠 Warm: 28 summarized (→ 40% tokens)
#    🧊 Cold: 12 archived → archives/stream-2026-02.jsonl
# 💰 Token savings: 8,450 → 4,120 (-51%)
# 📝 Memory version: v57 → v58

# Force compression (ignores triggers)
ada memory compress --force

# Dry run (preview without changes)
ada memory compress --dry-run
# Output:
# 🔍 Dry run — no changes will be made
# Would compress 52 entries:
#    🔥 Hot: 12 would be preserved
#    🟠 Warm: 28 would be summarized
#    🧊 Cold: 12 would be archived
# Estimated token savings: ~51%

# View compression configuration
ada memory compress --config
# Output:
# Compression Configuration:
#   Line threshold: 200
#   Cycle threshold: 10
#   Cold ratio threshold: 50%
#   Summarization ratio: 40%
#   Archive retention: indefinite

# Set configuration
ada memory compress --config --set lineThreshold=250

# View heat tier distribution
ada memory list --show-heat
# (existing command from heat-scoring spec)

# Search archived entries
ada memory search "OAuth implementation" --include-archived
# Output:
# 📦 Archive Results (3):
#   [archived 2026-01] C892 engineering: OAuth token refresh implementation
#   [archived 2026-01] C879 research: OAuth 2.1 spec analysis
#   [archived 2026-01] C865 design: OAuth flow wireframes

# Compression stats
ada memory stats
# Output:
# Memory Statistics:
#   Current version: v58
#   Active entries: 40 (🔥 12, 🟠 28, 🧊 0)
#   Archived entries: 156
#   Compressions this sprint: 3
#   Total token savings: 24,500 (47% avg reduction)
#   Last compression: Cycle 1135 (2 days ago)
```

### 6. Dispatch Integration

Update DISPATCH.md Phase 6:

````markdown
### Phase 6: Compression Check

**Automatic compression is now handled by the CLI:**

```bash
# The dispatch complete command includes auto-compression
ada dispatch complete --action "..."
```
````

This automatically:

1. Checks compression triggers
2. Runs compression if any trigger fires
3. Includes compression stats in the commit message

**Manual override (if CLI unavailable):**
Run `ada memory compress --auto` after your action but before commit.

````

---

## Configuration Schema

```typescript
// Add to ada.config.json schema

export interface CompressionConfig {
  /** Enable automatic compression in dispatch (default: true) */
  enabled: boolean;
  /** Line count trigger threshold (default: 200) */
  lineThreshold: number;
  /** Cycle count trigger threshold (default: 10) */
  cycleThreshold: number;
  /** Cold tier ratio trigger (default: 0.5) */
  coldRatioThreshold: number;
  /** Summarization target ratio (default: 0.4) */
  summarizationRatio: number;
  /** Minimum tokens after summarization (default: 50) */
  minSummarizedTokens: number;
  /** Archive retention policy */
  archiveRetention: 'indefinite' | 'months' | 'cycles';
  /** If months/cycles, how many to retain */
  archiveRetentionCount?: number;
}

const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  enabled: true,
  lineThreshold: 200,
  cycleThreshold: 10,
  coldRatioThreshold: 0.5,
  summarizationRatio: 0.4,
  minSummarizedTokens: 50,
  archiveRetention: 'indefinite',
};
````

---

## Implementation Plan

### Week 1 (Sprint 5, Days 1-5): Core Infrastructure

| Day | Task                                            | Owner       |
| --- | ----------------------------------------------- | ----------- |
| 1   | CompressionTrigger interface + DEFAULT_TRIGGERS | Engineering |
| 2   | CompressionContext builder + trigger checking   | Engineering |
| 3   | Summarization engine (rule-based)               | Engineering |
| 4   | Archive management (write/read/search)          | Engineering |
| 5   | compressMemory() integration tests              | QA          |

### Week 2 (Sprint 5, Days 6-10): CLI + Dispatch Integration

| Day | Task                                        | Owner       |
| --- | ------------------------------------------- | ----------- |
| 6   | `ada memory compress` command               | Engineering |
| 7   | `ada memory stats` command                  | Engineering |
| 8   | `ada memory search --include-archived` flag | Engineering |
| 9   | Dispatch Phase 6 auto-compression           | Engineering |
| 10  | E2E tests + documentation                   | QA + Docs   |

---

## Success Metrics

| Metric                          | Target           | Measurement                                |
| ------------------------------- | ---------------- | ------------------------------------------ |
| Manual compression cycles       | 0 after Sprint 5 | Count of `chore(agents): compress` commits |
| Token reduction per compression | 40-60%           | Average tokenSavings.percentReduction      |
| Hot memory preservation         | 100%             | Hot entries never lost during compression  |
| Archive searchability           | <500ms           | Time to search 1000+ archived entries      |
| Dispatch cycle overhead         | <2s added        | Time added to dispatch complete            |

---

## Testing Strategy

### Unit Tests

- `compression.test.ts`: Trigger logic, context building, tier classification
- `summarization.test.ts`: Rule-based summarization, token estimation
- `archive.test.ts`: Archive write/read, search, retention

### Integration Tests

- Dispatch cycle with auto-compression
- Compression across sprint boundaries
- Archive search with date ranges

### E2E Tests

- Full dispatch cycle: action → compression → archive
- CLI commands: compress, stats, search with archives
- Configuration changes persist correctly

---

## Risks and Mitigations

| Risk                           | Likelihood | Impact | Mitigation                                     |
| ------------------------------ | ---------- | ------ | ---------------------------------------------- |
| Over-compression loses context | Medium     | High   | Hot tier protection, never compress heat ≥ 0.8 |
| Summarization quality poor     | Medium     | Medium | Rule-based first, LLM-assisted later if needed |
| Archive search slow            | Low        | Medium | Monthly archive files, indexed by cycle/role   |
| Config complexity              | Low        | Low    | Sensible defaults, config validation           |

---

## Dependencies

### Required (Sprint 4 Complete)

- Heat Scoring (#113) — Phase 4a infrastructure ✅
- MemoryStream (Phase 3) — JSONL persistence ✅

### Nice to Have

- Semantic Search (Phase 3b) — Better archive search ranking
- Token Counting (#186) — Accurate token estimation

---

## Open Questions

1. **LLM-assisted summarization?**
   - **Recommendation:** Start with rule-based (deterministic, fast, no API cost). Add LLM option in v2 if quality insufficient.

2. **Gzip archives?**
   - **Recommendation:** Yes, gzip monthly archives after 3 months. Saves storage, searchable via streaming decompression.

3. **Cross-repo archive search?**
   - **Recommendation:** Out of scope for #172. Consider for Platform features (#189).

---

## Related Issues

- **#172** — This feature (Automatic Memory Compression)
- **#113** — Cognitive Memory Architecture (dependency)
- **#173** — Heat-Weighted Search (uses same heat infrastructure)
- **#91** — Memory System improvements (parent initiative)

---

## Appendix: R-002 Compatibility

This feature **supersedes R-002** for automatic compression but remains compatible:

- Manual compression still works: `ada memory compress --force`
- R-002 triggers become automated triggers
- Archive format compatible with existing archives
- Version numbering continues from current version

**R-002 Update Needed:** After #172 ships, update R-002 to reference automatic compression and mark manual protocol as legacy fallback.

---

_📦 Product (The PM) | Cycle 1137 | Feb 22, 2026_
