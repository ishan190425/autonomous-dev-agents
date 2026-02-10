# 🎨 Dispatch Workflow UX Audit — CLI v0.2.x

> **Author:** Design (The Architect)
> **Date:** 2026-02-09
> **Cycle:** 295
> **Purpose:** UX audit of new dispatch workflow commands added since Issue #111 (CLI dogfooding mandate)

---

## Executive Summary

**Verdict: 🟡 Mostly Ready — 2 Bugs Found**

The new dispatch workflow commands (`dispatch`, `insights`, `issues`) have excellent UX design but contain two bugs that block `ada issues` commands from working. The dispatch commands are production-ready and showcase ADA's self-improving capabilities.

---

## Commands Audited

### 1. `ada dispatch start`

```
🚀 Cycle 295 Started

  Role:      🎨 The Architect (API & System Designer)
  Playbook:  agents/playbooks/design.md
  Memory:    agents/memory/bank.md (v15)

┌─────────────────────────────────────────────────┐
│  Rotation: ceo → growth → research → frontier → product │
│            scrum → qa → engineering → ops → design* │
└─────────────────────────────────────────────────┘

Complete with: ada dispatch complete --action "..."
```

**Assessment: ✅ Excellent**

- Clear cycle information with role, playbook, and memory version
- Visual rotation box with current role highlighted (`*`)
- Actionable: tells you exactly how to complete the cycle
- Emoji use is tasteful and informative

---

### 2. `ada dispatch status`

```
📊 Dispatch Status

  ┌─────────────────────────────────────────────────┐
  │  Cycle:     295                               │
  │  State:     🔄 In Progress                    │
  │  Active:    🎨 The Architect (API & System    │
  │  Started:   1m 4s                             │
  │  Next:      👔 The Founder (CEO)              │
  └─────────────────────────────────────────────────┘

  Rotation Order:
    ceo → growth → research → frontier → product → scrum → qa → engineering → ops → design*

  History (last 10):
    294  🛡️ The Guardian ISSUE HYGIENE & R-013 COMPLIANCE... 16m ago
    ...
```

**Assessment: ✅ Showcase Command**

- State box shows all critical info at a glance
- Relative timestamps ("16m ago") are user-friendly
- History shows action summaries with smart truncation
- `--verbose` flag for deeper context
- Visual hierarchy is clear

---

### 3. `ada dispatch complete`

```
Options:
  -a, --action <text>      Description of what was done (required)
  -o, --outcome <type>     Outcome: success (default), partial, blocked
  -R, --reflection <text>  Self-critique reflection (Reflexion Phase 1b)
  --skip-push              Commit but do not push
  -j, --json               Output as JSON
  -q, --quiet              Minimal output
```

**Assessment: ✅ Excellent**

- `-a, --action` is required — enforces documentation
- `--reflection` flag enables Reflexion learning
- `--outcome` for partial/blocked cycles (realistic)
- `--skip-push` for git issues (useful escape hatch)
- JSON output for scripting

---

### 4. `ada insights list`

```
🔍 Cross-Role Insights Detection
──────────────────────────────────────────────────
   Analyzed 10 cycles | Min roles: 3 | Min confidence: 60%

   No cross-role patterns detected.
   Try adjusting --cycles or --min-confidence to cast a wider net.
```

**Assessment: ✅ Helpful**

- Clear parameters shown (cycles, min roles, confidence)
- Actionable suggestion when no patterns found
- Subcommands for `retro` and `issue` generation

---

### 5. `ada issues verify` — 🐛 **BUG FOUND**

```
Error: Failed to read memory bank: ENOENT: no such file or directory,
open '/home/rflix/.../agents/memory/memory/bank.md'
```

**Assessment: ❌ Broken — Path Duplication Bug**

**Root Cause:** The issues module is prefixing `memory/` twice, resulting in:

- **Actual path attempted:** `agents/memory/memory/bank.md`
- **Correct path:** `agents/memory/bank.md`

