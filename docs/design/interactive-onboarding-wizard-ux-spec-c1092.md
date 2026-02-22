# Interactive Onboarding Wizard UX Spec (C1092)

> UX specification for `ada init` interactive onboarding wizard per #183.
> Designed for intuitive first-run experience with validation and progressive disclosure.

---

## Overview

The `ada init` command transforms a repository into an ADA-managed autonomous dev team. This spec defines the interactive wizard flow that guides users through configuration with smart defaults, validation, and escape hatches.

### Design Principles

1. **Progressive Disclosure** — Start simple, reveal complexity only when needed
2. **Smart Defaults** — 90% of users should accept defaults and succeed
3. **Fast Path** — `ada init --yes` skips all prompts with sensible defaults
4. **Recoverable** — Every choice can be changed later via `ada config`
5. **Accessible** — Works in terminals without color, screen readers, CI environments

---

## Entry Points

### Interactive (Default)

```bash
ada init
```

Launches full wizard with prompts.

### Non-Interactive (CI/Scripting)

```bash
ada init --yes                    # All defaults
ada init --yes --preset minimal   # Minimal preset
ada init --preset enterprise      # Enterprise preset with prompts for required fields
```

### Existing Project Detection

If `agents/` directory exists:

```
⚠️  ADA already initialized in this repository.

   agents/roster.json found (5 roles configured)
   agents/memory/bank.md found (v3)

   Options:
   [r] Reinitialize (overwrites current config)
   [u] Upgrade (migrate to latest schema version)
   [c] Cancel

   Choice: _
```

---

## Wizard Flow

### Phase 1: Welcome & Detection (Auto)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🤖  ADA — Autonomous Dev Agent Teams                      │
│                                                             │
│   Let's set up your autonomous dev team.                   │
│   This will create an agents/ directory with:              │
│                                                             │
│   • roster.json    — your team composition                 │
│   • playbooks/     — role-specific instructions            │
│   • memory/        — shared team memory                    │
│   • rules/         — mandatory team rules                  │
│                                                             │
│   Press Enter to continue, or Ctrl+C to cancel...          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Auto-detection runs here:**

- Git repository? (required)
- Monorepo? (package.json workspaces, pnpm-workspace.yaml)
- Language? (TypeScript, Python, Go, Rust, etc.)
- Existing CI? (GitHub Actions, GitLab CI, etc.)

### Phase 2: Team Size

```
📋 Team Composition

   How many roles should your dev team have?

   [1] Minimal (3 roles)
       → Engineering, QA, Ops
       Best for: small projects, solo devs, getting started

   [2] Standard (6 roles)  ← recommended
       → CEO, Product, Engineering, QA, Ops, Design
       Best for: most projects, balanced team

   [3] Full (10 roles)
       → CEO, Product, Engineering, QA, Ops, Design,
         Research, Growth, Scrum, Frontier
       Best for: large projects, research-heavy work

   [4] Custom
       → Pick specific roles

   Choice [2]: _
```

### Phase 3: Role Selection (if Custom)

```
🎭 Select Roles

   Use ↑↓ to move, Space to toggle, Enter to confirm.

   [ ] 👔 CEO — Business strategy, competitive analysis
   [✓] 📦 Product — Feature specs, prioritization
   [✓] ⚙️ Engineering — Code implementation, PRs
   [✓] 🔍 QA — Testing, quality assurance
   [✓] 🛡️ Ops — CI/CD, infrastructure, rules
   [ ] 🎨 Design — API design, CLI UX
   [ ] 🔬 Research — Technical research, feasibility
   [ ] 🚀 Growth — Marketing, outreach
   [ ] 📋 Scrum — Sprint planning, retrospectives
   [ ] 🌌 Frontier — Advanced features, innovation

   4 roles selected. Press Enter to continue...
```

### Phase 4: AI Backend

