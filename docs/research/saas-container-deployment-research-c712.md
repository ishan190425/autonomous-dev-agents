# 🚀 SaaS Container Deployment Research — AI Agent Infrastructure Patterns

> 🔬 Research | Cycle 712 | Feb 16, 2026
> Supporting Issue: #155 (SaaS Container) | Strategic Context: #158 (Bootstrap via SaaS)

---

## Executive Summary

This document surveys deployment infrastructure options for ADA's containerized SaaS product. The goal: identify the best platform for Phase 1 Container MVP (Feb 26-Mar 7) with a path to scale.

**Recommendation:** Railway for Phase 1 MVP (validated CEO C710 decision), with migration path to AWS ECS for Enterprise tier.

---

## Platform Comparison

### Primary Candidates

| Platform                      | Pros                                                                                     | Cons                                      | Monthly Cost (MVP)  |
| ----------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------- |
| **Railway**                   | One-click deploy, generous free tier, excellent DX, native Docker support, automatic TLS | Limited regions, less enterprise features | ~$20-50 (Hobby Pro) |
| **Fly.io**                    | Edge deployment, Firecracker VMs, global distribution, great latency                     | Steeper learning curve, more ops work     | ~$30-60             |
| **Render**                    | Simple UI, auto-scaling, managed DBs, free tier                                          | Less control, some cold start issues      | ~$25-50             |
| **AWS ECS**                   | Enterprise-grade, full control, compliance-ready                                         | Complex setup, requires ops expertise     | ~$50-100+           |
| **DigitalOcean App Platform** | Affordable, simple, Kubernetes under hood                                                | Fewer features, less flexible             | ~$20-40             |

### Decision Matrix

| Criteria              | Weight | Railway    | Fly.io     | Render   | AWS ECS    |
| --------------------- | ------ | ---------- | ---------- | -------- | ---------- |
| Time-to-deploy        | 25%    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐⭐ | ⭐⭐       |
| Cost efficiency       | 20%    | ⭐⭐⭐⭐   | ⭐⭐⭐     | ⭐⭐⭐⭐ | ⭐⭐       |
| Developer experience  | 20%    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐⭐ | ⭐⭐⭐     |
| Scalability           | 15%    | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐   | ⭐⭐⭐⭐⭐ |
| Enterprise readiness  | 10%    | ⭐⭐⭐     | ⭐⭐⭐     | ⭐⭐⭐   | ⭐⭐⭐⭐⭐ |
| Self-hosting template | 10%    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐   | ⭐⭐       |

**Winner: Railway** for Phase 1 MVP based on time-to-deploy and DX.

---

## Self-Hosted Dev Tool Patterns

### Reference Implementations

These projects successfully offer both managed and self-hosted options:

#### 1. Supabase

- **Architecture:** Docker Compose for self-host, managed cloud service
- **Pricing:** Free tier → Pro ($25/mo) → Team → Enterprise
- **Self-host:** Official docker-compose.yml + env template
- **Key insight:** "Same product" for both — managed is convenience layer only

#### 2. PostHog

- **Architecture:** Kubernetes Helm chart or Docker Compose
- **Pricing:** Free (self-host) → Cloud ($0-2k/mo based on usage)
- **Self-host:** Full feature parity, just needs infra
- **Key insight:** Event volume pricing, not seat-based

#### 3. n8n

- **Architecture:** Single Docker container + optional queue
- **Pricing:** Free (self-host) → Starter ($20/mo) → Pro ($50/mo) → Enterprise
- **Self-host:** Very simple — one container, env vars
- **Key insight:** Workflow-based SaaS can use simple container model

#### 4. Appsmith / Tooljet

- **Architecture:** Multi-container (app + db + worker)
- **Pricing:** Free (self-host) → Business ($40/user/mo)
- **Self-host:** Docker Compose with separate services
- **Key insight:** Modular architecture enables horizontal scaling

### Pattern Recommendations for ADA

