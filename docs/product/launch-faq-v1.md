# 🙋 ADA Launch FAQ v1.0

> **Purpose:** Anticipate common user questions to speed up support response and identify documentation gaps.
> **Author:** 📦 Product Lead
> **Cycle:** 450
> **Date:** 2026-02-12 (T-5)
> **Version:** 1.0 (pre-launch baseline)

---

## Overview

This FAQ is created proactively before launch to:

1. Anticipate questions based on getting-started guide gaps
2. Reduce Day 1 support response time (Sprint 2 Goal 1 target: <24h)
3. Identify docs that need improvement during soft launch
4. Track real questions as they come in (update from v1.0)

**Usage:** During soft launch (Feb 20-23) and public launch (Feb 24+), update this FAQ with real user questions. Each addition is a doc improvement toward Sprint 2's "5+ doc updates" target.

---

## Installation & Setup

### Q: What Node.js version do I need?

**A:** Node.js 18 or higher. Check with `node --version`.

**Why:** ADA uses modern JavaScript features (ES2022+) that require Node 18+.

**If you're on an older version:**

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download from nodejs.org
```

---

### Q: Do I need the GitHub CLI?

**A:** Yes. Install from https://cli.github.com/ and authenticate with `gh auth login`.

**Why:** ADA agents interact with GitHub issues and PRs. Without `gh`, agents can't create issues, open PRs, or read your project's state.

**Quick check:**

```bash
gh auth status
# Should show: Logged in to github.com
```

---

### Q: Can I use ADA without GitHub?

**A:** Not yet. v1.0-alpha requires GitHub. GitLab/Bitbucket support is on the Sprint 3+ roadmap.

**Workaround:** If your project is on GitLab, you can mirror it to GitHub and run ADA against the mirror.

---

### Q: What happens if `ada init` fails?

**A:** Common causes:

| Error                          | Cause                    | Fix                                                       |
| ------------------------------ | ------------------------ | --------------------------------------------------------- |
| "Not a git repository"         | Project isn't a git repo | Run `git init`                                            |
| "GitHub CLI not authenticated" | `gh` not logged in       | Run `gh auth login`                                       |
| "Permission denied"            | npm permission issue     | Use `sudo npm install -g @ada/cli` or fix npm permissions |
| "EACCES"                       | Can't write to project   | Check file permissions                                    |

**If none of these help:** File an issue at https://github.com/ishan190425/autonomous-dev-agents/issues with your error output.

---

## Running ADA

### Q: What does `ada run` actually do?

**A:** One `ada run` = one "dispatch cycle":

1. **Load state** — Reads `agents/state/rotation.json` to see which role is up
2. **Read memory** — Loads `agents/memory/bank.md` for context
3. **Check GitHub** — Scans your open issues and PRs
4. **Become the role** — Acts as CEO, Engineer, Product, etc.
5. **Pick ONE action** — Chooses the highest-impact action from that role's playbook
6. **Execute** — Creates an issue, writes code, updates docs, etc.
7. **Update memory** — Records what happened in the memory bank
8. **Rotate** — Advances to the next role in the rotation
9. **Commit & push** — Saves all changes to git

**Result:** Your project gets a small, focused improvement each cycle.

---

### Q: How long does one cycle take?

**A:** Typically 1-3 minutes, depending on:

- LLM response time
- GitHub API latency
- Size of your memory bank
- Complexity of the action (writing code takes longer than filing an issue)

---

### Q: How do I run ADA continuously?

**A:** Three options:

**1. Cron (simplest):**

```bash
# Every 30 minutes
*/30 * * * * cd /path/to/project && ada run >> ada.log 2>&1
```

**2. GitHub Actions (cloud-native):**
See `.github/workflows/ada.yml` example in the getting-started guide.

**3. OpenClaw (recommended for power users):**
If you use OpenClaw for AI agents, ADA integrates directly.

---

### Q: How do I stop ADA?

**A:** Several options:

| Goal                | Command                                                     |
| ------------------- | ----------------------------------------------------------- |
| Stop current cycle  | `Ctrl+C`                                                    |
| Disable cron        | Remove/comment the crontab entry                            |
| Pause temporarily   | Set a flag in `agents/state/rotation.json` (feature coming) |
| Stop GitHub Actions | Disable the workflow in repo settings                       |

See `docs/product/stopping-ada.md` for detailed instructions.

---

### Q: Can I run multiple projects with ADA?

**A:** Yes. Each project has its own `agents/` directory. Run `ada run` in each project's root.

**Note:** If running via cron, use separate cron entries for each project with different schedules to avoid overlapping API calls.

---

## Memory & State

### Q: What is the memory bank?

**A:** `agents/memory/bank.md` is the shared brain of your agent team. It contains:

- **Current Status** — What's happening now
- **Role State** — Each role's last action and next steps
- **Active Threads** — Open issues being tracked
- **Architecture Decisions** — Technical decisions (ADR format)
- **Lessons Learned** — What the team has figured out

Agents read it before acting and update it after acting. It's how they coordinate.

---

### Q: Why is my memory bank so big?

**A:** Memory banks grow over time as agents log actions and learnings. When it exceeds 200 lines, agents auto-compress:

1. Archive current bank → `agents/memory/archives/`
2. Summarize and keep active items
3. Increment the version number

**Manual compression:** `ada compress`

---

### Q: Can I edit the memory bank manually?

**A:** Yes, but be careful:

- **Safe:** Adding context, fixing typos, adding issues to Active Threads
- **Risky:** Deleting role state, changing rotation state, removing lessons

If you edit, agents will pick up changes on the next cycle.

---

## Customization

### Q: How do I add a custom role?

**A:** Two options:

**CLI (coming soon):**

```bash
ada add-role --name "Security" --emoji "🔒" --focus "audits,dependencies"
```

**Manual:**

1. Add role to `agents/roster.json`
2. Create playbook at `agents/playbooks/security.md`
3. Add to `rotation_order` in roster.json

---

### Q: How do I change what a role does?

**A:** Edit the playbook at `agents/playbooks/<role>.md`. Key sections:

- **Focus** — What topics this role cares about
- **Actions** — What actions it can take
- **Voice** — How it communicates

Changes take effect on the next cycle.

---

### Q: Can I disable a role?

**A:** Remove it from `rotation_order` in `agents/roster.json`. The role definition stays but won't be activated.

---

## Troubleshooting

### Q: "No changes to commit"

**A:** The agent couldn't find meaningful work. Normal for stable projects. Try:

- Create some GitHub issues for agents to work on
- Check if agents are stuck on a blocker (look at memory bank)
- Verify GitHub CLI has access (`gh issue list`)

---

### Q: "Memory bank not found"

**A:** Run `ada init` first to create the `agents/` directory structure.

If you have `agents/` but no `bank.md`, create it manually or re-run init.

---

### Q: Agent keeps doing the same thing

**A:** Possible causes:

- Memory bank isn't being updated (check git history)
- Role playbook has only one action
- Rotation isn't advancing (check `rotation.json`)

**Debug:** Run `ada status` to see the current state.

---

### Q: Pull/push errors

**A:** Agents commit and push changes. Common issues:

| Error                           | Fix                                          |
| ------------------------------- | -------------------------------------------- |
| "Permission denied (publickey)" | Check SSH key setup                          |
| "Updates were rejected"         | Someone else pushed; run `git pull --rebase` |
| "Protected branch"              | Agents need push access to main              |

---

## Philosophy & Usage

### Q: Is this like Devin / Claude Code?

**A:** Different approach:

| Aspect   | Devin / Claude Code         | ADA                          |
| -------- | --------------------------- | ---------------------------- |
| Model    | Single agent, session-based | Multi-agent team, persistent |
| Memory   | Forgets between sessions    | Persistent memory bank       |
| Learning | Individual                  | Team-wide (lessons learned)  |
| Focus    | "Do this task"              | "Run this project"           |

ADA is for **ongoing autonomous development**, not one-shot tasks.

---

### Q: How much does it cost to run?

**A:** ADA uses your LLM API (OpenAI, Anthropic, etc.). Typical cost:

- ~$0.01-0.05 per cycle (GPT-4)
- ~$0.005-0.02 per cycle (Claude Haiku)
- ~$0.02-0.10 per cycle (Claude Opus)

At 48 cycles/day (every 30 min), expect $0.50-5.00/day depending on LLM.

---

### Q: Can ADA break my project?

**A:** Safeguards in place:

- Agents commit to git (revert with `git revert`)
- PRs can require human approval (configure branch protection)
- Rules in `RULES.md` constrain agent behavior
- Start with `ada run` (single cycle) before enabling cron

**Recommendation:** Run for a few cycles manually before automating.

---

### Q: What should I do after installing?

**A:** Recommended first steps:

1. **Run 3-5 cycles** — Watch what happens
2. **Check the memory bank** — Understand how agents think
3. **Create some issues** — Give agents work to do
4. **Customize one playbook** — Make it fit your project
5. **Set up automation** — Once you trust the flow

---

## Getting Help

### Q: Where do I report bugs?

**A:** GitHub Issues: https://github.com/ishan190425/autonomous-dev-agents/issues

Include:

- ADA version (`ada --version`)
- Node version (`node --version`)
- Error message or unexpected behavior
- Relevant logs or screenshots

---

### Q: Where can I ask questions?

**A:**

- **Discord:** https://discord.gg/5NCHGJAz
- **GitHub Discussions:** (coming soon)

---

### Q: How do I contribute?

**A:**

1. Fork the repo
2. Create a branch
3. Make changes
4. Open a PR

See CONTRIBUTING.md for guidelines.

---

## FAQ Versioning

| Version | Date       | Changes                      |
| ------- | ---------- | ---------------------------- |
| v1.0    | 2026-02-12 | Initial pre-launch FAQ (T-5) |

**Update protocol:** During soft launch and post-launch, add real user questions with source and date. Each addition counts toward Sprint 2 Goal 1 (5+ doc updates from feedback).

---

_📦 Product Lead — Cycle 450_
_Day 1 FAQ: Proactive support preparation for v1.0-alpha launch_
