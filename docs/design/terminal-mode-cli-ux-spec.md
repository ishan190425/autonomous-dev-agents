# 🖥️ Terminal Mode CLI UX Specification

> Design specification for the `--mode=terminal` CLI interface.
> **Author:** 🎨 The Architect | **Cycle:** 315 | **Date:** 2026-02-10
> **Related:** Issue #125 (Terminal Mode), Issue #90 (Benchmark Testing)
> **Status:** Design | **Target:** Sprint 2 Implementation

---

## Executive Summary

Terminal Mode enables ADA agents to execute shell commands during dispatch cycles. This spec defines the user-facing interface: command structure, output formatting, progress indication, and error presentation.

**Design Principle:** Make command execution transparent and debuggable. Users need to see what's happening, why it failed, and how to intervene.

---

## Command Interface

### Primary Usage

```bash
# Basic terminal mode (with rotation)
ada dispatch --mode=terminal

# Headless terminal mode (for benchmarks)
ada dispatch --headless --mode=terminal --max-cycles=15

# With command limits
ada dispatch --mode=terminal --max-commands=50 --cmd-timeout=60
```

### Flag Specification

| Flag             | Type   | Default   | Description                                        |
| ---------------- | ------ | --------- | -------------------------------------------------- |
| `--mode`         | enum   | `default` | Dispatch mode: `default`, `terminal`, `consultant` |
| `--max-commands` | number | 50        | Maximum shell commands per cycle (safety limit)    |
| `--cmd-timeout`  | number | 60        | Per-command timeout in seconds                     |
| `--shell`        | string | `bash`    | Shell to use (`bash`, `sh`, `zsh`)                 |
| `--sandbox`      | flag   | false     | Run commands in Docker sandbox                     |
| `--verbose-cmd`  | flag   | false     | Show full command output (not truncated)           |

### Mode Interactions

| Flags                        | Behavior                             |
| ---------------------------- | ------------------------------------ |
| `--mode=terminal`            | Interactive with command execution   |
| `--mode=terminal --headless` | Autonomous with command execution    |
| `--mode=terminal --sandbox`  | Sandboxed command execution (Docker) |
| `--mode=terminal --dry-run`  | Show commands without executing      |

---

## Output Formatting

### Command Execution Block

When a role executes a shell command, display:

```
┌─ ⚙️ Engineering executing command ────────────────────────┐
│ $ npm install -D vitest                                   │
└───────────────────────────────────────────────────────────┘

  ⏳ Running... (timeout: 60s)

  ┌─ stdout ──────────────────────────────────────────────┐
  │ added 45 packages in 3.2s                             │
  └───────────────────────────────────────────────────────┘

  ✅ Exit 0 (3.2s)
```

### Command Failure Block

When a command fails:

```
┌─ ⚙️ Engineering executing command ────────────────────────┐
│ $ npm run build                                           │
└───────────────────────────────────────────────────────────┘

  ⏳ Running... (timeout: 60s)

  ┌─ stderr ──────────────────────────────────────────────┐
  │ error TS2307: Cannot find module '@ada/core'          │
  │ error: Build failed with 1 error                      │
  └───────────────────────────────────────────────────────┘

  ❌ Exit 1 (0.8s) — Build failure detected

  → Handing off to Research for diagnosis
```

### Long Output Truncation

For commands with verbose output:

```
  ┌─ stdout (truncated, 847 lines) ───────────────────────┐
  │ > @ada/cli@1.0.0-alpha.1 test                         │
  │ > vitest run                                          │
  │                                                       │
  │  ✓ packages/core/tests/unit/rotation.test.ts (23)    │
  │  ✓ packages/core/tests/unit/memory.test.ts (45)      │
  │  ... 34 more files ...                                │
  │  ✓ packages/cli/tests/integration/dispatch.test.ts   │
  │                                                       │
  │  Test Files  38 passed (38)                          │
  │  Tests      668 passed (668)                         │
  └───────────────────────────────────────────────────────┘

  💡 Use --verbose-cmd to see full output
```

### Command Limits Warning

When approaching limits:

```
  ⚠️ Command limit: 45/50 — 5 commands remaining this cycle
```

When limit reached:

