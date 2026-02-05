# Budget-Aware Infrastructure Access

> Research document evaluating approaches for letting autonomous agents provision real infrastructure with spending guardrails.

**Author:** 🔬 Research (The Scout)
**Issue:** #44
**Date:** 2026-02-05
**Status:** Initial Analysis

---

## Executive Summary

Autonomous dev agents can write code, manage issues, and create PRs—but they hit a wall when real money is involved. Deploying to Vercel, registering domains, or spinning up databases all require financial transactions that agents currently can't execute safely.

This research evaluates existing solutions and proposes a **Budget-Aware Infrastructure Framework** for ADA that enables agents to provision resources within controlled spending limits.

**Key Finding:** The infrastructure exists today to give agents safe financial access. The challenge is integration and UX, not technology.

---

## 1. Problem Analysis

### The Infrastructure Gap

| What Agents Can Do Today | What They Can't Do   |
| ------------------------ | -------------------- |
| Write deployment configs | Actually deploy      |
| Configure CI/CD          | Pay for compute      |
| Design architecture      | Provision resources  |
| Plan infrastructure      | Purchase services    |
| Estimate costs           | Execute transactions |

### Why This Matters for ADA

ADA's vision is autonomous dev teams that ship software end-to-end. Without infrastructure access, agents are perpetually blocked on human intervention for:

- **First deployment** — Vercel/Netlify/AWS setup
- **Database provisioning** — PlanetScale, Neon, Supabase
- **Domain registration** — Namecheap, Cloudflare
- **Third-party services** — Stripe, SendGrid, Twilio
- **Compute scaling** — Lambda, Railway, Fly.io

Each of these requires credentials + payment method + approval workflow.

---

## 2. Solution Landscape Analysis

### 2.1 Virtual Card Providers

#### Privacy.com

**Overview:** Consumer-focused virtual cards with per-merchant limits.

| Aspect                      | Assessment                          |
| --------------------------- | ----------------------------------- |
| **Per-card limits**         | ✅ Yes, dollar amount per merchant  |
| **API access**              | ⚠️ Limited (primarily consumer app) |
| **Programmatic creation**   | ⚠️ No documented API                |
| **Merchant locking**        | ✅ Yes, lock card to first merchant |
| **Real-time notifications** | ✅ Via app                          |
| **Instant freeze**          | ✅ Yes                              |

**ADA Fit:** ⭐⭐☆☆☆ — Good for manual setup, poor for automation.

#### Brex

**Overview:** Corporate card platform with comprehensive API and spend controls.

| Aspect                    | Assessment                    |
| ------------------------- | ----------------------------- |
| **Per-card limits**       | ✅ Yes, highly configurable   |
| **API access**            | ✅ Extensive REST API         |
| **Programmatic creation** | ✅ Create cards via API       |
| **Category restrictions** | ✅ MCC-based blocking         |
| **Real-time webhooks**    | ✅ Transaction events         |
| **Approval workflows**    | ✅ Built-in expense approvals |

**ADA Fit:** ⭐⭐⭐⭐☆ — Excellent API, but requires business account with revenue requirements.

```typescript
// Brex API example
const card = await brex.cards.create({
  card_name: 'ADA-Vercel-Deploys',
  spend_limit: { amount: 5000, currency: 'USD' },
  spend_limit_duration: 'MONTHLY',
  card_type: 'VIRTUAL',
  mcc_group: ['COMPUTER_SERVICES'],
});
```

#### Ramp

**Overview:** AI-powered expense management with programmatic controls.

| Aspect                     | Assessment                    |
| -------------------------- | ----------------------------- |
| **Per-card limits**        | ✅ Yes, with smart alerts     |
| **API access**             | ✅ Good API coverage          |
| **Programmatic creation**  | ✅ Virtual cards via API      |
| **AI anomaly detection**   | ✅ Built-in spending AI       |
| **Approval workflows**     | ✅ Configurable thresholds    |
| **Accounting integration** | ✅ QuickBooks, Xero, NetSuite |

**ADA Fit:** ⭐⭐⭐⭐⭐ — Best balance of API + AI + controls. Ideal for autonomous agents.

#### Stripe Issuing

**Overview:** Programmatic card creation for platforms.

| Aspect                      | Assessment                         |
| --------------------------- | ---------------------------------- |
| **Per-card limits**         | ✅ Yes, spending controls API      |
| **API access**              | ✅ Excellent, Stripe-quality       |
| **Programmatic creation**   | ✅ Core feature                    |
| **Real-time authorization** | ✅ Webhook-based approve/decline   |
| **Multi-currency**          | ✅ Global support                  |
| **Custom logic**            | ✅ Authorize based on any criteria |

**ADA Fit:** ⭐⭐⭐⭐⭐ — Most flexible, but requires building approval logic ourselves.

