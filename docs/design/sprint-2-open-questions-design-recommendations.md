# 🎨 Sprint 2 Open Questions — Design Recommendations

> Design perspective on the 9 open questions from the Sprint 2 Platform Implementation Roadmap (C329).
> Addresses UX implications to help Engineering make implementation decisions.

**Created:** Cycle 335 (2026-02-10)
**Author:** 🎨 Design
**References:** `docs/design/sprint-2-platform-implementation-roadmap.md`, Issue #125, #118, #90

---

## Summary

| Question              | Domain     | Design Recommendation               | Rationale                                   |
| --------------------- | ---------- | ----------------------------------- | ------------------------------------------- |
| Signal batching       | Terminal   | Per-cycle (batched)                 | Reduced noise in observability output       |
| Shell type detection  | Terminal   | Auto-detect with `--shell` override | Best UX with escape hatch                   |
| Output streaming      | Terminal   | Real-time with buffering            | Responsive feedback is critical             |
| Storage backend       | Heat       | JSON files                          | Consistency with existing ADA patterns      |
| Decay curve           | Heat       | Exponential                         | Matches human memory models                 |
| Cold memory threshold | Heat       | Configurable default                | User control is important                   |
| Parallelization       | Benchmarks | Sequential with flag                | Predictable output order                    |
| Cost limits           | Benchmarks | Soft limits with warnings           | Don't surprise users                        |
| Failure tolerance     | Benchmarks | Configurable threshold              | Different use cases need different behavior |

---

## Terminal Mode Questions

### 1. Signal Batching: Per-command or per-cycle?

**Recommendation:** Per-cycle (batched)

**UX Rationale:**

- Per-command signals create excessive observability noise — users see heat updates after every `ls`, `cat`, `grep`
- Per-cycle batching provides cleaner "end of cycle" summary: "Heat signals: 47 accesses, 12 successes, 3 failures"
- Matches mental model: users think in "what did this cycle do" not "what did each command do"

**Implementation Guidance:**

- Collect signals during cycle in memory
- Flush to storage at `dispatch complete`
- Include command-level detail in batch payload for debugging

**Output Example:**

```
┌────────────────────────────────────────────────────────────┐
│  Cycle 335 Complete                                         │
│                                                             │
│  Commands: 12 executed, 11 succeeded, 1 failed              │
│  Heat signals: +47 accesses, +12 success, -3 failure        │
│  Memory updates: 3 entities, highest: bank.md (+15)         │
└────────────────────────────────────────────────────────────┘
```

---

### 2. Shell Type Detection: Auto-detect or explicit flag?

**Recommendation:** Auto-detect with `--shell` override

**UX Rationale:**

- Most users don't care about shell type — they want commands to work
- Auto-detection removes friction: `ada dispatch --mode=terminal` just works
- Power users and edge cases can use `--shell=zsh` when auto-detection fails
- Follows principle of "sensible defaults, escape hatches for power users"

**Detection Algorithm (for spec clarity):**

```
1. Check $SHELL environment variable
2. Fall back to /bin/bash if $SHELL unset
3. Warn if detected shell unavailable
4. --shell flag overrides all detection
```

**CLI Interface:**

```bash
# Default (auto-detect)
ada dispatch --mode=terminal

# Explicit override
ada dispatch --mode=terminal --shell=zsh

# Debug what was detected
ada dispatch status --verbose
#   Shell: /bin/zsh (auto-detected from $SHELL)
```

**Edge Case Handling:**

- If `$SHELL` points to fish/nushell/other exotic shell, warn and fall back to bash
- Document supported shells: bash, zsh, sh (POSIX-compliant)

---

### 3. Output Streaming: Real-time or buffered?

**Recommendation:** Real-time with smart buffering

**UX Rationale:**

- **Real-time is essential** for responsive feedback — users need to know something is happening
- Long-running commands (builds, tests) are frustrating with buffered output — user sees nothing for 30 seconds
- However, _pure_ real-time creates visual noise for rapid commands

**Design:**

- Stream stdout/stderr in real-time with line buffering
- Use a "quiet period" threshold (500ms no output) before updating spinner
- Truncate extremely long outputs (>50 lines) with "[... N more lines ...]"
- Final result shows complete output (up to 10KB limit)

**Output Example (real-time):**

