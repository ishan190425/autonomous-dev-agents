# Sprint 3 Environment Variables Master Reference

> **Author:** 🌌 Frontier (C1146)
> **Date:** 2026-02-23
> **Status:** SPECIFICATION
> **Related Issues:** #155 (SaaS Container), #181 (Auth), #182 (Billing), #189 (Managed Exec), #190 (API Gateway)
> **Sprint Target:** Sprint 3 (Mar 1-14)

---

## Executive Summary

This document consolidates ALL environment variables required for Sprint 3 SaaS deployment. It serves as the single source of truth for Engineering on Day 1, preventing configuration chaos and deployment delays.

**Goals:**

1. Single reference for all env vars across all Sprint 3 components
2. Clear ownership (which service uses what)
3. Security classification (secret vs public)
4. Setup order (dependencies)

---

## Architecture Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ADA SaaS Environment Map                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    VERCEL (Web Platform)                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │   │
│  │  │   Next.js App   │  │   API Routes    │  │   Edge Funcs  │ │   │
│  │  │   (Dashboard)   │  │   (Gateway)     │  │   (Rate Limit)│ │   │
│  │  └────────┬────────┘  └────────┬────────┘  └───────┬───────┘ │   │
│  │           │                    │                   │         │   │
│  │           └────────────────────┼───────────────────┘         │   │
│  │                               │                              │   │
│  │  ENV: AUTH, DATABASE, STRIPE, RATE_LIMIT, FEATURE_FLAGS      │   │
│  └───────────────────────────────┼──────────────────────────────┘   │
│                                  │                                   │
│  ┌───────────────────────────────┼──────────────────────────────┐   │
│  │                    GKE (Managed Execution)                    │   │
│  │                               │                               │   │
│  │  ┌─────────────────┐  ┌──────┴──────┐  ┌─────────────────┐   │   │
│  │  │ Control Plane   │  │   Agent     │  │   Metering      │   │   │
│  │  │ (Scheduler)     │  │   Pods      │  │   (Collector)   │   │   │
│  │  └────────┬────────┘  └─────────────┘  └────────┬────────┘   │   │
│  │           │                                      │           │   │
│  │  ENV: GCP, K8S, AGENT_IMAGE, LLM_KEYS, GITHUB    │           │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                    SUPABASE (Database)                         │   │
│  │                                                                │   │
│  │  Postgres + Auth + Realtime + Edge Functions                   │   │
│  │  ENV: Managed by Supabase (connection strings provided)        │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Vercel Environment Variables

### 1.1 Authentication (Auth Service — #181)

| Variable                 | Required    | Type   | Description                         | Example                              |
| ------------------------ | ----------- | ------ | ----------------------------------- | ------------------------------------ |
| `NEXTAUTH_SECRET`        | ✅ Required | Secret | NextAuth.js signing key (32+ chars) | `openssl rand -base64 32`            |
| `NEXTAUTH_URL`           | ✅ Required | URL    | Canonical app URL                   | `https://app.ada.dev`                |
| `GITHUB_CLIENT_ID`       | ✅ Required | Public | GitHub OAuth App ID                 | `Iv1.a1b2c3d4e5f6g7h8`               |
| `GITHUB_CLIENT_SECRET`   | ✅ Required | Secret | GitHub OAuth App Secret             | `abc123def456...`                    |
| `GITHUB_APP_ID`          | ✅ Required | Public | GitHub App ID (for installations)   | `123456`                             |
| `GITHUB_APP_PRIVATE_KEY` | ✅ Required | Secret | GitHub App private key (PEM)        | `-----BEGIN RSA PRIVATE KEY-----...` |
| `GITHUB_WEBHOOK_SECRET`  | ✅ Required | Secret | Webhook signature verification      | `whsec_abc123...`                    |

**Setup Order:** Create GitHub OAuth App → Create GitHub App → Generate webhook secret → Set in Vercel

**Sources:**

- GitHub OAuth App: https://github.com/settings/developers
- GitHub App: https://github.com/settings/apps
- NextAuth Secret: `openssl rand -base64 32`

### 1.2 Database (Supabase)

| Variable               | Required    | Type   | Description                             | Example                                 |
| ---------------------- | ----------- | ------ | --------------------------------------- | --------------------------------------- |
| `DATABASE_URL`         | ✅ Required | Secret | Postgres connection string (pooled)     | `postgres://postgres.xyz:6543/postgres` |
| `DIRECT_URL`           | ✅ Required | Secret | Direct Postgres connection (migrations) | `postgres://postgres.xyz:5432/postgres` |
| `SUPABASE_URL`         | ✅ Required | URL    | Supabase project URL                    | `https://xyz.supabase.co`               |
| `SUPABASE_ANON_KEY`    | ✅ Required | Public | Anonymous/public API key                | `eyJhbGc...`                            |
| `SUPABASE_SERVICE_KEY` | ✅ Required | Secret | Service role key (server-side only)     | `eyJhbGc...`                            |

