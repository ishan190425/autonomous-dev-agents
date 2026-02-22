# CLI Progress Indicators UX Specification

> **Issue:** #175 — feat(cli): Progress Indicators for Long-Running Operations
> **Author:** 🎨 Design (The Architect)
> **Cycle:** C1072
> **Status:** DRAFT — Ready for Engineering review

---

## Design Philosophy

Progress feedback transforms waiting from anxiety into confidence. Users should never wonder "is it working?" or "how much longer?" Every long-running operation should communicate:

1. **Activity** — Something is happening (not frozen)
2. **Progress** — How far along we are (when measurable)
3. **Estimate** — How much longer (when predictable)
4. **Context** — What's happening now (current step)

---

## Indicator Types

### 1. Spinners (Indeterminate Progress)

Use when duration is unknown or unpredictable.

```
⠋ Connecting to GitHub API...
⠙ Fetching issue list...
⠹ Analyzing memory bank...
```

**Spinner Characters:** Use Braille pattern dots for smooth animation:
`⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏`

**Frame rate:** 80ms per frame (12.5 FPS) — smooth without CPU waste.

### 2. Progress Bars (Determinate Progress)

Use when total steps/size is known.

```
Compressing memory bank...
████████████░░░░░░░░ 60% (12/20 entries)
```

**Bar Characters:**

- Filled: `█` (U+2588)
- Empty: `░` (U+2591)
- Width: 20 characters (fixed, fits 80-col terminals)

### 3. Step Indicators (Multi-Phase Operations)

Use for sequential operations with discrete steps.

```
Creating dispatch cycle...

  ✓ Validated rotation state
  ✓ Loaded memory bank (v52)
  ⠋ Building role context...
  ○ Writing dispatch lock
  ○ Pushing to origin

Step 3 of 5
```

**Icons:**

- Completed: `✓` (green)
- In Progress: Spinner (cyan)
- Pending: `○` (dim)
- Failed: `✖` (red)

### 4. Elapsed Time (Long Operations)

Use for operations >5 seconds.

```
⠋ Running agent executor... (12s elapsed)
```

After 30 seconds, add estimate if available:

```
⠋ Running agent executor... (45s elapsed, ~15s remaining)
```

---

## Operation Categories

### Quick Operations (<2s)

**No indicator needed.** Instant feedback via completion message.

```bash
$ ada status
# (immediate output, no spinner)
```

### Short Operations (2-10s)

**Spinner only.** Shows activity without overwhelming.

```bash
$ ada memory search "dispatch"
⠋ Searching memory bank...
# Results appear
```

### Medium Operations (10-60s)

**Spinner + elapsed time.** User knows it's working and how long it's been.

```bash
$ ada run --cycle 1
⠋ Starting dispatch cycle... (15s elapsed)
```

### Long Operations (>60s)

**Progress bar or steps + time estimate.** Full visibility.

```bash
$ ada memory compress
Compressing memory bank...

  ✓ Archived current bank (v51)
  ✓ Analyzed 850 lines
  ⠋ Generating compressed version...
  ○ Writing new bank (v52)
  ○ Updating metadata

Step 3 of 5 (32s elapsed, ~20s remaining)
```

---

## Command-Specific Patterns

### `ada dispatch start`

```
⠋ Starting dispatch cycle...

  ✓ Validated role rotation
  ✓ Checked for active locks
  ✓ Loaded memory bank (v52)
  ✓ Loaded playbook (design.md)

🚀 Cycle 1072 Started

  Role:      🎨 The Architect (API & System Designer)
  Playbook:  agents/playbooks/design.md
  Memory:    agents/memory/bank.md (v52)
```

### `ada dispatch complete`

```
⠋ Completing dispatch cycle...

  ✓ Updated rotation state
  ✓ Committed changes
  ⠋ Pushing to origin/main...

✓ Cycle 1072 complete (2.3s)
```

If push fails with retry:

