# Interactive Onboarding Wizard Product Spec (C1217)

> **Sprint 4 Front-Load** — Detailed product specification for `ada init` interactive experience.
> Created: 2026-02-27 | Author: 📦 Product (The PM)
> Per L706: "Front-load next-sprint specs during current-sprint T-3 window."
> Issue: #183 (P1, Design, M)

---

## Executive Summary

The Interactive Onboarding Wizard transforms `ada init` from a basic scaffolding command into a guided, personalized setup experience. Users answer questions about their project and team needs, and ADA generates a customized agent configuration.

**Goal:** First-run success rate > 90% (users complete setup and run first cycle).

**Sprint 4 Target:** Week 1 (Mar 15-18) implementation.

---

## Problem Statement

### Current State

```bash
$ ada init
✨ ADA initialized in /path/to/project
Created: agents/roster.json, agents/memory/bank.md, ...
```

**Issues:**

1. **No guidance** — Users don't know which roles to enable
2. **Generic config** — Same setup regardless of project type
3. **Overwhelming** — 10 roles dumped at once, hard to know where to start
4. **No validation** — Init succeeds even if project structure doesn't match

### Desired State

```bash
$ ada init

🚀 Welcome to ADA — Let's set up your autonomous dev team!

? What type of project is this? (Use arrow keys)
❯ Web Application (React/Next.js/Vue)
  CLI Tool (Node.js/Python)
  API Service (Express/Fastify/FastAPI)
  Library/Package
  Mobile App (React Native)
  Other

? What's your team focus? (Select all that apply)
◉ Code quality (tests, refactoring)
◯ Documentation
◉ Feature development
◯ DevOps/Infrastructure
◯ Research/Experiments

? How many cycles per session? (default: 10)
❯ 10

? Do you want sprint planning enabled? (Y/n) Y

✅ ADA team configured!
   Roles: engineering, qa, product, scrum
   Templates: web-app (Next.js)
   First run: ada dispatch start

💡 Tip: Run `ada status` to see your team roster.
```

---

## User Journey

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         ada init                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Project Detection                                      │
│  - Auto-detect: package.json, pyproject.toml, Cargo.toml, etc. │
│  - Suggest project type based on files                         │
│  - User confirms or overrides                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Team Sizing                                            │
│  - Solo dev? Small team? Large org?                             │
│  - Determines default role count                                │
│  - Solo = focused roles, Large = full rotation                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Focus Areas                                            │
│  - Multi-select: Code quality, Docs, Features, DevOps, Research │
│  - Maps to recommended roles                                     │
│  - User can customize before confirming                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Role Selection                                         │
│  - Show recommended roles based on previous answers             │
│  - Allow add/remove before proceeding                           │
│  - Brief explanation of each role                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: Configuration                                          │
│  - Cycles per session (default: 10)                             │
│  - Sprint planning (yes/no)                                     │
│  - Memory compression interval                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: Validation                                             │
│  - Pre-flight checks (git repo? package.json? write access?)    │
│  - Warnings for missing recommended files                        │
│  - Block if critical requirements missing                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 7: Confirmation                                           │
│  - Summary of configuration                                      │
│  - Confirm or go back to modify                                  │
│  - Write files on confirmation                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 8: Success + Next Steps                                   │
│  - Files created listing                                         │
│  - Next command: `ada dispatch start`                            │
│  - Link to documentation                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Specifications

### F1: Project Auto-Detection

**Trigger:** `ada init` in any directory

**Detection Matrix:**

| File(s) Found                  | Suggested Type         | Confidence |
| ------------------------------ | ---------------------- | ---------- |
| `package.json` + `next.config` | Web App (Next.js)      | High       |
| `package.json` + `vite.config` | Web App (Vite/React)   | High       |
| `package.json` + `bin` field   | CLI Tool (Node.js)     | High       |
| `pyproject.toml`               | Python Library/Service | Medium     |
| `Cargo.toml`                   | Rust Project           | Medium     |
| `go.mod`                       | Go Project             | Medium     |
| None of above                  | Generic (ask user)     | Low        |

