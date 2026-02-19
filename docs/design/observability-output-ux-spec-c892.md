# Observability Output UX Specification

> **Issue:** #186 (Structured Logging), #178 (Distributed Tracing)
> **Companion Doc:** `docs/frontier/saas-observability-spec-c886.md`
> **Author:** 🎨 Design (C892)
> **Date:** 2026-02-18
> **Status:** Design Complete — Ready for Engineering

---

## Overview

This spec defines the CLI UX for ADA's new observability output modes. It complements the technical specification in `saas-observability-spec-c886.md` by defining how structured logs, verbose output, and trace information should appear to users.

**Design Philosophy:** Make observability output useful without being overwhelming. JSON for machines, pretty output for humans, and easy correlation between the two.

---

## Output Modes

ADA supports three output modes controlled by flags:

| Flag        | Mode       | Audience   | Use Case                      |
| ----------- | ---------- | ---------- | ----------------------------- |
| (none)      | Clean      | Developers | Day-to-day use, minimal noise |
| `--verbose` | Verbose    | Operators  | Debugging, monitoring         |
| `--json`    | JSON Lines | Machines   | Log aggregation, parsing      |

### Flag Precedence

- `--json` always wins (machine-parseable, no formatting)
- `--verbose` adds detail to human output
- `--quiet` suppresses info-level (shows warn/error only)
- Combine: `--verbose --trace` shows verbose + trace IDs

---

## Mode Specifications

### 1. Clean Mode (Default)

Current behavior. Progress-focused output for developers.

```
🚀 Cycle 892 Started

  Role:      🎨 The Architect (API & System Designer)
  Playbook:  agents/playbooks/design.md
  Memory:    agents/memory/bank.md (v45)

Complete with: ada dispatch complete --action "..."
```

**Design Principles:**

- Emoji for visual scanning
- Minimal metadata (no timestamps, no IDs)
- Focus on what the user cares about
- Use box-drawing sparingly

### 2. Verbose Mode (`--verbose`)

Adds timestamps, context IDs, and operational details.

```
[2026-02-18 20:18:32] INFO  ✓ Dispatch lock acquired
[2026-02-18 20:18:32] INFO  Loading rotation state...
[2026-02-18 20:18:32] DEBUG   → Current index: 9 (design)
[2026-02-18 20:18:32] DEBUG   → Last run: 2026-02-19T01:03:38.255Z
[2026-02-18 20:18:32] INFO  ✓ Validated role rotation
[2026-02-18 20:18:32] INFO  🚀 Cycle 892 Started

  Role:      🎨 The Architect (API & System Designer)
  Playbook:  agents/playbooks/design.md
  Memory:    agents/memory/bank.md (v45)

[2026-02-18 20:18:32] INFO  Cycle 892 ready for execution
[2026-02-18 20:18:32] DEBUG   Session: ses_abc123
[2026-02-18 20:18:32] DEBUG   Trace: t-xyz789

Complete with: ada dispatch complete --action "..."
```

**Verbose Format Anatomy:**

```
[TIMESTAMP] LEVEL ✓/✗/↻ Message
    → Detail line (indented)
```

| Component | Format                | Notes                                               |
| --------- | --------------------- | --------------------------------------------------- |
| Timestamp | `YYYY-MM-DD HH:mm:ss` | Local timezone, 24hr                                |
| Level     | 5-char padded         | `DEBUG`, `INFO `, `WARN `, `ERROR`                  |
| Status    | Symbol                | `✓` success, `✗` fail, `↻` in progress, ` ` neutral |
| Message   | Plain text            | Primary info                                        |
| Detail    | `→ ` prefix           | Subordinate info, 4-space indent                    |

**Level Colors:**
| Level | Color | Fallback |
|-------|-------|----------|
| DEBUG | dim/gray | no styling |
| INFO | default | no styling |
| WARN | yellow | `[!]` prefix |
| ERROR | red | `[E]` prefix |

### 3. JSON Mode (`--json`)

Machine-readable JSON Lines. One JSON object per line.

```json
{"ts":"2026-02-18T20:18:32.000Z","level":"info","msg":"Dispatch lock acquired","ctx":{"cycleId":"892","role":"design","sessionId":"ses_abc123","traceId":"t-xyz789"}}
{"ts":"2026-02-18T20:18:32.005Z","level":"debug","msg":"Loading rotation state","ctx":{"cycleId":"892","role":"design","sessionId":"ses_abc123","traceId":"t-xyz789"},"data":{"currentIndex":9,"lastRole":"ops"}}
{"ts":"2026-02-18T20:18:32.010Z","level":"info","msg":"Cycle started","ctx":{"cycleId":"892","role":"design","sessionId":"ses_abc123","traceId":"t-xyz789"},"data":{"playbook":"agents/playbooks/design.md","memoryVersion":45}}
```

**JSON Schema:**

```typescript
interface LogEntry {
  ts: string; // ISO 8601 timestamp
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  msg: string; // Human-readable message
  ctx: {
    // Always present
    cycleId?: string;
    role?: string;
    sessionId?: string;
    traceId?: string;
    spanId?: string;
  };
  data?: Record<string, unknown>; // Structured payload
  err?: {
    // Present on errors
    code: string; // E0101, E0201, etc.
    message: string;
    stack?: string;
  };
}
```

**JSON Principles:**

- One object per line (JSON Lines / NDJSON)
- No pretty-printing (single line)
- All fields lowercase
- Timestamps in UTC ISO 8601
- Context (`ctx`) always present, even if empty
- Data (`data`) only when meaningful payload exists

---

## Trace Integration

### Trace ID Display (`--trace`)

Show trace IDs for debugging distributed operations.

**Verbose + Trace:**

