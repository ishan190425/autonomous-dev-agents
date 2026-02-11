# Architecture: Role-Based Multi-Agent Framework for Autonomous Software Development

> **arXiv Paper Section 3 — Draft v1.0**
> **Issue:** #131 | **Cycle:** C389 | **Author:** 🌌 Frontier
> **Purpose:** Expanded Architecture section for academic credibility

---

## 3. Architecture

ADA's architecture draws inspiration from how high-performing software teams organize and coordinate. We decompose the framework into four primary subsystems: the **Role System** (who does what), the **Dispatch Protocol** (how turns are managed), the **Memory System** (how knowledge persists), and the **Governance Layer** (how quality is maintained). Figure 1 illustrates the overall system architecture.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ADA Framework                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │   LLM API   │    │  GitHub API │    │ OpenClaw    │  External    │
│  │  (Provider) │    │   (SCM)     │    │  (Cron)     │  Interfaces  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘              │
│         │                  │                  │                      │
│  ═══════╪══════════════════╪══════════════════╪═══════════════════  │
│         │                  │                  │                      │
│         ▼                  ▼                  ▼                      │
│  ┌───────────────────────────────────────────────────────────┐      │
│  │                    Dispatch Engine                         │      │
│  │  ┌─────────┐  ┌─────────────┐  ┌─────────────────────┐   │      │
│  │  │ Rotation │  │ Playbook    │  │ Action Executor     │   │      │
│  │  │ Manager  │  │ Loader      │  │ (LLM + Tools)       │   │      │
│  │  └────┬────┘  └──────┬──────┘  └──────────┬──────────┘   │      │
│  │       │              │                    │               │      │
│  │       └──────────────┴────────────────────┘               │      │
│  └───────────────────────────┬───────────────────────────────┘      │
│                              │                                       │
│  ════════════════════════════╪══════════════════════════════════    │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                 │
│         │                    │                    │                 │
│         ▼                    ▼                    ▼                 │
│  ┌─────────────┐    ┌───────────────┐    ┌─────────────────┐       │
│  │ Memory      │    │ Rule          │    │ Role            │       │
│  │ System      │    │ System        │    │ System          │       │
│  │             │    │               │    │                 │       │
│  │ • Bank.md   │    │ • RULES.md    │    │ • Roster.json   │       │
│  │ • Archives  │    │ • Validation  │    │ • Playbooks/*.md│       │
│  │ • Learnings │    │ • Enforcement │    │ • State/*.json  │       │
│  └─────────────┘    └───────────────┘    └─────────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

                    Figure 1: ADA System Architecture
```

### 3.1 Role System

Central to ADA's design is the concept of **role specialization**. Rather than treating software development as a single skill, we decompose it into ten distinct roles, each with unique responsibilities, focus areas, and behavioral patterns. This mirrors how human software organizations divide labor.

#### 3.1.1 Role Definitions

Table 2 presents the complete role taxonomy:

| Role        | Emoji | Primary Responsibility            | Output Artifacts                       | Strategic/Tactical |
| ----------- | ----- | --------------------------------- | -------------------------------------- | ------------------ |
| CEO         | 👔    | Strategy, Go/No-Go decisions      | Strategic plans, milestone decisions   | Strategic          |
| Growth      | 🚀    | Marketing, partnerships, outreach | Pitch materials, partnership proposals | Strategic          |
| Research    | 🔬    | Technology scouting, feasibility  | Research analyses, literature surveys  | Strategic          |
| Frontier    | 🌌    | Platform innovation, advanced R&D | Platform specs, prototypes, ADRs       | Strategic          |
| Product     | 📦    | Features, specifications, backlog | PRDs, user stories, sprint planning    | Tactical           |
| Scrum       | 📋    | Coordination, retrospectives      | Retros, velocity tracking, hygiene     | Tactical           |
| QA          | 🔍    | Testing, quality assurance        | Test cases, coverage reports           | Tactical           |
| Engineering | ⚙️    | Implementation, pull requests     | Code, tests, architecture              | Tactical           |
| Ops         | 🛡️    | CI/CD, infrastructure, rules      | Workflows, rule definitions, configs   | Tactical           |
| Design      | 🎨    | API design, UX, architecture      | Interface specs, wireframes, ADRs      | Tactical           |

**Strategic vs. Tactical:** We distinguish between roles that focus on long-term direction (Strategic) and roles that focus on immediate execution (Tactical). This classification affects how roles interpret priority signals and time horizons.

#### 3.1.2 Role Composition

Each role is defined by a **playbook** stored as a markdown file (`agents/playbooks/<role>.md`). Playbooks contain:

1. **Mission Statement** — The role's core purpose in 1-2 sentences
2. **Focus Areas** — Domains the role cares about
3. **First Checks** — Mandatory verifications before any action (e.g., PR queue review)
4. **Available Actions** — Enumerated list of what the role can do each cycle
5. **Integration Points** — How the role coordinates with other roles
6. **Quality Bar** — Standards the role must meet

This structure ensures roles have clear boundaries while enabling flexibility within their domain. Playbooks are versioned in git and can evolve through the Role Evolution Protocol (Section 3.4.3).

#### 3.1.3 Role Roster

The `roster.json` file defines the active team composition:

```json
{
  "roles": {
    "ceo": {
      "name": "CEO",
      "emoji": "👔",
      "title": "The Executive",
      "playbook": "agents/playbooks/ceo.md"
    }
    // ... additional roles
  },
  "rotation_order": [
    "ceo",
    "growth",
    "research",
    "frontier",
    "product",
    "scrum",
    "qa",
    "engineering",
    "ops",
    "design"
  ],
  "team_size": 10
}
```

The roster enables **team customization**—users can add, remove, or modify roles based on their project needs. The rotation order defines the sequence in which roles take turns.

### 3.2 Dispatch Protocol

The dispatch protocol governs how roles take turns and execute work. We implement a **round-robin** scheduling algorithm that ensures all roles receive regular attention regardless of project phase.

#### 3.2.1 Rotation State Machine

Dispatch follows a state machine with the following states:

```
┌──────────┐     start      ┌──────────┐     complete     ┌──────────┐
│  IDLE    │ ───────────▶  │ ACTIVE   │ ──────────────▶  │  IDLE    │
└──────────┘               └──────────┘                   └──────────┘
     │                           │
     │         timeout           │
     │    (lock expiry)          │
     └◀──────────────────────────┘
```

**State definitions:**

- **IDLE**: No cycle in progress. Ready for next role to claim turn.
- **ACTIVE**: A role has claimed the turn and is executing. A lock file prevents concurrent dispatch.

The lock mechanism prevents race conditions when multiple dispatch triggers occur simultaneously (e.g., cron jobs overlapping).

#### 3.2.2 Cycle Lifecycle

Each dispatch cycle follows an eight-phase protocol:

```
Phase 1: Cycle Start
    └─▶ Validate turn ownership
    └─▶ Acquire dispatch lock
    └─▶ Load role context

Phase 2: Context Load
    └─▶ Read memory bank
    └─▶ Load playbook
    └─▶ Check recent history

Phase 3: Situational Awareness
    └─▶ Verify issue tracking (R-013)
    └─▶ Check GitHub issues/PRs
    └─▶ Cross-reference with memory

Phase 4: Execute
    └─▶ Select ONE action from playbook
    └─▶ Execute via GitHub API / file system
    └─▶ Create artifacts (issues, PRs, docs)

Phase 5: Memory Update
    └─▶ Update Current Status
    └─▶ Update Role State
    └─▶ Log new learnings
    └─▶ Update metrics

Phase 6: Compression Check
    └─▶ Check bank size (>200 lines?)
    └─▶ Check cycle count (>10 since compression?)
    └─▶ Archive and compress if triggered

Phase 7: Evolution Check
    └─▶ Assess capability gaps
    └─▶ Propose new roles if needed

Phase 8: Cycle Complete
    └─▶ Advance rotation index
    └─▶ Commit and push changes
    └─▶ Release dispatch lock
```

This protocol is enforced by the CLI (`ada dispatch start`, `ada dispatch complete`) which validates that each phase completes before advancing.

#### 3.2.3 Rotation Index

The rotation index tracks position in the round-robin schedule:

```json
{
  "current_index": 3,
  "last_role": "research",
  "last_run": "2026-02-11T09:27:06.174Z",
  "cycle_count": 388,
  "history": [
    /* last 10 cycles */
  ]
}
```

After each cycle, `current_index` advances modulo `team_size`. This ensures deterministic role ordering while maintaining audit history.

#### 3.2.4 Dispatch Triggering

ADA supports multiple dispatch trigger modes:

1. **Manual**: Developer runs `ada dispatch start` directly
2. **Cron**: Scheduled execution via OpenClaw or system cron
3. **Event-driven**: Triggered by GitHub webhooks (planned)

For autonomous operation, cron-based dispatch at 15-30 minute intervals provides sustained development velocity while allowing time for external actions (CI, deployments) to complete.

### 3.3 Memory System

The memory system enables knowledge persistence across dispatch cycles. Without memory, each cycle would start from scratch—losing context, decisions, and learned patterns.

#### 3.3.1 Memory Bank Structure

The **memory bank** (`agents/memory/bank.md`) is the primary shared memory artifact. It follows a structured schema:

```markdown
# 🧠 Memory Bank

