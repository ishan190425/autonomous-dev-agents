# arXiv Paper Assembly Guide — Pre-First-Draft Preparation

> **Issue:** #131 | **Cycle:** C418 | **Author:** 🔬 Research
> **Purpose:** Enable efficient Mar 7 first draft assembly by inventorying sections, defining structure, and identifying integration points
> **Following:** L158, L164 (pre-decision holding enables sprint velocity head start)

---

## Section Inventory

All 8 paper sections have been drafted. Status and word count estimates:

| Section          | File                                 | Cycle | Est. Pages | Status      |
| ---------------- | ------------------------------------ | ----- | ---------- | ----------- |
| Outline/Abstract | `arxiv-paper-outline-c368.md`        | C368  | 0.5        | ✅ Complete |
| Introduction     | `arxiv-paper-introduction-c396.md`   | C396  | 2-3        | ✅ Complete |
| Related Work     | `arxiv-paper-related-work-c388.md`   | C388  | 2-3        | ✅ Complete |
| Architecture     | `arxiv-paper-architecture-c389.md`   | C389  | 4-5        | ✅ Complete |
| Methodology      | `arxiv-paper-methodology-c390.md`    | C390  | 3-4        | ✅ Complete |
| Implementation   | `arxiv-paper-implementation-c393.md` | C393  | 3-4        | ✅ Complete |
| Evaluation       | `arxiv-paper-evaluation-c394.md`     | C394  | 2-3        | ✅ Complete |
| Discussion       | `arxiv-paper-discussion-c398.md`     | C398  | 2-3        | ✅ Complete |
| Conclusion       | `arxiv-paper-conclusion-c399.md`     | C399  | 1-2        | ✅ Complete |

**Total estimated:** 20-28 pages (standard for framework papers)

---

## Final Paper Structure

For arXiv submission, sections should be ordered and structured as follows:

```
1. Title + Authors + Abstract
2. Introduction (from C396)
3. Related Work (from C388)
4. Architecture (from C389)
   4.1 Role System
   4.2 Dispatch Protocol
   4.3 Memory Architecture
   4.4 Rule Governance
5. Methodology (from C390)
   5.1 Rotation and Coordination
   5.2 Memory Compression
   5.3 Reflexion Framework
   5.4 Role Evolution
6. Implementation (from C393)
   6.1 Technology Stack
   6.2 CLI Tooling
   6.3 Core Library
   6.4 Self-Dogfooding Setup
7. Evaluation (from C394)
   7.1 Experimental Setup
   7.2 Quantitative Results
   7.3 Qualitative Analysis
8. Discussion (from C398)
   8.1 Key Findings
   8.2 Limitations
   8.3 Future Work
9. Conclusion (from C399)
10. References
Appendix A: Role Playbooks
Appendix B: Memory Bank Examples
Appendix C: Rule Definitions
```

---

## Cross-Reference Integration Points

The following internal cross-references must be added during assembly:

### Forward References (from earlier sections)

| From              | To                | Reference Type                        |
| ----------------- | ----------------- | ------------------------------------- |
| Introduction §1.3 | Architecture §4   | "as detailed in Section 4"            |
| Introduction §1.3 | Evaluation §7     | "empirically validated in Section 7"  |
| Related Work §2.4 | Architecture §4.3 | "our approach (Section 4.3)"          |
| Architecture §4.2 | Methodology §5.1  | "protocol described in Section 5.1"   |
| Architecture §4.3 | Methodology §5.2  | "compression protocol in Section 5.2" |

### Backward References (from later sections)

| From            | To              | Reference Type                        |
| --------------- | --------------- | ------------------------------------- |
| Evaluation §7.1 | Architecture §4 | "architecture described in Section 4" |
| Discussion §8.1 | Evaluation §7.2 | "results in Section 7.2 show"         |
| Conclusion      | all             | Summary back-references               |

---

## Figures and Tables Required

### Existing (to extract/formalize)

1. **Role System Table** — Architecture §4.1 (exists in outline)
2. **Dispatch Protocol Diagram** — Architecture §4.2 (ASCII in docs, needs formal diagram)
3. **Memory Architecture Diagram** — Architecture §4.3 (needs creation)
4. **Rotation Flow Diagram** — Methodology §5.1 (needs creation)
5. **Cycle Metrics Table** — Evaluation §7.2 (data exists in self-benchmark)
6. **Comparison Table** — Related Work §2 (exists partially)

### New Figures Needed

| Figure | Section      | Description                    | Source Data     |
| ------ | ------------ | ------------------------------ | --------------- |
| Fig 1  | Architecture | High-level system architecture | Conceptual      |
| Fig 2  | Architecture | Dispatch cycle flow            | DISPATCH.md     |
| Fig 3  | Methodology  | Memory bank lifecycle          | bank.md history |
| Fig 4  | Evaluation   | Cycle velocity over time       | rotation.json   |
| Fig 5  | Evaluation   | Issue completion rate          | GitHub API      |

### New Tables Needed

| Table | Section        | Description                     | Source Data               |
| ----- | -------------- | ------------------------------- | ------------------------- |
| Tab 1 | Architecture   | 10 roles with responsibilities  | roster.json               |
| Tab 2 | Related Work   | Framework comparison matrix     | Existing research docs    |
| Tab 3 | Implementation | Technology stack                | package.json              |
| Tab 4 | Evaluation     | Quantitative metrics            | Self-benchmark C348, C400 |
| Tab 5 | Evaluation     | Sprint 1 vs Sprint 2 comparison | Memory bank archives      |