```
  🛑 Command limit reached (50/50)
     Cycle will complete without further command execution.
     Increase with --max-commands=N or continue next cycle.
```

---

## Progress Indication

### During Execution

Show a spinner with elapsed time:

```
  ⏳ Running... (12.3s elapsed, timeout: 60s)
```

For long-running commands, show periodic updates:

```
  ⏳ Running... (30.1s elapsed, timeout: 60s)
     └─ Still waiting. Use Ctrl+C to interrupt.
```

### Streaming Output (optional flag)

With `--stream-cmd` (advanced):

```
  ⏳ Running...
  │ Downloading packages...
  │ [###############---------] 60% (45/75 packages)
  │ Installing @types/node...
```

---

## Command History

### Memory Bank Format

Terminal commands are logged in the memory bank under a dedicated section:

````markdown
## Terminal History (Cycle 315)

### Command 1 — ⚙️ Engineering

```bash
$ npm install -D vitest
```
````

- **Exit:** 0
- **Duration:** 3.2s
- **Outcome:** Success

### Command 2 — ⚙️ Engineering

```bash
$ npm run build
```

- **Exit:** 1
- **Duration:** 0.8s
- **Outcome:** Build failure (TS2307)
- **Recovery:** Handed to Research

### Command 3 — 🔬 Research (recovery)

```bash
$ npm ls @ada/core
```

- **Exit:** 0
- **Duration:** 0.3s
- **Outcome:** Diagnosed missing workspace link

````

### Viewing Command History

```bash
# View recent terminal commands
ada memory list --type=terminal

# Search terminal history
ada memory search "npm install" --type=terminal

# Export command log
ada memory export --type=terminal --format=json > commands.json
````

---

## Error Presentation

### Exit Code Semantics

Color-code exit codes for quick scanning:

| Exit Code | Color  | Indicator           |
| --------- | ------ | ------------------- |
| 0         | Green  | ✅                  |
| 1-125     | Red    | ❌                  |
| 126       | Yellow | ⚠️ (not executable) |
| 127       | Yellow | ⚠️ (not found)      |
| 128+      | Red    | 💀 (signal)         |

### Error Classification

Show error type when recognizable:

```
  ❌ Exit 127 (0.1s) — Command not found: jq

  💡 Suggested fix: Install jq with:
     apt-get install jq  # Debian/Ubuntu
     brew install jq     # macOS
```

### Recovery Suggestions

Integrate with failure taxonomy (see `terminal-failure-recovery.md`):

```
  ❌ Exit 137 (60.2s) — Process killed (OOM)

  💡 This command was killed due to memory limits.
     Suggestions:
     1. Run with --sandbox to use Docker with memory limits
     2. Process data in smaller chunks
     3. Increase system memory allocation
```

---

## Dry Run Mode

With `--dry-run`, show what would execute without running:

```bash
ada dispatch --mode=terminal --dry-run
```

Output:

```
🔍 Dry Run Mode — commands shown but not executed

┌─ ⚙️ Engineering would execute ────────────────────────────┐
│ $ npm run build                                           │
└───────────────────────────────────────────────────────────┘

  [DRY RUN] Command not executed
  Duration: 0.0s | Exit: N/A

→ Would proceed to QA for verification (simulated success)
```

---

## Sandbox Mode

With `--sandbox`, commands run in a Docker container:

```bash
ada dispatch --mode=terminal --sandbox
```

First run:

```
🐳 Sandbox Mode — preparing Docker container

  Pulling image: ada/sandbox:latest
  Creating container: ada-terminal-315
  Mounting workspace: /home/user/project → /workspace

  Container ready. Commands will execute in isolated environment.
```

During execution:

```
┌─ ⚙️ Engineering executing command (sandboxed) ────────────┐
│ $ rm -rf node_modules && npm install                      │
└───────────────────────────────────────────────────────────┘

  🐳 Running in container: ada-terminal-315
  ⏳ Running... (45.2s elapsed)
```

---

## Interactive Prompts

### Confirmation for Destructive Commands

Certain commands trigger confirmation (unless `--yes`):

```
┌─ ⚙️ Engineering executing command ────────────────────────┐
│ $ rm -rf dist/                                            │
└───────────────────────────────────────────────────────────┘

  ⚠️ Destructive command detected (rm -rf)

  Proceed? [y/N] _
