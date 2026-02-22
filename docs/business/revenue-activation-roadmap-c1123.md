# Revenue Activation Roadmap

> Sprint 3 → First MRR: The 17-Day Path to Revenue
> Created: C1123 (2026-02-22)
> Author: 👔 CEO

---

## Executive Summary

Sprint 3 (Mar 1-14) builds the SaaS Container. This document defines the revenue activation sequence from Sprint 3 completion to first MRR ($100 by Mar 31).

**Key Constraint:** 17 days from Sprint 3 end to MRR deadline.

**Success Metric:** 10 paying customers × $10/mo = $100 MRR by Mar 31.

---

## Sprint 3 Deliverables → Revenue Enablers

| Sprint 3 Component      | Revenue Enabler                          | Critical Path |
| ----------------------- | ---------------------------------------- | ------------- |
| **Auth (#181)**         | User registration, GitHub OAuth          | Day 1-2       |
| **Billing (#182)**      | Stripe subscriptions, payment processing | Day 3-4       |
| **Dashboard (#155)**    | Customer self-service, cycle monitoring  | Day 5-7       |
| **Managed Exec (#189)** | SaaS value prop — no CLI setup required  | Day 8-10      |
| **API Gateway (#190)**  | Programmatic access, integration tier    | Day 11-12     |
| **First Run UX (#183)** | Conversion optimization, onboarding      | Day 13-14     |

All six components must ship for revenue activation. No partial launches.

---

## Pricing Confirmation

### Tier Structure (Validated C1086)

| Tier           | Price  | Cycles/mo | Teams     | Target                    |
| -------------- | ------ | --------- | --------- | ------------------------- |
| **Free**       | $0     | 100       | 1         | CLI users, evaluation     |
| **Pro**        | $10/mo | 500       | 3         | Solo devs, small projects |
| **Team**       | $50/mo | 2,500     | 10        | Small teams, startups     |
| **Enterprise** | Custom | Unlimited | Unlimited | Contact sales             |

**First MRR Strategy:** 10 Pro customers. Lower barrier, faster conversion.

### Pricing Psychology

- **$10/mo = coffee + donut** — impulse tier
- **500 cycles ≈ 50 cycles/day × 10 days** — generous for evaluation
- **No credit card for Free** — reduce friction
- **7-day Pro trial** — let them feel the power

---

## Revenue Activation Timeline

### Phase 1: Soft Launch (Mar 14-17)

**Objective:** Controlled rollout to warm leads.

| Day    | Action                                  | Owner       |
| ------ | --------------------------------------- | ----------- |
| Mar 14 | Sprint 3 complete, staging verification | Engineering |
| Mar 14 | Production deployment                   | Ops         |
| Mar 15 | Waitlist notification (100 emails)      | Growth      |
| Mar 15 | Discord announcement                    | Growth      |
| Mar 16 | First signups tracked                   | Product     |
| Mar 17 | Soft launch retrospective               | Scrum       |

**Target:** 25 Free signups, 5 Pro conversions.

### Phase 2: Public Launch (Mar 18-24)

**Objective:** Broader awareness and conversion.

| Day       | Action                                  | Owner    |
| --------- | --------------------------------------- | -------- |
| Mar 18    | Product Hunt launch                     | Growth   |
| Mar 18    | Twitter thread (dev log style)          | Growth   |
| Mar 19    | Hacker News "Show HN" post              | CEO      |
| Mar 20    | Dev.to article: "We Built AI Dev Teams" | Research |
| Mar 21    | Reddit r/programming post               | Growth   |
| Mar 22    | Indie Hackers milestone update          | Growth   |
| Mar 23-24 | Respond to feedback, iterate            | All      |

**Target:** 100 Free signups, 15 total Pro conversions (+10 from Phase 1).

### Phase 3: Conversion Push (Mar 25-31)

**Objective:** Hit $100 MRR.

| Day    | Action                           | Owner   |
| ------ | -------------------------------- | ------- |
| Mar 25 | Trial expiration reminders       | Product |
| Mar 26 | Personal outreach to trial users | CEO     |
| Mar 27 | Feature spotlight emails         | Growth  |
| Mar 28 | Discord engagement boost         | Growth  |
| Mar 29 | "Last chance" Pro offer          | Growth  |
| Mar 30 | Final conversion push            | All     |
| Mar 31 | **MRR milestone verification**   | CEO     |

**Target:** 10+ Pro subscriptions ($100+ MRR).

---

## First 10 Customers Strategy

### Acquisition Channels

1. **Waitlist (warmest)** — Already interested, #200 captures these
2. **Discord community** — Engaged developers, low friction
3. **Twitter followers** — Existing audience from dev logs
4. **Product Hunt** — Discovery engine, credibility signal
5. **Hacker News** — Technical audience, viral potential

### Conversion Levers

| Lever                  | Mechanism          | Expected Impact   |
| ---------------------- | ------------------ | ----------------- |
| **7-day Pro trial**    | Time-boxed urgency | +30% conversion   |
| **Onboarding wizard**  | Reduce friction    | +20% activation   |
| **Cycle email digest** | Demonstrate value  | +15% retention    |
| **Discord support**    | Fast resolution    | +10% satisfaction |

### Customer Success Early Signals

Track daily during activation phase:

- **Signups:** New Free accounts
- **Activations:** First dispatch cycle run
- **Conversions:** Free → Pro upgrades
- **Churn signals:** No activity in 3+ days

---

## Risk Mitigation

### Technical Risks

| Risk                          | Mitigation               | Fallback           |
| ----------------------------- | ------------------------ | ------------------ |
| Auth issues at scale          | Load testing Day 12      | Manual onboarding  |
| Stripe webhook failures       | Idempotency + monitoring | Manual billing     |
| Managed exec queue saturation | Rate limiting            | Longer cycle times |

### Market Risks

| Risk              | Mitigation           | Fallback                    |
| ----------------- | -------------------- | --------------------------- |
| Low awareness     | Multi-channel launch | Double down on Product Hunt |
| Price sensitivity | Free tier generous   | Extend trial to 14 days     |
| Feature gaps      | Fast iteration       | Prioritize feedback         |

### Execution Risks

| Risk                 | Mitigation                      | Fallback                    |
| -------------------- | ------------------------------- | --------------------------- |
| Sprint 3 delay       | Buffer days built in            | Delay launch proportionally |
| Team bandwidth       | Ops handles CI, others focus    | Pause non-critical issues   |
| Human-gated blockers | Multi-channel escalation (L633) | CEO direct action           |

---

## Success Criteria

### By Mar 17 (Soft Launch Complete)

- [ ] Production stable
- [ ] 25+ Free signups
- [ ] 5+ Pro conversions
- [ ] Zero critical bugs

### By Mar 24 (Public Launch Complete)

- [ ] Product Hunt featured
- [ ] 100+ Free signups
- [ ] 15+ Pro conversions
- [ ] NPS baseline established

### By Mar 31 (MRR Milestone)

- [ ] **$100+ MRR** ⭐
- [ ] 10+ paying customers
- [ ] <5% Day-7 churn
- [ ] Customer success playbook drafted

---

## Dependencies

### Blocking

- **#200 Waitlist deployment** — Must deploy before Mar 1 to capture pre-launch signups. Currently Day 8 blocked on human Vercel action. **ESCALATE.**

### Enabling

- **Sprint 3 on-time completion** — All 6 components shipped by Mar 14.
- **arXiv paper draft** — Mar 7 deadline provides credibility for launch.
- **Dev log content** — Weekly "Building ADA with ADA" drives awareness.

---

## CEO Accountability

| Checkpoint                 | Date   | Owner |
| -------------------------- | ------ | ----- |
| Go/No-Go Ratification      | Feb 26 | CEO   |
| Sprint 3 Kickoff           | Mar 1  | CEO   |
| Soft Launch Decision       | Mar 14 | CEO   |
| Public Launch Decision     | Mar 18 | CEO   |
| MRR Milestone Verification | Mar 31 | CEO   |

---

## Appendix: North Star Alignment

**Mission:** Ship software with autonomous AI dev teams.

**North Star Metric:** First MRR ($100 by Mar 31).

**Why This Matters:**

- Revenue = validation. Users paying proves product-market fit.
- Bootstrap strategy (#158) requires revenue before growth capital.
- $100 MRR proves unit economics before scaling.

**After Mar 31:**

- Sprint 4 features (#237 Conditional Dispatch, #174 Team Management)
- Scale to $1K MRR by Apr 30
- arXiv publication (Mar 14 submission target)

---

_This document bridges strategy (C1113 Go/No-Go) to execution (Sprint 3) to revenue (Mar 31). Review at Feb 26 ratification._
