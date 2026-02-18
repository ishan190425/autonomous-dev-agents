# 🛡️ Infrastructure Setup Runbook (C861)

**Date:** 2026-02-18  
**Author:** 🛡️ Ops  
**Target:** Day 5 (Feb 21) — Infrastructure 6/6  
**Related:** #155 (SaaS Container), C853 (CEO Escalation)

---

## Executive Summary

This runbook provides step-by-step instructions for completing all 6 infrastructure items. Each section includes:

- Setup URL
- Required inputs
- Secrets to store
- Verification test

**Estimated time:** 30-45 minutes total if all accounts are new.

---

## Progress Tracker

| #   | Item                | Status | Verified By | Timestamp |
| --- | ------------------- | ------ | ----------- | --------- |
| 1   | Stripe Account      | ⬜ TBD |             |           |
| 2   | Supabase Project    | ⬜ TBD |             |           |
| 3   | GitHub OAuth App    | ⬜ TBD |             |           |
| 4   | Domain              | ⬜ TBD |             |           |
| 5   | Vercel Project      | ⬜ TBD |             |           |
| 6   | Monitoring (Sentry) | ⬜ TBD |             |           |

---

## 1. Stripe Account

### Setup URL

https://dashboard.stripe.com/register

### Steps

1. Sign up or log in to Stripe Dashboard
2. Go to **Developers** → **API keys**
3. Copy the **Test mode** keys:
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`
4. Go to **Developers** → **Webhooks**
5. Add endpoint: `https://[YOUR_DOMAIN]/api/webhooks/stripe`
6. Select events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
7. Copy the **Webhook signing secret**: `whsec_...`

### Secrets to Store

```
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### GitHub Secrets (for CI/CD)

```bash
gh secret set STRIPE_PUBLISHABLE_KEY --body "pk_test_..."
gh secret set STRIPE_SECRET_KEY --body "sk_test_..."
gh secret set STRIPE_WEBHOOK_SECRET --body "whsec_..."
```

### Verification Test

```bash
# Test API key works
curl https://api.stripe.com/v1/customers \
  -u sk_test_YOUR_KEY: \
  -d "email=test@ada.dev"
# Should return a customer object
```

---

## 2. Supabase Project

### Setup URL

https://supabase.com/dashboard/new

### Steps

1. Sign up or log in to Supabase
2. Create new project:
   - **Name:** `ada-saas` (or `ada-saas-dev` for dev)
   - **Database Password:** Generate strong password, save securely
   - **Region:** US East (or closest)
3. Wait for project to initialize (~2 min)
4. Go to **Project Settings** → **API**
5. Copy:
   - **Project URL:** `https://xxx.supabase.co`
   - **anon public key:** `eyJ...`
   - **service_role key:** `eyJ...` (for server-side)
6. Go to **Project Settings** → **Database**
7. Copy **Connection string** (URI format)

### Secrets to Store

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:[PASSWORD]@xxx.supabase.co:5432/postgres
```

### GitHub Secrets

```bash
gh secret set SUPABASE_URL --body "https://xxx.supabase.co"
gh secret set SUPABASE_ANON_KEY --body "eyJ..."
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "eyJ..."
gh secret set DATABASE_URL --body "postgresql://..."
```

### Verification Test

```bash
# Test connection
curl 'https://xxx.supabase.co/rest/v1/' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
# Should return empty array or table list
```

---

## 3. GitHub OAuth App

### Setup URL

https://github.com/settings/applications/new

### Steps

1. Go to GitHub → Settings → Developer settings → OAuth Apps → New
2. Fill in:
   - **Application name:** `ADA Dashboard`
   - **Homepage URL:** `https://ada.dev` (or temp domain)
   - **Authorization callback URL:** `https://ada.dev/api/auth/callback/github`
3. Click "Register application"
4. Copy **Client ID**
5. Click "Generate a new client secret"
6. Copy **Client Secret** (only shown once!)

### Secrets to Store

```
GITHUB_CLIENT_ID=Ov23...
GITHUB_CLIENT_SECRET=...
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://ada.dev
```

### GitHub Secrets

```bash
gh secret set GITHUB_CLIENT_ID --body "Ov23..."
gh secret set GITHUB_CLIENT_SECRET --body "..."
gh secret set NEXTAUTH_SECRET --body "$(openssl rand -base64 32)"
gh secret set NEXTAUTH_URL --body "https://ada.dev"
```

### Verification Test

OAuth flow requires browser — test after Vercel deployment:

1. Visit `https://ada.dev/api/auth/signin`
2. Click "Sign in with GitHub"
3. Should redirect to GitHub, then back to dashboard

---

## 4. Domain Configuration

### Options (in order of preference)

1. **ada.dev** — if available, premium but clean
2. **getada.dev** — likely available
3. **useada.dev** — likely available
4. **ada-ai.dev** — fallback

