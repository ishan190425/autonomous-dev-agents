# ADR: Observability Architecture for Sprint 3 SaaS

**Status:** Proposed  
**Date:** 2026-02-22  
**Author:** 🌌 The Frontier (C1116)  
**Related Issues:** #155 (SaaS Container), #189 (Managed Exec), #190 (API Gateway)

---

## Context

Sprint 3 (Mar 1-14) will deploy ADA as a production SaaS service. This includes:

- **Authentication:** GitHub OAuth (#181)
- **Billing:** Stripe subscriptions (#182)
- **Managed Execution:** Cloud-based cycle scheduling (#189)
- **API Gateway:** REST API for dashboard (#190)
- **Dashboard:** Web UI for monitoring agent teams

Production systems require observability to:

1. **Detect issues** before users report them
2. **Debug failures** when they occur
3. **Measure performance** for optimization
4. **Track costs** per customer/team
5. **Ensure SLA compliance** for paying customers

Current state: No observability infrastructure defined. Sprint 3 specs (C1086, C1106, C1109-C1112) cover functional requirements but not operational monitoring.

---

## Decision

Implement a three-pillar observability stack:

### 1. Metrics (Prometheus + Grafana)

**Infrastructure Metrics:**

```yaml
# Node-level
node_cpu_usage_percent
node_memory_usage_bytes
node_disk_usage_percent
node_network_io_bytes

# Container-level
container_cpu_usage_percent
container_memory_usage_bytes
container_restart_count
```

**Application Metrics:**

```yaml
# Dispatch cycles
ada_dispatch_cycles_total{team, role, outcome}  # Counter
ada_dispatch_cycle_duration_seconds{team, role}  # Histogram
ada_dispatch_queue_depth{team}                   # Gauge

# Memory operations
ada_memory_entries_total{team, operation}        # Counter
ada_memory_compression_duration_seconds{team}    # Histogram
ada_memory_bank_size_bytes{team}                 # Gauge

# API Gateway
ada_api_requests_total{method, endpoint, status} # Counter
ada_api_latency_seconds{method, endpoint}        # Histogram
ada_api_active_connections                       # Gauge

# Billing
ada_billing_events_total{type, plan}             # Counter
ada_billing_revenue_cents{plan}                  # Gauge
ada_billing_failed_payments_total                # Counter
```

**LLM-Specific Metrics:**

```yaml
# Token usage (critical for cost control)
ada_llm_tokens_input_total{model, team, role}    # Counter
ada_llm_tokens_output_total{model, team, role}   # Counter
ada_llm_cost_cents{model, team}                  # Counter

# Performance
ada_llm_latency_seconds{model, operation}        # Histogram
ada_llm_errors_total{model, error_type}          # Counter
ada_llm_rate_limit_hits_total{model}             # Counter
```

### 2. Logging (Structured JSON → Loki)

**Log Format:**

```json
{
  "timestamp": "2026-03-01T10:15:30.123Z",
  "level": "info",
  "service": "ada-dispatch",
  "team_id": "team_abc123",
  "cycle": 42,
  "role": "engineering",
  "message": "Dispatch cycle completed",
  "duration_ms": 45230,
  "tokens_used": 8542,
  "outcome": "success",
  "trace_id": "abc123def456",
  "span_id": "789xyz"
}
```

**Log Levels:**

- `error`: Failures requiring immediate attention
- `warn`: Degraded performance or retry situations
- `info`: Normal operations (cycle start/end, key events)
- `debug`: Detailed debugging (disabled in prod by default)

**Retention:**

- Hot (last 7 days): Full logs, fast query
- Warm (8-30 days): Compressed, slower query
- Cold (31-90 days): Archived, restore on demand
- Delete after 90 days (configurable per plan)

### 3. Tracing (OpenTelemetry → Jaeger/Tempo)

**Trace Hierarchy:**

```
[Dispatch Cycle]
├── [Load Context]
│   ├── [Read Rotation State]
│   ├── [Read Memory Bank]
│   └── [Read Playbook]
├── [Execute Action]
│   ├── [LLM Call: Generate Action]
│   ├── [GitHub API: Create Issue]
│   └── [GitHub API: Create PR]
├── [Update Memory]
│   ├── [Parse Changes]
│   └── [Write Memory Bank]
└── [Complete Dispatch]
    ├── [Update Rotation]
    └── [Git Commit/Push]
```

**Span Attributes:**

```yaml
# Common
service.name: "ada-dispatch" | "ada-api" | "ada-web"
team.id: "team_abc123"
team.name: "My Awesome Team"
user.id: "user_xyz789"

# Dispatch-specific
dispatch.cycle: 42
dispatch.role: "engineering"
dispatch.action: "feat(cli): add memory search"

# LLM-specific
llm.model: "claude-3-sonnet"
llm.tokens.input: 4500
llm.tokens.output: 2042
llm.cost_cents: 8.5
```

---

## Alerting Strategy

### Critical (PagerDuty, immediate)

- **Dispatch failure rate > 10%** for 5 minutes
- **API error rate (5xx) > 5%** for 5 minutes
- **Payment processing failures** (any)
- **Container OOM kills** (any)
- **Security events** (see C1106)

### Warning (Slack, 15-min delay)

- **Dispatch latency p95 > 2 minutes**
- **API latency p95 > 500ms**
- **Memory bank size > 500KB** (compression needed)
- **LLM cost per team > daily budget**
- **Queue depth > 10 cycles**

### Info (Daily digest)

- **Daily active teams**
- **Total cycles completed**
- **Token usage and costs**
- **Error rate trends**

---

## Dashboard Design

### Ops Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ ADA Platform Health                      [Last 24h ▼]       │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ Active Teams│ │ Cycles/Hour │ │ Error Rate  │ │ P95 Lat │ │
│ │     47      │ │    312      │ │   0.3%      │ │  42s    │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Dispatch Success Rate (7d rolling)          [████████░] 97% │
│ API Availability (7d rolling)               [█████████] 99.9│
│ LLM Cost Today: $127.45 / $200 budget       [██████░░░] 64% │
├─────────────────────────────────────────────────────────────┤
│ Recent Errors                                               │
│ • 12:42 team_xyz: Dispatch timeout (role: frontier)         │
│ • 11:15 team_abc: GitHub rate limit (retry succeeded)       │
└─────────────────────────────────────────────────────────────┘
```

### Customer Dashboard (per team)

```
┌─────────────────────────────────────────────────────────────┐
│ My Team: autonomous-dev-agents              [This Month ▼]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ Cycles      │ │ Success     │ │ Tokens Used │ │ Cost    │ │
│ │   1,116     │ │   99.2%     │ │   2.1M      │ │ $47.23  │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Role Distribution (last 30 cycles)                          │
│ engineering ████████░░ 8   qa ██████░░░░ 6   ops ████░░░░░ 4│
├─────────────────────────────────────────────────────────────┤
│ Recent Activity                                             │
│ • C1116 🌌 frontier: Created observability ADR              │
│ • C1115 🔬 research: Section 6 integration                  │
│ • C1114 🚀 growth: Dev log template                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Sprint 3 Week 1 (Mar 1-7)

| Day | Task                                                  | Owner       |
| --- | ----------------------------------------------------- | ----------- |
| 1   | Add OpenTelemetry SDK to `@ada-ai/core`               | Engineering |
| 1   | Define metric types in `packages/core/src/telemetry/` | Engineering |
| 2   | Instrument dispatch cycle with spans                  | Engineering |
| 2   | Add structured logging to dispatch                    | Engineering |
| 3   | Deploy Prometheus + Grafana to Vercel/Railway         | Ops         |
| 3   | Create Ops dashboard                                  | Ops         |
| 4   | Instrument API Gateway routes                         | Engineering |
| 5   | Add LLM token tracking hooks                          | Frontier    |
| 5   | Create customer dashboard template                    | Design      |

### Sprint 3 Week 2 (Mar 8-14)

| Day   | Task                            | Owner       |
| ----- | ------------------------------- | ----------- |
| 8     | Deploy Loki for log aggregation | Ops         |
| 9     | Configure alerting rules        | Ops         |
| 10    | Add cost tracking per team      | Engineering |
| 11    | Integration testing with QA     | QA          |
| 12    | Dashboard polish                | Design      |
| 13-14 | Buffer / bug fixes              | All         |

---

## Technology Choices

### Why OpenTelemetry?

- **Vendor-neutral:** Can export to any backend (Jaeger, Datadog, Honeycomb)
- **Industry standard:** Wide ecosystem, good docs
- **TypeScript support:** First-class `@opentelemetry/*` packages
- **Auto-instrumentation:** HTTP, Express, fetch built-in

### Why Prometheus + Grafana?

- **Free tier friendly:** Self-hosted or Grafana Cloud free tier
- **Battle-tested:** Industry standard for metrics
- **Query language (PromQL):** Powerful for dashboards and alerts
- **Ecosystem:** Wide alertmanager and exporter support

### Why Loki over Elasticsearch?

- **Resource efficient:** Doesn't index log content (cheaper)
- **Label-based:** Matches our structured logging approach
- **Grafana native:** Same UI for metrics + logs
- **Cost:** ~10x cheaper than Elasticsearch at scale

### Deployment Options

**Option A: Managed (Recommended for MVP)**

- Grafana Cloud Free (10K metrics, 50GB logs)
- Tempo Cloud (tracing)
- Estimated cost: $0-50/month to start

**Option B: Self-Hosted**

- Prometheus + Loki + Tempo + Grafana on Railway/Render
- More control, more maintenance
- Estimated cost: $20-100/month (compute)

---

## Cost Tracking Architecture

Critical for SaaS billing — track LLM costs per team:

```typescript
interface CostEvent {
  teamId: string;
  userId: string;
  timestamp: Date;
  operation: 'dispatch' | 'memory_search' | 'compression';
  model: string;
  tokensInput: number;
  tokensOutput: number;
  costCents: number;
}

// Aggregate for billing
interface TeamCostSummary {
  teamId: string;
  period: 'daily' | 'monthly';
  totalCostCents: number;
  cycleCount: number;
  averageCostPerCycle: number;
  breakdown: {
    model: string;
    costCents: number;
    percentage: number;
  }[];
}
```

Integration with Stripe:

- Metered billing on `ada_llm_cost_cents` metric
- Daily usage reports to Stripe
- Overage alerts before billing

---

## Security Considerations

Per C1106 (Runtime Security Model):

- **Logs:** No secrets, no PII in plain text
- **Metrics:** Team IDs are pseudonymous (not user emails)
- **Traces:** Span attributes sanitized before export
- **Access:** Grafana behind auth, team scoped dashboards

---

## Success Criteria

1. **Visibility:** Any production issue debuggable within 5 minutes
2. **Alerting:** Critical issues detected within 2 minutes
3. **Cost control:** Per-team LLM costs visible in real-time
4. **Performance:** Observability overhead < 5% latency impact
5. **Onboarding:** New team sees their dashboard within 1 minute of first cycle

---

## Open Questions

1. **Tracing sampling rate?** 100% for MVP, reduce later if volume high
2. **Log retention per plan?** Free: 7 days, Pro: 30 days, Enterprise: 90 days?
3. **Customer-facing error details?** How much to expose vs hide for security?

---

## References

- [OpenTelemetry JS](https://opentelemetry.io/docs/instrumentation/js/)
- [Grafana Cloud Pricing](https://grafana.com/pricing/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- C1086: Managed Execution Implementation Spec
- C1106: Runtime Security Model ADR
- C1109: Sprint 3 SaaS Test Strategy
- C1110: Sprint 3 Implementation Sequence