> Last updated: YYYY-MM-DD HH:MM:SS | Cycle: N | Version: V

## Current Status

[Active sprint, blockers, high-level state]

## Role State

### 👔 CEO

- **Last:** [What CEO did last cycle]
- **Next:** [What CEO should do next]

### 🔬 Research

[... each role has a section ...]

## Active Threads

### Active (P0-P1, In Progress)

- **#26** (P0, CEO, L) — Description
  [... all open issues tracked by priority ...]

## Critical Path

| Date | Milestone | Status |
[... key dates and deadlines ...]

## Key Lessons

- **L1:** [Insight from cycle N]
  [... indexed learnings ...]

## Architecture Decisions

| ADR | Title | Status | Cycle |
[... decisions in ADR format ...]

## Project Metrics

[Quantitative health indicators]
```

This structure enables both human and AI readability while supporting programmatic parsing.

#### 3.3.2 Memory Operations

The memory system supports five core operations:

| Operation    | CLI Command                   | Description                             |
| ------------ | ----------------------------- | --------------------------------------- |
| **Read**     | `ada memory list`             | View recent memory entries              |
| **Search**   | `ada memory search "<query>"` | Semantic search over memory content     |
| **Update**   | (Manual edit during cycle)    | Modify sections per role responsibility |
| **Archive**  | `ada memory archive`          | Create timestamped snapshot             |
| **Compress** | `ada memory compress`         | Summarize and reduce bank size          |

Search uses keyword matching in the current implementation, with vector-based semantic search planned for future versions.

#### 3.3.3 Compression Protocol

Memory compression addresses the fundamental challenge of unbounded context growth. Without compression, the memory bank would exceed LLM context limits within ~50 cycles.

**Compression triggers:**

- Bank exceeds 200 lines
- 10+ cycles since last compression
- Sprint boundary (natural checkpoint)

**Compression algorithm:**

```
Input:  bank.md (current), archives/ (historical)
Output: bank.md (compressed), archives/bank-{date}-v{N}.md

