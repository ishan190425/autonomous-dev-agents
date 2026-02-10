# 📚 Context-Bench Adapter Specification

> Comprehensive specification for adapting ADA to the Context-Bench benchmark
> **Author:** 🔬 The Scout | **Cycle:** 308 | **Date:** 2026-02-10
> **Related Issues:** #90 (Benchmark Testing), #113 (Cognitive Memory)
> **Status:** Research Specification | **Target:** Sprint 3 Evaluation

---

## Executive Summary

Context-Bench (Letta/UC Berkeley) is the industry-standard benchmark for **agentic context engineering** — measuring how well agents strategically manage what information to retrieve and load during long-horizon tasks. Unlike SWE-bench which tests single-shot code generation, Context-Bench directly validates ADA's core differentiator: multi-cycle memory management and strategic context retrieval.

**Why This Matters for ADA:**

- Our memory bank + cognitive memory systems are designed for exactly this
- Multi-agent coordination can split planning from execution
- Role specialization enables strategic division of labor in information retrieval

**Expected Improvement over Single-Agent:** +15-25%

---

## Benchmark Overview

### What Context-Bench Tests

1. **Multi-hop information retrieval** — Chaining file lookups across relationships
2. **Entity relationship tracing** — Following connections between entities
3. **Strategic tool selection** — Choosing between grep and open operations
4. **Context efficiency** — Minimizing token costs while maximizing accuracy

### Task Structure

Agents receive:

- A set of semi-structured text files containing fictional entity data
- Two tools: `open_files` (read complete file) and `grep_files` (pattern search)
- Questions requiring multiple chained operations to answer

**Example task types:**

- "Find information about a person, locate a related project, identify a collaborator"
- "Search for a specific attribute, verify across files, trace connections"
- "Navigate hierarchical relationships to answer questions about indirect connections"
- "Compare many different sets of items and contrast their attributes"

### Benchmark Properties

| Property                    | Description                                                      |
| --------------------------- | ---------------------------------------------------------------- |
| **Contamination-proof**     | Fictional entities generated from SQL — no training data leakage |
| **Multi-hop required**      | Cannot answer without navigating file relationships              |
| **Controllable difficulty** | SQL query complexity scales challenge level                      |
| **Cost-aware**              | Tracks total token cost alongside accuracy                       |

### Current Leaderboard (Feb 2026)

| Model             | Score  | Cost    |
| ----------------- | ------ | ------- |
| Claude Opus 4.6   | 83.43% | $115.08 |
| GPT-5.2 (xhigh)   | 82.61% | $84.66  |
| GPT-5.2 (high)    | 80.5%  | $68.53  |
| Claude Opus 4.5   | 76.8%  | $39.91  |
| Claude Sonnet 4.5 | 74.0%  | $24.58  |
| DeepSeek Reasoner | 73.05% | $16.03  |

**Best value:** Claude Sonnet 4.5 — top 5 accuracy at lowest cost in tier.

---

## Multi-Agent Value Analysis

### Why ADA Should Excel

Context-Bench requires:

1. **Strategic planning** — What info do I need? In what order?
2. **Efficient execution** — Minimize reads, maximize information gain
3. **Verification** — Is the answer correct? Did I miss anything?
4. **Cost optimization** — Token efficiency matters in scoring

ADA's role separation maps naturally:

| Task Aspect  | Single-Agent              | ADA Multi-Agent                          |
| ------------ | ------------------------- | ---------------------------------------- |
| Planning     | Model does everything     | **Research** creates retrieval strategy  |
| Execution    | Interleaved with planning | **Engineering** executes file operations |
| Verification | Often skipped             | **QA** verifies answer before submission |
| Optimization | Post-hoc if at all        | **Frontier** monitors context efficiency |

### Expected Improvement Breakdown

| Task Type         | Single-Agent Limitation                       | Multi-Agent Advantage              | Expected Gain  |
| ----------------- | --------------------------------------------- | ---------------------------------- | -------------- |
| Multi-hop queries | Planning while executing wastes tokens        | Research pre-plans optimal path    | +15-20%        |
| Verification      | Models skip verification under token pressure | QA enforces answer validation      | +10-15%        |
| Error recovery    | Retry whole task on failure                   | Targeted re-query of specific gaps | +20-25%        |
| Cost efficiency   | No separation of concerns                     | Cheaper models for execution steps | +5-10% on cost |

**Overall expected improvement: +15-25% accuracy OR equivalent accuracy at 30-40% lower cost.**

---

## Adapter Architecture

### Input Translation

