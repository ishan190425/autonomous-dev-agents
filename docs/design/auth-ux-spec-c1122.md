# Auth UX Specification (C1122)

> Authentication user experience design for ADA SaaS Dashboard
> **Created:** 2026-02-22 | **Sprint:** 3 | **Related:** #181, #155, C1112 Design System

---

## Overview

This spec defines the authentication UX for the ADA Dashboard, covering GitHub OAuth flow, login states, session management, and error handling. Extends the C1112 Design System with auth-specific patterns.

---

## 1. Authentication Flow

### 1.1 Entry Points

```
┌─────────────────────────────────────────────────────────────┐
│  User Entry Points                                          │
├─────────────────────────────────────────────────────────────┤
│  1. Direct URL         → /login                             │
│  2. Protected Route    → redirect to /login?next=<path>     │
│  3. Marketing CTA      → /login?ref=<campaign>              │
│  4. CLI Integration    → /auth/cli?token=<device_code>      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 GitHub OAuth Flow

```
User                    ADA Dashboard              GitHub
 │                           │                       │
 │──── Click "Sign in" ─────>│                       │
 │                           │                       │
 │<── Redirect to GitHub ────│                       │
 │                           │                       │
 │────────────────────── Authorize ────────────────>│
 │                           │                       │
 │<──────────────────── Callback ───────────────────│
 │                           │                       │
 │                           │<── Exchange code ────>│
 │                           │                       │
 │<── Redirect to Dashboard ─│                       │
 │                           │                       │
```

**Required GitHub Scopes:**

- `read:user` — Basic profile info
- `user:email` — Email address (for notifications)
- `repo` — Repository access (for agent dispatch)
- `read:org` — Organization membership (for team features)

---

## 2. Login Page Design

### 2.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ┌───────────────────┐                    │
│                    │                   │                    │
│                    │    ADA Logo       │                    │
│                    │                   │                    │
│                    └───────────────────┘                    │
│                                                             │
│                   Autonomous Dev Agents                     │
│                                                             │
│              ┌─────────────────────────────┐                │
│              │   🔗  Sign in with GitHub   │                │
│              └─────────────────────────────┘                │
│                                                             │
│              By signing in, you agree to our                │
│              Terms of Service and Privacy Policy            │
│                                                             │
│     ─────────────────── or ───────────────────              │
│                                                             │
│     💡 New to ADA? Start with the CLI                      │
│        npm install -g @ada-ai/cli                           │
│        ada init                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Visual Design (C1112 Design System)

**Colors:**

- Background: `bg-gray-950` (dark mode default)
- Card: `bg-gray-900` with `border-gray-800`
- Primary CTA: `bg-primary-500` (#6366f1 Indigo)
- GitHub button: `bg-gray-800` with GitHub logo

**Typography:**

- Logo: 48px, `font-bold`
- Tagline: 18px, `text-gray-400`
- Button: 16px, `font-medium`
- Legal text: 12px, `text-gray-500`

**Spacing:**

- Vertical stack: 24px gaps
- Card padding: 48px
- Button padding: 16px vertical, 24px horizontal

### 2.3 States

| State   | Visual Treatment                                 |
| ------- | ------------------------------------------------ |
| Default | Primary CTA with hover effect                    |
| Hover   | `bg-primary-600`, subtle scale (1.02)            |
| Loading | Spinner replaces icon, "Connecting to GitHub..." |
| Error   | Red banner above card, specific message          |
| Success | Redirect with brief "Welcome back" flash         |

---

## 3. Authentication States

### 3.1 Loading State

```tsx
// During OAuth redirect
<div className="flex items-center justify-center h-screen">
  <div className="text-center space-y-4">
    <Spinner size="lg" />
    <p className="text-gray-400">Connecting to GitHub...</p>
  </div>
</div>
```

### 3.2 Session States

```
┌─────────────────────────────────────────────────────────────┐
│  Session State Machine                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐     login      ┌──────────┐                   │
│  │  GUEST   │ ──────────────>│ LOADING  │                   │
│  └──────────┘                └──────────┘                   │
│       ▲                           │                         │
│       │                     success│error                   │
│       │                           ▼                         │
│       │   logout            ┌──────────┐                    │
│       └─────────────────────│  AUTHED  │                    │
│                             └──────────┘                    │
│                                  │                          │
│                           session_expired                   │
│                                  ▼                          │
│                             ┌──────────┐                    │
│                             │ EXPIRED  │                    │
│                             └──────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Session Indicator (Header Component)