**Impact:**

- `ada issues verify` — broken
- `ada issues list` — broken
- `ada issues sync` — likely broken

**Priority:** P1 — Blocks R-013 verification via CLI

---

### 6. GitHub CLI Path Issue

**Secondary bug:** Commands that invoke `gh` fail on systems where GitHub CLI is not in standard PATH (e.g., `/snap/bin/gh` on Ubuntu).

```
/bin/sh: 1: gh: not found
Error: Failed to fetch GitHub issues...
Make sure 'gh' CLI is installed and authenticated.
```

**Recommendation:**

1. Check common installation paths (`/snap/bin/gh`, `/usr/local/bin/gh`)
2. Support `GITHUB_CLI_PATH` environment variable
3. Improve error message: "GitHub CLI not found. Searched: /usr/bin/gh, /snap/bin/gh. Set GITHUB_CLI_PATH to specify location."

**Priority:** P2 — Affects Ubuntu/snap installations

---

### 7. `ada observe` / `ada costs`

```
📊 No observability data collected yet.
Run `ada run` to execute dispatch cycles and collect metrics.
```

**Assessment: ✅ Clean Empty State**

- Friendly message explaining why there's no data
- Actionable: tells you how to generate data
- No confusing errors or stack traces

---

## Output Formatting Quality

| Aspect            | Grade | Notes                                  |
| ----------------- | ----- | -------------------------------------- |
| Dispatch start    | A+    | Best-in-class cycle initialization     |
| Dispatch status   | A+    | Comprehensive with great visual design |
| Dispatch complete | A     | Clean options, Reflexion integration   |
| Insights list     | A     | Helpful even when no patterns found    |
| Issues commands   | F     | Broken due to path bug                 |
| Error messages    | B     | Mostly good, gh path could be better   |

---

## New Commands vs. Pre-Demo Audit

| Aspect            | Cycle 115 (Pre-Demo) | Cycle 295 (Post-Dogfooding)                      |
| ----------------- | -------------------- | ------------------------------------------------ |
| Core commands     | 6                    | 12 (+dispatch, insights, issues, observe, costs) |
| Dispatch workflow | N/A (manual)         | Fully automated CLI                              |
| Self-improvement  | None                 | Reflexion + Insights                             |
| Issue tracking    | Manual               | CLI-based (when fixed)                           |
| Observability     | None                 | Metrics + costs commands                         |

---

## Bugs to File

### Bug #1: Path Duplication in Issues Module

**Title:** `bug(cli): Issues commands fail — path duplication (memory/memory/bank.md)`

**Priority:** P1 — Blocks CLI dogfooding for R-013

**Scope:** `packages/cli/src/commands/issues/`

### Bug #2: GitHub CLI Path Discovery

**Title:** `feat(cli): Support non-standard gh CLI paths (snap, homebrew)`

**Priority:** P2 — Affects Ubuntu/snap users

---

## Recommendations

### For v1.0-alpha Launch (Feb 24)

1. **P1:** Fix issues module path bug immediately
2. **P2:** Improve gh CLI discovery before launch
3. Document dispatch workflow in README

### For Sprint 2

1. Add `--dry-run` to `ada dispatch start` (preview without lock)
2. Add tab completion for `ada insights issue <id>`
3. Consider `ada dispatch abort` for stuck cycles

---

## Sign-Off

**Design (The Architect)** confirms:

- ✅ Dispatch commands have excellent UX
- ✅ Insights commands are well-designed
- ❌ Issues commands are broken (P1 bug filed)
- ⚠️ gh CLI path handling needs improvement (P2)

**Confidence:** 85% — Dispatch workflow is ready, but issues module needs a fix before Go/No-Go.

---

_This audit covers commands added since Issue #111 (CLI Dogfooding Mandate). See `docs/design/pre-demo-ux-audit.md` for earlier commands._
