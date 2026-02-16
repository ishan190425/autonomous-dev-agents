# Product Hunt Launch Page Draft

> **Status:** DRAFT — Finalize when SaaS billing is live
> **Created:** Cycle 744 (2026-02-16) | **Owner:** Growth
> **Target Launch:** ~12:01 AM PT on launch day (start of fresh PH day)

---

## Core Launch Assets

### Tagline Options (max 60 chars)

**Option A (direct):**

> Autonomous AI dev teams that run 24/7 on your repo

**Option B (outcome):**

> Ship 2x faster with AI agents that never sleep

**Option C (specific — recommended):**

> 700+ cycles completed autonomously. Your repo is next.

**Recommended:** Option C — the specific number creates credibility and curiosity.

### Short Description (max 260 chars)

> Deploy a rotating team of specialized AI agents to your repo. Engineering, QA, Ops, Research — each agent has a focused role, takes one action per cycle, and passes context to the next. Built by agents, for agents. 700+ cycles and counting.

### Topics/Categories

- **Primary:** Developer Tools
- **Secondary:** Artificial Intelligence, Productivity, Open Source

---

## Product Hunt Page Content

### Gallery Assets (prepare these)

1. **Hero Image:** ADA logo + "Autonomous Dev Agents" tagline + cycle counter
2. **GIF 1:** `ada init` → team roster appearing
3. **GIF 2:** `ada dispatch start` → agent taking action
4. **Screenshot 1:** GitHub PR opened by agent (real example from our repo)
5. **Screenshot 2:** Memory bank showing coordination
6. **Screenshot 3:** Terminal showing multiple cycles completing

### Full Description

````markdown
## What is ADA?

ADA is an autonomous development team powered by specialized AI agents. Install it on your repo, and it handles the work while you focus on what matters.

## How It Works

1. **Install:** `npm install -g @ada-ai/cli`
2. **Initialize:** `ada init` creates your agent roster
3. **Launch:** `ada dispatch start` — agents begin their rotation

Each agent has a focused role:

- 👔 **CEO** — Strategy and prioritization
- ⚙️ **Engineering** — Code and PRs
- 🔍 **QA** — Testing and quality
- 🛡️ **Ops** — CI/CD and infrastructure
- 📦 **Product** — Specs and features
- 🎨 **Design** — Architecture and UX
- And more...

Agents share a memory bank, follow your rules, and coordinate through GitHub. The rotation ensures no single agent goes off track.

## Built With ADA

We dogfood ADA on itself. The agents have completed **700+ dispatch cycles** autonomously on this codebase:

- ~2,500 tests maintained
- 89%+ code coverage
- 60+ PRs merged
- 300+ consecutive cycles without human intervention

## Why Multi-Agent?

Single-agent approaches lose context and go off the rails. Multi-agent systems with role specialization:

- **Stay focused:** Each role has a narrow scope
- **Share context:** Memory bank persists across cycles
- **Self-correct:** QA catches Engineering mistakes, Ops enforces rules
- **Scale safely:** Add roles as your needs grow

## Pricing

- **Free:** 50 cycles/month (try it risk-free)
- **Team ($99/mo):** 2,000 cycles/month
- **Pro ($299/mo):** 10,000 cycles/month

## Get Started

```bash
npm install -g @ada-ai/cli
ada init
ada dispatch start
```
````

GitHub: [link]
Docs: [link]
Discord: [link]

````

---

## Maker's First Comment

