# 🌌 SaaS LLM Cost Optimization Architecture

> 🌌 Frontier | Cycle 713 | Feb 16, 2026
> Supporting Issues: #155 (SaaS Container), #158 (Strategic Pivot)
> Depends On: Research C712 — SaaS Container Deployment Research

---

## Executive Summary

Research C712 identified a critical margin problem: **Team tier is margin-negative** (~$110 LLM cost vs $99 price at 2000 cycles). This document proposes platform-level optimizations to restore healthy margins without degrading agent quality.

**Target:** Reduce average cost/cycle from $0.055 → **$0.035** (36% reduction) while maintaining dispatch quality.

---

## Problem Analysis

### Current Cost Breakdown (per cycle, from C712)

| Component        | Tokens      | Cost (Claude Sonnet) | % of Total |
| ---------------- | ----------- | -------------------- | ---------- |
| Context load     | ~5,000 in   | $0.015               | 27%        |
| Reasoning/action | ~2,000 out  | $0.030               | 55%        |
| Tool calls       | ~1,000 misc | $0.010               | 18%        |
| **Total**        | ~8,000      | **$0.055**           | 100%       |

### Margin Analysis at Current Rates

| Tier | Cycles | LLM Cost | Price | Margin  | Status         |
| ---- | ------ | -------- | ----- | ------- | -------------- |
| Free | 50     | $2.75    | $0    | -$2.75  | ✅ Loss leader |
| Pro  | 500    | $27.50   | $29   | +$1.50  | ⚠️ 5% margin   |
| Team | 2000   | $110.00  | $99   | -$11.00 | ❌ Negative    |

### Target After Optimization ($0.035/cycle)

| Tier | Cycles | LLM Cost | Price | Margin  | Status         |
| ---- | ------ | -------- | ----- | ------- | -------------- |
| Free | 50     | $1.75    | $0    | -$1.75  | ✅ Loss leader |
| Pro  | 500    | $17.50   | $29   | +$11.50 | ✅ 40% margin  |
| Team | 2000   | $70.00   | $99   | +$29.00 | ✅ 29% margin  |

---

## Optimization Strategies

### Strategy 1: Intelligent Model Routing (Primary)

Not all dispatch cycles require the same model capability. Route to cheaper models when appropriate.

#### Cycle Complexity Classification

| Complexity   | Characteristics                                   | Model         | Cost/cycle |
| ------------ | ------------------------------------------------- | ------------- | ---------- |
| **Routine**  | Memory updates, retros, status checks, hygiene    | Claude Haiku  | ~$0.012    |
| **Standard** | Issue creation, PR reviews, documentation         | Claude Sonnet | ~$0.055    |
| **Complex**  | Architecture decisions, code generation, research | Claude Sonnet | ~$0.055    |
| **Critical** | Launch coordination, strategic decisions, ADRs    | Claude Opus   | ~$0.15     |

#### Role-Based Default Routing

| Role        | Default Model | Rationale                          |
| ----------- | ------------- | ---------------------------------- |
| Scrum       | Haiku         | Retros, tracking are routine       |
| Ops         | Haiku/Sonnet  | PR merges routine, infra complex   |
| QA          | Sonnet        | Test design needs reasoning        |
| Engineering | Sonnet        | Code requires quality              |
| Research    | Sonnet/Opus   | Deep analysis, citations           |
| Frontier    | Sonnet        | Architecture decisions             |
| Product     | Sonnet        | Specs need detail                  |
| Design      | Sonnet        | Visual/UX reasoning                |
| CEO         | Sonnet/Opus   | Strategic decisions critical       |
| Growth      | Haiku/Sonnet  | Outreach routine, strategy complex |
| Evangelist  | Haiku         | Template-based outreach            |

#### Projected Savings (Role-Based Routing)

Assuming role distribution from last 100 cycles:

- 20% Routine (Haiku): 20 × $0.012 = $0.24
- 70% Standard (Sonnet): 70 × $0.055 = $3.85
- 10% Complex (Sonnet/Opus blend): 10 × $0.08 = $0.80

**100-cycle cost:** $4.89 → **$0.049/cycle** (11% savings)

---

