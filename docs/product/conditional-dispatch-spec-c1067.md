# Conditional Dispatch: Skip-Until Specification

> **Product Spec for #237** | Cycle 1067 | Author: 📦 Product

---

## Executive Summary

Add a `skipUntil` configuration that allows dispatch cycles to automatically skip until an external condition is met. This eliminates token waste during known-blocked periods while maintaining audit trails and enabling automatic resumption.

---

## Problem Statement

When a project is blocked on external dependencies (human deployment, PR merge, issue resolution), dispatch cycles enter holding patterns that:

1. **Burn tokens** — Each cycle loads context, checks state, and reports "still waiting"
2. **Require manual intervention** — Cron must be disabled/re-enabled manually
3. **Create noise** — Consecutive "holding pattern" cycles clutter history
4. **Risk missed resumption** — Forgetting to re-enable cron delays progress

**Real Example:** PayFlow C144-148 ran 5 consecutive holding cycles waiting for #14 deploy, each confirming "maximum preparation" without progress.

---

## Proposed Solution

### Configuration Format

```yaml
# In agents/config.yaml or agents/dispatch-config.yaml
skipUntil:
  type: <condition-type>
  # ... condition-specific fields
  reason: 'Waiting for X' # Optional human-readable reason
```

### Supported Condition Types

| Type            | Fields                       | Example                            |
| --------------- | ---------------------------- | ---------------------------------- |
| `issue_closed`  | `issue` (number)             | Wait for #14 to close              |
| `issue_comment` | `issue`, `author` (optional) | Wait for human comment on #14      |
| `label_added`   | `issue`, `label`             | Wait for "ready-to-deploy" on #155 |
| `label_removed` | `issue`, `label`             | Wait for "blocked" to be removed   |
| `pr_merged`     | `pr` (number)                | Wait for PR #200 to merge          |
| `pr_closed`     | `pr` (number)                | Wait for PR to close (any state)   |
| `date`          | `after` (ISO date)           | Wait until 2026-03-01              |
| `manual`        | `flag` (string)              | Wait until `--resume` flag passed  |

### Behavior

```
┌─────────────────────────────────────────────────────────┐
│                    Dispatch Start                        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │ Check skipUntil      │
                │ condition present?   │
                └──────────────────────┘
                           │
              ┌────────────┴────────────┐
              │ Yes                     │ No
              ▼                         ▼
    ┌─────────────────────┐    ┌─────────────────────┐
    │ Evaluate condition  │    │ Proceed normally    │
    └─────────────────────┘    └─────────────────────┘
              │
    ┌─────────┴─────────┐
    │ Met?              │ Not met?
    ▼                   ▼
┌──────────────┐   ┌──────────────────────────────────┐
│ Clear config │   │ Log: "Skipping: [reason]"        │
│ Proceed      │   │ Exit with code 0 (not error)     │
│ normally     │   │ Record in rotation.json history  │
└──────────────┘   └──────────────────────────────────┘
```

---

## CLI Interface

### Check Condition

```bash
# Check if skip condition is active and its status
ada dispatch status
# Output includes:
# ⏸️  Skipping cycles: Waiting for #14 to close
#     Condition: issue_closed (issue: 14)
#     Set: 2026-02-20 10:30:00 EST
#     Cycles skipped: 12
```

### Set Condition

```bash
# Set skip condition
ada dispatch skip --until "issue_closed:14" --reason "Waiting for deploy"

# Alternative formats
ada dispatch skip --until "pr_merged:200"
ada dispatch skip --until "label_added:155:ready-to-deploy"
ada dispatch skip --until "date:2026-03-01"
```

### Clear Condition

```bash
# Manual clear (for when condition is met externally)
ada dispatch resume

# Force proceed despite condition (one cycle only)
ada dispatch start --force
```

### During Dispatch

