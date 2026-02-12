# Pattern-to-Playbook Automation Specification (C449)

> **Author:** 🌌 The Frontier (Head of Platform & Innovation)
> **Cycle:** 449
> **Date:** 2026-02-12
> **Related Issues:** #108 (Reflexion), #113 (Cognitive Memory)
> **Status:** SPEC COMPLETE — Ready for Sprint 2 Implementation

---

## Executive Summary

This specification defines how ADA can **automatically suggest playbook improvements** based on Reflexion patterns. When the Reflexion system detects a cross-role pattern at 70%+ confidence, it should generate actionable playbook amendments — closing the self-improvement loop.

**Goal:** Transform manual pattern→lesson→playbook flow into automated pattern→suggestion pipeline.

---

## Current State (Manual Flow)

```
Cycle N:    Role reflects → "What worked: X. Lesson: Y"
Cycle N+10: Reflexion detects pattern across roles (e.g., "testing" appears 4x)
Cycle N+11: Frontier manually analyzes → Documents lessons (L182-L184)
Cycle N+12: Scrum manually updates playbooks or adds to RULES.md
```

**Problems:**

1. Requires human-in-the-loop (Frontier analyst)
2. Lessons live in memory bank, not in playbooks where they'd be actionable
3. No feedback loop to verify lesson application
4. 10+ cycle latency from pattern detection to playbook update

---

## Proposed State (Automated Flow)

```
Cycle N:    Role reflects → "What worked: X. Lesson: Y"
Cycle N+10: Reflexion detects pattern at 70%+ confidence
            → Pattern-to-Playbook generates suggestion
            → Suggestion stored in agents/suggestions/pending/
Cycle N+11: Next role reviews suggestions (optional)
            → "ada playbook suggest" shows pending suggestions
            → "ada playbook apply <id>" applies to playbook
            → "ada playbook reject <id>" rejects with reason
```

**Benefits:**

1. Zero-latency from pattern to suggestion
2. Suggestions are concrete, not abstract lessons
3. Audit trail of accepted/rejected suggestions
4. Full closed-loop self-improvement

---

## Architecture

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   Reflexion     │────▶│ Pattern Analyzer │────▶│ Suggestion Generator│
│   patterns.json │     │                  │     │                     │
└─────────────────┘     └──────────────────┘     └────────────────────┘
                                                          │
                                                          ▼
                              ┌────────────────────────────────────────┐
                              │     agents/suggestions/pending/        │
                              │     ├── suggestion-001.json            │
                              │     └── suggestion-002.json            │
                              └────────────────────────────────────────┘
                                                          │
                                        ┌─────────────────┼─────────────────┐
                                        ▼                 ▼                 ▼
                              ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                              │ ada playbook │  │ ada playbook │  │ ada playbook │
                              │ suggest      │  │ apply <id>   │  │ reject <id>  │
                              └──────────────┘  └──────────────┘  └──────────────┘
```

### Suggestion Schema

```typescript
interface PlaybookSuggestion {
  id: string; // e.g., "sug-001"
  patternId: string; // Source pattern from Reflexion
  patternConfidence: number; // e.g., 0.80
  targetPlaybook: string; // e.g., "agents/playbooks/qa.md"
  targetSection: string; // e.g., "## Quality Bar"
  suggestionType: 'add' | 'modify' | 'remove';
  suggestedText: string; // Actual text to add/change
  rationale: string; // Why this suggestion was generated
  sourceReflections: string[]; // Cycle references that contributed
  generatedAt: string; // ISO timestamp
  status: 'pending' | 'applied' | 'rejected';
  appliedAt?: string;
  appliedBy?: string; // Role that applied
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}
```

### Example Suggestion

```json
{
  "id": "sug-001",
  "patternId": "pattern-testing-c439",
  "patternConfidence": 0.8,
  "targetPlaybook": "agents/playbooks/qa.md",
  "targetSection": "## Quality Bar",
  "suggestionType": "add",
  "suggestedText": "- Every role should consider test implications before merging changes",
  "rationale": "Pattern 'testing' detected across 4 roles (QA, Scrum, Ops, Design) with 80% confidence. Testing is a cross-cutting concern, not just QA's responsibility.",
  "sourceReflections": ["C431-Scrum", "C432-QA", "C434-Ops", "C435-Design"],
  "generatedAt": "2026-02-12T12:15:00Z",
  "status": "pending"
}
```

---

## CLI Commands

### `ada playbook suggest`

List pending playbook suggestions.

```bash
$ ada playbook suggest

📋 Pending Playbook Suggestions (2)

┌─────────┬────────────────────┬────────────┬───────────────────────────────────┐
│ ID      │ Target             │ Confidence │ Summary                           │
├─────────┼────────────────────┼────────────┼───────────────────────────────────┤
│ sug-001 │ playbooks/qa.md    │ 80%        │ Add cross-cutting test guidance   │
│ sug-002 │ playbooks/design.md│ 76%        │ Add multi-role planning checklist │
└─────────┴────────────────────┴────────────┴───────────────────────────────────┘

View details: ada playbook suggest --id sug-001
```

### `ada playbook suggest --id <id>`

Show detailed suggestion.

```bash
$ ada playbook suggest --id sug-001

