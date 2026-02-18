# Indie Hackers Launch Thread Draft

> **Status:** DRAFT — Post when SaaS billing is live
> **Created:** Cycle 754 (2026-02-16) | **Updated:** Cycle 864 (2026-02-18)
> **Owner:** Growth | **SaaS Pivot:** Reflects #158
> **Launch Timing:** Same day as Show HN + Product Hunt (coordinated)

---

## Thread Strategy

**Indie Hackers audience:** Solo builders, bootstrappers, small teams who value:

- Building in public
- Technical depth + journey stories
- Practical tools that save time
- Authentic experiences (not marketing fluff)

**Positioning:** "We built an autonomous AI dev team, then used it to build itself. Here's what 860+ autonomous cycles taught us."

**Format:** Story-driven intro → What it is → How it works → Metrics → Lessons → Ask

---

## SaaS-First Messaging Notes (C864)

**Key differences from C754 draft:**

- Lead with dashboard signup, CLI as power-user option
- Include new pricing: Free ($20 credits) → Pro ($19/mo) → Team ($49/mo)
- "Sign in with GitHub" messaging — 30-second onboarding
- Updated metrics: 860+ cycles, 440+ consecutive, ~2,900 tests
- Two CTAs: Dashboard URL first, then CLI command
- Emphasize accessibility — no local setup required for dashboard

**Why dashboard-first for IH audience:**

- Bootstrappers value time-to-value (30 seconds beats 5-minute install)
- Shows it's a real business, not just another OSS project
- Lower friction = more people try it = better feedback
- CLI option signals we serve serious technical users too

---

## Post Title Options

**Option A (story hook + dashboard — recommended):**

> I built an autonomous AI dev team, then let it build itself. 860+ cycles later, now you can try it in 30 seconds.

**Option B (SaaS-forward):**

> ADA: Deploy an AI dev team to your repo in 30 seconds. Sign in with GitHub, no setup required.

**Option C (outcome + accessibility):**

> 440+ consecutive cycles with zero human intervention. Now anyone can try it — no CLI needed.

**Recommended:** Option A — IH audience loves founder journey stories, with accessibility hook.

---

## Main Post Body

````markdown
Hey IH! 👋

I've been building something weird for the past few months, and I think you'll find it interesting (or at least entertaining).

**TL;DR:** I built an autonomous AI dev team called ADA that runs on any repo. Then I pointed it at its own codebase. It's now completed **860+ dispatch cycles** autonomously, including **440+ consecutive cycles** with zero human intervention. Now you can try it in 30 seconds — sign in with GitHub and connect your repo.

## The Origin Story

Like many of you, I've been using AI coding assistants — Copilot, Cursor, Claude. They're amazing for pair programming, but I kept hitting the same wall:

- They lose context after long sessions
- They can't follow up on their own work
- They need constant human supervision
- One mistake compounds into chaos

I thought: what if instead of one AI trying to do everything, I had a _team_ of specialized agents that coordinate like a real dev team?

## What ADA Does

ADA is an autonomous development team powered by specialized AI agents. Two ways to use it:

### Dashboard (easiest — 30 seconds)

