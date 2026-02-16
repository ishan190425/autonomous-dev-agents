# Show HN Post Draft

> **Status:** DRAFT — Finalize when SaaS billing is live
> **Created:** Cycle 733 (2026-02-16) | **Owner:** Growth
> **Target Post Time:** ~6 AM PT on launch day (peak HN visibility)

---

## Title Options (pick one)

**Option A (direct):**

> Show HN: ADA – Autonomous dev agent teams that run 24/7 on your repo

**Option B (specific):**

> Show HN: ADA – We built an AI dev team that's shipped 700+ cycles on itself

**Option C (outcome-focused):**

> Show HN: ADA – Multi-agent AI team that handles your backlog while you sleep

**Recommended:** Option B — specific claim creates curiosity, and we have the receipts.

---

## Post Body

```
Hi HN,

We built ADA — an autonomous development team powered by AI agents. It's been running 24/7 on its own codebase for 700+ cycles and counting.

**What it does:**

ADA deploys a rotating team of specialized agents (CEO, Engineering, QA, Ops, Research, etc.) to your repo. Each agent has a focused role, takes one action per cycle, and passes context to the next. Think of it like a dev team that never sleeps, never loses context, and costs a fraction of a junior engineer.

**Why we built it:**

We wanted "autonomous dev teams" to be more than a demo. Most AI coding tools are copilots — they wait for you. We wanted agents that execute on their own: triage issues, write code, open PRs, run tests, update docs, and iterate based on what works.

**How it works:**

1. `npm install -g @ada-ai/cli`
2. `ada init` in your repo
3. Set up your agent roster (customize roles or use defaults)
4. `ada dispatch start` — agents take turns executing actions

Agents share a memory bank, follow a rules file, and communicate through GitHub issues/PRs. The rotation prevents any single agent from going off the rails.

**What we learned (building ADA with ADA):**

- Role specialization beats single-agent prompts. An "Engineering" agent focused only on code writes better code than a general-purpose agent juggling everything.
- Memory compression is crucial. Raw logs explode; curated summaries persist.
- 10-role teams with strict rotation catch more edge cases than 3-role teams moving fast.
- Cost optimization matters: role-based model routing (Haiku for simple tasks, Sonnet for most, Opus for critical decisions) cut our costs 14% with no quality loss.

**Current state:**

- v1.0.0-alpha live on npm
- 700+ dispatch cycles completed autonomously
- ~2,500 tests, 89%+ coverage
- The agents maintain this repo themselves

**What we're looking for:**

Feedback. Does this solve a real problem for you? What would make it useful for your projects? We're also curious if anyone has tried similar multi-agent approaches and what you learned.

Try it: `npm install -g @ada-ai/cli && ada init`

Repo: https://github.com/[org]/autonomous-dev-agents

---

Built by a solo founder dogfooding the product on itself. Happy to answer questions.
```

---

## Launch Checklist (pre-post)

- [ ] SaaS billing live (#155 Phase 2 complete)
- [ ] Landing page updated with pricing
- [ ] Demo GIF/video linked in README
- [ ] GitHub repo is public and clean
- [ ] npm package published and working
- [ ] Discord ready for influx
- [ ] Response plan for comments (founder will reply to all)

## Comment Response Strategy

**Technical questions:** Answer in depth. HN loves technical detail.

**Skepticism about autonomy:** Be honest — it works within guardrails, not magic. Share specific examples of what it can/can't do.

**Comparison to X:** Acknowledge other tools, explain the multi-agent difference clearly.

**"This will never work" comments:** Don't argue. Point to the 700+ cycles as proof of concept, invite them to try it.

**Feature requests:** Log them. Respond with "Great idea, logged as [issue link]."

---

## Timing Notes

- **Best days:** Tuesday, Wednesday, Thursday
- **Best time:** 6-8 AM PT (catches US morning + Europe afternoon)
- **Avoid:** Weekends, major tech news days, holidays

## Post-Launch Actions (Hour 1-24)

1. Respond to every comment within 30 minutes (if possible)
2. Monitor sentiment — adjust messaging if needed
3. Track npm install spike
4. Post updates in thread if hitting milestones ("Just passed 100 installs!")
5. Cross-promote on Twitter/X with link to HN thread

---

## Why This Post Should Work

1. **Specific claim:** 700+ cycles is verifiable, not hype
2. **Dogfooding story:** "We built it with itself" is compelling
3. **Technical depth:** Multi-agent architecture is interesting to HN audience
4. **Honest about limitations:** Not claiming AGI, just useful automation
5. **Clear CTA:** One command to try it
6. **Founder available:** Real person answering questions

---

_Draft created C733. Finalize title and update cycle count when launching._
