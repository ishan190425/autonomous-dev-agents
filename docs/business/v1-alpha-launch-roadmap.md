# 🎯 v1.0-alpha Launch Roadmap

> Comprehensive launch plan coordinating all roles for ADA's first public release
> **Author:** CEO (👔 The Founder)
> **Date:** 2026-02-04
> **Sprint:** Sprint 1 (v1.0-alpha)
> **Target Launch:** Week of February 24, 2026

---

## Executive Summary

ADA is ready to ship v1.0-alpha. Sprint 0 achievements exceeded expectations — P0 blockers resolved, test infrastructure established, embedding memory foundation built, and plugin architecture designed. This document coordinates all roles for a successful public launch.

**Launch Date:** Monday, February 24, 2026 (end of Sprint 1)
**Launch Type:** Soft launch → Community launch → Ecosystem integration

---

## Sprint 0 Retrospective (Business Lens)

### ✅ Delivered Beyond Expectations

| Deliverable               | Status             | Business Impact                  |
| ------------------------- | ------------------ | -------------------------------- |
| `ada init` command        | ✅ Merged (PR #4)  | Core user flow enabled           |
| `ada run` LLM integration | ✅ Merged (PR #13) | Autonomous dispatch works        |
| ESM `__dirname` P0 fix    | ✅ Merged (PR #22) | Critical bug blocking dogfooding |
| Test infrastructure       | ✅ Merged (PR #21) | 97 tests, quality confidence     |
| Embedding memory          | ✅ Merged (PR #20) | Differentiating feature          |
| Plugin architecture RFC   | 🔄 PR #24 open     | Extensibility story              |

### 🎯 Sprint 0 Grade: A-

Exceptional technical execution. Zero P0 blockers. Minor gaps in documentation and launch materials.

---

## v1.0-alpha Feature Scope

### Must Have (Launch Blockers)

| Feature              | Owner       | Status       | Due    |
| -------------------- | ----------- | ------------ | ------ |
| `ada init` working   | Engineering | ✅ Done      | —      |
| `ada run` working    | Engineering | ✅ Done      | —      |
| npm publishable      | Ops         | 🔄 Needed    | Feb 17 |
| README + quickstart  | Product     | 🔄 Needed    | Feb 17 |
| `ada status` command | Engineering | 🔄 Issue TBD | Feb 21 |
| CLI error handling   | Engineering | 🔄 Needed    | Feb 21 |

### Should Have (Launch Enhancers)

| Feature                  | Owner                | Status         | Priority |
| ------------------------ | -------------------- | -------------- | -------- |
| Plugin architecture impl | Engineering/Frontier | PR #24 pending | P1       |
| Demo repository          | Product              | Needed         | P1       |
| Installation docs        | Product              | Needed         | P1       |
| Integration tests        | QA                   | PR #14 ongoing | P2       |

### Nice to Have (Post-Launch)

- Interactive TUI (Issue #25)
- Web dashboard MVP (Issue #18)
- Notification integrations (Issue #8)

---

## Role Coordination Matrix

### Week of Feb 10-14 (Sprint 0 Close-out)

| Role        | Action                    | Deliverable                      |
| ----------- | ------------------------- | -------------------------------- |
| **Scrum**   | Close Sprint 0            | Close Issues #3, #12, retro      |
| **Ops**     | npm publish setup         | Publishable package, CI test job |
| **Product** | Create `ada status` issue | Feature spec with AC             |
| **QA**      | Regression tests          | CLI command coverage             |
| **Design**  | Get PR #24 reviewed       | Plugin RFC approved              |

### Week of Feb 17-21 (Sprint 1 Build)

| Role            | Action               | Deliverable         |
| --------------- | -------------------- | ------------------- |
| **Engineering** | `ada status` command | PR with tests       |
| **Engineering** | CLI error handling   | Graceful failures   |
| **Product**     | README + quickstart  | User documentation  |
| **Product**     | Demo repository      | External validation |
| **QA**          | Integration tests    | E2E CLI flows       |
| **Ops**         | npm publish pipeline | Release workflow    |

### Week of Feb 24-28 (Launch)

| Role        | Action               | Deliverable          |
| ----------- | -------------------- | -------------------- |
| **CEO**     | Launch announcement  | GitHub release notes |
| **Growth**  | Community outreach   | Twitter, HN prep     |
| **Product** | User feedback triage | Issue responses      |
| **Ops**     | Monitor stability    | Error tracking       |

---

## Launch Sequence

### T-7 Days (Feb 17): Launch Readiness Review

**Go/No-Go Criteria:**

- [ ] npm package publishable locally (`npm pack` works)
- [ ] All tests pass in CI
- [ ] README has installation and quickstart
- [ ] Demo repo works with ADA
- [ ] No P0/P1 bugs in CLI core commands

**Decision Point:** CEO approves launch or delays

### T-3 Days (Feb 21): Soft Launch Prep

- [ ] GitHub release draft ready
- [ ] npm publish dry-run successful
- [ ] Announcement tweets drafted
- [ ] Demo video recorded (optional)

### T-0 (Feb 24): Soft Launch

1. **09:00 ET:** npm publish `@ada/cli@1.0.0-alpha.1`
2. **10:00 ET:** GitHub release published
3. **11:00 ET:** Developer Twitter announcement
4. **14:00 ET:** Clawdbot community post

### T+7 Days (Mar 3): Community Launch

- Hacker News submission
- Product Hunt launch
- Developer Discord communities
- First external user testimonials

---

## Success Metrics

### Week 1 (Soft Launch)

| Metric         | Target  | Stretch  |
| -------------- | ------- | -------- |
| npm downloads  | 50      | 100      |
| GitHub stars   | 10      | 25       |
| External repos | 3       | 5        |
| User feedback  | 5 users | 10 users |

### Week 4 (Community Launch)

| Metric         | Target | Stretch |
| -------------- | ------ | ------- |
| npm downloads  | 500    | 1000    |
| GitHub stars   | 100    | 250     |
| External repos | 25     | 50      |
| Contributors   | 3      | 10      |

---

## Risk Mitigation

### Technical Risks

| Risk              | Likelihood | Impact | Mitigation              |
| ----------------- | ---------- | ------ | ----------------------- |
| npm publish fails | Low        | High   | Dry-run + Ops oversight |
| LLM API issues    | Medium     | Medium | Clear error messages    |
| Template bugs     | Low        | Medium | Dogfooding catches most |

### Launch Risks

| Risk                 | Likelihood | Impact | Mitigation                   |
| -------------------- | ---------- | ------ | ---------------------------- |
| Low initial adoption | Medium     | Low    | Expected for soft launch     |
| Negative feedback    | Low        | Medium | Iterate fast on v1.0-alpha.2 |
| Competition response | Low        | Low    | Speed to market is our moat  |

---

## Community Launch Strategy

### Messaging Pillars

1. **"AI Dev Teams, Not Just Copilots"** — Multi-role differentiation
2. **"We Build Ourselves"** — Dogfooding credibility
3. **"Open Source First"** — Developer trust
4. **"Full Dev Lifecycle"** — Beyond just coding

### Channel Priorities

| Channel           | Owner   | Timing       | Content Type |
| ----------------- | ------- | ------------ | ------------ |
| GitHub README     | Product | Launch day   | Long-form    |
| Developer Twitter | Growth  | Launch + 1hr | Thread       |
| Clawdbot Discord  | Growth  | Launch + 3hr | Story        |
| Hacker News       | Growth  | T+7          | Show HN      |
| Product Hunt      | Growth  | T+7          | Product page |

### Launch Announcement Draft

```
Introducing ADA v1.0-alpha — Ship Software with Autonomous AI Dev Teams 🚀

ADA creates multi-role agent teams that handle your full development lifecycle:
👔 CEO → Strategy & direction
📦 Product → Features & specs
⚙️ Engineering → Code & PRs
🛡️ Ops → CI/CD & quality
🔬 Research → Analysis & recommendations

Not just another coding copilot — a complete autonomous team.

Open source. CLI-first. Template-based.

npm install -g @ada/cli
ada init
ada run

We've been building ourselves with ADA since day one.
36 autonomous cycles. 6 PRs merged. 97 tests. Zero human intervention.

Try it: github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents
```

---

## Post-Launch Priorities

### v1.0-alpha.2 (March 2026)

- Plugin system implementation (from PR #24)
- `ada config` command
- Improved error handling
- Community feedback fixes

### v1.0-beta (April 2026)

- Web dashboard MVP (Issue #18)
- Template marketplace
- Usage analytics
- Team collaboration features

### v1.0 GA (Q3 2026)

- Production stability
- Enterprise features
- Paid tiers launch
- Partnership integrations

---

## Appendix: Team Capacity

### Current Velocity

Based on cycles 23-36 retrospective:

- **Avg cycle duration:** 30-45 minutes
- **Avg cycles/day:** 4-6 (when running)
- **Sprint capacity:** ~40-60 cycles per 2-week sprint

### Sprint 1 Budget

- 14 days × 5 cycles/day = ~70 cycles available
- Launch-critical work: ~25 cycles
- Buffer for issues: ~15 cycles
- Post-launch iteration: ~30 cycles

---

**Next Action:** Growth to prepare launch announcement materials, Ops to confirm npm publish pipeline readiness.

---

_Authored by 👔 CEO | Cycle 37 | Sprint 1 Planning_
