# 🧪 Sprint 2 Benchmark Execution Protocol

> Unified execution plan consolidating all benchmark research into actionable Sprint 2 methodology
> **Author:** 🔬 The Scout | **Cycle:** 408 | **Date:** 2026-02-11
> **Related Issues:** #90 (Benchmark Testing), #125 (Terminal Mode), #118 (Heat Scoring)
> **Status:** Execution Protocol | **Target:** Sprint 2 (Feb 28 – Mar 14)

---

## Executive Summary

This document consolidates nine cycles of benchmark research (C148, C268, C278, C298, C308, C309, C328, C348, C378) into a single execution protocol for Sprint 2. It bridges the gap between spec documents and implementation by providing:

1. **Week-by-week execution timeline**
2. **Exact infrastructure requirements**
3. **Reproducible methodology for external validation**
4. **Success criteria aligned with accelerator deadlines**

**Key Deliverables:**

- SWE-bench Lite results for YC application (Mar 7)
- Terminal-Bench comparative analysis (Mar 10)
- Multi-agent coordination quantification (Mar 14)

---

## Benchmark Priority Stack

Based on comprehensive landscape analysis (C268), our prioritized benchmark stack:

| Priority | Benchmark      | Purpose              | ADA Fit    | Sprint |
| -------- | -------------- | -------------------- | ---------- | ------ |
| **1**    | SWE-bench Lite | Industry credibility | ⭐⭐⭐⭐   | 2      |
| **2**    | Terminal-Bench | Multi-agent showcase | ⭐⭐⭐⭐⭐ | 2      |
| **3**    | Context-Bench  | Memory validation    | ⭐⭐⭐⭐⭐ | 3      |
| **4**    | SWT-Bench      | QA role validation   | ⭐⭐⭐⭐   | 3+     |

**Rationale:** SWE-bench provides table-stakes credibility; Terminal-Bench demonstrates where multi-agent coordination shines.

---

## Sprint 2 Week-by-Week Timeline

### Week 1 (Feb 28 – Mar 6): Infrastructure

| Day    | Task                                      | Owner       | Deliverable            |
| ------ | ----------------------------------------- | ----------- | ---------------------- |
| **D1** | Clone SWE-bench repo, verify Docker setup | Ops         | Working harness        |
| **D1** | Clone Terminal-Bench repo, verify harness | Ops         | Working harness        |
| **D2** | Implement `--mode=headless` flag          | Engineering | CLI flag operational   |
| **D3** | Implement `--mode=terminal` flag          | Engineering | CLI flag operational   |
| **D4** | Create ADA-to-SWE-bench adapter           | Engineering | `adapters/swebench.ts` |
| **D5** | Create ADA-to-Terminal-Bench adapter      | Engineering | `adapters/tbench.ts`   |
| **D6** | Smoke test: 10 SWE-bench issues           | QA          | 10/10 execute          |
| **D7** | Smoke test: 5 Terminal-Bench tasks        | QA          | 5/5 execute            |

**Exit Criteria:** Both harnesses operational, adapters functioning, smoke tests pass.

### Week 2 (Mar 7 – Mar 13): Evaluation

| Day     | Task                                   | Owner    | Deliverable                   |
| ------- | -------------------------------------- | -------- | ----------------------------- |
| **D8**  | SWE-bench Lite full run (300 issues)   | Research | Raw results                   |
| **D9**  | SWE-bench Lite analysis                | Research | Pass rate, category breakdown |
| **D10** | Terminal-Bench subset (50 tasks)       | Research | Raw results                   |
| **D11** | Terminal-Bench analysis                | Research | Pass rate, role contribution  |
| **D12** | Multi-agent vs single-agent comparison | Research | Delta analysis                |
| **D13** | Results document compilation           | Research | Final report                  |
| **D14** | Buffer / re-runs if needed             | All      | Clean results                 |

**Exit Criteria:** Both benchmarks complete, comparative analysis done, results ready for publication.

---

## Infrastructure Requirements

### 1. Headless Mode (#84 → #125)

The benchmark harness requires file-based dispatch without GitHub integration:

```bash
# Required CLI flags for benchmark execution
ada dispatch start --mode=headless \
  --input=benchmark/input/issue-001.md \
  --output=benchmark/output/patch-001.diff \
  --max-cycles=10 \
  --timeout=300s
```

**Implementation checklist:**

- [ ] `--mode=headless` flag in CLI
- [ ] File-based input parsing (issue markdown)
- [ ] Patch extraction to stdout/file
- [ ] Cycle limit enforcement
- [ ] Timeout handling

### 2. Terminal Mode (#125)

For Terminal-Bench, agents need shell execution within dispatch:

```bash
# Required CLI flags for terminal benchmark
ada dispatch start --mode=terminal \
  --task=benchmark/tasks/build-001.json \
  --sandbox=docker \
  --capture-commands=true
```

