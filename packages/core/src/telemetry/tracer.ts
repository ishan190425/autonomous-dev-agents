/**
 * @ada/core — Distributed Tracing Implementation
 *
 * W3C Trace Context compliant distributed tracing for ADA.
 * Part of SaaS Observability & Telemetry Specification (C886).
 *
 * Phase 3: Distributed Tracing
 *
 * @packageDocumentation
 */

import type {
  Span,
  SpanAttributes,
  SpanAttributeValue,
  SpanData,
  SpanEvent,
  SpanKind,
  SpanLink,
  SpanStatus,
  StartSpanOptions,
  TraceContext,
  Tracer,
  TracerConfig,
} from './types.js';

// ─── ID Generation ───────────────────────────────────────────────────────────

/**
 * Generate a random hex string of specified length.
 * Uses crypto.randomBytes for security.
 */
function generateRandomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  // Use crypto.getRandomValues if available, fallback to Math.random
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < bytes; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a trace ID (32 hex chars = 16 bytes).
 */
function generateTraceId(): string {
  return generateRandomHex(16);
}

/**
 * Generate a span ID (16 hex chars = 8 bytes).
 */
function generateSpanId(): string {
  return generateRandomHex(8);
}

// ─── W3C Trace Context ───────────────────────────────────────────────────────

/**
 * W3C Trace Context version.
 */
const TRACE_VERSION = '00';

/**
 * Trace flags: sampled bit.
 */
const TRACE_FLAG_SAMPLED = 0x01;

/**
 * Regex for validating traceparent header.
 * Format: version-traceId-parentId-flags
 * Example: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
 */
const TRACEPARENT_REGEX = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

/**
 * Parse a W3C traceparent header.
 * Returns undefined if invalid.
 */
function parseTraceparent(header: string): TraceContext | undefined {
  const match = header.toLowerCase().match(TRACEPARENT_REGEX);
  if (!match) {
    return undefined;
  }

  const version = match[1];
  const traceId = match[2];
  const spanId = match[3];
  const flags = match[4];

  // All groups must be present
  if (!version || !traceId || !spanId || !flags) {
    return undefined;
  }

  // Only support version 00
  if (version !== TRACE_VERSION) {
    return undefined;
  }

  // Reject all-zero trace or span IDs
  if (traceId === '00000000000000000000000000000000') {
    return undefined;
  }
  if (spanId === '0000000000000000') {
    return undefined;
  }

  return {
    traceId,
    spanId,
    traceFlags: parseInt(flags, 16),
  };
}

/**
 * Format a trace context as a W3C traceparent header.
 */
function formatTraceparent(traceId: string, spanId: string, flags: number = TRACE_FLAG_SAMPLED): string {
  const flagsHex = flags.toString(16).padStart(2, '0');
  return `${TRACE_VERSION}-${traceId}-${spanId}-${flagsHex}`;
}

// ─── Span Implementation ─────────────────────────────────────────────────────

/**
 * Internal span implementation.
 */
class SpanImpl implements Span {
  private readonly _spanId: string;
  private readonly _traceId: string;
  private readonly _parentSpanId: string | undefined;
  private _name: string;
  private readonly _kind: SpanKind;
  private readonly _startTime: Date;
  private _endTime: Date | undefined;
  private _status: SpanStatus = 'unset';
  private _statusMessage: string | undefined;
  private readonly _attributes: Map<string, SpanAttributeValue> = new Map();
  private readonly _events: SpanEvent[] = [];
  private readonly _links: SpanLink[] = [];
  private _recording: boolean = true;
  private readonly _onEnd: (span: SpanImpl) => void;

  constructor(
    name: string,
    traceId: string,
    parentSpanId: string | undefined,
    kind: SpanKind,
    startTime: Date,
    onEnd: (span: SpanImpl) => void
  ) {
    this._spanId = generateSpanId();
    this._traceId = traceId;
    this._parentSpanId = parentSpanId;
    this._name = name;
    this._kind = kind;
    this._startTime = startTime;
    this._onEnd = onEnd;
  }

  getSpanId(): string {
    return this._spanId;
  }

  getTraceId(): string {
    return this._traceId;
  }

  setAttribute(key: string, value: SpanAttributeValue): this {
    if (this._recording) {
      this._attributes.set(key, value);
    }
    return this;
  }

  setAttributes(attributes: SpanAttributes): this {
    if (this._recording) {
      for (const [key, value] of Object.entries(attributes)) {
        this._attributes.set(key, value);
      }
    }
    return this;
  }

