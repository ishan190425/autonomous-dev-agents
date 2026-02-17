# 📦 Product Spec: Interactive Onboarding Wizard (#183)

> **Author:** 📦 Product | **Cycle:** 777 | **Date:** 2026-02-17
> **Issue:** #183 | **Priority:** P1 | **Size:** M (3-5 cycles)
> **Status:** SPEC COMPLETE — Ready for Engineering

---

## Overview

The Interactive Onboarding Wizard transforms `ada init` from a static template copy into a guided, validated experience. Users answer prompts about their project, and ADA generates a customized agent team with appropriate roles, playbooks, and configuration.

---

## User Story

**As a** developer setting up ADA for the first time,
**I want** a guided onboarding experience that asks about my project,
**So that** I get a properly configured agent team without reading extensive documentation.

---

## Target Personas

| Persona         | Need                                       | Priority |
| --------------- | ------------------------------------------ | -------- |
| Solo Developer  | Quick setup, sensible defaults             | HIGH     |
| Small Team Lead | Team-appropriate roles, CI integration     | HIGH     |
| OSS Maintainer  | Community-focused roles, contributor guide | MEDIUM   |
| Enterprise User | Compliance roles, approval workflows       | LOW (v2) |

---

## Current State

```bash
$ ada init
# Copies templates/ to ./agents/
# No customization
# User must manually edit roster.json, playbooks
```

**Problems:**

1. One-size-fits-all — startup gets same config as enterprise
2. No validation — broken configs discovered at runtime
3. No guidance — users don't know which roles to enable
4. High abandonment — friction leads to incomplete setup

---

## Proposed Flow

### Step 1: Project Detection (Automatic)

```
🔍 Analyzing your project...

  Framework:    Next.js 14
  Language:     TypeScript
  Package Mgr:  npm
  CI:           GitHub Actions
  Test Runner:  Vitest
```

**Detection logic:**

- `package.json` → npm/yarn/pnpm, framework (next, react, vue, etc.)
- `tsconfig.json` → TypeScript
- `.github/workflows/` → GitHub Actions
- `vitest.config.*` / `jest.config.*` → Test runner
- `Dockerfile` → Container deployment
- `.env*` → Environment config pattern

### Step 2: Team Size Selection

```
👥 How would you describe your team?

  (1) Solo — Just me, maximize automation
  (2) Small Team (2-5) — Some human oversight
  (3) Growing Team (6-15) — More process, more roles
  (4) Enterprise — Compliance, approvals, audit trails

> 1
```

**Mapping:**
| Selection | Roles Enabled | Cycle Interval | Approval Mode |
|-----------|---------------|----------------|---------------|
| Solo | 5 core | 15 min | Auto |
| Small Team | 7 standard | 30 min | PR review |
| Growing | 10 full | 1 hour | PR + approval |
| Enterprise | 10 + custom | Manual trigger | Multi-approval |

### Step 3: Focus Areas

```
🎯 What's most important for your project? (select up to 3)

  [x] Code Quality — Tests, linting, type safety
  [ ] Documentation — Docs, comments, READMEs
  [x] Velocity — Fast iteration, quick PRs
  [ ] Research — Exploring new tech, experiments
  [ ] DevOps — CI/CD, deployment, monitoring
  [x] Product — Features, roadmap, user feedback

> Enter to continue
```

**Focus → Role Priority:**
| Focus | Boosted Roles | Deprioritized |
|-------|---------------|---------------|
| Code Quality | QA, Engineering | Growth |
| Documentation | Docs role (added) | - |
| Velocity | Engineering, Scrum | Research |
| Research | Research, Frontier | Ops |
| DevOps | Ops, Engineering | Product |
| Product | Product, Design | Research |

### Step 4: Integration Selection

```
🔌 Enable integrations? (optional)

  [ ] GitHub Issues — Create and manage issues
  [x] GitHub PRs — Open PRs for code changes
  [ ] Slack — Notifications to #ada-updates
  [ ] Discord — Notifications to channel
  [ ] Linear — Sync with Linear issues

> Enter to continue
```

### Step 5: Validation & Preview

