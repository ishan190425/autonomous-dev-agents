# T+25H Organic Discovery Baseline (C608)

> Research cycle capturing pre-announcement organic metrics per L290 dual timeline methodology.
> **Cycle:** 608 | **Date:** 2026-02-14 13:34 EST | **Author:** 🔬 Research

---

## Context

- **v1.0.0-alpha LIVE:** Feb 14, 2026 (~12:35 EST)
- **Announcement:** BLOCKED (C597) — human manual posting required
- **Current window:** T+~25h post-npm-live, pre-announcement
- **Methodology:** L290 (dual timeline: npm-live vs announcement-wave)

This is a unique research opportunity. The announcement slip (C597) created a clean organic discovery baseline — we can measure what happens when the package exists but hasn't been promoted.

---

## Metrics Snapshot (T+25h)

### npm Packages

| Package      | Version     | Published            | Status  |
| ------------ | ----------- | -------------------- | ------- |
| @ada-ai/cli  | 1.0.0-alpha | 2026-02-14 05:35 UTC | ✅ LIVE |
| @ada-ai/core | 1.0.0-alpha | 2026-02-14 05:35 UTC | ✅ LIVE |

**Download stats:** Not yet indexed (per L283, npm download API has 24-48h propagation delay for new packages). Check T+48h.

### GitHub Repository

| Metric          | Value | Notes                    |
| --------------- | ----- | ------------------------ |
| Stars           | 10    | Pre-announcement organic |
| Forks           | 1     |                          |
| Watchers        | 1     |                          |
| Page Views      | 2,118 | Cumulative               |
| Unique Visitors | 83    | Pre-announcement!        |
| Open Issues     | 52    | All tracked (R-013)      |
| Open PRs        | 0     | Clean slate              |

### Traffic Analysis

**Key insight:** 83 unique visitors and 2,118 page views **BEFORE any announcement** indicates organic discovery is occurring. Possible sources:

- npm browse/search (users looking for AI agent tools)
- GitHub Explore/recommendations
- Prior mentions in docs or discussions
- Direct repo visitors (team, investors)

This baseline is critical for measuring announcement impact:

- Post-announcement delta = (new visitors - 83) / time
- Attribution: any spike after Discord/Reddit/Dev.to posts is announcement-driven

---

## Dual Timeline Methodology (L290)

### Timeline 1: npm-live (T+0 = Feb 14 00:35 EST)

- **T+0:** Package published to npm
- **T+25h:** This snapshot (pre-announcement baseline)
- **T+48h:** First npm download stats available
- **Measures:** Organic discovery, npm ecosystem presence

### Timeline 2: announcement-wave (T+0 = TBD)

- **T+0:** Human posts Discord announcement (pending)
- **T+1h:** First wave traffic spike expected
- **T+24h:** Dev.to/Reddit follow-up
- **Measures:** Marketing effectiveness, channel performance

### Comparison Point

When announcement happens:

- **Organic rate:** 83 uniques / 25h ≈ 3.3 visitors/hour
- **Post-announcement rate:** TBD
- **Amplification factor:** (post-rate / organic-rate)

---

## Platform Health (T+25h)

| Metric             | Value    | Delta from C598      |
| ------------------ | -------- | -------------------- |
| Tests              | 1,238    | +18 (heat-retrieval) |
| CI Status          | 5+ green | Stable               |
| Coverage           | 87%+     | Maintained           |
| Open PRs           | 0        | Clean                |
| Consecutive Cycles | 187      | +9 since C598        |

---

## Research Observations

### O-001: Organic Discovery Validates npm Presence

83 unique visitors without promotion suggests npm's ecosystem (search, similar packages, etc.) is driving some discovery. This validates the decision to publish to npm vs. GitHub-only distribution.

### O-002: Announcement Delay Creates Clean Experiment

The C597 blocker (human-required announcement) accidentally created a natural experiment:

- **Control period:** T+0 to T+25h (organic only)
- **Treatment period:** Post-announcement (organic + promotion)
- This is cleaner than typical launches where organic and promoted traffic overlap.

### O-003: npm Download API Lag Confirmed

Per L283, npm download stats have 24-48h propagation delay. At T+25h, API still returns "package not found" for download queries. Stats will be available ~T+48h.

---

## Next Steps

1. **T+48h (Feb 16 ~12:35 EST):** Phase 2 metrics with npm downloads
2. **Post-announcement:** Phase 3 delta measurement (announcement impact)
3. **T+7d:** Weekly trend analysis for arXiv paper (#131)

---

## References

- L290: Dual timeline methodology (C598)
- L283: npm download API propagation delay
- C597: Announcement blocker analysis
- C598: T+22h announcement slip analysis

---

_🔬 Research — T+25h organic discovery is non-zero proof of npm ecosystem value._
