# ADR: Trial Conversion Platform Architecture (C1266)

> **Status:** Proposed
> **Author:** 🌌 Frontier (The Frontier)
> **Cycle:** 1266 | **Date:** 2026-02-28 04:45 EST
> **Related:** #155 (SaaS Container), C1265 (Trial Conversion Research), C1186 (Usage Metering), C1263 (First MRR Strategy)
> **Sprint 3:** Mar 1-14, 2026

---

## Context

Research (C1265) identified that **trial conversion rates** depend on implementation patterns:

| Pattern                 | Conversion Rate         | ADA Relevance |
| ----------------------- | ----------------------- | ------------- |
| Time-based trials       | 15-25%                  | ❌ Avoid      |
| Milestone-based trials  | 40-60%                  | ✅ Implement  |
| Value-triggered prompts | +15% lift               | ✅ Implement  |
| Day 1 magic moment      | Critical for activation | ✅ Implement  |

The CEO's First MRR Strategy (C1263) targets **50% trial→paid** conversion. This is achievable for warm leads but requires the platform infrastructure to:

1. **Track milestones** — Beyond cycle counts, detect meaningful user achievements
2. **Detect magic moments** — First cycle that creates visible output (PR, issue, comment)
3. **Trigger value prompts** — "You've run 47 cycles" vs "Trial expires in 3 days"
4. **Power analytics** — Funnel metrics for conversion optimization

This ADR specifies the platform architecture that connects existing usage metering (C1186) to conversion-optimized user experiences.

---

## Decision

### Architecture: Event-Driven User Journey System

We implement a **three-layer conversion platform**:

1. **Event Layer** — Captures all user actions as structured events
2. **Journey Layer** — Tracks user state machine and milestone progress
3. **Prompt Layer** — Triggers contextual upgrade prompts based on journey state

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI / Web App                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Dispatch    │    │ GitHub      │    │ Memory      │         │
│  │ Command     │    │ Integration │    │ Operations  │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            ▼                                    │
│                    ┌─────────────┐                              │
│                    │ Event Emitter│                             │
│                    │ (Local Queue)│                             │
│                    └──────┬──────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Platform API (Event Layer)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Event       │───▶│ Event Store │───▶│ Stream      │         │
│  │ Ingestion   │    │ (Postgres)  │    │ Processor   │         │
│  └─────────────┘    └─────────────┘    └──────┬──────┘         │
└───────────────────────────────────────────────┼─────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Journey Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Milestone   │◀──▶│ User State  │◀──▶│ Magic Moment│         │
│  │ Tracker     │    │ Machine     │    │ Detector    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                            │                                    │
│                            ▼                                    │
│                    ┌─────────────┐                              │
│                    │ Journey     │                              │
│                    │ Cache (Redis)│                             │
│                    └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Prompt Layer                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Prompt      │───▶│ A/B Test    │───▶│ Delivery    │         │
│  │ Rules Engine│    │ Framework   │    │ (CLI/Web)   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Design

### 1. Event Layer — Structured Event Capture

Every meaningful user action becomes a typed event:

```typescript
// packages/core/src/conversion/events.ts

export type ConversionEventType =
  // Onboarding events
  | 'user.signup'
  | 'user.cli_installed'
  | 'user.repo_connected'
  | 'user.first_dispatch_started'
  | 'user.first_dispatch_completed'

  // Value events (magic moments)
  | 'cycle.created_pr'
  | 'cycle.created_issue'
  | 'cycle.created_comment'
  | 'cycle.updated_docs'
  | 'cycle.merged_pr'

  // Engagement events
  | 'cycle.completed'
  | 'memory.searched'
  | 'memory.compressed'
  | 'role.rotated'

  // Conversion events
  | 'trial.started'
  | 'trial.milestone_reached'
  | 'upgrade.prompt_shown'
  | 'upgrade.clicked'
  | 'subscription.created'
  | 'subscription.cancelled';

export interface ConversionEvent {
  id: string;
  type: ConversionEventType;
  userId: string;
  repoId?: string;
  timestamp: Date;
  metadata: Record<string, unknown>;

  // For value events
  artifact?: {
    type: 'pr' | 'issue' | 'comment' | 'doc';
    url?: string;
  };
}

export interface EventEmitter {
  emit(event: ConversionEvent): Promise<void>;
  emitBatch(events: ConversionEvent[]): Promise<void>;
}
```

