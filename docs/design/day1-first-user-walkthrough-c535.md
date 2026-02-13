# 🎨 Day 1 First-User Walkthrough (C535)

> Simulated first-user experience for v1.0-alpha launch.
> **Date:** 2026-02-13 14:35 EST
> **Cycle:** 535
> **Launch Window:** Feb 14-17 (T-1 day)

---

## Purpose

Document the exact experience a new user will have on Day 1. This serves as:

1. **Baseline Reference** — Compare actual feedback against expected flows
2. **Friction Pre-Check** — Identify any last-minute UX issues
3. **Support Template** — Guide for responding to "How do I...?" questions

---

## Expected User Journey

### Step 1: Discovery & Install

**User Action:** `npm install -g @ada/cli`

**Expected Output:**

```
added 123 packages in 5s
```

**Potential Friction Points:**

- Permission errors on global install → Suggest `npx @ada/cli` instead
- Node version mismatch → Require Node 18+
- Network/proxy issues → Standard npm troubleshooting

**UX Quality:** ✅ Standard npm experience

---

### Step 2: First Command — Version Check

**User Action:** `ada --version`

**Expected Output:**

```
1.0.0-alpha
```

**UX Quality:** ✅ Clean, instant

---

### Step 3: Exploring Available Commands

**User Action:** `ada --help`

**Expected Output:**

```
Usage: ada [options] [command]

🤖 Autonomous Dev Agents — AI agent teams for any repo

Options:
  -v, --version      Output the current version
  --banner           Show the ADA banner
  -h, --help         display help for command

Commands:
  init [options]     Initialize an autonomous agent team in the current repo
  run [options]      Execute one dispatch cycle as the current role
  status [options]   Show rotation state, last actions, and memory bank summary
  config [options]   View and edit agent team configuration
  memory             🧠 Semantic search over agent memories
  dispatch           🏭 Dispatch cycle lifecycle management
  insights           🔍 Detect cross-role patterns from rotation history
  issues             Issue tracking verification and management (R-013)
  heat [options]     Heat scoring for cognitive memory
  stop [options]     Graceful stop — finish current cycle, then exit
  pause [options]    Pause dispatch — set paused flag to prevent future cycles
  resume [options]   Resume dispatch — clear paused flag to allow cycles
  observe [options]  Show agent observability metrics
  costs [options]    Quick cost check for agent operations
  help [command]     display help for command
```

**UX Quality:** ✅ Clear hierarchy, helpful descriptions, good emoji use

**Potential Questions:**

- "What's dispatch vs run?" → Dispatch is the full lifecycle, run is just execution
- "What's heat scoring?" → Advanced memory feature, not needed for getting started

---

### Step 4: Initialization — The Critical First 5 Minutes

**User Action:** `ada init`

**Expected Flow:**

```
🚀 Initializing ADA Agent Team

? What type of team do you want to create? (Use arrow keys)
❯ Balanced — Full team for mature projects
  Engineering-first — Focus on shipping code
  Research-first — Exploration and documentation
  Minimal — Just the essentials (CEO + Engineer)

? How many roles should the team have?
❯ Small (4-5 roles) — Lean and fast
  Medium (6-8 roles) — Balanced coverage
  Large (10+ roles) — Full autonomy

Creating agent team...

✅ Agent team initialized!

Created:
  📁 agents/
  ├── roster.json          Team composition
  ├── state/rotation.json  Rotation state
  ├── memory/bank.md       Shared memory
  ├── rules/RULES.md       Team rules
  └── playbooks/           Role playbooks
      ├── ceo.md
      ├── engineering.md
      └── ... (based on selection)

Next steps:
  1. Run 'ada status' to see your team
  2. Configure your LLM provider in .env or environment
  3. Run 'ada dispatch start' to begin your first cycle
```

**UX Quality:** ✅ Clear prompts, sensible defaults, actionable next steps

**Potential Friction Points:**

- "What LLM do I need?" → Need clear docs on supported providers
- "Where do I set the API key?" → .env file or environment variable
- "What's a dispatch cycle?" → Link to concepts doc

---

### Step 5: First Status Check

**User Action:** `ada status`

**Expected Output:**

```
📊 Agent Team Status

  Team:     My Project
  Roles:    5 active
  Cycle:    0 (not started)

┌─────────────────────────────────────────────────┐
│  Rotation: ceo → engineering → product → ops → qa* │
└─────────────────────────────────────────────────┘

  Next role: 👔 The Founder (CEO)

  Run 'ada dispatch start' to begin cycle 1
```

**UX Quality:** ✅ Informative, scannable, includes next action

---

### Step 6: First Dispatch Cycle

**User Action:** `ada dispatch start`

**Expected Output:**

```
🚀 Cycle 1 Started

  Role:      👔 The Founder (CEO)
  Playbook:  agents/playbooks/ceo.md
  Memory:    agents/memory/bank.md (v1)

┌─────────────────────────────────────────────────┐
│  Rotation: ceo* → engineering → product → ops → qa │
└─────────────────────────────────────────────────┘

Complete with: ada dispatch complete --action "..."
```

**UX Quality:** ✅ Clear what to do next, shows context

**Critical Question:** "Now what?"
→ User should read their playbook and execute one action
→ This is where ADA + LLM integration comes in

---

## Mental Model Checkpoints

### What Users Should Understand by Minute 5

1. **ADA creates AI agent teams** — Multiple AI "roles" that work together
2. **Roles rotate** — Each cycle, a different role acts
3. **Memory persists** — Bank.md is shared context
4. **Dispatch lifecycle** — Start → Act → Complete

### Common Misconceptions to Watch For

| Misconception             | Reality                           |
| ------------------------- | --------------------------------- |
| "One AI does everything"  | Multiple specialized roles        |
| "Runs continuously"       | Event-driven cycles (cron/manual) |
| "Just add API key, works" | Needs repo context + orchestrator |
| "Replace my dev team"     | Augment, not replace              |

---

## Day 1 Support Playbook

### Tier 1: Self-Service (Docs)

- README quickstart
- Getting Started guide
- Command reference

### Tier 2: Community (Discord)

- #help channel for questions
- #showcase for success stories
- #bugs for issue reports

### Tier 3: GitHub Issues

- Bug reports with reproduction steps
- Feature requests with use cases

---

## Friction Tracker Template

Use this to log Day 1 friction points:

| Time | User | Friction Point | Category | Response |
| ---- | ---- | -------------- | -------- | -------- |
|      |      |                |          |          |

Categories: Setup, UX, Docs, Bug, Mental Model

---

## Sign-Off

This walkthrough confirms:

- ✅ CLI commands flow logically
- ✅ Output is clear and actionable
- ✅ Next steps are always provided
- ✅ Help is accessible at every point

**DESIGN: DAY 1 READY** ✅

---

_Created by 🎨 The Architect — Cycle 535_
