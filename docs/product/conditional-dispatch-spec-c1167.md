# Conditional Dispatch Specification (C1167)

> **Issue:** #237 — Conditional Dispatch: Skip cycles until external condition is met
> **Author:** 📦 Product Lead
> **Created:** 2026-02-23
> **Priority:** P2
> **Sprint:** Sprint 4 (tentative)

---

## Executive Summary

When projects are blocked on external dependencies (human deploys, PR reviews, external API changes), dispatch cycles burn tokens without progress. Conditional dispatch adds a `skipUntil` directive that pauses cycles until an external condition is met, then automatically resumes.

## User Stories

### US1: Developer with Human-Gated Deploy

**As a** developer using ADA in a repo blocked on a human deploy,
**I want** cycles to automatically pause and resume when the deploy happens,
**So that** I don't waste API credits on "holding pattern" cycles.

### US2: Team Lead Managing Multiple Projects

**As a** team lead with multiple ADA-enabled repos,
**I want** blocked projects to self-pause without manual cron management,
**So that** I can manage many projects without constant intervention.

### US3: Solo Developer on Budget

**As a** solo developer with limited API budget,
**I want** ADA to skip cycles when it knows it can't make progress,
**So that** I spend tokens only on productive work.

---

## Acceptance Criteria

### AC1: Configuration Format

- [ ] `skipUntil` directive can be defined in `agents/dispatch-config.yaml` (new file)
- [ ] Supports multiple condition types (see Condition Types below)
- [ ] Falls back gracefully if config file missing (no skip behavior)
- [ ] Validates condition syntax on `ada dispatch start`

### AC2: Condition Types (MVP)

| Type             | Trigger                           | Example                    |
| ---------------- | --------------------------------- | -------------------------- |
| `issue_closed`   | Issue transitions to closed state | Wait for #200 to close     |
| `pr_merged`      | PR is merged to target branch     | Wait for #250 merge        |
| `label_added`    | Label appears on issue/PR         | Wait for "deployed" label  |
| `label_removed`  | Label removed from issue/PR       | Wait for "blocked" removal |
| `github_comment` | Comment by specific author        | Human confirms action      |

### AC3: CLI Behavior

```bash
# When skipUntil condition NOT met:
$ ada dispatch start
⏸️  Cycle skipped: Waiting for #200 to close
    Condition: issue_closed(#200)
    Checked at: 2026-02-23T06:54:00Z

# Exits with code 0 (not an error, intentional skip)

# When skipUntil condition IS met:
$ ada dispatch start
✅ Skip condition cleared: #200 is closed
🚀 Cycle 1234 Started
   ...
```

### AC4: Skip Logging

- [ ] Skipped cycles logged to `agents/memory/skip-log.json`
- [ ] Format: `{ timestamp, condition, reason, cycleWouldBe }`
- [ ] Useful for auditing "why no cycles for 3 hours?"

### AC5: Auto-Clear

- [ ] When condition is met, `skipUntil` is cleared from config
- [ ] Clear action committed: `chore(agents): clear skipUntil — #200 closed`
- [ ] Resume happens immediately (no manual intervention)

### AC6: Manual Override

- [ ] `ada dispatch start --force` bypasses skipUntil
- [ ] Logs warning: "Bypassing skipUntil condition (--force)"
- [ ] Does NOT clear the condition (next cycle will check again)

---

## Technical Design

### Configuration Schema

```yaml
# agents/dispatch-config.yaml
skipUntil:
  condition: issue_closed  # condition type
  target: 200              # issue/PR number

# Or with optional fields:
skipUntil:
  condition: github_comment
  target: 155
  author: ishan190425      # required for comment condition
  pattern: "deploy.*done"  # optional: regex to match comment text

# Or for labels:
skipUntil:
  condition: label_added
  target: 155
  label: "ready-to-deploy"
```

### Condition Checker Interface

```typescript
// packages/core/src/dispatch/conditions.ts

interface SkipCondition {
  condition:
    | 'issue_closed'
    | 'pr_merged'
    | 'label_added'
    | 'label_removed'
    | 'github_comment';
  target: number; // Issue or PR number
  author?: string; // For github_comment
  label?: string; // For label_added/label_removed
  pattern?: string; // Regex for comment matching
}

interface ConditionResult {
  met: boolean;
  reason: string; // Human-readable explanation
  clearedAt?: string; // ISO timestamp if just cleared
}

async function checkCondition(
  condition: SkipCondition,
  github: GitHubClient
): Promise<ConditionResult>;
```

### Integration Points

