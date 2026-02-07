# 🧪 SWE-bench Evaluation Plan

> Research planning document for evaluating ADA on the SWE-bench benchmark
> **Author:** 🔬 The Scout | **Cycle:** 148 | **Date:** 2026-02-07
> **Target Sprint:** 2 (Mar 1-14) | **Status:** Planning

---

## Executive Summary

SWE-bench is the industry-standard benchmark for evaluating autonomous coding agents. A strong showing would validate ADA's multi-agent approach and provide concrete proof points for launch messaging, investor conversations, and accelerator applications.

**Goal:** Complete SWE-bench evaluation in Sprint 2, with results ready for YC application (Mar 7) and public announcement.

---

## What is SWE-bench?

### The Benchmark

SWE-bench (Princeton, 2024) evaluates agents on real-world software engineering tasks:

- **2,294 GitHub issues** from 12 popular Python repositories
- **Task:** Given an issue description, generate a patch that resolves it
- **Evaluation:** Automated test suite determines if patch is correct
- **Difficulty tiers:**
  - **SWE-bench Lite:** 300 easier issues (subset for quick evaluation)
  - **SWE-bench Full:** All 2,294 issues (comprehensive evaluation)

### Repositories Tested

| Repo         | Domain            | Issues |
| ------------ | ----------------- | ------ |
| astropy      | Astronomy library | 149    |
| django       | Web framework     | 831    |
| flask        | Microframework    | 35     |
| matplotlib   | Plotting          | 219    |
| pandas       | Data analysis     | 132    |
| pytest       | Testing framework | 95     |
| requests     | HTTP library      | 25     |
| scikit-learn | ML library        | 308    |
| seaborn      | Statistical viz   | 37     |
| sphinx       | Documentation     | 219    |
| sympy        | Math library      | 217    |
| xarray       | ND arrays         | 27     |

### Leaderboard Context (Feb 2026)

| Agent              | SWE-bench Lite | SWE-bench Full |
| ------------------ | -------------- | -------------- |
| Devin              | ~25%           | ~18%           |
| SWE-Agent (GPT-4)  | ~18%           | ~12%           |
| OpenHands          | ~22%           | ~15%           |
| Aider (Claude 3.5) | ~21%           | ~14%           |

**Note:** Leaderboard is competitive and changes frequently. These are approximate figures.

---

## Why SWE-bench Matters for ADA

### Strategic Value

1. **Credibility:** Industry-recognized benchmark — "we pass SWE-bench" is a strong signal
2. **Differentiation:** We can measure multi-agent vs single-agent performance
3. **Investor-ready:** Concrete numbers for pitch deck and YC application
4. **Community trust:** Open, reproducible results build trust

### ADA's Unique Angle

Unlike single-agent solutions, ADA can apply its **multi-role approach** to SWE-bench:

- **Research:** Analyze the issue, identify relevant code areas
- **Product:** Break down requirements, define acceptance criteria
- **Engineering:** Generate the patch
- **QA:** Validate the patch against tests
- **Ops:** Ensure code quality standards

**Hypothesis:** Multi-agent coordination will improve accuracy over single-agent approaches on complex issues, especially those requiring:

- Cross-file changes
- Test modifications
- Documentation updates
- Multi-step reasoning

---

## Evaluation Methodology

### Phase 1: Setup (Sprint 2, Week 1)

**Tasks:**

1. Clone SWE-bench repository and dependencies
2. Set up evaluation harness (Docker-based isolation)
3. Implement ADA-to-SWE-bench adapter:
   - Input: Issue description + codebase snapshot
   - Output: Git patch
4. Run validation on 10 sample issues (smoke test)

**Deliverables:**

- Working evaluation pipeline
- Adapter code (may become a template)
- Sample run logs

### Phase 2: Lite Evaluation (Sprint 2, Week 2)

**Tasks:**

1. Run ADA on SWE-bench Lite (300 issues)
2. Track per-issue metrics:
   - Success/failure
   - Token usage
   - Wall-clock time
   - Role contributions (which roles acted)
3. Compare against baseline (single-agent Claude call)

**Deliverables:**

- Full results table
- Comparative analysis
- Cost breakdown

### Phase 3: Analysis & Reporting (Sprint 2, Week 2)

**Tasks:**

1. Categorize successes and failures
2. Identify patterns:
   - Which issue types does multi-agent excel at?
   - Which repositories perform best?
   - What's the cost/accuracy tradeoff?
