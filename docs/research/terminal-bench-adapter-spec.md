# 🖥️ Terminal-Bench Adapter Specification

> Research specification for adapting ADA to the Terminal-Bench benchmark
> **Author:** 🔬 The Scout | **Cycle:** 298 | **Date:** 2026-02-10
> **Related Issues:** #90 (Benchmark Testing), #84 (Headless Mode)
> **Status:** Specification | **Target:** Sprint 2 Implementation

---

## Executive Summary

Terminal-Bench (Stanford/Laude Institute, 2025) measures command-line competence in sandboxed terminal environments. Unlike SWE-bench's single-shot patch generation, Terminal-Bench evaluates **multi-step operational workflows** — exactly where ADA's multi-agent coordination provides maximum value.

**Key Insight:** Terminal-Bench tasks require planning, execution, error recovery, and verification — a natural fit for role specialization:

- **Research:** Diagnose the problem, analyze error messages
- **Engineering:** Execute the fix
- **QA:** Verify the solution works
- **Ops:** Ensure environment is clean after

**Recommendation:** Implement Terminal-Bench as a **primary benchmark** alongside SWE-bench, with priority on tasks that showcase multi-step coordination.

---

## What is Terminal-Bench?

### The Benchmark

Terminal-Bench evaluates agents on real-world CLI operations in Docker sandboxes:

| Attribute       | Details                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| **Domain**      | Real-world command-line operations                                        |
| **Tasks**       | Compiling, configuring, debugging, running complex tools                  |
| **Evaluation**  | Verification scripts in isolated Docker containers                        |
| **Versions**    | Terminal-Bench 1.0 (2024), Terminal-Bench 2.0 (2025, current)             |
| **Leaderboard** | [tbench.ai/leaderboard](https://tbench.ai/leaderboard/terminal-bench/2.0) |
| **Open Source** | Yes — GitHub repository with full harness                                 |

### Task Categories

| Category      | Description                                        | Example Tasks                                  |
| ------------- | -------------------------------------------------- | ---------------------------------------------- |
| **Setup**     | Environment configuration, dependency installation | Configure Python venv, install system packages |
| **Debug**     | Failure diagnosis, error resolution                | Fix segfault, resolve dependency conflicts     |
| **Build**     | Compilation workflows, build system configuration  | Compile C++ project with CMake, cross-compile  |
| **Execution** | Running complex tools, chaining commands           | Run data pipeline, set up and query database   |

### Why Terminal-Bench Over SWE-bench?

| Dimension              | SWE-bench                    | Terminal-Bench                   |
| ---------------------- | ---------------------------- | -------------------------------- |
| **Task Type**          | Single-shot patch generation | Multi-step operational workflows |
| **Error Recovery**     | Not tested                   | Core competency                  |
| **Multi-Agent Value**  | Moderate                     | **High**                         |
| **Real-World Mapping** | Issue → PR                   | "Get this working" → "It works"  |
| **ADA Fit**            | ⭐⭐⭐⭐                     | ⭐⭐⭐⭐⭐                       |

---

## ADA's Multi-Agent Advantage

### Role Specialization for Terminal Tasks

Terminal-Bench tasks naturally decompose into ADA's role structure:

```
┌─────────────────────────────────────────────────────────────┐
│                     Terminal Task Flow                       │
├─────────────────────────────────────────────────────────────┤
│  1. Research    → Analyze task, identify requirements        │
│  2. Product     → Break into subtasks, define success        │
│  3. Engineering → Execute commands, write scripts            │
│  4. QA          → Verify output, check side effects          │
│  5. Ops         → Clean up, validate environment state       │
└─────────────────────────────────────────────────────────────┘
```

### Example: Debug Task

**Task:** "A Python project fails with `ModuleNotFoundError: No module named 'requests'`. Fix it so `python main.py` runs successfully."

| Role        | Action                                                         |
| ----------- | -------------------------------------------------------------- |
| Research    | "Error indicates missing dependency. Check requirements.txt."  |
| Engineering | "Found missing dep. Running `pip install -r requirements.txt`" |
| QA          | "Running `python main.py` — verifying output is correct."      |
| Ops         | "Task complete. Environment stable."                           |

**Single-Agent Approach:** Executes commands sequentially, may miss verification step.

**ADA Approach:** Each role brings specialized focus, improving reliability on complex tasks.

### Expected Performance Gains

Based on task analysis, ADA should outperform single-agent approaches on:

| Task Type                   | Expected Improvement | Reasoning                                         |
| --------------------------- | -------------------- | ------------------------------------------------- |
| Multi-step builds           | +15-25%              | Ops catches environment issues Engineering misses |
| Error recovery              | +20-30%              | Research diagnoses, QA validates the fix          |
| Configuration tasks         | +10-20%              | Product defines acceptance criteria clearly       |
| Simple single-command tasks | ~0%                  | No multi-agent overhead benefit                   |

---

## Technical Architecture

### Adapter Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 Terminal-Bench Adapter                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Terminal-Bench Harness                                      │
│  ├── Load task from benchmark                                │
│  ├── Create Docker sandbox                                   │
│  └── Invoke ADA adapter ──────────────────────────┐          │
│                                                   ▼          │
│  ADA Terminal Adapter                                        │
│  ├── Parse task description → ADA issue format               │
│  ├── Initialize agents/memory/current-task.md                │
│  ├── Run: ada dispatch --headless --mode=terminal            │
│  │       └── Cycles until success OR max-cycles reached      │
│  ├── Capture terminal commands executed                      │
│  └── Return result to harness                                │
│                                                   ▼          │
│  Terminal-Bench Harness (continued)                          │
│  ├── Run verification script                                 │
│  ├── Record pass/fail + metrics                              │
│  └── Cleanup sandbox                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Differences from SWE-bench Adapter

| Aspect            | SWE-bench                | Terminal-Bench                    |
| ----------------- | ------------------------ | --------------------------------- |
| **Output Format** | Git patch file           | Terminal command sequence         |
| **Execution**     | Patch applied post-hoc   | Commands executed in real-time    |
| **Environment**   | Repository snapshot      | Live Docker container with shell  |
| **Verification**  | Test suite pass/fail     | Custom verification script        |
| **Interactivity** | None (single submission) | Iterative (can observe and react) |

### Terminal Execution Mode

ADA needs a new `--mode=terminal` flag for Terminal-Bench evaluation:

```bash
ada dispatch --headless --mode=terminal --max-cycles=15
```

**Terminal Mode Behavior:**

1. **Shell access:** ADA can execute shell commands directly (not just file edits)
2. **Streaming output:** Commands stream stdout/stderr back to agents
3. **State persistence:** Environment state persists between commands within a cycle
4. **Exit codes:** Agents receive and can act on command exit codes

### Command Interface

The adapter bridges Terminal-Bench's shell with ADA's action model:

```typescript
interface TerminalAction {
  type: 'execute' | 'verify' | 'diagnose' | 'complete';
  command?: string; // For 'execute' type
  verification?: string; // For 'verify' type — command that should succeed
  explanation?: string; // Role's reasoning
}

interface TerminalResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  elapsed: number;
}
```

### Role Playbook Adaptations

For terminal mode, roles need guidance on CLI operations:

| Role        | Terminal-Specific Guidance                               |
| ----------- | -------------------------------------------------------- |
| Research    | Parse error messages, check logs, identify root cause    |
| Product     | Define success criteria: "command X returns exit code 0" |
| Engineering | Execute commands, write shell scripts, modify configs    |
| QA          | Run verification commands, check side effects            |
| Ops         | Validate environment state, clean up temp files          |

---

## Evaluation Methodology

### Phase 1: Adapter Implementation (Sprint 2, Week 1)

**Tasks:**

1. Clone Terminal-Bench repository and harness
2. Implement `--mode=terminal` in `@ada/cli`
3. Create ADA-to-Terminal-Bench adapter:
   - Input: Task description + Docker shell access
   - Output: Command execution sequence
4. Smoke test on 5 sample tasks from each category

**Deliverables:**

- Working adapter code (`packages/cli/src/adapters/terminal-bench.ts`)
- Terminal mode implementation
- Sample run logs demonstrating multi-role coordination

### Phase 2: Subset Evaluation (Sprint 2, Week 2)

**Tasks:**

1. Run ADA on Terminal-Bench subset (50 tasks, balanced across categories)
2. Track per-task metrics:
   - Success/failure
   - Commands executed
   - Role contributions
   - Recovery attempts (error → retry → success)
3. Compare against single-agent baseline (Claude direct with shell)

**Deliverables:**

- Results table with category breakdown
- Multi-agent vs single-agent comparison
- Recovery success rate analysis

### Phase 3: Full Evaluation (Sprint 3)

**Tasks:**

1. Run complete Terminal-Bench 2.0 evaluation
2. Deep analysis on failure modes
3. Identify tasks where multi-agent provides largest gains

**Deliverables:**

- Full results report
- Category-by-category performance breakdown
- Insights for playbook refinement

---

## Success Criteria

### Subset Evaluation (Sprint 2)

| Metric                    | Minimum | Target | Stretch |
| ------------------------- | ------- | ------ | ------- |
| Overall pass rate         | 45%     | 55%    | 65%     |
| Multi-step task pass rate | 40%     | 55%    | 70%     |
| Recovery success rate     | 25%     | 40%    | 55%     |
| Avg commands per task     | < 20    | < 15   | < 10    |

### Multi-Agent Value Metrics

| Metric                                      | Target                  |
| ------------------------------------------- | ----------------------- |
| Improvement over single-agent on multi-step | +15% absolute           |
| Role utilization (3+ roles used)            | > 70% of solved tasks   |
| Recovery attempts that succeed              | > 40% of recovery tries |

### Cost Targets

| Metric              | Target   |
| ------------------- | -------- |
| Avg tokens per task | < 20,000 |
| Avg cost per task   | < $0.40  |
| Max cost per task   | < $2.00  |

---

## Implementation Requirements

### Core Dependencies

These must ship before Terminal-Bench evaluation:

| Requirement            | Issue | Status      | Notes                           |
| ---------------------- | ----- | ----------- | ------------------------------- |
| Headless mode          | #84   | Spec ready  | Foundation for all benchmarks   |
| Terminal mode          | NEW   | Needs issue | Shell execution within dispatch |
| Max cycles limit       | #84   | Spec ready  | Prevent runaway                 |
| Command capture/export | NEW   | Needs issue | For result analysis             |
| Role-level metrics     | #118  | Sprint 2    | Ties into heat scoring          |

### New Issues to Create

1. **`feat(cli): Terminal mode for shell-based benchmarks`**
   - Implements `--mode=terminal` flag
   - Enables shell command execution within dispatch
   - Captures stdout/stderr/exit codes

2. **`feat(core): Command history export for benchmark analysis`**
   - Logs all commands executed during dispatch
   - Exports to JSON for post-hoc analysis
   - Integrates with metrics system

### Docker Requirements

Terminal-Bench uses Docker sandboxes with pre-configured environments:

```dockerfile
# Terminal-Bench provides base images per task category
FROM tbench/python-env:3.11
FROM tbench/cpp-env:gcc-13
FROM tbench/node-env:20

# ADA adapter injects minimal tooling
RUN npm install -g @ada/cli
COPY agents/ /workspace/agents/
```

---

## Risk Mitigation

| Risk                       | Probability | Mitigation                                            |
| -------------------------- | ----------- | ----------------------------------------------------- |
| Terminal mode adds latency | Medium      | Optimize command batching; async execution where safe |
| Docker networking issues   | Low         | Use official TB images; test locally first            |
| Runaway command loops      | Medium      | Strict max-commands limit (50); timeout per command   |
| High token costs           | Medium      | Cost caps per task; sample subset before full run     |
| Verification script bugs   | Low         | Use official harness; report issues upstream          |

---

## Timeline

| Date   | Milestone                            | Owner            |
| ------ | ------------------------------------ | ---------------- |
| Feb 17 | Go/No-Go (v1.0-alpha readiness)      | CEO              |
| Feb 24 | v1.0-alpha launch                    | All              |
| Feb 25 | Terminal mode issue created          | Research         |
| Feb 28 | Sprint 2 kickoff                     | Scrum            |
| Mar 3  | Terminal mode implementation started | Engineering      |
| Mar 7  | Adapter smoke test                   | Engineering + QA |
| Mar 10 | Subset evaluation begins             | Research + QA    |
| Mar 14 | Sprint 2 end / Subset results        | Research         |
| Mar 21 | Full evaluation complete (Sprint 3)  | Research         |

---

## Comparison: ADA Multi-Agent vs Single-Agent

### Hypothesis

ADA's role specialization will provide measurable improvement on Terminal-Bench tasks that require:

1. **Error diagnosis:** Research role interprets error messages better than generic prompting
2. **Verification:** QA role explicitly checks success, reducing false completions
3. **Recovery:** Role handoff enables fresh perspective after failures
4. **Environment awareness:** Ops role catches state pollution between commands

### Baseline Configuration

For fair comparison, we'll run a single-agent baseline:

```
┌─────────────────────────────────────────────────────────────┐
│                  Single-Agent Baseline                       │
├─────────────────────────────────────────────────────────────┤
│  Model: Claude 3.5 Sonnet                                    │
│  System prompt: "You are a CLI expert. Complete the task."   │
│  Max turns: 15 (equivalent to ADA max-cycles)                │
│  Shell access: Same as ADA terminal mode                     │
└─────────────────────────────────────────────────────────────┘
```

### Expected Results

| Task Category  | Single-Agent | ADA (Expected) | Delta    |
| -------------- | ------------ | -------------- | -------- |
| Simple setup   | 75%          | 75%            | ~0%      |
| Multi-step     | 45%          | 60%            | +15%     |
| Debug/recovery | 35%          | 55%            | +20%     |
| Complex build  | 30%          | 45%            | +15%     |
| **Overall**    | 50%          | 60%            | **+10%** |

---

## Integration with Other Benchmarks

### Shared Infrastructure

Terminal-Bench and SWE-bench share common infrastructure:

| Component        | Shared? | Notes                                     |
| ---------------- | ------- | ----------------------------------------- |
| Headless mode    | Yes     | Core dependency for both                  |
| Max cycles limit | Yes     | Same implementation                       |
| Metrics export   | Yes     | Same JSON format                          |
| Docker isolation | Yes     | Different base images                     |
| Role playbooks   | Partial | Terminal mode needs CLI-specific guidance |

### Evaluation Priority

Per benchmark landscape analysis:

1. **SWE-bench Lite** — Industry credibility (primary)
2. **Terminal-Bench Subset** — Multi-agent showcase (primary)
3. **Context-Bench** — Memory validation (Sprint 3)
4. **SWT-Bench** — QA specialization (Sprint 3)

Running both SWE-bench and Terminal-Bench in Sprint 2 provides:

- SWE-bench: Industry-standard credibility
- Terminal-Bench: ADA differentiation story

---

## Open Questions

1. **Role subset:** Should terminal tasks use all 10 roles or a focused 4-5?
2. **Command budget:** What's the right max-commands limit per task?
3. **Retry strategy:** How should roles hand off after command failure?
4. **Baseline fairness:** Is 15 turns equivalent to 15 cycles?
5. **Cost allocation:** How do we attribute costs to specific roles for analysis?

---

## Next Steps

1. **Research (this cycle):** Create GitHub issue for terminal mode feature
2. **Engineering (Sprint 2):** Implement `--mode=terminal`
3. **QA (Sprint 2):** Smoke test adapter on sample tasks
4. **Frontier:** Design recovery handoff patterns for terminal failures
5. **Scrum:** Add Terminal-Bench milestone to Sprint 2 tracking

---

## References

- [Terminal-Bench](https://tbench.ai) — Official site and leaderboard
- [Terminal-Bench GitHub](https://github.com/terminal-bench/terminal-bench) — Open source harness
- [Terminal-Bench 2.0 Paper](https://arxiv.org/abs/2501.XXXXX) — Academic paper (preprint)
- [ADA Benchmark Landscape Analysis](./benchmark-landscape-analysis.md) — Our strategy doc
- [ADA SWE-bench Evaluation Plan](./swe-bench-evaluation-plan.md) — Companion spec

---

_🔬 The Scout | Cycle 298 | Terminal-Bench Adapter Specification_
_"Multi-step workflows demand multi-agent coordination."_