```
🧠 AI Backend

   Which AI will power your agents?

   [1] OpenClaw (recommended)
       → Multi-model orchestration, tool use, autonomous operation
       Requires: OPENCLAW_API_KEY or running OpenClaw gateway

   [2] Claude Code
       → Anthropic Claude with code tools
       Requires: ANTHROPIC_API_KEY

   [3] OpenAI Codex
       → GPT-4 with code tools
       Requires: OPENAI_API_KEY

   [4] Local (Ollama)
       → Run locally with Ollama models
       Requires: Ollama running at localhost:11434

   Choice [1]: _
```

### Phase 5: Memory Backend

```
💾 Memory Storage

   Where should agent memory be stored?

   [1] Local Files (default)
       → agents/memory/bank.md
       Best for: getting started, git-tracked memory

   [2] Supabase
       → Cloud database with vector search
       Requires: SUPABASE_URL, SUPABASE_KEY
       Best for: large teams, semantic search

   [3] Custom
       → Configure your own backend
       See docs: https://ada.dev/docs/memory-backends

   Choice [1]: _
```

### Phase 6: Dispatch Mode

```
⚡ Dispatch Mode

   How should agent cycles run?

   [1] Manual (default)
       → You trigger: ada dispatch start
       Best for: learning ADA, controlled operation

   [2] Cron
       → Scheduled cycles (e.g., every 15 minutes)
       Best for: continuous autonomous development

   [3] Event-Driven
       → Triggered by GitHub webhooks
       Best for: issue-driven workflows

   Choice [1]: _
```

### Phase 7: Confirmation

```
✅ Ready to Initialize

   Team:      Standard (6 roles)
   Backend:   OpenClaw
   Memory:    Local Files
   Dispatch:  Manual

   This will create:
     agents/
     ├── roster.json
     ├── playbooks/ (6 files)
     ├── memory/
     │   └── bank.md
     ├── rules/
     │   └── RULES.md
     └── DISPATCH.md

   [Enter] Create files
   [e] Edit choices
   [c] Cancel

   Choice: _
```

### Phase 8: Creation & Next Steps

```
🎉 ADA Initialized Successfully!

   Created 12 files in agents/

   Next Steps:

   1. Review your team roster:
      cat agents/roster.json

   2. Start your first dispatch cycle:
      ada dispatch start

   3. Check team status:
      ada status

   Documentation: https://ada.dev/docs/getting-started
   Discord: https://discord.gg/ada

   Happy building! 🚀
```

---

## Validation Rules

### Phase-Level Validation

| Phase   | Validation           | Error Message                                                   |
| ------- | -------------------- | --------------------------------------------------------------- |
| Entry   | Git repo exists      | `Error: Not a git repository. Run 'git init' first.`            |
| Entry   | Write permissions    | `Error: Cannot write to ./agents/. Check permissions.`          |
| Roles   | At least 1 role      | `Error: Select at least one role.`                              |
| Roles   | Engineering required | `Warning: Engineering role recommended for code changes.`       |
| Backend | API key present      | `Warning: OPENCLAW_API_KEY not set. Set it before dispatching.` |

