# Platform Observability & Structured Logging Specification

> **Author:** 🌌 Frontier (C1076)
> **Date:** 2026-02-21
> **Status:** Draft — Sprint 3 Implementation
> **Related:** #155 (SaaS Container), #186 (Structured Logging), #189 (Managed Execution), #190 (API Gateway)

---

## Overview

This specification defines the observability architecture for the ADA SaaS platform. It covers structured logging, metrics collection, distributed tracing, and dashboard requirements for multi-tenant managed agent execution.

### Goals

1. **Operational visibility** — Know what's happening in real-time across all tenants
2. **Debugging capability** — Trace any dispatch cycle from request to completion
3. **Cost attribution** — Track token usage and compute costs per tenant/cycle
4. **Performance monitoring** — Identify bottlenecks, slow cycles, and anomalies
5. **Compliance readiness** — Audit trail for all agent actions

### Non-Goals

- Real-time alerting (Phase 2)
- Log aggregation infrastructure setup (uses existing providers)
- User-facing analytics dashboard (separate spec)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        ADA SaaS Platform                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   API GW    │  │  Dispatch   │  │  Container  │              │
│  │   (REST)    │──│  Scheduler  │──│  Executor   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Observability Layer                          │   │
│  ├─────────────────┬─────────────────┬─────────────────────┤   │
│  │    Structured   │     Metrics     │    Distributed      │   │
│  │      Logging    │    Collection   │     Tracing         │   │
│  └────────┬────────┴────────┬────────┴────────┬────────────┘   │
│           │                 │                 │                  │
└───────────┼─────────────────┼─────────────────┼──────────────────┘
            ▼                 ▼                 ▼
     ┌──────────┐      ┌──────────┐      ┌──────────┐
     │  stdout  │      │ Metrics  │      │  Trace   │
     │  (JSON)  │      │ Endpoint │      │ Context  │
     └──────────┘      └──────────┘      └──────────┘
```

---

## 1. Structured Logging

### Log Format (JSON Lines)

All logs MUST be structured JSON. Each log entry includes:

```typescript
interface LogEntry {
  // Required fields
  timestamp: string; // ISO 8601 with milliseconds
  level: LogLevel; // error | warn | info | debug | trace
  message: string; // Human-readable message

  // Context fields (when available)
  tenantId?: string; // Multi-tenant identifier
  cycleId?: string; // Dispatch cycle UUID
  roleId?: string; // ceo | engineering | qa | etc.
  requestId?: string; // API request correlation ID

  // Error fields (when level = error)
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };

  // Performance fields (when applicable)
  durationMs?: number; // Operation duration
  tokensUsed?: number; // LLM tokens consumed

  // Arbitrary context
  context?: Record<string, unknown>;
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
```

### Log Level Guidelines

| Level   | Use Case                                           | Production  |
| ------- | -------------------------------------------------- | ----------- |
| `error` | Failures requiring attention, exceptions           | ✅ Always   |
| `warn`  | Degraded performance, retry succeeded, deprecation | ✅ Always   |
| `info`  | Cycle start/complete, major state changes          | ✅ Always   |
| `debug` | Detailed flow, intermediate states                 | ⚪ Optional |
| `trace` | Raw API responses, full payloads                   | ❌ Never    |

### Example Log Entries

**Dispatch cycle started:**

```json
{
  "timestamp": "2026-02-21T23:30:00.123Z",
  "level": "info",
  "message": "Dispatch cycle started",
  "tenantId": "tenant_abc123",
  "cycleId": "cycle_xyz789",
  "roleId": "engineering",
  "context": {
    "cycleNumber": 1076,
    "memoryVersion": 53,
    "playbook": "engineering.md"
  }
}
```

**LLM call completed:**

```json
{
  "timestamp": "2026-02-21T23:30:15.456Z",
  "level": "info",
  "message": "LLM call completed",
  "tenantId": "tenant_abc123",
  "cycleId": "cycle_xyz789",
  "durationMs": 12450,
  "tokensUsed": 8234,
  "context": {
    "model": "claude-sonnet-4-20250514",
    "promptTokens": 6100,
    "completionTokens": 2134
  }
}
```

**Error with context:**

```json
{
  "timestamp": "2026-02-21T23:30:20.789Z",
  "level": "error",
  "message": "GitHub API rate limit exceeded",
  "tenantId": "tenant_abc123",
  "cycleId": "cycle_xyz789",
  "error": {
    "name": "RateLimitError",
    "message": "API rate limit exceeded. Retry after 60s.",
    "code": "GITHUB_RATE_LIMIT"
  },
  "context": {
    "endpoint": "/repos/owner/repo/issues",
    "retryAfter": 60
  }
}
```

### Logger Implementation

```typescript
// packages/core/src/observability/logger.ts

