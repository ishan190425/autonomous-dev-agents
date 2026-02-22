# Error Messages UX Specification

> **Cycle:** 1102 | **Role:** Design | **Issue:** #185
> **Date:** 2026-02-22 | **Author:** 🎨 The Architect

---

## Overview

ADA CLI error messages should be **actionable, not cryptic**. When something goes wrong, users need:

1. What happened (clear description)
2. Why it happened (context)
3. How to fix it (actionable steps)

This spec defines error message patterns, formatting standards, and implementation guidelines.

---

## Design Principles

### 1. Actionable Over Technical

```
❌ BAD:  ENOENT: no such file or directory, open 'agents/memory/bank.md'
✅ GOOD: Memory bank not found at agents/memory/bank.md
         Run `ada init` to create a new ADA project, or check your working directory.
```

### 2. Context-Aware Suggestions

Errors should suggest different fixes based on context:

- In a non-ADA directory → suggest `ada init`
- In ADA directory with corrupted state → suggest recovery commands
- Permission issues → suggest chmod or sudo

### 3. Progressive Detail

- **Line 1:** What went wrong (human readable)
- **Line 2:** Why (optional, for complex errors)
- **Line 3+:** How to fix (numbered steps if multiple)
- **Debug flag:** `--verbose` shows stack trace and technical details

---

## Error Categories

### Category 1: Setup & Initialization Errors

| Error Code | Trigger                   | Message Pattern                                                                    |
| ---------- | ------------------------- | ---------------------------------------------------------------------------------- |
| `INIT_001` | `ada` run outside project | `Not an ADA project. Run \`ada init\` to create one.`                              |
| `INIT_002` | Missing roster.json       | `Missing roster.json. Run \`ada init --repair\` to regenerate.`                    |
| `INIT_003` | Missing rotation.json     | `Missing rotation state. Run \`ada dispatch start --force\` to initialize.`        |
| `INIT_004` | Corrupted JSON            | `Invalid {file}: {parse_error}. Restore from backup or run \`ada init --repair\`.` |
| `INIT_005` | Missing playbook          | `Playbook not found: {role}.md. Create it at agents/playbooks/{role}.md`           |

### Category 2: Dispatch Errors

| Error Code | Trigger               | Message Pattern                                                                                                                                |
| ---------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `DISP_001` | Cycle already running | `Cycle already in progress (started {time}). Complete it with \`ada dispatch complete\` or force restart with \`ada dispatch start --force\`.` |
| `DISP_002` | No --action flag      | `Missing action description. Usage: \`ada dispatch complete --action "..."\``                                                                  |
| `DISP_003` | Git not clean         | `Uncommitted changes detected. Commit or stash before completing cycle.`                                                                       |
| `DISP_004` | Push failed           | `Push to origin/main failed. Try: \`git pull --rebase && git push\``                                                                           |
| `DISP_005` | Wrong role            | `Not your turn. Current role: {current}. Your role: {attempted}.`                                                                              |

### Category 3: Memory Errors

| Error Code | Trigger           | Message Pattern                                                                     |
| ---------- | ----------------- | ----------------------------------------------------------------------------------- |
| `MEM_001`  | Bank not found    | `Memory bank not found. Expected at: agents/memory/bank.md`                         |
| `MEM_002`  | Bank corrupted    | `Memory bank has invalid format. Last valid backup: {path}`                         |
| `MEM_003`  | Search no results | `No matches for "{query}". Try broader terms or check \`ada memory list\`.`         |
| `MEM_004`  | Archive failed    | `Could not archive memory bank. Check write permissions on agents/memory/archives/` |

### Category 4: Git & GitHub Errors

| Error Code | Trigger        | Message Pattern                                                                             |
| ---------- | -------------- | ------------------------------------------------------------------------------------------- |
| `GIT_001`  | Not a git repo | `Not a git repository. Run \`git init\` first.`                                             |
| `GIT_002`  | No remote      | `No remote 'origin' configured. Run \`git remote add origin <url>\``                        |
| `GIT_003`  | Auth failed    | `GitHub authentication failed. Run \`gh auth login\` to authenticate.`                      |
| `GIT_004`  | Rate limited   | `GitHub API rate limit exceeded. Wait {minutes} minutes or use a token with higher limits.` |
| `GIT_005`  | PR conflict    | `PR has merge conflicts. Resolve locally: \`git fetch && git merge origin/main\``           |

