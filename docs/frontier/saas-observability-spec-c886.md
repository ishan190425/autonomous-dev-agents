# SaaS Observability & Telemetry Specification

> **Status:** DRAFT  
> **Author:** 🌌 Frontier (C886)  
> **Date:** 2026-02-18  
> **Related Issues:** #186 (Structured Logging), #178 (Distributed Tracing)  
> **Sprint:** 3 (SaaS Container)

---

## Executive Summary

As ADA transitions to a SaaS platform, observability becomes critical. This spec consolidates telemetry requirements for logging, tracing, and metrics — enabling debugging, performance monitoring, and operational excellence for managed agent execution.

---

## 1. Problem Statement

### Current State

- Agent output goes to stdout/stderr
- No structured format — hard to parse programmatically
- No correlation between cycles/actions
- No metrics collection
- No way to debug customer agent runs

### Target State

- Structured JSON logging with context propagation
- Distributed tracing across agent cycles
- Metrics dashboards for SaaS operations
- Customer-facing observability (their agent runs)

---

## 2. Requirements

### 2.1 Structured Logging (#186)

**Format:** JSON Lines (JSONL) for machine parsing

```json
{
  "timestamp": "2026-02-18T18:30:00.000Z",
  "level": "info",
  "message": "Cycle started",
  "context": {
    "cycleId": "886",
    "role": "frontier",
    "sessionId": "abc123",
    "traceId": "t-xyz789"
  },
  "metadata": {
    "repoPath": "/path/to/repo",
    "memoryVersion": 45
  }
}
```

**Log Levels:**
| Level | Use Case |
|-------|----------|
| `error` | Failures requiring attention |
| `warn` | Degraded performance, retry scenarios |
| `info` | Cycle milestones, significant events |
| `debug` | Detailed execution context |
| `trace` | Fine-grained debugging (verbose) |

**Context Propagation:**

- Every log entry includes `cycleId`, `role`, `sessionId`, `traceId`
- Enables filtering: "show all logs for cycle 886"
- Enables correlation: "trace this request across services"

**Output Modes:**

- `--json` flag: JSON Lines output (machine-readable)
- `--verbose` flag: Human-readable with timestamps
- Default: Clean human output (current behavior)

### 2.2 Distributed Tracing (#178)

**Purpose:** Track requests/cycles across service boundaries for SaaS.

**Tracing Model:**

```
Trace (t-xyz789)
├── Span: dispatch_start (12ms)
│   └── Span: validate_rotation (3ms)
├── Span: context_load (45ms)
│   ├── Span: read_memory_bank (15ms)
│   └── Span: read_playbook (8ms)
├── Span: agent_execution (3400ms)
│   ├── Span: llm_call (3200ms)
│   └── Span: parse_response (50ms)
└── Span: dispatch_complete (120ms)
    ├── Span: update_rotation (20ms)
    ├── Span: git_commit (80ms)
    └── Span: git_push (20ms)
```

**Span Attributes:**

- `cycle_id`: Current dispatch cycle
- `role`: Active role
- `action_type`: What's being done
- `repo`: Target repository
- `model`: LLM model used (if applicable)
- `tokens_in`, `tokens_out`: LLM usage
- `error`: Error type if failed

**W3C Trace Context:**

- Use standard `traceparent` header format
- Enables integration with external tracing systems
- Compatible with OpenTelemetry

### 2.3 Metrics

**Core Metrics:**

| Metric                       | Type      | Description              |
| ---------------------------- | --------- | ------------------------ |
| `ada_cycles_total`           | Counter   | Total cycles executed    |
| `ada_cycles_success`         | Counter   | Successful cycles        |
| `ada_cycles_failed`          | Counter   | Failed cycles            |
| `ada_cycle_duration_seconds` | Histogram | Cycle execution time     |
| `ada_llm_tokens_total`       | Counter   | Total LLM tokens used    |
| `ada_llm_cost_usd`           | Counter   | Estimated cost           |
| `ada_memory_compressions`    | Counter   | Memory bank compressions |
| `ada_git_operations`         | Counter   | Git operations by type   |

**Labels:**

- `role`: Which agent role
- `repo`: Repository path/name
- `outcome`: success/failure/partial
- `model`: LLM model used

**Export Formats:**

- Prometheus exposition format (scraping)
- OpenTelemetry Protocol (OTLP)
- JSON metrics endpoint

---

## 3. Architecture

### 3.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        ADA CLI                               │
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │   Logger    │   │   Tracer    │   │   Metrics   │       │
│  │  (JSONL)    │   │  (OTEL)     │   │ (Prometheus)│       │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘       │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           ▼                                  │
│                  ┌─────────────────┐                        │
│                  │ Telemetry Core  │                        │
│                  │ (@ada-ai/core)  │                        │
│                  └────────┬────────┘                        │
└───────────────────────────┼─────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  stdout  │  │  File    │  │  OTLP    │
        │  (CLI)   │  │ Rotation │  │ Endpoint │
        └──────────┘  └──────────┘  └──────────┘
```

### 3.2 Core Package API

**packages/core/src/telemetry/index.ts:**

```typescript
// Logger with context
export interface Logger {
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ): void;
  debug(message: string, metadata?: Record<string, unknown>): void;
  child(context: LogContext): Logger;
}

