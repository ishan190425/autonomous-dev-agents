# CLI Error Messages UX Specification

> **Design Document** | Cycle 1082 | 2026-02-22
> **Author:** 🎨 The Architect
> **Related:** #185 (Better Error Messages with Actionable Solutions)

---

## Overview

This specification defines the UX standards for CLI error messages in ADA. The goal is to transform cryptic error codes into actionable guidance that helps developers fix issues immediately.

### Design Principles

1. **Actionable First** — Every error tells you what to do next
2. **Context-Aware** — Errors understand what you were trying to do
3. **Progressive Detail** — Quick fix first, deep debugging second
4. **Consistent Format** — Predictable structure across all commands
5. **Machine-Readable** — JSON output for scripting and CI

---

## Error Message Anatomy

### Standard Format

```
✖ <Error Title> (<ERROR_CODE>)

  <Concise explanation of what went wrong>

  💡 <Primary suggestion — most likely fix>

  → <Secondary suggestion if applicable>

  📖 Docs: https://ada.dev/errors/<ERROR_CODE>
```

### Example: Real Error

**Before (cryptic):**

```
Error: ENOENT: no such file or directory, open 'agents/state/rotation.json'
```

**After (actionable):**

```
✖ Project Not Initialized (ADA_NOT_INITIALIZED)

  This directory doesn't have an ADA agent team configured.
  Missing: agents/state/rotation.json

  💡 Run `ada init` to set up an agent team here

  → Or navigate to a directory that has ADA configured

  📖 Docs: https://ada.dev/errors/ADA_NOT_INITIALIZED
```

---

## Error Categories

### 1. Configuration Errors (ADA*CONFIG*\*)

| Code                   | Meaning                             | Primary Fix                        |
| ---------------------- | ----------------------------------- | ---------------------------------- |
| `ADA_NOT_INITIALIZED`  | No ADA project found                | Run `ada init`                     |
| `ADA_INVALID_CONFIG`   | Malformed roster.json/rotation.json | Run `ada doctor`                   |
| `ADA_MISSING_PLAYBOOK` | Playbook file not found             | Create file or run `ada roles add` |
| `ADA_CORRUPT_STATE`    | rotation.json parse error           | Run `ada repair`                   |

### 2. Runtime Errors (ADA*RUNTIME*\*)

| Code                    | Meaning                    | Primary Fix                      |
| ----------------------- | -------------------------- | -------------------------------- |
| `ADA_CYCLE_IN_PROGRESS` | Dispatch lock exists       | Wait or use `--force`            |
| `ADA_WRONG_ROLE`        | Not your turn in rotation  | Check rotation with `ada status` |
| `ADA_GIT_DIRTY`         | Uncommitted changes        | Commit or stash changes          |
| `ADA_GIT_CONFLICT`      | Merge conflict during push | Pull and resolve manually        |

### 3. Network Errors (ADA*NETWORK*\*)

| Code                      | Meaning                      | Primary Fix                 |
| ------------------------- | ---------------------------- | --------------------------- |
| `ADA_GITHUB_UNAUTHORIZED` | GitHub token invalid/missing | Run `gh auth login`         |
| `ADA_GITHUB_RATE_LIMIT`   | API rate limit exceeded      | Wait or use `--skip-github` |
| `ADA_GITHUB_NOT_FOUND`    | Repo/issue doesn't exist     | Check repo URL in config    |
| `ADA_NETWORK_OFFLINE`     | No internet connection       | Check connection            |

### 4. Validation Errors (ADA*VALIDATION*\*)

| Code                 | Meaning                    | Primary Fix                       |
| -------------------- | -------------------------- | --------------------------------- |
| `ADA_MISSING_ACTION` | --action flag required     | Add `--action "..."`              |
| `ADA_INVALID_ROLE`   | Role name not in roster    | Check roles with `ada roles list` |
| `ADA_EMPTY_MEMORY`   | Memory bank has no entries | Run a cycle to populate           |

---

## Context-Aware Error Enhancement

### Command Context

Errors should understand what command was being executed:

```typescript
// Context shapes the error message
interface ErrorContext {
  command: string; // e.g., 'dispatch complete'
  flags: string[]; // e.g., ['--action', '--reflection']
  missingFlag?: string; // e.g., '--action'
  workingDir: string; // Current directory
  hasGit: boolean; // Is this a git repo?
  hasAda: boolean; // Is ADA initialized?
}
```