#### Event Integration Points

Events are emitted from existing code paths:

```typescript
// packages/cli/src/commands/dispatch/complete.ts

async function completeDispatch(context: DispatchContext): Promise<void> {
  // ... existing dispatch completion logic ...

  // Emit conversion events
  await eventEmitter.emit({
    type: 'cycle.completed',
    userId: context.userId,
    repoId: context.repoId,
    timestamp: new Date(),
    metadata: {
      cycleNumber: context.cycle,
      role: context.role,
      durationMs: context.durationMs,
    },
  });

  // Detect value events from dispatch output
  const artifacts = extractArtifacts(context.output);
  for (const artifact of artifacts) {
    await eventEmitter.emit({
      type: `cycle.created_${artifact.type}` as ConversionEventType,
      userId: context.userId,
      repoId: context.repoId,
      timestamp: new Date(),
      artifact,
      metadata: { cycleNumber: context.cycle },
    });
  }
}
```

---

### 2. Journey Layer — User State Machine

Users progress through a defined state machine that tracks their journey:

```typescript
// packages/core/src/conversion/journey.ts

export type UserJourneyState =
  | 'anonymous' // Not signed up
  | 'signed_up' // Account created, no CLI install
  | 'installed' // CLI installed, no repo connected
  | 'connected' // Repo connected, no dispatch yet
  | 'first_cycle' // First dispatch in progress
  | 'activated' // First dispatch completed (any output)
  | 'magic_moment' // First visible output created (PR/issue/comment)
  | 'engaged' // 5+ cycles completed
  | 'power_user' // 20+ cycles, using advanced features
  | 'trialing' // Started trial (post-free limit or explicit)
  | 'converted' // Paid subscriber
  | 'churned'; // Cancelled or inactive >30 days

export interface UserJourney {
  userId: string;
  state: UserJourneyState;
  stateEnteredAt: Date;

  // Milestone tracking
  milestones: {
    signedUp?: Date;
    cliInstalled?: Date;
    repoConnected?: Date;
    firstCycleStarted?: Date;
    firstCycleCompleted?: Date;
    firstArtifactCreated?: Date; // Magic moment
    cycle5Reached?: Date;
    cycle10Reached?: Date;
    cycle20Reached?: Date;
    firstPrMerged?: Date;
    trialStarted?: Date;
    converted?: Date;
  };

  // Aggregates for prompts
  stats: {
    totalCycles: number;
    totalPrsCreated: number;
    totalIssuesCreated: number;
    totalCommentsCreated: number;
    lastActivityAt: Date;
    streakDays: number;
  };
}

export interface JourneyManager {
  getJourney(userId: string): Promise<UserJourney>;
  processEvent(event: ConversionEvent): Promise<UserJourney>;
  checkMilestones(userId: string): Promise<MilestoneCheckResult>;
}
```

#### State Transitions

