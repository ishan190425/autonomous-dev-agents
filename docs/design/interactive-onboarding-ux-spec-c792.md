# Interactive Onboarding Wizard UX Specification

> **Issue:** #183 — Interactive Onboarding Wizard with Validation
> **Author:** 🎨 Design (C792)
> **Date:** 2026-02-17
> **Status:** Design Complete — Ready for Engineering

---

## Overview

Transform `ada init` from a flag-based CLI command into a step-by-step interactive wizard that guides users through team setup with validation, feedback, and smart defaults.

**Design Philosophy:** The wizard should feel helpful, not patronizing. Experienced users can bypass with flags; new users get guidance without friction.

---

## Flow Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     ADA ONBOARDING WIZARD                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [1. Pre-Flight] → [2. Project] → [3. Team] → [4. Config] → [Done]  │
│       ↓               ↓             ↓            ↓           ↓       │
│   Validate env     Detect type    Size +      Model +     Success    │
│   Git, Node, GH    Auto-suggest   Focus       Memory      + Next     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Step 1: Pre-Flight Checks (Automatic)

Run automatically before wizard starts. Fail fast with actionable guidance.

**Checks:**
| Check | Pass | Fail Action |
|-------|------|-------------|
| Git repository | `.git/` exists | "Run `git init` first" |
| Node.js ≥18 | `node -v` | "Node 18+ required. Install: https://nodejs.org" |
| GitHub CLI | `gh --version` | "Install gh: https://cli.github.com" |
| GitHub auth | `gh auth status` | "Run `gh auth login` to authenticate" |
| No existing agents/ | !exists | Warn: "agents/ exists. Use --overwrite to replace" |

**Output Example:**

```
  Pre-Flight Checks

  ✓ Git repository detected
  ✓ Node.js v22.0.0
  ✓ GitHub CLI installed
  ✓ GitHub authenticated (user: ishan190425)
  ✓ No existing agent configuration

  All checks passed — starting wizard...
```

**Failure Example:**

```
  Pre-Flight Checks

  ✓ Git repository detected
  ✓ Node.js v22.0.0
  ✗ GitHub CLI not found

  ┌────────────────────────────────────────────────┐
  │  GitHub CLI Required                           │
  │                                                │
  │  ADA uses GitHub for issue tracking and PRs.  │
  │  Install: https://cli.github.com               │
  │                                                │
  │  macOS:   brew install gh                      │
  │  Linux:   snap install gh                      │
  │  Windows: winget install GitHub.cli            │
  │                                                │
  │  After install, run: gh auth login             │
  └────────────────────────────────────────────────┘

  Fix the above issues and run `ada init` again.
```

### Step 2: Project Detection (1 Question)

**Auto-Detection Logic:**

1. Check `package.json` → Node.js project
2. Check `pyproject.toml` / `setup.py` → Python project
3. Check `Cargo.toml` → Rust project
4. Check `go.mod` → Go project
5. Check `next.config.*` → Next.js web app
6. Check `tsconfig.json` + no framework → TypeScript library
7. Fallback → Generic project

**Interactive Prompt:**

```
  ┌────────────────────────────────────────────────┐
  │  Project Type                                  │
  ├────────────────────────────────────────────────┤
  │                                                │
  │  Detected: Next.js Web Application             │
  │                                                │
  │  ❯ Yes, this is correct                        │
  │    Actually, it's a different type             │
  │                                                │
  └────────────────────────────────────────────────┘
```

If user selects "different type":

```
  ┌────────────────────────────────────────────────┐
  │  Select Project Type                           │
  ├────────────────────────────────────────────────┤
  │                                                │
  │  ❯ CLI Tool                                    │
  │    Web Application                             │
  │    API / Backend Service                       │
  │    Library / Package                           │
  │    Monorepo                                    │
  │    Research / Experimental                     │
  │    Other                                       │
  │                                                │
  └────────────────────────────────────────────────┘
```

### Step 3: Team Configuration (2 Questions)

**3a. Team Size:**

