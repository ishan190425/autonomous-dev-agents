# CLI UX Design Review: `ada dispatch` Commands

> Design review of the dispatch subcommand for Issue #112
> **Author:** 🎨 Design (The Architect)
> **Cycle:** 235
> **Date:** 2026-02-09
> **Product Spec:** `docs/product/dispatch-cli-spec.md`
> **Relates to:** Issue #112, #111 (MANDATORY CLI dogfooding)

---

## Overview

This design review complements Product's dispatch CLI spec with UX-focused guidance. The dispatch commands are critical infrastructure — they replace manual file operations in the autonomous agent loop.

## Design Principles

1. **Lifecycle Clarity** — Users should always know cycle state at a glance
2. **Progressive Disclosure** — Simple defaults, power user flags
3. **Consistency** — Match existing `ada memory` and `ada status` patterns
4. **Fail-Safe Messaging** — Errors are actionable, not cryptic

---

## Command UX Specifications

### `ada dispatch start`

#### Output Format (Success)

```
🚀 Cycle 235 Started

  Role:      🎨 Design (The Architect)
  Playbook:  agents/playbooks/design.md
  Memory:    agents/memory/bank.md (v11)

  ┌─────────────────────────────────────────────────┐
  │  Rotation: ceo → growth → research → frontier   │
  │            → product → scrum → qa → engineering │
  │            → ops → design* ← YOU ARE HERE       │
  └─────────────────────────────────────────────────┘

Complete with: ada dispatch complete --action "..."
```

**Design Notes:**

- Role emoji + name + title provides full context
- Rotation visualization shows position in sequence (inspired by `dispatch status` mockup in product spec)
- Clear call-to-action for cycle completion
- Memory bank version shown for debugging staleness

#### Output Format (Already In Progress)

```
⚠️ Cycle Already in Progress

  Active:    Cycle 234 (🛡️ Ops) — started 3m ago
  Expected:  Cycle 235 (🎨 Design)

  A cycle is already running. Options:

    ada dispatch complete --action "..."   # Complete current cycle
    ada dispatch start --force             # Override (dangerous)

  Concurrent cycles corrupt rotation state.
```

**Design Notes:**

- Warning symbol + explanation
- Shows active vs expected role for debugging
- Provides escape hatches with clear risk labels

#### Flags UX

| Flag          | Short | Purpose                          |
| ------------- | ----- | -------------------------------- |
| `--role`      | `-r`  | Force specific role (debug mode) |
| `--dry-run`   | `-n`  | Validate without modifying state |
| `--json`      | `-j`  | Machine-readable output          |
| `--quiet`     | `-q`  | Minimal output (just essentials) |
| `--no-banner` |       | Skip rotation visualization      |

**Quiet Mode:**

```
Cycle 235 started (🎨 Design)
```

---

### `ada dispatch complete`

#### Output Format (Success)

```
✅ Cycle 235 Complete

  Role:      🎨 Design (The Architect)
  Action:    Dispatch CLI UX design review — Issue #112 companion doc
  Outcome:   success
  Duration:  4m 23s

  Git:
    Commit:  chore(agents): cycle 235 — design — dispatch CLI UX review
    Branch:  main
    Pushed:  ✓ origin/main

  Next:      👔 CEO (The Founder)
```

**Design Notes:**

- Green checkmark signals completion
- Duration provides cycle timing data (useful for performance tracking)
- Git section groups commit info
- Clear handoff to next role

#### Output Format (Push Failed)

```
⚠️ Cycle 235 Committed (Push Failed)

  Role:      🎨 Design (The Architect)
  Action:    Dispatch CLI UX design review
  Outcome:   success

  Git:
    Commit:  chore(agents): cycle 235 — design — dispatch CLI UX review
    Branch:  main
    Pushed:  ✗ Failed (network error)

  ┌─────────────────────────────────────────────────┐
  │  Changes are committed locally but not pushed.  │
  │                                                 │
  │  Run: git push origin main                      │
  │  Or:  ada dispatch push                         │
  └─────────────────────────────────────────────────┘

  The cycle is complete. Next role can continue locally.
```

**Design Notes:**

- Partial success acknowledged (commit worked)
- Clear remediation steps
- Reassurance that work is not lost

#### Flags UX

| Flag           | Short | Purpose                                     |
| -------------- | ----- | ------------------------------------------- |
| `--action`     | `-a`  | Required. What was done (quoted string)     |
| `--outcome`    | `-o`  | `success` (default), `partial`, `blocked`   |
| `--reflection` | `-R`  | Reflexion Phase 1b: learning for next cycle |
| `--skip-push`  |       | Commit only, no push (testing)              |
| `--json`       | `-j`  | Machine-readable output                     |
| `--quiet`      | `-q`  | Minimal output                              |

**Quiet Mode:**

```
Cycle 235 complete (success) — pushed
```

#### Action Validation

```
❌ Missing --action flag

  The --action flag describes what you did this cycle.

  Usage:
    ada dispatch complete --action "Reviewed PR #110 — approved"
    ada dispatch complete -a "Wrote docs for memory API"

  This text appears in commit history and rotation logs.
```

