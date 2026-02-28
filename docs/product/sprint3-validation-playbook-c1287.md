# Sprint 3 Validation Playbook

> **Cycle:** 1287 | **Author:** 📦 Product | **Date:** 2026-02-28

Product's operational guide for validating Sprint 3 deliverables against acceptance criteria.

---

## Purpose

This playbook provides Product with:

1. **Checkpoints** — When to validate what
2. **Criteria** — What to verify at each checkpoint
3. **Commands** — How to verify (concrete steps)
4. **Escalation** — What to do when criteria fail

---

## Sprint 3 Overview

| Issue | Feature           | Days | Dependencies |
| ----- | ----------------- | ---- | ------------ |
| #181  | GitHub OAuth      | 1-2  | None         |
| #182  | Stripe Billing    | 3-4  | #181         |
| #189  | Managed Execution | 5-10 | #181, #182   |
| #190  | API Gateway       | 5-8  | #181         |

**Sprint Goal:** SaaS Container Complete — users can sign up, pay, and run managed cycles.

---

## Checkpoint Schedule

### Checkpoint 1: Day 3 (Mar 3)

**Focus:** Auth + Billing Foundation

#### #181 GitHub OAuth (Days 1-2)

| ID     | Criterion                 | Validation                                                           | Pass |
| ------ | ------------------------- | -------------------------------------------------------------------- | ---- |
| AUTH-1 | OAuth flow completes      | Click "Sign in with GitHub" → authorize → redirect → session created | ☐    |
| AUTH-2 | Session persists          | Refresh browser, session maintained                                  | ☐    |
| AUTH-3 | User profile displays     | Avatar, name, email from GitHub visible                              | ☐    |
| AUTH-4 | `ada login` CLI works     | Run `ada login`, browser opens, token captured                       | ☐    |
| AUTH-5 | Logout works              | Click logout, session cleared, redirected to login                   | ☐    |
| AUTH-6 | Error messages actionable | Force OAuth error, verify friendly message with CTA                  | ☐    |

**Verification Commands:**

```bash
# Check auth routes exist
curl -I https://staging.ada.dev/api/auth/signin
curl -I https://staging.ada.dev/api/auth/signout

# Test CLI auth (local)
ada login --help
```

**Escalation:** If AUTH-1 or AUTH-2 fails → P0 blocker, notify Engineering immediately.

#### #182 Stripe Billing (Days 3-4)

| ID     | Criterion               | Validation                                              | Pass |
| ------ | ----------------------- | ------------------------------------------------------- | ---- |
| BILL-1 | Free tier auto-created  | New signup → check database has Free subscription       | ☐    |
| BILL-2 | Pricing page renders    | Visit /pricing, all tiers displayed with correct prices | ☐    |
| BILL-3 | Checkout flow starts    | Click "Upgrade to Pro" → Stripe Checkout opens          | ☐    |
| BILL-4 | Webhook receives events | Use Stripe CLI to send test webhook, check logs         | ☐    |

**Verification Commands:**

```bash
# Check Stripe webhook endpoint
curl -I https://staging.ada.dev/api/webhooks/stripe

# Test webhook with Stripe CLI
stripe trigger checkout.session.completed
```

**Escalation:** If BILL-1 fails → blocks all paid features, P0 escalation.

---

### Checkpoint 2: Day 7 (Mar 7)

**Focus:** API Gateway + Execution Foundation

#### #190 API Gateway (Days 5-8)

| ID    | Criterion                | Validation                              | Pass |
| ----- | ------------------------ | --------------------------------------- | ---- |
| API-1 | Auth middleware works    | Request without token → 401             | ☐    |
| API-2 | Rate limiting active     | Exceed 60 req/min → 429                 | ☐    |
| API-3 | GET /repos returns data  | Authenticated request → repo list       | ☐    |
| API-4 | POST /dispatch/run works | Trigger dispatch → returns execution ID | ☐    |
| API-5 | OpenAPI docs accessible  | Visit /api/docs, Swagger UI renders     | ☐    |

**Verification Commands:**

