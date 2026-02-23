# 📦 Sprint 4 Feature Prioritization

> Post-MVP feature prioritization for Sprint 4 (Mar 15-28, 2026)
> **Author:** 📦 Product (The PM) | **Cycle:** 1117
> **Sprint 3 Ends:** Mar 14, 2026 | **Sprint 4 Starts:** Mar 15, 2026

---

## Executive Summary

Sprint 3 delivers the SaaS MVP (Auth, Billing, Managed Exec, API Gateway, Dashboard). Sprint 4 should focus on **stickiness and expansion** — features that keep users engaged and justify the Pro/Enterprise tiers.

**Recommendation:** Sprint 4 = Conditional Dispatch (#237) + Team Management (#174) + Playbook Marketplace MVP (#187)

This combination:

- **#237** — Reduces churn (users don't disable crons during blocks)
- **#174** — Unlocks Enterprise tier ($99/mo value)
- **#187** — Creates ecosystem/community moat

---

## Feature Scoring Matrix

Scoring: **Value** (user impact 1-5) × **Strategic Fit** (revenue/moat 1-5) ÷ **Effort** (weeks 1-5)

| Issue    | Feature                 | Value | Strategic | Effort | Score | Spec Ready?       |
| -------- | ----------------------- | ----- | --------- | ------ | ----- | ----------------- |
| **#237** | Conditional Dispatch    | 5     | 4         | 2      | 10.0  | ✅ C1097          |
| **#174** | Team Management         | 4     | 5         | 3      | 6.7   | ✅ C1127          |
| **#187** | Playbook Marketplace    | 4     | 5         | 4      | 5.0   | ✅ C1107          |
| **#172** | Auto Memory Compression | 4     | 3         | 3      | 4.0   | ✅ C1137          |
| **#173** | Heat-Weighted Search    | 3     | 3         | 2      | 4.5   | ✅ C1147          |
| **#176** | Custom Role Builder UI  | 3     | 4         | 4      | 3.0   | ❌ Needs spec     |
| **#177** | Performance Benchmarks  | 2     | 2         | 3      | 1.3   | ❌ QA territory   |
| **#179** | Interactive Examples    | 3     | 3         | 2      | 4.5   | ❌ Docs territory |

**Top 3 by Score:** #237 (10.0), #174 (6.7), #187 (5.0)

---

## Feature Deep Dives

### #237 — Conditional Dispatch (Score: 10.0) ⭐ TOP PRIORITY

**What:** Skip dispatch cycles until external condition met (issue closed, PR merged, label added)

**Why Sprint 4:**

- **Highest ROI feature:** 2 weeks effort, massive token savings, zero churn from "stuck" projects
- **Already spec'd:** C1097 provides complete implementation blueprint
- **Solves real problem:** PayFlow burned 5+ cycles in holding pattern waiting for #14 deploy
- **Differentiation:** No competing tool has intelligent cycle skipping

**Sprint 4 Target:**

- Week 1: Core infrastructure (skip-until.json, condition checkers)
- Week 2: CLI commands + GitHub conditions (issue_closed, pr_merged, label_added)

**Acceptance:** PayFlow-style projects auto-skip when blocked, auto-resume when unblocked.

---

### #174 — Team Management (Score: 6.7) ⭐ ENTERPRISE UNLOCK

**What:** Workspaces, user invitations, RBAC for multi-user teams

**Why Sprint 4:**

- **Unlocks Enterprise tier:** $99/mo requires multi-user features
- **Must-have for agencies:** Consultants managing multiple client repos need workspaces
- **Foundation for growth:** Users → Teams → Organizations → Enterprise

**Sprint 4 Target:**

- Week 1: Workspace creation + member invitations
- Week 2: RBAC (admin, member, viewer) + workspace settings UI

**Spec Complete:** Full feature spec created in C1127 (`docs/product/team-management-spec-c1127.md`). Includes RBAC model, database schema, API design, UI wireframes, and 2-week implementation plan.

**Acceptance:** Teams can share repos, control access, manage billing as a unit.

---

### #187 — Playbook Marketplace MVP (Score: 5.0) ⭐ COMMUNITY MOAT

**What:** Discover, install, and share community playbooks

**Why Sprint 4:**

- **Already spec'd:** C1107 has complete CLI design and schema
- **Creates moat:** Users who customize playbooks become sticky
- **Reduces onboarding friction:** New users get pre-built playbooks for their stack
- **Community signal:** Marketplace = ecosystem = credibility

**Sprint 4 Target:**

- Week 1: `ada marketplace list/search/install` (read-only from registry)
- Week 2: Basic publishing (`ada marketplace publish`)

**Phase 2 (Sprint 5+):** Ratings, private playbooks, versioning

**Acceptance:** User can run `ada marketplace install web-app-startup` and get a working playbook set.

---

## Sprint 4 Scope Recommendation

### Week 1 (Mar 15-21): Conditional Dispatch + Team Foundation

| Day     | Engineering                 | Product          | QA                |
| ------- | --------------------------- | ---------------- | ----------------- |
| Day 1-2 | #237 core (skip-until.json) | #174 full spec   | Test plan         |
| Day 3-4 | #237 conditions (GitHub)    | UX review        | Integration tests |
| Day 5   | #174 workspace scaffold     | Backlog grooming | E2E setup         |

### Week 2 (Mar 22-28): Team Completion + Marketplace MVP

| Day     | Engineering             | Product                | QA                |
| ------- | ----------------------- | ---------------------- | ----------------- |
| Day 1-2 | #174 invitations + RBAC | #187 registry planning | Workspace tests   |
| Day 3-4 | #187 install command    | Marketplace content    | Marketplace tests |
| Day 5   | Polish + docs           | Sprint 5 planning      | Release QA        |

**Deliverables:**

1. Conditional Dispatch fully working (#237 closed)
2. Team workspaces + invitations (#174 partial, MVP)
3. Marketplace read-only (#187 partial, install working)

---

## What's NOT in Sprint 4 (and Why)

### #172 — Auto Memory Compression (Deferred to Sprint 5)

**Reason:** Nice-to-have optimization. Current manual compression (R-002) works. Focus on user-facing features first.

### #173 — Heat-Weighted Search (Deferred to Sprint 5)

**Reason:** Improves memory system but doesn't unlock revenue or retention. Research needed first (#113 Cognitive Memory).

### #176 — Custom Role Builder UI (Deferred to Sprint 6)

**Reason:** Power user feature. Most users won't customize roles in first 30 days. Prerequisite: Team Management complete.

### #177 — Performance Benchmarks (Continuous)

**Reason:** QA responsibility. Should be ongoing, not sprint-scoped.

### #179 — Interactive Examples (Sprint 5)

**Reason:** Docs improvement. Valuable for onboarding but doesn't require sprint scope — can be added incrementally.

---

## Spec Readiness Checklist

Before Sprint 4 kickoff (Mar 15), ensure specs exist for:

- [x] **#237 Conditional Dispatch** — C1097 ✅
- [x] **#174 Team Management** — C1127 ✅ (completed 21 days early)
- [x] **#187 Playbook Marketplace** — C1107 ✅

**Status:** All top-3 Sprint 4 features fully spec'd. Ready for Sprint 4 kickoff.

---

## Success Metrics for Sprint 4

| Metric                    | Target                   | Measurement                     |
| ------------------------- | ------------------------ | ------------------------------- |
| Conditional skip adoption | 50%+ of blocked projects | Projects with active skip-until |
| Team creation rate        | 10+ workspaces           | New workspaces in first week    |
| Marketplace installs      | 50+ installs             | Install command usage           |
| Enterprise interest       | 5+ inquiries             | Inbound for $99 tier            |
| Retention (Day 7)         | +10pp vs baseline        | Users returning after 7 days    |

---

## Dependencies & Risks

### Dependencies

1. **Sprint 3 completion:** Auth + Billing must work for Team Management
2. **Registry hosting:** Marketplace needs a JSON registry (GitHub Pages MVP)
3. **GitHub API:** Conditional Dispatch relies on gh CLI integration

### Risks

| Risk                   | Likelihood | Impact | Mitigation                |
| ---------------------- | ---------- | ------ | ------------------------- |
| Sprint 3 spillover     | Medium     | High   | Cut Team Management scope |
| Marketplace complexity | Low        | Medium | MVP = read-only first     |
| GitHub rate limits     | Low        | Medium | Cache condition checks    |

---

## Timeline

```
Sprint 3 (current)                Sprint 4
├─ Mar 1-14: SaaS MVP             ├─ Mar 15-21: Week 1
│  Auth, Billing, Exec, API       │  #237 + #174 foundation
│  Dashboard MVP                  │
├─ Mar 10: Go/No-Go               ├─ Mar 22-28: Week 2
│  Spec #174 before this          │  #174 + #187 MVP
│                                 │
└─ Mar 14: Sprint 3 End           └─ Mar 28: Sprint 4 End
                                     └─ v1.1-beta target
```

---

## Related Issues

- **#237** — Conditional Dispatch (TOP PRIORITY)
- **#174** — Team Management (ENTERPRISE UNLOCK)
- **#187** — Playbook Marketplace (COMMUNITY MOAT)
- **#155** — SaaS Container (Sprint 3 prerequisite)

---

## Open Questions

1. **Marketplace registry hosting:** GitHub Pages vs dedicated backend?
   - **Recommendation:** GitHub Pages for MVP, migrate to API later

2. **Team billing model:** Per-seat vs flat rate per workspace?
   - **Recommendation:** Flat rate ($99/workspace) for simplicity

3. **Conditional Dispatch v2:** Should compound conditions be Sprint 4 or 5?
   - **Recommendation:** Sprint 5 — v1 single conditions are sufficient

---

_📦 Product (The PM) | Cycle 1117 | Feb 22, 2026_
