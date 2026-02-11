# 🚀 Sprint 2 Kickoff Document

> **Sprint 2:** Feb 28 – Mar 14, 2026
> **Goal:** Ship Terminal Mode + Heat Scoring + Observability Core
> **Status:** READY FOR KICKOFF
> **Last Updated:** 2026-02-11 | Cycle 380

---

## Executive Summary

Sprint 2 builds on v1.0-alpha's foundation to add the core differentiation features: **Terminal Mode** for shell-based workflows, **Heat Scoring** for intelligent prioritization, and **Observability** for cost/time tracking. All preparation complete — 4 comprehensive specs ready for implementation.

---

## Specification Index

All specs created during C363-C379 pre-launch prep phase:

| Spec                          | Cycle | Role        | Path                                                              | Covers                                             |
| ----------------------------- | ----- | ----------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| **User Stories**              | C370  | Product     | `docs/product/sprint-2-user-stories.md`                           | 11 stories with acceptance criteria, week schedule |
| **Implementation Contract**   | C373  | Engineering | `docs/engineering/sprint-2-implementation-contract.md`            | Types, directory structure, technical decisions    |
| **CLI UX Spec**               | C375  | Design      | `docs/design/sprint-2-cli-ux-spec.md`                             | Output formats, colors, empty/error states         |
| **Integration Test Strategy** | C379  | Frontier    | `docs/engineering/sprint-2-platform-integration-test-strategy.md` | 4-layer test architecture, cross-package scenarios |

### Supporting References

- Engineering Readiness: `docs/engineering/sprint-2-engineering-readiness.md` (C363)
- Platform Readiness: `docs/engineering/sprint-2-frontier-platform-readiness.md` (C369)

---

## Feature Breakdown

### 1. Terminal Mode (#125)

**What:** Interactive shell for dispatch/discussion without LLM context switching.

**User Stories (3):**

- US-1.1: Start/configure terminal sessions
- US-1.2: Hot-swap between dispatch/discussion modes
- US-1.3: Session exit with cycle summary

**Key Files:**

- `packages/core/src/terminal/session.ts`
- `packages/cli/src/commands/terminal.ts`

**UX Contract:**

- Prompt: `ada> ` (dispatch) / `ada:chat> ` (discuss)
- Signals: 🟢 signals, 💰 cost, 📊 activity
- Exit summary: ASCII box with session stats

**Dependencies:** Heat Scoring (for activity signals)

---

### 2. Heat Scoring (#118)

**What:** Track file modification frequency to guide agent attention.

**User Stories (4):**

- US-2.1: Calculate heat scores per-file
- US-2.2: Display heat in dispatch status
- US-2.3: Time-based decay
- US-2.4: View heat history/trends

**Key Types (from Implementation Contract):**

```typescript
interface HeatScore {
  path: string;
  score: number; // 0-100
  tier: 'hot' | 'warm' | 'cold';
  lastModified: Date;
  modificationCount: number;
}

interface HeatMetadata {
  scores: HeatScore[];
  lastComputed: Date;
  cycleNumber: number;
}
```

**Key Files:**

- `packages/core/src/heat/types.ts`
- `packages/core/src/heat/calculate.ts`
- `packages/core/src/heat/decay.ts`
- `packages/core/src/heat/storage.ts`

**UX Contract:**

- Tiers: 🔥 Hot (>70), 🌡️ Warm (30-70), ❄️ Cold (<30)
- Commands: `ada heat show`, `ada heat status`

---

### 3. Observability (#83)

**What:** Cost and time tracking for dispatch cycles.

**User Stories (3):**

- US-3.1: Track per-cycle metrics (time, tokens, cost)
- US-3.2: Display metrics dashboard
- US-3.3: Export metrics data

**Key Types:**

```typescript
interface CycleMetrics {
  cycleNumber: number;
  role: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  tokensUsed?: number;
  estimatedCost?: number;
}
```

**Key Files:**

- `packages/core/src/metrics/types.ts`
- `packages/core/src/metrics/collector.ts`
- `packages/cli/src/commands/metrics.ts`

**UX Contract:**

- Command: `ada metrics` — dashboard with totals
- Integration: Top 5 hot files in dispatch status

---

## Implementation Timeline

### Week 1 (Feb 28 – Mar 6): Foundation

| Day | Engineering                | QA                  |
| --- | -------------------------- | ------------------- |
| Mon | Heat types + calculate.ts  | Unit test setup     |
| Tue | Heat decay + storage       | Heat unit tests     |
| Wed | Metrics types + collector  | Metrics unit tests  |
| Thu | Terminal session core      | Session unit tests  |
| Fri | Integration: Heat + Memory | Intra-package tests |

**Deliverables:** Core types implemented, unit tests passing, Heat + Memory integration working.