```markdown
Hey Product Hunt! 👋

I'm the founder of ADA, and I've been building this in a pretty unusual way — the AI agents build themselves.

**The origin story:**

I wanted "autonomous dev teams" to be real, not just a demo. Most AI coding tools are copilots — they wait for you. I wanted agents that execute on their own: triage issues, write code, open PRs, run tests, update docs, and learn from what works.

**What I learned (building ADA with ADA):**

1. **Role specialization beats general-purpose prompts.** An "Engineering" agent focused only on code writes better code than a jack-of-all-trades agent.

2. **Memory matters.** Raw logs explode. The agents compress and curate their own knowledge.

3. **Rotation prevents chaos.** Taking turns with clear handoffs catches mistakes early.

4. **Cost optimization is essential.** We use smaller models for simple tasks, larger models for critical decisions. 14% cost savings with no quality loss.

**Where we are:**

- v1.0.0-alpha is live on npm
- 700+ autonomous cycles completed
- ~2,500 tests, 89%+ coverage
- Actively used by the agents maintaining this project 🐕

**What I'm looking for:**

- Feedback on what would make this useful for your projects
- Bug reports (we're in alpha!)
- Ideas for roles you'd want to add

Happy to answer any questions. The agents and I are excited to see what you build! 🚀
````

---

## Launch Checklist

### Pre-Launch (Complete Before Submitting)

- [ ] SaaS billing live (#155 Phase 2 complete)
- [ ] Landing page updated with pricing
- [ ] Demo GIFs/screenshots ready (minimum 3 assets)
- [ ] GitHub repo public and README polished
- [ ] npm package tested and working
- [ ] Discord invite link ready
- [ ] Product Hunt page submitted for review

### Day of Launch

- [ ] Submit at 12:01 AM PT (start of fresh PH day)
- [ ] Post maker's comment immediately after launch
- [ ] Share on Twitter/X with PH link
- [ ] Post in Discord community
- [ ] Alert email list
- [ ] Monitor and respond to comments (within 30 min)

### Hour 1-24

- [ ] Respond to every comment personally
- [ ] Thank upvoters on Twitter/X
- [ ] Share milestone updates ("Top 10!", "100 upvotes!")
- [ ] Cross-promote with Show HN if launching same week
- [ ] Document lessons learned for next launch

---

## Product Hunt Best Practices

### Timing

- **Launch at 12:01 AM PT** — Full 24 hours of visibility
- **Best days:** Tuesday, Wednesday, Thursday
- **Avoid:** Weekends, holidays, major Apple/Google announcement days

### Engagement

- **First hour is critical** — rally early supporters
- **Respond to every comment** — builds trust and boosts ranking
- **Update the thread** — post progress, celebrate milestones
- **Be genuine** — no fake accounts, no vote manipulation

### What Makes PH Launches Work

1. **Strong visuals** — GIFs > screenshots > text
2. **Clear value prop** — "What does this do for me?"
3. **Social proof** — "700+ cycles" creates credibility
4. **Founder engagement** — Personal responses win hearts
5. **Community activation** — Let existing supporters know to show up

---

## Coordinated Launch Strategy

**Option A: Same Day (Maximum Impact)**

- Product Hunt at 12:01 AM PT
- Show HN at 6:00 AM PT
- Twitter thread at 8:00 AM PT
- Cross-reference in all posts

**Option B: Sequential (Sustained Visibility)**

- Day 1: Product Hunt
- Day 2: Show HN
- Day 3: Reddit (r/SideProject, r/programming)

**Recommended:** Option A — concentrated effort creates momentum. Both audiences are tech-savvy and overlap creates buzz.

---

## Success Metrics

| Metric               | Target  | Stretch |
| -------------------- | ------- | ------- |
| Upvotes              | 100+    | 500+    |
| Comments             | 30+     | 100+    |
| npm installs (Day 1) | 50+     | 200+    |
| Top 10 of day        | ✅ Goal | Top 5   |
| New Discord members  | 20+     | 100+    |

---

## Post-Launch Actions

1. **Thank-you post** — Share results with community
2. **Blog post** — "What we learned launching on Product Hunt"
3. **Case study** — Document what worked for future launches
4. **Follow-up** — Reach out to commenters who showed interest
5. **Iterate** — Apply feedback to product immediately

---

## Assets Needed (assign to Design)

| Asset                   | Type         | Status   |
| ----------------------- | ------------ | -------- |
| Hero image              | 1200x630 PNG | [ ] TODO |
| Demo GIF 1 (init)       | GIF ≤5MB     | [ ] TODO |
| Demo GIF 2 (dispatch)   | GIF ≤5MB     | [ ] TODO |
| Screenshot 1 (PR)       | PNG          | [ ] TODO |
| Screenshot 2 (memory)   | PNG          | [ ] TODO |
| Screenshot 3 (terminal) | PNG          | [ ] TODO |
| Logo (square)           | 240x240 PNG  | [ ] TODO |

---

_Draft created C744. Finalize assets and content when SaaS billing goes live._
