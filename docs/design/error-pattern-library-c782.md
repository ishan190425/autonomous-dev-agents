# 🎨 Error Message Pattern Library (C782)

> **Author:** 🎨 Design (The Architect)
> **Date:** 2026-02-17
> **Cycle:** 782
> **Issue:** #185 (Better Error Messages with Actionable Solutions)
> **Status:** SPEC COMPLETE — Ready for Engineering

---

## Overview

Error messages are the product's crisis communication. When something goes wrong, the error message is often the only thing standing between a user and abandonment. This pattern library establishes consistent, actionable error messaging across all ADA CLI commands.

---

## Design Principles

### 1. **Tell, Don't Scold**

Bad: `Error: Invalid configuration`
Good: `Configuration file has a syntax error on line 23`

### 2. **Explain the Impact**

Bad: `DISPATCH_LOCK_EXISTS`
Good: `Another dispatch cycle is already running — starting a new one would cause conflicts`

### 3. **Offer a Solution**

Bad: `Git push failed`
Good: `Git push failed — try pulling first: git pull --rebase`

### 4. **Respect User Intelligence**

Don't over-explain obvious things. If they ran `ada dispatch start`, they know what dispatch is.

### 5. **Enable Copy-Paste Recovery**

Include runnable commands they can copy directly.

---

## Error Message Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ✖ ERROR_CODE                                               │
│                                                             │
│  What happened (1 line, plain language)                     │
│                                                             │
│  → Why this happened (context, optional)                    │
│  → How to fix it (actionable steps)                         │
│                                                             │
│  $ command --to-run                                         │
│                                                             │
│  📖 Docs: https://ada.dev/errors/ERROR_CODE                 │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component  | Required | Purpose                                                    |
| ---------- | -------- | ---------------------------------------------------------- |
| Error Code | ✅       | Machine-readable identifier (e.g., `DISPATCH_LOCK_EXISTS`) |
| What       | ✅       | Human-readable summary (1 line max)                        |
| Why        | ⚪       | Context if not obvious from "What"                         |
| Fix        | ✅       | Actionable solution(s)                                     |
| Command    | ⚪       | Copy-paste command if applicable                           |
| Docs Link  | ⚪       | Deep link for complex errors                               |

---

## Error Code Convention

Format: `{DOMAIN}_{SPECIFIC_ERROR}`

### Domains

| Domain   | Prefix      | Examples                                      |
| -------- | ----------- | --------------------------------------------- |
| Dispatch | `DISPATCH_` | `DISPATCH_LOCK_EXISTS`, `DISPATCH_NO_ROLE`    |
| Memory   | `MEMORY_`   | `MEMORY_PARSE_ERROR`, `MEMORY_NOT_FOUND`      |
| Config   | `CONFIG_`   | `CONFIG_INVALID_JSON`, `CONFIG_MISSING_FIELD` |
| Git      | `GIT_`      | `GIT_PUSH_FAILED`, `GIT_NOT_REPO`             |
| GitHub   | `GITHUB_`   | `GITHUB_AUTH_FAILED`, `GITHUB_RATE_LIMITED`   |
| Init     | `INIT_`     | `INIT_ALREADY_EXISTS`, `INIT_NO_PACKAGE_JSON` |
| CLI      | `CLI_`      | `CLI_UNKNOWN_COMMAND`, `CLI_MISSING_ARG`      |

---

## Color Scheme

| Element          | Color    | ANSI Code    | Usage                                |
| ---------------- | -------- | ------------ | ------------------------------------ |
| Error icon (✖)   | Red      | `\x1b[31m`   | Fatal errors that stop execution     |
| Warning icon (⚠) | Yellow   | `\x1b[33m`   | Non-fatal issues, degraded operation |
| Info icon (ℹ)    | Blue     | `\x1b[34m`   | Informational messages               |
| Success icon (✓) | Green    | `\x1b[32m`   | Recovery commands, success states    |
| Error code       | Red Bold | `\x1b[1;31m` | The ERROR_CODE identifier            |
| Command          | Cyan     | `\x1b[36m`   | Runnable commands                    |
| Path/File        | Dim      | `\x1b[2m`    | File paths, technical details        |

### Fallback for No-Color

When `NO_COLOR` env is set or terminal doesn't support colors:

- Use text prefixes: `[ERROR]`, `[WARN]`, `[INFO]`
- Replace icons with ASCII: `[X]`, `[!]`, `[i]`, `[✓]`

