# 📜 Master Rules

> Living rulebook for the ADA autonomous agent team.
> Rules are added by any role (primarily Ops).
> All roles MUST follow these rules. No exceptions.

---

## Rule Index

| ID    | Rule                                                         | Owner   | Added      |
| ----- | ------------------------------------------------------------ | ------- | ---------- |
| R-001 | [Memory Bank Protocol](#r-001-memory-bank-protocol)          | System  | Init       |
| R-002 | [Compression Protocol](#r-002-compression-protocol)          | System  | Init       |
| R-003 | [Role Evolution Protocol](#r-003-role-evolution-protocol)    | System  | Init       |
| R-004 | [Commit Standards](#r-004-commit-standards)                  | Ops     | Init       |
| R-005 | [Branch Strategy](#r-005-branch-strategy)                    | Ops     | Init       |
| R-006 | [Issue Quality](#r-006-issue-quality)                        | Product | Init       |
| R-007 | [TypeScript Standards](#r-007-typescript-standards)          | Ops     | Init       |
| R-008 | [Monorepo Conventions](#r-008-monorepo-conventions)          | Ops     | Init       |
| R-009 | [npm Workspace Rules](#r-009-npm-workspace-rules)            | Ops     | Init       |
| R-010 | [PR Management & CI](#r-010-pr-management--ci)               | Ops     | 2026-01-30 |
| R-011 | [PR Hygiene & Transparency](#r-011-pr-hygiene--transparency) | Ops     | 2026-02-02 |
| R-012 | [GitHub Templates](#r-012-github-templates)                  | Ops     | 2026-02-09 |
| R-013 | [Issue Tracking Protocol](#r-013-issue-tracking-protocol)    | Scrum   | 2026-02-10 |

---

## R-001: Memory Bank Protocol

**Every heartbeat cycle MUST:**

1. **Read** `agents/memory/bank.md` before taking action
2. **Update** the relevant section after acting:
   - Update `Current Status` with what changed
   - Update your `Role State` with what you did and what's next
   - Add any new `Architecture Decisions` (ADR format)
   - Add `Lessons Learned` when something went wrong or unexpectedly well
   - Update `Active Threads` if dependencies changed
   - Update `Project Metrics` if counts changed (issues, PRs, code)
3. **Never delete** another role's state — only update your own
4. **Timestamp** the `Last updated` field at the top

---

## R-002: Compression Protocol

### Trigger

Compress when ANY of these are true:

- Bank exceeds **200 lines**
- It's been **10+ cycles** since last compression
- A sprint ends

### Compression Steps

1. **Archive first:** Copy current `bank.md` → `agents/memory/archives/bank-YYYY-MM-DD-vN.md`
2. **Compress:** Rewrite `bank.md` preserving active items, recent decisions, unresolved blockers
3. **Increment** the version number at the top
4. **Commit:** `chore(agents): compress memory bank v{N} → v{N+1}`

---

## R-003: Role Evolution Protocol

Any role can **propose** a new role when:

- A clear capability gap exists that no current role covers
- 5+ issues pile up in a domain with no dedicated role
- A role's playbook is getting too broad

**To propose:** Create an issue: `chore(agents): propose new role — <name>`
**To activate:** Add to roster.json, create playbook, log in evolution-log.md

---

## R-004: Commit Standards

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

- **Types:** feat, fix, refactor, docs, test, ci, chore, perf, style, build
- **Scopes:** cli, core, web, agents, templates, docs, ops
- **Mood:** Imperative ("add" not "added")
- **Body:** Explain WHY if not obvious
- **Footer:** Reference issues (`Closes #N`, `Relates to #N`)

---

## R-005: Branch Strategy

- `main` — Production-ready, protected
- `feat/<name>` — Features
- `fix/<name>` — Bug fixes
- `docs/<name>` — Documentation
- `refactor/<name>` — Refactoring
- `ci/<name>` — CI/CD changes

**All PRs target `main`.** This is a monorepo with trunk-based development.

---

## R-006: Issue Quality

Every issue MUST have:

- Conventional title: `<type>(<scope>): <description>`
- Clear body with context
- At least one label
- Priority label if enhancement (P0-P3)
- Package/scope label if code-related
- Author signature (role name + emoji)

---

## R-007: TypeScript Standards

All packages use TypeScript in **strict mode**:

- `"strict": true` in all tsconfig.json files
- No `any` types unless explicitly justified with a comment
- All exported functions must have explicit return types
- All public APIs must have JSDoc documentation
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer `readonly` where mutation is not needed
- Use barrel exports (`index.ts`) for clean public APIs

---

## R-008: Monorepo Conventions

This is an npm workspaces monorepo:

- **Root package.json** defines workspaces: `packages/*`, `apps/*`
- **Shared dependencies** (TypeScript, ESLint) live at root
- **Package-specific dependencies** live in each package
- **Cross-package imports** use npm workspace protocol: `"@ada-ai/core": "workspace:*"`
- **Build order:** core → cli → web (core has no internal deps)
- Each package has its own `tsconfig.json` extending root
- Each package has its own `package.json` with proper `main`, `types`, and `exports` fields

---

## R-009: npm Workspace Rules

- Package names use `@ada-ai/` scope: `@ada-ai/cli`, `@ada-ai/core`
- All packages must have: `name`, `version`, `description`, `main`, `types`, `scripts`
- Required scripts per package: `build`, `test`, `lint`, `typecheck`
- Root scripts aggregate: `npm run build --workspaces`, `npm test --workspaces`
- Version management: all packages share the same version (synchronized)
- Publishing: `npm publish --workspace=packages/cli` etc.

---

## R-010: PR Management & CI

### CI Pipeline Requirements

All PRs MUST pass the CI pipeline before merge:

- **Lint:** ESLint across all packages
- **Type-check:** TypeScript strict mode compilation
- **Test:** Vitest test suites (when implemented)
- **Build:** All packages compile successfully
- **Security:** npm audit with moderate+ level

### PR Review Standards

- **No PRs rot:** Open >1 cycle = Ops priority to review/merge
- **Quality gates:** All CI checks must pass locally before merge
- **Conventional commits:** PR title must follow conventional commit format
- **Squash merge:** Always use squash merge to maintain clean history

### Emergency Bypass

If CI is broken but code is verified locally, Ops can merge with justification:

- Document local verification in merge message
- Fix CI issues in immediate follow-up commit
- Add incident post-mortem if CI failures blocked development

**Why this rule matters:** Prevents broken code from reaching main, maintains code quality, ensures development velocity doesn't stall on minor CI issues.

---

## R-011: PR Hygiene & Transparency

### Principle

A human outside the loop should be able to look at open PRs and issues at any time and immediately understand the project state. No orphaned, unexplained, or stale PRs.

### Every Cycle

Before starting new work, agents MUST review all open PRs:

1. **Stale/abandoned PRs** (no activity for 2+ cycles, superseded, or no longer relevant) → **Close** with a clear comment explaining why
2. **Actionable PRs** (valid work in progress or ready for review) → **Track** in the memory bank under Active Threads and ensure they have descriptive titles, bodies, and labels
3. **Blocked PRs** → Add a comment explaining what's blocking and tag the relevant role

### PR Transparency Standards

- Every open PR must have a **clear description** of what it does and why
- If a PR is intentionally left open (e.g., waiting on a dependency), it must have a **status comment** updated each cycle
- Closing a PR is always better than letting it rot — work can be re-opened or re-created
- Issues referenced by PRs should be kept in sync (close issue when PR merges, reopen if PR is abandoned)

### Why This Rule Matters

Autonomous agent teams generate PRs at high velocity. Without active hygiene, repos become graveyards of half-finished work that confuse human reviewers and new contributors. Clean PR state = trustworthy project.

---

## R-012: GitHub Templates

### Purpose

Standardized templates for PRs and issues ensure consistent quality, reduce review friction, and make the project accessible to human contributors.

### Templates Available

Located in `.github/`:

- **PR Template** (`PULL_REQUEST_TEMPLATE.md`) — Required sections for all PRs
- **Issue Templates** (`ISSUE_TEMPLATE/`) — Structured forms for:
  - Feature requests (`feature.yml`)
  - Bug reports (`bug.yml`)
  - Research topics (`research.yml`)
  - Documentation (`documentation.yml`)

### PR Template Requirements

Every PR MUST include:

1. **Summary** — Brief description of changes
2. **Type of Change** — One of: feat, fix, docs, refactor, test, chore, ci, perf
3. **Related Issues** — References to issues (Closes #XX, Relates to #XX)
4. **Changes Made** — Bullet list of specific changes
5. **Testing** — Confirmation of local testing
6. **Checklist** — Conventional commit title, tests included, docs updated

### Issue Template Requirements

All issues SHOULD use the appropriate template when applicable:

- **Features** → Use feature template with acceptance criteria
- **Bugs** → Use bug template with reproduction steps
- **Research** → Use research template with hypothesis and success criteria
- **Docs** → Use documentation template with outline

Blank issues are allowed for quick notes or agent-generated issues that don't fit templates.

### Why This Rule Matters

Templates enforce R-006 (Issue Quality) and R-011 (PR Hygiene) automatically. They reduce cognitive load, speed up reviews, and help new contributors understand expectations. The author field on templates maintains agent attribution in the autonomous workflow.

---

## R-013: Issue Tracking Protocol

### Principle

**All open GitHub issues MUST be tracked in the memory bank's Active Threads section.** Issues not in Active Threads are invisible to the team and will not be acted upon.

### Requirements

**Every dispatch cycle MUST:**

1. **Verify issue tracking** (FIRST CHECK in Phase 3 of DISPATCH.md):
   - Run `gh issue list --state open --limit 200`
   - Cross-reference with `agents/memory/bank.md` Active Threads section
   - Every open issue MUST appear in Active Threads

2. **Add missing issues immediately:**
   - Format: `**#N** (Priority, Role, Size) — Brief description`
   - Priority: P0, P1, P2, or P3
   - Role: Which role should work on it (e.g., Engineering, Product, Ops)
   - Size: S (small, 1-2 cycles), M (medium, 3-5 cycles), L (large, 6+ cycles)

3. **Remove closed issues:**
   - When an issue is closed, remove it from Active Threads
   - Optionally move to "Recently Closed" section if it was a major milestone

### Role-Specific Responsibilities

- **Scrum:** Issue scoping is a FIRST CHECK every cycle (not just during retros)
- **Product:** When creating new issues, immediately add to Active Threads
- **Ops:** When closing issues, immediately remove from Active Threads
- **All roles:** Verify issue tracking before acting (see DISPATCH.md Phase 3)

### Active Threads Format

```markdown
## Active Threads

### Active (P0-P1, In Progress)

- **#26** (P0, CEO, L) — v1.0-alpha Launch Coordination
- **#39** (P0, Growth, M) — Demo Asset Production

### Active (P2, Current Sprint)

- **#89** (P2, Ops, L) — Dev-to-Prod Migration System

### Backlog (P2-P3, Post-Launch)

- **#73** (P3, Design, M) — CLI UX Polish
```

### Verification

Use CLI command (when available): `ada issues verify`

Or manually:

```bash
gh issue list --state open --limit 200 > /tmp/open_issues.txt
grep -E "^\\*\\*#[0-9]+" agents/memory/bank.md > /tmp/tracked_issues.txt
# Compare lists
```

### Why This Rule Matters

**Issue #106 demonstrated the problem:** 45 open issues, only 9 tracked in Active Threads. This creates:

- **Invisible work:** Issues not tracked are never acted upon
- **Coordination gaps:** Team doesn't know what's pending
- **Priority confusion:** Can't prioritize what we can't see
- **Wasted cycles:** Agents work on wrong things because context is incomplete

**Enforcement:** This is a FIRST CHECK in DISPATCH.md Phase 3. No exceptions.

---

_New rules are added by committing changes to this file. Include the rule ID, owner, and date._
