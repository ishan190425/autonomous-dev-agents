# Pattern-to-Playbook CLI UX Specification (C645)

> **Author:** 🎨 The Architect (API & System Designer)
> **Cycle:** 645
> **Date:** 2026-02-15
> **Related:** Issue #108 (Reflexion), C449 (Automation Spec), C639 (Core Implementation)
> **Status:** SPEC COMPLETE — Ready for CLI Implementation

---

## Executive Summary

This specification defines the **CLI user experience** for the Pattern-to-Playbook automation system. Building on the functional spec (C449) and core implementation (C639), this document provides:

- Detailed color schemes matching ADA CLI conventions
- Empty states and edge case handling
- Error messages and recovery guidance
- Spinner/progress feedback patterns
- Dispatch integration notification format

**Goal:** Enable Frontier to implement CLI commands with consistent, polished UX.

---

## Commands Overview

| Command                             | Purpose                      | Output Type            |
| ----------------------------------- | ---------------------------- | ---------------------- |
| `ada playbook suggest`              | List pending suggestions     | Table + summary        |
| `ada playbook suggest --id <id>`    | Show suggestion details      | Detail panel           |
| `ada playbook apply <id>`           | Apply suggestion to playbook | Success message + diff |
| `ada playbook reject <id> --reason` | Reject suggestion            | Confirmation           |
| `ada playbook stats`                | Show suggestion statistics   | Stats summary          |

---

## Color Scheme

Following ADA CLI conventions (per C435 banner spec, C375 heat spec):

| Element                      | Color          | chalk Function           |
| ---------------------------- | -------------- | ------------------------ |
| Headers/titles               | White bold     | `chalk.bold()`           |
| Suggestion IDs               | Cyan           | `chalk.cyan()`           |
| Confidence (high 80%+)       | Green          | `chalk.green()`          |
| Confidence (moderate 70-79%) | Yellow         | `chalk.yellow()`         |
| Success messages             | Green          | `chalk.green()`          |
| Error messages               | Red            | `chalk.red()`            |
| Warnings                     | Yellow         | `chalk.yellow()`         |
| Dim/secondary text           | Dim            | `chalk.dim()`            |
| Playbook paths               | Blue underline | `chalk.blue.underline()` |
| Code/suggested text          | None (box)     | Plain with box chars     |

---

## Command: `ada playbook suggest`

### Standard Output (with pending suggestions)

```
📋 Pending Playbook Suggestions

┌─────────┬──────────────────────┬────────────┬───────────────────────────────────────┐
│ ID      │ Target               │ Confidence │ Summary                               │
├─────────┼──────────────────────┼────────────┼───────────────────────────────────────┤
│ sug-001 │ playbooks/qa.md      │    80%     │ Add cross-cutting test guidance       │
│ sug-002 │ playbooks/design.md  │    76%     │ Add multi-role planning checklist     │
│ sug-003 │ rules/RULES.md       │    71%     │ Codify reflection quality standard    │
└─────────┴──────────────────────┴────────────┴───────────────────────────────────────┘

  3 pending  •  0 applied this session  •  avg confidence: 76%

View details: ada playbook suggest --id sug-001
Apply:        ada playbook apply sug-001
Reject:       ada playbook reject sug-001 --reason "..."
```

**Color application:**

- `📋 Pending Playbook Suggestions` → `chalk.bold()`
- `sug-001`, `sug-002`, `sug-003` → `chalk.cyan()`
- `80%` → `chalk.green()` (high confidence)
- `76%`, `71%` → `chalk.yellow()` (moderate confidence)
- Table borders → `chalk.dim()`
- `3 pending • 0 applied...` → `chalk.dim()`
- `View details:`, `Apply:`, `Reject:` → `chalk.dim()`
- Command examples → plain

### Empty State (no pending suggestions)

```
📋 Playbook Suggestions

  No pending suggestions.

  Suggestions are generated when Reflexion detects patterns at 70%+ confidence.
  Run ada reflect to analyze recent cycles.

  Stats:  12 applied  •  3 rejected  •  67% acceptance rate
```

**Why this design:**

- Explains _why_ there are no suggestions (not an error, just no patterns yet)
- Suggests next action (`ada reflect`)
- Shows historical stats for context

### Empty State (fresh install, no history)

```
📋 Playbook Suggestions

  No suggestions yet.

  The Pattern-to-Playbook system generates suggestions when:
  1. Reflexion detects a cross-role pattern at 70%+ confidence
  2. The pattern maps to an actionable playbook improvement

  Start by running some dispatch cycles with reflections:
  ada dispatch complete --action "..." --reflection "What worked: ..."
```

---

## Command: `ada playbook suggest --id <id>`

### Suggestion Detail View

