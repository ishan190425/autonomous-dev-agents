# 🚀 Soft Launch Activation Playbook

> **Created:** C1124 | **Updated:** 2026-02-22
> **Phase:** Revenue Activation Phase 1 (Mar 14-17)
> **Relates:** #155 (SaaS Container), #200 (Waitlist), #92 (Discord), C1123 (Revenue Roadmap)
> **Goal:** Convert waitlist → first paying customers before Public Launch

---

## Executive Summary

This playbook operationalizes **Phase 1 (Soft Launch)** of the Revenue Activation Roadmap (C1123). The goal is controlled activation: convert the highest-intent waitlist signups into paying customers before the noise of Public Launch.

**North Star:** 5 paying customers @ $10/mo = $50 MRR before Mar 18

---

## Timeline Overview

| Date   | Milestone                      | Owner       |
| ------ | ------------------------------ | ----------- |
| Mar 14 | Sprint 3 Complete              | Engineering |
| Mar 14 | Soft Launch: Wave 1 (10 users) | Growth      |
| Mar 15 | Wave 2 (25 users)              | Growth      |
| Mar 16 | Wave 3 (all waitlist)          | Growth      |
| Mar 17 | Conversion push (48h deadline) | Growth      |
| Mar 18 | Public Launch begins           | Growth      |

---

## Pre-Soft Launch Checklist (Mar 1-13)

Complete during Sprint 3:

**Platform Requirements:**

