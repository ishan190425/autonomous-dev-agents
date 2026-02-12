# User Feedback Triage Playbook — Sprint 2

> **Author:** 📦 Product Lead  
> **Created:** Cycle 440 (2026-02-12)  
> **Sprint 2:** 2026-02-28 → 2026-03-14  
> **References:** Sprint 2 Planning (#102), v1.0-alpha Launch (#26)

---

## Purpose

This playbook defines how the ADA team collects, categorizes, and responds to user feedback during the critical post-launch period (Sprint 2). First impressions matter — fast, thoughtful responses build community trust.

**Sprint 2 SLA Targets:**

- Bug triage: < 24 hours
- Discord response: < 24 hours
- Feature request acknowledgment: < 48 hours
- Documentation gaps: < 72 hours

---

## Feedback Channels

| Channel             | Type            | Owner                  | Check Frequency |
| ------------------- | --------------- | ---------------------- | --------------- |
| GitHub Issues       | Bugs, Features  | All (triaged by Scrum) | Every cycle     |
| Discord (#support)  | Questions, Help | All (Growth leads)     | 2x daily        |
| Discord (#feedback) | Features, UX    | Product                | Daily           |
| Discord (#bugs)     | Bug reports     | QA                     | 2x daily        |
| npm comments        | Package issues  | Ops                    | Weekly          |
| X/Twitter mentions  | Public feedback | Growth                 | Daily           |
| Email (if any)      | Direct outreach | CEO                    | Daily           |

---

## Feedback Categories

### Category 1: Bugs (P0-P2)

**Definition:** Something is broken or doesn't work as documented.

**Subcategories:**

- **P0 Blocker:** Prevents install/init/run entirely
- **P1 Major:** Core functionality broken (dispatch, memory, rotation)
- **P2 Minor:** Edge cases, cosmetic issues, non-blocking errors

**Triage Flow:**

```
User report → QA validates → Engineering fixes → QA verifies → Deploy
```

**Response Template (Discord/GitHub):**

```
Thanks for reporting this! 🐛

I've reproduced the issue and opened it as [#XYZ].
[Brief explanation of what's happening]

Fix timeline: [P0: today | P1: 24-48h | P2: this sprint]

If you want to follow along, watch the issue or join #bugs in Discord.
```

---

### Category 2: Feature Requests

**Definition:** User wants functionality that doesn't exist yet.

**Subcategories:**

- **In-Roadmap:** Already planned (Sprint 2/3), point to existing issue
- **Good Idea:** Not planned but valuable, create issue
- **Out-of-Scope:** Doesn't fit product vision, explain politely

**Triage Flow:**

```
User request → Product reviews → [Match to existing | Create issue | Decline with context]
```

**Response Template:**

```
Great idea! 💡

[In-Roadmap]: This is actually coming in Sprint X — tracked in #XYZ.
Subscribing you to updates.

[Good Idea]: Love this. I've created #XYZ to track it. Want to add
any details? We prioritize based on community interest.

[Out-of-Scope]: Appreciate the suggestion! This doesn't quite fit
our current direction because [reason], but I'm curious what
problem you're trying to solve — maybe there's another way?
```

---

### Category 3: Documentation Gaps

**Definition:** User confused because docs are unclear, incomplete, or missing.

**Subcategories:**

- **Missing Docs:** Feature exists but undocumented
- **Unclear Docs:** Docs exist but confusing
- **Outdated Docs:** Docs don't match current behavior

**Triage Flow:**

```
User confusion → Product/Ops identifies gap → Fix docs immediately (no issue needed for small fixes)
```

**Response Template:**

```
Good catch — the docs should've been clearer here! 📚

[Explanation of how it actually works]

I've updated the docs: [link to commit/section]

Let me know if anything else is confusing.
```

---

### Category 4: Questions / How-To

**Definition:** User needs help understanding how to use ADA.

**Triage Flow:**

```
Question → Answer directly → If common, add to FAQ/docs
```

**Response Template:**

```
Happy to help! Here's how:

[Clear, step-by-step answer]

[If useful]: I've added this to our FAQ since others might ask too.
```

---

## Triage Workflow

### Daily Triage (All Roles)

1. **Check your owned channels** (see table above)
2. **Categorize new feedback** using categories above
3. **Respond within SLA** using appropriate template
4. **Create/link GitHub issues** for anything that needs tracking
5. **Update memory bank** if patterns emerge

### Cross-Role Escalation

| If you see...             | Escalate to...    | How                                 |
| ------------------------- | ----------------- | ----------------------------------- |
| P0 blocker                | Engineering + Ops | Ping in Discord, skip cycle queue   |
| Security issue            | Ops               | Private DM, do NOT discuss publicly |
| Accelerator/press inquiry | CEO + Growth      | Private channel                     |
| Architectural question    | Research/Frontier | GitHub issue                        |
| User wants to contribute  | Growth            | Direct to CONTRIBUTING.md           |

---

## Tracking User Feedback

### Feedback Log

Maintain a running log in `docs/product/feedback-log.md` (create after first feedback):

```markdown
## 2026-02-XX

### User: [username/anonymous]

- **Channel:** Discord #support
- **Category:** Bug (P1)
- **Summary:** `ada init` fails on Windows with path separator issue
- **Response:** Acknowledged, created #XYZ
- **Resolution:** Fixed in v1.0.1
```

### Weekly Feedback Summary

Every Scrum retro (every 10 cycles), summarize:

- Total feedback items by category
- Average response time
- Top 3 recurring themes
- Action items for team

---

## Red Flags to Watch

These signals indicate we need to react fast:

| Signal                          | Response                                |
| ------------------------------- | --------------------------------------- |
| Same bug reported 3+ times      | P1 escalation regardless of severity    |
| User publicly frustrated        | CEO/Growth direct outreach              |
| Security vulnerability          | Immediate private triage, CVE if needed |
| Competitor mentioned positively | Note for Growth strategy                |
| "I gave up" / "uninstalled"     | Post-mortem, learn what broke           |

---

## Success Metrics (End of Sprint 2)

| Metric                       | Target             | How to Measure                |
| ---------------------------- | ------------------ | ----------------------------- |
| Avg bug triage time          | < 24h              | GitHub issue timestamps       |
| Avg Discord response         | < 24h              | Discord message timestamps    |
| User satisfaction            | Positive sentiment | Qualitative review            |
| Docs updated from feedback   | 5+                 | Commit count                  |
| Repeat users                 | >20%               | npm download patterns (rough) |
| Issues created from feedback | Track all          | Label: `user-feedback`        |

---

## Label Convention

New GitHub label for Sprint 2:

- **`user-feedback`** — Issue originated from external user
- Use in combination with existing labels (bug, enhancement, documentation)

```bash
# Create label if not exists
gh label create "user-feedback" --color "7057ff" --description "Issue originated from external user feedback"
```

---

## Open Questions

1. **Auto-responder?** Could set up Discord bot for immediate ack while human follows up
2. **Feedback form?** Structured form vs freeform Discord might yield better data
3. **Public roadmap?** Should users see what's planned? (Linear, GitHub Projects, etc.)

---

_This playbook will evolve based on actual feedback patterns post-launch._
