# 📧 Resend Nurture Automation Setup Guide

> **Created:** C904 (Growth)
> **Purpose:** Technical implementation guide for waitlist nurture email sequence
> **Related:** C894 (Nurture Content), C877 (Waitlist UX Spec), #200 (Waitlist), #155 (SaaS Container)

---

## Overview

This guide bridges the content (C894) to implementation. When the waitlist deploys, follow these steps to activate the full nurture pipeline.

```
Waitlist Signup ──► Resend Contact ──► Nurture Sequence ──► Beta Invite ──► First MRR
       │                  │                   │
       └───► Welcome      └───► Day 3, 7      └───► Manual (when #155 ready)
```

---

## Prerequisites

Before starting:

1. ✅ Resend account created (free tier: 3,000 emails/month)
2. ✅ Domain verified in Resend (ada-ai.dev or similar)
3. ✅ API key generated
4. ✅ Waitlist app deployed (#200)

---

## Step 1: Create Audience

In Resend dashboard:

1. Go to **Audiences** → **Create Audience**
2. Name: `ADA Waitlist`
3. Copy the `audienceId` (format: `aud_xxxxx`)
4. Add to environment variables:

```bash
RESEND_AUDIENCE_ID=aud_xxxxx
```

---

## Step 2: Email Templates

### Create 4 templates in Resend

Go to **Emails** → **Templates** → **Create Template** for each:

| Template Name      | Subject Line                                        | When Sent      |
| ------------------ | --------------------------------------------------- | -------------- |
| `waitlist-welcome` | You're in! ADA waitlist confirmed 🤖                | Immediate      |
| `waitlist-day3`    | How we built ADA with ADA (real numbers inside)     | Day 3          |
| `waitlist-day7`    | The architecture that makes autonomous dev possible | Day 7          |
| `waitlist-beta`    | You're invited: ADA beta access 🚀                  | Manual trigger |

### Template Content

Copy from `docs/marketing/waitlist-nurture-sequence-c894.md`:

- **Email 1:** Welcome section → `waitlist-welcome`
- **Email 2:** Value Story section → `waitlist-day3`
- **Email 3:** Behind the Scenes section → `waitlist-day7`
- **Email 4:** Beta Invite section → `waitlist-beta`

### Personalization Variables

Use in templates:

```html
{{name}} - Contact's first name {{email}} - Contact's email {{position}} -
Waitlist position (requires custom field)
```

---

## Step 3: Automation Sequences

### Option A: Resend Audiences + Cron (Recommended for MVP)

Since Resend doesn't have built-in drip campaigns, use serverless cron:

```typescript
// vercel.json (or equivalent)
{
  "crons": [
    {
      "path": "/api/cron/nurture",
      "schedule": "0 14 * * *"  // Daily at 2pm UTC
    }
  ]
}
```

```typescript
// /api/cron/nurture.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const now = Date.now();

  // Get all contacts with their signup dates
  const { data: contacts } = await resend.contacts.list({
    audienceId: process.env.RESEND_AUDIENCE_ID!,
  });

  for (const contact of contacts?.data ?? []) {
    const signupDate = new Date(contact.createdAt).getTime();
    const daysSinceSignup = Math.floor(
      (now - signupDate) / (1000 * 60 * 60 * 24)
    );

    // Day 3 email (only send once — track in custom field)
    if (daysSinceSignup === 3 && !contact.day3Sent) {
      await sendNurtureEmail(contact, 'day3');
      await markEmailSent(contact.id, 'day3Sent');
    }

    // Day 7 email
    if (daysSinceSignup === 7 && !contact.day7Sent) {
      await sendNurtureEmail(contact, 'day7');
      await markEmailSent(contact.id, 'day7Sent');
    }
  }

  return Response.json({ processed: contacts?.data?.length ?? 0 });
}

async function sendNurtureEmail(contact: Contact, type: 'day3' | 'day7') {
  const templates = {
    day3: {
      subject: 'How we built ADA with ADA (real numbers inside)',
      template: 'waitlist-day3',
    },
    day7: {
      subject: 'The architecture that makes autonomous dev teams possible',
      template: 'waitlist-day7',
    },
  };

  const { subject, template } = templates[type];

  await resend.emails.send({
    from: 'Ishan @ ADA <ishan@ada-ai.dev>',
    to: contact.email,
    subject,
    react: NurtureEmail({ name: contact.firstName, template }),
  });
}
```

### Option B: External ESP (Future)

If volume exceeds free tier, migrate to:

- **Loops.so** — Built for SaaS, native drip sequences
- **Customer.io** — More complex automation
- **Mailchimp** — High volume, good free tier

For now, Option A is sufficient for <1,000 signups.

---

## Step 4: Welcome Email (Immediate)

Already implemented in waitlist signup API:

```typescript
// /api/waitlist.ts (existing)
// After contact.create(), send welcome:

await resend.emails.send({
  from: 'Ishan @ ADA <ishan@ada-ai.dev>',
  to: email,
  subject: "You're in! ADA waitlist confirmed 🤖",
  react: WelcomeEmail({ name }),
});
```

---

## Step 5: Beta Invite (Manual)

When #155 (SaaS Container) is ready:

```typescript
// /api/admin/send-beta-invites.ts
// Protected endpoint — manual trigger only

export async function POST(req: Request) {
  const { batch = 50 } = await req.json();

  const { data: contacts } = await resend.contacts.list({
    audienceId: process.env.RESEND_AUDIENCE_ID!,
  });

  // Sort by signup date (earliest first)
  const sorted = contacts?.data?.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Take first N who haven't received beta invite
  const toInvite = sorted?.filter(c => !c.betaInviteSent).slice(0, batch);

  for (const contact of toInvite ?? []) {
    await resend.emails.send({
      from: 'Ishan @ ADA <ishan@ada-ai.dev>',
      to: contact.email,
      subject: "You're invited: ADA beta access 🚀",
      react: BetaInviteEmail({ name: contact.firstName }),
    });

    await markEmailSent(contact.id, 'betaInviteSent');
  }

  return Response.json({ invited: toInvite?.length ?? 0 });
}
```

---

## Step 6: Tracking & Analytics

### Custom Contact Fields

Add these fields to track nurture progress:

| Field            | Type      | Purpose                   |
| ---------------- | --------- | ------------------------- |
| `signupSource`   | `string`  | UTM source/campaign       |
| `position`       | `number`  | Waitlist position         |
| `day3Sent`       | `boolean` | Day 3 email delivered     |
| `day7Sent`       | `boolean` | Day 7 email delivered     |
| `betaInviteSent` | `boolean` | Beta invite delivered     |
| `convertedAt`    | `date`    | When they became customer |

### Metrics to Monitor

| Metric                | Target | Check Frequency |
| --------------------- | ------ | --------------- |
| Welcome open rate     | >60%   | Daily           |
| Day 3 open rate       | >40%   | Weekly          |
| Day 7 open rate       | >35%   | Weekly          |
| Beta invite open rate | >50%   | Per batch       |
| Signup → beta conv    | >30%   | Weekly          |

---

## Step 7: Testing Checklist

Before going live, verify:

### Immediate Tests

- [ ] Sign up with test email
- [ ] Welcome email received within 1 min
- [ ] Email renders correctly (mobile + desktop)
- [ ] Links work (GitHub, Discord, unsubscribe)
- [ ] Personalization shows name correctly

### Automation Tests

- [ ] Manually set a contact's `createdAt` to 3 days ago
- [ ] Run cron job: `/api/cron/nurture`
- [ ] Day 3 email received
- [ ] `day3Sent` field updated to true
- [ ] Email not re-sent on next cron run

### Beta Invite Test

- [ ] Trigger admin endpoint with `batch=1`
- [ ] Beta invite received
- [ ] `betaInviteSent` field updated

---

## Environment Variables Summary

```bash
# Required
RESEND_API_KEY=re_xxxxx
RESEND_AUDIENCE_ID=aud_xxxxx

# Recommended
ADMIN_SECRET=xxx  # Protect manual endpoints
```

---

## Deployment Sequence

When human deploys waitlist:

1. **Verify** Resend API key in Vercel env vars
2. **Create** audience and update `RESEND_AUDIENCE_ID`
3. **Deploy** updated code with cron configuration
4. **Test** with personal email address
5. **Announce** on social (use C884 launch content)
6. **Monitor** Resend dashboard for deliverability

---

## Troubleshooting

### Emails not sending

1. Check Resend dashboard → **Logs**
2. Verify domain is authenticated (SPF, DKIM, DMARC)
3. Check API key has send permissions

### Cron not running

1. Vercel cron requires Pro plan for custom schedules
2. Alternative: Use external cron (cron-job.org) hitting API endpoint
3. Or use GitHub Actions scheduled workflow

### High bounce rate

1. Enable double opt-in (send confirmation link first)
2. Check email list hygiene
3. Monitor spam complaints in Resend dashboard

---

## Related Files

| Doc                                                | Purpose                   |
| -------------------------------------------------- | ------------------------- |
| `docs/marketing/waitlist-nurture-sequence-c894.md` | Email copy (4 emails)     |
| `docs/product/waitlist-website-ux-spec-c877.md`    | UX and welcome email spec |
| `docs/marketing/waitlist-launch-content-c884.md`   | Social posts for launch   |
| `docs/marketing/waitlist-promotion-plan-c874.md`   | Full promotion strategy   |

---

## Success Criteria

This guide is complete when:

- [ ] Human can deploy waitlist and set up nurture in <30 min
- [ ] All 4 emails trigger at correct times
- [ ] Tracking fields capture funnel progress
- [ ] No manual intervention needed after initial setup

---

_🚀 The Dealmaker (Head of Growth) — Cycle 904_
_Technical implementation guide bridging C894 content to live nurture pipeline._
