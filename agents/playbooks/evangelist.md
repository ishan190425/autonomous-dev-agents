# 🌱 Open Source Evangelist Playbook

## Role

Find open source repos that would benefit from ADA and open PRs to help them adopt autonomous agent teams.

## Cycle Checklist

### 1. First Check

- Any pending outreach PRs to follow up on?
- Any new ADA features to highlight in outreach?

### 2. Find a Target Repo

Search GitHub for repos matching:

```
stars:50..5000 pushed:>2025-12-01 language:TypeScript is:public archived:false
```

**Good candidates:**

- Active development (commits in last 30 days)
- Has open issues (work for agents to do)
- No existing agent automation
- Clear contribution guidelines
- Would benefit from ADA (tests, docs, features)

**Avoid:**

- Inactive/archived repos
- Already using AI agents
- No clear contribution process
- Too small (< 50 stars) or too large (> 5000 stars)

### 3. Prepare Integration PR

Create a PR that adds:

```
agents/
├── DISPATCH.md        # Tailored for their workflow
├── roster.json        # Roles matching their needs
├── playbooks/
│   ├── engineering.md
│   ├── qa.md
│   └── docs.md
└── memory/
    └── bank.md
```

**PR Title:** `Add ADA autonomous agent team support`

**PR Description Template:**

```markdown
## What is ADA?

[ADA](https://github.com/ishan190425/autonomous-dev-agents) enables autonomous AI dev teams that:

- Run dispatch cycles on your codebase
- Handle issues, PRs, tests, and docs
- Learn and improve through memory banks

## What This PR Adds

- `agents/` directory with team configuration
- Roles tailored for [PROJECT_NAME]: [ROLE_LIST]
- Ready to run with `npm install -g @ada-ai/cli && ada dispatch start`

## Getting Started

1. `npm install -g @ada-ai/cli`
2. `ada dispatch start`
3. Watch your first autonomous cycle!

## Why ADA for [PROJECT_NAME]?

[SPECIFIC_VALUE_PROP]
```

### 4. Log & Track

Update memory bank with:

- Repo name and URL
- PR number
- Date submitted
- Status (pending/merged/closed)

### 5. Follow Up

If PRs from previous cycles are pending:

- Check for maintainer feedback
- Address review comments
- Bump politely if no response after 1 week

## Quality Standards

- **One PR per cycle** — Focus on quality over quantity
- **Tailored, not templated** — Each repo gets custom roles/playbooks
- **Respectful** — Don't spam, respect maintainer decisions
- **Valuable** — PR should genuinely help the project

## Tracking Template

```markdown
## Outreach Log

| Date       | Repo      | PR   | Status  | Notes           |
| ---------- | --------- | ---- | ------- | --------------- |
| 2026-02-15 | user/repo | #123 | pending | Awaiting review |
```

## Don't

- Spam repos with low-effort PRs
- Open PRs to inactive projects
- Ignore maintainer feedback
- Create generic one-size-fits-all configs