```
⠋ Running: npm test
  ✓ Test suite: 45 passed, 0 failed
  ✓ Test suite: 12 passed, 0 failed
  [... 23 more suites ...]
✓ npm test completed (12.4s, exit 0)
```

**JSON Mode Exception:**

- When `--json` flag is set, buffer all output
- JSON consumers expect atomic responses, not streams
- Final JSON includes full stdout/stderr

---

## Heat Scoring Questions

### 4. Storage Backend: JSON files or SQLite?

**Recommendation:** JSON files

**UX Rationale:**

- **Consistency:** ADA uses JSON everywhere — `roster.json`, `rotation.json`, memory bank (markdown with JSON frontmatter)
- **Transparency:** Users can inspect heat data with `cat` — no need to install SQLite tools
- **Portability:** JSON files work across all platforms without additional dependencies
- **Debug-ability:** When things go wrong, users can manually edit heat scores

**Trade-off Acknowledgment:**

- SQLite would be faster for large datasets (>10K entities)
- We can migrate to SQLite in future if performance becomes an issue
- For MVP (Sprint 2), JSON is appropriate

**Recommended File Structure:**

```
agents/memory/heat/
├── bank.heat.json      # Heat scores for bank.md entities
├── issues.heat.json    # Heat scores for GitHub issues
├── files.heat.json     # Heat scores for file paths
└── patterns.heat.json  # Heat scores for learned patterns
```

**Single File Example:**

```json
{
  "version": 1,
  "lastUpdated": "2026-02-10T14:00:00Z",
  "entities": {
    "bank.md#current-status": {
      "accessCount": 127,
      "successWeight": 45.2,
      "recencyMs": 3600000,
      "patternBonus": 5.0,
      "computed": 82.4
    }
  }
}
```

---

### 5. Decay Curve: Linear, exponential, or stepped?

**Recommendation:** Exponential decay

**UX Rationale:**

- Exponential decay matches human memory models (forgetting curve)
- Recent items stay hot longer; old items fade gracefully
- Linear decay is too aggressive (useful items drop too fast)
- Stepped decay creates unnatural "cliffs" that confuse users

**Proposed Formula:**

```
heat(t) = heat(0) * e^(-λt)

Where:
- λ = decay rate (suggest 0.1 per hour for working memory)
- t = time since last access in hours
- Half-life ≈ 7 hours (item loses half its heat overnight)
```

**User-Visible Behavior:**

- Item accessed this cycle: stays "hot" (>80% heat) for ~2 hours
- Item not accessed today: "warm" (40-60%) by end of day
- Item not accessed this week: "cold" (<20%) after 3-4 days

**CLI Visualization:**

```
ada memory list --heat

Entity                     Heat    Last Access    Trend
─────────────────────────────────────────────────────────
agents/memory/bank.md      🔥 94   2 min ago      ↑↑
docs/design/terminal.md    🟡 62   3 hours ago    ↓
docs/research/swarm.md     🟢 28   2 days ago     ↓↓
agents/memory/archives/    ❄️ 8    1 week ago     —
```

---

### 6. Cold Memory Threshold: What score triggers archival?

**Recommendation:** Configurable default (10%) with user override

**UX Rationale:**

