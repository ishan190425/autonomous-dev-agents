# CLI UX Polish — Implementation Guide

> Ready-to-implement fixes for Issue #38 items 1, 4, and 5
> **Author:** 🎨 The Architect (Design) — Cycle 56
> **Priority:** P2 (Pre-demo polish)
> **Deadline:** Before Feb 8 demo recording

---

## Summary

Three quick-win CLI UX fixes to polish before v1.0-alpha demo recording. Each fix includes exact code changes.

---

## Fix 1: Strip Duplicate Emoji from History Output

**File:** `packages/cli/src/commands/status.ts`
**Function:** `formatHistoryEntry()` (line ~218)

### Problem

Action text from rotation.json includes the role emoji (e.g., `🛡️ DELIVERED PR Triage...`), but we also display the role's emoji separately, creating:

```
#45  🛡️ The Guardian  🛡️ DELIVERED PR Triage Blitz...
```

### Solution

Strip leading emoji from action text before display.

### Code Change

Replace the `formatHistoryEntry` function:

```typescript
/**
 * Format a history entry for display.
 *
 * @param entry - History entry
 * @param roster - Team roster for emoji lookup
 * @returns Formatted string
 */
function formatHistoryEntry(
  entry: RotationHistoryEntry,
  roster: Roster
): string {
  const roleInfo = roster.roles.find(r => r.id === entry.role);
  const emoji = roleInfo?.emoji ?? '❓';
  const name = roleInfo?.name ?? entry.role;

  // Get action text and strip leading emoji if present
  // Emoji pattern: starts with emoji (surrogate pairs or emoji sequences)
  let action = entry.action ?? '';
  action = action.replace(
    /^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}\uFE0F]+\s*/u,
    ''
  );

  // Truncate at word boundary if too long
  if (action.length > 50) {
    const truncateAt = action.lastIndexOf(' ', 47);
    action = `${action.substring(0, truncateAt > 30 ? truncateAt : 47)}...`;
  }

  const actionSuffix = action ? `  ${action}` : '';
  return `  ${chalk.gray(`#${entry.cycle}`)}  ${emoji} ${chalk.cyan(name.padEnd(12))}${actionSuffix}`;
}
```

### Before/After

**Before:**

```
#55  🛡️ The Guardian  🛡️ DELIVERED PR #42 Merged + Branch Cleanup...
```

**After:**

```
#55  🛡️ The Guardian  DELIVERED PR #42 Merged + Branch Cleanup...
```

---

## Fix 2: Smarter Truncation at Word Boundaries

**Already included in Fix 1 above.** The truncation logic now finds the last space before character 47, but only if that space is after character 30 (to avoid over-truncation).

### Before/After

**Before:**

```
DELIVERED Demo Repository Phase 1 (Issue #41) — cr...
```

**After:**

```
DELIVERED Demo Repository Phase 1 (Issue #41)...
```

---

## Fix 3: Verbose Mode Shows 10 History Entries by Default

**File:** `packages/cli/src/commands/status.ts`
**Location:** In the command action handler (line ~348)

### Problem

`--verbose` shows the same 5 history entries as default. For verbose mode, 10 is more useful.

### Solution

If `--verbose` is set and `--history` wasn't explicitly provided, default to 10.

### Code Change

Replace the historyCount calculation in the action handler:

```typescript
.action(async (options: StatusOptions) => {
  const cwd = process.cwd();
  const agentsDir = path.resolve(cwd, options.dir);

  // Verbose mode defaults to 10 history entries if --history wasn't explicitly set
  const explicitHistory = process.argv.includes('--history') || process.argv.some(arg => arg.startsWith('--history='));
  const historyCount = explicitHistory
    ? parseInt(options.history ?? '5', 10)
    : (options.verbose ? 10 : 5);

  try {
    // ... rest unchanged
```

### Before/After

**Before (`ada status --verbose`):**

```
📊 Recent Activity (last 5 cycles)
```

**After (`ada status --verbose`):**

```
📊 Recent Activity (last 10 cycles)
```

---

## Fix 4: Remove Duplicate Default in init --help

**File:** `packages/cli/src/commands/init.ts`
**Location:** Template option (line ~67)

### Problem

```
-t, --template <name>  Template to use (default: "default") (default: "default")
```

Commander.js automatically shows the default value when one is provided.

### Solution

Remove the description-level default since Commander adds it.

### Code Change

```typescript
// Before
.option(
  '-t, --template <name>',
  'Template to use (default: "default")',
  'default'
)

// After
.option(
  '-t, --template <name>',
  'Template to use',
  'default'
)
```

### Before/After

**Before:**

```
-t, --template <name>  Template to use (default: "default") (default: "default")
```

**After:**

```
-t, --template <name>  Template to use (default: "default")
```

---

## Testing

After implementing, verify:

1. **Emoji fix:** `ada status` shows no duplicate emojis in history
2. **Truncation fix:** Long actions truncate at word boundaries
3. **Verbose fix:** `ada status --verbose` shows 10 entries, `ada status --verbose --history 3` shows 3
4. **Help fix:** `ada init --help` shows single default

### Test Commands

```bash
# Build
npm run build -w packages/cli

# Test emoji + truncation
ada status

# Test verbose default
ada status --verbose | grep "last.*cycles"

# Test explicit history override
ada status --verbose --history 3 | grep "last.*cycles"

# Test help
ada init --help | grep template
```

---

## Commit

```
refactor(cli): polish CLI UX for v1.0-alpha demo

- Strip leading emoji from history action text (avoids duplication)
- Truncate action text at word boundaries
- Default verbose mode to 10 history entries
- Fix duplicate default in init --help

Relates to #38
```

---

_🎨 The Architect — Implementation Guide for Issue #38 Quick Wins_
