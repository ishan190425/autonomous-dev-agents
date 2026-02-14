# Terminal Mode UX Specification

> **Author:** 🎨 The Architect | **Cycle:** 605 | **Date:** 2026-02-14
> **Related:** Issue #125 (Terminal Mode), Issue #90 (Benchmark Testing)
> **Lesson Reference:** L285 (Terminal mode output formatting)

---

## Executive Summary

Terminal Mode (`--mode=terminal`) enables ADA agents to execute shell commands within dispatch cycles. This spec defines the UX patterns for visual clarity, ensuring developers can distinguish between:

1. **ADA system messages** (role communication, state transitions)
2. **Command invocations** (what's being executed)
3. **Command output** (stdout/stderr from shell)
4. **ADA responses** (role analysis of results)

Per L285: _"Terminal mode output formatting requires clear visual separation between ADA's internal communication and external command output — use box-drawing characters or prefixes to distinguish system boundaries."_

---

## Design Principles

### 1. Boundary Clarity

Every output zone must be visually distinct. A developer glancing at the terminal should immediately know:

- Who's "talking" (ADA role vs shell command)
- What type of content it is (planning, execution, output, analysis)
- Where one section ends and another begins

### 2. Scannable Hierarchy

Long terminal sessions generate significant output. Design must support:

- Quick visual scanning for errors
- Easy identification of role transitions
- Clear delineation between commands

### 3. Copy-Paste Friendly

Command output must be easily selectable for debugging. Box-drawing should not interfere with copying actual command output.

### 4. Color-Safe

All visual separation must work in both:

- Full-color terminals (iTerm2, modern terminals)
- No-color mode (`--no-color`, CI environments, pipes)

---

## Visual Language

### Zone Prefixes

```
ADA System Messages:
┃ [🔬 Research] Planning approach...
┃ [⚙️ Engineering] Executing implementation...

Command Invocations:
▶ npm test

Command Output (stdout):
│ PASS  tests/unit/memory.test.ts
│ PASS  tests/unit/rotation.test.ts
│ 42 tests passed

Command Output (stderr):
│ ⚠ warning: deprecated function usage

ADA Analysis:
┃ [⚙️ Engineering] All tests passing. Proceeding to build.
```

### Prefix Reference

| Zone Type  | Prefix | Color (when available) | Rationale                         |
| ---------- | ------ | ---------------------- | --------------------------------- |
| ADA System | `┃ `   | Cyan                   | Vertical bar = internal boundary  |
| Command    | `▶ `   | Yellow                 | Play symbol = action being taken  |
| stdout     | `│ `   | Dim/Gray               | Thin bar = external output        |
| stderr     | `│ `   | Red (text)             | Same bar, colored for attention   |
| Exit Code  | `◀ `   | Green/Red              | Return symbol, colored by success |
| Error      | `✗ `   | Red                    | Clear error indicator             |
| Success    | `✓ `   | Green                  | Clear success indicator           |

### Box Zones (Complex Output)

For multi-line system messages or summaries:

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🔬 Research — Command Planning                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Strategy: Verify test coverage before implementation         ┃
┃ Commands:                                                    ┃
┃   1. npm test -- --coverage                                  ┃
┃   2. Check coverage threshold (>85%)                         ┃
┃   3. If passing, proceed to implementation                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## Output Flow Example

Full terminal mode session example:

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🚀 Terminal Mode — Cycle 42                                  ┃
┃ Task: Implement user authentication                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┃ [🔬 Research] Analyzing task requirements...
┃ [🔬 Research] Need to verify current auth state first.

▶ grep -r "auth" src/

│ src/config.ts:  authEnabled: false,
│ src/index.ts:   // TODO: implement auth

┃ [🔬 Research] No existing auth implementation. Handing to Engineering.

┃ [⚙️ Engineering] Creating auth module...

▶ mkdir -p src/auth && touch src/auth/index.ts

◀ exit 0 (32ms)

▶ cat > src/auth/index.ts << 'EOF'
export function validateToken(token: string): boolean {
  // Implementation
  return token.length > 0;
}
EOF

◀ exit 0 (12ms)

┃ [⚙️ Engineering] Auth module created. Running tests...

▶ npm test

│ PASS  tests/auth.test.ts
│   ✓ validates non-empty tokens (3ms)
│   ✓ rejects empty tokens (1ms)
│
│ Test Suites: 1 passed, 1 total
│ Tests:       2 passed, 2 total
│ Time:        1.234s

◀ exit 0 (1.4s) ✓

┃ [🔍 QA] Tests passing. Verifying coverage...

▶ npm test -- --coverage

│ ----------------------|---------|----------|---------|---------|
│ File                  | % Stmts | % Branch | % Funcs | % Lines |
│ ----------------------|---------|----------|---------|---------|
│ src/auth/index.ts     |   100   |   100    |   100   |   100   |
│ ----------------------|---------|----------|---------|---------|

◀ exit 0 (2.1s) ✓

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✓ Cycle 42 Complete                                          ┃
┃ Commands: 4 | Success: 4 | Failed: 0 | Time: 4.7s            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## Error State Visualization

When commands fail:

```
▶ npm test

│ FAIL  tests/auth.test.ts
│   ✗ validates tokens correctly
│     Expected: true
│     Received: false
│
│ Tests:       1 failed, 1 total

◀ exit 1 (0.8s) ✗

┃ [🔍 QA] Test failure detected. Analyzing...
┃ [🔍 QA] Issue: validateToken returns false for valid tokens.
┃ [🔍 QA] Handing back to Engineering with diagnosis.
```

### stderr Handling

```
▶ npm install nonexistent-package

│ npm ERR! 404 Not Found - GET https://registry.npmjs.org/nonexistent-package
│ npm ERR! 404 'nonexistent-package@latest' is not in this registry.

◀ exit 1 (1.2s) ✗

┃ [⚙️ Engineering] Package not found. Searching for alternatives...
```

---

## Streaming Output

For long-running commands, output streams in real-time with subtle activity indicators:

```
▶ npm test -- --watchAll=false

│ Determining test suites to run...
│ ·
│ PASS  tests/unit/config.test.ts
│ ·
│ PASS  tests/unit/memory.test.ts
│ ·
│ PASS  tests/unit/rotation.test.ts
│ ·

◀ exit 0 (4.2s) ✓
```

The `·` indicates streaming activity when output is paused but process is running.

---

## No-Color Mode

When `--no-color` is specified or output is piped:

```
[ADA] [Research] Analyzing task requirements...
[ADA] [Research] Need to verify current auth state first.

> grep -r "auth" src/

| src/config.ts:  authEnabled: false,
| src/index.ts:   // TODO: implement auth

[ADA] [Research] No existing auth implementation. Handing to Engineering.

> mkdir -p src/auth

< exit 0 (32ms)
```

### No-Color Prefix Mapping

| Zone Type  | Color Prefix     | No-Color Prefix |
| ---------- | ---------------- | --------------- |
| ADA System | `┃ [emoji Role]` | `[ADA] [Role]`  |
| Command    | `▶ `             | `> `            |
| stdout     | `│ `             | `\| `           |
| Exit Code  | `◀ `             | `< `            |

---

## Command History

At cycle end or on demand (`ada terminal history`):

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Command History — Cycle 42                                   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ #  │ Role        │ Command                     │ Exit │ Time ┃
┃────┼─────────────┼─────────────────────────────┼──────┼──────┃
┃ 1  │ Research    │ grep -r "auth" src/         │   0  │  32ms┃
┃ 2  │ Engineering │ mkdir -p src/auth           │   0  │  12ms┃
┃ 3  │ Engineering │ cat > src/auth/index.ts...  │   0  │  12ms┃
┃ 4  │ QA          │ npm test                    │   0  │ 1.4s ┃
┃ 5  │ QA          │ npm test -- --coverage      │   0  │ 2.1s ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## Safety Indicators

### Command Limit Warning

```
┃ [🛡️ Ops] ⚠ Command limit approaching: 47/50
┃ [🛡️ Ops] 3 commands remaining. Prioritize completion.
```

### Timeout Warning

```
▶ npm run build

│ Building...
│ [=====>                    ] 15%

◀ TIMEOUT (60s limit reached) ✗

┃ [🛡️ Ops] Command timed out. Consider:
┃   • Increasing timeout (--cmd-timeout=120)
┃   • Breaking into smaller tasks
```

---

## Configuration

```bash
# Full color mode (default)
ada dispatch --mode=terminal

# No color (for CI, pipes, logging)
ada dispatch --mode=terminal --no-color

# Custom limits
ada dispatch --mode=terminal --max-commands=100 --cmd-timeout=120

# Verbose command logging (includes full stdout/stderr in logs)
ada dispatch --mode=terminal --verbose-commands
```

---

## Implementation Notes

### Recommended Libraries

- **chalk** — Terminal colors (already in CLI dependencies)
- **cli-table3** — Table formatting
- **ora** — Spinners for long-running commands
- **boxen** — Box drawing utilities

### Type Additions

```typescript
type OutputZone = 'ada' | 'command' | 'stdout' | 'stderr' | 'exit' | 'summary';

interface TerminalFormatter {
  formatZone(zone: OutputZone, content: string): string;
  formatExitCode(code: number, elapsed: number): string;
  formatCommandHistory(commands: CommandEntry[]): string;
}
```

---

## Acceptance Criteria (Design)

- [ ] All zone types have distinct visual prefixes
- [ ] Color and no-color modes are visually equivalent in structure
- [ ] Command output is copy-paste friendly (no artifacts)
- [ ] Error states are immediately visible (red, ✗ symbols)
- [ ] Success states are clearly indicated (green, ✓ symbols)
- [ ] Long output sessions remain scannable
- [ ] Safety limits have clear visual warnings

---

## Open Questions

1. **Nested commands:** If a role executes a script that itself runs multiple commands, how do we visualize the nesting?
2. **Interactive commands:** Should we support `vim`, `less`, or other interactive programs? (Likely no for v1.)
3. **Parallel execution:** If multiple roles could theoretically execute commands simultaneously, how do we interleave output? (Likely serialize for v1.)

---

_This specification provides UX guidance for Issue #125 implementation. Engineering should reference this for all terminal output formatting decisions._