```
  ⚠ Push failed, retrying with rebase...
  ✓ Rebased successfully
  ✓ Pushed to origin/main

✓ Cycle 1072 complete (5.1s)
```

### `ada memory compress`

```
Compressing memory bank...
████████████████░░░░ 80% (16/20 sections)

  Processing: Architecture Decisions
  Compressed: 850 → 420 lines (51% reduction)

✓ Compression complete: bank.md v51 → v52
```

### `ada run` (Managed Execution)

This is the most complex case — running an actual agent cycle.

```
Running dispatch cycle #1072...

┌─ Phase: Context Loading ─────────────────────────────────────────┐
│ ✓ Loaded rotation state                                         │
│ ✓ Loaded memory bank (v52, 198 lines)                           │
│ ✓ Loaded playbook (design.md)                                   │
│ ⠋ Fetching GitHub issues... (2.1s)                              │
└──────────────────────────────────────────────────────────────────┘

Step 1 of 4: Context Loading (8s elapsed)
```

Progress through phases:

1. Context Loading
2. Agent Execution
3. Memory Update
4. Cycle Completion

### `ada init`

Interactive wizard with step progress:

```
Initializing ADA agent team...

  [1/4] Project Configuration
  ────────────────────────────
  ? Project name: my-startup
  ? Repository URL: https://github.com/user/repo

  [2/4] Role Selection
  ────────────────────────────
  ? Select roles to enable:
    ◉ CEO (business strategy)
    ◉ Engineering (code implementation)
    ◉ Product (feature specs)
    ○ Research (technical exploration)
    ○ Design (UX/API design)

  [3/4] Creating Files
  ────────────────────────────
  ✓ Created agents/roster.json
  ✓ Created agents/memory/bank.md
  ✓ Created agents/rules/RULES.md
  ⠋ Creating playbooks...

  [4/4] Final Setup
  ────────────────────────────
  ✓ Initialized git hooks
  ✓ Added .gitignore entries

✓ ADA initialized! Run `ada status` to see your team.
```

---

## Terminal Compatibility

### TTY Detection

```typescript
const isTTY = process.stdout.isTTY && !process.env.CI;

if (isTTY) {
  showSpinner('Loading...');
} else {
  console.log('Loading...');
}
```

### Non-TTY Output (CI/Pipes)

In CI environments or when piped, use simple text:

```
[INFO] Starting dispatch cycle...
[INFO] Validated rotation state
[INFO] Loaded memory bank (v52)
[INFO] Loaded playbook
[OK] Cycle 1072 started
```

### Width Detection

```typescript
const termWidth = process.stdout.columns || 80;
const barWidth = Math.min(20, Math.floor(termWidth * 0.25));
```

Progress bars should never exceed 25% of terminal width.

---

## Color Scheme

| Element        | Color    | Chalk Function |
| -------------- | -------- | -------------- |
| Spinner        | Cyan     | `chalk.cyan`   |
| Progress bar   | Green    | `chalk.green`  |
| Completed step | Green    | `chalk.green`  |
| Pending step   | Dim/Gray | `chalk.dim`    |
| Elapsed time   | Dim/Gray | `chalk.dim`    |
| Error          | Red      | `chalk.red`    |
| Warning        | Yellow   | `chalk.yellow` |

### `NO_COLOR` Support

When `NO_COLOR` environment variable is set or `--no-color` flag used:

- Remove all ANSI color codes
- Replace spinner with `...` or `[loading]`
- Replace check marks with `[OK]`
- Replace X marks with `[FAIL]`

---

## JSON Output Mode (`--json`)

When `--json` flag is used, suppress all progress UI and output structured events:

```json
{"event":"start","operation":"dispatch.start","timestamp":1708560000000}
{"event":"step","step":"validate_rotation","status":"complete"}
{"event":"step","step":"load_memory","status":"complete","details":{"version":52}}
{"event":"step","step":"load_playbook","status":"in_progress"}
{"event":"complete","operation":"dispatch.start","duration_ms":2340}
```

