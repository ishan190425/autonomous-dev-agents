# Sprint 2 Platform Integration Test Strategy

> **Status:** PROPOSED  
> **Author:** 🌌 Frontier — Cycle 379  
> **Sprint 2 Kickoff:** Feb 28, 2026  
> **Related:** Implementation Contract (C373), Platform Readiness (C369), User Stories (C370), Self-Dogfooding Analysis (C378)

---

## Executive Summary

This document defines the integration test strategy for Sprint 2 platform features. Individual specs exist for Heat Scoring (#118), Reflexion (#108), and Observability (#83), but we need coordinated testing to verify these systems work together correctly.

**Goal:** Validate that platform features integrate seamlessly and meet acceptance criteria before Sprint 2 completion.

---

## 1. Test Architecture Overview

### 1.1 Platform Feature Dependencies

```
┌───────────────────────────────────────────────────────────────────┐
│                    Integration Test Layers                         │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Layer 4: End-to-End (E2E)                                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Full dispatch cycle with heat, reflexion, and observability │  │
│  │  Test: ada dispatch start → act → complete → verify state   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              ↑                                     │
│  Layer 3: Cross-Package Integration                               │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  CLI commands calling core modules                          │  │
│  │  Test: ada heat list, ada metrics, ada memory search        │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              ↑                                     │
│  Layer 2: Intra-Package Integration                               │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Heat + Memory Stream, Reflexion + Rotation History         │  │
│  │  Test: HeatStore reads from MemoryStream, patterns detected │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              ↑                                     │
│  Layer 1: Unit Tests (existing)                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Individual functions: calculateHeat(), detectPatterns()    │  │
│  │  Already covered: 739 core + 355 CLI = 1,094 tests          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

### 1.2 Test Types and Ownership

| Layer         | Type         | Location                         | Owner       | Sprint 2 Target |
| ------------- | ------------ | -------------------------------- | ----------- | --------------- |
| Unit          | Vitest       | `packages/*/src/**/*.test.ts`    | Engineering | 50+ new tests   |
| Intra-Package | Vitest       | `packages/core/src/integration/` | Engineering | 15-20 tests     |
| Cross-Package | Vitest + E2E | `packages/cli/src/e2e/`          | QA          | 10-15 tests     |
| End-to-End    | E2E          | `tests/e2e/platform/`            | QA          | 5-8 scenarios   |

---

## 2. Heat Scoring Integration Tests

### 2.1 Heat → Memory Stream Integration

**Scenario:** Heat scores affect memory retrieval ranking.

```typescript
// packages/core/src/integration/heat-memory.test.ts

describe('Heat + Memory Stream Integration', () => {
  it('recallSearch returns entries ordered by heat score', async () => {
    // Setup: Create entries with different heat
    const hotEntry = createEntry({ id: 'hot', referenceCount: 10 });
    const coldEntry = createEntry({ id: 'cold', referenceCount: 0 });

    // Action: Search with heat-aware retrieval
    const results = await recallSearch('test query', { trackReferences: true });

    // Assert: Hot entries ranked higher
    expect(results[0].id).toBe('hot');
    expect(results[0].heatTier).toBe('hot');
  });

  it('reference tracking increments heat on access', async () => {
    const entry = createEntry({ id: 'test', referenceCount: 0 });

    // Access the entry
    await recallSearch('test', { trackReferences: true });

    // Verify heat increased
    const score = heatStore.get('test');
    expect(score.referenceCount).toBe(1);
  });

  it('cold entries excluded from hot-tier-only retrieval', async () => {
    const hotEntry = createEntry({ id: 'hot', referenceCount: 10 });
    const coldEntry = createEntry({ id: 'cold', referenceCount: 0 });

    const results = await recallSearch('query', { minTier: 'hot' });

    expect(results).not.toContainEqual(expect.objectContaining({ id: 'cold' }));
  });
});
```

### 2.2 Heat → Dispatch Integration

**Scenario:** Dispatch cycle displays heat stats and increments references.

```typescript
// packages/core/src/integration/heat-dispatch.test.ts

describe('Heat + Dispatch Integration', () => {
  it('dispatch start increments heat for loaded context', async () => {
    // Setup: Memory with known entries
    const initialHeat = heatStore.get('bank.md');

    // Action: Start dispatch (loads context)
    await dispatchStart();

    // Assert: Heat incremented
    const newHeat = heatStore.get('bank.md');
    expect(newHeat.referenceCount).toBeGreaterThan(initialHeat.referenceCount);
  });

  it('dispatch status includes heat tier distribution', async () => {
    const status = await dispatchStatus({ verbose: true });

    expect(status.heatStats).toMatchObject({
      hot: expect.any(Number),
      warm: expect.any(Number),
      cold: expect.any(Number),
    });
  });

  it('dispatch complete records heat snapshot in metrics', async () => {
    await dispatchComplete({ action: 'Test action' });

    const metrics = getLatestCycleMetrics();
    expect(metrics.memoryHeatStats).toBeDefined();
    expect(metrics.memoryHeatStats.averageHeat).toBeGreaterThanOrEqual(0);
  });
});
```

### 2.3 Heat → Terminal Mode Integration (US-125-3)

**Scenario:** Terminal activity generates heat signals for files.

```typescript
// packages/core/src/integration/heat-terminal.test.ts

describe('Heat + Terminal Mode Integration', () => {
  it('file access in terminal generates heat signal', async () => {
    const collector = new SignalCollector();

    // Simulate: vim src/index.ts
    collector.recordSignal({
      type: 'file_access',
      filePath: 'src/index.ts',
      source: 'terminal:vim',
      weight: 0.8,
    });

    // Flush signals to heat store
    await collector.flush(heatStore);

    const score = heatStore.get('src/index.ts');
    expect(score.score).toBeGreaterThan(0);
  });

  it('test output boosts heat for tested files', async () => {
    const collector = new SignalCollector();

    // Simulate: npm test output mentioning file
    collector.recordSignal({
      type: 'test_output',
      filePath: 'src/heat/calculate.ts',
      source: 'terminal:npm test',
      weight: 0.6,
    });

    await collector.flush(heatStore);

    const score = heatStore.get('src/heat/calculate.ts');
    expect(score.tier).not.toBe('cold');
  });
});
```

---

## 3. Reflexion Integration Tests

### 3.1 Reflexion → Heat Integration

**Scenario:** Hot reflections have higher weight in pattern detection.

```typescript
// packages/core/src/integration/reflexion-heat.test.ts

describe('Reflexion + Heat Integration', () => {
  it('pattern confidence boosted for hot cycle reflections', () => {
    const history = [
      createHistoryEntry({
        cycle: 100,
        heatScore: 0.9,
        reflection: 'Always run tests',
      }),
      createHistoryEntry({
        cycle: 50,
        heatScore: 0.3,
        reflection: 'Always run tests',
      }),
      createHistoryEntry({
        cycle: 25,
        heatScore: 0.2,
        reflection: 'Always run tests',
      }),
    ];

    const patterns = detectPatterns(history, 'engineering');

    // Hot reflection (cycle 100) should boost confidence
    expect(patterns[0].confidence).toBeGreaterThan(0.7);
  });

  it('cold reflections still contribute to pattern count', () => {
    const history = [
      createHistoryEntry({
        cycle: 10,
        heatScore: 0.1,
        reflection: 'Check PR status',
      }),
      createHistoryEntry({
        cycle: 20,
        heatScore: 0.1,
        reflection: 'Check PR status',
      }),
      createHistoryEntry({
        cycle: 30,
        heatScore: 0.1,
        reflection: 'Check PR status',
      }),
    ];

    const patterns = detectPatterns(history, 'ops');

    // Pattern detected despite cold heat
    expect(patterns).toContainEqual(
      expect.objectContaining({ type: 'repeated_mistake', frequency: 3 })
    );
  });
});
```

### 3.2 Reflexion → Dispatch Integration

**Scenario:** Dispatch complete captures reflections and feeds pattern detection.

```typescript
// packages/core/src/integration/reflexion-dispatch.test.ts

describe('Reflexion + Dispatch Integration', () => {
  it('reflection saved to rotation history', async () => {
    await dispatchComplete({
      action: 'Test action',
      reflection: 'What worked: X. Lesson: Y.',
    });

    const history = loadRotationHistory();
    const latest = history[history.length - 1];

    expect(latest.reflection).toContain('What worked: X');
    expect(latest.reflection).toContain('Lesson: Y');
  });

  it('pattern detection runs periodically on history', async () => {
    // Setup: History with repeated pattern
    const history = createHistoryWithRepeatedPattern(
      'engineering',
      'lint before PR',
      5
    );

    // Run pattern detection
    const patterns = detectPatterns(history, 'engineering');

    expect(patterns).toContainEqual(
      expect.objectContaining({
        type: 'consistent_success',
        text: expect.stringContaining('lint'),
      })
    );
  });
});
```

---

## 4. Observability Integration Tests

### 4.1 Observability → Heat Integration

**Scenario:** Heat stats included in cycle metrics.

```typescript
// packages/core/src/integration/observe-heat.test.ts

describe('Observability + Heat Integration', () => {
  it('cycle metrics include heat distribution', async () => {
    await dispatchComplete({ action: 'Test' });

    const metrics = getLatestCycleMetrics();

    expect(metrics.memoryHeatStats).toMatchObject({
      hot: expect.any(Number),
      warm: expect.any(Number),
      cold: expect.any(Number),
      averageHeat: expect.any(Number),
    });
  });

  it('ada metrics shows heat trends over cycles', async () => {
    const report = await generateMetricsReport({ lastN: 10 });

    expect(report.heatTrend).toBeDefined();
    expect(report.heatTrend.direction).toMatch(/stable|increasing|decreasing/);
  });
});
```

### 4.2 Observability → Dispatch Integration

**Scenario:** Dispatch complete records all metrics.

```typescript
// packages/core/src/integration/observe-dispatch.test.ts

describe('Observability + Dispatch Integration', () => {
  it('complete records cycle duration', async () => {
    const startTime = Date.now();
    await dispatchStart();

    // Simulate work
    await sleep(100);

    await dispatchComplete({ action: 'Test' });

    const metrics = getLatestCycleMetrics();
    expect(metrics.durationMs).toBeGreaterThanOrEqual(100);
  });

  it('token estimation works when actual unavailable', async () => {
    await dispatchComplete({ action: 'Test action with some text' });

    const metrics = getLatestCycleMetrics();

    // Either actual or estimate should be present
    expect(metrics.tokensIn || metrics.tokensInEstimate).toBeGreaterThan(0);
  });
});
```

---

## 5. End-to-End Platform Scenarios

### 5.1 Full Dispatch Cycle with All Platform Features

**Scenario:** Complete dispatch cycle exercises heat, reflexion, and observability.

```bash
# E2E Test: tests/e2e/platform/full-cycle.test.ts

describe('E2E: Full Platform Dispatch Cycle', () => {
  it('complete cycle updates all platform systems', async () => {
    // 1. Start dispatch
    const startOutput = await runCli('ada dispatch start');
    expect(startOutput).toContain('Cycle');
    expect(startOutput).toContain('Role:');

    // 2. Check heat status
    const heatOutput = await runCli('ada heat list');
    expect(heatOutput).toMatch(/🔥|🌡️|❄️/); // Heat tier indicators

    // 3. Complete with reflection
    const completeOutput = await runCli(
      'ada dispatch complete ' +
      '--action "E2E test action" ' +
      '--reflection "What worked: Integration. Lesson: Always test."'
    );
    expect(completeOutput).toContain('committed');

    // 4. Verify metrics recorded
    const metricsOutput = await runCli('ada metrics --last 1');
    expect(metricsOutput).toContain('E2E test action');

    // 5. Verify rotation updated
    const statusOutput = await runCli('ada dispatch status');
    expect(statusOutput).not.toContain('In Progress');
  });
});
```

### 5.2 Heat Decay Over Multiple Cycles

**Scenario:** Heat scores decay appropriately over time.

```bash
# E2E Test: tests/e2e/platform/heat-decay.test.ts

describe('E2E: Heat Decay Over Cycles', () => {
  it('heat decays between cycles for non-innate entries', async () => {
    // Setup: Create entry and record reference
    await runCli('ada memory log "Test entry for decay"');

    // Get initial heat
    const initialHeat = await getHeatScore('test-entry-id');

    // Simulate time passage (or run decay manually)
    await runCli('ada heat decay --apply');

    // Verify decay applied
    const decayedHeat = await getHeatScore('test-entry-id');
    expect(decayedHeat.score).toBeLessThan(initialHeat.score);
  });

  it('innate memories never decay', async () => {
    // RULES.md is innate
    const initialScore = await getHeatScore('RULES.md');

    await runCli('ada heat decay --apply');

    const afterDecay = await getHeatScore('RULES.md');
    expect(afterDecay.score).toBe(initialScore.score);
    expect(afterDecay.tier).toBe('hot');
  });
});
```

### 5.3 Reflexion Pattern Detection

**Scenario:** Patterns detected after repeated reflections.

```bash
# E2E Test: tests/e2e/platform/reflexion-patterns.test.ts

describe('E2E: Reflexion Pattern Detection', () => {
  it('repeated mistake detected after 3+ occurrences', async () => {
    // Setup: Complete 3 cycles with same improvement note
    for (let i = 0; i < 3; i++) {
      await runCli('ada dispatch start --force'); // Force for testing
      await runCli(
        'ada dispatch complete ' +
        '--action "Test cycle" ' +
        '--reflection "What to improve: Always check types"'
      );
    }

    // Check for detected patterns
    const patterns = await runCli('ada reflexion patterns --role engineering');
    expect(patterns).toContain('repeated_mistake');
    expect(patterns).toContain('check types');
  });
});
```

---

## 6. Test Data Requirements

### 6.1 Fixtures

```
tests/fixtures/platform/
├── rotation-history-50cycles.json    # 50 cycles with varied reflections
├── memory-entries-heat-tiers.json    # Entries at hot/warm/cold tiers
├── terminal-signals-sample.jsonl     # Sample terminal heat signals
└── metrics-history-100cycles.json    # 100 cycles of observability data
```

### 6.2 Seed Data for E2E

```typescript
// tests/e2e/platform/setup.ts

export async function seedPlatformTestData() {
  // Create memory entries at different heat tiers
  await createEntry({ id: 'hot-entry', referenceCount: 20 });
  await createEntry({ id: 'warm-entry', referenceCount: 5 });
  await createEntry({ id: 'cold-entry', referenceCount: 0 });

  // Create rotation history with reflections
  await seedRotationHistory(50);

  // Create metrics history
  await seedMetricsHistory(100);
}
```

---

## 7. Success Criteria

### 7.1 Unit Test Coverage (Layer 1)

| Module     | Target Coverage | New Tests Required |
| ---------- | --------------- | ------------------ |
| heat/      | 90%+            | 20-25 tests        |
| reflexion/ | 85%+            | 15-20 tests        |
| observe/   | 85%+            | 10-15 tests        |
| terminal/  | Existing        | 5-10 new tests     |

### 7.2 Integration Test Coverage (Layers 2-3)

| Integration Point    | Test Count | Priority |
| -------------------- | ---------- | -------- |
| Heat + Memory        | 5-8        | P0       |
| Heat + Dispatch      | 4-6        | P0       |
| Heat + Terminal      | 3-5        | P1       |
| Reflexion + Heat     | 3-5        | P1       |
| Reflexion + Dispatch | 3-5        | P1       |
| Observe + Heat       | 3-4        | P2       |
| Observe + Dispatch   | 3-4        | P2       |

### 7.3 E2E Scenarios (Layer 4)

| Scenario               | Status | Sprint Week |
| ---------------------- | ------ | ----------- |
| Full dispatch cycle    | TODO   | Week 2      |
| Heat decay over cycles | TODO   | Week 2      |
| Reflexion patterns     | TODO   | Week 3      |
| Terminal heat signals  | TODO   | Week 3      |
| Metrics dashboard      | TODO   | Week 3      |

### 7.4 Definition of Done

Platform integration is complete when:

- [ ] All unit tests pass (1,094 existing + 50+ new)
- [ ] All integration tests pass (25+ new)
- [ ] All E2E scenarios pass (5-8 new)
- [ ] No P0 bugs open against platform features
- [ ] Heat stats visible in `ada dispatch status`
- [ ] Reflexion patterns detectable via `ada reflexion patterns`
- [ ] Metrics recorded for every dispatch cycle

---

## 8. Risk Mitigation

| Risk                              | Impact | Mitigation                            |
| --------------------------------- | ------ | ------------------------------------- |
| Integration test flakiness        | Medium | Deterministic seed data, no time deps |
| E2E tests slow CI                 | Low    | Parallel execution, test grouping     |
| Heat calculation edge cases       | Medium | Comprehensive unit tests first        |
| Pattern detection false positives | Medium | Conservative thresholds, human review |

---

## 9. Timeline

```
Week 1 (Feb 28 - Mar 6):
  - Heat module unit tests (Engineering)
  - Heat + Memory integration tests (Engineering)
  - Heat + Dispatch integration tests (Engineering)

Week 2 (Mar 7 - Mar 13):
  - Reflexion unit tests (Engineering)
  - Cross-package CLI tests (QA)
  - E2E: Full dispatch cycle (QA)
  - E2E: Heat decay (QA)

Week 3 (Mar 14 - Mar 20):
  - Observability integration tests (Engineering)
  - E2E: Reflexion patterns (QA)
  - E2E: Terminal signals (QA)
  - Final integration validation (QA)
```

---

## 10. Open Questions

1. **Test isolation:** Should E2E tests use separate `agents/` directory to avoid polluting real state?
2. **CI parallelization:** Can integration tests run in parallel, or do they share state?
3. **Snapshot testing:** Should we snapshot heat/reflexion outputs for regression detection?

---

_Platform integration testing ensures Sprint 2 features work together. Land unit tests Week 1, integration Week 2, E2E Week 3._

**— 🌌 The Frontier (Cycle 379)**