import { LogEntry, LogLevel } from './types';

export class StructuredLogger {
  private context: Partial<LogEntry> = {};

  constructor(private options: LoggerOptions = {}) {}

  // Create child logger with additional context
  child(context: Partial<LogEntry>): StructuredLogger {
    const child = new StructuredLogger(this.options);
    child.context = { ...this.context, ...context };
    return child;
  }

  // Set tenant/cycle context for all subsequent logs
  withTenant(tenantId: string): this {
    this.context.tenantId = tenantId;
    return this;
  }

  withCycle(cycleId: string, roleId: string): this {
    this.context.cycleId = cycleId;
    this.context.roleId = roleId;
    return this;
  }

  // Log methods
  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    this.log('error', message, { error: this.serializeError(error), context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, { context });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, { context });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.options.level === 'debug' || this.options.level === 'trace') {
      this.log('debug', message, { context });
    }
  }

  private log(
    level: LogLevel,
    message: string,
    extra: Partial<LogEntry>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...extra,
    };

    // JSON Lines output
    console.log(JSON.stringify(entry));
  }

  private serializeError(error?: Error): LogEntry['error'] | undefined {
    if (!error) return undefined;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    };
  }
}

// Global logger instance
export const logger = new StructuredLogger({
  level: process.env.LOG_LEVEL || 'info',
});
```

### Environment Variables

| Variable     | Description                             | Default |
| ------------ | --------------------------------------- | ------- |
| `LOG_LEVEL`  | Minimum log level to output             | `info`  |
| `LOG_FORMAT` | Output format (`json` or `pretty`)      | `json`  |
| `LOG_PRETTY` | Pretty-print JSON (development only)    | `false` |
| `NO_COLOR`   | Disable color output (CI compatibility) | `false` |

---

## 2. Metrics Collection

### Metric Types

1. **Counters** — Cumulative values (total cycles, total errors)
2. **Gauges** — Point-in-time values (active cycles, memory usage)
3. **Histograms** — Distribution of values (cycle duration, token usage)

### Core Metrics

```typescript
// packages/core/src/observability/metrics.ts

interface MetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  description: string;
  labels: string[];
  unit?: string;
}

const METRICS: MetricDefinition[] = [
  // Dispatch metrics
  {
    name: 'ada_dispatch_cycles_total',
    type: 'counter',
    description: 'Total number of dispatch cycles',
    labels: ['tenant_id', 'role_id', 'outcome'],
  },
  {
    name: 'ada_dispatch_duration_seconds',
    type: 'histogram',
    description: 'Dispatch cycle duration',
    labels: ['tenant_id', 'role_id'],
    unit: 'seconds',
  },
  {
    name: 'ada_dispatch_active',
    type: 'gauge',
    description: 'Currently active dispatch cycles',
    labels: ['tenant_id'],
  },

  // LLM metrics
  {
    name: 'ada_llm_tokens_total',
    type: 'counter',
    description: 'Total LLM tokens consumed',
    labels: ['tenant_id', 'role_id', 'model', 'token_type'],
  },
  {
    name: 'ada_llm_calls_total',
    type: 'counter',
    description: 'Total LLM API calls',
    labels: ['tenant_id', 'model', 'status'],
  },
  {
    name: 'ada_llm_latency_seconds',
    type: 'histogram',
    description: 'LLM API call latency',
    labels: ['tenant_id', 'model'],
    unit: 'seconds',
  },

  // Memory metrics
  {
    name: 'ada_memory_size_bytes',
    type: 'gauge',
    description: 'Memory bank size in bytes',
    labels: ['tenant_id', 'memory_type'],
  },
  {
    name: 'ada_memory_compressions_total',
    type: 'counter',
    description: 'Total memory compressions',
    labels: ['tenant_id'],
  },

  // GitHub metrics
  {
    name: 'ada_github_api_calls_total',
    type: 'counter',
    description: 'Total GitHub API calls',
    labels: ['tenant_id', 'endpoint', 'status'],
  },
  {
    name: 'ada_github_rate_limit_remaining',
    type: 'gauge',
    description: 'GitHub API rate limit remaining',
    labels: ['tenant_id'],
  },

  // Container metrics (SaaS)
  {
    name: 'ada_container_cpu_seconds_total',
    type: 'counter',
    description: 'Container CPU time consumed',
    labels: ['tenant_id', 'cycle_id'],
  },
  {
    name: 'ada_container_memory_bytes',
    type: 'gauge',
    description: 'Container memory usage',
    labels: ['tenant_id', 'cycle_id'],
  },
];
```

### Metrics Endpoint

Expose Prometheus-compatible metrics at `/metrics`:

```typescript
// apps/api/src/routes/metrics.ts

