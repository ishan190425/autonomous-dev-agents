# 📣 Launch Announcement Kit — v1.0.0-alpha

> **Status:** READY TO DEPLOY (blocked on #139 npm fix)
> **Created:** Cycle 557 (Growth)
> **Last Updated:** 2026-02-14

---

## Purpose

This document contains pre-written announcement copy for all channels. Once #139 (npm publish) is resolved, Growth can execute the announcement sequence immediately without needing to draft copy.

**Execution Sequence:** Discord → Dev.to → LinkedIn → Reddit → Twitter (manual)

---

## 🔒 Pre-Deployment Checklist

Before executing ANY announcement:

- [ ] Verify `npm view @ada/cli version` returns `1.0.0-alpha`
- [ ] Verify `npm view @ada/core version` returns `1.0.0-alpha`
- [ ] Test install: `npm install -g @ada/cli && ada --version`
- [ ] #139 is CLOSED

**DO NOT ANNOUNCE if npm packages are not live.** Announcing before users can install is worse than waiting.

---

## 1. Discord Announcement

**Channel:** #announcements (ADA Discord: discord.gg/5NCHGJAz)

````markdown
🚀 **ADA v1.0.0-alpha is LIVE!**

We just shipped the first public release of ADA — Autonomous Dev Agent teams for any repo.

**Install now:**

```bash
npm install -g @ada/cli
ada init
ada dispatch start
```
````

**What's included:**
• 10-role autonomous agent rotation (CEO, Engineering, Research, Product, and 6 more)
• Shared memory bank for team coordination
• GitHub-native workflow (issues, PRs, comments)
• Built-in reflexion for self-improvement

**Links:**
• GitHub: https://github.com/ishan190425/autonomous-dev-agents
• npm: https://www.npmjs.com/package/@ada/cli
• Docs: https://github.com/ishan190425/autonomous-dev-agents#readme

This is alpha — expect rough edges. But it works. We've been dogfooding it for 500+ dispatch cycles to build ADA itself.

Drop your questions here or open a GitHub issue. Let's build the future of autonomous software development together. 🤖

— The ADA Team (yes, that's also an ADA team)

````

---

## 2. Dev.to Post

**Title:** We Built an AI Dev Team That Ships Code Autonomously — Here's v1.0.0-alpha

**Tags:** ai, opensource, devtools, automation, typescript

```markdown
# We Built an AI Dev Team That Ships Code Autonomously — Here's v1.0.0-alpha

What if your repo had a full dev team that worked autonomously — not just a coding copilot, but an entire organization with a CEO, engineers, QA, researchers, and product managers?

That's ADA (Autonomous Dev Agents). And today we're releasing v1.0.0-alpha.

## The Problem

AI coding tools are great copilots. But they're still tools you wield — they don't have agency. They don't decide what to build next. They don't file issues, review PRs, or coordinate across workstreams.

## The Solution

ADA creates autonomous agent teams for your repo:

- **10 specialized roles** that rotate through dispatch cycles
- **Shared memory** so agents build on each other's context
- **GitHub-native** — issues, PRs, comments, labels
- **Self-improving** via reflexion and heat scoring

## Install It

```bash
npm install -g @ada/cli
cd your-repo
ada init
ada dispatch start
````

## The Meta Part

We built ADA using ADA. The repo at https://github.com/ishan190425/autonomous-dev-agents has run 550+ autonomous dispatch cycles. Every feature, every bug fix, every doc — handled by the agent team.

## What's Next

This is alpha. Expect rough edges. But the core loop works:

1. Agent starts cycle
2. Reads memory, checks issues
3. Picks and executes ONE action
4. Updates memory, commits, pushes
5. Next agent takes over

We're building toward a world where you describe what you want, and autonomous teams ship it.

**Links:**

- [GitHub](https://github.com/ishan190425/autonomous-dev-agents)
- [npm](https://www.npmjs.com/package/@ada/cli)
- [Discord](https://discord.gg/5NCHGJAz)

Questions? Drop a comment or open an issue. Let's build this future together.

```

---

## 3. LinkedIn Post

**Format:** Personal post from founder account

```

🚀 Today we're releasing ADA v1.0.0-alpha — autonomous AI dev teams for any repo.

Not another coding copilot. A full team:
• CEO setting strategy
• Engineers writing code
• QA testing
• Researchers exploring
• Product managers prioritizing

They rotate through dispatch cycles, share memory, and coordinate via GitHub.

The meta part: we built ADA using ADA. 550+ autonomous cycles. Every commit, every PR, every issue — handled by the agent team.

This is alpha — rough edges expected. But the core loop works.

Install: npm install -g @ada/cli
GitHub: https://github.com/ishan190425/autonomous-dev-agents

We're building toward autonomous software development. Today is day one.

#AI #DevTools #OpenSource #Automation #Startup

````

---

## 4. Reddit Post

**Subreddits:** r/MachineLearning, r/LocalLLaMA, r/programming

**Title:** [P] ADA: Autonomous AI Dev Teams — 10 agent roles that ship code on their own (v1.0.0-alpha)

```markdown
We just released ADA v1.0.0-alpha — a framework for running autonomous AI agent teams on any repo.

**What it does:**
- 10 specialized roles (CEO, Engineering, Research, QA, Product, etc.)
- Roles rotate through "dispatch cycles" — each picks ONE action per turn
- Shared memory bank for coordination
- GitHub-native: issues, PRs, comments
- Self-improving via reflexion

**The meta part:** We built ADA using ADA. 550+ dispatch cycles, all autonomous. The repo is our proof it works.

**Install:**
```bash
npm install -g @ada/cli
ada init
ada dispatch start
````

**Links:**

- GitHub: https://github.com/ishan190425/autonomous-dev-agents
- npm: https://www.npmjs.com/package/@ada/cli
- Discord: https://discord.gg/5NCHGJAz

This is alpha — expect rough edges. Happy to answer questions about the architecture, rotation system, or memory model.

```

---

## 5. Twitter/X (Manual)

**Note:** X API is blocked (402 — no credits). Human must post manually.

**Thread:**

```

1/ 🚀 ADA v1.0.0-alpha is live.

Autonomous AI dev teams for any repo. Not a copilot — a full team.

npm install -g @ada/cli

2/ 10 roles that rotate autonomously:
• CEO — strategy
• Engineering — code
• Research — explore
• QA — test
• Product — prioritize
• Ops — CI/CD
• Design — architecture
• Growth — GTM
• Scrum — coordination
• Frontier — innovation

3/ The meta part: we built ADA using ADA.

550+ dispatch cycles. Every commit, PR, and issue — handled by the agent team.

4/ This is alpha. Rough edges expected.

But the core loop works. Agents read memory, pick actions, execute, update memory, pass to next role.

GitHub: github.com/ishan190425/autonomous-dev-agents

5/ We're building toward autonomous software development.

Today is day one.

Questions? Reply or open an issue.

```

---

## Execution Notes

### Timing

- **Discord:** Post immediately once npm verified
- **Dev.to:** Post 1-2 hours after Discord (let early Discord feedback inform edits)
- **LinkedIn:** Post during business hours (9 AM - 11 AM EST optimal)
- **Reddit:** Post during peak hours (10 AM - 2 PM EST for US audiences)
- **Twitter:** Human posts when available (manual due to API block)

### Monitoring

After each post:
- Track engagement for 24 hours
- Respond to comments within 4 hours
- Escalate any negative feedback to Product for triage

### Success Metrics

- Discord: 50+ reactions, 10+ messages
- Dev.to: 100+ views, 10+ reactions
- LinkedIn: 50+ reactions, 5+ comments
- Reddit: 50+ upvotes, 10+ comments
- Twitter: 20+ likes, 5+ retweets

---

## Version History

| Version | Date       | Changes                  |
| ------- | ---------- | ------------------------ |
| 1.0     | 2026-02-14 | Initial kit created (C557) |

---

*This kit will be executed by Growth role once #139 is resolved and npm packages are verified live.*
```
