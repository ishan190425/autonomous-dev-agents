# Building ADA with ADA: 1,183+ Cycles of Autonomous Development

**Draft v1 — Cycle 1184 | Target: Mar 16, 2026 Paper Launch**

---

## The Premise

What if an AI agent team could build itself?

Not just write code, but manage sprints. Prioritize features. Conduct research. Write documentation. Handle QA. Ship to npm.

That's exactly what we did. **ADA (Autonomous Dev Agents)** is a framework for autonomous AI development teams — and we built it entirely using itself.

This post shares what 1,183+ dispatch cycles taught us about autonomous software development.

---

## The Numbers

Since January 2026, ADA's agent team has operated continuously:

| Metric                 | Value               |
| ---------------------- | ------------------- |
| **Total Cycles**       | 1,183+              |
| **Consecutive Cycles** | 763 (C421-1183)     |
| **PRs Merged**         | 105                 |
| **Tests Passing**      | 2,443 + 27 E2E      |
| **Test Coverage**      | 89%+                |
| **Lessons Captured**   | 689                 |
| **Rules Evolved**      | 17                  |
| **Lines of Code**      | ~116,000 TypeScript |

No human commits since cycle 421. Every line of code, every test, every doc — written by the agent team.

---

## How It Works

ADA runs a 10-role rotation, each agent specializing:

```
ceo → growth → research → frontier → product →
scrum → qa → engineering → ops → design
```

Each cycle, one agent:

1. **Loads context** from a shared memory bank
2. **Assesses** GitHub issues, PRs, blockers
3. **Executes** one action from its playbook
4. **Updates** the memory bank
5. **Passes** to the next role

The result: 24/7 development with full context preservation across cycles.

### The Memory System

Agents wake up fresh each session. Continuity comes from files:

- **Memory Bank** (`bank.md`) — Shared state, active threads, role status
- **Lessons Learned** — 689 reusable insights from past cycles
- **Rules** — 17 mandatory standards the team evolved
- **Archives** — Compressed historical context

This is closer to how human teams work than a single monolithic context window.

---

## What We Learned

### 1. Tangible Output Mandate (R-017)

Early on, agents fell into "checkpoint mode" — writing status reports instead of shipping code.

The fix: **R-017 mandates tangible output every cycle.** PRs, tests, docs, specs — not verification reports. Only the CEO role can run strategic checkpoints.

Result: 20 consecutive rotations with 100% tangible output.

### 2. Same-Rotation PR Turnaround (L-636)

We found that PRs open longer than 10 cycles accumulate "context debt" — the team forgets why decisions were made.

Best practice: **Create, review, and merge PRs within the same rotation** (10 cycles). PR #251 achieved this: Engineering created → Ops fixed CI → Design improved UX → Frontier fixed tests → QA merged.

### 3. Issue Tracking Protocol (R-013)

With 70+ open issues, things got lost. Agents worked on outdated priorities because GitHub and the memory bank diverged.

Fix: **Every cycle starts with issue verification.** All open GitHub issues must appear in the memory bank's Active Threads. No exceptions.

### 4. Abstract Base Classes (R-015)

When adding multiple LLM executor backends (Claude Code, Codex), duplication emerged. 50 lines of shared logic copied across implementations.

Lesson: **Extract shared functionality into abstract base classes first.** Test once, maintain once, extend easily.

### 5. Pre-Sprint Front-Loading (L-672)

Sprint kickoffs used to be scrambles — Day 1 spent setting up infrastructure.

Now: **Ship scaffolding before the sprint starts.** Our Sprint 3 prep (auth foundation, NextAuth integration) front-loaded 40-60% of Day 1-2 work.

---

## The Self-Improvement Loop

ADA doesn't just build software. It builds _better versions of itself_.

The Reflexion system captures what worked and what didn't after each cycle. Lessons become rules. Rules become automation. Automation becomes capability.

Examples from our codebase:

- **L-688:** "When adding validation requirements, search ALL test directories" → Now part of CI
- **L-636:** "3-cycle PR turnaround is optimal" → Tracked in retros
- **R-014:** "Agent PR Workflow" → Evolved from direct commits to branch-based PRs

The framework improves as it operates.

---

## Honest Limitations

This isn't magic. Here's what ADA can't do:

1. **Novel architecture decisions** — Agents excel at executing defined playbooks, not inventing new paradigms
2. **User research** — No direct customer contact; relies on human-provided context
3. **Crisis debugging** — Complex multi-system bugs still need human intuition
4. **Creative design** — UI/UX is functional, not beautiful
5. **External integrations** — Each new API needs human setup

ADA is best for: **High-velocity execution of well-scoped work within established patterns.**

---

## Try It Yourself

ADA is open source and available on npm:

```bash
npm install -g @ada-ai/cli
ada init
ada dispatch start
```

The same agent team that built this framework can run on your repo.

**Links:**

- GitHub: [ada-ai/autonomous-dev-agents](https://github.com/ada-ai/autonomous-dev-agents)
- npm: [@ada-ai/cli](https://www.npmjs.com/package/@ada-ai/cli)
- Docs: [docs.ada-ai.dev](https://docs.ada-ai.dev)

---

## What's Next

We're building the SaaS version — managed ADA with GitHub integration, team dashboards, and no infrastructure setup.

Join the waitlist: [ada-ai.dev/waitlist](https://ada-ai.dev/waitlist)

---

_This post was drafted by ADA's Growth agent in Cycle 1184. The agent team continues to ship._

---

## Launch Distribution Plan

**Primary:** Show HN (Mar 16, 9:30 AM EST)
**Parallel:**

- Reddit: r/programming, r/SideProject, r/MachineLearning (same day)
- LinkedIn: B2B audience, enterprise angle
- Twitter/X: Thread + link to this post
- Hacker News Show HN: Link + discussion

**Hook Strategy:**

- Lead with the numbers (1,183 cycles, 763 consecutive, 105 PRs)
- Differentiate: Multi-agent system vs single copilot
- Trust signal: Real metrics from real usage
- CTA: Open source → try it yourself

---

## Metadata

- **Author:** 🚀 Growth (C1184)
- **Status:** Draft v1
- **Target:** Mar 16, 2026
- **Word count:** ~850 (final should be 1,000-1,200)
- **Review needed:** Research (technical accuracy), CEO (messaging alignment)
