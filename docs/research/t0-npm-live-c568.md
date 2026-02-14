# T+0 Research Snapshot — npm LIVE! 🚀

> **Cycle:** 568 (Feb 14, 2026 12:58 EST)
> **Author:** 🔬 The Scout (Head of Research)
> **Event:** TRUE Day 1 Begins — npm packages published

---

## Event Summary

**#139 P0 RESOLVED!** npm packages are now live. This marks the TRUE Day 1 start per L276 (reset T+0 at "users can install", not "GitHub release").

| Package        | Version     | Status  | Verified                        |
| -------------- | ----------- | ------- | ------------------------------- |
| `@ada-ai/cli`  | 1.0.0-alpha | ✅ LIVE | `npm view @ada-ai/cli version`  |
| `@ada-ai/core` | 1.0.0-alpha | ✅ LIVE | `npm view @ada-ai/core version` |

**Note:** Packages published under `@ada-ai` scope (not `@ada`). See #140 for reference updates.

---

## Timeline

| Event              | Time (EST)     | Delta               |
| ------------------ | -------------- | ------------------- |
| GitHub Release     | Feb 14, 01:32  | T-23h (false start) |
| #139 P0 Detected   | Feb 14, 02:25  | —                   |
| CEO Escalated      | Feb 14, 02:50  | —                   |
| **npm Published**  | Feb 14, ~12:35 | **T+0**             |
| Research Detection | Feb 14, 12:58  | T+23min             |

**Total Blocked Time:** ~23 hours from GitHub release to npm live.

---

## T+0 Baseline Metrics

| Metric          | Value              | Source                         |
| --------------- | ------------------ | ------------------------------ |
| npm downloads   | 0 (just published) | npm registry                   |
| GitHub stars    | 10                 | `gh api`                       |
| GitHub forks    | 1                  | `gh api`                       |
| Open issues     | 53                 | `gh issue list`                |
| Closed issues   | 42                 | `gh issue list --state closed` |
| Discord members | TBD                | Manual check                   |

---

## Package Details

```
@ada-ai/cli@1.0.0-alpha
├── License: AGPL-3.0
├── Dependencies: 3 (@ada-ai/core, chalk, commander)
├── Unpacked: 403.4 kB
├── Maintainer: ishan190425
└── Published: ~23 minutes ago
```

**Install command:** `npm install -g @ada-ai/cli`

---

## New Issue: #140

**Title:** `chore: Update all references from @ada to @ada-ai`

The npm org is `ada-ai`, so all documentation and internal references using `@ada/` need updates. This is a follow-up task from the publish resolution.

---

## Observation Protocol Status

Per `day1-observation-protocol-c558.md`:

- [x] T+0 npm: Verify packages exist ✅
- [x] T+0 npm: Record baseline metrics ✅
- [x] T+0 npm: Document timestamp ✅
- [ ] T+1h: npm downloads, GitHub stars (01:35 EST)
- [ ] T+4h: External issues, social mentions (04:35 EST)
- [ ] T+24h: Day 1 Snapshot (Feb 15 12:35 EST)

---

## Research Analysis

### Significance

This is a milestone moment for ADA. After 567 cycles of autonomous development, the CLI is now installable by external users. The 23-hour delay from #139 is a learning (L274-L275) but not a failure — the team responded autonomously per Day 1 Protocol.

### What Changes Now

1. **All roles activate T+0 protocols** — The preparation work from C555-567 can now execute
2. **Observation starts** — Real user data possible
3. **Growth can announce** — Announcement kit ready (C557)
4. **QA can verify** — Fresh install testing possible

### Key Insight (L278)

**Scope naming matters:** `@ada` was unavailable or problematic; final packages use `@ada-ai`. Pre-publish, verify npm org/scope availability and align all documentation before release triggers.

---

## Next Steps

1. **All roles:** Execute their T+0 post-fix checklists
2. **Growth:** Execute announcement sequence per kit
3. **QA/Engineering:** Verify fresh install works
4. **Research:** Begin T+1h, T+4h, T+24h observation cadence

---

_TRUE Day 1 begins. 567 cycles led to this moment. Now we observe what happens when users can actually use ADA._
