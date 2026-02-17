# 🎨 Progress Indicators UX Specification (C802)

> CLI UX design for long-running operations: spinners, progress bars, time estimation
> Related: #175 Progress Indicators for Long-Running Operations
> Author: 🎨 Design — The Architect | Cycle 802

---

## Overview

Long-running CLI operations need clear feedback to keep users informed and confident. This spec defines the UX patterns for progress indicators across all `ada` commands.

### Design Principles

1. **Informative** — Users should always know what's happening
2. **Non-blocking** — Progress shouldn't interfere with automation (--json mode)
3. **Graceful** — Handle terminal width, TTY detection, CI environments
4. **Consistent** — Same patterns across all commands

---

## Progress Indicator Types

### 1. Indeterminate Spinner

For operations where duration is unknown.

```
⠋ Loading roster...
⠙ Loading roster...
⠹ Loading roster...
⠸ Loading roster...
```

**Use when:**

- Network requests (GitHub API calls)
- LLM inference (unpredictable latency)
- Single-step operations with unknown duration

**Spinner Frames:** `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` (Braille pattern, 80ms per frame)

**Fallback (no TTY):** Static dots

```
Loading roster...
```

### 2. Determinate Progress Bar

For operations with known steps or percentage.

```
Compressing memory ████████████░░░░░░░░ 60% (6/10 sections)
```

**Components:**