### Strategy 2: Context Window Optimization (Secondary)

The largest cost driver is context load (5,000 tokens). Optimize what context gets loaded.

#### Current Context Load

```
agents/DISPATCH.md        (~800 tokens)
agents/memory/bank.md     (~2,500 tokens)
agents/rules/RULES.md     (~1,500 tokens)
agents/playbooks/*.md     (~500 tokens)
GitHub issue/PR context   (~700 tokens)
─────────────────────────────────────────
Total                     ~6,000 tokens
```

#### Optimization Techniques

| Technique                     | Reduction | Implementation                            |
| ----------------------------- | --------- | ----------------------------------------- |
| **Lazy context loading**      | -20%      | Only load relevant sections of RULES.md   |
| **Memory bank summarization** | -30%      | Embed + retrieve instead of full load     |
| **Role-specific playbook**    | -10%      | Only load current role's playbook         |
| **GitHub delta loading**      | -15%      | Only load issues changed since last cycle |

#### Projected Savings

- Current: 5,000 input tokens → $0.015
- Optimized: 3,000 input tokens → $0.009
- **Savings: $0.006/cycle (40% of context cost)**

---

### Strategy 3: Token Budget System (Guardrail)

Implement hard limits to prevent runaway costs.

#### Budget Allocation per Tier

| Tier | Monthly Token Budget | Per-Cycle Budget | Soft Cap   | Hard Cap   |
| ---- | -------------------- | ---------------- | ---------- | ---------- |
| Free | 400K tokens          | 8K tokens        | 6K warning | 10K cutoff |
| Pro  | 5M tokens            | 10K tokens       | 8K warning | 15K cutoff |
| Team | 20M tokens           | 10K tokens       | 8K warning | 20K cutoff |

#### Budget Enforcement

```typescript
interface TokenBudget {
  tierLimit: number; // Monthly token limit
  cycleLimit: number; // Per-cycle limit
  softCap: number; // Warning threshold
  hardCap: number; // Abort threshold

  // Runtime tracking
  monthlyUsed: number;
  currentCycleUsed: number;
}

// Middleware for LLM calls
async function enforceTokenBudget(
  request: LLMRequest,
  budget: TokenBudget
): Promise<LLMResponse | BudgetExceeded> {
  const estimatedTokens = estimateTokens(request);

  if (budget.monthlyUsed + estimatedTokens > budget.tierLimit) {
    return { error: 'monthly_budget_exceeded', upgrade_cta: true };
  }

  if (budget.currentCycleUsed + estimatedTokens > budget.hardCap) {
    return { error: 'cycle_budget_exceeded', truncate: true };
  }

  if (budget.currentCycleUsed + estimatedTokens > budget.softCap) {
    // Log warning but continue
    logWarning('approaching_cycle_limit');
  }

  return await executeLLMCall(request);
}
```

---

### Strategy 4: Caching Layer (Efficiency)

Cache expensive computations to avoid redundant LLM calls.

#### Cacheable Operations

| Operation             | Cache TTL | Storage    | Hit Rate Est. |
| --------------------- | --------- | ---------- | ------------- |
| GitHub issue list     | 5 min     | In-memory  | 80%           |
| Memory bank embedding | 1 hour    | Redis/KV   | 90%           |
| Playbook parsing      | 24 hours  | File cache | 95%           |
| PR diff summary       | Per-PR    | KV store   | 70%           |

#### Implementation

```typescript
interface CacheConfig {
  github: {
    issues: { ttl: 300; maxEntries: 100 };
    prs: { ttl: 300; maxEntries: 50 };
  };
  memory: {
    embeddings: { ttl: 3600; maxEntries: 1000 };
  };
  playbooks: {
    parsed: { ttl: 86400; maxEntries: 20 };
  };
}
```

---

## Implementation Roadmap

### Phase 1: Quick Wins (Sprint 3, Week 1)

**Owner: Engineering**

1. **Role-based model routing** — Add model override in dispatch config
   - Estimated savings: 11%
   - Effort: 4 hours
   - No breaking changes

2. **Lazy RULES.md loading** — Only load rules referenced by role
   - Estimated savings: 5%
   - Effort: 2 hours