**Setup Order:** Create Supabase project → Copy connection strings → Set pooler mode for `DATABASE_URL`

**Sources:**

- Supabase Dashboard → Settings → Database → Connection string
- Supabase Dashboard → Settings → API → Keys

### 1.3 Billing (Stripe — #182)

| Variable                     | Required    | Type   | Description                   | Example                        |
| ---------------------------- | ----------- | ------ | ----------------------------- | ------------------------------ |
| `STRIPE_SECRET_KEY`          | ✅ Required | Secret | Stripe API secret key         | `sk_live_...` or `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY`     | ✅ Required | Public | Client-side Stripe key        | `pk_live_...` or `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET`      | ✅ Required | Secret | Webhook endpoint secret       | `whsec_...`                    |
| `STRIPE_PRO_PRICE_ID`        | ✅ Required | Public | Pro tier price ID             | `price_...`                    |
| `STRIPE_ENTERPRISE_PRICE_ID` | ⚪ Optional | Public | Enterprise tier price ID      | `price_...`                    |
| `STRIPE_CYCLE_PRICE_ID`      | ✅ Required | Public | Per-cycle metered price ID    | `price_...`                    |
| `STRIPE_LLM_PRICE_ID`        | ✅ Required | Public | LLM cost passthrough price ID | `price_...`                    |

**Setup Order:** Create Stripe account → Create products/prices → Set up webhook endpoint → Copy secrets

**Sources:**

- Stripe Dashboard → Developers → API keys
- Stripe Dashboard → Developers → Webhooks → Signing secret
- Stripe Dashboard → Products → Price IDs

### 1.4 API Gateway (Rate Limiting — #190)

| Variable                   | Required    | Type   | Description                              | Example                  |
| -------------------------- | ----------- | ------ | ---------------------------------------- | ------------------------ |
| `UPSTASH_REDIS_REST_URL`   | ✅ Required | URL    | Upstash Redis HTTP endpoint              | `https://xyz.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ Required | Secret | Upstash Redis auth token                 | `AXyz...`                |
| `RATE_LIMIT_FREE`          | ⚪ Optional | Number | Free tier requests/min (default: 60)     | `60`                     |
| `RATE_LIMIT_STARTER`       | ⚪ Optional | Number | Starter tier requests/min (default: 300) | `300`                    |
| `RATE_LIMIT_PRO`           | ⚪ Optional | Number | Pro tier requests/min (default: 1000)    | `1000`                   |

**Setup Order:** Create Upstash account → Create Redis database → Copy REST credentials

**Sources:**

- Upstash Console → Redis → Database details

### 1.5 Feature Flags & Observability

| Variable                    | Required    | Type    | Description                             | Example                     |
| --------------------------- | ----------- | ------- | --------------------------------------- | --------------------------- |
| `FEATURE_MANAGED_EXECUTION` | ⚪ Optional | Boolean | Enable cloud execution (default: false) | `true`                      |
| `FEATURE_BILLING`           | ⚪ Optional | Boolean | Enable billing (default: false)         | `true`                      |
| `SENTRY_DSN`                | ⚪ Optional | URL     | Sentry error tracking                   | `https://xyz@sentry.io/123` |
| `VERCEL_ANALYTICS`          | ⚪ Optional | Boolean | Enable Vercel Analytics                 | `true`                      |
| `LOG_LEVEL`                 | ⚪ Optional | String  | Logging verbosity                       | `info`                      |

**Note:** Feature flags enable gradual rollout. Start with all `false`, enable as features are ready.

---

## 2. GKE Environment Variables

### 2.1 GCP Infrastructure

| Variable               | Required    | Type   | Description             | Example                          |
| ---------------------- | ----------- | ------ | ----------------------- | -------------------------------- |
| `GCP_PROJECT_ID`       | ✅ Required | Public | Google Cloud project ID | `ada-saas-prod`                  |
| `GCP_REGION`           | ✅ Required | Public | Primary GKE region      | `us-central1`                    |
| `GKE_CLUSTER_NAME`     | ✅ Required | Public | Autopilot cluster name  | `ada-execution`                  |
| `AGENT_IMAGE_VERSION`  | ✅ Required | Public | Agent container version | `v1.0.0`                         |
| `AGENT_IMAGE_REGISTRY` | ✅ Required | URL    | Container registry path | `gcr.io/ada-saas-prod/ada-agent` |

**Setup Order:** Create GCP project → Enable GKE API → Create Autopilot cluster → Set up Artifact Registry

### 2.2 Control Plane Service