### Field Validation

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Example: validate role selection
function validateRoles(selected: Role[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (selected.length === 0) {
    errors.push('Select at least one role.');
  }

  if (!selected.includes('engineering')) {
    warnings.push('Engineering role recommended for code changes.');
  }

  if (selected.includes('scrum') && !selected.includes('product')) {
    warnings.push('Scrum works best with Product role for backlog management.');
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

---

## Presets

### `--preset minimal`

```json
{
  "roles": ["engineering", "qa", "ops"],
  "backend": "openclaw",
  "memory": "local",
  "dispatch": "manual"
}
```

### `--preset standard` (default)

```json
{
  "roles": ["ceo", "product", "engineering", "qa", "ops", "design"],
  "backend": "openclaw",
  "memory": "local",
  "dispatch": "manual"
}
```

### `--preset enterprise`

```json
{
  "roles": [
    "ceo",
    "product",
    "engineering",
    "qa",
    "ops",
    "design",
    "research",
    "growth",
    "scrum",
    "frontier"
  ],
  "backend": "openclaw",
  "memory": "supabase",
  "dispatch": "cron"
}
```

### `--preset research`

```json
{
  "roles": ["research", "frontier", "engineering", "qa", "ops"],
  "backend": "openclaw",
  "memory": "local",
  "dispatch": "manual"
}
```

---

## Accessibility

### No-Color Mode

Detect `NO_COLOR` env var or `--no-color` flag:

```
ADA - Autonomous Dev Agent Teams

Let's set up your autonomous dev team.
This will create an agents/ directory.

Press Enter to continue, or Ctrl+C to cancel...

---

Team Composition

How many roles should your dev team have?

[1] Minimal (3 roles)
[2] Standard (6 roles) <- recommended
[3] Full (10 roles)
[4] Custom

Choice [2]: _
```

### Screen Reader Mode

Detect `TERM=dumb` or screen reader env vars:

- No spinners or animations
- Clear section headers with `---` separators
- Explicit "Press Enter" instead of implicit waits
- Number-based selection instead of arrow keys

### CI Mode

Detect `CI=true` or `--ci` flag:

```bash
# In CI, --yes is required (no interactive prompts)
ada init --yes --preset standard

# Or fail explicitly
ada init
# Error: Interactive mode not available in CI. Use --yes flag.
```

---

## Error Display

### Inline Validation Error

```
⚡ Dispatch Mode

   Choice: 5

   ✗ Invalid choice. Enter 1, 2, or 3.

   Choice: _
```

### Missing Dependency Error

```
🧠 AI Backend

   Choice: 1

   ⚠️  OPENCLAW_API_KEY not found in environment.

   To set it:
     export OPENCLAW_API_KEY=your-key-here

   Or add to .env file:
     echo "OPENCLAW_API_KEY=your-key" >> .env

   [Enter] Continue anyway (set key later)
   [c] Cancel and set key first

   Choice: _
```

### Fatal Error

```
❌ Initialization Failed

   Error: Cannot write to ./agents/ directory.

   Cause: Permission denied

   Try:
   1. Check directory permissions: ls -la .
   2. Run with appropriate permissions
   3. Choose a different directory

   For help: https://ada.dev/docs/troubleshooting#init-errors
```

---

## Implementation Phases

### Phase 1: Core Wizard (Sprint 3)

- [ ] Basic prompt flow (Phases 1-8)
- [ ] Team size presets
- [ ] File generation
- [ ] `--yes` flag for non-interactive
- [ ] Git repo validation

### Phase 2: Smart Detection (Sprint 4)

- [ ] Auto-detect monorepo structure
- [ ] Auto-detect language/framework
- [ ] Suggest roles based on project type
- [ ] Migrate existing config detection

### Phase 3: Advanced Features (Sprint 5)

- [ ] Custom preset save/load (`ada init --save-preset mypreset`)
- [ ] Remote templates (`ada init --template org/template`)
- [ ] Plugin integration prompts
- [ ] Team import from existing project

---

## CLI Interface

```typescript
// packages/cli/src/commands/init.ts

interface InitOptions {
  yes: boolean; // Skip all prompts, use defaults
  preset: string; // Use named preset
  force: boolean; // Overwrite existing config
  ci: boolean; // CI mode (no TTY features)
  dryRun: boolean; // Show what would be created
  template: string; // Remote template URL
}

interface InitAnswers {
  teamSize: 'minimal' | 'standard' | 'full' | 'custom';
  roles: string[];
  backend: 'openclaw' | 'claude' | 'codex' | 'ollama';
  memory: 'local' | 'supabase' | 'custom';
  dispatch: 'manual' | 'cron' | 'event';
}
```

---

## Testing Scenarios

1. **Happy Path**: Fresh repo, standard preset, all defaults
2. **Custom Roles**: Select specific role combination
3. **Existing Config**: Handle upgrade vs reinitialize
4. **Missing API Key**: Warning but allow continue
5. **No Git**: Fail with clear error
6. **CI Environment**: Require --yes, no prompts
7. **No Color**: Verify accessibility mode
8. **Keyboard Navigation**: Arrow keys, space, enter work

---

## Related

- **Issue:** #183
- **Depends on:** Error messages spec (C1082)
- **Enables:** First-run experience, adoption metrics
- **Author:** 🎨 Design (C1092)
