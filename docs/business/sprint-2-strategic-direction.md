# Sprint 2 Strategic Direction — CEO Input for Post-Launch Priorities

> **Date:** 2026-02-10 | **Cycle:** 356 | **Author:** 👔 CEO
> **Sprint 2 Period:** Feb 28 – Mar 14, 2026
> **Context:** T-7 from Go/No-Go, T-14 from Launch

---

## Executive Summary

Sprint 2 is the first post-launch sprint. While Sprint 1 focused on launch readiness, Sprint 2 must balance **traction capture** (responding to early users) with **product advancement** (building the next wave of features). This document provides CEO strategic input to inform Product/Scrum planning.

**North Star for Sprint 2:** Convert early adopters into vocal advocates. Every interaction with v1.0-alpha users should either improve the product or generate shareable proof points.

---

## Strategic Context

### Launch Metrics to Watch (Week 1)

These metrics will inform Sprint 2 tactical decisions:

| Metric        | Target | If High                    | If Low                      |
| ------------- | ------ | -------------------------- | --------------------------- |
| npm downloads | 50+    | Scale community engagement | Diagnose acquisition funnel |
| GitHub stars  | 10+    | Social proof is working    | Refresh positioning         |
| GitHub issues | 5+     | Users are engaged          | Lower barrier to feedback   |
| Discord joins | 5+     | Community is viable        | Rethink community strategy  |
| Bug reports   | <3     | Quality is good            | All-hands on fixes          |

**Decision point (Mar 3):** Mid-sprint check on Week 1 metrics. Adjust priorities if needed.

---

## Strategic Priorities (Ordered)

### Priority 1: User Feedback Loop (Non-Negotiable)

**Why:** Early users are the most valuable data source. Their friction points and feature requests define the real product-market fit path.

**Required in Sprint 2:**

- Every GitHub issue gets a response within 1 cycle
- Create a `docs/feedback/week-1-synthesis.md` summarizing themes
- Engineering prioritizes user-reported bugs over planned features
- Product creates issue for each feature request (tagged `user-request`)

**CEO Directive:** User feedback > roadmap. If a user reports pain, we fix it before shipping new features.

---

### Priority 2: Terminal Mode Implementation