1. Archive current bank to archives/
2. For each section in bank:
   a. If section is "Role State":
      - Preserve only last action and next action
      - Remove intermediate history
   b. If section is "Active Threads":
      - Preserve all open issues
      - Remove closed issues
   c. If section is "Lessons Learned":
      - Move lessons older than 20 cycles to archive
      - Preserve lesson index (L1, L2, ...) in compressed form
   d. If section is "Architecture Decisions":
      - Preserve all ADRs (never compress)
3. Increment version number
4. Update "Last compression" metadata
```

Compression is lossy by design—older details are archived rather than destroyed, enabling retrieval when needed while keeping active context manageable.

#### 3.3.4 Learnings Extraction

A novel feature of ADA's memory system is **explicit learnings extraction**. Each cycle that produces an insight logs it with an indexed identifier:

```markdown
- **L145:** Academic Related Work sections should include positioning tables
```

Learnings accumulate across cycles, creating an organizational knowledge base. During compression, older learnings are archived but the index is preserved:

```markdown
> Lessons L1-L99 archived in v19. L100-L123 archived in v20.

- **L124:** [Recent insight]
```

This enables long-term learning while respecting context limits.

### 3.4 Governance Layer

The governance layer provides self-regulating mechanisms that maintain quality and process consistency without human intervention.

#### 3.4.1 Rule System

Rules are defined in `agents/rules/RULES.md`, a mandatory rulebook that all roles must follow. Rules have the following structure:

```markdown
## R-NNN: Rule Title

### Trigger

[When this rule applies]

### Requirements

[What must be done]

### Rationale

[Why this rule exists]
```

**Example rules:**

| ID    | Name                    | Purpose                                  |
| ----- | ----------------------- | ---------------------------------------- |
| R-001 | Memory Bank Protocol    | Ensures every cycle reads/updates memory |
| R-002 | Compression Protocol    | Prevents unbounded memory growth         |
| R-003 | Role Evolution Protocol | Governs how new roles are proposed/added |
| R-010 | PR Management & CI      | Ensures code quality gates               |
| R-013 | Issue Tracking Protocol | Ensures all issues are tracked in memory |

Rules are enforced through two mechanisms:

1. **CLI Validation**: Commands like `ada dispatch complete` verify that required steps were completed
2. **Playbook Integration**: Role playbooks reference rules as "First Checks" that must pass before action

#### 3.4.2 Quality Gates

Quality gates are checkpoints that block progress if conditions aren't met:

```
┌───────────────────────────────────────────────────────────────┐
│                    Dispatch Quality Gates                      │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │ R-013 Check │    │ R-001 Check │    │ CI Status   │       │
│  │             │    │             │    │   Check     │       │
│  │ All issues  │ ──▶│ Memory bank │ ──▶│ Tests pass? │       │
│  │ tracked?    │    │ read?       │    │ Lint pass?  │       │
│  └─────────────┘    └─────────────┘    └─────────────┘       │
│        │                   │                   │              │
│        ▼                   ▼                   ▼              │
│      FAIL?               FAIL?               FAIL?            │
│   └─▶ Block          └─▶ Block          └─▶ Block            │
│       dispatch           dispatch           merge             │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

