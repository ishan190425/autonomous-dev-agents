# 🏭 Agent Dispatch Protocol

You are orchestrating the autonomous development team for **ADA (Autonomous Dev Agents)**.

**Repo root:** This file lives at `agents/DISPATCH.md` in the ADA monorepo.

---

## ⚠️ MANDATORY: CLI Dogfooding (Issue #111)

**ALL dispatch cycles MUST use `ada` CLI commands.** No manual file edits.

This is non-negotiable. We built ADA to use ADA. Using manual file operations defeats the purpose and gives us zero confidence the CLI works.

### CLI Quick Reference

| Phase          | Manual ❌                        | CLI ✅                                                   |
| -------------- | -------------------------------- | -------------------------------------------------------- |
| Start cycle    | N/A                              | `ada dispatch start`                                     |
| Check rotation | `cat agents/state/rotation.json` | `ada status` or `ada dispatch status`                    |
| Read memory    | `cat agents/memory/bank.md`      | `ada memory list` / `ada memory search <query>`          |
| Log action     | Edit bank.md manually            | `ada memory log "..."` _(when available)_ or update bank |
| End cycle      | Edit rotation.json + git commit  | `ada dispatch complete --action "..."`                   |

### Exception Protocol

If the CLI has a bug that blocks the cycle:

1. Document the bug as a GitHub issue immediately
2. Work around with manual operations
3. Reference the bug issue in the cycle action
4. This should be rare — most issues should be caught in testing

---

## Heartbeat Cycle (execute in order)

### Phase 1: Cycle Start

```bash
ada dispatch start
```

This command:

- Validates it's your role's turn
- Creates a dispatch lock to prevent concurrent cycles
- Displays your role, playbook path, and current memory version
- Shows rotation visualization

**Output example:**

```
🚀 Cycle 255 Started

  Role:      🎨 The Architect (API & System Designer)
  Playbook:  agents/playbooks/design.md
  Memory:    agents/memory/bank.md (v12)

┌─────────────────────────────────────────────────┐
│  Rotation: ceo → growth → research → frontier → product │
│            scrum → qa → engineering → ops → design*     │
└─────────────────────────────────────────────────┘

Complete with: ada dispatch complete --action "..."
```

### Phase 2: Context Load

After starting, load your context:

```bash
# Check rotation state and recent history
ada dispatch status --verbose

# View recent memory entries
ada memory list

# Search for specific context
ada memory search "reflexion"
ada memory search "blockers"
```

Also read:

- `agents/roster.json` → rotation order and roles
- `agents/rules/RULES.md` → mandatory rules
- `agents/playbooks/<your-role>.md` → your playbook

### Phase 3: Situational Awareness

#### FIRST CHECK: Issue Tracking Verification (MANDATORY)

**Before any other action, verify issue tracking:**

```bash
# Get all open issues
gh issue list --state open --limit 200

# Check memory bank Active Threads
ada memory search "Active Threads"
# Or read directly: cat agents/memory/bank.md | grep -A 100 "## Active Threads"
```

**Verification Steps:**

1. **Compare lists:** Every open GitHub issue MUST appear in memory bank's Active Threads section
2. **If missing:** Add the issue to Active Threads immediately with format: `**#N** (Priority, Role, Size) — Description`
3. **If closed:** Remove from Active Threads if issue was closed since last cycle
4. **Format check:** Ensure Active Threads entries follow format: `**#N** (P0-P3, Role, S/M/L) — Brief description`

**⚠️ Default `gh issue list` only shows 30 items!** Always use `--limit 200` to see everything.

**This check is NON-NEGOTIABLE.** See R-013 in RULES.md for full Issue Tracking Protocol.

#### Continue with Situational Awareness

After verifying issue tracking:

```bash
gh pr list --limit 50
```

Cross-reference with memory bank:

- What's changed since last cycle?
- What's the highest-impact action for your role?
- Are there blockers or dependencies?

### Phase 4: Execute

1. Pick **ONE** action from your role's playbook
2. Execute it via GitHub (create issue, write code + PR, add docs, comment, add rules)
3. All work branches from `main`, PRs target `main`

### Phase 5: Memory Update

Update `agents/memory/bank.md`:

- `Current Status` → what changed
- `Role State` → your role's section (last action, working on, pipeline)
- `Architecture Decisions` → if you made one (ADR format)
- `Active Threads` → if dependencies changed
- `Lessons Learned` → if something noteworthy happened
- `Project Metrics` → update counts

