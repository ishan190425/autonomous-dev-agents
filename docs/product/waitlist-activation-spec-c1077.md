# Waitlist Activation & Early Access Spec (C1077)

> **Author:** 📦 Product (The PM)  
> **Cycle:** 1077 | 2026-02-22  
> **Status:** Draft  
> **Related Issues:** #200 (Waitlist Website), #155 (SaaS Container), #182 (Billing Integration)  
> **North Star:** First MRR ($100 by Mar 31)

---

## Executive Summary

Define how waitlist signups (#200) convert to active SaaS users when Sprint 3 launches (Mar 1). This spec bridges the gap between the waitlist collection and the billing system — critical for achieving first MRR.

---

## The Gap

Current state:

- **#200 Waitlist** — Collects email signups (deployment ready)
- **#182 Billing** — Handles Stripe subscriptions for existing users
- **#181 Auth** — GitHub OAuth for new users

Missing:

- How do waitlist signups become authenticated users?
- What's their first-touch experience?
- Do they get early access perks?
- What's the notification sequence?

This spec fills that gap.

---

## User Journey: Waitlist → Paid

```
┌─────────────────────────────────────────────────────────────────┐
│                    WAITLIST PHASE (Current)                      │
│                                                                  │
│  1. User visits waitlist site                                   │
│  2. Enters email → Supabase waitlist table                      │
│  3. Confirmation email sent                                      │
│  4. Waitlist position shown (optional gamification)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 ACTIVATION PHASE (Sprint 3)                      │
│                                                                  │
│  5. Sprint 3 launches (Mar 1)                                   │
│  6. Activation email sent to waitlist (batched)                 │
│  7. User clicks "Activate Now" → Dashboard login                │
│  8. GitHub OAuth → Account created                              │
│  9. First-run onboarding wizard (#183)                          │
│ 10. Free tier active with early access bonus                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CONVERSION PHASE (Ongoing)                      │
│                                                                  │
│ 11. User runs cycles, hits free tier limit                      │
│ 12. Upgrade prompt → Stripe Checkout                            │
│ 13. Payment → Pro tier active                                   │
│ 14. First MRR achieved 🎉                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Waitlist Data Model

### Current Schema (Supabase)

```sql
-- Waitlist signups table
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  referral_code VARCHAR(20),
  referred_by UUID REFERENCES waitlist(id),
  position INTEGER, -- Waitlist position (auto-assigned)
  status VARCHAR(20) DEFAULT 'pending', -- pending, invited, activated, converted
  invited_at TIMESTAMP,
  activated_at TIMESTAMP,
  converted_at TIMESTAMP, -- When they became paying customer
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_waitlist_status ON waitlist(status);
```

### Status Flow

```
pending → invited → activated → converted
   │          │          │           │
   │          │          │           └── Paid subscription active
   │          │          └── GitHub OAuth completed, Free tier active
   │          └── Activation email sent
   └── Signed up, waiting for launch
```

---

## Activation Email Sequence

### Email 1: Launch Announcement (Day 0 - Mar 1)

**Subject:** ADA is live — activate your early access now 🚀

**Send to:** All waitlist with `status = 'pending'`

**Content:**

```
Hi [name or "there"],

ADA is officially live! As an early waitlist member, you're first in line.

Your early access perks:
• 150 free cycles (50 bonus — 50% more than standard)
• Priority support during beta
• Founding member badge (forever)

→ Activate Your Account

This link is unique to you and expires in 14 days.

— The ADA Team
```

**CTA:** Links to `/activate?token={unique_token}`

**On click:**

1. Validate token, check not expired
2. Redirect to GitHub OAuth
3. On success: create user, link waitlist entry, apply early access perks
4. Redirect to onboarding wizard

### Email 2: Reminder (Day 3)

**Subject:** Your ADA access is waiting (50 bonus cycles included)

**Send to:** `status = 'invited'` AND `activated_at IS NULL` AND `invited_at < NOW() - INTERVAL '3 days'`

**Content:**

```
Hey [name],

Quick reminder — you have early access to ADA but haven't activated yet.

Your 50 bonus cycles are reserved for 11 more days. After that, you'll still get access but at the standard 100 cycles.

→ Activate Now

— The ADA Team
```

### Email 3: Last Chance (Day 12)

**Subject:** ⏰ 48 hours left for your 50 bonus cycles

**Send to:** `status = 'invited'` AND `activated_at IS NULL` AND `invited_at < NOW() - INTERVAL '12 days'`

**Content:**

```
Final reminder — your early access bonus expires in 48 hours.

After that:
• You can still sign up (ADA is public)
• But you'll get 100 cycles instead of 150

Lock in your bonus → Activate Now

— The ADA Team
```

### Email 4: Post-Activation Welcome (Immediate)

**Subject:** Welcome to ADA — let's set up your first agent team

**Send to:** On `status` change to `activated`

**Content:**

```
You're in! 🎉

Your account is ready with 150 cycles (including your 50 early access bonus).

Next steps:
1. Install the CLI: npm install -g @ada-ai/cli
2. Initialize in your repo: ada init
3. Run your first cycle: ada run

Or use the dashboard → View Dashboard

Questions? Reply to this email — real humans read it.

— The ADA Team
```

---

## Early Access Perks

### Founding Member Benefits

| Benefit              | Description                             | Duration         |
| -------------------- | --------------------------------------- | ---------------- |
| **Bonus Cycles**     | 150 cycles instead of 100               | First month only |
| **Founding Badge**   | "Early Adopter" badge in dashboard      | Forever          |
| **Priority Support** | Email responses within 24h (vs 48h)     | First 90 days    |
| **Feedback Channel** | Direct Slack/Discord access to founders | First 90 days    |
| **Lock-in Pricing**  | Any future price increases don't apply  | Forever          |

### Implementation

```typescript
// Early access perks applied on activation
async function applyEarlyAccessPerks(
  userId: string,
  waitlistEntry: WaitlistEntry
) {
  // 1. Bonus cycles
  await db.subscriptions.update({
    where: { userId },
    data: {
      cycles_limit: 150, // Instead of 100
      early_access: true,
    },
  });

  // 2. Founding badge
  await db.user_badges.create({
    data: {
      userId,
      badge: 'founding_member',
      earned_at: new Date(),
    },
  });

  // 3. Priority support flag
  await db.users.update({
    where: { id: userId },
    data: {
      support_tier: 'priority',
      support_tier_expires: addDays(new Date(), 90),
    },
  });
}
```

---

## Activation Flow Implementation

### Activation Endpoint

```typescript
// GET /api/activate?token=xxx
async function handleActivation(req: Request) {
  const { token } = req.query;

  // 1. Validate token
  const waitlistEntry = await db.waitlist.findUnique({
    where: { activation_token: token },
  });

  if (!waitlistEntry) {
    return redirect('/signup?error=invalid_token');
  }

  if (waitlistEntry.status !== 'invited') {
    return redirect('/login?message=already_activated');
  }

  // 2. Check expiration (14 days from invite)
  const expiresAt = addDays(waitlistEntry.invited_at, 14);
  const bonusExpired = new Date() > expiresAt;

  // 3. Store token in session for post-OAuth
  await setSessionData({
    waitlist_id: waitlistEntry.id,
    early_access: !bonusExpired,
  });

  // 4. Redirect to GitHub OAuth
  return redirect('/api/auth/github');
}
```

### Post-OAuth Activation

```typescript
// Called after successful GitHub OAuth
async function completeActivation(user: User, session: Session) {
  const { waitlist_id, early_access } = session;

  if (!waitlist_id) return; // Normal signup, not waitlist

  // 1. Link waitlist entry to user
  const waitlistEntry = await db.waitlist.update({
    where: { id: waitlist_id },
    data: {
      user_id: user.id,
      status: 'activated',
      activated_at: new Date(),
    },
  });

  // 2. Apply early access perks if eligible
  if (early_access) {
    await applyEarlyAccessPerks(user.id, waitlistEntry);
  }

  // 3. Create default Free subscription
  await createSubscription({
    userId: user.id,
    tier: 'free',
    cycles_limit: early_access ? 150 : 100,
  });

  // 4. Send welcome email
  await sendEmail({
    to: user.email,
    template: 'welcome_activated',
    data: { early_access, bonus_cycles: early_access ? 50 : 0 },
  });

  // 5. Track activation in analytics
  await analytics.track('waitlist_activated', {
    user_id: user.id,
    waitlist_position: waitlistEntry.position,
    early_access,
    days_to_activate: daysBetween(waitlistEntry.invited_at, new Date()),
  });
}
```

---

## Launch Day Batch Invite

### Batch Strategy

Rather than inviting all waitlist at once (overwhelming support, server load), batch in waves:

| Wave   | % of Waitlist | Timing    | Purpose                      |
| ------ | ------------- | --------- | ---------------------------- |
| Wave 1 | 10%           | Mar 1 9am | Canary — catch critical bugs |
| Wave 2 | 20%           | Mar 1 3pm | Scale test — if Wave 1 clean |
| Wave 3 | 30%           | Mar 2 9am | Ramp up                      |
| Wave 4 | 40%           | Mar 2 3pm | Complete rollout             |

### Wave Selection Criteria

Prioritize early signups (reward loyalty):

```sql
-- Select Wave 1 (10%)
SELECT * FROM waitlist
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT (SELECT COUNT(*) * 0.1 FROM waitlist WHERE status = 'pending');
```

### Invite Job

```typescript
// Cron job for batch invites
async function sendWaveInvites(wavePercent: number) {
  const pendingCount = await db.waitlist.count({
    where: { status: 'pending' },
  });
  const waveSize = Math.ceil(pendingCount * wavePercent);

  const toInvite = await db.waitlist.findMany({
    where: { status: 'pending' },
    orderBy: { created_at: 'asc' },
    take: waveSize,
  });

  for (const entry of toInvite) {
    const token = generateSecureToken();

    await db.waitlist.update({
      where: { id: entry.id },
      data: {
        status: 'invited',
        invited_at: new Date(),
        activation_token: token,
      },
    });

    await sendEmail({
      to: entry.email,
      template: 'launch_announcement',
      data: { activation_url: `${BASE_URL}/activate?token=${token}` },
    });
  }

  console.log(`Sent ${toInvite.length} invites (Wave: ${wavePercent * 100}%)`);
}
```

---

## Conversion Tracking

### Key Metrics

| Metric                     | Definition                            | Target |
| -------------------------- | ------------------------------------- | ------ |
| **Invite → Activate**      | % of invited users who complete OAuth | 40%    |
| **Activate → First Cycle** | % who run at least 1 cycle            | 60%    |
| **First Cycle → Engaged**  | % who run 10+ cycles                  | 30%    |
| **Engaged → Paid**         | % who upgrade to Pro                  | 10%    |
| **Waitlist → Paid** (E2E)  | Full funnel conversion                | 0.7%   |

### Funnel Stages

```
Waitlist Signups (1000) → 100%
       │
       ▼ Invited (100%)
    Opened Email (60%)
       │
       ▼ Clicked CTA (30%)
    Activated (25%)
       │
       ▼ First Cycle (15%)
    Engaged (10+) (5%)
       │
       ▼ Hit Limit (3%)
    Upgraded to Pro (1%)
       │
       ▼
    Paid Customer (10) → First MRR!
```

### Analytics Events

```typescript
// Track full funnel
analytics.track('waitlist_signup', { email_domain, referral });
analytics.track('waitlist_invited', { wave, position });
analytics.track('activation_email_opened', { delay_hours });
analytics.track('activation_link_clicked', { delay_hours });
analytics.track('waitlist_activated', { days_to_activate, early_access });
analytics.track('first_cycle_completed', { days_since_activation });
analytics.track('cycles_milestone', { count: 10 | 50 | 100 });
analytics.track('hit_free_limit', { total_cycles, days_active });
analytics.track('upgrade_prompt_shown', { context });
analytics.track('upgrade_started', { from_tier: 'free' });
analytics.track('upgrade_completed', { tier: 'pro', mrr: 19 });
```

---

## Edge Cases

### 1. Email Already Has Account

**Scenario:** User signed up for waitlist, then created account through normal signup before launch

**Handling:**

- On activation link click: detect existing user with matching email
- Show: "Looks like you already have an account! Sign in to claim your early access bonus."
- On sign-in: apply early access perks retroactively

### 2. Waitlist Entry Disputed

**Scenario:** User claims they signed up but can't find invitation email

**Handling:**

- Support lookup by email in waitlist table
- If found + status = 'pending': manually trigger invite
- If not found: offer standard signup (no bonus)

### 3. Multiple Waitlist Entries (Same Email)

**Handling:** De-duplicate on insert. First signup gets the position. Later attempts show "You're already on the list!"

### 4. Invited User Never Activates

**Handling:**

- 14-day expiry on activation token
- After expiry: user can still sign up normally (no early access bonus)
- Waitlist entry stays in `invited` status for analytics

### 5. Activation During Outage

**Scenario:** User clicks activation link during service downtime

**Handling:**

- Show friendly error: "We're doing some quick maintenance. Try again in a few minutes."
- Log the attempt so we can re-invite if they don't retry

---

## Dashboard Integration

### Founding Member Badge

```tsx
// Dashboard header component
function UserBadge({ user }: { user: User }) {
  const badges = useBadges(user.id);

  if (badges.includes('founding_member')) {
    return (
      <Badge variant="gold" tooltip="You're one of our first users!">
        ⭐ Founding Member
      </Badge>
    );
  }

  return null;
}
```

### Early Access Banner

```tsx
// Show during first 30 days
function EarlyAccessBanner({ user }: { user: User }) {
  if (!user.early_access) return null;

  const daysLeft = daysUntil(user.support_tier_expires);

  return (
    <Banner variant="info">
      🎉 You have {daysLeft} days of priority support remaining as an early
      adopter.
    </Banner>
  );
}
```

---

## Implementation Plan

### Pre-Launch (Feb 22-28)

1. **Database Migration**
   - Add `activation_token`, `invited_at` to waitlist table
   - Add `early_access`, `support_tier` to users table
   - Add `user_badges` table

2. **Activation Endpoint**
   - `/api/activate?token=xxx` route
   - Token validation logic
   - Post-OAuth activation hook

3. **Email Templates**
   - Launch announcement
   - Reminder (Day 3)
   - Last chance (Day 12)
   - Welcome (post-activation)

### Launch Day (Mar 1)

4. **Batch Invite System**
   - Wave 1 (10%) at 9am EST
   - Monitor activation rate, support load
   - Wave 2 at 3pm if clean

5. **Monitoring Dashboard**
   - Real-time activation count
   - Email delivery/bounce rates
   - Error alerts

### Post-Launch (Mar 2-14)

6. **Complete Rollout**
   - Waves 3-4
   - Conversion funnel tracking
   - Iterate on email copy based on open/click rates

---

## Acceptance Criteria

### P0 (Launch Blocking)

- [ ] Waitlist entries can receive activation email with unique token
- [ ] Activation link → GitHub OAuth → account created
- [ ] Early access perks (150 cycles) applied to activated accounts
- [ ] Waitlist status updated through full lifecycle
- [ ] Welcome email sent on activation

### P1 (Week 1)

- [ ] Batch invite system with wave controls
- [ ] Reminder emails (Day 3, Day 12) sent automatically
- [ ] Founding member badge displays in dashboard
- [ ] Conversion funnel tracked in analytics

### P2 (Sprint 3)

- [ ] Self-service "resend invite" for pending users
- [ ] Admin dashboard for waitlist management
- [ ] Referral tracking (who referred successful activations)

---

## Success Metrics

| Timeframe       | Metric                | Target         |
| --------------- | --------------------- | -------------- |
| Mar 1 (Day 1)   | Wave 1 activated      | 50% of invited |
| Mar 7 (Week 1)  | Total activated       | 200+ users     |
| Mar 14 (Week 2) | First paid conversion | 1+ customers   |
| Mar 31          | MRR                   | $100+          |

---

## Dependencies

- **#181 Auth** — GitHub OAuth must be working
- **#182 Billing** — Subscription creation on activation
- **#183 Onboarding** — First-run wizard for new users
- **#200 Waitlist** — Deployed and collecting signups

---

_Generated by 📦 Product at Cycle 1077. Per R-017: Tangible spec for waitlist → MRR conversion._
