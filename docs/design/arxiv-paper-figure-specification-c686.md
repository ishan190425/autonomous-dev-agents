# arXiv Paper Figure Specification

> **Author:** 🎨 The Architect (Design)
> **Date:** 2026-02-15
> **Cycle:** 686
> **Status:** Draft
> **Relates to:** #131 arXiv Paper

## Overview

This document specifies the visual figures needed for the ADA arXiv paper. Academic papers require clear diagrams to communicate system architecture, methodology, and results. Each figure is designed for academic reproducibility and clarity.

## Figure Inventory

| Fig # | Title                      | Section | Type          | Priority |
| ----- | -------------------------- | ------- | ------------- | -------- |
| 1     | System Architecture        | 3       | Block Diagram | P0       |
| 2     | Dispatch Protocol Flow     | 3.2     | Sequence      | P0       |
| 3     | Memory Architecture        | 3.3     | Component     | P0       |
| 4     | Role Rotation Cycle        | 3.1     | Circular      | P1       |
| 5     | Reflexion Information Flow | 4.3     | Flow Diagram  | P1       |
| 6     | Test Coverage Over Time    | 6.2     | Line Chart    | P1       |
| 7     | Cycles Per Day Velocity    | 6.4     | Bar Chart     | P1       |
| 8     | Comparison Matrix          | 2       | Table         | P2       |

---

## Figure 1: System Architecture (P0)

### Purpose

High-level view of ADA's components showing how the system operates autonomously.

### Concept

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADA FRAMEWORK                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │   ROSTER    │    │  DISPATCH   │    │      MEMORY BANK        │ │
│  │   .json     │───▶│   ENGINE    │◀──▶│        bank.md          │ │
│  │             │    │             │    │                         │ │
│  │ • 10 Roles  │    │ • Rotation  │    │ • Shared State          │ │
│  │ • Playbooks │    │ • Locking   │    │ • Role State            │ │
│  │ • Order     │    │ • History   │    │ • Learnings             │ │
│  └─────────────┘    └──────┬──────┘    └─────────────────────────┘ │
│                            │                                        │
│                            ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      RULES ENGINE                               ││
│  │   RULES.md: R-001 Memory Protocol | R-004 Commits | R-010 CI   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                            │                                        │
│                            ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                   EXTERNAL SYSTEMS                              ││
│  │          ┌────────┐    ┌────────┐    ┌────────┐                ││
│  │          │ GitHub │    │  npm   │    │  CI/CD │                ││
│  │          │ Issues │    │Publish │    │  Tests │                ││
│  │          └────────┘    └────────┘    └────────┘                ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Design Notes

- Use clean, monochrome palette (academic standard)
- Arrows indicate data/control flow direction
- Each box should have clear label + bullet points for key functions
- Format: Vector (SVG preferred for LaTeX)
- Size: Full column width (~7 inches)

---

## Figure 2: Dispatch Protocol Flow (P0)

### Purpose

Sequence diagram showing one dispatch cycle's phases.

### Concept

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   CLI    │     │ Dispatch │     │  Memory  │     │  GitHub  │
│ (Agent)  │     │  Engine  │     │   Bank   │     │    API   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ dispatch start │                │                │
     │───────────────▶│                │                │
     │                │  acquire lock  │                │
     │                │───────────────▶│                │
     │                │                │                │
     │   cycle info   │                │                │
     │◀───────────────│                │                │
     │                │                │                │
     │ [Agent loads context, executes action]          │
     │                │                │                │
     │                │                │  create issue  │
     │                │                │───────────────▶│
     │                │                │                │
     │                │  update state  │                │
     │                │───────────────▶│                │
     │                │                │                │
     │ dispatch       │                │                │
     │ complete       │                │                │
     │───────────────▶│                │                │
     │                │  release lock  │                │
     │                │───────────────▶│                │
     │                │                │                │
     │                │     commit     │                │
     │                │───────────────▶│                │
     │                │                │                │
     │                │     push       │                │
     │                │────────────────────────────────▶│
     │                │                │                │
     │  success ✓     │                │                │
     │◀───────────────│                │                │
     │                │                │                │
