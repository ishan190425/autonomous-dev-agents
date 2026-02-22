# LLM Token Tracking Implementation Spec

**Status:** Proposed  
**Date:** 2026-02-22  
**Author:** 🌌 The Frontier (C1126)  
**Related Issues:** #155 (SaaS Container), #182 (Billing), #189 (Managed Exec)  
**Dependencies:** C1116 (Observability Architecture ADR)

---

## Context

Sprint 3 introduces metered billing for ADA SaaS. Customers pay based on LLM usage. The observability ADR (C1116) defines:

```yaml
ada_llm_tokens_input_total{model, team, role}    # Counter
ada_llm_tokens_output_total{model, team, role}   # Counter
ada_llm_cost_cents{model, team}                  # Counter
```

**This spec defines HOW to capture these metrics** — the hook architecture, provider-specific extraction, cost calculation, and integration points.

---

## Design Goals

1. **Provider-agnostic:** Works with Claude (Anthropic), GPT (OpenAI), local models
2. **Zero runtime overhead:** Hooks are lightweight, async where possible
3. **Accurate billing:** Every token counted, no leaks
4. **Testable:** Hooks can be mocked for unit tests
5. **Observable:** Token events visible in traces and logs

---

## Architecture

### Token Tracking Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     LLM Call (Executor)                         │
│                                                                 │
│  1. Pre-call hook       2. LLM API call     3. Post-call hook   │
│  ┌─────────────┐        ┌─────────────┐     ┌─────────────┐     │
│  │ Start span  │───────▶│ Claude/GPT  │────▶│ Extract     │     │
│  │ Log request │        │ API request │     │ token usage │     │
│  └─────────────┘        └─────────────┘     └─────────────┘     │
│                                                    │            │
│                                             ┌──────▼──────┐     │
│                                             │ TokenEvent  │     │
│                                             └──────┬──────┘     │
└────────────────────────────────────────────────────│────────────┘
                                                     │
                    ┌────────────────────────────────┼────────────┐
                    │                                │            │
              ┌─────▼─────┐    ┌─────────────┐    ┌──▼────────┐   │
              │  Metrics  │    │   Tracer    │    │  Logger   │   │
              │ Collector │    │ (span attr) │    │ (JSON)    │   │
              └─────┬─────┘    └─────────────┘    └───────────┘   │
                    │                                             │
              ┌─────▼─────┐                                       │
              │ Cost Agg  │◀──────────────────────────────────────┘
              │ (billing) │
              └───────────┘
```

### Core Interfaces

```typescript
// packages/core/src/telemetry/token-tracking.ts

/**
 * Raw token usage from an LLM provider response.
 * Provider-specific extractors normalize to this format.
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number; // Claude prompt caching
  cacheCreationTokens?: number;
}

/**
 * Complete token event with context for billing and observability.
 */
export interface TokenEvent {
  // Identity
  teamId: string;
  userId?: string;

  // Context
  timestamp: Date;
  traceId?: string;
  spanId?: string;

  // Operation
  operation: 'dispatch' | 'memory_search' | 'memory_compress' | 'custom';
  role?: string;
  cycle?: number;

  // Usage
  model: string;
  provider: 'anthropic' | 'openai' | 'local' | 'unknown';
  usage: TokenUsage;

  // Cost (computed)
  costCents: number;

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated cost summary for billing periods.
 */
export interface CostSummary {
  teamId: string;
  periodStart: Date;
  periodEnd: Date;

  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheTokens: number;
  totalCostCents: number;

