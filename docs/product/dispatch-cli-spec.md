# Product Spec: `ada dispatch` CLI Subcommand

> **Status:** Draft
> **Priority:** P0 — Blocks Issue #111 (MANDATORY dogfooding)
> **Author:** 📦 Product | Cycle 230
> **Related:** Issue #111 (MANDATORY CLI usage), Issue #83 (Dogfooding)

---

## Overview

Issue #111 mandates that all dispatch cycles use `ada` CLI commands instead of manual file operations. However, the required `dispatch` subcommand doesn't exist yet. This spec defines the missing commands.

## User Story

**As an** autonomous agent running a dispatch cycle,
**I want** CLI commands for lifecycle management,
**So that** cycles are consistent, trackable, and self-validating.

---

## Commands

### `ada dispatch start`

**Purpose:** Initialize a dispatch cycle context.

```bash
ada dispatch start [--role <role_id>]
```

**Behavior:**

1. Loads rotation state and determines current role
2. Validates it's this role's turn (unless `--role` forces)
3. Loads the role's playbook as context
4. Outputs current cycle number and role info
5. Sets a "cycle in progress" flag (prevents concurrent cycles)

**Output:**

```
🚀 Dispatch cycle 230 started
   Role: 📦 The PM (Product Lead)
   Playbook: agents/playbooks/product.md
   Memory Bank: agents/memory/bank.md (v10)

Ready for action. End with: ada dispatch complete
```

**Flags:**

- `--role <id>` — Force a specific role (for debugging)
- `--json` — Output as JSON for programmatic use
- `--dry-run` — Validate without starting

---

### `ada dispatch complete`

**Purpose:** Finalize a dispatch cycle, update rotation state, and commit changes.

```bash
ada dispatch complete --action "<description>" [--outcome <success|partial|blocked>]
```

**Behavior:**

1. Validates a cycle is in progress
2. Updates `rotation.json`:
   - Increments `current_index` (wraps at rotation end)
   - Sets `last_role`, `last_run`, `next_role`, `next_role_title`
   - Increments `cycle_count`
   - Appends to `history` (keeps last 10)
3. If `--reflection` provided, stores reflection in rotation history
4. Stages all changes in `agents/` directory
5. Creates conventional commit: `chore(agents): cycle {N} — {role} — {action}`
6. Pushes to origin

**Output:**

```
✅ Cycle 230 complete
   Role: 📦 The PM
   Action: Gap analysis for Issue #111 — dispatch CLI doesn't exist yet
   Outcome: success

   Committed: chore(agents): cycle 230 — product — gap analysis
   Pushed to origin/main

   Next up: 📋 The Coordinator (Scrum Master)
```

**Flags:**

- `--action "<text>"` — Required. Description of what was done
- `--outcome <type>` — Optional. `success` (default), `partial`, `blocked`
- `--reflection "<text>"` — Optional. Reflection for Reflexion Phase 1b
- `--skip-push` — Commit but don't push (for testing)
- `--json` — Output as JSON

---

### `ada dispatch status`

**Purpose:** Show current dispatch state without starting a cycle.

```bash
ada dispatch status
```

**Output:**

```
📊 Dispatch Status

Cycle in progress: No
Last cycle: 229 (🌌 Frontier) — 19m ago
Current role: 📦 Product (The PM)
Next role: 📋 Scrum (The Coordinator)

Rotation: ceo → growth → research → frontier → product* → scrum → qa → engineering → ops → design
```

---

## Integration with Reflexion (Issue #108)

When `--reflection` is provided to `dispatch complete`, the reflection is stored in `rotation.json` as per the Reflexion Phase 1a spec (PR #110). This enables:

- Phase 1b: Reflection consumption in dispatch context
- Self-improving agent patterns

---

## Implementation Notes

### Location

- New file: `packages/cli/src/commands/dispatch.ts`
- Exports: `dispatchStartCommand`, `dispatchCompleteCommand`, `dispatchStatusCommand`

### Dependencies

- `@ada/core`: Rotation state management (already exists)
- `simple-git`: Git operations (already in use)

### Error Cases

- Cycle already in progress → Error with instructions
- Not this role's turn (without `--role`) → Warning + confirm
- Git dirty state → Warn but allow (agent cycles often have uncommitted work)
- Push fails → Retry once, then error with manual instructions

---

## Gap Analysis (Current State)

| Command                 | Exists | Status                          |
| ----------------------- | ------ | ------------------------------- |
| `ada status`            | ✅     | Works — shows rotation state    |
| `ada memory list`       | ✅     | Works — lists recent entries    |
| `ada memory search`     | ✅     | Works — semantic search         |
| `ada memory log`        | ❌     | **MISSING** — see separate spec |
| `ada dispatch start`    | ❌     | **MISSING** — this spec         |
| `ada dispatch complete` | ❌     | **MISSING** — this spec         |

---

## Acceptance Criteria

- [ ] `ada dispatch start` initializes cycle context
- [ ] `ada dispatch complete` updates rotation, commits, pushes
- [ ] Concurrent cycle prevention works
- [ ] Conventional commit format enforced
- [ ] `--json` flag for programmatic use
- [ ] Error handling for common failure cases
- [ ] Tests for all commands (Vitest)

---

## Rollout

**Phase 1:** Implement commands (Engineering)
**Phase 2:** Update DISPATCH.md to require CLI usage (Ops)
**Phase 3:** Update all playbooks with CLI examples (Product/Ops)
**Phase 4:** Track CLI usage in metrics (Engineering)

---

_Created by 📦 Product | Cycle 230_
