# First-Run CLI Banner Spec (C1182)

> ASCII art and first-run experience design for `ada init`
> **Issue:** #133
> **Author:** 🎨 The Architect (C1182)
> **Created:** 2026-02-23
> **Sprint:** 4

---

## Overview

This spec defines the first-run CLI banner for ADA, creating a memorable first impression when users run `ada init`. The banner establishes brand identity, communicates purpose, and signals polish.

---

## 1. Banner Design Options

### Option A: Minimal Box (Recommended)

Clean, modern, works in all terminals:

```
╭───────────────────────────────────────────────────────────╮
│                                                           │
│   █████╗ ██████╗  █████╗                                  │
│  ██╔══██╗██╔══██╗██╔══██╗                                 │
│  ███████║██║  ██║███████║                                 │
│  ██╔══██║██║  ██║██╔══██║                                 │
│  ██║  ██║██████╔╝██║  ██║                                 │
│  ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝                                 │
│                                                           │
│  Autonomous Dev Agents                        v1.0.0      │
│  Multi-agent teams for your codebase                      │
│                                                           │
╰───────────────────────────────────────────────────────────╯
```

**Pros:** Unicode-compatible, consistent rendering, professional
**Cons:** Requires unicode support (most modern terminals have it)

### Option B: ASCII-Only Fallback

For terminals without Unicode:

```
+-----------------------------------------------------------+
|                                                           |
|     _    ____    _                                        |
|    / \  |  _ \  / \                                       |
|   / _ \ | | | |/ _ \                                      |
|  / ___ \| |_| / ___ \                                     |
| /_/   \_\____/_/   \_\                                    |
|                                                           |
|  Autonomous Dev Agents                        v1.0.0      |
|  Multi-agent teams for your codebase                      |
|                                                           |
+-----------------------------------------------------------+
```

**Pros:** Works everywhere
**Cons:** Less visually striking

### Option C: Compact Single Line

For minimal-footprint contexts:

```
🤖 ADA v1.0.0 — Autonomous Dev Agents
```

**Use case:** After initial run, when `--quiet` is set, or in CI environments

---

## 2. Color Scheme

Using the ADA brand colors (Indigo primary):

```typescript
import pc from 'picocolors';

const COLORS = {
  // Primary brand
  primary: pc.magenta, // Indigo approximation in terminal
  secondary: pc.cyan, // Accent

  // Semantic
  success: pc.green,
  warning: pc.yellow,
  error: pc.red,
  muted: pc.dim,

  // Banner specific
  border: pc.dim, // Box border
  logo: pc.bold + pc.magenta, // ADA text
  tagline: pc.cyan, // "Autonomous Dev Agents"
  version: pc.dim, // v1.0.0
};
```

### Color Rendering

```
╭───────────────────────────────────────────────────────────╮  ← dim gray
│                                                           │
│   █████╗ ██████╗  █████╗                                  │  ← bold magenta
│  ██╔══██╗██╔══██╗██╔══██╗                                 │
│  ███████║██║  ██║███████║                                 │
│  ██╔══██║██║  ██║██╔══██║                                 │
│  ██║  ██║██████╔╝██║  ██║                                 │
│  ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝                                 │
│                                                           │
│  Autonomous Dev Agents                        v1.0.0      │  ← cyan / dim
│  Multi-agent teams for your codebase                      │  ← white
│                                                           │
╰───────────────────────────────────────────────────────────╯
```

---

## 3. Display Logic

### 3.1 When to Show Banner

| Context                    | Banner         | Reason                   |
| -------------------------- | -------------- | ------------------------ |
| `ada init` (first time)    | Full           | First impression matters |
| `ada init` (re-init)       | None           | User knows the tool      |
| `ada <cmd>` (no project)   | Full + prompt  | Onboard the user         |
| `ada <cmd>` (initialized)  | None           | Don't clutter workflow   |
| `ada --banner`             | Full           | Explicit user request    |
| CI environment (`CI=true`) | None           | Avoid noise in logs      |
| `--no-color`               | ASCII fallback | Respect preference       |

### 3.2 First-Run Detection

```typescript
interface FirstRunState {
  hasSeenBanner: boolean;
  firstSeenAt?: string; // ISO timestamp
  version?: string; // Version when first seen
}

// Storage location: ~/.ada/state.json
const STATE_PATH = path.join(os.homedir(), '.ada', 'state.json');

async function hasSeenBanner(): Promise<boolean> {
  try {
    const state = await readJson<FirstRunState>(STATE_PATH);
    return state.hasSeenBanner ?? false;
  } catch {
    return false; // No state = first run
  }
}

async function markBannerSeen(): Promise<void> {
  const state = await readJson<FirstRunState>(STATE_PATH).catch(() => ({}));
  await writeJson(STATE_PATH, {
    ...state,
    hasSeenBanner: true,
    firstSeenAt: new Date().toISOString(),
    version: VERSION,
  });
}
```

### 3.3 Environment Detection

```typescript
function shouldShowBanner(options: { force?: boolean }): boolean {
  // Explicit flag overrides everything
  if (options.force) return true;

  // Suppress in CI
  if (process.env.CI || process.env.CONTINUOUS_INTEGRATION) {
    return false;
  }

  // Suppress if piped (non-TTY)
  if (!process.stdout.isTTY) {
    return false;
  }

  // Suppress if already seen
  return !hasSeenBanner();
}

function shouldUseUnicode(): boolean {
  // Check terminal capabilities
  const term = process.env.TERM || '';
  const lang = process.env.LANG || '';

  // Modern terminals support Unicode
  if (term.includes('xterm') || term.includes('256color')) {
    return true;
  }

  // UTF-8 locale
  if (lang.toLowerCase().includes('utf')) {
    return true;
  }

  // Windows Terminal supports Unicode
  if (process.env.WT_SESSION) {
    return true;
  }

  return false;
}
```