```

Destructive patterns:

- `rm -rf` (recursive delete)
- `drop database` / `DROP TABLE`
- `git push --force`
- `chmod -R 777`
- `sudo` commands

### Timeout Extension Prompt

When timeout is about to trigger:

```
  ⏳ Running... (55.0s elapsed, timeout: 60s)

  ⚠️ Command approaching timeout (5s remaining)
  Extend timeout? [y/N/enter seconds] _
```

---

## Status Command Integration

Extend `ada status` to show terminal mode state:

```bash
ada status
```

When in terminal mode:

```
┌─────────────────────────────────────────────────────────────┐
│                     ADA Status                               │
├─────────────────────────────────────────────────────────────┤
│  Cycle:     315                                             │
│  Role:      ⚙️ Engineering                                  │
│  Mode:      🖥️ Terminal                                     │
│  Commands:  7/50 executed (43 remaining)                    │
│  Last cmd:  npm run build (✅ Exit 0, 12.3s ago)           │
│  Sandbox:   Inactive                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration

### ada.config.json

```json
{
  "terminal": {
    "enabled": true,
    "defaultShell": "bash",
    "maxCommands": 50,
    "commandTimeout": 60,
    "sandbox": {
      "enabled": false,
      "image": "ada/sandbox:latest",
      "memoryLimit": "2g",
      "cpuLimit": "2"
    },
    "destructivePatterns": ["rm -rf", "DROP TABLE", "git push --force"],
    "allowSudo": false
  }
}
```

### Environment Variables

| Variable               | Default | Description               |
| ---------------------- | ------- | ------------------------- |
| `ADA_TERMINAL_SHELL`   | `bash`  | Default shell             |
| `ADA_TERMINAL_TIMEOUT` | `60`    | Default timeout (seconds) |
| `ADA_TERMINAL_MAX_CMD` | `50`    | Max commands per cycle    |
| `ADA_TERMINAL_SANDBOX` | `0`     | Enable sandbox by default |

---

## Benchmark Integration

### Terminal-Bench Workflow

For benchmark evaluation (Issue #90):

```bash
# Run Terminal-Bench task
ada dispatch --headless --mode=terminal \
  --max-cycles=15 \
  --max-commands=100 \
  --task="Install nginx and configure reverse proxy" \
  --sandbox
```

### Evaluation Output

After completion, output structured result:

```json
{
  "task": "Install nginx and configure reverse proxy",
  "cycles": 8,
  "commands": 23,
  "totalDuration": 145.2,
  "exitCodes": [0, 0, 1, 0, 0, 0, 0, 0, ...],
  "recoveries": 1,
  "finalStatus": "success",
  "verificationPassed": true
}
```

---

## Open Questions (for Engineering)

1. **Shell persistence:** Should environment variables persist between commands within a cycle? Recommendation: Yes, use a persistent shell session.

2. **Working directory:** How to handle `cd` commands? Recommendation: Track cwd state, display in prompt.

3. **Background processes:** Allow `&` for background execution? Recommendation: No for v1, add in v2 with job control.

4. **Signal forwarding:** How to handle Ctrl+C during command execution? Recommendation: Forward SIGINT to command, show prompt to continue or abort cycle.

5. **stdin:** Should commands that require stdin be supported? Recommendation: Timeout stdin-waiting commands after 5s with warning.

---

## Implementation Checklist

- [ ] Add `--mode=terminal` flag to dispatch command
- [ ] Implement command execution with stdout/stderr capture
- [ ] Add output formatting (boxes, colors, truncation)
- [ ] Implement command limit tracking and warnings
- [ ] Add progress spinner with elapsed time
- [ ] Implement memory bank logging for command history
- [ ] Add dry-run mode
- [ ] Implement destructive command confirmation
- [ ] Add timeout extension prompt
- [ ] Update `ada status` for terminal mode
- [ ] Add configuration options to ada.config.json
- [ ] Implement sandbox mode (Docker integration)
- [ ] Add benchmark output format

---

_Designed by 🎨 The Architect | Cycle 315 | Relates to Issue #125_
