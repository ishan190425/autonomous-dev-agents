# Onboarding Wizard UX Design Spec (C1222)

> **Sprint 4 Front-Load** — Visual/UX design layer for `ada init` interactive wizard.
> Created: 2026-02-27 | Author: 🎨 Design (The Architect)
> Complements: C1217 (Product Spec) | Issue: #183 (P1, Design, M)
> Per L706: "Front-load next-sprint specs during current-sprint T-3 window."

---

## Executive Summary

This spec defines the **visual design system** for the `ada init` onboarding wizard. While C1217 defines _what_ the wizard does, this spec defines _how it looks and feels_ — terminal UI components, color palette, animation patterns, accessibility standards, and detailed wireframes.

**Design Principles:**

1. **Friendly, not corporate** — Use emoji, casual language, celebration
2. **Progressive disclosure** — Show only what's needed at each step
3. **Error recovery** — Clear paths back when mistakes happen
4. **Accessible first** — Color-blind safe, screen reader compatible

---

## Terminal UI Component Library

### 1. Box Components

Use Unicode box-drawing characters for visual structure.

#### Header Box (Welcome/Summary)

```
╔════════════════════════════════════════════════════════════════╗
║  🚀 Welcome to ADA — Let's build your autonomous dev team!     ║
╚════════════════════════════════════════════════════════════════╝
```

**TypeScript:**

```typescript
import boxen from 'boxen';

const headerBox = (title: string) =>
  boxen(title, {
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderStyle: 'double',
    borderColor: 'cyan',
  });
```

#### Info Box (Tips/Notes)

```
┌─────────────────────────────────────────────────────────────────┐
│  💡 Tip: You can change roles later with `ada config roles`     │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
const infoBox = (text: string) =>
  boxen(text, {
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderStyle: 'single',
    borderColor: 'gray',
    dimBorder: true,
  });
```

#### Summary Box (Confirmation Screen)

```
┌────────────────────────────────────────────────────────────────┐
│                    📋 Configuration Summary                     │
├────────────────────────────────────────────────────────────────┤
│  Project:    my-awesome-app (Next.js)                          │
│  Team Size:  Small (2-5 people)                                │
│  Focus:      Code Quality, Feature Development                 │
│                                                                │
│  Roles (4):  ⚙️ engineering  🔍 qa  📦 product  🛡️ ops        │
├────────────────────────────────────────────────────────────────┤
│  Settings:                                                     │
│    • Cycles per session: 10                                    │
│    • Sprint planning: No                                       │
│    • Compression: Every 15 cycles                              │
└────────────────────────────────────────────────────────────────┘
```

**Design Notes:**

- Use `├────┤` dividers for section breaks
- Consistent 2-space indent for content
- Emoji prefix for section headers

---

### 2. Progress Indicator

Show wizard progress at top of each screen.

```
  Step 2 of 8 ━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━ Team Size
```

**Implementation:**

```typescript
const progressBar = (step: number, total: number, label: string) => {
  const filled = Math.floor((step / total) * 30);
  const empty = 30 - filled;
  const bar = '━'.repeat(filled) + '●' + '━'.repeat(empty);
  return `  Step ${step} of ${total} ${bar} ${label}`;
};
```

**Color:**

- Filled portion: `cyan`
- Current dot: `white` (bright)
- Empty portion: `gray`

---

### 3. Selection Lists

#### Single-Select (Radio)

```
? What type of project is this?

  ❯ 🌐 Web Application (React/Next.js/Vue)
    🔧 CLI Tool (Node.js/Python)
    🔌 API Service (Express/Fastify/FastAPI)
    📦 Library/Package
    📱 Mobile App (React Native)
    📁 Other

  ↑/↓ to move, enter to select
```

**Design:**

- `❯` cursor in cyan
- Selected item text in white (bright)
- Unselected items in default
- Help text in gray, dimmed

#### Multi-Select (Checkbox)

```
? What's your team's focus? (Select all that apply)

  ◉ 🧪 Code Quality — Tests, refactoring, reviews
  ◉ 📦 Feature Development — New features, stories
  ◯ 📚 Documentation — README, API docs, examples
  ◯ 🚀 DevOps/Infra — CI/CD, deployments
  ◯ 🔬 Research — Experiments, new approaches
  ◯ 📣 Growth — Marketing, community

  space to toggle, enter to confirm
```

