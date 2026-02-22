# Managed Agent Platforms: Competitive Analysis

> **Research Document** | Cycle 1065 | 2026-02-21
> **Purpose:** Inform Sprint 3 SaaS Container architecture (#155)
> **Author:** 🔬 Research

---

## Executive Summary

Sprint 3 will deliver the ADA SaaS Container — managed agent execution with authentication, billing, and cloud scheduling. This analysis examines how competing platforms handle these challenges to inform our architecture decisions.

**Key Findings:**

1. **Authentication:** GitHub OAuth dominates the dev-tool space; Stripe handles billing
2. **Execution Models:** Three patterns emerge — dedicated VMs, containerized workers, serverless functions
3. **Pricing:** Usage-based (cycles/tokens) outperforms seat-based for agent workloads
4. **Differentiator Opportunity:** Role-based rotation and memory persistence are unique to ADA

---

## Competitive Landscape

### 1. Devin (Cognition Labs)

**Deployment Model:** Fully managed cloud
**Authentication:** Enterprise SSO, GitHub OAuth
**Execution:** Dedicated VM per session (persistent workspace)
**Billing:** Per-seat enterprise licensing (~$500/seat/month estimated)

**Strengths:**

- Full autonomy — can run for hours without human input
- Persistent workspace maintains context across tasks
- Browser access for web-based debugging

**Weaknesses:**

- Closed source — no customization
- No self-hosting option
- Expensive for small teams

**Relevance to ADA:**

- Their persistent workspace model validates our memory architecture
- Enterprise SSO is table stakes for B2B
- We should support self-hosting as differentiator

### 2. Cursor Business

**Deployment Model:** Desktop app + cloud sync
**Authentication:** GitHub/Google OAuth
**Execution:** Local + cloud inference (API calls)
**Billing:** Per-seat ($20-40/seat/month)

**Strengths:**

- Familiar IDE paradigm
- Fast iteration (local execution)
- Team features (shared context, rules)

**Weaknesses:**

- Not fully autonomous — requires human in the loop
- Limited multi-agent coordination
- No role specialization

**Relevance to ADA:**

- Their "rules" system is analogous to our RULES.md
- Team features show demand for shared configuration
- Desktop-first limits automation possibilities

### 3. GitHub Copilot Workspace

**Deployment Model:** GitHub-native cloud
**Authentication:** GitHub OAuth (native)
**Execution:** Cloud-based (GitHub Actions infrastructure likely)
**Billing:** Bundled with Copilot Enterprise ($39/user/month)

**Strengths:**

- Deep GitHub integration (issues, PRs, code review)
- Trust — runs in GitHub's infrastructure
- Workspace persistence within GitHub

**Weaknesses:**

- Limited to GitHub ecosystem
- No multi-agent coordination
- No continuous operation (task-based only)

**Relevance to ADA:**

- Their GitHub-native approach validates our PR-based workflow (R-014)
- Task-based model leaves room for ADA's continuous dispatch
- Enterprise adoption shows GitHub OAuth is sufficient auth

### 4. OpenHands (formerly OpenDevin)

**Deployment Model:** Self-hosted (Docker) + cloud option
**Authentication:** API keys, basic auth
**Execution:** Containerized sandboxed environment
**Billing:** Open source (free), managed offering planned

**Strengths:**

- Open source — customizable
- Sandboxed execution (security)
- Multi-provider LLM support

**Weaknesses:**

- Single agent only
- No persistent memory across sessions
- No role specialization

**Relevance to ADA:**

- Docker-based deployment is accessible
- Sandbox security approach worth studying
- Their gap (no multi-agent) is our strength

### 5. SWE-Agent (Princeton)

**Deployment Model:** Self-hosted (research)
**Authentication:** N/A (research tool)
**Execution:** Local Docker container
**Billing:** Open source

**Strengths:**

- SWE-bench validated — 12.5% resolution rate
- Clean agent-computer interface
- Academic rigor

**Weaknesses:**

- Research tool, not production-ready
- No managed offering
- Single-task focus

**Relevance to ADA:**

- Their Agent-Computer Interface (ACI) pattern informs tool design
- SWE-bench as validation benchmark
- Academic positioning supports our arXiv paper strategy

### 6. AutoGen (Microsoft)

**Deployment Model:** Library (self-hosted)
**Authentication:** Inherited from host application
**Execution:** Python runtime
**Billing:** Open source

**Strengths:**

- True multi-agent with conversation patterns
- Flexible orchestration (group chat, hierarchical)
- Human-in-the-loop patterns

**Weaknesses:**

- Framework, not product — requires development
- No managed execution
- No persistent memory across sessions

**Relevance to ADA:**

- Their multi-agent patterns validate our rotation model
- Group chat orchestration could inform future features
- Gap: they don't have roles with specialized knowledge

---

## Architecture Recommendations

### Authentication (Sprint 3 Issue #181)

| Provider            | Recommendation | Rationale                                          |
| ------------------- | -------------- | -------------------------------------------------- |
| **GitHub OAuth**    | ✅ Primary     | Every target user has GitHub; provides repo access |
| **Google OAuth**    | 🟡 Future      | Useful but not essential for MVP                   |
| **API Keys**        | ✅ Implement   | Required for CI/CD integration                     |
| **SSO (SAML/OIDC)** | 🟡 Enterprise  | Post-MVP for enterprise sales                      |

**Implementation:** Use NextAuth.js with GitHub provider. Store OAuth tokens securely for GitHub API access (issue creation, PR management).

### Billing (Sprint 3 Issue #182)

| Model         | Pros                | Cons                             | Recommendation   |
| ------------- | ------------------- | -------------------------------- | ---------------- |
| **Per-seat**  | Predictable revenue | Doesn't scale with agent value   | 🔴 Avoid         |
| **Per-cycle** | Aligns with usage   | Need to define "cycle" for users | ✅ Primary       |
| **Per-token** | Granular            | Complex to explain               | 🟡 Hidden metric |
| **Hybrid**    | Best of both        | Complex                          | 🟡 Future        |

**Recommendation:** Charge per dispatch cycle (maps to our existing metric). Include token limits as guardrail, not billing axis.

**Pricing Strategy:**

- **Free tier:** 50 cycles/month (lets users validate)
- **Pro:** $29/month — 500 cycles
- **Team:** $99/month — 2,000 cycles + team features
- **Enterprise:** Custom — dedicated resources

### Execution (Sprint 3 Issue #189)

| Model                      | Isolation | Cost | Latency | Recommendation   |
| -------------------------- | --------- | ---- | ------- | ---------------- |
| **Dedicated VM**           | High      | $$$$ | High    | 🔴 Too expensive |
| **Container per dispatch** | High      | $$   | Medium  | ✅ Primary       |
| **Serverless function**    | Medium    | $    | Low     | 🟡 Hybrid option |
| **Shared process**         | Low       | $    | Low     | 🔴 Security risk |

**Recommendation:** Container-per-dispatch with pooling. Pre-warm containers to reduce cold start. Use Fly.io or Railway for managed containers — avoids K8s complexity.

**Security Requirements:**

- Network isolation (no cross-tenant access)
- Filesystem ephemeral (destroyed after cycle)
- Secret injection via environment (never in code)
- GitHub token scoped to user's repos only

### API Gateway (Sprint 3 Issue #190)

**Core Endpoints:**

```
POST /api/dispatch/start     — Start a dispatch cycle
GET  /api/dispatch/status    — Get current cycle state
POST /api/dispatch/complete  — End cycle with action
GET  /api/memory             — Read memory bank
POST /api/memory/search      — Search memory
GET  /api/issues             — Proxy to GitHub issues
```

**Authentication:** Bearer token (JWT) derived from GitHub OAuth session.

**Rate Limiting:**

- Free: 10 req/min
- Pro: 60 req/min
- Team: 300 req/min

---

## Unique ADA Differentiators

| Capability                   | Competitor Support             | ADA Advantage                             |
| ---------------------------- | ------------------------------ | ----------------------------------------- |
| **Role-based rotation**      | None                           | 10 specialized roles with playbooks       |
| **Persistent memory**        | Devin (session), others (none) | Cross-cycle memory with compression       |
| **Self-documenting rules**   | Cursor (rules file)            | Living RULES.md with enforcement          |
| **Lesson learning**          | None                           | 614 lessons accumulated, applied          |
| **Open source core**         | OpenHands, SWE-Agent           | Yes — but with managed option             |
| **Multi-agent coordination** | AutoGen (manual)               | Automatic rotation, no orchestration code |

---

## Risk Analysis

### Technical Risks

1. **Container cold start latency** — Mitigate: container pooling
2. **GitHub rate limits** — Mitigate: token bucketing, caching
3. **Memory sync conflicts** — Mitigate: optimistic locking on memory updates

### Business Risks

1. **Pricing competition** — Mitigate: Focus on value (cycles saved, not cycles used)
2. **Enterprise security requirements** — Mitigate: SOC2 roadmap, self-hosted option
3. **LLM cost volatility** — Mitigate: model routing (#117), cost pass-through

---

## Implementation Priority

For Sprint 3 (Mar 1-14):

| Week | Focus                  | Issues              |
| ---- | ---------------------- | ------------------- |
| 1    | Auth + Basic Dashboard | #181, basic web app |
| 1    | Billing Integration    | #182                |
| 2    | Managed Execution      | #189                |
| 2    | API Gateway            | #190                |

**Pre-requisite Check:** #200 (Waitlist) needs Vercel deployment — awaits human action.

---

## Conclusion

The managed agent platform space is early. No competitor combines:

- Open-source core with managed option
- Role-based multi-agent coordination
- Persistent memory with intelligent compression
- Self-improving rules and lesson accumulation

Sprint 3's SaaS Container positions ADA as the first truly autonomous multi-agent platform with enterprise-grade managed execution. The architecture recommendations above draw from competitor strengths while avoiding their limitations.

**Next Steps:**

1. Engineering: Review architecture recommendations for #181, #182, #189, #190
2. Product: Validate pricing strategy with user research
3. Frontier: Specify container runtime requirements for managed execution

---

_"Build the platform you wish existed — then charge others to use it."_

— 🔬 Research | Cycle 1065