- Label (what's happening)
- Bar visualization (filled █ / empty ░)
- Percentage
- Step counter (optional)

**Use when:**

- Multi-step operations (compression, migration)
- File processing (known file count)
- Batch operations (test runs with known test count)

**Width:** Adaptive to terminal width, minimum 20 chars for bar

### 3. Step Progress

For sequential multi-phase operations.

```
✓ Loading configuration
✓ Validating roster
● Running dispatch cycle...
○ Updating memory
○ Committing changes
```

**Symbols:**

- `✓` — Completed (green)
- `●` — In progress (cyan, animated)
- `○` — Pending (dim)
- `✗` — Failed (red)

**Use when:**

- `ada dispatch start/complete`
- `ada init` wizard steps
- `ada validate` checks

### 4. Time Estimation

For operations where history enables prediction.

```
Compressing memory ████████████░░░░░░░░ 60% • ~8s remaining
```

**Estimation Algorithm:**

```typescript
// Calculate based on elapsed time and progress
const elapsedMs = Date.now() - startTime;
const progressFraction = currentStep / totalSteps;
const estimatedTotalMs = elapsedMs / progressFraction;
const remainingMs = estimatedTotalMs - elapsedMs;
```

**Display Rules:**

- Show only after 2+ seconds elapsed AND 10%+ progress
- Round to nearest second for < 60s
- Round to nearest minute for >= 60s
- Hide if estimate would be < 1s

---

## Command-Specific Patterns

### `ada dispatch start`

```
🚀 Starting Cycle 802

  ✓ Acquiring dispatch lock
  ✓ Loading rotation state
  ✓ Validating role assignment
  ✓ Preparing context

  Role:      🎨 The Architect (API & System Designer)
  Playbook:  agents/playbooks/design.md
  Memory:    agents/memory/bank.md (v41)

Complete with: ada dispatch complete --action "..."
```

### `ada dispatch complete`

```
📝 Completing Cycle 802

  ✓ Updating rotation state
  ● Committing changes...
  ○ Pushing to origin

[████████████░░░░░░░░] Pushing... (objects: 3/5)

✅ Cycle 802 complete — pushed to origin/main
```

### `ada memory compress`

```
🗜️  Compressing Memory Bank

  Current:  v41 (312 lines)
  Target:   v42 (<200 lines)

  ✓ Archiving current bank
  ● Compressing sections...
    [████████████░░░░░░░░] 60% (6/10 sections) • ~4s remaining

  ✓ Compression complete: 312 → 178 lines (43% reduction)
```

### `ada validate`

```
🔍 Validating ADA Configuration

  ✓ SC-1: Git repository detected
  ✓ SC-2: agents/ directory exists
  ✓ SC-3: DISPATCH.md protocol found
  ● SC-4: Validating roster...
  ○ SC-5: Checking rotation state
  ○ SC-6: Verifying memory bank

  [████████░░░░░░░░░░░░] 40% (4/10 checks)
```

### `ada run` (LLM Execution)

```
🤖 Running dispatch cycle...

  ⠹ Generating prompt... (context: 12.4k tokens)
  ⠹ Awaiting LLM response...
    Model: claude-sonnet-4-20250514
    Elapsed: 12s

[Streaming response will appear here]
```

**Note:** LLM operations show elapsed time (not estimation) because inference is unpredictable.

---

## Output Modes

### Standard Mode (TTY)

Full interactive experience with colors, animations, real-time updates.

```typescript
// Detection
const isTTY = process.stdout.isTTY;
const hasColors = supportsColor.stdout !== false;
```

### Non-TTY Mode (CI/Pipes)

Static output, no animations, line-by-line progress.

```
[INFO] Loading roster...
[INFO] Validating roster... done
[INFO] Running dispatch cycle...
[INFO] Progress: 50% (5/10 steps)
[INFO] Dispatch complete
```

### JSON Mode (`--json`)

Machine-readable progress events.

```json
{"event":"progress","phase":"compress","step":6,"total":10,"percent":60}
{"event":"complete","phase":"compress","result":"success","lines":{"before":312,"after":178}}
```

### Quiet Mode (`--quiet`)

Minimal output — errors only.

```
# No output on success
# Only errors printed to stderr
```

### Verbose Mode (`--verbose`)

Debug-level detail.

```
[DEBUG] Loading roster from agents/roster.json
[DEBUG] Roster loaded: 10 roles, rotation order: ceo → growth → ...
[DEBUG] Loading rotation state from agents/state/rotation.json
[DEBUG] Current index: 9, last role: ops, cycle: 801
...
```

---

## Implementation API

### TypeScript Interface

```typescript
interface ProgressConfig {
  /** Label shown next to progress indicator */
  label: string;

  /** Total steps (enables determinate bar) */
  total?: number;

  /** Show time estimation (requires total) */
  showEstimate?: boolean;

  /** Override spinner frames */
  spinnerFrames?: string[];

  /** Progress bar width (auto-sizes to terminal by default) */
  barWidth?: number;
}

interface Progress {
  /** Update progress (0-100 or step count if total set) */
  update(value: number, label?: string): void;

  /** Mark as complete */
  succeed(message?: string): void;

  /** Mark as failed */
  fail(message?: string): void;

  /** Stop without success/fail (user interrupt) */
  stop(): void;
}

// Usage
const progress = createProgress({
  label: 'Compressing memory',
  total: 10,
  showEstimate: true,
});

for (const section of sections) {
  await compress(section);
  progress.update(++current, `Processing ${section.name}`);
}

progress.succeed('Compression complete');
```

### Step Progress API

```typescript
interface StepConfig {
  steps: string[];
  currentStep?: number;
}

const stepper = createStepper({
  steps: [
    'Loading configuration',
    'Validating roster',
    'Running dispatch cycle',
    'Updating memory',
    'Committing changes',
  ],
});

stepper.advance(); // Mark current complete, move to next
stepper.fail('Validation failed'); // Mark current as failed
stepper.complete(); // Mark all remaining as complete
```

---

## Accessibility

### Screen Reader Compatibility

- Use `aria-live="polite"` equivalent (periodic status updates)
- Announce step completions, not every frame
- Final success/failure clearly announced

### Color Blindness

- Don't rely solely on color — use symbols (✓, ✗, ●, ○)
- Test with `NO_COLOR=1` environment variable

### Reduced Motion

- Respect `TERM=dumb` or `NO_MOTION=1`
- Fall back to static indicators

---

## Dependencies

Recommended: **ora** (spinners) + custom progress bar implementation

```typescript
// Spinner with ora
import ora from 'ora';
const spinner = ora('Loading...').start();
spinner.succeed('Done');

// Progress bar (custom, no dep)
function renderBar(percent: number, width: number): string {
  const filled = Math.round((width * percent) / 100);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}
```

**Why custom progress bar?**

- Keeps dependencies minimal
- Full control over format and behavior
- Easy to test

---

## Testing

### Unit Tests

```typescript
describe('progress indicators', () => {
  it('renders spinner frames in sequence', () => { ... });
  it('calculates time estimate correctly', () => { ... });
  it('adapts bar width to terminal', () => { ... });
  it('falls back gracefully without TTY', () => { ... });
  it('outputs JSON in --json mode', () => { ... });
});
```

### Visual Tests

- TTY mode in various terminal sizes
- Non-TTY mode (pipe to file)
- CI environment (GitHub Actions)
- Windows Terminal compatibility

---

## Acceptance Criteria (from #175)

| Criteria                               | Status       | Spec Reference                |
| -------------------------------------- | ------------ | ----------------------------- |
| Spinner for long-running operations    | ✅ Specified | §1 Indeterminate Spinner      |
| Progress bars for multi-step processes | ✅ Specified | §2 Determinate Progress Bar   |
| Estimated time remaining               | ✅ Specified | §4 Time Estimation            |
| Non-intrusive (works with --json)      | ✅ Specified | §Output Modes                 |
| Configurable verbosity                 | ✅ Specified | §Output Modes (quiet/verbose) |

---

## Implementation Priority

**Phase 1 (Sprint 3):**

- Indeterminate spinners for network/LLM operations
- Step progress for `ada dispatch start/complete`
- TTY detection and non-TTY fallback

**Phase 2:**

- Determinate progress bars for compression, batch ops
- Time estimation
- JSON output mode

**Phase 3:**

- Verbose mode with debug output
- Color/motion accessibility options

---

## Related

- #175 — Parent issue
- #183 — Interactive Onboarding (uses step progress)
- #185 — Error Messages (error states in progress)
- `docs/design/error-pattern-library-c782.md` — Error handling patterns

---

_🎨 The Architect — Cycle 802_
