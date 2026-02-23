# Interactive Onboarding Wizard — Full Spec

> **Issue:** #183
> **Author:** 📦 Product Lead (C1177)
> **Created:** 2026-02-23
> **Status:** Draft
> **Sprint:** 4-5

---

## Overview

This spec defines the complete Interactive Onboarding Wizard for `ada init`, building on the pre-flight checks implemented in PR #251 (C1170). The wizard transforms `ada init` from a simple template copy into an intelligent, context-aware setup experience.

## User Stories

### Story 1: Solo Developer Starting Fresh

> As a solo developer starting a new project, I want `ada init` to ask me about my project and goals so that I get a team configured for my specific needs.

**Acceptance Criteria:**

- [ ] Wizard asks project type (web app, CLI, API, library)
- [ ] Wizard asks focus areas (speed to market, code quality, documentation)
- [ ] Initial roster is customized based on answers
- [ ] Can skip wizard with `--yes` flag for defaults

### Story 2: Team Lead Adding to Existing Project

> As a team lead adding ADA to an existing project, I want the wizard to detect my existing setup and adapt recommendations.

**Acceptance Criteria:**

- [ ] Wizard detects existing frameworks (Next.js, Express, etc.)
- [ ] Wizard detects existing CI/CD setup
- [ ] Recommendations adjust based on project maturity
- [ ] Wizard warns about potential conflicts with existing workflows

### Story 3: Power User with Custom Requirements

> As a power user, I want to customize my agent team during setup so that I can start with exactly the roles I need.

**Acceptance Criteria:**

- [ ] Option to enable/disable individual roles
- [ ] Option to add custom roles inline
- [ ] Option to specify model preferences
- [ ] Configuration is saved to `ada.config.json` or similar

---

## Wizard Phases

### Phase 1: Pre-Flight Checks ✅ (PR #251)

**Already implemented.** Validates:

- Git repository (required)
- Node.js v18+ (required)
- GitHub CLI (recommended)
- package.json (optional)

**Output:** Proceed/abort with clear messaging.

### Phase 2: Project Context Detection

**Goal:** Understand the project to customize recommendations.

```
🔍 Analyzing your project...

Detected:
  ✓ TypeScript project
  ✓ Next.js 14 (app router)
  ✓ GitHub Actions CI
  ✓ Vercel deployment config
  ○ No existing test setup

This looks like a web application with CI already configured.
```

**Detection targets:**
| Detection | Source | Impact |
|-----------|--------|--------|
| Language | package.json, file extensions | Role playbook variants |
| Framework | package.json dependencies | Template selection |
| CI/CD | .github/workflows, vercel.json | Ops role focus |
| Testing | vitest.config, jest.config | QA role focus |
| Project maturity | git history, LOC | Team size recommendation |

**Implementation:**

- Read package.json for dependencies
- Scan root for config files
- Count commits and contributors
- Estimate LOC via file count

### Phase 3: Configuration Prompts

**Goal:** Gather user intent to customize team.

```
📦 Let's configure your agent team.

What's your primary goal? (Use arrow keys)
❯ 🚀 Ship features fast (lean team, speed focus)
  🛡️ Build with quality (full team, CI/testing focus)
  📚 Document and maintain (docs-heavy, sustainability focus)
  🔬 Explore and prototype (research focus, experimental)

How much autonomy should agents have?
❯ 🤖 Full autonomy (minimal approval needed)
  🤝 Collaborative (require approval for external actions)
  👀 Observer mode (agents suggest, human executes)

Which roles do you want? (Space to toggle)
 ✓ CEO — Strategic direction
 ✓ Engineering — Code implementation
 ✓ QA — Testing and quality
 ✓ Ops — CI/CD and infrastructure
 ○ Research — Technical exploration
 ○ Design — UX and architecture
 ○ Growth — Marketing and outreach
 ○ Scrum — Sprint coordination
```

**Prompt Library:**

| Prompt         | Options                                     | Default       | Impact          |
| -------------- | ------------------------------------------- | ------------- | --------------- |
| Primary goal   | ship-fast, build-quality, document, explore | ship-fast     | Role weights    |
| Autonomy       | full, collaborative, observer               | collaborative | Approval config |
| Roles          | Multi-select from roster                    | Core 4        | roster.json     |
| Model          | sonnet, opus, haiku, custom                 | sonnet        | ada.config.json |
| Cycle interval | 15m, 30m, 1h, manual                        | 30m           | dispatch config |

### Phase 4: Template Generation

**Goal:** Generate customized files based on context + prompts.

**Generated Files:**

```
agents/
├── roster.json          ← Customized based on role selection
├── state/
│   └── rotation.json    ← Initial state
├── memory/
│   └── bank.md          ← Project-specific seed content
├── rules/
│   └── RULES.md         ← Base rules + custom additions
└── playbooks/
    └── *.md             ← Only selected roles
```

**Template Variants:**

| Project Type      | Playbook Adjustments                       |
| ----------------- | ------------------------------------------ |
| Web app (Next.js) | React patterns, Vercel deployment          |
| CLI tool          | npm publishing, stdin/stdout handling      |
| API service       | OpenAPI, endpoint testing                  |
| Library           | Semver, changelogs, compatibility          |
| Monorepo          | Workspace coordination, package boundaries |

**Memory Bank Seeding:**

Pre-populate bank.md with:

- Project name and description
- Detected tech stack
- Initial focus areas
- Suggested first actions per role

### Phase 5: First Cycle Setup (Post-Init)

