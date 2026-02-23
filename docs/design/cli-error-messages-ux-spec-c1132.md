# CLI Error Messages UX Specification

> **Issue:** #185 — Better Error Messages with Actionable Solutions
> **Created:** Cycle 1132 (2026-02-22)
> **Author:** Design (🎨 The Architect)
> **Status:** Specification Complete

---

## Overview

This spec defines the UX patterns for ADA CLI error messages. Goal: every error should tell users **what went wrong**, **why**, and **how to fix it**.

---

## Design Principles

### 1. Actionable Over Cryptic

❌ **Bad:** `Error: ENOENT: no such file or directory`
✅ **Good:** `Error: roster.json not found. Run \`ada init\` to set up your project.`

### 2. Context-Aware

Errors should reference what the user was trying to do:

- "While starting dispatch cycle..."
- "While reading memory bank..."
- "While pushing to origin/main..."

### 3. Progressive Disclosure

- **Line 1:** What failed (brief)
- **Line 2:** Why it failed (explanation)
- **Line 3:** How to fix (actionable command or link)
- **Optional:** Debug info with `--verbose`

### 4. Visual Hierarchy

```
✖ Error: Memory bank is locked

  Another dispatch cycle is in progress.
  Started by: engineering at 2026-02-22T14:30:00Z

  To fix:
    • Wait for the current cycle to complete, or
    • Run: ada dispatch start --force

  Need help? https://ada.dev/docs/troubleshooting#locked-memory
```

---

## Error Categories

### Category 1: Missing Files

| Error Code | Condition                 | Message Pattern                                                                        |
| ---------- | ------------------------- | -------------------------------------------------------------------------------------- |
| `E001`     | `roster.json` not found   | "No roster.json found. Run `ada init` to create one."                                  |
| `E002`     | `rotation.json` not found | "No rotation.json found. Run `ada dispatch start` to initialize rotation."             |
| `E003`     | `bank.md` not found       | "Memory bank not found. Run `ada memory init` to create one."                          |
| `E004`     | Playbook missing          | "Playbook '{role}.md' not found at agents/playbooks/. Create it or check roster.json." |

### Category 2: State Conflicts

| Error Code | Condition            | Message Pattern                                                              |
| ---------- | -------------------- | ---------------------------------------------------------------------------- |
| `E010`     | Dispatch lock exists | "Another cycle is in progress. Wait or use `--force`."                       |
| `E011`     | Wrong role turn      | "It's {expected}'s turn, not {attempted}. Check rotation with `ada status`." |
| `E012`     | Dirty git state      | "Uncommitted changes detected. Commit or stash before dispatch."             |

### Category 3: Configuration Errors

| Error Code | Condition              | Message Pattern                                                                 |
| ---------- | ---------------------- | ------------------------------------------------------------------------------- |
| `E020`     | Invalid roster.json    | "roster.json is invalid: {parse_error}. Check JSON syntax."                     |
| `E021`     | Role not in roster     | "Role '{role}' not found in roster.json. Available: {roles}"                    |
| `E022`     | Missing required field | "roster.json missing required field '{field}'. See schema: ada.dev/docs/config" |

### Category 4: Git/GitHub Errors

| Error Code | Condition          | Message Pattern                                                      |
| ---------- | ------------------ | -------------------------------------------------------------------- |
| `E030`     | Git push failed    | "Failed to push to origin/main. Run `git pull --rebase` then retry." |
| `E031`     | GitHub auth failed | "GitHub authentication failed. Check `gh auth status`."              |
| `E032`     | Not a git repo     | "Not a git repository. Initialize with `git init` first."            |

### Category 5: Network/External

| Error Code | Condition              | Message Pattern                                                        |
| ---------- | ---------------------- | ---------------------------------------------------------------------- |
| `E040`     | GitHub API unreachable | "Cannot reach GitHub API. Check your internet connection."             |
| `E041`     | Rate limit exceeded    | "GitHub API rate limit exceeded. Wait {minutes} minutes or use a PAT." |

---

## Visual Styling

### Colors (Terminal)

| Element            | Color          | ANSI Code    |
| ------------------ | -------------- | ------------ |
| Error icon/label   | Red            | `\x1b[31m`   |
| Warning icon/label | Yellow         | `\x1b[33m`   |
| Success icon/label | Green          | `\x1b[32m`   |
| Command hints      | Cyan           | `\x1b[36m`   |
| URLs               | Blue underline | `\x1b[34;4m` |
| Dim (secondary)    | Gray           | `\x1b[90m`   |

### Icons

| Type    | Icon | Fallback (no emoji) |
| ------- | ---- | ------------------- |
| Error   | ✖    | [ERROR]             |
| Warning | ⚠    | [WARN]              |
| Info    | ℹ    | [INFO]              |
| Success | ✔    | [OK]                |
| Hint    | 💡   | [TIP]               |

### Non-TTY Mode

When `process.stdout.isTTY === false`:

- Strip all ANSI codes
- Use text fallbacks for icons
- Single-line JSON output with `--json` flag

---

## Error Message Templates

### TypeScript Implementation Pattern

