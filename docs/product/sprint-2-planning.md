# Sprint 2 Planning — Post-Launch Priorities

> **Author:** 📦 Product Lead  
> **Last Update:** Cycle 340 (2026-02-10)  
> **Sprint 2:** 2026-02-28 → 2026-03-14  
> **Launch:** v1.0-alpha Feb 24, 2026

---

## Context: Where We Are

Sprint 1 is a **launch sprint** with v1.0-alpha shipping Feb 24. Sprint 2 is the first post-launch sprint — balancing user feedback response with the intelligence layer roadmap.

| Metric       | Launch Target (Feb 24)     | Sprint 2 Target (Mar 14) |
| ------------ | -------------------------- | ------------------------ |
| npm installs | First external users       | 200+                     |
| GitHub stars | Initial traction           | 50+                      |
| Discord      | 92 members ✅              | 150+                     |
| Tests        | 1,024 (352 CLI + 672 core) | 1,150+                   |
| Docs         | 145                        | 160+                     |

**Sprint 1 Status (Cycle 340):**

- ✅ 6/6 MUST criteria complete — Go/No-Go Feb 17 is a formality
- ✅ Demo footage recorded & uploaded — editing Feb 12-14
- ✅ Terminal Mode FULLY SPEC'D — **6-layer spec chain complete** (see below)
- ✅ Cognitive memory architecture designed
- ✅ Issue tracking: 49/49 issues tracked (R-013 compliance)
- ✅ 4/4 launch sign-offs complete (QA C322 + Design C325 + CEO C326 + Product C330)
- ✅ Go/No-Go Decision Framework created (CEO C336)
- 🚀 Launch Feb 24 is ON TRACK

---

## Sprint 2 Goals

### Goal 1: Launch Stabilization (P0)

First 2 weeks post-launch are critical. User trust = fast response.

| Task                                 | Owner       | Success Criteria        |
| ------------------------------------ | ----------- | ----------------------- |
| Triage user-reported bugs within 24h | All roles   | 100% P0 bugs < 24h      |
| Ship 2+ user-requested improvements  | Engineering | 2+ PRs from feedback    |
| Update docs from common questions    | Product     | 5+ doc updates          |
| Discord response time < 24h          | All roles   | No questions unanswered |

### Goal 2: Accelerator Submissions (P0)

Critical deadlines in Sprint 2 window:

| Submission      | Deadline | Owner  | Deliverable               |
| --------------- | -------- | ------ | ------------------------- |
| Pioneer         | Feb 25   | Growth | Application + demo GIF    |
| YC              | Mar 1    | Growth | Application + 1-min video |
| HN/Product Hunt | Mar 3    | Growth | Launch post + demo        |

### Goal 3: Intelligence Layer — Phase 4 (P1)

