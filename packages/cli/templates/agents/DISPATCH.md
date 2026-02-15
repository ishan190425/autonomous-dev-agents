# 🏭 Agent Dispatch Protocol

You are orchestrating an autonomous development team.

## Heartbeat Cycle (execute in order)

### Phase 1: Context Load

1. Read `agents/state/rotation.json` → determine current role
2. Read `agents/roster.json` → get rotation order
3. Read `agents/rules/RULES.md` → know the rules
4. Read `agents/memory/bank.md` → understand current project state
5. Read the current role's playbook: `agents/playbooks/<role>.md`

### Phase 2: Situational Awareness

6. Check GitHub: `gh issue list` and `gh pr list` in the repo
7. Cross-reference with memory bank — what's changed since last cycle?
8. Identify the highest-impact action for this role given current state

### Phase 3: Execute

9. Pick **ONE** action from the role's playbook
10. Execute it via GitHub (create issue, write code + PR, add docs, comment, add rules)
11. All work branches from `develop`, PRs target `develop`

### Phase 4: Memory Update

12. Update `agents/memory/bank.md`:
    - `Current Status` → what changed
    - `Role State` → your role's section (last action, working on, pipeline)
    - `Architecture Decisions` → if you made one (ADR format)
    - `Active Threads` → if dependencies changed
    - `Lessons Learned` → if something noteworthy happened
    - `Project Metrics` → update counts
    - `Last updated` timestamp + cycle number

### Phase 5: Compression Check

13. Check if compression is needed (see R-002 in RULES.md):
    - Bank > 200 lines? → Compress
    - 10+ cycles since last compression? → Compress
    - Sprint ended? → Compress
14. If compressing: archive first, then compress, then commit

### Phase 6: Evolution Check

15. After acting, assess (see R-003 in RULES.md):
    - Is there a capability gap no role covers?
    - Are 5+ issues piling up in a new domain?
    - Is this role's playbook feeling too broad?
16. If evolution needed: create a proposal issue, log in evolution-log.md

### Phase 7: State Update

17. Update `agents/state/rotation.json`:
    - Increment `current_index` (wrap around at end of rotation)
    - Set `last_role` to current role
    - Set `last_run` to ISO timestamp
    - Increment `cycle_count`
    - Append to `history` (keep last 10)
18. Commit & push all changes

## Rotation

Order: defined in `roster.json → rotation_order`

Read `rotation.json.current_index` and map to `roster.json.rotation_order`.

## Rules

**All rules in `agents/rules/RULES.md` are mandatory.** Key ones:

### Commits

- Conventional commits: `<type>(<scope>): <description>`
- Types: feat, fix, refactor, docs, test, ci, chore, perf, style, build
- Scopes: defined per project (see roster.json and rules)
- Imperative mood, reference issues

### Branches

- Features: `feat/<short-name>`, Fixes: `fix/<short-name>`, Docs: `docs/<short-name>`
- All branch from `develop`, PR back to `develop`

### Memory Bank

- Read before acting, update after acting (R-001)
- Compress when triggered (R-002)
- Never delete another role's state

### Role Evolution

- Propose new roles via issues (R-003)
- Log all changes in evolution-log.md
- Watch for evolution signals

### Quality

- Engineering: Always include tests with code
- Ops: Always explain why a rule exists
- Research: Reference real approaches
- Product: Always include acceptance criteria
- Design: Consider developer experience
- Scrum: Track dependencies

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
    ├── research.md
    ├── product.md
    ├── scrum.md
    ├── engineering.md
    ├── ops.md
    └── design.md
```