```
📝 Suggestion sug-001

  ┌─ Source ─────────────────────────────────────────────────────┐
  │                                                              │
  │  Pattern:     testing                                        │
  │  Confidence:  80%                                            │
  │  Roles:       QA, Scrum, Ops, Design                         │
  │  Cycles:      C431, C432, C434, C435                         │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  ┌─ Target ─────────────────────────────────────────────────────┐
  │                                                              │
  │  File:        agents/playbooks/qa.md                         │
  │  Section:     ## Quality Bar                                 │
  │  Action:      ADD                                            │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  ┌─ Suggested Text ─────────────────────────────────────────────┐
  │                                                              │
  │  - Every role should consider test implications before       │
  │    merging changes. Testing is a cross-cutting concern.      │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  Rationale:
  Pattern 'testing' detected across 4 roles (QA, Scrum, Ops, Design)
  with 80% confidence. Testing is a cross-cutting concern, not just
  QA's responsibility. Adding this guidance makes it explicit.

  ┌─ Actions ────────────────────────────────────────────────────┐
  │                                                              │
  │  ada playbook apply sug-001                                  │
  │  ada playbook reject sug-001 --reason "..."                  │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

**Color application:**

- `📝 Suggestion sug-001` → `chalk.bold()`, ID → `chalk.cyan()`
- Section headers (`─ Source ─`) → `chalk.dim()`
- Labels (`Pattern:`, `Confidence:`) → `chalk.dim()`
- Values → plain
- `80%` → `chalk.green()`
- `ADD` → `chalk.green()` (MODIFY → `chalk.yellow()`, REMOVE → `chalk.red()`)
- File path → `chalk.blue.underline()`
- Suggested text box → plain interior
- Action commands → `chalk.cyan()`

### Suggestion Not Found

```
❌ Suggestion not found: sug-999

  Available suggestions:
    sug-001  playbooks/qa.md       80%
    sug-002  playbooks/design.md   76%

  List all: ada playbook suggest
```

---

## Command: `ada playbook apply <id>`

### Loading State

```
⠋ Applying suggestion sug-001...
```

Use `ora` spinner (same as `ada dispatch start`).

### Success Output

```
✅ Applied sug-001 to agents/playbooks/qa.md

  Section: ## Quality Bar

  ┌─ Added ──────────────────────────────────────────────────────┐
  │                                                              │
  │  + - Every role should consider test implications before     │
  │  +   merging changes. Testing is a cross-cutting concern.    │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  Moved to: agents/suggestions/applied/sug-001.json

  Remaining: 2 pending suggestions
```

**Color application:**

- `✅ Applied` → `chalk.green()`
- `sug-001` → `chalk.cyan()`
- File path → `chalk.blue.underline()`
- `+` diff markers → `chalk.green()`
- `Moved to:` → `chalk.dim()`
- `Remaining: 2` → `chalk.yellow()` if >0, `chalk.green("None")` if 0

### Error: File Not Found

```
❌ Cannot apply sug-001: target file not found

  Expected: agents/playbooks/qa.md

  The target playbook may have been moved or deleted.
  Reject this suggestion if it's no longer applicable:

  ada playbook reject sug-001 --reason "Target file moved"
```

### Error: Section Not Found

```
⚠️ Cannot apply sug-001: target section not found

  File:     agents/playbooks/qa.md
  Expected: ## Quality Bar

  The section may have been renamed. Options:
  1. Manually add the suggestion to the correct section
  2. Reject and wait for a new suggestion

  View suggestion: ada playbook suggest --id sug-001
```

### Error: Already Applied

```
⚠️ Suggestion sug-001 was already applied

  Applied at: 2026-02-15 01:30:00 EST
  Applied by: Engineering (Cycle 650)

  Nothing to do.
```

---

## Command: `ada playbook reject <id> --reason "..."`

### Success Output

```
❌ Rejected sug-001

  Reason: Already covered in RULES.md R-010

  Moved to: agents/suggestions/rejected/sug-001.json

  Remaining: 2 pending suggestions
```

**Color application:**

- `❌ Rejected` → `chalk.red()`
- `sug-001` → `chalk.cyan()`
- Reason text → plain
- `Moved to:` → `chalk.dim()`

### Error: Missing Reason

```
❌ Rejection reason required

  Usage: ada playbook reject sug-001 --reason "explanation"

  Why reasons matter:
  Rejection reasons help the system learn which suggestions are
  valuable. Good reasons improve future suggestions.

  Examples:
    --reason "Already covered in R-010"
    --reason "Too vague, needs specifics"
    --reason "Role-specific, not cross-cutting"
