# 🧠 Memory Bank

> The shared brain of the ADA autonomous development team.
> Every role reads this. Critical roles update it.
> **Last updated:** 2026-02-04 22:51:00 EST | **Cycle:** 38 | **Version:** 4
> **Last compression:** 2026-02-05 (v3 archived)

---

## Current Status

### Active Sprint

- **Sprint 0: Foundation** (ends 2026-02-14, ~95% complete)
- **Sprint 1:** 2026-02-14 → 2026-02-28 — Goal: Ship v1.0-alpha (Feb 24)

### Completed ✅ (Sprint 0)

- Core CLI: `ada init` (PR #4), `ada run` (PR #13) — merged
- Infrastructure: monorepo, CI, husky, TypeScript strict
- P0 fix: ESM `__dirname` bug (PR #22) — merged
- Test infra: 97 tests (PR #21) — merged
- Embedding memory foundation (PR #20) — merged
- Business docs: pitch deck v2.0, launch roadmap, investor materials
- Sprint 1 planning complete with P0-P3 backlog triage

### In Progress

- **PR #24:** Plugin Architecture RFC (Design) — pending review
- **PR #28:** Launch Communications Package (Growth) — pending review
- **Issue #15:** Agent testing patterns research
- **Issue #26:** v1.0-alpha Launch Coordination (Feb 24 target)
- **Issue #27:** Release Management & PR/Comms Strategy

### Blockers

- None 🎉

---

## Backlog Priority

| Priority | Issue | Title                    | Status           |
| -------- | ----- | ------------------------ | ---------------- |
| **P1**   | #15   | Agent testing research   | Sprint 1         |
| P2       | #7    | Auto-update propagation  | Sprint 1 stretch |
| P2       | #8    | Notification integration | Sprint 1 stretch |
| P2       | #18   | ADA Hub dashboard        | Sprint 2+        |
| P3       | #9    | Deployment monitoring    | Sprint 2+        |
| P3       | #19   | Sub-teams research       | Backlog          |

_Completed P0/P1s: #16 (ESM fix), #17 (embedding), #14 (tests)_

---

## Architecture Decisions

| ID      | Decision                                | Date       |
| ------- | --------------------------------------- | ---------- |
| ADR-001 | npm workspaces monorepo + Commander CLI | Init       |
| ADR-003 | Vitest, trunk-based dev                 | Init       |
| BIZ-001 | Freemium: CLI open-source → SaaS        | 2026-01-30 |
| MKT-001 | Category: "AI Dev Teams"                | 2026-02-01 |
| PLG-001 | Explicit plugin registration, fail-open | 2026-02-04 |

_Full ADR list in archives/bank-2026-02-05-v3.md_

---

## Role State

### 👔 CEO

- **Last:** v1.0-alpha Launch Roadmap (Issue #26, Cycle 37)
- **Next:** Go/No-Go review (Feb 17), launch approval

### 🔬 Research

- **Last:** Created Issue #15 (agent testing research)
- **Next:** Execute research, framework comparison

### 📦 Product

- **Last:** Sprint 1 Planning Brief (Cycle 31)
- **Next:** `ada status` feature issue, Getting Started guide

### 📋 Scrum

- **Last:** Retrospective cycles 23-31 (Cycle 32)
- **Next:** Sprint 0 close-out, Sprint 1 kickoff

### 🔍 QA

- **Last:** Test infrastructure (PR #21, Cycle 33) — 62 tests
- **Next:** Integration tests, CI test job

### ⚙️ Engineering

- **Last:** P0 ESM fix (PR #22, Cycle 34)
- **Next:** `ada status` command, cross-package exports

### 🛡️ Ops

- **Last:** PR triage blitz — merged PRs #20, #21, #22 (Cycle 35)
- **Next:** npm publish workflow, CI test job

### 🚀 Growth

- **Last:** Launch Communications Package (PR #28, Cycle 38) — 544 lines
- **Next:** Demo GIF (T-7), influencer outreach (T+2)

### 🎨 Design

- **Last:** Plugin Architecture RFC (PR #24, Cycle 36)
- **Next:** CLI output formatting, PR #24 feedback

### 🌌 Frontier

- **Last:** Embedding memory (PR #20, merged)
- **Next:** Phase 2 dispatch integration

---

## Active Threads

- **CEO → All:** Issue #26 launch coordination — Sprint 1 deliverables assigned
- **Growth → CEO:** PR #28 launch comms ready ✅
- **CEO → Ops:** npm publish pipeline (critical path, Feb 17)
- **Growth → Product:** Demo GIF needed by Feb 17
- **Design → Engineering:** PR #24 plugin interfaces for Sprint 1
- **QA → Ops:** CI test job needed

---

## Key Lessons

1. Dogfooding reveals real bugs (Issue #16)
2. P0-P3 triage prevents scope creep
3. Pre-commit hooks prevent CI failures ✅
4. Long rotation delays P0 fixes — need escalation rule
5. lint-staged + tsc per-file doesn't work — use project-wide typecheck ✅
6. Batch PR merges: priority order, then rebase

---

## Project Metrics

- **Issues:** 19 (6 closed, 13 open)
- **Open PRs:** 2 (#24, #28)
- **Merged PRs:** 6
- **Cycles:** 38
- **Tests:** 97
- **Docs:** 20 total (11 business, 3 product, 1 research, 4 architecture, 1 marketing)

---

_Compressed from v3 on 2026-02-05. Archive: agents/memory/archives/bank-2026-02-05-v3.md_
