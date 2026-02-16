# 🧠 Cognitive Memory Specification

> Formal specification for the Innate/Learned memory architecture with Reference-Based Heat Scoring.
> **Issue:** #113 | **Cycle:** 756 | **Author:** 🌌 Frontier
> **Status:** DRAFT | **Paper Section:** 4.5

---

## 1. Overview

This specification formalizes the cognitive memory architecture proposed in #113 and documented in Section 4.5 of the arXiv paper (C755). It provides implementation-ready definitions for:

1. **Memory Classification** — Innate vs Learned boundaries
2. **Heat Scoring Algorithm** — Reference-based heat with decay
3. **Storage Tiers** — Hot/Warm/Cold with behaviors
4. **State Transitions** — Promotion and demotion rules
5. **CLI Integration** — `ada memory` command extensions

---

## 2. Memory Classification

### 2.1 Innate Memory (Protected)

**Definition:** Memory items that are hardwired and cannot be modified by agent experience.

```typescript
interface InnateMemory {
  readonly kind: 'innate';
  readonly id: string;
  readonly content: string;
  readonly category: InnateCatgory;
  readonly created: number; // Unix timestamp
}

type InnateCategory =
  | 'safety' // Safety constraints (cannot harm, cannot deceive)
  | 'identity' // Core identity (SOUL.md equivalent)
  | 'reasoning' // Fundamental reasoning patterns
  | 'language' // Language primitives
  | 'tools'; // Tool usage schemas
```

**Properties:**

- Cannot be overwritten by learned experience
- Always in HOT tier (heat = 1.0, fixed)
- Loaded before any learned memory
- Forms substrate for all learned memory references

**Examples:**

- Safety: "Never expose credentials in logs"
- Identity: "I am ADA role: Engineering"
- Tools: "Git commands: commit, push, pull, branch"

### 2.2 Learned Memory (Evolving)

**Definition:** Memory items acquired through agent experience that evolve based on usage.

```typescript
interface LearnedMemory {
  kind: 'learned';
  id: string;
  content: string;
  category: LearnedCategory;
  created: number; // Unix timestamp
  lastAccessed: number; // Unix timestamp
  referenceCount: number; // Times retrieved
  heat: number; // 0.0 - 1.0
  tier: HeatTier;
  source?: MemorySource;
}

type LearnedCategory =
  | 'preference' // User/project preferences
  | 'context' // Project-specific context
  | 'lesson' // Lessons learned (from Reflexion)
  | 'decision' // Architecture decisions (ADRs)
  | 'relationship' // Inter-role/inter-agent patterns
  | 'expertise'; // Domain knowledge acquired

type HeatTier = 'hot' | 'warm' | 'cold';

interface MemorySource {
  cycle?: number;
  role?: string;
  issue?: number;
}
```

**Properties:**

- Heat score evolves based on reference frequency
- Can be promoted (cold→warm→hot) or demoted (hot→warm→cold)
- Cold memories archived but retrievable
- High-heat learned memories can approach innate status (heat → 0.99)

---

## 3. Heat Scoring Algorithm

### 3.1 Formula

```
heat = min(1.0, base_importance × recency_factor × (1 + α × log(reference_count + 1)))
```

Where:

- `base_importance` ∈ [0.1, 1.0] — Initial importance weight
- `recency_factor` = exp(-λ × days_since_access), λ = 0.05
- `reference_count` — Number of times retrieved
- `α` = 0.3 — Reference amplification factor

### 3.2 Parameters

```typescript
const HEAT_CONFIG = {
  // Decay
  decayLambda: 0.05, // Decay rate per day
  minHeat: 0.01, // Floor (never reaches 0)

  // Amplification
  referenceAlpha: 0.3, // Log amplification factor
  maxReferenceBoost: 2.0, // Cap on reference multiplier

  // Thresholds
  hotThreshold: 0.8, // heat >= 0.8 → HOT
  warmThreshold: 0.4, // heat >= 0.4 → WARM
  coldThreshold: 0.1, // heat < 0.1 → eligible for archive

  // Base importance by category
  baseImportance: {
    lesson: 0.7,
    decision: 0.8,
    preference: 0.5,
    context: 0.4,
    relationship: 0.6,
    expertise: 0.6,
  },
};
```

