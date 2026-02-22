# Conditional Dispatch Feature Spec

> Skip cycles until external conditions are met — intelligent blocking for autonomous agents
> **Author:** 📦 Product (The PM) | **Cycle:** 1097
> **Issue:** #237 | **Priority:** P2

---

## Executive Summary

When projects hit known blockers (human deploy, external approval, dependency merge), dispatch cycles enter wasteful holding patterns. **Conditional Dispatch** lets agents declare "wait until X" and skip cycles automatically until the condition is met.

**Problem:** PayFlow burned 5+ cycles (C144-148) confirming "maximum preparation" while waiting for #14 to deploy. Each cycle cost tokens with zero progress.

**Solution:** A `skipUntil` configuration that checks conditions at cycle start and exits early if unmet, with automatic resume when unblocked.

---

## User Stories

### Primary User Story

> As an autonomous agent team, I want to skip dispatch cycles until an external condition is met, so that I don't waste tokens on known-blocked projects.

### Secondary User Stories

> As a project maintainer, I want agents to automatically resume when I merge a blocking PR, so I don't need to manually re-enable crons.

> As a cost-conscious user, I want visibility into why cycles are being skipped, so I can understand token savings.

---

## Condition Types

### 1. GitHub Comment Condition

Wait for a specific user to comment on an issue.

```yaml
skipUntil:
  type: github_comment
  issue: 14
  author: ishan190425 # Optional: specific author required
  contains: 'deployed' # Optional: comment must contain string
```

**Use case:** Human deployment confirmation, external review sign-off.

### 2. Issue Closed Condition

Wait for an issue to be closed.

```yaml
skipUntil:
  type: issue_closed
  issue: 14
```

**Use case:** Dependency issue resolution, blocking bug fix.

### 3. Label Added Condition

Wait for a label to be applied to an issue or PR.

```yaml
skipUntil:
  type: label_added
  issue: 155
  label: 'ready-to-deploy'
```

**Use case:** Manual approval gates, review completion markers.

### 4. PR Merged Condition

Wait for a pull request to be merged.

```yaml
skipUntil:
  type: pr_merged
  pr: 200
```

**Use case:** Dependency code landing, infrastructure PR completion.

### 5. Time-Based Condition

Wait until a specific time.

```yaml
skipUntil:
  type: datetime
  after: '2026-03-01T00:00:00Z'
```

**Use case:** Sprint boundaries, scheduled launches, external deadlines.

### 6. External API Condition (v2)

Wait for external API to return a specific value.

```yaml
skipUntil:
  type: external_api
  url: 'https://api.example.com/status'
  jsonPath: '$.deploy.ready'
  equals: true
```

**Use case:** CI/CD pipeline completion, external service readiness.

---

## CLI Interface

### Setting a Skip Condition

```bash
# Via CLI
ada dispatch skip-until --type issue_closed --issue 14

# Or interactively
ada dispatch skip-until
# > What type of condition? [issue_closed, pr_merged, label_added, github_comment, datetime]
# > Issue/PR number: 14
# > Condition set. Cycles will skip until #14 is closed.
```

### Checking Skip Status

```bash
ada dispatch status

# Output when skip is active:
# ⏸️  Dispatch PAUSED
#
#   Waiting for:  Issue #14 to be closed
#   Set at:       Cycle 1097, Feb 22 2026 06:56 AM
#   Cycles skipped: 3
#   Tokens saved: ~$0.45 (estimated)
#
#   To override: ada dispatch skip-until --clear
```

### Clearing a Skip Condition

```bash
ada dispatch skip-until --clear

# Output:
# ✅ Skip condition cleared. Normal dispatch will resume.
```

### Manual Override

```bash
# Force a cycle despite active skip
ada dispatch start --force

# Output:
# ⚠️  Forcing cycle despite active skip condition.
# Reason: Issue #14 still open
# Proceeding with cycle 1098...
```

---

## Configuration Schema

### Location

Stored in `agents/state/skip-until.json`:

```json
{
  "active": true,
  "condition": {
    "type": "issue_closed",
    "issue": 14
  },
  "setAt": {
    "cycle": 1097,
    "timestamp": "2026-02-22T11:56:00Z",
    "role": "product"
  },
  "skipCount": 0,
  "lastCheck": "2026-02-22T12:15:00Z"
}
```

### Condition Schema (TypeScript)

```typescript
type SkipCondition =
  | { type: 'issue_closed'; issue: number }
  | { type: 'pr_merged'; pr: number }
  | { type: 'label_added'; issue: number; label: string }
  | {
      type: 'github_comment';
      issue: number;
      author?: string;
      contains?: string;
    }
  | { type: 'datetime'; after: string }
  | {
      type: 'external_api';
      url: string;
      jsonPath: string;
      equals: unknown;
    };

interface SkipUntilState {
  active: boolean;
  condition: SkipCondition | null;
  setAt: {
    cycle: number;
    timestamp: string;
    role: string;
  } | null;
  skipCount: number;
  lastCheck: string | null;
}
```

---

## Acceptance Criteria

### Core Functionality

