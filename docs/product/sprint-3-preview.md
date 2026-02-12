# Sprint 3 Preview — Post-Sprint-2 Roadmap

> **Author:** 📦 Product Lead  
> **Created:** Cycle 420 (2026-02-11)  
> **Sprint 3 (Proposed):** 2026-03-14 → 2026-03-28  
> **References:** Sprint 2 Planning (C360), Backlog Analysis (50 open issues)

---

## Executive Summary

Sprint 3 builds on the **v1.0-alpha foundation** (Sprint 1) and **Terminal Mode + Heat Scoring infrastructure** (Sprint 2) to deliver **external-facing capabilities** that transform ADA from an internal tool into a platform.

**Sprint 3 Theme:** "Platform & Community"

---

## What We'll Have After Sprint 2 (Mar 14)

By Sprint 3 kickoff, ADA will have:

| Capability                                | Status        | Source   |
| ----------------------------------------- | ------------- | -------- |
| Core agent dispatch                       | ✅ v1.0-alpha | Sprint 1 |
| Memory bank system                        | ✅ v1.0-alpha | Sprint 1 |
| CLI (init, run, status, dispatch, config) | ✅ v1.0-alpha | Sprint 1 |
| Observability (insights, observe)         | ✅ v1.0-alpha | Sprint 1 |
| Terminal Mode (shell capture)             | 🔜 Sprint 2   | #125     |
| Heat Scoring (file importance)            | 🔜 Sprint 2   | #118     |
| Token metrics & estimation                | 🔜 Sprint 2   | #83      |

**What's missing for platform adoption:**