1. **`ada dispatch start`:** Check conditions before acquiring lock
2. **`ada dispatch status`:** Show current skipUntil if set
3. **Exit codes:** 0 for intentional skip, 1+ for errors

### Skip Log Schema

```json
// agents/memory/skip-log.json
{
  "skips": [
    {
      "timestamp": "2026-02-23T06:54:00Z",
      "condition": { "condition": "issue_closed", "target": 200 },
      "reason": "#200 is still open",
      "cycleWouldBe": 1167
    }
  ],
  "lastClear": {
    "timestamp": "2026-02-23T12:00:00Z",
    "condition": { "condition": "issue_closed", "target": 200 },
    "clearedBy": "#200 closed by ishan190425"
  }
}
```

---

## UX Considerations

### Setting skipUntil

**Option A: Manual config edit**

```yaml
# User edits agents/dispatch-config.yaml directly
skipUntil:
  condition: issue_closed
  target: 200
```

**Option B: CLI command (preferred)**

```bash
# More ergonomic for users
$ ada dispatch pause --until "issue:200:closed"
⏸️  Dispatch paused until #200 closes

$ ada dispatch pause --until "pr:250:merged"
⏸️  Dispatch paused until PR #250 merges

$ ada dispatch pause --until "label:155:deployed"
⏸️  Dispatch paused until #155 has "deployed" label
```

**Recommendation:** Ship CLI command (`ada dispatch pause`) as the primary interface. Config file is the underlying storage.

### Clearing skipUntil

1. **Automatic (default):** When condition met, auto-clear + commit
2. **Manual:** `ada dispatch resume` clears skipUntil immediately
3. **Force override:** `ada dispatch start --force` (one-time bypass)

### Status Display

```bash
$ ada dispatch status
📊 Dispatch Status

  Current Index:  4 (product)
  Cycle Count:    1166
  Last Run:       2026-02-23 06:33:00 EST

  ⏸️  PAUSED: Waiting for #200 to close
      Set at: 2026-02-23 05:00:00 EST
      Skipped: 3 cycles

  Use: ada dispatch resume  (to clear pause)
       ada dispatch start --force  (one-time bypass)
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Sprint 4)

- [ ] `SkipCondition` TypeScript types in `@ada-ai/core`
- [ ] `checkCondition()` function with GitHub API calls
- [ ] `dispatch-config.yaml` parser/validator
- [ ] Skip logging to `skip-log.json`

### Phase 2: CLI Integration (Sprint 4)

- [ ] `ada dispatch start` condition check before lock
- [ ] `ada dispatch status` shows skipUntil state
- [ ] `--force` flag to bypass
- [ ] Exit code 0 for intentional skip

### Phase 3: Ergonomic Commands (Sprint 5)

- [ ] `ada dispatch pause --until <condition>`
- [ ] `ada dispatch resume`
- [ ] Auto-clear + commit when condition met

### Phase 4: Advanced Conditions (Post-MVP)

- [ ] `all_of:` — Multiple conditions (AND)
- [ ] `any_of:` — Multiple conditions (OR)
- [ ] `time:` — Skip until specific time
- [ ] `webhook:` — Skip until external webhook ping

---

## Dependencies

- **GitHub API:** Condition checks require authenticated API calls
- **#185 Error Handling:** Use structured errors for condition failures
- **#186 Structured Logging:** Log condition checks in JSON format

---

## Success Metrics

| Metric           | Target                                                 | Measurement               |
| ---------------- | ------------------------------------------------------ | ------------------------- |
| Token savings    | 50%+ reduction in blocked-project cycles               | Compare pre/post skip-log |
| Auto-resume rate | >90% conditions auto-clear without manual intervention | skip-log.json stats       |
| User adoption    | 3+ projects using skipUntil within 30 days             | GitHub search             |
| UX satisfaction  | <5 commands to set up conditional dispatch             | User testing              |

---

## Open Questions

1. **Q:** Should skipUntil be per-role or global?
   **Tentative:** Global (whole dispatch pauses). Per-role adds complexity without clear benefit.

2. **Q:** What happens if condition check fails (API error)?
   **Tentative:** Proceed with dispatch (fail-open). Log warning. Don't block on transient API issues.

3. **Q:** Should skipped cycles count toward compression triggers?
   **Tentative:** No. Skipped cycles didn't produce memory updates, so compression timing resets.

---

## Related Issues

- **#237** — This issue (Conditional Dispatch proposal)
- **#155** — SaaS Container (would benefit from skip-until-deployed)
- **#200** — Waitlist (blocked example)
- **PayFlow #14** — Original motivation (5 consecutive holding cycles)

---

_Spec created by 📦 Product Lead — C1167_
