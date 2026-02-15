# PR Workflow CLI UX Specification

> **Author:** 🎨 Design (The Architect)
> **Cycle:** C625
> **Issue:** #128 (PR Workflow for Agents)
> **Rule:** R-014 (Agent PR Workflow)
> **Status:** Ready for Engineering
> **Related:** C624 (R-014 Rule Addition), DISPATCH.md

---

## Overview

This document specifies the UX for integrating PR workflow into `ada dispatch complete`. Per R-014, code changes must go through Pull Requests. This spec defines how agents (and users) create PRs via the CLI.

---

## Command Changes

### `ada dispatch complete`

**Updated Usage:**

```bash
ada dispatch complete --action "..." [options]
```

**New/Modified Options:**

| Option            | Description                                           | Default |
| ----------------- | ----------------------------------------------------- | ------- |
| `--pr`            | Create a PR for code changes instead of direct commit | false   |
| `--branch <name>` | Custom branch name (auto-generated if omitted)        | auto    |
| `--draft`         | Create PR as draft                                    | false   |
| `--no-push`       | Commit locally without push (rare)                    | false   |

**Existing Options (unchanged):**

| Option                | Description                              |
| --------------------- | ---------------------------------------- |
| `--action <desc>`     | **Required.** Action description         |
| `--outcome <status>`  | Outcome: `success`, `partial`, `blocked` |
| `--reflection <text>` | Self-critique for Reflexion              |
| `--skip-push`         | Alias for `--no-push` (deprecated)       |

---

## Auto-Detection Flow

When `--pr` is NOT specified, the CLI should intelligently suggest PR mode:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚠️  Code Changes Detected                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│  You have uncommitted changes to source files:                               │
│                                                                              │
│    M  packages/cli/src/commands/heat.ts                                      │
│    A  packages/core/src/reflexion/suggester.ts                               │
│                                                                              │
│  Per R-014, code changes should go through Pull Requests.                    │
│                                                                              │
│  → Run with --pr to create a PR, or --force to commit directly               │
│                                                                              │
│    ada dispatch complete --action "..." --pr                                 │
│    ada dispatch complete --action "..." --force                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Exit Code:** 1 (requires user decision)

**Rationale:** Nudge toward PRs without blocking docs-only changes.

---

## PR Flow: `--pr` Flag

### Step 1: Branch Creation

```
🌿 Creating branch...

  Branch: ada/c625-design-pr-workflow-ux-spec
  Base:   main (up-to-date)

  ✓ Branch created
```

**Branch Naming Convention:**

```
ada/c{cycle}-{role}-{action-slug}
```

- **cycle:** Current dispatch cycle number
- **role:** Role ID (lowercase): `ceo`, `growth`, `research`, `frontier`, `product`, `scrum`, `qa`, `engineering`, `ops`, `design`
- **action-slug:** Kebab-case slug from action description (max 50 chars)

**Slug Generation Rules:**

1. Lowercase the action description
2. Remove special characters except hyphens
3. Replace spaces with hyphens
4. Truncate to 50 chars at word boundary
5. Remove trailing hyphens

**Examples:**

| Action                              | Branch                                              |
| ----------------------------------- | --------------------------------------------------- |
| `"🎨 PR WORKFLOW CLI UX SPEC"`      | `ada/c625-design-pr-workflow-cli-ux-spec`           |
| `"⚙️ Heat Scoring CLI Integration"` | `ada/c625-engineering-heat-scoring-cli-integration` |
| `"🔍 E2E Testing Setup"`            | `ada/c625-qa-e2e-testing-setup`                     |

### Step 2: Commit Changes

```
📝 Committing changes...

  Files staged: 3
    M  packages/cli/src/commands/dispatch.ts
    A  packages/cli/src/commands/pr.ts
    M  packages/cli/src/index.ts

  Commit: feat(cli): add PR workflow support

  ✓ Changes committed
```

### Step 3: Push Branch

```
🚀 Pushing branch...

  Remote: origin
  Branch: ada/c625-design-pr-workflow-ux-spec

  ✓ Branch pushed
```

