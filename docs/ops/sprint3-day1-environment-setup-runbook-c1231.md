# Sprint 3 Day 1 Environment Setup Runbook

> Human-actionable checklist for provisioning all Sprint 3 secrets and test accounts
> **Created:** 2026-02-27 | **Cycle:** 1231 | **Author:** 🛡️ The Guardian
> **Execute By:** March 1, 2026 (Sprint 3 Day 1)
> **Estimated Time:** 45-60 minutes

---

## Overview

Sprint 3 introduces GitHub OAuth, Stripe billing, and managed execution. Each requires external credentials that must be provisioned by a human with admin access. This runbook provides step-by-step instructions for setting up all required secrets.

### Reference Documents

- CI Enhancement Spec: `docs/ops/sprint3-ci-enhancement-spec-c1111.md`
- Container Security: `docs/research/container-security-isolation-patterns-c1225.md`
- Billing Infrastructure: PR #259 (merged C1230)

### Prerequisites

- [ ] GitHub repository admin access
- [ ] Stripe account access (test mode)
- [ ] Access to create GitHub OAuth Apps

---

## Part 1: GitHub OAuth Setup (15 min)

### Step 1.1: Create Test OAuth App

1. Go to: https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name:** `ADA Test App`
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
4. Click **"Register application"**
5. Copy the **Client ID** (starts with `Iv...`)
6. Click **"Generate a new client secret"**
7. Copy the **Client Secret** (copy immediately — shown only once)

### Step 1.2: Add OAuth Secrets to GitHub

1. Go to: https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/settings/secrets/actions
2. Click **"New repository secret"**
3. Add these secrets:

| Secret Name                 | Value                         | Source         |
| --------------------------- | ----------------------------- | -------------- |
| `GITHUB_CLIENT_ID_TEST`     | `Iv...` (from Step 1.1)       | OAuth App page |
| `GITHUB_CLIENT_SECRET_TEST` | Client secret (from Step 1.1) | OAuth App page |

### Step 1.3: Verify OAuth Secrets

```bash
# Verify secrets are set (from GitHub CLI)
gh secret list -R RATHI-CAPITAL-VENTURES/autonomous-dev-agents | grep GITHUB_CLIENT
```

Expected output:

```
GITHUB_CLIENT_ID_TEST        Updated 2026-03-01
GITHUB_CLIENT_SECRET_TEST    Updated 2026-03-01
```

---

## Part 2: Stripe Test Mode Setup (20 min)

### Step 2.1: Access Stripe Dashboard

1. Go to: https://dashboard.stripe.com
2. Toggle to **"Test mode"** (top-right switch)
3. Verify "TEST DATA" badge is visible

### Step 2.2: Get API Keys

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy:
   - **Publishable key:** `pk_test_...`
   - **Secret key:** Click "Reveal test key" → `sk_test_...`

### Step 2.3: Create Webhook Endpoint

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Enter:
   - **Endpoint URL:** `https://your-staging-url.vercel.app/api/webhooks/stripe`
     - OR for local: Use Stripe CLI (see Step 2.5)
   - **Events to listen:** Select these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Click **"Add endpoint"**
5. Copy the **Signing secret:** `whsec_...`

### Step 2.4: Create Test Products (Optional for E2E)

For E2E tests that verify checkout:

1. Go to: https://dashboard.stripe.com/test/products
2. Click **"Add product"**
3. Create test products:

| Product Name   | Price      | Billing   | Price ID            |
| -------------- | ---------- | --------- | ------------------- |
| ADA Hobby Tier | $0/month   | Recurring | (copy after create) |
| ADA Pro Tier   | $29/month  | Recurring | (copy after create) |
| ADA Team Tier  | $99/month  | Recurring | (copy after create) |
| ADA Enterprise | $499/month | Recurring | (copy after create) |

### Step 2.5: Add Stripe Secrets to GitHub

1. Go to: https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/settings/secrets/actions
2. Add these secrets:

| Secret Name                   | Value         | Source           |
| ----------------------------- | ------------- | ---------------- |
| `STRIPE_SECRET_KEY_TEST`      | `sk_test_...` | API Keys page    |
| `STRIPE_PUBLISHABLE_KEY_TEST` | `pk_test_...` | API Keys page    |
| `STRIPE_WEBHOOK_SECRET_TEST`  | `whsec_...`   | Webhook endpoint |

### Step 2.6: Verify Stripe Secrets

```bash
# Verify secrets are set
gh secret list -R RATHI-CAPITAL-VENTURES/autonomous-dev-agents | grep STRIPE
```

Expected output:

```
STRIPE_SECRET_KEY_TEST         Updated 2026-03-01
STRIPE_PUBLISHABLE_KEY_TEST    Updated 2026-03-01
STRIPE_WEBHOOK_SECRET_TEST     Updated 2026-03-01
```

### Step 2.7: Install Stripe CLI (Local Development)

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux (Ubuntu/Debian)
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe

# Login to Stripe
stripe login

# Test webhook forwarding (use during local dev)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Part 3: Test Database Setup (10 min)

### Step 3.1: Generate JWT Secret