  addEvent(name: string, attributes?: SpanAttributes): this {
    if (this._recording) {
      const event: SpanEvent = {
        name,
        timestamp: new Date().toISOString(),
      };
      if (attributes) {
        (event as { attributes: SpanAttributes }).attributes = attributes;
      }
      this._events.push(event);
    }
    return this;
  }

  addLink(traceId: string, spanId: string, attributes?: SpanAttributes): this {
    if (this._recording) {
      const link: SpanLink = { traceId, spanId };
      if (attributes) {
        (link as { attributes: SpanAttributes }).attributes = attributes;
      }
      this._links.push(link);
    }
    return this;
  }

  recordException(error: Error | string, attributes?: SpanAttributes): this {
    if (this._recording) {
      const errorObj = typeof error === 'string' ? new Error(error) : error;
      this.addEvent('exception', {
        'exception.type': errorObj.name,
        'exception.message': errorObj.message,
        'exception.stacktrace': errorObj.stack ?? '',
        ...attributes,
      });
      this.setStatus('error', errorObj.message);
    }
    return this;
  }

  setStatus(status: SpanStatus, message?: string): this {
    if (this._recording) {
      this._status = status;
      if (message !== undefined) {
        this._statusMessage = message;
      }
    }
    return this;
  }

  updateName(name: string): this {
    if (this._recording) {
      this._name = name;
    }
    return this;
  }

  isRecording(): boolean {
    return this._recording;
  }

  end(): void {
    if (this._recording) {
      this._endTime = new Date();
      this._recording = false;
      this._onEnd(this);
    }
  }

  toData(): SpanData {
    const data: SpanData = {
      spanId: this._spanId,
      traceId: this._traceId,
      name: this._name,
      kind: this._kind,
      startTime: this._startTime.toISOString(),
      status: this._status,
      attributes: Object.fromEntries(this._attributes),
      events: [...this._events],
      links: [...this._links],
    };

    if (this._parentSpanId) {
      (data as { parentSpanId: string }).parentSpanId = this._parentSpanId;
    }

    if (this._endTime) {
      (data as { endTime: string }).endTime = this._endTime.toISOString();
      (data as { duration: number }).duration = this._endTime.getTime() - this._startTime.getTime();
    }

    if (this._statusMessage) {
      (data as { statusMessage: string }).statusMessage = this._statusMessage;
    }

    return data;
  }
}

// ─── Tracer Implementation ───────────────────────────────────────────────────

/**
 * Internal tracer implementation.
 */
class TracerImpl implements Tracer {
  private readonly _serviceName: string;
  private readonly _sampleRate: number;
  private readonly _exportSpans: boolean;
  private readonly _maxSpans: number;
  private readonly _completedSpans: SpanData[] = [];
  private _activeSpan: Span | undefined;

  constructor(config: TracerConfig) {
    this._serviceName = config.serviceName;
    this._sampleRate = config.sampleRate ?? 1.0;
    this._exportSpans = config.exportSpans ?? true;
    this._maxSpans = config.maxSpans ?? 1000;
  }

  startSpan(name: string, options?: StartSpanOptions): Span {
    // Determine if this span should be sampled
    const sampled = Math.random() < this._sampleRate;
    if (!sampled && this._sampleRate < 1.0) {
      // Return a no-op span for unsampled traces
      return new NoOpSpan(name);
    }

    // Determine trace and parent span IDs
    let traceId: string;
    let parentSpanId: string | undefined;

    if (options?.parent) {
      // Use parent's trace ID
      traceId = options.parent.getTraceId();
      parentSpanId = options.parent.getSpanId();
    } else if (this._activeSpan) {
      // Use active span as parent
      traceId = this._activeSpan.getTraceId();
      parentSpanId = this._activeSpan.getSpanId();
    } else {
      // Start a new trace
      traceId = generateTraceId();
    }

    const span = new SpanImpl(
      name,
      traceId,
      parentSpanId,
      options?.kind ?? 'internal',
      options?.startTime ?? new Date(),
      (completedSpan) => this._onSpanEnd(completedSpan)
    );

    // Set initial attributes
    if (options?.attributes) {
      span.setAttributes(options.attributes);
    }

    // Add links
    if (options?.links) {
      for (const link of options.links) {
        span.addLink(link.traceId, link.spanId, link.attributes);
      }
    }

    // Add service name as attribute
    span.setAttribute('service.name', this._serviceName);

    return span;
  }

  getActiveSpan(): Span | undefined {
    return this._activeSpan;
  }

