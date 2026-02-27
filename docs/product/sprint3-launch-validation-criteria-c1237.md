# Sprint 3 Launch Validation Criteria (C1237)

> **Product Sign-Off Framework** — UAT scenarios, success metrics, and go-live checklist.
> Created: 2026-02-27 | Author: 📦 Product (The PM)
> Per L718: "T-2 front-loading at scale eliminates Day 1 ambiguity."
> Complements: sprint3-implementation-playbook-c1207.md (technical runbook)

---

## Executive Summary

Sprint 3 delivers the **SaaS Container** — ADA's first revenue-generating product.

**Implementation playbook (C1207):** WHAT to build each day.
**This document:** HOW to validate it works and WHEN to launch.

**Launch Window:** Mar 15-17 (contingent on Go-Live criteria)
**North Star:** First MRR by Mar 31

---

## 1. Feature Acceptance Matrix

Each Sprint 3 feature has explicit acceptance criteria. Product signs off when ALL scenarios pass.

### 1.1 GitHub OAuth Authentication (#181)

| Scenario           | User Flow                                        | Expected Outcome                                         | Status |
| ------------------ | ------------------------------------------------ | -------------------------------------------------------- | ------ |
| **Happy Path**     | Click "Sign in with GitHub" → Authorize → Return | Dashboard loads with user avatar + name                  | ⬜     |
| **New User**       | First-time login                                 | Account created, Free tier assigned, welcome state shown | ⬜     |
| **Returning User** | Login after session expires                      | Session restored, previous state preserved               | ⬜     |
| **Auth Denied**    | User clicks "Cancel" on GitHub                   | Error page with retry option, no broken state            | ⬜     |
| **Invalid State**  | Tampered callback URL                            | Graceful error, no security leak                         | ⬜     |
| **Rate Limit**     | 10+ rapid login attempts                         | Rate limit message, no account lockout                   | ⬜     |

**Sign-Off Criteria:**

- [ ] All 6 scenarios pass manually
- [ ] E2E tests cover happy path + error cases
- [ ] Error pages match C1202 design spec
- [ ] Session persists across browser restart

### 1.2 Stripe Billing Integration (#155)

| Scenario            | User Flow                             | Expected Outcome                                  | Status |
| ------------------- | ------------------------------------- | ------------------------------------------------- | ------ |
| **View Plans**      | Click "Upgrade" from dashboard        | Pricing page shows Free vs Pro ($29/mo)           | ⬜     |
| **Checkout**        | Select Pro → Enter card (test)        | Stripe Checkout opens, prefilled email            | ⬜     |
| **Success**         | Complete payment                      | Redirect to dashboard, tier = Pro, success toast  | ⬜     |
| **Cancel Checkout** | Close Stripe modal                    | Return to pricing, no charge, tier unchanged      | ⬜     |
| **Portal Access**   | Click "Manage Subscription"           | Stripe Portal opens with current plan             | ⬜     |
| **Downgrade**       | Cancel in Portal                      | Tier reverts to Free at period end, message shown | ⬜     |
| **Webhook: Paid**   | Stripe sends `invoice.paid`           | Usage quota resets, tier confirmed                | ⬜     |
| **Webhook: Failed** | Stripe sends `invoice.payment_failed` | Grace period starts, user notified                | ⬜     |

**Sign-Off Criteria:**

- [ ] All 8 scenarios pass with test cards
- [ ] Stripe webhook signature verified
- [ ] No double-charges possible (idempotency)
- [ ] Billing portal accessible from account settings

### 1.3 Dashboard MVP (#155, C1197)

| Scenario         | User Flow                   | Expected Outcome                             | Status |
| ---------------- | --------------------------- | -------------------------------------------- | ------ |
| **First Visit**  | New user lands on dashboard | Empty state with "Connect Repository" CTA    | ⬜     |
| **Connect Repo** | Click connect → Select repo | Repository added, agents visible             | ⬜     |
| **View Cycles**  | Click on repository card    | Cycle history timeline loads                 | ⬜     |
| **Run Dispatch** | Click "Run Cycle"           | Cycle queued, progress indicator shows       | ⬜     |
| **View Results** | Cycle completes             | Result card with action summary, memory diff | ⬜     |
| **Usage Stats**  | View account page           | Cycles used/remaining, tier badge            | ⬜     |

**Sign-Off Criteria:**

- [ ] All 6 scenarios pass end-to-end
- [ ] Dashboard loads in <2s (P95)
- [ ] Mobile responsive (375px-1440px)
- [ ] Accessible: keyboard nav, screen reader labels

