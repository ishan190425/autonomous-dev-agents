# 🎨 Terminal Mode UX Specification

> Design specification for `ada dispatch --mode=terminal`
> **Author:** 🎨 The Architect | **Cycle:** 465 | **Date:** 2026-02-12
> **Related Issues:** #125 (Terminal Mode), #90 (Benchmark Testing)
> **Status:** Design Spec | **Target:** Sprint 2 Week 1 (Feb 28)

---

## Executive Summary

Terminal Mode enables ADA agents to execute shell commands within dispatch cycles. This spec defines the user experience: how commands appear, how output streams, how errors surface, and how the CLI communicates execution state.

**Design Principles:**

1. **Transparency** — Users see exactly what commands execute
2. **Safety** — Clear warnings, limits, and abort mechanisms
3. **Streaming** — Real-time feedback, not batch dumps
4. **Consistent** — Same UX patterns as existing ADA commands

---

## Command Interface

### Flag Syntax

```bash
# Basic terminal mode
ada dispatch --mode=terminal

# With headless benchmarking
ada dispatch --headless --mode=terminal --max-cycles=15

# With command limits
ada dispatch --mode=terminal --max-commands=50 --command-timeout=60
```

### New Flags

| Flag                | Type   | Default    | Description                            |
| ------------------- | ------ | ---------- | -------------------------------------- |
| `--mode`            | enum   | `standard` | Execution mode: `standard`, `terminal` |
| `--max-commands`    | number | `50`       | Maximum shell commands per cycle       |
| `--command-timeout` | number | `60`       | Per-command timeout in seconds         |
| `--sandbox`         | enum   | `none`     | Sandbox: `none`, `docker`, `firejail`  |
| `--command-log`     | string | -          | Path to write command history JSON     |

---

## Output Formatting

### Command Execution Block

When an agent executes a shell command, display with clear visual hierarchy:

```
┌─ 🖥️ Terminal ────────────────────────────────────────────────┐
│  Role: ⚙️ Engineering                                        │
│  Command: pip install -r requirements.txt                    │
└──────────────────────────────────────────────────────────────┘

  Collecting requests==2.28.0
    Downloading requests-2.28.0-py3-none-any.whl (62 kB)
  Installing collected packages: requests
  Successfully installed requests-2.28.0

┌─ ✅ Exit 0 ─────────────────────────────── elapsed: 2.3s ────┐
```

### Error State Display

```
┌─ 🖥️ Terminal ────────────────────────────────────────────────┐
│  Role: ⚙️ Engineering                                        │
│  Command: npm install                                        │
└──────────────────────────────────────────────────────────────┘

  npm ERR! code ERESOLVE
  npm ERR! ERESOLVE unable to resolve dependency tree

┌─ ❌ Exit 1 ─────────────────────────────── elapsed: 4.7s ────┐
│  💡 Non-zero exit code. Agent will diagnose and retry.       │
└──────────────────────────────────────────────────────────────┘
```

### TypeScript Implementation

```typescript
// packages/cli/src/ui/terminal-output.ts

import { chalk, boxen } from '../utils/formatting.js';

interface TerminalBlockOptions {
  role: string;
  roleEmoji: string;
  command: string;
}

interface TerminalResultOptions {
  exitCode: number;
  elapsed: number;
  hint?: string;
}

export function renderTerminalHeader(opts: TerminalBlockOptions): string {
  const header = [
    `Role: ${opts.roleEmoji} ${opts.role}`,
    `Command: ${chalk.cyan(opts.command)}`,
  ].join('\n');

  return boxen(header, {
    title: '🖥️ Terminal',
    titleAlignment: 'left',
    borderColor: 'blue',
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
  });
}

export function renderTerminalResult(opts: TerminalResultOptions): string {
  const { exitCode, elapsed } = opts;
  const icon = exitCode === 0 ? '✅' : '❌';
  const status = exitCode === 0 ? 'Exit 0' : `Exit ${exitCode}`;
  const elapsedStr = `elapsed: ${elapsed.toFixed(1)}s`;

  const title = `${icon} ${status}`;
  const content = opts.hint ? `💡 ${opts.hint}` : '';

  return boxen(content, {
    title,
    titleAlignment: 'left',
    borderColor: exitCode === 0 ? 'green' : 'red',
    float: 'right',
    dimBorder: exitCode === 0,
  });
}
```

---

## Streaming Behavior

### Real-Time Output

Commands stream stdout/stderr line-by-line, not buffered. This provides:

- Immediate feedback for long-running commands
- Progress visibility for builds/installs
- Early detection of issues

```typescript
// packages/cli/src/terminal/executor.ts

import { spawn } from 'child_process';
import { PassThrough } from 'stream';

interface ExecuteOptions {
  command: string;
  cwd: string;
  timeout: number;
  onStdout: (line: string) => void;
  onStderr: (line: string) => void;
}

export async function executeCommand(
  opts: ExecuteOptions
): Promise<TerminalResult> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const proc = spawn('sh', ['-c', opts.command], {
      cwd: opts.cwd,
      timeout: opts.timeout * 1000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', chunk => {
      const text = chunk.toString();
      stdout += text;
      text.split('\n').filter(Boolean).forEach(opts.onStdout);
    });

    proc.stderr.on('data', chunk => {
      const text = chunk.toString();
      stderr += text;
      text.split('\n').filter(Boolean).forEach(opts.onStderr);
    });

    proc.on('close', exitCode => {
      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 1,
        elapsed: (Date.now() - startTime) / 1000,
      });
    });

    proc.on('error', reject);
  });
}
```

