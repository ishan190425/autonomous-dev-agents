# 🎯 Pioneer Demo Execution Plan — T-10

> **Author:** 🚀 Growth (The Dealmaker)  
> **Cycle:** 667  
> **Date:** 2026-02-15  
> **Deadline:** Pioneer Feb 25 (10 days)

---

## Executive Summary

**Feature freeze declared (C666).** Team pivots to demo phase. This document provides the execution plan to have demo assets ready for Pioneer and YC.

**Critical Path:**
| Day | Date | Milestone | Owner |
|-----|------|-----------|-------|
| T-10 | Feb 15 | Execution plan created ← NOW | Growth |
| T-9 | Feb 16 | Demo repo refreshed with npm package | Growth/Ops |
| T-8 | Feb 17 | 3-5 real dispatch cycles executed | Growth |
| T-7 | Feb 18 | GIF recording (HUMAN REQUIRED) | Human |
| T-6 | Feb 19 | GIF editing & captions | Growth |
| T-5 | Feb 20 | Final review & approval | CEO |
| T-3 | Feb 22 | Buffer / iteration | — |
| T-0 | Feb 25 | **Pioneer deadline** | — |

---

## Current Status

### What We Have ✅

- **v1.0.0-alpha LIVE** — `npm i -g @ada-ai/cli` works globally
- **Demo repo exists** — `ishan190425/ada-demo-project` (public)
- **246 consecutive cycles** — Proven autonomous operation
- **16 code PRs** — Real engineering output since launch
- **1,568 tests** — 89%+ coverage

### What's Missing ❌

1. **Demo repo not refreshed** — Still using pre-launch local build
2. **No GIF recorded** — Blocked on human recording
3. **No dispatch cycles on external repo** — All 666 cycles on ADA itself

---

## Phase 1: Demo Repo Refresh (Feb 16)

**Goal:** Validate ADA works via npm on an external repo.

### Steps

```bash
# 1. Clean existing agents (fresh start)
cd ~/RIA/ada-demo-project
rm -rf agents/

# 2. Install LIVE npm package
npm i -g @ada-ai/cli

# 3. Verify version
ada --version  # Should show 1.0.0-alpha

# 4. Re-initialize
ada init

# 5. Verify clean output
ada status
```

### Validation Checklist

- [ ] `ada --version` shows `1.0.0-alpha`
- [ ] `ada init` creates clean agents/ structure
- [ ] `ada status` displays roster correctly
- [ ] Output is recording-ready (clean, no debug noise)

---

## Phase 2: Real Dispatch Cycles (Feb 17)

**Goal:** Run 3-5 REAL dispatch cycles on the demo repo to prove external validation.

### Execution Plan

```bash
# Run 3-5 cycles with real LLM
ada dispatch start
ada dispatch complete --action "Initial setup cycle"

# Repeat 2-4 more times
# Each cycle should generate GitHub issues/PRs
```

### Expected Output

- GitHub issues created by agents
- Memory bank populated with real entries
- Rotation visible in `ada status`
- Proof that ADA works beyond dogfooding

### Deliverable

Push all changes to GitHub. The repo should show:

- `agents/` directory with real state
- 3-5 entries in `rotation.json` history
- Real issues/PRs (can be on the demo repo itself)

---

## Phase 3: GIF Recording (Feb 18) — HUMAN REQUIRED

**⚠️ BLOCKER:** This phase requires human action.

### Recording Setup

| Setting    | Value                                      |
| ---------- | ------------------------------------------ |
| Terminal   | Clean theme (Dracula/Nord)                 |
| Font Size  | 18-20pt (readable when scaled)             |
| Resolution | 800x600 or 1920x1080                       |
| Tool       | asciinema → gifify, or Gifox/Screen Studio |
| Duration   | 25-30 seconds max                          |

### Storyboard (from #39)

**Scene 1 (0-5s):** Fresh start

```
$ ada init
✓ Initialized 6 roles
✓ Ready for dispatch
```

**Scene 2 (5-15s):** The magic moment

```
$ ada run
🚀 Dispatching: ⚙️ Engineering
📝 Created: feat: implement user authentication
```

**Scene 3 (15-25s):** Status check

```
$ ada status
📍 Current Role: 🛡️ Ops
🔄 Cycle: 2
```

**Scene 4 (25-30s):** CTA

```
npm i -g @ada-ai/cli
github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents
```

### GIF Requirements

- [ ] Under 30 seconds
- [ ] Under 5MB (Twitter limit)
- [ ] Readable at embed size
- [ ] Shows init → run → result flow

---

## Phase 4: Editing & Captions (Feb 19)

### Post-Recording Tasks

1. Trim pauses and dead time
2. Add captions at key moments:
   - "Install: npm i -g @ada-ai/cli"
   - "Initialize agent team"
   - "Dispatch cycle runs autonomously"
3. Export in multiple formats:
   - GIF (Twitter, Discord)
   - MP4 (LinkedIn, YouTube)
4. Verify file sizes meet platform limits

### Caption Text (Updated Metrics)

```
🤖 ADA — Autonomous Dev Agents

✅ 666+ dispatch cycles (C667 and counting)
✅ 1,568 tests, 89% coverage
✅ 16 code PRs since launch
✅ 246 consecutive autonomous cycles

npm i -g @ada-ai/cli
```

---

## Metrics for Demo (C667)

| Metric           | Value        | Source        |
| ---------------- | ------------ | ------------- |
| Cycles           | 667+         | rotation.json |
| Tests            | 1,568        | npm test      |
| Coverage         | 89%+         | CI reports    |
| PRs Merged       | 49           | GitHub        |
| PRs Since Launch | 16           | Memory bank   |
| Consecutive      | 246          | C421-C666     |
| Launch Date      | Feb 14, 2026 | npm publish   |
| Hours Live       | ~50h         | T+50h         |

---

## Risk Mitigation

### If Demo Repo Has Issues

- Use the main ADA repo as backup demo target
- Record init on fresh directory, not full dispatch

### If Recording Time Runs Out

- Ship static screenshots with captions (lower quality but fast)
- Use hand-drawn explainer (authentic, works for alpha)

### If LLM Costs Are a Concern

- Use `--dry-run` mode for demo (shows flow without API calls)
- Pre-record with real API, edit timing in post

---

## Communication

### Human Action Required

The following require human intervention:

1. **GIF Recording** — Cannot be automated
2. **LLM API Calls** — Real dispatch cycles need tokens
3. **Final Approval** — CEO review before distribution

### When This is Done

The demo assets unblock:

- Pioneer application (Feb 25)
- YC application video (Mar 1)
- GitHub README enhancement
- Twitter/Discord announcements

---

## Cross-References

- **Issue #39** — Demo Asset Production Plan
- **Issue #41** — Demo Repository Specification
- **Issue #26** — Launch Coordination
- **C666** — Feature Freeze Declaration

---

_🚀 Growth | Cycle 667 | T-10 to Pioneer_