  withSpan<T>(span: Span, fn: () => T): T {
    const previousSpan = this._activeSpan;
    this._activeSpan = span;
    try {
      return fn();
    } finally {
      this._activeSpan = previousSpan;
    }
  }

  extractContext(traceparent: string): TraceContext | undefined {
    return parseTraceparent(traceparent);
  }

  injectContext(span: Span): string {
    return formatTraceparent(span.getTraceId(), span.getSpanId());
  }

  getCompletedSpans(): SpanData[] {
    return [...this._completedSpans];
  }

  clearCompletedSpans(): void {
    this._completedSpans.length = 0;
  }

  getServiceName(): string {
    return this._serviceName;
  }

  private _onSpanEnd(span: SpanImpl): void {
    if (this._exportSpans) {
      // Add to completed spans
      this._completedSpans.push(span.toData());

      // Trim if over max
      while (this._completedSpans.length > this._maxSpans) {
        this._completedSpans.shift();
      }
    }
  }
}

// ─── No-Op Span (for unsampled traces) ───────────────────────────────────────

/**
 * No-op span implementation for unsampled traces.
 * All operations are no-ops to minimize overhead.
 */
class NoOpSpan implements Span {
  private readonly _spanId: string;
  private readonly _traceId: string;
  private readonly _name: string;

  constructor(name: string) {
    this._spanId = '0000000000000000';
    this._traceId = '00000000000000000000000000000000';
    this._name = name;
  }

  getSpanId(): string {
    return this._spanId;
  }

  getTraceId(): string {
    return this._traceId;
  }

  setAttribute(_key: string, _value: SpanAttributeValue): this {
    void _key;
    void _value;
    return this;
  }

  setAttributes(_attributes: SpanAttributes): this {
    void _attributes;
    return this;
  }

  addEvent(_name: string, _attributes?: SpanAttributes): this {
    void _name;
    void _attributes;
    return this;
  }

  addLink(_traceId: string, _spanId: string, _attributes?: SpanAttributes): this {
    void _traceId;
    void _spanId;
    void _attributes;
    return this;
  }

  recordException(_error: Error | string, _attributes?: SpanAttributes): this {
    void _error;
    void _attributes;
    return this;
  }

  setStatus(_status: SpanStatus, _message?: string): this {
    void _status;
    void _message;
    return this;
  }

  updateName(_name: string): this {
    void _name;
    return this;
  }

  isRecording(): boolean {
    return false;
  }

  end(): void {
    // No-op
  }

  toData(): SpanData {
    return {
      spanId: this._spanId,
      traceId: this._traceId,
      name: this._name,
      kind: 'internal',
      startTime: new Date().toISOString(),
      status: 'unset',
      attributes: {},
      events: [],
      links: [],
    };
  }
}

// ─── Factory Functions ───────────────────────────────────────────────────────

/**
 * Create a distributed tracer.
 *
 * @param config - Tracer configuration
 * @returns Tracer instance
 *
 * @example
 * ```typescript
 * const tracer = createTracer({ serviceName: 'ada-cli' });
 *
 * const span = tracer.startSpan('dispatch_cycle', {
 *   attributes: { cycle_id: 906, role: 'frontier' }
 * });
 *
 * tracer.withSpan(span, () => {
 *   const child = tracer.startSpan('load_context');
 *   // ... do work ...
 *   child.end();
 * });
 *
 * span.setStatus('ok');
 * span.end();
 *
 * // Export completed spans
 * const spans = tracer.getCompletedSpans();
 * console.log(JSON.stringify(spans, null, 2));
 * ```
 */
export function createTracer(config: TracerConfig): Tracer {
  return new TracerImpl(config);
}

/**
 * Create a tracer from environment variables.
 *
 * Environment variables:
 * - ADA_SERVICE_NAME: Service name (default: 'ada')
 * - ADA_TRACE_SAMPLE_RATE: Sample rate 0.0-1.0 (default: 1.0)
 *
 * @param defaultConfig - Defaults if env vars not set
 */
export function createTracerFromEnv(defaultConfig: Partial<TracerConfig> = {}): Tracer {
  const serviceName = process.env.ADA_SERVICE_NAME ?? defaultConfig.serviceName ?? 'ada';
  const sampleRateEnv = process.env.ADA_TRACE_SAMPLE_RATE;
  const sampleRate = sampleRateEnv !== undefined
    ? parseFloat(sampleRateEnv)
    : defaultConfig.sampleRate;

  const config: TracerConfig = {
    serviceName,
  };

  // Only add optional properties if defined
  if (sampleRate !== undefined) {
    (config as { sampleRate: number }).sampleRate = sampleRate;
  }
  if (defaultConfig.exportSpans !== undefined) {
    (config as { exportSpans: boolean }).exportSpans = defaultConfig.exportSpans;
  }
  if (defaultConfig.maxSpans !== undefined) {
    (config as { maxSpans: number }).maxSpans = defaultConfig.maxSpans;
  }

  return createTracer(config);
}

