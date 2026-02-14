# 🚀 Getting Started with ADA

> **Time to first dispatch cycle: ~5 minutes**

This guide walks you through setting up your first autonomous agent team with ADA. By the end, you'll have AI agents managing your project — researching, planning, coding, and shipping.

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** — ADA uses modern JavaScript features
- **npm 8+** — Comes with Node.js
- **Git** — Your project should be a git repository
- **GitHub CLI (`gh`)** — Agents interact with GitHub issues and PRs
  - Install: https://cli.github.com/
  - Authenticate: `gh auth login`

### Verify Your Setup

```bash
node --version    # Should be 18.x or higher
npm --version     # Should be 8.x or higher
git --version     # Any recent version
gh auth status    # Should show "Logged in"
```

---

## Step 1: Install the CLI

Install the ADA CLI globally:

```bash
npm install -g @ada-ai/cli
```

Verify the installation:

```bash
ada --version     # Should show version number
ada --help        # Shows available commands
```

---

## Step 2: Initialize Your Agent Team

Navigate to your project and initialize ADA:

```bash
cd your-project
ada init
```

The interactive setup will ask:

1. **Project name** — Used in agent communications
2. **Project type** — Helps customize the team composition
3. **Team size** — How many roles to activate

This creates an `agents/` directory in your repo:

```
agents/
├── DISPATCH.md          # The dispatch protocol (how cycles work)
├── roster.json          # Your team composition
├── state/
│   └── rotation.json    # Current rotation state
├── memory/
│   └── bank.md          # Shared agent memory
├── rules/
│   └── RULES.md         # Team rules and standards
└── playbooks/
    ├── ceo.md           # Each role's capabilities
    ├── product.md
    ├── engineering.md
    └── ...
```

---

## Step 3: Run Your First Dispatch Cycle

Execute one agent cycle:

```bash
ada run
```

**What happens:**

1. ADA loads the current rotation state
2. Reads the shared memory bank
3. Becomes the current role (e.g., 👔 CEO)
4. Checks your GitHub issues and PRs
5. Picks and executes ONE action from that role's playbook
6. Updates the memory bank
7. Rotates to the next role
8. Commits and pushes the changes

You'll see output like:

```
🤖 ADA Dispatch Cycle #1
━━━━━━━━━━━━━━━━━━━━━━━━

📍 Current Role: 👔 CEO (The Founder)
📖 Reading memory bank...
🔍 Checking GitHub (3 open issues, 0 open PRs)
⚡ Action: Strategic review of project positioning

✅ Cycle complete!
   → Memory bank updated
   → Next role: 🔬 Research (The Scout)
   → Changes committed and pushed
```

---

## Step 4: Check Your Team Status

See what your agent team has been doing:

```bash
ada status
```

This shows:

- **Current rotation state** — Which role is up next
- **Last 5 actions** — What each role did recently
- **Memory bank summary** — Active threads, blockers, decisions
- **GitHub state** — Open issues, PRs, recent activity

---

## Step 5: View the Memory Bank

The memory bank is your agents' shared brain. Open it directly:

```bash
ada memory
```

Or read the file:

```bash
cat agents/memory/bank.md
```

Key sections:

- **Current Status** — What's happening right now
- **Role State** — Each role's last action and next steps
- **Active Threads** — Cross-role dependencies
- **Architecture Decisions** — ADRs made by agents
- **Lessons Learned** — What the team has figured out

---

## How Rotation Works

ADA uses a **round-robin rotation**. Each cycle, one role acts:

```
Cycle 0: 👔 CEO       → Sets direction
Cycle 1: 🔬 Research  → Scouts approaches
Cycle 2: 📦 Product   → Writes specs
Cycle 3: 📋 Scrum     → Plans sprints
Cycle 4: ⚙️ Engineer  → Writes code
Cycle 5: 🛡️ Ops       → Merges, enforces standards
Cycle 6: 🎨 Design    → Reviews APIs, UX
Cycle 7: 👔 CEO       → Back to start...
```

Over a full rotation, every aspect of your project gets attention.

---

## Automating Dispatch

For continuous operation, run ADA via cron or CI:

### Option 1: Cron (Local)

```bash
# Run every 30 minutes
*/30 * * * * cd /path/to/project && ada run >> /var/log/ada.log 2>&1
```

### Option 2: GitHub Actions

```yaml
# .github/workflows/ada.yml
name: ADA Dispatch
on:
  schedule:
    - cron: '*/30 * * * *' # Every 30 minutes
  workflow_dispatch: # Manual trigger

jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g @ada-ai/cli
      - run: ada run
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Option 3: OpenClaw Integration

If you use [OpenClaw](https://github.com/openclaw/openclaw), ADA integrates naturally:

```yaml
# In your OpenClaw config
cron:
  - schedule: { kind: 'every', everyMs: 1800000 } # 30 min
    payload:
      kind: 'agentTurn'
      message: 'Run ADA dispatch cycle'
    sessionTarget: 'isolated'
```

---

## Customizing Your Team

### Add a Custom Role

```bash
ada add-role --name "Security" --emoji "🔒" --focus "audits,dependencies,vulnerabilities"
```

Or edit `agents/roster.json` directly.

### Modify a Playbook

Each role's capabilities are defined in `agents/playbooks/<role>.md`. Edit these to:

- Add new action types
- Change focus areas
- Customize voice and style

### Add Team Rules

Rules in `agents/rules/RULES.md` apply to all roles. Add rules for:

- Commit message format
- Code style requirements
- Review processes
- Merge policies

---

## Common Issues

### "Not a git repository"

ADA requires your project to be a git repo:

```bash
git init
git add .
git commit -m "Initial commit"
```

### "GitHub CLI not authenticated"

Agents need GitHub access:

```bash
gh auth login
gh auth status  # Verify it worked
```

### "No changes to commit"

The agent couldn't find anything meaningful to do. This is normal for stable projects. Check:

```bash
ada status      # See current state
gh issue list   # Any open issues to work on?
```

### Memory Bank Too Large

If the memory bank grows over 200 lines, run compression:

```bash
ada compress
```

Or wait — agents auto-compress when triggered.

---

## What's Next?

Now that your agent team is running:

1. **Open some issues** — Give your agents work to do
2. **Watch a full rotation** — See each role act in sequence
3. **Check the memory bank** — Understand how agents think
4. **Customize playbooks** — Tune roles to your project
5. **Set up automation** — Continuous dispatch via cron or CI

---

## Getting Help

- **Documentation:** https://github.com/ishan190425/autonomous-dev-agents/docs
- **Discord:** https://discord.gg/5NCHGJAz
- **GitHub Issues:** https://github.com/ishan190425/autonomous-dev-agents/issues
- **Show your team:** Share screenshots in Discord #showcase

---

_Last updated: 2026-02-12 | Product Team (C480)_
