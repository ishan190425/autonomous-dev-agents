# 📦 Product Spec: Managed Agent Execution (#189)

> **Author:** 📦 Product | **Cycle:** 787 | **Date:** 2026-02-17
> **Issue:** #189 | **Priority:** P1 | **Size:** L (6+ cycles)
> **Status:** SPEC COMPLETE — Ready for Architecture Review

---

## Overview

Managed Agent Execution is the core SaaS differentiator — cloud-based dispatch cycle scheduling that eliminates local setup. Users connect their repo, configure their team, and ADA runs automatically in the cloud. This enables the Pro tier ($19/mo) and transforms ADA from a CLI tool into a managed service.

---

## User Story

**As a** developer who wants ADA managing my repo,
**I want** cloud-based cycle execution without running anything locally,
**So that** my agent team works 24/7 even when my laptop is closed.

---

## Problem Statement

### Current State (CLI-Only)

```bash
# User must:
1. Install CLI locally:        npm install -g @ada-ai/cli
2. Configure API keys:         export ANTHROPIC_API_KEY=...
3. Initialize agents:          ada init
4. Run manually or via cron:   ada run
5. Keep machine running 24/7   # Not practical
```

**Problems:**

- Requires technical setup (API keys, CLI installation)
- Local machine must stay on for continuous operation
- No centralized monitoring across repos
- Each user manages their own infrastructure
- Difficult to onboard non-technical users

### Proposed State (Managed Execution)

```
User flow:
1. Sign up at ada.dev (GitHub OAuth)
2. Connect repo
3. Configure agent team (wizard)
4. Enable auto-dispatch
5. ADA runs automatically in cloud
6. View activity in dashboard
```

---

## Target Personas

| Persona        | Use Case                 | Execution Pattern     |
| -------------- | ------------------------ | --------------------- |
| Solo Developer | Side project maintenance | 4-8 cycles/day        |
| Startup Team   | Active development       | 24-48 cycles/day      |
| OSS Maintainer | Triage + docs            | 8-16 cycles/day       |
| Enterprise     | Compliance + process     | On-demand + scheduled |

---

## Core Concepts

### Execution Unit

One **execution** = one dispatch cycle. The atomic billing unit.

```
Execution {
  id: string
  repoId: string
  userId: string
  roleId: string          // Which role acted
  startedAt: timestamp
  completedAt: timestamp
  status: 'running' | 'completed' | 'failed' | 'timeout'
  result: ActionResult    // What the role did
  costCredits: number     // Credits consumed
  durationMs: number
  logs: string[]          // Execution logs
}
```

### Execution Modes

| Mode             | Description                    | Trigger                        |
| ---------------- | ------------------------------ | ------------------------------ |
| **Scheduled**    | Automatic dispatch at interval | Cron (15m, 30m, 1h, etc.)      |
| **On-Demand**    | Manual trigger from dashboard  | User clicks "Run Now"          |
| **Event-Driven** | Triggered by GitHub webhook    | Issue created, PR opened, etc. |
| **Continuous**   | Back-to-back cycles            | Toggle in dashboard            |

### Container Isolation

Each execution runs in an isolated container:

```
┌─────────────────────────────────────────┐
│  Execution Container                     │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  OpenClaw Gateway                 │   │
│  │  └── ADA CLI (@ada-ai/cli)       │   │
│  │      └── Dispatch Cycle          │   │
│  └──────────────────────────────────┘   │
│                                          │
│  Environment:                            │
│  - GITHUB_TOKEN (scoped to repo)        │
│  - ANTHROPIC_API_KEY (platform)         │
│  - Repo cloned fresh each cycle         │
│  - Network: GitHub API only             │
│  - Timeout: 10 min max                  │
│                                          │
└─────────────────────────────────────────┘
```

**Security guarantees:**

- No access to other users' repos or secrets
- Network egress limited to GitHub API + LLM provider
- Fresh clone each cycle (no persistent state tampering)
- 10-minute timeout prevents runaway executions
- Resource limits: 2 CPU, 4GB RAM

---

## User Flows

### Flow 1: Initial Setup

```
┌─────────────────────────────────────────────────────┐
│  Dashboard: Add Repository                           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  🔗 Connect a GitHub Repository                     │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🔍 Search your repositories                    │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ ○ ishan190425/autonomous-dev-agents          │  │
│  │ ○ ishan190425/payflow                         │  │
│  │ ● ishan190425/my-new-project ← selected      │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  [ Configure Team → ]                               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Flow 2: Team Configuration

After selecting repo, user goes through Interactive Onboarding (#183):

- Team size selection
- Focus areas
- Role configuration
- Schedule selection

```
┌─────────────────────────────────────────────────────┐
│  Execution Schedule                                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ⏰ How often should ADA run cycles?                │
│                                                      │
│  ○ Every 15 minutes (recommended for active dev)    │
│  ● Every 30 minutes                                  │
│  ○ Every hour                                        │
│  ○ Every 4 hours (light maintenance)                 │
│  ○ Manual only                                       │
│                                                      │
│  📊 Estimated usage: ~48 cycles/day (~1,440/month) │
│  💰 Cost: Included in Pro tier                      │
│                                                      │
│  [ Start ADA → ]                                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Flow 3: Execution Dashboard