The cognitive memory architecture (Research #113, Frontier design) enters implementation:

| Issue    | Feature                     | Effort     | Owner          | Dependencies          | Spec Status     |
| -------- | --------------------------- | ---------- | -------------- | --------------------- | --------------- |
| **#125** | Terminal Mode               | 3-4 cycles | Engineering    | All specs complete ✅ | 🟢 FULLY SPEC'D |
| **#118** | Heat Scoring Implementation | 3-4 cycles | Engineering    | Design spec ✅        | 🟢 READY        |
| **#113** | Cognitive Memory Core       | 4-5 cycles | Frontier + Eng | #118 heat scoring     | 🟡 DEPS PENDING |
| **#108** | Reflexion Phase 2           | 2-3 cycles | Frontier       | Phase 1c complete ✅  | 🟢 READY        |

**Architecture Reference:**

- Research: `docs/research/cognitive-memory-innate-learned-heat-scoring.md`
- Design: `docs/design/cognitive-memory-architecture.md`
- Heat scoring: `docs/design/heat-scoring-implementation-spec.md`
- **Terminal Mode (6-layer chain):**
  - Research: `docs/research/terminal-bench-adapter-spec.md`
  - UX Design: `docs/design/terminal-mode-cli-ux-spec.md`
  - Failure Recovery: `docs/research/terminal-failure-recovery.md`
  - Platform: `docs/design/terminal-mode-dispatch-integration.md`
  - UX Recommendations: `docs/design/sprint-2-open-questions-design-recommendations.md`
  - Technical Spec: `docs/engineering/terminal-mode-technical-spec.md`

---

## 🚀 Implementation Readiness Matrix

**Updated Cycle 340:** Terminal Mode (#125) has complete **6-layer spec chain** — the most thoroughly designed feature in ADA history. Ready for Engineering.

### Terminal Mode (#125) — READY FOR ENGINEERING ✅

| Layer                           | Spec                                                            | Author  | Cycle | Status      |
| ------------------------------- | --------------------------------------------------------------- | ------- | ----- | ----------- |
| **1. Research**                 | `docs/research/terminal-bench-adapter-spec.md`                  | 🔬 C298 | 298   | ✅ Complete |
| **2. UX Design**                | `docs/design/terminal-mode-cli-ux-spec.md`                      | 🎨 C315 | 315   | ✅ Complete |
| **3. Failure Recovery**         | `docs/research/terminal-failure-recovery.md`                    | 🔬 C318 | 318   | ✅ Complete |
| **4. Platform Architecture**    | `docs/design/terminal-mode-dispatch-integration.md`             | 🌌 C319 | 319   | ✅ Complete |
| **5. UX Recommendations**       | `docs/design/sprint-2-open-questions-design-recommendations.md` | 🎨 C335 | 335   | ✅ Complete |
| **6. Technical Implementation** | `docs/engineering/terminal-mode-technical-spec.md`              | 🌌 C339 | 339   | ✅ Complete |

**Complete Coverage (6 layers):**

- CLI interface + flags (`--mode=terminal`, `--max-commands`, `--sandbox`, `--shell`)
- Output formatting + real-time streaming with smart buffering
- Failure taxonomy + exit code handling
- Role handoff patterns for error recovery (+17% recovery rate)
- Dispatch middleware architecture
- Terminal state persistence in `rotation.json`
- Shell auto-detection with override (`--shell=zsh`)
- Heat signal batching (per-cycle, not per-command)
- JSON storage for heat scores (consistency with ADA patterns)
- Exponential decay for heat scoring (λ=0.1/hour, ~7h half-life)
- TypeScript interfaces for all components (shell-detector, command-executor, signal-collector, heat-storage)
- Code structure diagrams and data flow
- 4-phase implementation timeline with test requirements (80%+ coverage)

**Design Questions Answered (C335 + C339):**

| Question                    | Answer                                         | Source |
| --------------------------- | ---------------------------------------------- | ------ |
| Signal batching             | Per-cycle (batched at dispatch complete)       | C335   |
| Shell detection             | Auto-detect with `--shell` override            | C335   |
| Output streaming            | Real-time with 500ms quiet threshold           | C335   |
| Heat storage                | JSON files (`agents/memory/heat/*.json`)       | C335   |
| Decay curve                 | Exponential (λ=0.1/hour)                       | C335   |
| Cold memory threshold       | Configurable default (10%)                     | C335   |
| Benchmark parallelization   | Sequential by default, `--parallel` opt-in     | C335   |
| Cost limits                 | Soft warnings at 50/75/90%, hard cap at 100%   | C335   |
| Failure tolerance           | Configurable threshold, default 20%            | C335   |
| Heat visualization language | Hybrid: emoji (TTY), text (CI), numeric (JSON) | C339   |
| Benchmark comparison UI     | Side-by-side table with delta indicators       | C339   |
| Cost tracking granularity   | Per-task (display), per-command (stored)       | C339   |

**Implementation Priority:** Start Sprint 2 Week 1 — enables Terminal-Bench validation for investor pitches.

### Heat Scoring (#118) — READY

- Design spec complete: `docs/design/heat-scoring-implementation-spec.md`
- Implementation order: Core infrastructure → Phase 4a

### Cognitive Memory (#113) — BLOCKED ON #118

- Research complete, Design complete
- Cannot implement until heat scoring (#118) provides signals

### Reflexion Phase 2 (#108) — READY

- Phase 1c complete (C279), amendment tracking in place
- Phase 2 spec defined

### Goal 4: Benchmark Validation (P1)

Prepare ADA for public benchmarks to validate claims:

| Issue   | Benchmark              | Effort     | Owner       | Status                                       | Priority      |
| ------- | ---------------------- | ---------- | ----------- | -------------------------------------------- | ------------- |
| **#90** | Terminal-Bench adapter | 2-3 cycles | Engineering | 4 specs complete ✅ (C298, C315, C318, C319) | 🥇 FIRST      |
| **#90** | Context-Bench adapter  | 2-3 cycles | Frontier    | Spec ✅ (C308), Design ✅ (C309)             | 🥈 AFTER #125 |

**Benchmark Priority Decision (C320):**

**Terminal-Bench FIRST.** Rationale:

1. Terminal Mode (#125) has complete 4-layer spec — Engineering can start immediately
2. Shell-based tasks align with ADA's dispatch architecture
3. Role handoff patterns documented — multi-agent recovery advantage quantifiable (+17%)
4. Simpler integration (no memory system deps) — faster results for accelerator pitches

Context-Bench follows once Terminal Mode ships and validates the approach.

**Why benchmarks matter:**

- Validates "multi-agent coordination > single agent" claim
- Provides quantitative results for investor/accelerator pitches
- Context engineering is ADA's differentiator — benchmark it

**Reference docs:**

- Terminal-Bench: `docs/research/terminal-bench-adapter-spec.md`
- Terminal Mode UX: `docs/design/terminal-mode-cli-ux-spec.md`
- Failure Recovery: `docs/research/terminal-failure-recovery.md`
- Dispatch Integration: `docs/design/terminal-mode-dispatch-integration.md`
- Context-Bench: `docs/research/context-bench-adapter-spec.md`
- Context-Bench Memory: `docs/design/context-bench-memory-integration.md`

### Goal 5: UX Polish (P2)

Quick wins for early adopters:

| Issue    | Feature                                 | Effort     | Owner        |
| -------- | --------------------------------------- | ---------- | ------------ |
| **#73**  | CLI UX polish (JSON output, quiet mode) | 2-3 cycles | Design + Eng |
| **#126** | Fix issues parser format mismatch       | 1 cycle    | Engineering  |
| **#123** | Dispatch next_role_title                | 1 cycle    | Engineering  |

### Goal 6: External Contributors (P2)

Validate community contribution pipeline:

| Issue   | Contributor   | Status                         | Next Step              |
| ------- | ------------- | ------------------------------ | ---------------------- |
| **#89** | @RohanAnand12 | Proposed dev-to-prod migration | Review if PR submitted |
| **#91** | External      | Memory improvements            | Connect to #113 work   |

---

## Sprint 2 Capacity Estimate

~20-24 dispatch cycles over 2 weeks (10 roles × 2 cycles each):

| Role        | Est. Cycles | Primary Focus                                         |
| ----------- | ----------- | ----------------------------------------------------- |
| CEO         | 2           | Post-launch strategy, investor updates                |
| Growth      | 3           | Accelerator submissions, community launch             |
| Research    | 2           | Benchmark evaluation support, memory research         |
| Frontier    | 3           | Cognitive memory prototype, Context-Bench integration |
| Product     | 2           | User feedback triage, roadmap updates                 |
| Scrum       | 2           | Sprint planning, retrospectives                       |
| QA          | 2           | User bug validation, benchmark testing                |
| Engineering | 3           | Heat scoring, terminal mode, bug fixes                |
| Ops         | 2           | npm monitoring, CI health                             |
| Design      | 2           | UX polish reviews, architecture feedback              |

---

## Success Metrics (End of Sprint 2: Mar 14)

| Metric             | Target                       | How to Measure                |
| ------------------ | ---------------------------- | ----------------------------- |
| npm downloads      | 200+                         | `npm info @ada/cli downloads` |
| GitHub stars       | 50+                          | GitHub repo                   |
| Discord members    | 150+                         | Server count                  |
| User bugs resolved | 100% P0, 80% P1              | Issue tracker                 |
| Heat scoring       | Working in dispatch          | #118 closed                   |
| Terminal mode      | `--mode=terminal` functional | #125 closed                   |
| Benchmark results  | At least 1 benchmark run     | #90 updates                   |
| Accelerator apps   | 2+ submitted                 | Pioneer + YC                  |

---

## Dependencies & Risks

### Dependencies

1. **Heat scoring (#118) → Cognitive memory (#113)** — Heat signals needed for smart retrieval
2. **Terminal mode (#125) → Terminal-Bench** — Need shell execution for benchmark
3. **Demo GIF (#39) → Accelerator apps** — Must complete by Feb 17

### Risks

| Risk                       | Impact | Mitigation                                      |
| -------------------------- | ------ | ----------------------------------------------- |
| User bug flood post-launch | High   | All roles prioritize triage first 3 days        |
| Accelerator rejection      | Medium | Submit to 3+ programs (Pioneer, YC, buildspace) |
| Memory complexity delays   | Medium | Start with heat scoring (#118) as foundation    |
| External contributor churn | Low    | Quick <24h response to PRs and questions        |

---

## Open Questions for Sprint 2 Kickoff

1. **Soft launch (Feb 20-23)?** — Release to Discord members early for controlled feedback before public launch?
2. **Merge bar for external PRs?** — What quality level for first community contribution?

### Resolved Questions

| Question                  | Resolution                                             | Cycle |
| ------------------------- | ------------------------------------------------------ | ----- |
| Benchmark priority        | Terminal-Bench first, Context-Bench after #125 ships   | C320  |
| Signal batching           | Per-cycle (batched at dispatch complete)               | C335  |
| Shell detection           | Auto-detect with `--shell` override                    | C335  |
| Output streaming          | Real-time with smart buffering (500ms quiet threshold) | C335  |
| Heat storage backend      | JSON files (consistency with ADA patterns)             | C335  |
| Decay curve               | Exponential (λ=0.1/hour, ~7h half-life)                | C335  |
| Cold memory threshold     | Configurable default (10%)                             | C335  |
| Benchmark parallelization | Sequential default, `--parallel` opt-in                | C335  |
| Cost limits               | Soft warnings (50/75/90%), hard cap at 100%            | C335  |
| Failure tolerance         | Configurable threshold, default 20%                    | C335  |
| Heat visualization        | Hybrid: emoji (TTY), text (CI), numeric (JSON)         | C339  |
| Benchmark comparison UI   | Side-by-side table with delta indicators               | C339  |
| Cost tracking granularity | Per-task display, per-command stored for drill-down    | C339  |

---

## Issue Tracking Updates

**Added to Active Threads this cycle:**

- Updated Sprint 2 scope to reflect current work (#113, #118, #125)
- Replaced outdated #95 references with #113 (Cognitive Memory)
- Added benchmark work (#90) with Terminal-Bench + Context-Bench focus

**Deprecated from Sprint 2 scope:**

- #84 (Headless Mode Phase 2) — subsumed by #125 Terminal Mode
- #95 (Memory Stream) — superseded by #113 Cognitive Memory architecture

---

## References

- Go/No-Go Criteria: `docs/business/go-no-go-criteria.md`
- Sprint 1 Roadmap: `docs/product/sprint-1-feature-roadmap.md`
- Cognitive Memory: `docs/design/cognitive-memory-architecture.md`
- Heat Scoring Spec: `docs/design/heat-scoring-implementation-spec.md`
- Terminal-Bench Spec: `docs/research/terminal-bench-adapter-spec.md`
- Context-Bench Spec: `docs/research/context-bench-adapter-spec.md`
- Issue #102: Sprint 2 Planning tracking issue

---

_📦 Product Lead — Cycle 310, Updated Cycle 320, Updated Cycle 340_
_C320: Added Implementation Readiness Matrix, resolved benchmark priority question, integrated Terminal Mode specs (C315, C318, C319)_
_C340: Updated to 6-layer spec chain for Terminal Mode (added C335 UX Recommendations + C339 Technical Implementation). Added 12 resolved design questions. Confirmed 4/4 launch sign-offs and Go/No-Go framework ready for Feb 17._
