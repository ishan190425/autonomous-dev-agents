# First-Cycle Guide UX Spec (C1282)

> **Design Cycle:** C1282 | **Date:** 2026-02-28
> **Product Spec:** #267 (C1277) | **Sprint:** 4 (Mar 15-28)
> **Author:** 🎨 Design (The Architect)

---

## Overview

UX specification for the In-Product First-Cycle Guide — an interactive CLI tutorial that guides new users through their first dispatch cycle with progressive disclosure, real-time feedback, and celebration.

**Goal:** Transform "first run" from confusion → confidence in <5 minutes.

---

## Design Principles

### 1. Progressive Disclosure

Reveal information as needed, not all at once. Each step introduces ONE concept.

### 2. Real Artifacts

Create real GitHub issues, not mocks. Users feel ownership when their action produces tangible output.

### 3. Celebration > Explanation

The "magic moment" should feel earned. Emphasize what they accomplished, not what they learned.

### 4. Escape Hatches

Every step allows skipping or exiting. Experts shouldn't feel trapped.

### 5. CLI-Native Feel

Respect terminal conventions. No web-style animations that feel foreign in a terminal.

---

## Visual Language

### Color Palette (ANSI-Safe)

| Element     | Color   | ANSI Code  | Usage                      |
| ----------- | ------- | ---------- | -------------------------- |
| Progress    | Cyan    | `\x1b[36m` | Step indicators, commands  |
| Success     | Green   | `\x1b[32m` | Checkmarks, completions    |
| Emphasis    | Yellow  | `\x1b[33m` | Tips, important notes      |
| Celebration | Magenta | `\x1b[35m` | Magic moment, achievements |
| Muted       | Gray    | `\x1b[90m` | Secondary text, hints      |
| Error       | Red     | `\x1b[31m` | Errors, warnings           |

### Typography

```
═══════════════════════════════════════════
  Primary headers: Box drawing + padding
═══════════════════════════════════════════

💡 Tips: Emoji prefix + yellow text
   Indented continuation for readability

✓ Success: Green checkmark + description
✗ Failure: Red x-mark + recovery suggestion

[1/5] Step indicators: Brackets, cyan
```

### Iconography (Emoji)

| Emoji | Meaning     | Context           |
| ----- | ----------- | ----------------- |
| 📚    | Learning    | Tutorial intro    |
| 🚀    | Action      | Starting dispatch |
| 📋    | Selection   | Choosing action   |
| 🎯    | Execution   | Performing action |
| 🎉    | Celebration | Magic moment      |
| 💡    | Tip         | Helpful hints     |
| ✓     | Success     | Step completed    |
| ⏩    | Skip        | Skip option       |

---

## Tutorial Flow UX

### Step 0: Detection & Offer

When `ada dispatch start` detects first-time user (cycles = 0):

```
╔═══════════════════════════════════════════════════════════╗
║  🆕 First time using ADA?                                 ║
║                                                           ║
║  We can guide you through your first cycle (~3 min).      ║
║  You'll create a real artifact and see how ADA works.     ║
╚═══════════════════════════════════════════════════════════╝

  [Y] Start tutorial    [n] Skip (advanced users)

> _
```

**UX Notes:**

- Box draws attention without being intrusive
- Time estimate sets expectations
- Skip option respects expert users
- Default is "Y" (press ENTER to start)

---

### Step 1: Welcome & Context (State: `intro`)

```
[1/5] Welcome                                          ⏩ Skip

═══════════════════════════════════════════════════════════════

  📚 Welcome to ADA — Autonomous Dev Agents

  ADA runs a team of AI roles that develop software autonomously.
  Each role takes turns (CEO → Growth → Research → ... → Design).

  Your team: 10 roles configured
  Next up:   👔 CEO (Strategic Direction & Founder Priorities)

═══════════════════════════════════════════════════════════════

  💡 You're about to run your first "dispatch cycle" — one role
     taking one action and updating shared memory.

Press ENTER to continue, or 's' to skip tutorial...
```

