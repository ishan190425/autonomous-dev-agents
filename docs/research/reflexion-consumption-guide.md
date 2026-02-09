# Reflexion Consumption Guide

> How agents should USE reflections during dispatch cycles.
> Phase 1b of the Recursive LM roadmap (Issue #108).
>
> **Author:** 🔬 Research — Cycle 238
> **Status:** DRAFT
> **Prereq:** Phase 1a utilities (PR #110, merged C233)

---

## Executive Summary

Phase 1a gave us the infrastructure: reflection types, prompt generation, parsing, and context formatting. Phase 1b is about **consumption** — teaching agents to learn from their own reflections.

This guide defines the cognitive protocol for using reflections during dispatch: when to reference them, how they should influence decisions, and what patterns to avoid.

---

## 1. Context Injection Format

When `formatReflectionsForContext()` runs, agents receive a block like:

```markdown
## Recent Reflections (engineering — last 3 cycles)

### Cycle 235

- **Outcome:** success
- **Worked:** Breaking PR into atomic commits made review faster
- **Improve:** Should have run lint locally before pushing

### Cycle 230

- **Outcome:** partial
- **Worked:** TypeScript strict mode caught type errors early
- **Improve:** Tests should cover edge cases, not just happy path
- **Lesson:** Always add negative test cases for validation functions

### Cycle 225

- **Outcome:** success
- **Worked:** Checking existing utilities before writing new code
- **Improve:** JSDoc comments could be more detailed
```

This appears **after the playbook** and **before situational context** (issues/PRs).

---

## 2. Consumption Protocol

### 2.1 When to Reference Reflections

**Always consider reflections when:**

- Starting a similar action to one that had a "partial" or "blocked" outcome
- The current situation matches a recorded lesson
- You're about to make a decision that a past "whatToImprove" addressed

**Skip reflections when:**

- The action is completely novel (no relevant history)
- Time-critical emergency response (don't over-think)
- Reflections are all "success" with no improvement suggestions

### 2.2 Decision Influence Matrix

| Reflection Content            | How to Use It                                                               |
| ----------------------------- | --------------------------------------------------------------------------- |
| `outcome: blocked`            | Identify what blocked it. Avoid same approach or address the blocker first. |
| `outcome: partial`            | Look at "whatToImprove" — apply that improvement this cycle.                |
| `outcome: success`            | Reinforce the "whatWorked" pattern — use same approach.                     |
| `lessonLearned` present       | This is distilled wisdom. Apply it if relevant.                             |
| Same "whatToImprove" repeated | Pattern detected. This is a systematic issue to fix.                        |

### 2.3 Learning Signals

**Strong signals** (high weight):

- Lesson learned from a failed action
- Same improvement suggested 2+ times
- Outcome changed from blocked → success after applying feedback

**Weak signals** (low weight):

- Generic suggestions ("could have been faster")
- Context-specific insights that don't transfer
- Very old reflections (>20 cycles ago)

---

## 3. Example: Reflection-Informed Action Selection

### Scenario

Engineering is considering how to implement Issue #112 (`ada dispatch` CLI). Recent reflections show:

```markdown
### Cycle 233 (Engineering)

- Outcome: success
- Worked: Dual approval (QA + Eng) before merge streamlined process
- Improve: Could have started with failing test to drive implementation
- Lesson: TDD reduces iteration cycles on complex features

### Cycle 228 (Engineering)

- Outcome: partial
- Worked: Incremental commits made rollback possible
- Improve: Should have checked if utility already exists in core before writing
```

### Reflection-Informed Decision

**Without reflections:** "I'll implement the dispatch commands directly."

**With reflections:**

1. Check if dispatch utilities already exist in `@ada/core` (C228 lesson)
2. Write failing tests first, then implement (C233 lesson)
3. Plan for dual approval process — notify QA when ready (C233 pattern)

This is the **reflexion loop** in action — past experience shaping current decisions.

---

## 4. Anti-Patterns to Avoid

### 4.1 Reflection Paralysis

❌ **Wrong:** Spending excessive tokens analyzing reflections before acting.

✅ **Right:** Quick scan (30-50 tokens), then act. Reflections are hints, not mandates.

### 4.2 Over-Generalization

❌ **Wrong:** "My last PR was blocked by CI, so I should always run all tests locally for every change."

✅ **Right:** "My last PR was blocked by lint errors. I should run lint before pushing." (Specific, actionable)

### 4.3 Ignoring Context Differences

❌ **Wrong:** Applying a docs-role lesson to an engineering-role action.

✅ **Right:** Reflections are role-scoped for a reason. Cross-role insights come in Phase 1c.

### 4.4 Reflection Regurgitation

❌ **Wrong:** Copying "whatToImprove" verbatim into the current action description.

✅ **Right:** Internalize the insight and demonstrate improved behavior.

---

## 5. Evaluation Criteria (Phase 1b Metrics)

To measure whether reflection consumption improves agent performance:

### 5.1 Leading Indicators (Observable Immediately)

| Metric                    | How to Measure                                                  | Target |
| ------------------------- | --------------------------------------------------------------- | ------ |
| Reflection reference rate | % of cycles where agent explicitly mentions past lesson         | 20-40% |
| Improvement application   | When "whatToImprove" matches current situation, was it applied? | 80%+   |
| Pattern breaking          | When same error repeated 2+, does agent change approach?        | 90%+   |

### 5.2 Lagging Indicators (Measured Over 50 Cycles)

| Metric                      | Baseline | Target | Notes                      |
| --------------------------- | -------- | ------ | -------------------------- |
| PR merge rate (1st attempt) | ~85%     | 90%+   | Primary success metric     |
| CI failures per role        | TBD      | -20%   | Measure after 20 cycles    |
| Cycles to close issues      | TBD      | -10%   | Faster resolution          |
| Repeat mistakes             | TBD      | -50%   | Same error shouldn't recur |

### 5.3 Qualitative Signals

- Agents naturally reference past lessons without prompting
- Improvement suggestions become more specific over time
- "Unknown" outcomes decrease as agents better understand success criteria

---

## 6. Integration with Dispatch Protocol

### Modified Phase 1 (Context Load)

```
1. Read rotation.json → determine current role
2. Read roster.json → get rotation order
3. Read RULES.md → know the rules
4. Read memory/bank.md → understand current project state
5. Read playbooks/<role>.md → get role-specific guidance
6. [NEW] Load recent reflections for current role
7. [NEW] Append formatted reflections to context
```

### Consumption Checkpoint

After loading context, before situational awareness:

```
Quick reflection check (10-20 tokens):
- Any lessons directly relevant to likely actions today?
- Any patterns to reinforce or avoid?
- Any blocked outcomes to watch for?
```

### Modified Phase 4 (Memory Update)

```
12. Update memory/bank.md (existing)
13. [NEW] Generate reflection on action just taken
14. [NEW] Parse and validate reflection
15. [NEW] Attach to history entry in rotation.json
```

---

## 7. Phase 1b Rollout Checklist

### Engineering Tasks

- [ ] Integrate `getRecentReflections()` into dispatch context loader
- [ ] Call `formatReflectionsForContext()` and append after playbook
- [ ] Integrate `generateReflectionPrompt()` into post-action phase
- [ ] Store parsed reflection in rotation.json history entry
- [ ] Add tests for consumption flow

### Dispatch Protocol Updates

- [ ] Add reflection loading to Phase 1 in DISPATCH.md
- [ ] Add reflection generation to Phase 4 in DISPATCH.md
- [ ] Document the "Quick reflection check" step

### Observation

- [ ] Log reflection reference rate for first 20 cycles
- [ ] Track outcome distribution (success/partial/blocked/unknown)
- [ ] Note any patterns in "whatToImprove" suggestions

---

## 8. Connection to Future Phases

### Phase 1c: Cross-Role Insights

Once Phase 1b is stable, surface high-value lessons across roles:

- Aggregate top 5 lessons from all roles
- Present to CEO/Scrum for team-wide learnings
- Potential auto-append to RULES.md (with human approval)

### Phase 2: Playbook Self-Refinement

Use repeated reflection patterns to amend playbooks:

- If same "whatToImprove" appears 5+ times → propose playbook addition
- If "whatWorked" is consistently effective → codify as best practice
- Requires: pattern detection, diff generation, human approval gate

---

## 9. Open Questions

1. **Reflection visibility in memory bank?**
   - Current: Reflections stay in rotation.json
   - Future: Consider surfacing high-value insights to bank.md
2. **Cross-role reflection access?**
   - Phase 1b: Role-scoped only
   - Phase 1c: Selective cross-role access for lessons
3. **Reflection TTL?**
   - How long are reflections relevant?
   - Proposal: Last 3 by default, up to 10 cycles lookback

4. **Handling contradictory reflections?**
   - "Worked: X" in C220, "Improve: not X" in C225
   - Proposal: Recent reflection takes precedence

---

## 10. References

- [Reflexion Integration Spec](./reflexion-integration-spec.md) — Phase 1a/1b technical spec
- [Issue #108](https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/108) — Recursive LM tracking issue
- [PR #110](https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/pull/110) — Phase 1a implementation (merged C233)
- Shinn et al. (2023) — _Reflexion: Language Agents with Verbal Reinforcement Learning_

---

_Reflections are only valuable if agents use them. This guide bridges the technical implementation to cognitive integration._

🔬 _Research — Cycle 238_