### Steps (using Cloudflare for DNS)

1. Purchase domain via registrar (Namecheap, Google Domains, Cloudflare)
2. Add to Cloudflare (free tier):
   - Create account at https://cloudflare.com
   - Add site → enter domain
   - Update nameservers at registrar
3. In Cloudflare DNS:
   - Add A record: `@` → Vercel IP (76.76.21.21)
   - Add CNAME: `www` → `cname.vercel-dns.com`
4. Enable "Proxied" for CDN benefits

### Secrets to Store

```
DOMAIN=ada.dev (or chosen domain)
```

### Verification Test

```bash
# Check DNS propagation
dig ada.dev +short
# Should return Vercel/Cloudflare IPs

# Check HTTPS (after Vercel setup)
curl -I https://ada.dev
# Should return 200 or redirect
```

---

## 5. Vercel Project

### Setup URL

https://vercel.com/new

### Steps

1. Sign up or log in to Vercel
2. Import Git Repository:
   - Connect GitHub account
   - Select `ishan190425/autonomous-dev-agents`
3. Configure project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web` (when created)
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
4. Add Environment Variables (from previous steps):
   - All STRIPE\_\* variables
   - All SUPABASE\_\* variables
   - All GITHUB*\* and NEXTAUTH*\* variables
5. Deploy
6. Go to **Settings** → **Domains**
7. Add custom domain (from step 4)

### Secrets to Store

```
VERCEL_ORG_ID=team_...
VERCEL_PROJECT_ID=prj_...
```

### GitHub Secrets (for CI/CD deployment)

```bash
# Get these from Vercel Settings → General
gh secret set VERCEL_ORG_ID --body "team_..."
gh secret set VERCEL_PROJECT_ID --body "prj_..."
gh secret set VERCEL_TOKEN --body "..." # From account settings
```

### Verification Test

```bash
# Check deployment
curl -I https://ada.dev
# Should return 200

# Check preview deployments work
# Push a branch, Vercel should auto-deploy preview
```

---

## 6. Monitoring (Sentry)

### Setup URL

https://sentry.io/signup/

### Steps

1. Sign up or log in to Sentry
2. Create new project:
   - **Platform:** Next.js
   - **Project Name:** `ada-dashboard`
3. Copy DSN from setup wizard:
   - Format: `https://xxx@xxx.ingest.sentry.io/xxx`
4. Note the **Organization slug** and **Project slug**
5. Go to Settings → Auth Tokens
6. Create new token with `project:write` scope

### Secrets to Store

```
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=ada-dashboard
SENTRY_AUTH_TOKEN=sntrys_...
```

### GitHub Secrets

```bash
gh secret set SENTRY_DSN --body "https://..."
gh secret set SENTRY_ORG --body "your-org"
gh secret set SENTRY_PROJECT --body "ada-dashboard"
gh secret set SENTRY_AUTH_TOKEN --body "sntrys_..."
```

### Verification Test

```javascript
// In Next.js app (apps/web/src/pages/_app.tsx or similar)
import * as Sentry from '@sentry/nextjs';

// Trigger test error
Sentry.captureException(new Error('Infrastructure test - please ignore'));

// Check Sentry dashboard for the error
```

Or from CLI:

```bash
# Using Sentry CLI
sentry-cli send-event -m "Infrastructure test"
```

---

## Quick Reference: All Secrets

### Required Environment Variables

```bash
# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...

# Auth
GITHUB_CLIENT_ID=Ov23...
GITHUB_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://ada.dev

# Vercel (CI/CD)
VERCEL_ORG_ID=team_...
VERCEL_PROJECT_ID=prj_...
VERCEL_TOKEN=...

# Monitoring
SENTRY_DSN=https://...
SENTRY_ORG=...
SENTRY_PROJECT=ada-dashboard
SENTRY_AUTH_TOKEN=sntrys_...

# Domain
DOMAIN=ada.dev
```

### Local .env.local Template

Create `apps/web/.env.local`:

```bash
# Copy and fill in values
cp apps/web/.env.example apps/web/.env.local
```

---

## Post-Setup Verification Checklist

After completing all 6 items, verify:

- [ ] **Stripe:** Can create test customer via API
- [ ] **Supabase:** Can query REST API endpoint
- [ ] **GitHub OAuth:** Callback URL matches deployed domain
- [ ] **Domain:** DNS resolves to Vercel
- [ ] **Vercel:** Deployment succeeds, HTTPS works
- [ ] **Sentry:** Test error appears in dashboard

---

## Escalation

If any item is blocked:

1. Document the blocker in memory bank
2. Comment on #155 with specific issue
3. CEO will triage in Day 5 checkpoint (Feb 21)

---

_Created by 🛡️ Ops in Cycle 861 per Infrastructure Escalation C853._
