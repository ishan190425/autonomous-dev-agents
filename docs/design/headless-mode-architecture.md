# 🌌 Headless Mode Architecture

> Design spec for file-only dispatch mode, enabling SWE-bench evaluation and CI/CD integration.
> **Owner:** Frontier (🌌 The Frontier) | **Cycle:** 149 | **Date:** 2026-02-07
> **Status:** Spec Complete | **Target Sprint:** 2 | **Related:** SWE-bench Evaluation Plan (Cycle 148)

---

## Executive Summary

Headless mode decouples ADA dispatch from GitHub, enabling:

1. **SWE-bench evaluation** — Run ADA on benchmark issues without creating real issues/PRs
2. **CI/CD integration** — Execute dispatch in ephemeral environments
3. **Local development** — Test dispatch without polluting the repo
4. **Offline operation** — Work without network connectivity

This spec defines the architecture, CLI interface, and integration points for headless mode.

---

## Motivation

### SWE-bench Requirements (from Research Cycle 148)

The SWE-bench evaluation flow requires:

```
┌─────────────────────────────────────────────────────────┐
│                    SWE-bench Harness                     │
├─────────────────────────────────────────────────────────┤
│  1. Load issue from benchmark                            │
│  2. Checkout repository at specified commit              │
│  3. Inject ADA configuration (agents/, templates/)       │
│  4. Run: ada run --headless --max-cycles=10              │
│  5. Extract generated patch                              │
│  6. Apply patch to fresh checkout                        │
│  7. Run test suite                                       │
│  8. Record pass/fail + metrics                           │
└─────────────────────────────────────────────────────────┘
```

ADA currently requires GitHub for:

- Issue listing (`gh issue list`)
- PR creation (`gh pr create`)
- Issue creation (`gh issue create`)
- Status checks

Headless mode eliminates these dependencies.

### Other Use Cases

| Use Case      | Benefit                                              |
| ------------- | ---------------------------------------------------- |
| Unit testing  | Test dispatch logic without mocking GitHub           |
| CI validation | Run dispatch in GitHub Actions without API conflicts |
| Demo mode     | Show ADA working without creating real artifacts     |
| Development   | Iterate on playbooks without polluting repos         |

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         ada run                                  │
├───────────────────────────┬─────────────────────────────────────┤
│     Normal Mode           │          Headless Mode               │
│     (default)             │          (--headless)                │
├───────────────────────────┼─────────────────────────────────────┤
│                           │                                      │
│  ┌─────────────────────┐  │  ┌─────────────────────────────────┐ │
│  │   GitHubBackend     │  │  │       FileBackend               │ │
│  │                     │  │  │                                 │ │
│  │  - gh issue list    │  │  │  - Read input/issues/*.md       │ │
│  │  - gh pr create     │  │  │  - Write output/patches/*.diff  │ │
│  │  - gh issue create  │  │  │  - Write output/issues/*.md     │ │
│  │  - Real commits     │  │  │  - Write output/commits/        │ │
│  └─────────────────────┘  │  └─────────────────────────────────┘ │
│                           │                                      │
└───────────────────────────┴─────────────────────────────────────┘
                            ▲
                            │
                   ┌────────┴────────┐
                   │  BackendInterface │
                   │                  │
                   │  listIssues()    │
                   │  createIssue()   │
                   │  createPR()      │
                   │  getRepoState()  │
                   └──────────────────┘
```

### Backend Interface

The core abstraction that decouples dispatch from GitHub:

```typescript
/**
 * Backend interface for dispatch operations.
 * Implemented by GitHubBackend (normal) and FileBackend (headless).
 */
interface DispatchBackend {
  /** Backend identifier */
  readonly name: 'github' | 'file';

  /** List open issues for situational awareness */
  listIssues(options?: ListIssuesOptions): Promise<Issue[]>;

  /** List open PRs for situational awareness */
  listPRs(options?: ListPRsOptions): Promise<PullRequest[]>;

  /** Create an issue (or write to file in headless) */
  createIssue(issue: CreateIssueInput): Promise<IssueResult>;

  /** Create a PR (or write patch file in headless) */
  createPR(pr: CreatePRInput): Promise<PRResult>;

  /** Comment on an issue/PR */
  addComment(target: CommentTarget, body: string): Promise<void>;

  /** Get current repo state (branch, commit, dirty status) */
  getRepoState(): Promise<RepoState>;

  /** Apply code changes (real git commit or output to file) */
  applyChanges(changes: CodeChange[]): Promise<ApplyResult>;
}
```

### FileBackend Implementation

```typescript
/**
 * File-based backend for headless mode.
 * Reads issues from input/, writes artifacts to output/.
 */
class FileBackend implements DispatchBackend {
  readonly name = 'file';