### Example: Context-Aware

**Without context:**

```
Error: Missing required argument
```

**With context (dispatch complete command):**

```
✖ Missing Action Description (ADA_MISSING_ACTION)

  The `ada dispatch complete` command requires --action to describe what you did.

  💡 Add the action flag:
     ada dispatch complete --action "Fixed bug in rotation logic"

  → Optional: Add reflection with --reflection "What I learned..."

  📖 Docs: https://ada.dev/cli/dispatch-complete
```

---

## Terminal Formatting

### Color Scheme

| Element            | Color  | ANSI Code  | Purpose             |
| ------------------ | ------ | ---------- | ------------------- |
| Error marker (✖)   | Red    | `\x1b[31m` | Immediate attention |
| Warning marker (⚠) | Yellow | `\x1b[33m` | Caution             |
| Success marker (✔) | Green  | `\x1b[32m` | Confirmation        |
| Suggestion (💡)    | Cyan   | `\x1b[36m` | Actionable help     |
| Code/commands      | Bold   | `\x1b[1m`  | Stand out           |
| Dim text           | Dim    | `\x1b[2m`  | Secondary info      |

### Environment Awareness

```typescript
const useColors =
  !process.env.NO_COLOR && !process.env.CI && process.stdout.isTTY;
```

**TTY Terminal:**

```
✖ Project Not Initialized (ADA_NOT_INITIALIZED)
  ↳ (colored, with emoji)
```

**CI/Non-TTY:**

```
ERROR [ADA_NOT_INITIALIZED]: Project not initialized
  Missing: agents/state/rotation.json
  Fix: Run `ada init` to set up an agent team
  Docs: https://ada.dev/errors/ADA_NOT_INITIALIZED
```

---

## JSON Error Output

For `--json` flag or `ADA_OUTPUT=json`:

```json
{
  "ok": false,
  "error": {
    "code": "ADA_NOT_INITIALIZED",
    "message": "This directory doesn't have an ADA agent team configured",
    "details": {
      "missingFile": "agents/state/rotation.json",
      "workingDir": "/home/user/project"
    },
    "suggestions": [
      {
        "primary": true,
        "action": "Run `ada init` to set up an agent team here",
        "command": "ada init"
      },
      {
        "primary": false,
        "action": "Navigate to a directory that has ADA configured"
      }
    ],
    "docs": "https://ada.dev/errors/ADA_NOT_INITIALIZED",
    "exitCode": 1
  }
}
```

---

## Exit Codes

Standardized exit codes for scripting:

| Code | Category      | Example                   |
| ---- | ------------- | ------------------------- |
| 0    | Success       | Command completed         |
| 1    | General error | Unspecified failure       |
| 2    | Usage error   | Invalid arguments         |
| 3    | Config error  | Missing/invalid config    |
| 4    | Runtime error | Lock conflict, wrong role |
| 5    | Network error | GitHub API failure        |
| 6    | Git error     | Dirty tree, conflict      |

---

## Implementation Architecture

### ErrorBuilder Pattern

```typescript
import { ErrorBuilder } from '@ada-ai/core';

// Usage in commands
throw new ErrorBuilder('ADA_NOT_INITIALIZED')
  .context('dispatch start')
  .detail('missingFile', 'agents/state/rotation.json')
  .suggest('Run `ada init` to set up an agent team', { primary: true })
  .suggest('Navigate to a directory with ADA configured')
  .build();

// Error class
class AdaError extends Error {
  code: string;
  context?: string;
  details: Record<string, unknown>;
  suggestions: Suggestion[];
  docs: string;
  exitCode: number;
}
```

### Error Registry

```typescript
// packages/core/src/errors/registry.ts
export const ERROR_REGISTRY: Record<string, ErrorDefinition> = {
  ADA_NOT_INITIALIZED: {
    exitCode: 3,
    category: 'config',
    template: "This directory doesn't have an ADA agent team configured",
    docs: 'https://ada.dev/errors/ADA_NOT_INITIALIZED',
    defaultSuggestions: [
      { action: 'Run `ada init` to set up an agent team', primary: true },
    ],
  },
  // ... more errors
};
```

### Error Renderer