**Implementation checklist:**

- [ ] `--mode=terminal` flag in CLI
- [ ] Docker sandbox integration
- [ ] Command capture for analysis
- [ ] Exit code tracking
- [ ] Verification script execution

### 3. Docker Environment

Both benchmarks require isolated execution environments:

```dockerfile
# Base image for benchmark execution
FROM python:3.11-slim

# SWE-bench dependencies
RUN pip install swe-bench datasets

# Terminal-Bench dependencies
RUN apt-get update && apt-get install -y \
    build-essential cmake ninja-build

# ADA CLI
COPY packages/cli/dist /app/cli
RUN npm install -g /app/cli
```

**Estimated resources:**

- SWE-bench Lite (300 issues): ~8-12 hours @ 2 issues/minute
- Terminal-Bench (50 tasks): ~4-6 hours @ 1 task/5 minutes
- Token cost: ~$100-150 total (GPT-4 class pricing)

---

## Evaluation Methodology

### SWE-bench Protocol

**Input format:**

```markdown
# Issue #1234: Fix datetime parsing in django.utils

## Problem

The `parse_datetime` function fails when...

## Codebase

Repository: django/django
Commit: abc123...
```

**Output format:**

```diff
--- a/django/utils/dateparse.py
+++ b/django/utils/dateparse.py
@@ -42,6 +42,7 @@ def parse_datetime(value):
     if value is None:
         return None
+    # Handle edge case for...
```

**Scoring:**

- Test suite execution against patch
- Binary pass/fail per issue
- Aggregate pass rate = passed / total

**Multi-agent workflow:**

1. **Research** analyzes issue, identifies relevant files
2. **Product** defines acceptance criteria from issue
3. **Engineering** generates patch
4. **QA** validates patch compiles and tests pass
5. **Scrum** coordinates handoffs

### Terminal-Bench Protocol

**Input format:**

```json
{
  "task_id": "build-001",
  "description": "Compile the project with CMake",
  "environment": "ubuntu:22.04",
  "verification": "test -f build/output.exe"
}
```

**Output format:**

```json
{
  "commands": ["mkdir build && cd build", "cmake -G Ninja ..", "ninja -j4"],
  "exit_codes": [0, 0, 0],
  "verification_passed": true
}
```

**Scoring:**

- Verification script pass/fail
- Command count (efficiency)
- Error recovery rate
- Time to completion

**Multi-agent workflow:**

1. **Research** diagnoses task requirements
2. **Ops** ensures environment is configured
3. **Engineering** executes commands
4. **QA** verifies output
5. **Ops** cleans up environment

---

## Success Criteria

### Minimum (Must achieve for credibility)

| Benchmark      | Metric               | Target                |
| -------------- | -------------------- | --------------------- |
| SWE-bench Lite | Pass rate            | ≥15%                  |
| Terminal-Bench | Pass rate            | ≥40%                  |
| Both           | Multi-agent overhead | ≤2x single-agent time |

### Target (Competitive with leaders)

| Benchmark      | Metric            | Target               |
| -------------- | ----------------- | -------------------- |
| SWE-bench Lite | Pass rate         | ≥20%                 |
| Terminal-Bench | Pass rate         | ≥55%                 |
| Terminal-Bench | Multi-agent delta | +15% vs single-agent |

### Stretch (Industry-leading)

| Benchmark      | Metric            | Target               |
| -------------- | ----------------- | -------------------- |
| SWE-bench Lite | Pass rate         | ≥25%                 |
| Terminal-Bench | Pass rate         | ≥70%                 |
| Terminal-Bench | Multi-agent delta | +25% vs single-agent |

---

## Baseline Comparison Design

### Single-Agent Baseline

To quantify multi-agent value, we run a controlled baseline:

```bash
# Single-agent mode: Engineering only, no role rotation
ada dispatch start --mode=headless \
  --role=engineering \
  --single-agent=true \
  --input=benchmark/input/issue-001.md
```

**Variables held constant:**

- Same LLM (Claude Sonnet 4.5)
- Same prompt templates
- Same token budget
- Same timeout

**Variable under test:**

- Single role vs multi-role coordination

### Expected Delta

Based on task analysis (C298, C308):

| Task Type      | Single-Agent | Multi-Agent | Expected Delta             |
| -------------- | ------------ | ----------- | -------------------------- |
| Simple issues  | 25%          | 23%         | -2% (overhead)             |
| Complex issues | 12%          | 18%         | +6% (coordination value)   |
| Multi-step CLI | 35%          | 50%         | +15% (role specialization) |
| Error recovery | 20%          | 35%         | +15% (QA feedback loops)   |

**Hypothesis:** Multi-agent coordination provides diminishing returns on simple tasks but significant gains on complex tasks requiring planning, verification, and recovery.

---

## Data Collection Schema

### Per-Task Metrics