```
Context-Bench Task
       │
       ▼
┌─────────────────────────────────────────┐
│           ADA Adapter Layer              │
├─────────────────────────────────────────┤
│  1. Parse question into retrieval goals  │
│  2. Create ADA-format issue              │
│  3. Inject file set as accessible data   │
│  4. Configure tool mappings              │
└─────────────────────────────────────────┘
       │
       ▼
   ADA Dispatch
```

### Tool Mapping

| Context-Bench Tool    | ADA Equivalent          | Implementation   |
| --------------------- | ----------------------- | ---------------- |
| `open_files(path)`    | `read_file(path)`       | Direct file read |
| `grep_files(pattern)` | `search_files(pattern)` | Pattern search   |

### Role Specialization for Context-Bench

```yaml
# Role assignments for Context-Bench tasks
research:
  phase: planning
  actions:
    - Analyze question structure
    - Identify required entity relationships
    - Create retrieval strategy (ordered file access plan)
    - Estimate token budget

engineering:
  phase: execution
  actions:
    - Execute file operations per strategy
    - Extract relevant information
    - Handle format variations
    - Report findings back to strategy layer

qa:
  phase: verification
  actions:
    - Verify answer completeness
    - Cross-check against question requirements
    - Identify missing relationships
    - Trigger re-query if gaps found

frontier:
  phase: optimization
  actions:
    - Monitor token consumption
    - Suggest cheaper alternatives (grep vs open)
    - Track context window utilization
    - Log efficiency metrics for learning
```

### Dispatch Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Context-Bench Task                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  RESEARCH: Strategic Planning (1 cycle)                      │
│  - Parse question → identify entities and relationships      │
│  - Generate retrieval plan: [file1, grep for X, file2, ...]  │
│  - Estimate token budget                                     │
│  - Hand off plan to Engineering                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ENGINEERING: Execution (1-3 cycles)                         │
│  - Execute retrieval plan step by step                       │
│  - Extract relevant facts from files                         │
│  - Build answer candidate from gathered information          │
│  - Report completion status                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  QA: Verification (1 cycle)                                  │
│  - Compare answer against question requirements              │
│  - Check: Are all entities resolved?                         │
│  - Check: Are all relationships traced?                      │
│  - If gaps: Return to Engineering with specific re-query     │
│  - If complete: Submit answer                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                        Final Answer
```

### Max Cycles Configuration

For Context-Bench tasks, configure:

```bash
ada dispatch --headless --max-cycles=5 --mode=context
```

- **Typical path:** 3 cycles (Research → Engineering → QA)
- **Complex path:** 5 cycles (adds re-query and re-verification)
- **Abort:** If 5 cycles without answer, submit best attempt

---

## Implementation Requirements

### CLI Flags Needed

```bash
# Context-Bench mode enables:
# - File-based input (not GitHub issues)
# - Tool restriction (only file operations)
# - Answer output format
# - Token tracking

ada dispatch --mode=context \
             --headless \
             --max-cycles=5 \
             --input=question.json \
             --data-dir=./files/ \
             --output=answer.json \
             --export-metrics=metrics.json
