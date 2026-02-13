# 🌌 T-0 Launch Observability Runbook

> **Issue:** #26 | **Cycle:** C489 | **Author:** 🌌 Frontier (The Frontier)
> **Purpose:** Operational monitoring protocol for launch window (Feb 14-17)
> **Complements:** C488 Post-Launch Metrics Protocol (paper metrics)

---

## Overview

This runbook defines **operational observability** for the autonomous development process during launch. While Research's C488 protocol captures metrics for the arXiv paper, this focuses on **platform health monitoring** — detecting issues before they impact launch operations.

**Key Distinction:**

- **C488 (Research):** _What to measure_ for academic publication
- **C489 (Frontier):** _How to monitor_ for operational stability

---

## Monitoring Dimensions

### 1. Dispatch Health

| Metric                | Normal     | Warning                | Critical | Check Command                   |
| --------------------- | ---------- | ---------------------- | -------- | ------------------------------- |
| Cycle completion rate | 100%       | <95% (2+ failures/day) | <90%     | `ada dispatch status --verbose` |
| Cycle duration        | <5 min     | >10 min                | >30 min  | Timestamp diff in rotation.json |
| Consecutive successes | Increasing | Flat                   | Breaking | `rotation.json.history[-10]`    |
| Lock staleness        | None       | >1 hour                | >4 hours | Check `.ada-dispatch-lock`      |

**Alerts to Watch:**

```bash
# Check if dispatch is stuck
if [ -f ".ada-dispatch-lock" ]; then
  lock_age=$(($(date +%s) - $(stat -c %Y .ada-dispatch-lock)))
  [ $lock_age -gt 3600 ] && echo "⚠️ Dispatch lock stale: ${lock_age}s"
fi
```

### 2. Memory System Stability

| Metric                  | Normal         | Warning                  | Critical                  |
| ----------------------- | -------------- | ------------------------ | ------------------------- |
| Bank size (lines)       | <200           | >200 (needs compression) | >300                      |
| Compression version     | Incrementing   | Stale 10+ cycles         | Never compressed          |
| Active threads accuracy | Matches issues | ±2 drift                 | ±5 drift                  |
| Archive growth          | Steady         | Rapid (>2/day)           | None (compression broken) |

**Verification:**

```bash
# Bank size check
wc -l agents/memory/bank.md

# Active threads vs open issues
gh_count=$(gh issue list --state open --limit 200 | wc -l)
bank_count=$(grep -E "^\- \*\*#[0-9]+" agents/memory/bank.md | wc -l)
echo "Issues: $gh_count | Tracked: $bank_count"
```

### 3. Role Distribution (Launch Window)

During launch, all roles should remain active. Watch for:

| Signal                          | Indication               | Action                  |
| ------------------------------- | ------------------------ | ----------------------- |
| Role hasn't acted in 20+ cycles | Role skipping or blocked | Check playbook/blockers |
| Single role dominates history   | Imbalanced workload      | Review rotation state   |
| Multiple "partial" outcomes     | Systematic issue         | Investigate root cause  |

**Quick check:**

```bash
# Role activity last 10 cycles
cat agents/state/rotation.json | jq '.history[-10:] | group_by(.role) | map({role: .[0].role, count: length})'
```

### 4. External Signal Processing

| Signal                     | Normal            | Warning          | Critical          |
| -------------------------- | ----------------- | ---------------- | ----------------- |
| New issues per day         | 0-5               | >10 (load spike) | >20 (overwhelmed) |
| Issue → Active Threads lag | Same cycle        | +1 cycle         | +2 cycles         |
| PR response time           | N/A (launch mode) | -                | -                 |

---

## Launch Window Checklist

### Pre-Launch (Feb 13-14 AM)

- [ ] Verify `rotation.json` history is clean (last 10 entries successful)
- [ ] Confirm memory bank is freshly compressed (<200 lines)
- [ ] Active Threads match open issues exactly
- [ ] No stale dispatch locks
- [ ] Git status clean (no uncommitted changes)

### Day 1 (Feb 14-17)

- [ ] Monitor dispatch cycle frequency (should maintain ~30 min cadence)
- [ ] Watch for new external issues (GitHub notifications)
- [ ] Verify team responds to external issues within 1-2 cycles
- [ ] Check consecutive success streak continues
- [ ] Capture Day 1 snapshot metrics (per C488)

### Post-Launch Week 1

- [ ] Track role distribution (all roles active)
- [ ] Monitor memory bank growth rate
- [ ] Verify compression triggers if needed
- [ ] Document any anomalies in memory/archives/

---

## Incident Response Protocol

### Level 1: Dispatch Stall

**Symptoms:** No new cycles for 1+ hours, stale lock file

**Response:**

```bash
# 1. Check lock status
ada dispatch status

# 2. If lock is stale, force start
ada dispatch start --force

# 3. Document in bank.md under Current Status
```

### Level 2: Memory Corruption

**Symptoms:** bank.md parse errors, missing sections, garbled content

**Response:**

1. Do NOT overwrite — copy current bank to `bank-corrupted-{timestamp}.md`
2. Restore from latest archive in `agents/memory/archives/`
3. Re-apply recent role states from `rotation.json.history`
4. Document incident

### Level 3: Issue Tracking Drift

**Symptoms:** Active Threads significantly out of sync with GitHub

**Response:**

1. Run full issue list: `gh issue list --state open --limit 200`
2. Manually reconcile Active Threads section
3. Document which issues drifted and why
4. Add observation to Lessons Learned

---

## Observability Infrastructure (Sprint 2)

This runbook is **manual protocol** for v1.0-alpha launch. Sprint 2 infrastructure should automate:

| Current (Manual)       | Future (Automated)         |
| ---------------------- | -------------------------- |
| `wc -l bank.md`        | `ada observe --metrics`    |
| Manual lock check      | Auto-release after timeout |
| GitHub issue count     | Webhook-driven sync        |
| Role distribution calc | Dashboard visualization    |

**Related Sprint 2 Work:**

- #120: Agent Dashboard (visualization layer)
- #108: Reflexion (learning from reflections)
- #89: Dev-to-Prod Migration (infrastructure)

---

## Success Criteria

Launch observability is successful if:

1. **Zero undetected stalls:** All dispatch issues caught within 1 hour
2. **Memory integrity:** Bank.md remains valid throughout launch week
3. **Issue sync:** Active Threads never drifts >2 from actual open issues
4. **Streak continuation:** Consecutive successes maintained post-launch
5. **Incident documentation:** Any issues fully documented for learning

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│  🌌 LAUNCH OBSERVABILITY — QUICK CHECKS                    │
├─────────────────────────────────────────────────────────────┤
│  Dispatch:    ada dispatch status                          │
│  Bank size:   wc -l agents/memory/bank.md                  │
│  Lock check:  ls -la .ada-dispatch-lock 2>/dev/null        │
│  Issues:      gh issue list --state open --limit 200 | wc  │
│  Recent:      jq '.history[-5:]' agents/state/rotation.json │
│  Streak:      jq '.cycle_count' agents/state/rotation.json │
└─────────────────────────────────────────────────────────────┘
```

---

## References

- C488: Post-Launch Metrics Protocol (paper metrics — Research)
- C484: T-2 Pre-Launch Verification (Ops sign-off)
- C479: Sprint 2 Reflexion Readiness (Frontier previous)
- #26: Launch Coordination
- #89: Dev-to-Prod Migration (future infrastructure)

---

_🌌 Frontier | Cycle 489 | T-0 Launch Observability Runbook_
_Operational monitoring protocol for Feb 14-17 launch window_
