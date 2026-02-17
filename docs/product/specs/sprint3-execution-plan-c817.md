# Sprint 3 Execution Plan

> **Cycle:** C817 | **Author:** 📦 Product | **Date:** 2026-02-17
> **Sprint:** Mar 1-14, 2026 | **Goal:** SaaS Container MVP Complete

---

## Executive Summary

This document provides the execution sequence for Sprint 3: SaaS Container implementation. All specifications are complete (C806-C812). This plan maps the build order, defines MVP scope, and establishes milestones for first paying customer by Mar 31.

**Revenue Target:** $100 MRR by Mar 31 (6 Pro subscribers @ $19/mo = $114)

---

## Sprint 3 Scope

### MVP-Critical (Must Ship)

| Issue | Feature                     | Dependency | Week |
| ----- | --------------------------- | ---------- | ---- |
| #181  | GitHub OAuth Authentication | None       | 1    |
| #182  | Stripe Billing Integration  | #181       | 1-2  |
| #189  | Managed Agent Execution     | #181       | 1-2  |
| #190  | API Gateway & REST API      | #181       | 1    |
| #120  | Dashboard (Core Views)      | #181, #190 | 2    |

### Post-MVP (Sprint 4+)

| Issue | Feature                    | Rationale                           |
| ----- | -------------------------- | ----------------------------------- |
| #174  | Team Management/Workspaces | Multi-user not needed for first MRR |
| #176  | Custom Role Builder UI     | CLI covers this for MVP             |
| #175  | Progress Indicators        | Nice-to-have polish                 |
| #173  | Enhanced Memory Search     | CLI search sufficient for MVP       |

---

## Dependency Graph

```
                    ┌──────────────────┐
                    │  #181 Auth       │  ← WEEK 1 START
                    │  (GitHub OAuth)  │
                    └────────┬─────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  #190 API    │  │  #189 Exec   │  │  #182 Billing│
    │  Gateway     │  │  (Cloud Run) │  │  (Stripe)    │
    └──────┬───────┘  └──────────────┘  └──────┬───────┘
           │                                    │
           └────────────┬───────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  #120 Dashboard  │  ← WEEK 2 COMPLETE
              │  (Core Views)    │
              └──────────────────┘
```

---

## Week-by-Week Breakdown

### Week 1: Mar 1-7 — Foundation Layer

**Goal:** Auth + API Gateway + Billing skeleton

#### Day 1-2: Authentication (#181)

- [ ] GitHub OAuth flow (login/logout)
- [ ] JWT token issuance and validation
- [ ] User record creation in Supabase
- [ ] Session management
- **Spec:** `docs/frontier/saas-architecture-spec-c802.md` (Auth section)
- **Acceptance:** User can sign in with GitHub, see their GitHub username

#### Day 3-4: API Gateway (#190)

- [ ] Express/Fastify REST server
- [ ] Auth middleware (JWT validation)
- [ ] Core endpoints: `/api/repos`, `/api/cycles`, `/api/user`
- [ ] Rate limiting
- **Spec:** `docs/frontier/saas-architecture-spec-c802.md` (API Gateway section)
- **Acceptance:** Authenticated requests to `/api/user` return user data

#### Day 5-7: Billing Integration Start (#182)

- [ ] Stripe customer creation on signup
- [ ] Products/prices configured (Free, Pro @ $19)
- [ ] Checkout session creation
- [ ] Webhook handler for subscription events
- **Spec:** `docs/frontier/saas-billing-integration-spec-c805.md`
- **Acceptance:** User can initiate Stripe checkout

### Week 2: Mar 8-14 — Execution + Dashboard

**Goal:** Cloud execution + minimal dashboard

#### Day 8-10: Managed Execution (#189)

- [ ] Job queue (BullMQ or Cloud Tasks)
- [ ] Cycle runner worker
- [ ] Log capture and storage
- [ ] Start/pause/stop controls via API
- **Spec:** `docs/frontier/saas-architecture-spec-c802.md` (Execution section)
- **Acceptance:** User can trigger dispatch cycle via API, see logs

#### Day 11-12: Dashboard Core (#120)

- [ ] Next.js app scaffold
- [ ] Auth-aware shell (login state, user info)
- [ ] Repo list view (connected repos)
- [ ] Cycle logs viewer (real-time updates)
- **Spec:** `docs/product/specs/dashboard-saas-integration-spec-c807.md`
- **Design:** `docs/design/dashboard-component-design-system-c812.md`
- **Acceptance:** Logged-in user sees repos, can view recent cycle logs

#### Day 13-14: Integration + Polish

- [ ] Billing portal integration (manage subscription)
- [ ] Onboarding wizard (GitHub → repo → init)
- [ ] Error states and loading indicators
- [ ] End-to-end testing
- **Acceptance:** Complete flow: signup → add repo → run cycle → view logs → upgrade to Pro

---

## MVP Definition

**Minimum Viable Product for First MRR:**

A paying customer can:

1. ✅ Sign in with GitHub
2. ✅ Connect a repository
3. ✅ Start/stop autonomous dispatch cycles
4. ✅ View cycle logs and agent actions
5. ✅ Subscribe to Pro ($19/mo) via Stripe
6. ✅ Access via web dashboard

**Explicitly NOT in MVP:**

- ❌ Team workspaces (single-user only)
- ❌ Custom role builder UI (use CLI)
- ❌ Advanced analytics
- ❌ Email notifications
- ❌ Mobile-optimized views

---

## Risk Mitigation

| Risk                         | Impact | Mitigation                              |
| ---------------------------- | ------ | --------------------------------------- |
| Stripe integration delays    | High   | Start Stripe setup Day 5, not Day 7     |
| OAuth edge cases             | Medium | Test with multiple GitHub account types |
| Cloud execution cost overrun | Medium | Implement cycle limits from Day 1       |
| Dashboard scope creep        | High   | Stick to 4 core views only              |

---

## Success Criteria

### Sprint 3 Complete (Mar 14)

- [ ] User can complete full flow: signup → repo → cycle → logs → Pro upgrade
- [ ] Dashboard accessible at `https://ada.dev` or staging URL
- [ ] Stripe processes test payments successfully
- [ ] At least 1 repo running cycles in cloud

### First MRR (Mar 31)

- [ ] 6+ Pro subscribers
- [ ] $100+ MRR
- [ ] <5% churn in first week

---

## Related Documents

- **Implementation Architecture:** `docs/frontier/saas-implementation-architecture-c806.md`
- **Auth + Billing + Execution Specs:** `docs/frontier/saas-*.md` (C802, C805)
- **Dashboard Integration:** `docs/product/specs/dashboard-saas-integration-spec-c807.md`
- **Design System:** `docs/design/dashboard-component-design-system-c812.md`
- **Launch Playbook:** `docs/marketing/launches/saas-launch-playbook-c814.md`

---

## Acceptance Criteria

- **AC-817-1:** Dependency graph accurately reflects build order
- **AC-817-2:** Week 1/Week 2 breakdown has clear deliverables per day
- **AC-817-3:** MVP scope is explicitly scoped (what's in, what's out)
- **AC-817-4:** Success criteria are measurable and time-bound
- **AC-817-5:** All related specs are cross-referenced

---

_This execution plan bridges specifications (complete) with implementation (Sprint 3). Engineering should reference this for sequencing decisions._
