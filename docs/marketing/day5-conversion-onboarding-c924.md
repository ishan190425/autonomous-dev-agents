# 🚀 Day 5 Conversion & Onboarding Playbook (C924)

> **Created:** 2026-02-19 (Thursday, 9:15 PM EST)  
> **Author:** 🚀 Growth  
> **Status:** ✅ READY TO EXECUTE  
> **Context:** Fills the gap between C914 (launch content) and first signups

---

## Executive Summary

C914 prepared the **acquisition content**. This document prepares the **conversion flow**.

When signups start coming in (Day 5 and beyond), this playbook ensures we:

1. Track where signups come from (attribution)
2. Move signups toward engagement (onboarding)
3. Build community momentum (Discord)
4. Set up the Week 1 nurture cadence

---

## 1. Attribution Tracking

### UTM Parameters (From C874)

All launch content uses consistent UTM parameters:

| Channel  | Source     | Medium    | Campaign             |
| -------- | ---------- | --------- | -------------------- |
| Twitter  | twitter    | social    | waitlist_launch_2026 |
| LinkedIn | linkedin   | social    | waitlist_launch_2026 |
| Discord  | discord    | community | waitlist_launch_2026 |
| Reddit   | reddit     | social    | waitlist_launch_2026 |
| Dev.to   | devto      | blog      | waitlist_launch_2026 |
| HN       | hackernews | social    | waitlist_launch_2026 |
| Direct   | direct     | none      | waitlist_launch_2026 |

### Tracking Implementation

**Option A: Supabase Query (Recommended)**

```sql
-- Signups by source (if UTM stored)
SELECT
  source,
  COUNT(*) as signups,
  DATE(created_at) as date
FROM waitlist
GROUP BY source, DATE(created_at)
ORDER BY signups DESC;
```

**Option B: Manual Tracking**
If UTM not stored, use this spreadsheet format:

| Date   | Total | Twitter | LinkedIn | Discord | Reddit | Direct | Other |
| ------ | ----- | ------- | -------- | ------- | ------ | ------ | ----- |
| Feb 21 |       |         |          |         |        |        |       |
| Feb 22 |       |         |          |         |        |        |       |

### Day 5 Attribution Report Template

```markdown
## Day 5 Signup Attribution

**Total Signups:** [N]
**Time Since Deploy:** [X] hours

| Source   | Signups | % of Total | Cost/Signup  |
| -------- | ------- | ---------- | ------------ |
| Twitter  |         |            | $0 (organic) |
| Discord  |         |            | $0 (organic) |
| LinkedIn |         |            | $0 (organic) |
| Reddit   |         |            | $0 (organic) |
| Direct   |         |            | $0 (organic) |

**Top Performer:** [Source] ([N] signups, [X]% of total)
**Insight:** [What this tells us about our audience]
```

---

## 2. Welcome Email Sequence

### Email 1: Immediate Welcome (Trigger: Signup)

**Subject:** You're in! 🎉 Welcome to the ADA early access list

```
Hey [Name],

You're officially on the ADA early access list.

Quick recap of what you signed up for:
→ Autonomous AI dev agents for your repos
→ A full team (Engineering, QA, Ops, Product) that runs 24/7
→ Early access + $20 bonus credits when we launch

**What happens next:**
1. We're finishing the managed platform (target: March 2026)
2. You'll get first access when it's ready
3. No spam — just launch updates and early adopter perks

**While you wait:**
• Star the repo: github.com/ishan190425/autonomous-dev-agents
• Try the CLI: npm install -g @ada-ai/cli
• Join Discord: [DISCORD_INVITE]

Questions? Reply to this email — we read everything.

— The ADA Team
```

### Email 2: Day 3 (What You're Getting Access To)

**Subject:** What ADA actually does (2-min read)

```
Hey [Name],

You signed up for ADA early access. Here's exactly what you're getting:

**The Problem:**
AI coding tools are copilots. You still drive.

**Our Solution:**
ADA gives your repo an autonomous dev team:
• 👔 CEO — sets strategy from your issues
• ⚙️ Engineering — writes code, opens PRs
• 🔍 QA — writes tests, catches bugs
• 🛡️ Ops — enforces CI/CD, maintains quality
• 📦 Product — defines specs from feedback

They coordinate via shared memory. They learn from mistakes. They work 24/7.

**The Proof:**
We've run 920+ autonomous dispatch cycles on ADA itself. 500+ consecutive with zero failures. The tool builds itself.

**Your Early Access:**
→ Priority onboarding
→ $20 bonus credits
→ Direct Slack/Discord with the team

Platform launch: March 2026. You'll hear from us.

— The ADA Team
```

### Email 3: Day 7 (Social Proof + Engagement)

**Subject:** What early users are saying

```
Hey [Name],

Some quick updates from ADA land:

**Dev log update:**
[Latest milestone — update when available]

**Community growing:**
[X] people are now on the waitlist. You're one of the first.

**Try it now (free):**
The CLI is already live on npm. If you want to experiment:

  npm install -g @ada-ai/cli
  cd your-repo
  ada init

It's free to self-host. The managed platform (what you signed up for) adds hosting, scheduling, and dashboards.

**Stay connected:**
Discord: [INVITE] — say hi in #introductions

See you at launch!

— The ADA Team
```

---

## 3. Discord Onboarding Flow

### Channel Strategy (Post-Launch)

| Channel        | Purpose                             | Who Posts        |
| -------------- | ----------------------------------- | ---------------- |
| #announcements | Waitlist milestones, launch updates | Team only        |
| #introductions | New signups introduce themselves    | Signups          |
| #showcase      | "What would you use ADA for?"       | Community        |
| #questions     | Pre-launch Q&A                      | Community + Team |
| #dev-logs      | Build in public updates             | Team             |

