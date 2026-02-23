# CLI Banner Art Design Spec (C1152)

> 🎨 **Design Spec for #133: First-run CLI Banner Art**
>
> Created: 2026-02-23 | Cycle: 1152 | Author: Design (The Architect)

---

## Overview

This spec defines the visual identity for ADA's CLI experience, including ASCII art banners, color schemes, and branding elements. The goal is to create a memorable first impression that signals "this is a polished, professional tool" while communicating ADA's core value proposition: autonomous multi-agent dev teams.

---

## Design Principles

1. **Professional yet approachable** — Not too playful, not too corporate
2. **Fast rendering** — No network calls, minimal ASCII complexity
3. **Terminal-safe** — Works in all terminals, graceful no-color fallback
4. **Memorable** — Distinct visual identity among CLI tools
5. **Informative** — Conveys what ADA does at a glance

---

## ASCII Art Options

### Option A: Geometric (Recommended)

```
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║      █████╗ ██████╗  █████╗                           ║
    ║     ██╔══██╗██╔══██╗██╔══██╗                          ║
    ║     ███████║██║  ██║███████║                          ║
    ║     ██╔══██║██║  ██║██╔══██║                          ║
    ║     ██║  ██║██████╔╝██║  ██║                          ║
    ║     ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝                          ║
    ║                                                       ║
    ║     Autonomous Dev Agents                             ║
    ║     Multi-agent dev teams for any codebase            ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
```

**Pros:** Clean, modern, bold. Box frame creates visual containment.
**Cons:** Wide (requires 60+ char terminal width).

### Option B: Minimal Block

```
     ▄▀█ █▀▄ █▀█
     █▀█ █▄▀ █▀█

     Autonomous Dev Agents v1.0
     Multi-agent dev teams for any codebase
```

**Pros:** Compact (40 chars wide), fast to render, works in narrow terminals.
**Cons:** Less visually impactful.

### Option C: Figlet Standard

```
        _    ____    _
       / \  |  _ \  / \
      / _ \ | | | |/ _ \
     / ___ \| |_| / ___ \
    /_/   \_\____/_/   \_\

    Autonomous Dev Agents v1.0
```

**Pros:** Classic ASCII art style, recognizable figlet aesthetic.
**Cons:** Plain, less distinctive.

### Option D: Hybrid (Modern + Emoji)

```
    ┌──────────────────────────────────────────┐
    │                                          │
    │   🤖 ADA — Autonomous Dev Agents         │
    │                                          │
    │   Multi-agent dev teams for any repo     │
    │   Ship software while you sleep          │
    │                                          │
    └──────────────────────────────────────────┘
```

**Pros:** Emoji adds personality, minimal but informative.
**Cons:** Less dramatic, emoji rendering varies by terminal.

---

## Recommended Design: Option A with Color

### Full Color Version (Chalk/Picocolors)

```typescript
import pc from 'picocolors';

const banner = `
    ${pc.dim('╔═══════════════════════════════════════════════════════╗')}
    ${pc.dim('║')}                                                       ${pc.dim('║')}
    ${pc.dim('║')}      ${pc.cyan('█████╗ ██████╗  █████╗')}                           ${pc.dim('║')}
    ${pc.dim('║')}     ${pc.cyan('██╔══██╗██╔══██╗██╔══██╗')}                          ${pc.dim('║')}
    ${pc.dim('║')}     ${pc.cyan('███████║██║  ██║███████║')}                          ${pc.dim('║')}
    ${pc.dim('║')}     ${pc.cyan('██╔══██║██║  ██║██╔══██║')}                          ${pc.dim('║')}
    ${pc.dim('║')}     ${pc.cyan('██║  ██║██████╔╝██║  ██║')}                          ${pc.dim('║')}
    ${pc.dim('║')}     ${pc.cyan('╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝')}                          ${pc.dim('║')}
    ${pc.dim('║')}                                                       ${pc.dim('║')}
    ${pc.dim('║')}     ${pc.bold('Autonomous Dev Agents')}                             ${pc.dim('║')}
    ${pc.dim('║')}     ${pc.dim('Multi-agent dev teams for any codebase')}            ${pc.dim('║')}
    ${pc.dim('║')}                                                       ${pc.dim('║')}
    ${pc.dim('╚═══════════════════════════════════════════════════════╝')}
`;
```

### Color Palette

| Element        | Color      | Picocolors Function | Hex (Reference) |
| -------------- | ---------- | ------------------- | --------------- |
| ADA Logo       | Cyan       | `pc.cyan()`         | #00BCD4         |
| Box Frame      | Dim Gray   | `pc.dim()`          | #666666         |
| Title          | Bold White | `pc.bold()`         | #FFFFFF         |
| Tagline        | Dim White  | `pc.dim()`          | #AAAAAA         |
| Version        | Green      | `pc.green()`        | #4CAF50         |
| Error States   | Red        | `pc.red()`          | #F44336         |
| Success States | Green      | `pc.green()`        | #4CAF50         |

---

## Context-Specific Banners

### 1. `ada init` — Full Banner

Shows the complete branded banner with initialization prompt.

```
    ╔═══════════════════════════════════════════════════════╗
    ║      █████╗ ██████╗  █████╗                           ║
    ║     ██╔══██╗██╔══██╗██╔══██╗                          ║
    ║     ███████║██║  ██║███████║                          ║
    ║     ██╔══██║██║  ██║██╔══██║                          ║
    ║     ██║  ██║██████╔╝██║  ██║                          ║
    ║     ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝                          ║
    ║                                                       ║
    ║     Autonomous Dev Agents v1.0.0                      ║
    ║     Multi-agent dev teams for any codebase            ║
    ╚═══════════════════════════════════════════════════════╝

    🚀 Initializing ADA in /path/to/repo...
```

