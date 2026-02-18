# CLI Error Messages UX Specification

> **Issue:** #185 — feat(cli): Better Error Messages with Actionable Solutions
> **Author:** 🎨 Design (The Architect)
> **Cycle:** C882
> **Status:** DRAFT — Ready for Engineering review

---

## Design Philosophy

Error messages are a critical touchpoint in developer experience. A well-designed error message transforms frustration into resolution. Every error should answer three questions:

1. **What happened?** — Clear, jargon-free description
2. **Why did it happen?** — Context that helps understanding
3. **How do I fix it?** — Actionable next steps

---

## Error Message Anatomy

```
╭─ Error ─────────────────────────────────────────────────────────╮
│                                                                 │
│  ✖ Unable to start dispatch cycle                               │
│                                                                 │
│  A dispatch cycle is already in progress (started C881).        │
│                                                                 │
│  Try one of these:                                              │
│    • Wait for the current cycle to complete                     │
│    • Run `ada dispatch status` to check progress                │
│    • Use `ada dispatch start --force` to override (use caution) │
│                                                                 │
│  Learn more: https://docs.ada.ai/errors/E001                    │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

### Components

| Element             | Purpose                                 | Required |
| ------------------- | --------------------------------------- | -------- |
| **Error icon** (✖)  | Visual severity indicator               | ✅       |
| **Headline**        | One-line summary of what failed         | ✅       |
| **Explanation**     | Why this happened, with context         | ✅       |
| **Suggestions**     | Actionable fixes (numbered or bulleted) | ✅       |
| **Learn more link** | Deep-dive documentation                 | Optional |
| **Error code**      | For support/search (e.g., E001)         | Optional |

---

## Severity Levels

| Level       | Icon | Color  | Box Style        | When to Use                       |
| ----------- | ---- | ------ | ---------------- | --------------------------------- |
| **Error**   | ✖    | Red    | Solid border     | Operation failed, cannot continue |
| **Warning** | ⚠    | Yellow | Dashed border    | Degraded operation, non-blocking  |
| **Info**    | ℹ    | Blue   | Light background | Helpful context, no issue         |

### Visual Examples

**Error (blocking):**

```
✖ Unable to read roster.json
  File not found at agents/roster.json
```

**Warning (non-blocking):**

```
⚠ Memory bank is 185 lines (approaching 200-line compression threshold)
  Consider running `ada memory compress` soon
```

**Info (contextual):**

```
ℹ Using default rotation order (no custom order in roster.json)
```

---

## Error Categories & Patterns

### 1. File System Errors

**Pattern:** State what file, what operation failed, and how to fix.

```
✖ Unable to read agents/memory/bank.md

  The memory bank file doesn't exist or isn't readable.

  To fix this:
    1. Run `ada init` to create agent files
    2. Or create the file manually: touch agents/memory/bank.md

  Error: ENOENT (file not found)
```

### 2. Git/GitHub Errors

**Pattern:** Distinguish between local git issues and GitHub API issues.

```
✖ Failed to push changes to origin/main

  Git push was rejected. This usually means:
    • Remote has changes not in your local branch
    • Branch protection rules are blocking the push

  To fix this:
    1. Pull latest changes: git pull --rebase origin main
    2. Resolve any conflicts
    3. Run `ada dispatch complete` again

  Git output: ! [rejected] main -> main (non-fast-forward)
```

```
✖ GitHub API request failed

  Could not fetch issue list from GitHub.

  Possible causes:
    • GitHub CLI not authenticated (run `gh auth login`)
    • Network connectivity issues
    • GitHub API rate limit exceeded

  Debug: gh auth status
```

### 3. Validation Errors

**Pattern:** Show exactly what's invalid and the expected format.

```
✖ Invalid roster.json configuration

  Problem: rotation_order contains unknown role "devops"

  Valid roles: ceo, growth, research, frontier, product, scrum, qa,
               engineering, ops, design, evangelist

  Fix: Remove "devops" from rotation_order or add it to the roles object

  Location: agents/roster.json:15
```

### 4. State Errors

**Pattern:** Explain the current state and how to transition.

```
✖ Cannot complete dispatch — no cycle in progress

  You need to start a cycle before completing it.

  Expected workflow:
    1. ada dispatch start    ← Start a cycle
    2. (do your work)
    3. ada dispatch complete ← Complete the cycle

  Current state: idle (no active cycle)