#### 3.4.3 Role Evolution Protocol

The governance layer includes mechanisms for controlled evolution. When a capability gap is identified:

1. **Detection**: Role identifies that 5+ issues pile up in an uncovered domain
2. **Proposal**: Issue created: `chore(agents): propose new role — <name>`
3. **Specification**: Proposer drafts playbook for new role
4. **Review**: Other roles (especially CEO, Product, Ops) comment on proposal
5. **Activation**: If approved, role is added to roster.json and playbook committed
6. **Logging**: Change recorded in `agents/memory/evolution-log.md`

This protocol ensures team structure can adapt to project needs while maintaining governance oversight.

#### 3.4.4 Reflexion Integration

ADA integrates the Reflexion pattern [Shinn et al., 2023] for continuous self-improvement:

**Phase 1a — Cycle Reflection:**
Each `ada dispatch complete` accepts an optional `--reflection` flag:

```bash
ada dispatch complete --action "..." --reflection "What worked: X. What to improve: Y. Lesson: Z."
```

**Phase 1b — Pattern Extraction:**
Scrum Master role extracts cross-role patterns every 10 cycles during retrospectives.

**Phase 1c — Cross-Role Insights:**
Retrospectives surface cascading insights that affect multiple roles.

**Phase 2 — Playbook Refinement (Planned):**
Accumulated learnings are periodically integrated into playbooks, creating a feedback loop where the team improves its own operating procedures.

---

## 3.5 Implementation Details

### 3.5.1 CLI Package (`@ada/cli`)

The CLI implements the dispatch protocol as a commander-based Node.js application:

```typescript
// Simplified dispatch start implementation
export async function dispatchStart(options: DispatchOptions): Promise<void> {
  const state = await loadRotationState();
  const roster = await loadRoster();

  // Validate turn ownership
  const currentRole = roster.rotation_order[state.current_index];

  // Acquire lock
  await acquireDispatchLock(currentRole);

  // Display context
  console.log(`🚀 Cycle ${state.cycle_count + 1} Started`);
  console.log(
    `   Role: ${roster.roles[currentRole].emoji} ${roster.roles[currentRole].title}`
  );
}
```

### 3.5.2 Core Library (`@ada/core`)

The core library provides TypeScript types and utilities shared across packages:

```typescript
// Core types (simplified)
export interface RotationState {
  current_index: number;
  last_role: string;
  last_run: string;
  cycle_count: number;
  history: CycleHistoryEntry[];
}

export interface CycleHistoryEntry {
  role: string;
  timestamp: string;
  cycle: number;
  action: string;
  reflection?: ReflectionData;
}

export interface ReflectionData {
  outcome: 'success' | 'partial' | 'blocked';
  whatWorked?: string;
  whatToImprove?: string;
  lesson?: string;
}
```

### 3.5.3 File System as Database

ADA uses the file system as its primary persistence layer:

| File                         | Purpose          | Format   |
| ---------------------------- | ---------------- | -------- |
| `agents/roster.json`         | Team composition | JSON     |
| `agents/state/rotation.json` | Dispatch state   | JSON     |
| `agents/memory/bank.md`      | Shared memory    | Markdown |
| `agents/rules/RULES.md`      | Governance rules | Markdown |
| `agents/playbooks/*.md`      | Role definitions | Markdown |

This design choice enables:

- **Git integration**: All state changes are commits, creating an audit trail
- **Human readability**: Developers can inspect and modify state without special tools
- **LLM compatibility**: Markdown formats are well-suited for LLM context windows
- **Simplicity**: No database setup required

---

## Integration Notes

**For Paper Assembly:**

- This section follows Related Work (Section 2)
- Approximately 2,500-3,000 words in final form
- ASCII diagrams should be converted to proper figures
- Code snippets can be formatted as listings

**Key Architectural Contributions:**

1. Role-based decomposition with playbook-driven behavior
2. Round-robin dispatch with quality gates
3. Structured memory with compression and learnings extraction
4. Rule-based governance with evolution protocol
5. File system as database for git-native state management

---

_Section 3 draft prepared for #131. Complements C388 Related Work section._
