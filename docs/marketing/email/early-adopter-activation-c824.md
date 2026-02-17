# 📧 Early Adopter Email Sequence

> Email templates for Early Adopter activation (Phase 1 of SaaS launch)
> **Created:** C824 | **Week of Feb 24:** Ready for activation
> **Relates:** #92 (Discord/Early Adopter), #155 (SaaS Container), #200 (Waitlist)

---

## Overview

These emails activate enrolled Early Adopters before and during the SaaS soft launch. The sequence builds anticipation, delivers value, and converts Early Adopters to paying customers.

**Recipients:**

- GitHub Early Adopter enrollees (#92)
- Waitlist signups (#200)

**Timing:** Week of Feb 24 → Mar 15 (Soft Launch)

---

## Email 1: Activation Email (Day -14)

**Subject Options (A/B test):**

- "You're in! 🚀 ADA SaaS preview coming soon"
- "Early Adopter confirmed — here's what's next"
- "Your $20 credit is waiting — ADA SaaS preview in 2 weeks"

**Send Date:** ~Feb 28

---

**Body:**

```
Hey {first_name},

You're officially an ADA Early Adopter. 🎉

Quick recap: You signed up for early access to ADA — the autonomous dev agent framework that lets you deploy AI dev teams on any GitHub repo.

Here's what's coming:

📅 Mar 15: SaaS dashboard launches (soft launch, Early Adopters only)
💰 Your reward: $20 in credits — ~1 month of Pro usage, free
🔑 Your access: 48 hours exclusive before public launch

What can you do NOW:
1. Join our Discord: {discord_invite_link}
   → Look for #early-access (your private channel)
2. Try the CLI: npm install -g @ada-ai/cli && ada init
   → 823+ cycles run autonomously. It works.
3. Reply to this email with questions
   → I read every one.

We've been building ADA with ADA for 5 months. 800+ autonomous cycles. Zero human code commits. The dogfooding is real.

When the dashboard drops, you'll be first in line.

Talk soon,
{sender_name}
Founder, ADA

P.S. We're limiting Early Adopter spots to 50. You're one of them. Don't sleep on the credits.
```

---

## Email 2: SaaS Preview (Day -10)

**Subject Options:**

- "First look: ADA dashboard (your exclusive preview)"
- "👀 Sneak peek — your ADA dashboard is almost ready"
- "See what's coming Mar 15 (Early Adopter preview)"

**Send Date:** ~Mar 5

---

**Body:**

```
Hey {first_name},

The SaaS dashboard is 80% done. Here's your exclusive preview.

[SCREENSHOT: Dashboard overview with agent team visualization]

What you're seeing:
- 🎭 Live agent rotation — watch your dev team cycle in real-time
- 📊 Cycle history — every autonomous action, logged
- 🔑 One-click GitHub connect — no CLI setup required
- 💳 Usage dashboard — see your cycles, manage billing

Coming Mar 15. You get 48 hours exclusive before anyone else.

Quick poll (reply with a number):
1. Most excited about: dashboard visualization
2. Most excited about: no CLI setup
3. Most excited about: $20 free credits
4. Most excited about: being first

Your feedback shapes what we prioritize.

Cheers,
{sender_name}

P.S. The #early-access channel is active. Join the conversation: {discord_invite_link}
```

---

## Email 3: Launch Day (Day 0)

**Subject Options:**

- "🚀 It's live — ADA SaaS is here (your $20 credit inside)"
- "Your Early Adopter access is active — log in now"
- "You're in. ADA SaaS dashboard is live."

**Send Date:** ~Mar 15

---

**Body:**

```
Hey {first_name},

It's here. ADA SaaS is live.

🔗 **Log in now:** {dashboard_url}
💰 **Your credit:** $20 (applied automatically with GitHub OAuth)
⏰ **Exclusive access:** 48 hours before public launch

What to do right now:
1. Click the link above
2. Sign in with GitHub
3. Connect your first repo
4. Watch your AI dev team run its first cycle

Takes 2 minutes. Seriously.

---

**Quick start guide:**

Step 1: Connect repo
→ Choose any repo (start small — a side project is perfect)

Step 2: Configure team
→ We'll auto-generate a team. Tweak roles if you want.

Step 3: Run first cycle
→ Hit "Dispatch" and watch the agents work

Step 4: Review output
→ See the PRs, issues, and commits. Real code, real progress.

---

Your $20 credit = ~100 cycles at Pro tier.
That's 100 autonomous dev cycles on your repo.
Zero cost until you run through the credits.

Questions? Reply here or ping me in #early-access.

Let's build,
{sender_name}

P.S. We're doing 1:1 onboarding calls for the first 10 users who connect a repo. Interested? Reply "YES" and I'll set one up.
```

---

## Email 4: 48h Reminder (Day 2)

**Subject Options:**

- "24 hours left — your exclusive Early Adopter access"
- "⏰ Public launch tomorrow — last chance for quiet access"
- "Before the flood: your last day of exclusive access"

**Send Date:** ~Mar 17

---

**Body:**

```
Hey {first_name},

Quick heads up: Public launch is tomorrow.

Right now, it's just Early Adopters on the platform. Quiet. Fast. Personal support.

Tomorrow, we hit Product Hunt + Hacker News + Twitter. Things will get busy.

If you haven't logged in yet, now's your window:
🔗 {dashboard_url}

**What you might have missed:**
- Your $20 credit is already applied (check billing dashboard)
- You can connect up to 5 repos on Pro tier
- Each cycle runs autonomously — no babysitting needed

**If you already logged in:** High five. Reply and tell me how the first cycle went. I want to know.

**If you're stuck:** Reply with what's blocking you. I'll personally help.

Tomorrow the world discovers ADA. Today, it's just us.

— {sender_name}
```

---

## Email 5: Feedback Request (Day 7)

**Subject Options:**

- "Quick question: How's ADA working for you?"
- "1 week in — what do you think?"
- "Your honest feedback (2 min survey)"

**Send Date:** ~Mar 22

---

**Body:**

```
Hey {first_name},

It's been a week since launch. How's it going?

I'd love your honest feedback — good, bad, or ugly.

**2-minute survey:** {survey_link}

Or just reply to this email with:
- What worked well?
- What was frustrating?
- What's missing?

Every response shapes the roadmap. Early Adopters get priority.

**Quick stats from Week 1:**
- {total_cycles} cycles run by Early Adopters
- {repos_connected} repos connected
- {top_use_case} most popular use case

You're part of something new. Your feedback matters.

Thanks for being early,
{sender_name}

P.S. If you haven't used your credits yet, they don't expire. No pressure — use them when you're ready.
```

---

## Email 6: Conversion Nudge (Day 14)

**Subject Options:**

- "Your credits are 50% used — upgrade for uninterrupted access"
- "Running low on cycles? Here's your next step."
- "From free to Pro: why Early Adopters are upgrading"

**Send Date:** ~Mar 29

**Trigger:** User has used >$10 of credits

---

**Body:**

```
Hey {first_name},

You've run {cycles_used} cycles on ADA. Nice.

Your $20 credit is about 50% used. Here's what happens next:

**Option 1: Keep the free tier**
- 10 cycles/day
- 1 repo
- Perfect for small projects

**Option 2: Upgrade to Pro ($19/mo)**
- 100 cycles/day
- 5 repos
- Priority support in Discord
- What most Early Adopters choose

No pressure either way. Free tier is genuinely useful.

But if you're seeing results — if ADA is shipping code you'd otherwise write yourself — Pro is a no-brainer at $19.

**Upgrade here:** {upgrade_url}

Questions about which tier fits? Reply and I'll help you figure it out.

Cheers,
{sender_name}
```

---

## Technical Integration Notes

### Email Service

**Recommended:** Resend (developer-friendly, simple API)

- Integrates with waitlist (#200)
- Transactional + marketing in one
- Good deliverability

### Merge Fields Required

| Field                   | Source                   |
| ----------------------- | ------------------------ |
| `{first_name}`          | GitHub profile / signup  |
| `{dashboard_url}`       | SaaS dashboard URL       |
| `{discord_invite_link}` | Permanent Discord invite |
| `{survey_link}`         | Typeform / Google Form   |
| `{cycles_used}`         | Usage API                |
| `{sender_name}`         | "Ishan" or configured    |

### Segmentation

- **Early Adopters (GitHub):** Enrolled via #92
- **Waitlist signups:** Captured via #200
- **Active users:** Logged in at least once
- **Engaged users:** Ran 10+ cycles
- **At-risk:** Credits running low, no recent activity

### Automation Triggers

| Email   | Trigger                           |
| ------- | --------------------------------- |
| Email 1 | Day -14 (manual send)             |
| Email 2 | Day -10 (manual send)             |
| Email 3 | Day 0 — SaaS launch (manual send) |
| Email 4 | Day 2 — 48h after launch          |
| Email 5 | Day 7 — 1 week post-launch        |
| Email 6 | User credits > 50% used           |

---

## Metrics to Track

| Metric                                  | Target |
| --------------------------------------- | ------ |
| Open rate (Email 1)                     | >50%   |
| Reply rate                              | >10%   |
| Dashboard login (within 48h of Email 3) | >60%   |
| Repo connected (within 1 week)          | >40%   |
| Pro conversion (within 30 days)         | >20%   |

---

## Next Steps

1. **Growth (C824):** ✅ Create this email sequence
2. **Human/Ops:** Connect Resend to waitlist (#200)
3. **Engineering:** Add usage API for merge fields
4. **Growth (Week of Feb 24):** Schedule Email 1 for Feb 28
5. **Growth (Mar 5):** Schedule Email 2 (preview)
6. **Growth (Mar 15):** Execute Email 3 (launch day)

---

_🚀 Growth | Cycle 824_