  constructor(
    private readonly inputDir: string, // e.g., agents/input/
    private readonly outputDir: string // e.g., agents/output/
  ) {}

  async listIssues(): Promise<Issue[]> {
    // Read all *.md files from input/issues/
    // Parse frontmatter for issue metadata
    // Return as Issue[] array
  }

  async createIssue(input: CreateIssueInput): Promise<IssueResult> {
    // Write to output/issues/<timestamp>-<slug>.md
    // Return synthetic issue number
  }

  async createPR(input: CreatePRInput): Promise<PRResult> {
    // Generate diff from staged changes
    // Write to output/patches/<timestamp>-<slug>.diff
    // Write PR metadata to output/prs/<timestamp>-<slug>.json
    // Return synthetic PR number
  }

  async applyChanges(changes: CodeChange[]): Promise<ApplyResult> {
    // Write each change to the actual filesystem (for SWE-bench)
    // Generate combined diff to output/patches/
    // Do NOT commit (leave for harness to extract)
  }
}
```

---

## Directory Structure

### Input (Injected Issues)

```
agents/
├── input/
│   ├── issues/
│   │   └── current.md          # The issue to solve (SWE-bench injects here)
│   └── context/
│       ├── repo-state.json     # Mock repo state if needed
│       └── existing-prs.json   # Mock existing PRs if needed
```

### Output (Generated Artifacts)

```
agents/
├── output/
│   ├── patches/
│   │   └── cycle-001.diff      # Generated patch per cycle
│   ├── issues/
│   │   └── cycle-001-*.md      # Issues created (if any)
│   ├── prs/
│   │   └── cycle-001.json      # PR metadata (title, body, files)
│   ├── commits/
│   │   └── cycle-001.json      # Commit message and changed files
│   └── final.diff              # Combined final patch (all cycles)
```

### Issue Injection Format

For SWE-bench, the harness writes `input/issues/current.md`:

````markdown
---
id: 1
title: 'Fix pandas DataFrame.merge on empty DataFrames'
repo: 'pandas-dev/pandas'
commit: 'a1b2c3d4'
labels: ['bug']
priority: P1
---

## Description

When merging two empty DataFrames, the result should be an empty DataFrame
with the correct column structure. Currently, it raises a KeyError.

## Steps to Reproduce

```python
import pandas as pd
df1 = pd.DataFrame(columns=['a', 'b'])
df2 = pd.DataFrame(columns=['b', 'c'])
result = df1.merge(df2, on='b')  # Raises KeyError
```
````

## Expected Behavior

Should return an empty DataFrame with columns ['a', 'b', 'c'].

````

---

## CLI Interface

### New Flags

```bash
# Run in headless mode (file-based, no GitHub)
ada run --headless

# Limit cycles (prevents runaway in benchmarks)
ada run --headless --max-cycles=10

# Specify custom input/output directories
ada run --headless --input=./input --output=./output

# Quiet mode (minimal output, for harness parsing)
ada run --headless --quiet

# Export metrics to JSON after run
ada run --headless --export-metrics=./metrics.json
````

### Exit Codes

| Code | Meaning                                    |
| ---- | ------------------------------------------ |
| 0    | Success — issue resolved (patch generated) |
| 1    | Failure — could not resolve issue          |
| 2    | Max cycles reached without resolution      |
| 3    | Configuration error                        |
| 4    | Input error (no issue found)               |

### Metrics Export

With `--export-metrics`, writes JSON after run:

```json
{
  "cyclesRun": 5,
  "success": true,
  "totalDurationMs": 142000,
  "tokenUsage": {
    "input": 45000,
    "output": 12000
  },
  "cost": 0.52,
  "patchGenerated": true,
  "patchPath": "agents/output/final.diff",
  "rolesUsed": ["research", "engineering", "qa"],
  "phases": {
    "context_load": 5200,
    "situational_awareness": 28000,
    "action_execution": 98000
  }
}
```

---

## Integration with @ada/core

### Changes Required

1. **New module: `backend.ts`**
   - `DispatchBackend` interface
   - `GitHubBackend` implementation (existing logic refactored)
   - `FileBackend` implementation (new)

2. **Modify `dispatch.ts`**
   - Accept `backend` in `DispatchContext`
   - Use backend methods instead of direct `gh` calls

3. **Modify `agent.ts`**
   - `executeAgentAction` uses backend for GitHub operations
   - Patch generation integrated with backend

4. **New module: `patch.ts`**
   - Unified diff generation
   - Patch aggregation across cycles

### Backwards Compatibility

- Default behavior unchanged (GitHub backend)
- Existing tests continue to pass
- No breaking changes to public API

---

## SWE-bench Adapter

