# Show HN Post Draft

> **Status:** DRAFT — Updated for SaaS Dashboard Launch
> **Created:** Cycle 733 (2026-02-16) | **Updated:** Cycle 844 (2026-02-18)
> **Owner:** Growth | **SaaS Pivot:** Reflects #158
> **Target Post Time:** ~6 AM PT on launch day (peak HN visibility)

---

## Title Options (pick one)

**Option A (SaaS angle — recommended):**

> Show HN: ADA – Sign in, connect your repo, watch AI agents ship code

**Option B (dogfooding proof):**

> Show HN: ADA – Our AI dev team has shipped 840+ cycles on its own codebase

**Option C (direct):**

> Show HN: ADA – A dashboard for autonomous dev agent teams on your repos

**Recommended:** Option B — specific claim creates curiosity, and we have the receipts. Works well for HN's technical audience.

---

## Post Body

```
Hi HN,

We built ADA — an autonomous development team powered by rotating AI agents. It's been running 24/7 on its own codebase for 840+ cycles and counting.

**The Problem:**

AI coding tools today are copilots — they wait for you to prompt them. We wanted agents that execute on their own: triage issues, write code, open PRs, run tests, update docs, and iterate based on what works.

**What it does:**

ADA deploys a rotating team of specialized agents (CEO, Engineering, QA, Ops, Research, etc.) to your repo. Each agent has a focused role, takes one action per cycle, and passes context to the next. Think of it like a dev team that never sleeps, never loses context, and costs a fraction of a junior engineer.

**Two ways to use it:**

1. **Dashboard (new):** Sign in with GitHub, connect your repo, watch agents work in real-time. No CLI setup required.

2. **Self-hosted CLI:** `npm install -g @ada-ai/cli && ada init` — for developers who want full control.

**How it works under the hood:**

- Agents share a memory bank (compressed context that persists)
- Strict rotation prevents any single agent from going off the rails
- Role specialization beats single-agent prompts — an "Engineering" agent focused only on code writes better code than a general-purpose agent juggling everything
- Communication happens through GitHub issues/PRs — human-readable, auditable

**What we learned (building ADA with ADA):**

- Memory compression is crucial. Raw logs explode; curated summaries persist.
- 10-role teams with strict rotation catch more edge cases than 3-role teams moving fast.
- Role-based model routing (cheaper models for simple tasks, expensive for critical decisions) cut costs 14% with no quality loss.
- 420+ consecutive cycles without human intervention proved the architecture works.

**Current state:**

- v1.0.0-alpha live on npm
- Dashboard in private beta (launching soon)
- 840+ dispatch cycles completed autonomously
- ~2,800 tests, 89%+ coverage
- The agents maintain this repo themselves

**Pricing:**

- **Free tier:** $20 credits to start
- **Pro:** $19/month for solo builders
- **Team:** $49/month for teams with shared workspaces

**What we're looking for:**

Feedback. Does this solve a real problem for you? We're especially curious about:
- Use cases we haven't thought of
- What would make you trust autonomous agents on your production repos
- Anyone who's tried similar multi-agent approaches

**Try it:**

Dashboard: https://ada.dev (sign in with GitHub)
CLI: `npm install -g @ada-ai/cli && ada init`
Repo: https://github.com/[org]/autonomous-dev-agents

---

Built by a solo founder dogfooding the product on itself. Happy to answer questions.
```

---

## SaaS-First Messaging Notes (C844)

**Key differences from C733 draft:**

- Lead with dashboard, CLI as option for power users
- Pricing prominently included (Free tier → Pro → Team)
- "Sign in with GitHub" is primary CTA
- Dashboard URL before CLI install command
- Updated metrics (840+ cycles, 2,800+ tests, 420+ consecutive)

**Why both options for HN:**

HN audience skews technical. Many will prefer self-hosted CLI. But leading with dashboard:

- Shows it's a real product, not just a toy
- Reduces friction for curious readers who want to try it
- Demonstrates SaaS business model (not just OSS project)

---

## Launch Checklist (pre-post)

- [ ] Dashboard live and accepting signups (#155 Phase 2 complete)
- [ ] OAuth flow tested (GitHub sign-in → repo select → first dispatch)
- [ ] Billing integration working (Stripe subscription management)
- [ ] Landing page at ada.dev with pricing
- [ ] Demo GIF/video in README showing dashboard
- [ ] npm CLI published and working
- [ ] Discord ready for influx
- [ ] Response plan for comments (founder will reply to all)

## Comment Response Strategy

**Technical questions:** Answer in depth. HN loves technical detail. Share architecture diagrams if useful.

**Skepticism about autonomy:** Be honest — it works within guardrails, not magic. Share specific examples: "In 840 cycles, we've seen X edge cases caught by QA role, Y infrastructure improvements by Ops."

**"Why not just Cursor/Copilot?":**

- Different category — copilots assist, ADA executes
- Multi-agent rotation vs single-agent prompting
- Async/autonomous vs synchronous/interactive
- Acknowledge: "For hands-on coding sessions, copilots are great. ADA handles the backlog while you're not coding."

**Security concerns:**

- OAuth scopes are minimal (read/write for connected repos only)
- Self-hosted CLI option for sensitive codebases
- Memory stays in your repo's agents/ folder
- No training on customer code

**Pricing pushback:**

- $19/month < 1 hour of dev time if it saves you any meaningful work
- Free tier lets you validate before paying
- Self-hosted CLI is MIT licensed (free forever)

**Feature requests:** Log them. Respond with "Great idea, logged as [issue link]."

---

## Timing Notes

- **Best days:** Tuesday, Wednesday, Thursday
- **Best time:** 6-8 AM PT (catches US morning + Europe afternoon)
- **Avoid:** Weekends, major tech news days, holidays

## Post-Launch Actions (Hour 1-24)

1. Respond to every comment within 30 minutes (if possible)
2. Monitor sentiment — adjust messaging if needed
3. Track dashboard signups + npm installs
4. Post updates in thread if hitting milestones ("Just passed 100 signups!")
5. Cross-promote on Twitter/X with link to HN thread
6. Update Discord with link to HN thread for community engagement

---

## Why This Post Should Work

1. **Specific claim:** 840+ cycles is verifiable, not hype
2. **Dogfooding story:** "We built it with itself" is compelling
3. **Technical depth:** Multi-agent architecture is interesting to HN audience
4. **Two options:** Dashboard for easy start, CLI for power users
5. **Clear pricing:** Transparent, not "contact sales"
6. **Honest about limitations:** Not claiming AGI, just useful automation
7. **Clear CTAs:** Dashboard URL first, then CLI command
8. **Founder available:** Real person answering questions

---

_Draft created C733. Updated C844 for SaaS-first messaging per #158._