### Step 4: Create PR

```
📋 Creating Pull Request...

  Title:  feat(cli): add PR workflow support
  Base:   main
  Head:   ada/c625-design-pr-workflow-ux-spec

  ✓ PR created: #44

┌──────────────────────────────────────────────────────────────────────────────┐
│  🎉 Cycle 625 Complete — PR Created                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PR:     #44 — feat(cli): add PR workflow support                            │
│  URL:    https://github.com/ishan190425/autonomous-dev-agents/pull/44        │
│  Status: Open (CI Running)                                                   │
│                                                                              │
│  Next:   🛡️ The Guardian (Ops)                                               │
│                                                                              │
│  💡 Tip: Run `gh pr checks 44` to monitor CI status                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Step 5: Update Rotation

Same as current `dispatch complete` — update `rotation.json`, but action includes PR reference:

```json
{
  "action": "🎨 PR WORKFLOW CLI UX SPEC — PR #44"
}
```

---

## PR Body Template

The CLI auto-generates the PR body from action/reflection:

```markdown
## Summary

PR Workflow CLI UX Specification — Defines UX for `ada dispatch complete --pr` flag per R-014.

## Cycle

- **Cycle:** 625
- **Role:** 🎨 Design (The Architect)
- **Action:** PR WORKFLOW CLI UX SPEC

## Changes Made

- Added `docs/design/pr-workflow-cli-ux-spec-c625.md`

## Related Issues

Relates to #128

## Checklist

- [x] Conventional commit title
- [x] Tests included (if applicable)
- [x] Documentation updated

---

_Generated by `ada dispatch complete --pr`_
```

---

## Custom Branch: `--branch`

Override auto-generated branch name:

```bash
ada dispatch complete \
  --action "Fix urgent bug" \
  --pr \
  --branch "fix/urgent-heat-regression"
```

**Validation:**

- Must start with valid prefix: `ada/`, `feat/`, `fix/`, `docs/`, `refactor/`, `ci/`
- No spaces or special chars except `-/`
- Max 100 characters

**Error on invalid:**

```
❌ Invalid branch name: "my branch"

  Branch names must:
    • Start with: ada/, feat/, fix/, docs/, refactor/, or ci/
    • Contain only lowercase letters, numbers, hyphens, slashes
    • Be under 100 characters

  Example: ada/c625-design-pr-workflow
```

---

## Draft PR: `--draft`

For work-in-progress that needs visibility but isn't ready for merge:

```bash
ada dispatch complete --action "WIP: Heat scoring" --pr --draft
```

**Output difference:**

```
📋 Creating Pull Request (Draft)...

  ...

  ✓ Draft PR created: #44

┌──────────────────────────────────────────────────────────────────────────────┐
│  🎉 Cycle 625 Complete — Draft PR Created                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PR:     #44 — WIP: Heat scoring [DRAFT]                                     │
│  ...                                                                         │
│                                                                              │
│  💡 Tip: Mark ready with `gh pr ready 44`                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

### No Changes Staged

```
❌ No Changes to Commit

  There are no staged or modified files to commit.

  Did you forget to stage your changes?
    git add <files>

  Or run without --pr for docs/state-only updates.
```

**Exit Code:** 1

### Branch Already Exists

```
⚠️  Branch Exists: ada/c625-design-pr-workflow

  Options:
    1. Use existing branch (may have commits)
    2. Create new branch: ada/c625-design-pr-workflow-2

  [1/2]: _
```

**Interactive:** Prompt for choice
**Non-interactive (`--yes`):** Auto-increment suffix

### Push Rejected (Conflict)

```
❌ Push Failed — Branch Diverged

  The remote branch has commits not in your local branch.

  Options:
    • Pull and rebase: git pull --rebase origin main
    • Force push (caution): git push --force-with-lease

  Then retry: ada dispatch complete --pr --action "..."
```

**Exit Code:** 1

### GitHub API Error

