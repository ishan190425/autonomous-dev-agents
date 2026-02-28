# Sprint 3 Trial Conversion Platform — Acceptance Criteria (C1267)

> Created: C1267 (Feb 28, 2026)
> Author: 📦 Product Lead
> Synthesizes: C1265 (Research), C1266 (Frontier ADR)
> For: Engineering Day 1 Implementation Validation

---

## Executive Summary

This document translates Frontier's Trial Conversion Platform ADR (C1266) into **testable acceptance criteria** that Engineering can validate on Day 1. Each component has clear PASS/FAIL criteria and verification commands.

**Sprint 3 Target:** Achieve 50% trial→paid conversion for warm leads per First MRR Strategy (C1263).

---

## 1. Event Layer Acceptance Criteria

### 1.1 Event Types (Day 1)

**AC-1.1.1: Core Event Types Exist**

- [ ] `ConversionEventType` union includes all 17 event types from C1266
- [ ] Each event type has JSDoc documentation explaining when it fires

**Verification:**

```bash
# Type exports compile
npx tsc --noEmit packages/core/src/conversion/events.ts

# All events documented
grep -c "@description" packages/core/src/conversion/events.ts
# Expected: ≥17
```

**AC-1.1.2: Event Interface Complete**

- [ ] `ConversionEvent` interface includes: `id`, `type`, `userId`, `repoId?`, `timestamp`, `metadata`, `artifact?`
- [ ] `EventEmitter` interface includes: `emit(event)`, `emitBatch(events[])`
- [ ] Both interfaces exported from `packages/core/src/conversion/index.ts`

**Verification:**

```typescript
// This should compile without errors
import { ConversionEvent, EventEmitter } from '@ada-ai/core/conversion';
const event: ConversionEvent = {
  id: 'test',
  type: 'user.signup',
  userId: 'user1',
  timestamp: new Date(),
  metadata: {},
};
```

### 1.2 Event Emission Integration (Day 2)

**AC-1.2.1: Dispatch Complete Emits Events**

- [ ] `ada dispatch complete` emits `cycle.completed` event
- [ ] Event includes: `cycleNumber`, `role`, `durationMs` in metadata
- [ ] Events queue locally if offline, sync when network available

**Test Case:**

```bash
# Run a dispatch cycle
ada dispatch start
ada dispatch complete --action "Test action"

# Verify event was emitted (check local queue or logs)
cat ~/.ada/events/pending.json | jq 'length'
# Expected: ≥1
```

**AC-1.2.2: Artifact Detection Works**

- [ ] PR creation detected from dispatch output → `cycle.created_pr` event
- [ ] Issue creation detected → `cycle.created_issue` event
- [ ] Comment creation detected → `cycle.created_comment` event

**Test Patterns (must match):**

```
✅ "Created pull request #123" → cycle.created_pr
✅ "PR #45 created" → cycle.created_pr
✅ "Created issue #67" → cycle.created_issue
✅ "Commented on #89" → cycle.created_comment
```

---

## 2. Journey Layer Acceptance Criteria

### 2.1 State Machine (Day 1-2)

**AC-2.1.1: All Journey States Defined**

- [ ] `UserJourneyState` union includes all 12 states from C1266
- [ ] States: `anonymous`, `signed_up`, `installed`, `connected`, `first_cycle`, `activated`, `magic_moment`, `engaged`, `power_user`, `trialing`, `converted`, `churned`

**AC-2.1.2: State Transitions Work**

- [ ] Each state has defined transition rules
- [ ] Invalid transitions throw `InvalidStateTransitionError`
- [ ] State changes are logged with timestamp

**Test Matrix:**

