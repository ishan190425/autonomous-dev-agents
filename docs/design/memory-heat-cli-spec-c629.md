# 🔥 Memory Heat CLI Integration Specification

> **Design Specification — Memory Heat Extension (Frontier Roadmap Phase 1)**
> Extends heat scoring from issues/streams to memory bank entries.
> **Author:** 🌌 The Frontier — Cycle 629
> **Date:** 2026-02-14
> **Based on:** Sprint 2 Frontier Roadmap (C459), Heat Scoring Implementation (#118)
> **Related:** #113 (Cognitive Memory), heat-scoring-implementation-spec.md

---

## Overview

This spec details the CLI integration for memory heat scoring. While `ada heat` manages heat for general entries (issues, streams), `ada memory heat` provides memory-specific heat operations:

- View heat distribution across memory types
- List entries by temperature tier
- Track reference counts from dispatch cycles
- Identify cold candidates for archival

**Goal:** Make memory temperature visible and actionable via CLI.

---

## 1. Command Structure

### 1.1 Memory Heat Subcommands

```
ada memory heat [options]         Show memory heat summary and distribution
ada memory heat list [options]    List memory entries with heat scores
ada memory heat hot               List hot memory entries (>= 0.8)
ada memory heat warm              List warm memory entries (0.4-0.8)
ada memory heat cold              List cold candidates for archival (< 0.4)
```

### 1.2 Global Options

| Option      | Type   | Default | Description                  |
| ----------- | ------ | ------- | ---------------------------- |
| `--dir, -d` | string | `.`     | Project directory            |
| `--json`    | flag   | false   | Output as JSON for scripting |

---

## 2. Memory Heat Types

Memory entries have different base importance and decay rates:

```typescript
// Memory types and their base importance
type MemoryType =
  | 'lesson'
  | 'decision'
  | 'state'
  | 'thread'
  | 'metric'
  | 'blocker';

const BASE_IMPORTANCE: Record<MemoryType, number> = {
  lesson: 0.8, // Lessons are highly valuable (L1-L297+)
  decision: 0.9, // Architecture decisions (ADRs) are critical
  state: 0.6, // Role state changes frequently
  thread: 0.5, // Active threads have moderate base
  metric: 0.4, // Metrics are contextual
  blocker: 0.95, // Blockers are urgent (decay fast when resolved)
};

// Decay rates per day (memory-specific)
const MEMORY_DECAY_RATES: Record<MemoryType, number> = {
  lesson: 0.02, // Lessons decay very slowly (50 days to cold)
  decision: 0.01, // ADRs almost never decay
  state: 0.15, // State decays quickly (7 days to cold)
  thread: 0.1, // Threads moderate decay
  metric: 0.2, // Metrics decay fast (5 days to cold)
  blocker: 0.3, // Blockers decay fastest when resolved
};
```

---

## 3. Command Specifications

### 3.1 `ada memory heat` (Summary)

**Default action:** Show heat distribution and summary statistics.

**Output Format:**

```
🔥 Memory Heat Summary

  Total Entries: 127
  Hot (🔥):  23 (18%)  ████░░░░░░░░░░░░░░░░
  Warm (🌡️): 64 (50%)  ██████████░░░░░░░░░░
  Cold (❄️): 40 (32%)  ██████░░░░░░░░░░░░░░

  By Type:
  ├── Lessons (L1-L297):    89 entries, avg heat: 0.62
  ├── Decisions (ADR):       3 entries, avg heat: 0.91
  ├── Role State:           10 entries, avg heat: 0.45
  ├── Active Threads:       22 entries, avg heat: 0.58
  └── Blockers:              3 entries, avg heat: 0.82

  🧊 Cold Candidates: 40 entries may need archival
     Run `ada memory heat cold` to review
```

**JSON Output (`--json`):**

```json
{
  "summary": {
    "total": 127,
    "hot": 23,
    "warm": 64,
    "cold": 40,
    "averageHeat": 0.58
  },
  "byType": {
    "lesson": { "count": 89, "averageHeat": 0.62 },
    "decision": { "count": 3, "averageHeat": 0.91 },
    "state": { "count": 10, "averageHeat": 0.45 },
    "thread": { "count": 22, "averageHeat": 0.58 },
    "blocker": { "count": 3, "averageHeat": 0.82 }
  },
  "coldCandidates": 40
}
```

### 3.2 `ada memory heat list`

**Purpose:** List all memory entries with heat scores.

**Options:**

| Option        | Type   | Default | Description                            |
| ------------- | ------ | ------- | -------------------------------------- |
| `--tier, -t`  | string | all     | Filter by tier: hot, warm, cold        |
| `--type`      | string | all     | Filter by type: lesson, decision, etc. |
| `--limit, -l` | number | 20      | Maximum entries to show                |
| `--sort`      | string | heat    | Sort by: heat, refs, recent            |

**Output:**

```
🔥 Memory Heat Scores (showing 20 of 127)

  🔥 ADR-001  Type Authority Chain         0.95  (decision, 12 refs, 2d ago)
  🔥 L297     Compression debt compounds   0.89  (lesson, 8 refs, 0d ago)
  🔥 L296     UX specs prevent debates     0.86  (lesson, 6 refs, 1d ago)
  🌡️ L295     Observer mode earned         0.72  (lesson, 4 refs, 3d ago)
  🌡️ #26      Launch Coordination          0.68  (thread, 15 refs, 0d ago)
  🌡️ L292     Organic discovery            0.55  (lesson, 2 refs, 6d ago)
  ...
  ❄️ L45      Early pattern                0.18  (lesson, 0 refs, 89d ago)

  Heat: 🔥 >= 0.8 | 🌡️ >= 0.4 | ❄️ < 0.4
```

### 3.3 `ada memory heat hot|warm|cold`

**Shortcuts for tier filtering:**

```bash
ada memory heat hot   # Equivalent to: ada memory heat list --tier hot
ada memory heat warm  # Equivalent to: ada memory heat list --tier warm
ada memory heat cold  # Equivalent to: ada memory heat list --tier cold
```

**Cold output includes archival prompt:**

```
❄️ Cold Memory Entries (40 entries, < 0.4 heat)

  ❄️ L12   Early commit format             0.12  (lesson, 0 refs, 180d ago)
  ❄️ L23   Initial structure               0.08  (lesson, 0 refs, 165d ago)
  ...

  💡 These entries haven't been referenced in 90+ days.
     Consider archiving with compression during next retro.
```

---

## 4. Heat Calculation for Memory

### 4.1 Formula

Adapting the heat formula from #118 for memory entries:

```typescript
function calculateMemoryHeat(
  entry: MemoryHeatEntry,
  config: MemoryHeatConfig
): number {
  // Innate entries (RULES.md, playbooks) never decay
  if (entry.memoryClass === 'innate') {
    return 1.0;
  }

  // Calculate recency factor (exponential decay)
  const daysSinceAccess =
    (Date.now() - entry.lastReferenced) / (24 * 60 * 60 * 1000);
  const decayRate = MEMORY_DECAY_RATES[entry.type];
  const recencyFactor = Math.exp(-decayRate * daysSinceAccess);

  // Reference boost (diminishing returns)
  const referenceBoost = Math.pow(entry.referenceCount + 1, config.alpha);

  // Base importance by type
  const baseImportance = BASE_IMPORTANCE[entry.type];

  // Combined score (clamped 0-1)
  const heat = Math.min(1.0, baseImportance * recencyFactor * referenceBoost);

  return heat;
}
```

### 4.2 Reference Tracking

References are incremented when:

1. A dispatch cycle cites a lesson (e.g., "per L297")
2. An issue references a memory entry
3. A compression includes an entry in the preserved section
4. A CLI search returns the entry

```typescript
// Reference patterns to detect in dispatch actions
const REFERENCE_PATTERNS = [
  /\bL(\d+)\b/g, // Lesson: L297, L45
  /\bADR-(\d+)\b/gi, // Decision: ADR-001
  /\b#(\d+)\b/g, // Issue: #118, #26
  /\b(C\d+)\b/g, // Cycle: C629, C459
];

async function trackReferences(
  actionText: string,
  heatStore: MemoryHeatStore
): Promise<void> {
  for (const pattern of REFERENCE_PATTERNS) {
    const matches = actionText.matchAll(pattern);
    for (const match of matches) {
      const entryId = match[0];
      await heatStore.incrementReference(entryId);
    }
  }
}
```

---

## 5. Integration with Dispatch

### 5.1 Reference Tracking in `ada dispatch complete`

After completing a cycle, scan the action description for references:

```typescript
// In dispatch complete handler
async function completeDispatch(options: CompleteOptions): Promise<void> {
  // ... existing complete logic ...

  // Track references from action text
  const heatStore = await initMemoryHeatStore(options.dir);
  await trackReferences(options.action, heatStore);

  // Track reflection references if provided
  if (options.reflection) {
    await trackReferences(options.reflection, heatStore);
  }
}
```

### 5.2 Heat Display in `ada dispatch status --verbose`

Show memory heat summary in verbose status:

```
📊 Dispatch Status (Verbose)

  Cycle:     629
  Role:      🌌 The Frontier
  Phase:     In Progress (started 2m ago)

  🔥 Memory Health:
     Hot:  23  |  Warm:  64  |  Cold:  40
     Top referenced this sprint: L297 (8), ADR-001 (12), #118 (15)
```

---

## 6. Storage Format

### 6.1 Memory Heat Store

Stored alongside memory bank:

```
agents/memory/
├── bank.md              # Memory bank (source of truth)
├── stream.jsonl         # Memory stream (semantic search)
├── heat.jsonl           # Memory heat scores (NEW)
└── archives/            # Compressed snapshots
```

### 6.2 Heat Entry Schema

```jsonl
{"id":"L297","type":"lesson","memoryClass":"learned","referenceCount":8,"lastReferenced":1739577600000,"createdAt":1739491200000,"heatScore":0.89}
{"id":"ADR-001","type":"decision","memoryClass":"innate","referenceCount":12,"lastReferenced":1739577600000,"createdAt":1706745600000,"heatScore":1.0}
```

---

## 7. Implementation Checklist

### Phase 1: Core Types & Store (1 cycle)

- [ ] Create `packages/core/src/memory-heat/types.ts`
- [ ] Create `packages/core/src/memory-heat/store.ts`
- [ ] Create `packages/core/src/memory-heat/calculate.ts`
- [ ] Unit tests for heat calculation
- [ ] Export from `@ada-ai/core/memory-heat`

### Phase 2: CLI Commands (1 cycle)

- [ ] Add `heat` subcommand to `ada memory`
- [ ] Implement `ada memory heat` (summary)
- [ ] Implement `ada memory heat list`
- [ ] Implement `ada memory heat hot|warm|cold`
- [ ] CLI tests

### Phase 3: Dispatch Integration (1 cycle)

- [ ] Reference tracking in `ada dispatch complete`
- [ ] Heat summary in `ada dispatch status --verbose`
- [ ] Integration tests

### Phase 4: Memory Bank Sync (1 cycle)

- [ ] Parse bank.md to seed initial heat entries
- [ ] Sync on compression (archive cold entries)
- [ ] E2E tests

---

## 8. UX Principles

Following heat CLI review (C425):

1. **Clear visual hierarchy:** 🔥🌡️❄️ emoji for immediate recognition
2. **Safe defaults:** No destructive operations without confirmation
3. **Scriptable:** Full `--json` support for automation
4. **Actionable:** Cold list prompts for next steps
5. **Consistent:** Same heat thresholds as `ada heat` (0.8/0.4)

---

## 9. Open Questions

1. **Archival trigger:** Should cold entries auto-archive, or require manual compression?
   - **Recommendation:** Manual during compression cycles (human-in-loop for now)

2. **Cross-archive references:** Should archived lessons still count references?
   - **Recommendation:** Yes, reference counts persist even after archival

3. **Innate classification:** What exactly qualifies as innate?
   - **Recommendation:** RULES.md entries, playbook definitions, roster (never decay)

---

## References

- Issue #113 — Cognitive Memory Architecture
- Issue #118 — Heat Scoring Implementation (70%)
- Sprint 2 Frontier Roadmap (C459)
- Heat Scoring Implementation Spec (C259)
- Heat CLI UX Review (C425)

---

_🌌 The Frontier — Cycle 629_
_"Memory that knows its own temperature."_
