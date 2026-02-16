# Phase 1 Container MVP — QA Test Plan

> Test plan for validating ADA SaaS Container MVP
> **Author:** 🔍 QA (The Inspector) | **Cycle:** 716
> **Timeline:** Feb 17 → Feb 26-Mar 7, 2026
> **Related:** Product Spec (C714), Issue #155, #34

---

## Executive Summary

This test plan defines the quality gates for Phase 1 Container MVP. Every acceptance criterion from the Product spec (C714) must be validated before release. The plan covers unit tests, integration tests, E2E tests, and manual verification procedures.

**Testing Philosophy:** Container deployment is a critical customer touchpoint. A failed deployment = lost customer. We validate exhaustively before any external release.

---

## Test Strategy

### Test Pyramid for Container MVP

```
        ┌─────────────────┐
        │   Manual QA     │  ← Dogfooding (50+ cycles)
        │   Validation    │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │   E2E Tests     │  ← Full container lifecycle
        │   (Dockerfile)  │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │  Integration    │  ← GitHub API, Cron, Health
        │     Tests       │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │   Unit Tests    │  ← Config validation, env parsing
        └─────────────────┘
```

### Test Environments

| Environment         | Purpose                | Infrastructure     |
| ------------------- | ---------------------- | ------------------ |
| **Local Docker**    | Development testing    | Developer machines |
| **CI (GitHub)**     | PR validation          | GitHub Actions     |
| **Railway Staging** | Pre-release dogfooding | Railway project    |
| **Railway Prod**    | Live dogfooding on ADA | Railway project    |

---

## Test Suites

### 1. Unit Tests (packages/cli/tests/unit/)

#### 1.1 Environment Variable Validation

```typescript
// container/env-validation.unit.test.ts

describe('Container Environment Validation', () => {
  describe('Required Variables', () => {
    it('fails with clear error when GITHUB_TOKEN missing', () => {});
    it('fails with clear error when GITHUB_REPO missing', () => {});
    it('fails with clear error when ANTHROPIC_API_KEY missing', () => {});
    it('validates GITHUB_TOKEN format (ghp_ or github_pat_ prefix)', () => {});
    it('validates GITHUB_REPO format (owner/repo)', () => {});
    it('validates ANTHROPIC_API_KEY format (sk-ant- prefix)', () => {});
  });

  describe('Optional Variables', () => {
    it('uses default ADA_DISPATCH_INTERVAL of 15m when not set', () => {});
    it('parses ADA_DISPATCH_INTERVAL formats: 15m, 30m, 1h', () => {});
    it('rejects invalid ADA_DISPATCH_INTERVAL values', () => {});
    it('uses default ADA_ROLES_MODE of read-write when not set', () => {});
    it('validates ADA_ROLES_MODE is read-only or read-write', () => {});
    it('uses default ADA_LOG_LEVEL of info when not set', () => {});
    it('validates ADA_LOG_LEVEL is debug, info, or warn', () => {});
  });

  describe('Startup Validation', () => {
    it('validates all env vars on startup, not at first use', () => {});
    it('provides actionable error messages for each validation failure', () => {});
    it('exits with code 1 on validation failure', () => {});
  });
});
```

**Priority:** P0 | **Estimated Tests:** 15 | **Owner:** Engineering

#### 1.2 Permission Mode Logic

```typescript
// container/permission-modes.unit.test.ts

describe('Container Permission Modes', () => {
  describe('Read-Only Mode', () => {
    it('allows creating issues', () => {});
    it('allows commenting on issues and PRs', () => {});
    it('allows reading repository contents', () => {});
    it('blocks push commits', () => {});
    it('blocks creating PRs', () => {});
    it('blocks merging', () => {});
  });

  describe('Read-Write Mode', () => {
    it('allows all read-only operations', () => {});
    it('allows creating branches', () => {});
    it('allows pushing commits', () => {});
    it('allows creating PRs', () => {});
    it('blocks force push', () => {});
    it('blocks deleting branches', () => {});
    it('blocks admin actions', () => {});
  });
});
```

**Priority:** P0 | **Estimated Tests:** 13 | **Owner:** Engineering

---

### 2. Integration Tests (packages/cli/tests/integration/)

#### 2.1 GitHub API Integration

```typescript
// container/github-integration.int.test.ts

describe('Container GitHub Integration', () => {
  describe('Authentication', () => {
    it('authenticates successfully with valid PAT', () => {});
    it('returns clear error for invalid PAT', () => {});
    it('returns clear error for PAT without repo scope', () => {});
  });

  describe('Rate Limiting', () => {
    it('detects rate limit headers', () => {});
    it('applies exponential backoff on 429', () => {});
    it('resumes operations when rate limit resets', () => {});
  });

  describe('Repository Operations', () => {
    it('can list issues on target repo', () => {});
    it('can create issue on target repo', () => {});
    it('can comment on issue', () => {});
    it('can read file contents', () => {});
    it('(read-write) can create branch', () => {});
    it('(read-write) can push commit', () => {});
    it('(read-write) can create PR', () => {});
  });
});
```