```
┌─────────────────────────────────────────────────────┐
│  my-new-project — Agent Activity                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Status: 🟢 Active     Cycle: 42     Streak: 42    │
│                                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │ Recent Executions                               ││
│  ├─────────────────────────────────────────────────┤│
│  │ 🟢 #42  ⚙️ Engineering  2 min ago   45s        ││
│  │    "Added unit tests for auth module"           ││
│  │                                                  ││
│  │ 🟢 #41  📦 Product      32 min ago  38s        ││
│  │    "Created issue #15 for API redesign"         ││
│  │                                                  ││
│  │ 🟢 #40  🔬 Research     1 hr ago    52s        ││
│  │    "Documented Cursor vs Windsurf comparison"   ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  [ View Logs ]  [ Run Now ]  [ Pause ]              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Flow 4: Execution Logs

```
┌─────────────────────────────────────────────────────┐
│  Execution #42 — ⚙️ Engineering                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Started:   2026-02-17 04:25:00 EST                 │
│  Completed: 2026-02-17 04:25:45 EST                 │
│  Duration:  45 seconds                               │
│  Status:    ✅ Completed                             │
│                                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │ [04:25:00] 🚀 Starting dispatch cycle #42      ││
│  │ [04:25:01] 📥 Cloning repository...            ││
│  │ [04:25:05] 🧠 Loading memory bank v12          ││
│  │ [04:25:06] 👤 Role: Engineering                ││
│  │ [04:25:08] 🔍 Checking open issues...          ││
│  │ [04:25:12] 💭 Analyzing: "Need tests for auth" ││
│  │ [04:25:30] ✍️ Writing tests...                 ││
│  │ [04:25:42] 📤 Committed: "test(auth): add..."  ││
│  │ [04:25:44] 📊 Updating memory bank             ││
│  │ [04:25:45] ✅ Cycle complete                   ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  Files Modified: 2                                   │
│  Issues Referenced: #12                              │
│  Commits: 1                                          │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Scheduling Architecture

### Scheduler Service

Central scheduler manages all active repos:

```
┌──────────────────────────────────────────────────────┐
│  Scheduler Service                                    │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Job Queue (Redis/SQS)                          │ │
│  │                                                  │ │
│  │  repo-abc @ 04:30  → [pending]                  │ │
│  │  repo-xyz @ 04:30  → [pending]                  │ │
│  │  repo-123 @ 04:45  → [scheduled]                │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Worker Pool                                          │
│  ├── Worker 1: executing repo-abc                    │
│  ├── Worker 2: executing repo-xyz                    │
│  ├── Worker 3: idle                                  │
│  └── Worker 4: idle                                  │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Execution Worker

Each worker:

1. Pulls job from queue
2. Spins up isolated container
3. Clones repo
4. Runs `ada dispatch start && <action> && ada dispatch complete`
5. Captures logs
6. Records result
7. Destroys container

### Schedule Storage

```typescript
interface RepoSchedule {
  repoId: string;
  userId: string;
  enabled: boolean;
  mode: 'scheduled' | 'event-driven' | 'continuous';
  intervalMinutes: number; // For scheduled mode
  webhookEvents?: string[]; // For event-driven mode
  lastExecutionAt: Date;
  nextExecutionAt: Date;
  consecutiveFailures: number;
  pausedUntil?: Date; // Auto-pause on failures
}
```

### Failure Handling

| Consecutive Failures | Action                               |
| -------------------- | ------------------------------------ |
| 1                    | Log warning                          |
| 3                    | Send notification                    |
| 5                    | Auto-pause for 1 hour                |
| 10                   | Auto-pause for 24 hours              |
| 20                   | Disable and require manual re-enable |

---

## Cost Model

### Execution Credits

| Resource            | Credit Cost              |
| ------------------- | ------------------------ |
| Base execution      | 1 credit                 |
| Per minute runtime  | 0.5 credits              |
| LLM tokens (input)  | 0.01 credits / 1K tokens |
| LLM tokens (output) | 0.03 credits / 1K tokens |

**Example execution:**

- 45 second runtime → 1 + 0.375 = 1.375 credits
- 2K input + 1K output tokens → 0.02 + 0.03 = 0.05 credits
- **Total:** ~1.43 credits

### Pricing Tiers

| Tier       | Price  | Credits     | Cycles (est.) |
| ---------- | ------ | ----------- | ------------- |
| Free       | $0     | 50/month    | ~35 cycles    |
| Pro        | $19/mo | 2,000/month | ~1,400 cycles |
| Team       | $49/mo | 6,000/month | ~4,200 cycles |
| Enterprise | Custom | Unlimited   | Unlimited     |

### Usage Dashboard

```
┌─────────────────────────────────────────────────────┐
│  Usage — February 2026                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Credits Used:  1,247 / 2,000  ████████░░  62%     │
│  Days Left:     11                                   │
│  Projected:     1,890 credits (within budget)        │
│                                                      │
│  By Repository:                                      │
│  ├── autonomous-dev-agents    892 credits  (72%)    │
│  ├── payflow                  312 credits  (25%)    │
│  └── side-project              43 credits   (3%)    │
│                                                      │
│  [ View Details ]  [ Upgrade Plan ]                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### Must Have (P0)

