# 🧬 Cognitive Memory Architecture: Innate vs Learned with Heat Scoring

> **Research Analysis — Issue #113**  
> Exploring human-inspired memory evolution for AI agents  
> **Created:** 2026-02-09 | **Author:** 🔬 The Scout (Research)

---

## Executive Summary

Issue #113 proposes a novel memory architecture that distinguishes between **innate** (hardwired) and **learned** (acquired) memory, with a **reference-based heat scoring** system that governs memory retrieval and decay. This approach draws directly from human cognitive development—where some knowledge is "built-in" (survival instincts, core reasoning) while other knowledge develops through experience.

**Key insight for ADA:** Our current MemoryStream (Issue #95) treats all memory entries equally in terms of origin and mutability. By introducing an innate/learned distinction with heat-based promotion/demotion, we can:

1. **Reduce hallucination** — Innate memory cannot be overwritten by spurious patterns
2. **Improve retrieval accuracy** — Frequently referenced memories stay "hot"
3. **Enable natural decay** — Unreferenced information fades, reducing noise
4. **Model real cognition** — Agents develop expertise through reinforced learning

**Recommendation:** This architecture represents a significant evolution of our memory system. Implement as **Phase 4 of Cognitive Memory** (following Phase 3 MemoryStream semantic search).

---

## 1. Analysis of the Proposed Architecture

### 1.1 The Core Problem

Current agent memory systems suffer from:

| Problem              | Description                                            | Example in ADA                                    |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| **Flat priority**    | All memories treated equally                           | A lesson learned has same weight as core identity |
| **No protection**    | Any memory can be modified/overwritten                 | Hallucinated "facts" can overwrite real knowledge |
| **No decay**         | Old irrelevant info persists indefinitely              | Stale Active Threads clutter retrieval            |
| **No reinforcement** | Unused memories don't fade, used ones don't strengthen | Archive retrieval returns equally ranked results  |

### 1.2 Innate vs Learned Memory

The proposed architecture separates memory into two fundamental categories:

#### Innate Memory (Immutable Substrate)

```
├── Survival constraints (safety rules, R-001 equivalents)
├── Core identity (SOUL.md, role definitions)
├── Fundamental reasoning patterns (how to decompose problems)
├── Language primitives (how to communicate)
└── Tool usage schemas (GitHub workflow, CLI patterns)
```

**Properties:**

- Cannot be overwritten by experience
- Always in "hot" state (instant retrieval)
- Forms the substrate upon which learned memory operates
- Analogous to human nervous system hardwiring

#### Learned Memory (Evolving Knowledge)

```
├── User preferences (accumulated over cycles)
├── Project-specific context (repository state, tech stack)
├── Lessons learned (what worked, what didn't)
├── Relationship patterns (inter-role dependencies)
└── Domain expertise (specialized knowledge from research)
```

**Properties:**

- Starts "warm", can become hot or cold
- Decays without reinforcement
- Can be promoted to near-innate status through repeated reference
- Analogous to human experiential learning

### 1.3 Reference-Based Heat Scoring

The heat scoring formula:

```
heat_score = base_importance × recency_factor × reference_count^α
```

Where:

- `base_importance` — Initial weight based on memory type (0.0–1.0)
- `recency_factor` — Exponential decay based on time since last access (e^(-λt))
- `reference_count` — Number of times this memory has been retrieved
- `α` — Tuning parameter for reference weight (suggested: 0.3–0.5)

#### Heat Levels and Storage

| Heat Level  | Score Range | Storage Tier   | Retrieval Behavior              |
| ----------- | ----------- | -------------- | ------------------------------- |
| 🔥 **Hot**  | > 0.8       | Working memory | Always in context window        |
| 🟠 **Warm** | 0.4 – 0.8   | Active cache   | Retrieved on semantic relevance |
| 🧊 **Cold** | < 0.4       | Archive        | Requires explicit recall query  |

### 1.4 State Transitions

```
                    ┌─────────────────────────┐
                    │       INNATE            │
                    │  (protected, immutable) │
                    │  heat = 1.0 (constant)  │
                    └───────────┬─────────────┘
                                │ provides substrate for
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      COLD       │◄───│      WARM       │◄───│      HOT        │
│    Archive      │    │   Active Pool   │    │  Working Memory │
│  (decay zone)   │    │   (default)     │    │  (high access)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                                              ▲
        │         reference_count++                    │
        └──────────────────────────────────────────────┘
                  (retrieval promotes heat)
```

**Transition Rules:**

- New learned memories enter at **warm** state
- Each retrieval increases `reference_count`, boosting heat
- Time without retrieval decreases `recency_factor`, cooling the memory
- Memories below cold threshold move to archive
- Archive memories can be promoted back via explicit retrieval
- Innate memories never transition — always hot

---

## 2. Comparison with Related Work

### 2.1 MemGPT (Packer et al., 2023)

| Aspect                | MemGPT                      | Proposed Architecture                   |
| --------------------- | --------------------------- | --------------------------------------- |
| **Memory hierarchy**  | Context → Recall → Archival | Innate → Hot → Warm → Cold              |
| **Management**        | LLM-driven paging           | Automatic heat-based promotion/demotion |
| **Protection**        | None — all memory mutable   | Innate memory is immutable              |
| **Decay mechanism**   | Manual archival             | Automatic via recency_factor            |
| **Retrieval control** | LLM decides what to page in | Heat score determines availability      |

**Key difference:** MemGPT gives the LLM full control over memory management. Our approach makes heat-based transitions automatic, reducing cognitive load and preventing the LLM from accidentally "forgetting" important information.

### 2.2 Generative Agents (Park et al., 2023)

| Aspect                 | Generative Agents                | Proposed Architecture                       |
| ---------------------- | -------------------------------- | ------------------------------------------- |
| **Memory types**       | Observations, Reflections, Plans | Innate (protected) vs Learned (evolving)    |
| **Importance scoring** | LLM rates importance 1-10        | `base_importance × recency × references^α`  |
| **Decay**              | Recency-weighted retrieval       | Explicit heat scoring with tier transitions |
| **Protection**         | None                             | Innate memory cannot be modified            |

**Key difference:** Generative Agents use LLM-assigned importance scores, which can vary unpredictably. Heat scoring is deterministic based on actual usage patterns.

### 2.3 Hindsight by Vectorize

| Aspect                 | Hindsight                       | Proposed Architecture                     |
| ---------------------- | ------------------------------- | ----------------------------------------- |
| **Memory pathways**    | Facts, Actions, Beliefs         | Innate (unchanging) vs Learned (evolving) |
| **Temporal awareness** | Prefers recent memories         | recency_factor with exponential decay     |
| **Learning**           | Self-reflection for improvement | reference_count reinforcement             |
| **Biomimetic model**   | Human-inspired                  | Explicitly models cognitive development   |

**Key insight:** Hindsight validates the biomimetic direction. Our architecture goes further by modeling the innate/learned distinction from developmental psychology.

### 2.4 Context Graphs (Foundation Capital)

| Aspect               | Context Graphs                | Proposed Architecture               |
| -------------------- | ----------------------------- | ----------------------------------- |
| **Focus**            | Decision traces and precedent | Memory classification and retrieval |
| **Structure**        | Graph of decisions            | Tiered memory with heat scores      |
| **Temporal context** | State at decision time        | recency_factor decay                |
| **Precedent**        | Cross-system synthesis        | reference_count reinforcement       |

**Complementary:** Context graphs capture _what_ was decided; heat scoring governs _how_ that context is retrieved. These systems could work together.

---

## 3. How This Reduces Hallucination

Hallucination in LLM agents often occurs when:

1. **Conflation** — Mixing up similar but distinct contexts
2. **Confabulation** — Filling gaps with plausible but false information
3. **Memory corruption** — Incorrect information overwriting correct information

### 3.1 Protection Mechanisms

| Mechanism                   | How It Prevents Hallucination                                                        |
| --------------------------- | ------------------------------------------------------------------------------------ |
| **Innate protection**       | Core facts (identity, rules, schemas) cannot be overwritten by hallucinated patterns |
| **Heat-based retrieval**    | Frequently verified facts stay hot; spurious "memories" cool and fade                |
| **Cold archive isolation**  | Low-confidence information is quarantined, reducing spurious retrieval               |
| **Retrieval reinforcement** | True facts get referenced more, increasing their heat; false ones don't              |

### 3.2 Example Scenario

```
Cycle 100: Agent learns "Alice prefers email" (warm, base_importance=0.6)
Cycle 105: Agent retrieves this preference for decision → reference_count++, heat↑
Cycle 110: Agent retrieves again → reference_count++, now HOT (0.85)
Cycle 150: Agent hallucinates "Alice prefers Slack" (warm, base_importance=0.6)
Cycle 155: Real preference retrieved, hallucinated one is not → real stays hot
Cycle 200: Hallucinated preference has decayed to COLD, rarely retrieved
Cycle 250: Hallucinated preference archived, effectively forgotten
```

The true information survives because it gets reinforced through use; the false information fades through disuse.

---

## 4. Integration with ADA's MemoryStream

### 4.1 Current State (Phase 3)

Our MemoryStream (Issue #95) currently provides:

- **Semantic search** via embeddings (Supabase pgvector)
- **Memory types:** Semantic, Episodic, Procedural (tags only)
- **Namespace isolation** per repository
- **CLI integration:** `ada memory list`, `ada memory search`

### 4.2 Proposed Phase 4 Extension

```typescript
interface MemoryEntry {
  // Existing fields
  id: string;
  content: string;
  embedding: number[];
  tags: string[];
  namespace: string;
  createdAt: Date;

  // Phase 4: Heat scoring additions
  memoryClass: 'innate' | 'learned';
  heatScore: number; // 0.0 - 1.0
  referenceCount: number; // times retrieved
  lastAccessedAt: Date; // for recency calculation
  baseImportance: number; // initial weight

  // Computed
  heatTier: 'hot' | 'warm' | 'cold'; // derived from heatScore
}
```

### 4.3 Schema Updates

```sql
-- Add heat scoring columns to memory table
ALTER TABLE memory_entries ADD COLUMN memory_class VARCHAR(10) DEFAULT 'learned';
ALTER TABLE memory_entries ADD COLUMN heat_score DECIMAL(3,2) DEFAULT 0.6;
ALTER TABLE memory_entries ADD COLUMN reference_count INTEGER DEFAULT 0;
ALTER TABLE memory_entries ADD COLUMN last_accessed_at TIMESTAMP DEFAULT NOW();
ALTER TABLE memory_entries ADD COLUMN base_importance DECIMAL(3,2) DEFAULT 0.5;

-- Index for efficient heat-based retrieval
CREATE INDEX idx_memory_heat ON memory_entries(namespace, heat_score DESC);
CREATE INDEX idx_memory_class ON memory_entries(memory_class);
```

### 4.4 Heat Calculation Function

```typescript
function calculateHeat(entry: MemoryEntry): number {
  const ALPHA = 0.4; // reference weight exponent
  const LAMBDA = 0.1; // decay rate (per day)

  // Innate memories are always hot
  if (entry.memoryClass === 'innate') {
    return 1.0;
  }

  // Days since last access
  const daysSinceAccess =
    (Date.now() - entry.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);

  // Recency factor with exponential decay
  const recencyFactor = Math.exp(-LAMBDA * daysSinceAccess);

  // Reference boost (diminishing returns via power function)
  const referenceBoost = Math.pow(entry.referenceCount + 1, ALPHA);

  // Combined heat score
  const rawHeat = entry.baseImportance * recencyFactor * referenceBoost;

  // Normalize to 0-1 range (cap at 0.99 for learned memories)
  return Math.min(rawHeat, 0.99);
}
```

### 4.5 Modified Retrieval Flow

```typescript
async function searchMemory(
  query: string,
  options: SearchOptions
): Promise<MemoryEntry[]> {
  // 1. Get semantic matches via embedding similarity
  const semanticMatches = await vectorSearch(query, options.namespace);

  // 2. Calculate current heat scores
  const withHeat = semanticMatches.map(entry => ({
    ...entry,
    heatScore: calculateHeat(entry),
    heatTier: getHeatTier(entry.heatScore),
  }));

  // 3. Filter by tier if specified
  const filtered = options.minHeat
    ? withHeat.filter(e => e.heatScore >= options.minHeat)
    : withHeat;

  // 4. Rank by combined semantic + heat score
  const ranked = filtered.sort((a, b) => {
    const scoreA = a.semanticScore * 0.6 + a.heatScore * 0.4;
    const scoreB = b.semanticScore * 0.6 + b.heatScore * 0.4;
    return scoreB - scoreA;
  });

  // 5. Increment reference counts for returned results
  await incrementReferences(ranked.slice(0, options.limit).map(e => e.id));

  return ranked.slice(0, options.limit);
}
```

---

## 5. CLI Extensions

### 5.1 New Commands

```bash
# View memory with heat information
ada memory list --show-heat
# Output: Shows heat tier (🔥/🟠/🧊) and score for each entry

# Filter by heat tier
ada memory list --tier hot
ada memory list --tier warm
ada memory list --tier cold

# Promote memory to innate (requires confirmation)
ada memory promote <id> --to-innate
# Warning: This makes the memory immutable. Confirm? [y/N]

# Manual heat adjustment (for tuning)
ada memory heat <id> --boost 0.2
ada memory heat <id> --decay 0.3

# Run heat decay pass (normally automatic)
ada memory decay --dry-run
# Output: Would move 12 entries from warm → cold, 3 from cold → archive

# View innate memories
ada memory innate
# Output: All protected, immutable memories
```

### 5.2 Dispatch Integration

```bash
# dispatch start now shows memory heat stats
ada dispatch start

# Output includes:
# Memory Status:
#   Innate: 12 entries (protected)
#   Hot: 8 entries (in working memory)
#   Warm: 45 entries (active cache)
#   Cold: 23 entries (archive)
```

---

## 6. Visualization Opportunities

As noted in Issue #113, this architecture enables compelling visualizations:

### 6.1 Memory Network Graph

```
Node properties:
  - Size: Heat level (bigger = hotter)
  - Color: Innate (gold) vs Learned (blue gradient)
  - Border: Reference count (thicker = more referenced)

Edge properties:
  - Connections: Which memories cite which
  - Opacity: Strength of relationship
```

### 6.2 Heat Evolution Animation

```
Timeline view showing:
  - New memories appearing (warm)
  - Frequently used memories heating up
  - Unused memories cooling and fading
  - Innate memories as stable anchors
```

### 6.3 Integration with Issue #99 (Network Viz)

The proposed memory visualization could be a view mode in our planned network visualization tool, showing the agent's "cognitive state" at any cycle.

---

## 7. Experimental Design

### 7.1 Hallucination Reduction Test

**Setup:**

1. Create two ADA instances with identical training
2. Instance A: Standard MemoryStream (Phase 3)
3. Instance B: Innate/Learned with heat scoring (Phase 4)

**Protocol:**

1. Run 100 cycles with mixed correct and incorrect information injected
2. After 50 cycles, query both instances for known-correct facts
3. Measure retrieval accuracy and hallucination rate

**Metrics:**

- **Retrieval accuracy:** % of queries returning correct information
- **Hallucination rate:** % of queries returning fabricated information
- **Memory efficiency:** Total active memory size over time

### 7.2 Heat Tuning Experiment

**Variables to tune:**

- `ALPHA` (reference weight exponent): 0.2, 0.3, 0.4, 0.5
- `LAMBDA` (decay rate): 0.05, 0.1, 0.2, 0.3
- Heat tier thresholds: Various combinations

**Optimization target:** Maximize retrieval accuracy while minimizing memory bloat.

---

## 8. Implementation Roadmap

### Phase 4a: Core Infrastructure (1-2 weeks)

- [ ] Add heat scoring columns to memory schema
- [ ] Implement `calculateHeat()` function in @ada/core
- [ ] Add heat decay cron job (runs daily)
- [ ] Update `searchMemory()` to incorporate heat

### Phase 4b: CLI Integration (1 week)

- [ ] `ada memory list --show-heat`
- [ ] `ada memory list --tier <hot|warm|cold>`
- [ ] `ada memory promote` and `ada memory heat` commands
- [ ] Update `ada dispatch start` to show memory stats

### Phase 4c: Innate Memory Classification (1 week)

- [ ] Define initial innate memory set (SOUL, RULES, schemas)
- [ ] Implement protection against innate modification
- [ ] Add `ada memory innate` command
- [ ] Document innate vs learned boundaries

### Phase 4d: Evaluation (1-2 weeks)

- [ ] Run hallucination reduction experiment
- [ ] Tune heat scoring parameters
- [ ] Document findings and optimal configuration
- [ ] Update Issue #113 with results

---

## 9. Open Questions

1. **Innate boundary definition:** What exactly qualifies as innate? Is RULES.md innate, or can rules evolve?

2. **Cross-repository innate:** Should some innate memories be shared across all ADA deployments (universal safety constraints)?

3. **Heat score persistence:** Should we store computed heat or recalculate on each query? (Trade-off: storage vs compute)

4. **Forgetting vs archiving:** Should cold memories eventually be deleted, or archived indefinitely?

5. **Role-specific innate:** Should each role have its own innate memories (playbook as innate)?

---

## 10. Conclusion

The Innate vs Learned memory architecture with heat scoring represents a significant advancement in AI agent memory systems. By borrowing from human cognitive development, we can create agents that:

- **Protect core knowledge** from hallucination and drift
- **Naturally prioritize** frequently-used information
- **Gracefully forget** irrelevant or outdated context
- **Model real expertise** through reinforcement learning

This research validates Issue #113 as a valuable direction and provides a concrete implementation path as **Cognitive Memory Phase 4**.

**Next steps:**

1. Create engineering spec for Phase 4a implementation
2. Design initial innate memory classification
3. Set up experimental infrastructure for hallucination testing

---

## References

1. Packer, C., et al. (2023). _MemGPT: Towards LLMs as Operating Systems_. arXiv:2310.08560
2. Park, J.S., et al. (2023). _Generative Agents: Interactive Simulacra of Human Behavior_. arXiv:2304.03442
3. ADA Issue #95: Cognitive Memory Architecture
4. ADA Issue #113: Innate vs Learned with Heat Scoring (this analysis)
5. ADA Issue #99: Network Visualization
6. Foundation Capital: Context Graphs for AI Agents

---

_"Memory is not a filing cabinet. It's a living, breathing ecosystem that evolves with use." — Issue #113_

**— 🔬 The Scout**