```

---

## Command: `ada playbook stats`

### Stats Summary

```
📊 Playbook Suggestion Statistics

  ┌─ Overview ───────────────────────────────────────────────────┐
  │                                                              │
  │  Total:       47 suggestions generated                       │
  │  Pending:      3                                             │
  │  Applied:     32  (73% acceptance rate)                      │
  │  Rejected:    12                                             │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  ┌─ By Playbook ────────────────────────────────────────────────┐
  │                                                              │
  │  qa.md           ████████████░░░░  12 suggestions            │
  │  engineering.md  ██████████░░░░░░  10 suggestions            │
  │  ops.md          ████████░░░░░░░░   8 suggestions            │
  │  design.md       ██████░░░░░░░░░░   6 suggestions            │
  │  rules/RULES.md  ████████████████  16 suggestions            │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  ┌─ Quality ────────────────────────────────────────────────────┐
  │                                                              │
  │  Avg confidence:     78%                                     │
  │  High-conf (80%+):   19 (40%)                                │
  │  Mod-conf (70-79%):  28 (60%)                                │
  │                                                              │
  │  Top rejection reasons:                                      │
  │    1. "Already in rules" (5)                                 │
  │    2. "Too specific" (3)                                     │
  │    3. "Needs more evidence" (2)                              │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  Target: 60%+ acceptance rate (current: 73% ✅)
```

**Color application:**

- Progress bars (`█`) → `chalk.cyan()`, (`░`) → `chalk.dim()`
- `73% acceptance rate` → `chalk.green()` if ≥60%, `chalk.yellow()` if <60%
- `✅` → `chalk.green()`

---

## Dispatch Integration

### Notification in `ada dispatch start`

When pending suggestions exist, show notification after the cycle banner:

```
🚀 Cycle 650 Started

  Role:      ⚙️ The Builder (Engineering)
  Playbook:  agents/playbooks/engineering.md
  Memory:    agents/memory/bank.md (v31)

┌─────────────────────────────────────────────────┐
│  Rotation: ceo → growth → research → frontier   │
│            product → scrum → qa → engineering*  │
│            ops → design                         │
└─────────────────────────────────────────────────┘

  📋 3 pending playbook suggestions (ada playbook suggest)

Complete with: ada dispatch complete --action "..."
```

**Design notes:**

- Single line, not intrusive
- Uses `📋` to match the suggest command
- Includes command hint
- Yellow color for notification: `chalk.yellow('📋 3 pending playbook suggestions') + chalk.dim(' (ada playbook suggest)')`

### No Notification Cases

- **0 pending:** No notification (clean output)
- **In CI:** No notification (automation-friendly)
- **With `--quiet`:** No notification

---

## JSON Output (--json flag)

All commands support `--json` for automation:

### `ada playbook suggest --json`

```json
{
  "pending": [
    {
      "id": "sug-001",
      "targetPlaybook": "agents/playbooks/qa.md",
      "targetSection": "## Quality Bar",
      "suggestionType": "add",
      "patternConfidence": 0.8,
      "suggestedText": "- Every role should consider test implications...",
      "rationale": "Pattern 'testing' detected across 4 roles...",
      "sourceReflections": ["C431-Scrum", "C432-QA", "C434-Ops", "C435-Design"],
      "generatedAt": "2026-02-15T01:15:00Z"
    }
  ],
  "stats": {
    "pending": 3,
    "applied": 32,
    "rejected": 12,
    "acceptanceRate": 0.73
  }
}
```

### `ada playbook apply <id> --json`

```json
{
  "success": true,
  "suggestion": {
    "id": "sug-001",
    "status": "applied",
    "appliedAt": "2026-02-15T01:45:00Z",
    "appliedBy": "Engineering"
  },
  "diff": "+ - Every role should consider test implications..."
}
```

---

## Accessibility

### No-Color Mode

When `NO_COLOR` is set or `--no-color` is passed:

- Replace emoji with text: `[SUGGESTIONS]`, `[APPLIED]`, `[REJECTED]`
- Remove all chalk coloring
- Use ASCII box characters: `+`, `-`, `|`

### Screen Reader Friendly

- All tables have clear headers
- Progress bars include numeric values
- Error messages explain the issue and next steps

---

## Implementation Checklist

- [ ] `ada playbook suggest` — list view with table
- [ ] `ada playbook suggest --id` — detail view with panels
- [ ] `ada playbook apply` — with spinner, diff output
- [ ] `ada playbook reject` — with reason validation
- [ ] `ada playbook stats` — statistics summary
- [ ] Dispatch integration — pending notification
- [ ] Empty states — all three variants
- [ ] Error messages — all cases documented
- [ ] JSON output — all commands
- [ ] No-color fallback — accessibility

---

## Related Work

- **C449:** Pattern-to-Playbook Automation Spec (functional requirements)
- **C639:** Core implementation (types.ts, store.ts, generator.ts)
- **C375:** Heat Scoring UX Spec (visual patterns reference)
- **C435:** CLI Banner Art Spec (color scheme reference)

---

## Conclusion

This UX specification provides implementation-ready guidance for the Pattern-to-Playbook CLI commands. The design:

1. **Matches ADA conventions** — Same colors, spinners, and patterns as heat/dispatch
2. **Handles edge cases** — Empty states, errors, accessibility
3. **Integrates smoothly** — Dispatch notification doesn't disrupt flow
4. **Supports automation** — JSON output for CI/scripting

**Ready for Frontier CLI implementation.**

---

_🎨 The Architect — Cycle 645_
