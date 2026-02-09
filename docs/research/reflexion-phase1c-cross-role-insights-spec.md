# Reflexion Phase 1c: Cross-Role Insights Spec

> Specification for detecting and surfacing insights that transcend individual roles.
> Phase 1c of the Recursive LM roadmap (Issue #108).
>
> **Author:** 🌌 Frontier — Cycle 249
> **Status:** DRAFT
> **Target:** Sprint 3
> **Prereqs:** Phase 1a ✅ (PR #110), Phase 1b ✅ (PR #114)

---

## Executive Summary

Phase 1a/1b enable individual roles to learn from their own reflections. Phase 1c extends this to **team-wide learning**: detecting patterns that emerge across multiple roles and surfacing them as candidates for RULES.md or shared best practices.

When 3+ roles independently discover the same lesson, that's a strong signal for a team-wide rule.

**Goal:** Surface 2-3 cross-role insights per 50 cycles, reducing team-wide mistakes by 30%.

---

## 1. Concept: From Individual to Collective Learning

```
┌─────────────────────────────────────────────────────────────┐
│              Phase 1b: Individual Role Learning             │
├─────────────────────────────────────────────────────────────┤
│  Engineering: "Always run lint before PR"                   │
│  Ops: "Check lint before merge approval"                    │
│  QA: "Verify lint passes in CI before approval"             │
│  (Same insight, discovered independently by 3 roles)        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           Phase 1c: Cross-Role Insight Detection            │
├─────────────────────────────────────────────────────────────┤
│  Pattern detected: "lint verification" across 3 roles       │
│  Confidence: High (independent discovery = strong signal)   │
│  Proposal: Add to RULES.md or shared best practices         │
│  (Individual learning → Team learning)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Cross-Role Insight Types

### 2.1 Convergent Discoveries

Multiple roles independently discover the same lesson.

**Detection:** Same semantic content in `lessonLearned` or `whatWorked` across 3+ roles.

**Example:**

- Engineering C230: "Lesson: Check existing utils before writing new code"
- Design C235: "Worked: Reviewed core exports before proposing new API"
- Ops C240: "Lesson: Always check if utility exists before adding dependencies"

**Result:** Propose RULES.md addition: "Before creating new utilities, check `@ada/core` for existing implementations."

### 2.2 Complementary Insights

Different roles observe different aspects of the same underlying pattern.

**Detection:** Thematically related insights that form a complete picture.

**Example:**

- Engineering C228: "Improve: Tests should be written before implementation"
- QA C232: "Worked: TDD PRs have fewer bugs to catch"
- Product C236: "Lesson: Features specced with test criteria ship faster"

**Result:** These complement each other → Propose TDD as team practice.

### 2.3 Cascading Failures

One role's mistake causes issues for downstream roles.

**Detection:** Temporal correlation between `blocked` outcomes across roles.

**Example:**

- Engineering C240: "Outcome: partial, Improve: Should have included types"
- QA C241: "Outcome: blocked, Lesson: Can't test untyped functions"
- Ops C242: "Outcome: blocked, Improve: PR failed typecheck"

**Result:** Engineering's missing types cascaded → Reinforce strict typing rule.

---

## 3. Detection Algorithm

### 3.1 Core Detection Function

```typescript
interface CrossRoleInsight {
  type: 'convergent' | 'complementary' | 'cascading';
  insight: string; // Synthesized insight text
  roles: string[]; // Roles that contributed
  cycles: number[]; // Source cycles
  confidence: number; // 0-1 score
  sourceReflections: HistoryEntry[]; // Original reflections
  proposedAction: 'rules' | 'best_practice' | 'discussion';
  proposedText: string; // What to add to RULES.md
}

function detectCrossRoleInsights(
  history: HistoryEntry[],
  lookbackCycles: number = 50
): CrossRoleInsight[] {
  const recentHistory = history
    .filter(h => h.reflection)
    .slice(-lookbackCycles);

  const insights: CrossRoleInsight[] = [];

  // 1. Convergent: Group similar lessons across roles
  insights.push(...detectConvergent(recentHistory));

  // 2. Complementary: Find thematically related insights
  insights.push(...detectComplementary(recentHistory));

  // 3. Cascading: Find temporal failure chains
  insights.push(...detectCascading(recentHistory));

  return insights
    .filter(i => i.confidence >= 0.6)
    .sort((a, b) => b.confidence - a.confidence);
}
```

### 3.2 Convergent Detection

```typescript
function detectConvergent(history: HistoryEntry[]): CrossRoleInsight[] {
  // Group by semantic similarity across roles
  const lessonsByRole = new Map<string, string[]>();

  for (const entry of history) {
    const role = entry.role;
    const lessons = [
      entry.reflection?.lessonLearned,
      entry.reflection?.whatWorked,
    ].filter(Boolean);

    if (!lessonsByRole.has(role)) {
      lessonsByRole.set(role, []);
    }
    lessonsByRole.get(role)!.push(...lessons);
  }

  // Find lessons that appear across 3+ different roles
  const crossRoleClusters = clusterAcrossRoles(lessonsByRole, {
    minRoles: 3,
    similarityThreshold: 0.7,
  });

  return crossRoleClusters.map(cluster => ({
    type: 'convergent',
    insight: synthesizeInsight(cluster.texts),
    roles: cluster.roles,
    cycles: cluster.cycles,
    confidence: calculateConfidence(cluster),
    sourceReflections: cluster.entries,
    proposedAction: 'rules',
    proposedText: generateRuleProposal(cluster),
  }));
}
```

### 3.3 Similarity Matching Strategy

Phase 1c can leverage MemoryStream's embedding infrastructure:

```typescript
interface SimilarityOptions {
  method: 'embedding' | 'keyword' | 'llm';
  threshold: number;
}

// Recommendation: Use embeddings (already have from MemoryStream Phase 3)
// Fallback: Keyword overlap for simpler deployment
async function computeSimilarity(
  text1: string,
  text2: string,
  options: SimilarityOptions
): Promise<number> {
  if (options.method === 'embedding') {
    // Reuse MemoryStream embedding pipeline
    const [emb1, emb2] = await Promise.all([
      embedText(text1),
      embedText(text2),
    ]);
    return cosineSimilarity(emb1, emb2);
  }

  if (options.method === 'keyword') {
    return jaccardSimilarity(extractKeywords(text1), extractKeywords(text2));
  }

  // LLM-assisted (expensive, use for validation)
  return await llmSimilarityScore(text1, text2);
}
```

---

## 4. Confidence Scoring

### 4.1 Factors

| Factor              | Weight | Description                                              |
| ------------------- | ------ | -------------------------------------------------------- |
| Role diversity      | 0.4    | More roles = higher confidence (max at 5 roles)          |
| Temporal spread     | 0.2    | Spread across cycles = more robust (not just one moment) |
| Outcome correlation | 0.2    | If insight correlates with success outcomes              |
| Semantic clarity    | 0.2    | How specific and actionable the insight is               |

### 4.2 Confidence Formula

```typescript
function calculateConfidence(cluster: InsightCluster): number {
  const roleDiversity = Math.min(cluster.roles.length / 5, 1) * 0.4;
  const temporalSpread = calculateTemporalSpread(cluster.cycles) * 0.2;
  const outcomeCorrelation = calculateOutcomeCorrelation(cluster.entries) * 0.2;
  const semanticClarity = assessSemanticClarity(cluster.texts) * 0.2;

  return roleDiversity + temporalSpread + outcomeCorrelation + semanticClarity;
}

function calculateTemporalSpread(cycles: number[]): number {
  if (cycles.length < 2) return 0;
  const range = Math.max(...cycles) - Math.min(...cycles);
  // Score higher if spread across 10+ cycles
  return Math.min(range / 10, 1);
}
```

---

## 5. Surfacing Protocol

### 5.1 When to Surface Insights

**Trigger:** During Scrum retrospectives (every 10 cycles)

```typescript
// Integration with Scrum retro
async function runCrossRoleAnalysis(
  history: HistoryEntry[],
  lastRetro: number
): Promise<CrossRoleInsight[]> {
  const insights = detectCrossRoleInsights(history, lastRetro);

  // Filter to actionable insights
  return insights.filter(
    insight =>
      insight.confidence >= 0.7 &&
      !alreadyProposed(insight) &&
      isActionable(insight)
  );
}
```

### 5.2 Output Format

During retro, Scrum surfaces cross-role insights:

```markdown
## 🔗 Cross-Role Insights Detected

### Insight 1: Utility Reuse (Confidence: 85%)

**Observed by:** Engineering, Design, Ops (3 roles)
**Cycles:** 230, 235, 240 (spread: 10 cycles)

**Pattern:** Multiple roles independently discovered the value of checking
existing utilities before creating new ones.

**Source Reflections:**

- Engineering C230: "Check existing utils before writing new code"
- Design C235: "Reviewed core exports before proposing new API"
- Ops C240: "Always check if utility exists before adding dependencies"

**Proposed RULES.md Addition:**

> **R-013: Utility Reuse**
> Before creating new utilities, check `@ada/core` for existing implementations.
> Before adding new dependencies, verify no internal solution exists.

**Status:** Pending human review
```

### 5.3 GitHub Issue Creation

High-confidence cross-role insights generate a GitHub issue:

````markdown
## 🔗 Cross-Role Insight: Utility Reuse

**Type:** `convergent`
**Confidence:** 85%
**Roles:** Engineering, Design, Ops

### Pattern Summary

Multiple roles independently discovered the importance of checking existing
utilities before creating new implementations.

### Evidence

| Role        | Cycle | Reflection                                       |
| ----------- | ----- | ------------------------------------------------ |
| Engineering | 230   | "Check existing utils before writing new code"   |
| Design      | 235   | "Reviewed core exports before proposing new API" |
| Ops         | 240   | "Always check if utility exists before adding"   |

### Proposed RULES.md Amendment

```diff
+ ## R-013: Utility Reuse
+
+ Before creating new utilities or adding dependencies:
+ 1. Check `@ada/core` for existing implementations
+ 2. Search codebase for similar functionality
+ 3. If exists, reuse or extend; if not, proceed with creation
+
+ **Why:** Reduces duplication, improves consistency, lowers maintenance burden.
```
````

### Review Required

- [ ] Approve — Add to RULES.md
- [ ] Reject — Not valuable enough for team-wide rule
- [ ] Modify — Propose different wording

---

_Auto-generated by Phase 1c Cross-Role Detection — Cycle 249_

````

---

## 6. Storage Schema

### 6.1 Cross-Role Insights File

Store detected insights in `agents/state/cross-role-insights.json`:

```json
{
  "lastAnalysis": {
    "cycle": 250,
    "timestamp": "2026-02-10T09:00:00.000Z",
    "insightsFound": 2
  },
  "pending": [
    {
      "id": "cri-249-001",
      "type": "convergent",
      "insight": "Utility reuse before new implementations",
      "roles": ["engineering", "design", "ops"],
      "cycles": [230, 235, 240],
      "confidence": 0.85,
      "proposedText": "R-013: Utility Reuse...",
      "status": "pending",
      "issueNumber": 116
    }
  ],
  "applied": [
    {
      "id": "cri-200-001",
      "appliedAs": "R-012",
      "appliedCycle": 210
    }
  ],
  "rejected": []
}
````

### 6.2 Memory Bank Section

Add to `bank.md`:

```markdown
## Cross-Role Insights

### Pending Review

- **CRI-249-001:** Utility Reuse (Engineering, Design, Ops) — Issue #116

### Applied Rules

- C210: R-012 (GitHub Templates) from CRI-200-001

### Stats

- Insights detected: 5 | Applied: 3 | Rejected: 1 | Pending: 1
```

---

## 7. Integration Points

### 7.1 With Scrum Retros

```markdown
## Scrum Playbook Addition (Phase 1c)

### Retrospective Enhancement

During retrospectives (every 10 cycles):

1. Run `detectCrossRoleInsights()` on last N cycles
2. For each insight with confidence > 0.7:
   - Document in retro output
   - Create GitHub issue with `cross-role-insight` label
3. Summarize pending cross-role proposals
4. Track applied insights and their impact
```

### 7.2 With Phase 2 (Playbook Self-Refinement)

Phase 1c insights flow into Phase 2's pattern detection:

```typescript
// Phase 2 can query Phase 1c for team-wide patterns
function getTeamWidePatternsForRole(
  role: string,
  insights: CrossRoleInsight[]
): PlaybookAmendment[] {
  return insights
    .filter(i => i.roles.includes(role) && i.proposedAction === 'best_practice')
    .map(i => convertToPlaybookAmendment(i, role));
}
```

### 7.3 With MemoryStream (Semantic Search)

Leverage existing embedding infrastructure:

```typescript
// Reuse MemoryStream's embedding pipeline
import { embedText } from '@ada/core/memory/embeddings';

async function clusterReflectionsBySimilarity(
  reflections: string[]
): Promise<Cluster[]> {
  const embeddings = await Promise.all(reflections.map(r => embedText(r)));

  return clusterByCosineSimilarity(embeddings, {
    threshold: 0.7,
    minClusterSize: 3,
  });
}
```

---

## 8. Implementation Phases

### Phase 1c-a: Detection Infrastructure (Sprint 3, Week 1)

- [ ] Implement `detectCrossRoleInsights()` in `@ada/core`
- [ ] Add similarity matching (keyword-based first, embedding-upgrade later)
- [ ] Create `cross-role-insights.json` schema
- [ ] Add confidence scoring

### Phase 1c-b: Surfacing & Proposals (Sprint 3, Week 2)

- [ ] Integrate with Scrum retro playbook
- [ ] Create GitHub issue template for cross-role insights
- [ ] Add memory bank section
- [ ] Build CLI command: `ada insights list/detect`

### Phase 1c-c: Validation & Metrics (Sprint 3, Week 3)

- [ ] Track insight accuracy (were applied insights valuable?)
- [ ] Tune confidence thresholds
- [ ] Add human feedback loop
- [ ] Connect to Phase 2 pattern detection

---

## 9. Metrics & Evaluation

### 9.1 Success Criteria

| Metric                   | Target | Measurement                             |
| ------------------------ | ------ | --------------------------------------- |
| Insights per 50 cycles   | 2-3    | Total high-confidence insights detected |
| Cross-role rule adoption | 70%+   | Proposed rules approved by human        |
| Team mistake reduction   | -30%   | Same error class across roles           |
| Detection accuracy       | 80%+   | Human-validated as real patterns        |

### 9.2 Quality Signals

- Insights are novel (not already in RULES.md)
- Insights are actionable (clear what to do differently)
- Insights have diverse role coverage (not just 2 similar roles)
- Applied insights correlate with improved outcomes

---

## 10. Safety Considerations

### 10.1 Noise Filtering

- Minimum 3 roles to trigger (prevents 2-role coincidences)
- Minimum 0.7 confidence for surfacing
- De-duplicate against existing RULES.md
- Rate limit: Max 3 insights proposed per retro

### 10.2 Human Oversight

- All cross-role insights require human approval
- Applied insights tracked for rollback
- Regular audits of insight quality

### 10.3 Privacy

- Cross-role analysis doesn't expose individual reflections publicly
- Summaries are synthesized, not copied verbatim
- Role attribution is aggregated (which roles, not which specific entries)

---

## 11. Open Questions

1. **Minimum role count for convergent insights?**
   - 3 roles feels right (majority of 5-role subset)
   - Could experiment with 2+ for smaller teams

2. **How to weight recent vs old cycles?**
   - Recent insights might be more relevant
   - But team-wide patterns should be persistent
   - Proposal: No decay, let temporal spread factor handle it

3. **Should cascading failures auto-generate rules?**
   - They indicate systemic issues
   - But might be one-off incidents
   - Proposal: Higher confidence threshold (0.8+) for cascading

4. **Integration with existing learnings.md?**
   - Currently lessons are manually captured
   - Phase 1c could auto-populate candidates
   - Proposal: Separate file, link from learnings

---

## 12. Relationship to Reflexion Phases

```
Phase 1a: Reflection Generation
    └─► Individual agents generate post-action reflections
    └─► Stored in rotation.json history
    └─► PR #110 ✅

Phase 1b: Reflection Consumption
    └─► Agents load their own recent reflections
    └─► Influence action selection
    └─► PR #114 ✅

Phase 1c: Cross-Role Insights [THIS SPEC]
    └─► Detect patterns across multiple roles
    └─► Surface team-wide learnings
    └─► Propose additions to RULES.md
    └─► SPRINT 3 TARGET

Phase 2: Playbook Self-Refinement
    └─► Use patterns to amend individual playbooks
    └─► Human approval gate
    └─► Research spec ready (C248)
    └─► SPRINT 3-4 TARGET
```

---

## 13. Next Steps

1. **Engineering:** Review spec, estimate implementation effort
2. **Scrum:** Plan Phase 1c for Sprint 3 backlog
3. **Research:** Validate similarity matching approach
4. **Frontier:** Prototype detection algorithm with synthetic data
5. **Ops:** Define issue templates for cross-role insights

---

_When the team learns together, the team improves together. Phase 1c turns individual reflections into collective wisdom._

🌌 _Frontier — Cycle 249_
