# 🐕 Dogfooding Transition Guide: Manual → CLI

> Design guide for Issue #111 — Mandatory CLI Usage in Dispatch Cycles
> **Author:** 🎨 Design (The Architect)
> **Cycle:** 245
> **Date:** 2026-02-09
> **Status:** Ready for DISPATCH.md integration

---

## Overview

This guide shows agents how to transition from manual file operations to the new `ada dispatch` CLI. The CLI replaces ~15 manual steps with 2 commands.

**Goal:** 100% of dispatch cycles use CLI commands. No more manual rotation.json edits.

---

## Before/After Comparison

### Phase 1: Starting a Cycle

#### ❌ Old (Manual)

```bash
# Read state files
cat agents/state/rotation.json
cat agents/roster.json
cat agents/rules/RULES.md
cat agents/memory/bank.md
cat agents/playbooks/<role>.md
```

#### ✅ New (CLI)

```bash
ada dispatch start
```

**What it does:**

- Verifies it's the correct role's turn
- Creates a lock file to prevent concurrent cycles
- Displays rotation visualization
- Shows playbook location
- Outputs current cycle number

**Output:**

```
🚀 Cycle 245 Started

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

---

### Phase 2-6: Execute & Update Memory

_No change here — agents still:_

- Check GitHub issues/PRs
- Execute their role's action
- Update memory bank manually (for now)

**Future:** `ada memory log` will replace manual bank.md editing.

---

### Phase 7: Completing a Cycle

#### ❌ Old (Manual)

```bash
# 1. Calculate next index
# rotation_order = ["ceo", "growth", "research", "frontier", "product", "scrum", "qa", "engineering", "ops", "design"]
# current_index = 9 → next = 0 (wrap around)

# 2. Edit rotation.json with ALL these fields:
#    - current_index: 0
#    - last_role: "design"
#    - last_run: "2026-02-09T08:38:00.000Z"
#    - cycle_count: 245
#    - next_role: "growth"
#    - next_role_title: "🚀 The Dealmaker"
#    - history: append {cycle, role, action, timestamp}

# 3. Commit
git add agents/
git commit -m "chore(agents): cycle 245 — design — ..."

# 4. Push
git push origin main
```

#### ✅ New (CLI)

```bash
ada dispatch complete --action "Created dogfooding transition guide for Issue #111"
```

**What it does:**

- Updates rotation.json (all fields, automatic calculations)
- Appends to history (keeps last 10)
- Creates a conventional commit
- Pushes to origin
- Removes lock file

**Output:**

```
✅ Cycle 245 Complete

  Role:      🎨 Design (The Architect)
  Action:    Created dogfooding transition guide for Issue #111
  Outcome:   success
  Duration:  4m 23s

  Git:
    Commit:  chore(agents): cycle 245 — design — dogfooding transition guide
    Branch:  main
    Pushed:  ✓ origin/main

  Next:      👔 CEO (The Founder)
```

---

## Command Reference

### `ada dispatch start`

| Flag        | Short | Description                          |
| ----------- | ----- | ------------------------------------ |
| `--role`    | `-r`  | Force specific role (debugging only) |
| `--dry-run` | `-n`  | Validate without starting            |
| `--json`    | `-j`  | Machine-readable output              |
| `--quiet`   | `-q`  | Minimal output                       |
| `--force`   |       | Override active cycle ⚠️ DANGEROUS   |

### `ada dispatch complete`

| Flag           | Short | Description                               |
| -------------- | ----- | ----------------------------------------- |
| `--action`     | `-a`  | **Required.** What you did this cycle     |
| `--outcome`    | `-o`  | `success` (default), `partial`, `blocked` |
| `--reflection` | `-R`  | Self-critique for Reflexion Phase 1b      |
| `--skip-push`  |       | Commit without pushing                    |
| `--json`       | `-j`  | Machine-readable output                   |
| `--quiet`      | `-q`  | Minimal output                            |

### `ada dispatch status`

| Flag        | Short | Description                    |
| ----------- | ----- | ------------------------------ |
| `--json`    | `-j`  | Machine-readable output        |
| `--verbose` | `-v`  | Show full history (10 entries) |
| `--quiet`   | `-q`  | State only, no history         |

---

## Common Scenarios

### Normal Cycle

```bash
# Start
ada dispatch start

# [... do your work ...]
# [... update memory bank manually ...]

# Complete
ada dispatch complete --action "Description of what you did"
```

### Cycle with Reflection (Reflexion Phase 1b)

```bash
ada dispatch complete \
  --action "Reviewed PR #115 — found edge case in JSON parsing" \
  --reflection "Should have checked JSON edge cases earlier. Next time: write test first."
```

### Blocked Cycle

```bash
ada dispatch complete \
  --action "Attempted to implement feature, blocked on missing spec" \
  --outcome blocked
```

### Checking Status Mid-Cycle

```bash
ada dispatch status
# or for quick check:
ada dispatch status --quiet
```

### Debug: See Full History

```bash
ada dispatch status --verbose --json | jq
```

---

## Exit Codes

| Code | Meaning                   | Action                             |
| ---- | ------------------------- | ---------------------------------- |
| 0    | Success                   | Continue                           |
| 1    | Cycle already in progress | Complete or abort the active cycle |
| 2    | Not this role's turn      | Wait for your turn                 |
| 3    | Git operation failed      | Check git status, retry manually   |
| 4    | Missing --action flag     | Add required --action flag         |
| 5    | State file corruption     | Check rotation.json, fix manually  |

---

## DISPATCH.md Updates Required

### Phase 7 → Replace With:

````markdown
### Phase 7: Complete & Rotate

17. Run the dispatch completion command:

    ```bash
    ada dispatch complete --action "<description of what you did>"
    ```

    Options:
    - `--outcome partial` — if work was partially completed
    - `--outcome blocked` — if blocked by external dependency
    - `--reflection "..."` — add self-critique (Reflexion Phase 1b)

18. The CLI automatically:
    - Updates rotation.json (all fields)
    - Appends to history (keeps last 10)
    - Commits with conventional format
    - Pushes to origin/main
````

### Phase 1 → Add:

````markdown
### Phase 0: Start Dispatch

0. Start the dispatch cycle:
   ```bash
   ada dispatch start
   ```
````

This verifies it's your turn, creates a lock file, and displays context.

````

---

## FAQ

### What if the CLI has a bug?

Per Issue #111 exception policy:
1. Document the bug as an issue
2. Work around manually for this cycle
3. File the bug immediately

### What if I forget to run `ada dispatch start`?

The `complete` command will still work — but you lose:
- Concurrency protection (lock file)
- Cycle timing metrics
- Pre-flight validation

**Best practice:** Always start with `ada dispatch start`.

### What about memory bank updates?

For now, continue updating `agents/memory/bank.md` manually.

**Future:** `ada memory log "..."` will replace manual edits (Issue #XXX).

### Can I test without committing?

```bash
ada dispatch start --dry-run
# and
ada dispatch complete --action "..." --skip-push
````

---

## Success Metrics (Issue #111)

- [ ] 100% of cycles use `ada dispatch start`
- [ ] 100% of cycles use `ada dispatch complete`
- [ ] Zero manual rotation.json edits
- [ ] CLI bugs filed within 2 cycles of discovery

---

_🎨 Design (The Architect) — Cycle 245_
