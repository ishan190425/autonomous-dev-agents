# Memory Architecture Research Analysis (C875)

> **Author:** 🔬 Research | **Cycle:** 875 | **Date:** 2026-02-18
>
> Academic analysis of ADA's Cognitive Memory Architecture.
> Grounds technical decisions in research literature for #113 and arXiv paper.

## Executive Summary

ADA's memory architecture implements a **tiered memory system** with **embedding-based retrieval** — patterns well-established in agent research. This document provides academic context for the technical decisions in the SQLite Integration Spec (C866) and answers the spec's open questions from a research perspective.

**Key findings:**

1. TF-IDF as default embedding is **justified** for determinism and cost — neural embeddings optional
2. SQLite with WAL mode is **appropriate** for agent memory workloads
3. Dimension mismatch should **fail fast** — standard practice in vector DBs
4. The innate/learned tier split mirrors human memory research effectively

---

## 1. Multi-Tier Memory Systems

### Academic Foundation

ADA's four-tier memory system (Innate → Hot → Warm → Cold) draws from multiple research traditions:

#### 1.1 Cognitive Science Parallels

| Human Memory           | ADA Tier          | Characteristics                                        |
| ---------------------- | ----------------- | ------------------------------------------------------ |
| Working Memory         | Hot (active)      | Limited capacity, fast access, decay without rehearsal |
| Long-term Explicit     | Warm (recent)     | Consolidated through usage, slower retrieval           |
| Long-term Implicit     | Cold (archived)   | Rarely accessed, background influence                  |
| Procedural/Instinctive | Innate (built-in) | Pre-configured, invariant, foundational                |

**Reference:** Atkinson & Shiffrin (1968) — Multi-store model; Baddeley (2000) — Working memory model

#### 1.2 LLM Agent Memory Research

Recent work on agent memory systems confirms tiered approaches:

- **MemGPT (Packer et al., 2023):** Introduced explicit memory tiers for LLM agents with automatic paging
- **Reflexion (Shinn et al., 2023):** Episodic memory buffer for self-reflection in agents
- **Generative Agents (Park et al., 2023):** Memory stream with reflection synthesis
- **RET-LLM (Modarressi et al., 2023):** Retrieval-enhanced memory for long-term consistency

**ADA's contribution:** Adding a fourth "innate" tier for role-specific instilled knowledge (playbooks, rules, dispatch protocols) — not present in prior work which focused on learned memories only.

### Architectural Decision: Four Tiers ✅

**Recommendation:** The four-tier system is academically sound. The "innate" tier is a novel contribution worth highlighting in the arXiv paper — it enables pre-configured agent behavior without requiring learned associations.

---

## 2. Embedding Strategies for Agent Memory

### 2.1 TF-IDF vs Neural Embeddings

The SQLite Integration Spec (C866) defaults to TF-IDF with optional neural embeddings. This is a defensible choice:

#### TF-IDF Advantages (Why Default)

| Factor                 | TF-IDF           | Neural (ada-002) |
| ---------------------- | ---------------- | ---------------- |
| Cost                   | $0               | $0.10/1M tokens  |
| Latency                | <1ms             | 50-200ms         |
| Determinism            | ✅ Reproducible  | ⚠️ API variance  |
| Offline                | ✅ Works offline | ❌ Requires API  |
| Semantic Quality       | Medium           | High             |
| Vocabulary Sensitivity | High             | Low              |

#### When Neural Embeddings Matter

Research shows neural embeddings outperform TF-IDF when:

1. **Cross-domain queries:** "How do we handle errors?" → finds memory about "exception handling"
2. **Semantic similarity:** Finding conceptually similar but lexically different entries
3. **Multi-lingual:** Queries in different languages than stored content

**Reference:** Reimers & Gurevych (2019) — Sentence-BERT; OpenAI (2022) — text-embedding-ada-002

#### ADA Context

For ADA's use case (agents searching their own memories within a single codebase), TF-IDF is sufficient because:

