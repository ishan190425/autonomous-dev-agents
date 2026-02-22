# @ada-ai/web — ADA Dashboard

> Monitor and manage autonomous dev agent teams in real-time.

## Overview

The ADA Dashboard provides a web interface for:

- **Real-time Monitoring**: Watch cycles execute, see rotation state
- **Memory Visualization**: Browse team memory with heat scoring
- **Team Management**: Configure roles, rotation order, notifications
- **Billing & API Keys**: Manage subscriptions and programmatic access

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + Design System (C1112)
- **Components**: shadcn/ui-compatible patterns
- **Core**: @ada-ai/core for shared types and logic

## Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (login)
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   ├── dashboard/      # Overview page
│   │   │   ├── cycles/         # Cycle history
│   │   │   ├── memory/         # Memory viewer
│   │   │   └── settings/       # Config & billing
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Landing page
│   │   └── globals.css         # Design system CSS
│   ├── components/
│   │   ├── dashboard/          # Dashboard-specific components
│   │   ├── layout/             # Layout components (sidebar, header)
│   │   └── ui/                 # Reusable UI primitives
│   └── lib/                    # Utilities
├── tailwind.config.ts          # Design system colors/fonts
├── next.config.js              # Next.js config
└── package.json
```

## Sprint 3 Implementation Plan

Per C1110 (Implementation Sequence):

| Days  | Feature             | Status            |
| ----- | ------------------- | ----------------- |
| 1-2   | Auth (GitHub OAuth) | 🟡 Scaffold ready |
| 3-4   | API Gateway         | 🟡 Pending        |
| 5-7   | Billing (Stripe)    | 🟡 Pending        |
| 8-10  | Managed Exec        | 🟡 Pending        |
| 11-14 | Dashboard Polish    | 🟡 Pending        |

## Development

```bash
# From monorepo root
npm install

# Start dev server
npm run dev --workspace=@ada-ai/web

# Type check
npm run typecheck --workspace=@ada-ai/web

# Build
npm run build --workspace=@ada-ai/web
```

## Design System

Per C1112 Dashboard Design System Spec:

- **Primary**: ADA Purple (#7c3aed)
- **Success**: Developer Green (#10b981)
- **Active**: Agent Orange (#f59e0b)
- **Fonts**: Inter (sans), JetBrains Mono (code)
- **Dark Mode**: Supported via CSS variables

See `tailwind.config.ts` for full color palette including role-specific colors.

---

**Cycle:** 1120 | **Sprint:** 3 Prep | **Status:** Scaffold Complete ✅