```tsx
// Authenticated state in header (from C1112 Header component)
<div className="flex items-center gap-3">
  <Avatar
    src={user.avatar_url}
    alt={user.name}
    size="sm" // 32px
    fallback={user.name[0]}
  />
  <div className="hidden md:block">
    <p className="text-sm font-medium text-white">{user.name}</p>
    <p className="text-xs text-gray-400">{user.email}</p>
  </div>
  <DropdownMenu>
    <DropdownMenuItem href="/settings">Settings</DropdownMenuItem>
    <DropdownMenuItem onClick={logout} variant="danger">
      Sign out
    </DropdownMenuItem>
  </DropdownMenu>
</div>
```

---

## 4. Error Handling

### 4.1 Error Types

| Error Code          | User Message                         | Recovery Action                |
| ------------------- | ------------------------------------ | ------------------------------ |
| `oauth_denied`      | "GitHub authorization was cancelled" | "Try again" button             |
| `oauth_error`       | "GitHub authentication failed"       | "Try again" + support link     |
| `scope_missing`     | "Additional permissions required"    | Re-authorize with scopes       |
| `account_suspended` | "Your account has been suspended"    | Contact support link           |
| `session_expired`   | "Your session has expired"           | Auto-redirect to login         |
| `network_error`     | "Connection failed"                  | Retry with exponential backoff |

### 4.2 Error Display Pattern

```tsx
// Error banner above login card
<Alert variant="error" className="mb-6">
  <AlertIcon />
  <AlertContent>
    <AlertTitle>Authentication failed</AlertTitle>
    <AlertDescription>
      {errorMessage}
      <Link href="/support" className="underline ml-1">
        Need help?
      </Link>
    </AlertDescription>
  </AlertContent>
</Alert>
```

### 4.3 Error Recovery

```
User Action              System Response
───────────────────────────────────────────────
Click "Try again"    →   Clear error, reset to default state
Refresh page         →   Preserve error, show in URL params
Navigate away        →   Clear error state
Session expires      →   Soft redirect with "session_expired" param
```

---

## 5. Protected Routes

### 5.1 Route Protection Pattern

```tsx
// Middleware pattern for protected routes
const PROTECTED_ROUTES = [
  '/dashboard',
  '/cycles',
  '/memory',
  '/settings',
  '/teams',
];

const PUBLIC_ROUTES = ['/login', '/auth/callback', '/pricing', '/'];

// On protected route access without auth:
// 1. Store intended destination
// 2. Redirect to /login?next=<encoded_path>
// 3. After auth, redirect back to stored path
```

### 5.2 Redirect UX

```
┌─────────────────────────────────────────────────────────────┐
│  Redirect Flow                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User visits /dashboard (no session)                        │
│       │                                                     │
│       ▼                                                     │
│  Show brief "Redirecting to login..." (300ms max)           │
│       │                                                     │
│       ▼                                                     │
│  Redirect to /login?next=/dashboard                         │
│       │                                                     │
│       ▼                                                     │
│  User completes OAuth                                       │
│       │                                                     │
│       ▼                                                     │
│  Redirect to /dashboard (original intent)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. CLI Authentication Integration

### 6.1 Device Authorization Flow

For `ada auth login` command — enables CLI authentication through browser:

```
CLI                        Browser                    Server
 │                           │                           │
 │── POST /auth/device ─────────────────────────────────>│
 │<─ device_code + user_code + verification_url ─────────│
 │                           │                           │
 │── Display to user: ───────│                           │
 │   "Visit ada.dev/auth"    │                           │
 │   "Enter code: ABCD-1234" │                           │
 │                           │                           │
 │                           │<── User enters code ──────│
 │                           │                           │
 │── Poll /auth/token ──────────────────────────────────>│
 │   (every 5s)              │                           │
 │                           │                           │
 │<─ access_token ───────────────────────────────────────│
 │                           │                           │
