# Day 1 Feedback Collection Protocol (C590)

> **Product Spec** — Created Feb 14, 2026 | Cycle 590
> **Context:** T+19h post-npm-live, announcements in ~2h (Discord 10 AM, Dev.to 12 PM, Reddit 2 PM EST)
> **Purpose:** Define structured feedback collection to maximize 14-day pre-Sprint 2 runway (L284)

---

## 1. Overview

We shipped 10 days early (Feb 14 vs planned Feb 24). Per L284, this creates a **14-day runway** before Sprint 2 (Feb 28) — use it for **feedback collection**, not scope expansion.

This protocol defines how we capture, categorize, and process user feedback during Day 1 through Day 14, ensuring real user data drives Sprint 2 priorities rather than assumptions.

---

## 2. Feedback Channels

### Primary (Active Monitoring)

| Channel            | Type       | Monitor From | Response SLA |
| ------------------ | ---------- | ------------ | ------------ |
| Discord (#support) | Real-time  | T+0          | <4h          |
| GitHub Issues      | Structured | Always       | <24h         |
| Discord (#general) | Real-time  | T+0          | <8h          |
| Dev.to Comments    | Async      | T+2h         | <24h         |
| Reddit Comments    | Async      | T+4h         | <24h         |

### Secondary (Periodic Check)

| Channel        | Check Frequency | Start |
| -------------- | --------------- | ----- |
| Twitter/X      | Daily           | T+24h |
| LinkedIn       | Daily           | T+24h |
| Email (if any) | Daily           | T+24h |
| HN (if posted) | On-demand       | TBD   |

---

## 3. Feedback Categories

### Category Taxonomy

| Code | Category        | Description                                | Priority Signal |
| ---- | --------------- | ------------------------------------------ | --------------- |
| BUG  | Bug Report      | Something doesn't work as expected         | P0-P1           |
| UX   | UX Friction     | Works but confusing/hard to use            | P1-P2           |
| DOC  | Documentation   | Missing/unclear docs                       | P2              |
| FEAT | Feature Request | "Can it do X?"                             | P2-P3           |
| USE  | Use Case        | "I want to use ADA for Y" (persona signal) | P1 (strategic)  |
| LOVE | Positive        | What they love (reinforce, don't change)   | —               |
| Q    | Question        | Need clarification                         | —               |

### Priority Signals

**P0 indicators:**

- "I can't install"
- "CLI crashes on start"
- Any blocker to basic usage

**P1 indicators:**

- Multiple users report same issue
- First 10 minutes of usage friction
- Blocks core workflow (`ada init → ada run`)

**P2 indicators:**

- Edge case issues
- Nice-to-have improvements
- Non-blocking confusion

---

## 4. Collection Process

### 4.1 Capture

**Discord feedback:**

1. Screenshot or copy text to `docs/feedback/day1-raw.md`
2. Include: timestamp, username (anonymized), channel, verbatim quote
3. Tag with category code

**GitHub feedback:**

1. If issue-worthy: Create issue with `feedback` label
2. If existing issue: Comment with link to user feedback
3. If question: Answer directly, note in raw.md

**Other platforms:**

1. Screenshot significant feedback
2. Add to `docs/feedback/day1-raw.md`
3. Note platform source

### 4.2 Daily Synthesis (T+24h, T+48h, ...)

At each 24h checkpoint:

1. Review raw feedback from past 24h
2. Update `docs/feedback/day1-synthesis.md`:
   - Top 3 friction points
   - Emerging patterns
   - Use case signals (personas)
   - Unexpected use attempts
3. Cross-reference with Sprint 2 backlog (#102)

### 4.3 Sprint 2 Input (T+14d / Feb 27)

Before Sprint 2 kickoff:

1. Compile full feedback synthesis
2. Map to existing issues or create new ones
3. Product recommendation: Reprioritize based on actual data
4. Present to team via memory bank update

---

## 5. Response Guidelines

### First Response Principles

1. **Thank them** — Every person who gives feedback is a gift
2. **Acknowledge** — Show you heard the specific point
3. **No promises** — "Great idea, we'll track it" not "We'll add that"
4. **Track publicly** — Point to GitHub issue when created

### Response Templates

**Bug report:**

> Thanks for reporting this! We're tracking it at #[issue]. If you can share [specific detail], that helps us fix it faster.

**Feature request:**

> Interesting idea! We've added it to our backlog (#[issue] if created, or "we're tracking it"). What problem does this solve for you?

**UX friction:**

> Thanks for the feedback — that friction is real. We're improving the [area] experience in Sprint 2.

**Use case signal:**

> Love hearing how you're using ADA! [Follow-up question about their workflow]

---

## 6. Metrics to Track

| Metric               | Target Day 1 | Actual | Notes                |
| -------------------- | ------------ | ------ | -------------------- |
| Total feedback items | 5-20         |        | Any signal is good   |
| Bug reports          | <3           |        | Platform stable      |
| Feature requests     | 3-10         |        | User imagination     |
| Use case signals     | 2-5          |        | Persona validation   |
| Questions            | 5-15         |        | Doc gaps             |
| Response rate        | 100%         |        | Every person matters |
| Avg response time    | <4h          |        | During active hours  |

---

## 7. Integration with Sprint 2 (#102)

### Feedback → Priority Mapping

| Feedback Pattern                | Sprint 2 Impact                     |
| ------------------------------- | ----------------------------------- |
| Multiple install issues         | Raise #34 E2E priority              |
| "Output is confusing"           | Confirm #125 Terminal Mode priority |
| "What's next after init?"       | Consider #30 Onboarding (P3→P2?)    |
| Requests for specific templates | Future roadmap signal               |
| Interest in team features       | Validates #18 Hub direction         |

### Pre-Sprint 2 Checkpoint (Feb 27)

Product will:

1. Synthesize all Day 1-14 feedback
2. Recommend priority adjustments based on data
3. Document in `docs/product/sprint-2-feedback-synthesis.md`
4. Update #102 with final scope recommendation

---

## 8. Roles and Responsibilities

| Role        | Responsibility                                      |
| ----------- | --------------------------------------------------- |
| Product     | Category taxonomy, priority signals, Sprint 2 input |
| Growth      | Monitor announcement channels, route feedback       |
| QA          | Triage bug reports, verify reproductions            |
| Engineering | Assess technical feasibility of feature requests    |
| Design      | Capture UX friction patterns                        |
| CEO         | Escalate P0 if needed, strategic use case signals   |

---

## Appendix: File Locations

```
docs/feedback/
├── day1-raw.md           # Verbatim captures (create when first feedback arrives)
├── day1-synthesis.md     # Daily synthesis (create at T+24h)
└── sprint-2-feedback-synthesis.md  # Final pre-Sprint 2 analysis
```

---

_This protocol operationalizes L284: Use the early launch runway for feedback collection, not scope expansion._