**Priority:** P0 | **Estimated Tests:** 13 | **Owner:** Engineering
**Note:** Use MSW mocks for unit tests, real API for integration (with test repo)

#### 2.2 Health Endpoint

```typescript
// container/health-endpoint.int.test.ts

describe('Container Health Endpoint', () => {
  it('returns 200 OK when container is healthy', () => {});
  it('returns status: healthy in response body', () => {});
  it('includes lastCycle count in response', () => {});
  it('includes uptime in response', () => {});
  it('returns JSON content-type', () => {});
  it('responds within 100ms', () => {});
});
```

**Priority:** P1 | **Estimated Tests:** 6 | **Owner:** Engineering

#### 2.3 Cron Scheduler

```typescript
// container/cron-scheduler.int.test.ts

describe('Container Cron Scheduler', () => {
  it('schedules first dispatch within 2 minutes of start', () => {});
  it('schedules subsequent dispatches at configured interval', () => {});
  it('parses 15m interval correctly', () => {});
  it('parses 30m interval correctly', () => {});
  it('parses 1h interval correctly', () => {});
  it('continues scheduling after dispatch failure', () => {});
});
```

**Priority:** P0 | **Estimated Tests:** 6 | **Owner:** Engineering

---

### 3. E2E Tests (packages/cli/tests/e2e/)

#### 3.1 Container Lifecycle

```typescript
// container/lifecycle.e2e.test.ts

describe('Container Lifecycle E2E', () => {
  describe('Build', () => {
    it('docker build succeeds with no errors', () => {});
    it('image size is under 500MB', () => {});
    it('image has required labels (version, maintainer)', () => {});
  });

  describe('Startup', () => {
    it('container starts in under 10 seconds', () => {});
    it('container logs startup message', () => {});
    it('health endpoint becomes available within 30s', () => {});
  });

  describe('Shutdown', () => {
    it('container exits cleanly on SIGTERM', () => {});
    it('in-progress dispatch completes before shutdown', () => {});
    it('exit code is 0 on clean shutdown', () => {});
  });

  describe('Restart', () => {
    it('rotation state persists across container restart', () => {});
    it('no duplicate dispatches on restart', () => {});
  });
});
```

**Priority:** P0 | **Estimated Tests:** 11 | **Owner:** QA + Engineering

#### 3.2 Full Dispatch Cycle

```typescript
// container/dispatch-cycle.e2e.test.ts

describe('Container Dispatch Cycle E2E', () => {
  it('completes full dispatch cycle with valid config', () => {});
  it('creates GitHub issue during cycle', () => {});
  it('updates memory bank during cycle', () => {});
  it('advances rotation state after cycle', () => {});
  it('logs cycle completion to stdout', () => {});
  it('handles cycle failure gracefully (container stays up)', () => {});
});
```

**Priority:** P0 | **Estimated Tests:** 6 | **Owner:** QA

#### 3.3 Error Scenarios

```typescript
// container/error-scenarios.e2e.test.ts

describe('Container Error Scenarios E2E', () => {
  describe('Configuration Errors', () => {
    it('container stays up with invalid GitHub token', () => {});
    it('logs clear error for invalid GitHub token', () => {});
    it('container stays up with invalid Anthropic key', () => {});
    it('logs clear error for invalid Anthropic key', () => {});
  });

  describe('Runtime Errors', () => {
    it('handles GitHub API rate limit gracefully', () => {});
    it('handles Anthropic API error gracefully', () => {});
    it('handles network timeout gracefully', () => {});
    it('retries failed operations with backoff', () => {});
  });
});
```

**Priority:** P0 | **Estimated Tests:** 8 | **Owner:** QA

---

### 4. Manual QA Validation

#### 4.1 Dogfooding Checklist (50+ Cycles)

| #   | Check                                             | Pass | Notes |
| --- | ------------------------------------------------- | ---- | ----- |
| 1   | Container builds from Dockerfile                  | ⬜   |       |
| 2   | Container deploys to Railway                      | ⬜   |       |
| 3   | First dispatch runs within 5 min                  | ⬜   |       |
| 4   | 10 consecutive cycles complete                    | ⬜   |       |
| 5   | 50 consecutive cycles complete                    | ⬜   |       |
| 6   | No manual intervention needed                     | ⬜   |       |
| 7   | Health endpoint responds correctly                | ⬜   |       |
| 8   | Logs are JSON formatted and readable              | ⬜   |       |
| 9   | Container restarts cleanly after Railway redeploy | ⬜   |       |
| 10  | Rotation state persists across restart            | ⬜   |       |

#### 4.2 Documentation Verification

| #   | Document Section                | Complete | Accurate | Clear |
| --- | ------------------------------- | -------- | -------- | ----- |
| 1   | Quick Start (< 5 min to deploy) | ⬜       | ⬜       | ⬜    |
| 2   | Environment Variable Reference  | ⬜       | ⬜       | ⬜    |
| 3   | Railway Deploy Button           | ⬜       | ⬜       | ⬜    |
| 4   | Troubleshooting Guide           | ⬜       | ⬜       | ⬜    |
| 5   | Example Cycle Output            | ⬜       | ⬜       | ⬜    |

