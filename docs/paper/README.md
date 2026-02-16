# ADA arXiv Paper — Working Directory

> **Issue:** #131 | **Target:** arXiv submission March 28, 2026
> **First Draft:** March 7, 2026

## Structure

```
docs/paper/
├── README.md           ← You are here
├── references.bib      ← BibTeX bibliography (C701)
└── ada-arxiv-draft-v1.md  ← Master document (to be created Mar 7)
```

## Source Sections

All sections live in `docs/research/` until assembly:

| Section        | Source File                             | Cycle |
| -------------- | --------------------------------------- | ----- |
| Outline        | `arxiv-paper-outline-c448.md`           | C448  |
| Introduction   | `arxiv-paper-introduction-c396.md`      | C396  |
| Related Work   | `arxiv-paper-related-work-c388.md`      | C388  |
| Architecture   | `arxiv-paper-architecture-c389.md`      | C389  |
| Methodology    | `arxiv-paper-methodology-c390.md`       | C390  |
| Implementation | `arxiv-paper-implementation-c393.md`    | C393  |
| Evaluation     | `arxiv-paper-evaluation-c394.md`        | C394  |
| Eval Update    | `arxiv-paper-evaluation-update-c658.md` | C658  |
| Discussion     | `arxiv-paper-discussion-c398.md`        | C398  |
| Conclusion     | `arxiv-paper-conclusion-c399.md`        | C399  |

## Supporting Documents

- **Assembly Guide:** `arxiv-paper-assembly-guide-c418.md` — Integration protocol
- **Academic Readiness:** `arxiv-paper-academic-readiness-c428.md`
- **Metrics Snapshots:** `t77h-empirical-metrics-c690.md` (latest)

## Bibliography

`references.bib` contains 30+ citations organized by category:

1. **Multi-Agent Systems** — Park et al. (Generative Agents), AutoGen, CrewAI, MetaGPT
2. **LLM Reasoning** — Reflexion, Chain-of-Thought, ReAct
3. **Code Generation** — SWE-bench, SWE-agent, Devin, OpenHands
4. **Memory Systems** — MemGPT, context management research
5. **Frameworks** — LangGraph, Semantic Kernel
6. **Standards** — Conventional Commits, TypeScript, Vitest

## Timeline

| Date   | Milestone                    | Owner       | Status |
| ------ | ---------------------------- | ----------- | ------ |
| Feb 17 | SaaS Container Phase 1 Start | Engineering | 🟢     |
| Mar 7  | **First Draft**              | Research    | 🟢     |
| Mar 14 | Internal Review              | All         | 🟢     |
| Mar 21 | Revision                     | Research    | 🟢     |
| Mar 28 | **arXiv Submission**         | Research    | 🟢     |

_Note: Pioneer (Feb 25) and YC (Mar 1) demos CANCELLED per #158 strategic pivot._

## Assembly Process

Per `arxiv-paper-assembly-guide-c418.md`:

1. **Content Merge** (2-3h) — Combine sections into master doc
2. **Integration** (2-3h) — Cross-references, flow, terminology
3. **Figures & Tables** (3-4h) — Formal diagrams from specs
4. **Citations** (1-2h) — BibTeX integration ✅ (C701)
5. **Review** (2h) — Coherence, proofreading

## Metrics for Paper

Current (C701, T+~80h):

| Metric          | Value   |
| --------------- | ------- |
| Dispatch Cycles | 701     |
| Tests           | ~2,150+ |
| Docs            | 401+    |
| Learnings       | 348+    |
| Consecutive     | 281     |
| PRs Merged      | 54      |

Final snapshot at ~C800 (T+7 days) for round numbers.

---

_Created C701 | 🔬 Research_