**Goal:** Guide user to successful first dispatch.

```
✅ ADA initialized!

Your agent team:
  👔 CEO          | Strategic direction
  ⚙️ Engineering  | Code implementation
  🔍 QA           | Testing and quality
  🛡️ Ops          | CI/CD and infrastructure

📁 Created: agents/ (roster, state, memory, playbooks)

Next steps:
  1. Review agents/roster.json — customize if needed
  2. Run ada status — verify setup
  3. Run ada run — execute first cycle

💡 Tip: Start with 'ada run --dry-run' to preview without changes.
```

**Optional guided first run:**

```
Would you like to run your first cycle now? (Y/n)
```

---

## CLI UX Design

### Flags

| Flag                | Description                                   | Default     |
| ------------------- | --------------------------------------------- | ----------- |
| `--yes` / `-y`      | Accept all defaults, skip prompts             | false       |
| `--skip-preflight`  | Skip pre-flight checks                        | false       |
| `--goal <type>`     | Pre-set goal (ship-fast, build-quality, etc.) | prompt      |
| `--roles <list>`    | Pre-select roles (comma-separated)            | prompt      |
| `--template <name>` | Use a community template                      | auto-detect |
| `--dry-run`         | Show what would be created without creating   | false       |
| `--force`           | Overwrite existing agents/ directory          | false       |

### Non-Interactive Mode

For CI or scripting:

```bash
ada init --yes --goal ship-fast --roles ceo,engineering,qa
```

### Interactive Experience

- Use `@inquirer/prompts` for rich TUI prompts
- Arrow key navigation for single-select
- Space to toggle for multi-select
- Colors: cyan for prompts, green for success, yellow for warnings
- Clear CTRL+C handling with graceful exit

---

## TypeScript Interfaces

```typescript
interface WizardContext {
  // Phase 1: Pre-flight
  preflight: PreflightResult;

  // Phase 2: Detection
  detection: ProjectDetection;

  // Phase 3: User input
  config: WizardConfig;
}

interface ProjectDetection {
  language: 'typescript' | 'javascript' | 'python' | 'other';
  framework: string | null; // 'next', 'express', 'fastify', etc.
  hasCI: boolean;
  ciPlatform: 'github-actions' | 'gitlab-ci' | 'circleci' | null;
  hasTesting: boolean;
  testFramework: 'vitest' | 'jest' | 'mocha' | null;
  maturity: 'new' | 'early' | 'established';
  estimatedLOC: number;
}

interface WizardConfig {
  goal: 'ship-fast' | 'build-quality' | 'document' | 'explore';
  autonomy: 'full' | 'collaborative' | 'observer';
  roles: string[]; // Role IDs from roster
  model: 'sonnet' | 'opus' | 'haiku' | string;
  cycleInterval: '15m' | '30m' | '1h' | 'manual';
}

interface InitResult {
  success: boolean;
  filesCreated: string[];
  warnings: string[];
  nextSteps: string[];
}
```

---

## Implementation Plan

### Sprint 4 (Mar 1-14)

**Phase 2 Implementation:**

- [ ] Project detection module (`detect.ts`)
- [ ] Package.json analyzer
- [ ] Framework detection (Next, Express, etc.)
- [ ] CI platform detection
- [ ] Maturity estimation

**Tests:**

- [ ] Detection tests with fixture projects
- [ ] Edge cases (empty repo, non-Node projects)

### Sprint 5 (Mar 15-28)

**Phase 3-4 Implementation:**

- [ ] Wizard prompts module (`wizard.ts`)
- [ ] Goal selection prompt
- [ ] Role selection prompt
- [ ] Configuration storage
- [ ] Template customization engine
- [ ] Memory bank seeding logic

**Tests:**

- [ ] Prompt flow tests (mocked input)
- [ ] Template generation tests
- [ ] Full E2E wizard tests

### Sprint 6 (Mar 29-Apr 11)

**Phase 5 & Polish:**

- [ ] First-cycle guidance
- [ ] Community templates support
- [ ] Documentation
- [ ] UX polish based on beta feedback

---

## Success Metrics

| Metric                 | Target   | Measurement                          |
| ---------------------- | -------- | ------------------------------------ |
| Wizard completion rate | >90%     | % of starts that reach init success  |
| Time to first cycle    | <5 min   | From `ada init` to `ada run`         |
| Role selection rate    | >60%     | % of users who customize roles       |
| Detection accuracy     | >80%     | % of correct framework/CI detections |
| User satisfaction      | 4+ stars | Post-init survey (planned)           |

---

## Dependencies

- **PR #251** (pre-flight checks) — Must merge first
- **@inquirer/prompts** — npm package for interactive prompts
- **Template system** — Current templates/ directory structure

## Related Issues

- **#183** — Parent issue (Interactive Onboarding Wizard)
- **#133** — First-run banner art (visual polish)
- **#184** — Documentation restructure (affects init docs)

---

## Open Questions

1. **Should wizard results be saveable as "profiles"?**
   - E.g., `ada init --save-profile my-team` then `ada init --profile my-team`
   - Deferred to Sprint 6+

2. **How to handle non-Node projects?**
   - Phase 2 can detect, Phase 3 can adjust
   - Consider Python, Go templates in future

3. **Should we support `ada init --from <repo>`?**
   - Clone another repo's agent config
   - Good for team standardization
   - Deferred to Sprint 6+

---

_Spec complete. Ready for Engineering implementation starting Sprint 4._