### 3.3 Heat Update Triggers

| Event            | Heat Impact                      |
| ---------------- | -------------------------------- |
| Memory created   | `heat = base_importance`         |
| Memory retrieved | `reference_count++`, recalculate |
| Time passes      | Recency decay applied            |
| Explicit boost   | `heat = min(1.0, heat + 0.2)`    |
| Explicit demote  | `heat = max(0.01, heat - 0.2)`   |

---

## 4. Storage Tiers

### 4.1 Tier Definitions

| Tier        | Heat Range | Storage Location | Retrieval     | Behavior                  |
| ----------- | ---------- | ---------------- | ------------- | ------------------------- |
| 🔥 **HOT**  | ≥ 0.8      | Working memory   | Always loaded | Included in every context |
| 🟠 **WARM** | 0.4 - 0.8  | Active pool      | On relevance  | Semantic search retrieval |
| 🧊 **COLD** | < 0.4      | Archive          | Explicit only | Requires `--include-cold` |

### 4.2 Tier Behaviors

```typescript
interface TierBehavior {
  hot: {
    autoLoad: true; // Loaded into context automatically
    maxItems: 20; // Cap to prevent context overflow
    persistLocation: 'memory/hot.json';
  };
  warm: {
    autoLoad: false;
    retrievalMethod: 'semantic'; // Vector similarity search
    topK: 10; // Max items per query
    persistLocation: 'memory/warm.json';
  };
  cold: {
    autoLoad: false;
    retrievalMethod: 'explicit'; // Requires exact query or --include-cold
    archiveAfterDays: 30; // Move to archive after 30 days cold
    persistLocation: 'memory/archives/';
  };
}
```

---

## 5. State Transitions

### 5.1 Transition Rules

```
┌─────────────────────────────────────────────────────────┐
│                      INNATE                             │
│                  (always hot, protected)                │
└─────────────────────────────────────────────────────────┘
                           │
                   provides substrate
                           ▼
┌─────────┐    promote    ┌─────────┐    promote    ┌─────────┐
│  COLD   │──────────────▶│  WARM   │──────────────▶│   HOT   │
│  <0.4   │               │ 0.4-0.8 │               │  ≥0.8   │
│ archive │◀──────────────│ active  │◀──────────────│ working │
└─────────┘    demote     └─────────┘    demote     └─────────┘
     │                                                    ▲
     │           retrieval → reference_count++           │
     └────────────────────────────────────────────────────┘
```

### 5.2 Transition Pseudocode

```typescript
function updateTier(memory: LearnedMemory): LearnedMemory {
  const newHeat = calculateHeat(memory);
  let newTier: HeatTier;

  if (newHeat >= HEAT_CONFIG.hotThreshold) {
    newTier = 'hot';
  } else if (newHeat >= HEAT_CONFIG.warmThreshold) {
    newTier = 'warm';
  } else {
    newTier = 'cold';
  }

  // Log tier transition
  if (newTier !== memory.tier) {
    logTransition(memory.id, memory.tier, newTier, newHeat);
  }

  return { ...memory, heat: newHeat, tier: newTier };
}
```

---

## 6. Hallucination Reduction Mechanisms

### 6.1 Protection Layers

| Mechanism             | How It Reduces Hallucination                              |
| --------------------- | --------------------------------------------------------- |
| **Innate protection** | Core facts cannot be overwritten by false patterns        |
| **Reference decay**   | Unreferenced "memories" fade, reducing spurious retrieval |
| **Cold barrier**      | Stale/wrong info requires explicit recall                 |
| **Source tracking**   | Every memory has provenance (cycle, role, issue)          |

### 6.2 Confidence Scoring

```typescript
function getConfidence(memory: LearnedMemory): number {
  const heatWeight = 0.4;
  const referenceWeight = 0.3;
  const recencyWeight = 0.3;

  const normalizedRefs = Math.min(1, memory.referenceCount / 10);
  const daysSince = (Date.now() - memory.lastAccessed) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.exp(-0.1 * daysSince);

  return (
    heatWeight * memory.heat +
    referenceWeight * normalizedRefs +
    recencyWeight * recencyScore
  );
}
```

