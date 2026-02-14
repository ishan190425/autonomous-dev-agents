# Day 1 Observation Protocol — Research Framework

> **Created:** Cycle 558 (Feb 14, 2026 21:48 EST)
> **Author:** 🔬 The Scout (Head of Research)
> **Status:** READY — Awaiting npm fix (#139) to begin data collection

---

## Purpose

Define the complete observation framework for ADA's v1.0.0-alpha launch. This protocol ensures we capture all relevant data systematically across the launch window.

**Why this doc exists:** Per L271, blockers are preparation windows. npm publish is blocked (#139 P0), but observation framework should be ready for instant execution when unblocked.

---

## Launch Event Timeline

| Milestone | Time              | Status            | Key Observations                                |
| --------- | ----------------- | ----------------- | ----------------------------------------------- |
| T+0       | Feb 14, 01:32 EST | ✅ EXECUTED       | Git tag + GitHub Release created                |
| T+0 npm   | Pending           | ❌ BLOCKED (#139) | npm publish failed, awaiting NPM_TOKEN fix      |
| T+1h      | T+0 npm + 1h      | ⏳ PENDING        | Initial installs, Discord activity              |
| T+4h      | T+0 npm + 4h      | ⏳ PENDING        | First GitHub issues from users, social mentions |
| T+24h     | T+0 npm + 24h     | ⏳ PENDING        | Day 1 Snapshot — comprehensive metrics          |
| T+7d      | T+0 npm + 7d      | ⏳ PENDING        | Week 1 Report — trend analysis                  |

---

## Observation Channels

### 1. npm Registry Metrics

**Source:** `https://www.npmjs.com/package/@ada/cli`

| Metric           | Collection Method            | Frequency               |
| ---------------- | ---------------------------- | ----------------------- |
| Total downloads  | npm API / web scrape         | T+1h, T+4h, T+24h, T+7d |
| Download trend   | npm-stat.com or similar      | Daily                   |
| Version adoption | `npm view @ada/cli versions` | Per-release             |

**Verification command:**

```bash
npm view @ada/cli version  # Should return 1.0.0-alpha when fixed
npm view @ada/cli          # Full package info
```

### 2. GitHub Metrics

**Source:** `gh` CLI + GitHub API

| Metric           | Collection Method                                   | Frequency         |
| ---------------- | --------------------------------------------------- | ----------------- |
| Stars            | `gh api repos/:owner/:repo -q .stargazers_count`    | T+1h, T+4h, T+24h |
| Forks            | `gh api repos/:owner/:repo -q .forks_count`         | Daily             |
| Issues opened    | `gh issue list --state all --json number,createdAt` | Per-cycle         |
| Issue labels     | Track `bug` vs `enhancement` vs `question`          | Per-cycle         |
| Traffic (clones) | `gh api repos/:owner/:repo/traffic/clones`          | Daily             |
| Traffic (views)  | `gh api repos/:owner/:repo/traffic/views`           | Daily             |

**Key indicators:**

- Issues from external users (not agent-generated) = real adoption signal
- `bug` issues = installation/onboarding friction
- `enhancement` requests = users engaged enough to want more

### 3. Discord Metrics

**Source:** `discord.gg/5NCHGJAz`

| Metric          | Collection Method                 | Frequency         |
| --------------- | --------------------------------- | ----------------- |
| Member count    | Manual observation / bot          | T+1h, T+4h, T+24h |
| Messages        | Channel activity                  | Daily             |
| Feedback themes | Qualitative — categorize by topic | Per-message       |

### 4. Social Metrics

**Source:** Twitter/X (@RATHICV), Reddit, Dev.to, LinkedIn

| Metric              | Collection Method                          | Frequency   |
| ------------------- | ------------------------------------------ | ----------- |
| Mentions            | Search `ADA CLI` / `autonomous-dev-agents` | T+4h, T+24h |
| Dev.to views        | Post analytics (post-announcement)         | Daily       |
| Reddit upvotes      | Post in r/programming, r/MachineLearning   | T+24h       |
| LinkedIn engagement | Post analytics (post-announcement)         | Daily       |

---

## Capture Checklist

### Pre-Unblock (Current State)

- [x] GitHub Release exists: https://github.com/ishan190425/autonomous-dev-agents/releases/tag/v1.0.0-alpha
- [x] Git tag pushed: v1.0.0-alpha
- [x] Announcement kit ready: `docs/marketing/launch-announcement-kit-c557.md`
- [x] Observation protocol ready (this document)
- [ ] npm packages published (#139 blocker)

### T+0 npm (When Fixed)

- [ ] Verify `npm view @ada/cli version` returns `1.0.0-alpha`
- [ ] Verify `npm view @ada/core version` returns `1.0.0-alpha`
- [ ] Test `npm install -g @ada/cli` works globally
- [ ] Record timestamp of successful publish
- [ ] Update #139 as resolved

### T+1h (First Hour Post-Fix)

- [ ] Record npm download count (baseline)
- [ ] Record GitHub stars (baseline)
- [ ] Check Discord for new members/activity
- [ ] Monitor GitHub for new issues

### T+4h (Early Adoption Window)

- [ ] Record npm downloads (delta from T+1h)
- [ ] Record GitHub stars (delta)
- [ ] Check for external GitHub issues
- [ ] Monitor social channels for mentions
- [ ] Note any `bug` issues = friction points

### T+24h (Day 1 Snapshot)

- [ ] Compile all metrics into `docs/research/day1-snapshot.md`
- [ ] Categorize issues by type and source
- [ ] Calculate adoption metrics:
  - Downloads per hour (avg)
  - Stars per hour (avg)
  - Issue rate (issues per 100 downloads)
  - Bug rate (bugs per 100 downloads)
- [ ] Identify top 3 friction points
- [ ] Recommend Sprint 2 adjustments based on data

### T+7d (Week 1 Report)

- [ ] Compile `docs/research/week1-report.md`
- [ ] Download trend analysis
- [ ] Community growth (Discord members, GitHub contributors)
- [ ] Issue resolution rate
- [ ] Feature request themes → Sprint 2/3 backlog input
- [ ] Comparison to baseline expectations

---

## Baseline Expectations (Hypothesis)

For a first-time alpha release with minimal marketing:

| Metric          | T+24h Expectation | T+7d Expectation |
| --------------- | ----------------- | ---------------- |
| npm downloads   | 10-50             | 50-200           |
| GitHub stars    | +5-15             | +20-50           |
| GitHub issues   | 0-5               | 5-15             |
| Discord members | +3-10             | +10-30           |

**Why conservative:** No Product Hunt, no Hacker News, no major influencer push. Just Dev.to + Reddit + organic. These numbers are success criteria for "alpha works and people can install it."

---

## Failure Modes to Monitor

1. **Install failures** — `npm install -g @ada/cli` doesn't work → P0 bug
2. **First-run crashes** — `ada init` fails → P0 bug
3. **Permissions issues** — Requires unexpected sudo/admin → UX friction
4. **Node version conflicts** — Requires specific Node version → document requirements
5. **Platform issues** — Works on macOS but not Linux/Windows → scope issue

---

## Data Storage

All observation data stored in:

- `docs/research/day1-snapshot.md` — T+24h compilation
- `docs/research/week1-report.md` — T+7d compilation
- Memory bank → Project Metrics section (key numbers)

---

## Accountability

| Role        | Responsibility                              |
| ----------- | ------------------------------------------- |
| Research    | Own observation protocol, compile reports   |
| QA          | Verify installation works, track bug issues |
| Product     | Triage feedback, update Sprint 2 backlog    |
| Growth      | Execute announcements, track social metrics |
| Engineering | Fix P0/P1 bugs within 24h                   |
| Ops         | Fix npm (#139), monitor CI/CD               |

---

## Next Steps

1. **Immediate:** Monitor #139 for resolution
2. **On unblock:** Execute T+0 npm checklist, start T+1h timer
3. **Feb 15:** Day 1 Snapshot (if npm fixed by then)
4. **Feb 21:** Week 1 Report

---

_This protocol follows L271: blockers are preparation windows. Research is ready to capture data the moment npm is live._
