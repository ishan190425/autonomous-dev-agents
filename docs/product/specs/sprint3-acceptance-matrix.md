# Sprint 3 SaaS Feature Acceptance Matrix

**Created:** 2026-02-18 (02:42 EST)  
**Cycle:** 847  
**Author:** 📦 Product  
**Status:** 📋 ACTIVE SPEC

---

## Overview

This document defines **what "done" means** for each Sprint 3 SaaS feature. Use this matrix for:

- **Day 5 (Feb 21):** Infrastructure checkpoint — external accounts verified
- **Day 10 (Feb 26):** Go/No-Go decision — feature completeness assessed
- **Sprint 3 Start (Mar 1):** All gates GREEN required

---

## Infrastructure Gate (Ops Priority — 0/6)

The **highest risk** going into Day 5. Each item must be verified.

| Item                 | Verification Method                             | Owner | Day 5 Target | Status |
| -------------------- | ----------------------------------------------- | ----- | ------------ | ------ |
| **Stripe Account**   | Test mode active, API keys in secrets manager   | Ops   | ✅ Verified  | ⬜ TBD |
| **Supabase Project** | Project created, connection string in secrets   | Ops   | ✅ Verified  | ⬜ TBD |
| **GitHub OAuth App** | App registered, client ID/secret in secrets     | Ops   | ✅ Verified  | ⬜ TBD |
| **Domain**           | `ada.dev` or similar configured, DNS verified   | Ops   | ✅ Verified  | ⬜ TBD |
| **Vercel/CDN**       | Project created, deployment preview working     | Ops   | ✅ Verified  | ⬜ TBD |
| **Monitoring**       | Sentry or similar configured, test error logged | Ops   | ✅ Verified  | ⬜ TBD |

### Infrastructure Acceptance Criteria

**GREEN (6/6):** All items verified, secrets stored securely, test deployments working  
**YELLOW (3-5/6):** Partial verification, known issues with clear remediation path  
**RED (0-2/6):** Critical blockers, Sprint 3 start at risk

---

## Feature 1: GitHub OAuth (#181)

**Priority:** P1 (blocks SaaS launch)  
**Owner:** Engineering  
**Spec:** `docs/design/auth-ux-spec-c822.md`

### Acceptance Criteria

| Criterion                    | Verification Method                           | Day 5 | Day 10 |
| ---------------------------- | --------------------------------------------- | ----- | ------ |
| OAuth flow initiates         | Click "Sign in" → redirects to GitHub         | N/A   | ✅     |
| OAuth callback handled       | GitHub redirects back, user session created   | N/A   | ✅     |
| Session persists             | Refresh page, still logged in                 | N/A   | ✅     |
| Session expires correctly    | Wait 24h (or force expire), re-auth required  | N/A   | ✅     |
| User data stored in Supabase | Query DB, user row exists                     | N/A   | ✅     |
| `ada login` CLI works        | Run command, browser opens, CLI authenticated | N/A   | ✅     |
| Logout works                 | Click logout, session cleared                 | N/A   | ✅     |

### Day 5 Target

- **Infrastructure:** GitHub OAuth app registered ✅
- **Code:** OAuth route scaffolding in place (optional, YELLOW OK)

### Day 10 Target

- **All criteria:** ✅ GREEN
- **E2E test:** OAuth flow automated test passing

---

## Feature 2: Stripe Billing (#182)

**Priority:** P1 (enables first MRR)  
**Owner:** Engineering  
**Spec:** `docs/design/billing-ux-spec-c832.md`

### Acceptance Criteria

| Criterion                   | Verification Method                     | Day 5 | Day 10 |
| --------------------------- | --------------------------------------- | ----- | ------ |
| Stripe dashboard accessible | Log into Stripe test account            | ✅    | ✅     |
| Products/prices configured  | Free, Pro ($19), Enterprise ($99) exist | N/A   | ✅     |
| Checkout flow works         | Click upgrade → Stripe checkout opens   | N/A   | ✅     |
| Subscription created        | Complete checkout, webhook fires        | N/A   | ✅     |
| Subscription visible in UI  | Dashboard shows current plan            | N/A   | ✅     |
| Free tier limits enforced   | Hit 100 cycles, upgrade prompt appears  | N/A   | ⚪ P2  |
| Overage billing works       | Exceed limit, overage charged           | N/A   | ⚪ P2  |
| Subscription cancellation   | Cancel in UI, access reverts to Free    | N/A   | ✅     |
| Webhook handling            | Stripe events logged, status updated    | N/A   | ✅     |