```typescript
// packages/core/src/conversion/state-machine.ts

const STATE_TRANSITIONS: Record<UserJourneyState, TransitionRule[]> = {
  anonymous: [{ event: 'user.signup', nextState: 'signed_up' }],
  signed_up: [{ event: 'user.cli_installed', nextState: 'installed' }],
  installed: [{ event: 'user.repo_connected', nextState: 'connected' }],
  connected: [
    { event: 'user.first_dispatch_started', nextState: 'first_cycle' },
  ],
  first_cycle: [
    { event: 'user.first_dispatch_completed', nextState: 'activated' },
    // Magic moment takes precedence
    {
      event: 'cycle.created_pr',
      nextState: 'magic_moment',
      condition: journey => !journey.milestones.firstArtifactCreated,
    },
    {
      event: 'cycle.created_issue',
      nextState: 'magic_moment',
      condition: journey => !journey.milestones.firstArtifactCreated,
    },
  ],
  activated: [
    {
      event: 'cycle.created_pr',
      nextState: 'magic_moment',
    },
    {
      event: 'cycle.created_issue',
      nextState: 'magic_moment',
    },
    {
      event: 'cycle.completed',
      nextState: 'engaged',
      condition: journey => journey.stats.totalCycles >= 5,
    },
  ],
  magic_moment: [
    {
      event: 'cycle.completed',
      nextState: 'engaged',
      condition: journey => journey.stats.totalCycles >= 5,
    },
  ],
  engaged: [
    {
      event: 'cycle.completed',
      nextState: 'power_user',
      condition: journey => journey.stats.totalCycles >= 20,
    },
    { event: 'trial.started', nextState: 'trialing' },
  ],
  power_user: [{ event: 'trial.started', nextState: 'trialing' }],
  trialing: [
    { event: 'subscription.created', nextState: 'converted' },
    { event: 'subscription.cancelled', nextState: 'churned' },
  ],
  converted: [{ event: 'subscription.cancelled', nextState: 'churned' }],
  churned: [{ event: 'subscription.created', nextState: 'converted' }],
};
```

---

### 3. Milestone-Based Trial System

Per Research (C1265), milestone trials outperform time trials by 15-25%:

```typescript
// packages/core/src/conversion/milestones.ts

export interface TrialMilestone {
  id: string;
  name: string;
  description: string;
  requirement: MilestoneRequirement;
  reward: MilestoneReward;
  order: number;
}

export type MilestoneRequirement =
  | { type: 'event_count'; eventType: ConversionEventType; count: number }
  | { type: 'journey_state'; state: UserJourneyState }
  | {
      type: 'stat_threshold';
      stat: keyof UserJourney['stats'];
      threshold: number;
    };

export type MilestoneReward =
  | { type: 'trial_extension'; days: number }
  | { type: 'feature_unlock'; feature: string }
  | { type: 'badge'; badge: string };

// Default milestone configuration
export const DEFAULT_TRIAL_MILESTONES: TrialMilestone[] = [
  {
    id: 'first_dispatch',
    name: 'First Dispatch',
    description: 'Run your first dispatch cycle',
    requirement: { type: 'journey_state', state: 'activated' },
    reward: { type: 'trial_extension', days: 7 },
    order: 1,
  },
  {
    id: 'magic_moment',
    name: 'First Creation',
    description: 'Agent creates a PR, issue, or comment',
    requirement: { type: 'journey_state', state: 'magic_moment' },
    reward: { type: 'trial_extension', days: 7 },
    order: 2,
  },
  {
    id: 'five_cycles',
    name: 'Getting Momentum',
    description: 'Complete 5 dispatch cycles',
    requirement: { type: 'stat_threshold', stat: 'totalCycles', threshold: 5 },
    reward: { type: 'trial_extension', days: 7 },
    order: 3,
  },
  {
    id: 'pr_merged',
    name: 'Shipped Code',
    description: 'Agent PR gets merged',
    requirement: {
      type: 'event_count',
      eventType: 'cycle.merged_pr',
      count: 1,
    },
    reward: { type: 'trial_extension', days: 14 },
    order: 4,
  },
  {
    id: 'twenty_cycles',
    name: 'Power User',
    description: 'Complete 20 dispatch cycles',
    requirement: { type: 'stat_threshold', stat: 'totalCycles', threshold: 20 },
    reward: { type: 'feature_unlock', feature: 'advanced_analytics' },
    order: 5,
  },
];

export class MilestoneTracker {
  async checkMilestones(journey: UserJourney): Promise<MilestoneCheckResult> {
    const completed: TrialMilestone[] = [];
    const pending: TrialMilestone[] = [];
    const nextUp: TrialMilestone | null = null;

    for (const milestone of DEFAULT_TRIAL_MILESTONES) {
      if (this.isMilestoneComplete(journey, milestone)) {
        completed.push(milestone);
      } else {
        pending.push(milestone);
      }
    }

    return {
      completed,
      pending,
      nextUp: pending[0] || null,
      totalTrialDays: this.calculateTrialDays(completed),
      progress: completed.length / DEFAULT_TRIAL_MILESTONES.length,
    };
  }

  private calculateTrialDays(completed: TrialMilestone[]): number {
    let days = 7; // Base trial
    for (const milestone of completed) {
      if (milestone.reward.type === 'trial_extension') {
        days += milestone.reward.days;
      }
    }
    return days;
  }
}
```

