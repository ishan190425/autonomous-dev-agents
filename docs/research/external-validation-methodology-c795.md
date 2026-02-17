# External Validation Methodology (C795)

> **Purpose:** Framework for validating ADA on external repositories beyond self-dogfooding
> **Issue:** Supports #131 (arXiv paper Section 8.2), #92 (Early Adopter Program)
> **Created:** 2026-02-17 | Cycle 795
> **Author:** 🔬 The Scout (Research)

---

## 1. The Generalization Problem

### 1.1 Current Limitation

The arXiv paper (C785 outline, Section 8.2) acknowledges:

> **Generalization:** Tested on itself; external validation needed

ADA has achieved 794 cycles on `autonomous-dev-agents`, but this is a single data point. Critics will ask: "Does ADA work on repositories it didn't build?"

### 1.2 Why Self-Dogfooding Isn't Enough

| Concern                    | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| **Selection bias**         | ADA chose its own architecture; it's optimized for itself    |
| **Domain familiarity**     | Agents "know" their codebase intimately                      |
| **Circular validation**    | Success at building ADA doesn't prove general competence     |
| **Language/stack lock-in** | TypeScript monorepo may not generalize to Python, Rust, etc. |

### 1.3 Validation Goal

Demonstrate that ADA's role-based multi-agent architecture provides value on **diverse, unfamiliar codebases** — codebases the agents have never seen.

---

## 2. Validation Dimensions

### 2.1 Repository Diversity Matrix

External validation should cover diverse repository characteristics:

| Dimension          | Low             | Medium            | High                   |
| ------------------ | --------------- | ----------------- | ---------------------- |
| **Size**           | <5K LOC         | 5-50K LOC         | >50K LOC               |
| **Language**       | TypeScript      | Python            | Multi-language         |
| **Structure**      | Single package  | Monorepo (2-5)    | Complex monorepo (10+) |
| **Test coverage**  | <20%            | 20-70%            | >70%                   |
| **Issue velocity** | <5 issues/month | 5-20/month        | >20/month              |
| **CI complexity**  | None            | Basic (lint/test) | Advanced (multi-stage) |
| **Domain**         | CLI/library     | Web app           | Systems/infra          |

### 2.2 Recommended Validation Cohorts

**Cohort A: Familiar Territory (Control)**

- TypeScript repos similar to ADA
- Expected: Strong performance (baseline)
- Examples: CLI tools, npm packages

**Cohort B: Language Expansion**

- Python repos (AI/ML ecosystem)
- Expected: Moderate performance (playbooks may need adaptation)
- Examples: FastAPI apps, data pipelines

**Cohort C: Domain Expansion**

- Different domains (not dev tools)
- Expected: Variable performance (tests generalization)
- Examples: Web apps, mobile backends

**Cohort D: Complexity Stress Test**

- Large, complex codebases
- Expected: Lower performance (tests limits)
- Examples: Monorepos with 10+ packages

---

## 3. Success Metrics

### 3.1 Primary Metrics (Quantitative)

| Metric                 | Definition                          | Target |
| ---------------------- | ----------------------------------- | ------ |
| **Cycle success rate** | % cycles completing without failure | ≥85%   |
| **Issue close rate**   | Issues closed / issues created      | ≥30%   |
| **PR completion rate** | PRs merged / PRs opened             | ≥80%   |
| **Test delta**         | Net tests added (not broken)        | ≥0     |
| **Coverage delta**     | Coverage change over period         | ≥0%    |
| **Consecutive cycles** | Max consecutive successful cycles   | ≥50    |

### 3.2 Secondary Metrics (Quality)

| Metric                      | Definition                          | Target |
| --------------------------- | ----------------------------------- | ------ |
| **Human intervention rate** | % cycles requiring manual fix       | ≤10%   |
| **Valid contribution rate** | PR quality (not reverted/rejected)  | ≥90%   |
| **Memory efficiency**       | Compression events per 100 cycles   | ≤5     |
| **Role coverage**           | All 10 roles active in cycle window | ≥8/10  |

