# Developer Portal UX Specification (C1252)

> UX design for ADA SaaS Developer Portal — API keys, webhooks, usage, and documentation
> **Created:** 2026-02-27 | **Sprint:** 3 | **Related:** #190 (API Gateway), C1246 (OpenAPI Spec), #155 (SaaS Container)

---

## Overview

This spec defines the UX for the ADA Developer Portal, the dashboard section where users manage API access, webhooks, and view documentation. Complements the C1246 OpenAPI specification with the visual/interaction layer.

**Key Principle:** Developer experience over feature bloat. Every screen should answer: "How do I do X with the API?"

---

## 1. Information Architecture

```
/dashboard
└── /settings
    └── /developer (Developer Portal)
        ├── /api-keys        → API Key Management
        ├── /webhooks        → Webhook Configuration
        ├── /usage           → Usage & Rate Limits
        └── /docs            → API Documentation (OpenAPI/Swagger)
```

### Navigation

```
┌────────────────────────────────────────────────────────────────────┐
│  Dashboard  │  Repos  │  Dispatch  │  Cycles  │  Settings ▾       │
└────────────────────────────────────────────────────────────────────┘
                                                    │
                                        ┌───────────┴───────────┐
                                        │  Account              │
                                        │  Billing              │
                                        │  Team                 │
                                        │  ─────────────────    │
                                        │  Developer Portal  ←  │
                                        └───────────────────────┘
```

---

## 2. API Key Management (`/settings/developer/api-keys`)

### 2.1 Key List View

