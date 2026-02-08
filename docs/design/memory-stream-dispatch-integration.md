# Design: MemoryStream Dispatch Integration (Phase 2)

> API specification for integrating MemoryStream with the dispatch protocol.
> **Status:** PROPOSED | **Author:** 🎨 Design | **Cycle:** 205

## Summary

This document specifies how `MemoryStream` (Phase 1) integrates with the dispatch protocol to automatically log agent actions. Phase 2 makes memory logging seamless—agents don't manually call `memoryLog()`, the dispatch system handles it.

## Goals

1. **Zero-friction logging** — Every dispatch cycle automatically logs to MemoryStream
2. **Rich context capture** — Action, role, importance, issue/PR refs extracted automatically
3. **Backward compatible** — Existing `completeDispatch()` signature preserved
4. **Optional enhancement** — Works without MemoryStream if not configured

## Non-Goals

- Vector embeddings (Phase 3)
- Reflection generation (Phase 4)
- Compression integration (separate concern)

---

## API Design

### Option A: Enhanced `completeDispatch()` (RECOMMENDED)

Extend the existing function with an optional `MemoryStreamConfig`:

```typescript
/**
 * Phase 2 completion options
 */
export interface CompleteDispatchOptions {
  /** Action description (required) */
  action: string;

  /** Optional: Importance score (1-10). Auto-calculated if omitted. */
  importance?: number;

  /** Optional: Entry type. Defaults to 'action'. */
  type?: StreamEntryType;

  /** Optional: Semantic tags for filtering */
  tags?: string[];

  /** Optional: Issue references (auto-extracted from action if omitted) */
  issueRefs?: number[];

  /** Optional: PR references (auto-extracted from action if omitted) */
  prRefs?: number[];

  /** Optional: Additional content beyond action description */
  content?: string;

  /** Optional: Skip memory logging (for special cases) */
  skipMemoryLog?: boolean;
}

/**
 * Phase 7: Complete dispatch with automatic memory logging.
 *
 * @param context - Dispatch context (now includes memoryStream if configured)
 * @param options - Completion options (action + optional memory metadata)
 * @returns Dispatch result
 */
export async function completeDispatch(
  context: EnhancedDispatchContext,
  options: CompleteDispatchOptions | string
): Promise<DispatchResult>;
```

**Backward Compatibility:** If `options` is a `string`, treat it as `{ action: options }` with defaults.

### Context Enhancement

```typescript
/**
 * Enhanced dispatch context with optional MemoryStream
 */
export interface EnhancedDispatchContext extends DispatchContext {
  /** MemoryStream instance (if configured) */
  readonly memoryStream?: MemoryStream;

  /** Path to stream.jsonl */
  readonly streamPath?: string;
}
```

### `loadContext()` Enhancement

```typescript
export interface LoadContextOptions {
  /** Enable MemoryStream integration */
  enableMemoryStream?: boolean;

  /** Custom stream path (default: agents/memory/stream.jsonl) */
  streamPath?: string;
}

export async function loadContext(
  rootDir: string,
  config?: Partial<AdaConfig>,
  options?: LoadContextOptions
): Promise<EnhancedDispatchContext | null>;
```

---

## Auto-Extraction Logic

### Issue Reference Extraction

```typescript
/**
 * Extract issue numbers from text.
 * Matches: #123, Issue #123, issue-123, fixes #123
 */
function extractIssueRefs(text: string): number[] {
  const pattern =
    /(?:issue[s]?\s*)?#(\d+)|(?:fix(?:es)?|close[sd]?|resolve[sd]?)\s*#(\d+)/gi;
  const matches = [...text.matchAll(pattern)];
  return [...new Set(matches.map(m => parseInt(m[1] || m[2], 10)))];
}
```

### PR Reference Extraction

```typescript
/**
 * Extract PR numbers from text.
 * Matches: PR #123, pull #123, merged PR #123
 */
function extractPRRefs(text: string): number[] {
  const pattern = /(?:PR|pull(?:\s*request)?)\s*#(\d+)/gi;
  const matches = [...text.matchAll(pattern)];
  return [...new Set(matches.map(m => parseInt(m[1], 10)))];
}
```

### Importance Auto-Calculation

When `importance` is omitted, derive from context:

| Signal                             | Importance Boost |
| ---------------------------------- | ---------------- |
| Contains "CRITICAL" or "BLOCKER"   | +3               |
| Contains "fix", "resolve", "close" | +2               |
| Contains "merge", "ship", "launch" | +2               |
| Contains "review", "approve"       | +1               |
| Contains "docs", "comment"         | 0                |
| Entry type = 'decision'            | +2               |
| Entry type = 'reflection'          | +1               |

Base importance: 5. Clamp to [1, 10].

```typescript
function calculateDefaultImportance(
  action: string,
  content: string,
  type: StreamEntryType
): number {
  let importance = 5;
  const text = `${action} ${content}`.toLowerCase();

  if (/critical|blocker|breaking/i.test(text)) importance += 3;
  if (/fix|resolve|close/i.test(text)) importance += 2;
  if (/merge|ship|launch|release/i.test(text)) importance += 2;
  if (/review|approve|lgtm/i.test(text)) importance += 1;

  if (type === 'decision') importance += 2;
  if (type === 'reflection') importance += 1;

  return Math.max(1, Math.min(10, importance));
}
```