### 3.3 Comparative Metrics (vs Dogfooding Baseline)

| Metric                | ADA Self (Baseline) | External Target |
| --------------------- | ------------------- | --------------- |
| Cycle success rate    | 100% (C421+)        | ≥85%            |
| Consecutive cycles    | 372                 | ≥50             |
| Tests per 100 cycles  | ~330                | ≥100            |
| Velocity (cycles/day) | 29                  | ≥10             |

---

## 4. Early Adopter Validation Protocol

### 4.1 Onboarding Phase (Week 1)

1. **Repo audit**: Size, language, structure, test coverage
2. **ADA init**: Configure roles, playbooks, memory
3. **Baseline capture**: Current metrics (issues, coverage, PR velocity)
4. **First 10 cycles**: Supervised, human reviews all PRs

### 4.2 Burn-in Phase (Week 2-3)

1. **Unsupervised operation**: 50-100 cycles
2. **Monitoring**: Success rate, error patterns, memory growth
3. **Intervention logging**: Every human fix documented
4. **Weekly checkpoint**: Review metrics, adjust playbooks

### 4.3 Evaluation Phase (Week 4)

1. **Metrics collection**: Full quantitative analysis
2. **Qualitative review**: Sample PR quality, issue quality
3. **Repo owner feedback**: Survey on perceived value
4. **Comparison report**: vs baseline, vs ADA dogfooding

### 4.4 Data Collection Schema

```typescript
interface ExternalValidationReport {
  // Repository metadata
  repo: {
    name: string;
    language: string[];
    loc: number;
    testCoverage: number;
    issueVelocity: number; // issues/month
    cohort: 'A' | 'B' | 'C' | 'D';
  };

  // Evaluation period
  period: {
    startDate: string;
    endDate: string;
    totalCycles: number;
    totalDays: number;
  };

  // Primary metrics
  metrics: {
    cycleSuccessRate: number;
    consecutiveCycles: number;
    issueCloseRate: number;
    prCompletionRate: number;
    testDelta: number;
    coverageDelta: number;
  };

  // Quality metrics
  quality: {
    humanInterventionRate: number;
    validContributionRate: number;
    memoryCompressions: number;
    rolesCovered: number;
  };

  // Qualitative feedback
  feedback: {
    ownerSatisfaction: 1 | 2 | 3 | 4 | 5;
    perceivedValue: string;
    painPoints: string[];
    suggestions: string[];
  };
}
```

---

## 5. Statistical Validity

### 5.1 Sample Size Requirements

For statistically significant claims of generalization:

| Claim                    | Min Sample             | Target Sample |
| ------------------------ | ---------------------- | ------------- |
| "Works on TypeScript"    | 3 repos                | 5+ repos      |
| "Works on Python"        | 3 repos                | 5+ repos      |
| "Works across languages" | 6 repos (2+ languages) | 10+ repos     |
| "Generalizes broadly"    | 10 repos (3+ cohorts)  | 20+ repos     |

### 5.2 Controlling Variables

- **Codebase quality**: Select repos with existing CI/tests
- **Issue clarity**: Ensure repos have actionable issues
- **Model consistency**: Use same LLM across all validations
- **Cycle duration**: Minimum 50 cycles per repo

### 5.3 Threats to Validity

| Threat                 | Mitigation                             |
| ---------------------- | -------------------------------------- |
| **Selection bias**     | Randomize within cohorts               |
| **Novelty effect**     | Require 50+ cycle burn-in              |
| **Human intervention** | Log all interventions                  |
| **Model variance**     | Lock model version                     |
| **Temporal drift**     | Batch evaluations within 2-week window |

---

## 6. arXiv Paper Integration

### 6.1 Claims We Can Make (with external validation)

**With 10+ external repos:**

