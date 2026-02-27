# Auth Error Pages UX Specification (C1202)

> **Sprint 3 Auth Error Handling** — User-friendly error states for authentication flows.
> Created: 2026-02-27 | Author: 🎨 Design (The Architect)

---

## Executive Summary

Authentication errors are frustrating moments for users. This spec defines how ADA communicates auth failures — transforming confusing errors into clear, actionable guidance. Every error page answers three questions: **What happened? Why? What can I do?**

**Principle:** Errors should be helpful, not hostile. A good error page can save a support ticket.

---

## Error Page Taxonomy

### Error Types (Priority Order)

| Error Code        | Trigger                              | Severity | User Control |
| ----------------- | ------------------------------------ | -------- | ------------ |
| `OAuthCallback`   | GitHub OAuth callback failure        | High     | Retry        |
| `AccessDenied`    | User denied GitHub permissions       | Medium   | Retry        |
| `SessionExpired`  | Session timeout (24h inactivity)     | Low      | Re-login     |
| `Verification`    | Email verification required (future) | Medium   | Action       |
| `Configuration`   | Server misconfiguration              | Critical | None         |
| `RateLimit`       | Too many login attempts              | Medium   | Wait         |
| `BillingRequired` | Tier action blocked (no sub)         | Medium   | Upgrade      |
| `Unauthorized`    | Invalid API key or session           | Medium   | Re-auth      |

---

## Page Designs

### Base Layout

All error pages share a consistent structure:

```
┌─────────────────────────────────────────────────────────────┐
│                        [ADA Logo]                           │
│                                                             │
│                    [Error Illustration]                     │
│                                                             │
│                    [Error Title]                            │
│                    [Error Description]                      │
│                                                             │
│                    [Primary Action]                         │
│                    [Secondary Action]                       │
│                                                             │
│                    [Help Link]                              │
└─────────────────────────────────────────────────────────────┘
```

**Design Tokens:**

- Background: `bg-gradient-to-br from-ada-primary-light/10 to-white`
- Card: `bg-bg-primary rounded-xl shadow-lg p-8`
- Error icon: Contextual, not generic red X
- Typography: `text-heading-2` for title, `text-body` for description

---

### 1. OAuth Callback Error

**URL:** `/auth/error?error=OAuthCallback`

**Triggers:**

- GitHub returns an error code
- OAuth state mismatch (CSRF protection)
- Network timeout during OAuth flow

**Design:**

```
┌─────────────────────────────────────────────────────────────┐
│                          🤖                                 │
│                                                             │
│                    🔗 → ❌ → 🖥️                             │
│                                                             │
│               Connection Interrupted                        │
│                                                             │
│  Something went wrong while connecting to GitHub.           │
│  This usually happens if:                                   │
│                                                             │
│    • The connection timed out                               │
│    • GitHub is experiencing issues                          │
│    • You navigated away during sign-in                      │
│                                                             │
│              [🔄 Try Again with GitHub]                     │
│                                                             │
│              ← Back to home                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Still having trouble? Check GitHub Status or contact us.  │
└─────────────────────────────────────────────────────────────┘
```

**Copy:**

- Title: "Connection Interrupted"
- Description: Explains possible causes without technical jargon
- Primary CTA: "Try Again with GitHub" → `/api/auth/signin/github`
- Secondary: "Back to home" → `/`
- Help: Links to GitHub Status page + support email

**Technical Notes:**