**UX Notes:**

- Progress indicator `[1/5]` shows position
- Skip affordance top-right for escape
- Core concept: roles + rotation
- Single CTA: ENTER to continue

---

### Step 2: Starting Dispatch (State: `dispatch`)

```
[2/5] Starting Your Cycle                              ⏩ Skip

═══════════════════════════════════════════════════════════════

  🚀 Let's start a dispatch cycle.

  Running: ada dispatch start

═══════════════════════════════════════════════════════════════

  Initializing...
  ✓ Cycle 1 started
  ✓ Role: 👔 CEO
  ✓ Playbook: agents/playbooks/ceo.md
  ✓ Memory: agents/memory/bank.md (v1)

  💡 The playbook defines what actions this role can take.
     After the tutorial, explore it: cat agents/playbooks/ceo.md

Press ENTER to continue...
```

**UX Notes:**

- Shows actual command being run
- Animated checkmarks appear sequentially (100ms delay each)
- Tip provides next-step learning hook
- All outputs are real (not mocked)

---

### Step 3: Action Selection (State: `action`)

```
[3/5] Choosing an Action                               ⏩ Skip

═══════════════════════════════════════════════════════════════

  📋 As CEO, your playbook offers these actions:

     1. Set strategic priorities
     2. Make founder decisions
     3. Review team progress
     4. Write vision documents

  For this tutorial, we'll create a simple GitHub issue —
  the most common type of cycle output.

═══════════════════════════════════════════════════════════════

  💡 Real cycles produce real artifacts: issues, PRs, docs, code.
     "Tangible output every cycle" is a core ADA principle.

Press ENTER to create your first issue...
```

**UX Notes:**

- Shows options but guides to recommended action
- Explains WHY (tangible output principle)
- Clear CTA for next step

---

### Step 4: Action Execution (State: `execute`)

```
[4/5] Creating Your First Artifact                     ⏩ Skip

═══════════════════════════════════════════════════════════════

  🎯 Creating GitHub issue...

  Title: docs: Welcome to ADA — First Cycle Artifact
  Body:  This issue was created during the ADA tutorial.
         It marks the beginning of your autonomous dev journey.

═══════════════════════════════════════════════════════════════

  [████████████████████░░░░] Creating...

  ✓ Issue #1 created successfully!

  View it: gh issue view 1
  Or visit: https://github.com/YOUR-ORG/YOUR-REPO/issues/1

Press ENTER to complete your cycle...
```

**UX Notes:**

- Progress bar shows work in progress
- Real issue number displayed
- Direct link provided for immediate gratification
- Checkmark confirms success

---

### Step 5: Celebration (State: `celebrate`)

```
[5/5] Magic Moment

═══════════════════════════════════════════════════════════════

                    🎉 CONGRATULATIONS! 🎉

         You just completed your first ADA cycle!

═══════════════════════════════════════════════════════════════

  Summary:
  ┌─────────────────────────────────────┐
  │  Cycle:    1                        │
  │  Role:     👔 CEO                   │
  │  Action:   Created Issue #1         │
  │  Memory:   Updated ✓                │
  └─────────────────────────────────────┘

  🏆 You're now running an autonomous development team.

═══════════════════════════════════════════════════════════════

  What's next?

  • Run more cycles:     ada run --cycles 5
  • Check team status:   ada status
  • View memory:         ada memory list
  • Read the docs:       ada docs

  Happy building! 🚀

```

**UX Notes:**

- Celebration is emphatic but not obnoxious
- Summary in a box for visual prominence
- Achievement framing ("You're now running...")
- Clear next steps with commands
- No prompt — natural ending

---

## Error States

### GitHub Authentication Missing

```
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️  GitHub CLI not authenticated                             ║
║                                                               ║
║  ADA uses `gh` CLI to create issues and PRs.                  ║
║  Let's set that up first.                                     ║
╚═══════════════════════════════════════════════════════════════╝

  Run: gh auth login

  Then restart the tutorial: ada tutorial

  Need help? https://cli.github.com/manual/gh_auth_login
```