> "ADA demonstrates generalization across diverse codebases, achieving ≥85% cycle success rate on repositories spanning TypeScript, Python, and multi-language monorepos."

**With 20+ external repos:**

> "Extensive external validation across 20 repositories in 3 languages shows ADA's role-based architecture transfers beyond its development context."

### 6.2 Section Updates Needed

| Section         | Current                     | Post-Validation                        |
| --------------- | --------------------------- | -------------------------------------- |
| 6. Experiments  | Self-dogfooding only        | + External validation cohorts          |
| 7. Results      | 794 cycles on self          | + Cohort success rates                 |
| 8.2 Limitations | "Generalization needed"     | "Initial external validation shows..." |
| 8.3 Future Work | External validation planned | (move to Results if validated)         |

### 6.3 Timeline Alignment

| Date   | Milestone                      | arXiv Impact                      |
| ------ | ------------------------------ | --------------------------------- |
| Feb 17 | Early Adopter Program launches | Data collection begins            |
| Feb 28 | First 50-cycle repos complete  | Preliminary results available     |
| Mar 7  | First draft due                | Include preliminary external data |
| Mar 14 | 100-cycle repos complete       | Stronger validation for revision  |
| Mar 28 | arXiv submission               | Final external validation claims  |

---

## 7. Recommended Early Adopter Selection

### 7.1 Criteria for Ideal Validation Repos

**Must have:**

- Active development (commits in last 30 days)
- Some test coverage (>0%)
- Clear issue backlog (5+ open issues)
- English documentation

**Should have:**

- CI pipeline configured
- Contributing guidelines
- At least 2 maintainers (for feedback)

**Nice to have:**

- npm/PyPI published (quality signal)
- Community activity (stars, forks)
- Diverse contributor base

### 7.2 Proposed Initial Cohort

| Cohort      | Language   | Domain        | Repos (Target) |
| ----------- | ---------- | ------------- | -------------- |
| A (Control) | TypeScript | CLI/Dev tools | 5              |
| B (Python)  | Python     | AI/Data       | 5              |
| C (Domain)  | Mixed      | Web apps      | 5              |
| D (Complex) | Multi-lang | Monorepos     | 3              |

**Total: 18 repos for Mar 28 submission**

### 7.3 Outreach Strategy

Leverage Early Adopter Program (C794):

1. **Auto-qualified**: Contributors, power users → Cohort A
2. **Community champions**: Discord active users → Cohorts B-D
3. **Open call**: "Help validate ADA on your repo"

---

## 8. Success Criteria Summary

### 8.1 Minimum (for arXiv inclusion)

- 5+ external repos evaluated
- ≥50 cycles per repo
- ≥75% cycle success rate average
- Qualitative owner feedback positive

### 8.2 Target (for strong claims)

- 10+ external repos evaluated
- ≥100 cycles per repo
- ≥85% cycle success rate average
- 2+ language cohorts represented

### 8.3 Stretch (for generalization claim)

- 20+ external repos evaluated
- ≥85% cycle success rate across ALL cohorts
- Statistically significant vs single-agent baseline

---

## 9. Next Steps

1. **Growth (C796+)**: Integrate validation criteria into Early Adopter selection
2. **Product**: Create validation dashboard for tracking
3. **Research**: Design detailed evaluation protocol for Cohort A (TypeScript)
4. **CEO**: Approve validation targets for arXiv timeline

---

## References

- Early Adopter Program (C794): `docs/community/early-adopter-program-c794.md`
- arXiv Outline (C785): `docs/research/arxiv-outline-c785.md`
- Self-Benchmark Analysis (C348): `docs/research/self-benchmark-analysis.md`
- Benchmark Execution Protocol (C408): `docs/research/sprint2-benchmark-execution-protocol-c408.md`

---

_This methodology provides the framework for addressing Section 8.2's generalization limitation. External validation data will strengthen the arXiv paper significantly._

🔬 _The Scout | Cycle 795 | External Validation Methodology_
