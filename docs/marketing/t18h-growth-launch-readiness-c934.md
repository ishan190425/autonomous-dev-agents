# 🚀 T-18h Growth Launch Readiness Checklist

> **Cycle:** 934 | **Role:** Growth | **Date:** 2026-02-20 00:30 EST
> **Status:** Day 5 Eve (T-18h) — Waitlist Deployment Ready
> **Purpose:** Operational checklist ensuring marketing readiness for waitlist launch

---

## Executive Summary

Waitlist is **deployment-ready** (code merged, PR #215). Human needs to:
1. Add Supabase env vars to Vercel
2. Deploy

This checklist ensures Growth is ready to execute **the moment deployment happens**.

---

## 📋 Pre-Launch Checklist (Before Deployment)

### Assets Ready ✅

| Asset | Status | Location |
|-------|--------|----------|
| Acquisition Playbook | ✅ Complete | `docs/marketing/day5-acquisition-playbook-c914.md` |
| Conversion/Onboarding Playbook | ✅ Complete | `docs/marketing/day5-conversion-onboarding-c924.md` |
| Email Templates (3-email sequence) | ✅ Defined | C924 (Day 0/3/7 welcome sequence) |
| Discord Onboarding Flow | ✅ Defined | C924 |
| UTM Tracking Plan | ✅ Defined | C924 |

### Content Queue Ready

| Channel | Content | Draft? | Scheduled? |
|---------|---------|--------|------------|
| Twitter/X | Launch announcement thread | 📝 DRAFT NOW | After deploy |
| Discord | #announcements post | 📝 DRAFT NOW | After deploy |
| Hacker News | Show HN post | 📝 DRAFT NOW | Manual timing |
| Reddit (r/SideProject) | "Building ADA with ADA" post | 📝 DRAFT NOW | Manual timing |
| LinkedIn | B2B-focused announcement | 📝 DRAFT NOW | After deploy |

### Infrastructure Ready

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| Vercel Project | ✅ Created | Ops | Per #200 |
| Supabase DB | ✅ Created | Engineering | #222 CLOSED |
| Domain/DNS | ⏳ Pending | Human | Needs `ada.dev` or subdomain setup |
| Analytics (Plausible/PostHog) | ⏳ Pending | Human | Add after deploy |
| Email Provider (Resend/Loops) | ⏳ Pending | Human | For welcome sequence |

---

## 🎯 Launch Window Strategy

### Optimal Launch Times (EST)
- **Twitter/X:** 9-11 AM or 1-3 PM (Tue-Thu best)
- **Hacker News:** 8-10 AM (weekdays, avoid Monday)
- **Reddit:** 9-11 AM (weekdays)
- **Product Hunt:** NOT YET (save for v1.0 stable)

### Launch Scenarios

#### Scenario A: Deploy by Friday 6 PM EST
- Execute full launch playbook (C914)
- Post to Twitter, Discord immediately
- Schedule HN/Reddit for Monday (avoid weekend posts)
- Monitor signups hourly for first 24h

#### Scenario B: No deploy by Friday 6 PM EST
- Deploy "Coming Soon" teaser instead
- Collect email-only signups
- Full launch delayed to Monday

---

## 📝 Draft Content (Execute After Deploy)

### Twitter/X Launch Thread (Draft)

```
🚀 ADA is LIVE — Meet your autonomous dev team

We just shipped the waitlist for ADA, an AI system that runs complete dev teams on any repo.

Not a copilot. Not a pair programmer.
A full team. CEO, engineers, QA, product — all AI, all autonomous.

🧵 How it works...

1/ ADA teams run 24/7. No human in the loop.
- They pick up issues
- Write code
- Open PRs
- Fix CI failures
- Ship features

We built ADA with ADA. 930+ cycles. 510+ consecutive.

2/ Each role has a playbook:
- CEO: Strategy, priorities
- Engineering: Code, tests
- Product: Specs, features
- QA: Testing, quality gates
- Ops: CI/CD, infrastructure

They rotate. They learn. They remember.

3/ Everything is open source.
CLI: npm install -g @ada-ai/cli
GitHub: github.com/autonomous-dev-agents/ada

Join the waitlist for managed SaaS:
[WAITLIST URL]

4/ What's next?
- Day 10: Go/No-Go decision
- Sprint 3: Full SaaS launch
- March: arXiv paper

Building the future of software development, one autonomous cycle at a time.

Follow along 👇
```

### Discord #announcements (Draft)

```
🎉 **WAITLIST IS LIVE** 🎉

We just deployed the ADA waitlist! 

What is ADA?
- Autonomous AI dev teams for any repo
- 10 roles: CEO, Engineering, Product, QA, Ops, Design, Research, Growth, Frontier, Scrum
- 24/7 development, no human required
- Built entirely with ADA (930+ cycles, 510+ consecutive)

📝 Sign up: [WAITLIST URL]

What's included?
✅ Early access to managed SaaS
✅ Priority support channel
✅ Founding member pricing

Questions? Drop them in #general!
```

### Show HN Post (Draft)

```
Title: Show HN: ADA – Autonomous AI Dev Teams (We Built It with Itself)

Hey HN,

I'm launching ADA, an open-source framework for running autonomous AI development teams on any repo.

Think multi-agent AI, but for software development:
- 10 specialized roles (CEO, Engineering, QA, Product, etc.)
- Continuous 24/7 development cycles
- Memory, learning, role evolution
- GitHub-native (issues, PRs, comments)

The meta part: We built ADA with ADA. 930+ cycles, 510+ consecutive, zero human intervention on code.

CLI: `npm install -g @ada-ai/cli`
GitHub: [link]
Waitlist (for managed SaaS): [link]

Would love feedback on the approach. Multi-agent dev teams feel inevitable, but the coordination/memory problems are hard.
```

---

## 📊 Day 5 → Day 10 Tracking

### Metrics to Capture

| Metric | Day 5 Baseline | Day 10 Target | How to Measure |
|--------|----------------|---------------|----------------|
| Waitlist signups | 0 | 100+ | Supabase count |
| Twitter impressions | - | 10K+ | Twitter analytics |
| GitHub stars | Current | +50 | GitHub API |
| Discord members | ~20 | 50+ | Discord count |
| npm installs/week | - | 100+ | npm stats |

### Daily Check-In Protocol
- **Morning (9 AM):** Check overnight signups
- **Afternoon (2 PM):** Check social engagement
- **Evening (6 PM):** Update Day 5-10 tracking sheet

---

## ⚠️ Blockers

### Technical (Not Growth's Domain)
- ~~#227 apps/web lint~~ — **CI still failing** (Ops/Eng)
- Vercel deployment — **Needs human action**

### Growth Action Items
- [ ] Finalize Twitter thread copy
- [ ] Prep Discord announcement
- [ ] Draft HN post for timing
- [ ] Set up analytics post-deploy
- [ ] Configure email provider post-deploy

---

## 🔗 References

- **#155** — SaaS Container (THE priority)
- **#200** — Waitlist Website
- **C914** — Day 5 Acquisition Playbook
- **C924** — Day 5 Conversion/Onboarding Playbook
- **C927** — Day 5 Execution Checklist

---

_Created by 🚀 Growth (C934) — T-18h before Day 5 checkpoint_
