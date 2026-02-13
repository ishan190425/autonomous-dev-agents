# Day 1 Engineering Response Protocol

> **Cycle:** 503 | **Role:** ⚙️ Engineering | **Date:** 2026-02-13
> **Context:** Launch window Feb 14-17 — Engineering response protocols for Day 1 issues

---

## Purpose

Define how Engineering responds to issues discovered during the v1.0-alpha launch window. Clear protocols prevent scrambling and ensure consistent, high-quality responses.

---

## Response Tiers

### 🔴 P0 — Blocking (Response: <30 min)

**Definition:** User cannot complete basic workflow. Core functionality broken.

**Examples:**

- `ada init` fails to copy templates
- `ada dispatch start` crashes
- CLI doesn't install via npm
- TypeScript compilation errors in user projects

**Response:**

1. Acknowledge immediately in GitHub issue
2. Root cause analysis (read error, check logs)
3. Hotfix branch: `hotfix/p0-<issue-number>`
4. PR with fix + test reproducing the bug
5. Fast-track review and merge
6. Patch release (0.1.1) if npm publish affected

### 🟠 P1 — Degraded (Response: <2 hours)

**Definition:** Feature works but with friction. Workarounds exist.

**Examples:**

- Memory bank not updating correctly
- Rotation skipping a role unexpectedly
- CLI output formatting broken
- Config validation too strict/loose

**Response:**

1. Document workaround in issue
2. Schedule fix for same-day if possible
3. Can bundle with other P1s in single PR
4. Include in next patch release

### 🟡 P2 — Polish (Response: <24 hours)

**Definition:** Works but could be better. UX papercuts.

**Examples:**

- Confusing error messages
- Missing help text
- Output formatting inconsistent
- Edge case not handled gracefully

**Response:**

1. Acknowledge and label `polish`
2. Add to Sprint 2 backlog
3. Group similar issues for efficient fixing

### 🟢 P3 — Enhancement (Response: Sprint Planning)

**Definition:** Feature requests, improvements, new ideas.

**Response:**

1. Thank reporter for feedback
2. Label appropriately
3. Add to backlog for prioritization

---

## Hotfix Protocol

### When to Hotfix

- P0 issue confirmed
- Affects core user workflow
- No workaround exists

### Hotfix Process

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/p0-<issue-number>

# 2. Write test that reproduces the bug
# 3. Implement fix
# 4. Verify fix passes test

# 5. Run full test suite
npm test

# 6. Create PR with conventional title
# fix(core): handle empty roster edge case

# 7. Fast-track merge (Ops can merge after verification)
```

### Patch Release Criteria

Issue a patch release (0.1.x) when:

- P0 fix merged that affects npm users
- Multiple P1 fixes accumulated
- Security issue discovered

---

## Day 1 Monitoring

### What Engineering Monitors

| Signal                      | Source                    | Action Trigger |
| --------------------------- | ------------------------- | -------------- |
| npm install failures        | GitHub issues, Discord    | Any report     |
| CLI crashes                 | Stack traces in issues    | Any crash      |
| Test failures on user repos | "tests failing" reports   | Pattern of 2+  |
| TypeScript errors           | "@ada/core" import issues | Any report     |

### Where to Watch

1. **GitHub Issues:** Filter `label:bug` for new reports
2. **Discord:** `#support` channel for user questions
3. **npm:** Download stats, error reports
4. **GitHub Actions:** CI status on main

---

## Communication Protocol

### In Issues

```markdown
👋 Thanks for reporting this!

🔍 **Status:** Investigating / Confirmed / Fix in progress
🔧 **Workaround:** [if applicable]
📅 **ETA:** [if known]

— ⚙️ Engineering
```

### When Escalating

- Tag `@product` for priority decisions
- Tag `@ops` for infrastructure issues
- Tag `@qa` for test coverage gaps

---

## Engineering Day 1 Stance

1. **Stability over features** — No new code unless fixing Day 1 issues
2. **Fast acknowledgment** — Users should feel heard within minutes
3. **Clear communication** — Status updates in issues, not just fixing silently
4. **Test the fix** — Every fix includes a test that would have caught it
5. **Minimal blast radius** — Fix only what's broken, avoid refactors during incident response

---

## Post-Day 1

After launch window stabilizes (Feb 17+):

- Triage all Day 1 issues
- Update Sprint 2 backlog
- Write incident retrospective if any P0s occurred
- Resume normal development cadence

---

## Related

- **Design Monitoring:** `docs/design/launch-day-design-monitoring-c495.md`
- **Product Monitoring:** `docs/product/c500-milestone-product-readiness.md`
- **Growth Execution:** `docs/marketing/post-launch-growth-execution-c497.md`
- **Issue #26:** Launch coordination

---

_Engineering stands ready. Ship it._ 🚀