**Design:**

- `◉` (filled circle) for selected — cyan
- `◯` (empty circle) for unselected — gray
- Description after `—` in dim gray
- At least one selection required (validate before proceed)

---

### 4. Confirmation Prompts

```
? Create ADA team with this configuration? (Y/n)
```

**Design:**

- Question mark `?` in cyan
- Default option in UPPERCASE and parentheses
- Press enter accepts default

#### With Go-Back Option

```
? Ready to create files? (Y/n/b=back)
```

---

### 5. Status Messages

#### Success

```
  ✓ Git repository found
```

- Checkmark `✓` in green
- Message in default white

#### Warning

```
  ⚠️ No .gitignore found — consider adding agents/state/
```

- Warning emoji in yellow
- Message in yellow
- Suggestion after `—` in dim

#### Error

```
  ✗ Git repository required — run `git init` first
```

- Cross `✗` in red
- Message in red
- Fix suggestion in cyan (the command)

#### In Progress

```
  ◐ Detecting project type...
```

- Spinner in cyan (cycles: `◐ ◓ ◑ ◒`)
- Message in default

---

### 6. File Creation List

```
📁 Created files:
   agents/roster.json
   agents/state/rotation.json
   agents/memory/bank.md
   agents/rules/RULES.md
   agents/playbooks/engineering.md
   agents/playbooks/qa.md
   agents/playbooks/product.md
   agents/playbooks/ops.md
   agents/DISPATCH.md
```

**Design:**

- Folder emoji prefix
- 3-space indent for file paths
- Paths in cyan

---

## Color Palette

### Semantic Colors

| Purpose      | Color   | ANSI Code  | Usage                           |
| ------------ | ------- | ---------- | ------------------------------- |
| Primary      | Cyan    | `\x1b[36m` | Questions, prompts, commands    |
| Success      | Green   | `\x1b[32m` | Checkmarks, completion          |
| Warning      | Yellow  | `\x1b[33m` | Warnings, cautions              |
| Error        | Red     | `\x1b[31m` | Errors, failures                |
| Accent       | Magenta | `\x1b[35m` | Highlights, celebration         |
| Muted        | Gray    | `\x1b[90m` | Help text, descriptions, dimmed |
| Default      | White   | `\x1b[37m` | Body text                       |
| Bright White | White   | `\x1b[97m` | Emphasis, selected items        |

### Chalk Implementation

```typescript
import chalk from 'chalk';

export const colors = {
  primary: chalk.cyan,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  accent: chalk.magenta,
  muted: chalk.gray,
  emphasis: chalk.white.bold,
  command: chalk.cyan.bold,
  path: chalk.cyan,
};
```

### Accessibility: Color-Blind Safe

All status indicators use **shape + color** combinations:

| Status  | Symbol | Color  | Color-Blind Readable |
| ------- | ------ | ------ | -------------------- |
| Success | ✓      | Green  | Checkmark shape      |
| Warning | ⚠️     | Yellow | Triangle shape       |
| Error   | ✗      | Red    | Cross shape          |
| Info    | 💡     | None   | Lightbulb emoji      |
| Pending | ◐      | Cyan   | Spinner animation    |

**Never rely on color alone** — always pair with symbol/shape.

---

## Animation Patterns

### 1. Spinners (ora)

Use for async operations (file detection, validation).

```typescript
import ora from 'ora';

const spinner = ora({
  text: 'Detecting project type...',
  spinner: 'dots', // ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏
  color: 'cyan',
});

spinner.start();
// ... async work
spinner.succeed('Detected: Next.js project');
// or
spinner.warn('Could not auto-detect project type');
```

**Spinner Styles:**

- Detection/validation: `dots` (subtle)
- File creation: `dots` (subtle)
- Heavy processing: `bouncingBar` (more visible)

### 2. Progress Animation

For multi-step processes (file creation):

```
Creating files... ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 7/9
```

### 3. Celebration Animation

On successful completion:

```
✨ ADA team created! ✨
```

**Design Notes:**

- Sparkle emoji bookends
- Brief pause (300ms) before showing next steps
- No excessive animation — respect user's time

---

## Screen Wireframes

### Screen 1: Welcome

```
╔════════════════════════════════════════════════════════════════╗
║  🚀 Welcome to ADA — Let's build your autonomous dev team!     ║
╚════════════════════════════════════════════════════════════════╝

  ADA (Autonomous Dev Agents) is a framework for autonomous
  software development using multi-role agent teams.

  This wizard will help you configure:
    • Project type detection
    • Team size and focus areas
    • Agent roles for your workflow
    • Dispatch settings

  Estimated time: ~2 minutes

? Ready to start? (Y/n)
```

### Screen 2: Project Detection

```
  Step 1 of 8 ━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Project Detection

  ◐ Detecting project type...

  (spinner completes)

  ✓ Detected: Next.js project
    Found: package.json, next.config.js, tsconfig.json

? Is this correct? (Y/n/m=manual)
```

If manual or correction needed:

```
? What type of project is this?

  ❯ 🌐 Web Application (React/Next.js/Vue)
    🔧 CLI Tool (Node.js/Python)
    🔌 API Service (Express/Fastify/FastAPI)
    📦 Library/Package
    📱 Mobile App (React Native)
    📁 Other

  ↑/↓ to move, enter to select
```

### Screen 3: Team Sizing

```
  Step 2 of 8 ━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━ Team Size

? What's your team size?

  ❯ 🧑 Solo — I'm the whole team (3 roles)
    👥 Small (2-5) — Wearing multiple hats (5 roles)
    🏢 Medium (6-15) — Specialized roles (7 roles)
    🌐 Large (15+) — Full rotation (10 roles)

┌─────────────────────────────────────────────────────────────────┐
│  💡 Tip: Start small — you can add roles later with            │
│     `ada config roles add <role>`                               │
└─────────────────────────────────────────────────────────────────┘
```

### Screen 4: Focus Areas

```
  Step 3 of 8 ━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━ Focus Areas

? What's your team's focus? (Select all that apply)

  ◉ 🧪 Code Quality — Tests, refactoring, reviews
  ◉ 📦 Feature Development — New features, user stories
  ◯ 📚 Documentation — README, API docs, examples
  ◯ 🚀 DevOps/Infra — CI/CD, deployments
  ◯ 🔬 Research — Experiments, new approaches
  ◯ 📣 Growth — Marketing, community outreach

  space to toggle, enter to confirm (min 1)
```

### Screen 5: Role Selection

```
  Step 4 of 8 ━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━ Role Selection

  Based on your answers, we recommend:

    ✓ ⚙️ Engineering — Code, features, bug fixes
    ✓ 🔍 QA — Testing, quality gates
    ✓ 📦 Product — Specs, priorities, user stories
    ✓ 🛡️ Ops — CI/CD, deployments

? Customize roles?

  ❯ Continue with these 4 roles
    Add more roles
    Remove roles
    Start over

  ↑/↓ to move, enter to select
```

If "Add more roles":

```
? Add roles: (select to add, enter when done)

  ◯ 👔 CEO — Strategy, decisions, blockers
  ◯ 🎨 Design — UX, visual design, DX
  ◯ 🔬 Research — New approaches, experiments
  ◯ 🌌 Frontier — Architecture, cutting-edge
  ◯ 📋 Scrum — Sprints, retros, process
  ◯ 🚀 Growth — Marketing, community, launch

  space to toggle, enter to confirm
```

### Screen 6: Configuration

```
  Step 5 of 8 ━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━ Configuration

? Cycles per dispatch session: (10)
❯ 10

? Enable sprint planning? (recommended for teams)
  ❯ Yes — Scrum role tracks sprints and retros
    No — Continuous development without sprints

? Memory compression interval:
    5 cycles — Aggressive (less context, faster)
  ❯ 15 cycles — Balanced (recommended)
    25 cycles — Conservative (more context, slower)

┌─────────────────────────────────────────────────────────────────┐
│  💡 Memory compression summarizes old context to save tokens.   │
│     Lower = faster but less history. Higher = slower but more   │
│     context for decision-making.                                │
└─────────────────────────────────────────────────────────────────┘
```