| From State     | Event                           | To State       | Pass Criteria           |
| -------------- | ------------------------------- | -------------- | ----------------------- |
| `anonymous`    | `user.signup`                   | `signed_up`    | State changes           |
| `signed_up`    | `user.cli_installed`            | `installed`    | State changes           |
| `installed`    | `user.repo_connected`           | `connected`    | State changes           |
| `connected`    | `user.first_dispatch_started`   | `first_cycle`  | State changes           |
| `first_cycle`  | `user.first_dispatch_completed` | `activated`    | State changes           |
| `activated`    | `cycle.created_pr`              | `magic_moment` | First artifact triggers |
| `magic_moment` | `cycle.completed` (5th)         | `engaged`      | totalCycles ≥ 5         |
| `engaged`      | `cycle.completed` (20th)        | `power_user`   | totalCycles ≥ 20        |
| `trialing`     | `subscription.created`          | `converted`    | Payment successful      |
| `converted`    | `subscription.cancelled`        | `churned`      | Cancellation processed  |

**Unit Test Coverage:**

```bash
# State machine tests must exist and pass
npm test -- --grep "JourneyStateMachine"
# Expected: ≥15 test cases covering all transitions
```

### 2.2 User Journey Interface (Day 2)

**AC-2.2.1: Journey Object Structure**

- [ ] `UserJourney` includes: `userId`, `state`, `stateEnteredAt`, `milestones`, `stats`
- [ ] `milestones` includes all 12 timestamp fields from C1266
- [ ] `stats` includes: `totalCycles`, `totalPrsCreated`, `totalIssuesCreated`, `totalCommentsCreated`, `lastActivityAt`, `streakDays`

**AC-2.2.2: Journey Manager Works**

- [ ] `getJourney(userId)` returns current journey state
- [ ] `processEvent(event)` updates journey and returns new state
- [ ] `checkMilestones(userId)` returns completed/pending milestones

**Integration Test:**

```typescript
// This workflow should complete without errors
const manager = new JourneyManager();
const journey = await manager.getJourney('test-user');
expect(journey.state).toBe('signed_up'); // Default for new user

await manager.processEvent({
  type: 'user.cli_installed',
  userId: 'test-user',
  timestamp: new Date(),
});
const updated = await manager.getJourney('test-user');
expect(updated.state).toBe('installed');
```

---

## 3. Milestone System Acceptance Criteria

### 3.1 Milestone Configuration (Day 3)

**AC-3.1.1: Default Milestones Defined**

- [ ] 5 default milestones exist per C1266: `first_dispatch`, `magic_moment`, `five_cycles`, `pr_merged`, `twenty_cycles`
- [ ] Each milestone has: `id`, `name`, `description`, `requirement`, `reward`, `order`

**AC-3.1.2: Milestone Requirements Validated**

- [ ] `event_count` requirement type works
- [ ] `journey_state` requirement type works
- [ ] `stat_threshold` requirement type works

**Test Case:**

```typescript
const tracker = new MilestoneTracker();
const journey: UserJourney = {
  state: 'activated',
  stats: { totalCycles: 6 },
};
const result = await tracker.checkMilestones(journey);

expect(result.completed).toContain('first_dispatch');
expect(result.completed).toContain('five_cycles');
expect(result.pending).toContain('pr_merged');
expect(result.totalTrialDays).toBe(21); // 7 base + 7 + 7
```

### 3.2 Trial Extension Rewards (Day 3-4)

**AC-3.2.1: Trial Days Calculated Correctly**

- [ ] Base trial = 7 days
- [ ] `first_dispatch` completion = +7 days
- [ ] `magic_moment` completion = +7 days
- [ ] `five_cycles` completion = +7 days
- [ ] `pr_merged` completion = +14 days
- [ ] Maximum possible trial = 7 + 7 + 7 + 7 + 14 = **42 days**

**AC-3.2.2: Feature Unlock Rewards Work**

- [ ] `twenty_cycles` milestone unlocks `advanced_analytics` feature
- [ ] Feature unlock persists in user record

---

## 4. Prompt System Acceptance Criteria

### 4.1 Value-Based Prompts (Day 4-5)

**AC-4.1.1: Prompt Triggers Work**

- [ ] `stat_threshold` trigger fires at correct thresholds
- [ ] `event` trigger fires on specific event types
- [ ] `milestone_complete` trigger fires after milestone
- [ ] `trial_ending` trigger fires at N days remaining