```
  ┌────────────────────────────────────────────────┐
  │  Team Size                                     │
  ├────────────────────────────────────────────────┤
  │                                                │
  │  How many agent roles do you need?             │
  │                                                │
  │  ❯ Small (3 roles)                             │
  │    CEO, Engineering, Ops                       │
  │    Best for: Solo developers, small projects   │
  │                                                │
  │    Medium (5 roles)                            │
  │    CEO, Product, Engineering, Ops, Research    │
  │    Best for: Small teams, structured projects  │
  │                                                │
  │    Large (8 roles)                             │
  │    Full team with Design, QA, Growth, etc.     │
  │    Best for: Complex projects, dogfooding ADA  │
  │                                                │
  └────────────────────────────────────────────────┘
```

**3b. Team Focus:**

```
  ┌────────────────────────────────────────────────┐
  │  Team Focus                                    │
  ├────────────────────────────────────────────────┤
  │                                                │
  │  What's the primary focus?                     │
  │                                                │
  │  ❯ Balanced                                    │
  │    Equal rotation across all roles             │
  │                                                │
  │    Engineering-heavy                           │
  │    More Engineering, less planning             │
  │                                                │
  │    Product-heavy                               │
  │    More Product/Design, structured roadmap     │
  │                                                │
  │    Research-heavy                              │
  │    Exploration, experiments, R&D               │
  │                                                │
  └────────────────────────────────────────────────┘
```

### Step 4: Configuration Options (2 Questions)

**4a. Model Selection:**

```
  ┌────────────────────────────────────────────────┐
  │  LLM Provider                                  │
  ├────────────────────────────────────────────────┤
  │                                                │
  │  Which LLM will run agent dispatches?          │
  │                                                │
  │  ❯ Auto (recommended)                          │
  │    Automatically select based on environment   │
  │                                                │
  │    OpenAI (GPT-4)                              │
  │    Requires OPENAI_API_KEY                     │
  │                                                │
  │    Anthropic (Claude)                          │
  │    Requires ANTHROPIC_API_KEY                  │
  │                                                │
  │    OpenClaw / Other                            │
  │    Custom endpoint configuration               │
  │                                                │
  └────────────────────────────────────────────────┘
```

**4b. Memory Configuration:**

```
  ┌────────────────────────────────────────────────┐
  │  Memory Bank                                   │
  ├────────────────────────────────────────────────┤
  │                                                │
  │  How should agents share context?              │
  │                                                │
  │  ❯ File-based (default)                        │
  │    Simple markdown in agents/memory/bank.md   │
  │    Works out of the box, version controlled    │
  │                                                │
  │    Cognitive Memory                            │
  │    Heat-scored, auto-compressing (experimental)│
  │    Requires: ada memory init                   │
  │                                                │
  └────────────────────────────────────────────────┘
```

### Step 5: Confirmation & Generation

**Summary Screen:**

```
  ┌────────────────────────────────────────────────┐
  │  Ready to Initialize                           │
  ├────────────────────────────────────────────────┤
  │                                                │
  │  Project:  Next.js Web Application             │
  │  Team:     Medium (5 roles)                    │
  │  Focus:    Balanced                            │
  │  LLM:      Auto                                │
  │  Memory:   File-based                          │
  │                                                │
  │  Will create:                                  │
  │    agents/                                     │
  │    ├── DISPATCH.md                             │
  │    ├── roster.json                             │
  │    ├── state/rotation.json                     │
  │    ├── memory/bank.md                          │
  │    ├── rules/RULES.md                          │
  │    └── playbooks/ (5 files)                    │
  │                                                │
  │  ────────────────────────────────────────────  │
  │                                                │
  │  ❯ Initialize                                  │
  │    Go back                                     │
  │    Cancel                                      │
  │                                                │
  └────────────────────────────────────────────────┘
```

### Step 6: Success & Next Steps

**Success Screen:**

```
  ┌────────────────────────────────────────────────────────────────┐
  │                                                                │
  │   █████╗ ██████╗  █████╗                                       │
  │  ██╔══██╗██╔══██╗██╔══██╗                                      │
  │  ███████║██║  ██║███████║                                      │
  │  ██╔══██║██║  ██║██╔══██║                                      │
  │  ██║  ██║██████╔╝██║  ██║                                      │
  │  ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝                                      │
  │                                                                │
  │  ✓ Agent team initialized successfully!                        │
  │                                                                │
  │  Created 12 files in agents/                                   │
  │                                                                │
  ├────────────────────────────────────────────────────────────────┤
  │                                                                │
  │  Next Steps:                                                   │
  │                                                                │
  │  1. Review your team roster:                                   │
  │     ada status                                                 │
  │                                                                │
  │  2. Start your first dispatch cycle:                           │
  │     ada dispatch start                                         │
  │                                                                │
  │  3. Read the dispatch protocol:                                │
  │     cat agents/DISPATCH.md                                     │
  │                                                                │
  │  Documentation: https://ada.dev/docs/getting-started           │
  │  Discord: https://discord.gg/ada-dev                           │
  │                                                                │
  └────────────────────────────────────────────────────────────────┘
```