The adapter is a thin wrapper that:

1. Sets up the evaluation environment
2. Injects the issue into `input/issues/current.md`
3. Runs `ada run --headless --max-cycles=N --export-metrics=./metrics.json`
4. Extracts `output/final.diff`
5. Reports results to harness

### Adapter Script

```bash
#!/bin/bash
# ada-swebench-adapter.sh

ISSUE_FILE="$1"          # Path to SWE-bench issue JSON
REPO_DIR="$2"            # Path to checked-out repository
MAX_CYCLES="${3:-10}"    # Max cycles (default 10)

# 1. Inject ADA config into repo
cp -r ~/.ada/templates/agents "$REPO_DIR/"

# 2. Convert SWE-bench issue to ADA format
python3 convert_issue.py "$ISSUE_FILE" > "$REPO_DIR/agents/input/issues/current.md"

# 3. Run ADA
cd "$REPO_DIR"
ada run --headless --max-cycles="$MAX_CYCLES" --export-metrics=./metrics.json

# 4. Extract patch
if [ -f "agents/output/final.diff" ]; then
    cp agents/output/final.diff ./patch.diff
    echo "PATCH_GENERATED"
    exit 0
else
    echo "NO_PATCH"
    exit 1
fi
```

---

## Implementation Plan

### Phase 1: Backend Interface (Sprint 2, Week 1)

**Estimated effort:** 2-3 cycles

- [ ] Define `DispatchBackend` interface in `@ada/core`
- [ ] Refactor existing GitHub logic into `GitHubBackend`
- [ ] Implement `FileBackend` (basic read/write)
- [ ] Add backend injection to `DispatchContext`
- [ ] Unit tests for both backends

### Phase 2: CLI Integration (Sprint 2, Week 1)

**Estimated effort:** 1-2 cycles

- [ ] Add `--headless` flag to `ada run`
- [ ] Add `--max-cycles` flag
- [ ] Add `--export-metrics` flag
- [ ] Add exit codes for harness integration
- [ ] Integration tests

### Phase 3: Patch Generation (Sprint 2, Week 1)

**Estimated effort:** 1-2 cycles

- [ ] Implement unified diff generation
- [ ] Aggregate patches across multiple cycles
- [ ] Handle file creation/deletion in patches
- [ ] Output to `agents/output/final.diff`

### Phase 4: SWE-bench Adapter (Sprint 2, Week 2)

**Estimated effort:** 1 cycle

- [ ] Issue format converter (SWE-bench JSON → ADA markdown)
- [ ] Adapter shell script
- [ ] Integration with SWE-bench harness
- [ ] Smoke test on 10 sample issues

---

## Testing Strategy

### Unit Tests

- `FileBackend.listIssues()` parses markdown correctly
- `FileBackend.createPR()` generates valid unified diffs
- Exit codes match expected conditions
- Metrics export matches schema

### Integration Tests

- Full dispatch cycle in headless mode
- Multi-cycle run with `--max-cycles`
- Patch aggregation across cycles
- Role rotation in headless mode

### E2E Tests (with SWE-bench)

- Run adapter on 5 known-passing issues
- Verify patch applies cleanly
- Verify test suites pass after patch

---

## Security Considerations

### File Path Safety

- Validate all input paths (no path traversal)
- Output directory must exist and be writable
- Never overwrite files outside agents/ directory

### Isolation

- Headless mode CANNOT make GitHub API calls
- Network access denied in headless mode (future: `--offline` flag)
- No credential access in file backend

---

## Open Questions

1. **Issue discovery in headless:** Should `listIssues()` return just the current issue, or should we support multiple issues in `input/issues/`?

2. **PR workflow in headless:** Do we simulate PR reviews? Or just generate the patch and skip review cycles?

3. **Commit history:** Should headless mode track synthetic commits for multi-cycle runs?

4. **Resolution detection:** How does ADA know when the issue is "resolved" and can stop? Explicit role decision? Test run?

---

## Success Criteria

| Metric                               | Target |
| ------------------------------------ | ------ |
| Dispatch cycle works without network | ✅     |
| Patch generated from code changes    | ✅     |
| Metrics exported to JSON             | ✅     |
| SWE-bench adapter runs successfully  | ✅     |
| Zero GitHub API calls in headless    | ✅     |

---

## Related Documents

- [SWE-bench Evaluation Plan](../research/swe-bench-evaluation-plan.md) — Research Cycle 148
- [Latency Timer CLI UX Spec](./latency-timer-cli-ux-spec.md) — Design Cycle 145
- [Agent Observability Issue #69](https://github.com/...)

---

_🌌 Frontier (The Frontier) | Cycle 149_
_"Decoupled architecture for benchmark-ready agents."_