3. Generate report for external consumption

**Deliverables:**

- Research report (docs/research/swe-bench-results.md)
- Summary for launch messaging
- Data for YC application

---

## Technical Architecture

### Evaluation Flow

```
┌─────────────────────────────────────────────────────────┐
│                    SWE-bench Harness                     │
├─────────────────────────────────────────────────────────┤
│  1. Load issue from benchmark                            │
│  2. Checkout repository at specified commit              │
│  3. Inject ADA configuration (agents/, templates/)       │
│  4. Run: ada dispatch --headless --max-cycles=10         │
│  5. Extract generated patch                              │
│  6. Apply patch to fresh checkout                        │
│  7. Run test suite                                       │
│  8. Record pass/fail + metrics                           │
└─────────────────────────────────────────────────────────┘
```

### ADA Adapter Requirements

| Requirement      | Implementation                                  |
| ---------------- | ----------------------------------------------- |
| Headless mode    | `--headless` flag (no GitHub, file-only)        |
| Issue injection  | Write issue to `agents/memory/current-issue.md` |
| Max cycles       | `--max-cycles=N` (prevent runaway)              |
| Patch extraction | Read from `output/patch.diff`                   |
| Metrics capture  | `ada observe --export=json`                     |

### Infrastructure

- **Compute:** GitHub Actions self-hosted runner (GPU optional)
- **Isolation:** Docker containers per evaluation
- **Storage:** S3/GCS for result artifacts
- **Cost estimate:** ~$50-100 for Lite evaluation (token costs)

---

## Success Criteria

### Minimum Viable Result

- **SWE-bench Lite:** 15%+ pass rate
- **Rationale:** Matches baseline single-agent performance; proves ADA doesn't add overhead

### Target Result

- **SWE-bench Lite:** 20%+ pass rate
- **Rationale:** Competitive with leading agents; demonstrates multi-agent value

### Stretch Result

- **SWE-bench Lite:** 25%+ pass rate
- **Rationale:** Industry-leading; strong differentiator for launch

### Secondary Metrics

| Metric                   | Target                              |
| ------------------------ | ----------------------------------- |
| Average cost per issue   | < $0.50                             |
| Average cycles per issue | < 5                                 |
| Multi-role utilization   | > 60% of solved issues use 3+ roles |

---

## Risk Mitigation

| Risk                    | Probability | Mitigation                                              |
| ----------------------- | ----------- | ------------------------------------------------------- |
| Low initial results     | Medium      | Start with Lite; iterate on approach before Full        |
| High token costs        | Low         | Cost caps per issue; sample subset first                |
| Evaluation harness bugs | Medium      | Use official SWE-bench harness; validate on known cases |
| Time pressure           | Medium      | Prioritize Lite results for YC deadline                 |

---

## Timeline

| Date   | Milestone                | Owner              |
| ------ | ------------------------ | ------------------ |
| Feb 24 | v1.0-alpha launch        | All                |
| Feb 25 | SWE-bench setup begins   | Frontier, Research |
| Mar 1  | Evaluation harness ready | Engineering        |
| Mar 3  | Lite evaluation starts   | All (automated)    |
| Mar 5  | Preliminary results      | Research           |
| Mar 7  | YC application deadline  | Growth             |
| Mar 10 | Full results report      | Research           |

---

## Open Questions

1. **Model selection:** Should we use Claude 3.5 Sonnet (cost) or Opus (quality) for evaluation?
2. **Cycle budget:** What's the right max-cycles limit per issue?
3. **Role subset:** Should we use all 10 roles or a focused subset for benchmarks?
4. **Comparison:** Do we run a single-agent baseline for fair comparison?

---

## Next Steps

1. **Frontier:** Design headless mode and adapter architecture (Sprint 2)
2. **Engineering:** Implement `--headless` flag and patch extraction
3. **Research:** Monitor SWE-bench leaderboard updates, refine methodology
4. **Growth:** Prepare messaging for different result scenarios

---

## References

- [SWE-bench Paper (arXiv)](https://arxiv.org/abs/2310.06770)
- [SWE-bench Repository](https://github.com/princeton-nlp/SWE-bench)
- [SWE-bench Leaderboard](https://www.swebench.com/)
- [SWE-Agent (Princeton)](https://swe-agent.com/)

---

_🔬 The Scout | Cycle 148 | SWE-bench Evaluation Plan_
_"Benchmark-driven credibility for launch."_
