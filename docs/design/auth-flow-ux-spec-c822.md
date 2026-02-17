# Auth Flow UX Specification

> **Author:** 🎨 Design (The Architect)  
> **Cycle:** C822 (400 consecutive!)  
> **Date:** 2026-02-17  
> **Status:** Ready for Implementation  
> **Relates to:** #181 (Authentication System), #155 (SaaS Container)  
> **Builds on:** `docs/architecture/dashboard-auth-spec.md`

---

## Overview

UX specification for ADA dashboard authentication. Covers user flows, UI components, error states, and accessibility requirements. Designed for Sprint 3 Week 1 implementation.

---

## 1. User Flows

### 1.1 First-Time Login (Web Dashboard)

```
┌─────────────────────────────────────────────────────────────┐
│  Landing Page                                                │
│  ┌─────────────────────────────────────┐                    │
│  │        🤖 ADA Dashboard              │                    │
│  │                                       │                    │
│  │  Autonomous Dev Agents for your      │                    │
│  │  repositories.                        │                    │
│  │                                       │                    │
│  │  ┌───────────────────────────────┐   │                    │
│  │  │  🐙 Continue with GitHub      │   │   ← Primary CTA    │
│  │  └───────────────────────────────┘   │                    │
│  │                                       │                    │
│  │  By signing in, you agree to our     │                    │
│  │  Terms of Service and Privacy Policy │                    │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub OAuth Screen (GitHub-controlled)                     │
│  - ADA Dashboard requests: read:user, repo                   │
│  - User authorizes                                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Onboarding (First Login Only)                               │
│  ┌─────────────────────────────────────┐                    │
│  │  👋 Welcome, @username!              │                    │
│  │                                       │                    │
│  │  Let's set up your first agent.      │                    │
│  │                                       │                    │
│  │  Select a repository:                │                    │
│  │  ┌─────────────────────────────┐     │                    │
│  │  │ ○ owner/repo-1              │     │                    │
│  │  │ ○ owner/repo-2              │     │                    │
│  │  │ ○ owner/repo-3              │     │                    │
│  │  └─────────────────────────────┘     │                    │
│  │                                       │                    │
│  │  ┌─────────────┐ ┌─────────────┐     │                    │
│  │  │    Skip     │ │  Continue → │     │                    │
│  │  └─────────────┘ └─────────────┘     │                    │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Dashboard (Repos Overview)                                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Returning User Login

```
Landing Page → "Continue with GitHub" → GitHub OAuth (if session expired) → Dashboard
                                       ↓ (if session valid)
                                       → Direct to Dashboard
```

### 1.3 CLI Login Flow

```
┌──────────────────────────────────────────────────────────────┐
│  Terminal                                                     │
│  $ ada login                                                  │
│                                                               │
│  🔑 Opening browser for authentication...                     │
│  Press Enter to open browser, or Ctrl+C to cancel.           │
│                                                               │
│  → Browser opens to dashboard.ada.dev/cli/auth               │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Browser: CLI Authorization Page                              │
│  ┌────────────────────────────────────┐                      │
│  │  🔑 Authorize ADA CLI               │                      │
│  │                                      │                      │
│  │  The ADA CLI is requesting access   │                      │
│  │  to your account.                    │                      │
│  │                                      │                      │
│  │  Permissions:                        │                      │
│  │  ✓ View your repositories           │                      │
│  │  ✓ Run agent cycles                 │                      │
│  │  ✓ Read agent logs                  │                      │
│  │                                      │                      │
│  │  ┌──────────────────────────────┐   │                      │
│  │  │      ✅ Authorize CLI        │   │                      │
│  │  └──────────────────────────────┘   │                      │
│  │                                      │                      │
│  │  ┌──────────────────────────────┐   │                      │
│  │  │         Cancel               │   │                      │
│  │  └──────────────────────────────┘   │                      │
│  └────────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Browser: Success Page                                        │
│  ┌────────────────────────────────────┐                      │
│  │  ✅ CLI Authorized!                 │                      │
│  │                                      │                      │
│  │  You can close this window and      │                      │
│  │  return to your terminal.           │                      │
│  └────────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Terminal (polling completes)                                 │
│                                                               │
│  ✅ Logged in as @username                                    │
│                                                               │
│  Credentials saved to ~/.ada/credentials                      │
│  Run `ada status` to see your repositories.                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. UI Components

