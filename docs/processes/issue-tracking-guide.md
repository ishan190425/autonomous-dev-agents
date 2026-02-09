# Issue Tracking Guide

> How to maintain proper issue tracking in the memory bank (R-013)

## Overview

**R-013: Issue Tracking Protocol** requires that all open GitHub issues are tracked in the memory bank's Active Threads section. This guide explains how to categorize issues, format entries, and maintain the Active Threads section.

## Why Issue Tracking Matters

- **Visibility:** Issues not in Active Threads are invisible to the team
- **Coordination:** Team can't prioritize what they can't see
- **Context:** Memory bank provides continuity across cycles
- **Compliance:** R-013 is a mandatory rule, enforced via FIRST CHECK

## Issue Categories

### Active (P0-P1, In Progress)

**Definition:** Issues that are currently being worked on or are high priority.

**Criteria:**
- Priority label: P0 or P1
- Currently in progress (has assignee or active PR)
- Blocking other work
- Part of current sprint

**Format:**
```markdown
- **#26** (P0, CEO, L) — v1.0-alpha Launch Coordination
- **#39** (P0, Growth, M) — Demo Asset Production
```

### Active (P2, Current Sprint)

**Definition:** Issues that are part of the current sprint but lower priority.

**Criteria:**
- Priority label: P2
- Sprint label or mentioned in sprint planning
- Should be completed this sprint

**Format:**
```markdown
- **#89** (P2, Ops, L) — Dev-to-Prod Migration System
- **#106** (P2, Scrum, S) — Issue Hygiene
```

### Backlog (P2-P3, Post-Launch)

**Definition:** Valid issues that are not currently prioritized.

**Criteria:**
- Priority label: P2 or P3
- Not part of current sprint
- Post-launch features
- Nice-to-have enhancements

**Format:**
```markdown
- **#73** (P3, Design, M) — CLI UX Polish
- **#18** (P2, Product, XL) — ADA Hub web dashboard
```

## Entry Format

### Standard Format

```markdown
- **#N** (Priority, Role, Size) — Brief description
```

**Components:**
- `#N` — Issue number (required)
- `Priority` — P0, P1, P2, or P3 (optional but recommended)
- `Role` — Which role should work on it (optional but recommended)
- `Size` — S (small), M (medium), or L (large) (optional)
- `Description` — Brief title or summary (required)

### Examples

```markdown
- **#26** (P0, CEO, L) — v1.0-alpha Launch Coordination
- **#39** (P0, Growth, M) — Demo Asset Production
- **#118** (P1, Engineering, M) — Heat Scoring Phase 4a
- **#73** (P3, Design, M) — CLI UX Polish
```

### Minimal Format

If priority/role/size are unknown:

```markdown
- **#120** — Agent Dashboard: Live Character Visualizations
```

## Priority Guidelines

### P0 (Critical)

- Blocking launch or critical milestone
- Security vulnerabilities
- Data loss or corruption risks
- Must be fixed immediately

### P1 (High)

- Important for current sprint
- Blocks other work
- User-facing bugs
- Core feature gaps

### P2 (Medium)

- Nice to have this sprint
- Quality improvements
- Documentation gaps
- Non-critical bugs

### P3 (Low)

- Post-launch features
- Polish and refinement
- Research topics
- Future enhancements

## Role Assignment

Assign issues to roles based on:

- **Issue labels:** `role:engineering`, `role:product`, etc.
- **Title keywords:** "research" → Research, "feat(cli)" → Engineering
- **Content:** What the issue is about
- **Playbook focus:** Which role's playbook covers this work

**Common Assignments:**
- `Engineering` — Code changes, features, bug fixes
- `Product` — Specs, user stories, prioritization
- `Research` — Technology evaluation, benchmarks
- `Ops` — CI/CD, infrastructure, deployments
- `Design` — UX, API design, architecture
- `QA` — Testing, quality gates
- `Scrum` — Sprint planning, retrospectives
- `CEO` — Strategy, launch coordination
- `Growth` — Marketing, fundraising, demos
- `Frontier` — Advanced features, memory systems

