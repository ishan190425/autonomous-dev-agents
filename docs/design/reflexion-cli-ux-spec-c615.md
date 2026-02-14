# Reflexion CLI UX Specification

> **Author:** 🎨 Design (The Architect)
> **Cycle:** C615
> **Issue:** #108 (Reflexion: Phase 2)
> **Status:** Ready for Engineering
> **Related:** C469 (Reflexion Phase 2 Spec), C609 (Core Library Implementation)

---

## Overview

This document specifies the UX for Reflexion Phase 2 CLI commands. The core library (`packages/core/src/reflexion/`) is complete (C609). This spec defines how users interact with pattern extraction, suggestion review, and pattern acceptance via the CLI.

---

## Commands

### 1. `ada reflexion patterns`

**Purpose:** Display extracted patterns from dispatch history with confidence scores.

**Usage:**

```bash
ada reflexion patterns [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--min-confidence <n>` | Minimum confidence threshold (0.0-1.0) | 0.7 |
| `--limit <n>` | Maximum patterns to display | 10 |
| `--format <fmt>` | Output format: `table`, `json`, `compact` | table |
| `--include-rejected` | Include previously rejected patterns | false |

**Output (table format):**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📊 Reflexion Patterns                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│  Extracted from 615 cycles • Threshold: 0.70 • 4 patterns found              │
└──────────────────────────────────────────────────────────────────────────────┘

  #1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 0.94 ★★★★☆
  │ UX specs before engineering accelerate implementation
  │ Keywords: ux-spec, engineering, implementation, design, pre-implementation
  │ Evidence: 8 reflections across 4 roles
  │ First seen: C469 • Last seen: C613
  └─────────────────────────────────────────────────────────────────────────────

  #2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 0.89 ★★★★☆
  │ Mandatory first checks catch critical failures early
  │ Keywords: R-013, verification, issue-tracking, first-check
  │ Evidence: 12 reflections across 7 roles
  │ First seen: C421 • Last seen: C612
  └─────────────────────────────────────────────────────────────────────────────

  #3 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 0.85 ★★★★☆
  │ Observer mode is earned through consecutive successful cycles
  │ Keywords: observer-mode, CEO, delegation, consecutive, autonomous
  │ Evidence: 5 reflections across 2 roles
  │ First seen: C506 • Last seen: C606
  └─────────────────────────────────────────────────────────────────────────────

  #4 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 0.72 ★★★☆☆
  │ Pre-written content with placeholder tokens simplifies updates
  │ Keywords: templates, placeholders, launch, content, preparation
  │ Evidence: 3 reflections across 2 roles
  │ First seen: C557 • Last seen: C577
  └─────────────────────────────────────────────────────────────────────────────

┌──────────────────────────────────────────────────────────────────────────────┐
│  💡 Tip: Run `ada reflexion suggest` to see which patterns to formalize      │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Confidence Stars:**

- ★★★★★ (0.95+): Near-certain pattern
- ★★★★☆ (0.85-0.94): High confidence
- ★★★☆☆ (0.70-0.84): Moderate confidence
- ★★☆☆☆ (0.50-0.69): Low confidence (below default threshold)
- ★☆☆☆☆ (<0.50): Very low confidence

**Color Modes:**

- **Color ON:** Confidence bar uses gradient (green→yellow→red)
- **No color:** Uses ASCII density: `━━━━━━━━━━━────────────` (filled vs dashed)

---

### 2. `ada reflexion suggest`

**Purpose:** Suggest patterns that should be formalized as lessons or rules.

**Usage:**

```bash
ada reflexion suggest [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--interactive` | Prompt for accept/reject decisions | false |
| `--threshold <n>` | Minimum confidence for suggestions | 0.85 |
| `--format <fmt>` | Output format: `detail`, `list`, `json` | detail |

**Output (detail format):**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  💡 Suggested Formalizations                                                 │
│  Patterns ready to become lessons or rules                                   │
└──────────────────────────────────────────────────────────────────────────────┘

  SUGGEST #1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Confidence: 0.94
  ┃
  ┃  Pattern:    UX specs before engineering accelerate implementation
  ┃
  ┃  Evidence:
  ┃    • C469 (Frontier): "Pre-implementation specs with exact function
  ┃      signatures accelerate development"
  ┃    • C605 (Design): "Terminal Mode UX spec complete — ready for
  ┃      Engineering Sprint 2 implementation"
  ┃    • C611 (Scrum): "L296 validated — UX specs before engineering
  ┃      prevents mid-implementation design debates"
  ┃    • C613 (Engineering): "Following UX spec (C605) made implementation
  ┃      straightforward"
  ┃
  ┃  Suggested Action:
  ┃    → Add as L298: "UX specifications with visual examples should precede
  ┃      engineering implementation for all CLI-facing features; eliminates
  ┃      design debates and accelerates coding."
  ┃
  ┃  Affected Playbooks:
  ┃    • design.md — Add "FIRST CHECK: Write UX spec before Engineering starts"
  ┃    • engineering.md — Add "WAIT for UX spec on CLI features"
  ┃
  └─────────────────────────────────────────────────────────────────────────────

  Accept? [a]ccept / [r]eject / [s]kip / [q]uit: _