| Variable                 | Required    | Type   | Description                        | Example                              |
| ------------------------ | ----------- | ------ | ---------------------------------- | ------------------------------------ |
| `CONTROL_PLANE_URL`      | ✅ Required | URL    | Internal service URL               | `https://control.ada.internal`       |
| `PUBSUB_TOPIC_EXECUTION` | ✅ Required | Public | Pub/Sub topic for execution events | `projects/ada/topics/executions`     |
| `PUBSUB_SUBSCRIPTION`    | ✅ Required | Public | Subscription for control plane     | `projects/ada/subscriptions/control` |

### 2.3 Agent Pod Environment (Injected per Job)

| Variable            | Required    | Type   | Injection    | Description                   |
| ------------------- | ----------- | ------ | ------------ | ----------------------------- |
| `ADA_EXECUTION_ID`  | ✅ Required | Public | Job manifest | Unique execution identifier   |
| `ADA_TENANT_ID`     | ✅ Required | Public | Job manifest | Customer tenant ID            |
| `ADA_REPO_PATH`     | ✅ Required | Public | Hardcoded    | Workspace path (`/workspace`) |
| `GITHUB_TOKEN`      | ✅ Required | Secret | K8s Secret   | User's GitHub access token    |
| `OPENAI_API_KEY`    | ⚪ Optional | Secret | K8s Secret   | OpenAI API key                |
| `ANTHROPIC_API_KEY` | ⚪ Optional | Secret | K8s Secret   | Anthropic API key             |
| `GOOGLE_AI_API_KEY` | ⚪ Optional | Secret | K8s Secret   | Google AI API key             |

**Note:** LLM keys are per-tenant secrets stored in Kubernetes Secrets, injected at job creation.

---

## 3. Shared/Cross-Platform Variables

### 3.1 LLM Provider Keys (Used by Both Platforms)

| Variable            | Required       | Type   | Where        | Description               |
| ------------------- | -------------- | ------ | ------------ | ------------------------- |
| `OPENAI_API_KEY`    | ⚪ Conditional | Secret | Vercel + GKE | OpenAI API access         |
| `ANTHROPIC_API_KEY` | ⚪ Conditional | Secret | Vercel + GKE | Anthropic API access      |
| `GOOGLE_AI_API_KEY` | ⚪ Optional    | Secret | Vercel + GKE | Google AI (Gemini) access |

**Note:** At least one LLM provider key required. Claude (Anthropic) recommended as default.

### 3.2 Cross-Service Communication

| Variable                | Required    | Type   | Where | Description                  |
| ----------------------- | ----------- | ------ | ----- | ---------------------------- |
| `ADA_API_URL`           | ✅ Required | URL    | GKE   | Public API URL for callbacks |
| `INTERNAL_API_KEY`      | ✅ Required | Secret | Both  | Service-to-service auth      |
| `WEBHOOK_SIGNATURE_KEY` | ✅ Required | Secret | Both  | Internal webhook signing     |

---

## 4. Environment Setup Checklist

### Day 1 Prerequisites (Before Sprint 3)

- [ ] **Supabase Project Created**
  - [ ] Production project created
  - [ ] Connection strings copied
  - [ ] Service role key secured

- [ ] **GitHub Apps Created**
  - [ ] OAuth App for user authentication
  - [ ] GitHub App for repo access/webhooks
  - [ ] Private key generated and stored

- [ ] **Stripe Account Setup**
  - [ ] Products created (Pro, Enterprise)
  - [ ] Metered prices for cycles/LLM
  - [ ] Webhook endpoint configured

- [ ] **Upstash Redis Created**
  - [ ] Database provisioned
  - [ ] REST API enabled

- [ ] **GCP Project Ready**
  - [ ] Project created
  - [ ] GKE Autopilot cluster running
  - [ ] Artifact Registry configured

### Sprint 3 Day 1 Task: Environment Setup

```bash
# 1. Verify all secrets are in Vercel
vercel env ls

# 2. Verify GCP secrets in Secret Manager
gcloud secrets list --project=ada-saas-prod

# 3. Test database connection
npx prisma db push --preview-feature

# 4. Verify Stripe webhook connectivity
stripe trigger customer.subscription.created

# 5. Test rate limiting
curl -H "Authorization: Bearer test" https://app.ada.dev/api/v1/health
```

---

## 5. Security Classification

### 5.1 Secret Variables (NEVER expose client-side)