### 2.1 Login Button

```
┌─────────────────────────────────────┐
│  🐙 Continue with GitHub            │
└─────────────────────────────────────┘

Specs:
- Width: 280px (min), full-width on mobile
- Height: 48px
- Background: GitHub brand (#24292e) or neutral dark
- Text: "Continue with GitHub" (not "Login" — warmer)
- Icon: GitHub Octocat (16px)
- Border-radius: 8px
- Hover: Lighten 10%
- Focus: 2px outline, primary color
- Loading state: Spinner replaces icon, "Connecting..."
```

### 2.2 User Avatar & Session Indicator

```
Logged In State (Header):
┌────────────────────────────────────────────────────────────┐
│  ADA Dashboard              [Search]        🔔  👤 ▾       │
└────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
                              ┌─────────────────────────────┐
                              │  @username                  │
                              │  user@email.com             │
                              │  ─────────────────────────  │
                              │  ⚙️ Settings                │
                              │  📖 Documentation           │
                              │  ─────────────────────────  │
                              │  🚪 Sign Out                │
                              └─────────────────────────────┘

Specs:
- Avatar: 32px circle, GitHub avatar or initials fallback
- Dropdown: 240px width, shadow-lg
- Menu items: 40px height, hover highlight
```

### 2.3 Session Status Badge

```
Active Session:
┌──────────────────────┐
│  🟢 Session Active   │
└──────────────────────┘

Expiring Soon (< 1 hour):
┌──────────────────────────────┐
│  🟡 Session expires in 45m   │
│  [Extend Session]            │
└──────────────────────────────┘

Expired:
┌──────────────────────────────┐
│  🔴 Session Expired          │
│  [Re-authenticate]           │
└──────────────────────────────┘
```

---

## 3. Error States

### 3.1 OAuth Errors

| Error           | User Message                                      | Recovery Action                     |
| --------------- | ------------------------------------------------- | ----------------------------------- |
| `access_denied` | "You canceled the login. No worries!"             | "Try Again" button                  |
| `invalid_scope` | "We couldn't get the permissions we need."        | "Contact Support" link              |
| `server_error`  | "GitHub is having issues. Try again in a moment." | "Retry" button + countdown          |
| `network_error` | "Can't reach GitHub. Check your connection."      | Auto-retry with exponential backoff |

### 3.2 Error Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                          ⚠️                                  │
│                                                              │
│              Login didn't work this time                     │
│                                                              │
│     GitHub said: "access_denied"                             │
│                                                              │
│     This usually means you canceled the login,               │
│     or your organization has restrictions.                   │
│                                                              │
│     ┌────────────────────┐                                   │
│     │    Try Again       │                                   │
│     └────────────────────┘                                   │
│                                                              │
│     Need help? Contact support@ada.dev                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Session Expiry Handling

**Soft expiry (< 5 minutes warning):**

- Toast notification: "Your session expires soon. Save your work."
- "Extend Session" button in toast

**Hard expiry (session invalid):**

- Modal overlay (non-dismissable)
- "Your session has expired. Please log in again."
- "Log In" button → preserves current URL for redirect-back

---

## 4. Accessibility

### 4.1 Keyboard Navigation

| Key               | Action                               |
| ----------------- | ------------------------------------ |
| `Tab`             | Move between focusable elements      |
| `Enter` / `Space` | Activate buttons                     |
| `Escape`          | Close dropdown menus, dismiss modals |
| `Arrow Down/Up`   | Navigate dropdown options            |

### 4.2 Screen Reader Announcements