  cycleCount: number;
  operationBreakdown: Record<string, number>; // operation → costCents
  modelBreakdown: Record<string, number>; // model → costCents
}
```

---

## Provider-Specific Token Extraction

### Anthropic (Claude)

```typescript
// packages/core/src/telemetry/providers/anthropic.ts

import type { TokenUsage } from '../token-tracking.js';

/**
 * Extract token usage from Anthropic API response.
 *
 * Response structure:
 * {
 *   "usage": {
 *     "input_tokens": 1234,
 *     "output_tokens": 567,
 *     "cache_creation_input_tokens": 100,
 *     "cache_read_input_tokens": 200
 *   }
 * }
 */
export function extractAnthropicUsage(response: unknown): TokenUsage | null {
  const usage = (response as { usage?: Record<string, number> })?.usage;
  if (!usage) return null;

  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens,
    cacheCreationTokens: usage.cache_creation_input_tokens,
  };
}

/**
 * Anthropic pricing (as of Feb 2026).
 * Prices in cents per 1M tokens.
 */
export const ANTHROPIC_PRICING: Record<
  string,
  { input: number; output: number; cacheRead?: number }
> = {
  'claude-3-5-sonnet-20241022': { input: 300, output: 1500, cacheRead: 30 },
  'claude-3-5-haiku-20241022': { input: 80, output: 400, cacheRead: 8 },
  'claude-3-opus-20240229': { input: 1500, output: 7500, cacheRead: 150 },
  'claude-3-sonnet-20240229': { input: 300, output: 1500, cacheRead: 30 },
  'claude-3-haiku-20240307': { input: 25, output: 125, cacheRead: 2.5 },
  // Default fallback
  default: { input: 300, output: 1500, cacheRead: 30 },
};
```

### OpenAI (GPT)

```typescript
// packages/core/src/telemetry/providers/openai.ts

import type { TokenUsage } from '../token-tracking.js';

/**
 * Extract token usage from OpenAI API response.
 *
 * Response structure:
 * {
 *   "usage": {
 *     "prompt_tokens": 1234,
 *     "completion_tokens": 567,
 *     "total_tokens": 1801
 *   }
 * }
 */
export function extractOpenAIUsage(response: unknown): TokenUsage | null {
  const usage = (response as { usage?: Record<string, number> })?.usage;
  if (!usage) return null;

  return {
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
  };
}

/**
 * OpenAI pricing (as of Feb 2026).
 * Prices in cents per 1M tokens.
 */
export const OPENAI_PRICING: Record<string, { input: number; output: number }> =
  {
    'gpt-4-turbo': { input: 1000, output: 3000 },
    'gpt-4o': { input: 250, output: 1000 },
    'gpt-4o-mini': { input: 15, output: 60 },
    'gpt-3.5-turbo': { input: 50, output: 150 },
    // Default fallback
    default: { input: 250, output: 1000 },
  };
```

---

## Hook Integration Points

### 1. Executor Hook (Primary)

All LLM calls flow through agent executors. Add token tracking here:

```typescript
// packages/core/src/dispatch/executors/base-executor.ts

import { TokenTracker } from '../../telemetry/token-tracking.js';

export abstract class BaseAgentExecutor {
  protected tokenTracker: TokenTracker;

  constructor(config: ExecutorConfig) {
    this.tokenTracker = config.tokenTracker ?? new NoopTokenTracker();
  }

  async executeAction(context: DispatchContext): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      // Execute LLM call
      const response = await this.callLLM(context);

      // Track tokens (async, non-blocking)
      this.tokenTracker.record({
        teamId: context.teamId,
        operation: 'dispatch',
        role: context.role,
        cycle: context.cycle,
        model: this.getModelName(),
        provider: this.getProvider(),
        usage: this.extractUsage(response),
        timestamp: new Date(),
      });

      return this.parseResponse(response, context);
    } catch (error) {
      // Track failed calls too (for rate limit analysis)
      this.tokenTracker.recordError({
        teamId: context.teamId,
        operation: 'dispatch',
        error: error instanceof Error ? error.message : 'unknown',
      });
      throw error;
    }
  }

  protected abstract extractUsage(response: unknown): TokenUsage;
  protected abstract getProvider(): 'anthropic' | 'openai' | 'local';
  protected abstract getModelName(): string;
}
```

### 2. Memory Operations Hook

Memory search and compression use LLMs — track separately:

```typescript
// packages/core/src/memory/semantic-search.ts