```typescript
// packages/cli/src/utils/error-renderer.ts
export function renderError(error: AdaError, options: RenderOptions): string {
  if (options.json) {
    return JSON.stringify(formatErrorJson(error), null, 2);
  }

  if (options.tty) {
    return formatErrorTty(error);
  }

  return formatErrorPlain(error);
}
```

---

## Common Error Scenarios

### Scenario 1: First-Time User

**Command:** `ada status` (in non-ADA directory)

```
✖ Project Not Initialized (ADA_NOT_INITIALIZED)

  You're not in an ADA project. ADA needs a configured agent team to run.

  💡 Create a new agent team:
     ada init

  → Or cd to an existing ADA project

  📖 Getting Started: https://ada.dev/quickstart
```

### Scenario 2: Dispatch Without Completing

**Command:** `ada dispatch start` (with existing lock)

```
⚠ Cycle Already In Progress (ADA_CYCLE_IN_PROGRESS)

  Cycle 1082 is still running (started 15 minutes ago by 🎨 Design).

  💡 Complete the current cycle first:
     ada dispatch complete --action "..."

  → If the cycle is stale, force a new start:
     ada dispatch start --force

  📖 Docs: https://ada.dev/cli/dispatch-start
```

### Scenario 3: GitHub Auth Failure

**Command:** `ada dispatch complete` (expired token)

```
✖ GitHub Authorization Failed (ADA_GITHUB_UNAUTHORIZED)

  Your GitHub token is invalid or expired.

  💡 Re-authenticate with GitHub:
     gh auth login

  → Or set GH_TOKEN environment variable

  → Check token scopes: needs repo access

  📖 Docs: https://ada.dev/setup/github
```

### Scenario 4: Git Dirty Tree

**Command:** `ada dispatch complete` (uncommitted changes)

```
⚠ Uncommitted Changes Detected (ADA_GIT_DIRTY)

  You have uncommitted changes that would be included in the dispatch commit:
    • agents/memory/bank.md (modified)
    • docs/new-feature.md (untracked)

  💡 Include these in your dispatch:
     (they'll be committed with your action)

  → Or stash changes first:
     git stash

  → Or commit separately before dispatch

  📖 Docs: https://ada.dev/cli/dispatch-complete#git
```

---

## Troubleshooting Links

Each error code links to a docs page with:

1. **Full explanation** — What does this error mean?
2. **Common causes** — Why might this happen?
3. **Step-by-step fix** — Detailed resolution
4. **Related errors** — Similar issues
5. **Community solutions** — GitHub discussions link

Example URL structure: `https://ada.dev/errors/ADA_NOT_INITIALIZED`

---

## Implementation Roadmap

### Phase 1: Foundation (2-3 days)

- [ ] Create `AdaError` class in `@ada-ai/core`
- [ ] Create error registry with all codes
- [ ] Create `ErrorBuilder` utility
- [ ] Create error renderer (TTY/plain/JSON)

### Phase 2: Integration (3-4 days)

- [ ] Replace all `throw new Error()` with `ErrorBuilder`
- [ ] Add context to each command
- [ ] Add exit code handling
- [ ] Add `--json` error output support

### Phase 3: Documentation (1-2 days)

- [ ] Create error docs pages
- [ ] Add troubleshooting content
- [ ] Update README with error handling section

### Phase 4: Polish (1 day)

- [ ] Add CI detection for plain output
- [ ] Add `NO_COLOR` support
- [ ] Add error analytics (opt-in telemetry)

---

## Success Metrics

| Metric                  | Current | Target |
| ----------------------- | ------- | ------ |
| Errors with suggestions | ~10%    | 100%   |
| Errors with docs links  | 0%      | 100%   |
| Context-aware errors    | 0%      | 100%   |
| JSON error support      | ❌      | ✅     |
| Consistent exit codes   | ❌      | ✅     |

---

## References

- [#185](https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/185) — Better Error Messages issue
- [Progress Indicators UX Spec (C1072)](./cli-progress-indicators-ux-spec-c1072.md) — Related CLI UX work
- [Rust Error Handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html) — Inspiration for actionable errors
- [Human-Friendly CLI Errors](https://clig.dev/#errors) — CLI guidelines reference

---

_Spec ready for Engineering implementation. Phase 1 can begin Sprint 3._
