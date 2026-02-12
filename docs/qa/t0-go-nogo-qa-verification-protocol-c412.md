# T-0 Go/No-Go QA Verification Protocol

> **Created:** Cycle 412 (2026-02-11)
> **Author:** 🔍 QA (The Inspector)
> **Purpose:** Checklist for Feb 17 Go/No-Go final QA sign-off
> **Related:** #26 (Launch Coordination), #34 (E2E Testing)

---

## Overview

This document defines the **exact verification steps** QA will execute on Go/No-Go day (Feb 17, 2026) to provide final sign-off for v1.0-alpha launch on Feb 24.

**Execution time:** ~15-20 minutes
**Outcome:** GO ✅ or NO-GO ❌ with justification

---

## Pre-Verification State

| Check         | C402 Baseline | Expected T-0 |
| ------------- | ------------- | ------------ |
| TypeCheck     | ✅ Pass       | ✅ Pass      |
| Lint          | ✅ 0 errors   | ✅ 0 errors  |
| CLI Tests     | 355/355 ✅    | 355+ ✅      |
| Core Tests    | 735/735 ✅    | 787+ ✅      |
| Skipped Tests | 4             | ≤4           |

---

## T-0 Verification Checklist

### Phase 1: Build Verification (5 min)

```bash
# Clean build from scratch
cd ~/RIA/autonomous-dev-agents
git pull origin main
npm ci
npm run build
```

**Pass criteria:**

- [ ] `npm ci` completes without errors
- [ ] `npm run build` completes without errors
- [ ] No unexpected warnings in build output

### Phase 2: Type & Lint Verification (2 min)

```bash
npm run typecheck
npm run lint
```

**Pass criteria:**

- [ ] TypeCheck: 0 errors
- [ ] Lint: 0 errors (warnings acceptable)

### Phase 3: Test Suite Verification (10 min)

```bash
npm test
```

**Pass criteria:**

- [ ] CLI tests: All pass (355+ tests)
- [ ] Core tests: All pass (787+ tests)
- [ ] No new skipped tests without justification
- [ ] No flaky tests (run twice if uncertain)

### Phase 4: CLI Smoke Test (3 min)

Manual verification of core CLI commands:

```bash
# Test ada status
node packages/cli/dist/cli.js status

# Test ada dispatch status
node packages/cli/dist/cli.js dispatch status

# Test ada memory list
node packages/cli/dist/cli.js memory list
```

**Pass criteria:**

- [ ] `ada status` displays current rotation state
- [ ] `ada dispatch status` shows role information
- [ ] `ada memory list` returns memory entries
- [ ] No unhandled exceptions

### Phase 5: Package Verification (2 min)

```bash
# Verify package.json validity
npm pack --workspace=packages/cli --dry-run
npm pack --workspace=packages/core --dry-run
```

**Pass criteria:**

- [ ] Both packages pack without errors
- [ ] Package contents include all expected files

---

## Decision Matrix

| Scenario                   | Verdict      | Action                      |
| -------------------------- | ------------ | --------------------------- |
| All checks pass            | **GO ✅**    | Comment #26 with "QA GO ✅" |
| TypeCheck fails            | **NO-GO ❌** | File blocking issue         |
| Lint errors (not warnings) | **NO-GO ❌** | File blocking issue         |
| Test failures              | **NO-GO ❌** | File blocking issue         |
| CLI smoke test fails       | **NO-GO ❌** | File blocking issue         |
| Package errors             | **NO-GO ❌** | File blocking issue         |

---

## Post-Verification

### If GO ✅

1. Comment on #26: "🔍 QA T-0 VERIFICATION: GO ✅ — All checks pass"
2. Include summary:
   - TypeCheck: ✅
   - Lint: ✅ (X warnings)
   - Tests: CLI XXX/XXX ✅, Core XXX/XXX ✅
   - Smoke: ✅
   - Package: ✅
3. Update memory bank with verification timestamp

### If NO-GO ❌

1. Comment on #26: "🔍 QA T-0 VERIFICATION: NO-GO ❌ — [reason]"
2. Create blocking issue with:
   - Reproduction steps
   - Error output
   - Severity assessment
   - Estimated fix time
3. Notify CEO for launch timeline decision

---

## Contingency: Minor Issues

If issues are discovered that can be fixed within 2 hours:

1. Document as "CONDITIONAL GO" with fix required
2. Create fix issue with P0 priority
3. Re-run verification after fix
4. Final verdict: GO or NO-GO

---

## Verification Log Template

```markdown
## T-0 QA Verification — Feb 17, 2026

**Executed by:** 🔍 QA (Cycle XXX)
**Time:** HH:MM EST

### Results

| Check      | Status | Notes      |
| ---------- | ------ | ---------- |
| Build      | ✅/❌  |            |
| TypeCheck  | ✅/❌  |            |
| Lint       | ✅/❌  | X warnings |
| CLI Tests  | ✅/❌  | XXX/XXX    |
| Core Tests | ✅/❌  | XXX/XXX    |
| CLI Smoke  | ✅/❌  |            |
| Package    | ✅/❌  |            |

### Verdict

**[ ] GO ✅** / **[ ] NO-GO ❌**

Justification: [brief explanation]
```

---

## Historical Context

| Cycle | Action           | Result            |
| ----- | ---------------- | ----------------- |
| C392  | Full QA Audit    | ✅ All pass       |
| C402  | T-6 Health Check | ✅ No regressions |
| C412  | Protocol created | —                 |
| T-0   | Verification     | TBD               |

---

_This protocol ensures consistent, reproducible QA verification for launch decisions._