```
❌ GitHub API Error

  Could not create Pull Request.

  Error: Resource not accessible by integration
  HTTP:  403 Forbidden

  Check:
    • GitHub token permissions (repo scope required)
    • Repository access settings

  Workaround: Create PR manually at:
    https://github.com/ishan190425/autonomous-dev-agents/compare/main...ada/c625-design-pr-workflow
```

**Exit Code:** 1

---

## CI Integration

After PR creation, show CI status if available:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📊 CI Status                                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ⏳ lint .............. pending                                              │
│  ⏳ typecheck ......... pending                                              │
│  ⏳ test .............. pending                                              │
│  ⏳ build ............. pending                                              │
│                                                                              │
│  Run `gh pr checks 44 --watch` to monitor                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Auto-Merge Option (Future)

For trusted agents with CI passing:

```bash
ada dispatch complete --action "..." --pr --auto-merge
```

**Behavior:**

1. Create PR
2. Enable GitHub auto-merge (squash)
3. PR merges automatically when CI passes

**Output:**

```
  ✓ PR created: #44 (auto-merge enabled)

  The PR will merge automatically when all checks pass.
```

**Note:** Requires repo setting "Allow auto-merge" enabled. Not in Phase 1.

---

## Direct Commit: `--force`

When code changes are detected but PR is intentionally skipped:

```bash
ada dispatch complete --action "Hotfix" --force
```

**Warning shown:**

```
⚠️  Direct Commit Mode

  Per R-014, code changes should use PRs. Using --force bypasses this.

  Proceeding with direct commit to main...
```

**Use cases:**

- Critical hotfixes requiring immediate deployment
- CI configuration fixes when CI is broken
- Always document justification in action description

---

## JSON Output: `--json`

For scripting and automation:

```bash
ada dispatch complete --action "..." --pr --json
```

```json
{
  "success": true,
  "cycle": 625,
  "role": "design",
  "action": "PR WORKFLOW CLI UX SPEC",
  "outcome": "success",
  "pr": {
    "number": 44,
    "url": "https://github.com/ishan190425/autonomous-dev-agents/pull/44",
    "branch": "ada/c625-design-pr-workflow-ux-spec",
    "state": "open",
    "draft": false
  },
  "commit": {
    "sha": "abc123def456",
    "message": "feat(cli): add PR workflow support"
  },
  "nextRole": "ceo"
}
```

---

## Implementation Guidance

### Phase 1: Core PR Flow

- [ ] Add `--pr` flag to dispatch complete command
- [ ] Implement branch creation with naming convention
- [ ] Implement PR creation via `gh pr create`
- [ ] Update rotation.json with PR reference
- [ ] Add code change detection (warn if files modified without `--pr` or `--force`)

### Phase 2: Enhanced Features

- [ ] Add `--draft` flag
- [ ] Add `--branch` override
- [ ] Add CI status display after PR creation
- [ ] Add `--json` output for PR mode

### Phase 3: Auto-Merge (Future)

- [ ] Add `--auto-merge` flag (requires repo setup)
- [ ] Add merge status tracking

### Dependencies

- `gh` CLI for PR creation
- GitHub token with `repo` scope
- Git for branch operations

---

## Testing Checklist

### Unit Tests

- [ ] Branch name generation from action string
- [ ] Slug generation edge cases (emoji, special chars, long strings)
- [ ] Validation of custom branch names
- [ ] JSON output structure

### Integration Tests

- [ ] Full PR flow (branch → commit → push → PR)
- [ ] Draft PR creation
- [ ] Error handling (no changes, push rejected, API error)
- [ ] Code change detection warning

### Manual Tests

- [ ] Run `ada dispatch complete --pr --action "test"` with actual changes
- [ ] Verify PR appears correctly in GitHub
- [ ] Verify rotation.json updated with PR reference

---

## Related Documentation

- **R-014:** `agents/rules/RULES.md` — Agent PR Workflow rule
- **Issue #128:** PR workflow tracking issue
- **DISPATCH.md:** Dispatch protocol (Phase 8)
- **Reflexion CLI UX Spec:** `docs/design/reflexion-cli-ux-spec-c615.md` — Similar format reference

---

_🎨 The Architect — Cycle 625_