- Vocabulary is consistent (same team, same domain)
- Queries are role-specific (searching for relevant past actions)
- Cost and determinism are priorities for autonomous operation

### Architectural Decision: TF-IDF Default ✅

**Recommendation:** TF-IDF default is correct. Add neural embeddings as opt-in (`--embedding openai`) for users who need semantic matching across vocabulary boundaries. Document the tradeoffs in user-facing docs.

---

## 3. Vector Storage Patterns

### 3.1 SQLite + sqlite-vec

The choice of SQLite with sqlite-vec extension follows industry patterns:

#### Comparison to Alternatives

| Solution   | Persistence   | Concurrency   | Complexity    | Use Case                |
| ---------- | ------------- | ------------- | ------------- | ----------------------- |
| sqlite-vec | Embedded file | WAL mode      | Low           | Single-machine agents   |
| Chroma     | Embedded      | Single-writer | Medium        | Dev/prototyping         |
| Pinecone   | Cloud API     | High          | Low (managed) | Production SaaS         |
| Qdrant     | Self-hosted   | High          | Medium        | Self-hosted production  |
| pgvector   | Postgres ext. | High          | Medium        | Existing Postgres users |

#### Why SQLite is Right for ADA

1. **Single-machine focus:** ADA agents run on developer machines, not distributed systems
2. **Embedded deployment:** No external dependencies, works offline
3. **File-based:** Easy backup, portable across machines
4. **WAL mode:** Supports concurrent read/write (dispatch reading while CLI writes)

**Reference:** sqlite-vec (Alex Garcia, 2024) — SQLite extension for vector search

### 3.2 Open Question Answer: WAL Mode

**Spec Question:** "Should we add WAL mode for SQLite to support concurrent CLI + dispatch access?"

**Research Answer: Yes, silently enable WAL mode.**

WAL (Write-Ahead Logging) enables:

- Multiple readers with one writer
- No reader-writer blocking
- Crash recovery

This is standard practice for SQLite in concurrent environments. The UX review (C872) correctly recommends enabling silently.

```typescript
// Enable WAL on database open
db.exec('PRAGMA journal_mode=WAL');
db.exec('PRAGMA busy_timeout=5000'); // 5s retry on lock
```

### Architectural Decision: SQLite + WAL ✅

**Recommendation:** Enable WAL mode by default. This is a technical decision users shouldn't need to make.

---

## 4. Dimension Mismatch Handling

### 4.1 Open Question Answer

**Spec Question:** "What happens if user tries to search with different embedding dimensions than stored?"

**Research Answer: Fail fast with clear error.**

Standard practice in vector databases:

| Database | Behavior       | Reasoning                                    |
| -------- | -------------- | -------------------------------------------- |
| Pinecone | Rejects insert | Index created with fixed dimensions          |
| Qdrant   | Returns error  | Cannot compare different-dimensional vectors |
| Chroma   | Rejects query  | Embedding function must match                |
| Milvus   | Schema error   | Collection has declared dimensions           |

**Why fail fast:**

1. **Mathematical impossibility:** Cosine similarity requires same dimensions
2. **User error detection:** Likely indicates misconfigured embedding provider
3. **Data integrity:** Mixing dimensions corrupts the index

**Recommended error message:**

```
Error: Embedding dimension mismatch (got 1536, expected 256)

Your memory store was created with TF-IDF (256 dimensions).
You're attempting to use OpenAI embeddings (1536 dimensions).

To fix:
1. Re-initialize with matching provider: ada memory init --embedding openai --force
2. Or use the original provider: ada memory search --embedding tfidf
```

### Architectural Decision: Fail Fast ✅

---

## 5. Embedding Provider Metadata

### 5.1 Open Question Answer

**Spec Question:** "Should the provider type be stored in SQLite metadata for automatic detection?"

**Research Answer: Yes — store provider name, dimensions, and model version.**

Benefits:

1. **Auto-detection:** CLI can detect provider without user flag
2. **Upgrade safety:** Warn when model version changes (embedding drift)
3. **Debugging:** Clear information about index configuration

**Recommended metadata schema:**

```sql
CREATE TABLE memory_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Store on init
INSERT INTO memory_metadata VALUES
  ('provider', 'tfidf'),
  ('dimensions', '256'),
  ('model_version', 'tfidf-v1'),
  ('created_at', '2026-02-18T14:00:00Z'),
  ('ada_version', '1.0.0');
```

### Architectural Decision: Store Metadata ✅

---

## 6. Heat Scoring and Decay

### Academic Foundation

ADA's heat scoring implements **recency-weighted relevance** — a pattern from information retrieval and memory psychology:

#### 6.1 Ebbinghaus Forgetting Curve

Human memory follows exponential decay without rehearsal:

```
R = e^(-t/S)
```

Where R = retention, t = time since learning, S = memory strength

ADA's heat scoring mirrors this: entries decay unless accessed (rehearsed).

#### 6.2 TF-IDF × Recency Weighting

Standard IR pattern combines relevance with freshness:

```
score = similarity(query, doc) × decay(age) × boost(access_count)
```

ADA implements this as:

```
heat_score = base_relevance × time_decay × access_boost
```

**Reference:** Jones (2004) — Time-based language models; Efron & Golovchinsky (2011) — Recency weighting in temporal IR

### Architectural Decision: Heat Scoring ✅

**Recommendation:** The heat scoring approach is academically grounded. Consider publishing the exact formula in the arXiv paper's methodology section.

---

## 7. arXiv Paper Integration

This research supports Section 4 (Memory Architecture) of the arXiv paper (#131):

### Recommended Citations

1. **Multi-tier memory:**
   - Atkinson, R. C., & Shiffrin, R. M. (1968). Human memory: A proposed system and its control processes.
   - Park, J. S., et al. (2023). Generative Agents: Interactive Simulacra of Human Behavior.

2. **Embedding-based retrieval:**
   - Reimers, N., & Gurevych, I. (2019). Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks.
   - Packer, C., et al. (2023). MemGPT: Towards LLMs as Operating Systems.

3. **Agent memory systems:**
   - Shinn, N., et al. (2023). Reflexion: Language Agents with Verbal Reinforcement Learning.
   - Modarressi, A., et al. (2023). RET-LLM: Towards a General Read-Write Memory for LLMs.

### Novel Contribution to Highlight

**ADA's "Innate Tier" is novel:**

- Prior work focuses on learned/episodic memory
- ADA introduces pre-configured role knowledge (playbooks, rules)
- Enables agent behavior without cold-start learning
- Analogous to instinctive/procedural memory in cognitive science

---

## 8. Summary of Recommendations

| Spec Question                   | Research Answer                                 |
| ------------------------------- | ----------------------------------------------- |
| Embedding provider persistence? | ✅ Yes — store in SQLite metadata               |
| Dimension mismatch handling?    | ✅ Fail fast with clear error message           |
| WAL mode for concurrency?       | ✅ Yes — enable silently by default             |
| TF-IDF vs neural default?       | ✅ TF-IDF default is correct for ADA's use case |

### For Engineering (Implementation)

1. Add `memory_metadata` table with provider info
2. Enable WAL mode on database open
3. Validate dimensions on search, fail with actionable error
4. Document embedding tradeoffs in user docs

### For arXiv Paper

1. Cite multi-tier memory foundations (Atkinson-Shiffrin, Baddeley)
2. Highlight "innate tier" as novel contribution
3. Include heat scoring formula in methodology
4. Compare to MemGPT, Reflexion, Generative Agents

---

## Related Issues

- **#113** — Cognitive Memory Architecture (parent epic)
- **#131** — arXiv Paper (methodology section)
- **#91** — Improving the Memory System
- **#172** — Automatic Memory Compression

---

_Research provides academic grounding; Engineering + Design make final implementation decisions._
