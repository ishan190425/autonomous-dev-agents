# ADR: Agent Observability System

> **ID:** PLAT-003
> **Status:** Proposed
> **Author:** The Frontier 🌌
> **Date:** 2026-02-07
> **Relates to:** Issue #68 (SaaS Revenue), PLAT-002 (Memory Lifecycle)

---

## Context

ADA autonomous agent teams run without human supervision. As we move toward SaaS offerings (Issue #68), we need visibility into:

1. **Cost tracking** — Token usage, API costs per role/cycle
2. **Performance metrics** — Latency, success rates, throughput
3. **Behavioral analytics** — Which roles are productive? Which actions succeed?
4. **Debugging** — When things go wrong, trace the full decision path

Currently, we have no systematic observability:

- Token usage is invisible
- No latency tracking
- Success/failure is inferred from memory bank text
- Cost estimation is guesswork

This ADR proposes a lightweight observability system that enables data-driven optimization and supports SaaS pricing models.

---

## Decision

Implement a **structured observability layer** with three pillars: Metrics, Traces, and Analytics.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DISPATCH CYCLE                               │
│                                                                     │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐          │
│  │ Context     │───▶│ Action       │───▶│ Memory        │          │
│  │ Load        │    │ Execution    │    │ Update        │          │
│  └─────────────┘    └──────────────┘    └───────────────┘          │
│        │                   │                    │                   │
│        ▼                   ▼                    ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    OBSERVABILITY LAYER                       │   │
│  │  • Token counter   • Latency timer   • Outcome logger        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                               │                                     │
└───────────────────────────────┼─────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STORE                              │
│                                                                     │
│  agents/state/observability.json                                    │
│  ├── metrics: { tokens, latency, costs }                           │
│  ├── traces: [ { cycle, role, action, outcome } ]                  │
│  └── analytics: { roleStats, actionStats, trends }                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Pillar 1: Metrics

### Token Tracking

```typescript
interface TokenMetrics {
  cycle: number;
  role: string;
  timestamp: string;

  // Input tokens (what the agent reads)
  input: {
    memoryBank: number; // bank.md tokens
    playbook: number; // role playbook tokens
    githubContext: number; // issues/PRs tokens
    semanticRetrieval: number; // retrieved memories
    total: number;
  };

  // Output tokens (what the agent generates)
  output: {
    reasoning: number; // thinking/planning
    actions: number; // code, docs, comments
    memoryUpdate: number; // bank.md updates
    total: number;
  };

  // Cost estimation
  cost: {
    inputCostUsd: number; // input tokens × rate
    outputCostUsd: number; // output tokens × rate
    totalCostUsd: number;
    model: string; // which model was used
  };
}
```

### Latency Tracking

```typescript
interface LatencyMetrics {
  cycle: number;
  role: string;

  // Phase timings (milliseconds)
  phases: {
    contextLoad: number; // Reading bank, playbook, GitHub
    semanticSearch: number; // Vector retrieval (if used)
    actionPlanning: number; // Deciding what to do
    actionExecution: number; // Creating PRs, issues, code
    memoryUpdate: number; // Updating bank.md
    stateUpdate: number; // rotation.json update
    gitCommit: number; // Commit and push
  };

  totalMs: number;

  // API call breakdown
  apiCalls: {
    github: { count: number; totalMs: number };
    llm: { count: number; totalMs: number };
    embedding: { count: number; totalMs: number };
  };
}
```

---

## Pillar 2: Traces

Each dispatch cycle produces a structured trace for debugging and analysis.

```typescript
interface DispatchTrace {
  traceId: string; // Unique ID: cycle-{n}-{role}-{timestamp}
  cycle: number;
  role: string;
  timestamp: string;

  // Decision context
  context: {
    memoryBankVersion: number;
    openIssues: number;
    openPRs: number;
    blockers: string[];
    activeThreads: string[];
  };

  // What the agent decided to do
  decision: {
    actionType: string; // 'create_issue' | 'create_pr' | 'comment' | 'merge' | ...
    target: string; // Issue/PR number or file path
    rationale: string; // Why this action (1-2 sentences)
    confidence: number; // 0.0-1.0 self-assessed confidence
  };

  // Outcome
  outcome: {
    status: 'success' | 'partial' | 'failed' | 'skipped';
    artifacts: string[]; // Created issues, PRs, files
    errors: string[]; // Any errors encountered
  };

  // Metrics embedded in trace
  metrics: {
    tokens: TokenMetrics;
    latency: LatencyMetrics;
  };
}
```

### Trace Storage

- **Hot traces:** Last 20 cycles in `agents/state/traces.json`
- **Archived traces:** Older traces compressed to `agents/state/traces-archive/YYYY-MM.json`
- **Retention:** 100 cycles in hot storage, 1000 in archives

---

## Pillar 3: Analytics

Aggregated insights computed from traces and metrics.

```typescript
interface RoleAnalytics {
  role: string;

  // Activity
  totalCycles: number;
  lastActive: string;

  // Efficiency
  avgTokensPerCycle: number;
  avgLatencyMs: number;
  avgCostUsd: number;

  // Effectiveness
  successRate: number; // successful outcomes / total actions
  actionBreakdown: {
    [actionType: string]: {
      count: number;
      successRate: number;
      avgLatencyMs: number;
    };
  };

  // Trends (last 10 cycles)
  trends: {
    tokenUsage: 'increasing' | 'stable' | 'decreasing';
    successRate: 'improving' | 'stable' | 'declining';
    latency: 'faster' | 'stable' | 'slower';
  };
}

interface TeamAnalytics {
  totalCycles: number;
  totalCostUsd: number;
  avgCostPerCycle: number;

  // Role comparison
  roleRankings: {
    mostActive: string;
    mostEfficient: string; // lowest cost per success
    highestSuccessRate: string;
    fastestAvgLatency: string;
  };

  // Project health
  projectHealth: {
    prVelocity: number; // PRs merged per 10 cycles
    issueVelocity: number; // Issues closed per 10 cycles
    blockerClearRate: number; // How fast blockers resolve
  };
}
```

---

## CLI Integration

### New Commands

```bash
# Show current cycle metrics
ada observe metrics [--role <role>] [--cycles <n>]

# Show trace for a specific cycle
ada observe trace <cycle>

# Show role analytics
ada observe analytics [--role <role>]

# Show team dashboard
ada observe dashboard

# Export metrics for external tools (JSON/CSV)
ada observe export --format json --output metrics.json
```

### Example Output

```
$ ada observe dashboard

📊 ADA Team Dashboard (Cycle 119)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Cost Tracking
   Total (last 20 cycles):    $2.34
   Avg per cycle:             $0.117
   Most expensive role:       Engineering ($0.18/cycle)
   Most efficient role:       Scrum ($0.06/cycle)

⏱️  Latency
   Avg cycle time:            45.2s
   Fastest phase:             State Update (120ms)
   Slowest phase:             Action Execution (28.4s)

✅ Success Rates
   Overall:                   94.2%
   Best performer:            QA (100%)
   Needs attention:           Growth (85%)

📈 Trends (last 10 cycles)
   Token usage:               ↓ decreasing (-12%)
   Success rate:              → stable
   Latency:                   ↓ faster (-8%)
```

---

## Implementation Plan

| Phase | Work                                  | Effort   | Priority |
| ----- | ------------------------------------- | -------- | -------- |
| 1     | Token counter (input/output tracking) | 2 cycles | P1       |
| 2     | Latency timer (phase breakdown)       | 1 cycle  | P1       |
| 3     | Trace structure + storage             | 2 cycles | P1       |
| 4     | Role analytics aggregation            | 2 cycles | P2       |
| 5     | CLI commands (`ada observe`)          | 3 cycles | P2       |
| 6     | Dashboard visualization               | 2 cycles | P3       |
| 7     | Export for external tools             | 1 cycle  | P3       |

**Total:** ~13 cycles (Sprint 2-3)

---

## Integration Points

### Dispatch Protocol

Modify `DISPATCH.md` to include observability hooks:

```
Phase 1: Context Load → START_TIMER('contextLoad'), COUNT_TOKENS()
Phase 3: Execute → LOG_ACTION(), TRACK_OUTCOME()
Phase 7: State Update → EMIT_TRACE(), UPDATE_ANALYTICS()
```

### Memory Lifecycle (PLAT-002)

Observability feeds into memory lifecycle:

- High-access traces get promoted to hot memory
- Lessons from failed traces are extracted automatically
- Analytics inform memory compression priorities

### SaaS Pricing (Issue #68)

Observability enables accurate cost-based pricing:

- Per-cycle cost tracking → usage-based billing
- Role efficiency data → tier differentiation
- Success rate metrics → SLA guarantees

---

## Success Criteria

| Metric                  | Target                  |
| ----------------------- | ----------------------- |
| Token tracking accuracy | ±5% of actual API usage |
| Latency overhead        | <100ms per cycle        |
| Trace completeness      | 100% of cycles captured |
| Analytics freshness     | Updated every cycle     |
| Storage efficiency      | <1MB per 100 cycles     |

---

## Risks & Mitigations

| Risk                 | Mitigation                               |
| -------------------- | ---------------------------------------- |
| Performance overhead | Async logging, batch writes              |
| Storage bloat        | Aggressive compression, rolling windows  |
| Privacy concerns     | No PII in traces, sanitize code snippets |
| Complexity creep     | Start minimal (metrics only), iterate    |

---

## Alternatives Considered

1. **External APM (Datadog, Honeycomb)** — Too heavy, adds dependencies
2. **LLM-only analysis** — Unreliable, expensive for real-time metrics
3. **No observability** — Unacceptable for SaaS, debugging blind

---

## References

- [OpenTelemetry for AI Agents](https://opentelemetry.io) — Standard we'll align with
- [Anthropic's Claude Metrics](https://docs.anthropic.com/en/api/messages) — Token counting reference
- Issue #68 — SaaS Revenue Strategy (cost tracking requirement)
- PLAT-002 — Memory Lifecycle (integration point)

---

_🌌 The Frontier — Cycle 119_
