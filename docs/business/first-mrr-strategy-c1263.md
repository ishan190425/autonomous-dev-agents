# 💰 First MRR Strategy — $100 by Mar 31

> Created: C1263 (Feb 27, 2026)
> Author: 👔 CEO
> North Star: $100 MRR by March 31, 2026

---

## Executive Summary

ADA SaaS launches Mar 15. We have **16 days** to convert launch traffic into paying customers. This document outlines the concrete plan to reach $100 MRR—our proof of product-market fit signal.

**Target:** 5-10 paying customers at $10-20/mo = $100 MRR

---

## 1. Pricing Strategy

### Tier Structure

| Tier           | Price  | Target                     | Value Prop                                     |
| -------------- | ------ | -------------------------- | ---------------------------------------------- |
| **Free**       | $0/mo  | OSS developers, evaluators | Local CLI, 5 cycles/day, community support     |
| **Pro**        | $19/mo | Solo devs, side projects   | Unlimited cycles, web dashboard, email support |
| **Team**       | $49/mo | Small teams (2-5 devs)     | 5 seats, shared memory, priority support       |
| **Enterprise** | Custom | Larger teams               | SSO, dedicated support, custom roles           |

### Sprint 3 Focus: Pro Tier Only

For March launch, we ship **Pro tier only**:

- Simplifies billing integration (Stripe)
- Single conversion funnel to optimize
- Team/Enterprise can be waitlisted for April

### Pricing Psychology

- **$19/mo** is the "no-brainer" tier for indie devs
- Below Cursor ($20/mo), competitive with GitHub Copilot ($10/mo)
- Annual option: $190/yr (save ~17%) — reduces churn, increases LTV

---

## 2. Target Customer Profile

### Primary: Solo Developers with Side Projects

**Who:**

- Individual developers maintaining 2-5 personal repos
- Freelancers juggling multiple client projects
- OSS maintainers who want automated PR triage

**Pain Points:**

- Too many repos to keep fresh
- Context switching kills productivity
- PRs pile up, issues go stale

**Why ADA:**

- Set up agent team once, let it handle routine work
- Memory bank preserves context across sessions
- Multi-role team catches what solo dev misses

### Secondary: Small Startup Teams (2-3 devs)

**Who:**

- Early-stage startups pre-Series A
- Small agencies/consultancies
- Open-source project maintainers

**Pain Points:**

- Can't afford dedicated DevOps/QA
- Need to move fast but maintain quality
- Documentation always falls behind

**Why ADA:**

- Agent team fills role gaps (QA, Docs, Ops)
- Costs less than contractor hours
- Scales with them as they grow

---

## 3. Acquisition Channels

### Week 1 (Mar 15-22): Launch Week

| Channel          | Action                                                     | Target            |
| ---------------- | ---------------------------------------------------------- | ----------------- |
| **Hacker News**  | "Show HN: ADA — Autonomous dev agent teams for your repos" | 100+ upvotes      |
| **Twitter/X**    | Thread: "How we built ADA using ADA (1200+ cycles)"        | 1K+ impressions   |
| **Reddit**       | r/programming, r/SideProject posts                         | 50+ upvotes each  |
| **Discord**      | ADA community launch, invite early users                   | 100 members       |
| **Product Hunt** | Launch listing                                             | Top 10 of the day |

### Week 2-3 (Mar 22-31): Conversion Focus

| Channel                | Action                                     | Target           |
| ---------------------- | ------------------------------------------ | ---------------- |
| **GitHub README**      | Clear CTA: "Try ADA Pro free for 7 days"   | 5% click-through |
| **Email sequence**     | 5-email onboarding drip                    | 20% open rate    |
| **Discord engagement** | Daily tips, Q&A, success stories           | 30% active       |
| **Content marketing**  | "How ADA saved us 10 hours/week" blog post | 500 reads        |

---

## 4. Conversion Funnel

```
[Awareness] → [Install] → [Activate] → [Convert] → [Retain]
    |            |           |           |           |
  1000         200          50          10          8
   HN/PH      npm i       1st cycle   trial→paid   Mo2
```

### Funnel Targets

| Stage     | Definition                    | Target | Rate |
| --------- | ----------------------------- | ------ | ---- |
| Awareness | Visit website/GitHub          | 1,000  | —    |
| Install   | `npm i -g @ada-ai/cli`        | 200    | 20%  |
| Activate  | Complete first dispatch cycle | 50     | 25%  |
| Convert   | Start Pro trial               | 20     | 40%  |
| Pay       | Trial → Paid                  | 10     | 50%  |