import { Router } from 'express';
import { collectDefaultMetrics, Registry } from 'prom-client';

const registry = new Registry();
collectDefaultMetrics({ register: registry });

// Custom ADA metrics registration
// ... (register METRICS from above)

export const metricsRouter = Router();

metricsRouter.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
});
```

### Billing-Critical Metrics

For cost attribution and billing (#182), these metrics are mandatory:

| Metric                       | Billing Use                     |
| ---------------------------- | ------------------------------- |
| `ada_llm_tokens_total`       | Token-based pricing             |
| `ada_dispatch_cycles_total`  | Per-cycle pricing               |
| `ada_container_cpu_seconds`  | Compute pricing (if applicable) |
| `ada_github_api_calls_total` | API usage tracking              |

---

## 3. Distributed Tracing

### Trace Context Propagation

Every request gets a trace context that propagates through all operations:

```typescript
// packages/core/src/observability/tracing.ts

interface TraceContext {
  traceId: string; // Unique trace identifier (UUID)
  spanId: string; // Current span identifier
  parentSpanId?: string; // Parent span (if nested)
  tenantId?: string; // Tenant context
  cycleId?: string; // Dispatch cycle context
}

// Generate new trace context
function createTraceContext(): TraceContext {
  return {
    traceId: crypto.randomUUID(),
    spanId: crypto.randomUUID().substring(0, 16),
  };
}

// Create child span
function createChildSpan(parent: TraceContext): TraceContext {
  return {
    traceId: parent.traceId,
    spanId: crypto.randomUUID().substring(0, 16),
    parentSpanId: parent.spanId,
    tenantId: parent.tenantId,
    cycleId: parent.cycleId,
  };
}
```

### Span Logging

Each significant operation logs a span:

```json
{
  "timestamp": "2026-02-21T23:30:00.123Z",
  "level": "info",
  "message": "span.start",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "spanId": "1234567890abcdef",
  "spanName": "dispatch.execute",
  "tenantId": "tenant_abc123",
  "cycleId": "cycle_xyz789"
}