```

**Interactive Mode Flow:**

1. Display suggestion with evidence
2. Prompt: `[a]ccept / [r]eject / [s]kip / [q]uit`
3. On accept: Stage change for `ada dispatch complete`
4. On reject: Log rejection reason (optional prompt)
5. On skip: Move to next suggestion
6. On quit: Exit without saving

---

### 3. `ada reflexion accept`

**Purpose:** Accept a suggested pattern formalization.

**Usage:**

```bash
ada reflexion accept <pattern-id> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--as <type>` | Formalization type: `lesson`, `rule`, `playbook` | lesson |
| `--id <id>` | Override auto-generated ID (e.g., `L298`, `R-014`) | auto |
| `--apply` | Apply changes immediately (vs staging) | false |

**Output:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ✅ Pattern Accepted                                                         │
└──────────────────────────────────────────────────────────────────────────────┘

  Pattern:    UX specs before engineering accelerate implementation
  Formalized: L298 (Lesson)

  Changes staged:
    • agents/memory/bank.md — Add L298 to Key Lessons
    • agents/playbooks/design.md — Add UX spec first check
    • agents/playbooks/engineering.md — Add UX spec dependency note

  Commit with: ada dispatch complete --action "..."

```

---

### 4. `ada reflexion reject`

**Purpose:** Reject a suggested pattern with optional reasoning.

**Usage:**

```bash
ada reflexion reject <pattern-id> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--reason <text>` | Reason for rejection | (prompted) |
| `--permanent` | Never suggest this pattern again | false |

**Output:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⏭️  Pattern Rejected                                                        │
└──────────────────────────────────────────────────────────────────────────────┘

  Pattern:  Pre-written content with placeholder tokens simplifies updates
  Reason:   Too narrow — only applies to launch scenarios, not general workflow
  Status:   Will re-suggest if confidence increases to 0.90+

```

---

### 5. `ada reflexion stats`

**Purpose:** Show Reflexion system statistics.

**Usage:**

```bash
ada reflexion stats
```

**Output:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📈 Reflexion Statistics                                                     │
└──────────────────────────────────────────────────────────────────────────────┘

  Cycles Analyzed:        615
  Reflections Parsed:     412 (67%)
  Patterns Extracted:     23

  ┌─────────────────────────────────────┐
  │  Confidence Distribution            │
  │  ━━━━━━━━━━━━━━━━░░░░░░░░░  0.95+  │ 2
  │  ━━━━━━━━━━━━━━━━━━━━━░░░░  0.85+  │ 6
  │  ━━━━━━━━━━━━━━░░░░░░░░░░░  0.70+  │ 8
  │  ━━━━━━░░░░░░░░░░░░░░░░░░░  <0.70  │ 7
  └─────────────────────────────────────┘

  Formalized:             18 lessons, 2 rules
  Accepted Rate:          78%
  Rejected (Permanent):   3 patterns

  Last Analysis:          C612
  Next Suggested:         C620 (every 10 cycles)

```

---

## Design Principles

### 1. Visual Hierarchy

```
┌────────────────────────────────┐  ← Box: Section headers
│  Title                         │
└────────────────────────────────┘

  #N ━━━━━━━━━━━━━━━━━━━━━━━━━━━   ← Bar: Confidence indicator
  │ Pattern text                  ← Pipe: Content indentation
  │ Details...
  └───────────────────────────────  ← Corner: Content boundary
```

### 2. Information Density

- **Table format:** Maximum info, scannable
- **Detail format:** Full context, decision-making
- **Compact format:** One-liner per pattern
- **JSON format:** Machine-readable for piping

### 3. Actionable Output

Every output ends with:

- **Next step suggestion** (what command to run)
- **State indication** (staged, applied, rejected)
- **Context link** (which cycles/issues relate)

### 4. Color Usage (when enabled)

| Element           | Color      | Meaning            |
| ----------------- | ---------- | ------------------ |
| Headers           | Bold cyan  | Section boundaries |
| High confidence   | Green      | ≥0.85              |
| Medium confidence | Yellow     | 0.70-0.84          |
| Low confidence    | Red        | <0.70              |
| Keywords          | Dim white  | Supporting context |
| Actions           | Bold white | User decisions     |
| Errors            | Bold red   | Failures           |

### 5. Accessibility

- All visual elements have text equivalents
- No color-only information encoding
- Screen reader friendly (logical reading order)
- `--no-color` flag respected from environment

---

## Error States

### No Patterns Found

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📊 Reflexion Patterns                                                       │
└──────────────────────────────────────────────────────────────────────────────┘

  No patterns found at confidence ≥ 0.70

  Suggestions:
    • Lower threshold: ada reflexion patterns --min-confidence 0.5
    • More cycles needed: Reflexion works best with 50+ reflections
    • Check reflections: Ensure --reflection flag used on dispatch complete

```

### Analysis Required

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚠️  Analysis Outdated                                                       │
└──────────────────────────────────────────────────────────────────────────────┘

  Last analysis: C580 (35 cycles ago)
  Recommend re-analysis before viewing patterns.

  Run: ada reflexion analyze

```

---

## Implementation Notes

### Files Created/Modified by Accept

| File                        | Change                                       |
| --------------------------- | -------------------------------------------- |
| `agents/memory/bank.md`     | Add lesson to Key Lessons section            |
| `agents/rules/RULES.md`     | Add rule (if `--as rule`)                    |
| `agents/playbooks/*.md`     | Add guidance (if playbook changes suggested) |
| `.ada/reflexion/state.json` | Track accepted/rejected patterns             |

### Integration with Dispatch

The `ada dispatch complete` command should:

1. Parse `--reflection` flag for new reflections
2. Run incremental pattern extraction (every 10 cycles or on demand)
3. Stage suggestions for next `ada reflexion suggest` invocation

---

## Future Enhancements (Out of Scope)

- **Phase 3:** Automatic playbook updates based on accepted patterns
- **Phase 4:** Cross-team pattern sharing via ADA Hub
- **TUI mode:** Interactive pattern review in terminal dashboard

---

_Spec ready for Frontier implementation. Follow L296: use this spec, don't debate during coding._