| Component           | Approach                                | Rationale                                  |
| ------------------- | --------------------------------------- | ------------------------------------------ |
| **Core container**  | Single image with OpenClaw + ADA CLI    | Simplest deployment, n8n-style             |
| **Config**          | Environment variables                   | 12-factor app, works everywhere            |
| **State**           | External (user's repo)                  | No persistent storage needed in container  |
| **Secrets**         | User-provided API keys                  | Keep LLM keys with user, reduces liability |
| **Logs**            | stdout → platform logging               | No custom logging infra needed initially   |
| **Cron/scheduling** | In-container cron OR platform scheduler | Railway/Render have built-in cron          |

---

## LLM Cost Management for SaaS

### The Challenge

LLM API costs are:

- **Variable:** Token usage unpredictable per cycle
- **Non-linear:** Context window usage affects cost
- **Provider-dependent:** Anthropic vs OpenAI pricing differs

### Pricing Strategies from Comparable Products

| Product               | Strategy                            | Pass-through?                 |
| --------------------- | ----------------------------------- | ----------------------------- |
| **Cursor**            | Monthly subscription, unlimited use | No — absorbs costs            |
| **GitHub Copilot**    | Monthly flat rate                   | No — Microsoft absorbs        |
| **Vercel AI**         | Credits + usage pricing             | Partial — transparent pricing |
| **OpenAI GPT API**    | Pure usage (per token)              | Yes — user pays directly      |
| **Anthropic Console** | Pure usage                          | Yes                           |

### Recommendation for ADA

**Hybrid approach (CEO-approved in C710):**

| Tier                    | Model          | LLM Cost Handling                     |
| ----------------------- | -------------- | ------------------------------------- |
| **Free ($0/50 cycles)** | Loss leader    | ADA absorbs (capped usage)            |
| **Pro ($29/mo)**        | Bundled cycles | ADA absorbs, margin on subscription   |
| **Team ($99/mo)**       | Higher limits  | Same, better margins at scale         |
| **Enterprise**          | Custom         | Pass-through option, volume discounts |

### Cost Estimation per Cycle

Based on ADA dispatch patterns (711 cycles of data):

| Component           | Est. Tokens   | Cost (Claude Sonnet) |
| ------------------- | ------------- | -------------------- |
| Context load        | ~5,000 input  | $0.015               |
| Reasoning/action    | ~2,000 output | $0.030               |
| Tool calls          | ~1,000        | $0.010               |
| **Per cycle total** | ~8,000        | **~$0.055**          |

**Monthly projections:**

- Free tier (50 cycles): ~$2.75 cost → acceptable loss leader
- Pro tier (500 cycles): ~$27.50 cost on $29 → thin margin, need volume
- Team tier (2000 cycles): ~$110 cost on $99 → **negative margin risk**

**Insight:** Current cycle cost (~$0.055) is higher than assumed in pricing. Options:

1. Optimize prompts to reduce token usage
2. Use cheaper models for routine cycles
3. Adjust cycle limits in tiers
4. Add overage charges beyond limits

---

## Container Architecture Recommendation

### Phase 1: Single Container (MVP)

```
┌─────────────────────────────────────────────┐
│  ADA SaaS Container                         │
├─────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────────────┐ │
│  │  OpenClaw   │  │   ADA CLI (@ada/cli) │ │
│  │  Gateway    │──│   - dispatch start   │ │
│  │             │  │   - dispatch complete│ │
│  └─────────────┘  └──────────────────────┘ │
│         │                    │              │
│  ┌──────┴────────────────────┴───────────┐ │
│  │  Cron Scheduler (15-min dispatch)      │ │
│  └────────────────────────────────────────┘ │
│         │                                   │
│  ENV: GITHUB_TOKEN, ANTHROPIC_API_KEY,     │
│       GITHUB_REPO, ADA_ROLES_MODE          │
└─────────────────────────────────────────────┘
           │
           ▼
    [GitHub API]  [Anthropic API]
```

**Dockerfile sketch:**

```dockerfile
FROM node:20-alpine

# Install OpenClaw and ADA CLI
RUN npm install -g openclaw @ada-ai/cli

# Copy agent configuration
COPY agents/ /app/agents/

# Entrypoint starts OpenClaw gateway + cron
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

### Phase 2: Multi-Tenant Architecture

```
┌──────────────────────────────────────────────────────┐
│  ADA SaaS Platform                                   │
├──────────────────────────────────────────────────────┤
│  ┌─────────────────┐   ┌──────────────────────────┐ │
│  │  Web Frontend   │   │  API Gateway             │ │
│  │  (Next.js)      │───│  - Auth (GitHub OAuth)   │ │
│  │                 │   │  - Billing (Stripe)      │ │
│  └─────────────────┘   │  - Container orchestration│ │
│                        └──────────────────────────┘ │
│                                   │                  │
│  ┌────────────────────────────────┴───────────────┐ │
│  │  Container Pool (Railway/ECS)                   │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │ │
│  │  │ User A   │ │ User B   │ │ User C   │ ...   │ │
│  │  │ Container│ │ Container│ │ Container│       │ │
│  │  └──────────┘ └──────────┘ └──────────┘       │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Isolation model:** One container per customer repo (simplest security model)

---

## Railway-Specific Setup Guide

### One-Click Deploy Template

Railway supports "Deploy on Railway" buttons via `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### Environment Variables

```bash
# Required
GITHUB_TOKEN=ghp_xxx          # GitHub PAT or App token
ANTHROPIC_API_KEY=sk-xxx      # LLM provider key
GITHUB_REPO=owner/repo        # Target repository

# Optional
ADA_DISPATCH_INTERVAL=15m     # Cron interval (default: 15m)
ADA_ROLES_MODE=read-write     # or read-only
ADA_LOG_LEVEL=info            # debug, info, warn, error
```

### Pricing on Railway

| Plan               | Included         | Overage            | Best For       |
| ------------------ | ---------------- | ------------------ | -------------- |
| Hobby ($5/mo)      | $5 credit        | $0.000463/vCPU-min | Development    |
| Pro ($20/mo)       | $20 credit       | Same               | Production MVP |
| Team ($20/user/mo) | Per-user credits | Same               | Multi-user     |

**Estimated monthly cost for ADA container:**

- 1 vCPU, 512MB RAM, running 24/7
- ~$15-25/month depending on utilization
- Well within Pro tier credits

---

## Security Considerations

### Token Scoping

GitHub tokens should use minimal permissions:

| Scope           | Phase 1 (MVP) | Phase 2 (Code) |
| --------------- | ------------- | -------------- |
| `issues`        | read, write   | read, write    |
| `pull_requests` | read          | read, write    |
| `contents`      | read          | read, write    |
| `metadata`      | read          | read           |

**Phase 1 is read-only for code** — Issues/comments only. Lower risk surface.

### Secret Management

| Secret              | Where              | Best Practice       |
| ------------------- | ------------------ | ------------------- |
| `GITHUB_TOKEN`      | User's Railway env | Never in image      |
| `ANTHROPIC_API_KEY` | User's Railway env | Never in image      |
| `WEBHOOK_SECRET`    | Generated per-user | For GitHub webhooks |

### Container Isolation

- Each user gets isolated container (Railway's default)
- No shared state between containers
- Network isolation by default
- Logs isolated per container

---

## Open Questions for Engineering

1. **GitHub App vs PAT?** App is more secure, PAT is simpler for MVP
2. **Cron in-container vs Railway scheduler?** Railway scheduler is cleaner, less custom code
3. **Health checks?** Simple HTTP endpoint or full observability?
4. **Logs aggregation?** Railway built-in vs external (Axiom, Datadog)?

---

## Recommendations Summary

| Decision              | Recommendation          | Rationale        |
| --------------------- | ----------------------- | ---------------- |
| **Phase 1 Platform**  | Railway                 | DX, speed, cost  |
| **Architecture**      | Single container        | Simplest MVP     |
| **Token source**      | User-provided           | Lower liability  |
| **LLM cost model**    | Bundled (watch margins) | User simplicity  |
| **Phase 2 migration** | AWS ECS                 | Enterprise needs |

---

## Next Steps

1. **Engineering:** Create Dockerfile + entrypoint.sh for Phase 1
2. **Ops:** Set up Railway project + deploy template
3. **Product:** Define health check endpoint requirements
4. **CEO:** Review LLM cost margin analysis (Team tier risk)

---

## References

- Railway docs: https://docs.railway.app
- Fly.io docs: https://fly.io/docs
- Supabase self-host: https://supabase.com/docs/guides/self-hosting
- PostHog self-host: https://posthog.com/docs/self-host
- n8n Docker: https://docs.n8n.io/hosting/installation/docker/

---

_🔬 The Scout | Head of Research | Cycle 712_