---

### `ada dispatch status`

#### Output Format

```
📊 Dispatch Status

  ┌─────────────────────────────────────────────────┐
  │  Cycle:     235                                 │
  │  State:     Ready (no cycle in progress)        │
  │  Current:   🎨 Design (The Architect)           │
  │  Last:      🛡️ Ops — 23m ago (Cycle 234)        │
  │  Next:      👔 CEO (The Founder)                │
  └─────────────────────────────────────────────────┘

  Rotation Order:
    ceo → growth → research → frontier → product →
    scrum → qa → engineering → ops → design*

  History (last 5):
    234  🛡️ Ops     GitHub Templates Infrastructure       23m ago
    233  ⚙️ Eng     PR #110 merge — Reflexion Phase 1a    1h ago
    232  🔍 QA      PR #110 QA Approval                   2h ago
    231  📋 Scrum   Retrospective cycles 221-230          2h ago
    230  📦 Product Dispatch CLI Gap Analysis             3h ago
```

**Design Notes:**

- State box gives quick situational awareness
- Last cycle shows recency (helps debug stale state)
- History preview keeps output reasonable (full history in `--verbose`)
- Asterisk marks current position in rotation

#### In-Progress State

```
📊 Dispatch Status

  ┌─────────────────────────────────────────────────┐
  │  Cycle:     235                                 │
  │  State:     🔄 In Progress                      │
  │  Active:    🎨 Design (The Architect)           │
  │  Started:   4m 23s ago                          │
  │  Next:      👔 CEO (The Founder)                │
  └─────────────────────────────────────────────────┘

  Complete with: ada dispatch complete --action "..."
```

#### Flags UX

| Flag        | Short | Purpose                            |
| ----------- | ----- | ---------------------------------- |
| `--json`    | `-j`  | Machine-readable output            |
| `--verbose` | `-v`  | Show full history (all 10 entries) |
| `--quiet`   | `-q`  | State only, no history             |

**Quiet Mode:**

```
Ready | 🎨 Design | Last: 234 (23m ago)
```

**JSON Mode:**

```json
{
  "cycle": 235,
  "state": "ready",
  "current_role": {
    "id": "design",
    "emoji": "🎨",
    "name": "The Architect",
    "title": "API & System Designer"
  },
  "last": {
    "cycle": 234,
    "role": "ops",
    "action": "GitHub Templates Infrastructure",
    "timestamp": "2026-02-10T05:02:00.000Z",
    "age_ms": 1380000
  },
  "next_role": {
    "id": "ceo",
    "emoji": "👔",
    "name": "The Founder"
  }
}
```

---

## Consistency Patterns

### Emoji Usage

| State       | Emoji | Usage                              |
| ----------- | ----- | ---------------------------------- |
| Success     | ✅    | Cycle complete, push succeeded     |
| Warning     | ⚠️    | Partial success, recoverable error |
| Error       | ❌    | Failure, requires action           |
| In Progress | 🔄    | Cycle running                      |
| Info        | 📊    | Status display                     |
| Start       | 🚀    | Cycle initiated                    |

### Exit Codes

| Code | Meaning                   |
| ---- | ------------------------- |
| 0    | Success                   |
| 1    | Cycle already in progress |
| 2    | Not this role's turn      |
| 3    | Git operation failed      |
| 4    | Missing required flag     |
| 5    | State file corruption     |

### Timing Display

- Under 1 minute: `45s ago`
- Under 1 hour: `23m ago`
- Under 24 hours: `3h ago`
- Over 24 hours: `2d ago`

---

## Accessibility Considerations

1. **Color is not the only indicator** — Emojis + text labels provide meaning
2. **Screen reader friendly** — Avoid ASCII art that doesn't read well
3. **Quiet mode for CI** — Logs without ANSI escapes

---

## Future UX Enhancements

### `ada dispatch push` (Suggested)

Retry failed push from `complete`:

```bash
ada dispatch push
# Pushes last commit if unpushed
```

### `ada dispatch abort` (Suggested)

Abandon an in-progress cycle without completing:

```bash
ada dispatch abort --reason "Blocked on external dependency"
```

### Cycle Timer (Issue #73 alignment)

Show elapsed time during long cycles:

```
🔄 Cycle 235 in progress (4m 23s elapsed)
```

---

## Implementation Recommendations

1. **Reuse `ada status` spinner/box rendering** for consistency
2. **Store cycle start timestamp** in rotation.json for duration tracking
3. **Debounce push retries** (1 retry with 2s delay, then give up)
4. **Lock file for concurrency** (`agents/state/.dispatch.lock`)

---

## Acceptance Criteria (UX-Specific)

- [ ] Output matches design spec formatting
- [ ] All flags have short versions (`-a`, `-j`, `-q`)
- [ ] Exit codes are documented and consistent
- [ ] Quiet mode works for all commands
- [ ] JSON output includes all relevant fields
- [ ] Error messages include remediation steps
- [ ] Timing display uses human-friendly format

---

_🎨 Design (The Architect) — Cycle 235_
