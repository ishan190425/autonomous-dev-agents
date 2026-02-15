# Cognitive Memory Architecture — arXiv Figure Specification

> **Author:** 🌌 The Frontier (Head of Platform & Innovation)
> **Date:** 2026-02-15
> **Cycle:** 691
> **Status:** Draft
> **Relates to:** #131 arXiv Paper, #113 Cognitive Memory

## Purpose

Extend the Memory Architecture figure (Fig 3 in arxiv-paper-figure-specification-c686.md) to include the Cognitive Memory components specified in #113. This provides the arXiv paper with:

1. **Current state** — The implemented bank.md system
2. **Planned architecture** — Innate vs Learned with heat scoring
3. **Academic contribution** — Novel memory architecture for autonomous agents

---

## Figure 3A: Current Memory Architecture (As Implemented)

This is the base Fig 3 from Design's specification — shows current bank.md structure.

```
                     ┌─────────────────────────────────────┐
                     │          agents/memory/             │
                     └─────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
     ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
     │    bank.md      │    │ evolution-log   │    │   archives/     │
     │   (Current)     │    │     .md         │    │                 │
     │                 │    │                 │    │ Compressed      │
     │ • Status        │    │ • Role changes  │    │ snapshots       │
     │ • Role State    │    │ • New roles     │    │ (v1...v32)      │
     │ • Threads       │    │ • Playbook edits│    │                 │
     │ • Decisions     │    │                 │    │                 │
     │ • Lessons       │    │                 │    │                 │
     │ • Metrics       │    │                 │    │                 │
     └────────┬────────┘    └─────────────────┘    └─────────────────┘
              │
              │ Trigger: >200 lines OR >10 cycles OR sprint end
              ▼
     ┌─────────────────┐
     │  COMPRESSION    │───▶ Archive current, distill, increment version
     └─────────────────┘
```

---

## Figure 3B: Cognitive Memory Architecture (Proposed — Issue #113)

**This is the novel academic contribution.** Shows innate vs learned memory with heat-based state management.

### Full Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     COGNITIVE MEMORY ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         INNATE MEMORY (Immutable)                      │  │
│  │   ┌─────────────┬─────────────┬─────────────┬─────────────────────┐   │  │
│  │   │  SAFETY     │  IDENTITY   │  REASONING  │  TOOL SCHEMAS       │   │  │
│  │   │  RULES.md   │  SOUL.md    │  Playbooks  │  CLI patterns       │   │  │
│  │   │  R-001...   │  roles.json │  Heuristics │  GitHub workflow    │   │  │
│  │   └─────────────┴─────────────┴─────────────┴─────────────────────┘   │  │
│  │         ↑ Always hot (score=1.0) | Cannot be overwritten             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      │ provides substrate for               │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       LEARNED MEMORY (Evolving)                       │  │
│  │                                                                        │  │
│  │     ┌─────────────────────────────────────────────────────────────┐   │  │
│  │     │                    HEAT SCORING ENGINE                       │   │  │
│  │     │  heat = base_importance × recency_factor × reference_count^α │   │  │
│  │     └─────────────────────────────────────────────────────────────┘   │  │
│  │                                  │                                     │  │
│  │     ┌────────────────────────────┼────────────────────────────────┐   │  │
│  │     ▼                            ▼                            ▼       │  │
│  │  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐    │  │
│  │  │   🔥 HOT     │    │    🟠 WARM       │    │    🧊 COLD       │    │  │
│  │  │  score >0.8  │    │  score 0.4-0.8   │    │  score <0.4      │    │  │
│  │  │              │    │                  │    │                  │    │  │
│  │  │ Working mem  │    │  Active cache    │    │  Deep archive    │    │  │
│  │  │ Always in    │    │  Semantic        │    │  Explicit        │    │  │
│  │  │ context      │    │  retrieval       │    │  recall only     │    │  │
│  │  │              │    │                  │    │                  │    │  │
│  │  │ • Current    │    │ • Recent lessons │    │ • Old lessons    │    │  │
│  │  │   sprint     │    │ • This-week PRs  │    │ • Closed issues  │    │  │
│  │  │ • Active     │    │ • Warm patterns  │    │ • Old ADRs       │    │  │
│  │  │   blockers   │    │                  │    │                  │    │  │
│  │  └──────┬───────┘    └────────┬─────────┘    └────────┬─────────┘    │  │
│  │         │                     │                       │              │  │
│  │         │  ◀───reference───   │   ◀───reference───    │              │  │
│  │         │        decay ──────▶│        decay ────────▶│              │  │
│  │         │                     │                       │              │  │
│  │         └─────────────────────┴───────────────────────┘              │  │
│  │                              Promotion ↑ | ↓ Demotion                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Heat State Transitions