- [ ] **AC-1:** User can connect GitHub repo via OAuth
- [ ] **AC-2:** System clones repo and detects existing `agents/` config
- [ ] **AC-3:** User can select execution schedule (15m, 30m, 1h, manual)
- [ ] **AC-4:** Scheduled executions run automatically at interval
- [ ] **AC-5:** Each execution runs in isolated container
- [ ] **AC-6:** Execution logs captured and viewable in dashboard
- [ ] **AC-7:** User can pause/resume execution schedule
- [ ] **AC-8:** User can trigger on-demand execution ("Run Now")
- [ ] **AC-9:** Usage tracking per execution (credits consumed)
- [ ] **AC-10:** Auto-pause after consecutive failures

### Should Have (P1)

- [ ] **AC-11:** Event-driven execution (GitHub webhooks)
- [ ] **AC-12:** Execution history with filtering and search
- [ ] **AC-13:** Email/Slack notifications for failures
- [ ] **AC-14:** Multiple repos per account
- [ ] **AC-15:** Team sharing (invite collaborators to repo)
- [ ] **AC-16:** Continuous mode (back-to-back cycles)

### Nice to Have (P2)

- [ ] **AC-17:** Custom role schedules (e.g., Research runs less often)
- [ ] **AC-18:** Execution replay (re-run with same context)
- [ ] **AC-19:** A/B testing different team configs
- [ ] **AC-20:** API access for programmatic triggers

---

## Technical Notes

### Infrastructure Options

| Provider            | Pros                   | Cons             |
| ------------------- | ---------------------- | ---------------- |
| **AWS ECS/Fargate** | Scalable, mature       | Complex setup    |
| **Fly.io**          | Simple, fast spin-up   | Less mature      |
| **Railway**         | Developer-friendly     | Pricing at scale |
| **Modal**           | Purpose-built for this | Less control     |

**Recommendation:** Start with Fly.io for simplicity, migrate to ECS as scale requires.

### Container Image

```dockerfile
FROM node:20-alpine

# Install dependencies
RUN npm install -g @ada-ai/cli openclaw

# Clone script
COPY scripts/execute-cycle.sh /usr/local/bin/

# Entrypoint
ENTRYPOINT ["execute-cycle.sh"]
```

### Execute Script

```bash
#!/bin/bash
# execute-cycle.sh

# Clone repo
git clone https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git /workspace
cd /workspace

# Run dispatch cycle
ada dispatch start
# ... AI executes action ...
ada dispatch complete --action "${ACTION}"

# Push results
git push origin main
```

### API Endpoints

```
POST   /api/repos                    # Connect repo
GET    /api/repos/:id                # Get repo details
PATCH  /api/repos/:id/schedule       # Update schedule
POST   /api/repos/:id/executions     # Trigger execution
GET    /api/repos/:id/executions     # List executions
GET    /api/executions/:id           # Get execution details
GET    /api/executions/:id/logs      # Stream logs
DELETE /api/repos/:id                # Disconnect repo
```

---

## Dependencies

| Dependency       | Issue | Required For          |
| ---------------- | ----- | --------------------- |
| GitHub OAuth     | #181  | Repo access           |
| Stripe Billing   | #182  | Credit/usage tracking |
| REST API Gateway | #190  | Dashboard → Execution |
| Container Infra  | #155  | Running executions    |

---

## Risks & Mitigations

| Risk                | Likelihood | Impact   | Mitigation                         |
| ------------------- | ---------- | -------- | ---------------------------------- |
| Runaway costs (LLM) | Medium     | High     | Hard credit limits, timeout        |
| Security breach     | Low        | Critical | Container isolation, scoped tokens |
| Scale bottleneck    | Medium     | Medium   | Queue-based architecture           |
| GitHub rate limits  | Medium     | Medium   | Token pooling, caching             |

---

## Success Metrics

| Metric                  | Target          |
| ----------------------- | --------------- |
| Setup completion rate   | 80%+            |
| Time to first execution | <5 min          |
| Execution success rate  | 95%+            |
| Average execution time  | <60s            |
| Daily active repos      | 100+ (month 1)  |
| MRR                     | $100+ (month 1) |

---

## Open Questions

1. **Multi-branch support:** Should executions work on branches other than main?
2. **Private forks:** How to handle execution on forks?
3. **Concurrent executions:** Allow multiple cycles on same repo?
4. **Rollback:** If ADA makes a bad commit, how does user revert?
5. **Self-hosting:** Should we offer a self-hosted container option?

---

## References

- Issue: #189
- Parent: #155 (SaaS Container)
- Related: #181 (OAuth), #182 (Billing), #190 (API)
- Onboarding: #183 (Interactive Wizard)
- CLI docs: packages/cli/README.md

---

_Spec complete. Ready for Architecture review and Engineering estimation._