```bash
# Test auth middleware
curl -H "Authorization: Bearer INVALID" https://staging.ada.dev/api/v1/repos

# Test rate limiting (run in loop)
for i in {1..70}; do curl -s https://staging.ada.dev/api/v1/health; done

# Check OpenAPI
curl https://staging.ada.dev/api/docs/openapi.json
```

#### #189 Managed Execution (Days 5-7 Foundation)

| ID     | Criterion               | Validation                              | Pass |
| ------ | ----------------------- | --------------------------------------- | ---- |
| EXEC-1 | Execution API exists    | POST /api/v1/dispatch/run → 200/201     | ☐    |
| EXEC-2 | Execution state tracked | GET /api/v1/dispatch/:id → status field | ☐    |
| EXEC-3 | Logs streamable         | SSE endpoint returns log events         | ☐    |

**Escalation:** If API-1 or API-2 fails → security risk, immediate fix required.

---

### Checkpoint 3: Day 10 (Mar 10)

**Focus:** Managed Execution MVP Complete

#### #189 Managed Execution (Full Validation)

| ID     | Criterion           | Validation                                   | Pass |
| ------ | ------------------- | -------------------------------------------- | ---- |
| EXEC-4 | Container spawns    | Trigger execution → K8s job created          | ☐    |
| EXEC-5 | Execution completes | Watch logs → "Cycle complete" message        | ☐    |
| EXEC-6 | Result stored       | GET execution → result field populated       | ☐    |
| EXEC-7 | Billing metered     | Check usage endpoint → cycle counted         | ☐    |
| EXEC-8 | Schedule works      | Create schedule → execution triggers at time | ☐    |

**Verification Commands:**

```bash
# Trigger manual execution
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://staging.ada.dev/api/v1/repos/123/dispatch

# Check usage
curl -H "Authorization: Bearer $TOKEN" \
  https://staging.ada.dev/api/v1/billing/usage
```

---

### Checkpoint 4: Day 14 (Mar 14) — Sprint End

**Focus:** End-to-End User Journey

#### Full Journey Test

| Step | Action                      | Expected              | Pass |
| ---- | --------------------------- | --------------------- | ---- |
| 1    | Visit ada.dev               | Landing page loads    | ☐    |
| 2    | Click "Sign in with GitHub" | OAuth flow starts     | ☐    |
| 3    | Authorize                   | Redirect to dashboard | ☐    |
| 4    | Connect repo                | Repo appears in list  | ☐    |
| 5    | Click "Run Cycle"           | Execution starts      | ☐    |
| 6    | Watch logs                  | Real-time updates     | ☐    |
| 7    | Cycle completes             | Success state         | ☐    |
| 8    | Check usage                 | 1 cycle used          | ☐    |
| 9    | Upgrade to Pro              | Stripe Checkout       | ☐    |
| 10   | Complete payment            | Pro tier active       | ☐    |

**This is the North Star test.** If all 10 steps pass → Sprint 3 goal achieved.

---

## Failure Protocols

### P0 Failure (Auth/Billing Core)

1. **Notify:** Slack/Discord Engineering channel immediately
2. **Block:** Stop downstream work until fixed
3. **Document:** Add blocker comment to GitHub issue
4. **Track:** Expect fix within 4 hours

### P1 Failure (Feature Gap)

1. **Document:** Comment on issue with specific failure
2. **Prioritize:** Engineering addresses next cycle
3. **Workaround:** Note if manual workaround exists

### P2 Failure (Polish)

1. **Document:** Create new issue or comment
2. **Defer:** Can ship without, fix in Sprint 4

---

## Success Metrics

| Metric          | Target     | How to Measure                 |
| --------------- | ---------- | ------------------------------ |
| Auth completion | <2 min     | Time from click to dashboard   |
| API latency     | <200ms P95 | Check Vercel analytics         |
| Execution start | <5s        | Time from trigger to "running" |
| Full journey    | <10 min    | End-to-end test timing         |

---

## References

- **Sprint 3 Feature Spec:** C1087
- **Auth UX Spec:** C1122
- **API Gateway ADR:** C1276
- **Managed Execution ADR:** C1086, C1226
- **Day 1 Brief:** C1283

---

_📦 Product — T-0 Validation Prep for Sprint 3_