### Network Error

```
  ✗ Failed to create issue

  Error: Network request failed (timeout)

  💡 Check your internet connection and try again.
     The tutorial will resume from this step.

  [r] Retry    [s] Skip step    [q] Quit tutorial
```

### Repository Not Initialized

```
  ⚠️  No git repository detected

  ADA works best inside a git repo with GitHub remote.

  Options:
    1. Initialize here:  git init && gh repo create
    2. Navigate to an existing repo
    3. Continue without GitHub (limited features)

  [1/2/3] >
```

---

## Accessibility

### Screen Reader Support

- All emoji have text alternatives in aria-label equivalent
- Progress indicators announced: "Step 1 of 5, Welcome"
- Colors not sole indicator — checkmarks/x-marks provide meaning

### Reduced Motion

Detect `$TERM` capabilities and degrade gracefully:

- Fancy boxes → simple dashes
- Animated checkmarks → instant display
- Progress bar → simple "Creating..."

### Color Blind Safe

- Green/Red distinguished by ✓/✗ symbols, not color alone
- Cyan/Yellow distinguishable in common color blindness types

---

## State Machine

```
┌─────────┐     ┌──────────┐     ┌────────┐
│  offer  │────▶│  intro   │────▶│dispatch│
└─────────┘     └──────────┘     └────────┘
     │               │                │
     │ skip          │ skip           │ skip
     ▼               ▼                ▼
 ┌───────┐      ┌────────┐      ┌─────────┐
 │ exit  │      │  exit  │      │ action  │
 └───────┘      └────────┘      └─────────┘
                                     │
                                     │ skip
                                     ▼
                               ┌──────────┐
                               │ execute  │
                               └──────────┘
                                     │
                                     │ (no skip)
                                     ▼
                               ┌───────────┐
                               │ celebrate │
                               └───────────┘
```

**State Persistence:**

- Store in `~/.ada/tutorial.json`: `{ "state": "dispatch", "startedAt": "...", "cycleId": 1 }`
- Allows resuming interrupted tutorials
- Clear on completion

---

## Analytics Events

| Event                   | Properties                        | Trigger                 |
| ----------------------- | --------------------------------- | ----------------------- | --------- | ------------------- |
| `tutorial.offered`      | `source: dispatch                 | init                    | explicit` | Detection triggered |
| `tutorial.started`      | `skippedOffer: boolean`           | User accepts            |
| `tutorial.step_entered` | `step: 1-5, timeInPrev: ms`       | Each step               |
| `tutorial.step_skipped` | `step: 1-5`                       | User presses 's'        |
| `tutorial.error`        | `step, errorType, errorMsg`       | Error occurs            |
| `tutorial.completed`    | `totalTime: ms, skippedSteps: []` | Celebration shown       |
| `tutorial.abandoned`    | `lastStep, totalTime`             | User quits mid-tutorial |

---

## Implementation Notes

### CLI Package Integration

```typescript
// packages/cli/src/commands/tutorial.ts
import { TutorialRunner } from '@ada-ai/core';

export const tutorialCommand = new Command('tutorial')
  .description('Run the interactive first-cycle guide')
  .action(async () => {
    const runner = new TutorialRunner({
      onStep: step => renderStep(step),
      onProgress: pct => renderProgress(pct),
      onError: err => renderError(err),
    });
    await runner.run();
  });
```

### Rendering Library

Use `@clack/prompts` or `inquirer` with custom theming:

- Box drawing with Unicode
- Spinners for async operations
- Styled text with ANSI codes

### Testing

- **Unit:** State machine transitions
- **Integration:** Mock GitHub, verify issue creation flow
- **E2E:** Playwright terminal testing (if available) or manual QA

---

## Dependencies

- **#183** (Onboarding Wizard): Shares first-run detection logic
- **#155** (SaaS Container): User ID for analytics
- **C1272** (Upgrade Prompts UX): Shares celebration pattern language

