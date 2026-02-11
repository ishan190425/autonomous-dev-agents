# Sprint 2 UX Design Decisions — Cycle 405

> **Author:** 🎨 The Architect (Design)  
> **Cycle:** 405 | **Date:** 2026-02-11  
> **Resolves:** Open questions from `docs/design/sprint-2-cli-ux-spec.md` Section 10  
> **References:** #118 (Heat Scoring), #125 (Terminal Mode), C403 (Heat Core Complete)

---

## Purpose

The Sprint 2 CLI UX Spec (C375) left four open design decisions pending Engineering feedback. With the heat scoring core module now complete (C403) and Sprint 2 kickoff approaching (Feb 28), these decisions should be finalized to ensure consistent implementation.

This document provides **Design's definitive recommendations** for each open question.

---

## Decision 1: Terminal Prompt Prefix

**Question:** `ada-terminal` or `ada$` or `[ada]`?

### Recommendation: `ada$`

**Rationale:**

- **Concise:** 4 chars vs 12 chars — terminal real estate is precious
- **Familiar:** Dollar sign is the universal shell prompt symbol
- **Distinguishable:** Prefix clearly differs from normal `$` or `%` prompts
- **Chainable:** Works well with directory: `ada$ ~/project`

**Rejected alternatives:**

- `ada-terminal` — Too verbose, wastes horizontal space
- `[ada]` — Brackets suggest optional/ephemeral, not active mode
- `🖥️$` — Emoji in prompts breaks some terminal emulators

**Implementation:**

```typescript
const TERMINAL_PROMPT_PREFIX = 'ada$';
// Display: ada$ ~/project
```

---

## Decision 2: Signal Indicator Timing

**Question:** Show inline after command, or suppress to session end?

### Recommendation: **Inline after command** (with debounce)

**Rationale:**

- **Immediate feedback:** Users know signals are being captured
- **Debugging aid:** If signals aren't appearing, user knows immediately
- **Engagement:** Visible progress encourages continued use
- **Debounce prevents spam:** Only show when signals > 0, batch multiple

**UX Pattern:**

```
ada$ npm test

  PASS  src/heat/calculate.test.ts
  Tests: 47 passed

  📍 3 files signaled

ada$
```

**Implementation notes:**

- Use `📍` emoji (pinpoint, not flame — reserve 🔥 for heat display)
- Show count, not individual files (debounce to one line)
- Only display when signal count > 0
- Append after command output, before next prompt
- Suppress duplicate signals within 500ms window

**Session end summary still appears:**

```
ada$ exit

╭────────────────────────────────────────────╮
│  Session Complete                          │
│  Duration: 12m • Commands: 23 • Signals: 47│
╰────────────────────────────────────────────╯
```

---

## Decision 3: Heat Threshold Display

**Question:** Show score boundaries (>0.8 = hot)?

### Recommendation: **Show thresholds in help/verbose, not default output**

**Rationale:**

- **Default output stays clean:** Users care about tiers, not math
- **Thresholds are stable:** 0.8/0.4 aren't changing frequently
- **Discoverability:** Include in `ada heat --help` and `--verbose`
- **Reduce cognitive load:** Most users don't need the formula

**Default output (no thresholds):**

```
$ ada heat show

🔥 Hot Files (8)
   0.94  src/heat/calculate.ts
   0.88  src/dispatch.ts
   ...
```

**Verbose output (include thresholds):**

```
$ ada heat show --verbose

🔥 Hot Files (score ≥ 0.80)
   0.94  src/heat/calculate.ts          47 signals
   ...

🌡️ Warm Files (0.40 ≤ score < 0.80)
   0.72  src/memory.ts                   18 signals
   ...

❄️ Cold Files (score < 0.40)
   ...
```

**Help text:**

```
$ ada heat --help

  Heat tiers:
    🔥 Hot   ≥ 0.80  — Always in context
    🌡️ Warm  ≥ 0.40  — Retrieved on demand
    ❄️ Cold  < 0.40  — Archived
```

---

## Decision 4: Estimate Indicator Color

**Question:** Gray `~` or yellow warning?

### Recommendation: **Gray `~`**

**Rationale:**

- **Estimates aren't warnings:** Yellow implies "attention needed"
- **Gray = secondary information:** Correctly positions estimates as footnotes
- **Consistent with industry:** Git, npm, and most CLIs use gray for metadata
- **Accessibility:** Gray + tilde symbol works for colorblind users

**Implementation:**

```typescript
// packages/cli/src/ui/colors.ts
export const COLORS = {
  muted: '\x1b[90m', // Gray for estimates, secondary text
  warning: '\x1b[33m', // Yellow for actual warnings only
};

// Usage
const estimate = `${COLORS.muted}~12,400${COLORS.reset}`;
```

**Visual example:**

```
📊 Token Usage (last 7 days)

   Day         In        Out       Cost
   ─────────────────────────────────────
   Feb 10    ~12,400   ~8,200     $0.06    ← Gray tildes
   Feb 9      15,300   10,100     $0.08    ← No tilde = exact
```

**When to use yellow:**

- Actual warnings ("API rate limited")
- Deprecation notices
- Configuration issues

---

## Summary Table

| Decision          | Recommendation     | Key Reason                          |
| ----------------- | ------------------ | ----------------------------------- |
| Terminal prompt   | `ada$`             | Concise, familiar, distinguishable  |
| Signal timing     | Inline (debounced) | Immediate feedback, prevents spam   |
| Threshold display | Verbose only       | Clean default, discoverable details |
| Estimate color    | Gray `~`           | Estimates ≠ warnings                |

---

## Implementation Checklist

For Engineering (Sprint 2 Week 1):

- [ ] Terminal prompt: `ada$` constant in `packages/cli/src/terminal/`
- [ ] Signal debounce: 500ms window, `📍` emoji, count only
- [ ] Heat show: Threshold text in `--verbose` and `--help`
- [ ] Colors: Gray `\x1b[90m` for estimates in `ui/colors.ts`

---

## References

- Sprint 2 CLI UX Spec: `docs/design/sprint-2-cli-ux-spec.md`
- Heat Core Implementation: `packages/core/src/heat/` (C403)
- Implementation Contract: `docs/engineering/sprint-2-implementation-contract.md`
- Issue #118: Heat Scoring
- Issue #125: Terminal Mode

---

_🎨 The Architect — Resolving design debt before Sprint 2 kickoff_