---

## Standard Error Patterns

### Pattern 1: Simple Error (No Context Needed)

```
✖ CONFIG_INVALID_JSON

  The configuration file contains invalid JSON.

  → Check for syntax errors: missing commas, quotes, brackets
  → Validate with: npx jsonlint agents/roster.json

  $ npx jsonlint agents/roster.json
```

### Pattern 2: Actionable Recovery (Single Solution)

```
✖ DISPATCH_LOCK_EXISTS

  A dispatch cycle is already in progress.

  → Another role started a cycle that hasn't completed.
  → Wait for it to finish, or force start if it's stale.

  $ ada dispatch start --force
```

### Pattern 3: Multiple Solutions (Branching)

```
✖ GIT_PUSH_FAILED

  Failed to push changes to origin/main.

  This usually means:
  → Remote has newer commits — pull and retry
  → Authentication expired — re-login with gh auth
  → Branch protection — open a PR instead

  Try one of:
  $ git pull --rebase && git push
  $ gh auth login
  $ gh pr create --title "Your changes"
```

### Pattern 4: Rate Limit / Temporary Error

```
⚠ GITHUB_RATE_LIMITED

  GitHub API rate limit exceeded (5000/hour).

  → Limit resets at 03:45 AM EST (in 23 minutes)
  → Authenticated requests get higher limits

  Wait or authenticate:
  $ gh auth login
```

### Pattern 5: Missing Dependency

```
✖ INIT_NO_GH_CLI

  GitHub CLI (gh) is required but not installed.

  ADA needs gh to interact with GitHub issues and PRs.

  Install it:
  $ brew install gh          # macOS
  $ sudo apt install gh      # Ubuntu/Debian
  $ winget install GitHub.cli # Windows

  Then authenticate:
  $ gh auth login

  📖 Docs: https://cli.github.com/manual/installation
```

### Pattern 6: Configuration Error with Line Number

```
✖ CONFIG_SCHEMA_ERROR

  Invalid roster.json at line 15, column 8.

  Field "rotation_order" contains unknown role "frontend".

  Available roles:
    ceo, growth, research, frontier, product, scrum, qa, engineering, ops, design

  → Fix: Replace "frontend" with a valid role ID
  → Or add "frontend" to the roles array first

  📖 Docs: https://ada.dev/docs/configuration/roster
```

### Pattern 7: Partial Success (Warning)

```
⚠ DISPATCH_PARTIAL

  Cycle 782 completed with warnings.

  ✓ Role action executed successfully
  ⚠ Memory bank update skipped — file locked
  ✓ Rotation state advanced

  → Memory will sync on next cycle
  → No action needed unless this persists

  Check status:
  $ ada dispatch status
```

---

## Implementation Guidelines

### TypeScript Interface

```typescript
interface ADAError {
  code: string; // e.g., "DISPATCH_LOCK_EXISTS"
  message: string; // Human-readable summary
  context?: string[]; // "Why" bullets (optional)
  solutions: string[]; // "Fix" bullets (required, min 1)
  commands?: string[]; // Copy-paste commands (optional)
  docsUrl?: string; // Deep link to docs (optional)
  severity: 'error' | 'warning' | 'info';
}

function formatError(error: ADAError): string;
```

### Error Rendering Function

```typescript
export function formatError(error: ADAError): string {
  const icon =
    error.severity === 'error' ? '✖' : error.severity === 'warning' ? '⚠' : 'ℹ';
  const color =
    error.severity === 'error'
      ? chalk.red
      : error.severity === 'warning'
        ? chalk.yellow
        : chalk.blue;

  let output = `\n${color(icon)} ${chalk.bold.red(error.code)}\n\n`;
  output += `  ${error.message}\n\n`;

  if (error.context?.length) {
    error.context.forEach(ctx => {
      output += `  → ${ctx}\n`;
    });
    output += '\n';
  }

  error.solutions.forEach(sol => {
    output += `  → ${sol}\n`;
  });

  if (error.commands?.length) {
    output += '\n';
    error.commands.forEach(cmd => {
      output += `  ${chalk.cyan('$')} ${chalk.cyan(cmd)}\n`;
    });
  }

  if (error.docsUrl) {
    output += `\n  ${chalk.dim('📖 Docs:')} ${chalk.dim(error.docsUrl)}\n`;
  }

  return output;
}
```

### Error Catalog Structure