- [ ] **AC-1:** `ada dispatch start` checks skip condition before proceeding
- [ ] **AC-2:** If condition NOT met → exit with code 0 and message "Skipping: waiting for [condition]"
- [ ] **AC-3:** If condition met → clear `skip-until.json` and proceed normally
- [ ] **AC-4:** Skip count increments each time a cycle is skipped
- [ ] **AC-5:** `ada dispatch status` shows active skip condition with details

### CLI Commands

- [ ] **AC-6:** `ada dispatch skip-until --type <type> ...` sets condition
- [ ] **AC-7:** `ada dispatch skip-until --clear` removes condition
- [ ] **AC-8:** `ada dispatch start --force` overrides skip condition for one cycle

### Condition Types

- [ ] **AC-9:** `issue_closed` correctly checks GitHub issue state
- [ ] **AC-10:** `pr_merged` correctly checks GitHub PR state
- [ ] **AC-11:** `label_added` correctly checks issue/PR labels
- [ ] **AC-12:** `github_comment` correctly checks for matching comments
- [ ] **AC-13:** `datetime` correctly compares current time to threshold

### Error Handling

- [ ] **AC-14:** Invalid condition type → helpful error message
- [ ] **AC-15:** GitHub API errors → retry with exponential backoff, then skip cycle
- [ ] **AC-16:** Malformed skip-until.json → reset to inactive state

### Audit Trail

- [ ] **AC-17:** Skip events logged in rotation.json history
- [ ] **AC-18:** Condition clearance logged when auto-triggered
- [ ] **AC-19:** Token savings estimate calculated (optional, nice-to-have)

---

## Edge Cases

### E-1: Condition Set by Role A, Cleared by Role B

**Scenario:** Product sets skip-until, Engineering's cycle triggers clearance.

**Expected:** Skip is cleared, cycle runs, history shows which role triggered clearance.

### E-2: Multiple Skip Conditions

**Scenario:** User wants to wait for BOTH #14 closed AND label "ready".

**Decision:** v1 supports single condition only. v2 can add compound conditions.

### E-3: Condition Already Met When Set

**Scenario:** User sets `skip-until issue_closed #14`, but #14 is already closed.

**Expected:** Warn user, do not set condition. "Issue #14 is already closed. Skip condition not set."

### E-4: Issue/PR Deleted

**Scenario:** Waiting for #14 to close, but #14 is deleted.

**Expected:** Treat as error, clear condition, log warning.

### E-5: GitHub Rate Limit

**Scenario:** Condition check hits GitHub rate limit.

**Expected:** Log warning, skip this cycle (conservative), retry next cycle.

### E-6: Stale Skip Condition

**Scenario:** Skip condition set 30+ days ago, never cleared.

**Expected:** `ada dispatch status` shows warning "Skip condition may be stale (30+ days)".

---

## Implementation Considerations

### Phase 1: Core Infrastructure (Sprint 3+1)

1. Add `skip-until.json` state file to `packages/core/state/`
2. Implement condition checker service in `packages/core/dispatch/`
3. Update `ada dispatch start` to check conditions
4. Add `ada dispatch skip-until` CLI command

### Phase 2: GitHub Conditions (Sprint 3+1)

1. Implement `issue_closed` checker (gh issue view)
2. Implement `pr_merged` checker (gh pr view)
3. Implement `label_added` checker (gh issue/pr labels)
4. Implement `github_comment` checker (gh issue/pr comments)

### Phase 3: Extended Conditions (v2)

1. Implement `datetime` checker
2. Implement `external_api` checker
3. Add compound condition support (AND/OR)

### Files to Create/Modify

```
packages/core/
├── src/
│   ├── state/
│   │   └── skip-until.ts     # State management
│   └── dispatch/
│       └── condition-checker.ts  # Condition evaluation
└── tests/
    └── dispatch/
        └── condition-checker.test.ts

packages/cli/
├── src/
│   └── commands/
│       └── dispatch/
│           └── skip-until.ts  # CLI command
└── tests/
    └── commands/
        └── dispatch/
            └── skip-until.test.ts
```

---

## Success Metrics

| Metric              | Target                                           |
| ------------------- | ------------------------------------------------ |
| Token savings       | 50%+ reduction in holding-pattern cycles         |
| Manual intervention | Zero manual cron disable/enable for known blocks |
| Auto-resume rate    | 100% of cleared conditions resume within 1 cycle |
| User adoption       | 80% of projects with blocks use conditional skip |

---

## Related Issues

- **#237** — This feature (Conditional Dispatch)
- **#155** — SaaS Container (where this will first be used)
- **PayFlow #14** — Original use case (5 holding cycles)

---

## Open Questions

1. **Compound conditions:** Should v1 support AND/OR logic, or single conditions only?
   - **Recommendation:** v1 = single condition, v2 = compound

2. **Cross-repo conditions:** Can ADA repo wait for PayFlow #14?
   - **Recommendation:** v1 = same repo only, v2 = cross-repo with explicit repo reference

3. **Notification on clearance:** Should clearing a skip trigger a notification?
   - **Recommendation:** Yes, add to existing notification channels (Telegram/Discord)

---

_📦 Product (The PM) | Cycle 1097 | Feb 22, 2026_
