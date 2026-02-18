# Twitter/X Launch Thread Draft

> **Status:** DRAFT — Updated for SaaS Dashboard Launch
> **Created:** Cycle 764 (2026-02-16) | **Updated:** Cycle 854 (2026-02-18)
> **Owner:** Growth | **SaaS Pivot:** Reflects #158
> **Target:** 8:00 AM PT on launch day (after PH midnight, before Show HN 9 AM)
> **Format:** Thread (14-16 tweets)

---

## Thread Strategy

**Goal:** Social amplification layer for coordinated launch (PH + HN + IH)
**Audience:** Developer Twitter, AI/ML community, indie hackers, solo builders
**Tone:** Technical credibility + founder authenticity + SaaS accessibility
**Hook:** The audacious claim with proof + easy on-ramp

---

## SaaS-First Messaging Notes (C854)

**Key differences from C764 draft:**

- Lead with dashboard signup, CLI as power-user option
- Include pricing (Free tier → Pro → Team)
- "Sign in with GitHub" messaging for low friction
- Updated metrics (850+ cycles, 430+ consecutive, ~2,830 tests)
- Two CTAs: Dashboard URL first, then CLI command
- Emphasize accessibility — no setup required for dashboard

**Why both options:**

Twitter audience spans technical (prefer CLI) and business-focused (prefer dashboard). Leading with dashboard:

- Shows it's a real product, not just OSS project
- Reduces friction — curious devs can try it in 30 seconds
- Demonstrates SaaS business model
- CLI option signals we serve serious developers too

---

## The Thread

### Tweet 1 — Hook (must stand alone)

```
I let AI agents run my codebase autonomously for 30+ days.

850 cycles. 430+ consecutive. Zero human intervention.

Now you can try it in 30 seconds — sign in with GitHub and watch agents work on YOUR repo.

Here's what we built. 🧵
```

**Alt Hook (dashboard-forward):**

```
What if you could deploy an AI dev team to your repo in 30 seconds?

Sign in with GitHub. Connect your repo. Watch agents ship.

We tested it for 850 cycles. Here's how ADA works. 🧵
```

---

### Tweet 2 — The Problem

```
Most AI coding tools are copilots. They wait for you.

I wanted agents that EXECUTE:
→ Triage issues on their own
→ Write and test code
→ Open PRs
→ Update docs
→ Learn from mistakes

No babysitting. Just results.
```

---

### Tweet 3 — The Solution (What is ADA)

```
So I built ADA: Autonomous Dev Agents.

A rotating team of specialized AI agents that work on your repo 24/7.

- 👔 CEO (strategy)
- ⚙️ Engineering (code)
- 🔍 QA (testing)
- 🛡️ Ops (infra)
- 📦 Product (specs)
- 🎨 Design (architecture)

Each takes one action, then passes context to the next.
```

---

### Tweet 4 — Why Multi-Agent

```
Why multiple agents instead of one?

Single agents:
❌ Lose context over time
❌ Go off the rails
❌ No self-correction

Multi-agent rotation:
✅ Narrow scope per role
✅ Shared memory bank
✅ QA catches Engineering mistakes
✅ Ops enforces rules

Different perspectives = better outcomes.
```

---

### Tweet 5 — The Numbers (Proof)

```
The numbers after 850+ cycles:

📈 850 dispatch cycles
🔥 430+ consecutive (no failures)
🧪 2,830+ tests maintained
✅ 89%+ code coverage
📝 80+ PRs merged autonomously
💰 $0.12/cycle average cost

The agents build themselves now.
```

---

### Tweet 6 — Dogfooding Story

```
The wildest part?

ADA builds ADA.

The agents:
• Write the CLI code
• Add their own tests
• Open PRs to fix bugs
• Update documentation
• Optimize their own prompts

Every feature you see was shipped by the agents. 🐕
```

---

### Tweet 7 — Key Insight 1 (Role Specialization)

```
Key insight #1: Specialization beats generalization.

A "QA Agent" focused only on testing writes better tests than a general-purpose agent.

Same for Engineering, Ops, Research.

Narrow scope → deeper expertise → fewer mistakes.
```

---

### Tweet 8 — Key Insight 2 (Memory)

```
Key insight #2: Memory is everything.

Raw logs explode. Context windows overflow.

Our solution: agents compress and curate their own knowledge.

Hot memories stay accessible. Cold ones archive.

Like human memory, but version-controlled.
```

---

### Tweet 9 — Key Insight 3 (Cost)

```
Key insight #3: Model routing saves $$$.

Not every task needs GPT-4.

Our agents use:
• Small models for simple decisions
• Large models for critical code
• Adaptive routing based on complexity

Result: 14% cost savings, no quality loss.
```

---

### Tweet 10 — What Went Wrong

```
What went wrong:

• Early cycles: Agents would commit directly to main 😬
• Memory bloat: 10,000 lines before we added compression
• Role confusion: "CEO" tried to write code (fixed with strict playbooks)
• Cost surprises: Unoptimized prompts burned $ fast

Every failure became a rule in the system.
```

---

### Tweet 11 — Two Ways to Use It (NEW — SaaS focus)

```
Two ways to use ADA:

1️⃣ Dashboard (easiest):
→ Sign in with GitHub
→ Connect your repo
→ Watch agents work in real-time

2️⃣ Self-hosted CLI:
→ npm install -g @ada-ai/cli
→ Full control, your machine

Dashboard for quick start. CLI for power users.
```

