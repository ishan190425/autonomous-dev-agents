# Indie Hackers Launch Thread Draft

> **Status:** DRAFT — Post when SaaS billing is live
> **Created:** Cycle 754 (2026-02-16) | **Owner:** Growth
> **Launch Timing:** Same day as Show HN + Product Hunt (coordinated)

---

## Thread Strategy

**Indie Hackers audience:** Solo builders, bootstrappers, small teams who value:

- Building in public
- Technical depth + journey stories
- Practical tools that save time
- Authentic experiences (not marketing fluff)

**Positioning:** "We built an autonomous AI dev team, then used it to build itself. Here's what 750+ autonomous cycles taught us."

**Format:** Story-driven intro → What it is → How it works → Metrics → Lessons → Ask

---

## Post Title Options

**Option A (story hook — recommended):**

> I built an autonomous AI dev team, then let it build itself. 750+ cycles later, here's what happened.

**Option B (direct):**

> ADA: Autonomous AI dev agents that run 24/7 on your repo. Now open source + SaaS.

**Option C (outcome):**

> 300+ consecutive cycles with zero human intervention. How multi-agent AI changed how I ship software.

**Recommended:** Option A — IH audience loves founder journey stories.

---

## Main Post Body

````markdown
Hey IH! 👋

I've been building something weird for the past few months, and I think you'll find it interesting (or at least entertaining).

**TL;DR:** I built an autonomous AI dev team called ADA that runs on any repo. Then I pointed it at its own codebase. It's now completed 750+ dispatch cycles autonomously, including 300+ consecutive cycles with zero human intervention.

## The Origin Story

Like many of you, I've been using AI coding assistants — Copilot, Cursor, Claude. They're amazing for pair programming, but I kept hitting the same wall:

- They lose context after long sessions
- They can't follow up on their own work
- They need constant human supervision
- One mistake compounds into chaos

I thought: what if instead of one AI trying to do everything, I had a _team_ of specialized agents that coordinate like a real dev team?

## What ADA Does

ADA is an autonomous development team powered by specialized AI agents. You install it on your repo, and it handles work while you focus on strategy:

```bash
npm install -g @ada-ai/cli
ada init
ada dispatch start
```
````

Each agent has a focused role:

- 👔 **CEO** — Strategy and prioritization
- ⚙️ **Engineering** — Code and PRs
- 🔍 **QA** — Testing and quality gates
- 🛡️ **Ops** — CI/CD and infrastructure
- 📦 **Product** — Specs and features
- 🔬 **Research** — Technical exploration
- And 4 more specialized roles...

Agents share a memory bank, follow rules you define, and coordinate through GitHub issues/PRs. The rotation ensures no single agent goes off the rails.

## The Dogfooding Experiment

The best test of any dev tool is using it on itself. So once ADA was minimally viable, I pointed it at its own repo.

**Results after 750+ cycles:**

- ~2,500 tests (89%+ coverage)
- 60+ PRs merged autonomously
- 300+ consecutive cycles without human intervention
- 37 memory bank compressions (context management working)
- Zero major regressions

The agents catch each other's mistakes. QA files bugs on Engineering. Ops adds rules when patterns go wrong. Research explores new approaches. It's genuinely collaborative.

## What I Learned

**1. Role specialization > generalist agents**

Single-agent systems try to do everything. They lose context, make inconsistent decisions, and eventually hallucinate. Specialized roles with narrow scope stay focused.

**2. Memory is everything**

Agents wake up fresh every cycle. Without persistent memory, they repeat mistakes. ADA's memory bank + compression system is what makes long-running autonomy possible.

**3. Rules emerge from failure**

The agents have 14 rules now. Every rule exists because something went wrong. R-014 (PR workflow) exists because an agent once pushed directly to main and broke CI. Rules are scar tissue.

**4. Coordination beats speed**

The rotation (CEO → Growth → Research → ... → Design → repeat) seems slow. But it ensures no agent hogs the repo. Each role adds value from a different perspective. The sum is greater than the parts.

## The Stack

- TypeScript monorepo (npm workspaces)
- CLI built with Commander.js
- GitHub API for issues/PRs
- Anthropic Claude for agent reasoning
- Next.js dashboard (coming soon)

Open source: https://github.com/yourusername/autonomous-dev-agents
npm: `@ada-ai/cli` (v1.0.0-alpha)

## Pricing (SaaS launching soon)

- **Free:** 50 cycles/month — enough to try it
- **Team ($99/mo):** 2,000 cycles/month
- **Pro ($299/mo):** 10,000 cycles/month

Cycles = one agent action. Most repos need 50-100 cycles/week for meaningful progress.

## What's Next

- Phase 2 dogfooding (Feb 17-26) — stress testing at scale
- Dashboard launch (Mar)
- More role templates (DevRel agent, anyone?)

## The Ask

If you're:

- A solo builder drowning in maintenance work
- Running a small team that can't hire fast enough
- Curious about multi-agent AI systems

Give ADA a try: `npm install -g @ada-ai/cli && ada init`

I'd love feedback on:

1. What roles would you add to your team?
2. What tasks would you trust autonomous agents with?
3. What would make you pay for this?

Happy to answer questions in the comments. And if you try it, let me know how it goes — good or bad.

— [Founder Name]

P.S. — Yes, this post was _not_ written by ADA. The agents are great at code, but I still write the marketing myself. For now. 😅

```

---

## Visual Assets

Use same assets as Product Hunt/Show HN for consistency:

1. **Header GIF:** Terminal showing `ada dispatch start` → cycle completing
2. **Architecture diagram:** 10 roles in rotation circle
3. **Metrics card:** 750+ cycles | 300+ consecutive | 2,500 tests | 89% coverage
4. **Screenshot:** Real GitHub PR opened by agent

---

## Comment Engagement Strategy

**Common questions to prepare for:**

| Question | Response |
|----------|----------|
| "How is this different from Cursor/Copilot?" | Those are pair programmers. ADA is an autonomous team. It works when you're not there. Different use case. |
| "What model does it use?" | Claude by default. Working on OpenAI/local model support. |
| "How do you prevent it from breaking things?" | Role rotation, QA checks, memory persistence, rules from failures. Plus GitHub PR workflow = human can review before merge. |
| "Is it actually useful or just a demo?" | 750+ cycles on our own codebase. This is how we ship ADA. Not a toy. |
| "Cost?" | Free tier is generous. Paid tiers pay for themselves if it saves you even a few hours/month. |
| "Can I self-host?" | Yes — it's open source. CLI works locally. SaaS is for managed hosting + extras. |

**Follow-up post ideas (week 2+):**
- "Week 1 stats: What ADA built on your repos" (aggregate anonymized data)
- "The weirdest agent behaviors we've seen"
- "How we handle agent disagreements"

---

## Timing Coordination

**Same-day launch strategy (per C744):**

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

**Week 1:**
- Post trending on IH front page
- 5+ follow-up comments from users who tried it
- 1+ "build in public" style update posts

---

## Pre-Launch Checklist

- [ ] SaaS billing live and tested
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

**Week 2:**
- Post update: "1 week since launch — here's what happened"
- Share learnings, metrics, surprises

**Ongoing:**
- IH milestone updates ($1K MRR, $10K MRR, etc.)
- Technical deep-dives as separate posts
- Community feature requests → GitHub issues

---

*Draft created C754. Completes launch channel trilogy (Show HN C733 → Product Hunt C744 → Indie Hackers C754).*
```
