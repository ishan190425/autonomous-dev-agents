# 🛑 Stopping ADA — Graceful Shutdown Guide

> **Control your autonomous agents** — stop, pause, resume, and restart safely.

When ADA is running autonomously (via cron, CI, or `ada run --watch`), you need clear ways to halt operations. This guide covers all shutdown scenarios.

---

## Quick Reference

| Scenario                 | Command            | What Happens                           |
| ------------------------ | ------------------ | -------------------------------------- |
| Stop after current cycle | `ada stop`         | Finishes cycle, updates state, exits   |
| Stop immediately         | `ada stop --force` | Exits now, may lose in-progress work   |
| Pause (stop + remember)  | `ada pause`        | Stops, sets paused flag in state       |
| Resume from pause        | `ada resume`       | Clears paused flag, continues rotation |
| Check status             | `ada status`       | Shows if running, paused, or stopped   |

---

## Understanding ADA's Execution Model

ADA has two execution modes:

### 1. Single-Shot Mode (Default)

```bash
ada run
```

Executes **one cycle** and exits. The safest mode — there's nothing to stop because it naturally completes.

### 2. Continuous Mode (Watch)

```bash
ada run --watch
```

Runs cycles continuously with a delay between them. This is where stopping matters.

### 3. External Scheduling (Cron/CI)

When ADA runs via cron or CI, each invocation is single-shot. "Stopping" means disabling the scheduler.

---

## Stopping Methods

### Method 1: Graceful Stop (`ada stop`)

The recommended way to halt ADA:

```bash
ada stop
```

**What happens:**

1. ADA finishes the current cycle (if one is in progress)
2. Memory bank is saved with final state
3. Rotation state is updated
4. Changes are committed and pushed
5. Process exits cleanly

**When to use:** Normal shutdown, end of work session, before making manual changes.

### Method 2: Force Stop (`ada stop --force`)

Immediate termination:

```bash
ada stop --force
```

**What happens:**

1. Process terminates immediately
2. Current cycle may be incomplete
3. Memory bank may not be updated
4. Changes may not be committed

**When to use:** Emergency only — something is going wrong and you need to halt NOW.

**Recovery after force stop:**

```bash
# Check for uncommitted changes
git status

# Check memory bank for consistency
cat agents/memory/bank.md

# Check rotation state
cat agents/state/rotation.json

# Resume when ready
ada run
```

### Method 3: Keyboard Interrupt (Ctrl+C)

During `ada run --watch`:

```bash
ada run --watch
# Press Ctrl+C
```

**Behavior:**

- First Ctrl+C → Graceful stop (finish current cycle)
- Second Ctrl+C → Force stop (immediate exit)

**Tip:** Be patient after the first Ctrl+C. Let the cycle complete.

---

## Pausing and Resuming

### Pause ADA

Stop running but remember where you left off:

```bash
ada pause
```

**What happens:**

1. Current cycle completes
2. A `paused: true` flag is set in `agents/state/rotation.json`
3. Subsequent `ada run` commands check this flag and exit early

**State after pause:**

```json
{
  "current_index": 4,
  "paused": true,
  "paused_at": "2026-02-07T12:00:00Z",
  "pause_reason": "Manual pause via ada pause"
}
```

### Resume ADA

Clear the pause flag and continue:

```bash
ada resume
```

**What happens:**

1. `paused` flag is cleared
2. Rotation continues from where it left off
3. Memory bank is intact

---

## Stopping Scheduled Dispatch

When ADA runs via external scheduler (cron, CI, OpenClaw), stopping means disabling the schedule.

### Cron

```bash
# Edit crontab
crontab -e

# Comment out or remove the ADA line
# */30 * * * * cd /path/to/project && ada run

# Or use ada pause — the cron still runs but exits early
ada pause
```

### GitHub Actions

1. Go to your repo → Actions → ADA Dispatch workflow
2. Click "..." → "Disable workflow"

Or add a pause check to your workflow:

```yaml
- name: Check if paused
  run: |
    if [ "$(jq -r '.paused // false' agents/state/rotation.json)" = "true" ]; then
      echo "ADA is paused, skipping dispatch"
      exit 0
    fi
```

### OpenClaw Cron

Option 1: Remove or disable the cron job in your OpenClaw config.

Option 2: Use the pause flag — the dispatch protocol checks for paused state:

```bash
# In your project directory
ada pause
```

The next dispatch cycle will see `paused: true` and exit without acting.

---

## What Gets Saved on Stop

### Graceful Stop Preserves:

| Component        | Saved? | Location                     |
| ---------------- | ------ | ---------------------------- |
| Memory bank      | ✅ Yes | `agents/memory/bank.md`      |
| Rotation state   | ✅ Yes | `agents/state/rotation.json` |
| Cycle history    | ✅ Yes | In rotation.json `.history`  |
| In-progress work | ✅ Yes | Completed before stop        |
| Git commits      | ✅ Yes | Pushed to remote             |

### Force Stop May Lose:

| Component            | Risk   | Recovery                                   |
| -------------------- | ------ | ------------------------------------------ |
| Memory bank updates  | Medium | Check `git diff`, restore from last commit |
| Rotation advancement | Low    | Manually edit rotation.json if needed      |
| In-progress action   | High   | May need to re-run the cycle               |
| Uncommitted changes  | High   | `git stash` or `git checkout -- .`         |

---

## Checking Status

Always know what state ADA is in:

```bash
ada status
```

Output shows:

```
🤖 ADA Status
━━━━━━━━━━━━━

📍 State: Paused (since 2026-02-07 12:00 EST)
🔄 Cycle: 47
👤 Last Role: ⚙️ Engineering
👤 Next Role: 🛡️ Ops

📊 Memory Bank: 156 lines (OK)
📦 Open Issues: 12 | Open PRs: 2

💡 To resume: ada resume
```

States:

- **Running** — Currently executing a cycle
- **Idle** — No cycle in progress, ready to run
- **Paused** — Manually paused, won't run until resumed
- **Stopped** — Not running (no watch mode active)

---

## Safe Restart Procedure

After stopping ADA for maintenance, updates, or manual work:

### 1. Check Current State

```bash
ada status
git status
cat agents/memory/bank.md | head -20
```

### 2. Make Your Changes

```bash
# Whatever maintenance you need to do
# Edit files, update dependencies, etc.
```

### 3. Commit Changes (if any)

```bash
git add -A
git commit -m "chore(agents): manual maintenance update"
git push
```

### 4. Resume or Start Fresh

```bash
# If paused
ada resume
ada run

# Or just run
ada run
```

---

## Use Cases

### Emergency Stop

Something's going wrong — agent is creating bad issues or making mistakes.

```bash
ada stop --force     # Halt immediately
git status           # Check damage
git log --oneline -5 # Review recent commits
```

### Maintenance Window

Need to deploy changes, update dependencies, or restructure.

```bash
ada pause           # Pause gracefully
# ... do your work ...
ada resume          # Continue when ready
```

### Budget Control

Want to limit API costs for the day/week.

```bash
ada pause           # Stop incurring costs
# Monitor usage, wait for reset
ada resume          # Resume when budget allows
```

### Manual Takeover

Want to do something yourself instead of letting agents handle it.

```bash
ada pause           # Pause autonomous operation
# Do your manual work, commit, push
ada resume          # Let agents continue
```

---

## Related

- [Getting Started](./getting-started.md) — Initial setup and first cycle
- [Issue #31](https://github.com/ishan190425/autonomous-dev-agents/issues/31) — Human-in-the-Loop (HITL can trigger pauses)
- [Issue #46](https://github.com/ishan190425/autonomous-dev-agents/issues/46) — Consultant Mode (read-only alternative)

---

_Last updated: 2026-02-07 | 📦 Product Team | Cycle 120_
