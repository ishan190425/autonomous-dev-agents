# CLI Memory UX Audit — Phase 1 Review

> UX audit of `ada memory search` and `ada memory list` (PR #47)
> Audit conducted: 2026-02-05 | Design Cycle 66 | 🎨 The Architect

## Overview

Reviewed the `ada memory` CLI commands to identify UX issues and inform Phase 2 (`ada memory stats`) development.

**Testing context:** Ran commands against `~/RIA/autonomous-dev-agents` (live ADA repo with real memory bank).

---

## Issue 1: Parser-Format Mismatch (Critical)

**Observed:** Memory entries are garbled or misattributed.

```bash
$ ada memory list --kind decision --limit 5
📚 Memory Entries (1 of 1 total)

📋 DECISION (1)
  decision-Priority
    Priority: Issue
    Status · Title · [architecture, decision]
```

**Expected:** Should parse the Backlog Priority table correctly.

**Root cause:** The `extractDecisions()` function expects a 4-column ADR table:

```
| ID | Decision | Date | Author |
```

But the bank.md has a different table format:

```
| Priority | Issue | Title | Status |
```

The regex `^\|\s*([\w-]+)\s*\|\s*(.+?)\s*\|\s*([\w-]+)\s*\|\s*([\w]+)\s*\|$` incorrectly matches any 4-column table.

**Fix:** Either:

- A) Add section-aware extraction (only parse ADR tables under `## Architecture Decisions`)
- B) Add table type detection based on header row

**Priority:** P1 — This causes confusing output for users

---

## Issue 2: Blocker Parsing Bug (Critical)

**Observed:**

```bash
$ ada memory list --limit 10
🚧 BLOCKER (4)
  blocker-1
    None 🎉
  blocker-2
    --
  blocker-3
    --
```

**Expected:** No blocker entries when the section says "None 🎉"

**Root cause:** The `extractBlockers()` function splits by newlines and filters for lines starting with `-`:

```typescript
const items = blockerSection[1]
  .split('\n')
  .filter(l => l.trim().startsWith('-') && !l.includes('(none)'));
```

The bank.md says `- None 🎉`, but the filter checks for `(none)`, not `None`.

**Fix:** Update the filter to handle common "no blockers" patterns:

```typescript
.filter((l) => l.trim().startsWith('-') &&
  !l.toLowerCase().includes('none') &&
  !l.includes('🎉'))
```

**Priority:** P0 — False positives for blockers is misleading

---

## Issue 3: Missing Role Detection (Major)

**Observed:** Almost all entries show `unknown` role.

```bash
$ ada memory search "PR merge" --verbose
[ 31%] 📊 completed-1
       Role: unknown
```

**Root cause:** The `extractRoleStates()` regex expects:

```
### .+? — The (\w+)
```

But the actual bank.md format is:

```
### 👔 CEO
### 🔬 Research
```

The emoji-based headings don't match the `— The X` pattern.

**Fix:** Update regex to handle both patterns:

```typescript
/### (?:.+? — The )?(\w+)/;
```

Or better: extract role from the emoji mapping in roster.json.

**Priority:** P1 — Role attribution is core to memory usefulness

---

## Issue 4: Inconsistent Verbose Flag (UX Polish)

**Observed:**

```bash
$ ada memory search --verbose   # ✅ Works
$ ada memory list --verbose     # ❌ Unknown option
```

**Expected:** Both commands should support `--verbose` for consistency.

**Fix:** Add `--verbose` to `list` command to show full entry details.

**Priority:** P2 — UX consistency

---

## Issue 5: Low Default Threshold (UX Tuning)

**Observed:** Search returns low-confidence matches:

```bash
[ 31%] 📊 completed-2
       PR #21 merged:
```

31% similarity is barely above the 30% default threshold. These results are often irrelevant.

**Recommendation:** Raise default threshold from 0.3 to 0.5 for better signal-to-noise. Users can lower it explicitly with `-t 0.3` for broader searches.

**Priority:** P2 — Improves out-of-box experience

---

## Issue 6: Content Truncation in List (Minor)

**Observed:** Completed items show truncated content ending with `:`:

```
completed-3
  PR #20 merged:
```

The colon suggests content was cut mid-sentence.

**Recommendation:** The `extractCompletedItems()` regex `\*\*(.+?)\*\*` only captures the bold portion. Should capture the full line including details after the bold text.

**Priority:** P3 — Minor polish

---

## Recommendations for Phase 2

1. **Fix P0/P1 parsing bugs** before adding `ada memory stats`
2. **Add section-aware extraction** — parse tables only within their expected sections
3. **Improve role detection** — handle emoji headings or extract from roster.json mapping
4. **Harmonize flags** — both commands should support `--verbose`, `--json`, `--role`, `--kind`
5. **Add `--no-archived`** — option to exclude archived banks from search
6. **Consider caching** — indexing 10 archived banks every search is expensive

---

## Test Commands Used

```bash
ada memory list --limit 5
ada memory list --kind decision
ada memory list --kind lesson --verbose  # Fails
ada memory list --json --limit 3
ada memory search "launch" --limit 5
ada memory search "PR merge" --verbose --limit 3
```

---

_Audit by 🎨 Design — Cycle 66_
