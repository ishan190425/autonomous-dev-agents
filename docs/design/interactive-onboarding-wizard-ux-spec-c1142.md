# Interactive Onboarding Wizard UX Specification

> **Issue:** #183 — feat(cli): Interactive Onboarding Wizard with Validation  
> **Author:** 🎨 Design (C1142)  
> **Created:** 2026-02-22  
> **Status:** Spec Complete — Ready for Implementation  
> **Sprint:** 4 (or opportunistic Sprint 3)

---

## Overview

The `ada init` command is the **first experience** users have with ADA. This spec defines a polished, intelligent onboarding wizard that guides users through project setup with validation, smart defaults, and progressive disclosure.

**Goal:** Make project initialization feel magical — users should complete setup confident their team is correctly configured.

---

## Design Principles

### 1. Progressive Disclosure

Show only what's needed at each step. Advanced options available via explicit choice, not cognitive overload.

### 2. Smart Defaults

Pre-select sensible defaults based on detected context (repo type, package.json, existing structure). Users should rarely need to change defaults.

### 3. Validation-as-You-Go

Validate each answer immediately. Never let users proceed with invalid input. Show clear error messages inline (per #185 spec).

### 4. Recoverable Flow

Allow backward navigation. Users should be able to revisit previous answers without restarting.

### 5. Graceful Degradation

Non-interactive mode (`--yes`, `--non-interactive`) uses smart defaults for CI/scripting. Same outcome, no prompts.

---

## User Flow

### Entry Points

```bash
# Interactive (default)
ada init

# Non-interactive with defaults
ada init --yes

# Non-interactive with overrides
ada init --yes --team-size medium --model gpt-4o

# Specify directory
ada init ./my-project

# Resume interrupted init
ada init --resume
```

### Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     ada init                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐                                     │
│  │ 1. Welcome Screen   │ ◄── Branding, version, what to     │
│  │    + Detection      │     expect. Auto-detect context.   │
│  └──────────┬──────────┘                                     │
│             │                                                │
│             ▼                                                │
│  ┌─────────────────────┐                                     │
│  │ 2. Project Type     │ ◄── CLI tool, Web app, Library,    │
│  │                     │     Monorepo, Custom               │
│  └──────────┬──────────┘                                     │
│             │                                                │
│             ▼                                                │
│  ┌─────────────────────┐                                     │
│  │ 3. Team Size        │ ◄── Solo, Small (3-5), Medium      │
│  │                     │     (6-10), Large (10+)            │
│  └──────────┬──────────┘                                     │
│             │                                                │
│             ▼                                                │
│  ┌─────────────────────┐                                     │
│  │ 4. Role Selection   │ ◄── Checkboxes with descriptions.  │
│  │                     │     Presets based on team size.    │
│  └──────────┬──────────┘                                     │
│             │                                                │
│             ▼                                                │
│  ┌─────────────────────┐                                     │
│  │ 5. Model Config     │ ◄── LLM provider selection.        │
│  │    (Optional)       │     API key validation.            │
│  └──────────┬──────────┘                                     │
│             │                                                │
│             ▼                                                │
│  ┌─────────────────────┐                                     │
│  │ 6. Confirmation     │ ◄── Summary, file preview,         │
│  │    + Generation     │     progress bar, success.         │
│  └─────────────────────┘                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Screen Specifications

### Screen 1: Welcome + Detection

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│     █████╗ ██████╗  █████╗                                     │
│    ██╔══██╗██╔══██╗██╔══██╗                                    │
│    ███████║██║  ██║███████║    Autonomous Dev Agents           │
│    ██╔══██║██║  ██║██╔══██║    v1.0.0-alpha                    │
│    ██║  ██║██████╔╝██║  ██║                                    │
│    ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝                                    │
│                                                                │
│    Let's set up your autonomous development team.              │
│                                                                │
│    ✓ Detected: TypeScript project (package.json found)         │
│    ✓ Detected: Git repository                                  │
│    ✓ Detected: GitHub remote (origin)                          │
│                                                                │
│    Press Enter to continue, or Ctrl+C to exit                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Detection Logic:**

- Check for `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod` → language/framework
- Check for `.git/` → Git repository
- Check for `.git/config` remote → GitHub/GitLab
- Check for existing `agents/` directory → Offer migration or skip

**If agents/ exists:**

```
⚠  Existing ADA configuration detected at ./agents/

   ? What would you like to do?
   ❯ Reinitialize (backup existing to agents.bak/)
     Update configuration only
     Cancel
```

### Screen 2: Project Type

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ? What type of project is this?                               │
│                                                                │
│    ❯ ● CLI Tool           Command-line application             │
│      ○ Web Application    Frontend, backend, or full-stack     │
│      ○ Library/Package    Shared code for other projects       │
│      ○ Monorepo           Multiple packages in one repo        │
│      ○ Custom             I'll configure everything manually   │
│                                                                │
│    ↑/↓ to move, Enter to select                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Project Type → Role Recommendations:**

| Project Type    | Recommended Roles                          |
| --------------- | ------------------------------------------ |
| CLI Tool        | ceo, product, engineering, qa, ops         |
| Web Application | ceo, product, engineering, design, qa, ops |
| Library/Package | ceo, engineering, qa, docs, ops            |
| Monorepo        | ceo, product, scrum, engineering, qa, ops  |
| Custom          | (user selects all)                         |

### Screen 3: Team Size

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ? How large should your agent team be?                        │
│                                                                │
│    ❯ ● Solo (1-2 roles)      Fast cycles, minimal overhead     │
│      ○ Small (3-5 roles)     Balanced coverage, quick rotation │
│      ○ Medium (6-8 roles)    Full coverage, daily rotations    │
│      ○ Large (10+ roles)     Enterprise, specialized roles     │
│                                                                │
│    Tip: Start small. You can add roles later with              │
│         ada roster add <role>                                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Team Size → Role Presets:**

| Size   | Preset Roles                                                                  |
| ------ | ----------------------------------------------------------------------------- |
| Solo   | engineering, qa                                                               |
| Small  | ceo, engineering, qa, ops                                                     |
| Medium | ceo, product, engineering, qa, ops, design                                    |
| Large  | ceo, product, growth, research, frontier, scrum, engineering, qa, ops, design |

### Screen 4: Role Selection

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ? Select roles for your team (Space to toggle, Enter to confirm)
│                                                                │
│    [✓] 👔 CEO              Strategic direction, blockers       │
│    [✓] 📦 Product          Features, specs, priorities         │
│    [ ] 🚀 Growth           Marketing, community, adoption      │
│    [ ] 🔬 Research         Emerging patterns, papers           │
│    [ ] 🌌 Frontier         Future architecture, experiments    │
│    [✓] 📋 Scrum            Coordination, retros, metrics       │
│    [✓] ⚙️ Engineering      Code, PRs, implementation           │
│    [✓] 🔍 QA               Testing, quality, coverage          │
│    [✓] 🛡️ Ops              CI/CD, rules, infrastructure        │
│    [ ] 🎨 Design           UX, API design, architecture        │
│                                                                │
│    Selected: 6 roles (recommended for Medium team)             │
│                                                                │
│    Space to toggle, a to select all, n to select none          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Validation:**

- Minimum 2 roles required
- Engineering role strongly recommended (warning if not selected)
- Show rotation preview: "Rotation order: ceo → product → scrum → ..."

### Screen 5: Model Configuration (Optional)

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ? Configure LLM model for agent dispatch? (Optional)          │
│                                                                │
│    ❯ ● Skip (configure later)                                  │
│      ○ OpenAI (GPT-4, GPT-4o)                                  │
│      ○ Anthropic (Claude)                                      │
│      ○ Local (Ollama)                                          │
│      ○ Custom endpoint                                         │
│                                                                │
│    Tip: You can configure this later in agents/config.json     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**If OpenAI selected:**

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ? Enter your OpenAI API key:                                  │
│    › sk-●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●           │
│                                                                │
│    ✓ API key validated successfully                            │
│    ✓ Organization: RATHI-CAPITAL-VENTURES                      │
│    ✓ Available models: gpt-4o, gpt-4-turbo, gpt-3.5-turbo      │
│                                                                │
│    ? Select default model:                                     │
│    ❯ ● gpt-4o (recommended)                                    │
│      ○ gpt-4-turbo                                             │
│      ○ gpt-3.5-turbo                                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Validation:**

- API key format check (sk-...)
- Optional: API call to validate key works
- Show warning for invalid keys (per #185 error UX spec)

### Screen 6: Confirmation + Generation

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Ready to initialize your ADA team!                            │
│                                                                │
│  Project:     ./autonomous-dev-agents                          │
│  Type:        CLI Tool                                         │
│  Team Size:   Medium (6 roles)                                 │
│  Roles:       ceo, product, scrum, engineering, qa, ops        │
│  Model:       Skipped (configure later)                        │
│                                                                │
│  Files to create:                                              │
│    agents/                                                     │
│    ├── DISPATCH.md           Dispatch protocol                 │
│    ├── roster.json           Team configuration                │
│    ├── state/                                                  │
│    │   └── rotation.json     Rotation state                    │
│    ├── memory/                                                 │
│    │   └── bank.md           Shared memory                     │
│    ├── rules/                                                  │
│    │   └── RULES.md          Team rules                        │
│    └── playbooks/                                              │
│        ├── ceo.md                                              │
│        ├── product.md                                          │
│        ├── scrum.md                                            │
│        ├── engineering.md                                      │
│        ├── qa.md                                               │
│        └── ops.md                                              │
│                                                                │
│  ? Proceed with initialization?                                │
│  ❯ Yes, create files                                           │
│    Preview file contents first                                 │
│    Go back and make changes                                    │
│    Cancel                                                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Progress Bar (during generation):**

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Creating your ADA team...                                     │
│                                                                │
│  [████████████████████░░░░░░░░░░░░░░░░░░░░] 52%                │
│                                                                │
│  ✓ Created agents/DISPATCH.md                                  │
│  ✓ Created agents/roster.json                                  │
│  ✓ Created agents/state/rotation.json                          │
│  ► Creating agents/playbooks/engineering.md...                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Success Screen:**

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ✅ ADA team initialized successfully!                         │
│                                                                │
│  Your autonomous development team is ready.                    │
│                                                                │
│  Next steps:                                                   │
│                                                                │
│    1. Start your first dispatch cycle:                         │
│       $ ada dispatch start                                     │
│                                                                │
│    2. Check team status anytime:                               │
│       $ ada status                                             │
│                                                                │
│    3. View available commands:                                 │
│       $ ada --help                                             │
│                                                                │
│  📚 Documentation: https://ada.dev/docs                        │
│  💬 Discord: https://discord.gg/ada                            │
│                                                                │
│  Happy shipping! 🚀                                            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Keyboard Navigation

| Key       | Action                          |
| --------- | ------------------------------- |
| ↑/↓       | Move between options            |
| Enter     | Select/confirm                  |
| Space     | Toggle checkbox (multi-select)  |
| a         | Select all (multi-select)       |
| n         | Select none (multi-select)      |
| Backspace | Go back to previous screen      |
| Ctrl+C    | Exit wizard (with confirmation) |
| ?         | Show help for current screen    |

---

## Validation Rules

### Project Name

- Must be valid directory name
- No spaces (suggest kebab-case)
- Max 64 characters

### Role Selection

- Minimum 2 roles
- Warning if Engineering not included
- Warning if team size > 10 (performance note)

### API Keys

- Format validation (prefix check)
- Optional network validation
- Secure storage guidance

### File Conflicts

- Check for existing agents/ directory
- Offer backup, merge, or cancel options

---

## Non-Interactive Mode

```bash
# Full defaults
ada init --yes

# With overrides
ada init --yes \
  --project-type cli \
  --team-size medium \
  --roles ceo,engineering,qa,ops \
  --model openai \
  --api-key $OPENAI_API_KEY
```

**Flags:**

| Flag                | Description                         | Default       |
| ------------------- | ----------------------------------- | ------------- |
| `--yes`, `-y`       | Accept all defaults                 | false         |
| `--project-type`    | cli, web, library, monorepo, custom | (detected)    |
| `--team-size`       | solo, small, medium, large          | medium        |
| `--roles`           | Comma-separated role list           | (from preset) |
| `--model`           | openai, anthropic, ollama, custom   | (skip)        |
| `--api-key`         | LLM API key                         | (from env)    |
| `--non-interactive` | Alias for --yes                     | false         |

---

## Error Handling

Per #185 CLI Error Messages UX Spec, all errors follow the what/why/how-to-fix pattern:

**Invalid directory:**

```
✖ Cannot initialize in /readonly/path

  The directory is not writable.

  → Check directory permissions: ls -la /readonly/path
  → Try a different location: ada init ~/projects/my-app
```

**Existing config:**

```
⚠ ADA configuration already exists

  Found agents/ directory at ./agents

  → Reinitialize: ada init --force
  → Update existing: ada config set <key> <value>
  → Different location: ada init ./other-dir
```

**Network error during API validation:**

```
⚠ Could not validate API key (network error)

  Proceeding without validation. Key will be verified on first dispatch.

  → Check connection and retry: ada config validate
  → Skip validation: (already skipped)
```

---

## Accessibility

- Full keyboard navigation (no mouse required)
- Screen reader compatible labels
- High-contrast mode support (respects terminal theme)
- No color-only information (icons + text)
- Clear focus indicators

---

## Implementation Notes

### Recommended Libraries

- **Prompts:** `@inquirer/prompts` (modern, TypeScript-native)
- **Spinners:** `ora` (already in use)
- **Colors:** `chalk` (already in use)
- **Box drawing:** `boxen` or custom

### State Management

- Store wizard state in memory during flow
- Enable --resume flag via temp file in OS temp dir
- Clear temp state on successful completion or explicit cancel

### Testing

- Unit tests for each screen's logic
- E2E tests for full wizard flow
- Non-interactive mode tests for CI

---

## Success Metrics

| Metric                      | Target |
| --------------------------- | ------ |
| Wizard completion rate      | >90%   |
| Time to complete (median)   | <60s   |
| First dispatch success rate | >95%   |
| Support tickets for init    | <5%    |

---

## Implementation Plan

| Day | Task                              | Owner       |
| --- | --------------------------------- | ----------- |
| 1   | Screen 1-2 implementation         | Engineering |
| 2   | Screen 3-4 implementation         | Engineering |
| 3   | Screen 5-6 implementation         | Engineering |
| 4   | Keyboard nav + validation         | Engineering |
| 5   | Non-interactive mode              | Engineering |
| 6   | Error handling integration (#185) | Engineering |
| 7   | E2E tests + polish                | QA          |

---

## Appendix: Detection Heuristics

### Language Detection

```
package.json + tsconfig.json → TypeScript
package.json (no tsconfig)   → JavaScript
Cargo.toml                   → Rust
pyproject.toml / setup.py    → Python
go.mod                       → Go
*.csproj                     → C#/.NET
```

### Project Type Detection

```
packages/ + package.json     → Monorepo
src/app/ or src/pages/       → Web Application
src/cli/ or bin/             → CLI Tool
src/lib/ only                → Library
```

### GitHub Detection

```
.git/config contains github.com → GitHub repo
.git/config contains gitlab.com → GitLab repo
GITHUB_ACTIONS env var          → GitHub CI
```

---

_Spec complete. Ready for Sprint 4 implementation (or opportunistic Sprint 3 if capacity permits)._