---

## Bypass Mode (Power Users)

All wizard steps can be bypassed with flags for scripted/CI use:

```bash
# Non-interactive initialization
ada init \
  --yes \                    # Skip all prompts, use defaults
  --team-size medium \       # Skip team size prompt
  --focus balanced \         # Skip focus prompt
  --template default         # Skip template selection
```

**Flag Combinations:**
| Flags | Behavior |
|-------|----------|
| No flags | Full interactive wizard |
| `--yes` | All defaults, no prompts |
| `--team-size X` | Skip team size prompt only |
| Any flag combo | Skip that specific prompt |

---

## Validation Patterns

### Input Validation

Use error patterns from `docs/design/error-pattern-library-c782.md`:

**Invalid Selection:**

```
  ✗ Invalid selection

  You entered: "xlarge"
  Valid options: small, medium, large

  Tip: Use arrow keys to select, Enter to confirm
```

**Permission Error:**

```
  ✗ Cannot create directory

  Error: EACCES: permission denied, mkdir 'agents/'

  Fix: Check directory permissions or run with appropriate access
```

### Progress Indication

During file generation, show progress:

```
  Creating agent team...

  [████████████████████░░░░░░░░░] 67%

  ✓ Created roster.json
  ✓ Created rotation.json
  ✓ Created DISPATCH.md
  ↻ Writing playbooks...
```

---

## Accessibility Considerations

1. **Keyboard Navigation:**
   - Arrow keys for selection
   - Enter to confirm
   - Escape to go back/cancel
   - Tab for secondary actions

2. **Screen Reader Support:**
   - All prompts have descriptive labels
   - Status updates announced
   - Error messages include full context

3. **Color Independence:**
   - Symbols (✓, ✗, ↻) convey status without color
   - Works with `NO_COLOR=1` environment variable

4. **Terminal Compatibility:**
   - Graceful degradation for dumb terminals
   - Box-drawing characters optional (configurable)

---

## Implementation Notes

### Recommended Libraries

- **@inquirer/prompts** — Modern, composable prompt library
- **ora** — Spinner for progress indication
- **boxen** — Box drawing for summaries
- **chalk** — Already in use for colors

### File Structure

```
packages/cli/src/commands/
├── init.ts                    # Main entry, orchestrates wizard
├── init/
│   ├── preflight.ts          # Pre-flight checks
│   ├── detection.ts          # Project type detection
│   ├── prompts.ts            # Interactive prompts
│   ├── templates.ts          # Template generation
│   └── success.ts            # Success screen + next steps
```

### Type Definitions

```typescript
interface WizardState {
  projectType: ProjectType;
  teamSize: 'small' | 'medium' | 'large';
  focus: 'balanced' | 'engineering' | 'product' | 'research';
  model: 'auto' | 'openai' | 'anthropic' | 'custom';
  memory: 'file' | 'cognitive';
}

interface PreflightResult {
  passed: boolean;
  checks: PreflightCheck[];
  blockers: string[];
}

interface PreflightCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  fix?: string;
}
```

---

## Acceptance Criteria Mapping

From Issue #183:

| Criteria                           | Spec Section                  |
| ---------------------------------- | ----------------------------- |
| Step-by-step setup with validation | Flow Architecture (Steps 1-6) |
| Auto-detect project type           | Step 2: Project Detection     |
| Template selection with previews   | Step 3: Team Configuration    |
| Pre-flight checks                  | Step 1: Pre-Flight Checks     |
| Better error messages              | Validation Patterns           |
| Welcome message with next steps    | Step 6: Success & Next Steps  |

---

## Related Documents

- `docs/design/error-pattern-library-c782.md` — Error message patterns
- `docs/design/cli-banner-art-spec-c435.md` — ASCII art guidelines
- `docs/design/cli-developer-experience-rationale-c665.md` — DX principles

---

_Design Complete — Engineering can begin implementation_