Memories with confidence < 0.3 are flagged as uncertain and excluded from authoritative responses.

---

## 7. CLI Integration

### 7.1 New Commands

```bash
# List memories with heat scores
ada memory list --show-heat
ada memory list --tier hot|warm|cold

# Search with heat-aware ranking
ada memory search "context optimization" --boost-hot

# Inspect specific memory
ada memory get <id> --show-provenance

# Manual heat adjustment
ada memory boost <id>    # +0.2 heat
ada memory demote <id>   # -0.2 heat

# Tier management
ada memory archive       # Move all cold >30 days to archive
ada memory compact       # Compress hot tier if >20 items
```

### 7.2 Output Format

```
$ ada memory list --show-heat

🔥 HOT (5 items)
  [0.95] #L371 — "Bootstrap SaaS requires margin validation..."
  [0.92] #L373 — "Model selection research should quantify..."
  [0.88] #L377 — "Full pipeline completion delivers features in 6 cycles"
  [0.85] #L392 — "Pre-dogfooding validation catches bugs"
  [0.81] #L393 — "CI-enforced rules > documentation-only rules"

🟠 WARM (12 items)
  [0.72] #ADR-001 — Type Authority Chain (accessed 3d ago)
  [0.65] #CTX-042 — Sprint 3 goals: SaaS Container Complete
  ...

🧊 COLD (28 items, use --include-cold to see)
```

---

## 8. Data Model

### 8.1 File Structure

```
agents/memory/
├── bank.md           # Human-readable aggregate (unchanged)
├── innate.json       # Protected innate memories
├── hot.json          # HOT tier learned memories
├── warm.json         # WARM tier learned memories
├── cold.json         # COLD tier learned memories
└── archives/
    ├── bank-YYYY-MM-DD-vN.md  # Compressed snapshots
    └── cold-YYYY-MM.json      # Monthly cold archives
```

### 8.2 JSON Schema

```typescript
interface MemoryStore {
  version: number;
  lastUpdated: string; // ISO timestamp
  innate: InnateMemory[];
  learned: {
    hot: LearnedMemory[];
    warm: LearnedMemory[];
    cold: LearnedMemory[];
  };
  metadata: {
    totalItems: number;
    lastCompaction: string;
    heatRecalculatedAt: string;
  };
}
```

---

## 9. Implementation Phases

| Phase       | Scope                                       | Target   |
| ----------- | ------------------------------------------- | -------- |
| **Phase 1** | Heat scoring + tier display (`--show-heat`) | Sprint 3 |
| **Phase 2** | Storage tier split (hot/warm/cold.json)     | Sprint 3 |
| **Phase 3** | Automatic tier transitions + decay          | Sprint 4 |
| **Phase 4** | Semantic retrieval for warm tier            | Sprint 4 |
| **Phase 5** | Innate memory protection                    | Sprint 5 |

---

## 10. Success Metrics

| Metric              | Baseline | Target                           |
| ------------------- | -------- | -------------------------------- |
| Context token usage | N/A      | -30% (via tier filtering)        |
| Retrieval accuracy  | N/A      | >90% relevant items in top-5     |
| Hallucination rate  | N/A      | <5% false claims with provenance |
| Cold archive growth | N/A      | Linear (compaction working)      |

---

## 11. Open Questions

1. **Embedding model** — Which model for semantic warm-tier retrieval? (MiniLM? OpenAI ada-002?)
2. **Innate bootstrapping** — How are innate memories initially populated? (From SOUL.md? RULES.md?)
3. **Cross-agent heat** — Should reference_count include retrievals by other roles?
4. **Compression interaction** — How does R-002 bank.md compression interact with JSON tiers?

---

## 12. References

- Issue #113 — Research: Cognitive Memory Architecture
- Section 4.5 — arXiv paper (C755)
- docs/research/arxiv-cognitive-memory-c746.md — Paper section draft
- Related: #91 (Improving Memory System), #95 (MemoryStream)

---

_Specification created C756. Ready for Product acceptance criteria and Engineering implementation planning._
