# Agent Memory System

This document describes the memory and knowledge management system used by the ADA autonomous development team.

## Overview

The agent team maintains shared memory through structured markdown files. This enables continuity across dispatch cycles and preserves institutional knowledge.

## Memory Files

### agents/memory/bank.md

The **Memory Bank** is the shared brain of the team. Every role reads it at the start of their cycle.

**Structure:**

- **Header** — Version, cycle, last update timestamp, last compression
- **Current Status** — Active sprint, launch status, in-progress work
- **In Progress** — Active PRs and issues with status
- **Blockers** — Current blockers (ideally: None 🎉)
- **Role State** — What each role did last and what's next

### agents/memory/evolution-log.md

Tracks major milestones, phase transitions, and compression events. Updated at sprint boundaries.

### agents/memory/archives/

Archived versions of bank.md after compression. Format: `bank-YYYY-MM-DD-vN.md`

### agents/memory/banks/

Role-specific memory banks for frontier capabilities (e.g., `banks/frontier.md`).

## Memory Management

### Who Updates What

| Section        | Updated By | Frequency                    |
| -------------- | ---------- | ---------------------------- |
| Current Status | Any role   | When status changes          |
| In Progress    | Owner role | On progress                  |
| Blockers       | Any role   | When blockers emerge/resolve |
| Role State     | Own role   | Every cycle                  |

### Compression Rules

The Scrum role is responsible for memory compression. Trigger when:

1. **bank.md exceeds 200 lines** — Compress to ~100 lines
2. **Sprint boundary** — Archive old sprint, start fresh

**What to Keep:**

- Current Status (always current)
- In Progress (active items only)
- Role State (current state only)

**What to Archive:**

- Completed work
- Old Role State history
- Resolved blockers

### Compression Process

```bash
# 1. Archive current bank
cp agents/memory/bank.md agents/memory/archives/bank-$(date +%Y-%m-%d)-vN.md

# 2. Create fresh bank with compressed content
# 3. Update version header
# 4. Log compression in evolution-log.md
```

## Retrospectives

The Scrum role runs retrospectives every 5 cycles (see FIRST CHECK in scrum.md).

**Template:**

```markdown
## Retrospective: Cycles X-Y

### 🎯 Sprint Goals

- Goal 1 — status

### ✅ What Went Well

- Win 1

### 🔧 What Slowed Us Down

- Friction 1

### 📚 Lessons Learned

- Lesson 1

### 📊 Metrics

- Cycles: X
- PRs merged: Y
- Tests: Z
```

## FIRST CHECK Pattern

Every playbook has a FIRST CHECK section that defines what the role must check before taking any action. This ensures:

1. **PRs don't rot** — Ops/QA check for merge-ready PRs
2. **Reviews don't block** — Roles check for pending reviews
3. **Specs don't delay** — Research/Design check for blocking specs
4. **Retros happen** — Scrum enforces retrospective cadence

## Best Practices

1. **Write updates immediately** — Don't wait for next cycle
2. **Be specific** — Include cycle numbers, PR numbers, test counts
3. **Keep it current** — Remove completed items from In Progress
4. **Compress proactively** — Don't let bank.md become unwieldy
5. **Every role updates their state** — Don't rely on others to track you

## Version History

- v1-v6: Pre-Sprint 0 development
- v7: Sprint 0 complete, Sprint 1 active (current)