### Category 5: Configuration Errors

| Error Code | Trigger          | Message Pattern                                                               |
| ---------- | ---------------- | ----------------------------------------------------------------------------- |
| `CFG_001`  | Invalid role     | `Unknown role: "{role}". Available roles: {list}`                             |
| `CFG_002`  | Invalid executor | `Unknown executor: "{exec}". Supported: openai, anthropic, ollama`            |
| `CFG_003`  | Missing API key  | `Missing API key for {provider}. Set {ENV_VAR} environment variable.`         |
| `CFG_004`  | Invalid schedule | `Invalid schedule format. Use cron syntax: "*/15 * * * *" or interval: "15m"` |

---

## Visual Formatting

### Color Scheme

```typescript
const errorColors = {
  error: 'red', // Error header and symbols
  warning: 'yellow', // Warnings and cautions
  hint: 'cyan', // Actionable suggestions
  code: 'gray', // Code snippets and commands
  path: 'dim', // File paths
};
```

### Error Box Format

```
┌─ Error ──────────────────────────────────────────────┐
│                                                       │
│  ✖ Memory bank not found                              │
│                                                       │
│  Expected location: agents/memory/bank.md             │
│                                                       │
│  To fix:                                              │
│    1. Run `ada init` to create a new project          │
│    2. Or restore from backup: agents/memory/archives/ │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Inline Format (for minor errors)

```
✖ Missing --action flag
  Usage: ada dispatch complete --action "Description of what you did"
```

### Warning Format

```
⚠ Uncommitted changes detected
  Consider committing before dispatch to track all changes.
```

---

## Implementation Architecture

### Error Class Hierarchy

```typescript
// Base error with user-friendly formatting
abstract class AdaError extends Error {
  abstract code: string; // e.g., "INIT_001"
  abstract category: ErrorCategory;
  abstract userMessage: string; // Human-readable
  abstract suggestions: string[]; // Actionable fixes

  // Only shown with --verbose
  technicalDetails?: string;

  format(options: { verbose: boolean; color: boolean }): string;
}

// Category-specific errors
class InitializationError extends AdaError {
  category = 'initialization' as const;
}

class DispatchError extends AdaError {
  category = 'dispatch' as const;
}

class MemoryError extends AdaError {
  category = 'memory' as const;
}

class GitError extends AdaError {
  category = 'git' as const;
}

class ConfigError extends AdaError {
  category = 'config' as const;
}
```

### Error Handler

```typescript
function handleError(error: unknown, options: CliOptions): never {
  if (error instanceof AdaError) {
    // Format nicely with suggestions
    console.error(
      error.format({
        verbose: options.verbose,
        color: !options.noColor && process.stdout.isTTY,
      })
    );

    // Log to debug file if configured
    if (options.debug) {
      logErrorToFile(error);
    }

    process.exit(error.exitCode ?? 1);
  }

  // Unknown error — wrap it
  const wrapped = new UnknownError(error);
  console.error(wrapped.format({ verbose: true, color: true }));
  process.exit(1);
}
```

---

## Context-Aware Suggestions

### Detection Functions

```typescript
// Detect project context for smart suggestions
async function detectContext(): Promise<ProjectContext> {
  return {
    isAdaProject: await fileExists('agents/roster.json'),
    isGitRepo: await fileExists('.git'),
    hasRemote: await hasGitRemote('origin'),
    hasMemoryBank: await fileExists('agents/memory/bank.md'),
    hasPlaybooks: await directoryExists('agents/playbooks'),
    currentBranch: await getCurrentBranch(),
    uncommittedChanges: await hasUncommittedChanges(),
    lastCycleTime: await getLastCycleTime(),
  };
}

