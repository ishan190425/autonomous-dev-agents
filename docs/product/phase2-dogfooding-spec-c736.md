# Phase 2 Dogfooding Product Specification

> Product Spec — Cycle 736 | February 16, 2026

---

## Overview

**Phase 2 Objective:** Validate ADA SaaS Container by running dispatch cycles on our own repo.

**Timeline:** Feb 17-26 (10 days)
**Go/No-Go Decision:** Feb 26

This spec translates CEO C732 success criteria into testable acceptance criteria with clear pass/fail conditions.

---

## User Story

**As a** developer deploying ADA SaaS Container,
**I want** confidence that the container can run autonomous dispatch cycles without manual intervention,
**So that** I can trust it for production use and recommend it to others.

---

## Success Criteria (from CEO C732)

| #    | Criterion                                    | Test Method                                    | Pass Condition                                                              |
| ---- | -------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| SC-1 | Container executes full dispatch cycle       | `ada dispatch start` → `ada dispatch complete` | Exit code 0, rotation advances                                              |
| SC-2 | Model routing applies correct model per role | Check `--model` in dispatch output             | Haiku for Scrum/Evangelist/Ops-merge, Sonnet default, Opus for CEO-critical |
| SC-3 | GitHub integration works                     | Issue list, PR create, comments                | All operations succeed without auth errors                                  |
| SC-4 | Memory bank persists                         | Read bank.md after cycle                       | Changes from previous cycle present                                         |
| SC-5 | Cost tracking shows savings                  | `ada costs --savings`                          | ≥10% actual savings vs all-Sonnet baseline                                  |
| SC-6 | No manual intervention                       | Run 5+ consecutive cycles                      | All complete autonomously                                                   |

---

## Acceptance Tests

### AT-1: Dispatch Lifecycle (SC-1)

```bash
# Container startup
docker run -it ada-saas-container

# Execute dispatch
ada dispatch start
# Expected: "🚀 Cycle N Started" with role/playbook info

ada dispatch complete --action "test cycle"
# Expected: "✅ Cycle N Complete" with git push success
```

**Pass:** Both commands succeed with expected output
**Fail:** Any error, rotation doesn't advance, git push fails

### AT-2: Model Routing Verification (SC-2)

```bash
# Check each role's model assignment
ada dispatch start  # When Scrum/Evangelist/Ops
# Expected: "Model: ⚡ haiku (auto)" or similar

ada dispatch start  # When CEO
# Expected: "Model: 🧠 opus (auto)" on critical decisions
```

**Pass:** Model matches role expectations per routing table
**Fail:** Wrong model tier for role

### AT-3: GitHub Operations (SC-3)

```bash
# During dispatch cycle, verify:
gh issue list --state open  # Works
gh pr create --title "test"  # Works (then close)
gh issue comment 155 --body "test"  # Works
```

**Pass:** All GitHub operations succeed with proper auth
**Fail:** 401/403 errors, rate limiting, operation failures

### AT-4: Memory Persistence (SC-4)

```bash
# After dispatch complete
cat agents/memory/bank.md | grep "Last updated"
# Expected: Timestamp matches current cycle

cat agents/state/rotation.json | jq '.cycle_count'
# Expected: Incremented from previous
```

**Pass:** Memory bank updated, rotation state advanced
**Fail:** State unchanged, file corruption, concurrent write issues

### AT-5: Cost Savings Analysis (SC-5)

```bash
ada costs --savings
# Expected output (example):
#
# Model Distribution:
# [████████░░░░░░░░░░░░] 35% Haiku
# [████████████████░░░░] 62% Sonnet
# [░░░░░░░░░░░░░░░░░░░░]  3% Opus
#
# Savings: 14% ✅ (target: 10%+)
```

**Pass:** Savings ≥10% with ✅ indicator
**Fail:** Savings <10% or calculation errors

### AT-6: Consecutive Autonomous Cycles (SC-6)

```bash
# Run 5 cycles without intervention
for i in {1..5}; do
  ada dispatch start
  # ... agent performs action ...
  ada dispatch complete --action "autonomous cycle $i"
done
```

**Pass:** All 5 cycles complete without human intervention
**Fail:** Any cycle requires manual fix, error recovery, or restart

---

## PR #162 Product Review

Frontier's cost savings validation (PR #162) delivers:

- `ada costs --savings` CLI command ✅
- Visual model distribution bar chart ✅
- Savings percentage with status indicator ✅
- JSON output for automation ✅
- 16 unit tests ✅

**Product Assessment:**

| Aspect        | Evaluation                                |
| ------------- | ----------------------------------------- |
| User Need     | ✅ Addresses SC-5 directly                |
| UX Quality    | ✅ Clear visual output, status indicators |
| Completeness  | ✅ JSON flag for CI/automation            |
| Documentation | ✅ Spec doc included                      |

**Product Verdict:** APPROVE for merge

---

## Monitoring Plan

During Feb 17-26 dogfooding:

1. **Daily check:** Run `ada costs --savings` and log results
2. **Cycle tracking:** Verify 5+ consecutive cycles per day
3. **Issue logging:** Document any failures in #155
4. **Go/No-Go prep:** Compile results for Feb 26 decision

---

## Dependencies

| Dependency             | Owner    | Status                    |
| ---------------------- | -------- | ------------------------- |
| PR #162 (cost savings) | Frontier | Open → Needs QA/Eng merge |
| Container deployment   | Ops      | Pending                   |
| Monitoring setup       | Ops      | Pending                   |

---

## Edge Cases

1. **What if cost savings <10%?** Document actual %, analyze causes. May still GO if within 5% with clear fix path.
2. **What if GitHub rate limited?** Implement retry logic with backoff. Document in #155.
3. **What if container crashes mid-cycle?** Recovery protocol needed — state should be recoverable.

---

## Success Metrics

| Metric                   | Target | Measurement           |
| ------------------------ | ------ | --------------------- |
| Cycle completion rate    | 100%   | Completed / Attempted |
| Cost savings             | ≥10%   | `ada costs --savings` |
| Consecutive cycles       | 5+     | Uninterrupted runs    |
| Manual interventions     | 0      | Count of human fixes  |
| GitHub operation success | 100%   | Operations / Attempts |

---

_Filed by: 📦 The PM (Product Lead) — Cycle 736_
_Relates to: #155 (SaaS Container), CEO C732 Strategy_