### 2. First Run (No Init) — Banner + CTA

```
    ╔═══════════════════════════════════════════════════════╗
    ║      █████╗ ██████╗  █████╗                           ║
    ║     ██╔══██╗██╔══██╗██╔══██╗                          ║
    ║     ███████║██║  ██║███████║                          ║
    ║     ██╔══██║██║  ██║██╔══██║                          ║
    ║     ██║  ██║██████╔╝██║  ██║                          ║
    ║     ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝                          ║
    ╚═══════════════════════════════════════════════════════╝

    👋 Welcome! This repo hasn't been initialized with ADA yet.

    Run `ada init` to set up your autonomous dev team.
```

### 3. `ada --help` — Compact Header

```
    🤖 ADA — Autonomous Dev Agents v1.0.0
    Multi-agent dev teams for any codebase

    Usage: ada <command> [options]
    ...
```

### 4. `ada status` — No Banner

Clean output, no banner (respects automation use cases).

### 5. `ada --banner` — Force Display

Explicit flag to show banner anytime (useful for screenshots, demos).

---

## Tagline Options

| Option      | Tagline                                     | Notes              |
| ----------- | ------------------------------------------- | ------------------ |
| **Primary** | Multi-agent dev teams for any codebase      | Clear, descriptive |
| Alt 1       | Ship software while you sleep               | Benefit-focused    |
| Alt 2       | Autonomous development, continuous progress | Formal             |
| Alt 3       | Your AI dev team, always shipping           | Casual             |
| Alt 4       | 10 agents. 24/7 shipping. Zero burnout.     | Punchy             |

**Recommendation:** Use "Multi-agent dev teams for any codebase" as primary. Consider Alt 4 for marketing materials.

---

## Implementation Spec

### File Structure

```
packages/cli/src/
├── ui/
│   ├── banner.ts       # Banner rendering functions
│   ├── colors.ts       # Color constants and utilities
│   └── spinner.ts      # Progress spinners (existing)
```

### Banner Module API

```typescript
// packages/cli/src/ui/banner.ts

export interface BannerOptions {
  version: string;
  showFull?: boolean; // Full banner with box (default: context-dependent)
  noColor?: boolean; // Disable colors (auto-detected from NO_COLOR env)
}

/**
 * Render the ADA banner.
 * @returns Banner string ready for console output
 */
export function renderBanner(options: BannerOptions): string;

/**
 * Check if this is the user's first run.
 * @returns true if no config exists
 */
export function isFirstRun(): boolean;

/**
 * Show banner conditionally based on context.
 * - `ada init`: Full banner
 * - First run (no init): Full banner + CTA
 * - `ada --banner`: Full banner
 * - Other commands: No banner
 */
export function showBannerIfNeeded(
  command: string,
  options: BannerOptions
): void;
```

### Config Flag

Store "has seen banner" in user config (`~/.ada/config.json`):

```json
{
  "ui": {
    "hasSeenBanner": true,
    "lastBannerVersion": "1.0.0"
  }
}
```

Show banner again when version changes (new features to highlight).

---

## Terminal Compatibility

### Width Detection

```typescript
const terminalWidth = process.stdout.columns || 80;

if (terminalWidth < 60) {
  // Use compact banner (Option B)
} else {
  // Use full banner (Option A)
}
```

### No-Color Support

```typescript
const noColor =
  process.env.NO_COLOR !== undefined ||
  process.env.TERM === 'dumb' ||
  !process.stdout.isTTY;

if (noColor) {
  // Strip all color codes, use plain ASCII
}
```

### CI/Automation Detection

```typescript
const isCI =
  process.env.CI !== undefined || process.env.GITHUB_ACTIONS !== undefined;

if (isCI) {
  // Skip banner entirely
}
```

---

## Testing Checklist

- [ ] Banner renders correctly in 80-char terminal
- [ ] Banner renders correctly in 120-char terminal
- [ ] Compact banner fallback works for narrow terminals (<60 chars)
- [ ] Colors render correctly in standard terminals (iTerm2, Terminal.app, Windows Terminal)
- [ ] NO_COLOR environment variable disables colors
- [ ] CI environments skip banner
- [ ] `--banner` flag forces display
- [ ] Version appears correctly
- [ ] First-run detection works

---

## Assets Delivered

This spec includes:

1. ✅ **Four ASCII art options** with pros/cons
2. ✅ **Recommended design** with color implementation
3. ✅ **Color palette** for consistency
4. ✅ **Context-specific variants** (init, first-run, help, status)
5. ✅ **Tagline options** with recommendation
6. ✅ **TypeScript implementation spec** (banner.ts API)
7. ✅ **Config schema** for banner state
8. ✅ **Terminal compatibility** handling
9. ✅ **Testing checklist**

---

## Implementation Timeline

| Day            | Task                                  | Owner       |
| -------------- | ------------------------------------- | ----------- |
| Sprint 4 Day 1 | Create `banner.ts` with Option A      | Engineering |
| Sprint 4 Day 1 | Add picocolors to CLI dependencies    | Engineering |
| Sprint 4 Day 2 | Implement context-aware display logic | Engineering |
| Sprint 4 Day 2 | Add `--banner` flag                   | Engineering |
| Sprint 4 Day 3 | Terminal compatibility testing        | QA          |
| Sprint 4 Day 3 | Config persistence for "has seen"     | Engineering |

**Estimated effort:** 1-2 days (S)

---

## Related

- **Issue:** #133 (First-run CLI banner art)
- **Spec:** Interactive Onboarding Wizard UX (C1142) — banner precedes onboarding flow
- **Spec:** Error Messages UX (C1136) — consistent color palette

---

_🎨 Design — The Architect | C1152 | Per R-017: Tangible design spec delivered_
