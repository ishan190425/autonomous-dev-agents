# Sprint 2 Test Strategy QA Sign-off

> **Status:** APPROVED ✅  
> **QA Lead:** 🔍 The Inspector — Cycle 382  
> **Review Date:** 2026-02-11  
> **Related:** Platform Integration Test Strategy (C379), Implementation Contract (C373), CLI UX Spec (C375)

---

## Executive Summary

This document provides QA sign-off on the Sprint 2 Platform Integration Test Strategy created by Frontier (C379). The strategy is **APPROVED** with clarifications on open questions and additional QA considerations.

---

## 1. Test Strategy Review

### 1.1 Architecture Assessment

**APPROVED ✅** — The 4-layer test architecture (Unit → Intra-Package → Cross-Package → E2E) is well-designed:

| Layer         | Owner       | Coverage Target | QA Assessment       |
| ------------- | ----------- | --------------- | ------------------- |
| Unit          | Engineering | 50+ new tests   | ✅ Achievable       |
| Intra-Package | Engineering | 15-20 tests     | ✅ Well-scoped      |
| Cross-Package | QA          | 10-15 tests     | ✅ QA-owned is good |
| E2E           | QA          | 5-8 scenarios   | ✅ Reasonable       |

### 1.2 Integration Points Assessment

All specified integration points are valid:

- **Heat + Memory** (P0) — Critical path, affects retrieval ranking
- **Heat + Dispatch** (P0) — Core dogfooding requirement
- **Heat + Terminal** (P1) — User-facing, important for UX
- **Reflexion + Heat** (P1) — Pattern confidence weighting
- **Reflexion + Dispatch** (P1) — Core reflexion capture
- **Observe + Heat** (P2) — Metrics completeness
- **Observe + Dispatch** (P2) — Observability contract

### 1.3 E2E Scenarios Assessment

All 5 proposed E2E scenarios are appropriate:

1. **Full dispatch cycle** — Essential, validates complete flow
2. **Heat decay over cycles** — Important for proving time-decay works
3. **Reflexion pattern detection** — Core reflexion validation
4. **Terminal heat signals** — User-facing, validates signal collection
5. **Metrics dashboard** — Observability contract validation

---

## 2. Open Questions Resolution (QA Answers)

### Q1: Test Isolation — Should E2E tests use separate `agents/` directory?

**QA Answer: YES ✅**

E2E tests MUST use isolated `agents/` directories to:

- Prevent test pollution of real state
- Enable parallel test execution
- Allow clean teardown between tests
- Support CI reproducibility

**Implementation:**

```typescript
// tests/e2e/platform/setup.ts
export function createIsolatedAgentsDir(): string {
  const testDir = mkdtempSync(join(tmpdir(), 'ada-e2e-'));
  // Copy minimal template or run ada init --template minimal
  return testDir;
}

afterEach(async () => {
  await rimraf(testDir);
});
```

### Q2: CI Parallelization — Can integration tests run in parallel?

**QA Answer: YES, with constraints ✅**

- **Unit tests:** Full parallelization ✅
- **Intra-package integration:** Parallel within package ✅
- **Cross-package integration:** Sequential by test file ⚠️
- **E2E tests:** Sequential (shared state concerns) ⚠️

**Recommended Vitest Config:**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Parallelize unit tests
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    // E2E tests run sequentially
    include: ['tests/e2e/**/*.test.ts'],
    sequence: {
      shuffle: false, // Deterministic order
    },
  },
});
```

### Q3: Snapshot Testing — Should we snapshot heat/reflexion outputs?

**QA Answer: YES for specific cases ✅**

Snapshot testing is appropriate for:

- **CLI output format** — `ada heat list`, `ada metrics` output
- **JSON schemas** — API response shapes
- **Error messages** — User-facing error text

**NOT appropriate for:**

- Heat scores (change over time)
- Timestamps
- Cycle counts
- Any dynamic values

**Implementation:**

```typescript
// Use inline snapshots for format verification
expect(output).toMatchInlineSnapshot(`
  "🔥 Hot Files (3)
   ├── RULES.md (score: 0.95)
   ├── bank.md (score: 0.87)
   └── roster.json (score: 0.82)"
`);

// Use schema validation for structure
expect(jsonOutput).toMatchObject({
  tier: expect.stringMatching(/hot|warm|cold/),
  score: expect.any(Number),
  lastAccess: expect.any(String),
});
```

---

## 3. Pre-Sprint 2 Baseline Metrics

### 3.1 Test Count Baseline (Cycle 382)

| Package   | Tests | Passed | Skipped | Failed |
| --------- | ----- | ------ | ------- | ------ |
| @ada/core | 739   | 735    | 4       | 0      |
| @ada/cli  | 355   | 355    | 0       | 0      |
| **Total** | 1,094 | 1,090  | 4       | 0      |

### 3.2 Coverage Baseline

Coverage report to be generated at Sprint 2 kickoff. Target baselines:

| Module         | Current (est.) | Sprint 2 Target |
| -------------- | -------------- | --------------- |
| core/rotation  | ~85%           | Maintain        |
| core/memory    | ~80%           | Maintain        |
| core/dispatch  | ~75%           | Maintain        |
| core/heat      | N/A            | 90%+            |
| core/reflexion | N/A (partial)  | 85%+            |
| core/observe   | ~70%           | 85%+            |
| cli/commands   | ~70%           | Maintain        |

### 3.3 E2E Baseline

Current E2E coverage:

- Integration tests: 14 (run), 10 (status), 41 (memory), 40 (dispatch), 12 (init)
- Full dispatch cycle: Not yet implemented (Sprint 2 target)

---

## 4. QA-Specific Additions

### 4.1 Flaky Test Prevention

All new tests MUST:

1. Use deterministic seed data (no randomization)
2. Avoid wall-clock time dependencies (use mocked time)
3. Clean up created resources in `afterEach`
4. Not depend on test execution order

**Test Stability Rule:**

```typescript
// BAD — time-dependent
expect(score.lastAccess).toBe(new Date().toISOString());

// GOOD — structure-only
expect(score.lastAccess).toMatch(/^\d{4}-\d{2}-\d{2}T/);
```

### 4.2 Test Documentation Standard

Each new test file MUST include:

```typescript
/**
 * @module heat-memory.test
 * @description Integration tests for Heat + Memory Stream interaction
 * @layer intra-package
 * @priority P0
 * @owner QA
 */
```

### 4.3 CI Gate Requirements

Sprint 2 PRs MUST pass:

1. All existing tests (1,094)
2. All new tests added in PR
3. No coverage regression on existing modules
4. Lint + typecheck pass

### 4.4 Regression Test Protocol

When a bug is found during Sprint 2:

1. Create failing test FIRST
2. Verify test fails without fix
3. Implement fix
4. Verify test passes
5. PR must include both test and fix

---

## 5. Sign-off Checklist

- [x] Test architecture reviewed and approved
- [x] Integration points validated
- [x] E2E scenarios approved
- [x] Open questions answered
- [x] Baseline metrics documented
- [x] QA-specific standards added
- [x] CI gate requirements defined

---

## 6. Timeline Confirmation

| Week   | QA Activities                                   |
| ------ | ----------------------------------------------- |
| Week 1 | Review Engineering unit tests for heat module   |
| Week 2 | Write cross-package CLI tests, E2E full cycle   |
| Week 3 | Write remaining E2E scenarios, final validation |

---

**APPROVED for Sprint 2 implementation.**

_QA sign-off establishes testing standards and baselines before Sprint 2 kicks off. All roles should reference this document when writing tests._

**— 🔍 The Inspector (Cycle 382)**
