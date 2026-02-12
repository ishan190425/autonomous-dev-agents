# 🌌 Sprint 2 Frontier Roadmap

> Implementation plan for frontier capabilities: Cognitive Memory, Reflexion Phase 2, and Self-Improving Playbooks.
> **Author:** Frontier (🌌 The Frontier)
> **Cycle:** 459
> **Date:** 2026-02-12
> **Sprint 2:** Feb 28 – Mar 14, 2026
> **Related:** #108, #113, #118, related-work-literature-c458.md, pattern-to-playbook-automation-spec-c449.md

---

## Executive Summary

Sprint 2 brings ADA's frontier capabilities online. This roadmap connects research (#108, #113), existing implementation (#118), and new specs (C449, C458) into a coherent implementation plan.

**Goal:** Transform ADA from a coordinated agent team to a **self-improving system**.

**Key Deliverables:**

1. Memory heat scoring (extending #118 to memory bank)
2. Reflexion Phase 2 (pattern extraction from reflections)
3. Pattern-to-playbook automation (`ada playbook suggest`)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ADA Self-Improvement Loop                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐    ┌──────────────┐    ┌───────────────┐    ┌─────────┐ │
│   │ Dispatch │───►│  Reflection  │───►│ Pattern       │───►│ Playbook│ │
│   │ Cycle    │    │  Capture     │    │ Extraction    │    │ Update  │ │
│   │ (C1-C∞)  │    │  (#108 Ph1)  │    │ (#108 Ph2)    │    │ (C449)  │ │
│   └──────────┘    └──────────────┘    └───────────────┘    └─────────┘ │
│        │                 │                    │                  │      │
│        ▼                 ▼                    ▼                  ▼      │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │                      Memory Bank (bank.md)                        │ │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │ │
│   │  │ Innate   │  │ Learned  │  │ Heat     │  │ Lessons/Patterns │  │ │
│   │  │ (RULES)  │  │ (State)  │  │ Scoring  │  │ (L1-L197+)       │  │ │
│   │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  │ │
│   │                         (#113)               (#118)               │ │
│   └──────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Research Foundation

### Related Work Mapping (from C458)

| Research                            | ADA Feature                     | Status                | Sprint 2 Target    |
| ----------------------------------- | ------------------------------- | --------------------- | ------------------ |
| **Reflexion** (Shinn et al.)        | Verbal self-critique → retry    | Phase 1 ✅            | Phase 2: patterns  |
| **MemGPT** (Packer et al.)          | Hierarchical memory             | Partial (compression) | Heat tiers         |
| **Generative Agents** (Park et al.) | Reflection → insight extraction | Lessons learned       | Pattern automation |
| **DSPy Optimizers**                 | Prompt optimization             | Not started           | Future (P3)        |
| **Voyager**                         | Reusable skill library          | Playbooks exist       | Auto-update        |

### ADA Differentiation Points to Implement

From related-work-literature-c458.md, our key differentiators are:

1. ✅ Persistent memory with compression
2. ⏳ Cross-role reflexion for organizational patterns (Phase 2)
3. ⏳ Self-governance that evolves (pattern-to-playbook)
4. ⏳ Heat-based memory retrieval

---

## Implementation Phases

### Phase 1: Memory Heat Extension (Week 1)

**Goal:** Extend #118 heat scoring from issues to memory entries.

**Scope:**

- Add heat scoring to memory bank entries (lessons, decisions, state)
- Track reference counts when entries are cited in cycles
- Implement temperature decay for unreferenced entries

**Architecture:**

```typescript
// packages/core/src/memory/heat.ts

interface MemoryHeatEntry {
  id: string; // e.g., "L197" or "adr-001"
  type: 'lesson' | 'decision' | 'state' | 'thread';
  lastReferenced: number; // Unix timestamp
  referenceCount: number;
  heatScore: number; // 0.0 - 1.0
  temperature: 'hot' | 'warm' | 'cold';
}

// Heat calculation (from #113 spec)
function calculateHeat(entry: MemoryHeatEntry): number {
  const baseImportance = getBaseImportance(entry.type);
  const recencyFactor = calculateRecency(entry.lastReferenced);
  const referenceWeight = Math.pow(entry.referenceCount, 0.5); // α = 0.5

  return baseImportance * recencyFactor * referenceWeight;
}
```

**CLI Integration:**

```bash
ada memory heat           # Show memory heat map
ada memory hot            # List hot entries (> 0.8)
ada memory warm           # List warm entries (0.4 - 0.8)
ada memory cold           # List cold entries (< 0.4) — candidates for archival
```

**Deliverables:**

- [ ] `packages/core/src/memory/heat.ts` — Heat scoring for memory
- [ ] `packages/cli/src/commands/memory/heat.ts` — CLI commands
- [ ] Reference tracking in dispatch cycles
- [ ] Tests: unit + integration

**Dependencies:** #118 (heat scoring core) ✅

---

### Phase 2: Pattern Extraction (Week 2)

**Goal:** Implement Reflexion Phase 2 — automatic pattern detection from reflections.

**Scope:**

- Analyze reflection history for recurring themes
- Identify patterns at 70%+ confidence threshold
- Generate pattern candidates for review

**Architecture:**

```typescript
// packages/core/src/reflexion/patterns.ts

interface ReflexionPattern {
  id: string;
  theme: string; // e.g., "testing responsibility"
  occurrences: number; // How many reflections mention this
  confidence: number; // 0.0 - 1.0
  sourceReflections: string[]; // Cycle IDs
  suggestedLesson: string; // Draft lesson text
  status: 'candidate' | 'accepted' | 'rejected';
}

async function extractPatterns(
  reflections: Reflection[]
): Promise<ReflexionPattern[]> {
  // 1. Cluster reflections by semantic similarity
  // 2. Identify recurring themes
  // 3. Filter by confidence threshold (70%+)
  // 4. Generate lesson candidates
  return patterns;
}
```

**CLI Integration:**

```bash
ada reflexion patterns     # Detect patterns from reflection history
ada reflexion suggest      # Generate lesson candidates
ada reflexion accept <id>  # Promote pattern to lesson
ada reflexion reject <id>  # Mark pattern as not useful
```

**Deliverables:**

- [ ] `packages/core/src/reflexion/patterns.ts` — Pattern extraction
- [ ] `packages/cli/src/commands/reflexion.ts` — CLI commands
- [ ] Pattern → Lesson promotion workflow
- [ ] Tests: pattern detection accuracy

**Dependencies:** #108 Phase 1 (reflection capture) ✅

---

### Phase 3: Playbook Automation (Week 2-3)

**Goal:** Implement pattern-to-playbook automation (spec from C449).

**Scope:**

- Generate playbook suggestions from patterns + lessons
- Human-in-the-loop approval before changes
- Track suggestion acceptance rate

**Architecture:**

From C449 spec:

```typescript
// packages/core/src/playbook/suggestions.ts

interface PlaybookSuggestion {
  id: string;
  role: string; // Target playbook
  section: string; // Section to modify
  change: {
    type: 'add' | 'modify' | 'remove';
    content: string;
    rationale: string; // Why this change
  };
  sourcePatterns: string[];
  confidence: number;
  status: 'pending' | 'applied' | 'rejected';
}
```

**CLI Integration:**

```bash
ada playbook suggest        # Generate suggestions from patterns
ada playbook apply <id>     # Apply a suggestion
ada playbook reject <id>    # Reject a suggestion
ada playbook history        # View suggestion history
```

**Deliverables:**

- [ ] `packages/core/src/playbook/suggestions.ts` — Suggestion engine
- [ ] `packages/cli/src/commands/playbook/suggest.ts` — CLI commands
- [ ] Guardrails: max changes per cycle, rollback capability
- [ ] Tests: suggestion quality, guardrail enforcement

**Dependencies:** Phase 2 (pattern extraction)

---

## Unified Heat Model

### Connecting #118 (Issues) and #113 (Memory)

The heat scoring algorithm is shared:

```
heat_score = base_importance × recency_factor × reference_count^α
```

| Application       | Base Importance              | Recency Decay    | α (reference weight) |
| ----------------- | ---------------------------- | ---------------- | -------------------- |
| **Issues** (#118) | Priority (P0=1.0, P3=0.25)   | 7-day half-life  | 0.3                  |
| **Memory** (#113) | Type (lesson=0.8, state=0.5) | 14-day half-life | 0.5                  |

**Shared Module:**

```typescript
// packages/core/src/heat/core.ts

interface HeatConfig {
  baseImportance: (item: unknown) => number;
  recencyHalfLife: number; // days
  referenceWeight: number; // α
}

function calculateHeat(
  lastReferenced: number,
  referenceCount: number,
  config: HeatConfig
): number;
```

This allows consistent heat semantics across different applications while tuning parameters per domain.

---

## Success Metrics

| Metric                         | Baseline   | Target       | Measurement                         |
| ------------------------------ | ---------- | ------------ | ----------------------------------- |
| Patterns extracted/sprint      | 2 (manual) | 5+ (auto)    | Count patterns ≥70% confidence      |
| Lesson generation time         | 1 cycle    | Auto-suggest | Time from pattern → lesson          |
| Playbook suggestion acceptance | N/A        | 50%+         | Accepted / suggested                |
| Memory retrieval relevance     | N/A        | 80%+         | Hot items cited in cycles           |
| Token efficiency               | Baseline   | -10%         | Tokens per cycle via better context |

---

## Risk Mitigation

| Risk                               | Impact                  | Mitigation                                      |
| ---------------------------------- | ----------------------- | ----------------------------------------------- |
| Pattern extraction generates noise | Low quality suggestions | 70% confidence threshold, human review          |
| Playbook changes break dispatch    | Cycle failures          | Guardrails, rollback, dry-run mode              |
| Memory heat decay too aggressive   | Useful info lost        | Conservative decay, cold → archive (not delete) |
| Scope creep in Sprint 2            | Delayed delivery        | Phase 1 is MVP, Phases 2-3 can slip             |

---

## Timeline

```
Sprint 2: Feb 28 – Mar 14, 2026

Week 1 (Feb 28 - Mar 7):
├── Day 1-2: Memory heat extension (core)
├── Day 3-4: Memory heat CLI + tests
├── Day 5-7: Pattern extraction core + tests

Week 2 (Mar 7 - Mar 14):
├── Day 1-3: Pattern extraction CLI
├── Day 4-5: Playbook suggestion engine
├── Day 6-7: Playbook CLI + integration tests

Buffer: Week 3 if needed (patterns are complex)
```

---

## Open Questions

1. **Embedding-based patterns?** Should pattern extraction use semantic embeddings or keyword clustering? (Tradeoff: accuracy vs token cost)

2. **Cross-role patterns?** Current spec focuses on single-role patterns. Should we detect cross-role coordination patterns? (e.g., "Engineering + QA always collaborate on X")

3. **Feedback loop?** How do we measure if playbook changes actually improve outcomes? (May need A/B testing or before/after cycle metrics)

---

## Related Documents

- `docs/frontier/pattern-to-playbook-automation-spec-c449.md` — Detailed spec for Phase 3
- `docs/research/related-work-literature-c458.md` — Academic foundations
- `docs/research/cognitive-memory-spec.md` — Memory architecture research (#113)
- `docs/processes/reflexion-bootstrap-guide.md` — Reflexion Phase 1 implementation

---

_🌌 Frontier | Cycle 459 | Sprint 2 Frontier Roadmap_
_Cross-referenced: #108, #113, #118_
