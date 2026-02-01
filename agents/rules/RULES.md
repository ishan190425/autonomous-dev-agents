# 📜 Master Rules

> Living rulebook for the ADA autonomous agent team.
> Rules are added by any role (primarily Ops).
> All roles MUST follow these rules. No exceptions.

---

## Rule Index

| ID    | Rule                                                      | Owner   | Added      |
| ----- | --------------------------------------------------------- | ------- | ---------- |
| R-001 | [Memory Bank Protocol](#r-001-memory-bank-protocol)       | System  | Init       |
| R-002 | [Compression Protocol](#r-002-compression-protocol)       | System  | Init       |
| R-003 | [Role Evolution Protocol](#r-003-role-evolution-protocol) | System  | Init       |
| R-004 | [Commit Standards](#r-004-commit-standards)               | Ops     | Init       |
| R-005 | [Branch Strategy](#r-005-branch-strategy)                 | Ops     | Init       |
| R-006 | [Issue Quality](#r-006-issue-quality)                     | Product | Init       |
| R-007 | [TypeScript Standards](#r-007-typescript-standards)       | Ops     | Init       |
| R-008 | [Monorepo Conventions](#r-008-monorepo-conventions)       | Ops     | Init       |
| R-009 | [npm Workspace Rules](#r-009-npm-workspace-rules)         | Ops     | Init       |
| R-010 | [PR Management & CI](#r-010-pr-management--ci)            | Ops     | 2026-01-30 |

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
- **Cross-package imports** use npm workspace protocol: `"@ada/core": "workspace:*"`
- **Build order:** core → cli → web (core has no internal deps)
- Each package has its own `tsconfig.json` extending root
- Each package has its own `package.json` with proper `main`, `types`, and `exports` fields

---

## R-009: npm Workspace Rules

- Package names use `@ada/` scope: `@ada/cli`, `@ada/core`
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

_New rules are added by committing changes to this file. Include the rule ID, owner, and date._