### 1.4 Managed Agent Execution (#189)

| Scenario        | User Flow                       | Expected Outcome                              | Status |
| --------------- | ------------------------------- | --------------------------------------------- | ------ |
| **Queue Job**   | Trigger dispatch via UI         | Job appears in queue, pending state           | ⬜     |
| **Execute Job** | Worker picks up job             | Container spins up, cycle runs                | ⬜     |
| **Success**     | Cycle completes                 | Result stored, UI updates, logs available     | ⬜     |
| **Timeout**     | Cycle exceeds 5min              | Job killed, partial result saved, error shown | ⬜     |
| **Rate Limit**  | Free user exceeds 10 cycles/day | Job rejected with upgrade prompt              | ⬜     |
| **Retry**       | Transient failure (network)     | Auto-retry once, then fail gracefully         | ⬜     |

**Sign-Off Criteria:**

- [ ] All 6 scenarios pass with test repository
- [ ] Container isolation verified (no cross-job leakage)
- [ ] Logs accessible for debugging
- [ ] Queue depth visible in admin view

### 1.5 REST API Gateway (#190)

| Scenario          | API Call                           | Expected Outcome           | Status |
| ----------------- | ---------------------------------- | -------------------------- | ------ |
| **Auth: Valid**   | `GET /api/v1/me` with Bearer token | User object returned       | ⬜     |
| **Auth: Invalid** | `GET /api/v1/me` with bad token    | 401 Unauthorized           | ⬜     |
| **Auth: Missing** | `GET /api/v1/me` no token          | 401 with auth instructions | ⬜     |
| **Rate Limit**    | 100+ requests/minute               | 429 Too Many Requests      | ⬜     |
| **CORS**          | Request from allowed origin        | Preflight passes           | ⬜     |
| **CORS Block**    | Request from unknown origin        | Preflight fails            | ⬜     |

**Sign-Off Criteria:**

- [ ] All 6 scenarios pass via curl/Postman
- [ ] OpenAPI spec generated and accurate
- [ ] Rate limits documented in API docs
- [ ] API keys revocable from account settings

---

## 2. Success Metrics

### 2.1 Launch Week Targets (Mar 15-21)

| Metric                | Target | Stretch | Measurement                     |
| --------------------- | ------ | ------- | ------------------------------- |
| **Signups**           | 25     | 50      | Unique GitHub auth completions  |
| **Trial Activations** | 15     | 30      | Users who run ≥1 cycle          |
| **Pro Conversions**   | 3      | 5       | Completed Stripe checkouts      |
| **MRR**               | $87    | $145    | Stripe dashboard                |
| **Bounce Rate**       | <60%   | <40%    | Users who auth but never return |
| **Error Rate**        | <2%    | <1%     | Server 5xx / total requests     |

### 2.2 Sprint 3 End Targets (Mar 14)

| Metric                  | Target  | Source           |
| ----------------------- | ------- | ---------------- |
| **Auth Success Rate**   | >98%    | Sentry + logs    |
| **Checkout Completion** | >80%    | Stripe analytics |
| **Dashboard Load Time** | <2s P95 | Vercel analytics |
| **API Uptime**          | >99.5%  | Uptime monitor   |
| **E2E Test Pass Rate**  | 100%    | CI/CD            |

### 2.3 North Star (Mar 31)

| Metric               | Target | Notes                       |
| -------------------- | ------ | --------------------------- |
| **Paying Customers** | ≥5     | Per C1233 outreach strategy |
| **MRR**              | ≥$100  | First revenue milestone     |
| **Design Partners**  | ≥3     | Active feedback providers   |

---

## 3. Go-Live Checklist

**ALL items must be ✅ before public launch announcement.**

### 3.1 Technical Readiness

- [ ] All E2E tests passing in CI
- [ ] Staging environment mirrors production
- [ ] Database migrations applied cleanly
- [ ] Stripe webhooks verified with CLI
- [ ] Error tracking (Sentry) configured
- [ ] Uptime monitoring active
- [ ] SSL certificates valid
- [ ] CORS configured for production domain

### 3.2 Product Readiness

- [ ] All UAT scenarios in Section 1 pass ✅
- [ ] Empty states have clear CTAs
- [ ] Error messages are user-friendly
- [ ] Loading states prevent double-submission
- [ ] Mobile experience acceptable (not broken)
- [ ] Pricing page accurate ($29/mo Pro)

### 3.3 Content Readiness

- [ ] Landing page live (or GitHub README updated)
- [ ] Docs site updated with SaaS quickstart
- [ ] FAQ covers billing questions
- [ ] Support email configured
- [ ] Terms of Service / Privacy Policy linked

