# Waitlist Page UX Specification

**Issue:** #200 (apps/waitlist — Temporary Waitlist Website)  
**Author:** 🎨 Design (The Architect)  
**Cycle:** C842  
**Status:** DRAFT

---

## Overview

A minimal, conversion-focused waitlist page for ADA. Captures early interest before full SaaS dashboard launches. Should communicate value proposition clearly and collect signups with low friction.

---

## Goals

1. **Capture emails** — Primary conversion action
2. **Communicate value** — What ADA is and why it matters
3. **Build anticipation** — Create excitement for launch
4. **Establish brand** — First impression of ADA's visual identity

---

## User Flow

```
┌─────────────────────────────────────────────────┐
│                    LANDING                       │
│                                                 │
│  Hero: "AI agents that ship code autonomously"  │
│                                                 │
│  [ email input ] [ Join Waitlist ]              │
│                                                 │
│  "830+ cycles. 400+ consecutive. Self-hosted."  │
│                                                 │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│               SUCCESS STATE                      │
│                                                 │
│  ✓ You're on the list!                          │
│                                                 │
│  "We'll notify you when ADA launches."          │
│                                                 │
│  [ Share on Twitter ] [ Star on GitHub ]        │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Page Sections

### 1. Hero Section

**Headline:** "AI agents that ship code autonomously"

**Subheadline:** "ADA is an autonomous development framework that runs 24/7 — writing code, reviewing PRs, and evolving itself. Self-hosted. Open source."

**CTA:** Email input + "Join Waitlist" button

**Social proof:** "830+ cycles • 400+ consecutive • 79 PRs merged"

### 2. How It Works (3-Step)

| Step | Visual        | Copy                                                 |
| ---- | ------------- | ---------------------------------------------------- |
| 1    | Terminal icon | `ada init` — Bootstrap your agent team in seconds    |
| 2    | Rotation icon | Agents take turns — CEO → Product → Engineering → QA |
| 3    | GitHub icon   | PRs, issues, code — all shipped autonomously         |

### 3. Credibility Section

- **Open source** — MIT licensed, full transparency
- **Battle-tested** — 830+ cycles on its own codebase
- **Extensible** — Custom roles, playbooks, memory systems

### 4. Footer

- Links: GitHub, Discord, Documentation
- Copyright: © 2026 ADA

---

## Email Capture Component

### States

| State          | Visual                         | Behavior                     |
| -------------- | ------------------------------ | ---------------------------- |
| **Empty**      | Placeholder: "you@company.com" | Focus ring on click          |
| **Typing**     | Real-time validation hint      | "Press Enter to join"        |
| **Submitting** | Button shows spinner           | Disable input                |
| **Success**    | Green checkmark, confetti?     | Show success state           |
| **Error**      | Red border, error message      | "Please enter a valid email" |

### Validation

- Client-side: Basic email format (contains @ and .)
- Server-side: Full RFC 5322 validation
- Deduplication: "You're already on the list!"

---

## Responsive Design

### Desktop (≥1024px)

- Centered hero, max-width 720px
- Horizontal 3-step layout
- Comfortable whitespace

### Tablet (768–1023px)

- Same as desktop, slightly reduced margins
- 3-step layout maintains horizontal

### Mobile (≤767px)

- Stack 3-step vertically
- Full-width email input
- Larger touch targets (min 44px)

---

## Visual Design

### Colors

| Element    | Value                  | Usage              |
| ---------- | ---------------------- | ------------------ |
| Primary    | `#6366F1` (Indigo 500) | CTA buttons, links |
| Background | `#0F172A` (Slate 900)  | Dark theme base    |
| Surface    | `#1E293B` (Slate 800)  | Cards, inputs      |
| Text       | `#F8FAFC` (Slate 50)   | Primary text       |
| Muted      | `#94A3B8` (Slate 400)  | Secondary text     |
| Success    | `#22C55E` (Green 500)  | Success states     |
| Error      | `#EF4444` (Red 500)    | Error states       |

### Typography

- **Headlines:** Inter, 600 weight
- **Body:** Inter, 400 weight
- **Mono:** JetBrains Mono (code snippets)

### Motion

- **Form submission:** 200ms ease-out transitions
- **Success confetti:** Optional, subtle (1-2s duration)
- **Hover states:** 150ms color transitions

---

## Accessibility

### Requirements

- [ ] Color contrast ≥4.5:1 for text, ≥3:1 for UI
- [ ] Keyboard navigation (Tab, Enter to submit)
- [ ] Focus indicators visible
- [ ] Form labels associated with inputs
- [ ] Error messages announced to screen readers
- [ ] Reduced motion preference respected

### ARIA

```html
<form aria-labelledby="waitlist-heading" role="form">
  <label for="email" class="sr-only">Email address</label>
  <input
    type="email"
    id="email"
    aria-describedby="email-hint"
    aria-invalid="false"
    required
  />
  <span id="email-hint" class="sr-only"
    >Enter your email to join the waitlist</span
  >
  <button type="submit">Join Waitlist</button>
</form>
```

---

## Analytics

Track:

| Event          | Trigger              | Properties                   |
| -------------- | -------------------- | ---------------------------- |
| `page_view`    | Page load            | `referrer`, `utm_*`          |
| `form_focus`   | Email input focused  | —                            |
| `form_submit`  | Form submitted       | `email_domain` (company.com) |
| `form_success` | Signup successful    | —                            |
| `form_error`   | Validation failed    | `error_type`                 |
| `share_click`  | Share button clicked | `platform`                   |

---

## Technical Notes

### Stack Recommendation

- **Framework:** Next.js (aligns with apps/web)
- **Styling:** Tailwind CSS
- **Email capture:** Supabase (already in stack) or Resend
- **Hosting:** Vercel (same as dashboard)

### API

```typescript
// POST /api/waitlist
interface WaitlistRequest {
  email: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
}

interface WaitlistResponse {
  success: boolean;
  message: string;
  position?: number; // "You're #142 on the list!"
}
```

---

## Success Metrics

- **Conversion rate:** ≥15% of visitors join waitlist
- **Bounce rate:** <60%
- **Time to signup:** <30 seconds from page load
- **Mobile conversion:** Within 80% of desktop

---

## Acceptance Criteria

1. [ ] Page loads <3s on 3G connection
2. [ ] Email capture works on all browsers (Chrome, Safari, Firefox, Edge)
3. [ ] Mobile responsive down to 320px width
4. [ ] Accessibility audit passes (WCAG 2.1 AA)
5. [ ] Analytics events fire correctly
6. [ ] Success state shows after valid submission
7. [ ] Error states display for invalid input
8. [ ] Duplicate emails handled gracefully
9. [ ] Page renders without JavaScript (progressive enhancement)
10. [ ] Social share links work correctly

---

## Open Questions

1. **Position counter?** — "You're #142 on the list!" (adds FOMO, requires state)
2. **Referral system?** — "Invite friends to move up" (more complex)
3. **Early access tiers?** — 50 spots mentioned in #92, show "47 spots left"?

---

## References

- **Auth UX Spec:** docs/design/auth-ux-spec-c822.md
- **Billing UX Spec:** docs/design/billing-ux-spec-c832.md
- **Product Hunt Draft:** docs/marketing/launches/product-hunt-draft.md
- **SaaS Container:** #155

---

_Created Cycle 842 • Design role_
