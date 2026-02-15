# CLI Developer Experience Design Rationale

> **arXiv Paper Section — Developer Experience (Section 4 contribution)**
> **Issue:** #131 | **Cycle:** C665 | **Author:** 🎨 Design
> **Related:** `cli-ux-audit-c655.md`, `arxiv-paper-evaluation-update-c658.md`
> **Purpose:** Document the design philosophy and rationale behind ADA's CLI

---

## Abstract

This document captures the developer experience (DX) design decisions embedded in ADA's command-line interface. These decisions enable autonomous agent teams to operate without human intervention while remaining accessible to human developers when oversight is needed. The CLI serves dual masters: agents executing dispatch cycles, and humans observing or debugging.

---

## 1. Design Philosophy

### 1.1 Principle: "Works in the Dark"

ADA agents operate 24/7, including overnight hours when no human is watching. The CLI must:

- **Fail gracefully** — Errors must not halt rotation; agents must self-recover
- **Log comprehensively** — Every action must be traceable after the fact
- **Require zero prompts** — Interactive prompts would block autonomous operation

**Design Decision:** All commands support `--json` output and non-interactive execution by default.

### 1.2 Principle: "Human When Needed"

Despite autonomous operation, humans must be able to:

- **Observe** — Understand current state without disrupting operation
- **Debug** — Trace issues across cycles, roles, and memory versions
- **Override** — Intervene when agents make mistakes (rare but critical)

**Design Decision:** `ada dispatch status --verbose` shows complete rotation history. `ada memory search` enables rapid context retrieval.

### 1.3 Principle: "Agents as First-Class Users"

Traditional CLIs optimize for human typing speed. ADA's CLI optimizes for:

- **Scriptability** — Commands compose cleanly in shell scripts and orchestrators
- **Idempotency** — Running the same command twice should be safe
- **Structured output** — JSON output enables programmatic parsing

**Design Decision:** Every command that produces output supports `--json` flag.

---

## 2. Command Structure

### 2.1 Verb-Noun Pattern

```
ada <domain> <action> [options]
```

**Domains:**

- `dispatch` — Cycle management (start, complete, status)
- `memory` — Memory bank operations (list, search, log)
- `playbook` — Playbook management (suggest, apply, list)
- `heat` — Heat scoring operations (summary, list, decay, boost)
- `reflexion` — Self-improvement (analyze, report)
- `terminal` — Benchmark integration (run, stream, stop)
- `status` — Quick overview (no subcommand needed)

**Rationale:** Domains mirror the conceptual model of the framework. Agents think in terms of "dispatch" and "memory," not abstract verbs. This reduces cognitive mapping from concept to command.

### 2.2 Consistent Flag Conventions

| Flag          | Meaning                | Applies To             |
| ------------- | ---------------------- | ---------------------- |
| `--json`      | Output as JSON         | All output commands    |
| `--verbose`   | Extended details       | Status/list commands   |
| `--force`     | Override safety checks | Destructive commands   |
| `--dry-run`   | Preview without action | Mutating commands      |
| `--limit N`   | Restrict result count  | List commands          |
| `--role <id>` | Filter by role         | Memory/status commands |

**Rationale:** Flag consistency reduces memorization burden. Agents can reliably use `--json` without per-command documentation.

---

## 3. Output Design

### 3.1 Human Output: Rich Text Mode

When outputting to TTY, the CLI uses:

```
┌─────────────────────────────────────────────────┐
│  Rotation: ceo → growth → research → frontier   │
│            product → scrum → qa → engineering   │
│            ops → design*                        │
└─────────────────────────────────────────────────┘
```

**Visual Elements:**

- **Box borders** — Contain related information visually
- **Color coding** — Cyan for commands, yellow for warnings, red for errors
- **Role emojis** — 🎨 👔 🔬 etc. provide instant role recognition
- **Asterisk markers** — Current position in rotation (`design*`)

**Rationale:** Visual hierarchy enables rapid scanning. Humans can glance at output and understand state in <2 seconds.

### 3.2 Machine Output: JSON Mode

When `--json` is passed or stdout is not a TTY:

```json
{
  "cycle": 665,
  "role": "design",
  "status": "started",
  "pendingSuggestions": 3,
  "memoryVersion": 31
}
```

**Guarantees:**

- Stable schema across minor versions
- All fields present (never undefined)
- ISO 8601 timestamps
- Numeric IDs, not display strings

**Rationale:** Agents parse JSON reliably. Schema stability prevents CI breakage.

### 3.3 Error Messages: Actionable, Not Cryptic

**Bad:**

```
Error: EINVAL
```

**Good:**

```
Error: Cycle already in progress (started by design at 08:29:32)

To force a new cycle, run:
  ada dispatch start --force

If this is unexpected, check for orphaned lock files:
  cat agents/state/dispatch.lock
```

**Design Principles:**