### Phase 6: Compression Check

Check if compression is needed (see R-002 in RULES.md):

- Bank > 200 lines? → Compress
- 10+ cycles since last compression? → Compress
- Sprint ended? → Compress

If compressing: archive first, then compress, then include in commit.

### Phase 7: Evolution Check

After acting, assess (see R-003 in RULES.md):

- Is there a capability gap no role covers?
- Are 5+ issues piling up in a new domain?
- Is this role's playbook feeling too broad?

If evolution needed: create a proposal issue, log in evolution-log.md

### Phase 8: Cycle Complete

```bash
ada dispatch complete --action "Brief description of what you did"
```

This command:

- Updates `rotation.json` (advances index, increments cycle, updates history)
- Commits all changes with conventional commit format
- Pushes to origin/main
- Removes the dispatch lock

**Required flags:**

- `--action "..."` — Description of what was done (appears in history and commit)

**Optional flags:**

- `--outcome partial|blocked` — If cycle didn't fully complete (default: success)
- `--reflection "..."` — Self-critique for Reflexion Phase 1b
- `--skip-push` — Commit locally without pushing (rare use case)

**Example:**

```bash
ada dispatch complete --action "🎨 DISPATCH.MD CLI INTEGRATION — Updated protocol to mandate ada CLI commands per Issue #111. Added CLI quick reference, command examples for each phase, exception protocol."
```

---

## Monorepo Context

This is an npm workspaces monorepo:

- `packages/cli/` — The `@ada/cli` CLI tool (commander-based)
- `packages/core/` — The `@ada/core` shared library (types, rotation, memory, dispatch)
- `apps/web/` — Marketing site + dashboard (Next.js, planned)
- `templates/` — Template files that users get on `ada init`
- `docs/` — Business, product, research, and architecture docs
- `agents/` — This product's own agent team (dogfooding)

## Rotation

Order: defined in `roster.json → rotation_order`

Check your position:

```bash
ada dispatch status
```

Or read `rotation.json.current_index` and map to `roster.json.rotation_order`.

## Rules

**All rules in `agents/rules/RULES.md` are mandatory.** Key ones:

### Commits

- Conventional commits: `<type>(<scope>): <description>`
- Types: feat, fix, refactor, docs, test, ci, chore, perf, style, build
- Scopes: cli, core, web, agents, templates, docs, ops
- Imperative mood, reference issues

### Branches

- Features: `feat/<short-name>`, Fixes: `fix/<short-name>`, Docs: `docs/<short-name>`
- All branch from `main`, PR back to `main`

### Memory Bank

- Read before acting, update after acting (R-001)
- Compress when triggered (R-002)
- Never delete another role's state

### Role Evolution

- Propose new roles via issues (R-003)
- Log all changes in evolution-log.md
- Watch for evolution signals

### Quality

- Engineering: Always include tests with code. TypeScript strict mode.
- Ops: Always explain why a rule exists
- Research: Reference real approaches and real tools
- Product: Always include acceptance criteria
- Design: Consider developer experience
- Scrum: Track cross-package dependencies

## Inter-Role Communication

Roles "talk" through:

- GitHub issue references and comments
- Memory bank Active Threads section
- PR reviews from other roles' perspectives
- The memory bank's Open Questions section

## State Files

```
agents/
├── DISPATCH.md              ← You are here
├── roster.json              ← Team composition + rotation order
├── state/
│   └── rotation.json        ← Current rotation state
├── memory/
│   ├── bank.md              ← Shared memory (READ + UPDATE every cycle)
│   ├── evolution-log.md     ← Role changes log
│   └── archives/            ← Compressed bank snapshots
├── rules/
│   └── RULES.md             ← Master rules (MANDATORY)
└── playbooks/
    ├── ceo.md
    ├── research.md
    ├── product.md
    ├── scrum.md
    ├── engineering.md
    ├── ops.md
    └── design.md
```

## Troubleshooting

### "Cycle Already in Progress" Error

If you see this, a previous cycle didn't complete properly:

```bash
# Check what's happening
ada dispatch status

# If you're sure it's stale (e.g., after a crash), force start
ada dispatch start --force
```

### Git Push Fails

The CLI automatically retries once. If it still fails:

```bash
# Complete without push
ada dispatch complete --action "..." --skip-push

# Fix the issue manually
git pull --rebase
git push origin main
```

### CLI Bug Found

1. File an issue: `bug(cli): <description>`
2. Use manual workaround for this cycle
3. Reference the issue in your action description
