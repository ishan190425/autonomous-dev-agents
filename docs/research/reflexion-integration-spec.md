# Reflexion Integration Spec

> Implementation specification for lightweight self-critique in ADA dispatch cycles.
> Phase 1 of the Recursive LM roadmap (Issue #108).
>
> **Author:** 🔬 Research — Cycle 228
> **Status:** DRAFT
> **Target:** Sprint 2

---

## Executive Summary

This spec defines how ADA agents will implement **Reflexion-style self-critique** — observing their own actions, generating verbal reflections on what worked or didn't, and using those reflections to improve future cycles.

**Goal:** 5-10% improvement in action quality over 50 cycles with minimal token overhead.

---

## 1. The Reflexion Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Standard Dispatch Cycle                   │
├─────────────────────────────────────────────────────────────┤
│  1. Load context (rotation, memory bank, playbook)          │
│  2. Observe situation (issues, PRs, project state)          │
│  3. Execute ONE action                                       │
│  4. Update memory bank                                       │
│  5. Update rotation state                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   + Reflexion Enhancement                    │
├─────────────────────────────────────────────────────────────┤
│  4a. Generate reflection on action just taken               │
│  4b. Store reflection in rotation history                   │
│  4c. Retrieve last 3 reflections during context load        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Reflection Schema

### 2.1 Storage Location

Reflections are stored in `agents/state/rotation.json` within each history entry.

### 2.2 Schema Extension

```typescript
interface HistoryEntry {
  cycle: number;
  role: string;
  timestamp: string;
  action: string;
  // NEW: Reflexion fields
  reflection?: {
    outcome: 'success' | 'partial' | 'blocked' | 'unknown';
    whatWorked?: string; // Max 100 chars
    whatToImprove?: string; // Max 100 chars
    lessonLearned?: string; // Max 150 chars
  };
}
```

### 2.3 Example Entry

```json
{
  "cycle": 228,
  "role": "research",
  "timestamp": "2026-02-09T03:05:00.000Z",
  "action": "📝 REFLEXION SPEC — Created docs/research/reflexion-integration-spec.md...",
  "reflection": {
    "outcome": "success",
    "whatWorked": "Building on prior analysis (C218) rather than starting fresh",
    "whatToImprove": "Could have included code samples for Engineering",
    "lessonLearned": "Specs are most actionable when they include concrete schemas"
  }
}
```

---

## 3. Protocol Changes

### 3.1 Dispatch Phase 4a: Generate Reflection

After executing an action, before updating memory bank, the agent generates a brief reflection.

**Prompt template:**

```markdown
## Post-Action Reflection

You just completed: {action_summary}

Reflect briefly:

1. **Outcome:** Was this successful, partially successful, blocked, or unknown?
2. **What worked:** What aspect of your approach was effective? (1 sentence)
3. **What to improve:** What would you do differently next time? (1 sentence)
4. **Lesson learned:** Any insight worth remembering? (optional, 1 sentence)

Keep responses concise — this adds ~50-100 tokens per cycle.
```

### 3.2 Dispatch Phase 1 Enhancement: Load Recent Reflections

During context load, retrieve the last 3 reflections for the current role (not all roles).

**Integration point:** After loading playbook, append:

```markdown
## Recent Reflections ({role} — last 3 cycles)

### Cycle {N-1}

- Outcome: {outcome}
- Worked: {whatWorked}
- Improve: {whatToImprove}
- Lesson: {lessonLearned}

### Cycle {N-2}

...
```

**Filtering logic:**

```typescript
const roleReflections = history
  .filter(h => h.role === currentRole && h.reflection)
  .slice(-3)
  .reverse();
```

---

## 4. Token Cost Analysis

| Component             | Tokens   | Frequency     |
| --------------------- | -------- | ------------- |
| Reflection prompt     | ~50      | Every cycle   |
| Reflection output     | ~75      | Every cycle   |
| Loading 3 reflections | ~150     | Every cycle   |
| **Total overhead**    | **~275** | **Per cycle** |

At 227 cycles and counting, this adds ~60K tokens over 220 cycles — acceptable for the learning signal gained.

---

## 5. Implementation Recommendations

### 5.1 Core Package Changes

Add to `packages/core/`:

```typescript
// src/types/rotation.ts
export interface Reflection {
  outcome: 'success' | 'partial' | 'blocked' | 'unknown';
  whatWorked?: string;
  whatToImprove?: string;
  lessonLearned?: string;
}

// src/rotation/reflection.ts
export function generateReflectionPrompt(actionSummary: string): string;
export function parseReflection(llmOutput: string): Reflection;
export function getRecentReflections(
  history: HistoryEntry[],
  role: string,
  count?: number
): Reflection[];
```

### 5.2 CLI Integration

In `ada dispatch`:

1. After action execution, call `generateReflectionPrompt()`
2. Parse LLM response with `parseReflection()`
3. Attach to history entry before saving rotation.json
4. On next load, call `getRecentReflections()` and inject into context

### 5.3 Validation Rules

- `whatWorked` and `whatToImprove` max 100 characters
- `lessonLearned` max 150 characters
- If parsing fails, set `outcome: 'unknown'` and continue (graceful degradation)

---

## 6. Evaluation Metrics

### 6.1 Quantitative

Track over 50 cycles post-implementation:

| Metric                      | Baseline | Target |
| --------------------------- | -------- | ------ |
| PR merge rate (1st attempt) | ~85%     | 90%+   |
| CI failures per role        | TBD      | -20%   |
| Cycles to close issues      | TBD      | -10%   |

### 6.2 Qualitative

- Do reflections surface actionable insights?
- Are agents referencing their own reflections in subsequent cycles?
- Are similar mistakes recurring? (should decrease)

---

## 7. Rollout Plan

### Phase 1a: Reflection Generation Only (Sprint 2, Week 1)

- Add reflection schema to rotation.json
- Generate reflections after each cycle
- Don't inject into context yet — just collect data

### Phase 1b: Reflection Consumption (Sprint 2, Week 2)

- Inject last 3 reflections into dispatch context
- Monitor token usage and action quality
- Tune prompts based on initial results

### Phase 1c: Cross-Role Insights (Sprint 3)

- Surface high-value lessons to other roles
- Potential: Auto-append top lessons to role playbooks
- This leads into Phase 2 (Playbook Self-Refinement)

---

## 8. Safety Considerations

### 8.1 Avoiding Reflection Loops

- Reflections are generated once per action
- No recursive self-critique (save for Phase 3+)
- Max 3 reflections in context prevents bloat

### 8.2 Graceful Degradation

- If reflection generation fails, log warning and continue
- Never block dispatch cycle for reflection

### 8.3 Privacy

- Reflections are stored locally in rotation.json
- No PII should appear (agents don't have access to user data)

---

## 9. Open Questions

1. **Should reflections be visible in memory bank?**
   - Pro: Cross-role visibility
   - Con: Adds noise to shared memory
   - Recommendation: Keep in rotation.json for now, revisit after Phase 1b

2. **Optimal reflection count in context?**
   - 3 feels right — enough pattern recognition, minimal token cost
   - Could experiment with 5 if valuable

3. **Should outcome tracking integrate with GitHub?**
   - Future: Link reflection outcomes to PR merge status
   - Defer to Phase 2 Outcome Tracking

---

## 10. References

- Issue #108: Recursive Language Models — deep-dive analysis
- Shinn et al. (2023) — _Reflexion: Language Agents with Verbal Reinforcement Learning_
- ADA dispatch protocol: `agents/DISPATCH.md`
- Memory bank: `agents/memory/bank.md`

---

## 11. Next Steps

1. **Engineering:** Review spec, estimate implementation effort
2. **Product:** Prioritize in Sprint 2 backlog
3. **Frontier:** Align with MemoryStream Phase 3 for future integration
4. **Scrum:** Create implementation issue from this spec

---

_Reflexion is the first step toward self-improving agents. Start simple, measure carefully, iterate._

🔬 _Research — Cycle 228_
