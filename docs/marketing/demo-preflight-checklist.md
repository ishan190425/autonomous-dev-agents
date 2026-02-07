# ✈️ Demo Pre-Flight Checklist

> Final verification before Feb 8-9 recording
> **Author:** Growth (🚀 The Dealmaker)
> **Date:** 2026-02-06
> **Recording:** February 8-9, 2026
> **Status:** 🟢 GO FOR LAUNCH

---

## Executive Summary

All systems verified. Demo recording can proceed as scheduled.

| Area            | Status        | Notes                         |
| --------------- | ------------- | ----------------------------- |
| CLI             | ✅ Ready      | v0.1.0 globally linked        |
| Demo repo       | ✅ Ready      | ~/RIA/ada-demo-project exists |
| UX audit        | ✅ Passed     | Cycle 115, 100% demo-ready    |
| Script          | ✅ Complete   | video-narration-script.md     |
| Prep guide      | ✅ Complete   | demo-recording-prep.md        |
| Terminal config | ✅ Documented | terminal-recording-config.md  |
| Recording tools | ✅ Validated  | recording-tools-validation.md |

---

## Pre-Flight Verification (Completed)

### ✅ CLI Status

```
$ ada --version
0.1.0
```

- CLI globally linked and functional
- All 6 core commands working: init, run, status, config, memory

### ✅ Demo Repo Status

```
~/RIA/ada-demo-project/
├── agents/        # Already initialized (reset before recording)
├── src/           # Sample source code
├── package.json
├── README.md
└── tsconfig.json
```

- Demo project exists and is functional
- Git-tracked for easy resets

### ✅ Test Coverage

- **CLI tests:** 131 passing
- **Core tests:** 299 passing
- **Total:** 430 tests green

### ✅ Documentation Verified

| Document          | Location                                     | Status |
| ----------------- | -------------------------------------------- | ------ |
| Narration script  | docs/marketing/video-narration-script.md     | ✅     |
| Recording prep    | docs/marketing/demo-recording-prep.md        | ✅     |
| Terminal config   | docs/marketing/terminal-recording-config.md  | ✅     |
| Tools validation  | docs/marketing/recording-tools-validation.md | ✅     |
| Pre-demo UX audit | docs/design/pre-demo-ux-audit.md             | ✅     |

---

## Recording Day Checklist (Feb 8)

### Morning Prep (30 min before recording)

- [ ] **Terminal setup**
  - Clean scrollback: `clear && printf '\033[3J'`
  - Set minimal prompt: `export PS1='$ '`
  - Set font size: 18-20pt
  - Theme: Dracula or high-contrast dark
  - Window: 100×30 columns for GIF

- [ ] **Demo repo reset**

  ```bash
  cd ~/RIA/ada-demo-project
  rm -rf agents/
  git checkout -- .
  ```

- [ ] **CLI verification**

  ```bash
  ada --version  # Should show 0.1.0
  ```

- [ ] **Environment check**
  - Quiet room (no fans, AC noise)
  - Notifications off
  - Other windows closed/minimized

### Recording Commands

**GIF Demo (30 seconds):**

```bash
# Scene 1: Init
cd ada-demo-project
ada init

# Scene 2: Run
ada run --dry-run  # Or live if API stable

# Scene 3: Status
ada status
```

**Video Demo (2 minutes):**
Follow `docs/marketing/video-narration-script.md` exactly.

### Post-Recording

- [ ] Save raw files to `docs/marketing/assets/`
- [ ] Back up to cloud storage
- [ ] Verify playback before closing

---

## Current Metrics (Update on Recording Day)

These numbers appear in the video narration. Verify before recording:

| Metric        | Current (Feb 6) | Script Reference      |
| ------------- | --------------- | --------------------- |
| Cycles        | 116             | "X autonomous cycles" |
| PRs merged    | 22              | "X PRs merged"        |
| Tests         | 430             | "X tests passing"     |
| Issues closed | 10              | (optional)            |

**Command to get current metrics:**

```bash
cd ~/RIA/autonomous-dev-agents
cat agents/memory/bank.md | grep -A5 "Project Metrics"
```

---

## Fallback Procedures

### If `ada run` fails (API issues)

Use `--dry-run` flag:

```bash
ada run --dry-run
```

Adjust narration: "For this demo, we're showing dry-run mode to illustrate the flow."

### If demo repo has issues

Option A: Reset completely

```bash
rm -rf ~/RIA/ada-demo-project/agents/
```

Option B: Use ADA repo itself (less ideal)

```bash
cd ~/RIA/autonomous-dev-agents
```

### If time runs short

Priority order:

1. **GIF (required)** — 30 seconds, Twitter/GitHub
2. **Video (stretch)** — 2 minutes, full narration

GIF alone meets Go/No-Go SHOULD criteria.

---

## Contacts

| Role        | Responsibility               |
| ----------- | ---------------------------- |
| Growth      | Recording, editing, delivery |
| Design      | UX review if needed          |
| Engineering | CLI troubleshooting          |
| Ops         | API/infra issues             |

---

## Recording Schedule

### Day 1: Feb 8 (Saturday) — GIF Focus

| Time     | Task                         |
| -------- | ---------------------------- |
| 10:00 AM | Environment prep             |
| 10:30 AM | GIF recording (3-5 takes)    |
| 12:00 PM | Review, select best take     |
| 2:00 PM  | Edit and trim                |
| 4:00 PM  | Export, test at Twitter size |

### Day 2: Feb 9 (Sunday) — Video Focus (Stretch)

| Time     | Task                           |
| -------- | ------------------------------ |
| 10:00 AM | Video recording with narration |
| 12:00 PM | Review takes                   |
| 2:00 PM  | Rough cut assembly             |
| 4:00 PM  | Polish and export              |

---

## Sign-Off

**Growth (🚀 The Dealmaker)** confirms:

- ✅ All pre-flight checks passed
- ✅ Demo repo functional
- ✅ CLI v0.1.0 ready
- ✅ Documentation complete
- ✅ Fallback procedures defined
- ✅ Recording schedule confirmed

**Status: GO FOR LAUNCH** 🚀

---

## Cross-References

- **Issue #39:** Demo Asset Production Plan
- **Issue #26:** v1.0-alpha Launch Coordination
- **docs/design/pre-demo-ux-audit.md:** UX sign-off
- **docs/business/go-no-go-criteria.md:** Launch criteria

---

_🚀 Growth | Cycle 117 | Final pre-flight for Feb 8-9 demo recording_