{
  "timestamp": "2026-02-21T23:30:15.456Z",
  "level": "info",
  "message": "span.end",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "spanId": "1234567890abcdef",
  "spanName": "dispatch.execute",
  "durationMs": 15333,
  "status": "ok"
}
```

### Key Spans

| Span Name             | Description                   |
| --------------------- | ----------------------------- |
| `api.request`         | Full API request lifecycle    |
| `dispatch.schedule`   | Dispatch scheduling decision  |
| `dispatch.execute`    | Full dispatch cycle execution |
| `dispatch.phase.*`    | Individual dispatch phases    |
| `container.provision` | Container spin-up             |
| `container.execute`   | Code execution in container   |
| `llm.call`            | LLM API call                  |
| `github.api`          | GitHub API call               |
| `memory.read`         | Memory bank read              |
| `memory.write`        | Memory bank write             |
| `memory.compress`     | Memory compression            |

---

## 4. Dashboard Requirements

### Operator Dashboard (Internal)

For ADA platform operators (Phase 1 priority):

**System Health Panel:**

- Active tenants count
- Active dispatch cycles (gauge)
- Error rate (last 5 min, 1 hour)
- API latency p50/p95/p99

**Per-Tenant View:**

- Cycle count (today, week, month)
- Token usage breakdown by role
- Error log (filterable)
- Cost accumulation

**Real-Time Feed:**

- Live cycle completions
- Errors with stack traces
- Rate limit warnings

### Tenant Dashboard (User-Facing)

For ADA SaaS customers (Phase 2):

**Usage Overview:**

- Cycles run (current billing period)
- Tokens consumed (with breakdown)
- Estimated cost

**Cycle History:**

- Recent cycles with outcomes
- Filter by role, date, outcome
- Drill-down to cycle details

**Health Indicators:**

- Last successful cycle
- Consecutive cycle streak
- Memory bank health

---

## 5. Implementation Phases

### Phase 1: Core Logging (Sprint 3, Week 1)

- [ ] Implement `StructuredLogger` class
- [ ] Add logging to dispatch lifecycle
- [ ] Add logging to LLM calls
- [ ] JSON Lines output to stdout
- [ ] LOG_LEVEL environment variable

### Phase 2: Metrics (Sprint 3, Week 2)

- [ ] Add prom-client dependency
- [ ] Implement core metrics
- [ ] `/metrics` endpoint
- [ ] Billing-critical metrics verified

### Phase 3: Tracing (Sprint 3, Week 3)

- [ ] Trace context propagation
- [ ] Span logging for key operations
- [ ] Request ID in API responses

### Phase 4: Dashboard (Sprint 4)

- [ ] Operator dashboard (internal)
- [ ] Tenant dashboard (user-facing)
- [ ] Alerting rules

---

## 6. Integration with SaaS Container

Per the Container-per-Dispatch ADR (C1066), observability integrates as follows:

**Container logs:**

- Container stdout → JSON Lines
- Container stderr → Error logging
- Log forwarding to aggregator

**Container metrics:**

- CPU/memory from container runtime
- Injected into metrics endpoint

**Trace propagation:**

- Trace context passed to container via env vars
- Container includes traceId in all logs

```typescript
// Container execution with observability
async function executeInContainer(
  cycle: DispatchContext,
  trace: TraceContext
): Promise<CycleResult> {
  const span = createChildSpan(trace);

  logger.info('span.start', {
    spanName: 'container.execute',
    traceId: span.traceId,
    spanId: span.spanId,
    cycleId: cycle.cycleId,
  });

  const container = await provisionContainer({
    env: {
      TRACE_ID: span.traceId,
      SPAN_ID: span.spanId,
      TENANT_ID: cycle.tenantId,
      CYCLE_ID: cycle.cycleId,
    },
  });

  // ... execution ...

  logger.info('span.end', {
    spanName: 'container.execute',
    traceId: span.traceId,
    spanId: span.spanId,
    durationMs: elapsed,
    status: result.success ? 'ok' : 'error',
  });

  return result;
}
```

---

## 7. Success Metrics

| Metric                          | Target          |
| ------------------------------- | --------------- |
| Log format compliance           | 100% JSON Lines |
| Metrics endpoint availability   | 99.9% uptime    |
| Trace coverage (key operations) | 100%            |
| Log search latency              | < 2s for 7 days |
| Cost attribution accuracy       | 99%+ per tenant |

---

## Appendix: Error Codes

Standardized error codes for structured logging:

| Code                     | Description                    |
| ------------------------ | ------------------------------ |
| `DISPATCH_LOCK_HELD`     | Dispatch lock already held     |
| `DISPATCH_ROLE_MISMATCH` | Wrong role attempting dispatch |
| `LLM_RATE_LIMIT`         | LLM provider rate limited      |
| `LLM_CONTEXT_OVERFLOW`   | Context window exceeded        |
| `GITHUB_RATE_LIMIT`      | GitHub API rate limited        |
| `GITHUB_AUTH_FAILED`     | GitHub authentication failed   |
| `MEMORY_CORRUPT`         | Memory bank failed to parse    |
| `CONTAINER_TIMEOUT`      | Container execution timed out  |
| `CONTAINER_OOM`          | Container out of memory        |
| `BILLING_LIMIT`          | Tenant billing limit reached   |

---

_This spec enables Sprint 3 SaaS observability. Engineering should implement in parallel with managed execution (#189)._
