# 🧠 MemGPT: Literature Review & ADA Application

> **Research Phase 1 (continued) — Issue #95 (Cognitive Memory Architecture)**  
> Analyzing: _MemGPT: Towards LLMs as Operating Systems_ (Packer et al., 2023)  
> Paper: https://arxiv.org/abs/2310.08560  
> **Created:** 2026-02-08 | **Author:** 🔬 Research

---

## Executive Summary

MemGPT introduces a revolutionary approach to LLM memory: treating the context window like a computer's main memory (RAM), with the LLM as a processor that explicitly manages memory through function calls. This solves the fundamental problem of context window limits—not by making windows bigger, but by making agents **aware** of their memory constraints and giving them tools to manage them.

**Key insight for ADA:** While Generative Agents (previous analysis) showed us _what_ to store in memory, MemGPT shows us _how to manage_ memory when it overflows the context window. For ADA's 100k+ token cycles and growing memory bank, context management isn't optional—it's essential.

**Core innovation:** The LLM doesn't just use memory; it becomes the memory manager. It decides what to page in/out, what to archive, and when to retrieve. This is fundamentally different from passive memory systems.

---

## Paper Summary

### The Problem

LLMs have fixed context windows (at paper time: GPT-4 was 8k-32k tokens). Long conversations, documents, or task histories exceed this limit. Current solutions:

1. **Truncation** — Lose old context (what we do today)
2. **Summarization** — Compress context (lossy, loses details)
3. **RAG** — Retrieve chunks (but LLM doesn't control retrieval)

All these are **passive**—the LLM doesn't know it's losing information. MemGPT makes memory management **active**.

### The Solution: LLM as Operating System

MemGPT borrows from OS design:

```
┌─────────────────────────────────────────────────────────────┐
│                    Traditional OS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │    Disk      │ ←→  │     RAM      │ ←→  │     CPU      │ │
│  │ (long-term)  │     │ (working)    │     │ (processor)  │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│                                                              │
│  • Disk is slow but unlimited                               │
│  • RAM is fast but limited                                  │
│  • CPU manages paging between them                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      MemGPT Analogy                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │  Archival    │ ←→  │   Context    │ ←→  │     LLM      │ │
│  │   Memory     │     │   Window     │     │ (processor)  │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│                                                              │
│  • Archival is slow (external storage) but unlimited        │
│  • Context is fast (in prompt) but limited (~128k tokens)   │
│  • LLM manages paging between them via function calls       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Memory Hierarchy

MemGPT defines three tiers:

| Tier              | Analogy   | Capacity  | Access Pattern          |
| ----------------- | --------- | --------- | ----------------------- |
| **Main Context**  | RAM       | Limited   | Always visible to LLM   |
| **Recall Memory** | Swap file | Medium    | Retrieved by LLM action |
| **Archival**      | Disk      | Unlimited | Searched by LLM action  |

#### Main Context Structure

The context window is partitioned:

```
┌─────────────────────────────────────────────────────────┐
│                    CONTEXT WINDOW                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐    │
│  │              SYSTEM PROMPT                       │    │
│  │  (Persona, instructions, memory management      │    │
│  │   instructions, available functions)            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │            CORE MEMORY                           │    │
│  │  ┌─────────────┐  ┌─────────────────────────┐   │    │
│  │  │   Persona   │  │    Human/Task Info      │   │    │
│  │  │  (self)     │  │    (context)            │   │    │
│  │  └─────────────┘  └─────────────────────────┘   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │         CONVERSATION BUFFER (FIFO)               │    │
│  │  [user: Hi] [agent: Hello!] [user: ...] ...      │    │
│  │  (Auto-paged to recall when full)                │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### Core Memory: Self-Modifying

The critical innovation: **Core Memory is writable by the LLM**.

The agent can update its own persona and context using functions:

```python
# Agent can call these to modify what's "always in RAM"
core_memory_append(section="persona", content="I prefer concise responses")
core_memory_replace(section="human", old="likes Python", new="prefers TypeScript")
```

This means the agent can:

- Learn user preferences and persist them
- Update its own instructions based on feedback
- Evolve its "personality" over time

#### Recall Memory: Conversation Paging

When the conversation buffer fills up, old messages are paged out to recall memory. The agent can retrieve them:

```python
# Retrieve past conversation by search
conversation_search(query="what did they say about Python?", limit=5)
# Retrieve by time
conversation_search_date(start="2023-01-01", end="2023-01-15")
```

#### Archival Memory: Long-Term Storage

For facts, documents, and persistent data:

```python
# Store new information
archival_memory_insert(content="User's project deadline is March 15")
# Search archival by semantic similarity
archival_memory_search(query="project deadlines", limit=10)
```

### The Function Calling Loop

MemGPT uses a unique execution model—the agent runs in a loop, calling functions until it's ready to respond:

```
┌─────────────────────────────────────────────────────────────┐
│                    MemGPT Execution Loop                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User sends message                                       │
│                        │                                     │
│                        ▼                                     │
│  2. LLM receives message + current memory state              │
│                        │                                     │
│                        ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  3. LLM decides action:                                  ││
│  │     a) Call memory function (search, insert, modify)     ││
│  │     b) Call send_message() to respond to user            ││
│  │     c) Call heartbeat() to think without responding      ││
│  └─────────────────────────────────────────────────────────┘│
│                        │                                     │
│          ┌─────────────┴─────────────┐                       │
│          ▼                           ▼                       │
│  ┌───────────────┐          ┌───────────────┐               │
│  │ Memory Func?  │          │ send_message? │               │
│  │ (loop back)   │          │ (exit loop)   │               │
│  └───────┬───────┘          └───────────────┘               │
│          │                                                   │
│          └──────→ Go to step 3                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key insight:** The agent can take multiple memory actions before responding. It might:

1. Search archival for relevant info
2. Update core memory with new context
3. Retrieve old conversation for continuity
4. Then finally respond

This is radically different from simple RAG (retrieve once before generating).

### Memory Functions

Complete function set:

```python
# Core Memory (always in context)
core_memory_append(section: str, content: str)
core_memory_replace(section: str, old: str, new: str)

# Recall Memory (conversation history)
conversation_search(query: str, limit: int = 5)
conversation_search_date(start: str, end: str, limit: int = 5)

# Archival Memory (long-term storage)
archival_memory_insert(content: str)
archival_memory_search(query: str, limit: int = 5)

# Control flow
send_message(message: str)  # Respond to user
heartbeat(reason: str)       # Think without responding
```

---

## Results

### Evaluation: Document Q&A

MemGPT was tested on conversational document Q&A (asking questions about long documents over multiple sessions):

| System             | Context Limit | Accuracy  |
| ------------------ | ------------- | --------- |
| GPT-4 (truncation) | 8k            | 23.7%     |
| GPT-4 (retrieval)  | 8k + RAG      | 47.2%     |
| MemGPT             | 8k + managed  | **72.4%** |

**Why the improvement?** MemGPT's multi-step reasoning:

1. First search archival for relevant passages
2. Reason about what's missing
3. Search again with refined query
4. Synthesize answer from multiple retrievals

Passive RAG retrieves once; MemGPT iterates.

### Evaluation: Extended Conversations

Multi-session conversations (100+ exchanges):

| System         | Consistency    | Recall  |
| -------------- | -------------- | ------- |
| GPT-4 (window) | Poor (forgets) | 31%     |
| MemGPT         | High           | **94%** |

MemGPT maintained coherent persona and remembered details across many sessions.

### Qualitative Findings

Emergent behaviors observed:

- **Proactive memory management**: Agent anticipated future needs, stored things before asked
- **Self-reflection**: Agent updated persona based on user feedback
- **Strategic retrieval**: Agent refined search queries when initial results were poor
- **Memory-aware responses**: Agent acknowledged memory limitations ("Let me check my notes on that")

---

## ADA Mapping: Current State vs MemGPT

| Concept                  | MemGPT                    | ADA Today                     | Gap                           |
| ------------------------ | ------------------------- | ----------------------------- | ----------------------------- |
| **Context Management**   | LLM-controlled paging     | Manual truncation             | No active management          |
| **Core Memory**          | Writable persona/context  | Static `SOUL.md`, `bank.md`   | Agent can't update own config |
| **Recall**               | Searchable conversation   | None                          | No past cycle retrieval       |
| **Archival**             | Semantic search over docs | `docs/` folder (not searched) | No vector search              |
| **Self-Awareness**       | Agent knows its limits    | Agent ignores limits          | Blindspot                     |
| **Multi-Step Retrieval** | Iterate until satisfied   | Load once                     | Single-pass only              |

### Gap Analysis

1. **No Active Memory Management**: ADA agents don't know they have a context limit. They load `bank.md` blindly. When it grows too large, they don't adapt—we manually compress.

2. **No Self-Modification**: Agents can't update their own playbooks, core config, or persona. MemGPT agents evolve themselves.

3. **No Semantic Search**: ADA agents can't search docs or past cycles. They rely on what's in the current context.

4. **No Multi-Step Reasoning**: ADA agents take one action per cycle. MemGPT agents iterate within a single turn.

5. **No Memory Transparency**: MemGPT agents acknowledge memory constraints ("I'll need to check my archives"). ADA agents pretend omniscience.

---

## Recommendations for ADA

### Synthesis: Generative Agents + MemGPT

These papers solve complementary problems:

| Paper             | Problem Solved       | Key Mechanism                  |
| ----------------- | -------------------- | ------------------------------ |
| Generative Agents | **What** to remember | Importance scoring, reflection |
| MemGPT            | **How** to manage    | Tiered storage, active paging  |

ADA needs both:

1. **From Generative Agents:**
   - Memory stream with importance scores
   - Reflection for insight synthesis
   - Recency × importance × relevance retrieval

2. **From MemGPT:**
   - Tiered memory (core/recall/archival)
   - Agent-controlled memory operations
   - Self-modifying core memory
   - Multi-step retrieval before action

### Proposed ADA Architecture (Synthesis)

```
┌─────────────────────────────────────────────────────────────┐
│                    ADA Memory Architecture                   │
│              (Generative Agents + MemGPT Synthesis)         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   CORE MEMORY                            ││
│  │  (Always in context - ~10k tokens reserved)              ││
│  │                                                          ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   ││
│  │  │   Playbook   │  │ Current      │  │   Active     │   ││
│  │  │  (my role)   │  │ Sprint/      │  │   Threads    │   ││
│  │  │              │  │ Status       │  │   (deps)     │   ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘   ││
│  │                                                          ││
│  │  → Agent can UPDATE core memory via function calls       ││
│  └─────────────────────────────────────────────────────────┘│
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  RECALL MEMORY                           ││
│  │  (Recent cycles - searchable JSONL stream)               ││
│  │                                                          ││
│  │  stream.jsonl:                                           ││
│  │  - Last 50 cycle entries                                 ││
│  │  - Importance-scored events                              ││
│  │  - Searchable by role, issue, keyword                    ││
│  │                                                          ││
│  │  Functions:                                              ││
│  │  - recall_search(query, role?, issue?, min_importance?)  ││
│  │  - recall_by_cycle(cycle_start, cycle_end)               ││
│  └─────────────────────────────────────────────────────────┘│
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                 ARCHIVAL MEMORY                          ││
│  │  (Long-term - vector indexed)                            ││
│  │                                                          ││
│  │  Stored:                                                 ││
│  │  - Compressed bank.md versions                           ││
│  │  - Old cycle streams                                     ││
│  │  - ADRs and key decisions                                ││
│  │  - Research docs and specs                               ││
│  │                                                          ││
│  │  Functions:                                              ││
│  │  - archival_search(query, doc_type?, date_range?)        ││
│  │  - archival_insert(content, metadata)                    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                 REFLECTION LAYER                         ││
│  │  (Generative Agents-style synthesis)                     ││
│  │                                                          ││
│  │  Triggers:                                               ││
│  │  - sum(importance of unprocessed memories) > 100         ││
│  │  - Every 10 cycles                                       ││
│  │  - Sprint boundary                                       ││
│  │                                                          ││
│  │  Output → High-importance insights added to stream       ││
│  │  Output → Updates to semantic memory (ADRs, Lessons)     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Phases

#### Phase 1: Memory Stream (Sprint 2) — From Generative Agents

_Already recommended in previous analysis_

- Add `stream.jsonl` with importance scoring
- This becomes recall memory for MemGPT-style retrieval

#### Phase 2: Memory Functions (Sprint 3)

Add memory management tools to dispatch:

```typescript
interface DispatchTools {
  // Recall (recent cycles)
  recall_search(query: string, opts?: RecallOptions): Memory[];
  recall_by_cycle(start: number, end: number): Memory[];

  // Archival (long-term)
  archival_search(query: string, opts?: ArchivalOptions): Memory[];
  archival_insert(content: string, metadata: object): void;

  // Core (self-modification)
  core_memory_update(section: string, content: string): void;
}
```

**Critical:** These are tools the LLM calls, not automatic retrieval. The agent decides what to retrieve.

#### Phase 3: Self-Modifying Core Memory (Sprint 3+)

Allow agents to update their own state:

```typescript
// Agent can update bank.md sections
core_memory_update('role_state.research', 'Working on MemGPT analysis');

// Agent can add lessons learned
core_memory_append('lessons', 'MemGPT shows value of active memory management');

// Agent can update active threads
core_memory_update('active_threads', newThreadsMarkdown);
```

This means agents maintain their own memory, not just read a file we prepare for them.

#### Phase 4: Multi-Step Dispatch (Sprint 4+)

Allow agents to take multiple memory actions before acting:

```
Cycle starts →
  1. Agent retrieves recent memories for this issue
  2. Agent searches archival for related decisions
  3. Agent updates core memory with current context
  4. Agent takes ONE action (create PR, comment, etc.)
  5. Agent logs action to stream with importance
→ Cycle ends
```

This is the full MemGPT loop adapted for ADA's role-based dispatch.

---

## MemGPT vs ADA: Conceptual Fit

### Where MemGPT Maps Well

| MemGPT Concept       | ADA Mapping             | Fit              |
| -------------------- | ----------------------- | ---------------- |
| Core Memory: Persona | Playbook + role state   | ✅ Excellent     |
| Core Memory: Human   | Current sprint/status   | ✅ Excellent     |
| Recall Memory        | Cycle stream (JSONL)    | ✅ Excellent     |
| Archival Memory      | docs/, archives/        | ✅ Excellent     |
| send_message()       | Create issue/PR/comment | ✅ Excellent     |
| heartbeat()          | Think before acting     | ⚠️ Novel for ADA |

### Where MemGPT Needs Adaptation

1. **Multi-Agent**: MemGPT is single-agent. ADA has 10 roles. Memory needs role-awareness:
   - Core memory per role? Or shared?
   - Cross-role retrieval permissions?

2. **Asynchronous**: MemGPT is synchronous (respond to user). ADA is async (cycles run on cron). The "loop until satisfied" pattern needs adaptation.

3. **Action Scope**: MemGPT's actions are memory + respond. ADA's actions are memory + GitHub operations. Same pattern, different domain.

### Open Design Questions

1. **Core memory scope**: Should each role have separate core memory, or share one?
   - Separate: Better role isolation, more storage
   - Shared: Better coordination, risk of conflicts

2. **Self-modification bounds**: What can agents modify about themselves?
   - Safe: Role state, active threads, lessons
   - Risky: Rules, playbooks, rotation order

3. **Retrieval budget**: How many memory lookups per cycle?
   - Token cost consideration
   - Could use importance to prioritize

4. **Memory persistence**: Where does archival memory actually live?
   - Vector DB (Pinecone, Qdrant, ChromaDB)?
   - Local embeddings file?
   - Just semantic search over filesystem?

---

## Comparison: Generative Agents vs MemGPT

| Dimension             | Generative Agents                        | MemGPT                       |
| --------------------- | ---------------------------------------- | ---------------------------- |
| **Focus**             | What to remember                         | How to manage memory         |
| **Key Innovation**    | Importance + reflection                  | Active paging by LLM         |
| **Memory Model**      | Cognitive (human-inspired)               | OS-inspired (RAM/disk)       |
| **Retrieval**         | Automatic (recency×importance×relevance) | Agent-controlled (functions) |
| **Self-Modification** | No                                       | Yes (core memory writable)   |
| **Multi-Step**        | No                                       | Yes (function loop)          |
| **Use Case**          | Believable long-term agents              | Unbounded conversations      |

**For ADA:** We need elements from both:

- Generative Agents' **importance scoring** for prioritization
- Generative Agents' **reflection** for insight synthesis
- MemGPT's **tiered storage** for scalability
- MemGPT's **agent-controlled retrieval** for relevance
- MemGPT's **self-modification** for agent autonomy

---

## Next Steps

1. **Phase 1 complete** — Generative Agents analysis ✅
2. **Phase 1 continued** — MemGPT analysis ✅ (this document)
3. **Next: Architecture Proposal** — Synthesize both papers into concrete ADA design
   - Target: `docs/design/cognitive-memory-architecture.md`
   - Deliverable: Detailed spec for Sprint 2-3 implementation
4. **Then: Prototype Plan** — Implementation roadmap for Issue #91

---

## References

- Packer, C., Wooders, S., Lin, K., et al. (2023). _MemGPT: Towards LLMs as Operating Systems_. arXiv:2310.08560. https://arxiv.org/abs/2310.08560
- Park, J. S., O'Brien, J. C., Cai, C. J., et al. (2023). _Generative Agents: Interactive Simulacra of Human Behavior_. arXiv:2304.03442
- Related: Issue #95 (Cognitive Memory Architecture)
- Related: Issue #91 (Memory System Implementation)
- Related: `docs/research/generative-agents-analysis.md`

---

_🔬 Research — Cycle 188_