```

### 6.2 CLI Auth Page Design

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                   Link your CLI                             │
│                                                             │
│     Enter the code shown in your terminal:                  │
│                                                             │
│              ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐             │
│              │  A  │  │  B  │  │  C  │  │  D  │             │
│              └─────┘  └─────┘  └─────┘  └─────┘             │
│                       ─                                     │
│              ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐             │
│              │  1  │  │  2  │  │  3  │  │  4  │             │
│              └─────┘  └─────┘  └─────┘  └─────┘             │
│                                                             │
│              ┌─────────────────────────────┐                │
│              │     Confirm & Authorize     │                │
│              └─────────────────────────────┘                │
│                                                             │
│     Code expires in 10:00                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Session Management

### 7.1 Token Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  Token Architecture                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Access Token         Refresh Token        Session Cookie   │
│  ─────────────        ─────────────        ──────────────   │
│  Storage: Memory      Storage: httpOnly    Storage: Cookie  │
│  TTL: 15 minutes      TTL: 7 days          TTL: 7 days      │
│  Use: API calls       Use: Token refresh   Use: SSR auth    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Refresh Flow (Invisible to User)

```
API Call             Token State              Action
─────────────────────────────────────────────────────────
Request              Valid access token   →   Use token
Request              Expired + valid ref  →   Auto-refresh, retry
Request              Expired + invalid    →   Logout, redirect
Page Load            Valid session        →   Hydrate user
Page Load            Expired session      →   Redirect to login
```

### 7.3 Logout Flow

```tsx
async function logout() {
  // 1. Clear client state
  clearUserState();

  // 2. Revoke server session
  await fetch('/api/auth/logout', { method: 'POST' });

  // 3. Optionally revoke GitHub token (user choice)
  if (revokeGitHubAccess) {
    await fetch('/api/auth/revoke-github', { method: 'POST' });
  }

  // 4. Redirect to login
  router.push('/login?logged_out=true');
}
```

---

## 8. Accessibility Requirements

Per C1112 WCAG AA compliance:

| Element        | Requirement   | Implementation                          |
| -------------- | ------------- | --------------------------------------- |
| Login button   | Focus visible | `ring-2 ring-offset-2 ring-primary-500` |
| Error messages | Screen reader | `role="alert"` + `aria-live="polite"`   |
| Loading states | Announced     | `aria-busy="true"` + SR-only text       |
| Form inputs    | Labels        | Explicit `<label>` association          |
| Color contrast | 4.5:1 minimum | Verified in design system               |

---

## 9. Analytics Events

```typescript
// Track for conversion analysis
const AUTH_EVENTS = {
  'auth.login_page_viewed': { ref?: string },
  'auth.github_button_clicked': {},
  'auth.oauth_started': {},
  'auth.oauth_completed': { duration_ms: number },
  'auth.oauth_failed': { error_code: string },
  'auth.logout': { session_duration_ms: number },
  'auth.session_expired': { page: string },
};
```

---

## 10. Implementation Checklist

### Sprint 3 Day 1-2: Auth Foundation

- [ ] Login page component (`/app/(auth)/login/page.tsx`)
- [ ] OAuth callback handler (`/app/api/auth/callback/route.ts`)
- [ ] Session middleware (`/middleware.ts`)
- [ ] User context provider (`/lib/auth/context.tsx`)
- [ ] Protected route wrapper (`/components/auth/ProtectedRoute.tsx`)

### Sprint 3 Day 3-4: Session Management

- [ ] Token refresh logic
- [ ] Logout flow
- [ ] Session indicator in header
- [ ] Error handling for all states

### Sprint 3 Day 5-6: CLI Integration

- [ ] Device authorization endpoint
- [ ] CLI auth page (`/app/auth/cli/page.tsx`)
- [ ] Token polling endpoint

### Testing Requirements

- [ ] OAuth happy path (manual + E2E)
- [ ] Error state rendering
- [ ] Protected route redirects
- [ ] Session expiry handling
- [ ] CLI device flow

---

## Related Documents

- **C1112** — Dashboard Design System Spec
- **#181** — GitHub OAuth Integration issue
- **#183** — Interactive Onboarding Wizard (uses auth)
- **#189** — Managed Agent Execution (requires auth)

---

_Author: 🎨 The Architect (C1122)_
