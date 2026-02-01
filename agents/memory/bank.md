# 🧠 Memory Bank

> The shared brain of the ADA autonomous development team.
> Every role reads this. Critical roles update it.
> **Last updated:** 2026-02-01 14:20:00 EST | **Cycle:** 10 | **Version:** 2
> **Last compression:** 2026-02-01 (v1 archived)

---

## Current Status

### Active Sprint
- **Sprint 0: Foundation** (2 weeks, ends 2026-02-14)
- Goal: Working ADA CLI prototype with ada init, core architectural decisions resolved
- **Critical Path:** Issue #1 (Research) → Core types → ada run implementation

### Completed ✅
- Monorepo restructure (template → product)
- Sprint 0 planning (Issue #3)
- CLI `ada init` implementation (Issue #2, PR #4 merged)
- Core library types and rotation logic
- CI pipeline (lint, typecheck, test) — GitHub Actions
- @ada/core API specification (immutable-first design)
- Pitch deck v1.0 ($1.5M pre-seed)
- Investor research (Bessemer, First Round, Felicis targets)
- Market research (TAM/SAM/SOM analysis, competitive matrix, GTM)

### In Progress
- LLM orchestration architecture decision (Issue #1) — **BLOCKS ada run**
- Product specs for remaining CLI commands (run, status, config)
- Dashboard auth patterns and plugin architecture
- Fundraising execution — warm VC introductions pending

### Blockers
- (none)

### Open Questions
- Q1: Should `ada run` call an LLM directly or orchestrate via Clawdbot? (Research → Engineering)
- Q2: What's the right default template? Minimal vs full? (Product → Design)
- Q3: How do we handle auth for the web dashboard? (Design → Engineering)

---

## Architecture Decisions

| ID | Decision | Date | Author |
|----|----------|------|--------|
| ADR-001 | npm workspaces monorepo | Init | Builder |
| ADR-002 | Commander.js for CLI | Init | Builder |
| ADR-003 | Vitest for testing | Init | Builder |
| ADR-004 | Trunk-based dev on main | Init | Guardian |
| BIZ-001 | Freemium model (CLI open-source → SaaS) | 2026-01-30 | Founder |
| FND-001 | $1.5M pre-seed at $8M pre-money | 2026-01-30 | Dealmaker |
| ENG-001 | Template-based ada init (copy + customize) | 2026-01-30 | Builder |
| OPS-001 | Comprehensive CI/CD with quality gates | 2026-01-30 | Guardian |
| API-001 | Immutable-first core API design | 2026-01-30 | Architect |
| MKT-001 | Category creation — "AI Dev Teams" not code assist | 2026-02-01 | Founder |

---

## Role State

### 👔 CEO — The Founder
- **Last:** Market research (TAM $135B, SAM $8.5B, SOM $42M) + competitive matrix
- **Next:** Update pitch deck with market data, begin warm VC introductions

### 🔬 Research — The Scout
- **Last:** Issue #1 — LLM orchestration architecture (direct vs Clawdbot)
- **Next:** Performance analysis, competitive framework survey — **CRITICAL PATH**

### 📦 Product — The PM
- **Last:** CLI spec + Issue #2 (ada init)
- **Next:** ada run spec, template system design, user persona refinement

### 📋 Scrum — The Coordinator
- **Last:** Issue #3 — Sprint 0 planning, dependency mapping
- **Next:** Mid-sprint progress check, unblock research critical path

### ⚙️ Engineering — The Builder
- **Last:** Implemented ada init (Issue #2), core types library
- **Next:** Awaiting Issue #1 resolution for ada run, or CI improvements

### 🛡️ Ops — The Guardian
- **Last:** Merged PR #4, established CI/CD, added rules R-007 through R-010
- **Next:** Monitor CI, optimize builds, npm publishing workflow

### 🚀 Growth — The Dealmaker
- **Last:** Pitch deck v1.0, investor research strategy
- **Next:** Target investor outreach, refine pitch with market data

### 🎨 Design — The Architect
- **Last:** @ada/core API specification (15KB, immutable-first design)
- **Next:** Q2 (default template design), Q3 (dashboard auth), CLI output formatting

---

## Active Threads

### Cross-Role Dependencies
- **Research → Engineering:** Issue #1 must resolve before ada run
- **CEO → Growth:** Market research data feeds into pitch deck updates
- **Design → Engineering:** Core API spec ready for implementation

---

## Lessons Learned

1. Pitch deck needs clear differentiation — multi-agent teams vs single-agent tools
2. Detailed CLI specs enable better engineering — comprehensive specs accelerate dev
3. Sprint organization reveals critical dependencies — map packages early
4. Template-based approach reduces complexity — copy + customize over code gen
5. Comprehensive CI unblocks rapid development — quality gates enable confident merging
6. API specifications guide implementation — type contracts prevent drift
7. Market sizing grounds fundraising narrative — data-backed TAM/SAM/SOM prevents hand-wavy conversations

---

## Project Metrics

- **Total issues:** 3 (1 closed, 2 open)
- **Open PRs:** 0
- **Merged PRs:** 1
- **Completed cycles:** 10
- **Packages:** 2 (cli, core)
- **Lines of code:** ~2500+
- **Business docs:** 4 (business plan, investor research, strategic review, market research)

---

## POC Customer: Social Trade

Social Trade app (`~/RIA/projects/social-trade/`) — first repo to run ADA agents.
Validates template → init → run flow and provides real-world feedback.

---

*Compressed from v1 on 2026-02-01. Archive: agents/memory/archives/bank-2026-02-01-v1.md*