1. **State the problem** — What went wrong
2. **Explain why** — Context about the error
3. **Suggest action** — Exact command to recover
4. **Provide debug path** — Where to look for more info

**Rationale:** Autonomous agents can parse error messages and attempt recovery. Humans can follow suggestions without searching documentation.

---

## 4. Progressive Disclosure

### 4.1 Simple Defaults, Advanced Flags

**Simple (90% of use):**

```bash
ada dispatch start
ada dispatch complete --action "Did the thing"
```

**Advanced (10% of use):**

```bash
ada dispatch start --force --skip-validation
ada dispatch complete --action "..." --reflection "..." --outcome partial
```

**Rationale:** New users start with minimal commands. Power users discover flags when needed. Documentation surfaces advanced options only when relevant.

### 4.2 Help Hierarchy

```bash
ada --help              # Top-level overview
ada dispatch --help     # Domain-specific commands
ada dispatch start -h   # Command-specific options
```

Each level provides just enough context without overwhelming.

---

## 5. Self-Improvement Integration

### 5.1 Reflexion Visibility

The CLI surfaces self-improvement opportunities during normal operation:

```
🚀 Cycle 665 Started
  ...
  Suggestions: 3 pending — run `ada playbook suggest` to review
```

**Design Decision:** Surface actionable hints in context, not buried in subcommands.

### 5.2 Heat Scoring Display

Heat scores appear in memory listings when relevant:

```
ada memory list
  [████████░░] 0.82  L322: Demo-ready verification...
  [███░░░░░░░] 0.34  L145: Early compression is cheap...
```

**Visual Progress Bars:** Heat scores become glanceable. High-heat items stand out.

**Rationale:** Self-improvement signals should be ambient, not requiring deliberate lookup.

---

## 6. Autonomous Operation Patterns

### 6.1 Dispatch Lifecycle

The `ada dispatch` command family enforces correct cycle behavior:

```bash
ada dispatch start     # Creates lock, validates rotation
ada dispatch status    # Non-mutating observation
ada dispatch complete  # Commits changes, advances rotation, removes lock
```

**Lock Semantics:**

- `start` fails if lock exists (prevents concurrent cycles)
- `complete` removes lock atomically with commit
- `--force` allows override for crash recovery

**Rationale:** Explicit lifecycle commands prevent agents from skipping steps or double-executing.

### 6.2 Memory Operations

Memory commands mirror the conceptual model:

```bash
ada memory list                # Recent entries
ada memory search "blocker"    # Semantic search
ada memory log "Learned X"     # Append new entry
```

**No direct file editing required.** The CLI mediates all memory access, ensuring consistency.

---

## 7. Design Decisions Log

| Decision                                 | Rationale                        | Cycle |
| ---------------------------------------- | -------------------------------- | ----- |
| JSON output on all commands              | Agent scriptability              | C389  |
| Box-drawing for rotation display         | Visual hierarchy                 | C421  |
| Emoji role indicators                    | Instant recognition              | C435  |
| Error messages include recovery commands | Autonomous self-repair           | C451  |
| Heat scores as progress bars             | Glanceability                    | C425  |
| Suggestions in dispatch output           | Discovery without extra commands | C659  |
| Consistent `--verbose` flag              | Reduce flag memorization         | C475  |
| Color scheme: cyan/yellow/red            | Industry standard severity       | C485  |

---

## 8. Future Directions

### 8.1 TUI Mode (#25)

Interactive terminal UI for real-time cycle observation. Complements CLI for long-running monitoring sessions.

### 8.2 Quiet Mode (#73)

`--quiet` flag for CI environments where only errors should appear.

### 8.3 Config File Discovery

Automatic discovery of `ada.config.json` for project-specific defaults.

---

## 9. Conclusion

ADA's CLI embodies a design philosophy optimized for **autonomous operation with human observability**. Key innovations:

1. **Dual-mode output** — Rich text for humans, JSON for agents
2. **Progressive disclosure** — Simple defaults, discoverable depth
3. **Actionable errors** — Self-repair guidance built into error messages
4. **Self-improvement visibility** — Reflexion and heat scores surfaced in context

These design decisions enable the 24/7 autonomous operation validated in Section 6.7 of the evaluation, while maintaining the developer experience expected of a modern CLI tool.

---

## Integration Guidance

**For arXiv Paper Assembly:**

1. **Section 4: Developer Experience Design** — Use Sections 1-4 of this document
2. **Section 5: Self-Improvement Mechanisms** — Reference Section 5 (Reflexion/Heat integration)
3. **Related Work** — Compare to agentic CLI tools (Claude Code, Codex, etc.)

**Key Claims for Abstract:**

- "Dual-mode CLI design serves both autonomous agents and human observers"
- "Error messages include recovery commands for autonomous self-repair"
- "Self-improvement signals integrated into dispatch workflow"

---

_CLI Developer Experience Design Rationale by 🎨 The Architect (Design) | Cycle 665 | 2026-02-15 08:30 EST_
