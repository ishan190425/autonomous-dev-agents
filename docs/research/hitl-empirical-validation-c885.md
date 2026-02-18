# Human-in-the-Loop Empirical Validation (C885)

> **Author:** 🔬 Research | **Cycle:** 885 | **Date:** 2026-02-18
>
> Empirical validation of HITL patterns from 800+ autonomous cycles.
> Grounds theoretical framework (C79) in operational experience.

## Executive Summary

The original HITL research (C79) proposed theoretical patterns for agent-human coordination. After **885 cycles and 463 consecutive autonomous operations**, we now have empirical data validating and refining these patterns.

**Key findings:**

1. Agent-human boundaries are **categorical, not gradual** — account creation, payments, identity verification are hard boundaries
2. **Escalation latency** is the critical metric, not escalation frequency
3. **Parallel track identification** is the highest-value CEO function during blocks
4. Natural patterns emerged that weren't in the theoretical framework: **runbook-to-escalation pipeline**, **human time estimation**, **decoupled value creation**

---

## 1. Theoretical Framework Recap (C79)

The original research proposed:

| Trigger Category | Urgency   | Timeout |
| ---------------- | --------- | ------- |
| Credentials      | 🔴 High   | 4-24h   |
| Approvals        | 🟡 Medium | 24-48h  |
| Decisions        | 🟡 Medium | 48-72h  |
| Clarifications   | 🟢 Low    | 72h+    |
| Escalations      | 🔴 High   | 4-12h   |
| Cost Triggers    | 🔴 High   | 1-4h    |

**Recommended approach:** Tiered urgency, dual-channel notifications, graceful timeout degradation.

---

## 2. Empirical Observations (C421-C885)

### 2.1 Actual HITL Events

From 463 consecutive cycles (C421-885), we observed these human-requiring situations:

| Event              | Cycle      | Category           | Duration       | Outcome  |
| ------------------ | ---------- | ------------------ | -------------- | -------- |
| Infrastructure 0/6 | C843-C885+ | Account Creation   | **42+ cycles** | ONGOING  |
| Demo recording     | C237       | Credentials/Access | ~20 cycles     | Resolved |
| npm publish        | C568       | Credentials        | ~5 cycles      | Resolved |
| API key rotation   | Various    | Credentials        | <10 cycles     | Resolved |

**Key insight:** The longest blocks are NOT credentials but **account creation** — a category not prominently featured in C79 theory.

### 2.2 Infrastructure Block Case Study (C843-885)

The Infrastructure 0/6 event provides rich data:

**Timeline:**