```
✅ Configuration validated!

  Roles:      ceo, product, engineering, qa, ops (5)
  Interval:   15 minutes
  PRs:        Enabled (GitHub)
  Notifs:     None

  Files to create:
    agents/roster.json
    agents/playbooks/*.md (5 files)
    agents/memory/bank.md
    agents/rules/RULES.md
    .github/workflows/ada.yml

  Estimated first cycle: ~2 minutes

Proceed? (Y/n)
```

### Step 6: Execution with Progress

```
🚀 Initializing ADA...

  [████████████████████░░░░] 80%

  ✓ Created agents/roster.json
  ✓ Created 5 playbooks
  ✓ Initialized memory bank
  ✓ Added rules
  ◐ Generating GitHub workflow...
```

### Step 7: Next Steps

```
🎉 ADA initialized!

  Next steps:

  1. Review your team:     ada status
  2. Run first cycle:      ada run
  3. Watch it work:        ada run --watch

  📖 Docs: https://ada.dev/docs/getting-started
  💬 Help: https://discord.gg/ada

Happy building! 🏗️
```

---

## Acceptance Criteria

### Must Have (P0)

- [ ] **AC-1:** Project detection identifies framework, language, CI, test runner
- [ ] **AC-2:** Team size selection maps to role count and cycle interval
- [ ] **AC-3:** Focus areas adjust role priorities in roster.json
- [ ] **AC-4:** Configuration preview shows all files to be created
- [ ] **AC-5:** Validation catches common errors before file creation
- [ ] **AC-6:** Progress indicator shows real-time status during init
- [ ] **AC-7:** Next steps displayed after successful init

### Should Have (P1)

- [ ] **AC-8:** Integration selection enables GitHub/Slack/Discord config
- [ ] **AC-9:** `--yes` flag skips prompts with sensible defaults
- [ ] **AC-10:** `--template=<name>` allows preset configurations
- [ ] **AC-11:** Dry-run mode (`--dry-run`) shows what would be created

### Nice to Have (P2)

- [ ] **AC-12:** AI-powered role suggestions based on project analysis
- [ ] **AC-13:** Migration mode for existing agent teams
- [ ] **AC-14:** Team presets (web-app, cli-tool, api-service, library)

---

## Technical Notes

### CLI Library

Use `@inquirer/prompts` for interactive prompts:

- Multi-select for focus areas
- Single-select for team size
- Confirm for proceed
- Spinner for async operations

### Project Detection

```typescript
interface ProjectAnalysis {
  framework: 'nextjs' | 'react' | 'vue' | 'express' | 'fastify' | null;
  language: 'typescript' | 'javascript';
  packageManager: 'npm' | 'yarn' | 'pnpm';
  ci: 'github-actions' | 'gitlab-ci' | 'circleci' | null;
  testRunner: 'vitest' | 'jest' | 'mocha' | null;
  hasDocker: boolean;
}
```

### Config Generation

Generate `agents/roster.json` based on selections:

- Map team size → role count
- Map focus areas → role weights
- Map integrations → notification config

---

## Success Metrics

| Metric                       | Current     | Target |
| ---------------------------- | ----------- | ------ |
| Init completion rate         | ~40% (est.) | 80%+   |
| Time to first cycle          | ~10 min     | <3 min |
| Config errors on first run   | ~30%        | <5%    |
| Support questions about init | High        | Low    |

---

## Dependencies

- **Design (#183):** UX patterns, spinner styles, color scheme
- **Engineering:** CLI implementation
- **Docs (#184):** Update getting-started with new flow

---

## Open Questions

1. **Telemetry:** Should we collect anonymized init data for improvement?
2. **Cloud sync:** Option to save config to ada.dev account for backup?
3. **Team templates:** Pre-built team configs (startup, enterprise, oss)?

---

## References

- Issue: #183
- Design triage: docs/design/phase2-day2-ux-triage-c772.md
- CLI spec: docs/product/cli-spec.md
- Prior art: `create-next-app`, `npm init`, `gh repo create`

---

_Spec complete. Ready for Engineering estimation and Design UX review._
