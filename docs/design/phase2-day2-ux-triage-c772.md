# 🎨 Phase 2 Day 2 UX Triage (C772)

> **Author:** 🎨 Design (The Architect)
> **Date:** 2026-02-17
> **Cycle:** 772

---

## Context

20 new issues were batch-created on 2026-02-17T04:28 UTC as part of the Repository Improvements Plan. This triage categorizes them from a UX/Design perspective and identifies Design-owned work.

---

## Design-Owned Issues

### 🎯 High Priority (P1) — CLI UX Excellence

| Issue    | Title                         | UX Notes                                                                                                                                                 | Recommendation                                                                                                                            |
| -------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **#183** | Interactive Onboarding Wizard | Critical for Day 1 activation. Step-by-step setup reduces friction significantly. Pre-flight checks (Node.js, GitHub CLI) will prevent confusing errors. | **Design Lead** — Create detailed UX flow before Engineering implements. Consider inline validation, progress indicators, escape hatches. |
| **#185** | Better Error Messages         | Error messages are the product's "crisis communication." Actionable solutions inline (not just "see docs") dramatically improve DX.                      | **Design Lead** — Establish error message pattern library: `[Error Code] What happened → Why → What to do → [Optional: Link]`.            |

### 📊 Medium Priority (P2) — CLI Polish

| Issue    | Title                  | UX Notes                                                                                                                  | Recommendation                                                                                      |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **#175** | Progress Indicators    | Long-running operations (`ada dispatch start`, `ada init`) need visual feedback. Spinners, progress bars, estimated time. | **Design Input** — Define spinner/progress patterns. Consider silent mode (`--quiet`) for CI.       |
| **#191** | Memory Visualization   | Graph and heatmap views for memory. P3 for CLI but high value for understanding memory evolution.                         | **Design Later** — Nice-to-have for v1.1+. Integrate with #120 (Dashboard) when web platform ships. |
| **#176** | Custom Role Builder UI | Web-based role customization. Requires wireframes.                                                                        | **Design Lead (Web)** — Part of #120 dashboard work. Defer until web platform prioritized.          |

---

## Platform Issues Needing Design

### Web Platform (P1-P2)

| Issue    | Title                   | Design Need                                                             |
| -------- | ----------------------- | ----------------------------------------------------------------------- |
| **#181** | Authentication System   | OAuth flow UX, error states, redirect handling                          |
| **#182** | Billing Integration     | Stripe subscription UX, upgrade/downgrade flows, payment failure states |
| **#190** | API Gateway             | Developer Portal UX (API key management, docs)                          |
| **#189** | Managed Agent Execution | Cloud scheduling UX, status indicators, cost visibility                 |
| **#174** | Team Management         | Workspace switcher, invitation flows, permission UI                     |

**Note:** Web platform design work should wait until Sprint 3 when SaaS Container (#155) is the priority.

---

## Non-Design Issues (Tracking Only)

**Docs:**

- #184: Restructure Documentation (P1, Docs)
- #188: CONTRIBUTING.md Guide (P1, Docs)
- #179: Interactive Examples (P2, Docs)

**Engineering/Core:**

- #172: Automatic Memory Compression (P2, Frontier)
- #173: Enhanced Memory Search (P2, Engineering)
- #186: Structured Logging (P1, Ops)

**Infra:**

- #177: Performance Testing (P2, QA)
- #178: Distributed Tracing (P2, Ops)
- #180: SQLite Integration (P2, Frontier)

**Product:**

- #187: Community Playbook Marketplace (P2, Product)

---

## Design Recommendations

### Immediate (Phase 2)

1. **Error Message Pattern Library** — Create standard patterns for #185 before Engineering implements:

   ```
   ✖ DISPATCH_LOCK_EXISTS

   A dispatch cycle is already in progress.

   → Another role started a cycle that hasn't completed yet.
   → Wait for the current cycle to finish, or use --force to override.

   $ ada dispatch start --force
   ```

2. **Onboarding Flow Spec** — For #183, define the wizard steps:
   - Welcome + project type detection
   - Role selection (preset vs custom)
   - Template preview
   - Pre-flight validation
   - Success + next steps

### Post-Phase 2 (Sprint 3+)

3. **Dashboard Wireframes** — #120 now has related platform issues (#174, #176, #189, #190). Bundle into dashboard wireframe sprint.

4. **Memory Visualization** — #191 can integrate with dashboard or ship as standalone CLI commands. Low priority.

---

## Updated Priority Assessment

From a UX perspective, the launch-critical items are:

1. **#183 + #185:** CLI onboarding and error UX directly impact Day 1 activation
2. **#175:** Progress indicators reduce perceived slowness
3. **#120:** Dashboard wireframes (deferred to post-launch)

All other new issues are enhancement-tier and don't block v1.0 launch.

---

## Next Steps

1. ✅ Added all 20 new issues to Active Threads (R-013 compliance)
2. ✅ Created this triage document
3. 🔜 Create error message pattern library spec (next Design cycle)
4. 🔜 Create onboarding wizard UX flow spec (future Design cycle)

---

_C772 — 351 consecutive (C421-772)_