### Screen 7: Pre-Flight Validation

```
  Step 6 of 8 ━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━ Validation

  🔍 Running pre-flight checks...

    ✓ Git repository found
    ✓ Write permissions OK
    ✓ No existing ADA configuration
    ⚠️ No .gitignore — we'll add recommended entries

? Continue with setup? (Y/n)
```

If validation fails:

```
  Step 6 of 8 ━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━ Validation

  🔍 Running pre-flight checks...

    ✗ Git repository required

  ──────────────────────────────────────────────────────────────

  ADA requires a git repository to track agent state.

  To fix, run:
    git init

  Then run `ada init` again.
```

### Screen 8: Confirmation Summary

```
  Step 7 of 8 ━━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━ Confirmation

┌────────────────────────────────────────────────────────────────┐
│                    📋 Configuration Summary                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Project                                                       │
│    Type:     Next.js (Web Application)                         │
│    Path:     /Users/dev/my-awesome-app                         │
│                                                                │
│  Team                                                          │
│    Size:     Small (2-5 people)                                │
│    Focus:    Code Quality, Feature Development                 │
│    Roles:    ⚙️ engineering  🔍 qa  📦 product  🛡️ ops        │
│                                                                │
│  Settings                                                      │
│    Cycles per session:   10                                    │
│    Sprint planning:      Yes                                   │
│    Memory compression:   Every 15 cycles                       │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Files to create:                                              │
│    agents/roster.json          agents/DISPATCH.md              │
│    agents/state/rotation.json  agents/rules/RULES.md           │
│    agents/memory/bank.md       agents/playbooks/ (4 files)     │
│                                                                │
└────────────────────────────────────────────────────────────────┘

? Create ADA team? (Y/n/b=back)
```

### Screen 9: Success

```
  Step 8 of 8 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●━ Complete

  ✨ ADA team created! ✨

  📁 Created files:
     agents/roster.json
     agents/state/rotation.json
     agents/memory/bank.md
     agents/rules/RULES.md
     agents/playbooks/engineering.md
     agents/playbooks/qa.md
     agents/playbooks/product.md
     agents/playbooks/ops.md
     agents/DISPATCH.md

  🚀 Next steps:

     1. Review your team:
        ada status

     2. Start your first cycle:
        ada dispatch start

     3. Read the dispatch protocol:
        cat agents/DISPATCH.md

  ──────────────────────────────────────────────────────────────

  📚 Docs:     https://docs.ada.dev/getting-started
  💬 Discord:  https://discord.gg/ada
  🐛 Issues:   https://github.com/ada-ai/ada/issues

  Happy building! 🎉
```

---

## Accessibility Specifications

### Screen Reader Support

1. **Announce step transitions:**

   ```typescript
   // Announce to screen readers
   process.stdout.write('\x1b]0;ADA Init - Step 2 of 8\x07');
   ```

2. **Text alternatives for visual elements:**
   - Progress bar: "Step 2 of 8, Team Size"
   - Checkmark: "Success: Git repository found"
   - Spinner: "Loading: Detecting project type"

3. **Avoid ANSI codes for critical info:**
   - All status messages readable without color
   - Critical info not conveyed by color alone

### Keyboard Navigation

| Key       | Action                          |
| --------- | ------------------------------- |
| ↑ / ↓     | Navigate options                |
| Space     | Toggle selection (multi-select) |
| Enter     | Confirm / proceed               |
| Backspace | Go back to previous step        |
| Ctrl+C    | Cancel wizard                   |
| ?         | Show help for current step      |

### Reduced Motion

Detect and respect `TERM_PROGRAM` / `NO_COLOR` / `REDUCE_MOTION`:

```typescript
const useAnimation =
  !process.env.NO_COLOR && !process.env.REDUCE_MOTION && process.stdout.isTTY;

if (useAnimation) {
  spinner.start();
} else {
  console.log('Detecting project type...');
}
```

### High Contrast Mode

When `NO_COLOR` is set:

- Remove all ANSI color codes
- Use symbols only for status (✓, ✗, ⚠️)
- Box drawing characters remain (semantic structure)

---

## Error States

### Validation Error (Blocking)

```
┌─────────────────────────────────────────────────────────────────┐
│  ✗ Cannot continue: Git repository required                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ADA tracks agent state using git. Without a repository,        │
│  agent history and memory cannot be versioned.                  │
│                                                                 │
│  To fix:                                                        │
│    cd /Users/dev/my-project                                     │
│    git init                                                     │
│                                                                 │
│  Then run `ada init` again.                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Design Notes:**

- Red header with cross
- Clear explanation of _why_
- Exact commands to fix
- No "continue anyway" option for blocking errors

### Write Error (Mid-Process)

```
  ◐ Creating files...

    ✓ agents/roster.json
    ✓ agents/state/rotation.json
    ✗ agents/memory/bank.md — Permission denied

  ──────────────────────────────────────────────────────────────

  ⚠️ Partial creation: 2 of 9 files created.

  The remaining files could not be written due to permission
  issues. Files already created are valid.

  Options:
    1. Fix permissions and run `ada init --continue`
    2. Remove partial files with `ada init --clean`
    3. Manual setup: copy templates from docs

? What would you like to do?
  ❯ Show detailed error
    Exit and fix manually
```

### Network Error (If Applicable)

```
  ⚠️ Could not check for template updates (offline?)

  Continuing with bundled templates (v1.0.0).
  Run `ada update` later to get latest templates.

? Continue? (Y/n)
```

---

## Integration with Design System

### Consistency with C1202 (Error Page UX)

Error messages follow the same pattern:

- Clear error title
- Explanation of cause
- Actionable fix steps
- Commands in cyan, paths in cyan

### Consistency with C1212 (Dashboard)

While C1212 is for web dashboard, shared patterns:

- Same color semantics (cyan primary, green success, etc.)
- Same emoji role indicators (⚙️, 🔍, 📦, etc.)
- Consistent terminology

### Component Reuse

Create shared terminal UI utilities:

```typescript
// packages/cli/src/ui/index.ts
export { headerBox, infoBox, summaryBox } from './boxes';
export { progressBar, spinner } from './progress';
export { colors, formatPath, formatCommand } from './format';
export { success, warning, error, info } from './status';
export { singleSelect, multiSelect, confirm } from './prompts';
```

---

## Implementation Checklist

### Day 1: Foundation

- [ ] Set up `packages/cli/src/ui/` directory structure
- [ ] Implement color palette (chalk wrapper)
- [ ] Implement box components (boxen wrapper)
- [ ] Implement progress bar

### Day 2: Prompts

- [ ] Single-select with keyboard navigation
- [ ] Multi-select with toggle
- [ ] Confirmation prompts with defaults
- [ ] Input prompts with validation

### Day 3: Screens

- [ ] Welcome screen
- [ ] Project detection screen
- [ ] Team sizing screen
- [ ] Focus area screen
- [ ] Role selection screen

### Day 4: Completion

- [ ] Configuration screen
- [ ] Validation screen
- [ ] Confirmation summary
- [ ] Success screen with next steps
- [ ] Error states

### Day 5: Polish

- [ ] Accessibility audit (screen reader, keyboard)
- [ ] NO_COLOR support
- [ ] Animation/spinner polish
- [ ] E2E test for full flow

---

## Success Metrics

| Metric                   | Target | Measurement                     |
| ------------------------ | ------ | ------------------------------- |
| Wizard completion rate   | > 90%  | Start → files created           |
| Average completion time  | < 2min | Timer from welcome to success   |
| Accessibility compliance | WCAG A | Manual audit + automated checks |
| Error recovery rate      | > 80%  | Users who hit error → retry     |

---

## Related Documents

- **C1217** — Product Spec (what the wizard does)
- **C1202** — Error Page UX (error message styling)
- **C1212** — Memory Heat Dashboard (color palette reference)
- **#183** — Issue: Interactive Onboarding Wizard

---

## Changelog

- **C1222 (2026-02-27):** Initial UX design spec. Complements C1217 product spec with visual design layer.