---

## Implementation Plan

### Step 1: Extend `DispatchContext`

```diff
 export interface DispatchContext {
   readonly state: RotationState;
   readonly roster: Roster;
   readonly role: Role;
   readonly memoryBank: string;
   readonly paths: { ... };
+  readonly memoryStream?: MemoryStream;
 }
```

### Step 2: Update `loadContext()`

```typescript
export async function loadContext(
  rootDir: string,
  config: Partial<AdaConfig> = {},
  options: LoadContextOptions = {}
): Promise<EnhancedDispatchContext | null> {
  // ... existing logic ...

  let memoryStream: MemoryStream | undefined;
  if (options.enableMemoryStream !== false) {
    const streamPath =
      options.streamPath ?? path.join(agents, 'memory', 'stream.jsonl');
    memoryStream = createMemoryStream(streamPath);
  }

  return {
    state,
    roster,
    role,
    memoryBank,
    paths,
    memoryStream,
  };
}
```

### Step 3: Update `completeDispatch()`

```typescript
export async function completeDispatch(
  context: EnhancedDispatchContext,
  options: CompleteDispatchOptions | string
): Promise<DispatchResult> {
  // Normalize options
  const opts: CompleteDispatchOptions =
    typeof options === 'string' ? { action: options } : options;

  // Log to MemoryStream if configured
  if (context.memoryStream && !opts.skipMemoryLog) {
    const content = opts.content ?? opts.action;
    const issueRefs = opts.issueRefs ?? extractIssueRefs(opts.action);
    const prRefs = opts.prRefs ?? extractPRRefs(opts.action);
    const type = opts.type ?? 'action';
    const importance =
      opts.importance ?? calculateDefaultImportance(opts.action, content, type);

    context.memoryStream.memoryLog({
      cycle: context.state.cycle_count + 1,
      role: context.role.id,
      action: opts.action,
      content,
      importance,
      type,
      tags: opts.tags ?? [],
      issueRefs,
      prRefs,
    });
  }

  // Existing rotation logic
  const newState = advanceRotation(context.state, context.roster, opts.action);
  await writeRotationState(context.paths.state, newState);

  return {
    success: true,
    role: context.role.id,
    roleName: context.role.name,
    cycle: newState.cycle_count,
    action: opts.action,
    timestamp: newState.last_run || new Date().toISOString(),
    modifiedFiles: [context.paths.state, context.paths.memoryBank],
  };
}
```

---

## Usage Examples

### Basic Usage (Backward Compatible)

```typescript
// String form — works exactly as before
await completeDispatch(context, 'Fixed flaky test in CI');

// Auto-extracts: issueRefs=[], importance=7 (contains "fix")
```

### Rich Metadata

```typescript
await completeDispatch(context, {
  action: 'Merged PR #103 — Fixes flaky latency test',
  importance: 8,
  type: 'action',
  tags: ['ci', 'testing', 'stability'],
  content: 'Squash merged after QA approval. All 779 tests pass.',
  // issueRefs auto-extracted: [103] — wait, that's PR ref
  // Actually: prRefs=[103], auto-detected from "PR #103"
});
```

### Decisions & Reflections

```typescript
// Log an architecture decision
await completeDispatch(context, {
  action: 'ADR-005: Chose JSONL over SQLite for stream storage',
  type: 'decision',
  importance: 9,
  tags: ['adr', 'architecture', 'memory'],
  content: 'JSONL provides git-friendliness and append-only semantics...',
  issueRefs: [95],
});

// Log a reflection
await completeDispatch(context, {
  action: 'Reflection: Demo prep revealed gaps in observability docs',
  type: 'reflection',
  importance: 6,
  tags: ['demo', 'docs', 'observability'],
});
```

### Skip Logging (Special Cases)

```typescript
// For dry-run or testing
await completeDispatch(context, {
  action: 'Test action',
  skipMemoryLog: true,
});
```

---

## Testing Strategy

1. **Unit tests** for extraction functions (`extractIssueRefs`, `extractPRRefs`, `calculateDefaultImportance`)
2. **Integration test** for `completeDispatch` → MemoryStream logging
3. **Backward compatibility test** — string-form still works
4. **Edge cases** — no MemoryStream configured, skipMemoryLog flag

---

## Open Questions

1. **Should importance auto-calculation use the observability metrics?**
   - E.g., high-latency cycles might indicate complex/important work
   - Recommendation: Not in Phase 2, consider for Phase 3

2. **Should we log intermediate observations during dispatch?**
   - E.g., "Loaded 44 open issues" as an `observation` entry
   - Recommendation: Phase 2 focuses on action logging; observations in Phase 3

3. **Tag taxonomy?**
   - Should we standardize tag names? E.g., always use `ci` not `CI` or `continuous-integration`
   - Recommendation: Free-form for now, consider normalization in Phase 4

---

## References

- [Issue #95: Cognitive Memory Architecture](https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/95)
- [Phase 1 Implementation: memory-stream.ts](../packages/core/src/memory-stream.ts)
- [Engineering Review (Cycle 203)](https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/95#issuecomment-...)
- [Generative Agents Paper](https://arxiv.org/abs/2304.03442)

---

_🎨 Design (The Architect) — Cycle 205_
