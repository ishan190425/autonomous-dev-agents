# arXiv Paper Figures

> **Production figures for the ADA arXiv paper (#131)**
> Created: Cycle 697 by 🎨 The Architect

## Figure Inventory

| File                           | Figure                 | Section | Priority | Status     |
| ------------------------------ | ---------------------- | ------- | -------- | ---------- |
| `fig1-system-architecture.tex` | System Architecture    | 3.1     | P0       | ✅ Ready   |
| `fig2-dispatch-flow.tex`       | Dispatch Protocol Flow | 3.2     | P0       | ✅ Ready   |
| `fig3-memory-architecture.tex` | Memory Architecture    | 3.3     | P0       | ✅ Ready   |
| `fig4-role-rotation.tex`       | Role Rotation Cycle    | 3.1     | P1       | ✅ Ready   |
| `fig5-reflexion-flow.tex`      | Reflexion Loop         | 4.3     | P1       | ⏳ Pending |

## Building Figures

### Prerequisites

```bash
# Debian/Ubuntu
sudo apt install texlive-latex-base texlive-pictures texlive-latex-extra

# macOS
brew install --cask mactex
```

### Compile Individual Figure

```bash
cd docs/figures
pdflatex fig1-system-architecture.tex
```

### Compile All Figures

```bash
cd docs/figures
for f in fig*.tex; do pdflatex "$f"; done
```

### Clean Build Artifacts

```bash
rm -f *.aux *.log *.pdf
```

## Including in Paper

### Standalone Figure (Full Page)

```latex
\begin{figure}[t]
  \centering
  \includegraphics[width=\columnwidth]{figures/fig1-system-architecture.pdf}
  \caption{ADA System Architecture showing the Roster, Dispatch Engine,
    Memory Bank, Rules Engine, and external system integrations.}
  \label{fig:architecture}
\end{figure}
```

### Input TikZ Directly

```latex
% In preamble:
\usepackage{tikz}
\usetikzlibrary{positioning,shapes.geometric,arrows.meta,fit,backgrounds,calc}

% In document:
\begin{figure}[t]
  \centering
  \input{figures/fig1-system-architecture-body.tex}
  \caption{...}
\end{figure}
```

## Style Guide

All figures follow these conventions:

- **Color:** Monochrome with single accent (gray scale)
- **Font:** Sans-serif (Helvetica via `\sffamily`)
- **Line Weight:** 1pt normal, emphasis via fill
- **Arrows:** `Stealth` arrowheads from TikZ arrows.meta
- **Corners:** 3pt rounded corners for boxes
- **Heat Colors:** Red (hot), Orange (warm), Blue (cold) — subtle fills only

## Ownership

| Figure | Primary  | Reviewer |
| ------ | -------- | -------- |
| 1-5    | Design   | Research |
| 6-7    | Research | Design   |
| 8      | Research | Product  |

## Timeline

- **P0 (Fig 1-3):** ✅ Created C697
- **P1 (Fig 4-5):** By Mar 1 (pre-YC)
- **P1 (Fig 6-7):** By Mar 7 (first draft)
- **P2 (Fig 8):** By Mar 14 (comparison table)

---

_🎨 The Architect | Cycle 697_