### Week 2 (Mar 7 – Mar 13): Integration

| Day | Engineering                 | QA                             |
| --- | --------------------------- | ------------------------------ |
| Mon | Terminal commands           | Terminal unit tests            |
| Tue | Heat CLI commands           | Heat CLI tests                 |
| Wed | Metrics CLI                 | Cross-package: Heat + Dispatch |
| Thu | Dispatch status integration | Cross-package: Terminal + Heat |
| Fri | Polish + edge cases         | E2E scenarios                  |

**Deliverables:** All CLI commands implemented, cross-package integrations tested.

### Week 3 (Mar 14 – Mar 20): Stabilization

| Day | Engineering              | QA                 |
| --- | ------------------------ | ------------------ |
| Mon | Bug fixes from E2E       | Full E2E suite     |
| Tue | Performance optimization | Regression testing |
| Wed | Documentation            | Final verification |

**Deliverables:** Sprint 2 features stable, documented, ready for demo.

---

## Success Criteria

### Code

- [ ] Heat scoring: `ada heat show` works with 3 tiers
- [ ] Terminal mode: `ada terminal` starts session, mode switching works
- [ ] Observability: `ada metrics` shows dashboard with time/cost
- [ ] Dispatch integration: `ada dispatch status` shows top 5 hot files

### Tests (from Test Strategy C379)

- [ ] 50+ new unit tests across heat, metrics, terminal
- [ ] 25+ integration tests for cross-package flows
- [ ] 5-8 E2E scenarios covering full user journeys

### UX (from CLI UX Spec C375)

- [ ] Color scheme: Blue primary, green success, yellow warn, red error
- [ ] Empty states: Helpful guidance when no data
- [ ] Error states: Clear messages with remediation steps

---

## Dependencies Map

```
┌────────────────────────────────────────────┐
│              TERMINAL MODE                  │
│              (#125)                         │
│                    │                        │
│                    ▼                        │
│    ┌───────────────────────────┐           │
│    │     HEAT SCORING          │           │
│    │     (#118)                │           │
│    │            │              │           │
│    │            ▼              │           │
│    │   ┌───────────────┐       │           │
│    │   │  OBSERVABILITY │       │           │
│    │   │  (#83)        │       │           │
│    │   └───────────────┘       │           │
│    └───────────────────────────┘           │
└────────────────────────────────────────────┘

Critical Path: Heat → Terminal → Full Integration
```

**Implication:** Heat types MUST be complete before Terminal can show activity signals.

---

## Risk Mitigation

| Risk                           | Mitigation                                | Owner       |
| ------------------------------ | ----------------------------------------- | ----------- |
| Heat calculation performance   | Implement caching, test with 1000+ files  | Engineering |
| Terminal state complexity      | Start with minimal MVP, iterate           | Engineering |
| Cross-package integration bugs | Test strategy defines verification points | QA/Frontier |
| Scope creep                    | Strict acceptance criteria per story      | Product     |

---

## Kickoff Checklist (Feb 28)

Before Sprint 2 starts:

### Pre-Kickoff (Complete ✅)

- [x] User stories written with acceptance criteria (C370)
- [x] Implementation contract finalized (C373)
- [x] CLI UX spec complete (C375)
- [x] Integration test strategy documented (C379)

### Kickoff Day (Feb 28)

- [ ] v1.0-alpha released successfully (Feb 24)
- [ ] Engineering creates feature branches
- [ ] QA sets up test infrastructure
- [ ] Design available for UX questions
- [ ] Scrum kicks off tracking

### Week 1 Gates

- [ ] Heat types merged to main (Mar 2)
- [ ] First heat unit tests passing (Mar 3)
- [ ] Memory bank updated with Sprint 2 state

---

## Cross-References

**Issues:**

- #125 — Terminal Mode (P1, Engineering, M)
- #118 — Heat Scoring (P1, Engineering, M)
- #83 — Dogfooding/Observability (P2, Ops, M)
- #102 — Sprint 2 Planning (P1, Scrum, M)

**Specs:**

- User Stories: C370, `docs/product/sprint-2-user-stories.md`
- Implementation Contract: C373, `docs/engineering/sprint-2-implementation-contract.md`
- CLI UX Spec: C375, `docs/design/sprint-2-cli-ux-spec.md`
- Test Strategy: C379, `docs/engineering/sprint-2-platform-integration-test-strategy.md`

**Lessons Applied:**

- L131: Formal user stories reduce ambiguity
- L133: Sprint prep docs should cross-reference explicitly (THIS DOCUMENT)
- L135: Implementation contracts bridge spec docs
- L136: CLI UX specs prevent Engineering guesswork
- L138: Integration test strategies should be documented before implementation

---

_📦 Product | Cycle 380 | 2026-02-11_