```
┌─────────────────────────────────────────────────────────────────┐
│                    HEAT STATE MACHINE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐                                  ┌──────────┐    │
│   │ INNATE   │ ─────────────────────────────────│ Always   │    │
│   │ Memory   │           immutable              │ HOT=1.0  │    │
│   └──────────┘                                  └──────────┘    │
│                                                                 │
│                                                                 │
│   ┌──────────┐       reference++        ┌──────────┐           │
│   │   NEW    │─────────────────────────▶│   HOT    │           │
│   │ (warm)   │                          │  >0.8    │           │
│   └──────────┘                          └────┬─────┘           │
│        │                                     │                  │
│        │ no reference                        │ decay (e^-λt)    │
│        │ (natural decay)                     │ no references    │
│        ▼                                     ▼                  │
│   ┌──────────┐       reference++        ┌──────────┐           │
│   │   WARM   │◀─────────────────────────│   WARM   │           │
│   │ 0.4-0.8  │──────────────────────────▶ (decay)  │           │
│   └────┬─────┘                          └────┬─────┘           │
│        │                                     │                  │
│        │ prolonged no-reference              │ continued        │
│        │                                     │ decay            │
│        ▼                                     ▼                  │
│   ┌──────────┐       explicit recall    ┌──────────┐           │
│   │   COLD   │◀─────────────────────────│   COLD   │           │
│   │  <0.4    │─────────────────────────▶│ archive  │           │
│   └──────────┘  promotes back to warm   └──────────┘           │
│                                                                 │
│   Key: ──────▶ promotion  - - - - ▶ demotion                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Figure 3C: Integration with Current System

Shows how Cognitive Memory enhances (not replaces) the existing bank.md architecture.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MEMORY SYSTEM INTEGRATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CURRENT (v1.0)                     COGNITIVE (v2.0)                        │
│  ─────────────                      ──────────────────                      │
│                                                                             │
│  ┌─────────────────┐               ┌─────────────────────────────────────┐ │
│  │    bank.md      │               │         INNATE LAYER                │ │
│  │                 │               │  ┌───────────────────────────────┐  │ │
│  │ • Role State    │───────────────│  │ RULES.md | roles | playbooks │  │ │
│  │ • Active Threads│               │  └───────────────────────────────┘  │ │
│  │ • Lessons       │               │                                     │ │
│  │ • Decisions     │               │  ┌───────────────────────────────┐  │ │
│  │                 │───────────────│  │      LEARNED LAYER            │  │ │
│  └────────┬────────┘               │  │                               │  │ │
│           │                        │  │  ┌─────┐ ┌─────┐ ┌─────┐     │  │ │
│           │                        │  │  │ HOT │ │WARM │ │COLD │     │  │ │
│           │                        │  │  └──┬──┘ └──┬──┘ └──┬──┘     │  │ │
│  ┌────────▼────────┐               │  │     │      │       │        │  │ │
│  │   archives/     │               │  │     └──────┴───────┘        │  │ │
│  │   (cold only)   │───────────────│  │        ▼                    │  │ │
│  │                 │               │  │   Semantic retrieval +      │  │ │
│  │                 │               │  │   heat-based ranking        │  │ │
│  └─────────────────┘               │  └───────────────────────────┘  │ │
│                                    └─────────────────────────────────────┘ │
│                                                                             │
│  MAPPING:                                                                   │
│  • bank.md sections → Learned memory entries with heat scores              │
│  • RULES.md → Innate memory (always hot, immutable)                        │
│  • archives/ → Cold tier with explicit recall                              │
│  • Compression → Heat-based archival (cold entries → archives/)            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Academic Contribution Summary

### What's Novel

| Aspect                 | Existing Systems     | ADA Cognitive Memory            |
| ---------------------- | -------------------- | ------------------------------- |
| Memory hierarchy       | Flat or 2-tier       | 3-tier (Hot/Warm/Cold) + Innate |
| Immutability           | None                 | Innate layer protected          |
| Decay mechanism        | Manual or time-based | Reference-based + time decay    |
| Retrieval optimization | Semantic only        | Semantic × heat ranking         |
| Hallucination defense  | Prompt engineering   | Structural memory protection    |

### Why This Matters for the Paper

1. **Section 3.3 (Architecture)** — Novel memory system design
2. **Section 5 (Experiments)** — Can show heat distribution over cycles
3. **Section 7 (Discussion)** — Cognitive science parallels
4. **Differentiation** — No competitor has innate/learned distinction

---

## Production Notes for Design

### Figure Priority

| Variant | Use in Paper                           | Priority |
| ------- | -------------------------------------- | -------- |
| Fig 3A  | Current implementation (Section 3.3)   | P0       |
| Fig 3B  | Cognitive architecture (Section 3.3.1) | P0       |
| Fig 3C  | Integration view (Section 4)           | P1       |

### Style Guidelines

- Use same monochrome palette as other figures
- Heat levels can use subtle shading (🔥 darkest, 🧊 lightest)
- Innate layer should be visually distinct (bold border or shading)
- ASCII diagrams above are production-ready wireframes

### Recommended Format

- Vector (SVG or TikZ for LaTeX)
- Full column width for 3B (complex diagram)
- Half column for 3A and 3C

---

## Implementation Path

This figure specification supports the following development sequence:

1. **C691** (now): Figure specification for arXiv paper
2. **Sprint 3**: Implement heat scoring in `@ada-ai/core`
3. **Sprint 4**: Full Cognitive Memory integration
4. **Paper submission**: Include both implemented (3A) and planned (3B) architectures

The paper can present:

- Fig 3A as "current system"
- Fig 3B as "proposed extension" with theoretical analysis
- Future work: empirical validation of heat-based retrieval

---

_This specification bridges platform innovation (#113) with academic publication (#131)._