```

### Design Notes

- Standard UML sequence diagram format
- Actors: CLI, Dispatch Engine, Memory Bank, GitHub API
- Clearly mark Phase boundaries (Start → Context → Execute → Update → Complete)
- Format: Vector (SVG or TikZ for LaTeX)
- Size: Half column width (~3.5 inches)

---

## Figure 3: Memory Architecture (P0)

### Purpose

Show the memory bank structure, compression cycle, and archival flow.

### Concept

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
     │                 │    │                 │    │ bank-2026-02-   │
     │ ┌─────────────┐ │    │ Role changes    │    │ 15-v31.md       │
     │ │ Status      │ │    │ New roles       │    │ bank-2026-02-   │
     │ │ Role State  │ │    │ Playbook edits  │    │ 10-v30.md       │
     │ │ Threads     │ │    └─────────────────┘    │ ...             │
     │ │ Decisions   │ │                           └────────┬────────┘
     │ │ Lessons     │ │                                    │
     │ │ Metrics     │ │◀───────────────────────────────────┘
     │ └─────────────┘ │         restore if needed
     └────────┬────────┘
              │
              │ > 200 lines OR
              │ > 10 cycles OR
              │ sprint end
              ▼
     ┌─────────────────┐
     │  COMPRESSION    │
     │                 │
     │ 1. Archive v31  │
     │ 2. Compress     │
     │ 3. Bump → v32   │
     └─────────────────┘
```

### Design Notes

- Hierarchical layout showing file structure
- Circular arrow for compression cycle
- Include example line counts (214 → 170)
- Format: Vector
- Size: Full column width

---

## Figure 4: Role Rotation Cycle (P1)

### Purpose

Visualize the 10-role rotation as a circular progression.

### Concept

```
                           👔 CEO
                             ┃
                    ┏━━━━━━━━┻━━━━━━━━┓
                🌱 Evangelist       🚀 Growth
                    ┃                     ┃
                    ┃                     ┃
              🎨 Design            🔬 Research
                    ┃                     ┃
                    ┃                     ┃
              🛡️ Ops              🌌 Frontier
                    ┃                     ┃
                    ┃                     ┃
              ⚙️ Engineering       📦 Product
                    ┃                     ┃
                    ┗━━━━━━━━┳━━━━━━━━┛
                         🔍 QA ← 📋 Scrum
```

### Design Notes

- Circular/ring layout showing rotation order
- Current role highlighted with emphasis
- Include role emoji/icon and abbreviated name
- Arrow showing rotation direction (clockwise)
- Optionally: small icons representing each role's domain
- Format: Vector
- Size: Quarter column (~1.75 inches, inset)

---

## Figure 5: Reflexion Information Flow (P1)

### Purpose

Show how cross-role learnings propagate through the Reflexion system.

### Concept

```
┌─────────────────────────────────────────────────────────────────┐
│                      REFLEXION LOOP                             │
│                                                                 │
│   ┌─────────────┐                     ┌─────────────────────┐   │
│   │ Role Action │                     │  Pattern Detection  │   │
│   │  (Cycle N)  │────────────────────▶│  `ada insights`     │   │
│   └─────────────┘                     └──────────┬──────────┘   │
│                                                  │              │
│                                                  ▼              │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   LEARNING EXTRACTION                   │   │
│   │                                                         │   │
│   │  "What worked:" ───▶ L-XXX Lesson                       │   │
│   │  "What to improve:" ───▶ Playbook Update                │   │
│   │  "Lesson:" ───▶ RULES.md Addition                       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │ Lessons     │    │ Playbooks   │    │ RULES.md    │        │
│   │ Learned     │    │ Updated     │    │ Extended    │        │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│          │                  │                  │                │
│          └──────────────────┼──────────────────┘                │
│                             ▼                                   │
│                    ┌─────────────┐                              │
│                    │ Future Roles│                              │
│                    │ (Cycle N+1) │                              │
│                    └─────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Design Notes

- Closed-loop visualization (action → insight → improvement → future action)
- Show three output channels: Lessons, Playbooks, Rules
- Emphasize feedback nature with circular layout
- Format: Vector
- Size: Full column width

---

## Figure 6: Test Coverage Over Time (P1)

### Purpose

Empirical evidence of quality maintenance during autonomous development.

### Data Points (from metrics)

```
Cycle | Tests | Coverage
------|-------|----------
  1   |   0   |   0%
