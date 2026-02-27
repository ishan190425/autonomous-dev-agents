# Sprint 3 Implementation Playbook (C1207)

> **Day-by-Day Technical Runbook** — Synthesizes all Sprint 3 specs into actionable daily tasks.
> Created: 2026-02-27 | Author: 📦 Product (The PM)
> Per L669: "Sprint kickoff needs day-by-day technical runbook synthesizing all specs."

---

## Executive Summary

Sprint 3 (Mar 1-14) delivers the **SaaS Container** — the core infrastructure for ADA's first revenue.

**Goal:** Users can sign up via GitHub OAuth, run dispatch cycles, and upgrade to Pro tier.

**Deadline:** MVP Dashboard live Mar 15.

This playbook translates 7 foundational specs into 14 daily implementation tasks.

---

## Source Specs

All specs are complete and ready for implementation:

| Spec                       | Cycle | Focus                  | Primary Role |
| -------------------------- | ----- | ---------------------- | ------------ |
| Container-per-Dispatch ADR | C1066 | Isolated execution     | Frontier     |
| Usage Metering ADR         | C1186 | Billing, rate limiting | Frontier     |
| Auth-Billing Integration   | C1195 | System connections     | Research     |
| Execution Queue ADR        | C1196 | Bull/Redis, job system | Frontier     |
| Dashboard MVP Spec         | C1197 | Frontend pages, flows  | Product      |
| CI Environment Setup       | C1201 | Env vars, E2E config   | Ops          |
| Auth Error Pages UX        | C1202 | Error handling         | Design       |

---

## Week 1: Foundation (Mar 1-7)

**Theme:** Auth + Billing + API Gateway scaffolding

### Day 1 (Mar 1) — Saturday

**Focus:** Infrastructure bootstrap

| Task                   | Owner       | Deliverable                | Acceptance                               |
| ---------------------- | ----------- | -------------------------- | ---------------------------------------- |
| Stripe test mode setup | Ops         | Test API keys in `.env`    | Can create test customers via Stripe CLI |
| Redis setup            | Ops         | Local Redis + Upstash test | `bull-board` shows empty queue           |
| GitHub OAuth test app  | QA          | Test OAuth app for CI      | Can complete OAuth flow locally          |
| Auth scaffolding       | Engineering | NextAuth config per C1195  | `/api/auth/signin` renders               |

**Blockers to clear:**