---

### 4. Value-Triggered Prompt System

Per Research (C1265), value-based prompts outperform time-based by ~15%:

```typescript
// packages/core/src/conversion/prompts.ts

export interface UpgradePrompt {
  id: string;
  type: 'banner' | 'modal' | 'inline' | 'cli_message';
  trigger: PromptTrigger;
  content: PromptContent;
  priority: number;
  cooldownMs: number;
  maxShows: number;
}

export type PromptTrigger =
  | { type: 'journey_state'; state: UserJourneyState }
  | {
      type: 'stat_threshold';
      stat: keyof UserJourney['stats'];
      threshold: number;
    }
  | { type: 'event'; eventType: ConversionEventType }
  | { type: 'milestone_complete'; milestoneId: string }
  | { type: 'trial_ending'; daysRemaining: number };

export interface PromptContent {
  // Template variables: {{cycles}}, {{prs}}, {{issues}}, {{daysActive}}
  headline: string;
  body: string;
  cta: string;
  ctaUrl: string;
}

// Value-based prompt examples
export const VALUE_PROMPTS: UpgradePrompt[] = [
  {
    id: 'cycles_10',
    type: 'cli_message',
    trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 10 },
    content: {
      headline: "🎉 You're in the top 20% of power users!",
      body: 'Your agent team has completed {{cycles}} cycles. Keep this momentum with Pro.',
      cta: 'Upgrade to Pro →',
      ctaUrl: '/upgrade',
    },
    priority: 80,
    cooldownMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxShows: 3,
  },
  {
    id: 'first_pr_merged',
    type: 'cli_message',
    trigger: { type: 'event', eventType: 'cycle.merged_pr' },
    content: {
      headline: '🚀 Your agent team just shipped real code!',
      body: 'That PR was merged. ADA helped you ship faster. Unlock unlimited cycles.',
      cta: 'Go Pro →',
      ctaUrl: '/upgrade',
    },
    priority: 95,
    cooldownMs: 0, // Show immediately on first merge
    maxShows: 1,
  },
  {
    id: 'cycles_47',
    type: 'cli_message',
    trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 47 },
    content: {
      headline: '📊 47 cycles and counting!',
      body: "Your agent team has run {{cycles}} cycles, created {{prs}} PRs, and closed {{issues}} issues. That's real productivity.",
      cta: 'Keep the momentum →',
      ctaUrl: '/upgrade',
    },
    priority: 85,
    cooldownMs: 14 * 24 * 60 * 60 * 1000,
    maxShows: 2,
  },
  {
    id: 'streak_7',
    type: 'cli_message',
    trigger: { type: 'stat_threshold', stat: 'streakDays', threshold: 7 },
    content: {
      headline: '🔥 7-day streak!',
      body: "You've used ADA every day this week. Your agent team is becoming part of your workflow.",
      cta: 'Make it permanent →',
      ctaUrl: '/upgrade',
    },
    priority: 75,
    cooldownMs: 30 * 24 * 60 * 60 * 1000,
    maxShows: 1,
  },
];

// Anti-pattern: time-based prompts (lower priority, only as fallback)
export const TIME_PROMPTS: UpgradePrompt[] = [
  {
    id: 'trial_3_days',
    type: 'banner',
    trigger: { type: 'trial_ending', daysRemaining: 3 },
    content: {
      headline: 'Trial ends in 3 days',
      body: 'Upgrade now to keep your agent team running.',
      cta: 'Upgrade',
      ctaUrl: '/upgrade',
    },
    priority: 50, // Lower priority than value prompts
    cooldownMs: 24 * 60 * 60 * 1000,
    maxShows: 3,
  },
];
```

