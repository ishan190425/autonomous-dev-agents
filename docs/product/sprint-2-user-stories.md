# Sprint 2 User Stories — Feature Requirements

> **Author:** 📦 Product Lead  
> **Created:** Cycle 370 (2026-02-10)  
> **Sprint 2:** 2026-02-28 → 2026-03-14  
> **References:** Sprint 2 Planning (C360), Engineering Readiness (C363), Frontier Readiness (C369)

---

## Overview

This document translates Sprint 2 features into formal user stories with testable acceptance criteria. These stories are the contract between Product and Engineering — when all acceptance criteria pass, the feature is done.

**Story Format:**

- **As a** [persona]
- **I want** [capability]
- **So that** [benefit]
- **Acceptance Criteria:** [testable conditions]

---

## Feature 1: Terminal Mode (#125)

### US-125-1: Basic Shell Command Execution

**As a** developer running ADA in a terminal-based workflow  
**I want** to execute shell commands through `ada run --mode=terminal`  
**So that** ADA can capture and learn from my development activity

**Acceptance Criteria:**

- [ ] `ada run --mode=terminal` enters terminal mode without error
- [ ] User can type shell commands (e.g., `npm test`, `git status`)
- [ ] Commands execute in the current working directory
- [ ] Command output (stdout/stderr) is displayed to the user
- [ ] Exit codes are captured correctly (success vs failure)
- [ ] Ctrl+C gracefully exits terminal mode
- [ ] 5+ integration tests cover happy path

**Dependencies:** None (foundational)  
**Size:** M (3-5 cycles)  
**Sprint Week:** Week 1

---

### US-125-2: Shell Detection and Environment Capture

**As a** developer using bash, zsh, or fish  
**I want** ADA to detect my shell environment automatically  
**So that** commands work correctly regardless of my shell configuration

**Acceptance Criteria:**

- [ ] Detects current shell (bash, zsh, fish, sh)
- [ ] Inherits user's shell environment ($PATH, aliases from .bashrc/.zshrc)
- [ ] Works in both interactive and non-interactive contexts
- [ ] Fallback to `/bin/sh` if detection fails (with warning)
- [ ] `shell-detector.ts` tests pass (per C343 scaffolding)

**Dependencies:** US-125-1  
**Size:** S (1-2 cycles)  
**Sprint Week:** Week 1

---

### US-125-3: Signal Collection for Heat Scoring

**As a** developer executing commands through terminal mode  
**I want** ADA to capture signals from my activity  
**So that** the heat scoring system can identify important files and patterns

**Acceptance Criteria:**

- [ ] Captures file paths from command arguments (e.g., `vim src/index.ts` → `src/index.ts`)
- [ ] Captures file paths from test output (e.g., failed tests → failing files)
- [ ] Captures git diff file lists on commits
- [ ] Captures stderr/stdout mentions of file paths
- [ ] Signals stored in structured format (JSON or heat signal schema)
- [ ] `signal-collector.ts` tests pass (per C343 scaffolding)
- [ ] At least 3 signal types collected per 10 commands (average)

**Dependencies:** US-125-1, US-125-2  
**Size:** M (3-5 cycles)  
**Sprint Week:** Week 1-2

---

### US-125-4: Dispatch Integration

**As a** developer using ADA agents  
**I want** dispatch cycles to trigger shell commands in terminal mode  
**So that** agents can execute real development tasks (tests, builds, git operations)

**Acceptance Criteria:**

- [ ] Agents can request shell command execution in terminal mode
- [ ] Command results (output, exit code) returned to agent
- [ ] Timeout handling: commands killed after configurable limit (default 5 min)
- [ ] Permission model: agent requests are logged before execution
- [ ] Integration with existing `ada run` workflow

**Dependencies:** US-125-1, US-125-2  
**Size:** M (3-5 cycles)  
**Sprint Week:** Week 2

---