```
┌─────────────────────────────────────────────────────────────────────────┐
│  API Keys                                                    [+ New Key]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔑 Production Key                              Active   [···]  │   │
│  │  ada_sk_prod_••••••••••••a1b2                                   │   │
│  │  Created Feb 15, 2026  ·  Last used 2 hours ago                 │   │
│  │  Scopes: repos:read, dispatch:write, cycles:read                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔑 CI/CD Integration                           Active   [···]  │   │
│  │  ada_sk_ci_••••••••••••c3d4                                     │   │
│  │  Created Feb 20, 2026  ·  Last used 5 minutes ago               │   │
│  │  Scopes: dispatch:write                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔑 Development                                 Revoked  [···]  │   │
│  │  ada_sk_dev_••••••••••••e5f6                                    │   │
│  │  Created Jan 10, 2026  ·  Revoked Feb 25, 2026                  │   │
│  │  ⚠️ This key has been revoked and cannot be used               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Card Actions Menu `[···]`:**

- Copy Key ID
- View Activity Log
- Edit Scopes
- Regenerate (with confirmation)
- Revoke (with confirmation)

### 2.2 Create New Key Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Create API Key                                                    [×]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Name                                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Production Key                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  A friendly name to identify this key                                   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Scopes                                                                 │
│                                                                         │
│  ☑️  repos:read      Read repository list and configuration            │
│  ☑️  repos:write     Create/update repository settings                 │
│  ☑️  dispatch:read   View dispatch status and queue                    │
│  ☑️  dispatch:write  Trigger and manage dispatch cycles                │
│  ☑️  cycles:read     View cycle history and logs                       │
│  ☐  billing:read    View subscription and usage                        │
│  ☐  webhooks:write  Manage webhook endpoints                           │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Expiration                                                             │
│  ○ Never expires                                                        │
│  ● Expires after  [90 ▾] days                                          │
│                                                                         │
│                                          [Cancel]  [Create Key]         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Key Created Success State

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ✅ API Key Created                                                [×]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ⚠️ Copy your API key now. You won't be able to see it again!         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ada_sk_prod_aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5         [📋]│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Store this key securely. Use environment variables, not code.          │
│                                                                         │
│  Example usage:                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ curl -H "X-API-Key: $ADA_API_KEY" \                              │   │
│  │   https://api.ada.dev/v1/repos                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                                         [Done]          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Webhook Configuration (`/settings/developer/webhooks`)

### 3.1 Webhook List View

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Webhooks                                                [+ Add Webhook]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Receive real-time notifications when events occur in your repos.       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔗 Slack Notifications                    ● Healthy    [···]   │   │
│  │  https://hooks.slack.com/services/T00/B00/xxx                   │   │
│  │  Events: cycle.completed, cycle.failed                           │   │
│  │  Last delivery: 2 hours ago (200 OK)                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔗 CI Pipeline Trigger                    ○ Failing    [···]   │   │
│  │  https://ci.example.com/webhooks/ada                             │   │
│  │  Events: dispatch.queued, dispatch.started                       │   │
│  │  Last delivery: 10 min ago (503 Service Unavailable)             │   │
│  │  ⚠️ 3 consecutive failures — will be disabled after 2 more      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔗 Datadog Metrics                        ◐ Disabled   [···]   │   │
│  │  https://http-intake.logs.datadoghq.com/api/v2/logs              │   │
│  │  Events: cycle.completed                                         │   │
│  │  Disabled Feb 20 — Too many failures                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Health Indicators:**

- `● Healthy` (green) — Recent deliveries successful
- `○ Failing` (red) — Recent failures, at risk of disable
- `◐ Disabled` (gray) — Manually or auto-disabled

### 3.2 Add/Edit Webhook Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Add Webhook                                                       [×]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Payload URL                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ https://                                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  We'll send a POST request with JSON payload to this URL                │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Content Type                                                           │
│  ● application/json                                                     │
│  ○ application/x-www-form-urlencoded                                    │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Secret (optional)                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ whsec_                                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  Used to sign payloads (X-ADA-Signature header)                         │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Events                                                                 │
│  ☐ Send me everything (all events)                                     │
│  ● Let me select individual events                                      │
│                                                                         │
│    Dispatch                           Cycles                            │
│    ☑️ dispatch.queued                ☑️ cycle.started                  │
│    ☑️ dispatch.started               ☑️ cycle.completed                │
│    ☐ dispatch.cancelled              ☑️ cycle.failed                   │
│                                                                         │
│    Repository                                                           │
│    ☐ repo.connected                                                    │
│    ☐ repo.disconnected                                                 │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ☑️ Active (uncheck to pause deliveries)                               │
│                                                                         │
│                                   [Cancel]  [Create Webhook]            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Webhook Delivery Log (Expandable)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Recent Deliveries — Slack Notifications                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ✅ cycle.completed  ·  Feb 27, 19:15:32  ·  200 OK  ·  142ms           │
│  ├─ Request:  {"event": "cycle.completed", "data": {...}}               │
│  └─ Response: {"ok": true}                                              │
│                                                                         │
│  ✅ cycle.started    ·  Feb 27, 19:00:01  ·  200 OK  ·  98ms            │
│                                                                         │
│  ✅ dispatch.queued  ·  Feb 27, 18:59:58  ·  200 OK  ·  105ms           │
│                                                                         │
│  ❌ cycle.failed     ·  Feb 27, 14:30:00  ·  503     ·  timeout         │
│  ├─ Request:  {"event": "cycle.failed", "data": {...}}                  │
│  └─ Response: Service Unavailable                                       │
│  └─ [🔄 Redeliver]                                                      │
│                                                                         │
│                                                   [Load More]           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Usage Dashboard (`/settings/developer/usage`)

### 4.1 Usage Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  API Usage                                      Current Period: Feb 2026│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Plan: Pro  ·  Rate Limit: 1,000 requests/hour                          │
│  [Upgrade to Team for 10,000/hour]                                      │
│                                                                         │
│  ┌────────────────────────────┐  ┌────────────────────────────────┐    │
│  │  Requests This Hour        │  │  Requests This Month           │    │
│  │                            │  │                                │    │
│  │       247 / 1,000          │  │       12,847 / 50,000          │    │
│  │       ████████░░░░░ 25%    │  │       ████████░░░░░░ 26%       │    │
│  │                            │  │                                │    │
│  └────────────────────────────┘  └────────────────────────────────┘    │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Request Volume (Last 7 Days)                                           │
│                                                                         │
│  2k ┤                                    ╭─╮                            │
│     │                                ╭───╯ │                            │
│  1k ┤    ╭───╮              ╭───╮   │     ╰──╮                          │
│     │╭───╯   ╰───╮     ╭────╯   ╰───╯        ╰──╮                       │
│   0 ┼────────────╰─────╯                         ╰──                    │
│      Feb 21  22   23   24   25   26   27                                │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Top Endpoints (This Month)                                             │
│                                                                         │
│  GET  /repos               4,521 requests    35%   ████████░░          │
│  POST /dispatch/trigger    3,892 requests    30%   ███████░░░          │
│  GET  /cycles              2,156 requests    17%   ████░░░░░░          │
│  GET  /dispatch/status     1,445 requests    11%   ███░░░░░░░          │
│  Other                       833 requests     7%   ██░░░░░░░░          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Rate Limit Alert Banner

When approaching limits:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚠️ You've used 85% of your hourly rate limit (850/1,000 requests)     │
│     Consider upgrading to Team for 10x higher limits.        [Upgrade]  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. API Documentation (`/settings/developer/docs`)

### 5.1 Embedded Swagger UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│  API Documentation                                    [Download OpenAPI]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🔑 Authorize  [Your API Key: ada_sk_prod_••••a1b2]       [Re-authorize]│
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════    │
│                                                                         │
│  ▼ Authentication                                                       │
│    POST /auth/github              Initiate GitHub OAuth flow            │
│    GET  /auth/github/callback     Handle OAuth callback                 │
│    POST /auth/logout              End session                           │
│    GET  /auth/me                  Get current user                      │
│                                                                         │
│  ▼ Repositories                                                         │
│    GET  /repos                    List connected repositories           │
│    POST /repos                    Connect a repository                  │
│    GET  /repos/{owner}/{repo}     Get repository details                │
│    ...                                                                  │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ▸ GET /repos                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  List all repositories connected to your account.                │   │
│  │                                                                  │   │
│  │  Parameters:                                                     │   │
│  │  ┌───────────┬──────────┬─────────────────────────────────────┐ │   │
│  │  │ limit     │ integer  │ Max results (default: 20, max: 100)│ │   │
│  │  │ offset    │ integer  │ Pagination offset (default: 0)     │ │   │
│  │  │ status    │ string   │ Filter: active, paused, archived   │ │   │
│  │  └───────────┴──────────┴─────────────────────────────────────┘ │   │
│  │                                                                  │   │
│  │  [Try it out]                                                    │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 "Try it out" Response Panel

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Response                                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Status: 200 OK  ·  Time: 142ms                                         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ {                                                                │   │
│  │   "data": [                                                      │   │
│  │     {                                                            │   │
│  │       "id": "repo_abc123",                                       │   │
│  │       "owner": "acme-corp",                                      │   │
│  │       "name": "awesome-project",                                 │   │
│  │       "status": "active",                                        │   │
│  │       "lastCycle": "2026-02-27T18:30:00Z"                       │   │
│  │     }                                                            │   │
│  │   ],                                                             │   │
│  │   "meta": {                                                      │   │
│  │     "total": 3,                                                  │   │
│  │     "limit": 20,                                                 │   │
│  │     "offset": 0                                                  │   │
│  │   }                                                              │   │
│  │ }                                                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [Copy Response]  [Copy as cURL]                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Visual Design System

### 6.1 Colors (Dark Mode — C1112 Design System)

| Element         | Color       | Hex       |
| --------------- | ----------- | --------- |
| Background      | Gray 950    | `#030712` |
| Card Background | Gray 900    | `#111827` |
| Card Border     | Gray 800    | `#1f2937` |
| Primary CTA     | Indigo 500  | `#6366f1` |
| Success         | Emerald 500 | `#10b981` |
| Warning         | Amber 500   | `#f59e0b` |
| Error           | Rose 500    | `#f43f5e` |
| Text Primary    | Gray 100    | `#f3f4f6` |
| Text Secondary  | Gray 400    | `#9ca3af` |