---

## Open Questions

1. **Skip granularity:** Should users skip individual steps or exit entirely?
   - **Recommendation:** Both — 's' skips step, 'q' quits tutorial

2. **Tutorial re-run:** Can users run tutorial again after completing?
   - **Recommendation:** Yes via `ada tutorial --force`

3. **Offline mode:** What happens if GitHub is unreachable?
   - **Recommendation:** Detect early, offer to continue without issue creation

---

## Appendix: Full Terminal Mockup

```
$ ada dispatch start

╔═══════════════════════════════════════════════════════════╗
║  🆕 First time using ADA?                                 ║
║                                                           ║
║  We can guide you through your first cycle (~3 min).      ║
║  You'll create a real artifact and see how ADA works.     ║
╚═══════════════════════════════════════════════════════════╝

  [Y] Start tutorial    [n] Skip (advanced users)

> y

[1/5] Welcome                                          ⏩ Skip

═══════════════════════════════════════════════════════════════

  📚 Welcome to ADA — Autonomous Dev Agents

  ADA runs a team of AI roles that develop software autonomously.
  Each role takes turns (CEO → Growth → Research → ... → Design).

  Your team: 10 roles configured
  Next up:   👔 CEO (Strategic Direction & Founder Priorities)

═══════════════════════════════════════════════════════════════

  💡 You're about to run your first "dispatch cycle" — one role
     taking one action and updating shared memory.

Press ENTER to continue, or 's' to skip tutorial...

[2/5] Starting Your Cycle                              ⏩ Skip

═══════════════════════════════════════════════════════════════

  🚀 Let's start a dispatch cycle.

  Running: ada dispatch start

═══════════════════════════════════════════════════════════════

  Initializing...
  ✓ Cycle 1 started
  ✓ Role: 👔 CEO
  ✓ Playbook: agents/playbooks/ceo.md
  ✓ Memory: agents/memory/bank.md (v1)

  💡 The playbook defines what actions this role can take.
     After the tutorial, explore it: cat agents/playbooks/ceo.md

Press ENTER to continue...

[3/5] Choosing an Action                               ⏩ Skip

═══════════════════════════════════════════════════════════════

  📋 As CEO, your playbook offers these actions:

     1. Set strategic priorities
     2. Make founder decisions
     3. Review team progress
     4. Write vision documents

  For this tutorial, we'll create a simple GitHub issue —
  the most common type of cycle output.

═══════════════════════════════════════════════════════════════

  💡 Real cycles produce real artifacts: issues, PRs, docs, code.
     "Tangible output every cycle" is a core ADA principle.

Press ENTER to create your first issue...

[4/5] Creating Your First Artifact                     ⏩ Skip

═══════════════════════════════════════════════════════════════

  🎯 Creating GitHub issue...

  Title: docs: Welcome to ADA — First Cycle Artifact
  Body:  This issue was created during the ADA tutorial.
         It marks the beginning of your autonomous dev journey.

═══════════════════════════════════════════════════════════════

  ✓ Issue #1 created successfully!

  View it: gh issue view 1

Press ENTER to complete your cycle...

[5/5] Magic Moment

═══════════════════════════════════════════════════════════════

                    🎉 CONGRATULATIONS! 🎉

         You just completed your first ADA cycle!

═══════════════════════════════════════════════════════════════

  Summary:
  ┌─────────────────────────────────────┐
  │  Cycle:    1                        │
  │  Role:     👔 CEO                   │
  │  Action:   Created Issue #1         │
  │  Memory:   Updated ✓                │
  └─────────────────────────────────────┘

  🏆 You're now running an autonomous development team.

═══════════════════════════════════════════════════════════════

  What's next?

  • Run more cycles:     ada run --cycles 5
  • Check team status:   ada status
  • View memory:         ada memory list
  • Read the docs:       ada docs

  Happy building! 🚀

$
```

---

_Created by 🎨 Design (C1282) — Companion to Product spec #267 (C1277)_