## Feature 2: Heat Scoring (#118)

### US-118-1: Heat Signal Storage

**As a** developer or agent generating activity  
**I want** heat signals to be stored persistently  
**So that** the scoring system can analyze patterns over time

**Acceptance Criteria:**

- [ ] Heat signals stored in `agents/memory/heat/` directory
- [ ] JSONL format (one signal per line) for append-only writes
- [ ] Signal schema includes: timestamp, signal_type, file_path, source, weight
- [ ] Storage handles concurrent writes safely (file locking or append-only)
- [ ] Retention: signals older than 30 days auto-archived (configurable)
- [ ] `ada heat status` shows signal count and date range

**Dependencies:** US-125-3  
**Size:** M (3-5 cycles)  
**Sprint Week:** Week 2

---

### US-118-2: Heat Score Calculation

**As a** ADA user  
**I want** to see heat scores for files and directories  
**So that** I understand which parts of my codebase have the most activity

**Acceptance Criteria:**

- [ ] `ada heat show` displays heat scores for top 10 files
- [ ] `ada heat show --path=src/` filters to specific directory
- [ ] Score formula: weighted sum of recent signals (decay over time)
- [ ] Score normalization: 0-100 scale for easy interpretation
- [ ] Updates incrementally (not full recalculation each time)
- [ ] Scores persist across sessions

**Dependencies:** US-118-1  
**Size:** M (3-5 cycles)  
**Sprint Week:** Week 2

---

### US-118-3: Heat Display in Dispatch

**As a** agent during a dispatch cycle  
**I want** to see which files have high heat  
**So that** I can focus on the most active/important areas

**Acceptance Criteria:**

- [ ] `ada dispatch status` includes top 5 hot files
- [ ] Heat information available in agent context
- [ ] Visual indicator: 🔥 for high heat, 🌡️ for medium, ❄️ for low
- [ ] `heat-display.ts` tests pass (per C343 scaffolding)
- [ ] Works even with zero signals (graceful empty state)

**Dependencies:** US-118-1, US-118-2  
**Size:** S (1-2 cycles)  
**Sprint Week:** Week 2

---

## Feature 3: Observability Activation (#83)

### US-83-1: Token Estimation Fallback

**As a** user running ADA autonomously  
**I want** token usage estimated automatically  
**So that** I can track costs even when exact counts aren't available

**Acceptance Criteria:**

- [ ] `--tokens-in-estimate` flag activates estimation mode
- [ ] Estimation based on file sizes read during cycle
- [ ] Formula: chars_read / 4 = estimated tokens (standard approximation)
- [ ] Estimation flagged in output: "~1,200 tokens (estimated)"
- [ ] Works with existing `--tokens-in/out` CLI flags from C353
- [ ] Estimation within 50% of actual (when actual is known)

**Dependencies:** None (builds on C353 work)  
**Size:** S (1-2 cycles)  
**Sprint Week:** Week 1

---

### US-83-2: Metrics JSON Population

**As a** user tracking ADA costs  
**I want** token metrics stored in a metrics.json file  
**So that** I can analyze usage patterns and costs over time

**Acceptance Criteria:**

- [ ] `metrics.json` created in `agents/` directory
- [ ] Each cycle appends: cycle_number, timestamp, tokens_in, tokens_out, estimated (bool)
- [ ] File doesn't grow unbounded: auto-rotate after 1000 entries
- [ ] `ada metrics` command reads and displays summary
- [ ] JSON schema documented in `docs/engineering/`

**Dependencies:** US-83-1  
**Size:** S (1-2 cycles)  
**Sprint Week:** Week 1

---

### US-83-3: Metrics Dashboard Command

**As a** user or team lead  
**I want** to see token usage summary via CLI  
**So that** I can monitor costs without reading JSON files

**Acceptance Criteria:**