### 6.2 Components

**Cards:** Rounded-lg, subtle border, hover:border-gray-700 transition
**Buttons:**

- Primary: bg-indigo-500 hover:bg-indigo-600, text-white
- Secondary: bg-gray-800 hover:bg-gray-700, text-gray-200
- Danger: bg-rose-500/10 text-rose-400 hover:bg-rose-500/20

**Inputs:** bg-gray-900 border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500

**Badges:**

- Active: bg-emerald-500/10 text-emerald-400
- Failing: bg-rose-500/10 text-rose-400
- Disabled: bg-gray-500/10 text-gray-400

---

## 7. Accessibility

### 7.1 Keyboard Navigation

| Action                | Shortcut      |
| --------------------- | ------------- |
| Navigate tabs         | Arrow keys    |
| Open key actions menu | Enter / Space |
| Copy to clipboard     | Ctrl+C / ⌘C   |
| Close modal           | Escape        |
| Submit form           | Ctrl+Enter    |

### 7.2 ARIA Landmarks

- `role="main"` for primary content area
- `role="navigation"` for settings sidebar
- `role="dialog"` for modals with `aria-modal="true"`
- `aria-live="polite"` for success/error toasts
- `aria-describedby` linking form fields to help text

### 7.3 Screen Reader Considerations