```typescript
// packages/core/src/errors/messages.ts

interface ErrorMessage {
  code: string;
  title: string;
  explanation?: string;
  fix?: string | string[];
  helpUrl?: string;
  context?: Record<string, unknown>;
}

const ERROR_MESSAGES: Record<string, (ctx: any) => ErrorMessage> = {
  E001: () => ({
    code: 'E001',
    title: 'roster.json not found',
    explanation: 'ADA needs a roster file to define your agent team.',
    fix: 'Run `ada init` to set up your project.',
    helpUrl: 'https://ada.dev/docs/getting-started',
  }),

  E010: (ctx: { lockedBy: string; lockedAt: string }) => ({
    code: 'E010',
    title: 'Dispatch cycle already in progress',
    explanation: `Started by ${ctx.lockedBy} at ${ctx.lockedAt}`,
    fix: [
      'Wait for the current cycle to complete, or',
      'Run: ada dispatch start --force',
    ],
    helpUrl: 'https://ada.dev/docs/troubleshooting#locked-dispatch',
  }),

  E030: (ctx: { remote: string; error: string }) => ({
    code: 'E030',
    title: `Failed to push to ${ctx.remote}`,
    explanation: ctx.error,
    fix: [
      'Pull latest changes: git pull --rebase',
      'Resolve any conflicts, then retry',
    ],
  }),
};
```

### Rendering Function

```typescript
// packages/cli/src/utils/render-error.ts

export function renderError(error: ErrorMessage): void {
  const chalk = require('chalk');

  console.error('');
  console.error(chalk.red('✖'), chalk.red.bold(error.title));

  if (error.explanation) {
    console.error('');
    console.error('  ' + chalk.dim(error.explanation));
  }

  if (error.fix) {
    console.error('');
    console.error('  ' + chalk.white('To fix:'));
    const fixes = Array.isArray(error.fix) ? error.fix : [error.fix];
    fixes.forEach(f => {
      console.error('    ' + chalk.cyan('•'), f);
    });
  }

  if (error.helpUrl) {
    console.error('');
    console.error(
      '  ' + chalk.dim('Need help?'),
      chalk.blue.underline(error.helpUrl)
    );
  }

  console.error('');
}
```

---

## CLI Flags

### `--verbose` / `-v`

Shows additional debug information:

- Stack trace
- Environment details
- File paths checked
- API responses

### `--json`

Outputs error as JSON for programmatic consumption:

```json
{
  "error": {
    "code": "E010",
    "title": "Dispatch cycle already in progress",
    "explanation": "Started by engineering at 2026-02-22T14:30:00Z",
    "fix": [
      "Wait for the current cycle to complete",
      "Run: ada dispatch start --force"
    ],
    "helpUrl": "https://ada.dev/docs/troubleshooting#locked-dispatch"
  }
}
```

### `--no-hints`

Suppresses fix suggestions (for CI/scripting where you know what you're doing).

---

## Special Cases

### Interactive Recovery

For recoverable errors, offer interactive prompts:

```
✖ Error: Uncommitted changes detected

  You have 3 modified files that would be overwritten.

  What would you like to do?
  › Stash changes and continue
    Abort dispatch
    Show changed files

  (Use arrow keys to select)
```

### Network Retry

For transient network failures:

```
⚠ GitHub API request failed (attempt 1/3)

  Retrying in 2 seconds...
  [████████░░░░░░░░░░░░] 2s
```

### Graceful Degradation

When optional features fail, continue with warning:

```
⚠ Warning: Could not fetch GitHub issue metadata

  Continuing without issue context.
  Error details: Rate limit exceeded

  To fix: Set GITHUB_TOKEN for higher rate limits.
```

---

## Testing Strategy

### Unit Tests

- Each error code renders correctly
- Colors stripped in non-TTY mode
- JSON output matches schema
- Context variables interpolate correctly

### Integration Tests

- Common failure scenarios trigger correct messages
- `--verbose` shows additional info
- `--json` output parseable
- Interactive prompts work in TTY

### Acceptance Criteria

- [ ] All existing errors updated to new format
- [ ] Error code registry (`E001`-`E999`) documented
- [ ] `--verbose` and `--json` flags implemented
- [ ] Non-TTY fallbacks tested
- [ ] Help URLs link to real docs

---

## Implementation Plan

| Day | Task                                    | Owner       |
| --- | --------------------------------------- | ----------- |
| 1   | Create ErrorMessage type + registry     | Engineering |
| 2   | Implement renderError utility           | Engineering |
| 3   | Migrate dispatch errors                 | Engineering |
| 4   | Migrate memory errors                   | Engineering |
| 5   | Add --verbose, --json, --no-hints flags | Engineering |
| 6   | E2E tests for error scenarios           | QA          |
| 7   | Documentation + help URLs               | Docs        |

---

## References

- **Inspiration:** [oclif error handling](https://oclif.io/docs/error_handling), [Rust compiler errors](https://blog.rust-lang.org/2016/08/10/Shape-of-errors-to-come.html)
- **Related Issues:** #73 (UX polish), #185 (this spec)
- **Sprint Target:** Sprint 4 or 5 (nice-to-have, not blocking)

---

_This spec ships a complete error UX pattern for ADA CLI. Engineering can implement incrementally._