- Log OAuth error details server-side (don't expose to user)
- Include error reference ID for support: `Error ID: ada-err-{timestamp}`
- Track in analytics: `auth_error_oauth_callback`

---

### 2. Access Denied

**URL:** `/auth/error?error=AccessDenied`

**Triggers:**

- User clicks "Cancel" on GitHub OAuth consent screen
- User revokes app access in GitHub settings
- Required scopes not granted

**Design:**

```
┌─────────────────────────────────────────────────────────────┐
│                          🤖                                 │
│                                                             │
│                         🚫                                  │
│                                                             │
│               Permission Required                           │
│                                                             │
│  ADA needs permission to access your GitHub account         │
│  to sync with your repositories.                            │
│                                                             │
│  We request minimal permissions:                            │
│    ✓ Read your email (for notifications)                    │
│    ✓ Access public profile info                             │
│    ✓ Read repository metadata                               │
│                                                             │
│  We never:                                                  │
│    ✗ Modify your code                                       │
│    ✗ Access private repos without consent                   │
│    ✗ Share your data                                        │
│                                                             │
│              [🔑 Grant Access]                              │
│                                                             │
│              ← Back to home                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Copy:**

- Title: "Permission Required" (not "Access Denied")
- Description: Explains what we need and why — builds trust
- Shows permissions explicitly (transparency)
- Shows what we DON'T do (negative reassurance)
- Primary CTA: "Grant Access" → `/api/auth/signin/github`

**UX Rationale:** Don't make users feel accused. "Access Denied" sounds hostile — "Permission Required" is collaborative.

---

### 3. Session Expired

**URL:** `/auth/error?error=SessionExpired` or automatic redirect

**Triggers:**

- Session exceeds 24-hour maxAge
- User cleared cookies
- Server restart (if using memory sessions)

**Design:**

```
┌─────────────────────────────────────────────────────────────┐
│                          🤖                                 │
│                                                             │
│                         ⏰                                  │
│                                                             │
│               Session Expired                               │
│                                                             │
│  Your session has ended. Sign in again to continue          │
│  managing your autonomous dev teams.                        │
│                                                             │
│  Don't worry — your agent teams are still running! 🚀       │
│                                                             │
│              [Sign In Again]                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Tip: Sessions expire after 24 hours of inactivity.         │
└─────────────────────────────────────────────────────────────┘
```

**Copy:**

- Title: "Session Expired"
- Description: Reassuring — agents still running
- Primary CTA: "Sign In Again" → `/login`
- Tip: Explains the 24h policy (sets expectations)

**UX Enhancement:**

- If user was on a specific page, remember it in a `callbackUrl` param
- After sign-in, redirect them back: `/login?callbackUrl=/dashboard/executions/123`

---

### 4. Configuration Error (Server-Side)

**URL:** `/auth/error?error=Configuration`

**Triggers:**

- Missing `GITHUB_CLIENT_ID` or `GITHUB_CLIENT_SECRET`
- Invalid `NEXTAUTH_SECRET`
- Database connection failure

**Design:**

```
┌─────────────────────────────────────────────────────────────┐
│                          🤖                                 │
│                                                             │
│                         🔧                                  │
│                                                             │
│               Temporarily Unavailable                       │
│                                                             │
│  Our authentication system is being updated.                │
│  Please try again in a few minutes.                         │
│                                                             │
│              [Check Status Page]                            │
│                                                             │
│              ← Back to home                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Error reference: CFG-{timestamp}                           │
│  This has been reported to our team.                        │
└─────────────────────────────────────────────────────────────┘
```

**Copy:**

- Title: "Temporarily Unavailable" (not "Configuration Error")
- Description: Don't blame the user, don't expose internal details
- Primary CTA: Link to status page
- Footer: Error reference for support

**Technical Notes:**

- Log full error details server-side with stack trace
- Alert ops team via configured notification channel
- Never expose environment variable names or values

---

### 5. Rate Limited

**URL:** `/auth/error?error=RateLimit`

**Triggers:**

- More than 5 failed login attempts in 15 minutes
- IP-based rate limiting triggered
- Account-based rate limiting

**Design:**

```
┌─────────────────────────────────────────────────────────────┐
│                          🤖                                 │
│                                                             │
│                         🐢                                  │
│                                                             │
│               Slow Down                                     │
│                                                             │
│  Too many sign-in attempts. Please wait a few minutes       │
│  before trying again.                                       │
│                                                             │
│  Ready in: 4:32                                             │
│  ████████████░░░░░░░░                                       │
│                                                             │
│              [← Back to home]                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Having trouble? Contact support@ada.dev                    │
└─────────────────────────────────────────────────────────────┘
```

**Copy:**

- Title: "Slow Down" (friendly, not punitive)
- Description: Clear instruction
- Progress indicator: Shows countdown (reduces frustration)
- Support link: In case it's a legitimate user locked out

**Technical Implementation:**

- Countdown timer: Client-side JavaScript, synced with server TTL
- Auto-refresh page when timer hits 0
- Show "Try Again" button when countdown completes

---

### 6. Billing Required

**URL:** `/dashboard?error=BillingRequired` (inline, not separate page)

**Triggers:**

- Free tier user tries Pro/Enterprise feature
- Cycles exhausted, action blocked
- Team invite attempted on Free tier

**Design (Inline Banner):**

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Upgrade Required                                   [×]   │
│                                                             │
│ This feature requires a Pro subscription.                   │
│ Upgrade to unlock unlimited cycles, team features, and      │
│ priority support.                                           │
│                                                             │
│ [View Plans]  [Maybe Later]                                 │
└─────────────────────────────────────────────────────────────┘
```

**Design (Modal for Critical Blocks):**

```
┌─────────────────────────────────────────────────────────────┐
│                    Cycle Limit Reached                      │
│                                                             │
│            ████████████████████████████████████             │
│                      10 / 10 cycles                         │
│                                                             │
│  You've used all your free cycles this month.               │
│  Upgrade to Pro for 1,000 cycles/month.                     │
│                                                             │
│  ┌────────────────────┐  ┌────────────────────┐            │
│  │      Free          │  │      Pro           │            │
│  │  10 cycles/mo      │  │  1,000 cycles/mo   │            │
│  │  Single repo       │  │  Unlimited repos   │            │
│  │  Community support │  │  Priority support  │            │
│  │       $0           │  │    $19/month       │            │
│  └────────────────────┘  └────────────────────┘            │
│                                                             │
│              [Upgrade to Pro — $19/mo]                      │
│                                                             │
│  Resets in 5 days  •  Need more now? [Contact Sales]        │
└─────────────────────────────────────────────────────────────┘
```

**Copy:**

- Shows current vs. available (comparison sells)
- "Resets in X days" — maybe they can wait
- Contact sales — enterprise escape hatch

**Integration with L695 (Progressive Warnings):**

- 80% usage: Soft warning banner (dismissible)
- 100% usage: Blocking modal (not dismissible)
- Integrates with billing module's `CycleWarning` types

---

### 7. Unauthorized API Request

**URL:** N/A (API response, not page)

**Triggers:**

- Invalid or expired API key
- Missing Authorization header
- Invalid session cookie

**API Response:**

```json
{
  "error": "unauthorized",
  "message": "Invalid or expired authentication",
  "code": "AUTH_INVALID_TOKEN",
  "hint": "Generate a new API key at dashboard.ada.dev/settings",
  "docs": "https://docs.ada.dev/api/authentication"
}
```

**CLI Display:**

```
❌ Authentication failed

  Your API key is invalid or expired.

  To fix this:
    1. Run: ada login
    2. Or generate a new key at: dashboard.ada.dev/settings

  Error: AUTH_INVALID_TOKEN
```

**UX Rationale:**

- CLI errors should be as helpful as web errors
- Always include actionable next steps
- Link to docs for context

---

## Implementation Guidelines

### File Structure

```
apps/web/src/app/(auth)/
├── login/
│   └── page.tsx          # Login page (exists)
├── error/
│   └── page.tsx          # Error page (CREATE)
├── signout/
│   └── page.tsx          # Sign out confirmation (CREATE)
└── layout.tsx            # Auth layout (exists)
```

### Error Page Component

```typescript
// apps/web/src/app/(auth)/error/page.tsx

'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const ERROR_MESSAGES: Record<string, {
  icon: string;
  title: string;
  description: string;
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
}> = {
  OAuthCallback: {
    icon: '🔗',
    title: 'Connection Interrupted',
    description: 'Something went wrong while connecting to GitHub. This usually happens if the connection timed out or you navigated away during sign-in.',
    cta: { label: '🔄 Try Again with GitHub', href: '/api/auth/signin/github' },
    secondary: { label: '← Back to home', href: '/' },
  },
  AccessDenied: {
    icon: '🔑',
    title: 'Permission Required',
    description: 'ADA needs permission to access your GitHub account to sync with your repositories. We request minimal permissions and never modify your code.',
    cta: { label: '🔑 Grant Access', href: '/api/auth/signin/github' },
    secondary: { label: '← Back to home', href: '/' },
  },
  SessionExpired: {
    icon: '⏰',
    title: 'Session Expired',
    description: 'Your session has ended. Sign in again to continue. Don't worry — your agent teams are still running! 🚀',
    cta: { label: 'Sign In Again', href: '/login' },
  },
  Configuration: {
    icon: '🔧',
    title: 'Temporarily Unavailable',
    description: 'Our authentication system is being updated. Please try again in a few minutes.',
    cta: { label: 'Check Status Page', href: 'https://status.ada.dev' },
    secondary: { label: '← Back to home', href: '/' },
  },
  Default: {
    icon: '❓',
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    cta: { label: 'Try Again', href: '/login' },
    secondary: { label: '← Back to home', href: '/' },
  },
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';
  const errorRef = searchParams.get('ref');

  const errorConfig = ERROR_MESSAGES[error] || ERROR_MESSAGES.Default;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ada-primary-light/10 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-8">
        <div className="bg-bg-primary rounded-xl shadow-lg p-8 space-y-6 text-center">
          {/* Logo */}
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <span className="text-4xl">🤖</span>
          </Link>

          {/* Error Icon */}
          <div className="text-5xl">{errorConfig.icon}</div>

          {/* Title */}
          <h1 className="text-heading-2">{errorConfig.title}</h1>

          {/* Description */}
          <p className="text-body text-text-muted">{errorConfig.description}</p>

          {/* Primary CTA */}
          <Link
            href={errorConfig.cta.href}
            className="inline-block w-full px-4 py-3 bg-ada-primary text-white rounded-lg font-medium hover:bg-ada-primary-dark transition-colors"
          >
            {errorConfig.cta.label}
          </Link>

          {/* Secondary Link */}
          {errorConfig.secondary && (
            <Link
              href={errorConfig.secondary.href}
              className="text-sm text-ada-primary hover:underline"
            >
              {errorConfig.secondary.label}
            </Link>
          )}

          {/* Error Reference */}
          {errorRef && (
            <p className="text-xs text-text-muted mt-4">
              Error reference: {errorRef}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
```

### Testing Checklist

| Scenario               | Test                                     |
| ---------------------- | ---------------------------------------- |
| OAuth callback failure | Mock GitHub error response               |
| User cancels OAuth     | Click cancel on GitHub consent screen    |
| Session expires        | Set short maxAge, wait for expiry        |
| Missing env vars       | Remove GITHUB_CLIENT_ID, attempt login   |
| Rate limit             | Trigger 6+ login attempts in 15 min      |
| Unknown error code     | Pass `?error=SomethingNew` to error page |
| Error ref displayed    | Pass `?error=OAuth&ref=ada-err-123`      |
| Mobile responsive      | Test at 375px viewport width             |
| Dark mode              | Toggle system dark mode                  |

---

## Analytics Events

Track these events for error monitoring:

| Event                       | Properties                   |
| --------------------------- | ---------------------------- |
| `auth_error_viewed`         | `error_type`, `error_ref`    |
| `auth_error_retry_clicked`  | `error_type`, `cta_label`    |
| `auth_error_help_clicked`   | `error_type`, `help_type`    |
| `auth_rate_limit_triggered` | `ip_hash`, `attempts`, `ttl` |

---

## Accessibility Requirements

- **Focus management:** Focus moves to error title on page load
- **ARIA:** `role="alert"` on error container
- **Screen reader:** Announce error type and instructions
- **Keyboard nav:** All CTAs keyboard-accessible
- **Color contrast:** 4.5:1 minimum for all text
- **Motion:** Respect `prefers-reduced-motion` for any animations

---

## Related Specs

- **C1195:** Auth-Billing Integration (defines tier enrichment)
- **C1197:** Dashboard MVP Spec (page structure)
- **Dashboard Auth Spec:** Original auth architecture doc
- **L694:** E2E tests need auth env vars (testing considerations)

---

## Acceptance Criteria

1. [ ] Error page exists at `/auth/error` with dynamic content
2. [ ] All 6 error types render correctly with appropriate copy
3. [ ] CTAs navigate to correct destinations
4. [ ] Error reference ID displayed when provided
5. [ ] Dark mode styling works
6. [ ] Mobile responsive (375px+)
7. [ ] E2E test covers OAuth error scenario
8. [ ] Analytics events fire on page view and CTA clicks

---

## Sprint 3 Implementation Notes

**Week 1 (Mar 1-7):**

- Day 1: Create error page component per this spec
- Day 2: Wire up NextAuth error redirects
- Day 3: Add rate limiting infrastructure
- Day 4: E2E tests for error flows

**Dependencies:**

- NextAuth.js integration (PR #253 ✅)
- Auth foundation (PR #252 ✅)

---

_🎨 Design (The Architect) | Cycle 1202 | Sprint 3 Auth Error Pages UX_
