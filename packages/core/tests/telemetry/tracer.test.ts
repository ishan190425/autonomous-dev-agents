/**
 * @ada/core — Distributed Tracing Tests
 *
 * Test suite for the tracer implementation.
 * Part of SaaS Observability & Telemetry Specification (C886) - Phase 3.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTracer,
  createTracerFromEnv,
  getTracer,
  setTracer,
  resetTracer,
  startSpan,
  withTracedSpan,
  ADA_SPANS,
  ADA_SPAN_ATTRIBUTES,
} from '../../src/telemetry/tracer.js';
import type { Span, Tracer } from '../../src/telemetry/types.js';

describe('Tracer', () => {
  let tracer: Tracer;

  beforeEach(() => {
    resetTracer();
    tracer = createTracer({ serviceName: 'test-service' });
  });

  afterEach(() => {
    resetTracer();
  });

  describe('createTracer', () => {
    it('creates a tracer with service name', () => {
      const t = createTracer({ serviceName: 'my-service' });
      expect(t.getServiceName()).toBe('my-service');
    });

    it('creates a tracer with default options', () => {
      const t = createTracer({ serviceName: 'test' });
      expect(t.getCompletedSpans()).toEqual([]);
      expect(t.getActiveSpan()).toBeUndefined();
    });
  });

  describe('startSpan', () => {
    it('creates a span with the given name', () => {
      const span = tracer.startSpan('test-operation');
      expect(span.isRecording()).toBe(true);
      span.end();
    });

    it('generates unique span IDs', () => {
      const span1 = tracer.startSpan('op1');
      const span2 = tracer.startSpan('op2');
      expect(span1.getSpanId()).not.toBe(span2.getSpanId());
      span1.end();
      span2.end();
    });

    it('generates unique trace IDs for root spans', () => {
      const span1 = tracer.startSpan('root1');
      span1.end();
      const span2 = tracer.startSpan('root2');
      span2.end();
      expect(span1.getTraceId()).not.toBe(span2.getTraceId());
    });

    it('inherits trace ID from parent span', () => {
      const parent = tracer.startSpan('parent');
      const child = tracer.startSpan('child', { parent });

      expect(child.getTraceId()).toBe(parent.getTraceId());

      child.end();
      parent.end();
    });

    it('sets parent span ID when parent is provided', () => {
      const parent = tracer.startSpan('parent');
      const child = tracer.startSpan('child', { parent });

      child.end();
      parent.end();

      const spans = tracer.getCompletedSpans();
      const childData = spans.find((s) => s.name === 'child');
      expect(childData?.parentSpanId).toBe(parent.getSpanId());
    });

    it('applies initial attributes', () => {
      const span = tracer.startSpan('test', {
        attributes: { 'key.one': 'value1', 'key.two': 42 },
      });
      span.end();

      const data = span.toData();
      expect(data.attributes['key.one']).toBe('value1');
      expect(data.attributes['key.two']).toBe(42);
    });

    it('sets span kind', () => {
      const span = tracer.startSpan('client-call', { kind: 'client' });
      span.end();

      expect(span.toData().kind).toBe('client');
    });

    it('includes service name as attribute', () => {
      const span = tracer.startSpan('test');
      span.end();

      expect(span.toData().attributes['service.name']).toBe('test-service');
    });
  });

  describe('Span', () => {
    let span: Span;

    beforeEach(() => {
      span = tracer.startSpan('test-span');
    });

    afterEach(() => {
      if (span.isRecording()) {
        span.end();
      }
    });

    describe('setAttribute', () => {
      it('sets a string attribute', () => {
        span.setAttribute('key', 'value');
        span.end();
        expect(span.toData().attributes['key']).toBe('value');
      });

      it('sets a number attribute', () => {
        span.setAttribute('count', 42);
        span.end();
        expect(span.toData().attributes['count']).toBe(42);
      });

      it('sets a boolean attribute', () => {
        span.setAttribute('enabled', true);
        span.end();
        expect(span.toData().attributes['enabled']).toBe(true);
      });

      it('sets an array attribute', () => {
        span.setAttribute('tags', ['a', 'b', 'c']);
        span.end();
        expect(span.toData().attributes['tags']).toEqual(['a', 'b', 'c']);
      });

      it('returns this for chaining', () => {
        const result = span.setAttribute('key', 'value');
        expect(result).toBe(span);
      });

      it('ignores attributes after span ends', () => {
        span.end();
        span.setAttribute('late', 'value');
        expect(span.toData().attributes['late']).toBeUndefined();
      });
    });

    describe('setAttributes', () => {
      it('sets multiple attributes at once', () => {
        span.setAttributes({
          'key.one': 'value1',
          'key.two': 42,
          'key.three': true,
        });
        span.end();

        const attrs = span.toData().attributes;
        expect(attrs['key.one']).toBe('value1');
        expect(attrs['key.two']).toBe(42);
        expect(attrs['key.three']).toBe(true);
      });
    });

    describe('addEvent', () => {
      it('adds an event with name', () => {
        span.addEvent('something-happened');
        span.end();

        const events = span.toData().events;
        expect(events).toHaveLength(1);
        expect(events[0].name).toBe('something-happened');
      });

      it('adds an event with attributes', () => {
        span.addEvent('event', { detail: 'info', count: 5 });
        span.end();

        const event = span.toData().events[0];
        expect(event.attributes?.['detail']).toBe('info');
        expect(event.attributes?.['count']).toBe(5);
      });

      it('includes timestamp on events', () => {
        span.addEvent('timed');
        span.end();

        const event = span.toData().events[0];
        expect(event.timestamp).toBeDefined();
        expect(new Date(event.timestamp).getTime()).toBeGreaterThan(0);
      });

      it('adds multiple events', () => {
        span.addEvent('first');
        span.addEvent('second');
        span.addEvent('third');
        span.end();

        expect(span.toData().events).toHaveLength(3);
      });
    });

    describe('addLink', () => {
      it('adds a link to another span', () => {
        const other = tracer.startSpan('other');
        span.addLink(other.getTraceId(), other.getSpanId());
        span.end();
        other.end();

        const links = span.toData().links;
        expect(links).toHaveLength(1);
        expect(links[0].traceId).toBe(other.getTraceId());
        expect(links[0].spanId).toBe(other.getSpanId());
      });

      it('adds a link with attributes', () => {
        span.addLink('traceid', 'spanid', { reason: 'related' });
        span.end();

        const link = span.toData().links[0];
        expect(link.attributes?.['reason']).toBe('related');
      });
    });

    describe('recordException', () => {
      it('records an error', () => {
        const error = new Error('test error');
        span.recordException(error);
        span.end();

        const events = span.toData().events;
        expect(events).toHaveLength(1);
        expect(events[0].name).toBe('exception');
        expect(events[0].attributes?.['exception.type']).toBe('Error');
        expect(events[0].attributes?.['exception.message']).toBe('test error');
      });

      it('records a string error', () => {
        span.recordException('something went wrong');
        span.end();

        const event = span.toData().events[0];
        expect(event.attributes?.['exception.message']).toBe('something went wrong');
      });

      it('sets status to error', () => {
        span.recordException(new Error('fail'));
        span.end();

        expect(span.toData().status).toBe('error');
        expect(span.toData().statusMessage).toBe('fail');
      });

      it('includes additional attributes', () => {
        span.recordException(new Error('fail'), { retries: 3 });
        span.end();

        const event = span.toData().events[0];
        expect(event.attributes?.['retries']).toBe(3);
      });
    });

    describe('setStatus', () => {
      it('sets status to ok', () => {
        span.setStatus('ok');
        span.end();

        expect(span.toData().status).toBe('ok');
      });

      it('sets status to error with message', () => {
        span.setStatus('error', 'something failed');
        span.end();

        expect(span.toData().status).toBe('error');
        expect(span.toData().statusMessage).toBe('something failed');
      });

      it('defaults to unset', () => {
        span.end();
        expect(span.toData().status).toBe('unset');
      });
    });

    describe('updateName', () => {
      it('updates the span name', () => {
        span.updateName('new-name');
        span.end();

        expect(span.toData().name).toBe('new-name');
      });
    });

    describe('end', () => {
      it('stops recording', () => {
        expect(span.isRecording()).toBe(true);
        span.end();
        expect(span.isRecording()).toBe(false);
      });

      it('sets end time', () => {
        span.end();
        expect(span.toData().endTime).toBeDefined();
      });

      it('calculates duration', () => {
        // Add a small delay to ensure non-zero duration
        span.end();
        expect(span.toData().duration).toBeDefined();
        expect(span.toData().duration).toBeGreaterThanOrEqual(0);
      });

      it('only ends once', () => {
        span.end();
        const endTime1 = span.toData().endTime;

        span.end(); // Should be no-op
        const endTime2 = span.toData().endTime;

        expect(endTime1).toBe(endTime2);
      });
    });

    describe('toData', () => {
      it('returns span data object', () => {
        span.setAttribute('key', 'value');
        span.addEvent('event');
        span.setStatus('ok');
        span.end();

        const data = span.toData();
        expect(data.spanId).toBeDefined();
        expect(data.traceId).toBeDefined();
        expect(data.name).toBe('test-span');
        expect(data.kind).toBe('internal');
        expect(data.startTime).toBeDefined();
        expect(data.endTime).toBeDefined();
        expect(data.status).toBe('ok');
        expect(data.attributes['key']).toBe('value');
        expect(data.events).toHaveLength(1);
        expect(data.links).toHaveLength(0);
      });
    });
  });

  describe('withSpan', () => {
    it('sets span as active during execution', () => {
      const span = tracer.startSpan('active-test');

      expect(tracer.getActiveSpan()).toBeUndefined();

      tracer.withSpan(span, () => {
        expect(tracer.getActiveSpan()).toBe(span);
      });

      expect(tracer.getActiveSpan()).toBeUndefined();
      span.end();
    });

    it('restores previous active span', () => {
      const parent = tracer.startSpan('parent');
      const child = tracer.startSpan('child', { parent });

      tracer.withSpan(parent, () => {
        expect(tracer.getActiveSpan()).toBe(parent);

        tracer.withSpan(child, () => {
          expect(tracer.getActiveSpan()).toBe(child);
        });

        expect(tracer.getActiveSpan()).toBe(parent);
      });

      parent.end();
      child.end();
    });

    it('returns the function result', () => {
      const span = tracer.startSpan('test');
      const result = tracer.withSpan(span, () => 'hello');
      expect(result).toBe('hello');
      span.end();
    });
  });

  describe('W3C Trace Context', () => {
    it('extracts valid traceparent', () => {
      const ctx = tracer.extractContext(
        '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'
      );

      expect(ctx).toBeDefined();
      expect(ctx?.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
      expect(ctx?.spanId).toBe('b7ad6b7169203331');
      expect(ctx?.traceFlags).toBe(1);
    });

    it('rejects invalid traceparent', () => {
      expect(tracer.extractContext('invalid')).toBeUndefined();
      expect(tracer.extractContext('')).toBeUndefined();
      expect(tracer.extractContext('00-invalid-invalid-00')).toBeUndefined();
    });

    it('rejects unsupported version', () => {
      expect(
        tracer.extractContext('ff-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01')
      ).toBeUndefined();
    });

    it('rejects all-zero trace ID', () => {
      expect(
        tracer.extractContext('00-00000000000000000000000000000000-b7ad6b7169203331-01')
      ).toBeUndefined();
    });

    it('rejects all-zero span ID', () => {
      expect(
        tracer.extractContext('00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01')
      ).toBeUndefined();
    });

    it('injects traceparent from span', () => {
      const span = tracer.startSpan('test');
      const traceparent = tracer.injectContext(span);

      expect(traceparent).toMatch(
        /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/
      );
      expect(traceparent).toContain(span.getTraceId());
      expect(traceparent).toContain(span.getSpanId());

      span.end();
    });

    it('round-trips traceparent', () => {
      const span = tracer.startSpan('test');
      const traceparent = tracer.injectContext(span);
      const ctx = tracer.extractContext(traceparent);

      expect(ctx?.traceId).toBe(span.getTraceId());
      expect(ctx?.spanId).toBe(span.getSpanId());

      span.end();
    });
  });

  describe('Completed Spans', () => {
    it('collects completed spans', () => {
      const span1 = tracer.startSpan('span1');
      const span2 = tracer.startSpan('span2');

      span1.end();
      span2.end();

      const completed = tracer.getCompletedSpans();
      expect(completed).toHaveLength(2);
      expect(completed.map((s) => s.name)).toContain('span1');
      expect(completed.map((s) => s.name)).toContain('span2');
    });

    it('clears completed spans', () => {
      const span = tracer.startSpan('test');
      span.end();

      expect(tracer.getCompletedSpans()).toHaveLength(1);

      tracer.clearCompletedSpans();

      expect(tracer.getCompletedSpans()).toHaveLength(0);
    });

    it('respects maxSpans limit', () => {
      const limitedTracer = createTracer({
        serviceName: 'test',
        maxSpans: 3,
      });

      for (let i = 0; i < 5; i++) {
        const span = limitedTracer.startSpan(`span-${i}`);
        span.end();
      }

      const spans = limitedTracer.getCompletedSpans();
      expect(spans).toHaveLength(3);
      // Should have the last 3 spans
      expect(spans.map((s) => s.name)).toEqual(['span-2', 'span-3', 'span-4']);
    });
  });

  describe('Sampling', () => {
    it('samples all spans with rate 1.0', () => {
      const fullTracer = createTracer({
        serviceName: 'test',
        sampleRate: 1.0,
      });

      for (let i = 0; i < 10; i++) {
        const span = fullTracer.startSpan(`span-${i}`);
        span.end();
      }

      expect(fullTracer.getCompletedSpans()).toHaveLength(10);
    });

    it('samples no spans with rate 0.0', () => {
      const noSampleTracer = createTracer({
        serviceName: 'test',
        sampleRate: 0.0,
      });

      for (let i = 0; i < 10; i++) {
        const span = noSampleTracer.startSpan(`span-${i}`);
        expect(span.isRecording()).toBe(false);
        span.end();
      }

      expect(noSampleTracer.getCompletedSpans()).toHaveLength(0);
    });
  });
});

describe('Global Tracer', () => {
  beforeEach(() => {
    resetTracer();
  });

  afterEach(() => {
    resetTracer();
  });

  it('getTracer returns a tracer', () => {
    const tracer = getTracer();
    expect(tracer).toBeDefined();
    expect(tracer.getServiceName()).toBe('ada');
  });

  it('setTracer sets the global tracer', () => {
    const custom = createTracer({ serviceName: 'custom' });
    setTracer(custom);

    expect(getTracer().getServiceName()).toBe('custom');
  });

  it('startSpan uses global tracer', () => {
    const custom = createTracer({ serviceName: 'test' });
    setTracer(custom);

    const span = startSpan('test-span');
    span.end();

    expect(custom.getCompletedSpans()).toHaveLength(1);
  });
});

describe('withTracedSpan', () => {
  beforeEach(() => {
    resetTracer();
  });

  afterEach(() => {
    resetTracer();
  });

  it('wraps sync function', () => {
    const result = withTracedSpan('sync-op', {}, () => {
      return 42;
    });

    expect(result).toBe(42);
    expect(getTracer().getCompletedSpans()).toHaveLength(1);
  });

  it('wraps async function', async () => {
    const result = await withTracedSpan('async-op', {}, () => {
      return Promise.resolve('async-result');
    });

    expect(result).toBe('async-result');
    expect(getTracer().getCompletedSpans()).toHaveLength(1);
  });

  it('sets status to ok on success', () => {
    withTracedSpan('success', {}, () => 'ok');

    const span = getTracer().getCompletedSpans()[0];
    expect(span.status).toBe('ok');
  });

  it('records exception on error', () => {
    expect(() => {
      withTracedSpan('error', {}, () => {
        throw new Error('test error');
      });
    }).toThrow('test error');

    const span = getTracer().getCompletedSpans()[0];
    expect(span.status).toBe('error');
    expect(span.events.some((e) => e.name === 'exception')).toBe(true);
  });

  it('records exception on async error', async () => {
    await expect(
      withTracedSpan('async-error', {}, () => {
        return Promise.reject(new Error('async error'));
      })
    ).rejects.toThrow('async error');

    const span = getTracer().getCompletedSpans()[0];
    expect(span.status).toBe('error');
  });
});

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetTracer();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    resetTracer();
  });

  it('createTracerFromEnv uses ADA_SERVICE_NAME', () => {
    process.env.ADA_SERVICE_NAME = 'env-service';
    const tracer = createTracerFromEnv();
    expect(tracer.getServiceName()).toBe('env-service');
  });

  it('createTracerFromEnv uses defaults when env not set', () => {
    delete process.env.ADA_SERVICE_NAME;
    const tracer = createTracerFromEnv({ serviceName: 'default' });
    expect(tracer.getServiceName()).toBe('default');
  });
});

describe('Standard Constants', () => {
  it('ADA_SPANS has expected span names', () => {
    expect(ADA_SPANS.DISPATCH_CYCLE).toBe('ada.dispatch.cycle');
    expect(ADA_SPANS.CONTEXT_LOAD).toBe('ada.context.load');
    expect(ADA_SPANS.AGENT_EXECUTE).toBe('ada.agent.execute');
    expect(ADA_SPANS.GIT_COMMIT).toBe('ada.git.commit');
  });

  it('ADA_SPAN_ATTRIBUTES has expected attribute keys', () => {
    expect(ADA_SPAN_ATTRIBUTES.CYCLE_ID).toBe('ada.cycle.id');
    expect(ADA_SPAN_ATTRIBUTES.ROLE).toBe('ada.role');
    expect(ADA_SPAN_ATTRIBUTES.MODEL).toBe('ada.llm.model');
    expect(ADA_SPAN_ATTRIBUTES.OUTCOME).toBe('ada.outcome');
  });
});

describe('Integration Scenarios', () => {
  let tracer: Tracer;

  beforeEach(() => {
    resetTracer();
    tracer = createTracer({ serviceName: 'ada-cli' });
    setTracer(tracer);
  });

  afterEach(() => {
    resetTracer();
  });

  it('traces a complete dispatch cycle', () => {
    // Simulate a dispatch cycle with nested spans
    const cycleSpan = tracer.startSpan(ADA_SPANS.DISPATCH_CYCLE, {
      attributes: {
        [ADA_SPAN_ATTRIBUTES.CYCLE_ID]: 906,
        [ADA_SPAN_ATTRIBUTES.ROLE]: 'frontier',
      },
    });

    tracer.withSpan(cycleSpan, () => {
      // Context load phase
      const contextSpan = tracer.startSpan(ADA_SPANS.CONTEXT_LOAD);
      contextSpan.setAttribute(ADA_SPAN_ATTRIBUTES.MEMORY_VERSION, 46);
      contextSpan.end();

      // Agent execution phase
      const executeSpan = tracer.startSpan(ADA_SPANS.AGENT_EXECUTE);
      tracer.withSpan(executeSpan, () => {
        const llmSpan = tracer.startSpan(ADA_SPANS.LLM_CALL);
        llmSpan.setAttribute(ADA_SPAN_ATTRIBUTES.MODEL, 'claude-3');
        llmSpan.setAttribute(ADA_SPAN_ATTRIBUTES.TOKENS_IN, 1500);
        llmSpan.setAttribute(ADA_SPAN_ATTRIBUTES.TOKENS_OUT, 500);
        llmSpan.end();
      });
      executeSpan.end();

      // Git push
      const gitSpan = tracer.startSpan(ADA_SPANS.GIT_PUSH);
      gitSpan.setStatus('ok');
      gitSpan.end();
    });

    cycleSpan.setAttribute(ADA_SPAN_ATTRIBUTES.OUTCOME, 'success');
    cycleSpan.setStatus('ok');
    cycleSpan.end();

    // Verify trace structure
    const spans = tracer.getCompletedSpans();
    expect(spans).toHaveLength(5);

    // All spans should share the same trace ID
    const traceId = cycleSpan.getTraceId();
    expect(spans.every((s) => s.traceId === traceId)).toBe(true);

    // Verify parent-child relationships
    const contextData = spans.find((s) => s.name === ADA_SPANS.CONTEXT_LOAD);
    expect(contextData?.parentSpanId).toBe(cycleSpan.getSpanId());

    const llmData = spans.find((s) => s.name === ADA_SPANS.LLM_CALL);
    const executeData = spans.find((s) => s.name === ADA_SPANS.AGENT_EXECUTE);
    expect(llmData?.parentSpanId).toBe(executeData?.spanId);
  });
});
