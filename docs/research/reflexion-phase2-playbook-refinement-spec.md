# Reflexion Phase 2: Playbook Self-Refinement Spec

> Specification for autonomous playbook evolution based on reflection patterns.
> Phase 2 of the Recursive LM roadmap (Issue #108).
>
> **Author:** 🔬 Research — Cycle 248
> **Status:** DRAFT
> **Target:** Sprint 3
> **Prereqs:** Phase 1a ✅ (PR #110), Phase 1b ✅ (PR #114)

---

## Executive Summary

Phase 1 gave agents the ability to reflect and learn from past cycles. Phase 2 takes this further: **agents that improve their own playbooks based on accumulated reflections**.

This is the first step toward truly self-improving agents — not just learning from mistakes, but codifying that learning into their operational DNA.

**Goal:** Autonomous playbook amendments with human-in-the-loop approval, reducing repeat mistakes by 80% over 100 cycles.

---

## 1. Concept: From Reflections to Playbook Evolution

```
┌─────────────────────────────────────────────────────────────┐
│              Phase 1: Individual Cycle Learning             │
├─────────────────────────────────────────────────────────────┤
│  Cycle N: Act → Reflect → Store reflection                  │
│  Cycle N+1: Load reflection → Influence action → Act        │
│  (Learning stays in short-term rotation.json context)       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           Phase 2: Accumulated Pattern Learning             │
├─────────────────────────────────────────────────────────────┤
│  Every N cycles: Analyze all reflections → Detect patterns  │
│  Pattern found: "whatToImprove" appears 5+ times            │
│  Proposal: "Add to playbook: Always run lint before PR"     │
│  Human: Reviews → Approves/Rejects → Playbook updated       │
│  (Learning codified into long-term playbook memory)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Pattern Detection Engine

### 2.1 What Patterns We're Looking For

| Pattern Type           | Detection Rule                                   | Action                         |
| ---------------------- | ------------------------------------------------ | ------------------------------ |
| **Repeated Mistake**   | Same `whatToImprove` appears 3+ times for a role | Propose preventive rule        |
| **Consistent Success** | Same `whatWorked` appears 5+ times               | Propose best practice          |
| **Outcome Shift**      | Blocked → Success after applying specific change | Propose the change as standard |
| **Cross-Role Insight** | Same lesson learned by 3+ different roles        | Propose to RULES.md            |

### 2.2 Pattern Detection Algorithm

```typescript
interface ReflectionPattern {
  type:
    | 'repeated_mistake'
    | 'consistent_success'
    | 'outcome_shift'
    | 'cross_role';
  text: string; // The actual insight text
  frequency: number; // How many times observed
  roles: string[]; // Which roles observed this
  cycles: number[]; // Which cycles
  confidence: number; // 0-1 score based on frequency and consistency
  proposedAmendment: string; // Suggested playbook text
}

function detectPatterns(
  history: HistoryEntry[],
  role: string,
  lookbackCycles: number = 50
): ReflectionPattern[] {
  // 1. Filter to recent history for this role
  const roleHistory = history
    .filter(h => h.role === role && h.reflection)
    .slice(-lookbackCycles);

  // 2. Group by similar improvement/success text (fuzzy match)
  const improveGroups = groupBySimilarity(
    roleHistory.map(h => h.reflection?.whatToImprove).filter(Boolean)
  );
  const successGroups = groupBySimilarity(
    roleHistory.map(h => h.reflection?.whatWorked).filter(Boolean)
  );

  // 3. Identify patterns meeting threshold
  const patterns: ReflectionPattern[] = [];

  for (const [text, occurrences] of improveGroups) {
    if (occurrences.length >= 3) {
      patterns.push({
        type: 'repeated_mistake',
        text,
        frequency: occurrences.length,
        roles: [role],
        cycles: occurrences.map(o => o.cycle),
        confidence: Math.min(occurrences.length / 5, 1),
        proposedAmendment: generateAmendment(text, 'preventive'),
      });
    }
  }

  for (const [text, occurrences] of successGroups) {
    if (occurrences.length >= 5) {
      patterns.push({
        type: 'consistent_success',
        text,
        frequency: occurrences.length,
        roles: [role],
        cycles: occurrences.map(o => o.cycle),
        confidence: Math.min(occurrences.length / 7, 1),
        proposedAmendment: generateAmendment(text, 'best_practice'),
      });
    }
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}
```

### 2.3 Similarity Matching

Reflections won't have identical text, so we need fuzzy matching:

```typescript
function groupBySimilarity(
  texts: string[],
  threshold: number = 0.7
): Map<string, Occurrence[]> {
  // Options:
  // 1. Simple: Levenshtein distance / Jaccard similarity on words
  // 2. Advanced: Embedding similarity (reuse MemoryStream embeddings)
  // 3. LLM-assisted: Ask model "Are these saying the same thing?"
  // Recommendation: Start with word-level Jaccard (simple, fast)
  // Graduate to embeddings if results are poor
}
```

---

## 3. Amendment Proposal Generation

### 3.1 Proposal Format

```typescript
interface PlaybookAmendment {
  id: string; // Unique ID for tracking
  proposedBy: string; // Role that triggered this
  proposedAt: string; // ISO timestamp
  targetFile: string; // Which playbook to modify
  section: string; // Where in the playbook (e.g., "Actions")
  amendmentType:
    | 'add_rule'
    | 'add_best_practice'
    | 'add_warning'
    | 'modify_existing';
  currentText?: string; // If modifying, what exists now
  proposedText: string; // The actual amendment text
  rationale: string; // Why this amendment (pattern summary)
  supportingEvidence: {
    pattern: ReflectionPattern;
    exampleCycles: number[]; // Specific cycles demonstrating the need
  };
  status: 'pending' | 'approved' | 'rejected' | 'superseded';
  reviewedBy?: string; // Human reviewer
  reviewedAt?: string;
  reviewNotes?: string;
}
```

### 3.2 Amendment Generation

```typescript
function generateAmendment(
  pattern: ReflectionPattern,
  playbook: string
): PlaybookAmendment {
  // Use LLM to transform pattern into playbook-appropriate language
  const prompt = `
You are refining a role's playbook based on observed patterns.

Pattern type: ${pattern.type}
Observed insight: "${pattern.text}"
Frequency: ${pattern.frequency} times over ${pattern.cycles.length} cycles

Current playbook section:
${playbook}

Generate a concise playbook amendment (1-2 sentences) that:
1. Fits the playbook's voice and style
2. Is actionable and specific
3. Addresses the root cause, not just symptoms

Format: Just the text to add, no preamble.
`;

  const proposedText = await llm.generate(prompt);

  return {
    id: generateId(),
    proposedBy: pattern.roles[0],
    proposedAt: new Date().toISOString(),
    targetFile: `agents/playbooks/${pattern.roles[0]}.md`,
    section:
      pattern.type === 'repeated_mistake' ? 'Checklist' : 'Best Practices',
    amendmentType: 'add_rule',
    proposedText,
    rationale: `Pattern detected: "${pattern.text}" observed ${pattern.frequency}x`,
    supportingEvidence: { pattern, exampleCycles: pattern.cycles.slice(0, 3) },
    status: 'pending',
  };
}
```

---

## 4. Human Approval Gate

### 4.1 Why Human-in-the-Loop is Critical

Self-modifying code is powerful but dangerous. Playbooks define agent behavior. Unchecked modification could:

- Introduce conflicting rules
- Degrade performance on edge cases
- Create feedback loops (bad rule → bad reflections → worse rule)

**Principle:** Agents propose, humans dispose.

### 4.2 Approval Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                  Amendment Proposal Flow                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Pattern Detection                                        │
│     └─► Analyze last 50 cycles of reflections               │
│                                                              │
│  2. Proposal Generation                                      │
│     └─► Create PlaybookAmendment with rationale             │
│                                                              │
│  3. GitHub Issue Creation                                    │
│     └─► `chore(agents): playbook amendment — <summary>`     │
│     └─► Label: `amendment`, `needs-human-review`            │
│     └─► Include diff preview, rationale, evidence           │
│                                                              │
│  4. Human Review                                             │
│     └─► Approve (merge), Reject (close), or Modify          │
│                                                              │
│  5. Application (if approved)                                │
│     └─► Agent applies diff to playbook                      │
│     └─► Commit: `docs(agents): apply playbook amendment`    │
│                                                              │
│  6. Feedback Loop                                            │
│     └─► Track if amendment improves outcomes                │
│     └─► Rollback if performance degrades                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Amendment Issue Template

````markdown
## 📝 Playbook Amendment Proposal

**Role:** {role}
**Target:** `agents/playbooks/{role}.md`
**Section:** {section}
**Type:** {amendmentType}

### Proposed Change

```diff
+ {proposedText}
```
````

### Rationale

{rationale}

### Supporting Evidence

| Cycle    | Reflection    | Outcome    |
| -------- | ------------- | ---------- |
| {cycle1} | {reflection1} | {outcome1} |
| {cycle2} | {reflection2} | {outcome2} |
| {cycle3} | {reflection3} | {outcome3} |

### Pattern Analysis

- **Frequency:** {frequency} occurrences
- **Confidence:** {confidence}%
- **Lookback:** Last {lookbackCycles} cycles

### Human Review Required

- [ ] Approve — I've reviewed and this amendment is valuable
- [ ] Reject — This amendment is not helpful or is incorrect
- [ ] Modify — I've edited the proposed text (update above)

**To approve:** Comment `/approve-amendment` and close issue.
**To reject:** Comment `/reject-amendment` with reason and close issue.

---

_Auto-generated by Phase 2 Pattern Detection — Cycle {currentCycle}_

````

---

## 5. Storage Schema

### 5.1 Amendments File

Store pending and historical amendments in `agents/state/amendments.json`:

```json
{
  "pending": [
    {
      "id": "amend-248-engineering-001",
      "proposedBy": "engineering",
      "proposedAt": "2026-02-09T09:30:00.000Z",
      "targetFile": "agents/playbooks/engineering.md",
      "section": "Checklist",
      "amendmentType": "add_rule",
      "proposedText": "Always run `npm run lint` locally before pushing any PR.",
      "rationale": "Pattern detected: 'run lint before PR' observed 4x",
      "status": "pending",
      "issueNumber": 115
    }
  ],
  "history": [
    {
      "id": "amend-200-ops-001",
      "status": "approved",
      "reviewedBy": "human",
      "reviewedAt": "2026-02-05T10:00:00.000Z",
      "appliedCycle": 205
    }
  ],
  "stats": {
    "totalProposed": 12,
    "approved": 8,
    "rejected": 3,
    "pending": 1
  }
}
````

### 5.2 Amendment Tracking in Memory Bank

Add section to `bank.md`:

```markdown
## Playbook Evolution

### Pending Amendments

- **#amend-248-engineering-001:** "Run lint before PR" — awaiting review (Issue #115)

### Recent Approvals

- C205: Ops added "Squash merge always" rule
- C190: Engineering added "Check existing utils first" rule

### Amendment Stats

- Proposed: 12 | Approved: 8 | Rejected: 3 | Pending: 1
```

---

## 6. Trigger Conditions

### 6.1 When to Run Pattern Detection

Option A: **Time-based** (every N cycles)

```
if (cycle_count % 25 === 0) runPatternDetection();
```

Option B: **Threshold-based** (accumulated reflections)

```
if (unreviewedReflections > 30) runPatternDetection();
```

Option C: **Role-based** (Scrum runs it during retrospectives)

```
// Scrum playbook addition
During retrospective, run pattern detection for all roles.
```

**Recommendation:** Option C — aligns with Scrum's existing retro responsibility. Pattern detection becomes part of the retrospective process.

### 6.2 Integration with Scrum Retros

```markdown
## Scrum Playbook Addition

### Retrospective Enhancement (Phase 2)

During retrospectives (every 10 cycles):

1. Run pattern detection across all roles
2. For each pattern with confidence > 0.7:
   - Generate amendment proposal
   - Create GitHub issue with `amendment` label
3. Summarize pending amendments in retro output
4. Track approved amendments and their impact
```

---

## 7. Safety Mechanisms

### 7.1 Amendment Limits

- **Max pending:** 5 amendments at a time (prevents proposal spam)
- **Cooldown:** No re-proposal of rejected amendments for 50 cycles
- **Rate limit:** Max 2 amendments proposed per role per retrospective

### 7.2 Conflict Detection

Before proposing, check:

- Does this contradict an existing rule in RULES.md?
- Does this duplicate an existing playbook item?
- Is this the inverse of a recently rejected amendment?

```typescript
function validateAmendment(amendment: PlaybookAmendment): ValidationResult {
  const conflicts = checkRulesConflicts(amendment);
  const duplicates = checkPlaybookDuplicates(amendment);
  const recentRejections = checkRecentRejections(amendment, 50);

  return {
    valid: !conflicts && !duplicates && !recentRejections,
    issues: [...conflicts, ...duplicates, ...recentRejections],
  };
}
```

### 7.3 Rollback Capability

If an approved amendment degrades performance:

```typescript
interface AmendmentRollback {
  amendmentId: string;
  reason: string;
  evidenceCycles: number[]; // Cycles showing degradation
  rolledBackAt: string;
}

// Track outcomes for 20 cycles post-approval
// If outcome metrics worsen significantly, flag for rollback review
```

---

## 8. Metrics & Evaluation

### 8.1 Success Criteria

| Metric                    | Baseline               | Target    | Measurement                                    |
| ------------------------- | ---------------------- | --------- | ---------------------------------------------- |
| Repeat mistake rate       | TBD (measure Phase 1b) | -80%      | Same `whatToImprove` appearing after amendment |
| Amendment approval rate   | N/A                    | >70%      | Human approvals / total proposals              |
| Amendment effectiveness   | N/A                    | >80%      | Approved amendments that improve outcomes      |
| Time to pattern detection | N/A                    | <5 cycles | From pattern emergence to proposal             |

### 8.2 Feedback Loop Metrics

Track for each approved amendment:

- Cycles until pattern reoccurs (should be never if effective)
- Outcome improvement for affected action types
- Agent satisfaction (qualitative: are reflections more positive?)

---

## 9. Implementation Phases

### Phase 2a: Pattern Detection (Sprint 3, Week 1)

- [ ] Implement `detectPatterns()` in `@ada/core`
- [ ] Add similarity matching for reflection texts
- [ ] Create `amendments.json` schema
- [ ] Add pattern detection to Scrum retro playbook

### Phase 2b: Proposal Generation (Sprint 3, Week 2)

- [ ] Implement `generateAmendment()` with LLM integration
- [ ] Create GitHub issue template for amendments
- [ ] Add conflict detection validation
- [ ] Build CLI command: `ada amendments list/propose/status`

### Phase 2c: Human Approval Flow (Sprint 3, Week 3)

- [ ] Implement `/approve-amendment` and `/reject-amendment` commands
- [ ] Auto-apply approved amendments to playbooks
- [ ] Track amendment history and stats
- [ ] Add amendment section to memory bank

### Phase 2d: Feedback Loop (Sprint 4)

- [ ] Track post-amendment outcomes
- [ ] Implement rollback detection and workflow
- [ ] Dashboard for amendment effectiveness
- [ ] Cross-role insight propagation (Phase 1c completion)

---

## 10. Open Questions

1. **LLM for pattern matching vs embeddings?**
   - LLM: More accurate, higher cost
   - Embeddings: Fast, already have infrastructure from MemoryStream
   - Hybrid: Embeddings for clustering, LLM for final grouping

2. **Human approval latency?**
   - What if human doesn't review for days?
   - Proposal: Auto-remind after 3 cycles, auto-close (as "pending") after 10

3. **Cross-role amendments?**
   - Should Engineering's learning apply to Ops?
   - Proposal: Start role-scoped, graduate to cross-role in Phase 2d

4. **Playbook versioning?**
   - Do we track playbook versions for rollback?
   - Proposal: Git history is sufficient, add CHANGELOG.md for playbooks

5. **Amendment quality filtering?**
   - How to prevent low-value amendments ("be more careful")?
   - Proposal: LLM scoring for actionability before proposing

---

## 11. Risk Analysis

| Risk                              | Impact | Likelihood | Mitigation                         |
| --------------------------------- | ------ | ---------- | ---------------------------------- |
| Bad amendment approved            | High   | Low        | Human review, rollback capability  |
| Amendment spam                    | Medium | Medium     | Rate limits, confidence thresholds |
| Pattern detection false positives | Medium | Medium     | High confidence threshold (0.7+)   |
| Human approval bottleneck         | Medium | Medium     | Auto-reminders, clear process      |
| Feedback loop divergence          | High   | Low        | Outcome tracking, periodic audits  |

---

## 12. Connection to Future Phases

### Phase 3: Prompt Evolution

If Phase 2 succeeds with playbooks (natural language), extend to:

- System prompt optimization
- Few-shot example selection
- Temperature/model parameter tuning

### Phase 4: Recursive Delegation

Self-improving agents can eventually:

- Spawn sub-agents for complex tasks
- Sub-agents inherit refined playbooks
- Learning propagates through the hierarchy

---

## 13. References

- [Reflexion Integration Spec](./reflexion-integration-spec.md) — Phase 1a
- [Reflexion Consumption Guide](./reflexion-consumption-guide.md) — Phase 1b
- [Issue #108](https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/108) — Tracking issue
- [DSPy](https://github.com/stanfordnlp/dspy) — Inspiration for prompt optimization
- Madaan et al. (2023) — _Self-Refine: Iterative Refinement with Self-Feedback_

---

## 14. Next Steps

1. **Engineering:** Review spec, estimate Phase 2a/2b effort
2. **Scrum:** Plan Phase 2 for Sprint 3 backlog
3. **Product:** Define human approval UX (GitHub issues vs CLI vs web)
4. **Frontier:** Align pattern detection with MemoryStream embeddings
5. **Ops:** Define amendment commit conventions and CI checks

---

_Self-improving agents are not science fiction — they're the logical next step. Phase 2 takes us from agents that learn temporarily to agents that learn permanently._

🔬 _Research — Cycle 248_