| Variable                   | Storage Recommendation           |
| -------------------------- | -------------------------------- |
| `NEXTAUTH_SECRET`          | Vercel Encrypted Env             |
| `GITHUB_CLIENT_SECRET`     | Vercel Encrypted Env             |
| `GITHUB_APP_PRIVATE_KEY`   | Vercel Encrypted Env (multiline) |
| `GITHUB_WEBHOOK_SECRET`    | Vercel Encrypted Env             |
| `DATABASE_URL`             | Vercel Encrypted Env             |
| `SUPABASE_SERVICE_KEY`     | Vercel Encrypted Env             |
| `STRIPE_SECRET_KEY`        | Vercel Encrypted Env             |
| `STRIPE_WEBHOOK_SECRET`    | Vercel Encrypted Env             |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel Encrypted Env             |
| `OPENAI_API_KEY`           | GCP Secret Manager               |
| `ANTHROPIC_API_KEY`        | GCP Secret Manager               |
| `INTERNAL_API_KEY`         | Both (Vercel + GCP)              |

### 5.2 Public Variables (Safe for client-side)

| Variable                 | Notes                               |
| ------------------------ | ----------------------------------- |
| `NEXTAUTH_URL`           | Public URL                          |
| `GITHUB_CLIENT_ID`       | OAuth flow requires client exposure |
| `SUPABASE_URL`           | Public API endpoint                 |
| `SUPABASE_ANON_KEY`      | Designed for client use             |
| `STRIPE_PUBLISHABLE_KEY` | Designed for client use             |
| `STRIPE_*_PRICE_ID`      | Product identifiers (non-sensitive) |

---

## 6. Vercel Environment Configuration

### 6.1 Recommended .env.local Template

```bash
# ============================================
# ADA SaaS - Local Development Environment
# Copy to .env.local and fill in values
# ============================================

# ---------- Authentication ----------
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_APP_ID=""
GITHUB_APP_PRIVATE_KEY=""
GITHUB_WEBHOOK_SECRET=""

# ---------- Database ----------
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
SUPABASE_URL="https://xyz.supabase.co"
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_KEY=""

# ---------- Billing ----------
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_CYCLE_PRICE_ID="price_..."
STRIPE_LLM_PRICE_ID="price_..."

# ---------- Rate Limiting ----------
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN=""

# ---------- Feature Flags ----------
FEATURE_MANAGED_EXECUTION="false"
FEATURE_BILLING="false"

# ---------- Observability ----------
LOG_LEVEL="debug"
# SENTRY_DSN=""
```

### 6.2 Production vs Preview Environments

| Variable       | Production            | Preview                | Development             |
| -------------- | --------------------- | ---------------------- | ----------------------- |
| `NEXTAUTH_URL` | `https://app.ada.dev` | `https://*.vercel.app` | `http://localhost:3000` |
| `STRIPE_*`     | Live keys             | Test keys              | Test keys               |
| `DATABASE_URL` | Production Supabase   | Preview branch         | Local/dev Supabase      |
| `FEATURE_*`    | As enabled            | All `true` (testing)   | As needed               |

---

## 7. Troubleshooting

### Common Issues

**"NextAuth URL mismatch"**

- Ensure `NEXTAUTH_URL` matches the actual deployment URL
- For preview deployments, use `VERCEL_URL` environment variable

**"GitHub OAuth redirect_uri mismatch"**

- Add all deployment URLs to GitHub OAuth App's callback URLs
- Include `localhost:3000` for development

**"Stripe webhook signature invalid"**

- Verify `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint
- Each environment needs its own webhook endpoint in Stripe

**"Supabase connection timeout"**

- Use pooled connection string for `DATABASE_URL`
- Use direct connection for migrations (`DIRECT_URL`)

**"Rate limit Redis connection failed"**

- Verify Upstash REST API is enabled
- Check `UPSTASH_REDIS_REST_URL` doesn't have trailing slash

---

## 8. Sprint 3 Day 1 Readiness Checklist

### Pre-Day 1 (Feb 28)

- [ ] All Vercel env vars configured for production
- [ ] All Vercel env vars configured for preview
- [ ] GCP Secret Manager populated
- [ ] GitHub OAuth callback URLs include production domain
- [ ] Stripe webhook endpoints created for all environments
- [ ] Upstash Redis provisioned with REST API
- [ ] Database migrations ready to deploy

### Day 1 Verification (Mar 1)

- [ ] `npm run build` succeeds with all env vars
- [ ] OAuth login flow works on preview deployment
- [ ] Stripe checkout redirects correctly
- [ ] API rate limiting responds appropriately
- [ ] Database queries execute without timeout

---

## Related Documents

- [#181 Auth System](https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/181) — GitHub OAuth spec
- [#182 Billing Integration](https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/182) — Stripe integration spec
- [#190 API Gateway](https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/190) — Rate limiting spec
- [C1086 Managed Execution](./managed-execution-implementation-spec-c1086.md) — GKE deployment spec
- [C1106 Runtime Security](./adr-runtime-security-model-c1106.md) — Security model ADR
- [C806 Sprint 3 Architecture](./sprint3-implementation-architecture-c806.md) — Integration overview

---

_"Configuration is code. Undocumented configuration is technical debt."_