```bash
# Generate a secure random secret for test JWT signing
openssl rand -hex 32
```

Copy the output (64-character hex string).

### Step 3.2: Add Database/Auth Secrets

| Secret Name         | Value            | Purpose              |
| ------------------- | ---------------- | -------------------- |
| `TEST_JWT_SECRET`   | (from Step 3.1)  | JWT signing in tests |
| `TEST_DATABASE_URL` | `file:./test.db` | SQLite for E2E tests |

Note: For production, we'll use Supabase. For CI tests, SQLite is faster and simpler.

---

## Part 4: Local Environment Setup

### Step 4.1: Create .env.test.local

Create `apps/web/.env.test.local` (DO NOT COMMIT):

```bash
# OAuth Mock (for local testing without real GitHub)
GITHUB_OAUTH_MOCK=true
GITHUB_CLIENT_ID=test-client-id
GITHUB_CLIENT_SECRET=test-client-secret

# Stripe Test Mode
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Database
DATABASE_URL=file:./dev.db

# Auth
JWT_SECRET=your-64-char-hex-secret-here
NEXTAUTH_SECRET=your-64-char-hex-secret-here
NEXTAUTH_URL=http://localhost:3000
```

### Step 4.2: Verify .gitignore

Ensure `.env.test.local` is in `.gitignore`:

```bash
grep -q ".env.test.local" apps/web/.gitignore || echo ".env.test.local" >> apps/web/.gitignore
```

---

## Part 5: Verification Checklist

### GitHub Secrets Verification

Run this from the repository root:

```bash
# List all secrets
gh secret list -R RATHI-CAPITAL-VENTURES/autonomous-dev-agents

# Expected output should include:
# GITHUB_CLIENT_ID_TEST
# GITHUB_CLIENT_SECRET_TEST
# STRIPE_SECRET_KEY_TEST
# STRIPE_PUBLISHABLE_KEY_TEST
# STRIPE_WEBHOOK_SECRET_TEST
# TEST_JWT_SECRET
# TEST_DATABASE_URL
```

### Local Environment Verification

```bash
# Verify Stripe CLI is working
stripe --version

# Verify Stripe login
stripe config --list

# Test webhook forwarding (start in one terminal)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

### CI Dry Run

After adding secrets, trigger a CI run to verify:

```bash
# Push an empty commit to trigger CI
git commit --allow-empty -m "chore: trigger CI for secrets verification"
git push

# Check CI status
gh run watch
```

---

## Rollback Procedures

### If OAuth Secrets Are Wrong

1. Go to GitHub OAuth App settings
2. Regenerate client secret
3. Update `GITHUB_CLIENT_SECRET_TEST` in GitHub Secrets
4. Delete old OAuth App if needed, create new one

### If Stripe Secrets Are Wrong

1. Go to Stripe Dashboard → API Keys
2. Roll secret key (creates new key, old one still works for 24h)
3. Update `STRIPE_SECRET_KEY_TEST` in GitHub Secrets
4. For webhooks: create new endpoint, copy new signing secret

### If CI Still Fails

1. Check GitHub Actions logs for specific error
2. Verify secret names match exactly (case-sensitive)
3. Verify no extra whitespace in secret values
4. Re-run failed job after fixing

---

## Timeline & Ownership

| Task                   | Day   | Owner | Status |
| ---------------------- | ----- | ----- | ------ |
| GitHub OAuth setup     | Mar 1 | Human | [ ]    |
| Stripe test mode setup | Mar 1 | Human | [ ]    |
| Add secrets to GitHub  | Mar 1 | Human | [ ]    |
| Verify secrets in CI   | Mar 1 | Ops   | [ ]    |
| Local env setup        | Mar 1 | Eng   | [ ]    |
| First auth E2E test    | Mar 3 | QA    | [ ]    |
| First billing E2E test | Mar 5 | QA    | [ ]    |

---

## Summary Checklist

Before Sprint 3 Day 1 kickoff, verify:

- [ ] GitHub OAuth App created (test environment)
- [ ] `GITHUB_CLIENT_ID_TEST` secret added
- [ ] `GITHUB_CLIENT_SECRET_TEST` secret added
- [ ] Stripe test mode API keys obtained
- [ ] `STRIPE_SECRET_KEY_TEST` secret added
- [ ] `STRIPE_PUBLISHABLE_KEY_TEST` secret added
- [ ] Stripe webhook endpoint created
- [ ] `STRIPE_WEBHOOK_SECRET_TEST` secret added
- [ ] `TEST_JWT_SECRET` generated and added
- [ ] `TEST_DATABASE_URL` added
- [ ] Stripe CLI installed locally
- [ ] `.env.test.local` template created
- [ ] CI dry run successful

**Total secrets required: 7**

---

## Related Issues

- **#181** — Auth: GitHub OAuth Integration
- **#182** — Billing: Stripe Subscription Management (CLOSED, PR #259 merged)
- **#34** — E2E Testing Infrastructure
- **#189** — Managed Agent Execution

---

**Next:** After completing this runbook, Ops will verify CI passes with all secrets. Engineering begins auth implementation per `docs/architecture/sprint3-implementation-playbook-c1207.md`.
