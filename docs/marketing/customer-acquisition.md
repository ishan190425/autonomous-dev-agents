# 📈 Customer Acquisition Strategy

> ADA's playbook for acquiring paying customers through developer-focused organic growth.
> **Created:** Cycle 722 (2026-02-16) | **Owner:** Growth
> **Status:** PRE-LAUNCH — Execute when billing is live (#155 Phase 2+)

---

## Strategic Context

**PIVOT (Issue #158):** We are bootstrapping via SaaS revenue. No accelerators, no fundraising.

**Revenue Goal:** $0 → $1K → $10K MRR
**Success Metric:** First 10 paying customers = product-market fit signal

---

## Target Personas

### Persona 1: Solo Builder 🧑‍💻

- **Who:** Indie hackers, solo founders, side project builders
- **Pain:** Wants to move faster, can't afford to hire, context-switching kills productivity
- **Budget:** $10-50/month for tools that save time
- **Where:** Indie Hackers, r/SideProject, Twitter/X, Hacker News
- **Value prop:** "Ship 2x faster without hiring — ADA handles the grunt work"

### Persona 2: Small Team Lead 👥

- **Who:** CTO/tech lead at 2-10 person startup
- **Pain:** Too few engineers for too much backlog, can't justify another hire yet
- **Budget:** $50-200/month for productivity multipliers
- **Where:** Hacker News, LinkedIn, dev podcasts, YC community
- **Value prop:** "Add 1-2 engineer capacity without the headcount"

### Persona 3: OSS Maintainer 🌱

- **Who:** Open source project maintainers with growing issue backlogs
- **Pain:** Community contributions pile up, no time for triage/review
- **Budget:** Free tier (community goodwill), potentially sponsors
- **Where:** GitHub, Twitter/X dev circles, OSS conferences
- **Value prop:** "Let ADA triage issues and maintain docs while you focus on features"

---

## Acquisition Channels

### Tier 1: High-Intent (Launch Priority)

| Channel           | Tactic                               | Expected CAC | Timeline |
| ----------------- | ------------------------------------ | ------------ | -------- |
| **Hacker News**   | Show HN post when SaaS launches      | $0           | Day 1    |
| **Product Hunt**  | Featured launch with demo            | $0           | Day 1-2  |
| **Indie Hackers** | Build in public thread + launch post | $0           | Ongoing  |
| **Twitter/X**     | Dev log threads, "Built with ADA"    | $0           | Ongoing  |

### Tier 2: Organic Growth (Post-Launch)

| Channel      | Tactic                                   | Expected CAC | Timeline |
| ------------ | ---------------------------------------- | ------------ | -------- |
| **Reddit**   | r/SideProject, r/programming, r/startups | $0           | Week 2+  |
| **Dev.to**   | Technical articles, tutorials            | $0           | Week 2+  |
| **YouTube**  | Demo videos, how ADA works               | $0-50        | Month 2+ |
| **Podcasts** | Guest appearances (Indie Hackers, etc.)  | $0           | Month 2+ |

### Tier 3: Referral/Viral (Scaled Growth)

| Channel            | Tactic                        | Expected CAC | Timeline        |
| ------------------ | ----------------------------- | ------------ | --------------- |
| **Evangelist PRs** | Open repos get hooked         | $0           | Ongoing (C720+) |
| **GitHub stars**   | Social proof drives discovery | $0           | Organic         |
| **Word of mouth**  | Happy users tell others       | $0           | Month 3+        |

---

## Launch Sequence

### Pre-Launch (Now → SaaS Live)

- [ ] Customer acquisition doc created ✅ (C722)
- [ ] Landing page copy finalized
- [ ] Demo video/GIF ready (simple — no Pioneer demo needed per #158)
- [ ] Show HN post drafted
- [ ] Product Hunt page prepared
- [ ] Indie Hackers launch thread drafted
- [ ] Twitter/X announcement thread drafted
- [ ] Email list for early interest (Discord + GitHub stargazers)

### Day 1: Launch Blitz

1. **Product Hunt** — Submit before 12:01 AM PT (midnight for full day visibility)
2. **Show HN** — Post at ~6 AM PT (peak Hacker News time)
3. **Twitter/X** — Thread with demo, story, CTA
4. **Indie Hackers** — Launch post in community
5. **Reddit** — Post in relevant subreddits (follow rules, don't spam)
6. **Discord** — Announce to existing community
7. **Email** — Blast early interest list

### Week 1: Momentum

- Respond to every HN/PH comment (founder engagement = trust)
- Retweet/share user posts
- Fix any blocking issues immediately
- Post "Day 1" and "Day 3" updates

### Month 1: Iteration

- Track conversion funnel (see Metrics below)
- A/B test landing page copy
- Create first case study from early users
- Double down on best-performing channel

---

## Content Strategy

### Build in Public

Weekly dev log posts showing:

- What ADA built this week (cycle count, PRs merged)
- Interesting architectural decisions
- Lessons learned (from memory bank)

**Format:** Twitter thread + longer Dev.to/Indie Hackers post

### Technical Deep-Dives

- "How ADA's Multi-Agent System Works"
- "Role Rotation: Why Our Agents Take Turns"
- "Memory Bank Architecture: How ADA Remembers"
- "300 Consecutive Cycles: What We Learned"

**Format:** Blog posts with code examples, diagrams

### Comparison Content

- "ADA vs GitHub Copilot: Multi-Agent vs Single Copilot"
- "ADA vs Cursor: Autonomous Teams vs IDE Integration"
- "When to Use ADA (and When Not To)"

**Format:** Honest comparison with clear use cases

---

## Conversion Funnel

```
Landing Page Visit
       ↓
  npm install (@ada-ai/cli)
       ↓
  First run (ada init)
       ↓
  Team setup (roster + first dispatch)
       ↓
  Ongoing usage (10+ cycles)
       ↓
  Paid conversion (SaaS sign-up)
       ↓
  Retention (30-day active)
```

### Metrics to Track

| Stage         | Metric               | Target |
| ------------- | -------------------- | ------ |
| Top of funnel | npm installs/week    | 100+   |
| Activation    | init completion rate | 50%+   |
| Engagement    | 10+ cycles completed | 25%+   |
| Conversion    | Free → Paid          | 5%+    |
| Retention     | 30-day active        | 60%+   |

---

## Pricing Validation

### Current Tiers (per CEO C699, updated C721)

| Tier        | Price   | Cycles/mo | $/cycle | Target Margin |
| ----------- | ------- | --------- | ------- | ------------- |
| **Starter** | Free    | 50        | —       | N/A           |
| **Team**    | $99/mo  | 2,000     | $0.05   | +29%\*        |
| **Pro**     | $299/mo | 10,000    | $0.03   | +40%\*        |

\*After cost optimization (Frontier C713) — role-based model routing required

### Validation Experiments

1. **Price sensitivity:** Monitor conversion at different price points
2. **Feature gates:** What makes free users upgrade?
3. **Usage patterns:** How many cycles do active users run?

---

## Community Building

### Discord Strategy

- **Channels:** #getting-started, #show-your-ada, #support, #feedback
- **Onboarding:** Welcome message with quick start link
- **Engagement:** Weekly "What did ADA build?" thread
- **Support:** Fast response to questions (builds trust)

### Early Adopter Program

1. **Beta testers:** First 50 users get extended free tier
2. **Power users:** Heavy users invited to private feedback channel
3. **Advocates:** Top users featured in case studies, get referral credits

---

## Dependencies

| Dependency            | Owner       | Status              |
| --------------------- | ----------- | ------------------- |
| SaaS Container (#155) | Engineering | Phase 1 in progress |
| Billing integration   | Engineering | Phase 2 (Mar 8-14)  |
| Landing page          | Design      | Post-Phase 2        |
| Demo video            | Marketing   | Pre-launch prep     |

---

## Anti-Patterns to Avoid

- ❌ **Growth hacks** — No dark patterns, no fake urgency
- ❌ **Spamming** — Follow community rules, provide value
- ❌ **Overpromising** — Be honest about what ADA can/can't do
- ❌ **Ignoring feedback** — Every criticism is a gift

---

## Success Criteria

| Milestone                 | Target Date           | Metric    |
| ------------------------- | --------------------- | --------- |
| First paying customer     | SaaS launch + 7 days  | $1 MRR    |
| 10 paying customers       | SaaS launch + 30 days | ~$500 MRR |
| Product-market fit signal | SaaS launch + 60 days | $1K MRR   |
| Sustainable growth        | SaaS launch + 90 days | $10K MRR  |

---

## Next Actions

1. ✅ Create this strategy doc (C722)
2. ✅ Draft Show HN post (C733) — see `docs/marketing/launches/show-hn-draft.md`
3. Draft Product Hunt page (pre-SaaS)
4. Create demo video/GIF (simple, no polish needed)
5. Launch when billing is live (#155 Phase 2+)

---

_Strategy created C722. Execute when SaaS billing goes live._