export class SemanticMemorySearch {
  async search(query: string, context: SearchContext): Promise<SearchResult[]> {
    const embedResponse = await this.embedQuery(query);

    // Track embedding token usage
    this.tokenTracker.record({
      teamId: context.teamId,
      operation: 'memory_search',
      model: 'text-embedding-3-small', // or configured model
      provider: 'openai',
      usage: { inputTokens: this.countTokens(query), outputTokens: 0 },
      timestamp: new Date(),
    });

    return this.rankResults(embedResponse, context);
  }
}
```

### 3. Compression Hook

```typescript
// packages/core/src/memory/compression.ts

export class MemoryCompressor {
  async compress(
    entries: MemoryEntry[],
    context: CompressionContext
  ): Promise<CompressedMemory> {
    const prompt = this.buildCompressionPrompt(entries);
    const response = await this.llm.complete(prompt);

    // Track compression token usage
    this.tokenTracker.record({
      teamId: context.teamId,
      operation: 'memory_compress',
      model: this.llm.model,
      provider: this.llm.provider,
      usage: this.extractUsage(response),
      timestamp: new Date(),
    });

    return this.parseCompressed(response);
  }
}
```

---

## Cost Calculation

```typescript
// packages/core/src/telemetry/cost-calculator.ts

import { ANTHROPIC_PRICING } from './providers/anthropic.js';
import { OPENAI_PRICING } from './providers/openai.js';
import type { TokenUsage } from './token-tracking.js';

/**
 * Calculate cost in cents for a token usage event.
 *
 * @param provider - LLM provider
 * @param model - Model name
 * @param usage - Token usage data
 * @returns Cost in cents (fractional allowed)
 */
export function calculateCostCents(
  provider: 'anthropic' | 'openai' | 'local' | 'unknown',
  model: string,
  usage: TokenUsage
): number {
  if (provider === 'local') {
    return 0; // Local models are free
  }

  const pricing =
    provider === 'anthropic'
      ? (ANTHROPIC_PRICING[model] ?? ANTHROPIC_PRICING['default'])
      : (OPENAI_PRICING[model] ?? OPENAI_PRICING['default']);

  if (!pricing) {
    console.warn(`Unknown model for cost calculation: ${provider}/${model}`);
    return 0;
  }

  // Prices are per 1M tokens, convert to cents
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;

  // Cache read tokens are cheaper (Anthropic only)
  let cacheCost = 0;
  if ('cacheRead' in pricing && usage.cacheReadTokens) {
    cacheCost = (usage.cacheReadTokens / 1_000_000) * pricing.cacheRead!;
  }

  return inputCost + outputCost + cacheCost;
}
```

---

## TokenTracker Implementation

```typescript
// packages/core/src/telemetry/token-tracker.ts

import { EventEmitter } from 'node:events';
import type { TokenEvent, TokenUsage, CostSummary } from './token-tracking.js';
import { calculateCostCents } from './cost-calculator.js';

export interface TokenTrackerConfig {
  /** Flush events to persistence every N events or N ms */
  flushThreshold?: number;
  flushIntervalMs?: number;
  /** Enable metric emission (Prometheus) */
  emitMetrics?: boolean;
  /** Enable trace span attributes */
  emitTraceAttributes?: boolean;
}

/**
 * Central token tracking service.
 * Collects token events, calculates costs, emits to observability systems.
 */
export class TokenTracker extends EventEmitter {
  private buffer: TokenEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(private config: TokenTrackerConfig = {}) {
    super();
    this.config.flushThreshold ??= 100;
    this.config.flushIntervalMs ??= 30_000;
    this.config.emitMetrics ??= true;

    this.startFlushTimer();
  }

