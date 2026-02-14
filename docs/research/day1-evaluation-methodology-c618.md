# Day 1 Evaluation Methodology for arXiv Paper

> **Document Type:** Research Methodology  
> **Cycle:** C618 (Research)  
> **Date:** 2026-02-14 (T+~4h post-npm-live)  
> **Author:** 🔬 Research (The Scout)  
> **Related:** #131 (arXiv Paper), L290 (Dual Timeline), L292 (Organic Discovery)

---

## Abstract

This document formalizes the evaluation methodology for ADA's launch impact assessment, designed for inclusion in the arXiv paper's Evaluation section. The methodology captures a natural experiment created by the announcement slip (C597) — enabling separate measurement of organic ecosystem discovery versus promotional amplification.

---

## 1. Natural Experiment Design

### 1.1 Experimental Conditions

The announcement delay (C597: Discord/Reddit/etc. posting blocked, requires human manual posting) created two distinct measurement windows:

| Phase       | Condition                 | Duration           | What We Measure             |
| ----------- | ------------------------- | ------------------ | --------------------------- |
| **Phase 1** | npm LIVE, NO announcement | T+0 to T+announce  | Organic ecosystem discovery |
| **Phase 2** | npm LIVE + announcement   | T+announce to T+7d | Promotional amplification   |
| **Delta**   | Phase 2 - Phase 1         | —                  | True marketing impact       |

### 1.2 Why This Matters

Most open-source launches measure total traction, conflating:

- Ecosystem-driven discovery (npm search, GitHub trending, dependency chains)
- Promotional discovery (Twitter, Reddit, Discord, newsletters)

Our accidental A/B test separates these, providing cleaner attribution for the arXiv paper's evaluation claims.

---

## 2. Metrics Framework

### 2.1 Primary Metrics

| Metric               | Source          | Collection Frequency | Notes                           |
| -------------------- | --------------- | -------------------- | ------------------------------- |
| **npm downloads**    | `npm-stat.com`  | T+48h, T+7d, T+30d   | 24-48h propagation delay (L283) |
| **GitHub stars**     | `gh api`        | Every T+24h          | Instant                         |
| **Unique visitors**  | GitHub Insights | Every T+24h          | Rolling 14-day window           |
| **Page views**       | GitHub Insights | Every T+24h          | Rolling 14-day window           |
| **Referral sources** | GitHub Insights | Every T+24h          | Identifies discovery channels   |

### 2.2 Derived Metrics

| Metric                   | Formula                     | Interpretation              |
| ------------------------ | --------------------------- | --------------------------- |
| **Organic rate**         | Visitors / hours (Phase 1)  | Baseline discovery velocity |
| **Amplification factor** | Phase 2 rate / Phase 1 rate | Marketing ROI proxy         |
| **Conversion rate**      | Downloads / Visitors        | Interest-to-action ratio    |
| **Star velocity**        | Stars / 24h                 | Community engagement        |

### 2.3 Baseline Captured (C608)

Pre-announcement organic metrics (T+25h):

- **83 unique visitors** — npm ecosystem discovery only
- **2,118 page views** — organic interest depth
- **10 GitHub stars** — early adopter signal
- **Organic rate:** ~3.3 visitors/hour

These baselines enable clean delta measurement post-announcement.

---

## 3. Collection Protocol

### 3.1 Time Windows

| Checkpoint | Time      | Primary Focus               |
| ---------- | --------- | --------------------------- |
| T+0        | npm live  | Timestamp anchor            |
| T+24h      | Day 1 end | Early organic snapshot      |
| T+48h      | Day 2     | npm stats available (L283)  |
| T+announce | Variable  | Phase 1 closes              |
| T+7d       | Week 1    | Initial traction assessment |
| T+30d      | Month 1   | Sustained interest          |

### 3.2 Data Collection Commands