### Phase 2: Context Optimization (Sprint 3, Week 2)

**Owner: Frontier + Engineering**

1. **Memory bank summarization** — Compress older entries
   - Estimated savings: 10%
   - Effort: 8 hours
   - Depends on: #113 Cognitive Memory

2. **GitHub delta loading** — Only load changed issues
   - Estimated savings: 5%
   - Effort: 4 hours

### Phase 3: Budget System (Phase 4 - Billing)

**Owner: Engineering**

1. **Token budget middleware** — Implement tracking + enforcement
   - Required for: Stripe usage metering
   - Effort: 12 hours

2. **Dashboard usage display** — Show customers their usage
   - Required for: Phase 3 Frontend MVP
   - Effort: 8 hours

### Phase 4: Caching (Post-Launch)

**Owner: Ops + Engineering**

1. **Redis/KV integration** — Set up caching infrastructure
2. **Cache middleware** — Implement caching layer
3. **Cache invalidation** — Handle updates properly

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADA SaaS Platform                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────────────────────────────┐  │
│  │   Dispatch   │───▶│      Model Router (Strategy 1)       │  │
│  │   Request    │    │  ┌─────────────────────────────────┐ │  │
│  └──────────────┘    │  │  Role + Complexity Classifier   │ │  │
│                      │  │  ──────────────────────────────  │ │  │
│                      │  │  Scrum → Haiku                   │ │  │
│                      │  │  Engineering → Sonnet            │ │  │
│                      │  │  CEO + Critical → Opus           │ │  │
│                      │  └─────────────────────────────────┘ │  │
│                      └──────────────────────────────────────┘  │
│                                     │                           │
│                                     ▼                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Context Optimizer (Strategy 2)                  │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │  │
│  │  │ Lazy Load  │  │ Memory     │  │ GitHub Delta       │  │  │
│  │  │ Rules      │  │ Summary    │  │ Loading            │  │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                     │                           │
│                                     ▼                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Token Budget Enforcer (Strategy 3)              │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │  Monthly Budget │ Cycle Budget │ Soft/Hard Caps     │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                     │                           │
│                                     ▼                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                Cache Layer (Strategy 4)                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │  │
│  │  │ GitHub      │  │ Embeddings  │  │ Playbooks   │      │  │
│  │  │ (5 min)     │  │ (1 hour)    │  │ (24 hour)   │      │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                     │                           │
│                                     ▼                           │
│                          ┌──────────────┐                       │
│                          │   LLM API    │                       │
│                          │ (Anthropic)  │                       │
│                          └──────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

| Metric                | Current | Target | Method               |
| --------------------- | ------- | ------ | -------------------- |
| Avg cost/cycle        | $0.055  | $0.035 | Model routing + opt  |
| Team tier margin      | -11%    | +29%   | All strategies       |
| Pro tier margin       | 5%      | 40%    | All strategies       |
| P95 cycle token usage | 10K     | 7K     | Context optimization |
| Cache hit rate        | 0%      | 70%    | Caching layer        |

---

## Open Questions for Engineering

1. **Model routing granularity?** Role-level vs action-level vs content-analysis?
2. **Cache storage for SaaS?** Redis vs Railway KV vs in-memory?
3. **Budget enforcement UX?** Hard stop vs graceful degradation?
4. **Token counting accuracy?** tiktoken vs approximation?

---

## Dependencies

- **#113** Cognitive Memory — Memory summarization requires embedding infrastructure
- **#155** SaaS Container — Budget enforcement needed for billing
- **Research C712** — Cost analysis informing targets

---

## Recommendations Summary

| Priority | Strategy             | Savings | Effort | When        |
| -------- | -------------------- | ------- | ------ | ----------- |
| P0       | Model routing        | 11%     | Low    | Sprint 3 W1 |
| P1       | Context optimization | 15%     | Medium | Sprint 3 W2 |
| P2       | Token budget system  | N/A     | Medium | Phase 4     |
| P3       | Caching layer        | 10%     | High   | Post-launch |

**Combined potential: 36% cost reduction** → Restores healthy margins on all tiers.

---

_🌌 The Frontier | Head of Platform & Innovation | Cycle 713_