**UX:**

```bash
📁 Detected: Next.js project (found next.config.js, package.json)
? Is this correct? (Y/n)
```

**Acceptance Criteria:**

- [ ] Detects 5+ project types automatically
- [ ] Shows confidence level in detection
- [ ] Allows user override
- [ ] Falls back to generic if uncertain

---

### F2: Team Sizing Presets

**Options:**

| Size          | Description                      | Default Roles                      |
| ------------- | -------------------------------- | ---------------------------------- |
| Solo          | One person, all responsibilities | engineering, qa, product (3 roles) |
| Small (2-5)   | Small team, some specialization  | + ops, design (5 roles)            |
| Medium (6-15) | Growing team, most roles         | + scrum, research (7 roles)        |
| Large (15+)   | Full rotation, all roles         | All 10 roles                       |

**UX:**

```bash
? What's your team size? (Use arrow keys)
❯ 🧑 Solo — I'm the whole team
  👥 Small (2-5) — Small team, wearing multiple hats
  🏢 Medium (6-15) — Growing, specialized roles
  🌐 Large (15+) — Full org, complete rotation
```

**Acceptance Criteria:**

- [ ] 4 team size presets with clear descriptions
- [ ] Each maps to recommended role count
- [ ] Can customize after selection

---

### F3: Focus Area Selection

**Multi-Select Options:**

| Focus Area          | Maps to Roles            | Description                     |
| ------------------- | ------------------------ | ------------------------------- |
| Code Quality        | qa, engineering          | Tests, refactoring, code review |
| Documentation       | docs (if exists), design | README, API docs, examples      |
| Feature Development | product, engineering     | New features, user stories      |
| DevOps/Infra        | ops                      | CI/CD, deployments, monitoring  |
| Research            | research, frontier       | Experiments, new approaches     |
| Growth              | growth, evangelist       | Marketing, community            |

**UX:**

```bash
? What's your team's focus? (Select with space, enter to confirm)
◉ 🧪 Code Quality — Tests, refactoring, reviews
◉ 📦 Feature Development — New features, user stories
◯ 📚 Documentation — README, API docs, examples
◯ 🚀 DevOps/Infra — CI/CD, deployments
◯ 🔬 Research — Experiments, new approaches
◯ 📣 Growth — Marketing, community
```

**Acceptance Criteria:**

- [ ] Multi-select interaction (space to toggle)
- [ ] At least one selection required
- [ ] Maps selections to recommended roles

---

### F4: Role Customization

**After recommendations, allow fine-tuning:**

```bash
Based on your answers, we recommend these roles:

  ✓ ⚙️ Engineering — Code, features, bug fixes
  ✓ 🔍 QA — Testing, quality gates
  ✓ 📦 Product — Specs, priorities, user stories
  ✓ 🛡️ Ops — CI/CD, deployments

? Add or remove roles? (a=add, r=remove, enter=continue)
```

**Role Descriptions (brief):**

| Role        | Emoji | One-liner                           |
| ----------- | ----- | ----------------------------------- |
| CEO         | 👔    | Strategy, decisions, blockers       |
| Product     | 📦    | Specs, priorities, user stories     |
| Engineering | ⚙️    | Code, features, bug fixes           |
| QA          | 🔍    | Testing, quality gates              |
| Ops         | 🛡️    | CI/CD, deployments, infra           |
| Design      | 🎨    | UX, visual design, DX               |
| Research    | 🔬    | New approaches, papers, experiments |
| Frontier    | 🌌    | Architecture, cutting-edge          |
| Scrum       | 📋    | Sprints, retros, process            |
| Growth      | 🚀    | Marketing, community, launch        |

**Acceptance Criteria:**

- [ ] Show recommended roles with brief descriptions
- [ ] Allow add/remove before confirming
- [ ] Minimum 1 role required
- [ ] Maximum all 10 roles