  /**
   * Record a token usage event.
   * Calculates cost and emits to metrics/traces.
   */
  record(event: Omit<TokenEvent, 'costCents'>): void {
    const costCents = calculateCostCents(
      event.provider,
      event.model,
      event.usage
    );

    const fullEvent: TokenEvent = {
      ...event,
      costCents,
    };

    // Buffer for batch persistence
    this.buffer.push(fullEvent);

    // Emit metrics immediately
    if (this.config.emitMetrics) {
      this.emitMetrics(fullEvent);
    }

    // Emit event for listeners
    this.emit('token', fullEvent);

    // Flush if threshold reached
    if (this.buffer.length >= this.config.flushThreshold!) {
      this.flush();
    }
  }

  /**
   * Record an error event (for rate limit analysis).
   */
  recordError(event: {
    teamId: string;
    operation: string;
    error: string;
  }): void {
    this.emit('error', event);
    // TODO: Emit error metric
  }

  /**
   * Get cost summary for a team in a period.
   */
  async getCostSummary(
    teamId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<CostSummary> {
    // Delegate to persistence layer
    return this.persistence.getCostSummary(teamId, periodStart, periodEnd);
  }

  private emitMetrics(event: TokenEvent): void {
    const labels = {
      team: event.teamId,
      model: event.model,
      role: event.role ?? 'unknown',
    };

    // Increment counters (these go to Prometheus)
    metrics
      .counter('ada_llm_tokens_input_total', labels)
      .inc(event.usage.inputTokens);
    metrics
      .counter('ada_llm_tokens_output_total', labels)
      .inc(event.usage.outputTokens);
    metrics.counter('ada_llm_cost_cents', labels).inc(event.costCents);
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  private flush(): void {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    // Persist asynchronously (don't block)
    this.persistence.batchWrite(events).catch(err => {
      console.error('Failed to persist token events:', err);
      // TODO: Retry logic, dead letter queue
    });
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

/**
 * No-op tracker for tests and local development.
 */
export class NoopTokenTracker extends TokenTracker {
  record(): void {
    /* no-op */
  }
  recordError(): void {
    /* no-op */
  }
}
```

---

## Stripe Metered Billing Integration

```typescript
// packages/core/src/billing/stripe-metering.ts

import Stripe from 'stripe';
import type { CostSummary } from '../telemetry/token-tracking.js';

/**
 * Report usage to Stripe for metered billing.
 * Called by a cron job at end of billing period.
 */
export async function reportStripeUsage(
  stripe: Stripe,
  subscriptionItemId: string,
  summary: CostSummary
): Promise<void> {
  // Stripe metered billing uses quantity (we use cents as unit)
  await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity: Math.ceil(summary.totalCostCents),
    timestamp: Math.floor(summary.periodEnd.getTime() / 1000),
    action: 'set', // Replace previous reading for period
  });
}

/**
 * Daily usage report job.
 * Runs at 00:05 UTC, reports previous day's usage.
 */
export async function dailyUsageReportJob(
  stripe: Stripe,
  tokenTracker: TokenTracker,
  subscriptions: TeamSubscription[]
): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  for (const sub of subscriptions) {
    const summary = await tokenTracker.getCostSummary(
      sub.teamId,
      yesterday,
      today
    );

    if (summary.totalCostCents > 0) {
      await reportStripeUsage(stripe, sub.stripeSubscriptionItemId, summary);
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// packages/core/tests/telemetry/token-tracking.test.ts

describe('TokenTracker', () => {
  it('calculates Anthropic costs correctly', () => {
    const cost = calculateCostCents('anthropic', 'claude-3-5-sonnet-20241022', {
      inputTokens: 1_000_000,
      outputTokens: 500_000,
    });
    // 1M input × $3/1M + 0.5M output × $15/1M = $3 + $7.50 = $10.50 = 1050 cents
    expect(cost).toBeCloseTo(1050);
  });

  it('handles cache read tokens', () => {
    const cost = calculateCostCents('anthropic', 'claude-3-5-sonnet-20241022', {
      inputTokens: 500_000,
      outputTokens: 100_000,
      cacheReadTokens: 500_000,
    });
    // 0.5M input × $3/1M + 0.1M output × $15/1M + 0.5M cache × $0.30/1M
    // = $1.50 + $1.50 + $0.15 = $3.15 = 315 cents
    expect(cost).toBeCloseTo(315);
  });

  it('emits metrics on record', () => {
    const tracker = new TokenTracker({ emitMetrics: true });
    const metricsSpy = vi.spyOn(metrics, 'counter');

    tracker.record({
      teamId: 'team_123',
      operation: 'dispatch',
      role: 'engineering',
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      usage: { inputTokens: 1000, outputTokens: 500 },
      timestamp: new Date(),
    });

    expect(metricsSpy).toHaveBeenCalledWith(
      'ada_llm_tokens_input_total',
      expect.any(Object)
    );
  });
});
```

### E2E Tests

```typescript
// packages/cli/tests/e2e/token-tracking.test.ts

describe('Token Tracking E2E', () => {
  it('tracks tokens through full dispatch cycle', async () => {
    // Setup test team with mock LLM
    const { teamId, tracker } = await setupTestTeam();

    // Run dispatch
    await runDispatchCycle(teamId);

    // Verify token event was recorded
    const events = tracker.getEventsForTeam(teamId);
    expect(events).toHaveLength(1);
    expect(events[0].operation).toBe('dispatch');
    expect(events[0].costCents).toBeGreaterThan(0);
  });

  it('aggregates costs correctly for billing', async () => {
    const { teamId, tracker } = await setupTestTeam();

    // Run multiple cycles
    for (let i = 0; i < 5; i++) {
      await runDispatchCycle(teamId);
    }

    // Get summary
    const summary = await tracker.getCostSummary(
      teamId,
      new Date('2026-03-01'),
      new Date('2026-03-02')
    );

    expect(summary.cycleCount).toBe(5);
    expect(summary.totalCostCents).toBeGreaterThan(0);
  });
});
```

---

## Implementation Checklist

### Sprint 3 Day 5 (Frontier)

- [ ] Create `packages/core/src/telemetry/token-tracking.ts` with interfaces
- [ ] Implement `packages/core/src/telemetry/providers/anthropic.ts`
- [ ] Implement `packages/core/src/telemetry/providers/openai.ts`
- [ ] Implement `packages/core/src/telemetry/cost-calculator.ts`
- [ ] Implement `packages/core/src/telemetry/token-tracker.ts`
- [ ] Add token tracking to `BaseAgentExecutor`
- [ ] Write unit tests for cost calculation
- [ ] Write unit tests for token extraction

### Sprint 3 Day 10 (Engineering)

- [ ] Integrate with Stripe metered billing
- [ ] Add `dailyUsageReportJob` to cron
- [ ] Add cost dashboard component

### Sprint 3 Day 11 (QA)

- [ ] E2E test: Token tracking through dispatch
- [ ] E2E test: Cost summary aggregation
- [ ] E2E test: Stripe usage report

---

## Open Questions

1. **Token count for streaming responses?** — Stream completion events include partial token counts; accumulate and emit on stream end.

2. **Pricing update strategy?** — Store pricing in config file (not code) for easy updates without deploys.

3. **Overage alerts?** — When team approaches daily budget, emit warning event. UI/notification TBD.

4. **Historical pricing?** — For accurate billing, store the price used at time of event (prices change over time).

---

## References

- [Anthropic API Usage](https://docs.anthropic.com/en/api/messages#response)
- [OpenAI Usage Data](https://platform.openai.com/docs/api-reference/chat/create)
- [Stripe Metered Billing](https://stripe.com/docs/billing/subscriptions/metered)
- C1116: Observability Architecture ADR
- C1086: Managed Execution Implementation Spec
- #182: Billing Integration Issue
