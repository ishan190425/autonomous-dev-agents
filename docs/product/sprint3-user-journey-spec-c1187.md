# Sprint 3 User Journey Specification

> **Author:** 📦 Product (C1187)
> **Date:** 2026-02-23
> **Sprint:** 3 (Mar 1-14)
> **Related Issues:** #155, #181, #182, #189, #190

---

## Overview

This document maps the complete SaaS user journey for Sprint 3, connecting technical specifications (C1185 tier spec, C1186 metering ADR, PR #252 auth foundation, PR #253 NextAuth integration) to user experience.

**Goal:** First paying user by Mar 31 ($100 MRR = 5-6 Pro subscriptions)

---

## User Journey Map

### Stage 1: Discovery → Waitlist (Pre-Sprint 3)

**Current State:** Waitlist deployed (#200), content front-loaded (Show HN, blog, Twitter)

```
User hears about ADA → Visits waitlist → Joins waitlist
                         ↓
                    Email captured
```

**Success Metrics:**

- Waitlist signups: Target 100+ pre-launch
- Conversion to trial: 20%+ of waitlist

---

### Stage 2: Onboarding (Sprint 3 — #181 Auth)

**User Story:** As a developer on the waitlist, I want to sign up with GitHub so that I can start using ADA immediately without creating another password.

```
Waitlist user receives invite email
         ↓
Clicks "Get Started" → Redirects to /signup
         ↓
"Continue with GitHub" button (GitHub OAuth)
         ↓
GitHub authorizes → Redirect to /dashboard
         ↓
First-time user sees onboarding wizard
```

**Acceptance Criteria (Enhanced):**

| ID     | Criteria                                      | Technical Reference               |
| ------ | --------------------------------------------- | --------------------------------- |
| AUTH-1 | GitHub OAuth one-click signup                 | PR #253 NextAuth.js               |
| AUTH-2 | Email extracted from GitHub profile           | PR #253 `profile.email`           |
| AUTH-3 | Session persists 30 days                      | PR #253 session config            |
| AUTH-4 | callbackUrl preserved for post-login redirect | PR #253 (Design verified C1182)   |
| AUTH-5 | `/auth/error` page for OAuth failures         | PR #253 config (component needed) |
| AUTH-6 | Free tier auto-assigned on signup             | PR #252 Prisma schema             |

**Edge Cases:**

- GitHub email is private → Prompt for email after OAuth
- User already has CLI usage → Link to existing usage data
- OAuth fails → Clear error message with retry option

---

### Stage 3: First Value (Sprint 3 — #189 Managed Execution)

**User Story:** As a new user, I want to run my first ADA cycle in under 5 minutes without installing anything locally.

```
Dashboard first load
         ↓
"Connect Repository" → GitHub repo selector
         ↓
Select repo → ADA creates agents/ structure via GitHub API
         ↓
"Run First Cycle" button → Cloud execution starts
         ↓
Real-time logs stream to dashboard
         ↓
Cycle completes → Show results, commit link
```

**Acceptance Criteria (Enhanced):**

| ID     | Criteria                               | Technical Reference      |
| ------ | -------------------------------------- | ------------------------ |
| EXEC-1 | GitHub repo connection via OAuth scope | PR #253 repo scope       |
| EXEC-2 | `ada init` runs in cloud container     | #189 container isolation |
| EXEC-3 | Execution logs stream in real-time     | WebSocket or SSE         |
| EXEC-4 | Cycle result shows PR/commit created   | GitHub API integration   |
| EXEC-5 | Time-to-first-cycle < 5 minutes        | Success metric           |
| EXEC-6 | Cost tracking per execution            | C1186 metering ADR       |

**First-Cycle Experience:**

1. **Repository Selection:** Show only repos user has write access to
2. **Role Selection:** Default "Balanced Team" (all roles) or "Solo Dev" (3 roles)
3. **First Run:** Auto-select a simple action (create a docs file, add tests)
4. **Celebration:** Confetti/success animation on first cycle completion
5. **Next Steps:** Suggest scheduling automatic cycles

---

### Stage 4: Habit Formation (Sprint 3 — Usage Tracking)

**User Story:** As a free user, I want to see my usage clearly so that I understand when I'm approaching limits.

```
User runs cycles over time
         ↓
Usage bar in dashboard header: "12/50 cycles this month"
         ↓
At 40 cycles: Warning banner "10 cycles remaining"
         ↓
At 50 cycles: Soft limit → Upgrade prompt (not hard block)
         ↓
"Upgrade to Pro" → Stripe checkout
```

**Acceptance Criteria (Enhanced):**

| ID      | Criteria                                   | Technical Reference          |
| ------- | ------------------------------------------ | ---------------------------- |
| USAGE-1 | Real-time usage display in header          | C1186 local cache            |
| USAGE-2 | Warning at 80% of tier limit               | C1185 `LOW_CYCLES_THRESHOLD` |
| USAGE-3 | Soft limit at 100% (degraded, not blocked) | C1186 rate limiter           |
| USAGE-4 | Usage history graph (cycles/day)           | Dashboard feature            |
| USAGE-5 | Per-repo usage breakdown                   | Multi-repo support           |

**Tier Limits (from C1185):**

- **Free:** 50 cycles/month
- **Pro:** 500 cycles/month ($19/mo)
- **Team:** 2,000 cycles/month ($49/mo)
- **Enterprise:** Custom

---

### Stage 5: Conversion (Sprint 3 — #182 Billing)

**User Story:** As a power user hitting Free limits, I want to upgrade to Pro seamlessly so that my cycles continue uninterrupted.

```
User hits 50 cycles (or wants Pro features)
         ↓
"Upgrade to Pro" button → Stripe Checkout modal
         ↓
Enter payment → Stripe processes
         ↓
Webhook fires → Tier upgraded instantly
         ↓
Dashboard refreshes → "500 cycles available"
```

**Acceptance Criteria (Enhanced):**

| ID     | Criteria                                | Technical Reference     |
| ------ | --------------------------------------- | ----------------------- |
| BILL-1 | Stripe Checkout embedded (not redirect) | Stripe.js               |
| BILL-2 | Instant tier upgrade on payment         | Webhook handler         |
| BILL-3 | Proration for mid-cycle upgrades        | Stripe proration        |
| BILL-4 | Downgrade allowed at period end         | Subscription management |
| BILL-5 | Invoice history in dashboard            | Stripe Customer Portal  |
| BILL-6 | Failed payment retry with email         | Stripe retry logic      |

**Upgrade Prompts (Contextual):**

- At 80% usage: "You're crushing it! Upgrade to keep going."
- At 100% usage: "Cycles paused. Upgrade in 30 seconds."
- At Pro feature attempt: "This feature is Pro-only. See what you unlock."

---

### Stage 6: Retention (Post-Sprint 3)

**User Story:** As a Pro user, I want scheduled automatic cycles so that ADA works for me 24/7.

```
Dashboard → Settings → Scheduling
         ↓
"Run cycles every 30 minutes" toggle
         ↓
ADA runs automatically, creates PRs
         ↓
Daily digest email: "ADA created 5 PRs today"
```

**Sprint 4+ Feature (not Sprint 3):**

- Automatic scheduling (cron-like)
- Slack/Discord notifications
- Weekly activity digest

---

## User Personas & Journey Timing

### Persona 1: Solo Developer (Primary Target)

| Stage       | Time      | Action                      |
| ----------- | --------- | --------------------------- |
| Discovery   | T+0       | Sees Show HN/Twitter        |
| Waitlist    | T+2 min   | Joins waitlist              |
| Onboarding  | T+5 min   | GitHub OAuth signup         |
| First Value | T+8 min   | First cycle runs            |
| Habit       | T+1 week  | 10 cycles, sees value       |
| Conversion  | T+2 weeks | Hits limit, upgrades to Pro |

**Total time-to-value:** 8 minutes (target: <10 min)

### Persona 2: Team Lead

| Stage       | Time      | Action                           |
| ----------- | --------- | -------------------------------- |
| Discovery   | T+0       | Team member shares ADA           |
| Evaluation  | T+1 day   | Tries Free tier on personal repo |
| First Value | T+5 min   | First cycle impresses            |
| Team Trial  | T+1 week  | Adds team repo                   |
| Conversion  | T+2 weeks | Upgrades to Team tier            |

**Key differentiator:** Team tier includes workspace features

---

## Success Metrics (Sprint 3)

| Metric                | Target  | Measurement             |
| --------------------- | ------- | ----------------------- |
| Time-to-first-cycle   | < 5 min | Dashboard analytics     |
| Free → Pro conversion | 10%     | Stripe data             |
| Week 1 retention      | 40%     | Return within 7 days    |
| Cycles per user/week  | 5+      | Usage tracking          |
| First MRR             | $100    | 5-6 Pro users by Mar 31 |

---

## Technical Dependencies

| Component            | Spec    | Status                    |
| -------------------- | ------- | ------------------------- |
| Auth Foundation      | PR #252 | ✅ Merged                 |
| NextAuth Integration | PR #253 | 🟡 Open (Design approved) |
| Tier Pricing         | C1185   | ✅ Complete               |
| Usage Metering       | C1186   | ✅ Complete               |
| Stripe Integration   | #182    | 📋 Sprint 3               |
| Managed Execution    | #189    | 📋 Sprint 3               |
| REST API             | #190    | 📋 Sprint 3               |

---

## Implementation Priority (Sprint 3)

**Week 1 (Mar 1-7):**

1. Auth system complete (#181) — Gate for everything
2. Basic dashboard shell — Navigation, user profile
3. Stripe integration (#182) — Payment flow

**Week 2 (Mar 8-14):** 4. Usage tracking — Real-time limits display 5. Managed execution (#189) — Cloud cycle runs 6. REST API basics (#190) — Dashboard data endpoints

---

## Open Questions

1. **Email verification:** Required for Free tier, or trust GitHub email?
   - Recommendation: Trust GitHub email, verify only if private

2. **CLI + Web sync:** How do CLI cycles count against web tier limits?
   - Recommendation: CLI sends usage to API, unified counter

3. **Grace period:** Hard block at limit or soft degradation?
   - Recommendation: Soft degradation (slower cycles, not blocked)

---

## References

- [C1185] Sprint 3 SaaS Tier Technical Spec — `docs/research/sprint3-saas-tier-technical-spec-c1185.md`
- [C1186] Usage Metering Architecture ADR — `docs/architecture/adr-usage-metering-architecture-c1186.md`
- [C1183] Sprint 3 Final Readiness Assessment — `docs/business/sprint3-final-readiness-assessment-c1183.md`
- [PR #252] Auth Foundation — Merged
- [PR #253] NextAuth Integration — Open (Design approved)
