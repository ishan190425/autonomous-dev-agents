# Sprint 3 Upgrade Prompts UX Specification (C1272)

> **Author:** 🎨 Design (The Architect)  
> **Cycle:** C1272 (854 consecutive!)  
> **Date:** 2026-02-28 01:45 EST  
> **Status:** Ready for Implementation  
> **Sprint 3:** Day 1 Ready (Mar 1-14, 2026)  
> **Relates to:** #155 (SaaS Container), #183 (Onboarding Wizard)  
> **Builds on:** C1265 (Research), C1266 (Frontier ADR), C1267 (Product AC), C832 (Billing UX)

---

## Executive Summary

This spec defines **value-triggered prompt UX patterns** that maximize trial→paid conversion. Per Research (C1265), milestone-based prompts ("You've run 47 cycles!") convert 15-25% better than time-based prompts ("Trial expires in 3 days").

**Key Principle:** Celebrate user achievements, then offer upgrade. Never interrupt flow with fear-based messaging.

---

## 1. Prompt Philosophy

### 1.1 Value-First Framing

| ❌ Time-Based (Avoid)            | ✅ Value-Based (Use)                      |
| -------------------------------- | ----------------------------------------- |
| "Trial expires in 3 days"        | "You've shipped 12 PRs with ADA!"         |
| "Upgrade before you lose access" | "Unlock unlimited cycles for your team"   |
| "Free trial ending soon"         | "Your team's velocity: 47 cycles/week ⚡" |
| "Only 2 cycles left"             | "You've saved ~8 hours this sprint"       |

### 1.2 Prompt Trigger Points

Per C1266 (Frontier ADR), prompts trigger at these milestones:

| Milestone              | Trigger Event               | Prompt Type    |
| ---------------------- | --------------------------- | -------------- |
| **First Magic Moment** | First PR/issue created      | Celebration    |
| **10 Cycles**          | cycle.completed (count=10)  | Value Summary  |
| **25 Cycles**          | cycle.completed (count=25)  | Team Unlock    |
| **50 Cycles**          | cycle.completed (count=50)  | ROI Calculator |
| **100 Cycles**         | cycle.completed (count=100) | Enterprise     |
| **Limit Approaching**  | 80% of plan limit           | Soft Prompt    |
| **Limit Reached**      | 100% of plan limit          | Hard Block     |

---

## 2. CLI Prompt Patterns

### 2.1 Magic Moment Celebration (First Artifact)

When a user's first cycle creates a visible artifact (PR, issue, comment):

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  🎉 First Magic Moment!                                      │
│                                                              │
│  ADA just created PR #123 autonomously.                      │
│  Your AI dev team is officially shipping code.               │
│                                                              │
│  ┌────────────────────────────────────────┐                  │
│  │ View PR: https://github.com/.../pull/123 │                │
│  └────────────────────────────────────────┘                  │
│                                                              │
│  Press Enter to continue...                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**

- Display immediately after `ada dispatch complete` when artifact detected
- No upgrade prompt at first magic moment — pure celebration
- Track `magic_moment_reached: true` in journey state

### 2.2 Milestone Value Summary (10/25/50 Cycles)

After reaching cycle milestones, show value summary with soft upgrade option:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ⚡ Cycle 25 Complete — You're on a roll!                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Your ADA Stats                                       │   │
│  │  ───────────────────────────────────────────────────  │   │
│  │  📊 Cycles completed:     25                          │   │
│  │  🔀 PRs created:          7                           │   │
│  │  📝 Issues closed:        12                          │   │
│  │  ⏱️  Est. time saved:      ~6 hours                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ────────────────────────────────────────────────────────── │
│                                                              │
│  Upgrade to Pro for unlimited cycles and team features.     │
│                                                              │
│  [u] Upgrade now ($19/mo)    [Enter] Continue               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**

- Show after `ada dispatch complete` at milestone boundaries
- `[u]` shortcut for quick upgrade (opens browser to checkout)
- Enter continues without upgrade — no friction for dismissal
- Stats pulled from journey analytics

### 2.3 Soft Limit Prompt (80% Usage)

When approaching plan limits:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  📊 Usage Update                                             │
│                                                              │
│  You've used 80 of 100 cycles this month.                   │
│  At your current pace, you'll hit the limit in ~3 days.     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ████████████████████░░░░░  80%                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Options:                                                    │
│  [u] Upgrade to Pro (1,000 cycles/mo)                       │
│  [o] Enable overages ($0.05/cycle)                          │
│  [Enter] Continue                                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**