// Tracing
export interface Tracer {
  startSpan(name: string, attributes?: SpanAttributes): Span;
  getActiveSpan(): Span | undefined;
}

export interface Span {
  setAttribute(key: string, value: SpanAttributeValue): this;
  addEvent(name: string, attributes?: SpanAttributes): this;
  setStatus(status: SpanStatus): this;
  end(): void;
}

// Metrics
export interface Metrics {
  incrementCounter(
    name: string,
    labels?: Record<string, string>,
    value?: number
  ): void;
  recordHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void;
  getMetrics(): MetricExport;
}

// Factory
export function createTelemetry(config: TelemetryConfig): {
  logger: Logger;
  tracer: Tracer;
  metrics: Metrics;
};
```

### 3.3 Configuration

**ada.yaml:**

```yaml
telemetry:
  logging:
    level: info # error, warn, info, debug, trace
    format: text # text, json
    output: stdout # stdout, file, both
    filePath: ./ada.log # if output includes file
    maxFiles: 5 # rotation
    maxSize: 10mb # per file

  tracing:
    enabled: false # off by default for CLI
    exporter: console # console, otlp, jaeger
    endpoint: null # OTLP endpoint URL
    sampleRate: 1.0 # 0.0 to 1.0

  metrics:
    enabled: true # basic metrics always on
    exporter: none # none, prometheus, otlp
    endpoint: null # Prometheus pushgateway or OTLP
    interval: 60 # seconds between pushes
```

---

## 4. Implementation Phases

### Phase 1: Structured Logging (MVP)

**Effort:** 2-3 cycles  
**Scope:** #186

- [ ] Create `Logger` interface in core
- [ ] Implement JSON formatter
- [ ] Add `--json` and `--verbose` CLI flags
- [ ] Inject context (cycleId, role) into all log calls
- [ ] Update existing console.log calls to use Logger
- [ ] Tests for JSON output format

### Phase 2: Basic Metrics

**Effort:** 2 cycles

- [ ] Create `Metrics` interface in core
- [ ] Implement in-memory metrics collection
- [ ] Add `ada metrics` command to view local stats
- [ ] Track: cycles, duration, success rate
- [ ] Persist metrics to JSON file

### Phase 3: Distributed Tracing

**Effort:** 3-4 cycles  
**Scope:** #178

- [ ] Create `Tracer` interface in core
- [ ] Implement span creation/management
- [ ] Instrument dispatch flow (start, context, execute, complete)
- [ ] Add trace ID to all log entries
- [ ] Console trace output for debugging
- [ ] Optional OTLP export

### Phase 4: SaaS Integration

**Effort:** 2-3 cycles  
**Depends on:** SaaS backend

- [ ] Prometheus metrics endpoint
- [ ] OTLP trace export to managed service
- [ ] Per-customer trace isolation
- [ ] Dashboard integration

---

## 5. CLI Integration

### New Flags

```bash
# Logging
ada dispatch start --json              # JSON output
ada dispatch start --verbose           # Detailed human output
ada dispatch start --log-level debug   # Set log level

# Tracing
ada dispatch start --trace             # Enable tracing
ada dispatch start --trace-id abc123   # Continue existing trace

# Metrics
ada metrics                            # Show local metrics
ada metrics --reset                    # Reset counters
ada metrics --format json              # JSON output
```

### Environment Variables

```bash
ADA_LOG_LEVEL=debug
ADA_LOG_FORMAT=json
ADA_TRACE_ENABLED=true
ADA_TRACE_ENDPOINT=http://localhost:4318
ADA_METRICS_ENABLED=true
```

---

## 6. Security Considerations

### Data Sensitivity

**DO NOT LOG:**

- API keys, tokens, credentials
- Full LLM prompts (may contain sensitive data)
- Repository secrets
- Customer PII

**SAFE TO LOG:**

- Cycle IDs, roles, timestamps
- Token counts (not content)
- Error types (not full stack traces with secrets)
- Performance metrics

### Trace Data Isolation

For SaaS multi-tenancy:

- Each customer gets isolated trace namespace
- Traces include tenant ID as required attribute
- Access control at query layer

---

## 7. Success Criteria

### Phase 1 (Structured Logging)

- [ ] `ada dispatch start --json` produces valid JSONL
- [ ] Every log entry includes cycleId and role
- [ ] Existing CLI behavior unchanged without flags
- [ ] Documentation updated

### Full Implementation

- [ ] Can filter logs by cycle: `grep "cycleId\":\"886\""`
- [ ] Can trace full cycle execution in Jaeger/similar
- [ ] Dashboard shows cycles/hour, error rate, avg duration
- [ ] SaaS customers can view their agent traces

---

## 8. Open Questions

1. **Log retention policy?** How long to keep logs in SaaS?
2. **Metrics aggregation?** Per-repo vs per-org granularity?
3. **Sampling strategy?** 100% traces in dev, X% in prod?

---

## 9. References

- [OpenTelemetry JS](https://opentelemetry.io/docs/instrumentation/js/)
- [Pino Logger](https://getpino.io/) — Fast Node.js JSON logger
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Prometheus Naming Conventions](https://prometheus.io/docs/practices/naming/)

---

_This spec consolidates #186 (Structured Logging) and #178 (Distributed Tracing) into a unified observability strategy for ADA SaaS._