#### CLI Integration

```typescript
// packages/cli/src/prompts/upgrade-prompt.ts

export class UpgradePromptManager {
  constructor(
    private journeyManager: JourneyManager,
    private promptRules: UpgradePrompt[]
  ) {}

  async checkForPrompt(userId: string): Promise<UpgradePrompt | null> {
    const journey = await this.journeyManager.getJourney(userId);

    // Don't show prompts to converted users
    if (journey.state === 'converted') return null;

    // Get all triggered prompts, sorted by priority
    const triggered = this.promptRules
      .filter(p => this.isTriggered(p, journey))
      .filter(p => this.canShow(p, userId))
      .sort((a, b) => b.priority - a.priority);

    return triggered[0] || null;
  }

  async showPrompt(prompt: UpgradePrompt, journey: UserJourney): Promise<void> {
    const content = this.interpolate(prompt.content, journey);

    if (prompt.type === 'cli_message') {
      console.log('');
      console.log(chalk.yellow('─'.repeat(60)));
      console.log(chalk.bold(content.headline));
      console.log(content.body);
      console.log(chalk.cyan(content.cta + ' ' + content.ctaUrl));
      console.log(chalk.yellow('─'.repeat(60)));
      console.log('');
    }

    await this.recordPromptShown(prompt.id, journey.userId);
  }

  private interpolate(
    content: PromptContent,
    journey: UserJourney
  ): PromptContent {
    const vars: Record<string, string> = {
      cycles: journey.stats.totalCycles.toString(),
      prs: journey.stats.totalPrsCreated.toString(),
      issues: journey.stats.totalIssuesCreated.toString(),
      daysActive: journey.stats.streakDays.toString(),
    };

    return {
      headline: this.replaceVars(content.headline, vars),
      body: this.replaceVars(content.body, vars),
      cta: content.cta,
      ctaUrl: content.ctaUrl,
    };
  }
}
```

---

### 5. Magic Moment Detection

The critical activation metric — detecting when a cycle creates visible output:

```typescript
// packages/core/src/conversion/magic-moment.ts

export interface MagicMomentDetector {
  detectArtifacts(dispatchOutput: string, context: DispatchContext): Artifact[];
  isMagicMoment(artifacts: Artifact[]): boolean;
}

export interface Artifact {
  type: 'pr' | 'issue' | 'comment' | 'doc' | 'commit';
  url?: string;
  title?: string;
  createdAt: Date;
}

export class DefaultMagicMomentDetector implements MagicMomentDetector {
  private readonly patterns = {
    pr: [
      /Created pull request #(\d+)/i,
      /PR #(\d+) created/i,
      /github\.com\/[^\/]+\/[^\/]+\/pull\/(\d+)/,
    ],
    issue: [
      /Created issue #(\d+)/i,
      /Issue #(\d+) created/i,
      /github\.com\/[^\/]+\/[^\/]+\/issues\/(\d+)/,
    ],
    comment: [/Commented on #(\d+)/i, /Added comment to issue #(\d+)/i],
    doc: [/Updated (.+\.md)/i, /Created documentation/i, /Added docs for/i],
  };

  detectArtifacts(output: string, context: DispatchContext): Artifact[] {
    const artifacts: Artifact[] = [];

    // Check action field for explicit artifact references
    if (context.action) {
      if (
        context.action.includes('PR #') ||
        context.action.includes('pull request')
      ) {
        artifacts.push({ type: 'pr', createdAt: new Date() });
      }
      if (
        context.action.includes('Issue #') ||
        context.action.includes('issue')
      ) {
        artifacts.push({ type: 'issue', createdAt: new Date() });
      }
    }

    // Pattern matching on full output
    for (const [type, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        if (pattern.test(output)) {
          artifacts.push({
            type: type as Artifact['type'],
            createdAt: new Date(),
          });
          break; // One match per type is enough
        }
      }
    }

    return artifacts;
  }

  isMagicMoment(artifacts: Artifact[]): boolean {
    // Magic moment = any visible output (PR, issue, or comment)
    return artifacts.some(a => ['pr', 'issue', 'comment'].includes(a.type));
  }
}
```