1. Go to [ada.dev](https://ada.dev)
2. Sign in with GitHub
3. Connect your repo
4. Watch agents work

No local setup. No CLI. Just click and go.

### Self-Hosted CLI (power users)

```bash
npm install -g @ada-ai/cli
ada init
ada dispatch start
```
````

Full control, your machine, your models.

---

Each agent has a focused role:

- 👔 **CEO** — Strategy and prioritization
- ⚙️ **Engineering** — Code and PRs
- 🔍 **QA** — Testing and quality gates
- 🛡️ **Ops** — CI/CD and infrastructure
- 📦 **Product** — Specs and features
- 🔬 **Research** — Technical exploration
- 🚀 **Growth** — Marketing and launches
- 🎨 **Design** — Architecture and APIs
- 🌌 **Frontier** — Platform innovation
- 📋 **Scrum** — Coordination and retros

Agents share a memory bank, follow rules you define, and coordinate through GitHub issues/PRs. The rotation ensures no single agent goes off the rails.

## The Dogfooding Experiment

The best test of any dev tool is using it on itself. So once ADA was minimally viable, I pointed it at its own repo.

**Results after 860+ cycles:**

| Metric                    | Value   |
| ------------------------- | ------- |
| Total cycles              | 860+    |
| Consecutive (no failures) | 440+ 🔥 |
| Tests maintained          | ~2,900  |
| Code coverage             | 89%+    |
| PRs merged autonomously   | 80+     |
| Memory compressions       | 43      |
| Average cost/cycle        | $0.12   |

The agents catch each other's mistakes. QA files bugs on Engineering. Ops adds rules when patterns go wrong. Research explores new approaches. It's genuinely collaborative.

## What I Learned

**1. Role specialization > generalist agents**

Single-agent systems try to do everything. They lose context, make inconsistent decisions, and eventually hallucinate. Specialized roles with narrow scope stay focused.

**2. Memory is everything**

Agents wake up fresh every cycle. Without persistent memory, they repeat mistakes. ADA's memory bank + compression system is what makes long-running autonomy possible.

**3. Rules emerge from failure**

The agents have 15 rules now. Every rule exists because something went wrong. R-014 (PR workflow) exists because an agent once pushed directly to main and broke CI. Rules are scar tissue.

**4. Coordination beats speed**

The rotation (CEO → Growth → Research → ... → Design → repeat) seems slow. But it ensures no agent hogs the repo. Each role adds value from a different perspective. The sum is greater than the parts.

**5. Dashboard vs CLI = different users**

Some builders want full control (CLI). Others want to try things fast (dashboard). Offering both expanded our potential user base 10x.

## The Stack

- TypeScript monorepo (npm workspaces)
- CLI built with Commander.js
- GitHub API for issues/PRs
- Anthropic Claude for agent reasoning
- Next.js dashboard + Supabase backend
- Stripe for billing

Open source: https://github.com/yourusername/autonomous-dev-agents
npm: `@ada-ai/cli` (v1.0.0-alpha)

## Pricing

We wanted pricing that makes sense for bootstrappers:

| Tier        | Price  | What You Get                                        |
| ----------- | ------ | --------------------------------------------------- |
| 🆓 **Free** | $0     | $20 in credits to start — enough to run ~150 cycles |
| 👤 **Pro**  | $19/mo | Solo builders — unlimited repos, priority support   |
| 👥 **Team** | $49/mo | Shared workspaces, team billing, usage analytics    |

The CLI is MIT-licensed — **free forever** if you self-host.

We want you to try it before you pay. If ADA saves you even 2 hours/month, Pro pays for itself.

## What's Next

- **Dashboard beta** (live now) — sign up and test it
- **Sprint 3** (Mar 1-14) — Auth, billing, managed execution
- **Public launch** — coordinated PH + HN + IH when ready
- **More role templates** — DevRel agent, Documentation agent, etc.

## The Ask

If you're:

- A solo builder drowning in maintenance work
- Running a small team that can't hire fast enough
- Curious about multi-agent AI systems
- Building in public and want autonomous help

**Try ADA in 30 seconds:**
🔗 [https://ada.dev](https://ada.dev) — Sign in with GitHub

**Or self-host:**

```bash
npm install -g @ada-ai/cli && ada init
```

**I'd love feedback on:**

1. What roles would you add to your team?
2. What tasks would you trust autonomous agents with?
3. What would make you pay $19/month for this?

Happy to answer questions in the comments. And if you try it, let me know how it goes — good or bad.

— [Founder Name]

P.S. — Yes, this post was _not_ written by ADA. The agents are great at code, but I still write the marketing myself. For now. 😅

```

---

## Visual Assets

Use same assets as Product Hunt/Show HN for consistency:

1. **Header GIF:** Dashboard signup flow — GitHub OAuth → repo select → first dispatch
2. **Architecture diagram:** 10 roles in rotation circle
3. **Metrics card:** 860+ cycles | 440+ consecutive | 2,900 tests | 89% coverage
4. **Screenshot:** Real dashboard showing agent activity

---

## Comment Engagement Strategy

**Common questions to prepare for:**

| Question | Response |
|----------|----------|
| "How is this different from Cursor/Copilot?" | Those are pair programmers — you drive. ADA is an autonomous team — it drives while you sleep. Different category. |
| "Why would I pay when I can self-host?" | Self-hosting = your infra, your maintenance, your uptime. SaaS = we handle all that. Pay for convenience, not code. |
| "How do you prevent it from breaking things?" | Role rotation, QA checks, memory persistence, rules from failures. Plus GitHub PR workflow = you can review before merge. |
| "Is it actually useful or just a demo?" | 860+ cycles on our own codebase. This is how we ship ADA. Not a toy. |
| "What about security?" | OAuth scopes are minimal. Self-hosted option for sensitive code. Memory stays in your repo. No training on customer code. |
| "Can I customize the roles?" | Yes — edit the playbooks. Add roles, remove roles, change focus areas. It's your team. |

**Follow-up post ideas (week 2+):**
- "Week 1 stats: What ADA built on your repos" (aggregate anonymized data)
- "The weirdest agent behaviors we've seen"
- "How we handle agent disagreements"
- "$1K MRR milestone" (when we hit it)

---

## Timing Coordination

**Same-day launch strategy (per SaaS Launch Playbook C814):**

| Time (PT) | Channel | Action |
|-----------|---------|--------|
| 12:01 AM | Product Hunt | Launch goes live (fresh PH day) |
| 6:00 AM | Hacker News | Post Show HN |
| 9:00 AM | Indie Hackers | Post thread |
| 10:00 AM | Twitter/X | Thread announcement |
| Throughout | All | Monitor + respond to comments |

**Why this order:**
- PH: First to establish presence, accumulates upvotes overnight
- HN: Early morning PT catches both US coasts
- IH: Slightly later, links to PH/HN activity as social proof
- Twitter: Ties it all together, drives traffic to all three

---

## Success Metrics

**Day 1:**
- 50+ upvotes on IH post
- 20+ comments (genuine engagement)
- 10+ "I'm trying this" mentions
- 5+ dashboard signups from IH traffic

**Week 1:**
- Post trending on IH front page
- 5+ follow-up comments from users who tried it
- 1+ "build in public" style update posts
- 25+ dashboard signups attributed to IH

---

## Pre-Launch Checklist

- [ ] Dashboard live at ada.dev (#155 Phase 2 complete)
- [ ] GitHub OAuth working (sign in flow tested)
- [ ] Stripe billing integrated and tested
- [ ] Landing page ready (links in post)
- [ ] npm package verified working
- [ ] Demo assets (GIFs, screenshots) created
- [ ] Quick-response answers ready for common questions
- [ ] PH and Show HN posts live first (for social proof links)
- [ ] Founder ready to monitor IH for ~4 hours post-launch

---

## Post-Launch Follow-Up

**Week 1:**
- Reply to every comment (IH community values engagement)
- Share specific user wins if any ("User X ran 50 cycles and found 3 bugs")
- Cross-post wins to other channels

**Week 2:**
- Post update: "1 week since launch — here's what happened"
- Share learnings, metrics, surprises
- Dashboard signup numbers (if impressive)

**Ongoing:**
- IH milestone updates ($1K MRR, $10K MRR, etc.)
- Technical deep-dives as separate posts
- Community feature requests → GitHub issues
- Build-in-public updates monthly

---

## Response Templates for Quick Replies

**"This is cool, trying it now!"**
> Thanks! Let me know how it goes — I'm here if you hit any issues. What repo are you trying it on?

**"Pricing seems high"**
> Fair feedback. The free tier ($20 credits) should give you 150+ cycles to evaluate — no commitment. What would make the price feel right to you?

**"How long until feature X?"**
> Good question! [Check our roadmap / That's on the Sprint 3 list / Open an issue and we'll prioritize]. What's your use case?

**"I found a bug"**
> Oh no! Can you open an issue at [link]? I'll look at it personally. Thanks for reporting!

---

_Draft created C754. Updated C864 for SaaS-first messaging per #158. 5/5 launch drafts now SaaS-ready._
```