---

### Tweet 12 — Pricing (NEW)

```
Pricing that makes sense:

🆓 Free Tier: $20 credits to start
👤 Pro: $19/month (solo builders)
👥 Team: $49/month (shared workspaces)

CLI is MIT-licensed — free forever if you self-host.

We want you to try it before you pay.
```

---

### Tweet 13 — Current State

```
Where we are now:

✅ v1.0.0-alpha live on npm
✅ Dashboard in beta (sign up today)
✅ Works on any repo
✅ 10 specialized agent roles
✅ Self-correcting memory system
✅ Cost-optimized model routing

Ready for early adopters.
```

---

### Tweet 14 — How to Get Started (Dashboard-first CTA)

```
Want to try it?

Dashboard (30 seconds):
🔗 https://ada.dev
→ Sign in with GitHub → Connect repo → Go

Self-hosted CLI:
npm install -g @ada-ai/cli
ada init

Docs: docs.ada.dev
Discord: [link]
```

---

### Tweet 15 — The Vision

```
The vision:

Every repo should have an autonomous dev team.

Not replacing developers — augmenting them.

You focus on strategy. Agents handle execution.

We're early. But 850 cycles of proof says this works.
```

---

### Tweet 16 — CTA + Launch Links

```
We're launching today:

🔶 Product Hunt: [link]
🟧 Hacker News: [link]
🟦 Indie Hackers: [link]

Would love your feedback, ideas, and bug reports.

Reply with what you'd want autonomous agents to do on YOUR repo. 👇
```

---

## Engagement Strategy

### Before Posting

- [ ] Dashboard live at ada.dev (#155 Phase 2 complete)
- [ ] OAuth flow tested (GitHub sign-in → repo select → first dispatch)
- [ ] Billing working (Stripe)
- [ ] Coordinate timing: PH 12:01 AM → HN 6:00 AM → Twitter 8:00 AM PT
- [ ] Queue thread in Twitter/X scheduler
- [ ] Notify Discord community to engage
- [ ] DM 5-10 dev influencers asking for RT

### Hour 1

- [ ] Reply to every comment
- [ ] RT quote tweets with thanks
- [ ] Cross-link to PH/HN posts

### Hour 2-24

- [ ] Post updates: "Top 10 on PH!", "100 signups!"
- [ ] Thread follow-up with interesting feedback
- [ ] Screenshot best comments/reactions

---

## Comment Response Strategy (NEW)

**"Why not just Cursor/Copilot?":**

- Different category — copilots assist, ADA executes
- Multi-agent rotation vs single-agent prompting
- Async/autonomous vs synchronous/interactive
- "For hands-on coding sessions, copilots are great. ADA handles the backlog while you're not coding."

**Security concerns:**

- OAuth scopes are minimal (read/write for connected repos only)
- Self-hosted CLI option for sensitive codebases
- Memory stays in your repo's agents/ folder
- No training on customer code

**Pricing pushback:**

- $19/month < 1 hour of dev time if it saves any meaningful work
- Free tier lets you validate before paying
- CLI is MIT licensed (free forever)

---

## Visual Assets Needed

| Asset                    | Format          | Status   |
| ------------------------ | --------------- | -------- |
| Hook image (cycle count) | 1200x675 PNG    | [ ] TODO |
| Multi-agent diagram      | 1200x675 PNG    | [ ] TODO |
| Dashboard screenshot     | 1200x675 PNG    | [ ] TODO |
| Terminal GIF (dispatch)  | GIF or MP4 clip | [ ] TODO |
| Stats infographic        | 1200x675 PNG    | [ ] TODO |
| Pricing card             | 1200x675 PNG    | [ ] TODO |

**Note:** Tweet 1, Tweet 5, Tweet 11, and Tweet 12 benefit most from visuals.

---

## Alt Thread Hooks (Test Options)

**Option A (SaaS-forward):**

```
Deploy an AI dev team to your repo in 30 seconds.

Sign in with GitHub. Connect your repo. Watch agents ship.

850 cycles of proof. Here's how it works. 🧵
```

**Option B (story):**

```
I gave AI agents full access to my repo.

No supervision. No guardrails. Just "ship features."

Here's what happened over 850 cycles. 🧵
```

**Option C (contrarian):**

```
"AI coding assistants are overhyped."

I agree. That's why we built something different.

850 cycles of autonomous execution. Here's the difference. 🧵
```

---

## Hashtags (Use Sparingly)

- #BuildInPublic (on hook tweet only)
- #DevTools (optional)
- Avoid: #AI #GPT #LLM (over-saturated, low signal)

---

## Success Metrics

| Metric            | Target | Stretch |
| ----------------- | ------ | ------- |
| Impressions       | 50K+   | 200K+   |
| Engagements       | 1K+    | 5K+     |
| Profile visits    | 500+   | 2K+     |
| Link clicks       | 100+   | 500+    |
| Dashboard signups | 25+    | 100+    |
| New followers     | 50+    | 200+    |
| Quote tweets/RTs  | 30+    | 100+    |

---

## Cross-Platform Amplification

**After posting thread:**

1. LinkedIn post (condensed version, link to thread)
2. Discord announcement with thread link
3. Reddit comment linking to thread (if relevant discussion)
4. Email newsletter mention (if applicable)

---

_Draft created C764. Updated C854 for SaaS-first messaging per #158. 3/5 launch drafts now SaaS-ready._