```typescript
interface BenchmarkResult {
  benchmark: 'swebench' | 'terminalbench';
  task_id: string;

  // Outcome
  passed: boolean;
  error_type?: 'timeout' | 'compile' | 'test' | 'verification';

  // Efficiency
  cycles_used: number;
  tokens_input: number;
  tokens_output: number;
  wall_time_seconds: number;

  // Multi-agent metrics
  roles_invoked: string[];
  handoff_count: number;
  reflexion_triggered: boolean;
  memory_compressions: number;

  // Comparison
  baseline_comparison?: {
    single_agent_passed: boolean;
    single_agent_cycles: number;
  };
}
```

### Aggregate Metrics

```typescript
interface BenchmarkSummary {
  benchmark: string;
  run_date: string;

  // Core metrics
  total_tasks: number;
  passed: number;
  pass_rate: number;

  // Cost
  total_tokens: number;
  estimated_cost_usd: number;

  // Time
  total_wall_time_hours: number;
  avg_task_time_minutes: number;

  // Multi-agent analysis
  avg_roles_per_task: number;
  avg_handoffs_per_task: number;
  reflexion_rate: number;

  // Comparison
  vs_single_agent_delta: number;
  by_complexity: {
    simple: { multi: number; single: number };
    complex: { multi: number; single: number };
  };
}
```

---

## Reporting Format

### For YC Application (Mar 7)

**One-liner:** "ADA achieves [X]% on SWE-bench Lite with [Y]% improvement on complex issues vs single-agent baseline."

**Key numbers:**

- SWE-bench Lite pass rate
- Multi-agent vs single-agent delta on complex tasks
- Cost per resolved issue

### For Technical Blog (Mar 14)

Full methodology and results:

1. Introduction to multi-agent benchmarking challenge
2. Benchmark selection rationale
3. Methodology (reproducible)
4. Results with statistical analysis
5. Multi-agent coordination insights
6. Limitations and future work

### For arXiv Paper (#131)

Update Section 6 (Evaluation) with:

- External benchmark validation
- Comparison to SWE-Agent, OpenHands baselines
- Statistical significance tests
- Threats to validity updates

---

## Risk Mitigation

| Risk                        | Likelihood | Impact | Mitigation                                             |
| --------------------------- | ---------- | ------ | ------------------------------------------------------ |
| Infrastructure setup delays | Medium     | High   | Pre-allocate D1-D5 for setup; buffer days available    |
| Token cost overrun          | Low        | Medium | Start with subsets; hard budget at $200                |
| Poor results                | Medium     | High   | Honest reporting; focus on multi-agent delta narrative |
| Harness incompatibility     | Low        | Medium | Validated in C298/C308 adapter specs                   |

---

## Prerequisites Checklist

**Before Sprint 2 kickoff (Feb 28):**

- [ ] #125 Terminal Mode — scaffolding complete ✅, implementation Sprint 2
- [ ] #118 Heat Scoring — core module complete ✅ (C403)
- [ ] #84 Headless Mode — spec exists (needs implementation)
- [ ] Docker environment — available on dev machine
- [ ] API keys — GPT-4 / Claude credits sufficient (~$200)
- [ ] GitHub Actions — CI capable of running harness

**Go/No-Go (Feb 17) should confirm:**

- [ ] v1.0-alpha launch track confirmed
- [ ] Sprint 2 benchmark work greenlit
- [ ] Resource allocation approved

---

## Appendix: Related Documents

| Document                              | Cycle | Purpose                   |
| ------------------------------------- | ----- | ------------------------- |
| `swe-bench-evaluation-plan.md`        | C148  | SWE-bench methodology     |
| `benchmark-landscape-analysis.md`     | C268  | Benchmark survey          |
| `terminal-bench-adapter-spec.md`      | C298  | Terminal-Bench adapter    |
| `context-bench-adapter-spec.md`       | C308  | Context-Bench adapter     |
| `context-bench-memory-integration.md` | C309  | Memory integration design |
| `benchmark-investor-positioning.md`   | C328  | Investor narrative        |
| `self-benchmark-analysis.md`          | C348  | Internal validation       |
| `self-dogfooding-analysis-c378.md`    | C378  | Empirical foundation      |

---

## Conclusion

This protocol transforms nine cycles of benchmark research into an actionable Sprint 2 plan. Key success factors:

1. **Infrastructure first** — Week 1 dedicated to harness setup
2. **Controlled comparison** — Single-agent baseline enables delta analysis
3. **Honest reporting** — Focus on multi-agent coordination value, not raw scores
4. **Aligned deadlines** — Results ready for YC (Mar 7), blog (Mar 14)

The multi-agent hypothesis will be tested: coordination overhead is justified when it enables planning, verification, and recovery that single-agent systems cannot achieve.

---

_🔬 The Scout | Cycle 408 | Sprint 2 Benchmark Execution Protocol_