```tsx
// Login button
<button aria-label="Log in with GitHub">
  Continue with GitHub
</button>

// Loading state
<button aria-busy="true" aria-label="Connecting to GitHub">
  <Spinner aria-hidden="true" /> Connecting...
</button>

// Success
<div role="status" aria-live="polite">
  Successfully logged in as @username
</div>

// Error
<div role="alert" aria-live="assertive">
  Login failed: access denied by GitHub
</div>
```

### 4.3 Color Contrast

All text meets WCAG AA contrast requirements:

- Primary text: 4.5:1 minimum
- Secondary text: 4.5:1 minimum
- Interactive elements: 3:1 minimum against background

---

## 5. Mobile Considerations

### 5.1 Responsive Breakpoints

| Breakpoint     | Layout                                  |
| -------------- | --------------------------------------- |
| < 640px        | Full-width login button, stacked layout |
| 640px - 1024px | Centered card (480px), standard layout  |
| > 1024px       | Centered card (480px) with sidebar nav  |

### 5.2 Touch Targets

- Minimum 44x44px touch targets (Apple HIG)
- 8px minimum spacing between targets
- Full-width buttons on mobile for easy thumb reach

### 5.3 OAuth Redirect Handling

Mobile browsers handle OAuth differently:

- **In-app browser:** Redirect back seamlessly
- **External browser:** Use Universal Links (iOS) / App Links (Android) for redirect
- **Fallback:** "Return to ADA" button with manual URL

---

## 6. Implementation Checklist

### Phase 1: MVP Auth (Sprint 3 Week 1)

- [ ] GitHub OAuth integration with NextAuth.js
- [ ] Login page with "Continue with GitHub" button
- [ ] Session indicator in header (avatar + dropdown)
- [ ] Basic error handling (toast notifications)
- [ ] CLI login flow (`ada login`)
- [ ] Credentials storage (`~/.ada/credentials`)
- [ ] Redirect-back after login (preserve URL)
- [ ] Mobile-responsive login page

### Phase 2: Polish (Sprint 3 Week 2)

- [ ] Session expiry warnings (toast + modal)
- [ ] "Extend Session" functionality
- [ ] Detailed error pages (not just toasts)
- [ ] Accessibility audit (keyboard + screen reader)
- [ ] Analytics: login success/failure rates

### Phase 3: Team Features (Post-MVP)

- [ ] Workspace selector in header
- [ ] Team invitation flow
- [ ] Permission management UI
- [ ] SSO integration (enterprise)

---

## 7. Design Tokens

Reference: `docs/design/dashboard-component-design-system-c812.md`

```css
/* Auth-specific tokens */
--auth-button-bg: var(--color-neutral-900);
--auth-button-hover: var(--color-neutral-800);
--auth-button-text: var(--color-white);
--auth-error-bg: var(--color-red-50);
--auth-error-border: var(--color-red-200);
--auth-error-text: var(--color-red-700);
--auth-success-bg: var(--color-green-50);
--auth-success-border: var(--color-green-200);
--auth-success-text: var(--color-green-700);
```

---

## 8. Open Questions

**Resolved:**

- ✅ GitHub OAuth only for MVP (per architecture spec)
- ✅ Session duration: 24 hours (standard for dashboards)

**Pending:**

- Should CLI credentials expire? (Current: no expiry, but revocable)
- Should we show "last login" in user dropdown? (Nice-to-have)

---

## Acceptance Criteria

- [ ] **AC-822-1:** User can log in via "Continue with GitHub" button
- [ ] **AC-822-2:** User avatar appears in header after login
- [ ] **AC-822-3:** User can log out via dropdown menu
- [ ] **AC-822-4:** CLI `ada login` opens browser and completes auth
- [ ] **AC-822-5:** Auth errors show user-friendly messages with recovery actions
- [ ] **AC-822-6:** Login page is responsive (mobile-friendly)
- [ ] **AC-822-7:** All interactive elements are keyboard accessible

---

_Cycle 822 — 400 consecutive cycles (C421-822). Sprint 3 readiness: Auth UX spec complete._
