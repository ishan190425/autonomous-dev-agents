# 🔬 Launch Day Research Protocol (C528)

> Research observation framework for v1.0-alpha launch (Feb 14-17, 2026)
> Created: Cycle 528 | Role: 🔬 The Scout (Head of Research)

---

## Purpose

This protocol defines what Research observes and documents during and after v1.0-alpha launch. The goal is systematic data collection to feed into:

1. **Week 1 Categorization Report** (Feb 21)
2. **Pioneer/YC Demo Materials** (Feb 25 / Mar 1)
3. **arXiv Paper Empirical Section** (#131, target Mar 7)

---

## Day 1 Metrics Snapshot (Feb 14-17 → Feb 18)

### Primary Metrics (Capture within 24h of publish)

| Metric          | Source                     | Baseline (Pre-launch) | Day 1 Target |
| --------------- | -------------------------- | --------------------- | ------------ |
| npm downloads   | npmjs.com/package/@ada/cli | 0                     | 50+          |
| GitHub stars    | repo page                  | 0 (public launch)     | 50+          |
| GitHub forks    | repo page                  | 0                     | 5+           |
| GitHub watchers | repo page                  | 0                     | 10+          |
| Unique cloners  | Insights → Traffic         | internal only         | 25+          |
| Unique visitors | Insights → Traffic         | internal only         | 100+         |

### Secondary Metrics (Capture by Feb 18)

- **Discord joins:** New members in discord.gg/5NCHGJAz
- **Twitter/X engagement:** Likes, retweets, replies on announcement
- **Hacker News:** If posted, track points and comment count
- **Reddit:** r/opensource, r/programming engagement

---

## Day 1 Qualitative Observations

### Issue Categorization Framework

First external issues should be categorized:

| Category              | Priority | Example                               |
| --------------------- | -------- | ------------------------------------- |
| **Setup Blocker**     | P0       | "npm install fails on X"              |
| **UX Friction**       | P1       | "Confusing error message on ada init" |
| **Feature Request**   | P2       | "Would love integration with Y"       |
| **Documentation Gap** | P2       | "README doesn't explain Z"            |
| **Praise/Feedback**   | Info     | "This is cool because..."             |

### User Journey Observation

Track where users get stuck:

- `npm install` → success rate?
- `ada init` → completion rate?
- First dispatch cycle → does it work?
- Memory/rotation comprehension → do they understand the model?

### Competitive Positioning Data

Collect any comparisons users make:

- "How is this different from CrewAI/AutoGen/etc?"
- "Why not just use [alternative]?"
- Document for positioning refinement

---

## Week 1 Categorization Report (Feb 21)

Aggregate Day 1-7 data into:

1. **Adoption Funnel**
   - Awareness (visitors) → Install (npm) → Init (successful) → Active (dispatch cycles)

2. **Feedback Themes**
   - Top 3 praise points
   - Top 3 friction points
   - Top 3 feature requests

3. **Comparative Landscape**
   - How users position ADA vs alternatives
   - What we do better
   - What we're missing

4. **Research Implications**
   - Validated hypotheses (multi-agent dispatch works)
   - Invalidated assumptions (what we got wrong)
   - New research directions (what users want that doesn't exist)

---

## Data Collection Protocol

### GitHub Insights Cadence

| Time          | Action                |
| ------------- | --------------------- |
| T+0 (publish) | Screenshot baseline   |
| T+24h         | First metrics capture |
| T+48h         | Delta calculation     |
| T+72h         | Trend analysis        |
| T+7d          | Week 1 report         |

### Issue Triage (Research Perspective)

When new external issues arrive:

1. Tag with category label
2. Note in memory bank under "Day 1 Feedback"
3. Cross-reference with existing research issues (#90 benchmarks, #113 memory, etc.)

### Anomaly Detection

Watch for:

- Unexpected usage patterns (e.g., non-agent use cases)
- Platform-specific failures (Windows? ARM?)
- LLM provider issues (OpenRouter rate limits?)
- Scale edge cases (huge repos, many agents)

---

## Output Artifacts

| Artifact               | Due    | Location                                       |
| ---------------------- | ------ | ---------------------------------------------- |
| Day 1 Metrics Snapshot | Feb 18 | `docs/research/day1-metrics-snapshot.md`       |
| Week 1 Categorization  | Feb 21 | `docs/research/week1-categorization-report.md` |
| Paper Empirical Data   | Mar 7  | Feed into #131 arXiv draft                     |

---

## Research Standby → Active Transition

**Pre-launch (now):** Observation mode, protocol ready
**T+0 (npm publish):** Begin data collection
**T+24h:** First snapshot
**T+7d:** Week 1 synthesis

Research remains in support mode during launch execution — Ops triggers T-0, Growth handles announcements, Product triages feedback. Research observes and documents.

---

_🔬 The Scout | Cycle 528 | 107 consecutive (C421-528)_