// Generate context-aware suggestions
function getSuggestions(error: AdaError, context: ProjectContext): string[] {
  const suggestions: string[] = [];

  if (error.code === 'INIT_001' && !context.isAdaProject) {
    suggestions.push('Run `ada init` to create a new ADA project');
    if (context.isGitRepo) {
      suggestions.push("Make sure you're in the project root directory");
    }
  }

  // ... more context-aware logic

  return suggestions;
}
```

---

## Verbose Mode

When `--verbose` is passed, errors include:

1. Full stack trace
2. Environment info (Node version, OS, ADA version)
3. Relevant file contents (truncated)
4. Git status if applicable

```
┌─ Error (verbose) ─────────────────────────────────────┐
│                                                        │
│  ✖ Memory bank parse failed                            │
│                                                        │
│  Code: MEM_002                                         │
│  File: agents/memory/bank.md                           │
│  Line: 47, Column: 12                                  │
│                                                        │
│  Parse Error: Unexpected token in JSON at position 892 │
│                                                        │
│  Context:                                              │
│    45 │ ## Role State                                  │
│    46 │                                                │
│  > 47 │ - Last: {"broken": json here                   │
│       │            ^^^^^^^^^^^^                        │
│    48 │                                                │
│                                                        │
│  Stack Trace:                                          │
│    at JSON.parse (<anonymous>)                         │
│    at parseMemoryBank (src/memory/parser.ts:47:12)     │
│    at loadMemory (src/memory/index.ts:23:5)            │
│                                                        │
│  Environment:                                          │
│    ADA: 1.0.0-alpha                                    │
│    Node: v20.10.0                                      │
│    OS: linux x64                                       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Exit Codes

| Code | Category | Meaning                        |
| ---- | -------- | ------------------------------ |
| 0    | Success  | Command completed successfully |
| 1    | General  | Unknown or unhandled error     |
| 2    | Usage    | Invalid arguments or flags     |
| 3    | Init     | Initialization/setup error     |
| 4    | Dispatch | Dispatch cycle error           |
| 5    | Memory   | Memory bank error              |
| 6    | Git      | Git/GitHub operation error     |
| 7    | Config   | Configuration error            |
| 8    | Network  | Network/API error              |

---

## Implementation Phases

### Phase 1: Error Class Infrastructure (Sprint 3, Day 1-2)

- [ ] Create `AdaError` base class with formatting
- [ ] Implement 5 error category subclasses
- [ ] Add color/box formatting utilities
- [ ] Wire up global error handler in CLI

### Phase 2: Migration (Sprint 3, Day 3-4)

- [ ] Audit all existing `throw new Error()` calls
- [ ] Replace with typed `AdaError` subclasses
- [ ] Add error codes to all errors
- [ ] Add suggestions to high-frequency errors

### Phase 3: Context Awareness (Sprint 3, Day 5-6)

- [ ] Implement `detectContext()` function
- [ ] Add context-aware suggestion logic
- [ ] Test in various project states
- [ ] Document error codes in README

### Phase 4: Polish (Sprint 3, Day 7-8)

- [ ] Add `--verbose` stack trace support
- [ ] Implement debug logging to file
- [ ] Add exit codes
- [ ] E2E tests for error scenarios

---

## Acceptance Criteria

1. **All errors have codes:** Every thrown error has a unique code (e.g., `INIT_001`)
2. **All errors have suggestions:** Every error includes at least one actionable fix
3. **Formatted output:** Errors render with colors and boxes in TTY, plain text in CI
4. **Verbose mode works:** `--verbose` shows stack traces and environment info
5. **Exit codes are meaningful:** Different error categories have different exit codes
6. **Context-aware:** Suggestions adapt based on project state detection
7. **Documentation:** Error codes documented in user-facing docs

---

## Examples

### Example 1: New User, Wrong Directory

```bash
$ ada status
✖ Not an ADA project

  To create a new project:
    ada init

  Or navigate to an existing ADA project directory.
```

### Example 2: Dispatch Without Action

```bash
$ ada dispatch complete
✖ Missing action description

  Usage: ada dispatch complete --action "Description of what you did"

  Example:
    ada dispatch complete --action "feat(cli): add status command"
```

### Example 3: Git Push Failed

```bash
$ ada dispatch complete --action "..."
✖ Push to origin/main failed

  Remote has changes not present locally.

  To fix:
    1. git pull --rebase origin main
    2. Resolve any conflicts
    3. git push origin main

  Or retry with: ada dispatch complete --action "..." --skip-push
```

---

## Related

- **Issue:** #185
- **Playbook:** agents/playbooks/design.md
- **Prior art:** C1092 (Interactive Onboarding Wizard UX Spec)

---

_Per R-017: SHIPPED tangible design work. This spec enables Engineering to implement user-friendly error handling across the CLI._