- Triggers once per billing period at 80% threshold
- Show usage bar with visual progress
- Overage option for users who need occasional spikes
- Never blocks workflow — Enter always continues

### 2.4 Hard Limit Block (100% Usage)

When limit is reached, block further cycles:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  🚫 Cycle Limit Reached                                      │
│                                                              │
│  You've used all 100 cycles this month on the Free plan.    │
│                                                              │
│  Your next reset: Mar 1, 2026 (3 days)                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Upgrade to Pro — $19/month                  │   │
│  │                                                        │   │
│  │  ✓ 1,000 cycles/month (10x current)                   │   │
│  │  ✓ 5 team members                                     │   │
│  │  ✓ Priority support                                   │   │
│  │  ✓ Advanced analytics                                 │   │
│  │                                                        │   │
│  │  [u] Upgrade Now                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [o] Enable overages    [q] Exit                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**

- This is a blocking prompt — `ada dispatch start` fails until resolved
- Clear options: upgrade, overages, or wait for reset
- Show exact reset date
- Exit gracefully with `q`

---

## 3. Web Dashboard Prompts

### 3.1 Magic Moment Card (Dashboard)

Appears on dashboard after first artifact:

```
┌──────────────────────────────────────────────────────────────┐
│  🎉 Your First PR!                                           │
│  ────────────────────────────────────────────────────────── │
│                                                              │
│  ADA created PR #123 in your-repo                           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  feat(auth): add GitHub OAuth integration            │    │
│  │  +342 / -12 lines • 4 files changed                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Your AI dev team is shipping. 🚀                           │
│                                                              │
│  [View on GitHub]  [Dismiss]                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Value Banner (Dashboard Header)

Persistent banner showing value delivered:

```
┌──────────────────────────────────────────────────────────────┐
│  ⚡ 47 cycles • 12 PRs • ~11 hours saved                     │
│                                         [Upgrade for more →] │
└──────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**

- Collapses to icon on mobile
- Updates in real-time as cycles complete
- "Upgrade for more" appears only for free tier users

### 3.3 Upgrade Modal (Click-Through)

Full upgrade modal with ROI calculator:

```
┌──────────────────────────────────────────────────────────────┐
│                                                    [×]       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Upgrade to Pro                         │ │
│  │                                                          │ │
│  │  Your stats this month:                                  │ │
│  │  ┌─────────────────────────────────────────────────┐    │ │
│  │  │  Cycles run:        47                           │    │ │
│  │  │  Artifacts created: 19 (7 PRs, 12 issues)        │    │ │
│  │  │  Est. time saved:   ~11 hours                    │    │ │
│  │  │  Value delivered:   ~$550 (at $50/hr)            │    │ │
│  │  └─────────────────────────────────────────────────┘    │ │
│  │                                                          │ │
│  │  ┌─────────┐          ┌──────────────────────────┐     │ │
│  │  │  Free   │    →     │  Pro ⭐                   │     │ │
│  │  │  $0/mo  │          │  $19/mo                   │     │ │
│  │  │         │          │                            │     │ │
│  │  │ 100/mo  │          │ 1,000 cycles/mo           │     │ │
│  │  │ 1 user  │          │ 5 team members            │     │ │
│  │  └─────────┘          │ Priority support          │     │ │
│  │                       │ Advanced analytics        │     │ │
│  │                       └──────────────────────────┘     │ │
│  │                                                          │ │
│  │  ROI: You get $550+ value for $19/month                 │ │
│  │                                                          │ │
│  │  ┌──────────────────────────────────────────────────┐   │ │
│  │  │            Continue to Checkout →                 │   │ │
│  │  └──────────────────────────────────────────────────┘   │ │
│  │                                                          │ │
│  │  Questions? team@ada-ai.dev                              │ │
│  │                                                          │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**

- Pre-populated with actual user stats
- ROI calculation: (hours saved × $50/hr) vs $19/mo
- Links to Stripe Checkout (per C832)
- [×] closes without friction

---

## 4. Pricing Page Structure

Public pricing page at `ada-ai.dev/pricing`:

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                    Pricing that scales with you                      │
│                                                                      │
│     Start free. Upgrade when your team needs more power.            │
│                                                                      │
│  ┌─────────────────────┐    ┌─────────────────────┐                │
│  │                     │    │                     │                 │
│  │        Free         │    │     Pro ⭐ POPULAR  │                 │
│  │                     │    │                     │                 │
│  │        $0           │    │       $19           │                 │
│  │      /month         │    │      /month         │                 │
│  │                     │    │                     │                 │
│  │  ────────────────── │    │  ────────────────── │                 │
│  │                     │    │                     │                 │
│  │  100 cycles/mo      │    │  1,000 cycles/mo    │                 │
│  │  1 team member      │    │  5 team members     │                 │
│  │  Community support  │    │  Email support      │                 │
│  │  Public repos only  │    │  Private repos      │                 │
│  │                     │    │  Usage analytics    │                 │
│  │                     │    │  Custom roles       │                 │
│  │                     │    │                     │                 │
│  │  ┌───────────────┐  │    │  ┌───────────────┐  │                 │
│  │  │  Get Started  │  │    │  │  Start Free → │  │                 │
│  │  └───────────────┘  │    │  └───────────────┘  │                 │
│  │                     │    │                     │                 │
│  └─────────────────────┘    └─────────────────────┘                │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                         Enterprise                           │   │
│  │                                                               │   │
│  │   Custom pricing for teams with advanced needs               │   │
│  │                                                               │   │
│  │   • Unlimited cycles            • SSO/SAML                   │   │
│  │   • Unlimited team members      • Dedicated support          │   │
│  │   • On-prem deployment option   • Custom integrations        │   │
│  │   • SLA guarantee               • Invoice billing            │   │
│  │                                                               │   │
│  │   ┌─────────────────────────────────────────────────────┐   │   │
│  │   │                   Contact Sales                      │   │   │
│  │   └─────────────────────────────────────────────────────┘   │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ───────────────────────────────────────────────────────────────── │
│                                                                      │
│                          Compare Plans                               │
│                                                                      │
│  ┌────────────────────────┬──────────┬──────────┬──────────────┐   │
│  │ Feature                │   Free   │   Pro    │  Enterprise  │   │
│  ├────────────────────────┼──────────┼──────────┼──────────────┤   │
│  │ Monthly cycles         │   100    │  1,000   │  Unlimited   │   │
│  │ Team members           │    1     │    5     │  Unlimited   │   │
│  │ Private repositories   │    ✗     │    ✓     │      ✓       │   │
│  │ Custom roles           │    ✗     │    ✓     │      ✓       │   │
│  │ Usage analytics        │  Basic   │ Advanced │   Advanced   │   │
│  │ Support                │ Community│  Email   │  Dedicated   │   │
│  │ API access             │    ✓     │    ✓     │      ✓       │   │
│  │ SSO/SAML               │    ✗     │    ✗     │      ✓       │   │
│  │ On-premises option     │    ✗     │    ✗     │      ✓       │   │
│  │ SLA                    │    ✗     │    ✗     │    99.9%     │   │
│  └────────────────────────┴──────────┴──────────┴──────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Prompt Message Templates

### 5.1 CLI Messages (Copy/Paste Ready)

```typescript
export const PROMPT_MESSAGES = {
  // Magic moment (first artifact)
  MAGIC_MOMENT_TITLE: '🎉 First Magic Moment!',
  MAGIC_MOMENT_BODY: (artifact: string, url: string) =>
    `ADA just created ${artifact} autonomously.\n` +
    `Your AI dev team is officially shipping code.\n\n` +
    `View: ${url}`,

  // Milestone celebrations
  MILESTONE_10: '⚡ Cycle 10 Complete — Great start!',
  MILESTONE_25: "⚡ Cycle 25 Complete — You're on a roll!",
  MILESTONE_50: '🚀 Cycle 50 Complete — Shipping machine!',
  MILESTONE_100: '💯 Cycle 100 Complete — Power user!',

  // Stats template
  STATS_TEMPLATE: (stats: JourneyStats) =>
    `📊 Cycles completed:     ${stats.cycleCount}\n` +
    `🔀 PRs created:          ${stats.prCount}\n` +
    `📝 Issues closed:        ${stats.issueCount}\n` +
    `⏱️  Est. time saved:      ~${stats.hoursSaved} hours`,

  // Soft limit (80%)
  SOFT_LIMIT_TITLE: '📊 Usage Update',
  SOFT_LIMIT_BODY: (used: number, limit: number, daysLeft: number) =>
    `You've used ${used} of ${limit} cycles this month.\n` +
    `At your current pace, you'll hit the limit in ~${daysLeft} days.`,

  // Hard limit (100%)
  HARD_LIMIT_TITLE: '🚫 Cycle Limit Reached',
  HARD_LIMIT_BODY: (limit: number, resetDate: string) =>
    `You've used all ${limit} cycles this month on the Free plan.\n\n` +
    `Your next reset: ${resetDate}`,

  // Upgrade CTA
  UPGRADE_CTA: 'Upgrade to Pro for unlimited cycles and team features.',
  UPGRADE_KEY_HINT: '[u] Upgrade now ($19/mo)    [Enter] Continue',

  // Pro features list
  PRO_FEATURES: [
    '✓ 1,000 cycles/month (10x current)',
    '✓ 5 team members',
    '✓ Priority support',
    '✓ Advanced analytics',
  ],
};
```

### 5.2 Error Message Patterns

Per C1262 (Onboarding Spec), use What/Why/Fix/Help format for upgrade prompts:

```
┌──────────────────────────────────────────────────────────────┐
│  🚫 Cycle limit reached                                      │   ← What
│                                                              │
│  Your Free plan allows 100 cycles/month. You've used all    │   ← Why
│  100 cycles since Feb 1.                                     │
│                                                              │
│  To continue running cycles:                                 │   ← Fix
│  1. Upgrade to Pro ($19/mo) — 1,000 cycles/month            │
│  2. Enable overages ($0.05/cycle) — pay as you go           │
│  3. Wait for reset on Mar 1 (3 days)                        │
│                                                              │
│  Questions? docs.ada-ai.dev/billing or team@ada-ai.dev      │   ← Help
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Animation & Feedback Patterns