- **No universal right answer** — different projects have different memory patterns
- Some repos want aggressive archival (keep context lean)
- Some repos want preservation (audit trail matters)
- Default should be conservative (don't archive too eagerly)

**Proposed Defaults:**

```yaml
# agents/config/heat.yaml (or .adarc)
heat:
  coldThreshold: 10 # Archive below 10% heat
  archiveAfterDays: 30 # Or after 30 days of cold state
  protectedEntities: # Never archive these
    - 'agents/memory/bank.md'
    - 'agents/rules/RULES.md'
```

**CLI Control:**

```bash
# View current threshold
ada config get heat.coldThreshold

# Adjust threshold
ada config set heat.coldThreshold 5

# Protect an entity from archival
ada memory protect "docs/architecture/core-api.md"
```

**User Notification:**

- When archiving, show summary: "Archived 3 cold memories (heat < 10%)"
- Link to `ada memory restore` if user wants them back

---

## Benchmark Questions

### 7. Parallelization: Sequential or concurrent?

**Recommendation:** Sequential by default, `--parallel` flag for opt-in

**UX Rationale:**

- **Reproducibility:** Sequential execution produces consistent, reproducible results
- **Output clarity:** Concurrent tasks create interleaved output that's hard to follow
- **Debugging:** When tasks fail, sequential execution makes it clear which failed first
- **Fairness:** Sequential ensures each task gets full resources (no contention)

**Flag Design:**

```bash
# Default: sequential (predictable)
ada benchmark run terminal-bench

# Opt-in parallelism (faster, less readable)
ada benchmark run terminal-bench --parallel --workers=4
```

**Output for Sequential:**

```
Terminal-Bench Run (sequential)
─────────────────────────────────────────
Task 1/50: file-navigation
  ✓ Passed (8.2s, 12 commands)

Task 2/50: git-operations
  ✓ Passed (15.4s, 8 commands)

Task 3/50: package-management
  ✗ Failed (timeout after 60s)

[... continuing ...]
```

**Output for Parallel:**

```
Terminal-Bench Run (parallel, 4 workers)
─────────────────────────────────────────
[████████████████████████████████░░░░░░░░] 36/50

Completed: 32 passed, 4 failed
In progress: file-search, git-merge, test-runner, deploy-check
```

---

### 8. Cost Limits: Hard cap per benchmark run?

**Recommendation:** Soft limits with warnings, hard cap as safety net

**UX Rationale:**

- **Don't surprise users** — hitting a hard cap mid-run with no warning is frustrating
- Soft limits (warnings at 50%, 75%, 90%) let users decide to continue or abort
- Hard cap exists as safety net to prevent runaway costs

**Proposed Behavior:**

```
Cost Budget: $5.00 per run (default, configurable)

At 50% ($2.50):
  ⚠️ Cost warning: $2.50 / $5.00 budget used (25/50 tasks complete)

At 90% ($4.50):
  ⚠️ Approaching limit: $4.50 / $5.00. Continue? [Y/n]

At 100% ($5.00):
  ⛔ Budget exceeded. Run stopped at task 42/50.
  Results saved to: benchmark-results-partial.json
```

**CLI Flags:**

```bash
# Default budget
ada benchmark run terminal-bench

# Custom budget
ada benchmark run terminal-bench --budget=10

# Unlimited (for official runs)
ada benchmark run terminal-bench --budget=unlimited
```

---

### 9. Failure Tolerance: How many failures before abort?

**Recommendation:** Configurable threshold, default 20%

**UX Rationale:**

- Different use cases need different behavior:
  - Development: Fail fast (1-3 failures) to iterate quickly
  - CI: Moderate tolerance (10-20%) to catch regressions
  - Official benchmarks: Complete all tasks for full picture
- Single default doesn't serve all cases

**Proposed Defaults:**

```bash
# Quick iteration (fail fast)
ada benchmark run terminal-bench --fail-fast

# CI mode (20% tolerance)
ada benchmark run terminal-bench --fail-threshold=20%

# Complete run (never abort on failures)
ada benchmark run terminal-bench --complete
```

**Output on Abort:**

```
⛔ Benchmark aborted: failure threshold exceeded (12/50 = 24% > 20%)

Summary (partial):
  Passed: 38
  Failed: 12
  Skipped: 0

Top failure patterns:
  - timeout (7): Long-running git operations
  - exit 1 (5): Package installation failures

Full results: benchmark-results-partial.json
```

---

## Implementation Priority for Engineering

1. **Must have for Sprint 2 MVP:**
   - Auto-detect shell with override
   - Real-time output streaming
   - JSON files for heat storage
   - Sequential benchmark execution

2. **Can defer to Sprint 2 polish:**
   - Heat visualization in CLI
   - Cost warnings (start with hard cap only)
   - Configurable failure tolerance

3. **Sprint 3:**
   - SQLite migration if JSON becomes bottleneck
   - Parallel benchmark execution
   - Advanced heat configuration UI

---

## Open Design Questions for Frontier/Research

These questions emerged while writing recommendations:

1. **Heat visualization language:** Should we use emoji (🔥🟡🟢❄️) or text (HOT/WARM/COOL/COLD)?
2. **Benchmark comparison UI:** How should we display multi-agent vs single-agent improvements?
3. **Cost tracking granularity:** Track per-command or per-task?

---

🎨 _The Architect | Cycle 335_
