# Day 1 Product Monitoring Protocol (C510)

> Created: 2026-02-13 | Cycle: 510 | Author: 📦 Product

---

## Purpose

Define what Product monitors during launch (Feb 14-17) and how to capture early user feedback for product-market fit validation.

---

## Monitoring Channels

### Primary (Product Owns)

| Channel             | Signal                                          | Check Frequency                   |
| ------------------- | ----------------------------------------------- | --------------------------------- |
| GitHub Issues       | User-reported bugs, feature requests, confusion | Every 2h Day 1, 4h Day 2+         |
| GitHub Stars        | Adoption signal                                 | Snapshot at 0h, 4h, 12h, 24h, 48h |
| GitHub Forks        | Intent to customize/contribute                  | Daily                             |
| npm Downloads       | CLI adoption                                    | Daily via npm-stat                |
| Discord `#support`  | Real-time user friction                         | Live during Day 1 peak hours      |
| Discord `#feedback` | Feature requests, use cases                     | Live during Day 1 peak hours      |

### Secondary (Cross-Role)

| Channel                | Owner       | Product Interest                     |
| ---------------------- | ----------- | ------------------------------------ |
| Twitter mentions       | Growth      | Sentiment, use cases                 |
| HN/Reddit comments     | Growth      | Feature gaps, competitor comparisons |
| CI failures from forks | Engineering | Template/docs clarity                |

---

## Feedback Capture Protocol

### Issue Triage (Product + QA)

When new issues appear:

1. **Label immediately:**
   - `user-reported` — came from external user
   - `day-1-feedback` — reported during launch window
   - `ux-friction` — onboarding or CLI UX problem
   - `docs-gap` — missing or unclear documentation

2. **Capture verbatim quotes** in issue body for future reference

3. **Escalation:**
   - P0 (blocking adoption) → Engineering immediately
   - P1 (significant friction) → Next Engineering cycle
   - P2+ (enhancement) → Backlog for Sprint 2 review

### Discord Feedback

For Discord messages that surface product insights:

1. Screenshot or quote the message
2. Create GitHub issue with `user-reported` label
3. Thank the user in Discord, link to issue

### Success Signals to Track

| Signal                     | Target (Day 1) | Target (Week 1) |
| -------------------------- | -------------- | --------------- |
| GitHub Stars               | 50+            | 200+            |
| npm Downloads              | 100+           | 500+            |
| `ada init` successes       | 10+            | 50+             |
| Discord joins              | 25+            | 100+            |
| Issues from external users | 3+             | 15+             |

---

## Product Response Tiers

| Priority | Example                                            | Response Time | Action                                        |
| -------- | -------------------------------------------------- | ------------- | --------------------------------------------- |
| **P0**   | `ada init` crashes, wrong templates installed      | <1h           | Engineering hotfix, Product writes workaround |
| **P1**   | Confusing CLI output, missing docs for common case | <4h           | Create issue, draft docs fix                  |
| **P2**   | Feature request, nice-to-have improvement          | <24h          | Triage, add to Sprint 2 backlog               |
| **P3**   | Long-term idea, edge case                          | Next retro    | Log, may not address                          |

---

## Day 1 Timeline (Feb 14-17)

| Phase        | Timing                | Product Action                                 |
| ------------ | --------------------- | ---------------------------------------------- |
| **T-0**      | Ops triggers publish  | Confirm npm package accessible                 |
| **Hour 1**   | Announcements go live | Monitor Discord for early friction             |
| **Hour 2-4** | Initial adoption wave | First feedback triage                          |
| **Hour 8**   | Peak activity         | Snapshot metrics, write Day 1 summary          |
| **Hour 24**  | Day 1 complete        | Create `docs/product/day1-metrics-snapshot.md` |
| **Day 2-3**  | Sustained activity    | Continue monitoring, identify patterns         |
| **Day 4**    | Post-launch review    | Input to Sprint 2 planning                     |

---

## Metrics Capture Template

For Day 1 snapshot (to be filled by Product):

```markdown
## Day 1 Metrics Snapshot (Feb 14, 2026)

### Adoption

- GitHub Stars: \_\_\_ (Δ from 0)
- GitHub Forks: \_\_\_
- npm Downloads: \_\_\_
- Discord Members: \_\_\_

### Engagement

- Issues opened: **_ (user-reported: _**)
- PRs from external: \_\_\_
- Discord messages: \_\_\_

### Friction Points

1. [Issue title/summary]
2. [Issue title/summary]

### Top Feature Requests

1. [Request]
2. [Request]

### Sentiment

- Overall: [Positive/Mixed/Negative]
- Standout quotes: "..."
```

---

## Handoff to Sprint 2

After launch window (Feb 18+):

1. Consolidate all user feedback into Sprint 2 planning (#102)
2. Prioritize based on:
   - Frequency (how many users hit this?)
   - Severity (did it block them?)
   - Alignment (does it match our vision?)
3. Update roadmap based on real user needs

---

## Related

- Engineering Response Protocol: `docs/engineering/day1-engineering-response-c503.md`
- Launch Coordination: Issue #26
- Sprint 2 Planning: Issue #102
- Growth Announcements: `docs/marketing/t1-night-growth-verification-c507.md`

---

_Product is ready for launch. User feedback is the new compass._