```bash
ada dispatch start
# If condition not met:
# ⏸️  Cycle skipped: Waiting for #14 to close
#     Condition: issue_closed | Status: issue #14 still open
#     Skipped cycles: 13 | Next check in: [cron interval]
#
# To force proceed: ada dispatch start --force
# To clear condition: ada dispatch resume
```

---

## Acceptance Criteria

### Core Functionality

- [ ] **AC-1:** `ada dispatch skip --until "<condition>"` sets skip condition in config
- [ ] **AC-2:** `ada dispatch start` checks condition before cycle begins
- [ ] **AC-3:** If condition NOT met → exit 0 with skip message, no cycle executed
- [ ] **AC-4:** If condition met → clear config, proceed with normal cycle
- [ ] **AC-5:** `ada dispatch resume` clears skip condition manually
- [ ] **AC-6:** `ada dispatch start --force` proceeds despite active condition (one-time)

### Condition Types

- [ ] **AC-7:** `issue_closed` — checks GitHub issue state via API
- [ ] **AC-8:** `issue_comment` — checks for comments, optionally filtered by author
- [ ] **AC-9:** `label_added` — checks if label exists on issue
- [ ] **AC-10:** `label_removed` — checks if label is absent from issue
- [ ] **AC-11:** `pr_merged` — checks PR merge state
- [ ] **AC-12:** `pr_closed` — checks PR is closed (merged or not)
- [ ] **AC-13:** `date` — checks current time >= specified date

### Audit & Observability

- [ ] **AC-14:** Skipped cycles logged to `rotation.json` history with `status: "skipped"`
- [ ] **AC-15:** `ada dispatch status` shows active skip condition and skip count
- [ ] **AC-16:** Skip reason appears in cron logs for debugging

### Edge Cases

- [ ] **AC-17:** Invalid condition format → error with clear message
- [ ] **AC-18:** GitHub API failure → retry once, then proceed with cycle (fail-open)
- [ ] **AC-19:** Multiple conditions → all must be met (AND logic)
- [ ] **AC-20:** Condition cleared mid-cycle → no effect until next cycle

---

## Implementation Notes

### Config File Location

Recommend `agents/dispatch-config.yaml` (new file) to avoid polluting `roster.json`:

```yaml
# agents/dispatch-config.yaml
skipUntil:
  type: issue_closed
  issue: 14
  reason: 'Waiting for human deploy'
  setAt: '2026-02-20T15:30:00Z'
  setCycle: 144
```

### GitHub API Rate Limits

- Use authenticated requests (already have `gh` CLI)
- Cache condition results for 60s to avoid hammering API
- On rate limit → fail-open (proceed with cycle)

### Rotation History Format

```json
{
  "role": "product",
  "timestamp": "2026-02-20T16:00:00Z",
  "cycle": 145,
  "status": "skipped",
  "skipReason": "Waiting for #14 to close",
  "condition": "issue_closed:14"
}
```

---

## Non-Goals (Out of Scope)

1. **Webhook-based triggers** — Active polling is simpler; webhooks add infra complexity
2. **Complex condition logic** — OR/NOT operators; start with AND only
3. **Cross-repo conditions** — Stay single-repo; multi-repo is future work
4. **Auto-disable cron** — Keep cron running; just skip cycles (cleaner audit)

---

## Open Questions

1. **Should skipped cycles increment cycle count?**
   - Recommendation: No — skipped cycles shouldn't inflate metrics
2. **Max skip duration before auto-clear?**
   - Recommendation: 7 days default, configurable

3. **Notification on condition met?**
   - Future enhancement: Slack/Discord notification when condition clears

---

## Priority & Timeline

- **Priority:** P2 (quality-of-life, not blocking Sprint 3)
- **Estimate:** M (3-5 cycles for Engineering)
- **Target:** Sprint 4 (post-SaaS Container)
- **Dependencies:** None (self-contained feature)

---

## Related Issues

- **#237** — This spec
- **#155** — SaaS Container (will benefit from skip-until for deploy gates)
- **PayFlow #14** — Original use case

---

_Spec authored by 📦 Product (C1067). Ready for Engineering review._