### Day 5 Target

- **Infrastructure:** Stripe test account active, API keys in secrets ✅
- **Code:** Stripe SDK installed, checkout route scaffolding (optional)

### Day 10 Target

- **Core criteria:** ✅ GREEN (subscription create/cancel/webhook)
- **Usage billing:** ⚪ P2 (defer to Sprint 4)

---

## Feature 3: Waitlist Website (#200)

**Priority:** P2 (low complexity, high visibility)  
**Owner:** Engineering  
**Spec:** `docs/design/waitlist-ux-spec-c842.md`

### Acceptance Criteria

| Criterion                 | Verification Method               | Day 5 | Day 10 |
| ------------------------- | --------------------------------- | ----- | ------ |
| Landing page renders      | Visit URL, page loads             | ✅    | ✅     |
| Email capture works       | Submit email, success state shown | N/A   | ✅     |
| Emails stored in Supabase | Query DB, email row exists        | N/A   | ✅     |
| Responsive design         | Test on mobile viewport           | N/A   | ✅     |
| Dark theme per spec       | Visual matches spec               | N/A   | ✅     |
| Analytics tracking        | Check PostHog/GA for events       | N/A   | ⚪ P2  |
| Deployed to Vercel        | Production URL accessible         | ✅    | ✅     |

### Day 5 Target

- **Infrastructure:** Vercel project created, deployment preview working ✅
- **Code:** Basic page deployed (even placeholder OK)

### Day 10 Target

- **Core criteria:** ✅ GREEN (email capture, storage, responsive)
- **Analytics:** ⚪ P2 (defer if needed)

---

## Test Coverage Requirements

### Existing E2E Issues

| Issue | Command | Status      | Day 10 Target |
| ----- | ------- | ----------- | ------------- |
| #205  | observe | 🟢 GREEN    | ✅ Merged     |
| #206  | costs   | 🔬 Research | ✅ Merged     |

### New E2E Required (Sprint 3)

| Feature        | E2E Test Scope      | Priority |
| -------------- | ------------------- | -------- |
| GitHub OAuth   | Full flow automated | P1       |
| Stripe Billing | Checkout + webhook  | P1       |
| Waitlist       | Email capture flow  | P2       |

---

## Go/No-Go Decision Framework (Day 10 — Feb 26)

### GREEN (Launch Approved)

- ✅ Infrastructure: 6/6 verified
- ✅ GitHub OAuth: Core criteria passing
- ✅ Stripe Billing: Core criteria passing
- ✅ Waitlist: Deployed and functional
- ✅ E2E Tests: #205, #206 merged + new tests passing

### YELLOW (Conditional Launch)

- ⚠️ 1-2 criteria deferred to post-launch hotfix
- ⚠️ Non-critical analytics/monitoring gaps
- ⚠️ Known issues with documented workarounds

### RED (Launch Blocked)

- ❌ Infrastructure < 4/6 verified
- ❌ OAuth flow broken
- ❌ Stripe checkout non-functional
- ❌ No visible progress since Day 5

---

## Role Responsibilities

| Role            | Day 5 Action                     | Day 10 Action                    |
| --------------- | -------------------------------- | -------------------------------- |
| **Ops**         | Verify 6/6 infrastructure items  | Confirm all secrets/configs live |
| **Engineering** | Scaffold OAuth + Stripe routes   | Complete all core criteria       |
| **QA**          | Merge #205, investigate #206     | E2E coverage for new features    |
| **Design**      | Support implementation questions | Final UI review                  |
| **Product**     | Monitor matrix, flag gaps        | Go/No-Go recommendation to CEO   |
| **CEO**         | Day 5 checkpoint review          | Final Go/No-Go decision          |

---

## Revision History

| Version | Date       | Author     | Changes                   |
| ------- | ---------- | ---------- | ------------------------- |
| 1.0     | 2026-02-18 | 📦 Product | Initial acceptance matrix |

---

_This matrix is the source of truth for Sprint 3 Go/No-Go decisions. Update status columns as work progresses._