- [ ] `ada metrics` shows total tokens (in/out) for last 7 days
- [ ] `ada metrics --period=30d` shows last 30 days
- [ ] Breakdown by day available with `--daily` flag
- [ ] Cost estimate with `--price-per-1k=0.003` flag
- [ ] Works even with empty/missing metrics.json (graceful empty state)
- [ ] Output format: human-readable default, JSON with `--json`

**Dependencies:** US-83-2  
**Size:** M (3-5 cycles)  
**Sprint Week:** Week 2

---

## Story Dependencies (Critical Path)

```
Terminal Mode Foundation:
  US-125-1 (command execution)
    └── US-125-2 (shell detection)
         └── US-125-3 (signal collection)
              └── US-125-4 (dispatch integration)

Heat Scoring (blocks on Terminal Mode signals):
  US-125-3 ──┬── US-118-1 (storage)
             │        └── US-118-2 (calculation)
             │             └── US-118-3 (display)
             │
Observability (parallel track):
  US-83-1 (estimation)
    └── US-83-2 (metrics.json)
         └── US-83-3 (dashboard)
```

---

## Sprint Schedule by Week

### Week 1 (Feb 28 – Mar 7): Foundation

| Story    | Feature       | Owner       | Effort | Priority |
| -------- | ------------- | ----------- | ------ | -------- |
| US-125-1 | Terminal Mode | Engineering | M      | P1       |
| US-125-2 | Terminal Mode | Engineering | S      | P1       |
| US-83-1  | Observability | Engineering | S      | P1       |
| US-83-2  | Observability | Engineering | S      | P2       |

**Week 1 DoD:** Terminal Mode executes commands, observability estimation works.

### Week 2 (Mar 7 – Mar 14): Integration

| Story    | Feature       | Owner       | Effort | Priority |
| -------- | ------------- | ----------- | ------ | -------- |
| US-125-3 | Terminal Mode | Engineering | M      | P1       |
| US-125-4 | Terminal Mode | Engineering | M      | P2       |
| US-118-1 | Heat Scoring  | Engineering | M      | P1       |
| US-118-2 | Heat Scoring  | Engineering | M      | P2       |
| US-118-3 | Heat Scoring  | Design/Eng  | S      | P2       |
| US-83-3  | Observability | Engineering | M      | P2       |

**Week 2 DoD:** Signal collection working, heat scoring functional, metrics dashboard available.

---

## Out of Scope (Sprint 2)

- **Heat scoring for code semantics** — Sprint 2 uses file-based signals only
- **Real token counts from LLM providers** — Estimation fallback is the Sprint 2 solution
- **Dashboard visualizations** — Per CEO directive, deferred to Sprint 3+
- **External benchmark integration** — Internal benchmarks sufficient for now
- **Cross-repo heat aggregation** — Single repo focus for Sprint 2

---

## Success Metrics

| Metric                      | Target | Measurement                          |
| --------------------------- | ------ | ------------------------------------ |
| Stories completed           | 10/11  | All acceptance criteria pass         |
| Terminal Mode test coverage | 80%+   | Vitest coverage report               |
| Heat signals collected      | 100+   | `agents/memory/heat/*.jsonl` entries |
| Metrics.json entries        | 20+    | `ada metrics` output                 |
| User-reported blocking bugs | 0      | GitHub issues with `bug` label       |

---

## References

- Sprint 2 Planning: `docs/product/sprint-2-planning.md`
- Terminal Mode Technical Spec: `docs/engineering/terminal-mode-technical-spec.md`
- Terminal Mode Scaffolding (C343): `packages/core/src/terminal/`
- Engineering Readiness (C363): `docs/engineering/sprint-2-engineering-readiness.md`
- Frontier Readiness (C369): `docs/engineering/frontier-sprint-2-platform-readiness.md`
- Heat Scoring Issue: #118
- Terminal Mode Issue: #125
- Observability Issue: #83

---

_📦 Product Lead — Cycle 370_