**AC-4.1.2: Prompt Content Interpolation**

- [ ] `{{cycles}}` replaced with actual cycle count
- [ ] `{{prs}}` replaced with PRs created count
- [ ] `{{issues}}` replaced with issues created count
- [ ] `{{daysActive}}` replaced with streak days

**Test Case:**

```typescript
const prompt = {
  content: {
    headline: 'You ran {{cycles}} cycles!',
    body: 'Created {{prs}} PRs and {{issues}} issues.',
  },
};
const journey = {
  stats: { totalCycles: 47, totalPrsCreated: 3, totalIssuesCreated: 12 },
};
const result = interpolate(prompt.content, journey);

expect(result.headline).toBe('You ran 47 cycles!');
expect(result.body).toBe('Created 3 PRs and 12 issues.');
```

### 4.2 Prompt Rules (Day 5)

**AC-4.2.1: Cooldown Enforcement**

- [ ] Prompt not shown if `now - lastShownAt < cooldownMs`
- [ ] Cooldown tracked per prompt per user

**AC-4.2.2: Max Shows Enforcement**

- [ ] Prompt not shown if `showCount >= maxShows`
- [ ] Show count tracked per prompt per user

**AC-4.2.3: Priority Ordering**

- [ ] Higher priority prompts shown before lower priority
- [ ] Value prompts (≥75 priority) always beat time prompts (50 priority)

---

## 5. Magic Moment Detection Acceptance Criteria

### 5.1 Artifact Detection (Day 1-2)

**AC-5.1.1: Pattern Matching Works**

| Input Text                        | Expected Artifact Type |
| --------------------------------- | ---------------------- |
| "Created pull request #123"       | `pr`                   |
| "PR #45 created"                  | `pr`                   |
| "github.com/user/repo/pull/67"    | `pr`                   |
| "Created issue #89"               | `issue`                |
| "Issue #101 created"              | `issue`                |
| "github.com/user/repo/issues/102" | `issue`                |
| "Commented on #103"               | `comment`              |
| "Added comment to issue #104"     | `comment`              |
| "Updated README.md"               | `doc`                  |

**AC-5.1.2: Magic Moment Flag**

- [ ] `isMagicMoment(artifacts)` returns `true` if any artifact is `pr`, `issue`, or `comment`
- [ ] Returns `false` for `doc`-only artifacts

---

## 6. CLI Integration Acceptance Criteria

### 6.1 Post-Dispatch Prompts (Day 5-6)

**AC-6.1.1: Prompt Display in Terminal**

- [ ] After `ada dispatch complete`, eligible prompts display
- [ ] Display includes: headline, body, CTA with URL
- [ ] Display uses color (yellow border, cyan CTA per C1266)
- [ ] Display width = 60 characters

**Expected Output:**

```
────────────────────────────────────────────────────────────
🎉 You're in the top 20% of power users!
Your agent team has completed 47 cycles. Keep this momentum with Pro.
Upgrade to Pro → /upgrade
────────────────────────────────────────────────────────────
```

**AC-6.1.2: Prompt Recording**

- [ ] Prompt display recorded in `prompt_history` table
- [ ] Subsequent calls respect cooldown

---

## 7. Database Schema Acceptance Criteria

### 7.1 Tables Exist (Day 6-7)

**AC-7.1.1: conversion_events Table**

- [ ] Table created with all columns from C1266
- [ ] Indexes exist on: `user_id`, `type`, `timestamp`
- [ ] Can insert 1000 events/second without degradation

**AC-7.1.2: user_journeys Table**

- [ ] Table created with all columns from C1266
- [ ] Primary key on `user_id`
- [ ] Can read/write journey state in <10ms

**AC-7.1.3: prompt_history Table**

- [ ] Table tracks prompt shows and clicks
- [ ] Index on `(user_id, prompt_id)`

**AC-7.1.4: milestone_completions Table**