```typescript
// Stripe Issuing real-time authorization
app.post('/authorize', async (req, res) => {
  const auth = req.body.data.object;

  // Check ADA's budget rules
  const approved = await checkBudget({
    amount: auth.pending_request.amount,
    merchant: auth.merchant_data.name,
    category: auth.merchant_data.category,
    agent: auth.metadata.agent_role,
  });

  res.json({ approved });
});
```

### 2.2 Cloud Budget Controls

#### AWS Budgets + Service Control Policies

**Overview:** Native AWS spending controls with policy-based restrictions.

| Feature                    | Description                       |
| -------------------------- | --------------------------------- |
| **Budgets**                | Alert thresholds, action triggers |
| **SCPs**                   | Service-level deny policies       |
| **Cost Anomaly Detection** | ML-based spike detection          |
| **Reserved Capacity**      | Pre-paid cost capping             |

**Limitations:**

- Budgets are alerting-only by default (actions require Lambda)
- SCPs are organization-level, not project-level
- No cross-cloud aggregation

**ADA Integration:**

```yaml
# aws-budget.yaml
Budgets:
  - BudgetName: ada-project-alpha
    BudgetLimit:
      Amount: 100
      Unit: USD
    BudgetType: COST
    TimePeriod:
      Start: 2026-02-01
      End: 2026-03-01
    NotificationsWithSubscribers:
      - Notification:
          NotificationType: ACTUAL
          ComparisonOperator: GREATER_THAN
          Threshold: 80
        Subscribers:
          - SubscriptionType: SNS
            Address: arn:aws:sns:us-east-1:123:ada-budget-alerts
```

#### Vercel Spend Management

**Overview:** Per-project spending limits on Vercel platform.

| Feature              | Assessment                            |
| -------------------- | ------------------------------------- |
| **Project budgets**  | ✅ Yes, configurable                  |
| **Hard caps**        | ⚠️ Soft by default (needs Enterprise) |
| **API control**      | ✅ Via Vercel API                     |
| **Usage visibility** | ✅ Real-time dashboard                |

**ADA Integration:** Good for Vercel-specific limits, but doesn't solve multi-provider problem.

### 2.3 Infrastructure-as-Code Cost Estimation

#### Infracost

**Overview:** Cloud cost estimates from Terraform/Pulumi code.

| Feature                  | Description                     |
| ------------------------ | ------------------------------- |
| **Pre-deploy estimates** | See costs before apply          |
| **PR comments**          | Cost diff on infrastructure PRs |
| **Policy-as-code**       | Reject PRs over budget          |
| **Multi-cloud**          | AWS, Azure, GCP                 |

**ADA Integration:** ⭐⭐⭐⭐⭐ — Perfect for pre-approval workflow.

```yaml
# .infracost.yml
version: 0.1
projects:
  - path: infra/production
    usage_file: infra/usage.yml

policies:
  - name: monthly-limit
    description: Reject changes that increase monthly cost by >$50
    resource_type: '*'
    check:
      monthly_cost_increase: { less_than: 50 }
```

#### Pulumi Cost Policies

**Overview:** Native cost guardrails in Pulumi.

```typescript
// Pulumi CrossGuard policy
new PolicyPack('ada-budget-policies', {
  policies: [
    {
      name: 'max-monthly-cost',
      description: 'Reject stacks costing >$100/month',
      enforcementLevel: 'mandatory',
      validateStack: (args, reportViolation) => {
        if (args.getConfig('estimatedMonthlyCost') > 100) {
          reportViolation('Stack exceeds $100/month budget');
        }
      },
    },
  ],
});
```

---

## 3. Risk Assessment by Service Category

| Category                         | Risk                    | Mitigation Strategy                                     |
| -------------------------------- | ----------------------- | ------------------------------------------------------- |
| **Compute** (Vercel, Lambda)     | Medium — can spike      | Per-invocation limits, budget alerts at 50%/80%         |
| **Domains**                      | Low — one-time          | Auto-approve under $20, block premium domains           |
| **Databases**                    | Medium — scaling traps  | Start with smallest tier, require approval for upgrades |
| **Email/SMS** (SendGrid, Twilio) | Medium — volume-based   | Per-message caps, daily limits                          |
| **AI/ML APIs**                   | High — token explosions | Per-request limits, model-specific caps                 |
| **Payments** (Stripe)            | High — revenue impact   | Never auto-approve, always human review                 |
| **Storage**                      | Low-Medium              | Bucket size limits, lifecycle policies                  |

---

## 4. Proposed Architecture

### 4.1 ADA Budget Controller

A new `@ada/budget` package that:

1. **Tracks spending** across all connected services
2. **Enforces limits** per-agent, per-project, per-service
3. **Routes approvals** based on thresholds
4. **Logs audit trail** of all financial actions

