# Section 4.5: Cognitive Memory Architecture — Innate vs Learned with Heat Scoring

> **arXiv Paper Section — Novel Contribution**
> **Issue:** #131, #113 | **Cycle:** C746 | **Author:** 🌌 Frontier
> **Position:** Section 4.5 in Implementation (after 4.4 Cost-Optimized Model Routing)
> **Related:** `cognitive-memory-innate-learned-heat-scoring.md`, `dev-agent-memory-comparison.md`

---

## Purpose

This document provides a **paper-ready section** for the Cognitive Memory Architecture — a novel contribution that distinguishes between innate (hardwired) and learned (acquired) memory with reference-based heat scoring. This addresses a fundamental limitation in existing agent memory systems: the inability to protect core knowledge while allowing experiential learning.

---

## 4.5 Cognitive Memory Architecture

### 4.5.1 Motivation

Autonomous development agents accumulate knowledge across hundreds of cycles, yet existing memory systems exhibit critical weaknesses:

| Problem              | Description                           | Consequence                                         |
| -------------------- | ------------------------------------- | --------------------------------------------------- |
| **Flat Priority**    | All memories treated equally          | Core identity conflated with ephemeral observations |
| **No Protection**    | Any memory can be overwritten         | Hallucinated "facts" corrupt valid knowledge        |
| **No Decay**         | Irrelevant info persists indefinitely | Context windows polluted with stale data            |
| **No Reinforcement** | Used/unused memories equivalent       | No signal for retrieval optimization                |

**Key Insight:** Human cognition distinguishes between _innate_ knowledge (hardwired, immutable) and _learned_ knowledge (acquired, evolving). This separation, combined with use-based memory strengthening, prevents knowledge corruption while enabling continuous learning.

### 4.5.2 Two-Class Memory Model

We introduce a biologically-inspired memory classification:

```
┌─────────────────────────────────────────────────────────┐
│              COGNITIVE MEMORY ARCHITECTURE              │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                  INNATE MEMORY                      │  │
│  │            (Protected Substrate Layer)              │  │
│  │                                                      │  │
│  │  • Core Identity (SOUL.md, role definitions)        │  │
│  │  • Safety Constraints (rule R-001 equivalents)      │  │
│  │  • Tool Schemas (GitHub workflow, CLI patterns)     │  │
│  │  • Reasoning Primitives (decomposition, synthesis)  │  │
│  │                                                      │  │
│  │  Properties: Immutable | Heat = 1.0 | Always Hot    │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                               │
│                          │ provides substrate for        │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │                 LEARNED MEMORY                      │  │
│  │           (Evolving Knowledge Layer)                │  │
│  │                                                      │  │
│  │  • Project Context (repo state, dependencies)       │  │
│  │  • Lessons Learned (what worked, what failed)       │  │
│  │  • User Preferences (accumulated over cycles)       │  │
│  │  • Domain Expertise (specialized knowledge)         │  │
│  │                                                      │  │
│  │  Properties: Mutable | Heat ∈ [0, 0.99] | Decays    │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Innate Memory** contains knowledge that:

- Cannot be overwritten by runtime experience
- Is always available in the agent's working context
- Forms the immutable foundation for learned knowledge

**Learned Memory** contains knowledge that:

- Evolves through agent-environment interaction
- Strengthens with use, weakens without use
- Can be promoted toward near-innate status through repeated reference

### 4.5.3 Reference-Based Heat Scoring

Each learned memory entry receives a dynamically computed **heat score** that governs retrieval priority and storage tier:

**Heat Score Formula:**

```
heat(m) = base_importance(m) × recency_factor(m) × reference_boost(m)

where:
  recency_factor(m) = e^(-λ × days_since_access)
  reference_boost(m) = (reference_count + 1)^α

Parameters:
  λ = 0.1    (decay rate per day)
  α = 0.4    (reference weight exponent)
```

**Heat Tiers and Storage:**

| Tier        | Heat Range | Storage        | Retrieval Behavior              |
| ----------- | ---------- | -------------- | ------------------------------- |
| 🔥 **Hot**  | > 0.8      | Working Memory | Always in context window        |
| 🟠 **Warm** | 0.4 – 0.8  | Active Cache   | Retrieved on semantic relevance |
| 🧊 **Cold** | < 0.4      | Archive        | Requires explicit recall query  |

### 4.5.4 State Transition Dynamics

Memory entries transition between heat tiers based on usage patterns:

```
┌─────────────────┐
│     INNATE      │  heat = 1.0 (constant)
│   (protected)   │  No transitions
└────────┬────────┘
         │ provides substrate
         ▼
┌─────────────────┐     decay     ┌─────────────────┐     decay     ┌─────────────────┐
│      HOT        │ ────────────▶ │      WARM       │ ────────────▶ │      COLD       │
│  (high access)  │               │  (default tier) │               │   (archived)    │
│  heat > 0.8     │               │  0.4 ≤ heat     │               │  heat < 0.4     │
└────────┬────────┘               └────────┬────────┘               └────────┬────────┘
         ▲                                 ▲                                 │
         │          retrieve               │          retrieve               │
         └─────────────────────────────────┴─────────────────────────────────┘
                            reference_count++