📝 Suggestion sug-001

  Pattern:    testing (80% confidence)
  Target:     agents/playbooks/qa.md → ## Quality Bar
  Type:       add

  Suggested Text:
  ┌────────────────────────────────────────────────────────────────────────┐
  │ - Every role should consider test implications before merging changes │
  └────────────────────────────────────────────────────────────────────────┘

  Rationale:
  Pattern 'testing' detected across 4 roles (QA, Scrum, Ops, Design) with
  80% confidence. Testing is a cross-cutting concern, not just QA's
  responsibility.

  Source Reflections: C431-Scrum, C432-QA, C434-Ops, C435-Design

Apply: ada playbook apply sug-001
Reject: ada playbook reject sug-001 --reason "..."
```

### `ada playbook apply <id>`

Apply a suggestion to its target playbook.

```bash
$ ada playbook apply sug-001

✅ Applied sug-001 to agents/playbooks/qa.md

  Section: ## Quality Bar
  Added:   "- Every role should consider test implications before merging changes"

  Moved to: agents/suggestions/applied/sug-001.json
```

### `ada playbook reject <id> --reason "..."`

Reject a suggestion with reason (for learning).

```bash
$ ada playbook reject sug-001 --reason "Already covered in RULES.md R-010"

❌ Rejected sug-001

  Reason: Already covered in RULES.md R-010
  Moved to: agents/suggestions/rejected/sug-001.json
```

---

## Confidence Thresholds

| Confidence | Behavior                                         |
| ---------- | ------------------------------------------------ |
| < 60%      | Ignored (too weak)                               |
| 60-69%     | Logged for monitoring, no suggestion generated   |
| 70-79%     | Suggestion generated, requires manual review     |
| 80-89%     | Suggestion generated, marked "high confidence"   |
| ≥ 90%      | Auto-apply option (Phase 3 — requires team vote) |

**Rationale (L187):** Reflexion patterns become actionable at 70%+ confidence. Below that, monitor; above that, extract and codify.

---

## Guardrails

### Prevent Bad Suggestions

1. **Scope Limits:** Suggestions can only modify files in `agents/playbooks/` and `agents/rules/`
2. **No Deletions at < 90%:** Suggestions cannot remove existing content unless confidence ≥ 90%
3. **Character Limit:** Suggested text max 500 characters (prevents runaway generation)
4. **Duplicate Detection:** No suggestion if similar text already exists in target
5. **Human Review Required:** All suggestions require explicit `apply` or `reject`

### Audit Trail

All suggestions are persisted:

- `agents/suggestions/pending/` — Awaiting review
- `agents/suggestions/applied/` — Applied suggestions (with who/when)
- `agents/suggestions/rejected/` — Rejected suggestions (with reason)

**Why This Matters:** Audit trail enables meta-learning — we can analyze which suggestions were accepted/rejected and improve the suggestion algorithm.

---

## Implementation Plan (Sprint 2)

### Phase 1: Core Infrastructure (Week 1)

**Package:** `@ada/core`

1. Create `PlaybookSuggestion` type and schema
2. Implement `SuggestionGenerator` class
   - Input: Reflexion pattern
   - Output: PlaybookSuggestion
3. Implement `SuggestionStore`
   - File-based storage in `agents/suggestions/`
   - Methods: create, list, get, apply, reject
4. Add tests (unit + integration)

**Acceptance Criteria:**

- [ ] SuggestionGenerator can create suggestions from patterns
- [ ] SuggestionStore persists to filesystem
- [ ] All guardrails enforced
- [ ] 90%+ test coverage

### Phase 2: CLI Integration (Week 2)

**Package:** `@ada/cli`

1. Add `ada playbook suggest` command
2. Add `ada playbook apply <id>` command
3. Add `ada playbook reject <id> --reason` command
4. Integrate with dispatch cycle (show pending count after `ada dispatch start`)

**Acceptance Criteria:**

- [ ] All 3 commands work per spec
- [ ] Dispatch shows "📋 3 pending playbook suggestions" notification
- [ ] CLI tests pass

### Phase 3: Reflexion Integration (Week 3)

**Package:** `@ada/core`

1. Hook SuggestionGenerator into Reflexion's pattern detection
2. Auto-generate suggestions when pattern crosses 70% threshold
3. Add `--skip-suggestions` flag to dispatch for emergency bypass

**Acceptance Criteria:**

- [ ] New 70%+ pattern → automatic suggestion in pending/
- [ ] Suggestion appears in next `ada playbook suggest`
- [ ] Full closed-loop demonstrated in dogfooding

---

## Success Metrics

| Metric             | Target               | How to Measure                                    |
| ------------------ | -------------------- | ------------------------------------------------- |
| Suggestion Quality | >60% acceptance rate | applied / (applied + rejected)                    |
| Latency            | <1 cycle             | Pattern detection to suggestion available         |
| Coverage           | All 10 playbooks     | At least 1 suggestion per playbook over 50 cycles |
| Adoption           | 100% review rate     | No suggestions stuck in pending >5 cycles         |

---

## Related Work

- **Reflexion Phase 1 (#108):** Pattern detection (complete)
- **Cognitive Memory (#113):** Heat scoring could prioritize high-confidence suggestions
- **Sprint 2 Planning (#102):** This spec feeds into Sprint 2 deliverables

---

## Conclusion

Pattern-to-Playbook Automation closes the self-improvement loop:

```
Reflect → Detect Patterns → Generate Suggestions → Apply to Playbooks → Better Behavior → Better Reflections
```

This is what "self-improving agents" means in practice. Not magical AGI — a systematic, auditable process where the team learns from itself.

**Status: Spec complete. Ready for Sprint 2 implementation (Feb 28).**

---

_🌌 The Frontier — Cycle 449_
