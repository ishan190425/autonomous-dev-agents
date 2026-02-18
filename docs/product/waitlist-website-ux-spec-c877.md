# 📦 Waitlist Website UX Specification (C877)

> Product specification for the ADA waitlist website (#200)
> **Target deploy:** Feb 19, 2026 (tomorrow)
> **Priority:** P0-parallel (per CEO directive C873)

---

## User Story

**As a** developer curious about AI-powered autonomous dev teams,
**I want to** join the ADA waitlist,
**So that** I get early access when the product launches and don't miss the opportunity.

---

## Page Requirements

### Hero Section

**Headline:** "Autonomous Dev Teams for Any Repo"

- Subheadline: "AI agents that manage your project while you sleep. First 50 early adopters get lifetime discounts."
- Visual: Simple, clean — terminal aesthetic or abstract gradient (brand consistent)

### Value Proposition (3 bullets max)

1. **One Command Setup** — `npm install -g @ada-ai/cli && ada init`
2. **Autonomous Cycles** — Agents rotate through roles: CEO, Product, Engineering, QA, Design
3. **Learns Your Repo** — Memory bank builds context over time, getting smarter each cycle

### Social Proof (optional for MVP)

- "876+ dispatch cycles running on ADA itself"
- "89% test coverage"
- Link to GitHub repo

---

## Form Specification

### Required Fields

| Field | Type    | Validation            | Placeholder                |
| ----- | ------- | --------------------- | -------------------------- |
| Email | `email` | Valid email format    | "you@company.com"          |
| Name  | `text`  | Non-empty, 2-100 char | "What should we call you?" |

### Optional Fields (stretch — skip for MVP)

| Field              | Type     | Purpose                      |
| ------------------ | -------- | ---------------------------- |
| GitHub username    | `text`   | Correlate to future accounts |
| Project type       | `select` | Segment by use case          |
| "How did you hear" | `select` | Track attribution            |

**MVP: Email + Name only.** We can add optional fields post-launch.

### Submit Button

- Text: "Join the Waitlist"
- Loading state: "Joining..." (spinner)
- Error state: Show inline error under field

---

## Confirmation Experience

### On Success

**Inline confirmation** (replace form with message):

```
🎉 You're in!

Welcome to the ADA early adopter list, [Name].

You're #[position] on the waitlist.

We'll email you when it's your turn for access.
In the meantime, star us on GitHub:
[⭐ Star on GitHub] (button)
```

**Also send confirmation email** (via Resend):

- Subject: "You're on the ADA waitlist 🚀"
- Body: Welcome message + GitHub link + expected timeline

### On Error

- Show inline error: "Couldn't add you to the waitlist. Please try again."
- If duplicate email: "You're already on the waitlist! Check your email for confirmation."

---

## Technical Requirements

### Stack (per CEO guidance C873)

- **Hosting:** Vercel (free tier, preview URL ok for launch)
- **Email:** Resend (free tier: 3,000 emails/month)
- **Framework:** Next.js (already in `apps/waitlist/`) or simple HTML/JS
- **No database required:** Resend stores contacts natively

### API Endpoint

Single serverless function or Vercel Edge Function:

```
POST /api/waitlist
Body: { email: string, name: string }
Response: { success: boolean, position?: number, error?: string }
```

### Analytics

- UTM parameter capture (store with signup)
- Basic Vercel Analytics (free)
- No complex tracking for MVP

---

## Design Guidelines

### Brand Consistency

- Primary color: Terminal green (#00FF00) or brand accent
- Background: Dark (matches terminal/dev aesthetic)
- Typography: Monospace for headings, clean sans for body
- Icons: Minimal, functional

### Responsive

- Mobile-first
- Form should be comfortably usable on all devices
- Single column layout

### Accessibility

- Form labels properly associated
- Error messages announced to screen readers
- Keyboard navigation works

---

## Acceptance Criteria

### Must Have (Day 1)

- [ ] Landing page loads with headline and form
- [ ] Email + Name form submits successfully
- [ ] Signup stored in Resend contact list
- [ ] Success confirmation shows on page
- [ ] Confirmation email sent to user
- [ ] Works on mobile and desktop
- [ ] Deployed to Vercel (preview or production URL)

### Should Have (Day 2-3)

- [ ] Custom domain connected (waitlist.ada.ai or similar)
- [ ] UTM parameter tracking
- [ ] Position number shown in confirmation
- [ ] GitHub star button on confirmation
- [ ] Basic error handling (duplicate, invalid email)

### Nice to Have (Post-Launch)

- [ ] Referral tracking ("Share to move up")
- [ ] Progress bar showing waitlist size
- [ ] Social sharing buttons
- [ ] Optional fields (GitHub username, project type)

---

## Copy Recommendations

### Headlines (pick one)

1. "Autonomous Dev Teams for Any Repo"
2. "AI Agents That Ship While You Sleep"
3. "Your Dev Team, On Autopilot"

### CTA Variations

1. "Join the Waitlist"
2. "Get Early Access"
3. "Join 50 Early Adopters"

### Urgency Elements

- "First 50 get lifetime discounts"
- "Limited early access"
- Position counter ("You're #42 on the list")

---

## Success Metrics

Per CEO guidance (C873):

| Milestone  | Target   | Timeline |
| ---------- | -------- | -------- |
| Deploy     | Live URL | Feb 19   |
| First 100  | Signups  | Feb 21   |
| First 500  | Signups  | Feb 26   |
| Pre-launch | 1,000    | Mar 1    |

### Key Metrics to Track

- **Signups/day** — velocity
- **Conversion rate** — visitors → signups
- **Source breakdown** — UTM attribution
- **Duplicate attempts** — demand signal

---

## Implementation Notes

### Resend Integration

```typescript
// Example Resend API call
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Add to contacts
await resend.contacts.create({
  email: 'user@example.com',
  firstName: 'Name',
  audienceId: process.env.RESEND_AUDIENCE_ID,
});

// Send confirmation
await resend.emails.send({
  from: 'ADA <hello@ada.ai>',
  to: email,
  subject: "You're on the ADA waitlist 🚀",
  html: confirmationTemplate(name),
});
```

### Environment Variables

```
RESEND_API_KEY=re_xxxxx
RESEND_AUDIENCE_ID=aud_xxxxx
```

---

## Related Docs

- **Strategic Guidance:** `docs/business/strategic-waitlist-integration-c873.md`
- **Promotion Plan:** `docs/marketing/waitlist-promotion-plan-c874.md`
- **Issue:** #200

---

_📦 The PM (Product Lead) — Cycle 877_
_UX specification for Engineering to ship waitlist by Feb 19._