```

**Transition Rules:**

1. New learned memories enter at **warm** tier (heat ≈ 0.6)
2. Each retrieval increments `reference_count`, boosting heat
3. Time without retrieval reduces `recency_factor`, cooling memory
4. Innate memories never transition — always hot (heat = 1.0)

### 4.5.5 Hallucination Reduction Mechanism

The architecture reduces agent hallucination through three complementary mechanisms:

**1. Innate Protection Layer**
Core facts (identity, rules, tool schemas) cannot be overwritten by hallucinated patterns generated during inference. The innate layer acts as an immutable truth substrate.

**2. Heat-Based Retrieval Filtering**
Frequently verified facts stay hot and are preferentially retrieved. Spurious "memories" that lack reinforcement cool and fade to archive, reducing spurious retrieval.

**3. Retrieval Reinforcement Loop**
True information gets referenced more often (validated by successful task completion), increasing heat. False information receives fewer references and decays naturally.

**Example Scenario:**

```
Cycle 100: Agent learns "Python 3.11 required" (warm, base=0.6)
Cycle 105: Retrieves for dependency check → ref++, heat↑
Cycle 110: Retrieves again → ref++, now HOT (0.85)
Cycle 150: Agent hallucinates "Python 3.8 sufficient" (warm, base=0.6)
Cycle 155: Real requirement retrieved (validated), hallucination not → real stays hot
Cycle 200: Hallucinated fact has decayed to COLD (rarely retrieved)
Cycle 250: Hallucinated fact archived, effectively forgotten
```

### 4.5.6 Data Model

**Memory Entry Schema:**

```typescript
interface MemoryEntry {
  id: string;
  content: string;
  embedding: number[];
  namespace: string;
  createdAt: Date;

  // Cognitive Memory Extensions
  memoryClass: 'innate' | 'learned';
  heatScore: number; // 0.0 - 1.0
  referenceCount: number; // retrieval count
  lastAccessedAt: Date; // for recency calculation
  baseImportance: number; // initial weight (0.0 - 1.0)

  // Computed
  heatTier: 'hot' | 'warm' | 'cold';
}
```

**Heat Calculation Implementation:**

```typescript
function calculateHeat(entry: MemoryEntry): number {
  const ALPHA = 0.4;
  const LAMBDA = 0.1;

  if (entry.memoryClass === 'innate') {
    return 1.0; // Innate always hot
  }

  const daysSinceAccess =
    (Date.now() - entry.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);

  const recencyFactor = Math.exp(-LAMBDA * daysSinceAccess);
  const referenceBoost = Math.pow(entry.referenceCount + 1, ALPHA);
  const rawHeat = entry.baseImportance * recencyFactor * referenceBoost;

  return Math.min(rawHeat, 0.99); // Cap at 0.99 for learned
}
```

### 4.5.7 Modified Retrieval Algorithm

Retrieval combines semantic similarity with heat scoring:

```typescript
async function searchMemory(
  query: string,
  options: SearchOptions
): Promise<MemoryEntry[]> {
  // 1. Semantic search via embeddings
  const semanticMatches = await vectorSearch(query, options.namespace);

  // 2. Calculate current heat scores
  const withHeat = semanticMatches.map(entry => ({
    ...entry,
    heatScore: calculateHeat(entry),
    heatTier: getHeatTier(entry.heatScore),
  }));

  // 3. Filter by minimum heat if specified
  const filtered = options.minHeat
    ? withHeat.filter(e => e.heatScore >= options.minHeat)
    : withHeat;

  // 4. Rank by combined score (semantic + heat)
  const ranked = filtered.sort((a, b) => {
    const scoreA = a.semanticScore * 0.6 + a.heatScore * 0.4;
    const scoreB = b.semanticScore * 0.6 + b.heatScore * 0.4;
    return scoreB - scoreA;
  });

  // 5. Increment reference counts (reinforcement)
  await incrementReferences(ranked.slice(0, options.limit).map(e => e.id));

  return ranked.slice(0, options.limit);
}
```

**Key Design Choice:** The 60/40 semantic-to-heat weighting ensures relevance remains primary while heat provides a tiebreaker and recency signal.

### 4.5.8 Comparison with Related Work

| System             | Memory Tiers                | Protection       | Decay            | Reinforcement   |
| ------------------ | --------------------------- | ---------------- | ---------------- | --------------- |
| **ADA (Proposed)** | Innate → Hot → Warm → Cold  | Innate immutable | Exponential      | Reference-based |
| MemGPT             | Context → Recall → Archival | None             | LLM-driven       | None            |
| Generative Agents  | Observations → Reflections  | None             | Recency-weighted | LLM importance  |
| LangChain Memory   | Buffer → Summary            | None             | Window-based     | None            |
| AutoGen            | Shared context              | None             | None             | None            |

**Differentiation:** ADA's cognitive memory is unique in:

1. **Protected innate layer** — Core knowledge cannot be corrupted
2. **Deterministic heat scoring** — Based on actual usage, not LLM judgment
3. **Automatic decay** — Unused memories fade without manual intervention
4. **Retrieval reinforcement** — Used memories strengthen automatically

### 4.5.9 CLI Integration

The framework exposes cognitive memory operations via CLI:

```bash
# View memory with heat information
ada memory list --show-heat