---

## Citation Consolidation

Papers and tools referenced across sections that need BibTeX entries:

### Academic Papers

1. **Reflexion** — Shinn et al. 2023 (Referenced in Methodology, Discussion)
2. **Generative Agents** — Park et al. 2023 (Related Work, Architecture)
3. **MemGPT** — Packer et al. 2023 (Related Work, Methodology)
4. **ReAct** — Yao et al. 2023 (Related Work)
5. **SWE-bench** — Jimenez et al. 2024 (Evaluation, methodology references)
6. **Chain-of-Thought** — Wei et al. 2022 (Background)
7. **FullStack-Agent** — Reference paper for format (#131)

### Tools and Frameworks

1. **CrewAI** — Website/GitHub citation
2. **AutoGen** — Microsoft, 2023
3. **LangGraph** — LangChain, 2024
4. **OpenHands** — GitHub, 2024
5. **Devin** — Cognition Labs (press/blog citation)
6. **Claude Code** — Anthropic, 2024

### Standards

1. **Conventional Commits** — conventionalcommits.org
2. **TypeScript** — Microsoft
3. **Vitest** — Testing framework

---

## arXiv Formatting Requirements

### Template

Use **arXiv style** (default LaTeX article class) or **NeurIPS/ICML format** for ML audience appeal.

Recommended: `\documentclass[11pt]{article}` with:

- `\usepackage{arxiv}` or standard article formatting
- `\usepackage{hyperref}` for clickable references
- `\usepackage{booktabs}` for professional tables
- `\usepackage{graphicx}` for figures
- `\usepackage{listings}` for code snippets

### Submission Checklist

- [ ] All figures as PDF/EPS (300+ DPI)
- [ ] All tables use booktabs formatting
- [ ] All citations in BibTeX format
- [ ] Abstract under 300 words
- [ ] No proprietary/closed-source code dependencies
- [ ] GitHub repo link included
- [ ] License statement (MIT for ADA)
- [ ] Author contributions section (optional but recommended for multi-author)

### Metadata

```bibtex
@article{ada2026,
  title={ADA: Role-Based Multi-Agent Framework for Autonomous Software Development},
  author={[TBD - Human authors + acknowledgment of AI assistance]},
  journal={arXiv preprint arXiv:XXXX.XXXXX},
  year={2026}
}
```

---

## Assembly Process (Mar 7)

### Phase 1: Content Merge (2-3 hours)

1. Create `docs/paper/ada-arxiv-draft-v1.md` master document
2. Copy sections in order from source files
3. Add section numbers and formatting
4. Insert cross-reference placeholders: `[REF:§X.Y]`

### Phase 2: Integration (2-3 hours)

1. Resolve all cross-references to actual section numbers
2. Verify narrative flow between sections
3. Ensure consistent terminology across sections
4. Check for redundancy (multiple sections may cover same ground)

### Phase 3: Figures & Tables (3-4 hours)

1. Create formal diagrams from ASCII representations
2. Generate tables from data sources
3. Insert figure/table references in text
4. Create figure captions

### Phase 4: Citations (1-2 hours)

1. Create `references.bib` with all citations
2. Replace inline citations with `\cite{key}`
3. Verify all claims have citations

### Phase 5: Review (2 hours)

1. Read full paper for coherence
2. Check abstract matches content
3. Verify conclusion synthesizes findings
4. Proofread for typos

**Total estimated assembly time:** 10-14 hours (1.5-2 full cycles)

---

## Post-Assembly Review (Mar 7-14)

### Internal Review Criteria

1. **Technical Accuracy** — Engineering reviews architecture/implementation
2. **Research Positioning** — Research reviews related work/discussion
3. **Narrative Clarity** — Product reviews introduction/conclusion
4. **Quality Standards** — QA reviews citations/formatting
5. **Strategic Alignment** — CEO reviews contributions/impact claims

### Revision Priorities

1. P0: Factual errors or misrepresentations
2. P1: Missing key contributions or comparisons
3. P2: Clarity improvements
4. P3: Style/formatting polish

---

## Metrics Update for Assembly

Current metrics (as of C418, to be verified at assembly):

| Metric               | Value  | Source             |
| -------------------- | ------ | ------------------ |
| Dispatch Cycles      | 418+   | rotation.json      |
| Total Tests          | 1,174+ | CI/test output     |
| Documentation Files  | 213+   | ls docs/ count     |
| Documented Learnings | 165+   | RULES.md + bank.md |
| Merged PRs           | 42     | GitHub             |
| Roles                | 10     | roster.json        |

These should be refreshed at Mar 7 assembly time using:

```bash
ada status --verbose
gh pr list --state merged | wc -l
find docs -name "*.md" | wc -l
```

---

## References

- Issue #131: arXiv Paper planning
- C368: Paper outline
- C388-C399: Section drafts
- L155: Role-expertise paper mapping
- L165: Execution protocols consolidate prior research

---

_This guide enables efficient first draft assembly on Mar 7 by pre-solving integration challenges during the Feb 11-17 holding pattern._
