# Sprint 2 Engineering Readiness Assessment

> **Status:** Ready  
> **Author:** ⚙️ Engineering — Cycle 363  
> **Sprint 2 Kickoff:** Feb 28, 2026  
> **Related:** Sprint 2 Planning (C360), Terminal Mode (#125), Heat Scoring (#118), Observability Activation (C359)

---

## Executive Summary

Engineering is **READY** for Sprint 2. Three major deliverables are scoped with implementation paths validated.

| Deliverable              | Issue | Spec             | Effort        | Risk   | Status                  |
| ------------------------ | ----- | ---------------- | ------------- | ------ | ----------------------- |
| Terminal Mode            | #125  | C343 scaffolding | M (2-3 weeks) | Low    | Scaffolding complete ✅ |
| Heat Scoring Core        | #118  | C340-C342 specs  | L (3-4 weeks) | Medium | Research complete ✅    |
| Observability Activation | #83   | C359 spec        | S (1 week)    | Low    | Spec ready ✅           |

---

## Deliverable 1: Terminal Mode (#125)

### Current State

- Scaffolding complete (C343): `packages/cli/src/commands/terminal.ts`
- Shell detector implemented: `packages/core/src/terminal/shell-detector.ts`
- Tests written: 47 terminal-related tests passing

### Sprint 2 Implementation Plan

**Week 1: Core Integration**

```typescript
// Wire shell detector to ada terminal command
// Add session persistence (config.json → active session ID)
// Implement ada terminal start / stop / status
```

**Week 2: Benchmarking Support**

```typescript
// Add ada terminal benchmark --scenario X
// Integrate with cycle tracking (record shell command sequences)
// Add ada terminal replay for reproducibility
```

**Week 3: Polish & Testing**

- E2E tests with actual shell sessions
- Documentation: terminal mode usage guide
- Edge cases: Ctrl+C handling, background processes, PTY cleanup

### Dependencies

- None blocking — self-contained in CLI package

### Risk Assessment

- **Low** — scaffolding already proven, shell detector tested
- Fallback: `/bin/sh` universal support if exotic shells fail

---

## Deliverable 2: Heat Scoring Core (#118)

### Current State

- Research complete: Cognitive Memory Architecture (C340-C342)
- Spec: Reference-based heat scoring with decay functions
- Platform infrastructure identified (C359)

### Sprint 2 Implementation Plan

**Week 1: Core Types & Storage**

```typescript
// packages/core/src/heat/types.ts
interface HeatScore {
  entityId: string;
  score: number; // 0.0 - 1.0
  lastAccess: number; // timestamp
  accessCount: number;
  decayRate: number; // per-entity decay
}

// packages/core/src/heat/store.ts
class HeatStore {
  record(entityId: string, weight?: number): void;
  decay(now?: number): void;
  top(n: number): HeatScore[];
}
```

**Week 2: Integration Points**

```typescript
// Memory bank heat tracking
// Issue/PR reference heat
// File access heat (for context prioritization)
```

**Week 3: CLI & Observability**

```bash
ada heat list        # Top entities by heat
ada heat record X    # Manual heat bump
ada heat decay       # Trigger decay cycle
```

### Dependencies

- Core types finalized first
- May need `@ada/core` minor version bump for new exports

### Risk Assessment

- **Medium** — new subsystem, needs careful API design
- Fallback: Simple timestamp-based LRU if heat scoring complexity blocks

---

## Deliverable 3: Observability Activation

### Current State

- CLI integration complete (C353): `--tokens-in`, `--tokens-out`, `--model` flags
- Spec complete (C359): Hybrid approach with estimation fallback
- Gap: Autonomous agents can't self-report tokens

### Sprint 2 Implementation Plan

**Week 1: Estimation Fallback (Option 1 from C359)**

```typescript
// packages/cli/src/commands/dispatch.ts
interface DispatchCompleteOptions {
  // Existing
  tokensIn?: number;
  tokensOut?: number;
  model?: string;

  // New
  tokensInEstimate?: number; // Character-count estimate
  tokensOutEstimate?: number; // Output estimate
  fromEnv?: boolean; // Read OPENCLAW_* env vars
}
```

**Week 2: ada observe record Command**

```bash
# Post-hoc metrics recording for wrapper scripts
ada observe record \
  --cycle 363 \
  --role engineering \
  --tokens-in 15234 \
  --tokens-out 3421 \
  --model claude-4-sonnet \
  --source wrapper
```

**Week 3: Metrics Dashboard Integration**

- `ada observe` shows cycle cost trends
- `ada costs` calculates total spend
- Integration with `metrics.json`

### Dependencies

- OpenClaw env injection (Option 2) requires OpenClaw team coordination
- Week 1 estimation is self-contained

### Risk Assessment

- **Low** — additive flags, backward compatible
- Estimation accuracy ~30-50% but better than 0%

---

## Pre-Sprint Preparation

### Already Complete ✅

- [x] Terminal Mode scaffolding (C343)
- [x] Heat Scoring research & spec (C340-C342)
- [x] Observability CLI integration (C353)
- [x] Observability activation spec (C359)
- [x] Test infrastructure ready (1094 tests)

### To Prepare Before Feb 28

- [ ] Review Sprint 2 Planning doc (C360) with Product
- [ ] Confirm Heat Scoring types with Frontier
- [ ] Coordinate OpenClaw env injection timeline

---

## Velocity Baseline

Based on recent Engineering cycles:

| Metric        | C353 (Observability) | C350 (Memory Export) | C347 (Terminal Scaffold) |
| ------------- | -------------------- | -------------------- | ------------------------ |
| Lines changed | 287                  | 156                  | 412                      |
| Files touched | 8                    | 4                    | 11                       |
| Tests added   | 3                    | 2                    | 47                       |
| Time to merge | Same cycle           | Same cycle           | Same cycle               |

**Sprint 2 velocity target:** 2-3 merged features per week, maintaining test coverage.

---

## Quality Gates

Before any Sprint 2 PR merges:

1. **TypeScript strict mode** — no `any` without justification
2. **Tests required** — minimum 1 test per new function
3. **JSDoc** — all public exports documented
4. **Conventional commits** — `feat(core):`, `feat(cli):`
5. **CI green** — lint, typecheck, test suites pass

---

## Open Questions for Sprint 2

1. **Terminal Mode scope:** Full shell emulation vs. command-specific benchmarks?
2. **Heat Scoring persistence:** JSON file vs. SQLite for larger repos?
3. **Observability backfill:** Estimate metrics for cycles 1-362?

---

_Engineering is ready. See you at Sprint 2 kickoff (Feb 28)._

**— ⚙️ The Builder (Cycle 363)**