```

### Input Format

```json
{
  "task_id": "ctx-0001",
  "question": "Who is the primary collaborator on the project led by someone who owns a cat named Whiskers?",
  "data_files": [
    "people.txt",
    "projects.txt",
    "pets.txt",
    "collaborations.txt"
  ],
  "expected_hops": 3,
  "difficulty": "medium"
}
```

### Output Format

```json
{
  "task_id": "ctx-0001",
  "answer": "Dr. Sarah Chen",
  "confidence": 0.95,
  "retrieval_path": [
    {
      "tool": "grep",
      "file": "pets.txt",
      "pattern": "Whiskers",
      "result": "owner: James Wilson"
    },
    {
      "tool": "grep",
      "file": "projects.txt",
      "pattern": "James Wilson",
      "result": "project: Alpha Initiative"
    },
    {
      "tool": "open",
      "file": "collaborations.txt",
      "result": "Alpha Initiative primary collaborator: Dr. Sarah Chen"
    }
  ],
  "cycles_used": 3,
  "tokens_used": 4521,
  "roles_involved": ["research", "engineering", "qa"]
}
```

### Metrics Export

```json
{
  "task_id": "ctx-0001",
  "accuracy": true,
  "cycles": 3,
  "tokens": {
    "total": 4521,
    "research": 1200,
    "engineering": 2800,
    "qa": 521
  },
  "retrieval_efficiency": 0.89,
  "cost_usd": 0.0045
}
```

---

## Integration with Cognitive Memory

Context-Bench directly validates our Cognitive Memory architecture (Issue #113):

### Memory Type Mapping

| Context-Bench Concept    | ADA Cognitive Memory |
| ------------------------ | -------------------- |
| Entity relationships     | Semantic memory      |
| Retrieval history        | Episodic memory      |
| Search patterns learned  | Procedural memory    |
| File structure knowledge | Working memory       |

### Heat Scoring Application

During Context-Bench tasks, Heat Scoring (Issue #118) can prioritize:

- Recently accessed files (higher temperature)
- Files matching known patterns (pattern heat)
- Successful retrieval paths (pathway reinforcement)

### Expected Synergies

1. **Cross-task learning:** Heat scores from earlier tasks inform later ones
2. **Pattern recognition:** Common relationship types get faster retrieval
3. **Cost optimization:** Hot paths use cheaper grep, cold paths justify open

---

## Evaluation Strategy

### Phase 1: Baseline (Sprint 3, Week 1)

Run Context-Bench with single-agent Claude Sonnet 4.5:

- Establish baseline accuracy and cost
- Identify common failure modes
- Document relationship types that cause issues

### Phase 2: Multi-Agent (Sprint 3, Week 2)

Run with full ADA role dispatch:

- Compare accuracy vs baseline
- Track per-role token usage
- Measure verification catch rate

### Phase 3: Memory Integration (Sprint 3, Week 3)

Enable Cognitive Memory + Heat Scoring:

- Run multiple task batches
- Measure cross-task learning effect
- Compare early vs late task accuracy

### Success Criteria

| Metric                  | Baseline (estimated) | Target  | Stretch |
| ----------------------- | -------------------- | ------- | ------- |
| Accuracy                | ~74%                 | 80%     | 85%+    |
| Cost per task           | $0.05                | $0.04   | $0.03   |
| Cycles per task         | N/A                  | 3.5 avg | 2.5 avg |
| Verification catch rate | N/A                  | 90%     | 95%     |

---

## Risk Analysis

### Technical Risks

| Risk                  | Impact | Mitigation                                      |
| --------------------- | ------ | ----------------------------------------------- |
| Tool mapping mismatch | High   | Test adapter layer thoroughly before full eval  |
| Multi-cycle overhead  | Medium | Compare 1-cycle vs 3-cycle on same tasks        |
| Answer format errors  | Medium | Add format validation in QA role                |
| Token budget exceeded | Low    | Implement hard stops and best-effort submission |

### Methodology Risks

| Risk                     | Impact | Mitigation                                         |
| ------------------------ | ------ | -------------------------------------------------- |
| Cherry-picking tasks     | High   | Run full benchmark, not selected subsets           |
| Contamination            | Low    | Context-Bench uses fictional entities              |
| Overfitting to benchmark | Medium | Don't tune specifically for Context-Bench patterns |

---

## Timeline

| Milestone               | Date                 | Owner       |
| ----------------------- | -------------------- | ----------- |
| Adapter spec complete   | ✅ 2026-02-10 (C308) | Research    |
| CLI mode implementation | Sprint 3, Week 1     | Engineering |
| Baseline evaluation     | Sprint 3, Week 1     | QA          |
| Multi-agent evaluation  | Sprint 3, Week 2     | QA          |
| Memory integration test | Sprint 3, Week 3     | Frontier    |
| Results analysis        | Sprint 3, Week 4     | Research    |

---

## Connection to Other Benchmarks

### Complementary Coverage

| Benchmark         | Tests                   | ADA Value              |
| ----------------- | ----------------------- | ---------------------- |
| SWE-Bench         | Code generation         | Moderate               |
| Terminal-Bench    | CLI workflows           | High (multi-step)      |
| **Context-Bench** | **Context engineering** | **Very High (memory)** |

### Combined Messaging

> "ADA excels across the full spectrum: patch generation (SWE-bench), operational workflows (Terminal-Bench), and context engineering (Context-Bench) — the only multi-agent system benchmarked on all three dimensions."

---

## References

### Primary Source

- [Context-Bench Blog Post](https://www.letta.com/blog/context-bench) — Letta, 2025
- [Leaderboard](https://leaderboard.letta.com) — Live results

### Related ADA Documents

- `docs/research/cognitive-memory-innate-learned-heat-scoring.md` — Memory architecture
- `docs/research/terminal-bench-adapter-spec.md` — Terminal-Bench adapter (C298)
- `docs/research/benchmark-landscape-analysis.md` — Full benchmark survey

### Related Issues

- #90 — Benchmark Testing (parent)
- #113 — Cognitive Memory Architecture
- #118 — Heat Scoring Implementation
- #125 — Terminal Mode (related CLI infrastructure)

---

_🔬 The Scout | Cycle 308 | Context-Bench Adapter Specification_
_"Context engineering is our core differentiator. Let's prove it."_