1. **Dashboard** — No web UI, CLI-only experience
2. **Notifications** — No proactive alerts to developers
3. **Community** — Discord exists (#92) but no integration
4. **External Validation** — No demo repo, no external users
5. **PR Workflow** — Agents commit directly, no review process

---

## Sprint 3 Proposed Features

### Tier 1: Platform Foundation (P1)

#### 1. Demo Repository (#41)

**Why:** External validation is critical for accelerators and adoption. Real users running ADA on their repos proves the system works outside our codebase.

**Scope:**

- Create public demo repo with ADA pre-configured
- Document step-by-step: "Run ADA on your project in 5 minutes"
- Include example playbooks for common project types
- Track external usage and feedback

**Size:** M (3-5 cycles) | **Owner:** Product + Growth

---

#### 2. PR Workflow (#128)

**Why:** Direct commits to main is acceptable for internal dogfooding but blocks adoption. Teams want code review before agent changes land.

**Scope:**

- `ada dispatch complete --pr` creates PR instead of committing
- PR includes: action description, files changed, related issues
- Follow-up: configurable merge strategy (auto-merge if CI passes, or wait for review)

**Size:** M (3-5 cycles) | **Owner:** Ops + Engineering

---

#### 3. Notification System (#8)

**Why:** Developers shouldn't have to check ADA constantly. Proactive notifications for important events (blocked, decision needed, milestone reached).

**Scope:**

- `ada config notifications --slack=WEBHOOK_URL`
- Notify on: cycle complete, blocker detected, high-priority issue created
- Channels: Slack webhook (MVP), Discord (#92) and Telegram later

**Size:** L (6+ cycles) | **Owner:** Engineering

---

### Tier 2: User Experience (P2)

#### 4. CLI UX Polish (#73)

**Why:** Design audit (C415) scored 8.7/10 with P3 polish items identified. Small improvements compound into a professional feel.

**Scope:**

- Command suggestions on typos (`ada statu` → "Did you mean `ada status`?")
- Empty state handling for `ada observe` and similar
- `--json` output for all commands (scripting support)
- Quiet mode (`-q`) for CI/CD pipelines

**Size:** M (3-5 cycles) | **Owner:** Design + Engineering

---

#### 5. Agent Dashboard MVP (#18, #120)

**Why:** Visual understanding of agent activity is transformative for debugging and trust-building.

**Scope:**

- Web dashboard: real-time cycle view, memory bank browser, role visualization
- Hosted at `localhost:4200` during `ada run`
- Mobile-responsive (for checking on phone)
- Phase 1: Read-only view of agent state

**Size:** L (6+ cycles) | **Owner:** Design + Engineering

---

### Tier 3: Research & Intelligence (P2)

#### 6. Improved Memory System (#91)

**Why:** Current memory bank requires manual compression. Smarter memory could auto-prioritize and surface relevant context.

**Scope:**

- Semantic search: `ada memory search "blockers"` finds relevant entries
- Auto-compression: triggers based on relevance decay, not just line count
- Context window optimization: only load memory relevant to current action

**Size:** L (6+ cycles) | **Owner:** Research + Engineering

---

#### 7. Benchmark Execution (#90)

**Why:** Research paper needs empirical validation. Running standardized benchmarks proves ADA's effectiveness.

**Scope:**

- Execute benchmarks per `docs/research/benchmark-execution-protocol.md`
- Capture metrics: cycle efficiency, action success rate, code quality
- Document results for arXiv paper (#131) due Mar 7

**Size:** M (3-5 cycles) | **Owner:** Research + QA

---

## Backlog Triage for Sprint 3

### Include (P1-P2, actionable)

| Issue | Feature         | Why Sprint 3                                   |
| ----- | --------------- | ---------------------------------------------- |
| #41   | Demo Repository | External validation essential for accelerators |
| #128  | PR Workflow     | Adoption blocker — teams need code review      |
| #8    | Notifications   | Proactive UX, reduces monitoring burden        |
| #73   | CLI Polish      | Quick wins, compounds into polish              |
| #90   | Benchmarks      | Paper deadline Mar 7                           |
| #91   | Memory System   | Core intelligence improvement                  |

### Defer (P2-P3, dependencies or scale)

| Issue | Feature                 | Why Defer                      |
| ----- | ----------------------- | ------------------------------ |
| #18   | Dashboard               | Large scope, consider Sprint 4 |
| #120  | Agent Visualizations    | Depends on #18                 |
| #9    | Deployment Integration  | Scale feature, post-v1.0       |
| #25   | TUI Dashboard           | CLI polish sufficient for now  |
| #64   | Claude Code Integration | Research blocker, not Sprint 3 |

### Close Candidates (stale or superseded)

| Issue | Feature            | Recommendation                                           |
| ----- | ------------------ | -------------------------------------------------------- |
| #29   | Branch Maintenance | Superseded by trunk-based development + #128 PR workflow |
| #59   | Agent Briefings    | Superseded by memory bank and potential #8 notifications |

---

## Sprint 3 Schedule (Proposed)

### Week 1 (Mar 14 – Mar 21): External Readiness

| Story                                | Feature | Owner              | Priority |
| ------------------------------------ | ------- | ------------------ | -------- |
| Demo repo setup                      | #41     | Product/Growth     | P1       |
| PR workflow MVP                      | #128    | Ops/Engineering    | P1       |
| CLI polish (suggestions, quiet mode) | #73     | Design/Engineering | P2       |

### Week 2 (Mar 21 – Mar 28): Integration & Intelligence

| Story                      | Feature | Owner                | Priority |
| -------------------------- | ------- | -------------------- | -------- |
| Slack notifications        | #8      | Engineering          | P1       |
| Benchmark execution        | #90     | Research/QA          | P1       |
| Memory search improvements | #91     | Research/Engineering | P2       |

---

## Success Metrics (Sprint 3)

| Metric                       | Target | Measurement                      |
| ---------------------------- | ------ | -------------------------------- |
| External demo users          | 5+     | Demo repo stars/forks            |
| PRs created by agents        | 10+    | GitHub PR count with agent label |
| Notification deliveries      | 50+    | Slack webhook hits               |
| Benchmark results documented | All    | Paper appendix complete          |
| CLI polish items resolved    | 4/4    | P3 items from C415 closed        |

---

## Dependencies on Sprint 2

Sprint 3 assumes Sprint 2 delivers:

- [x] Terminal Mode operational (US-125-1 through US-125-4)
- [x] Heat Scoring visible in dispatch (US-118-3)
- [x] Metrics tracking working (US-83-2, US-83-3)

If Sprint 2 items slip, Sprint 3 priorities may adjust.

---

## Accelerator Alignment

### Pioneer (Feb 25)

- Demo repo (#41) accelerated to pre-launch if possible
- Sprint 3 roadmap shows platform ambition

### YC (Mar 1)

- Same as Pioneer plus early Sprint 2 progress
- Benchmark results (#90) support "we measure what matters" narrative

### arXiv Paper (Mar 7)

- Benchmark execution (#90) must complete Week 1 of Sprint 3
- Memory system improvements (#91) inform Discussion section

---

## Open Questions for Sprint 3 Planning

1. **Dashboard scope:** Full web app (#18) or embedded terminal dashboard (#25)?
2. **Notification channels:** Slack-first or multi-channel from day 1?
3. **Memory improvements:** Semantic search or auto-compression priority?
4. **Demo repo hosting:** ADA org repo or separate showcase repo?

These should be resolved by Sprint 2 retro (C~430).

---

_📦 Product Lead — Cycle 420_
