# Dev Agent Memory Comparison: Practical Implementations

> Comparative analysis of memory persistence patterns in production dev agents.
> **Author:** 🔬 The Scout | **Cycle:** 288 | **Date:** 2026-02-09
> **Purpose:** Inform Phase 4a heat scoring (Issue #118) and cognitive memory architecture (Issue #113)
> **Supports:** Issue #90 (Benchmark Testing), Issue #91 (Improving Memory System)

---

## Executive Summary

Modern dev agents vary wildly in their approach to memory. Most rely on **session-only context** with no true persistence. A few (Cursor, Devin) have pioneered project-level memory, but none implement the cognitive architecture ADA is building. This analysis reveals:

1. **Most agents are amnesiac** — context dies when the session ends
2. **File-based context** is the dominant pattern (loading files into prompt)
3. **Semantic search** is rare in production tools
4. **Decision trace capture** is virtually nonexistent
5. **ADA's multi-role memory bank is genuinely novel**

**Key insight:** The market is ripe for memory innovation. Our Phase 4a heat scoring and cognitive memory will be a significant differentiator.

---

## Comparison Matrix

| Tool            | Session Memory   | Project Memory        | Semantic Search | Decision Traces | Self-Modification |
| --------------- | ---------------- | --------------------- | --------------- | --------------- | ----------------- |
| **Cursor**      | ✅ Chat history  | ✅ Codebase index     | ✅ @codebase    | ❌              | ❌                |
| **Claude Code** | ✅ Session       | ✅ CLAUDE.md files    | ❌              | ❌              | ❌                |
| **Devin**       | ✅ Workspace     | ✅ Planner state      | ⚠️ Unknown      | ⚠️ Likely       | ⚠️ Unknown        |
| **OpenHands**   | ✅ Event history | ❌                    | ❌              | ❌              | ❌                |
| **Aider**       | ✅ Chat          | ✅ Git + file map     | ⚠️ Partial      | ❌              | ❌                |
| **SWE-Agent**   | ✅ Trajectory    | ❌                    | ❌              | ❌              | ❌                |
| **Cline**       | ✅ Session       | ⚠️ Project context    | ❌              | ❌              | ❌                |
| **ADA**         | ✅ Cycle history | ✅ bank.md + archives | 🔜 Sprint 2-3   | 🔜 Sprint 3     | 🔜 Sprint 3       |

Legend: ✅ = Has | ❌ = Doesn't have | ⚠️ = Partial/unknown | 🔜 = Planned

---

## Deep Dive: Memory Architectures

### 1. Cursor

**Memory Model:** Index + RAG over codebase

**Architecture:**

```
┌────────────────────────────────────────────────────────┐
│                     CURSOR                              │
├────────────────────────────────────────────────────────┤
│  Session Memory:                                        │
│  └─ Chat history (current session only)                 │
│                                                         │
│  Project Memory:                                        │
│  ├─ Codebase index (embeddings)                        │
│  ├─ .cursorrules file (project instructions)           │
│  └─ Recent file edits (tracked in session)             │
│                                                         │
│  Retrieval:                                             │
│  ├─ @codebase → semantic search over index             │
│  ├─ @file → direct file inclusion                      │
│  └─ @docs → external doc search                        │
└────────────────────────────────────────────────────────┘
```

**What Works:**

- `.cursorrules` is a clever pattern — project-specific instructions that persist
- Codebase indexing enables semantic search without manual file selection
- `@symbols` allow explicit context selection

**What Doesn't:**

- No cross-session conversation memory (start fresh each chat)
- No decision history ("why did I implement it this way?")
- No learning from user patterns over time

**Lesson for ADA:**

- `.cursorrules` → Similar to our `agents/rules/RULES.md` but per-project
- Codebase indexing → We need this for code-aware dispatch
- The `@symbol` pattern could work for memory retrieval

### 2. Claude Code (Anthropic)

**Memory Model:** Hierarchical CLAUDE.md files

**Architecture:**

```
┌────────────────────────────────────────────────────────┐
│                   CLAUDE CODE                           │
├────────────────────────────────────────────────────────┤
│  Session Memory:                                        │
│  └─ Conversation history (current session)              │
│                                                         │
│  Project Memory (CLAUDE.md files):                      │
│  ├─ ~/CLAUDE.md (global defaults)                      │
│  ├─ ./CLAUDE.md (project root)                         │
│  ├─ ./src/CLAUDE.md (directory-level)                  │
│  └─ Loaded hierarchically, more specific wins          │
│                                                         │
│  No automatic indexing or retrieval                     │
│  User must @-mention files explicitly                   │
└────────────────────────────────────────────────────────┘
```

**What Works:**

- Hierarchical CLAUDE.md is elegant — generic → specific layering
- Explicit, human-readable context files
- No complex infrastructure needed

**What Doesn't:**

- No semantic search (you must know which file to @-mention)
- No conversation memory between sessions
- No automatic context discovery

**Lesson for ADA:**

- Hierarchical memory files → We could have `/agents/RULES.md` → `/agents/playbooks/{role}.md` (we already do!)
- Explicit over implicit → Our bank.md approach aligns with this philosophy
- Keep it simple → File-based memory is debuggable

### 3. Devin (Cognition)

**Memory Model:** Planner state + workspace persistence (mostly opaque)

**Architecture:**

```
┌────────────────────────────────────────────────────────┐
│                      DEVIN                              │
├────────────────────────────────────────────────────────┤
│  Session Memory:                                        │
│  ├─ Active workspace state                              │
│  ├─ Planner context (multi-step reasoning)             │
│  └─ Real-time execution trace                          │
│                                                         │
│  Project Memory (inferred):                             │
│  ├─ Likely maintains task history                       │
│  ├─ Probably persists workspace across sessions        │
│  └─ Unknown: semantic search, decision traces          │
│                                                         │
│  Architecture is proprietary and opaque                 │
└────────────────────────────────────────────────────────┘
```

**What We Can Infer:**

- Devin's demo showed multi-step planning with state persistence
- Workspace (files, terminal, browser) persists within a task
- Unknown if learning persists across tasks/projects

**Speculation Based on UX:**

- Their "timeline" view suggests they track decision traces
- The ability to "scrub" through execution implies full history capture
- Enterprise positioning likely means audit trails

**Lesson for ADA:**

- **Timeline visualization** → Great for debugging agent decisions
- **Full trace capture** → Even if expensive, valuable for analysis
- **Opacity is their weakness** → Our transparency is a differentiator

### 4. OpenHands (Open-Source Devin)

**Memory Model:** Event-sourced session state, no persistence

**Architecture:**

```
┌────────────────────────────────────────────────────────┐
│                    OPENHANDS                            │
├────────────────────────────────────────────────────────┤
│  Session Memory:                                        │
│  ├─ Event stream (all actions + observations)          │
│  ├─ Agent state (current plan, working memory)         │
│  └─ Workspace files (sandboxed)                        │
│                                                         │
│  No Project Memory:                                     │
│  ├─ Each session starts fresh                          │
│  ├─ No cross-session learning                          │
│  └─ No semantic search capability                      │
│                                                         │
│  Event log is discarded after session                   │
└────────────────────────────────────────────────────────┘
```

**What Works:**

- Clean event-sourced architecture
- Full observability within a session
- Good abstraction for different agent types

**What Doesn't:**

- Memory is ephemeral (why?)
- No RAG over codebase
- Each task reinvents the wheel

**Lesson for ADA:**

- **Event sourcing** → Our cycle-based dispatch is similar, but we persist
- **Observability** → They got this right; we should log as comprehensively
- **Gap = Opportunity** → Persistent memory would be a major PR for OpenHands

### 5. Aider

**Memory Model:** Git-aware + intelligent file selection

**Architecture:**

```
┌────────────────────────────────────────────────────────┐
│                       AIDER                             │
├────────────────────────────────────────────────────────┤
│  Session Memory:                                        │
│  └─ Chat history (session-only by default)              │
│                                                         │
│  Project Memory:                                        │
│  ├─ Git state (diffs, commits, history)                │
│  ├─ Repo map (file structure + function signatures)   │
│  ├─ .aider.* config files                              │
│  └─ Active file set (explicitly added to chat)        │
│                                                         │
│  Retrieval:                                             │
│  ├─ /add file.py → add to context                      │
│  ├─ /map-refresh → update repo structure              │
│  └─ Uses repo map for context selection                │
│                                                         │
│  Persistence:                                           │
│  ├─ .aider.chat.history.md (optional)                  │
│  ├─ Commits capture decisions                          │
│  └─ No semantic search                                 │
└────────────────────────────────────────────────────────┘
```

**What Works:**

- Git-native: commits are memory (brilliant!)
- Repo map for intelligent file selection
- Minimal infrastructure, powerful results

**What Doesn't:**

- Session memory is optional and rarely used
- No semantic search (relies on file names)
- No reasoning about why changes were made

**Lesson for ADA:**

- **Git as memory** → We already do this with bank.md commits
- **Repo map** → File structure awareness is useful for codebase navigation
- **Explicit file selection** → Aider forces user to curate context; we could auto-curate

### 6. SWE-Agent

**Memory Model:** Trajectory-based (episode memory)

**Architecture:**

```
┌────────────────────────────────────────────────────────┐
│                     SWE-AGENT                           │
├────────────────────────────────────────────────────────┤
│  Session Memory:                                        │
│  ├─ Trajectory (action sequence)                       │
│  ├─ Observation history (command outputs)             │
│  └─ Current file state                                 │
│                                                         │
│  No Persistence:                                        │
│  ├─ Each issue is independent                          │
│  ├─ No cross-issue learning                            │
│  └─ Designed for benchmark, not production             │
│                                                         │
│  Optimizations:                                         │
│  ├─ ACI (Agent-Computer Interface) design              │
│  └─ Specialized file navigation commands               │
└────────────────────────────────────────────────────────┘
```

**What Works:**

- Clean trajectory abstraction
- Excellent for analysis and replay
- ACI design is research-grade

**What Doesn't:**

- Zero persistence (by design)
- Benchmark-optimized, not real-world
- No learning across issues

**Lesson for ADA:**

- **Trajectory logging** → We should log cycle actions this thoroughly
- **ACI patterns** → Their command design is worth studying
- **Benchmarks ≠ Production** → We need both

---

## Memory Pattern Taxonomy

Based on this analysis, dev agent memory falls into four patterns:

### Pattern 1: Session-Only (Ephemeral)

**Examples:** SWE-Agent, basic Claude Code usage
**Characteristics:** Context exists only during interaction
**Pros:** Simple, no state to manage
**Cons:** No learning, each session starts over

### Pattern 2: File-Contextual (Project Files as Memory)

**Examples:** Cursor (.cursorrules), Claude Code (CLAUDE.md), Aider (.aider.\*)
**Characteristics:** Config files provide persistent context
**Pros:** Explicit, human-editable, version-controllable
**Cons:** Manual maintenance, no semantic search

### Pattern 3: Index-Based (RAG over Codebase)

**Examples:** Cursor (@codebase), Copilot (codebase understanding)
**Characteristics:** Embeddings-based retrieval over code
**Pros:** Automatic discovery, scales with codebase
**Cons:** No decision history, just code state

### Pattern 4: Structured State (Explicit Memory Objects)

**Examples:** Devin (workspace state), ADA (bank.md + rotation.json)
**Characteristics:** Formal memory schema with update rules
**Pros:** Rich context, coordination, traceability
**Cons:** More complex, requires maintenance protocols

**ADA's Position:** We're pioneering Pattern 4 (Structured State) + Pattern 2 (File-Contextual) in the open-source space. Adding Pattern 3 (Index-Based) via Phase 4a heat scoring will complete the picture.

---

## Gap Analysis: ADA vs Competition

### What ADA Has That Others Don't

| Capability               | ADA                      | Best Competitor   |
| ------------------------ | ------------------------ | ----------------- |
| Multi-role team          | ✅ 10 roles              | ❌ Single agent   |
| Persistent shared memory | ✅ bank.md               | ⚠️ Devin (opaque) |
| Decision traces          | ✅ rotation.json history | ❌                |
| Cross-session continuity | ✅ Full project history  | ❌                |
| Role evolution           | ✅ R-003 protocol        | ❌                |
| Self-dogfooding          | ✅ 288+ cycles           | ❌                |

### What Competition Has That ADA Lacks

| Capability                | Best Competitor    | ADA Status                             |
| ------------------------- | ------------------ | -------------------------------------- |
| Semantic search over code | Cursor (@codebase) | 🔜 Phase 4a                            |
| Real-time execution trace | Devin (timeline)   | ❌ Future                              |
| Git-native memory         | Aider (commits)    | ⚠️ Partial (we commit but don't query) |
| Codebase indexing         | Cursor, Copilot    | 🔜 Sprint 2                            |

### ADA's Strategic Memory Roadmap

```
┌────────────────────────────────────────────────────────┐
│               ADA MEMORY EVOLUTION                      │
├────────────────────────────────────────────────────────┤
│                                                         │
│  NOW (v1.0-alpha):                                      │
│  ├─ bank.md (structured shared memory) ✅               │
│  ├─ rotation.json (cycle state) ✅                     │
│  ├─ archives/ (compressed history) ✅                  │
│  └─ docs/ (knowledge base) ✅                          │
│                                                         │
│  SPRINT 2 (Phase 4a - Issue #118):                     │
│  ├─ Heat scoring for memory items                       │
│  ├─ Importance-weighted retrieval                       │
│  └─ Semantic search over bank.md                       │
│                                                         │
│  SPRINT 3 (Cognitive Memory - Issue #113):              │
│  ├─ Three-tier memory (core/recall/archival)           │
│  ├─ MemGPT-style active paging                         │
│  ├─ Decision trace capture (per-cycle)                 │
│  └─ Agent-controlled memory operations                  │
│                                                         │
│  SPRINT 4+ (Context Graphs):                           │
│  ├─ Precedent chains (similar past decisions)          │
│  ├─ Cross-role retrieval                               │
│  ├─ Self-modifying core memory                         │
│  └─ Reflection-based insight synthesis                 │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## Recommendations

### 1. For Phase 4a Heat Scoring (Sprint 2)

Based on this analysis, heat scoring should:

- Borrow **importance scoring** from Generative Agents research
- Apply to bank.md sections (not just individual memories)
- Enable **temporal decay** (recent > old)
- Support **role-weighted relevance** (Engineering cares about code, Product about issues)

### 2. For Cognitive Memory (Sprint 3)

- Implement **three-tier storage** (core/recall/archival) from MemGPT
- Add **memory functions** to dispatch (recall_search, archival_search)
- Capture **decision traces** at cycle granularity
- Consider **self-modification** for role state updates

### 3. For Competitive Differentiation

Our messaging should emphasize:

- **"Memory that persists"** — vs ephemeral single-agent tools
- **"The team remembers"** — shared memory across 10 roles
- **"Decisions have lineage"** — traceable history
- **"Open and inspectable"** — vs Devin's black box

---

## Conclusion

The dev agent market has neglected memory. Most tools treat each session as independent, forcing users to rebuild context every time. Those with persistence (Cursor's codebase index, Aider's repo map) focus on code structure, not decisions.

ADA is uniquely positioned with:

1. **Structured shared memory** (bank.md) that persists across cycles
2. **Role-based state** that enables coordination
3. **Decision traces** in rotation.json history
4. **A roadmap** to semantic search and cognitive memory

Phase 4a heat scoring will close the gap on codebase awareness. Sprint 3 cognitive memory will leapfrog competitors. By Sprint 4, ADA will have the most sophisticated memory system in the dev agent space.

**The market is waiting for an agent that actually remembers.**

---

## References

1. ADA Competitive Landscape Analysis (Cycle 49)
2. ADA MemGPT Analysis (Cycle 188)
3. ADA Context Graphs & Memory Systems (Cycle 198)
4. Cursor Documentation: https://cursor.sh/docs
5. Claude Code Documentation: https://docs.anthropic.com/claude-code
6. OpenHands GitHub: https://github.com/All-Hands-AI/OpenHands
7. Aider Documentation: https://aider.chat/docs
8. SWE-Agent Paper: Yang et al., 2024

---

_🔬 The Scout | Cycle 288 | Research — Dev Agent Memory Comparison_
_Supports: Issue #118, Issue #113, Issue #90, Issue #91_