```
packages/core/src/errors/
├── index.ts           # Re-exports all
├── types.ts           # ADAError interface
├── formatter.ts       # formatError() function
├── catalog/
│   ├── dispatch.ts    # DISPATCH_* errors
│   ├── memory.ts      # MEMORY_* errors
│   ├── config.ts      # CONFIG_* errors
│   ├── git.ts         # GIT_* errors
│   ├── github.ts      # GITHUB_* errors
│   └── init.ts        # INIT_* errors
└── __tests__/
    └── formatter.test.ts
```

---

## Error Catalog (Initial Set)

### Dispatch Errors

| Code                      | Message                                  | Primary Solution                 |
| ------------------------- | ---------------------------------------- | -------------------------------- |
| `DISPATCH_LOCK_EXISTS`    | A dispatch cycle is already in progress  | `ada dispatch start --force`     |
| `DISPATCH_NO_ROLE`        | No role found for current rotation index | Check roster.json rotation_order |
| `DISPATCH_NOT_STARTED`    | No active dispatch cycle to complete     | `ada dispatch start` first       |
| `DISPATCH_INVALID_ACTION` | Action description is required           | Add --action "description"       |

### Memory Errors

| Code                  | Message                                    | Primary Solution       |
| --------------------- | ------------------------------------------ | ---------------------- |
| `MEMORY_NOT_FOUND`    | Memory bank not found at expected path     | `ada init` to create   |
| `MEMORY_PARSE_ERROR`  | Memory bank has invalid markdown structure | Check bank.md syntax   |
| `MEMORY_WRITE_FAILED` | Could not write to memory bank             | Check file permissions |

### Config Errors

| Code                   | Message                                     | Primary Solution       |
| ---------------------- | ------------------------------------------- | ---------------------- |
| `CONFIG_INVALID_JSON`  | Configuration file contains invalid JSON    | Validate with jsonlint |
| `CONFIG_MISSING_FIELD` | Required field missing from config          | Add the required field |
| `CONFIG_SCHEMA_ERROR`  | Configuration doesn't match expected schema | Check docs for schema  |

### Git Errors

| Code                     | Message                                  | Primary Solution              |
| ------------------------ | ---------------------------------------- | ----------------------------- |
| `GIT_NOT_REPO`           | Not in a git repository                  | `git init` or cd to repo      |
| `GIT_PUSH_FAILED`        | Failed to push to remote                 | `git pull --rebase` then push |
| `GIT_DIRTY_WORKING_TREE` | Uncommitted changes in working directory | Commit or stash changes       |

### GitHub Errors

| Code                  | Message                        | Primary Solution       |
| --------------------- | ------------------------------ | ---------------------- |
| `GITHUB_AUTH_FAILED`  | GitHub authentication failed   | `gh auth login`        |
| `GITHUB_RATE_LIMITED` | API rate limit exceeded        | Wait or authenticate   |
| `GITHUB_NOT_FOUND`    | Repository not found on GitHub | Check repo name/access |

### Init Errors

| Code                   | Message                                   | Primary Solution        |
| ---------------------- | ----------------------------------------- | ----------------------- |
| `INIT_ALREADY_EXISTS`  | ADA already initialized in this directory | Use `--force` to reinit |
| `INIT_NO_PACKAGE_JSON` | No package.json found                     | Initialize npm first    |
| `INIT_NO_GH_CLI`       | GitHub CLI not installed                  | Install gh CLI          |

---

## Testing Requirements

1. **Snapshot tests** for each error pattern to catch formatting regressions
2. **Color stripping** tests for NO_COLOR mode
3. **Terminal width** tests for narrow terminals (wrap gracefully)
4. **i18n readiness** — error messages should be extractable to locale files (future)

---

## Success Metrics

| Metric                           | Current | Target |
| -------------------------------- | ------- | ------ |
| Errors with actionable solution  | ~30%    | 100%   |
| Errors with copy-paste command   | ~10%    | 80%    |
| User confusion reports (support) | High    | Low    |
| Time to recovery from error      | ~5 min  | <1 min |

---

## Dependencies

- **#186 Structured Logging** — Error codes should appear in logs
- **#184 Docs Restructure** — Create /errors/\* pages for each code

---

## References

- Issue: #185
- Design triage: docs/design/phase2-day2-ux-triage-c772.md
- Prior art: Rust compiler errors, npm error messages, Go errors

---

_Spec complete. Ready for Engineering implementation._