```
[2026-02-18 20:18:32] INFO  🚀 Cycle 892 Started
  │ trace: t-xyz789
  │ span:  s-dispatch-start
```

**Clean + Trace:**

```
🚀 Cycle 892 Started [trace: t-xyz789]

  Role:      🎨 The Architect
  ...
```

### Trace ID Format

```
t-{8-char-random}   # Trace (spans entire cycle)
s-{name}-{4-char}   # Span (specific operation)
```

**Examples:**

- Trace: `t-a3f8b2c1`
- Spans: `s-dispatch-start-9f3a`, `s-memory-load-b2c4`, `s-git-push-e8f1`

### Span Hierarchy Display

For debugging, `--trace --verbose` shows span timing:

```
[2026-02-18 20:18:32] INFO  Cycle complete
  │ trace: t-xyz789 (total: 3.4s)
  │
  │ Spans:
  │ ├─ s-dispatch-start (12ms)
  │ │  └─ s-validate-rotation (3ms)
  │ ├─ s-context-load (45ms)
  │ │  ├─ s-read-memory (15ms)
  │ │  └─ s-read-playbook (8ms)
  │ └─ s-dispatch-complete (120ms)
  │    ├─ s-git-commit (80ms)
  │    └─ s-git-push (20ms)
```

---

## Error Output Integration

Integrate with error message UX spec (`cli-error-messages-ux-spec-c882.md`).

### Error in Clean Mode

```
✗ Dispatch failed

  Error: E0201 — Role rotation invalid

  The rotation index (15) exceeds roster size (10).
  This usually happens when roster.json was modified.

  Fix:
    1. Run: ada dispatch status
    2. Check agents/roster.json has expected roles
    3. Reset rotation: ada dispatch reset

  Reference: https://ada.dev/errors/E0201
```

### Error in Verbose Mode

Same as clean, plus context:

```
[2026-02-18 20:18:32] ERROR ✗ Dispatch failed
  │ trace: t-xyz789
  │ span: s-validate-rotation
  │
  Error: E0201 — Role rotation invalid
  ...
```

### Error in JSON Mode

```json
{
  "ts": "2026-02-18T20:18:32.000Z",
  "level": "error",
  "msg": "Dispatch failed",
  "ctx": {
    "cycleId": "892",
    "traceId": "t-xyz789",
    "spanId": "s-validate-rotation"
  },
  "err": {
    "code": "E0201",
    "message": "Role rotation invalid",
    "detail": "The rotation index (15) exceeds roster size (10).",
    "fix": [
      "Run: ada dispatch status",
      "Check agents/roster.json",
      "Reset: ada dispatch reset"
    ],
    "ref": "https://ada.dev/errors/E0201"
  }
}
```

---

## Progress Indicators

### Long-Running Operations (Verbose)

```
[2026-02-18 20:18:32] INFO  ↻ Pushing to origin...
[2026-02-18 20:18:34] INFO  ✓ Push complete (2.1s)
```

### Long-Running Operations (JSON)

```json
{"ts":"2026-02-18T20:18:32.000Z","level":"info","msg":"Git push started","ctx":{...},"data":{"operation":"git-push","status":"started"}}
{"ts":"2026-02-18T20:18:34.000Z","level":"info","msg":"Git push complete","ctx":{...},"data":{"operation":"git-push","status":"complete","durationMs":2100}}
```

---

## Output Filtering

### Log Level Control

```bash
ada dispatch start --log-level debug    # Show debug+
ada dispatch start --log-level warn     # Warn/error only
ada dispatch start --quiet              # Alias for --log-level warn
```

### Filtering in JSON Mode

JSON output includes all levels. Filtering happens downstream:

```bash
ada dispatch start --json | jq 'select(.level == "error")'
ada dispatch start --json | grep '"level":"warn"'
```

---

## Environment Variables

| Variable            | Effect                                   |
| ------------------- | ---------------------------------------- |
| `NO_COLOR=1`        | Disable all colors                       |
| `ADA_LOG_LEVEL`     | Default log level                        |
| `ADA_OUTPUT_FORMAT` | Default format (clean/verbose/json)      |
| `ADA_TRACE`         | Enable trace IDs by default              |
| `FORCE_COLOR=1`     | Force colors (for CI with color support) |

---

## Accessibility Considerations

1. **Color Independence:**
   - Status symbols (✓/✗/↻) convey meaning without color
   - Level prefixes (ERROR/WARN) provide redundancy
   - Works with `NO_COLOR=1`

2. **Screen Readers:**
   - Clean mode uses minimal symbols
   - Verbose mode has full text labels
   - JSON mode is fully parseable

3. **Terminal Width:**
   - Clean/verbose wrap gracefully at 80 columns
   - JSON never wraps (single-line guarantee)
   - Long paths truncate with `…`

---

## Implementation Checklist

### Phase 1: Structured Logging MVP (#186)

- [ ] Add `--json` flag to all commands
- [ ] Add `--verbose` flag to all commands
- [ ] Implement JSON schema
- [ ] Add context propagation (cycleId, role, sessionId)
- [ ] Update error output to match spec

### Phase 2: Trace Integration (#178)

- [ ] Add `--trace` flag
- [ ] Implement trace ID generation
- [ ] Add span tracking
- [ ] Display trace hierarchy in verbose mode

### Phase 3: Polish

- [ ] Environment variable support
- [ ] Log level filtering
- [ ] Documentation updates
- [ ] Integration tests for all output modes

---

## Related Documents

- `docs/frontier/saas-observability-spec-c886.md` — Technical implementation
- `docs/design/cli-error-messages-ux-spec-c882.md` — Error message patterns
- `docs/design/progress-indicators-ux-spec-c802.md` — Progress/spinner UX

---

_Design Complete — Engineering can begin implementation_
