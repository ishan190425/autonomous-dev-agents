# 🤖 Autonomous Dev Agents

> A reusable template for running an autonomous multi-role AI development team on any software project.

**What is this?** A framework where an AI agent (powered by [Clawdbot](https://github.com/nicholasgasior/clawdbot) heartbeats) autonomously rotates through specialized development roles — Research, Product, Scrum, Engineering, Ops, Design — executing real work via GitHub on every heartbeat cycle.

Each role has its own playbook, personality, and focus areas. A shared memory bank provides continuity between cycles. The team evolves over time as the project grows.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Setup Guide](#setup-guide)
- [Role Rotation](#role-rotation)
- [Memory Bank](#memory-bank)
- [Role Evolution](#role-evolution)
- [Customization Tips](#customization-tips)
- [Cost Considerations](#cost-considerations)
- [File Structure](#file-structure)

---

## Architecture Overview

```
┌──────────────────────────────────────────────┐
│              Clawdbot Heartbeat               │
│         (triggers every N minutes)            │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│            DISPATCH.md Protocol               │
│                                               │
│  1. Load rotation state → who am I?           │
│  2. Read memory bank → what's happening?      │
│  3. Read my playbook → what can I do?         │
│  4. Check GitHub (issues, PRs) → what's new?  │
│  5. Pick & execute ONE action                 │
│  6. Update memory bank                        │
│  7. Advance rotation → next role              │
│  8. Commit & push                             │
└──────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│              GitHub Repository                │
│                                               │
│  Issues ← Product, Research, Scrum create     │
│  PRs ← Engineering writes code                │
│  Reviews ← Ops enforces, Design reviews       │
│  Docs ← All roles contribute                  │
│  Memory Bank ← Shared state across roles      │
└──────────────────────────────────────────────┘
```

### The Loop

1. **Heartbeat fires** → Clawdbot triggers the agent
2. **Agent reads DISPATCH.md** → master protocol for every cycle
3. **Rotation state** determines which role is active this cycle
4. **Role acts** using its playbook (creates issue, writes code, reviews PR, etc.)
5. **Memory bank** is read before acting and updated after
6. **Rotation advances** to the next role
7. **Everything is committed** to the repo

---

## How It Works

### Roles

The default template ships with 6 roles (customizable):

| Role | Focus | Typical Actions |
|------|-------|-----------------|
| 🔬 **Research** | Technology scouting, feasibility | Create research issues, write surveys, comment on feasibility |
| 📦 **Product** | Features, roadmap, user stories | Create feature issues, write specs, prioritize backlog |
| 📋 **Scrum** | Sprint planning, tracking, retros | Plan sprints, progress updates, retrospectives |
| ⚙️ **Engineering** | Implementation, code quality | Write code, create PRs, code review |
| 🛡️ **Ops** | CI/CD, standards, quality | Merge PRs, fix CI, add rules, enforce standards |
| 🎨 **Design** | APIs, interfaces, architecture | Write API specs, design reviews, propose improvements |

### Single Agent, Multiple Hats

There's only one AI agent. It *becomes* each role in turn, following that role's playbook. The rotation ensures all aspects of development get attention.

### Communication Between Roles

Roles "talk" to each other through:
- **GitHub issues and comments** — the primary communication channel
- **Memory bank** — the Active Threads section tracks cross-role dependencies
- **PR reviews** — roles review from their perspective
- **Open Questions** — any role can raise questions for others

---

## Prerequisites

1. **Clawdbot** with heartbeat support configured
2. **GitHub CLI** (`gh`) authenticated and working
3. **A GitHub repository** for your project (the agents will work in it)
4. **A project** with some initial structure (or let the agents build it from scratch)

---

## Setup Guide

### Step 1: Copy the `agents/` Directory

Copy the entire `agents/` directory from this template into your project's root:

```bash
cp -r agents/ /path/to/your/project/agents/
```

Your project should now have:
```
your-project/
├── agents/
│   ├── DISPATCH.md
│   ├── roster.json
│   ├── state/
│   │   └── rotation.json
│   ├── memory/
│   │   ├── bank.md
│   │   ├── evolution-log.md
│   │   └── archives/
│   ├── rules/
│   │   └── RULES.md
│   └── playbooks/
│       ├── research.md
│       ├── product.md
│       ├── scrum.md
│       ├── engineering.md
│       ├── ops.md
│       └── design.md
├── src/
├── ...
```

### Step 2: Customize `roster.json`

Edit `agents/roster.json` to match your project:

```json
{
  "company": "Your Company",
  "product": "Your Product — tagline here",
  "tagline": "What you're building",
  "roles": [
    {
      "id": "research",
      "name": "Your Research Lead Name",
      "title": "Head of Research",
      "emoji": "🔬",
      "focus": ["your", "research", "areas"],
      "actions": ["create_research_issues", "write_research_docs", "comment_on_feasibility"]
    }
    // ... customize all roles
  ],
  "rotation_order": ["research", "product", "scrum", "engineering", "ops", "design"]
}
```

**Key decisions:**
- Role names and personalities (give them character!)
- Focus areas (domain-specific to your project)
- Rotation order (which roles go first?)
- Whether to add/remove roles (you might not need all 6)

### Step 3: Customize Playbooks

Edit each file in `agents/playbooks/` to be specific to your domain:

- **research.md** — What technologies are relevant to YOUR project?
- **product.md** — What features does YOUR product need?
- **engineering.md** — What modules/code structure does YOUR project use?
- **ops.md** — What CI/CD and quality standards matter for YOUR project?
- **design.md** — What interfaces and APIs does YOUR project expose?
- **scrum.md** — Generally stays domain-agnostic

Replace all placeholder text (marked with `[YOUR_*]`) with your project specifics.

### Step 4: Set Up HEARTBEAT.md

In your Clawdbot workspace directory, create or update `HEARTBEAT.md`:

```markdown
## Agent Dispatch
- Read and follow `~/path/to/your/project/agents/DISPATCH.md`
- Work inside the project repo: `cd ~/path/to/your/project`
- Use `gh` CLI for all GitHub operations
```

See `HEARTBEAT.md.example` for a full example.

### Step 5: Configure Clawdbot Heartbeat

In your Clawdbot config, enable heartbeat with an appropriate interval:

```json
{
  "heartbeat": {
    "enabled": true,
    "intervalMinutes": 30
  }
}
```

See `clawdbot-config.example.json` for a full example.

**Interval tips:**
- **30 min** — Good starting point, ~48 cycles/day
- **60 min** — More relaxed, ~24 cycles/day
- **15 min** — Aggressive, burns more tokens but moves faster
- A full rotation (all 6 roles) takes `6 × interval` time

### Step 6: Initialize and Push

Commit the agents directory to your project:

```bash
cd /path/to/your/project
git add agents/
git commit -m "feat(agents): initialize autonomous agent team"
git push
```

The agents will start working on the next heartbeat cycle!

---

## Role Rotation

### How It Works

Rotation is simple and deterministic:

1. `rotation.json` tracks the `current_index` into the `rotation_order` array
2. Each heartbeat, the agent reads the index and becomes that role
3. After acting, the index increments (wraps around at the end)
4. History is kept for the last 10 cycles

### Example Flow

```
Cycle 0: Research  → creates issue about tech approach
Cycle 1: Product   → writes feature spec
Cycle 2: Scrum     → plans sprint, assigns issues
Cycle 3: Engineering → implements feature, creates PR
Cycle 4: Ops       → reviews PR, merges if CI passes
Cycle 5: Design    → reviews API design in merged code
Cycle 6: Research  → (rotation repeats)
```

### Customizing Rotation

You can change the order in `roster.json`:

```json
"rotation_order": ["engineering", "engineering", "ops", "product", "scrum", "research", "design"]
```

Want engineering to run twice per cycle? Just list it twice. Want to skip a role? Remove it.

---

## Memory Bank

The memory bank (`agents/memory/bank.md`) is the shared brain of the team. It's what gives the agent continuity across cycles despite having no persistent memory.

### Protocol (R-001)

Every cycle:
1. **READ** the memory bank before doing anything
2. **ACT** based on current state + role playbook
3. **UPDATE** the bank with what changed

### What's Tracked

- **Current Status** — Active sprint, in-progress work, blockers
- **Architecture Decisions** — ADR-format decisions with rationale
- **Active Threads** — Cross-role dependencies and open questions
- **Role State** — Per-role context (last action, working on, pipeline)
- **Lessons Learned** — What went wrong or unexpectedly well
- **Project Metrics** — Issue/PR counts, code stats

### Compression (R-002)

The bank grows over time. Compression keeps it manageable:

- **Trigger:** Bank > 200 lines, 10+ cycles since last compression, or sprint ends
- **Process:** Archive current bank → compress → commit
- **Survives:** Active items, recent decisions, unresolved blockers
- **Archived:** Completed sprints, resolved questions, old details

---

## Role Evolution

The team isn't static. As the project grows, new roles can be created and existing ones modified.

### Signals That Trigger Evolution (R-003)

- A capability gap exists that no current role covers
- 5+ issues pile up in a domain with no dedicated role
- A role's playbook is getting too broad
- New modules or integrations need specialist attention

### Evolution Process

1. Any role creates a proposal issue: `chore(agents): propose new role — <name>`
2. Proposal includes: name, emoji, title, focus areas, actions, justification
3. If approved, the role is added to roster.json + gets a playbook
4. Change is logged in `evolution-log.md`

### Example Evolutions

- Project adds ML → spawn **ML Engineer** role
- API surface grows → spawn **DevRel** role
- Testing gets complex → spawn **QA Engineer** role
- Docs outgrow the team → spawn **Technical Writer** role

---

## Customization Tips

### Adjusting for Team Size

**Solo project?** Use all 6 roles — the agent covers everything.

**Small team (2-4)?** Remove roles that humans already fill. If you do product, remove the product role.

**Larger team?** Add specialist roles. Split engineering into frontend/backend/infra. Add QA, DevRel, etc.

### Domain-Specific Playbooks

The playbooks are the most important thing to customize. Generic playbooks produce generic work.

**For a web app:**
- Research → frontend frameworks, UX patterns, performance techniques
- Product → user stories, feature specs, analytics requirements
- Engineering → React components, API endpoints, database migrations

**For a CLI tool:**
- Research → similar tools, UX patterns for CLIs, performance benchmarks
- Product → command specs, flag design, output formatting
- Engineering → command implementations, parser logic, tests

**For a library:**
- Research → ecosystem analysis, API design patterns, benchmarks
- Product → API surface, developer experience, migration guides
- Design → type signatures, error handling patterns, documentation

### Tuning the Memory Bank

- **More detail?** Increase the compression threshold (default 200 lines)
- **Less noise?** Decrease it, compress more aggressively
- **Role-specific banks?** Add per-role bank files (see roster.json `memory_bank` field)
- **Sprint-based?** Archive on sprint boundaries instead of line count

### Custom Rules

Add project-specific rules to `agents/rules/RULES.md`:
- Code style requirements
- Review checklists
- Deployment procedures
- Security policies

---

## Cost Considerations

### Token Usage

Each heartbeat cycle reads/writes several files and makes GitHub API calls. Approximate per-cycle cost:

| Model | Est. Cost/Cycle | Daily (30min interval) |
|-------|----------------|----------------------|
| Claude Sonnet | ~$0.05–0.15 | ~$2.40–7.20 |
| Claude Opus | ~$0.15–0.50 | ~$7.20–24.00 |
| GPT-4o | ~$0.05–0.15 | ~$2.40–7.20 |

### Optimization Tips

- **Use Sonnet/4o for routine cycles**, Opus for complex engineering
- **Increase interval** to reduce daily cost (60min = half the cost of 30min)
- **Skip roles** that don't apply to reduce cycle count
- **Compress aggressively** to keep context small
- **Pause overnight** — no need to run at 3am unless you want to

### Model Choice

- **Sonnet/4o** — Great for product, scrum, ops, design, research cycles
- **Opus/o1** — Better for engineering cycles that write complex code
- Consider model routing: use a cheaper model for non-engineering roles

---

## File Structure

```
agents/
├── DISPATCH.md              ← Master protocol (read every cycle)
├── roster.json              ← Team composition + rotation order
├── state/
│   └── rotation.json        ← Current rotation state
├── memory/
│   ├── bank.md              ← Shared memory (read + update every cycle)
│   ├── evolution-log.md     ← Role changes log
│   └── archives/            ← Compressed bank snapshots
├── rules/
│   └── RULES.md             ← Mandatory rules for all roles
└── playbooks/
    ├── research.md           ← Research role playbook
    ├── product.md            ← Product role playbook
    ├── scrum.md              ← Scrum role playbook
    ├── engineering.md        ← Engineering role playbook
    ├── ops.md                ← Ops role playbook
    └── design.md             ← Design role playbook
```

---

## License

MIT — use this however you want.

---

*Built by [Rathi Industries](https://github.com/ishan190425) — engineering the future with autonomous AI teams.*