### Welcome Message (Auto-DM on Join)

```
👋 Welcome to the ADA community!

You're early — we're building autonomous AI dev teams and you're going to be among the first to use them.

**Quick start:**
1. Drop a hello in #introductions
2. Tell us what repo you'd want ADA to work on
3. Star the repo if you haven't: github.com/ishan190425/autonomous-dev-agents

**Your early access perks:**
→ Priority onboarding when we launch
→ $20 bonus platform credits
→ Direct access to the team in Discord

Questions? Just ask in #questions.

Let's build something autonomous! 🚀
```

### Engagement Prompts (Post in #showcase)

**Day 1:**

```
🎯 **Question for the community:**

If you had autonomous AI agents working on your repo 24/7, what's the FIRST task you'd assign them?

Reply below 👇 — your ideas might become our first public demos!
```

**Day 3:**

```
🔥 **Early feedback request:**

What's the #1 thing you'd want to see in an AI dev team dashboard?

A) Live activity feed
B) Cost/token tracking
C) PR approval queue
D) Memory/context viewer
E) Something else (reply!)

React with your vote 👇
```

**Day 5:**

```
🚀 **Milestone update:**

[X] people have joined the waitlist in [Y] days.

Top requested features so far:
1. [Feature A]
2. [Feature B]
3. [Feature C]

Keep the feedback coming — we're building this with you.
```

---

## 4. Week 1 Engagement Calendar

| Day            | Email                  | Discord           | Twitter                    |
| -------------- | ---------------------- | ----------------- | -------------------------- |
| Day 0 (Deploy) | Welcome email          | Announcement      | Launch thread              |
| Day 1          | -                      | Engagement prompt | Reply to thread engagement |
| Day 2          | -                      | Dev log post      | Dev log teaser             |
| Day 3          | "What you're getting"  | Feedback poll     | -                          |
| Day 5          | -                      | Milestone update  | Milestone tweet            |
| Day 7          | "What early users say" | -                 | Week 1 recap               |

---

## 5. Conversion Metrics to Track

### Primary Metrics (Day 5 → Day 10)

| Metric          | Target                     | How to Measure       |
| --------------- | -------------------------- | -------------------- |
| Total Signups   | 100 (Day 5) → 200 (Day 10) | Supabase count       |
| Email Open Rate | 50%+                       | Resend analytics     |
| Discord Joins   | 20% of signups             | Discord member count |
| Discord Active  | 30% of joins               | 7-day activity       |
| CLI Installs    | Track trend                | npm stats            |
| GitHub Stars    | Track trend                | Repo stars           |

### Conversion Funnel

```
[Content Impression]
    ↓ (~2% CTR)
[Waitlist Page Visit]
    ↓ (~40% conversion)
[Email Signup]
    ↓ (~50% open)
[Email Read]
    ↓ (~20% action)
[Discord Join / CLI Install / Star]
    ↓ (retained interest)
[Launch Conversion]
```

### Day 10 Go/No-Go Growth Metrics

For Product's Day 10 framework (C917):

| Metric               | GREEN | YELLOW | RED  |
| -------------------- | ----- | ------ | ---- |
| Signups              | ≥50   | 20-49  | <20  |
| Discord Joins        | ≥15   | 5-14   | <5   |
| Email Open Rate      | ≥50%  | 30-49% | <30% |
| Weekly Organic Stars | ≥10   | 3-9    | <3   |

---

## 6. Contingency: Low Signup Scenario

If Day 5 signups < 20:

1. **Analyze attribution** — which channel underperformed?
2. **Boost underperforming channel** — retry with different angle
3. **Extend timeline** — Day 5 → Day 7 assessment
4. **Direct outreach** — DM interested accounts from Twitter replies
5. **Content pivot** — try more technical angle if marketing felt weak

### Recovery Actions

| Issue                  | Recovery                                   |
| ---------------------- | ------------------------------------------ |
| Twitter low engagement | Try evening post time, more technical hook |
| Discord low joins      | Make Discord link more prominent           |
| Email low opens        | A/B test subject lines                     |
| High bounce rate       | Simplify landing page                      |

---

## 7. Integration Points

### With C914 (Launch Content)

- Use UTM parameters defined in C874
- Execute Scenario A or B from C914
- This document handles post-signup flow

### With C904 (Resend Setup)

- Email sequences use Resend for delivery
- Automation triggers on signup

### With C917 (Day 10 Go/No-Go)

- Feed signup metrics into Product's framework
- Growth metrics are weighted inputs to decision

### With #200 (Waitlist)

- Waitlist stores signups in Supabase
- Attribution tracking depends on field schema

---

## Verification Checklist (Pre-Deploy)

- [ ] Welcome email sequence loaded in Resend
- [ ] Discord welcome DM configured
- [ ] #announcements post drafted
- [ ] Attribution tracking confirmed (UTM storage)
- [ ] Day 1-7 calendar blocked for engagement
- [ ] Metrics dashboard ready (Supabase + Resend)

---

## Summary

| Phase       | Document                   | Status   |
| ----------- | -------------------------- | -------- |
| Acquisition | C914 Launch Content        | ✅ Ready |
| Attribution | This doc (UTM tracking)    | ✅ Ready |
| Onboarding  | This doc (email + Discord) | ✅ Ready |
| Nurture     | C894 + C904 (Resend)       | ✅ Ready |
| Conversion  | This doc (metrics)         | ✅ Ready |

**Full pipeline ready.** Awaiting waitlist deploy.

---

_🚀 Growth (The Dealmaker) — Cycle 924_  
_Day 5 Conversion & Onboarding Playbook: Post-signup flow documented, Week 1 engagement calendar set._
