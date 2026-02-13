# Day 1 Product Monitoring Protocol

> **Created:** Cycle 490 (Feb 12, 2026)
> **Author:** 📦 The PM
> **Purpose:** Capture user feedback, detect onboarding friction, triage Day 1 issues
> **Complements:** Research metrics protocol (C488), Frontier observability runbook (C489)

---

## Overview

This protocol defines what Product monitors during the v1.0-alpha launch window (Feb 14-17) and how we process user feedback into actionable improvements.

---

## Monitoring Channels

### Primary (Check every cycle)

| Channel                | What to Watch                        | Action                                    |
| ---------------------- | ------------------------------------ | ----------------------------------------- |
| **GitHub Issues**      | New issues from external users       | Triage immediately, add to Active Threads |
| **Discord #general**   | First impressions, confusion signals | Note friction points, update FAQ          |
| **Discord #help**      | Installation/usage problems          | Document solutions, create issues if bug  |
| **GitHub Discussions** | Feature requests, questions          | Respond within 1 cycle, log patterns      |

### Secondary (Check daily)

| Channel                | What to Watch               | Action                                  |
| ---------------------- | --------------------------- | --------------------------------------- |
| **Twitter/X mentions** | Public feedback, complaints | Respond if actionable, log sentiment    |
| **HN/Reddit threads**  | Community discussion        | Monitor only, respond if misinformation |
| **npm download stats** | Adoption velocity           | Log in Research metrics                 |

---

## Feedback Triage Process

### Step 1: Categorize

Every piece of feedback fits one of:

| Category           | Example                        | Urgency                            |
| ------------------ | ------------------------------ | ---------------------------------- |
| **🔴 Blocker**     | "npm install fails on Windows" | Immediate — ping Ops/Engineering   |
| **🟠 Friction**    | "Confused by ada init prompts" | Same-day — note for UX improvement |
| **🟢 Enhancement** | "Would be nice to have X"      | Log for Sprint 2 planning          |
| **⚪ Noise**       | "Cool project!"                | Appreciate, no action needed       |

### Step 2: Document

For every 🔴 or 🟠 item:

1. **Create GitHub issue** (if none exists)
2. **Add to Active Threads** in memory bank
3. **Note pattern** — is this the 2nd+ time we've heard this?

### Step 3: Respond

| Category           | Response SLA | Response Template                                       |
| ------------------ | ------------ | ------------------------------------------------------- |
| **🔴 Blocker**     | <1 hour      | "We're looking into this right now. Can you share [X]?" |
| **🟠 Friction**    | <4 hours     | "Thanks for the feedback! We're tracking this as #XX."  |
| **🟢 Enhancement** | <24 hours    | "Great idea! Added to our roadmap as #XX."              |

---

## FAQ Triage

### Expected Day 1 Questions

Based on docs review, anticipate:

1. **"What LLM does this use?"** → Answer: Any OpenAI-compatible API (OpenAI, Anthropic via proxy, local Ollama)
2. **"Does this work with my repo?"** → Answer: Any git repo with package.json (Node.js focus for v1.0)
3. **"How much does it cost?"** → Answer: CLI is free, you provide your own LLM API key
4. **"Can I customize roles?"** → Answer: Yes, edit roster.json and create playbooks
5. **"Is this safe to run on production?"** → Answer: v1.0-alpha is for dev/staging; use PR mode (#128) for safety

### Real-Time FAQ Updates

When a question comes up 3+ times:

1. Add to `docs/getting-started/launch-faq.md`
2. Pin answer in Discord if applicable
3. Update README if fundamental

---

## Onboarding Friction Detection

### Critical Path Checkpoints

Monitor users getting stuck at:

| Step                        | Success Signal            | Friction Signal                      |
| --------------------------- | ------------------------- | ------------------------------------ |
| `npm install -g @ada/cli`   | No errors                 | Permission errors, version conflicts |
| `cd my-project && ada init` | Completes in <30s         | Hangs, crashes, confusing prompts    |
| Editing roster.json         | Makes changes             | Doesn't understand structure         |
| `ada run`                   | First cycle completes     | LLM errors, missing config           |
| Reading cycle output        | Understands what happened | "What did it do?" confusion          |

### Friction Response

If 3+ users hit same friction point:

1. **Document workaround** in Discord/FAQ immediately
2. **Create GitHub issue** for proper fix
3. **Tag as P1** if it blocks adoption

---

## Day 1 Checklist (Product)

- [ ] Monitor Discord every 2 hours
- [ ] Check GitHub issues/discussions every 2 hours
- [ ] Log all 🔴/🟠 feedback in memory bank
- [ ] Update FAQ with any repeated questions
- [ ] Coordinate with Ops on any blocking bugs
- [ ] End-of-day summary in memory bank

---

## Success Metrics (Product-Specific)

| Metric                         | Day 1 Target           | Week 1 Target |
| ------------------------------ | ---------------------- | ------------- |
| **Issues from external users** | ≥1 (engagement signal) | ≥5            |
| **Discord members**            | ≥20                    | ≥100          |
| **FAQ additions**              | ≥2 real questions      | ≥10           |
| **Critical blockers**          | 0 unresolved           | 0 unresolved  |
| **Avg response time**          | <4 hours               | <4 hours      |

---

## Handoff to Sprint 2

By Feb 18 (post-launch):

1. **Compile feedback summary** for Sprint 2 planning (#102)
2. **Rank top 5 friction points** for UX improvements
3. **Identify top 3 feature requests** for prioritization
4. **Update personas** if new user types emerge

---

_This protocol is active Feb 14-17. Product monitors user engagement while other roles handle technical operations._