### 6.1 CLI Animations

| Event                 | Animation                                 |
| --------------------- | ----------------------------------------- |
| Magic moment detected | 🎉 emoji + 500ms pause for celebration    |
| Milestone reached     | ⚡ flash + stats table fade-in            |
| Upgrade selected      | Spinner → "Opening checkout..." → browser |
| Progress bar          | Smooth fill animation (chalk gradient)    |

### 6.2 Web Animations

| Event               | Animation                              |
| ------------------- | -------------------------------------- |
| Magic moment card   | Slide-in from right, confetti burst    |
| Value banner update | Counter increment animation (count up) |
| Upgrade modal open  | Backdrop fade + modal scale-in         |
| ROI calculator      | Numbers animate counting up            |

---

## 7. Accessibility Requirements

### 7.1 CLI

- All prompts work in non-TTY environments (CI/CD)
- Color is supplementary, not required for comprehension
- Keyboard shortcuts announced (screenreader-friendly)
- `--no-prompt` flag skips all interactive prompts

### 7.2 Web

- WCAG 2.1 AA compliance
- All buttons have `aria-label`
- Modal traps focus correctly
- Color contrast ≥4.5:1 for text
- Upgrade modal dismissible via `Escape`

---

## 8. Implementation Checklist

### Sprint 3 Day 1

- [ ] Implement `PROMPT_MESSAGES` constants in `packages/core/src/conversion/prompts.ts`
- [ ] Create `showMagicMoment()` function in `packages/cli/src/prompts/`
- [ ] Create `showMilestonePrompt()` function
- [ ] Create `showLimitPrompt()` function (soft + hard)
- [ ] Wire prompts to `ada dispatch complete` based on journey state

### Sprint 3 Day 2-3

- [ ] Dashboard magic moment card component
- [ ] Dashboard value banner component
- [ ] Upgrade modal with ROI calculator
- [ ] Pricing page static markup

### Sprint 3 Day 4-5

- [ ] Animations (CLI ora spinners, web framer-motion)
- [ ] A/B test infrastructure for prompt variations
- [ ] Analytics tracking for prompt impressions + conversions

---

## 9. Success Metrics

| Metric                        | Target | Measurement                           |
| ----------------------------- | ------ | ------------------------------------- |
| Magic moment celebration rate | ≥80%   | % users who see first artifact prompt |
| Milestone prompt view rate    | ≥90%   | % users at milestones who see prompt  |
| Prompt → upgrade click rate   | ≥15%   | % who click upgrade from any prompt   |
| Checkout completion rate      | ≥60%   | % who complete Stripe after clicking  |
| Overall trial → paid (warm)   | ≥50%   | % who convert (per C1263 target)      |

---

## Related Documents

- C832: Billing UX Spec (dashboard upgrade flows)
- C1262: Onboarding Integration Spec (error message patterns)
- C1265: Trial Conversion Research (benchmark data)
- C1266: Trial Conversion Platform ADR (architecture)
- C1267: Trial Conversion Acceptance Criteria (testable ACs)
- C1269: Trial Conversion Test Plan (QA validation)
- C1270: Conversion Module Scaffold (Engineering implementation)

---

_🎨 Design is ready for Sprint 3 Day 1. Value prompts > fear prompts. Celebrate users, then convert._
