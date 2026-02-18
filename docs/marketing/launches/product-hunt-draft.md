# Product Hunt Launch Page Draft

> **Status:** DRAFT — Updated for SaaS Dashboard Launch
> **Created:** Cycle 744 (2026-02-16) | **Updated:** Cycle 834 (2026-02-17)
> **Owner:** Growth | **SaaS Pivot:** Reflects #158
> **Target Launch:** ~12:01 AM PT on launch day (start of fresh PH day)

---

## Core Launch Assets

### Tagline Options (max 60 chars)

**Option A (dashboard-first — recommended):**

> Sign in, connect your repo, watch AI agents ship code

**Option B (outcome):**

> 10 AI developers, $19/month, zero hiring

**Option C (social proof):**

> 830+ autonomous cycles. Now available as a dashboard.

**Recommended:** Option A — emphasizes the frictionless SaaS experience vs CLI complexity.

### Short Description (max 260 chars)

> Connect your GitHub repo to a dashboard of rotating AI agents. Engineering, QA, Ops, Product — each agent takes a focused action, then passes to the next. No CLI setup. Watch your autonomous dev team ship code in real-time. $20 free credits to start.

### Topics/Categories

- **Primary:** Developer Tools
- **Secondary:** Artificial Intelligence, Productivity, SaaS

---

## Product Hunt Page Content

### Gallery Assets (prepare these)

1. **Hero Image:** ADA dashboard screenshot with live agent rotation visualization + cycle counter
2. **GIF 1:** GitHub OAuth → repo selector → first dispatch (30 seconds to first cycle)
3. **GIF 2:** Dashboard showing agent rotation in real-time with activity feed
4. **Screenshot 1:** Dashboard overview — repos, agents, recent cycles
5. **Screenshot 2:** Single cycle detail view — what the agent did, files changed, PR link
6. **Screenshot 3:** Billing dashboard — usage meter, credits remaining

### Full Description

```markdown
## What is ADA?

ADA is a dashboard where you deploy autonomous AI dev teams to your GitHub repos. Sign in, connect a repo, and watch specialized agents ship code while you focus on what matters.

No CLI setup. No config files. Connect → dispatch → ship.

## How It Works

1. **Sign in with GitHub** (30 seconds)
2. **Connect your repo** (one click)
3. **Watch your team work** (real-time dashboard)

Your autonomous dev team includes:

- 👔 **CEO** — Strategy and prioritization
- ⚙️ **Engineering** — Code and PRs
- 🔍 **QA** — Testing and quality gates
- 🛡️ **Ops** — CI/CD and infrastructure
- 📦 **Product** — Specs and feature definitions
- 🎨 **Design** — Architecture and UX specs
- And more...

Each agent takes ONE focused action per cycle, then passes context to the next. The rotation prevents any single agent from going off-track.

## Built With ADA

We dogfood ADA on itself. The agents have completed **830+ dispatch cycles** autonomously on this codebase:

- 411 consecutive successful cycles
- ~2,800+ tests maintained
- 89%+ code coverage
- 79 PRs merged by agents

The entire framework was built by the agents running on it. 🐕

## Why Multi-Agent SaaS?

**Single-agent tools** (Copilot, Cursor) wait for you. ADA acts autonomously.

**CLI-based automation** requires setup, config files, local machines. ADA runs in the cloud.

**Multi-agent rotation** means:

- **Focus:** Each role has a narrow scope
- **Memory:** Context persists across cycles in a shared memory bank
- **Self-correction:** QA catches Engineering mistakes, Ops enforces rules
- **Scalable:** Add repos without managing infrastructure

## Pricing

| Tier     | Price  | Cycles  | Repos    |
| -------- | ------ | ------- | -------- |
| **Free** | $0     | 10/day  | 1 repo   |
| **Pro**  | $19/mo | 100/day | 5 repos  |
| **Team** | $49/mo | 500/day | 20 repos |

**Early Adopter Bonus:** $20 free credits (~100 Pro cycles) when you sign up today.

## Get Started (30 seconds)

1. Visit [ada.dev](https://ada.dev)
2. Sign in with GitHub
3. Connect your first repo
4. Watch your first autonomous cycle complete

For power users: CLI still available via `npm install -g @ada-ai/cli`

GitHub: [link]
Docs: [link]
Discord: [link]
```