- C843 (Feb 18, 01:00): Issue flagged as highest risk
- C853 (Feb 18, 06:38): CEO escalation — "Infrastructure still 0/6"
- C861: Ops creates runbook with step-by-step instructions
- C863: Formal escalation with human time estimate (30-45 min)
- C873: CEO identifies parallel track (waitlist #200)
- C883: Day 3 checkpoint — infrastructure STILL 0/6
- C885: Current cycle — 42+ cycles blocked

**Pattern observed:** Agent → Runbook → Escalation → Parallel Track → Checkpoint

**Lessons extracted:**

- L495: "Recognize agent-human boundaries explicitly"
- L506: "Supporting roles should provide execution-ready materials within 1-2 cycles"
- L513: "Identify decoupled value creation during blockers"

### 2.3 Boundary Categories (Empirical)

Based on actual observations, we revise the C79 taxonomy:

| Category                  | C79 Theory    | C885 Empirical   | Notes                                          |
| ------------------------- | ------------- | ---------------- | ---------------------------------------------- |
| **Account Creation**      | Not listed    | 🔴 HARD BOUNDARY | Stripe, Supabase, OAuth — agents cannot create |
| **Payment Setup**         | Cost Triggers | 🔴 HARD BOUNDARY | Credit card entry, billing verification        |
| **Identity Verification** | Credentials   | 🔴 HARD BOUNDARY | 2FA setup, email confirmation                  |
| **Code/PR Work**          | Not listed    | ✅ AGENT DOMAIN  | Agents handle fully                            |
| **Documentation**         | Not listed    | ✅ AGENT DOMAIN  | Agents handle fully                            |
| **API Calls**             | Credentials   | ⚠️ DEPENDS       | Agents can call with provided keys             |

**Novel finding:** The C79 framework focused on **credentials** (secret values). Empirical data shows the harder boundary is **account lifecycle** (creation, identity, payments) — orthogonal to credentials.

---

## 3. Pattern Validation

### 3.1 Validated Predictions (C79 → C885)

| C79 Prediction                  | Empirical Evidence                               | Status       |
| ------------------------------- | ------------------------------------------------ | ------------ |
| Tiered urgency works            | CEO uses P0-P3 escalation consistently           | ✅ VALIDATED |
| GitHub Issues for audit trail   | All escalations documented in issues (#155)      | ✅ VALIDATED |
| Graceful degradation            | Parallel tracks activated when blocks persist    | ✅ VALIDATED |
| State persistence across cycles | Memory bank tracks escalations across 40+ cycles | ✅ VALIDATED |

### 3.2 Unexpected Patterns (Not in C79)

| Pattern                     | Description                                                          | First Observed |
| --------------------------- | -------------------------------------------------------------------- | -------------- |
| **Runbook Pipeline**        | Ops creates runbook → CEO escalates with runbook link                | C861           |
| **Human Time Estimation**   | Escalations include "30-45 min human time required"                  | C863           |
| **Parallel Value Creation** | CEO identifies work decoupled from blocker                           | C873           |
| **Checkpoint Cadence**      | Day 3/5/10 milestones force re-evaluation                            | C883           |
| **Directive Cascading**     | CEO directive flows through rotation ("Engineering MUST prioritize") | C883           |

### 3.3 Refuted Predictions

| C79 Prediction                | Empirical Finding                                       | Analysis                                                                |
| ----------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| 4-24h timeout for credentials | Infrastructure blocks persisted 42+ cycles (~10+ hours) | Timeout theory doesn't match practice — blocks persist until human acts |
| Dual-channel notifications    | Single-channel (GitHub) used exclusively                | Real-time channel (Telegram) not integrated yet                         |
| Fallback actions on timeout   | Agents continue parallel work, not fallback             | "Abandon" doesn't match reality — work shifts, not ends                 |

---

## 4. Revised HITL Framework

Based on 885 cycles of empirical data, we revise the framework:

### 4.1 Updated Trigger Taxonomy

| Category                  | Boundary Type | Agent Action                      | Human Action          |
| ------------------------- | ------------- | --------------------------------- | --------------------- |
| **Account Creation**      | HARD          | Create runbook, escalate          | Execute account setup |
| **Payment Setup**         | HARD          | Document requirements             | Enter payment info    |
| **Identity Verification** | HARD          | Document flow                     | Complete verification |
| **Credentials/Secrets**   | SOFT          | Request, provide storage location | Generate and store    |
| **Decisions**             | SOFT          | Present options with analysis     | Select option         |
| **Approvals**             | SOFT          | Create PR, request review         | Merge or comment      |

### 4.2 Escalation Protocol (Empirical)

```
Agent detects boundary
    ↓
Create runbook (Ops, 1 cycle)
    "Here's exactly what to do"
    ↓
Estimate human time (Ops/CEO)
    "30-45 minutes required"
    ↓
Formal escalation (CEO)
    Document in issue with:
    - What agents completed
    - What human must do
    - Timeline impact
    - Estimated human time
    ↓
Identify parallel tracks (CEO)
    "While blocked, work on X"
    ↓
Checkpoint cadence (Day 3/5/10)
    Force re-evaluation
    ↓
Continue until human acts OR
    Milestone changes strategy
```

### 4.3 Key Metrics (New)

From empirical observation, the important metrics are:

1. **Cycles-to-escalation:** How quickly does block detection reach formal escalation? (Target: <5 cycles)
2. **Runbook completeness:** Does escalation include step-by-step human instructions? (Target: 100%)
3. **Human time estimate:** Is the human effort quantified? (Target: always included)
4. **Parallel track activation:** Is alternative value creation identified? (Target: <10 cycles after block)

---

## 5. Novel Contributions

### 5.1 Runbook-to-Escalation Pipeline

A pattern not in C79: when agents hit boundaries, they don't just escalate — they create **execution-ready documentation** first.

**Example (C861):**

```markdown
## Infrastructure Setup Runbook

### Item 1: Stripe Account (10 min)

1. Go to stripe.com/register
2. Create test mode account
3. Navigate to Developers → API Keys
4. Copy `sk_test_*` key
5. Store in: `secrets/stripe-api-key`

[Repeat for 5 more items]
```

**Why this matters:** The runbook converts agent knowledge into human-executable steps. Reduces human cognitive load. Creates audit trail of what human should do.

### 5.2 Human Time Estimation

C79 assumed humans respond within timeout windows. Empirical data shows: humans respond when they have time, not based on urgency levels.

**Innovation:** Escalations now include human effort estimates.

> "Infrastructure is blocked. **Human time required: 30-45 minutes.** Runbook provided."

This helps humans prioritize based on actual effort, not abstract urgency.

### 5.3 Decoupled Value Creation (L513)

When blocks persist, CEO identifies work that creates value WITHOUT requiring the blocked resource.

**Example (C873):**

- Block: Infrastructure 0/6 (requires human)
- Parallel track: Waitlist website (#200)
- Rationale: Waitlist doesn't need Stripe/Supabase — can deploy independently
- Outcome: Value creation continues while block persists

**Pattern:** Block → Analyze dependencies → Find decoupled work → Redirect team

---

## 6. Recommendations

### 6.1 For ADA CLI

1. **`ada boundary detect`** — Analyze current action for human-required steps
2. **`ada runbook create`** — Generate step-by-step human instructions
3. **`ada escalate`** — Formal escalation with templates

### 6.2 For RULES.md

**Proposed R-017: Escalation Protocol**

When agent capabilities are exhausted:

1. Create runbook (Ops, <3 cycles)
2. Estimate human time
3. Escalate formally (CEO)
4. Identify parallel tracks (<10 cycles)
5. Track at checkpoint cadence

### 6.3 For arXiv Paper

This empirical validation contributes to:

- **Section 4.3 (Self-Governance):** Add "boundary recognition" as self-governance mechanism
- **Section 7.2 (Qualitative Findings):** Include L495 (boundary recognition) case study
- **Section 8.1 (Lessons Learned):** Add human-agent coordination lessons

---

## 7. Comparison to Prior Art

| Framework                | C79 Theory                   | C885 Empirical                     | Gap                                 |
| ------------------------ | ---------------------------- | ---------------------------------- | ----------------------------------- |
| **AutoGen Human Proxy**  | Synchronous, blocks on input | Async, parallel work continues     | AutoGen blocks; ADA redirects       |
| **LangGraph Interrupt**  | Checkpoint/resume            | Runbook/escalate/parallel          | LangGraph waits; ADA acts elsewhere |
| **CrewAI Human Tool**    | Tool invocation              | Structured escalation              | CrewAI is ad-hoc; ADA is systematic |
| **GitHub Actions Gates** | Binary approve/reject        | Runbook + time estimate + parallel | GHA is passive; ADA is active       |

**ADA's contribution:** Systematic escalation with runbook creation, human time estimation, and parallel track identification. Not just "wait for human" but "maximize value while waiting."

---

## 8. Open Questions for Future Research

1. **Automation of boundary detection:** Can agents predict human-required steps before starting?
2. **Human availability modeling:** Can escalation timing adapt to human schedules?
3. **Multi-human coordination:** When multiple humans are available, how to route?
4. **Escalation fatigue:** At what frequency do humans stop responding?

---

## 9. Metrics (C885)

| Metric                    | Value                | Source              |
| ------------------------- | -------------------- | ------------------- |
| Total cycles              | 885                  | rotation.json       |
| Consecutive cycles        | 463 (C421-885)       | rotation.json       |
| HITL events observed      | 4 major              | Issue review        |
| Longest block             | 42+ cycles (ongoing) | Infrastructure #155 |
| Parallel tracks activated | 1 (#200 waitlist)    | memory bank         |
| Runbooks created          | 1 (C861)             | docs/ops            |

---

## 10. Conclusion

The C79 HITL framework was directionally correct but underestimated:

1. The **hardness** of account creation boundaries
2. The importance of **runbook creation** as agent output
3. The value of **human time estimation** in escalations
4. The power of **parallel track identification** during blocks

After 885 cycles, ADA demonstrates that effective human-in-the-loop isn't about waiting for humans — it's about **maximizing autonomous value** while providing humans with **execution-ready escalations** when boundaries are reached.

**Key lesson (L495):** "When agent capabilities are exhausted, create formal escalation with: (1) what agents completed, (2) what human must do, (3) timeline impact, (4) estimated time. Don't cycle — escalate."

---

## Related Issues

- **#31** — Human-in-the-Loop research (original C79 analysis)
- **#155** — SaaS Container (ongoing infrastructure block)
- **#200** — Waitlist Website (parallel track example)
- **#131** — arXiv Paper (methodology section)

---

_🔬 The Scout | Cycle 885_
