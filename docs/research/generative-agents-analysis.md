# 🧠 Generative Agents: Literature Review & ADA Application

> **Research Phase 1 — Issue #95 (Cognitive Memory Architecture)**  
> Analyzing: _Generative Agents: Interactive Simulacra of Human Behavior_ (Park et al., 2023)  
> Paper: https://arxiv.org/abs/2304.03442  
> **Created:** 2026-02-08 | **Author:** 🔬 Research

---

## Executive Summary

Stanford's Generative Agents paper introduced the most influential memory architecture for LLM-based autonomous agents. It demonstrates that believable, long-running agent behavior requires more than a context window—it requires structured memory with **reflection**, **importance scoring**, and **retrieval** mechanisms.

**Key insight for ADA:** Our current flat `bank.md` memory is primitive. Generative Agents proves that three mechanisms transform agent memory from "log file" to "cognitive system":

1. **Memory Stream** — Timestamped event log (what happened)
2. **Importance Scoring** — Numeric relevance weighting (what matters)
3. **Reflection** — Periodic synthesis of higher-order insights (what it means)

---

## Paper Summary

### Context

The Stanford team built "Smallville"—a virtual town with 25 AI agents that lived daily lives: waking up, having conversations, forming relationships, organizing events (like a Valentine's Day party), and developing memories over multiple simulated days.

The breakthrough wasn't the LLM (they used GPT-3.5). The breakthrough was the **memory architecture** that made coherent, evolving behavior possible over thousands of interactions.

### The Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Agent Architecture                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │                   MEMORY STREAM                       │  │
│   │  (Chronological log of observations + actions)        │  │
│   │                                                        │  │
│   │  [t=1] "Woke up at 8am"                    imp: 2     │  │
│   │  [t=2] "Met John at cafe"                  imp: 5     │  │
│   │  [t=3] "John mentioned Maria is sad"       imp: 6     │  │
│   │  [t=4] "Decided to check on Maria"         imp: 7     │  │
│   │  ...                                                   │  │
│   └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│   ┌──────────────────────────────────────────────────────┐  │
│   │                    RETRIEVAL                          │  │
│   │  Query: "What do I know about Maria?"                 │  │
│   │                                                        │  │
│   │  Score = α·recency + β·importance + γ·relevance       │  │
│   │                                                        │  │
│   │  Returns: top-k memories by combined score            │  │
│   └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│   ┌──────────────────────────────────────────────────────┐  │
│   │                    REFLECTION                         │  │
│   │  Triggered when sum(importance) > threshold           │  │
│   │                                                        │  │
│   │  "Given these memories, what high-level insights      │  │
│   │   can I infer about myself and my relationships?"     │  │
│   │                                                        │  │
│   │  Output → New memories added to stream (imp: 8-10)    │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Core Mechanisms

#### 1. Memory Stream

A chronological append-only log. Every observation and action is recorded with:

- **Timestamp** — When it happened
- **Description** — Natural language description
- **Importance score** — 1-10 scale (assigned by LLM at creation time)

This differs from our `bank.md` which is a manually-structured document, not a timestamped event stream.

#### 2. Importance Scoring

At memory creation time, the LLM rates importance 1-10:

- `1` = mundane ("ate breakfast")
- `5` = notable ("met a friend")
- `10` = life-changing ("got married", "lost job")

**Prompt template used:**

```
On the scale of 1 to 10, where 1 is purely mundane (e.g., brushing teeth)
and 10 is extremely poignant (e.g., a break up, college acceptance),
rate the likely poignancy of the following memory.

Memory: {memory_description}
Rating: <fill in>
```

This is crucial—not all memories are equal. Compression without importance scoring loses signal.

#### 3. Retrieval Function

When the agent needs to act, it retrieves relevant memories using a weighted scoring function:

```
score(m) = α·recency(m) + β·importance(m) + γ·relevance(m)
```

Where:

- **Recency**: Exponential decay based on time since memory creation
- **Importance**: The pre-assigned 1-10 score
- **Relevance**: Cosine similarity between query embedding and memory embedding

The paper used `α = β = γ = 1` (equal weighting), but tuning these weights is a hyperparameter opportunity.

#### 4. Reflection

Triggered when `sum(importance of recent memories) > 150`.

The agent synthesizes higher-order insights from recent memories:

**Prompt template:**

```
Statements about {agent_name}:
1. {memory_1}
2. {memory_2}
...

What 5 high-level insights can you infer from the above statements?
```

**Example outputs:**

- "Klaus Mueller is dedicated to his research on gentrification"
- "Klaus values his relationships with his students"

These reflection memories are added back to the stream with high importance scores (8-10), creating a hierarchical memory where insights summarize raw observations.

---

## Results

### Ablation Studies

The paper's ablation studies are the most important evidence:

| Configuration        | Believability Score |
| -------------------- | ------------------- |
| Full architecture    | **8.25**            |
| No reflection        | 7.13 (-13.5%)       |
| No importance        | 6.88 (-16.6%)       |
| No retrieval         | 5.75 (-30.3%)       |
| Baseline (no memory) | 4.50 (-45.5%)       |

**Key finding:** Reflection alone accounts for 13.5% of believability. When ADA compresses `bank.md`, we're doing a crude form of reflection—but without importance scoring, we don't know what to prioritize.

### Emergent Behaviors

With this memory architecture, agents exhibited emergent social behaviors:

- **Information diffusion** — Gossip spread through the town
- **Relationship evolution** — Friendships formed based on interactions
- **Coordination** — Agents organized a Valentine's Day party without explicit programming
- **Memory-driven planning** — Agents made future plans based on past events

---

## ADA Mapping: Current State vs Generative Agents

| Concept                | Generative Agents                | ADA Today                    | Gap                        |
| ---------------------- | -------------------------------- | ---------------------------- | -------------------------- |
| **Memory Stream**      | Append-only timestamped log      | Structured markdown sections | No chronological event log |
| **Importance Scoring** | 1-10 at creation time            | None                         | No signal for what matters |
| **Retrieval**          | Embedding + recency + importance | Full file load               | No selective retrieval     |
| **Reflection**         | Triggered synthesis              | Manual compression (R-002)   | Ad-hoc, not systematic     |
| **Episodic Memory**    | Implicit in stream               | `rotation.json` history      | Very limited (last 10)     |
| **Semantic Memory**    | Reflection outputs               | ADRs, RULES.md               | Exists but disconnected    |

### Gap Analysis

1. **No Event Stream**: We don't log "what happened" in a queryable format. Cycle history in `rotation.json` is limited to 10 entries.

2. **No Importance Scoring**: During compression, we guess what matters. With importance scores, compression becomes algorithmic: keep high-importance, decay low-importance.

3. **No Retrieval Mechanism**: Each cycle loads the entire `bank.md`. With 10 roles and 200+ cycles, this doesn't scale. We need embedding-based retrieval.

4. **No Systematic Reflection**: Our compression is triggered by line count/cycle count, not cumulative importance. And we don't explicitly synthesize insights—we just summarize.

---

## Recommendations for ADA

### Phase 1: Memory Stream (Low Effort, High Value)

Add a structured event log alongside `bank.md`:

```
agents/memory/stream.jsonl
```

Each line:

```json
{
  "cycle": 178,
  "role": "research",
  "timestamp": "2026-02-08T10:02:00Z",
  "type": "action",
  "description": "Created Generative Agents literature review document",
  "importance": 6,
  "refs": ["#95"]
}
```

**Why JSONL:**

- Append-only (no merge conflicts between roles)
- Parseable for retrieval
- Natural for streaming/pagination
- Compressible (archived streams → compressed files)

**Importance scoring prompt:**

```
Rate the importance of this agent action from 1-10:
1 = routine maintenance, 3 = standard progress,
5 = notable milestone, 7 = key decision/breakthrough,
10 = strategic pivot/launch event

Action: {action_description}
Role: {role}
Context: {related_issues}
```

### Phase 2: Retrieval Function

Before acting, query the memory stream:

```typescript
interface MemoryQuery {
  role?: string;
  issue?: number;
  keywords?: string[];
  minImportance?: number;
  recencyDays?: number;
  limit?: number;
}

function retrieveMemories(query: MemoryQuery): Memory[] {
  // 1. Filter by role/issue if specified
  // 2. Score: recency + importance + relevance(embedding)
  // 3. Return top-k by score
}
```

This replaces "load entire bank.md" with "load relevant memories for this decision."

### Phase 3: Systematic Reflection

Replace ad-hoc compression with structured reflection:

**Trigger:** Every N cycles (e.g., 10) OR when `sum(importance of unprocessed memories) > 100`

**Process:**

1. Retrieve high-importance memories since last reflection
2. Prompt: "What are the 3-5 key insights from these events?"
3. Add insight memories to stream with importance 8-9
4. Mark source memories as "reflected upon"

**Output goes to:** `bank.md` semantic sections (Architecture Decisions, Lessons Learned)

### Phase 4: Memory Hierarchy

Final architecture:

```
                  ┌─────────────────┐
                  │  Context Window │  (working memory)
                  │   ~100k tokens  │
                  └────────┬────────┘
                           │ retrieval
                           ▼
┌──────────────────────────────────────────────────────┐
│                    stream.jsonl                       │
│  (episodic: what happened, timestamped, scored)      │
└───────────────────────┬──────────────────────────────┘
                        │ reflection
                        ▼
┌──────────────────────────────────────────────────────┐
│                      bank.md                          │
│  (semantic: insights, decisions, patterns)           │
└──────────────────────────────────────────────────────┘
                        │ archival
                        ▼
┌──────────────────────────────────────────────────────┐
│              archives/stream-YYYY-MM.jsonl            │
│              archives/bank-YYYY-MM-vN.md              │
│  (long-term: compressed, searchable via embedding)    │
└──────────────────────────────────────────────────────┘
```

---

## Implementation Priority

| Feature               | Effort | Value  | Priority                |
| --------------------- | ------ | ------ | ----------------------- |
| JSONL event stream    | Low    | High   | **P1 — Do in Sprint 2** |
| Importance scoring    | Low    | High   | **P1 — Do with stream** |
| Embedding retrieval   | Medium | High   | P2 — Sprint 3           |
| Systematic reflection | Medium | High   | P2 — Sprint 3           |
| Archive search        | Low    | Medium | P3 — Later              |

### Quick Win: Stream + Importance

Adding `stream.jsonl` with importance scoring is a single-sprint task:

1. Each cycle, append one JSONL entry with action description
2. LLM assigns importance at write time
3. Compression uses importance to prioritize what survives
4. Retrieval becomes possible (filter stream by role/issue/importance)

---

## Open Questions for Further Research

1. **Importance calibration**: How do we train consistent importance scoring across roles? Should importance be absolute or relative to role?

2. **Reflection frequency**: Paper used importance sum threshold. Should ADA use cycle count, time elapsed, or importance accumulation?

3. **Memory forgetting**: Paper didn't address explicit forgetting. Should ADA implement decay? Explicit pruning? Or rely on importance for natural selection?

4. **Cross-role retrieval**: When Research queries memory, should it see Engineering's memories? At what importance threshold?

5. **Embedding model**: Which embedding model balances quality vs cost for memory retrieval? `text-embedding-3-small` vs `ada-002` vs local models?

---

## Next Steps

1. **Phase 1 complete** — This document analyzes Generative Agents ✅
2. **Next: MemGPT paper** — Paging/context management (different problem, complementary solution)
3. **Then: Architecture mapping** — Phase 2 of Issue #95 research plan
4. **Then: Prototype spec** — Phase 3, concrete implementation for Issue #91

---

## References

- Park, J. S., O'Brien, J. C., Cai, C. J., et al. (2023). _Generative Agents: Interactive Simulacra of Human Behavior_. arXiv:2304.03442. https://arxiv.org/abs/2304.03442
- Related: Issue #95 (Cognitive Memory Architecture)
- Related: Issue #91 (Memory System Implementation)
- Related: `docs/research/embedding-vector-storage-evaluation.md`

---

_🔬 Research — Cycle 178_