```
┌─────────────────────────────────────────────────────┐
│                   ADA Agent Team                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │ CEO │ │ Eng │ │ Ops │ │ QA  │ │ ... │          │
│  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘          │
│     │       │       │       │       │               │
│     └───────┴───────┴───────┴───────┘               │
│                     │                                │
│            ┌────────▼────────┐                      │
│            │  Budget Controller │                    │
│            │  ┌─────────────┐ │                      │
│            │  │ Spend Track │ │                      │
│            │  │ Limit Check │ │                      │
│            │  │ Approval    │ │                      │
│            │  │ Audit Log   │ │                      │
│            │  └─────────────┘ │                      │
│            └────────┬────────┘                      │
└─────────────────────┼───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
   │  Ramp/  │  │ AWS/GCP │  │ Vercel/ │
   │  Brex   │  │ Budgets │  │ Railway │
   │ (Cards) │  │         │  │         │
   └─────────┘  └─────────┘  └─────────┘
```

### 4.2 Configuration Schema

```yaml
# ada.config.yaml
infrastructure:
  enabled: true

  budget:
    monthly_limit: 500
    per_action_limit: 50
    alert_thresholds: [50, 80, 95]

  approval:
    auto_approve_under: 10
    require_human_above: 100
    categories_always_human: [payments, ai_apis]

  payment:
    provider: ramp # or: brex, stripe_issuing, privacy
    card_id: ${INFRA_CARD_ID}

  services:
    vercel:
      enabled: true
      project_limit: 50

    aws:
      enabled: true
      regions: [us-east-1, us-west-2]
      services: [lambda, s3, dynamodb, cloudfront]
      monthly_limit: 200

    domains:
      enabled: true
      registrar: cloudflare
      max_price: 20
      auto_approve: true

    database:
      enabled: true
      providers: [planetscale, neon]
      tier_limit: free # or: hobby, pro (requires approval)

    stripe:
      enabled: false # Requires explicit human setup
```

### 4.3 Approval Flow

```
Agent requests: "Deploy to Vercel ($12/month)"
           │
           ▼
┌─────────────────────┐
│  Budget Controller  │
│  1. Check limits    │
│  2. Check category  │
│  3. Check history   │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
   <$10        >=$10
    │             │
    ▼             ▼
┌────────┐  ┌──────────────┐
│ AUTO   │  │ APPROVAL     │
│ APPROVE│  │ REQUIRED     │
└────────┘  │              │
            │ → Slack/TG   │
            │ → Email      │
            │ → Dashboard  │
            └──────────────┘
```

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Sprint 2)

- [ ] `@ada/budget` package scaffold
- [ ] Spending tracker interface
- [ ] Configuration schema
- [ ] Audit log format

### Phase 2: Card Integration (Sprint 3)

- [ ] Ramp API integration
- [ ] Virtual card creation flow
- [ ] Transaction webhooks
- [ ] Real-time balance tracking

### Phase 3: Cloud Providers (Sprint 4)

- [ ] AWS Budgets integration
- [ ] Vercel spending API
- [ ] Multi-provider aggregation
- [ ] Cost estimation (Infracost)

### Phase 4: Approval Workflows (Sprint 5)

- [ ] Human-in-the-loop integration (Issue #31)
- [ ] Slack/Telegram approval buttons
- [ ] Dashboard approval UI
- [ ] Audit trail and reporting

---

## 6. Recommendations

### Immediate (v1.0-alpha)

1. **Don't block launch** — Budget-aware infra is a v1.1+ feature
2. **Document the gap** — Be transparent that agents can't provision yet
3. **Manual workaround** — Provide guides for human-provisioned infrastructure

### Short-term (v1.1)

1. **Start with Ramp** — Best API + AI anomaly detection + startup-friendly
2. **Vercel-first** — Most common deployment target for dev teams
3. **Conservative defaults** — $10 auto-approve, $50 per-action limit

### Long-term (v2.0+)

1. **Stripe Issuing** — Build our own real-time authorization for maximum control
2. **Multi-cloud budgets** — Aggregate AWS + GCP + Azure spending
3. **AI cost optimization** — Agents that reduce infrastructure costs

---

## 7. Open Questions

1. **Multi-tenant isolation** — How do we handle multiple projects with separate budgets on one ADA instance?
2. **Credential rotation** — How often should virtual cards be rotated?
3. **Rollback on failure** — If a deployment fails, how do we handle partial charges?
4. **International currencies** — Do we normalize to USD or support multi-currency budgets?

---

## References

- [Brex Developer API](https://developer.brex.com/)
- [Ramp API Documentation](https://docs.ramp.com/api)
- [Stripe Issuing](https://stripe.com/docs/issuing)
- [Infracost](https://www.infracost.io/)
- [AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)
- Issue #31 — Human-in-the-Loop
- Issue #9 — Deployment monitoring

---

_🔬 Research | Cycle 69 | 2026-02-05_