- [ ] Vercel deployment (#200) — if not deployed by EOD, escalate per L633

**Environment Checklist:**

```bash
# All roles must verify these work locally
AUTH_SECRET=<32+ chars>
NEXTAUTH_SECRET=<32+ chars>
NEXTAUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=<test app>
GITHUB_CLIENT_SECRET=<test app>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=<supabase or local>
REDIS_URL=redis://localhost:6379
```

---

### Day 2 (Mar 2) — Sunday

**Focus:** Auth flow complete

| Task                     | Owner       | Deliverable           | Acceptance                    |
| ------------------------ | ----------- | --------------------- | ----------------------------- |
| GitHub OAuth integration | Engineering | Full auth flow        | Login → Dashboard works       |
| Session enrichment       | Engineering | Tier/usage in session | `session.user.tier` available |
| Auth callback handling   | Engineering | All error cases       | Error pages per C1202         |
| E2E auth tests           | QA          | `auth.setup.ts`       | CI passes with mocked auth    |

**Code Locations:**

```
apps/web/src/auth.ts              # NextAuth config
apps/web/src/lib/auth/session.ts  # Session enrichment
apps/web/src/app/auth/error/      # Error pages
apps/web/tests/e2e/auth/          # E2E tests
```

---

### Day 3 (Mar 3) — Monday

**Focus:** Billing foundation

| Task                       | Owner       | Deliverable                  | Acceptance                    |
| -------------------------- | ----------- | ---------------------------- | ----------------------------- |
| Tier definitions           | Engineering | `lib/billing/tiers.ts`       | Types for Free/Pro/Enterprise |
| Stripe products            | Ops         | Products in Stripe dashboard | Pro/Enterprise products exist |
| Billing portal integration | Engineering | `/dashboard/billing` route   | Links to Stripe portal        |
| Usage tracking schema      | Engineering | Prisma schema + migration    | `Usage` table exists          |

**Reference Implementation:**

```typescript
// From billing foundation PR #254
import { TierConfig, UsageLimit } from '@/lib/billing/types';

export const TIERS: Record<string, TierConfig> = {
  free: { cyclesPerMonth: 10, features: ['cli'] },
  pro: { cyclesPerMonth: 1000, features: ['cli', 'dashboard', 'api'] },
  enterprise: { cyclesPerMonth: Infinity, features: ['*'] },
};
```

---

### Day 4 (Mar 4) — Tuesday

**Focus:** Billing UI + warnings

| Task                 | Owner       | Deliverable               | Acceptance                      |
| -------------------- | ----------- | ------------------------- | ------------------------------- |
| Billing page UI      | Engineering | Full `/dashboard/billing` | Shows current plan, usage       |
| Progressive warnings | Engineering | Warning banners per L695  | 80%/100% warnings display       |
| Upgrade CTAs         | Engineering | Stripe Checkout links     | Free user can upgrade to Pro    |
| Billing E2E tests    | QA          | Billing flow tests        | Upgrade flow works in test mode |

**Warning Thresholds (L695):**

- 80% usage: Soft warning banner (yellow)
- 100% usage: Hard block + upgrade CTA (red)
- Pro users near limit: Suggest Enterprise

---

### Day 5 (Mar 5) — Wednesday

**Focus:** API Gateway scaffolding

| Task                     | Owner       | Deliverable                  | Acceptance              |
| ------------------------ | ----------- | ---------------------------- | ----------------------- |
| API route structure      | Engineering | `/api/dispatch`, `/api/user` | Routes return 501       |
| Rate limiting middleware | Engineering | Per C1186 limits             | Free tier throttled     |
| API key auth             | Engineering | `Authorization: Bearer`      | Key-based auth works    |
| OpenAPI spec draft       | Design      | `openapi.yaml`               | Documents all endpoints |

**API Routes (per C1196):**

```
POST /api/dispatch          # Start new dispatch
GET  /api/dispatch/:id      # Get dispatch details
GET  /api/dispatch/:id/logs # Stream logs (SSE)
GET  /api/user/usage        # Current cycle usage
POST /api/billing/portal    # Get Stripe portal URL
```

---

### Day 6 (Mar 6) — Thursday

**Focus:** Execution queue core

| Task                | Owner       | Deliverable            | Acceptance              |
| ------------------- | ----------- | ---------------------- | ----------------------- |
| Bull queue setup    | Engineering | `DispatchQueue` class  | Jobs can be enqueued    |
| Worker scaffold     | Engineering | `DispatchWorker` class | Worker processes jobs   |
| Job status tracking | Engineering | Status in Redis + DB   | Can query job status    |
| Bull board          | Ops         | `/admin/queues`        | Queue dashboard visible |

**Key Types (per C1196):**

```typescript
interface DispatchJob {
  dispatchId: string;
  userId: string;
  repoUrl: string;
  role?: string;
  priority: 'low' | 'normal' | 'high';
  timeoutMs?: number;
}

type DispatchStatus = 'queued' | 'active' | 'completed' | 'failed' | 'stalled';
```

---

### Day 7 (Mar 7) — Friday (arXiv Draft Due)

**Focus:** Week 1 integration + arXiv

| Task                       | Owner       | Deliverable           | Acceptance             |
| -------------------------- | ----------- | --------------------- | ---------------------- |
| Auth + Billing integration | Engineering | End-to-end flow       | Signup → Billing works |
| Week 1 E2E suite           | QA          | Full auth/billing E2E | All tests green        |
| Error handling audit       | Design      | All error pages live  | C1202 spec implemented |
| arXiv first draft          | Research    | Draft submitted/ready | Mar 7 deadline met     |

**Week 1 Exit Criteria:**

- [ ] User can sign up via GitHub OAuth
- [ ] User can view billing page with current tier
- [ ] Free user sees upgrade CTAs
- [ ] Error pages display correctly
- [ ] CI E2E tests passing
- [ ] arXiv first draft complete

---

## Week 2: Execution (Mar 8-14)

**Theme:** Dispatch execution + Dashboard completion

### Day 8 (Mar 8) — Saturday

**Focus:** Container orchestration

| Task                    | Owner       | Deliverable            | Acceptance                  |
| ----------------------- | ----------- | ---------------------- | --------------------------- |
| Container spawning      | Engineering | Docker integration     | Container starts on job     |
| Log capture             | Engineering | Stdout → Redis pub/sub | Logs stream to subscriber   |
| Cleanup handling        | Ops         | Container teardown     | Containers cleaned up       |
| Container health checks | QA          | Health monitoring      | Stalled containers detected |

**Container Spec (per C1066):**

- Image: `ada-dispatch:latest`
- Memory: 512MB limit
- CPU: 0.5 cores
- Timeout: 5 min default
- Auto-cleanup: On completion or failure

---

### Day 9 (Mar 9) — Sunday

**Focus:** Real-time log streaming

| Task                | Owner       | Deliverable              | Acceptance                  |
| ------------------- | ----------- | ------------------------ | --------------------------- |
| SSE endpoint        | Engineering | `/api/dispatch/:id/logs` | Logs stream via SSE         |
| Log retention       | Ops         | S3/storage config        | Logs persist after stream   |
| Frontend log viewer | Engineering | Live log component       | Logs appear in real-time    |
| Log pagination      | Engineering | Historical logs          | Can scroll through old logs |

**SSE Implementation:**

```typescript
// SSE endpoint
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const stream = new ReadableStream({
    start(controller) {
      const subscription = redis.subscribe(`logs:${params.id}`, message => {
        controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
      });

      req.signal.addEventListener('abort', () => {
        subscription.unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

---

### Day 10 (Mar 10) — Monday

**Focus:** Executions page

| Task                  | Owner       | Deliverable                  | Acceptance             |
| --------------------- | ----------- | ---------------------------- | ---------------------- |
| Executions list page  | Engineering | `/dashboard/executions`      | Shows dispatch history |
| Filtering/sorting     | Engineering | Status/role/date filters     | Filters work correctly |
| Execution detail page | Engineering | `/dashboard/executions/[id]` | Shows full details     |
| Export functionality  | Engineering | CSV export                   | Can download history   |

**UI Components (per C1197):**

- Execution table with pagination
- Status badges (✅ ⚠️ ❌ 🔄)
- Role emoji display
- Relative timestamps

---

### Day 11 (Mar 11) — Tuesday

**Focus:** Dashboard overview

| Task                  | Owner       | Deliverable             | Acceptance                   |
| --------------------- | ----------- | ----------------------- | ---------------------------- |
| Overview page         | Engineering | `/dashboard`            | Shows usage, recent, actions |
| Usage meter component | Engineering | Visual usage bar        | Tier-aware display           |
| Quick actions         | Engineering | Run Dispatch button     | Can trigger dispatch         |
| Streak tracking       | Engineering | Consecutive cycle count | Shows streak number          |

**Overview Components:**

```
┌─────────────────────┐  ┌─────────────────────┐
│  Cycles This Month  │  │  Current Streak     │
│  ████████░░  847    │  │  🔥 47 consecutive  │
│  /1000 (Pro limit)  │  │                     │
└─────────────────────┘  └─────────────────────┘
```

---

### Day 12 (Mar 12) — Wednesday

**Focus:** Settings + polish

| Task               | Owner       | Deliverable           | Acceptance                 |
| ------------------ | ----------- | --------------------- | -------------------------- |
| Settings page      | Engineering | `/dashboard/settings` | Profile, prefs visible     |
| API key management | Engineering | Generate/revoke keys  | Keys work for CLI auth     |
| Responsive design  | Design      | Mobile layouts        | Dashboard usable on mobile |
| Loading states     | Engineering | Skeletons, spinners   | No layout shift            |

**Settings Sections:**

1. Profile (from GitHub)
2. API Keys (generate/revoke)
3. Notifications (email prefs)
4. Connected Accounts (GitHub OAuth)
5. Danger Zone (delete account)

---

### Day 13 (Mar 13) — Thursday

**Focus:** Onboarding flow

| Task                   | Owner       | Deliverable            | Acceptance              |
| ---------------------- | ----------- | ---------------------- | ----------------------- |
| Onboarding modal       | Engineering | First-visit experience | New users see modal     |
| Repo selection         | Engineering | Connect repository     | Can select repo         |
| First dispatch trigger | Engineering | "Run First Cycle"      | Dispatch starts         |
| Success celebration    | Engineering | Confetti/toast         | User feels accomplished |

**Onboarding Flow (per C1197):**

```
Landing → GitHub OAuth → Dashboard (first visit)
→ Onboarding Modal → Select Repo → Run First Cycle
→ Real-time logs → Success! 🎉
```

---

### Day 14 (Mar 14) — Friday (Sprint End)

**Focus:** Final integration + launch prep

| Task              | Owner       | Deliverable              | Acceptance         |
| ----------------- | ----------- | ------------------------ | ------------------ |
| Full E2E suite    | QA          | Complete test coverage   | All flows tested   |
| Performance audit | Engineering | Lighthouse, load testing | Acceptable scores  |
| Security review   | Ops         | Auth, API, data          | No critical issues |
| Launch checklist  | Scrum       | Pre-launch verification  | All boxes checked  |

**Sprint 3 Exit Criteria:**

- [ ] User can complete full journey: Signup → Dispatch → Upgrade
- [ ] Dashboard shows real-time execution status
- [ ] Billing integration complete (Stripe)
- [ ] All error states handled gracefully
- [ ] E2E test coverage > 80%
- [ ] Performance acceptable (LCP < 2.5s)
- [ ] Security review passed

---

## Success Metrics

| Metric                | Target      | Measurement                     |
| --------------------- | ----------- | ------------------------------- |
| Time to first cycle   | < 5 minutes | Signup → first dispatch         |
| Dashboard engagement  | 30% weekly  | Active users viewing dashboard  |
| Free → Pro conversion | 10%         | Users upgrading within 30 days  |
| Execution visibility  | 80%         | Users viewing at least 1 detail |
| E2E test pass rate    | 100%        | CI green on merge               |

---

## Risk Mitigation

### High Risk: Vercel Deployment (#200)

**Status:** Day 13 overdue. Code ready, awaits human deployment.

**Mitigation:**

- Day 1: Final escalation per L633
- If not deployed by Day 3: Deploy landing page separately
- Dashboard can run independently

### Medium Risk: Stripe Integration Complexity

**Mitigation:**

- Use Stripe test mode throughout
- Pre-create products/prices in dashboard
- Webhook testing via Stripe CLI

### Medium Risk: Container Cold Start Latency

**Mitigation:**

- Implement warm container pool (Day 8)
- Monitor cold start times
- Acceptable: < 10s for first dispatch

---

## Daily Standup Template

```markdown
## Sprint 3 Day N Standup

**Date:** YYYY-MM-DD
**Focus:** [Today's theme from playbook]

### Yesterday

- [What was completed]

### Today

- [Tasks from playbook]

### Blockers

- [Any blocking issues]

### Notes

- [Observations, risks, decisions]
```

---

## Related Issues

- **#155** — SaaS Container (parent epic)
- **#181** — Authentication System
- **#189** — Managed Agent Execution
- **#190** — API Gateway and REST API

---

## Open Questions

1. **Warm container pool size:** How many containers to keep warm?
   - **Recommendation:** Start with 2, scale based on demand

2. **Log retention period:** Per-tier log retention?
   - **Recommendation:** 30 days Free, 90 days Pro, 1 year Enterprise (per C1197)

3. **API rate limits:** Exact limits per tier?
   - **Recommendation:** Free: 10 req/min, Pro: 100 req/min, Enterprise: 1000 req/min

---

_📦 Product | Cycle 1207 | Sprint 3 Implementation Playbook_