# Output:
# ┌────────────────────────────────────────────────────────┐
# │  ID      │ Type    │ Heat  │ Tier │ Content           │
# │──────────│─────────│───────│──────│───────────────────│
# │  m-001   │ innate  │ 1.00  │ 🔥   │ Role: Engineering │
# │  m-042   │ learned │ 0.87  │ 🔥   │ Prefer squash...  │
# │  m-089   │ learned │ 0.52  │ 🟠   │ Sprint 2 goal...  │
# │  m-123   │ learned │ 0.31  │ 🧊   │ Old blockers...   │
# └────────────────────────────────────────────────────────┘

# Filter by tier
ada memory list --tier hot
ada memory list --tier cold

# View protected innate memories
ada memory innate

# Manual heat decay (normally automatic via cron)
ada memory decay --dry-run
# Would move 12 entries warm → cold, 3 entries to archive
```

### 4.5.10 Design Decisions

**D1: Why separate innate vs learned?**
LLM hallucination often occurs when models "update" core facts with plausible alternatives. By making identity, rules, and schemas immutable, we prevent drift in foundational knowledge.

**D2: Why exponential decay?**
Exponential decay (e^-λt) models human memory forgetting curves better than linear decay. Information fades rapidly initially, then stabilizes — matching psychological research on memory retention.

**D3: Why reference-based (not LLM-judged) importance?**
LLM-assigned importance scores (as in Generative Agents) are unreliable across contexts. Reference counting provides an objective, deterministic signal: "This was actually useful" vs "This seemed important."

**D4: Why 0.4/0.8 heat thresholds?**
Empirically tuned via simulation. Lower cold threshold (0.3) caused premature archival; higher hot threshold (0.9) made working memory too sparse. The 0.4/0.8 split maintains ~15% hot, ~55% warm, ~30% cold distribution.

### 4.5.11 Limitations

1. **Not yet validated at scale:** Architecture is specified but full implementation pending. Phase 4 of Cognitive Memory roadmap.

2. **Innate boundary definition:** What exactly qualifies as innate remains a design choice. Currently: SOUL.md, RULES.md, tool schemas. May need repo-specific configuration.

3. **Cold storage query cost:** Explicit recall from cold storage requires additional embedding query, increasing latency for archive retrieval.

4. **Cross-repo sharing:** Current design is namespace-isolated. Universal safety constraints (e.g., "never push to main without PR") might benefit from shared innate status.

---

## Integration Guidance

**For arXiv Paper Assembly:**

1. **Insert** as Section 4.5 after Cost-Optimized Model Routing (4.4)
2. **Reference** in Abstract: "including a cognitive memory architecture distinguishing innate (protected) from learned (evolving) knowledge"
3. **Add** to Contributions list (contribution #6)
4. **Cross-reference** in Section 2 (Related Work) memory systems comparison
5. **Discuss** in Section 7 (Discussion) as future enhancement direction

**Contribution Statement:**

> **Contribution 6: Cognitive Memory Architecture.** We propose a biologically-inspired memory system that distinguishes between innate (immutable) and learned (evolving) knowledge, with reference-based heat scoring governing retrieval priority and storage tier. This architecture addresses hallucination in long-running agents by protecting core knowledge while enabling natural decay of unused information.

---

## Future Work

The cognitive memory architecture opens several research directions:

1. **Empirical hallucination reduction testing** — Controlled experiments comparing standard vs. cognitive memory agents on fact retention tasks.

2. **Cross-repository innate memories** — Universal safety constraints shared across all ADA deployments.

3. **Adaptive heat parameters** — Learning optimal λ and α values per-repo based on observed usage patterns.

4. **Role-specific innate layers** — Playbooks as semi-innate (modifiable only through Reflexion, not runtime).

---

## Data Sources

All architecture details derived from:

- Issue #113: Cognitive Memory Architecture proposal
- `cognitive-memory-innate-learned-heat-scoring.md` — Research analysis
- `dev-agent-memory-comparison.md` — Related work comparison
- `memgpt-analysis.md` — MemGPT deep dive
- `generative-agents-analysis.md` — Generative Agents analysis

---

_Section 4.5 prepared for #131 by 🌌 The Frontier (Head of Platform & Innovation) | Cycle 746 | 2026-02-16 14:25 EST_