```bash
# GitHub metrics
gh api repos/ishan190425/autonomous-dev-agents --jq '{stars: .stargazers_count, forks: .forks_count, watchers: .subscribers_count}'

# Traffic (requires owner access, web UI only)
# GitHub → Insights → Traffic → Clones/Views

# npm downloads (after 48h propagation)
curl -s "https://api.npmjs.org/downloads/range/2026-02-14:2026-02-21/@ada-ai/cli" | jq
```

### 3.3 Recording Standards

Each metrics checkpoint creates a document:

- `docs/research/t{N}h-{description}-c{cycle}.md`
- Include raw numbers, deltas from previous checkpoint, and interpretation
- Reference applicable Lessons Learned (L###)

---

## 4. arXiv Evaluation Section Integration

### 4.1 Claims This Methodology Supports

1. **"ADA demonstrates organic ecosystem discoverability"**
   - Evidence: Phase 1 metrics (83 visitors pre-announcement)
   - Implication: npm publication drives discovery without promotion

2. **"Marketing amplifies but doesn't create adoption"**
   - Evidence: Amplification factor (Phase 2 / Phase 1)
   - Implication: Product quality enables marketing; marketing doesn't substitute for quality

3. **"Autonomous development teams achieve production deployment"**
   - Evidence: npm LIVE status, 617+ cycles, 1,360 tests
   - Implication: Role-based agent teams can ship real software

### 4.2 Evaluation Section Outline

```markdown
## 6. Evaluation

### 6.1 Deployment Metrics

- npm publication (v1.0.0-alpha)
- Autonomous cycle count (617+)
- Test coverage (87%+)
- Consecutive execution (197 cycles)

### 6.2 Adoption Methodology

- Natural experiment design (this document)
- Dual-timeline measurement
- Organic vs promoted separation

### 6.3 Results

- Phase 1: [organic metrics]
- Phase 2: [post-announcement metrics]
- Delta analysis: [amplification factor]

### 6.4 Comparison to Baselines

- vs. typical OSS launch curves
- vs. other AI coding tools (if comparable data available)
```

---

## 5. Limitations & Threats to Validity

### 5.1 Internal Validity

- **Confound:** npm trending algorithm may amplify organic discovery
- **Mitigation:** Track npm-specific vs GitHub-specific metrics separately

### 5.2 External Validity

- **Confound:** Single product launch, N=1
- **Mitigation:** Document methodology for replication by other autonomous teams

### 5.3 Measurement Validity

- **Confound:** npm download stats have 24-48h delay (L283)
- **Mitigation:** Acknowledge delay, use T+48h as reliable first measurement

---

## 6. Research Lessons Learned

This methodology codifies several lessons:

- **L290:** Dual timeline tracking enables clean marketing attribution
- **L292:** Organic discovery is measurable when announcements slip (baseline captured)
- **L283:** npm stats have propagation delay — plan collection windows accordingly
- **L287:** Define feedback collection protocols BEFORE announcements

---

## 7. Next Steps

| Action                                | Owner    | Timeline                      |
| ------------------------------------- | -------- | ----------------------------- |
| T+48h metrics capture                 | Research | Feb 16 ~12:35 EST             |
| Post-announcement Phase 2 capture     | Research | T+announce + 24h              |
| Integrate into arxiv-paper-evaluation | Research | Feb 28 (Sprint 2)             |
| Final metrics synthesis               | Research | Mar 5 (T-2 to arXiv deadline) |

---

## References

- [L283] npm download statistics delay — `agents/memory/bank.md`
- [L290] Dual timeline methodology — `agents/memory/bank.md`
- [L292] Organic discovery baseline — `agents/memory/bank.md`
- [C608] t25h-organic-discovery-baseline-c608.md
- [#131] arXiv Paper Issue — GitHub

---

_This methodology document feeds directly into the arXiv paper's Evaluation section. It captures the accidental natural experiment created by the announcement delay, enabling rigorous claims about ecosystem discoverability and marketing impact._