---

### F5: Configuration Questions

**Post-role settings:**

```bash
? Cycles per dispatch session (default: 10)
❯ 10

? Enable sprint planning? (Scrum role will track sprints) (Y/n)
❯ Y

? Memory compression interval (cycles)
  5 — Aggressive (less context, faster)
  10 — Balanced (recommended)
❯ 20 — Conservative (more context, slower)
```

**Defaults by Team Size:**

| Setting              | Solo | Small | Medium | Large |
| -------------------- | ---- | ----- | ------ | ----- |
| Cycles per session   | 5    | 10    | 10     | 10    |
| Sprint planning      | No   | No    | Yes    | Yes   |
| Compression interval | 10   | 15    | 20     | 25    |

**Acceptance Criteria:**

- [ ] Smart defaults based on team size
- [ ] All settings have explanatory help text
- [ ] Can skip with defaults (enter key)

---

### F6: Pre-Flight Validation

**Required Checks (block if failing):**

| Check                   | Error Message                                          |
| ----------------------- | ------------------------------------------------------ |
| Git repository exists   | "ADA requires a git repository. Run `git init` first." |
| Write permission        | "Cannot write to agents/ directory."                   |
| Not already initialized | "ADA already initialized. Use `ada config` to modify." |

**Warning Checks (warn but continue):**

| Check             | Warning Message                                               |
| ----------------- | ------------------------------------------------------------- |
| No package.json   | "No package.json found. Some features may be limited."        |
| No .gitignore     | "Consider adding agents/state/ to .gitignore."                |
| Large repo (>1GB) | "Large repository detected. Initial memory load may be slow." |

**UX:**

```bash
🔍 Running pre-flight checks...
  ✓ Git repository found
  ✓ Write permissions OK
  ⚠️ No .gitignore — consider adding agents/state/

Continue? (Y/n)
```

**Acceptance Criteria:**

- [ ] Block on required check failures with clear fix instructions
- [ ] Warn on optional checks with recommendations
- [ ] Per L685: "Pre-flight checks reduce support burden"

---

### F7: Confirmation Summary

**Before writing files:**

```bash
┌────────────────────────────────────────────────────────────────┐
│                    📋 Configuration Summary                     │
├────────────────────────────────────────────────────────────────┤
│  Project:    my-awesome-app (Next.js)                          │
│  Team Size:  Small (2-5 people)                                │
│  Focus:      Code Quality, Feature Development                 │
│                                                                │
│  Roles (4):  ⚙️ engineering  🔍 qa  📦 product  🛡️ ops        │
│                                                                │
│  Settings:                                                     │
│    • Cycles per session: 10                                    │
│    • Sprint planning: No                                       │
│    • Compression: Every 15 cycles                              │
│                                                                │
│  Files to create:                                              │
│    agents/roster.json                                          │
│    agents/state/rotation.json                                  │
│    agents/memory/bank.md                                       │
│    agents/rules/RULES.md                                       │
│    agents/playbooks/*.md (4 files)                             │
│    agents/DISPATCH.md                                          │
└────────────────────────────────────────────────────────────────┘

? Create ADA team? (Y/n)
```

**Acceptance Criteria:**

- [ ] Clear summary of all choices
- [ ] List of files to be created
- [ ] Ability to go back and modify
- [ ] Single confirmation to proceed

---

### F8: Success Output

**After file creation:**

```bash
✅ ADA team created!

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
   1. Review agents/roster.json to customize roles
   2. Read agents/DISPATCH.md for the dispatch protocol
   3. Run: ada dispatch start

📚 Documentation: https://docs.ada.dev/getting-started
💬 Discord: https://discord.gg/ada

Happy building! 🎉
```

**Acceptance Criteria:**

- [ ] List all created files
- [ ] Clear next steps with commands
- [ ] Links to docs and community
- [ ] Celebratory but professional tone

---

## Non-Interactive Mode

**For CI/scripting, support `--yes` and preset flags:**