---

## 4. Implementation

### 4.1 Banner Module

```typescript
// packages/cli/src/ui/banner.ts

import pc from 'picocolors';
import { VERSION } from '../version.js';

const UNICODE_LOGO = `
   █████╗ ██████╗  █████╗ 
  ██╔══██╗██╔══██╗██╔══██╗
  ███████║██║  ██║███████║
  ██╔══██║██║  ██║██╔══██║
  ██║  ██║██████╔╝██║  ██║
  ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝
`;

const ASCII_LOGO = `
    _    ____    _   
   / \\  |  _ \\  / \\  
  / _ \\ | | | |/ _ \\ 
 / ___ \\| |_| / ___ \\
/_/   \\_\\____/_/   \\_\\
`;

export function printBanner(options: { unicode?: boolean } = {}): void {
  const useUnicode = options.unicode ?? shouldUseUnicode();
  const logo = useUnicode ? UNICODE_LOGO : ASCII_LOGO;
  const border = useUnicode
    ? { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' }
    : { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' };

  const width = 59;
  const topBorder = border.tl + border.h.repeat(width) + border.tr;
  const bottomBorder = border.bl + border.h.repeat(width) + border.br;
  const emptyLine = border.v + ' '.repeat(width) + border.v;

  const tagline = 'Autonomous Dev Agents';
  const subtitle = 'Multi-agent teams for your codebase';
  const version = `v${VERSION}`;

  // Calculate padding for right-aligned version
  const taglineWidth = width - version.length - 2;
  const taglinePadded = tagline.padEnd(taglineWidth) + version;

  console.log(pc.dim(topBorder));
  console.log(emptyLine);

  // Print logo lines
  const logoLines = logo.trim().split('\n');
  for (const line of logoLines) {
    const padded = line.padEnd(width - 2);
    console.log(
      pc.dim(border.v) + ' ' + pc.bold(pc.magenta(padded)) + pc.dim(border.v)
    );
  }

  console.log(emptyLine);
  console.log(
    pc.dim(border.v) + '  ' + pc.cyan(taglinePadded) + ' ' + pc.dim(border.v)
  );
  console.log(
    pc.dim(border.v) +
      '  ' +
      subtitle.padEnd(width - 4) +
      '  ' +
      pc.dim(border.v)
  );
  console.log(emptyLine);
  console.log(pc.dim(bottomBorder));
  console.log(); // Extra newline for breathing room
}
```

### 4.2 Integration with `ada init`

```typescript
// packages/cli/src/commands/init.ts

import { printBanner } from '../ui/banner.js';
import { hasSeenBanner, markBannerSeen } from '../state.js';

export async function initCommand(options: InitOptions): Promise<void> {
  // Show banner on first run (unless suppressed)
  if (!options.quiet && !(await hasSeenBanner())) {
    printBanner();
    await markBannerSeen();
  }

  // Continue with init logic...
}
```

### 4.3 `--banner` Flag

```typescript
// packages/cli/src/index.ts

program
  .option('--banner', 'Display the ADA banner')
  .hook('preAction', async thisCommand => {
    if (thisCommand.opts().banner) {
      printBanner();
    }
  });
```

---

## 5. Accessibility

### 5.1 Screen Reader Considerations

- Banner is purely decorative (ASCII art)
- Follow with semantic text: "ADA - Autonomous Dev Agents v1.0.0"
- Don't rely on visual structure for information

### 5.2 Color Accessibility

```typescript
// Respect NO_COLOR and FORCE_COLOR standards
function colorsEnabled(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return process.stdout.isTTY;
}
```

### 5.3 Reduced Motion

ASCII art is static, so no motion concerns. However, avoid animated spinners in banner display.

---

## 6. Testing

### 6.1 Unit Tests

```typescript
describe('banner', () => {
  it('renders Unicode banner when supported', () => {
    const output = renderBanner({ unicode: true });
    expect(output).toContain('█████╗');
    expect(output).toContain('╭');
  });

  it('renders ASCII banner as fallback', () => {
    const output = renderBanner({ unicode: false });
    expect(output).toContain('____');
    expect(output).toContain('+');
  });

  it('includes version number', () => {
    const output = renderBanner();
    expect(output).toMatch(/v\d+\.\d+\.\d+/);
  });
});
```

### 6.2 Visual Tests

Manual verification across:

- macOS Terminal
- iTerm2
- Windows Terminal
- VS Code integrated terminal
- SSH sessions
- tmux/screen

---

## 7. Alternatives Considered

### Figlet-generated text

**Rejected:** Adds dependency, larger bundle, less control over exact appearance.

### Animated banner

**Rejected:** Adds complexity, accessibility concerns, annoying on repeat runs.

### No banner

**Rejected:** Misses opportunity for brand impression, other tools (Devin, Claude Code) set expectation.

---

## 8. Implementation Checklist

- [ ] Create `packages/cli/src/ui/banner.ts` with banner rendering
- [ ] Add first-run state detection in `packages/cli/src/state.ts`
- [ ] Integrate with `ada init` command
- [ ] Add `--banner` global flag
- [ ] Add `--no-color` support
- [ ] Write unit tests
- [ ] Manual testing across terminals
- [ ] Update CHANGELOG

**Estimated effort:** 1-2 Engineering cycles

---

## Related

- **#133** — First-run CLI banner art
- **#183** — Interactive Onboarding Wizard (banner precedes wizard)
- **C1177** — Onboarding Wizard Full Spec
- **C1122** — Auth UX Spec (dashboard counterpart)

---

_Author: 🎨 The Architect (C1182)_
