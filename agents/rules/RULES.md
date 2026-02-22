# 📜 Master Rules

> Living rulebook for the ADA autonomous agent team.
> Rules are added by any role (primarily Ops).
> All roles MUST follow these rules. No exceptions.

---

## Rule Index

| ID    | Rule                                                                 | Owner       | Added      |
| ----- | -------------------------------------------------------------------- | ----------- | ---------- |
| R-001 | [Memory Bank Protocol](#r-001-memory-bank-protocol)                  | System      | Init       |
| R-002 | [Compression Protocol](#r-002-compression-protocol)                  | System      | Init       |
| R-003 | [Role Evolution Protocol](#r-003-role-evolution-protocol)            | System      | Init       |
| R-004 | [Commit Standards](#r-004-commit-standards)                          | Ops         | Init       |
| R-005 | [Branch Strategy](#r-005-branch-strategy)                            | Ops         | Init       |
| R-006 | [Issue Quality](#r-006-issue-quality)                                | Product     | Init       |
| R-007 | [TypeScript Standards](#r-007-typescript-standards)                  | Ops         | Init       |
| R-008 | [Monorepo Conventions](#r-008-monorepo-conventions)                  | Ops         | Init       |
| R-009 | [npm Workspace Rules](#r-009-npm-workspace-rules)                    | Ops         | Init       |
| R-010 | [PR Management & CI](#r-010-pr-management--ci)                       | Ops         | 2026-01-30 |
| R-011 | [PR Hygiene & Transparency](#r-011-pr-hygiene--transparency)         | Ops         | 2026-02-02 |
| R-012 | [GitHub Templates](#r-012-github-templates)                          | Ops         | 2026-02-09 |
| R-013 | [Issue Tracking Protocol](#r-013-issue-tracking-protocol)            | Scrum       | 2026-02-10 |
| R-014 | [Agent PR Workflow](#r-014-agent-pr-workflow)                        | Ops         | 2026-02-14 |
| R-015 | [Code Reuse & Abstract Classes](#r-015-code-reuse--abstract-classes) | Engineering | 2026-02-17 |
| R-016 | [Reflection Capture Protocol](#r-016-reflection-capture-protocol)    | Ops         | 2026-02-18 |
| R-017 | [Tangible Output Mandate](#r-017-tangible-output-mandate)            | Ops         | 2026-02-21 |

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

## R-014: Agent PR Workflow

### Principle

**Code changes MUST go through Pull Requests.** Direct commits to `main` are only permitted for documentation and agent state updates.

### Change Classification

| Change Type                                       | PR Required | Direct to Main |
| ------------------------------------------------- | ----------- | -------------- |
| Source code (`.ts`, `.js`, `.py`, etc.)           | ✅ Required | ❌ Not allowed |
| Test files (`*.test.ts`, `*.spec.ts`)             | ✅ Required | ❌ Not allowed |
| CI/CD workflows (`.github/workflows/`)            | ✅ Required | ❌ Not allowed |
| Package configs (`package.json`, `tsconfig.json`) | ✅ Required | ❌ Not allowed |
| Documentation (`.md`)                             | ⚪ Optional | ✅ Allowed     |
| Agent state (`agents/`, memory, rotation)         | ⚪ Optional | ✅ Allowed     |

### PR Workflow for Code Changes

1. **Create feature branch:**

   ```bash
   git checkout -b ada/c{cycle}-{role}-{action-slug}
   # Example: ada/c624-engineering-heat-scoring-cli
   ```

2. **Commit changes to branch:**

   ```bash
   git add .
   git commit -m "feat(cli): add heat scoring commands"
   ```

3. **Push and create PR:**

   ```bash
   git push -u origin ada/c{cycle}-{role}-{action-slug}
   gh pr create --title "feat(cli): add heat scoring commands" \
     --body "## Summary\n\nAdds heat scoring CLI commands per #118.\n\n## Changes\n- Added ada heat command...\n\nCloses #118"
   ```

4. **Wait for CI or self-merge if passing:**

   ```bash
   # Check CI status
   gh pr checks <number>

   # If passing, merge
   gh pr merge <number> --squash
   ```

### Branch Naming Convention

```
ada/c{cycle}-{role}-{action-slug}
```

- **cycle:** Current dispatch cycle number (e.g., `624`)
- **role:** Role ID (e.g., `engineering`, `frontier`, `qa`)
- **action-slug:** Short kebab-case description (e.g., `heat-scoring-cli`)

**Examples:**

- `ada/c624-engineering-heat-scoring-cli`
- `ada/c625-frontier-cognitive-memory-core`
- `ada/c626-qa-e2e-test-setup`

### CLI Integration (Planned)

When implemented, `ada dispatch complete` will support:

```bash
# For code changes — creates branch, commits, opens PR
ada dispatch complete --action "..." --pr

# For docs/agent state — direct commit (current behavior)
ada dispatch complete --action "..."
```

### Rollout

**Phase 1 (Current):** Rule documented, manual PR workflow expected for code changes.
**Phase 2:** CLI `--pr` flag implementation by Engineering.
**Phase 3:** Enforcement via CI check (reject direct code pushes to main).

### Why This Rule Matters

Direct commits to main bypass:

- **Code review gate** — risky changes get no oversight
- **CI pre-merge check** — tests run AFTER code lands
- **Rollback isolation** — can't easily revert one feature

PRs enable:

- **Visible change history** — each feature is a discrete unit
- **CI validation** — catch failures before merge
- **Human oversight** — humans can review agent code when needed

**Related Issue:** #128

---

## R-015: Code Reuse & Abstract Classes

### Principle

**Prefer abstract base classes over code duplication.** When implementing multiple similar classes, extract shared functionality into an abstract base class to reduce duplication, ensure consistency, and enable future extensibility.

### When to Use Abstract Classes

Use abstract base classes when:

1. **Multiple implementations share common logic:**
   - Two or more classes implement the same interface
   - They share helper methods, error handling, or parsing logic
   - They follow a similar execution pattern

2. **Template method pattern applies:**
   - Classes follow the same workflow but differ in specific steps
   - Common error handling wrapper around different implementations
   - Shared validation or transformation logic

3. **Future extensibility is expected:**
   - More implementations are planned (e.g., multiple executor backends)
   - Plugin/extensibility architecture is being built
   - Similar patterns will be repeated

### Implementation Pattern

```typescript
// ✅ GOOD: Abstract base class with shared functionality
abstract class BaseAgentExecutor implements AgentExecutor {
  // Template method with shared error handling
  async executeAction(context: DispatchContext): Promise<ActionResult> {
    try {
      const prompt = this.buildPrompt(context);
      const output = await this.executeCommand(prompt, context);
      const result = this.parseResponse(output, context);
      return this.enrichResult(result, context);
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  // Abstract methods — each implementation provides its own
  protected abstract buildPrompt(context: DispatchContext): string;
  protected abstract executeCommand(prompt: string, context: DispatchContext): Promise<string>;
  protected abstract parseResponse(output: string, context: DispatchContext): Partial<ActionResult>;

  // Shared helper methods — reused by all implementations
  protected extractModifiedFiles(text: string): string[] { /* ... */ }
  protected extractIssueNumbers(text: string): number[] { /* ... */ }
  protected generateActionSummary(context: DispatchContext, ...): string { /* ... */ }
}

// Concrete implementations extend the base
class ClawdbotAgentExecutor extends BaseAgentExecutor {
  protected buildPrompt(context: DispatchContext): string { /* Clawdbot-specific */ }
  protected executeCommand(prompt: string, context: DispatchContext): Promise<string> { /* ... */ }
  protected parseResponse(output: string, context: DispatchContext): Partial<ActionResult> { /* ... */ }
}

class ClaudeCodeAgentExecutor extends BaseAgentExecutor {
  protected buildPrompt(context: DispatchContext): string { /* Claude Code-specific */ }
  protected executeCommand(prompt: string, context: DispatchContext): Promise<string> { /* ... */ }
  protected parseResponse(output: string, context: DispatchContext): Partial<ActionResult> { /* ... */ }
}
```

### Anti-Patterns to Avoid

```typescript
// ❌ BAD: Duplicated code across implementations
class ClawdbotAgentExecutor implements AgentExecutor {
  async executeAction(context: DispatchContext): Promise<ActionResult> {
    // ... 50 lines of shared logic ...
    // ... 10 lines of Clawdbot-specific logic ...
  }
  private extractModifiedFiles(text: string): string[] {
    /* duplicated */
  }
  private extractIssueNumbers(text: string): number[] {
    /* duplicated */
  }
}

class ClaudeCodeAgentExecutor implements AgentExecutor {
  async executeAction(context: DispatchContext): Promise<ActionResult> {
    // ... 50 lines of shared logic (duplicated!) ...
    // ... 10 lines of Claude Code-specific logic ...
  }
  private extractModifiedFiles(text: string): string[] {
    /* duplicated */
  }
  private extractIssueNumbers(text: string): number[] {
    /* duplicated */
  }
}
```

### Best Practices

1. **Extract shared functionality first:**
   - Identify common patterns before implementing multiple classes
   - Refactor existing duplicated code into base class
   - Use protected methods for shared helpers

2. **Keep abstract methods focused:**
   - Each abstract method should represent one clear responsibility
   - Avoid abstract methods that are too broad or too narrow
   - Document expected behavior in JSDoc comments

3. **Preserve type safety:**
   - Use TypeScript's abstract class features
   - Ensure all abstract methods are properly typed
   - Use generic types when appropriate for flexibility

4. **Test shared functionality once:**
   - Test the base class helpers in the base class tests
   - Test implementation-specific logic in concrete class tests
   - Avoid duplicating tests for shared behavior

### Examples in Codebase

- **Agent Executors:** `BaseAgentExecutor` → `ClawdbotAgentExecutor`, `ClaudeCodeAgentExecutor` (Issue #64)
- **Future:** Backend providers, notification channels, memory stores can follow the same pattern

### Why This Rule Matters

**Code duplication creates maintenance debt:**

- **Bug multiplication:** Fix a bug in one place, miss it in duplicates
- **Inconsistent behavior:** Shared logic drifts apart over time
- **Testing overhead:** Same logic tested multiple times
- **Extension friction:** Adding new implementations requires copying code

**Abstract classes provide:**

- **Single source of truth:** Shared logic lives in one place
- **Consistent behavior:** All implementations inherit the same patterns
- **Easy extensibility:** New implementations extend base, implement 3-4 methods
- **Better testability:** Test shared logic once, test differences separately

**Related Issues:** #64 (Claude Code Integration), future executor integrations

---

## R-016: Reflection Capture Protocol

### Principle

**Reflections MUST be captured in `docs/retros/learnings.md` in the same cycle they're created.** Storing reflections only in `rotation.json` creates a gap where learnings exist but are not surfaced.

### Background

Cycle 868 identified that L491-L498 were stored in `rotation.json` reflections but not captured in `learnings.md`. This required manual backfilling. The gap compounds: reflections not in learnings.md are invisible to future roles and lose their value.

### Requirements

**Every dispatch cycle that includes a reflection MUST:**

1. **Include reflection in `ada dispatch complete`:**

   ```bash
   ada dispatch complete --action "..." --reflection "What worked: ... What to improve: ... Lesson: ..."
   ```

2. **Capture to learnings.md if lesson is reusable:**
   - Lessons that apply to future cycles should be added to `docs/retros/learnings.md`
   - Use the standard learning format (see below)
   - Not every reflection needs to be in learnings.md — only reusable insights

3. **Scrum verification during retros:**
   - Scrum should verify recent reflections (from `rotation.json` history) are captured in learnings.md
   - Any gaps should be backfilled immediately

### Learning Format

```markdown
## Learning: [Brief title] (LNNN)

- **Date:** YYYY-MM-DD
- **Context:** [What happened, which cycle]
- **Insight:** [The reusable takeaway]
- **Action:** [What to do differently]
- **Status:** pending | applied | monitoring
```

### Lesson Number Assignment

- Next lesson number is derived from highest existing in learnings.md
- Check last 10 entries to find current max
- Increment by 1 for new lessons

### Exceptions

- Routine reflections that are cycle-specific ("merged PR quickly") don't need learnings.md entries
- Only add to learnings.md when the lesson applies to future work

### Why This Rule Matters

**L502 (C868):** "Reflections should be added to learnings.md in same cycle, not just rotation.json"

Reflections stored only in rotation.json are:

- **Ephemeral:** Only visible in recent history
- **Unsearchable:** Can't be referenced by other roles
- **Lost during compression:** May be removed when rotation.json history is truncated

Learnings in learnings.md are:

- **Permanent:** Persist across sprints
- **Searchable:** Other roles can find and apply them
- **Cumulative:** Build team knowledge over time

**Related:** L502 (C868), Scrum retro gap fix

---

## R-017: Tangible Output Mandate

### Principle

**Non-CEO roles MUST produce tangible output every cycle.** No verification checkpoints, no stability reports, no status documents — ship actual work.

### Background

Issue #239 (founder-priority) identified that cycles 1050-1063 were ALL checkpoint/verification cycles. The team entered a holding pattern where every role wrote status reports instead of shipping features. This violated the core principle of autonomous development: continuous forward progress.

### Role Responsibilities

**CEO/Founder Role ONLY:**

- ✅ Can run verification checkpoints
- ✅ Can vote Go/No-Go
- ✅ Can assess stability
- ✅ Can write strategic status documents

**ALL OTHER ROLES (Engineering, QA, Ops, Design, Research, Frontier, Product, Scrum, Growth):**

- ❌ NO verification cycles
- ❌ NO stability checkpoints
- ❌ NO "rotation checkpoint" docs
- ❌ NO status reports as sole output
- ✅ MUST ship tangible work every cycle

### What Counts as Tangible Output

| Role        | Tangible Output Examples                                        |
| ----------- | --------------------------------------------------------------- |
| Engineering | Code PRs, bug fixes, feature implementations, refactors         |
| QA          | Test additions, test fixes, coverage improvements, E2E tests    |
| Ops         | CI improvements, rule additions, infrastructure changes         |
| Design      | UX specs, wireframes, component designs, design system updates  |
| Research    | Analysis docs, competitive research, technical investigations   |
| Frontier    | ADRs, architecture designs, technical specifications            |
| Product     | Feature specs, acceptance criteria, PRDs, issue creation        |
| Scrum       | Retros with lessons learned, sprint planning, backlog grooming  |
| Growth      | Marketing content, README improvements, documentation, outreach |

### When Blocked

If your primary task is blocked:

1. ❌ Do NOT write a checkpoint doc
2. ✅ Pick a DIFFERENT task from Active Threads
3. ✅ Look at P2/P3 backlog for work
4. ✅ Create work: identify tech debt, write tests, improve docs
5. ✅ Close a small issue

**There is always work.** If you truly cannot find work, that is a Product/Scrum failure to maintain the backlog — flag it as an issue.

### Enforcement

- **Dispatch completion:** Non-CEO actions that are "checkpoint" or "verification" should be rejected or flagged
- **Scrum retros:** Track "tangible vs checkpoint" ratio per role
- **Memory bank:** Action descriptions should reference artifacts (PR #X, commit, doc created, issue closed)

### Metrics

Track per rotation:

- **Tangible output rate:** % of non-CEO cycles with tangible artifacts
- **Checkpoint escape:** Zero checkpoint actions from non-CEO roles
- **Issue velocity:** Issues closed per rotation

### Exceptions

- **Sprint 0 / Bootstrap phases:** When establishing infrastructure, some planning docs are necessary
- **Major milestone retros:** Scrum can write retro docs (but must include lessons, not just status)
- **True zero-work situations:** If backlog is empty AND all tasks blocked, flag as issue immediately

### Why This Rule Matters

**L623-L625 demonstrated the fix works:**

- C1064 (Growth): README marketing section — tangible
- C1065 (Research): Competitive analysis doc — tangible
- C1066 (Frontier): ADR for Sprint 3 — tangible
- C1067 (Product): Feature spec — tangible
- C1068 (Scrum): Retro with new lessons — tangible
- C1069 (QA): 26 new E2E tests — tangible
- C1070 (Engineering): PR merged — tangible

**Checkpoint mode creates:**

- **Cycle waste:** 10+ cycles with no progress
- **False stability:** "All green" but nothing shipped
- **Compounding delay:** Each checkpoint cycle delays actual work

**Tangible mode creates:**

- **Continuous progress:** Every cycle moves the product forward
- **Real stability:** Stability proven by working features, not status reports
- **Compounding value:** Each cycle adds artifacts that persist

**Related Issues:** #239 (founder-priority)

---

_New rules are added by committing changes to this file. Include the rule ID, owner, and date._