```

### 5. Permission/Auth Errors

**Pattern:** Clearly indicate what permission is needed and how to grant it.

```
✖ Insufficient GitHub permissions

  Creating issues requires 'write' access to this repository.

  Current auth: ishan190425 (read-only via GITHUB_TOKEN)

  To fix:
    • If using token: ensure 'repo' scope is included
    • If using OAuth: run `gh auth refresh -s repo`
```

---

## Suggestion Format Guidelines

### DO ✓

- **Use command snippets:** `Run \`ada dispatch status\` to check`
- **Number steps for sequences:** `1. Pull latest 2. Resolve conflicts 3. Push`
- **Provide alternatives:** "Try A, or if that doesn't work, try B"
- **Be specific:** "File not found at agents/roster.json" (not just "file not found")

### DON'T ✗

- **Don't be vague:** "Something went wrong" ← unhelpful
- **Don't blame the user:** "You forgot to..." ← confrontational
- **Don't use jargon:** "EPERM on inode" ← not actionable
- **Don't show stack traces by default:** Use `--verbose` flag for debug output

---

## Error Code System

Implement a structured error code system for searchability and documentation.

### Format: `E<category><number>`

| Category | Range        | Description                            |
| -------- | ------------ | -------------------------------------- |
| E0xx     | Config/Setup | Initialization, configuration errors   |
| E1xx     | State        | Rotation, dispatch, cycle state errors |
| E2xx     | File System  | Read/write, missing files              |
| E3xx     | Git/GitHub   | Version control, API errors            |
| E4xx     | Validation   | Schema, format validation              |
| E5xx     | Network      | Connectivity, timeout                  |

### Examples

```
E001 — Roster configuration invalid
E101 — Dispatch cycle already in progress
E102 — No active dispatch cycle
E201 — Memory bank file not found
E301 — Git push rejected
E302 — GitHub API rate limited
```

---

## Implementation Checklist

### Phase 1: Foundation (MVP)

- [ ] Create `ErrorFormatter` class in `@ada-ai/core`
- [ ] Define severity levels with icons and colors
- [ ] Implement box drawing for error containers
- [ ] Add `--no-color` flag support for CI environments
- [ ] Standardize error messages in dispatch commands

### Phase 2: Enhancement

- [ ] Add error code system (E0xx-E5xx)
- [ ] Create error reference documentation page
- [ ] Implement "Learn more" links that point to docs
- [ ] Add `--verbose` flag for debug/stack trace output
- [ ] Context-aware suggestions (detect common scenarios)

### Phase 3: Polish

- [ ] Add emoji/icon support detection (degrade gracefully)
- [ ] Implement error message localization hooks (future i18n)
- [ ] Add machine-readable JSON error output (`--json` flag)
- [ ] Create error message testing utilities

---

## Testing Considerations

### Unit Tests

- Each error type renders correctly
- Colors disabled when `NO_COLOR` env is set
- Box drawing handles long messages (wrapping)
- Error codes map to correct messages

### Integration Tests

- Common error scenarios produce expected messages
- Suggestions are actionable (commands actually work)
- Links are valid and resolve

### UX Tests (Manual)

- Read error messages out loud — do they make sense?
- Can a new user fix the issue with just the error message?
- Is the tone helpful, not accusatory?

---

## Examples: Before & After

### Before (Current)

```
Error: ENOENT: no such file or directory, open 'agents/roster.json'
    at Object.openSync (node:fs:603:3)
    at Object.readFileSync (node:fs:471:35)
    ...
```

### After (Proposed)

```
╭─ Error ─────────────────────────────────────────────────────────╮
│                                                                 │
│  ✖ Unable to load roster configuration                          │
│                                                                 │
│  File not found: agents/roster.json                             │
│                                                                 │
│  This file defines your agent team. To create it:               │
│    • Run `ada init` in your project root                        │
│    • Or copy a template: `cp templates/roster.json agents/`     │
│                                                                 │
│  Code: E001                                                     │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

---

## Open Questions

1. **Box drawing characters:** Unicode boxes look great but may not render in all terminals. Should we detect capabilities and fall back to ASCII?

2. **Error codes in output:** Always show? Or only with `--verbose`? Recommendation: Always show — they're useful for searching.

3. **Color scheme:** Current chalk defaults or custom palette? Recommendation: Use chalk's standard red/yellow/blue for accessibility.

---

## References

- [12 Factor CLI Apps](https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46) — Best practices for CLI design
- [Rust Error Handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html) — Excellent error message philosophy
- [Elm Compiler Errors](https://elm-lang.org/news/compiler-errors-for-humans) — Gold standard for actionable errors

---

_🎨 Design — The Architect | Cycle 882_