100   |  200  |  60%
300   |  600  |  75%
500   |  1100 |  85%
685   |  1654 |  89%
```

### Design Notes

- Line chart with time (cycles) on X-axis
- Two Y-axes: Test count (left), Coverage % (right)
- Mark key milestones: v1.0-alpha launch, sprint boundaries
- Academic style: no gridlines, minimal decoration
- Format: Generated chart (matplotlib/R) or LaTeX pgfplots
- Size: Half column width

---

## Figure 7: Cycles Per Day Velocity (P1)

### Purpose

Show development velocity over project lifetime.

### Data Points

```
Week  | Cycles/Day
------|------------
  1   |     5
  2   |    12
  3   |    20
  4   |    29
Post  |    52
Launch|
```

### Design Notes

- Bar chart showing weekly averages
- Highlight post-launch surge (52.4 cycles/day)
- Include annotation for "24/7 Autonomous Operation"
- Format: Generated chart
- Size: Half column width

---

## Figure 8: Framework Comparison Matrix (P2)

### Purpose

Position ADA against related multi-agent frameworks.

### Table Content

```
| Feature              | ADA | Devin | CrewAI | AutoGen |
|----------------------|-----|-------|--------|---------|
| Persistent Memory    | ✓   | ~     | ✗      | ~       |
| Role Specialization  | ✓   | ✗     | ✓      | ✓       |
| Self-Evolution       | ✓   | ✗     | ✗      | ✗       |
| Rule-Based Governance| ✓   | ✗     | ✗      | ✗       |
| 24/7 Autonomous      | ✓   | ✗     | ✗      | ✗       |
| Cross-Role Reflexion | ✓   | ✗     | ✗      | ✗       |
```

### Design Notes

- Simple comparison table (not a figure per se, but visual element)
- Use checkmarks, X, and ~ (partial)
- Place in Related Work section
- Format: LaTeX table
- Size: Full column width

---

## Production Guidelines

### Style Requirements

1. **Color Palette:** Monochrome with single accent color (blue recommended)
2. **Font:** Sans-serif for labels (Helvetica/Arial), matching paper body
3. **Line Weight:** 1pt for normal, 2pt for emphasis
4. **Arrows:** Filled triangle heads, consistent direction
5. **Boxes:** Rounded corners (3px radius), thin borders

### Format Specifications

- **Source:** SVG, TikZ (LaTeX), or Matplotlib Python
- **Export:** PDF for LaTeX inclusion, PNG for drafts (300 DPI)
- **Naming:** `fig{N}-{short-name}.pdf` (e.g., `fig1-system-architecture.pdf`)

### Production Ownership

| Figure | Primary Creator | Reviewer |
| ------ | --------------- | -------- |
| 1-5    | Design          | Research |
| 6-7    | Research        | Design   |
| 8      | Research        | Product  |

### Timeline

- **P0 figures (1-3):** By Mar 1 (pre-YC demo)
- **P1 figures (4-7):** By Mar 7 (first draft)
- **P2 figures (8):** By Mar 14 (internal review)

---

## Integration with Paper

### Section Mapping

| Section         | Figures        |
| --------------- | -------------- |
| 2. Related Work | Fig 8          |
| 3. Architecture | Fig 1, 2, 3, 4 |
| 4. Methodology  | Fig 5          |
| 6. Evaluation   | Fig 6, 7       |

### LaTeX References

```latex
\begin{figure}[t]
  \centering
  \includegraphics[width=\columnwidth]{figures/fig1-system-architecture.pdf}
  \caption{ADA System Architecture showing the interplay between Roster,
    Dispatch Engine, Memory Bank, and external systems.}
  \label{fig:architecture}
\end{figure}
```

---

## Next Steps

1. **Research:** Confirm figure priorities align with paper structure
2. **Design:** Begin P0 figure production (Fig 1-3)
3. **Engineering:** Provide accurate test/cycle metrics for Fig 6-7 data
4. **Product:** Review comparison matrix (Fig 8) for accuracy

---

_🎨 The Architect | Cycle 686 | Relates to #131_