- API key shown state announces "Key visible, will be hidden in 30 seconds"
- Copy button announces "Copied to clipboard" on success
- Webhook health status uses descriptive text not just color
- Rate limit alerts have `role="alert"` for immediate announcement

---

## 8. Error States

### 8.1 API Key Errors

**Revoke Confirmation:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚠️ Revoke API Key?                                                [×]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  This will immediately disable "Production Key" and any systems         │
│  using it will lose access.                                             │
│                                                                         │
│  Type the key name to confirm: Production Key                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                     [Cancel]  [Revoke Key] (disabled)   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Webhook Errors

**Consecutive Failures Warning:**

```
⚠️ This webhook has failed 3 consecutive times.
   It will be automatically disabled after 2 more failures.

   Recent errors:
   · Feb 27, 14:30 — 503 Service Unavailable (timeout after 30s)
   · Feb 27, 14:15 — 503 Service Unavailable
   · Feb 27, 14:00 — Connection refused

   [Test Webhook]  [View Delivery Log]  [Disable Webhook]
```

### 8.3 Rate Limit Hit

**429 Response + UI Banner:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🚫 Rate limit exceeded                                                 │
│     You've hit your hourly limit of 1,000 requests.                     │
│     Resets in 23 minutes.                                               │
│                                                                         │
│     [Upgrade to Team]  for 10x higher limits                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Mobile Responsive

### 9.1 Breakpoints

| Breakpoint | Width      | Layout Changes                       |
| ---------- | ---------- | ------------------------------------ |
| sm         | < 640px    | Stack cards, hide secondary columns  |
| md         | 640-1024px | Side-by-side cards, condensed tables |
| lg         | > 1024px   | Full layout with sidebar             |

### 9.2 Mobile API Key List

```
┌────────────────────────────────────────┐
│  API Keys                      [+ New] │
├────────────────────────────────────────┤
│                                        │
│  🔑 Production Key             [···]   │
│  ada_sk_prod_••••••a1b2                │
│  ● Active · Last used 2h ago           │
│                                        │
│  ────────────────────────────────────  │
│                                        │
│  🔑 CI/CD Integration          [···]   │
│  ada_sk_ci_••••••c3d4                  │
│  ● Active · Last used 5m ago           │
│                                        │
└────────────────────────────────────────┘
```

---

## 10. Implementation Notes

### 10.1 State Management

- API keys list: SWR with revalidation on focus
- Webhook status: Polling every 30s when tab visible
- Usage metrics: Cache for 5 minutes, refresh on demand

### 10.2 Security

- API keys shown once only (on creation)
- Partial key display (last 4 chars) after creation
- Revoke requires typed confirmation
- Webhook secrets hashed, never displayed after creation

### 10.3 Related Specs

- **C1246** — OpenAPI 3.1 Specification (endpoints contract)
- **C1112** — Design System (colors, typography, components)
- **C1122** — Auth UX Spec (login/session flows)
- **C832** — Billing UX Spec (subscription management)

---

## Appendix A: Event Payloads (Reference)

From C1246 OpenAPI spec, webhook event payloads:

```json
// dispatch.queued
{
  "event": "dispatch.queued",
  "timestamp": "2026-02-27T19:00:00Z",
  "data": {
    "dispatchId": "dsp_abc123",
    "repoId": "repo_xyz",
    "triggeredBy": "schedule",
    "position": 3
  }
}

// cycle.completed
{
  "event": "cycle.completed",
  "timestamp": "2026-02-27T19:15:32Z",
  "data": {
    "cycleId": "cyc_def456",
    "dispatchId": "dsp_abc123",
    "role": "engineering",
    "action": "feat(core): add memory compression",
    "durationMs": 45200,
    "tokensUsed": 12500
  }
}
```

---

_Author: 🎨 The Architect (C1252) | Sprint 3 Prep | Complements C1246 OpenAPI Spec_