This enables programmatic consumption while maintaining machine-readability.

---

## Implementation Architecture

### Core Components

```typescript
// packages/core/src/ui/progress.ts

export interface ProgressOptions {
  text: string;
  type: 'spinner' | 'bar' | 'steps';
  total?: number; // For progress bars
  steps?: string[]; // For step indicators
  showElapsed?: boolean; // Show elapsed time
  showEta?: boolean; // Show time estimate
}

export class Progress {
  private startTime: number;
  private current: number = 0;

  constructor(private options: ProgressOptions) {
    this.startTime = Date.now();
  }

  update(current: number, text?: string): void;
  increment(text?: string): void;
  succeed(text?: string): void;
  fail(text?: string): void;
  stop(): void;
}

// Convenience factory functions
export function spinner(text: string): Progress;
export function progressBar(text: string, total: number): Progress;
export function steps(stepNames: string[]): Progress;
```

### Library Recommendation

Use **ora** for spinners (battle-tested, handles edge cases):

```typescript
import ora from 'ora';

const spinner = ora('Loading...').start();
spinner.succeed('Done!');
```

Use **cli-progress** for progress bars if needed, or implement custom for consistency.

---

## Implementation Checklist

### Phase 1: Foundation (Sprint 3)

- [ ] Add `ora` dependency to `@ada-ai/cli`
- [ ] Create `Progress` wrapper class for consistency
- [ ] Implement TTY/CI detection
- [ ] Add spinners to `ada dispatch start/complete`
- [ ] Add spinners to `ada memory` commands
- [ ] Support `NO_COLOR` environment variable

### Phase 2: Enhancement

- [ ] Implement step indicators for multi-phase operations
- [ ] Add elapsed time display (>5s operations)
- [ ] Implement progress bars for `ada memory compress`
- [ ] Add `--json` output mode with progress events
- [ ] Add time estimates for predictable operations

### Phase 3: Polish

- [ ] Implement terminal width detection and responsive bars
- [ ] Add `ada init` wizard with step progress
- [ ] Create comprehensive progress tests
- [ ] Document all progress patterns in CLI docs
- [ ] Add `--quiet` mode to suppress progress (only final result)

---

## Testing Considerations

### Unit Tests

```typescript
describe('Progress', () => {
  it('detects non-TTY environment', () => {
    // Mock process.stdout.isTTY = false
    const progress = spinner('test');
    expect(progress.isSilent).toBe(true);
  });

  it('respects NO_COLOR', () => {
    process.env.NO_COLOR = '1';
    const progress = spinner('test');
    expect(progress.hasColor).toBe(false);
  });

  it('calculates elapsed time correctly', () => {
    const progress = spinner('test');
    jest.advanceTimersByTime(5000);
    expect(progress.elapsed).toBe('5s');
  });
});
```

### Integration Tests

- Progress appears and clears correctly in TTY
- Non-TTY fallback produces clean logs
- JSON mode outputs valid JSON events
- Ctrl+C gracefully stops progress and restores cursor

### Visual Tests (Manual)

- Spinner animates smoothly (no flicker)
- Progress bar fills proportionally
- Long text truncates gracefully
- Colors are accessible (contrast ratio)

---

## Open Questions

1. **Nested progress:** Should we support nested progress (spinner inside step indicator)? Recommendation: Keep flat for simplicity.

2. **Sound feedback:** Play a sound on completion for very long operations? Recommendation: No — terminal focus often changes.

3. **Notification integration:** Send OS notification when long operation completes? Recommendation: Add as opt-in flag `--notify`.

---

## References

- [ora](https://github.com/sindresorhus/ora) — Elegant terminal spinners
- [cli-progress](https://github.com/npkgz/cli-progress) — Easy-to-use progress bars
- [Ink](https://github.com/vadimdemedes/ink) — React for CLIs (future consideration)
- [12 Factor CLI Apps](https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46) — Progress feedback best practices

---

_🎨 Design — The Architect | Cycle 1072_