#### 4.3 Railway Deploy Test

Execute Railway one-click deploy with fresh Railway account:

| Step | Action                             | Expected Result          | Pass |
| ---- | ---------------------------------- | ------------------------ | ---- |
| 1    | Click Railway deploy button        | Template loads           | ⬜   |
| 2    | Enter required env vars            | Form validates           | ⬜   |
| 3    | Deploy                             | Build starts             | ⬜   |
| 4    | Wait for deployment                | Container goes green     | ⬜   |
| 5    | Check logs                         | First dispatch scheduled | ⬜   |
| 6    | Wait 5 min                         | First cycle completes    | ⬜   |
| 7    | Check target repo                  | Issue/PR/commit visible  | ⬜   |
| 8    | Total time from button to dispatch | < 10 minutes             | ⬜   |

---

## Test Data Requirements

### Test Repository

- Create `ada-test-container` repo for integration/E2E tests
- Initialize with `ada init`
- Configure test PAT with minimal permissions
- Reset state between test runs

### Mock Services

- MSW handlers for GitHub API (unit tests)
- MSW handlers for Anthropic API (unit tests)
- Test fixture for successful dispatch response

---

## CI Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/container-tests.yml
name: Container Tests
on:
  pull_request:
    paths:
      - 'Dockerfile'
      - 'docker/**'
      - 'packages/cli/src/container/**'
      - 'packages/cli/tests/container/**'

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit -- --filter=container

  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:integration -- --filter=container

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - run: docker build -t ada-container-test .
      - run: npm ci
      - run: npm run test:e2e -- --filter=container
```

---

## Quality Gates

### Before Phase 1 Development (Feb 17)

| Gate                              | Required | Status |
| --------------------------------- | -------- | ------ |
| Test plan reviewed by Product     | ✅       | ⬜     |
| Test plan reviewed by Engineering | ✅       | ⬜     |
| CI workflow created               | ✅       | ⬜     |
| Test repo created                 | ✅       | ⬜     |

### Before Internal Dogfooding (Feb 23)

| Gate                          | Required | Status |
| ----------------------------- | -------- | ------ |
| All unit tests written        | ✅       | ⬜     |
| All unit tests passing        | ✅       | ⬜     |
| All integration tests written | ✅       | ⬜     |
| All integration tests passing | ✅       | ⬜     |
| E2E lifecycle tests written   | ✅       | ⬜     |
| E2E lifecycle tests passing   | ✅       | ⬜     |

### Before External Release (Feb 26+)

| Gate                           | Required | Status |
| ------------------------------ | -------- | ------ |
| All E2E tests written          | ✅       | ⬜     |
| All E2E tests passing          | ✅       | ⬜     |
| 50+ dogfooding cycles complete | ✅       | ⬜     |
| Manual QA checklist complete   | ✅       | ⬜     |
| Documentation verified         | ✅       | ⬜     |
| Railway deploy test complete   | ✅       | ⬜     |

---

## Test Coverage Targets

| Area             | Current | Target | Gap |
| ---------------- | ------- | ------ | --- |
| Env validation   | 0%      | 100%   | NEW |
| Permission modes | 0%      | 100%   | NEW |
| Health endpoint  | 0%      | 100%   | NEW |
| Cron scheduler   | 0%      | 80%    | NEW |
| Container E2E    | 0%      | 80%    | NEW |
| Error scenarios  | 0%      | 90%    | NEW |

**Total new tests required:** ~78 tests

---

## Risk Assessment

| Risk                        | Impact | Likelihood | Mitigation                        |
| --------------------------- | ------ | ---------- | --------------------------------- |
| E2E tests slow CI           | Medium | High       | Run E2E only on container changes |
| Test repo rate limited      | High   | Medium     | Use MSW for most tests            |
| Railway deploy flaky        | High   | Low        | Manual verification as backup     |
| Anthropic API errors in E2E | Medium | Medium     | Mock Anthropic in most tests      |

---

## Timeline Integration

| Date      | QA Milestone                     | Dependency           |
| --------- | -------------------------------- | -------------------- |
| Feb 17    | Test plan complete (this doc) ✅ | Product spec C714    |
| Feb 18-19 | Unit test stubs created          | Dockerfile started   |
| Feb 20-21 | Unit + integration tests written | Env config code done |
| Feb 22    | E2E test infrastructure ready    | Container builds     |
| Feb 23-25 | E2E tests + dogfooding           | Railway deployed     |
| Feb 26    | QA sign-off on Phase 1 MVP       | All gates passed     |

---

## Related Documents

- **Product Spec C714:** Phase 1 Container MVP Specification
- **Research C712:** SaaS Container Deployment Research
- **Frontier C713:** LLM Cost Optimization Architecture
- **E2E Coverage Audit (C705):** Current E2E test status
- **Issue #34:** E2E Testing Infrastructure
- **Issue #155:** SaaS Container tracking issue

---

_🔍 QA | The Inspector | Cycle 716 | Phase 1 Container Test Plan_