// ─── Global Tracer ───────────────────────────────────────────────────────────

let globalTracer: Tracer | null = null;

/**
 * Get or create the global tracer instance.
 * Uses environment variables for configuration.
 */
export function getTracer(): Tracer {
  if (!globalTracer) {
    globalTracer = createTracerFromEnv();
  }
  return globalTracer;
}

/**
 * Set the global tracer instance.
 * Useful for initializing with specific configuration at startup.
 */
export function setTracer(tracer: Tracer): void {
  globalTracer = tracer;
}

/**
 * Reset the global tracer (mainly for testing).
 */
export function resetTracer(): void {
  globalTracer = null;
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Start a span using the global tracer.
 * Convenience wrapper around getTracer().startSpan().
 */
export function startSpan(name: string, options?: StartSpanOptions): Span {
  return getTracer().startSpan(name, options);
}

/**
 * Execute a function within a span, automatically ending the span when done.
 * Handles both sync and async functions.
 *
 * @example
 * ```typescript
 * // Sync function
 * const result = withTracedSpan('compute', {}, () => {
 *   return expensiveComputation();
 * });
 *
 * // Async function
 * const data = await withTracedSpan('fetch', {}, async () => {
 *   return await fetchData();
 * });
 * ```
 */
export function withTracedSpan<T>(
  name: string,
  options: StartSpanOptions,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const span = startSpan(name, options);
  const tracer = getTracer();

  try {
    const result = tracer.withSpan(span, fn);

    // Handle promises
    if (result instanceof Promise) {
      return result
        .then((value) => {
          span.setStatus('ok');
          span.end();
          return value;
        })
        .catch((error) => {
          span.recordException(error);
          span.end();
          throw error;
        });
    }

    span.setStatus('ok');
    span.end();
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.end();
    throw error;
  }
}

// ─── Standard ADA Span Names ─────────────────────────────────────────────────

/**
 * Standard span names for ADA operations.
 * Use these constants for consistent naming across the codebase.
 */
export const ADA_SPANS = {
  // Dispatch cycle
  DISPATCH_CYCLE: 'ada.dispatch.cycle',
  DISPATCH_START: 'ada.dispatch.start',
  DISPATCH_COMPLETE: 'ada.dispatch.complete',

  // Context loading
  CONTEXT_LOAD: 'ada.context.load',
  MEMORY_READ: 'ada.memory.read',
  PLAYBOOK_READ: 'ada.playbook.read',
  ROSTER_READ: 'ada.roster.read',
  RULES_READ: 'ada.rules.read',

  // Agent execution
  AGENT_EXECUTE: 'ada.agent.execute',
  LLM_CALL: 'ada.llm.call',
  RESPONSE_PARSE: 'ada.response.parse',

  // Git operations
  GIT_COMMIT: 'ada.git.commit',
  GIT_PUSH: 'ada.git.push',
  GIT_PULL: 'ada.git.pull',

  // Memory operations
  MEMORY_UPDATE: 'ada.memory.update',
  MEMORY_COMPRESS: 'ada.memory.compress',
  MEMORY_SEARCH: 'ada.memory.search',

  // File operations
  FILE_READ: 'ada.file.read',
  FILE_WRITE: 'ada.file.write',
} as const;

/**
 * Standard attribute keys for ADA spans.
 */
export const ADA_SPAN_ATTRIBUTES = {
  // Identity
  CYCLE_ID: 'ada.cycle.id',
  ROLE: 'ada.role',
  REPO: 'ada.repo',
  SESSION_ID: 'ada.session.id',

  // LLM
  MODEL: 'ada.llm.model',
  TOKENS_IN: 'ada.llm.tokens.input',
  TOKENS_OUT: 'ada.llm.tokens.output',
  COST_USD: 'ada.llm.cost.usd',

  // Memory
  MEMORY_VERSION: 'ada.memory.version',
  MEMORY_SIZE: 'ada.memory.size',
  MEMORY_ENTRIES: 'ada.memory.entries',

  // Outcome
  OUTCOME: 'ada.outcome',
  ERROR_TYPE: 'ada.error.type',
  ERROR_MESSAGE: 'ada.error.message',
} as const;