---

## Maker's First Comment

```markdown
Hey Product Hunt! 👋

I'm the founder of ADA. We just launched the SaaS dashboard, and I want to share what's different here.

**The problem with AI coding tools:**

Most AI dev tools are copilots — they wait for you to type. I wanted something that works while I'm asleep. Autonomous agents that actually ship code, not just suggest it.

**The problem with existing agents:**

Single-agent approaches go off the rails. They write 500 lines of buggy code and confidently say "done." No one catches the mistakes.

**Our solution: Multi-agent rotation**

ADA runs a rotating team of specialized agents. Engineering writes code. QA catches bugs. Ops enforces rules. CEO prioritizes. Each agent takes ONE action, then hands off to the next. The rotation creates natural checkpoints.

**What we learned building ADA with ADA:**

We've been dogfooding this on our own repo for 5 months:

- 830+ autonomous cycles completed
- 411 consecutive successes (no human intervention)
- ~2,800 tests, 89% coverage
- The agents literally built and maintain this product

**Why SaaS (not just CLI):**

Our v1.0-alpha CLI launched Feb 14. Developers loved it, but the setup friction was real. The SaaS dashboard removes that:

- No npm install
- No config files
- No local machine running
- Just GitHub OAuth → connect repo → dispatch

**What I'm hoping for:**

- Feedback on the dashboard UX
- Bug reports (we're actively dogfooding, but more eyes help)
- Ideas for what repos you'd use this on

The $20 free credits give you ~100 Pro-tier cycles — enough to see if ADA is useful for your workflow.

Happy to answer any questions! 🚀

P.S. If you want to see the agents in action, watch the demo GIF — that's a real cycle from our repo, not staged.
```

---

## Launch Checklist

### Pre-Launch (Complete Before Submitting)

