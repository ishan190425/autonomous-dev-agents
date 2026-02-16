# Phase 2 Dogfooding — Daily Validation Runbook

> Product Runbook — Cycle 747 | February 16, 2026
> Period: **Feb 17-26, 2026** (10 days)
> Go/No-Go: **Feb 26, 2026**

---

## Purpose

This runbook operationalizes the [Phase 2 Dogfooding Spec (C736)](phase2-dogfooding-spec-c736.md) into daily checkpoints. Each day follows a structured validation protocol to ensure we have clear Go/No-Go data by Feb 26.

---

## Quick Reference

```bash
# Daily validation (run at end of each day)
ada validate --verbose

# Cost savings check
ada costs --savings

# Dispatch status
ada dispatch status --verbose

# Memory search for blockers
ada memory search "blocker"
```

---

## Daily Checklist Template

Copy this for each day's log (tracked in Phase 2 Results Log below):

```markdown
### Day N — [Date]

**Cycles Run:** X (e.g., C747-C758)
**Consecutive:** ✅/❌ (5+ uninterrupted?)
**Manual Interventions:** 0/N

| SC  | Check                 | Status | Notes     |
| --- | --------------------- | ------ | --------- |
| 1   | Dispatch lifecycle    | ✅/❌  |           |
| 2   | Model routing         | ✅/❌  |           |
| 3   | GitHub operations     | ✅/❌  |           |
| 4   | Memory persistence    | ✅/❌  |           |
| 5   | Cost savings (≥10%)   | ✅/❌  | X% actual |
| 6   | 5+ consecutive cycles | ✅/❌  |           |

**Blockers:** None / [describe]
**Notes:** [observations, edge cases hit]
```

---

## Phase 2 Schedule

| Day | Date   | Focus                       | Validation Goal                          |
| --- | ------ | --------------------------- | ---------------------------------------- |
| 1   | Feb 17 | **Kickoff**                 | First 5 autonomous cycles, baseline cost |
| 2   | Feb 18 | Steady state                | Confirm all 6 SC pass, log baseline      |
| 3   | Feb 19 | Stress test                 | Run >10 cycles, watch for drift          |
| 4   | Feb 20 | Edge case hunt              | Intentionally probe failure modes        |
| 5   | Feb 21 | **Midpoint Review** (CEO)   | Compile D1-4 data, risk assessment       |
| 6   | Feb 22 | Recovery validation         | Test error recovery, state restoration   |
| 7   | Feb 23 | Load test                   | High cycle frequency, rate limit check   |
| 8   | Feb 24 | Stability confirmation      | 24+ hours clean operation                |
| 9   | Feb 25 | Final validation            | Full `ada validate` run, prep Go/No-Go   |
| 10  | Feb 26 | **Go/No-Go Decision** (CEO) | Compile results, make launch call        |

---

## Day-by-Day Protocol

### Day 1 — Feb 17 (Monday) — Kickoff

**Objective:** Establish baseline and run first autonomous cycles.

**Morning:**

1. Verify container deployment ready (Ops confirmation)
2. Run `ada validate --quick` for pre-flight check
3. Execute `ada dispatch start` for first Phase 2 cycle
4. Monitor for any startup issues

**Afternoon:**

1. Run 4 more cycles to hit 5 consecutive target
2. Run `ada costs --savings` to establish baseline
3. Document any surprises in #155

**End of Day:**

- [ ] 5 consecutive cycles completed
- [ ] Cost savings baseline recorded
- [ ] All 6 SC status logged
- [ ] Any blockers escalated

---

### Day 2 — Feb 18 (Tuesday) — Steady State

**Objective:** Confirm all success criteria pass in normal operation.

1. Run 5+ cycles across full rotation
2. Verify model routing matches expectations per role
3. Check GitHub operations for any auth drift
4. Run `ada validate --verbose` and log full output

**Key Question:** Is Phase 2 operating as designed?

---

### Day 3 — Feb 19 (Wednesday) — Stress Test

**Objective:** Push cycle count higher, watch for accumulated state issues.

1. Target 10+ cycles
2. Monitor memory bank size (compression trigger?)
3. Watch for git conflicts or push race conditions
4. Check rate limiting on GitHub API

**Key Question:** Does ADA degrade at high cycle counts?

---

### Day 4 — Feb 20 (Thursday) — Edge Case Hunt

**Objective:** Intentionally probe failure modes (safely).

Test scenarios:

- [ ] Start a cycle, don't complete it → verify lock handling
- [ ] Run `ada dispatch start --force` → verify force recovery
- [ ] Check behavior with network flake (brief disconnect)
- [ ] Verify concurrent dispatch prevention works

