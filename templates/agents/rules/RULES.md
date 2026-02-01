# 📜 Master Rules

> Living rulebook for the autonomous agent team.  
> Rules are added by any role (primarily Ops).  
> All roles MUST follow these rules. No exceptions.

---

## Rule Index

| ID    | Rule                                                      | Owner   | Added |
| ----- | --------------------------------------------------------- | ------- | ----- |
| R-001 | [Memory Bank Protocol](#r-001-memory-bank-protocol)       | System  | Init  |
| R-002 | [Compression Protocol](#r-002-compression-protocol)       | System  | Init  |
| R-003 | [Role Evolution Protocol](#r-003-role-evolution-protocol) | System  | Init  |
| R-004 | [Commit Standards](#r-004-commit-standards)               | Ops     | Init  |
| R-005 | [Branch Strategy](#r-005-branch-strategy)                 | Ops     | Init  |
| R-006 | [Issue Quality](#r-006-issue-quality)                     | Product | Init  |

---

## R-001: Memory Bank Protocol

**Every heartbeat cycle MUST:**

1. **Read** `agents/memory/bank.md` before taking action
2. **Update** the relevant section after acting:
   - Update `Current Status` with what changed
   - Update your `Role State` with what you did and what's next
   - Add any new `Architecture Decisions` (ADR format)
   - Add `Lessons Learned` when something went wrong or unexpectedly well
   - Update `Active Threads` if dependencies changed
   - Update `Project Metrics` if counts changed (issues, PRs, code)
3. **Never delete** another role's state — only update your own
4. **Timestamp** the `Last updated` field at the top

### What goes in the bank

- Current project state (sprint, blockers, in-progress)
- Key decisions and their rationale
- Cross-role dependencies and open questions
- Per-role working context
- Lessons learned

### What does NOT go in the bank

- Full code (reference files/PRs instead)
- Conversation history (that's what GitHub comments are for)
- Secrets or credentials

---

## R-002: Compression Protocol

The memory bank grows over time. Compression keeps it manageable.

### Trigger

Compress when ANY of these are true:

- Bank exceeds **200 lines**
- It's been **10+ cycles** since last compression
- A sprint ends

### Compression Steps

1. **Archive first:** Copy current `bank.md` → `agents/memory/archives/bank-YYYY-MM-DD-vN.md`
2. **Compress:** Rewrite `bank.md` with:
   - Remove completed/merged items from "In Progress"
   - Collapse old Architecture Decisions into a summary line (keep ID + one-liner)
   - Move resolved Open Questions to Lessons Learned (or delete)
   - Summarize old Role State actions (keep only last 2-3 per role)
   - Roll up old Lessons Learned into themes (keep last 10 individual entries)
   - Update Project Metrics with current numbers
3. **Increment** the version number at the top
4. **Commit:** `chore(agents): compress memory bank v{N} → v{N+1}`

### What survives compression

- Active sprint info
- Unresolved blockers
- Recent decisions (last 5 detailed, older ones summarized)
- Active cross-role threads
- Current role state
- Last 10 lessons learned

### What gets archived

- Completed sprint details
- Resolved blockers and questions
- Older decision details (summary stays)
- Completed role actions

---

## R-003: Role Evolution Protocol

The team evolves as the project grows. Roles can be created, modified, or retired.

### Creating a New Role

Any role can **propose** a new role when:

- A clear capability gap exists that no current role covers
- Work is being repeated that should be owned by a specialist
- Project complexity demands dedicated focus

**To propose:**

1. Create an issue: `chore(agents): propose new role — <name>`
2. Include: name, emoji, title, focus areas, 3+ specific actions, justification
3. At least 2 other roles must 👍 the issue (via comments or reactions)

**To activate:**

1. Add the role to `agents/roster.json`
2. Create a playbook in `agents/playbooks/<id>.md`
3. Add the role to `rotation_order` in roster.json
4. Update memory bank with new role's initial state
5. Log in `agents/memory/evolution-log.md`
6. Commit: `feat(agents): add <role> role to autonomous team`

### Modifying an Existing Role

When a role's focus needs to shift:

1. Update the playbook with new/changed actions
2. Update roster.json if focus areas change
3. Log the change in evolution-log.md
4. Commit: `refactor(agents): update <role> playbook — <reason>`

### Retiring a Role

When a role is no longer needed:

1. Create an issue with justification
2. Redistribute responsibilities to other roles
3. Move playbook to `agents/playbooks/archived/`
4. Remove from roster.json rotation_order
5. Log in evolution-log.md
6. Commit: `chore(agents): retire <role> role — <reason>`

### Evolution Triggers

Watch for these signals that the team should evolve:

- **New module added** → May need a specialist role
- **Repeated blockers** → May need a dedicated role to address
- **5+ issues in a new domain** → Enough work for a dedicated role
- **Role consistently skipping actions** → Role may be too broad, split it
- **External dependency** (cloud, APIs, hardware) → May need a specialist role

---

## R-004: Commit Standards

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

- **Types:** feat, fix, refactor, docs, test, ci, chore, perf, style, build
- **Scopes:** Defined per project — use module names, role names, or `agents`
- **Mood:** Imperative ("add" not "added")
- **Body:** Explain WHY if not obvious
- **Footer:** Reference issues (`Closes #N`, `Relates to #N`)

---

## R-005: Branch Strategy

- `main` — Production-ready, protected
- `develop` — Integration branch, all PRs target this
- `feat/<name>` — Features
- `fix/<name>` — Bug fixes
- `docs/<name>` — Documentation
- `refactor/<name>` — Refactoring
- `ci/<name>` — CI/CD changes

**Never push directly to `main`.** Always PR through `develop`.

---

## R-006: Issue Quality

Every issue MUST have:

- Conventional title: `<type>(<scope>): <description>`
- Clear body with context
- At least one label
- Priority label if enhancement (P0-P3)
- Module label if code-related
- Author signature (role name + emoji)

---

_New rules are added by committing changes to this file. Include the rule ID, owner, and date._