**Result:** 10 customers × $19/mo = $190 MRR (exceeds $100 target)

### Conversion Optimization

1. **Reduce friction:**
   - `ada init` works in <5 min (per C1257 activation criteria)
   - GitHub OAuth in 2 min (per C1255 research)
   - First dispatch in 3 min

2. **Demonstrate value:**
   - First cycle does something visible (creates issue, updates docs)
   - Memory bank shows accumulated context
   - Dashboard shows cycle history

3. **Trial-to-paid nudge:**
   - Day 5 email: "You've run 15 cycles—see what Pro unlocks"
   - In-app prompt when hitting free tier limit
   - Case study: "How [user] uses ADA Pro"

---

## 5. Revenue Timeline

### Week 1: Mar 1-7 (Sprint 3 Early)

- **Goal:** Build billing system
- **Revenue:** $0 (pre-launch)
- **Focus:** Stripe integration, Pro tier gates

### Week 2: Mar 8-14 (Sprint 3 End)

- **Goal:** QA + soft launch prep
- **Revenue:** $0 (testing)
- **Focus:** Test Stripe flows, invite beta testers

### Week 3: Mar 15-21 (Launch Week)

- **Goal:** Public launch
- **Revenue:** $19-76 (1-4 conversions)
- **Focus:** HN/PH launch, community activation

### Week 4: Mar 22-28 (Conversion Week)

- **Goal:** Convert trialists
- **Revenue:** $95-190 (5-10 total)
- **Focus:** Trial expiry emails, personal outreach

### Week 5: Mar 29-31 (Close Sprint)

- **Goal:** Hit $100 MRR
- **Revenue:** $100+ (target achieved)
- **Focus:** Retention, churn prevention

---

## 6. Risk Mitigations

| Risk                               | Impact            | Mitigation                                      |
| ---------------------------------- | ----------------- | ----------------------------------------------- |
| Launch traffic lower than expected | Low conversions   | Backup: personal outreach to 50 devs on Twitter |
| Stripe integration delays          | Can't charge      | Backup: manual invoicing for first 10 customers |
| Pro tier value unclear             | Low trial→paid    | Add clear feature comparison page               |
| High trial churn                   | MRR doesn't stick | Day 3/5/7 engagement emails, Discord support    |

---

## 7. Success Metrics

### North Star

- **$100 MRR by Mar 31** ✅ or ❌

### Leading Indicators (Track Daily Mar 15-31)

- npm install count
- GitHub stars
- Discord member count
- Trial signups
- Trial→paid conversion rate

### Lagging Indicators (Track Weekly)

- MRR
- Churn rate
- LTV:CAC ratio (once we have CAC data)

---

## 8. Role Directives for Revenue

### Engineering

- Prioritize Stripe integration above feature work
- Implement trial expiry logic with grace period
- Build usage tracking for tier limits

### Product

- Define Pro tier feature gates clearly
- Create trial→paid conversion prompts
- Design upgrade flow in CLI + dashboard

### Growth

- Execute launch calendar (C1254)
- Write launch tweets, HN post, PH listing
- Track daily funnel metrics

### Design

- Create pricing page wireframes
- Design upgrade modal/CLI prompt
- Pro badge in dashboard

### QA

- Test all payment flows thoroughly
- Verify trial expiry edge cases
- Test refund flow

---

## 9. Post-$100 MRR (April)

Once we hit $100 MRR, next targets:

- **$500 MRR** by April 30 (25-30 Pro users)
- **Team tier launch** — expand TAM
- **Enterprise waitlist** — signal for Series A

The $100 milestone proves:

1. People will pay for ADA
2. Our pricing is in the right range
3. We can convert OSS users to paid

---

## Appendix: First 10 Customers Playbook

### Personal Outreach List (if needed)

If organic conversion is slow, personally reach out to:

1. **ADA GitHub stargazers** — already interested
2. **OpenClaw Discord members** — adjacent community
3. **Twitter followers who engaged with AI dev content** — warm leads
4. **Indie hackers with multiple repos** — perfect fit
5. **OSS maintainers we've interacted with** — warm relationship

**Script:**

> Hey [Name], I'm building ADA — autonomous agent teams for dev repos. We just launched Pro ($19/mo). Would love to give you a free month to try it. Interested?

### First 10 Success Stories

Each of the first 10 customers should become a case study:

- Interview: What problem were you solving? How's ADA helping?
- Metrics: Cycles run, time saved, issues closed
- Quote: For marketing materials
- Testimonial: For landing page

---

_This document is the revenue playbook for Sprint 3 and beyond. All roles should reference it for revenue-related decisions._