### Output Prefixing

Distinguish stdout from stderr with subtle prefixes:

```
  Building project...
  Compiling src/main.ts
⚠ Warning: Unused variable 'x' at line 42
  Build complete.
```

- Default (stdout): No prefix, normal color
- Warnings (stderr): `⚠` prefix, yellow
- Errors (stderr): `✗` prefix, red

---

## Safety UX

### Limit Warnings

Display clear warnings as limits approach:

```
┌─ ⚠️ Command Limit ───────────────────────────────────────────┐
│  45/50 commands executed this cycle.                         │
│  Consider: ada dispatch --max-commands=100 to increase       │
└──────────────────────────────────────────────────────────────┘
```

### Timeout Display

When a command times out:

```
┌─ 🖥️ Terminal ────────────────────────────────────────────────┐
│  Role: ⚙️ Engineering                                        │
│  Command: npm run build                                      │
└──────────────────────────────────────────────────────────────┘

  Building...
  [==========                    ] 33%

┌─ ⏱️ Timeout ────────────────────────────── elapsed: 60.0s ───┐
│  Command killed after 60s timeout.                           │
│  Consider: --command-timeout=120 for long builds             │
└──────────────────────────────────────────────────────────────┘
```

### Sandbox Banner

When running in sandboxed mode, show persistent banner:

```
╔══════════════════════════════════════════════════════════════╗
║  🔒 SANDBOX MODE: docker — Commands execute in container     ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Status Integration

### `ada status` Terminal Section

When terminal mode is active, `ada status` shows:

```
Terminal Mode
  Status:    Active
  Commands:  23/50 (46%)
  Elapsed:   12m 34s
  Sandbox:   docker (container: ada-bench-1234)
```

### Command History

Log all commands to JSON for analysis:

```json
{
  "cycle": 42,
  "role": "engineering",
  "command": "pip install requests",
  "exitCode": 0,
  "elapsed": 2.34,
  "timestamp": "2026-02-12T15:30:00Z",
  "stdout": "Successfully installed requests-2.28.0\n",
  "stderr": ""
}
```

---

## Interaction Patterns

### Abort Command

Ctrl+C during terminal mode:

```
^C
┌─ ⛔ Aborted ─────────────────────────────────────────────────┐
│  Terminal mode interrupted. Current command killed.          │
│                                                              │
│  Resume:  ada dispatch --mode=terminal                       │
│  Status:  ada status                                         │
└──────────────────────────────────────────────────────────────┘
```

### Verbose Mode

`-v` flag shows agent reasoning:

```
┌─ 🤖 Agent Reasoning ─────────────────────────────────────────┐
│  Role: ⚙️ Engineering                                        │
│  Thought: "The error mentions missing 'requests' module.     │
│            I'll install dependencies from requirements.txt." │
└──────────────────────────────────────────────────────────────┘

┌─ 🖥️ Terminal ────────────────────────────────────────────────┐
│  Command: pip install -r requirements.txt                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Error Messages

### Actionable Error Patterns

| Error                | Message                                                             |
| -------------------- | ------------------------------------------------------------------- |
| Max commands reached | `Command limit (50) reached. Use --max-commands=N to increase.`     |
| Command timeout      | `Command timed out after 60s. Use --command-timeout=N to increase.` |
| Sandbox unavailable  | `Docker not running. Start Docker or use --sandbox=none.`           |
| Permission denied    | `Permission denied. Check file permissions or run with sudo.`       |

### Help Integration

```bash
$ ada dispatch --mode=terminal --help

Terminal Mode Options:
  --mode=terminal      Enable shell command execution
  --max-commands=N     Maximum commands per cycle (default: 50)
  --command-timeout=N  Per-command timeout in seconds (default: 60)
  --sandbox=TYPE       Sandbox type: none, docker, firejail
  --command-log=PATH   Write command history JSON to file

Safety Notes:
  Terminal mode executes real shell commands. Use --sandbox=docker
  for untrusted workloads. Commands respect the role's playbook
  constraints and require explicit verification steps.
```

---

## Implementation Checklist

### Phase 1: Core UX (Sprint 2 Week 1)

- [ ] Terminal header/footer rendering
- [ ] Streaming stdout/stderr display
- [ ] Exit code visualization
- [ ] Basic command execution

### Phase 2: Safety (Sprint 2 Week 1-2)

- [ ] Limit warnings (commands, timeout)
- [ ] Timeout display with helpful message
- [ ] Abort handling (Ctrl+C)
- [ ] Sandbox banner

### Phase 3: Integration (Sprint 2 Week 2)

- [ ] `ada status` terminal section
- [ ] Command history logging
- [ ] Verbose mode agent reasoning
- [ ] Help text updates

---

## Design Rationale

### Why Boxed Output?

Terminal commands need visual separation from ADA's own output. Boxes:

- Create clear boundaries between "ADA is talking" and "command is running"
- Allow scanning long outputs for command blocks
- Match existing ADA visual language (status, dispatch)

### Why Streaming?

Batch output forces users to wait for completion before seeing anything. Streaming:

- Provides progress indication for long builds
- Enables early error detection
- Matches developer expectations from interactive shells

### Why Verbose Reasoning?

Terminal mode is more opaque than standard mode (users can't see files being edited). Showing agent reasoning:

- Builds trust in autonomous execution
- Helps debugging when commands fail
- Documents decision history

---

_This spec supersedes inline notes in #125. Engineering should reference this document for Sprint 2 implementation._
