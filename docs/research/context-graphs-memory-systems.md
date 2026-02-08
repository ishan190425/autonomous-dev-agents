# Context Graphs & Modern Memory Systems for AI Agents

> Research evaluation responding to Issue #91 — Improving the Memory System
>
> **Author:** 🔬 The Scout | **Cycle:** 198 | **Date:** 2026-02-08

---

## Abstract

This document evaluates **context graphs** as an emerging paradigm for AI agent memory, along with two modern memory systems suggested by the community: **Hindsight by Vectorize** and **Supermemory**. We analyze their architectures, compare them to ADA's current file-based system, and recommend adoption paths for Sprint 3+.

---

## 1. Context Graphs — The Emerging Paradigm

### 1.1 Definition

A **context graph** is a structured, queryable record of decision traces — not just what happened, but _why_ it was allowed to happen. Unlike traditional systems of record (which store current state), context graphs capture:

- **Decision traces:** The full context at decision time
- **Exception logic:** Why rules were bent in specific cases
- **Precedent chains:** How similar decisions were resolved before
- **Approval lineage:** Who approved what, under which policy
- **Cross-system synthesis:** Context gathered from multiple sources

### 1.2 Key Insight from Foundation Capital

> "Rules tell an agent what should happen in general. Decision traces capture what happened in this specific case — under policy v3.2, with a VP exception, based on precedent Z."

This distinction is critical. ADA's current `bank.md` captures rules (Architecture Decisions, Role State) but doesn't systematically capture decision traces at the cycle level.

### 1.3 The Feedback Loop

Context graphs compound over time:

```
┌─────────────────────────────────────────────────────────────┐
│                    Context Graph Flywheel                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Agent Action → Decision Trace Captured → Searchable       │
│        ↑                                        ↓           │
│        └────── Next Decision Uses Precedent ←───┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Over time, similar decisions can be automated because the system has structured precedent.

### 1.4 Relevance to ADA

| Context Graph Concept  | Current ADA Implementation                | Gap                                   |
| ---------------------- | ----------------------------------------- | ------------------------------------- |
| Decision traces        | `history` in rotation.json (last 10 only) | Limited retention, no semantic search |
| Exception logic        | Informal in Lessons Learned               | Not structured, not queryable         |
| Precedent chains       | Not implemented                           | Major gap                             |
| Cross-system synthesis | bank.md Active Threads                    | Manual, not graph-structured          |
| Temporal context       | Cycle timestamps                          | No "state at decision time" capture   |

---

## 2. Hindsight by Vectorize

### 2.1 Overview

**Hindsight** positions itself as "agent memory that works like human memory" — explicitly biomimetic rather than pure RAG.

**Website:** https://vectorize.io

### 2.2 Architecture Principles

| Feature                         | Description                           | ADA Relevance                                           |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------- |
| **Dedicated memory pathways**   | Separates facts, actions, and beliefs | Maps to Semantic/Episodic/Procedural split in Issue #95 |
| **Built-in learning**           | Self-reflection for improvement       | Aligns with our "Lessons Learned" section               |
| **Temporal-aware retrieval**    | Prefers recent, relevant memories     | Solves our stale archive problem                        |
| **Personality-aware reasoning** | Consistent tone across calls          | Could help role personality persistence                 |
| **Biomimetic model**            | Human-inspired memory structures      | Validates our cognitive memory research direction       |
| **Model-agnostic**              | Swap LLMs without losing memory       | Essential for ADA's multi-model future                  |

### 2.3 Key Innovation: Memory Pathways

Hindsight's separation of memory types directly parallels our Issue #95 architecture:

```
Hindsight Pathways          ADA Cognitive Memory (Issue #95)
─────────────────────────   ─────────────────────────────────
Hard Facts                  → Semantic Memory (knowledge)
Past Actions                → Episodic Memory (cycle events)
Agent Beliefs               → Working Memory (active context)
```

### 2.4 Evaluation

**Strengths:**

- Biomimetic approach validates our research direction
- Model-agnostic design aligns with ADA's goals
- Temporal decay solves real problem (stale memory)
- Self-reflection mechanism is novel

**Limitations:**

- Closed-source (SaaS dependency)
- Not open for inspection of algorithms
- Pricing/availability unclear

**Recommendation:** Study Hindsight's architecture for inspiration, but implement our own cognitive memory system (Issue #95) for independence.

---

## 3. Supermemory

### 3.1 Overview

**Supermemory** is a "Universal Memory API" for AI apps, focused on enterprise deployment with graph-based indexing.

**Website:** https://supermemory.ai

### 3.2 Key Claims

- Sub-300ms recall latency
- Graph-based indexing (not just vector)
- Enterprise-ready (SOC2, on-prem options)
- Connector ecosystem
- Trusted by 70+ YC companies

### 3.3 Architecture Features

| Feature                   | Description                        | ADA Relevance                       |
| ------------------------- | ---------------------------------- | ----------------------------------- |
| **Graph-based indexing**  | Relationships, not just similarity | Enables precedent chains            |
| **Connector ecosystem**   | Integrates with external systems   | Could connect GitHub, Discord, etc. |
| **Enterprise deployment** | Cloud, hybrid, on-prem             | Self-hosting option valuable        |
| **Sub-300ms recall**      | Production-grade latency           | Acceptable for cycle-based dispatch |

### 3.4 Evaluation

**Strengths:**

- Graph-based approach aligns with context graph paradigm
- Production-proven (YC portfolio)
- Enterprise features suggest maturity

**Limitations:**

- Also closed-source (API dependency)
- Pricing unclear for OSS project
- Graph structure not documented publicly

**Recommendation:** Evaluate Supermemory's connector model for future integrations; consider for managed ADA offering but not for core OSS.

---

## 4. Claude Code Memory System (Blackboard/Mailbox)

### 4.1 Patterns Referenced in Issue #91

Two classic multi-agent communication patterns:

**Blackboard Architecture:**

- Shared workspace where all agents read/write
- No direct agent-to-agent communication
- Good for: collaborative problem-solving, iterative refinement
- ADA analog: `bank.md` is essentially a blackboard

**Mailbox Architecture:**

- Point-to-point messaging between agents
- Messages queued and processed asynchronously
- Good for: task delegation, status updates
- ADA analog: `Active Threads` section, GitHub issue comments

### 4.2 Current ADA Implementation

```
┌─────────────────────────────────────────────────────────────┐
│              ADA Hybrid Communication Model                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────────────────────────────┐                  │
│   │           BLACKBOARD                 │                  │
│   │                                      │                  │
│   │   bank.md                            │                  │
│   │   ├── Current Status                 │                  │
│   │   ├── Role State (all roles)         │                  │
│   │   ├── Architecture Decisions         │                  │
│   │   └── Lessons Learned                │                  │
│   │                                      │                  │
│   └──────────────────────────────────────┘                  │
│                       ↑↓                                    │
│   ┌──────────────────────────────────────┐                  │
│   │           INFORMAL MAILBOX            │                  │
│   │                                      │                  │
│   │   Active Threads section             │                  │
│   │   GitHub issue comments              │                  │
│   │   PR reviews                         │                  │
│   │                                      │                  │
│   └──────────────────────────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Recommendation: Formalize Mailbox Protocol

Add explicit inter-role messaging format to RULES.md:

```markdown
## R-012: Inter-Role Messaging Protocol

### Blackboard Sections (shared state)

- Current Status: All roles read, relevant role updates
- Architecture Decisions: Engineering/Design/Frontier write
- Lessons Learned: All roles append

### Mailbox Format (direct messages)

In Active Threads, use explicit addressee:
```

**@Engineering:** PR #103 ready for your flaky test fix
**@QA:** Please review PR #103 before Ops merge
**@Frontier:** Design review approved — proceed with prototype

```

```

---

## 5. Synthesis: Context Graphs for ADA

### 5.1 What We Should Capture

| Trace Type                          | Current                          | Proposed                     |
| ----------------------------------- | -------------------------------- | ---------------------------- |
| **Cycle actions**                   | rotation.json history (10 items) | Expand to full episodic log  |
| **Decision rationale**              | Informal in commits              | Structured "why" field       |
| **Precedent references**            | None                             | Link similar past decisions  |
| **Cross-role dependencies**         | Active Threads (manual)          | Graph edges between entities |
| **Policy version at decision time** | None                             | Snapshot rules applied       |

### 5.2 Proposed Context Graph Schema

```typescript
interface DecisionTrace {
  cycleId: number;
  role: string;
  timestamp: string;

  // What happened
  action: string;
  artifacts: string[]; // PRs, issues, docs created

  // Why it happened
  rationale: string;
  precedents: string[]; // Links to similar past traces
  rulesApplied: string[]; // R-001, R-004, etc.

  // Cross-references
  relatedIssues: number[];
  relatedPRs: number[];
  blockedBy: number[];
  enables: number[];

  // Outcome (updated later)
  outcome?: 'success' | 'partial' | 'failed' | 'superseded';
  lessons?: string;
}
```

### 5.3 Implementation Path

**Phase 1 (Sprint 2):** Formalize blackboard/mailbox in RULES.md — low effort, immediate clarity

**Phase 2 (Sprint 3):** Implement cognitive memory architecture (Issue #95) — structured memory types

**Phase 3 (Sprint 4):** Add decision trace capture — each cycle emits a structured trace

**Phase 4 (Sprint 5+):** Build context graph — link traces, enable precedent search

---

## 6. Recommendations

### 6.1 Short-Term (Pre-Launch)

1. ✅ Add R-012 Inter-Role Messaging Protocol to RULES.md
2. ✅ Expand rotation.json history from 10 to 50 entries
3. ✅ Add `rationale` field to history entries

### 6.2 Medium-Term (Sprint 3)

1. Implement Issue #95 Cognitive Memory Architecture (Frontier)
2. Pilot SQLite-vec for semantic search over archives
3. Study Hindsight's temporal decay algorithm

### 6.3 Long-Term (Sprint 5+)

1. Build context graph layer on top of cognitive memory
2. Implement precedent search ("how did we handle X before?")
3. Consider Supermemory integration for managed ADA offering

---

## 7. Conclusion

The context graph paradigm represents the next evolution of AI agent memory — beyond RAG, beyond simple vector stores. The key insight is that **decision traces** (why things happened) are as valuable as **state records** (what happened).

ADA is well-positioned to adopt this paradigm because:

- Our rotation model naturally produces decision traces (one action per cycle)
- Our memory bank compression (R-002) is primitive "consolidation"
- Our Issue #95 cognitive architecture aligns with biomimetic approaches

The tools mentioned (Hindsight, Supermemory) validate our research direction but are closed-source. We should implement our own cognitive memory system while borrowing architectural concepts.

**Next step for Frontier:** Begin MemoryStream prototype using DecisionTrace schema above.

---

## References

1. Foundation Capital. "Context Graphs: AI's Trillion-Dollar Opportunity." 2026.
2. Vectorize. "Hindsight — Agent Memory That Works Like Human Memory." https://vectorize.io
3. Supermemory. "Universal Memory API for AI Apps." https://supermemory.ai
4. Park et al. "Generative Agents: Interactive Simulacra of Human Behavior." arXiv:2304.03442, 2023.
5. Packer et al. "MemGPT: Towards LLMs as Operating Systems." arXiv:2310.08560, 2023.
6. ADA Issue #91. "Improving the Memory System."
7. ADA Issue #95. "Cognitive Memory Architecture for Autonomous AI Agents."

---

_🔬 The Scout | Cycle 198 | Research evaluation for Issue #91_
