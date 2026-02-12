# ✨ CLI Banner Art Design Specification

> Design specification for the first-run CLI banner experience.
> **Author:** 🎨 The Architect | **Cycle:** 435 | **Date:** 2026-02-12
> **Related:** Issue #133 (CLI Banner Art)
> **Status:** Design | **Target:** Sprint 1 (Pre-Launch Polish)

---

## Executive Summary

A polished first-run banner creates a memorable first impression — essential for Pioneer/YC demos and organic word-of-mouth. This spec defines the banner art, behavior rules, and implementation approach.

**Design Principle:** Professional but approachable. The banner should convey "this is a serious tool built by people who care about details" without being flashy or gimmicky.

---

## Banner Design

### Primary Banner (Recommended)

```
    ╭─────────────────────────────────────────────────────╮
    │                                                     │
    │      █████╗ ██████╗  █████╗                         │
    │     ██╔══██╗██╔══██╗██╔══██╗                        │
    │     ███████║██║  ██║███████║                        │
    │     ██╔══██║██║  ██║██╔══██║                        │
    │     ██║  ██║██████╔╝██║  ██║                        │
    │     ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝                        │
    │                                                     │
    │     Autonomous Dev Agents                           │
    │     Multi-agent teams for your codebase             │
    │                                                     │
    │     v1.0.0-alpha                                    │
    │                                                     │
    ╰─────────────────────────────────────────────────────╯
```

### Alternative: Compact Banner

For terminals with limited width or when subtlety is preferred:

```
    ┌──────────────────────────────────────────────┐
    │  🤖 ADA — Autonomous Dev Agents              │
    │  Multi-agent teams for your codebase         │
    │                                     v1.0.0-α │
    └──────────────────────────────────────────────┘
```

### Alternative: Minimalist Banner

For maximum compatibility and speed:

```
  ╔═══════════════════════════════════════════════════╗
  ║  A D A  ·  Autonomous Dev Agents  ·  v1.0.0-α    ║
  ╚═══════════════════════════════════════════════════╝
```

---

## Color Scheme

### Primary Colors

| Element       | Color     | chalk Code      | Fallback |
| ------------- | --------- | --------------- | -------- |
| "ADA" letters | Cyan      | `chalk.cyan()`  | Bold     |
| Box border    | Dim white | `chalk.dim()`   | Plain    |
| Tagline       | White     | `chalk.white()` | Plain    |
| Version       | Green     | `chalk.green()` | Dim      |
| Emoji (🤖)    | Native    | Unicode         | `[*]`    |

### Color Fallback

When `--no-color` or `NO_COLOR` env is set, use ASCII-only art:

```
    +--------------------------------------------------+
    |                                                  |
    |       A D A                                      |
    |       Autonomous Dev Agents                      |
    |       Multi-agent teams for your codebase        |
    |                                                  |
    |       v1.0.0-alpha                               |
    |                                                  |
    +--------------------------------------------------+
```

---

## Behavior Rules

### When to Show

| Trigger                   | Show Banner? | Notes                       |
| ------------------------- | ------------ | --------------------------- |
| `ada init` (first run)    | ✅ Full      | Memorable first impression  |
| `ada init` (re-init)      | ❌ No        | User is familiar            |
| First `ada` cmd (no init) | ✅ Compact   | + prompt to run `ada init`  |
| `ada --version`           | ✅ Compact   | One-line with version       |
| `ada dispatch`            | ❌ No        | Clean output for automation |
| `ada status`              | ❌ No        | Clean output                |
| `ada dispatch --headless` | ❌ Never     | Automation mode             |
| `ada <any> --banner`      | ✅ Full      | User explicitly requested   |
| CI environment detected   | ❌ Never     | Clean logs                  |

### First-Run Detection

Track banner state in user config (`~/.ada/config.json`):

```json
{
  "banner": {
    "seenFullBanner": true,
    "firstSeenVersion": "1.0.0-alpha",
    "firstSeenAt": "2026-02-24T12:00:00Z"
  }
}
```

### CI Detection

Skip banner when any of these are true:

```typescript
const isCI = () =>
  process.env.CI ||
  process.env.CONTINUOUS_INTEGRATION ||
  process.env.GITHUB_ACTIONS ||
  process.env.GITLAB_CI ||
  process.env.CIRCLECI ||
  process.env.JENKINS_URL ||
  !process.stdout.isTTY;
```

---

## Animation (Optional)

### Typing Effect

For `ada init`, consider a subtle typing effect for the tagline:

```
    Multi-agent teams for your codebase_
                                       ▌ (blinking cursor)
```

**Implementation:** Use `cli-cursor` and `readline` for cursor control.

**Recommendation:** Skip animation for v1.0-alpha. Add in v1.1 if user feedback is positive. Animation adds complexity and can feel gimmicky.

---

## Role Introduction Panel

After the banner on `ada init`, show the team being created:

```
  Creating your agent team...

  ┌─ Your Team ─────────────────────────────────────────┐
  │                                                     │
  │  👔 CEO           Strategic direction & vision      │
  │  🔬 Research      Discovery & analysis              │
  │  📦 Product       Features & roadmap                │
  │  📋 Scrum         Coordination & retros             │
  │  ⚙️ Engineering   Code & implementation             │
  │  🔍 QA            Testing & quality                 │
  │  🛡️ Ops           Infrastructure & CI               │
  │  🎨 Design        UX & architecture                 │
  │                                                     │
  └─────────────────────────────────────────────────────┘

  8 roles ready. Run `ada dispatch start` to begin.
```

---

## Implementation

### Recommended Approach

```typescript
// packages/cli/src/utils/banner.ts

import chalk from 'chalk';
import { getConfig, updateConfig } from './config.js';

const FULL_BANNER = `
    ╭─────────────────────────────────────────────────────╮
    │                                                     │
    │      ${chalk.cyan('█████╗ ██████╗  █████╗')}                         │
    │     ${chalk.cyan('██╔══██╗██╔══██╗██╔══██╗')}                        │
    │     ${chalk.cyan('███████║██║  ██║███████║')}                        │
    │     ${chalk.cyan('██╔══██║██║  ██║██╔══██║')}                        │
    │     ${chalk.cyan('██║  ██║██████╔╝██║  ██║')}                        │
    │     ${chalk.cyan('╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝')}                        │
    │                                                     │
    │     ${chalk.white('Autonomous Dev Agents')}                           │
    │     ${chalk.dim('Multi-agent teams for your codebase')}             │
    │                                                     │
    │     ${chalk.green(`v${version}`)}                                    │
    │                                                     │
    ╰─────────────────────────────────────────────────────╯
`;

const COMPACT_BANNER = `
    ┌──────────────────────────────────────────────┐
    │  🤖 ${chalk.cyan('ADA')} — Autonomous Dev Agents              │
    │  ${chalk.dim('Multi-agent teams for your codebase')}         │
    │                                     ${chalk.green(`v${version}`)} │
    └──────────────────────────────────────────────┘
`;

export interface BannerOptions {
  force?: boolean; // Show even if seen before
  compact?: boolean; // Use compact variant
  noColor?: boolean; // ASCII-only mode
}

export function showBanner(options: BannerOptions = {}): void {
  if (isCI() && !options.force) return;

  const config = getConfig();
  if (config.banner?.seenFullBanner && !options.force) return;

  const banner = options.compact ? COMPACT_BANNER : FULL_BANNER;
  const output = options.noColor ? stripColors(banner) : banner;

  console.log(output);

  if (!options.compact) {
    updateConfig({
      banner: { seenFullBanner: true, firstSeenAt: new Date().toISOString() },
    });
  }
}
```

### Integration Points

1. **`ada init`** — Call `showBanner()` at start
2. **`ada` (no subcommand)** — Call `showBanner({ compact: true })`
3. **`ada --version`** — Show version with mini banner
4. **Global `--banner` flag** — Add to root command, passes `force: true`

---

## Testing Checklist

- [ ] Banner shows on first `ada init`
- [ ] Banner does NOT show on second `ada init`
- [ ] Banner shows with `--banner` flag
- [ ] Banner does NOT show in CI (GitHub Actions)
- [ ] Banner does NOT show with `--headless`
- [ ] Colors render correctly in: bash, zsh, fish, PowerShell
- [ ] No-color mode works with `--no-color` and `NO_COLOR=1`
- [ ] Box characters render in Windows Terminal, iTerm2, VS Code terminal
- [ ] Version number is correct and updates with package.json

---

## Accessibility

| Concern             | Solution                                                 |
| ------------------- | -------------------------------------------------------- |
| Screen readers      | ASCII art is decorative; key info is in plain text       |
| Color blindness     | No color-only semantics; all info readable without color |
| Reduced motion      | No animation by default                                  |
| Terminal width < 60 | Fall back to compact banner                              |

---

## Timeline

| Date   | Milestone                     | Owner         |
| ------ | ----------------------------- | ------------- |
| Feb 12 | Design spec complete          | Design (C435) |
| Feb 14 | Implementation by Engineering | Engineering   |
| Feb 17 | Go/No-Go includes banner      | All           |
| Feb 24 | v1.0-alpha ships with banner  | All           |

---

## Open Questions

1. **Figlet vs hand-crafted?** Recommendation: Hand-crafted for pixel-perfect control. Figlet can generate inconsistent output.

2. **Sound?** Some CLIs play a startup sound. Recommendation: No — unexpected audio is jarring.

3. **Update notification?** Show "Update available: v1.1" in banner? Recommendation: Yes, but defer to post-launch (v1.1).

---

## References

- Issue #133 — First-run CLI banner art
- [chalk](https://github.com/chalk/chalk) — Terminal string styling
- [boxen](https://github.com/sindresorhus/boxen) — Create boxes in terminal (optional)
- [figlet](https://github.com/patorjk/figlet.js) — ASCII art text generator (reference only)

---

_🎨 The Architect | Cycle 435 | CLI Banner Art Design Specification_
_"First impressions matter — make them memorable."_