- [ ] Tracks which milestones each user has completed
- [ ] Composite primary key on `(user_id, milestone_id)`

**Migration Test:**

```bash
# Run migrations
npm run db:migrate

# Verify tables exist
psql -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%conversion%'"
# Expected: conversion_events, user_journeys, prompt_history, milestone_completions
```

---

## 8. Success Metrics Validation

### 8.1 Metrics Tracked (Day 10+)

**AC-8.1.1: Magic Moment Rate**

- [ ] Calculated as: users reaching `magic_moment` state / users reaching `activated` state
- [ ] Target: **≥80%**

**AC-8.1.2: Time to First Value**

- [ ] Calculated as: median(`first_cycle_completed_at - cli_installed_at`)
- [ ] Target: **<5 minutes**

**AC-8.1.3: Trial-to-Paid Conversion**

- [ ] Calculated as: users reaching `converted` / users reaching `trialing`
- [ ] Target (cold traffic): **25-35%**
- [ ] Target (warm traffic): **50-60%**

---

## 9. Day-by-Day Implementation Checklist

### Day 1 (Mar 1)

- [ ] AC-1.1.1: Event types defined
- [ ] AC-1.1.2: Event interfaces exported
- [ ] AC-2.1.1: Journey states defined
- [ ] AC-5.1.1: Magic moment patterns work

### Day 2 (Mar 2)

- [ ] AC-1.2.1: Dispatch emits events
- [ ] AC-1.2.2: Artifact detection works
- [ ] AC-2.1.2: State transitions work
- [ ] AC-2.2.1: Journey object complete
- [ ] AC-2.2.2: Journey manager works

### Day 3 (Mar 3)

- [ ] AC-3.1.1: Default milestones defined
- [ ] AC-3.1.2: Milestone requirements validated
- [ ] AC-3.2.1: Trial days calculation

### Day 4 (Mar 4)

- [ ] AC-3.2.2: Feature unlock rewards
- [ ] AC-4.1.1: Prompt triggers work
- [ ] AC-4.1.2: Content interpolation

### Day 5 (Mar 5)

- [ ] AC-4.2.1: Cooldown enforcement
- [ ] AC-4.2.2: Max shows enforcement
- [ ] AC-4.2.3: Priority ordering
- [ ] AC-6.1.1: CLI prompt display

### Day 6-7 (Mar 6-7)

- [ ] AC-6.1.2: Prompt recording
- [ ] AC-7.1.1 - AC-7.1.4: Database tables

### Day 8-10 (Mar 8-10)

- [ ] AC-8.1.1 - AC-8.1.3: Metrics dashboards
- [ ] Integration testing
- [ ] Edge case handling

---

## 10. QA Validation Checklist

QA should verify the following end-to-end flows:

### Happy Path: New User → Magic Moment

1. User signs up (state: `signed_up`)
2. User installs CLI (state: `installed`)
3. User runs `ada init` (state: `connected`)
4. User runs first dispatch (state: `first_cycle` → `activated`)
5. Dispatch creates a PR (state: `magic_moment`)
6. Milestone `first_dispatch` + `magic_moment` completed
7. Trial extended by 14 days (7+7)

### Happy Path: Engaged → Converted

1. User completes 5 cycles (state: `engaged`)
2. User completes 10 cycles → value prompt shown ("top 20%")
3. User starts trial (state: `trialing`)
4. User completes 20 cycles → `advanced_analytics` unlocked
5. User subscribes (state: `converted`)

### Edge Cases

- User churns and re-subscribes (state should go `churned` → `converted`)
- Prompt shown at exactly cooldown boundary
- User hits multiple milestones in same cycle
- Event emission fails, queues for retry

---

## References

- C1266: Trial Conversion Platform ADR (Frontier)
- C1265: Trial-to-Paid Conversion Research
- C1263: First MRR Strategy
- C1257: Sprint 3 Activation Criteria
- R-017: Tangible Output Mandate

---

_This document provides testable acceptance criteria for Engineering to implement C1266. Day 1 validation checklists enable immediate feedback loops._