## Size Estimation

### S (Small) — 1-2 cycles

- Simple bug fixes
- Documentation updates
- Small refactors
- Quick enhancements

### M (Medium) — 3-5 cycles

- Feature implementations
- Moderate refactors
- Integration work
- Spec writing

### L (Large) — 6+ cycles

- Major features
- Architecture changes
- Large refactors
- Multi-phase work

## When to Add Issues

**Add to Active Threads when:**
- Issue is created on GitHub
- Issue becomes relevant (priority increases)
- Issue is assigned to current sprint

**Who adds:**
- **Product:** When creating new issues
- **Scrum:** During issue scoping (FIRST CHECK)
- **Any role:** When discovering untracked issues

## When to Remove Issues

**Remove from Active Threads when:**
- Issue is closed on GitHub
- Issue is resolved/merged
- Issue is no longer relevant

**Who removes:**
- **Ops:** When closing issues (FIRST CHECK)
- **Any role:** When issue is resolved

**Format for removal:**
- Simply delete the line from Active Threads
- Optionally move to "Recently Closed" section if significant

## Verification

### Manual Verification

```bash
# Get all open issues
gh issue list --state open --limit 200

# Check memory bank
cat agents/memory/bank.md | grep -A 100 "## Active Threads"

# Compare lists
```

### CLI Verification

```bash
# Verify compliance
ada issues verify

# Sync automatically
ada issues sync

# List categorized issues
ada issues list
```

## Common Mistakes

### ❌ Don't Do This

```markdown
- Issue #26 — Launch (missing priority, role, size)
- #26 Launch (missing formatting)
- Issue #26: Launch (inconsistent format)
```

### ✅ Do This

```markdown
- **#26** (P0, CEO, L) — v1.0-alpha Launch Coordination
```

## Active Threads Structure

The Active Threads section should be organized as:

```markdown
## Active Threads

### Active (P0-P1, In Progress)
- **#26** (P0, CEO, L) — v1.0-alpha Launch Coordination
- **#39** (P0, Growth, M) — Demo Asset Production

### Active (P2, Current Sprint)
- **#89** (P2, Ops, L) — Dev-to-Prod Migration System

### Backlog (P2-P3, Post-Launch)
- **#73** (P3, Design, M) — CLI UX Polish
- **#18** (P2, Product, XL) — ADA Hub web dashboard

### Recently Closed
- **#111** — CLI Dogfooding (CLOSED ✅)
```

## FIRST CHECK Protocol

**Every cycle, before acting:**

1. Run `gh issue list --state open --limit 200`
2. Read `agents/memory/bank.md` Active Threads section
3. Compare lists — every open issue MUST be in Active Threads
4. If missing, add immediately
5. If closed, remove immediately

**This is NON-NEGOTIABLE.** See DISPATCH.md Phase 3.

## Tools

### CLI Commands

- `ada issues verify` — Check compliance
- `ada issues sync` — Auto-update Active Threads
- `ada issues list` — Show categorized issues

### GitHub CLI

- `gh issue list --state open --limit 200` — Get all open issues
- `gh issue view <number>` — View issue details

## Troubleshooting

### Issue not showing in `gh issue list`

- Check if issue is actually open: `gh issue view <number>`
- Use `--limit 200` (default is 30)
- Check filters: `--state open`

### Can't find Active Threads section

- Check memory bank exists: `agents/memory/bank.md`
- Look for `## Active Threads` header
- May need to create section if missing

### Format parsing errors

- Ensure format: `**#N** (Priority, Role, Size) — Description`
- Use consistent formatting
- Run `ada issues verify` to check

## Related Documentation

- **R-013:** Issue Tracking Protocol (RULES.md)
- **DISPATCH.md:** Phase 3 — Situational Awareness
- **Scrum Playbook:** Issue Scoping FIRST CHECK
- **Product Playbook:** Issue Tracking FIRST CHECK
- **Ops Playbook:** Issue Cleanup FIRST CHECK

---

_Last updated: 2026-02-10 | See R-013 for full protocol_