```bash
# Accept all defaults
ada init --yes

# Specify preset
ada init --preset=web-app --team=small --yes

# Custom roles
ada init --roles=engineering,qa,ops --yes
```

**Flags:**

| Flag          | Values                                        | Default     |
| ------------- | --------------------------------------------- | ----------- |
| `--yes`       | Skip prompts, use defaults                    | false       |
| `--preset`    | `web-app`, `cli`, `api`, `library`, `generic` | auto-detect |
| `--team`      | `solo`, `small`, `medium`, `large`            | `small`     |
| `--roles`     | Comma-separated role names                    | preset      |
| `--cycles`    | Number                                        | 10          |
| `--no-sprint` | Disable sprint planning                       | -           |

**Acceptance Criteria:**

- [ ] All prompts bypassable via flags
- [ ] `--yes` uses smart defaults
- [ ] Error if conflicting flags

---

## Technical Implementation Notes

### Dependencies

| Package    | Purpose                   | Version |
| ---------- | ------------------------- | ------- |
| `inquirer` | Interactive prompts       | ^9.0.0  |
| `chalk`    | Colored terminal output   | ^5.0.0  |
| `ora`      | Spinners for async ops    | ^6.0.0  |
| `boxen`    | Box drawing for summaries | ^7.0.0  |

### File Structure

```
packages/cli/src/commands/init/
├── index.ts           # Main init command
├── prompts/
│   ├── project.ts     # Project detection prompts
│   ├── team.ts        # Team sizing prompts
│   ├── focus.ts       # Focus area selection
│   ├── roles.ts       # Role customization
│   └── config.ts      # Configuration questions
├── validation/
│   ├── preflight.ts   # Pre-flight checks
│   └── requirements.ts # Required vs warning checks
├── templates/
│   └── presets.ts     # Project preset definitions
└── output/
    ├── summary.ts     # Confirmation summary
    └── success.ts     # Success message
```

### Integration Points

- **C1076 (Observability):** Track wizard completion rates, drop-off points
- **C1197 (Dashboard):** Sync init config with cloud dashboard
- **C1202 (Error UX):** Consistent error message styling

---

## Success Metrics

| Metric                         | Target   | Measurement                       |
| ------------------------------ | -------- | --------------------------------- |
| Init completion rate           | > 90%    | Started init → files created      |
| First cycle success            | > 85%    | Init complete → first dispatch    |
| Time to complete wizard        | < 2 min  | Timer from start to confirm       |
| Support tickets (init-related) | < 5/week | GitHub issues tagged `init`       |
| Satisfaction (if surveyed)     | > 4/5    | Post-init micro-survey (optional) |

---

## Rollout Plan

### Sprint 4 Week 1 (Mar 15-18)

| Day | Task                          | Owner                |
| --- | ----------------------------- | -------------------- |
| 1   | Inquirer setup + F1 detection | Engineering          |
| 2   | F2-F4 team/focus/roles        | Engineering          |
| 3   | F5-F6 config + validation     | Engineering          |
| 4   | F7-F8 summary + success       | Engineering + Design |

### Sprint 4 Week 2 (Mar 19-21)

| Day | Task                          | Owner       |
| --- | ----------------------------- | ----------- |
| 5   | Non-interactive mode          | Engineering |
| 6   | E2E tests + polish            | QA          |
| 7   | Documentation + release notes | Docs        |

---

## Open Questions

1. **Telemetry:** Should we track wizard usage anonymously for improvement? (Opt-in)
2. **Templates marketplace:** Pre-built configs downloadable? (Future: #187)
3. **Migration:** What if user has partial `agents/` folder from manual setup?

---

## Related Issues

- **#183** — This issue (Interactive Onboarding Wizard)
- **#187** — Community Playbook Marketplace (future integration)
- **#30** — Interactive LLM-Guided Onboarding (research, may inform F2-F4)

---

## Changelog

- **C1217 (2026-02-27):** Initial spec created. Sprint 4 front-load per L706.
