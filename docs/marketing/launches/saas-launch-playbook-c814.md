# 🚀 SaaS Launch Playbook

> Comprehensive launch sequence for ADA SaaS Container
> **Created:** C814 | **Target:** Post-Sprint 3 (Mar 15-21, 2026)
> **Relates:** #155 (SaaS Container), #92 (Discord/Early Adopter)

---

## Executive Summary

This playbook coordinates the transition from Early Adopter enrollment (live) to SaaS launch. Sprint 3 (Mar 1-14) builds the platform; this playbook executes the launch sequence.

**North Star:** First 10 paying customers → $100+ MRR

---

## Pre-Launch State (Current)

| Asset                 | Status      | Notes                               |
| --------------------- | ----------- | ----------------------------------- |
| Early Adopter Program | ✅ LIVE     | 50 spots, GitHub enrollment (#92)   |
| v1.0.0-alpha CLI      | ✅ LIVE     | npm install @ada-ai/cli             |
| Discord Server        | ✅ EXISTS   | Needs #early-access channel (human) |
| SaaS Container        | 🔄 Sprint 3 | Mar 1-14 build                      |
| Billing (Stripe)      | 🔄 Sprint 3 | #182                                |
| Auth (GitHub OAuth)   | 🔄 Sprint 3 | #181                                |

---

## Launch Phases

### Phase 1: Early Adopter Activation (Day -14 to Day -7)

**Goal:** Convert enrolled Early Adopters into active beta testers

**When:** Week before SaaS soft launch (Feb 28 - Mar 7)

| Action                             | Owner   | Channel      | Timing        |
| ---------------------------------- | ------- | ------------ | ------------- |
| Email enrolled Early Adopters      | Growth  | Email/GitHub | Day -14       |
| Open #early-access Discord channel | Human   | Discord      | Day -14       |
| Share SaaS preview screenshots     | Growth  | Discord      | Day -10       |
| Collect pre-launch feedback        | Growth  | Discord      | Day -10 to -7 |
| Finalize pricing page              | Product | Web          | Day -7        |

**Metrics:**

- Early Adopters contacted: Target 100%
- Discord #early-access joins: Target 30+
- Feedback threads: Target 10+

### Phase 2: Soft Launch (Day 0 — ~Mar 15)

**Goal:** First paying customers from Early Adopter pool

**When:** Sprint 3 complete, SaaS ready

| Action                          | Owner       | Channel         | Timing  |
| ------------------------------- | ----------- | --------------- | ------- |
| Enable SaaS dashboard           | Engineering | Web             | Day 0   |
| Notify Early Adopters           | Growth      | Discord + Email | Day 0   |
| Apply $20 credits               | Ops         | Stripe          | Day 0   |
| 48h exclusive access period     | -           | -               | Day 0-2 |
| 1:1 onboarding calls (first 10) | CEO         | Discord/Zoom    | Day 0-3 |

**Metrics:**

- First login: Target 20+ in 48h
- First repo connected: Target 10+ in 48h
- First paid conversion: Target 3+ in 72h
- First MRR: Target $50+ in Week 1

### Phase 3: Public Launch (Day 7 — ~Mar 22)

**Goal:** Wider awareness, social proof, inbound leads

**When:** After soft launch validation (min 5 paying customers)

#### Launch Day Sequence

| Time        | Action               | Channel       | Asset          |
| ----------- | -------------------- | ------------- | -------------- |
| 8:00 AM EST | Tweet thread         | Twitter/X     | See draft      |
| 8:30 AM     | HN Show HN post      | Hacker News   | See draft      |
| 9:00 AM     | Product Hunt launch  | Product Hunt  | See draft      |
| 10:00 AM    | LinkedIn post        | LinkedIn      | See draft      |
| 10:00 AM    | Indie Hackers post   | Indie Hackers | See draft      |
| 12:00 PM    | Discord announcement | Discord       | Public         |
| All day     | Comment engagement   | All           | Respond to all |

#### Launch Assets (Drafts Exist)

Located in `docs/marketing/launches/`:

- `twitter-thread-draft.md` — UPDATE for SaaS angle
- `show-hn-draft.md` — UPDATE for SaaS angle
- `product-hunt-draft.md` — UPDATE for SaaS angle
- `linkedin-post-draft.md` — UPDATE for SaaS angle
- `indie-hackers-draft.md` — UPDATE for SaaS angle

**⚠️ All drafts need SaaS pivot update.** Original drafts were for v1.0-alpha CLI launch.

#### Public Launch Checklist

Pre-launch:

- [ ] SaaS soft launch completed (Phase 2)
- [ ] Min 5 paying customers (social proof)
- [ ] Customer testimonials collected (at least 2)
- [ ] Demo GIF/video updated for SaaS dashboard
- [ ] Pricing page finalized
- [ ] All launch asset drafts updated for SaaS angle

Launch day:

- [ ] Hunter set for Product Hunt
- [ ] HN account ready (sufficient karma)
- [ ] All team available for engagement (8 AM - 6 PM EST)
- [ ] Discord monitored for support questions

### Phase 4: Post-Launch Growth (Week 2+)

**Goal:** Sustain momentum, optimize conversion, scale acquisition

| Action                     | Cadence   | Owner        |
| -------------------------- | --------- | ------------ |
| Weekly dev log blog post   | Weekly    | Growth       |
| Customer success stories   | Bi-weekly | Growth       |
| Discord community events   | Weekly    | Growth       |
| Conversion funnel analysis | Weekly    | Growth       |
| Pricing experiments        | Monthly   | CEO + Growth |

---

## Conversion Funnel

```
Awareness (HN/Twitter/PH)
    ↓
Landing Page Visit
    ↓
GitHub OAuth Sign-in
    ↓
First Repo Connected
    ↓
First Dispatch Cycle Run
    ↓
Free Tier Usage (10 cycles/day)
    ↓
Pro Conversion ($19/month)
```

**Target Conversion Rates:**

- Visit → Sign-in: 10%
- Sign-in → First repo: 60%
- First repo → First cycle: 70%
- Free → Pro: 10% (Week 1), 20% (Month 1)

---

## Pricing Strategy

### Tiers (Proposed — needs CEO approval)

| Tier | Price  | Limits                            | Target                   |
| ---- | ------ | --------------------------------- | ------------------------ |
| Free | $0     | 10 cycles/day, 1 repo             | Hobbyists, tire-kickers  |
| Pro  | $19/mo | 100 cycles/day, 5 repos           | Solo devs, serious users |
| Team | $49/mo | 500 cycles/day, 20 repos, 5 seats | Small teams              |

**Early Adopter Discount:** $20 credit = ~1 month free Pro

### Revenue Targets

| Milestone | Target        | When   |
| --------- | ------------- | ------ |
| First MRR | $100          | Mar 31 |
| $1K MRR   | 50 Pro users  | Apr 30 |
| $10K MRR  | 500 Pro users | Jun 30 |

---

## Messaging Framework

### Headline Options (A/B test)

1. "Autonomous dev teams for your GitHub repo"
2. "AI agents that ship code while you sleep"
3. "The multi-agent framework that builds itself"
4. "10 AI developers. $19/month. Zero hiring."

### Key Differentiators

| vs.        | Our Advantage                           |
| ---------- | --------------------------------------- |
| Copilot    | Multi-agent team, not just autocomplete |
| Cursor     | Autonomous cycles, not just chat        |
| Devin      | Open source + self-hosted option        |
| Manual dev | 24/7, scales instantly, $19/mo          |

### Social Proof

- "813 autonomous cycles and counting"
- "391 consecutive successful cycles"
- "2,699+ automated tests"
- "Built entirely by its own agents"

---

## Risk Mitigation

| Risk                         | Mitigation                                 |
| ---------------------------- | ------------------------------------------ |
| SaaS not ready by Mar 15     | Soft launch delay, Early Adopters notified |
| Low Early Adopter conversion | 1:1 outreach, identify blockers            |
| Public launch flops          | Focus on soft launch success first         |
| Support overwhelmed          | Discord bot, FAQ, staggered invites        |
| Pricing too high             | Credit offsets, survey Early Adopters      |
| Pricing too low              | Can increase after validation              |

---

## Dependencies

| Role        | Dependency                 | Status   |
| ----------- | -------------------------- | -------- |
| Engineering | Auth system (#181)         | Sprint 3 |
| Engineering | Billing integration (#182) | Sprint 3 |
| Engineering | Dashboard (#120)           | Sprint 3 |
| Product     | Pricing page copy          | TBD      |
| Design      | Dashboard visual polish    | Sprint 3 |
| CEO         | Pricing approval           | TBD      |
| Human       | Discord #early-access      | Pending  |
| Human       | Product Hunt hunter        | Pending  |

---

## Next Actions (Growth)

1. **C814** ✅ Create this playbook
2. **Next:** Update existing launch drafts for SaaS angle (Twitter, HN, PH, etc.)
3. **Week of Feb 24:** Email template for Early Adopter activation
4. **Mar 1:** Sprint 3 starts — monitor progress daily
5. **Mar 7-14:** Finalize all launch assets
6. **Mar 15:** Execute Phase 2 (Soft Launch)

---

## Success Criteria

**Phase 2 (Soft Launch) Success:**

- [ ] 20+ Early Adopters logged in
- [ ] 10+ repos connected
- [ ] 5+ paying customers
- [ ] $50+ MRR

**Phase 3 (Public Launch) Success:**

- [ ] Top 5 on Product Hunt (daily)
- [ ] 50+ HN upvotes
- [ ] 500+ Twitter impressions
- [ ] 20+ new sign-ups
- [ ] 10+ new paying customers
- [ ] $100+ MRR

---

_🚀 Growth | Cycle 814_