- [ ] GitHub OAuth working (#181)
- [ ] Stripe billing integrated (#182)
- [ ] Dashboard scaffold live (#246 merged)
- [ ] First-run UX implemented
- [ ] $10/mo Pro tier configured in Stripe
- [ ] Free trial / credits system ready

**Waitlist Requirements:**

- [ ] #200 Waitlist deployed to Vercel (⚠️ BLOCKED Day 8)
- [ ] Email addresses exportable
- [ ] Signup count visible
- [ ] Basic analytics (signups by day)

**Discord Requirements:**

- [ ] #early-access channel created (private, role-gated)
- [ ] @early-adopter role created
- [ ] Welcome message configured
- [ ] Support thread template ready

**Growth Assets:**

- [ ] Activation email templates (3 waves)
- [ ] Discord onboarding message
- [ ] First 48h engagement sequence
- [ ] Success metrics dashboard

---

## Wave Strategy

### Why Waves?

1. **Quality over quantity**: Catch bugs with small group first
2. **Social proof**: Early success stories fuel later waves
3. **Support capacity**: 10 users/day is manageable
4. **Urgency**: "You're in the first wave" drives action

### Wave 1 — The Founders (Mar 14, 10 users)

**Selection criteria:**

- Earliest signups (first-mover energy)
- Active GitHub profiles (likely to actually use it)
- Twitter/social presence (amplification potential)
- Previous engagement (replied to any comms)

**Email subject:** `You're in. ADA is live.`

**Email body:**

```markdown
Hey {NAME},

You were one of the first to sign up for ADA. That means something to us.

The dashboard is live: https://ada.dev

Sign in with GitHub, connect your first repo, and watch your autonomous dev team work.

You're one of 10 people with access today. We'd love your feedback:

- Join Discord (link) — direct line to the team
- Reply to this email — we read everything
- Tweet at us @adaframework — we'll RT your first dispatch

The first 10 paying customers get a special "Founder" badge and lifetime discount.

– ADA Team

P.S. Your feedback this week shapes what we ship next week. Don't hold back.
```

**Discord message:**

```markdown
🎉 **Welcome, Wave 1 Founders!**

You're the first 10 people on the ADA dashboard. This is huge for us.

**Quick Start:**

1. Sign in at https://ada.dev
2. Connect a repo
3. Run your first dispatch

**Share your experience:**

- First dispatch screenshot? Post it!
- Hit a bug? Tell us here — we're watching closely
- Feature request? We're all ears

You're not just early adopters — you're co-builders. 🚀
```

**Success metrics:**

- 8/10 sign in within 24h
- 6/10 connect a repo
- 4/10 run first dispatch
- 2/10 convert to Pro ($20 MRR)

### Wave 2 — Early Adopters (Mar 15, 25 users)

**Selection criteria:**

- Next 25 signups
- Diverse repo types (JS, Python, Go, etc.)
- Mix of solo devs and small teams

**Email subject:** `ADA access: You're in Wave 2`

**Email body:**

```markdown
Hey {NAME},

Wave 1 users are already running autonomous cycles. Your turn.

The dashboard is live: https://ada.dev

Our Wave 1 founders already:

- Connected {X} repos
- Ran {Y} dispatch cycles
- Caught their first AI-generated bug fix

Join them: https://ada.dev

First 10 paying customers get "Founder" status (6 spots left after Wave 1).

– ADA Team
```

**Success metrics:**

- 20/25 sign in within 24h
- 15/25 connect a repo
- 10/25 run first dispatch
- 5/25 convert to Pro ($70 MRR cumulative)

### Wave 3 — Full Waitlist (Mar 16, all remaining)

**Selection criteria:** Everyone else on waitlist

**Email subject:** `The wait is over: ADA is live`

**Email body:**

```markdown
Hey {NAME},

The ADA dashboard is open to everyone.

70+ early adopters are already running autonomous dev cycles. Here's what they're seeing:

- {TESTIMONIAL_1}
- {TESTIMONIAL_2}

Your turn: https://ada.dev

Pro tier ($10/mo) unlocks:

- 100 cycles/day (vs 10 free)
- 5 repos (vs 1 free)
- Priority support

First month includes $20 bonus credits.

– ADA Team
```

**Success metrics:**

- 50% sign in within 48h
- 30% connect a repo
- 15% run first dispatch
- 10% convert to Pro

---

## Activation Email Templates

### Template 1: You're In (Wave Invite)

```
Subject: You're in. ADA is live.

Hey {FIRST_NAME},

The ADA dashboard just went live, and you're one of the first {WAVE_SIZE} with access.

Sign in now: https://ada.dev

What you can do:
→ Connect any GitHub repo
→ Watch AI agents triage issues, write code, and open PRs
→ Run 10 free cycles/day

Join our Discord for direct support: {DISCORD_LINK}

This is the dashboard we've been building for 6 months — 1,100+ autonomous cycles of self-development. Your feedback shapes what's next.

– The ADA Team

P.S. First 10 paying customers get permanent "Founder" status. {X} spots left.
```

### Template 2: Getting Started (Day 1 follow-up)

```
Subject: Your first ADA dispatch (3 min setup)

Hey {FIRST_NAME},

Quick guide to your first autonomous cycle:

1. **Sign in** → https://ada.dev (GitHub OAuth)
2. **Connect a repo** → Click "Add Repo" → Select any repo
3. **Run dispatch** → Click "Dispatch" → Watch the agent work

That's it. Your AI dev team handles the rest.

**Pro tip:** Start with a repo that has open issues. ADA will triage and act on them.

Hit a snag? Reply here or ping us in Discord. We respond fast.

– The ADA Team
```

### Template 3: Conversion Nudge (Day 2)

```
Subject: Your 10 free cycles are running out

Hey {FIRST_NAME},

You've used {X}/10 free daily cycles. At this pace, you'll hit the limit by {TIME}.

Pro tier ($10/mo) gives you:
- 100 cycles/day
- 5 connected repos
- 30-day memory retention
- Priority Discord support

Upgrade now: https://ada.dev/billing

First month includes $20 bonus credits.

We built ADA to be worth 10x what you pay. If it's not, tell us why.

– The ADA Team
```

### Template 4: Social Proof Nudge (Day 3)

```
Subject: What {N} early adopters built this week

Hey {FIRST_NAME},

Wave 1 + Wave 2 results are in:

- {N} repos connected
- {M} autonomous cycles run
- {K} PRs opened by agents
- {X} paying customers

Quotes from the Discord:

> "{TESTIMONIAL_1}" — @{user1}
> "{TESTIMONIAL_2}" — @{user2}

Ready to join them? https://ada.dev

– The ADA Team
```

---

## Discord Activation Sequence

### Day 0 (Launch Day)

**#announcements:**

```markdown
🚀 **The ADA Dashboard is LIVE**

After 1,100+ autonomous cycles building ourselves, we're ready for you.

**Get Started:**

1. Sign in: https://ada.dev
2. Connect a repo
3. Run your first dispatch

**Early Adopter Perks:**

- Direct access to the team in #early-access
- "Founder" badge for first 10 paying customers
- Your feedback → next week's features

Welcome to the team. 🎉
```

**#early-access (private, Wave 1 only):**

```markdown
Welcome to the inner circle. 👋

You're one of 10 people with dashboard access today. We're here to:

- Answer questions in real-time
- Fix bugs you find (seriously, report everything)
- Take feature requests

**First task:** Post a screenshot of your first dispatch. We'll celebrate with you.
```

### Day 1 (Follow-up)

**#early-access:**

```markdown
📊 **Day 1 Stats:**

- {X} repos connected
- {Y} cycles run
- {Z} bugs found (thanks!)

**Top request so far:** {FEATURE}

Keep the feedback coming. You're shaping v1.1.
```

### Day 2 (Testimonial Gathering)

**#early-access:**

```markdown
Quick ask: If you've run a few cycles, we'd love a one-liner on your experience.

Something like:

> "Woke up to 3 PRs I didn't write. ADA is wild." — @you

We'll feature the best ones on Product Hunt next week (with your permission).

Drop them below 👇
```

### Day 3 (Pre-Public Launch)

**#early-access:**

```markdown
📣 **Public Launch is Monday (Mar 18)**

We're going live on Product Hunt, Hacker News, and Twitter.

**How you can help:**

1. Upvote on Product Hunt (link at launch)
2. Share your experience on Twitter
3. Answer questions in PH comments (authentic stories win)

You're not just early adopters — you're the launch team. 🚀
```

---

## Success Metrics

### Soft Launch Goals (Mar 14-17)

| Metric                | Target | Stretch |
| --------------------- | ------ | ------- |
| Waitlist → Signup     | 50%    | 70%     |
| Signup → First Repo   | 40%    | 60%     |
| First Repo → Cycle    | 60%    | 80%     |
| Cycle → Paid          | 10%    | 20%     |
| Total Paying (Pre-PL) | 5      | 15      |
| MRR (Pre-PL)          | $50    | $150    |

### Funnel Tracking

```
Waitlist Signups: {N}
    ↓ Wave 1 (Mar 14): 10 invited
    ↓ Wave 2 (Mar 15): 25 invited
    ↓ Wave 3 (Mar 16): All invited
        ↓ Signed In: {X}
            ↓ Connected Repo: {Y}
                ↓ First Cycle: {Z}
                    ↓ Paid: {W}
```

### Daily Check-ins (Mar 14-17)

Each day at 6 PM EST, Growth posts to Discord #team:

```markdown
📊 Soft Launch Day {N} Metrics:

- New signups: {X}
- Repos connected: {Y}
- Cycles run: {Z}
- Paid conversions: {W}
- Notable feedback: {quote}
- Blockers: {issues}
```

---

## Contingency Plans

### If Waitlist Deployment Still Blocked (#200)

**Fallback:** Use GitHub Issues + Discord as waitlist

1. Create `docs/waitlist/SIGNUP.md` with Google Form link
2. Post signup link in Discord #announcements
3. Collect emails manually
4. Wave invites via email

### If OAuth Breaks Day 1

**Mitigation:**

1. Engineering on-call Mar 14 (in Discord)
2. Rollback to manual invite codes
3. Email apology + "We're fixing it" to Wave 1
4. Extend Wave 1 by 24h

### If No Conversions by Day 3

**Actions:**

1. 1:1 outreach to active users
2. Ask: "What's blocking you from upgrading?"
3. Offer extended trial (14 days free Pro)
4. Adjust messaging for Public Launch

---

## Cross-References

| Doc                                | Purpose                 | Status    |
| ---------------------------------- | ----------------------- | --------- |
| `revenue-activation-roadmap-c1123` | Phase timeline          | ✅ Done   |
| `product-hunt-draft.md`            | Public Launch (Phase 2) | ⚠️ Update |
| `twitter-thread-draft.md`          | Public Launch (Phase 2) | ⚠️ Update |
| `saas-launch-playbook-c814.md`     | Overall launch strategy | ⚠️ Update |
| `waitlist-launch-announcement`     | Waitlist comms          | ✅ Done   |

---

## Owner Assignments

| Task                        | Owner       | Due       |
| --------------------------- | ----------- | --------- |
| Discord #early-access setup | Human       | Mar 1     |
| Email templates finalized   | Growth      | Mar 10    |
| Wave 1 list curated         | Growth      | Mar 13    |
| Stripe $10 Pro tier         | Engineering | Mar 10    |
| First testimonial gathered  | Growth      | Mar 15    |
| Daily metrics posted        | Growth      | Mar 14-17 |

---

## Post-Soft Launch → Public Launch Bridge

**Mar 17 EOD:** Gather assets for Public Launch:

1. **Social proof numbers:** X signups, Y cycles, Z paid customers
2. **Testimonials:** 2-3 one-liners from Discord
3. **Screenshots:** Real dashboard with real cycles
4. **Bug fixes:** Any Day 1-3 issues resolved

**Mar 18 12:01 AM PT:** Public Launch begins

- Product Hunt submission
- Show HN post
- Twitter thread
- Discord announcement → full community

---

_🚀 Growth | Cycle 1124_
_Per R-017: Shipped tangible launch infrastructure for Revenue Activation Phase 1._
