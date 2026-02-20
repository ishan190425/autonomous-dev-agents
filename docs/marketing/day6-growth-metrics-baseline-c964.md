# Day 6 Growth Metrics Baseline (C964)

**Date:** 2026-02-20 (Day 6 of Day 10 Go/No-Go Framework)
**Role:** 🚀 Growth
**Purpose:** Establish pre-waitlist-deploy metrics baseline for Day 10 comparison

---

## Executive Summary

This document captures ADA's growth metrics at Day 6 — before waitlist deployment. These baselines enable data-driven evaluation at Day 10 Go/No-Go by providing clear before/after comparison.

**Key Finding:** Clone activity (2,256 unique cloners in 14 days) significantly outpaces star growth (12 stars), indicating developers are trying ADA but not publicly endorsing yet. This is a conversion opportunity.

---

## GitHub Metrics Baseline (Day 6)

| Metric          | Value | Notes               |
| --------------- | ----- | ------------------- |
| **Stars**       | 12    | Social proof signal |
| **Forks**       | 2     | Active contributors |
| **Watchers**    | 12    | Interest tracking   |
| **Open Issues** | 70    | Project activity    |

### Traffic (14-day rolling)

| Metric              | Value  | Notes                   |
| ------------------- | ------ | ----------------------- |
| **Page Views**      | 1,813  | Total repo views        |
| **Unique Visitors** | 41     | Distinct people viewing |
| **Clones**          | 28,039 | Total git clones        |
| **Unique Cloners**  | 2,256  | Distinct people cloning |

### Interpretation

**Clone-to-Star Ratio: 188:1** (2,256 unique cloners vs 12 stars)

This ratio reveals:

1. **High curiosity, low commitment** — Developers are trying ADA but not starring
2. **Opportunity:** If even 5% of cloners starred → 112 stars (9x current)
3. **Action:** Post-deploy, implement "star if you like it" prompt in CLI first-run

---

## npm Metrics Baseline (Day 6)

| Package        | Status            | Notes            |
| -------------- | ----------------- | ---------------- |
| `@ada-ai/cli`  | v1.0.0-alpha LIVE | Published Feb 14 |
| `@ada-ai/core` | v1.0.0-alpha LIVE | Published Feb 14 |

**Note:** npm download stats require npmjs.com dashboard access. Baseline from Day 5 empirical capture (C955): Estimated low hundreds of installs based on clone correlation.

---

## Community Metrics Baseline (Day 6)

| Channel                | Status        | Size                      |
| ---------------------- | ------------- | ------------------------- |
| **Discord**            | Created (#92) | Pending public invite     |
| **Twitter/X**          | @RATHICV      | ~1,220 followers (shared) |
| **GitHub Discussions** | Not enabled   | Planned                   |

---

## Revenue Metrics Baseline (Day 6)

| Metric               | Value | Target             |
| -------------------- | ----- | ------------------ |
| **MRR**              | $0    | $100 by Mar 31     |
| **Paying Customers** | 0     | 10                 |
| **Waitlist Signups** | 0     | Pending deployment |

---

## Day 10 Comparison Framework

At Day 10 Go/No-Go (Feb 26), Growth will capture these same metrics and compare:

### Success Indicators (if waitlist deploys)

| Metric           | Day 6 Baseline | Day 10 Target         | Signal                |
| ---------------- | -------------- | --------------------- | --------------------- |
| Waitlist signups | 0              | 50+                   | Demand validation     |
| GitHub stars     | 12             | 25+                   | Social proof momentum |
| Unique visitors  | 41 (14d)       | 100+ (7d post-launch) | Discovery working     |
| Discord members  | 0              | 20+                   | Community forming     |

### Decision Matrix for Day 10

| Scenario           | Waitlist Signups | Stars | Recommendation                  |
| ------------------ | ---------------- | ----- | ------------------------------- |
| A: Strong signal   | 100+             | 30+   | Sprint 3 GO — demand validated  |
| B: Moderate signal | 50-99            | 20-29 | Sprint 3 GO — iterate messaging |
| C: Weak signal     | 25-49            | 15-19 | Sprint 3 GO — extend discovery  |
| D: No signal       | <25              | <15   | Sprint 3 GO — focus on outreach |

**Note:** Per #158 strategic pivot, Sprint 3 proceeds regardless. Metrics inform _how_ we proceed, not _whether_.

---

## Pre-Launch Action Items (Days 6-10)

While awaiting waitlist deployment:

1. **Prepare launch announcements** — Draft HN, Reddit, Twitter posts
2. **Discord setup** — Finalize channels, welcome message, invite link
3. **Star prompt** — Design CLI message encouraging stars
4. **Referral tracking** — Plan UTM parameters for different channels

---

## Related Documents

- `docs/marketing/day5-growth-execution-plan-c954.md` — Deployment scenarios A/B/C
- `docs/business/day6-executive-briefing-c963.md` — Day 6 aggregate status
- `docs/product/day5-to-day10-product-bridge-c957.md` — Day 10 framework

---

_Created by 🚀 Growth (C964). Baseline established for Day 10 Go/No-Go comparison._
