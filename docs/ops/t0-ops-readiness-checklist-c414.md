# T-0 Ops Readiness Checklist

> **Created:** Cycle 414 (2026-02-11)
> **Author:** 🛡️ Ops (The Guardian)
> **Purpose:** Ops-specific verification for Feb 17 Go/No-Go decision
> **Companion:** `docs/qa/t0-go-nogo-qa-verification-protocol-c412.md`

---

## Overview

This checklist covers **infrastructure and CI/CD readiness** for the Go/No-Go decision. It complements QA's verification protocol (C412) which focuses on code quality and test health.

**Execution time:** ~10-15 minutes
**Outcome:** Ops concurrence for GO ✅ or flags blockers ❌

---

## Pre-T-0 Baseline (Verified C354)

| Check            | Status     | Last Verified |
| ---------------- | ---------- | ------------- |
| NPM_TOKEN secret | ✅ Valid   | C344          |
| Dry-run publish  | ✅ Pass    | C354          |
| CI/CD pipeline   | ✅ Healthy | C354          |
| GitHub Actions   | ✅ Green   | Ongoing       |

---

## T-0 Verification Checklist

### Phase 1: CI/CD Health (3 min)

```bash
# Check recent workflow runs
gh run list -L 5

# Verify no failing runs on main
gh run list --branch main -L 3 --status failure
```

**Pass criteria:**

- [ ] Last 3 CI runs on main: ✅ Pass
- [ ] No stuck/queued workflows
- [ ] No recent CI configuration changes that could affect publish

### Phase 2: Secret Verification (2 min)

```bash
# List repository secrets (requires admin)
gh secret list
```

**Pass criteria:**

- [ ] `NPM_TOKEN` present in secrets list
- [ ] No expired/revoked tokens (check npm account if uncertain)

### Phase 3: Publish Pipeline Validation (5 min)

**Option A: Re-run dry-run (Recommended)**

1. Go to: Actions → "Publish to npm" workflow
2. Click: "Run workflow"
3. Select: `dry_run: true`, `packages: all`
4. Verify: All jobs pass

**Option B: Quick validation (If time-constrained)**

```bash
# Verify packages pack correctly
cd ~/RIA/autonomous-dev-agents
npm run build
npm pack --workspace=packages/core --dry-run
npm pack --workspace=packages/cli --dry-run
```

**Pass criteria:**

- [ ] Dry-run publish completes without errors
- [ ] All quality gates pass in workflow
- [ ] Package contents include expected files

### Phase 4: Version Readiness (2 min)

```bash
# Confirm current versions
cat packages/core/package.json | grep '"version"'
cat packages/cli/package.json | grep '"version"'

# Verify 1.0.0-alpha.1 not already published
npm view @ada/core@1.0.0-alpha.1 version 2>/dev/null || echo "Not published (expected)"
npm view @ada/cli@1.0.0-alpha.1 version 2>/dev/null || echo "Not published (expected)"
```

**Pass criteria:**

- [ ] Current versions: `0.1.0` (pre-bump)
- [ ] Target version `1.0.0-alpha.1` not yet published
- [ ] Runbook available: `docs/ops/launch-day-publish-runbook.md`

### Phase 5: Infrastructure Dependencies (2 min)

**External services:**

- [ ] npmjs.com accessible (https://www.npmjs.com/)
- [ ] GitHub Actions operational (https://www.githubstatus.com/)

**Repository state:**

- [ ] main branch not protected with additional rules that block tagging
- [ ] No pending/stalled PRs that would block launch

---

## Decision Matrix

| Scenario                  | Verdict             | Action                            |
| ------------------------- | ------------------- | --------------------------------- |
| All checks pass           | **OPS GO ✅**       | Comment #26 with "🛡️ Ops GO ✅"   |
| CI failing on main        | **OPS NO-GO ❌**    | Fix CI before decision            |
| NPM_TOKEN missing/expired | **OPS NO-GO ❌**    | Human action required to re-add   |
| Dry-run publish fails     | **OPS NO-GO ❌**    | Diagnose and fix                  |
| External services down    | **OPS CONDITIONAL** | Note dependency, proceed if minor |

---

## Post-Verification Report Template

```markdown
## T-0 Ops Readiness — Feb 17, 2026

**Executed by:** 🛡️ Ops (Cycle XXX)
**Time:** HH:MM EST

### Results

| Check             | Status | Notes |
| ----------------- | ------ | ----- |
| CI/CD Health      | ✅/❌  |       |
| Secrets           | ✅/❌  |       |
| Publish Pipeline  | ✅/❌  |       |
| Version Readiness | ✅/❌  |       |
| External Services | ✅/❌  |       |

### Verdict

**[ ] OPS GO ✅** / **[ ] OPS NO-GO ❌** / **[ ] CONDITIONAL ⚠️**

Notes: [any caveats or observations]
```

---

## Coordination with QA

**Execution order on Feb 17:**

1. **Ops T-0 Checklist** (this document) — Infrastructure readiness
2. **QA T-0 Protocol** (C412) — Code quality and tests
3. **CEO Decision** — Final Go/No-Go based on both reports

**Combined criteria for GO:**

- Ops: All infrastructure checks pass
- QA: All quality gates pass
- CEO: Strategic readiness confirmed

---

## Historical Context

| Cycle | Action                     | Result   |
| ----- | -------------------------- | -------- |
| C334  | Launch Day Runbook created | —        |
| C344  | NPM_TOKEN configured       | ✅ Valid |
| C354  | T-7 Dry-run verification   | ✅ Pass  |
| C414  | T-0 Checklist created      | —        |
| T-0   | Execute checklist          | TBD      |

---

## Related Documents

- `docs/ops/launch-day-publish-runbook.md` — Feb 24 execution steps
- `docs/ops/t7-publish-verification.md` — Dry-run results from C354
- `docs/qa/t0-go-nogo-qa-verification-protocol-c412.md` — QA verification
- `docs/business/go-no-go-decision-framework-feb17.md` — CEO decision framework

---

_🛡️ The Guardian | Cycle 414_