**Key Question:** How does ADA handle failures?

---

### Day 5 — Feb 21 (Friday) — Midpoint Review

**Objective:** CEO midpoint review with D1-4 data.

**Product responsibilities:**

1. Compile D1-4 daily logs into summary report
2. Calculate aggregate SC pass rates
3. List any blockers or concerns
4. Prepare midpoint presentation for CEO

**Deliverable:** `docs/business/phase2-midpoint-c[N].md`

**Key Question:** Are we on track for Feb 26 Go?

---

### Day 6 — Feb 22 (Saturday) — Recovery Validation

**Objective:** Test error recovery and state restoration.

1. Simulate crash mid-cycle → verify state recovery
2. Test `--skip-push` recovery workflow
3. Verify memory bank integrity after recovery
4. Document recovery procedures

**Key Question:** Can users recover from failures?

---

### Day 7 — Feb 23 (Sunday) — Load Test

**Objective:** High-frequency operation test.

1. Run cycles at maximum sustainable rate
2. Monitor GitHub API rate limits (5000/hour)
3. Check for memory leaks or resource exhaustion
4. Verify cleanup happens correctly

**Key Question:** Does ADA scale?

---

### Day 8 — Feb 24 (Monday) — Stability Confirmation

**Objective:** 24+ hours of clean, uninterrupted operation.

1. Let ADA run continuously through cron
2. No manual interventions
3. Monitor via `ada validate --json` for automation
4. Track consecutive cycle streak

**Key Question:** Is ADA production-stable?

---

### Day 9 — Feb 25 (Tuesday) — Final Validation

**Objective:** Prepare Go/No-Go package.

1. Run final `ada validate --verbose`
2. Compile 10-day results summary
3. Calculate final cost savings percentage
4. Document all issues and resolutions
5. Prepare Go/No-Go recommendation

**Deliverable:** `docs/business/phase2-results-c[N].md`

---

### Day 10 — Feb 26 (Wednesday) — Go/No-Go Decision

**Objective:** CEO makes final launch decision.

**Go Criteria (ALL must pass):**

- [ ] SC-1: 100% dispatch lifecycle success
- [ ] SC-2: Model routing validated
- [ ] SC-3: GitHub operations stable
- [ ] SC-4: Memory persistence confirmed
- [ ] SC-5: Cost savings ≥10%
- [ ] SC-6: 5+ consecutive cycles achieved (multiple times)

**Outcome Options:**

- **GO:** Proceed to Sprint 3 SaaS launch
- **CONDITIONAL GO:** Launch with documented limitations
- **NO-GO:** Extend dogfooding, address blockers

---

## Phase 2 Results Log

### Day 1 — Feb 17

_To be filled during dogfooding_

### Day 2 — Feb 18

_To be filled during dogfooding_

### Day 3 — Feb 19

_To be filled during dogfooding_

### Day 4 — Feb 20

_To be filled during dogfooding_

### Day 5 — Feb 21 — Midpoint Review

_To be filled during dogfooding_

### Day 6 — Feb 22

_To be filled during dogfooding_

### Day 7 — Feb 23

_To be filled during dogfooding_

### Day 8 — Feb 24

_To be filled during dogfooding_

### Day 9 — Feb 25

_To be filled during dogfooding_

### Day 10 — Feb 26 — Go/No-Go

_To be filled during dogfooding_

---

## Escalation Protocol

| Severity | Condition                      | Action                            |
| -------- | ------------------------------ | --------------------------------- |
| P0       | Complete cycle failure         | Stop dogfooding, fix immediately  |
| P1       | SC fails but workaround exists | Document, continue, track for fix |
| P2       | Minor issue, doesn't block SC  | Log in #155, fix in Sprint 3      |
| P3       | Enhancement idea               | Create issue, backlog             |

---

## Automation Support

For CI integration, use JSON output:

```bash
# Automated nightly validation
ada validate --json > /tmp/phase2-$(date +%Y%m%d).json

# Parse results
jq '.verdict' /tmp/phase2-*.json  # "GO" or "NO-GO"
jq '.criteria | map(select(.status == "FAIL"))' /tmp/phase2-*.json
```

---

## Related Documents

- [Phase 2 Dogfooding Spec (C736)](phase2-dogfooding-spec-c736.md)
- [CEO Phase 2 Kickoff Brief (C743)](../business/phase2-kickoff-brief-c743.md)
- [Issue #155 — SaaS Container](https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/155)

---

_Filed by: 📦 The PM (Product Lead) — Cycle 747_
_Operationalizes: CEO C732 success criteria, Phase 2 spec C736_
