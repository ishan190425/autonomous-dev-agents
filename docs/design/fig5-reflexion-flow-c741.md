# Figure 5: Reflexion Information Flow — Production Spec

> **Author:** 🎨 The Architect (Design)
> **Date:** 2026-02-16
> **Cycle:** 741
> **Status:** Production Ready
> **Relates to:** #131 arXiv Paper
> **Parent:** docs/design/arxiv-paper-figure-specification-c686.md

## Overview

This document provides the production-ready TikZ code for Figure 5 of the ADA arXiv paper. The Reflexion Information Flow diagram shows how cross-role learnings propagate through the system, enabling continuous improvement.

## Academic Context

**Section:** 4.3 — Reflexion Mechanism
**Purpose:** Visualize the closed-loop learning system that distinguishes ADA from single-run agent frameworks.

## Design Decisions

### Visual Hierarchy

1. **Primary Loop:** Action → Detection → Extraction → Distribution → Future Actions
2. **Three Output Channels:** Lessons Learned, Playbook Updates, Rules Extensions
3. **Feedback Emphasis:** Circular flow showing continuous improvement

### Color Palette (Monochrome + Accent)

- Primary: Black (#000000) for structure
- Accent: Blue (#2563EB) for the feedback loop
- Secondary: Gray (#6B7280) for annotations

### Layout

- Full column width (7 inches / 17.78 cm)
- Height: ~3.5 inches (proportional)
- Landscape orientation within column

---

## TikZ/LaTeX Source

```latex
% fig5-reflexion-flow.tex
% Reflexion Information Flow Diagram for ADA arXiv Paper
% Compile with: pdflatex fig5-reflexion-flow.tex

\documentclass[tikz,border=10pt]{standalone}
\usepackage{tikz}
\usetikzlibrary{shapes.geometric, arrows.meta, positioning, fit, backgrounds}

% Color definitions
\definecolor{primary}{HTML}{1F2937}    % Dark gray
\definecolor{accent}{HTML}{2563EB}     % Blue
\definecolor{secondary}{HTML}{6B7280}  % Medium gray
\definecolor{bglight}{HTML}{F3F4F6}    % Light gray background

\begin{document}
\begin{tikzpicture}[
    % Node styles
    box/.style={
        rectangle,
        draw=primary,
        line width=1pt,
        rounded corners=4pt,
        minimum height=1cm,
        minimum width=2.5cm,
        text centered,
        font=\sffamily\small
    },
    smallbox/.style={
        rectangle,
        draw=primary,
        line width=0.75pt,
        rounded corners=3pt,
        minimum height=0.8cm,
        minimum width=2cm,
        text centered,
        font=\sffamily\footnotesize
    },
    bigbox/.style={
        rectangle,
        draw=primary,
        line width=1pt,
        rounded corners=4pt,
        minimum height=1.2cm,
        minimum width=6cm,
        text centered,
        font=\sffamily\small
    },
    % Arrow styles
    arrow/.style={
        ->,
        >=Stealth,
        line width=1pt,
        primary
    },
    feedbackarrow/.style={
        ->,
        >=Stealth,
        line width=1.5pt,
        accent
    },
    % Label styles
    label/.style={
        font=\sffamily\scriptsize,
        secondary
    }
]

% Main title (outside frame)
\node[font=\sffamily\bfseries, primary] at (4, 5.2) {REFLEXION LOOP};

% Background frame
\begin{scope}[on background layer]
    \draw[primary, line width=1.5pt, rounded corners=8pt]
        (-0.5, -1.8) rectangle (8.5, 4.8);
\end{scope}

% Phase 1: Role Action
\node[box] (action) at (1.5, 3.5) {Role Action\\(Cycle $N$)};

% Phase 2: Pattern Detection
\node[box] (detection) at (6.5, 3.5) {Pattern Detection};
\node[label, below=0.1cm of detection] {{\texttt{ada insights}}};

% Arrow: Action to Detection
\draw[arrow] (action) -- (detection)
    node[midway, above, label] {reflection data};

% Phase 3: Learning Extraction (big box)
\node[bigbox] (extraction) at (4, 1.8) {LEARNING EXTRACTION};

% Extraction sub-items (inside or below)
\node[font=\sffamily\scriptsize, primary, anchor=west] at (1.2, 1.3)
    {\textit{``What worked:''} $\rightarrow$ L-XXX Lesson};
\node[font=\sffamily\scriptsize, primary, anchor=west] at (1.2, 0.9)
    {\textit{``What to improve:''} $\rightarrow$ Playbook Update};
\node[font=\sffamily\scriptsize, primary, anchor=west] at (1.2, 0.5)
    {\textit{``Lesson:''} $\rightarrow$ RULES.md Addition};

% Arrow: Detection to Extraction
\draw[arrow] (detection) -- (extraction);

% Phase 4: Three output channels
\node[smallbox] (lessons) at (1.5, -0.7) {Lessons\\Learned};
\node[smallbox] (playbooks) at (4, -0.7) {Playbooks\\Updated};
\node[smallbox] (rules) at (6.5, -0.7) {RULES.md\\Extended};

% Arrows: Extraction to outputs
\draw[arrow] (extraction.south) ++(-2.5, 0) -- (lessons);
\draw[arrow] (extraction.south) -- (playbooks);
\draw[arrow] (extraction.south) ++(2.5, 0) -- (rules);

% Phase 5: Future Roles (feedback target)
\node[box, draw=accent, line width=1.5pt] (future) at (4, 3.5)
    {Future Roles\\(Cycle $N+1$)};

% Feedback arrows (the key insight)
\draw[feedbackarrow, rounded corners=8pt]
    (lessons.south) -- ++(0, -0.5) -| ++(-1.2, 0) |- (future.west);
\draw[feedbackarrow, rounded corners=8pt]
    (playbooks.south) -- ++(0, -0.3) -- ++(0, 3.5) -- (future.south);
\draw[feedbackarrow, rounded corners=8pt]
    (rules.south) -- ++(0, -0.5) -| ++(1.2, 0) |- (future.east);

% Legend
\node[font=\sffamily\scriptsize, primary, anchor=west] at (0, -1.5)
    {{\color{accent}\rule{0.5cm}{2pt}} Feedback to future cycles};

\end{tikzpicture}
\end{document}
```

---

## Standalone PDF Generation

```bash
# From repo root
cd docs/figures
pdflatex fig5-reflexion-flow.tex
# Output: fig5-reflexion-flow.pdf
```

---

## Paper Integration

```latex
% In the main paper file (section 4.3)
\begin{figure}[t]
  \centering
  \includegraphics[width=\columnwidth]{figures/fig5-reflexion-flow.pdf}
  \caption{Reflexion Information Flow. Each dispatch cycle generates structured
    reflection data (``What worked,'' ``What to improve,'' ``Lesson'') that is
    automatically extracted and distributed to three channels: Lessons Learned
    (L-XXX entries in memory bank), Playbook Updates (role-specific
    improvements), and RULES.md Extensions (team-wide governance). The
    closed-loop feedback ensures future roles benefit from accumulated insights.}
  \label{fig:reflexion-flow}
\end{figure}
```

---

## ASCII Fallback (for README/docs)

```
┌─────────────────────────────────────────────────────────────────┐
│                      REFLEXION LOOP                             │
│                                                                 │
│   ┌─────────────┐    reflection    ┌─────────────────────┐     │
│   │ Role Action │ ─────────────────▶  Pattern Detection  │     │
│   │  (Cycle N)  │      data        │   `ada insights`    │     │
│   └─────────────┘                  └──────────┬──────────┘     │
│                                               │                 │
│                                               ▼                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                   LEARNING EXTRACTION                    │  │
│   │                                                          │  │
│   │  "What worked:"      → L-XXX Lesson                      │  │
│   │  "What to improve:"  → Playbook Update                   │  │
│   │  "Lesson:"           → RULES.md Addition                 │  │
│   └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│           ┌──────────────────┼──────────────────┐              │
│           ▼                  ▼                  ▼              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│   │  Lessons    │    │  Playbooks  │    │  RULES.md   │       │
│   │  Learned    │    │  Updated    │    │  Extended   │       │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘       │
│          │                  │                  │               │
│          └──────────────────┼──────────────────┘               │
│                             ▼                                  │
│                    ┌─────────────────┐                         │
│                    │  Future Roles   │ ◀─── feedback loop      │
│                    │  (Cycle N+1)    │                         │
│                    └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design Rationale

### Why This Layout?

1. **Top-down flow** matches how readers scan academic papers
2. **Three-channel output** visually emphasizes the multi-modal learning distribution
3. **Blue accent on feedback** draws attention to the key differentiator: closed-loop learning
4. **Cycle N → Cycle N+1** makes temporal progression explicit

### Comparison to Initial Concept (C686)

| Element     | C686 Concept    | C741 Production                       |
| ----------- | --------------- | ------------------------------------- |
| Layout      | Linear top-down | Circular feedback emphasized          |
| Colors      | Not specified   | Monochrome + blue accent              |
| Annotations | Generic         | Specific `ada insights` CLI reference |
| Output      | ASCII only      | TikZ (production) + ASCII (fallback)  |

### Accessibility

- Monochrome-safe (works in B&W print)
- Clear labels without relying on color alone
- High contrast ratios for text readability

---

## Checklist

- [x] Concept aligned with C686 specification
- [x] TikZ source compiles (syntax verified)
- [x] Paper integration snippet provided
- [x] ASCII fallback for non-LaTeX docs
- [x] Design rationale documented
- [ ] Compiled PDF reviewed (awaiting Research review)
- [ ] Integrated into paper draft

---

## Next Steps

1. **Research:** Review figure for accuracy against Reflexion methodology docs
2. **Engineering:** Confirm `ada insights` command is documented (for label accuracy)
3. **Design:** Create figures 4, 6, 7 after Fig 5 approval

---

_🎨 The Architect | Cycle 741 | Relates to #131_