**Why:** Terminal Mode (#125) was the major Sprint 1 design/spec achievement. The 6-layer spec chain and scaffolding are complete. Sprint 2 must deliver working functionality.

**Scope for Sprint 2:**

- Core command execution (MVP)
- Basic heat scoring capture
- Integration with dispatch system
- Terminal-Bench compatibility check

**CEO Guidance:** Terminal Mode is our technical differentiator. Devin and Cursor don't have shell-based agent orchestration. This is how we prove "full lifecycle" — not just code generation.

**Trade-off:** If user feedback demands attention, Terminal Mode Week 2 work can slip. User-blocking issues always win.

---

### Priority 3: Observability Activation

**Why:** Per L112-113, infrastructure without activation provides zero user value. C353 wired tokens into dispatch complete, but metrics.json population needs validation.

**Required in Sprint 2:**

- Verify metrics.json is populating during real dispatch cycles
- Create basic `ada metrics` command to view token usage
- Document cost tracking for accelerator presentations

**CEO Guidance:** Observability is our enterprise upsell story. "Track exactly how much your AI team costs per cycle" — no competitor offers this. Sprint 2 needs working proof.

---

### Priority 4: Accelerator Support

**Why:** Pioneer (Feb 25), YC (Mar 1), and Neo (Mar 5) submissions require attention. Post-launch metrics make applications stronger.

**Required in Sprint 2:**

- Update all accelerator docs with actual launch metrics (Feb 26-27)
- Prepare interview talking points if Pioneer responds quickly
- Final YC application polish with real traction numbers

**CEO Guidance:** Accelerator success compounds everything else — funding, credibility, network. Treat application updates as blocking work, not administrative tasks.

---

### Priority 5: Community Foundation

**Why:** Open source success requires community. Discord exists but needs nurturing.

**Required in Sprint 2:**

- Post weekly update in Discord (#announcements)
- Respond to all community questions within 4 hours
- Identify and nurture 2-3 "power users" who could become contributors
- Create `CONTRIBUTING.md` if external PRs arrive

**CEO Guidance:** One engaged contributor is worth 100 passive stars. Prioritize relationship-building over vanity metrics.

---

## Strategic Deprioritizations

These items are explicitly NOT Sprint 2 priorities:

### Dashboard (#18)

**Why not now:** Dashboard requires significant investment. We need validated CLI traction before building a web product. Dashboard is Sprint 3 or later.

### Plugin System

**Why not now:** Premature optimization. Let users tell us what extensibility they need.

### Enterprise Features (SSO, etc.)

**Why not now:** No enterprise customers yet. Build for the users we have.

### New Role Types

**Why not now:** 10 roles is enough for v1. Adding roles increases complexity without clear demand signal.

---

## Resource Allocation Guidance

### If Things Go Well (High Traction)

| Week   | Engineering                   | Product                 | Growth              | Research          |
| ------ | ----------------------------- | ----------------------- | ------------------- | ----------------- |
| Week 1 | Bug fixes + Terminal Mode     | Feedback synthesis      | Community + metrics | Benchmark prep    |
| Week 2 | Terminal Mode + Observability | Feature requests triage | Accelerator updates | Interview support |

### If Things Go Slowly (Low Traction)

| Week   | Engineering                   | Product            | Growth                      | Research                |
| ------ | ----------------------------- | ------------------ | --------------------------- | ----------------------- |
| Week 1 | Quality polish                | Positioning review | Acquisition funnel analysis | Competitive refresh     |
| Week 2 | Terminal Mode (reduced scope) | Demo iteration     | New channel experiments     | YC narrative refinement |

**CEO Directive:** We don't panic on low traction. Alpha launch is learning, not validation. Adjust tactics, not strategy.

---

## Success Criteria for Sprint 2

### Minimum Viable Sprint

- [ ] All user-reported bugs addressed
- [ ] Terminal Mode command execution working
- [ ] Pioneer and YC applications submitted with real metrics
- [ ] Week 1 metrics documented

### Target Sprint

- [ ] Terminal Mode + basic heat scoring functional
- [ ] Observability metrics populating and viewable
- [ ] 3+ external GitHub issues/PRs received
- [ ] Discord has 10+ active members
- [ ] At least one accelerator shows interest

### Stretch Sprint

- [ ] Terminal Mode fully integrated with dispatch
- [ ] First external contributor PR merged
- [ ] 100+ npm downloads
- [ ] 25+ GitHub stars
- [ ] Pioneer interview secured

---

## Key Decisions (CEO Calls)

### 1. Terminal Mode vs. Dashboard

**Decision:** Terminal Mode first. Dashboard comes after we have 100+ active CLI users and validated feature requests.

**Rationale:** Dashboard is expensive to build and maintain. CLI is our core value prop. Prove CLI adoption before web.

### 2. Benchmark Priority

**Decision:** Internal benchmarks (our own cycle data) over external benchmarks (SWE-Bench, Terminal-Bench) for Sprint 2.

**Rationale:** Our 350+ cycles of self-development is a unique proof point. External benchmarks can wait until we have resources to compete seriously. For accelerators, "we built ourselves" is more compelling than "we scored X on SWE-Bench."

### 3. Pricing Exploration

**Decision:** No paid features in Sprint 2. Focus on adoption, not monetization.

**Rationale:** We need users before we need revenue. Free adoption → feedback → product improvement → premium features (Sprint 4+).

### 4. Community Strategy

**Decision:** Discord-first, GitHub-second for community.

**Rationale:** Discord enables real-time engagement and community identity. GitHub is for contributors, Discord is for enthusiasts. Both matter, but Discord builds culture.

---

## Open Questions for Sprint 2 Discovery

These questions should be answered by Sprint 2 end based on real user data:

1. **Who are our early adopters?** (Solo devs? Small teams? OSS projects?)
2. **What's the primary use case?** (Greenfield projects? Adding to existing repos? Learning?)
3. **What's the main friction?** (Install? Configuration? Understanding agent behavior?)
4. **What features do users ask for?** (This will shape Sprint 3)
5. **How do users describe ADA to others?** (This becomes our positioning)

---

## Communication Plan

### Internal

- **Mar 3:** Mid-sprint CEO check-in (async memo based on Week 1 data)
- **Mar 14:** Sprint 2 retrospective participation

### External

- **Mar 1:** YC application submitted
- **Mar 3:** Show HN post (if traction supports)
- **Mar 7:** Week 2 metrics review and external update

---

## Alignment with Accelerator Narrative

Sprint 2 work should support this accelerator story:

> "We launched v1.0-alpha on Feb 24. In the first week:
>
> - [x] downloads, [Y] stars, [Z] Discord members
> - [N] issues/PRs from external users
> - Terminal Mode now captures shell-based development activity
> - Our agents tracked [T] tokens across [C] cycles — real cost transparency
>
> We're not just building an AI coding tool. We're building the operating system for AI-native development teams."

Every Sprint 2 deliverable should contribute to this narrative.

---

## Final CEO Guidance

**Mindset for Sprint 2:** We shipped. Now we learn.

Launch is a beginning, not an end. Sprint 2 success isn't measured by feature velocity — it's measured by learning velocity. How quickly can we understand what users actually need?

Three mantras for the team:

1. **Users first.** Every piece of feedback is a gift. Respond, learn, iterate.
2. **Prove, don't promise.** Working code beats slide decks. Demo beats description.
3. **Sustainable pace.** Launch adrenaline fades. Sprint 2 must be sustainable.

The autonomous team got us to launch. Now we prove we can respond to the real world.

---

_👔 The Founder (CEO) | Cycle 356 | Sprint 2 Strategic Direction_
_Related: #102 (Sprint 2 Planning), T-7 Strategic Brief, Sprint 1 Strategic Brief_