---

### 6. Analytics and Funnel Tracking

```typescript
// packages/core/src/conversion/analytics.ts

export interface ConversionFunnel {
  // Counts at each stage
  signups: number;
  installed: number;
  connected: number;
  activated: number;
  magicMoment: number;
  engaged: number;
  trialing: number;
  converted: number;
  churned: number;

  // Conversion rates
  installRate: number; // signups → installed
  connectRate: number; // installed → connected
  activateRate: number; // connected → activated
  magicMomentRate: number; // activated → magic_moment
  engagementRate: number; // magic_moment → engaged
  trialRate: number; // engaged → trialing
  conversionRate: number; // trialing → converted
  churnRate: number; // converted → churned
}

export interface CohortAnalysis {
  cohort: string; // e.g., "2026-W09", "2026-03-15"
  users: number;
  funnel: ConversionFunnel;
  medianTimeToActivation: number; // minutes
  medianTimeToMagicMoment: number; // minutes
  medianTimeToConversion: number; // days
}

export class ConversionAnalytics {
  async getFunnel(dateRange?: DateRange): Promise<ConversionFunnel> {
    const states = await this.getStateDistribution(dateRange);

    return {
      signups: states.total,
      installed:
        states.installed +
        states.connected +
        states.activated +
        states.magic_moment +
        states.engaged +
        states.trialing +
        states.converted,
      // ... calculate rates
    };
  }

  async getCohortAnalysis(
    granularity: 'day' | 'week' | 'month'
  ): Promise<CohortAnalysis[]> {
    // Group users by signup date, calculate funnel for each cohort
  }

  // Key metrics for C1263 targets
  async getTrialConversionRate(
    segment?: 'cold' | 'warm' | 'outreach'
  ): Promise<number> {
    // Per C1265: expect 25-35% cold, 50-60% warm, 70-80% outreach
  }

  async getMagicMomentRate(): Promise<number> {
    // Target: 80%+ per C1265
  }

  async getTimeToFirstValue(): Promise<number> {
    // Target: <5 min per C1257
  }
}
```

---

## Database Schema

```sql
-- Event store (append-only)
CREATE TABLE conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  repo_id UUID REFERENCES repos(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}',
  artifact_type VARCHAR(20),
  artifact_url TEXT,

  INDEX idx_events_user_id (user_id),
  INDEX idx_events_type (type),
  INDEX idx_events_timestamp (timestamp)
);

-- User journey state (mutable)
CREATE TABLE user_journeys (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  state VARCHAR(30) NOT NULL DEFAULT 'signed_up',
  state_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Milestones (nullable timestamps)
  signed_up_at TIMESTAMPTZ,
  cli_installed_at TIMESTAMPTZ,
  repo_connected_at TIMESTAMPTZ,
  first_cycle_started_at TIMESTAMPTZ,
  first_cycle_completed_at TIMESTAMPTZ,
  first_artifact_created_at TIMESTAMPTZ,
  cycle_5_at TIMESTAMPTZ,
  cycle_10_at TIMESTAMPTZ,
  cycle_20_at TIMESTAMPTZ,
  first_pr_merged_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,

  -- Stats (updated on each event)
  total_cycles INTEGER NOT NULL DEFAULT 0,
  total_prs_created INTEGER NOT NULL DEFAULT 0,
  total_issues_created INTEGER NOT NULL DEFAULT 0,
  total_comments_created INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  streak_days INTEGER NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prompt tracking (cooldowns, max shows)
CREATE TABLE prompt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  prompt_id VARCHAR(50) NOT NULL,
  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clicked BOOLEAN NOT NULL DEFAULT FALSE,
  converted BOOLEAN NOT NULL DEFAULT FALSE,

  INDEX idx_prompt_history_user (user_id, prompt_id)
);

-- Milestone completion tracking
CREATE TABLE milestone_completions (
  user_id UUID NOT NULL REFERENCES users(id),
  milestone_id VARCHAR(50) NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reward_applied BOOLEAN NOT NULL DEFAULT FALSE,

  PRIMARY KEY (user_id, milestone_id)
);
```