### 3.4 Launch Coordination

- [ ] CEO reviewed Go-Live checklist
- [ ] Growth has launch thread ready (C1234)
- [ ] First outreach list prepared (C1233)
- [ ] Design Partner invites drafted
- [ ] Launch day monitoring plan in place

---

## 4. UAT Script

**Pre-Launch Manual Test Sequence** — Run by Product + QA before Go-Live.

### Full User Journey (30 min)

```
1. LANDING
   - Visit homepage/README
   - Click "Get Started" or "Sign Up"

2. AUTH
   - Click "Sign in with GitHub"
   - Authorize ADA OAuth app
   - Verify dashboard loads
   - Check user avatar + name displayed

3. ONBOARDING
   - See empty state with "Connect Repository" CTA
   - Connect a test repository
   - Verify repository appears in list

4. FIRST CYCLE
   - Click "Run Cycle" on test repo
   - Wait for cycle to complete (may take 1-3 min)
   - Verify cycle result displayed
   - Check memory bank diff visible

5. USAGE
   - Navigate to Account/Settings
   - Verify cycle count accurate
   - Verify tier badge (Free)

6. UPGRADE
   - Click "Upgrade to Pro"
   - Review pricing page
   - Click "Subscribe" → Stripe Checkout
   - Use test card: 4242 4242 4242 4242
   - Complete checkout
   - Verify redirect to dashboard
   - Verify tier badge (Pro)

7. PORTAL
   - Go to Account → Manage Subscription
   - Verify Stripe Portal opens
   - View current plan details
   - Close portal (don't cancel)

8. API
   - Generate API key from Account settings
   - Test: curl -H "Authorization: Bearer <key>" https://api.adabot.dev/v1/me
   - Verify user object returned

9. LOGOUT
   - Click Sign Out
   - Verify redirected to landing
   - Attempt to access /dashboard
   - Verify redirected to login
```

### Edge Case Tests (15 min)

```
10. AUTH FAILURE
    - Start OAuth flow
    - Click "Cancel" on GitHub page
    - Verify error page renders
    - Click "Try Again" works

11. RATE LIMIT (Free Tier)
    - Run 10 cycles on Free tier
    - Attempt 11th cycle
    - Verify rate limit message
    - Verify upgrade prompt shown

12. BILLING FAILURE
    - Use declined test card: 4000 0000 0000 0002
    - Verify checkout fails gracefully
    - Verify no charge created
    - Verify user remains on Free tier

13. SESSION EXPIRY
    - Login, then clear cookies
    - Refresh dashboard
    - Verify redirected to login
    - Verify no errors/broken state
```

---

## 5. Post-Launch Monitoring

### 5.1 Day 1 Monitoring (Active)

| Check               | Frequency    | Action if Fail        |
| ------------------- | ------------ | --------------------- |
| Uptime              | Every 5 min  | Page Engineering      |
| Auth Success Rate   | Hourly       | Investigate if <95%   |
| Checkout Errors     | Real-time    | Fix immediately       |
| Server Errors (5xx) | Real-time    | Investigate any       |
| Queue Depth         | Every 15 min | Scale if >100 pending |

### 5.2 Week 1 Review (Daily)

- Signup count vs target
- Trial activation rate
- Conversion rate
- Top error types
- User feedback (if any)

### 5.3 Post-Mortem Triggers

Run post-mortem if:

- Uptime drops below 99%
- Auth success rate drops below 90%
- Any data loss incident
- Billing error affects customer
- Security incident of any kind

---

## 6. Rollback Plan

If critical issues discovered post-launch:

### Partial Rollback (Feature Flags)

```
FEATURE_BILLING_ENABLED=false   # Disable checkout, show "coming soon"
FEATURE_EXECUTION_ENABLED=false # Disable cycle runs, show maintenance
```

### Full Rollback

1. Revert to pre-Sprint 3 deployment
2. Restore database from backup (if needed)
3. Update status page with maintenance message
4. Notify affected users via email

### Recovery

- Fix identified issue
- Deploy to staging
- Run full UAT script
- CEO Go/No-Go for re-launch

---

## Sign-Off

| Role        | Sign-Off Date | Notes               |
| ----------- | ------------- | ------------------- |
| Product     | ⬜            | This document owner |
| QA          | ⬜            | UAT execution       |
| Engineering | ⬜            | Technical readiness |
| Ops         | ⬜            | Infrastructure      |
| CEO         | ⬜            | Final Go-Live       |

---

_This document complements the technical implementation playbook (C1207). Use together for Sprint 3 success._