- [ ] SaaS dashboard live (#181 Auth, #182 Billing)
- [ ] Landing page with pricing live
- [ ] Demo GIFs showing DASHBOARD experience (not CLI)
- [ ] GitHub OAuth tested and working
- [ ] $20 credit system functional
- [ ] Discord #early-access active
- [ ] Product Hunt page submitted for review
- [ ] Hunter confirmed (needs PH following)

### Day of Launch

- [ ] Submit at 12:01 AM PT (start of fresh PH day)
- [ ] Post maker's comment immediately
- [ ] Share on Twitter/X: "We're live on Product Hunt! [link]"
- [ ] Email Early Adopters: "We launched publicly — help us get seen"
- [ ] Post in Discord: "PH launch day — let's go"
- [ ] Monitor and respond to comments (within 30 min max)

### Hour 1-24

- [ ] Respond to every comment personally
- [ ] Thank upvoters on Twitter/X
- [ ] Share milestone updates ("Top 10!", "100 upvotes!")
- [ ] Cross-promote with Show HN if launching same day
- [ ] Document what worked for future launches

---

## Product Hunt Best Practices

### Timing

- **Launch at 12:01 AM PT** — Full 24 hours of visibility
- **Best days:** Tuesday, Wednesday, Thursday
- **Avoid:** Weekends, holidays, major tech announcement days

### Engagement

- **First hour is critical** — rally early supporters
- **Respond to every comment** — builds trust, boosts ranking
- **Update the thread** — post progress, celebrate milestones
- **Be genuine** — no fake accounts, no vote manipulation

### What Makes PH Launches Work

1. **Strong visuals** — Dashboard screenshots > CLI terminals
2. **Clear value prop** — "30 seconds to first autonomous cycle"
3. **Social proof** — "830+ cycles" and "411 consecutive"
4. **Founder engagement** — Personal responses win hearts
5. **Free tier** — Low friction to try ($20 credits)

---

## Messaging Pivot: CLI → SaaS

| Old (CLI-First)              | New (SaaS-First)              |
| ---------------------------- | ----------------------------- |
| `npm install -g @ada-ai/cli` | Sign in with GitHub           |
| Run `ada init` in terminal   | Connect your repo (one click) |
| Configure agents locally     | Team auto-generated for you   |
| `ada dispatch start`         | Click "Dispatch" in dashboard |
| Runs on your machine         | Runs in the cloud             |

**Key shift:** Emphasize the **dashboard experience** as primary, CLI as power-user option.

---

## Coordinated Launch Strategy

**Recommended: Same Day (Maximum Impact)**

| Time        | Channel       | Action                 |
| ----------- | ------------- | ---------------------- |
| 12:01 AM PT | Product Hunt  | Submit + first comment |
| 6:00 AM PT  | Hacker News   | Show HN post           |
| 8:00 AM PT  | Twitter/X     | Thread with PH link    |
| 9:00 AM PT  | LinkedIn      | Post for B2B audience  |
| 10:00 AM PT | Indie Hackers | Cross-post             |
| 12:00 PM PT | Discord       | Rally community        |

Cross-reference all posts: "Also live on Product Hunt: [link]"

---

## Success Metrics

| Metric              | Target  | Stretch |
| ------------------- | ------- | ------- |
| Upvotes             | 100+    | 500+    |
| Comments            | 30+     | 100+    |
| New signups (Day 1) | 50+     | 200+    |
| Repos connected     | 20+     | 100+    |
| Top 10 of day       | ✅ Goal | Top 5   |
| Discord members     | 20+     | 100+    |
| First MRR           | $50+    | $200+   |

---

## Assets Needed (assign to Design)

| Asset               | Type         | Notes                   | Status   |
| ------------------- | ------------ | ----------------------- | -------- |
| Hero (dashboard)    | 1200x630 PNG | Show agent rotation viz | [ ] TODO |
| GIF 1 (signup flow) | GIF ≤5MB     | OAuth → repo → dispatch | [ ] TODO |
| GIF 2 (dashboard)   | GIF ≤5MB     | Live cycle activity     | [ ] TODO |
| Screenshot 1        | PNG          | Dashboard overview      | [ ] TODO |
| Screenshot 2        | PNG          | Cycle detail view       | [ ] TODO |
| Screenshot 3        | PNG          | Billing/credits         | [ ] TODO |
| Logo (square)       | 240x240 PNG  | ADA logo                | [ ] TODO |

**Note:** All GIFs must show DASHBOARD experience, not terminal/CLI.

---

## Pricing Page Copy (for landing page)

### Headline

> Autonomous dev teams. Simple pricing.

### Tiers

**Free — $0/forever**

- 10 cycles per day
- 1 connected repo
- Basic memory (7-day retention)
- Community Discord support

**Pro — $19/month**

- 100 cycles per day
- 5 connected repos
- Full memory (30-day retention)
- Priority Discord support
- Early access to new features

**Team — $49/month**

- 500 cycles per day
- 20 connected repos
- Full memory (90-day retention)
- 5 team member seats
- Dedicated onboarding call
- Slack Connect support

### Early Adopter CTA

> Sign up today and get $20 in free credits — that's ~100 Pro cycles to explore what ADA can do for your repos.

---

## Post-Launch Actions

1. **Thank-you post** — Share results with Product Hunt community
2. **Blog post** — "What we learned launching ADA on Product Hunt"
3. **Case study** — Document top-performing strategies
4. **Follow-up emails** — Reach out to commenters who showed interest
5. **Iterate** — Apply feedback to dashboard immediately

---

_Draft updated C834 for SaaS pivot per #158. Original CLI-focused draft archived._
_🚀 Growth | Cycle 834_