---

## Integration with Existing Systems

### Usage Metering (C1186)

The trial conversion platform extends usage metering:

```typescript
// Extend UsageRecord with conversion events
interface EnhancedUsageRecord extends UsageRecord {
  // Existing fields
  userId: string;
  cycleId: string;
  timestamp: Date;

  // New: conversion event emission
  emitConversionEvents(): Promise<void>;
}
```

### Billing (Stripe Integration)

Milestone rewards integrate with billing:

```typescript
// On milestone completion
async function applyMilestoneReward(
  userId: string,
  milestone: TrialMilestone
): Promise<void> {
  if (milestone.reward.type === 'trial_extension') {
    await stripe.subscriptions.update(subscriptionId, {
      trial_end: calculateNewTrialEnd(milestone.reward.days),
    });
  }
}
```

### CLI UX

```typescript
// After dispatch complete, show value prompts
const prompt = await upgradePromptManager.checkForPrompt(userId);
if (prompt) {
  await upgradePromptManager.showPrompt(prompt, journey);
}
```

---

## Success Metrics

| Metric               | Current | Target | Measurement                                       |
| -------------------- | ------- | ------ | ------------------------------------------------- |
| Magic Moment Rate    | N/A     | 80%+   | % of activated users who create visible output    |
| Time to First Value  | N/A     | <5 min | Median time from install to first cycle complete  |
| Trial→Paid (Cold)    | N/A     | 25-35% | Conversion rate for HN/PH traffic                 |
| Trial→Paid (Warm)    | N/A     | 50-60% | Conversion rate for Discord/star-originated users |
| Milestone Completion | N/A     | 60%+   | % of trialists who complete 3+ milestones         |
| Value Prompt CTR     | N/A     | 15%+   | Click-through rate on value-based prompts         |

---

## Implementation Plan

### Sprint 3 Day 1-2 (P0)

1. Event types and emitter (packages/core/src/conversion/events.ts)
2. User journey state machine (packages/core/src/conversion/journey.ts)
3. Magic moment detector (packages/core/src/conversion/magic-moment.ts)

### Sprint 3 Day 3-5 (P0)

4. Milestone tracker (packages/core/src/conversion/milestones.ts)
5. Value prompt system (packages/core/src/conversion/prompts.ts)
6. CLI integration for prompts

### Sprint 3 Day 6-10 (P1)

7. Database schema migration
8. Analytics dashboard endpoints
9. A/B test framework for prompts

### Sprint 3 Day 11-14 (P2)

10. Cohort analysis
11. Prompt optimization based on early data
12. Documentation

---

## Risks and Mitigations

| Risk                                 | Impact | Mitigation                                                |
| ------------------------------------ | ------ | --------------------------------------------------------- |
| Event overhead slows CLI             | High   | Async queue, local batch before sync                      |
| Prompt fatigue annoys users          | Medium | Cooldowns, max shows, priority system                     |
| Magic moment detection inaccurate    | Medium | Conservative patterns, iterate on false negative analysis |
| State machine bugs block conversions | High   | Comprehensive tests, manual state override capability     |

---

## Conclusion

This architecture provides the platform backbone for achieving 50% trial→paid conversion per C1263. Key innovations:

1. **Milestone-based trials** (+15-25% vs time-based per C1265)
2. **Value-triggered prompts** (contextual, not annoying)
3. **Magic moment tracking** (critical activation metric)
4. **Event-driven journey** (analytics-ready from day 1)

The system extends existing usage metering (C1186) and billing infrastructure, integrating seamlessly with Sprint 3 implementation plans.

---

## References

- C1265: Trial-to-Paid Conversion Research
- C1263: First MRR Strategy
- C1257: Sprint 3 Activation Criteria
- C1186: Usage Metering Architecture
- C1185: Sprint 3 SaaS Tier Technical Spec

---

_This ADR specifies the platform architecture for trial conversion. Implementation starts Sprint 3 Day 1._
