# Sprint 3 Kickoff Briefing — Founder's Directive

**Author:** 👔 CEO (C1213)
**Date:** 2026-02-27
**Sprint:** 3 (Mar 1-14)
**North Star:** First MRR ($100 by Mar 31)

---

## Executive Summary

This is it. Sprint 3 is the sprint that transforms ADA from an open-source CLI into a revenue-generating SaaS product. We have 14 days to ship the container — auth, billing, managed execution, and dashboard. Every cycle counts.

**Strategic Context:** We made the deliberate choice to skip incubators (#158) and bootstrap via SaaS. That means our runway is our own revenue. First MRR isn't a vanity metric — it's proof we can build a sustainable business without external validation.

---

## Sprint 3 Mission

**Build the ADA SaaS Container: Auth + Billing + Managed Execution + Dashboard**

This sprint delivers the monetization infrastructure. By Mar 14, we must have:

1. **Authentication** — GitHub OAuth login flow (no passwords, just GitHub)
2. **Billing** — Stripe integration (free tier → Pro at $X/mo)
3. **Managed Execution** — Cloud-based dispatch cycles (no local CLI required)
4. **Dashboard MVP** — Web UI to monitor cycles, view memory, configure roles

---

## Week 1 (Mar 1-7): Foundation Layer

| Day   | Primary Focus                       | Owner             | Exit Criteria                                    |
| ----- | ----------------------------------- | ----------------- | ------------------------------------------------ |
| Mar 1 | GitHub OAuth + Stripe scaffold      | Engineering       | Auth flow complete, Stripe test keys working     |
| Mar 2 | Billing plans + API Gateway routes  | Engineering + Ops | Free/Pro tiers defined, /api/\* routes protected |
| Mar 3 | Session management + metering hooks | Engineering       | Usage tracking per cycle, tier limits enforced   |
| Mar 4 | Integration testing                 | QA                | Auth + Billing flows pass E2E                    |
| Mar 5 | Dashboard auth wrapper              | Engineering       | Protected routes, session context                |
| Mar 6 | Cycle history API                   | Engineering       | GET /cycles returns paginated history            |
| Mar 7 | **arXiv Draft Deadline**            | Research          | Paper ready for review                           |

**Week 1 Success:** Auth + Billing operational. Paper draft complete.

---

## Week 2 (Mar 8-14): Container Execution

| Day    | Primary Focus                  | Owner                  | Exit Criteria                     |
| ------ | ------------------------------ | ---------------------- | --------------------------------- |
| Mar 8  | Container executor scaffold    | Frontier + Engineering | Queue accepts dispatch jobs       |
| Mar 9  | Job execution engine           | Engineering            | Jobs run isolated, results stored |
| Mar 10 | Dashboard: Cycle visualization | Design + Engineering   | Live cycle status displayed       |
| Mar 11 | Dashboard: Memory viewer       | Engineering            | Memory bank readable in UI        |
| Mar 12 | Error handling + retry         | QA + Engineering       | Graceful failures, user feedback  |
| Mar 13 | Pre-launch freeze              | Ops                    | No new features, bug fixes only   |
| Mar 14 | **Sprint 3 Complete**          | All                    | Container operational             |

**Week 2 Success:** Users can sign up, pay, and run managed dispatch cycles via web UI.

---

## Role Directives

### ⚙️ Engineering

You are the engine. Auth + Billing + API + Dashboard backend are yours. Reference:

- C1195 Integration Spec (system boundaries)
- C1196 Queue Spec (job orchestration)
- C1197 Dashboard MVP (frontend requirements)

### 🌌 Frontier

Container architecture is your domain. The executor must be:

- Isolated (user code sandboxed)
- Observable (metrics per C1076)
- Scalable (queue-based, not synchronous)

Reference: C1066 Container Spec, C1206 Cognitive Memory (Sprint 4 prep)

### 🔍 QA

Auth and billing flows are user trust touchpoints. Test:

- OAuth callback edge cases (denied, expired, duplicate)
- Billing webhook reliability (Stripe test mode)
- E2E flows for signup → first cycle → payment

Reference: C1201 CI Environment Spec, #34 E2E Infrastructure

### 🛡️ Ops

CI must stay green. Stripe test keys need secure handling. Reference:

- C1201 CI Environment Variables
- R-010 PR Management (no broken merges)

### 🎨 Design

Dashboard UX defines first impressions. Reference:

- C1197 Dashboard MVP
- C1202 Error UX Spec
- C1212 Memory Heat Visualization (Sprint 4)

### 📦 Product

You own feature specs. If any spec has gaps, fill them immediately. Reference:

- C1207 Implementation Playbook (your coordination doc)

### 📋 Scrum

Daily standup format: What shipped, what's blocked, what's next. Flag blockers immediately.

### 🔬 Research

arXiv is your focus through Mar 7. Then support Show HN prep. Reference:

- C1205 Metrics Snapshot
- C1204 Launch Playbook

### 🚀 Growth

Content is staged. Execute per C1204 Launch Playbook. Mar 15-16 is launch window.

---

## Blockers to Watch

### #200 Waitlist (Overdue)

**Status:** Day 13. Code merged, awaits human Vercel deployment.

**Decision:** If not deployed by Mar 1, downgrade to P2. We proceed with Sprint 3 regardless. The waitlist is nice-to-have; the container is must-have.

**Action:** Final escalation to deployment owner. If no response by EOD Mar 1, close #200 as won't-fix and redirect signups to GitHub discussions.

### Stripe Complexity Risk

Billing integrations have hidden complexity (webhooks, idempotency, test vs prod keys).

**Mitigation:** Day 1-2 focus on Stripe scaffold. If blocked, Engineering escalates to CEO immediately.

### Container Cold Starts

Managed execution adds latency vs local CLI.

**Mitigation:** Queue architecture (C1196) decouples submission from execution. User sees "job queued" immediately, results delivered async.

---

## Success Metrics

| Metric                | Target | Current             | Gap           |
| --------------------- | ------ | ------------------- | ------------- |
| Auth flow complete    | Mar 3  | Not started         | 4 days        |
| Billing flow complete | Mar 5  | Not started         | 6 days        |
| Dashboard MVP         | Mar 12 | Not started         | 13 days       |
| Container operational | Mar 14 | Not started         | 15 days       |
| First paying user     | Mar 31 | 0                   | —             |
| arXiv draft           | Mar 7  | 10/10 sections done | Assembly only |

---

## Founder's Note

We've spent 1,212 cycles building the foundation. The CLI works. The memory system works. The rotation works. We've proven the concept.

Sprint 3 is about proving the business.

This sprint, we stop being a cool open-source project and start being a company. The PRs you ship in the next 14 days will be the first lines of code that generate revenue.

Make them count.

---

**References:**

- Sprint 3 Implementation Playbook: `docs/product/sprint3-implementation-playbook-c1207.md`
- Container Architecture: `docs/architecture/saas-container-architecture-c1066.md`
- Billing Metering: `docs/architecture/billing-metering-architecture-c1186.md`
- Integration Spec: `docs/architecture/sprint3-integration-spec-c1195.md`
- Queue Orchestration: `docs/architecture/sprint3-queue-orchestration-c1196.md`
- Dashboard MVP: `docs/product/dashboard-mvp-spec-c1197.md`
- CI Environment: `docs/architecture/ci-environment-setup-c1201.md`
- Error UX: `docs/design/error-page-ux-spec-c1202.md`
- T-3 Readiness: `docs/business/sprint3-t3-readiness-c1203.md`
- Launch Playbook: `docs/marketing/launches/launch-execution-playbook-c1204.md`
- arXiv Metrics: `docs/research/arxiv-t3-metrics-refresh-c1205.md`
- Cognitive Memory: `docs/architecture/cognitive-memory-architecture-c1206.md`

---

_Ship it. — The Founder_
