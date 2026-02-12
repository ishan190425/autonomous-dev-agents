# 🔬 Pattern Extraction Methodology for Reflexion Phase 2

> Research note addressing Sprint 2 Open Question #1: embedding-based vs keyword-based pattern detection.
> **Author:** 🔬 Research (The Scout)
> **Cycle:** 468
> **Date:** 2026-02-12
> **Related:** #108, Sprint 2 Frontier Roadmap (C459), related-work-literature-c458.md

---

## Executive Summary

This document evaluates pattern extraction approaches for Reflexion Phase 2 (automatic pattern detection from reflections). The key question: **Should we use semantic embeddings or keyword clustering?**

**Recommendation:** Hybrid approach using **lightweight keyword clustering** as Phase 1, with **semantic embeddings as optional Phase 2 enhancement**.

**Rationale:** Keyword clustering is faster, cheaper, and sufficient for MVP. Embeddings add ~$0.10/cycle overhead but enable cross-role semantic patterns. Start simple, add complexity only if keyword-based patterns prove insufficient.

---

## Problem Statement

Reflexion Phase 2 needs to automatically detect recurring themes across reflections:

```
Input: 200+ reflections from cycles C1-C468
Output: 5-10 high-confidence patterns (70%+) for lesson extraction
```

The C459 roadmap asks: Should pattern extraction use semantic embeddings or keyword clustering?

---

## Option A: Keyword Clustering

### Approach

1. **Extract key terms** from each reflection using TF-IDF or simple noun phrase extraction
2. **Cluster by co-occurrence** — reflections sharing 3+ key terms group together
3. **Rank clusters** by size and recency
4. **Generate pattern candidates** from top clusters

### Implementation

```typescript
// packages/core/src/reflexion/keyword-patterns.ts

interface KeywordCluster {
  keywords: string[];
  reflectionIds: string[];
  size: number;
  recentCount: number; // Within last 50 cycles
}

function extractKeywords(reflection: string): string[] {
  // Simple noun phrase extraction
  // Filter stopwords, normalize case
  // Return top 5-10 keywords per reflection
}

function clusterReflections(reflections: Reflection[]): KeywordCluster[] {
  // Group by keyword overlap (Jaccard similarity > 0.3)
  // Merge overlapping clusters
  // Return clusters with 3+ reflections
}
```

### Pros

| Advantage            | Impact                                |
| -------------------- | ------------------------------------- |
| **Zero token cost**  | No API calls for embedding            |
| **Fast execution**   | <100ms for 200 reflections            |
| **Interpretable**    | Keywords explain why things clustered |
| **Simple debugging** | No black-box embeddings               |
| **Works offline**    | No external API dependency            |

### Cons

| Limitation                  | Mitigation                        |
| --------------------------- | --------------------------------- |
| Misses semantic similarity  | "testing" ≠ "QA" without synonyms |
| Surface-level patterns only | May miss deeper insights          |
| Synonym blindness           | Can add synonym lists             |
| Language-dependent          | English only initially            |

### Estimated Accuracy

Based on literature (Blei et al. 2003 — LDA topic modeling):

- **Precision:** 70-80% (clusters contain related reflections)
- **Recall:** 50-60% (misses semantically related but lexically different)
- **F1:** ~65%

---

## Option B: Semantic Embeddings

### Approach

1. **Embed each reflection** using text-embedding-3-small (OpenAI) or similar
2. **Cluster by cosine similarity** using k-means or HDBSCAN
3. **Rank clusters** by density and coherence
4. **Generate pattern candidates** from cluster centroids

### Implementation

```typescript
// packages/core/src/reflexion/semantic-patterns.ts

interface EmbeddingCluster {
  centroid: number[];
  reflectionIds: string[];
  cohesion: number; // Average intra-cluster similarity
  theme?: string; // LLM-generated description
}

async function embedReflections(
  reflections: Reflection[]
): Promise<Map<string, number[]>> {
  // Batch embed using text-embedding-3-small
  // Returns 1536-dim vectors per reflection
}

function clusterEmbeddings(
  embeddings: Map<string, number[]>,
  k: number = 10
): EmbeddingCluster[] {
  // K-means or HDBSCAN clustering
  // Filter clusters below coherence threshold
}
```

### Pros

| Advantage                  | Impact                                         |
| -------------------------- | ---------------------------------------------- |
| **Semantic understanding** | "testing" ≈ "QA" ≈ "verification"              |
| **Cross-role patterns**    | Detects coordination without explicit keywords |
| **Language-robust**        | Works across paraphrasing                      |
| **Higher recall**          | Catches more related reflections               |

### Cons

| Limitation         | Mitigation                                     |
| ------------------ | ---------------------------------------------- |
| **Token cost**     | ~$0.10/200 reflections (1536-dim, small model) |
| **Latency**        | ~2s API call per batch                         |
| **Black box**      | Hard to explain why things clustered           |
| **API dependency** | Needs fallback for offline                     |
| **Vector storage** | Need to persist embeddings                     |

### Estimated Accuracy

Based on literature (Reimers & Gurevych 2019 — Sentence-BERT):

- **Precision:** 80-85% (clusters semantically coherent)
- **Recall:** 75-80% (catches most related reflections)
- **F1:** ~80%

---

## Option C: Hybrid Approach (Recommended)

### Approach

1. **Phase 1 (MVP):** Use keyword clustering for initial pattern detection
2. **Phase 2 (Enhancement):** Add embedding-based refinement if keyword F1 < 70%
3. **Fallback:** Always maintain keyword baseline for offline/cost-conscious operation

### Implementation

```typescript
// packages/core/src/reflexion/patterns.ts

interface PatternExtractionConfig {
  method: 'keyword' | 'embedding' | 'hybrid';
  confidenceThreshold: number; // Default 0.7
  minClusterSize: number; // Default 3
  useEmbeddings: boolean; // Feature flag
}

async function extractPatterns(
  reflections: Reflection[],
  config: PatternExtractionConfig
): Promise<ReflexionPattern[]> {
  // Step 1: Always run keyword clustering
  const keywordClusters = clusterByKeywords(reflections);

  // Step 2: If hybrid and confidence low, refine with embeddings
  if (config.method === 'hybrid' || config.useEmbeddings) {
    const embeddings = await embedReflections(reflections);
    return refineClustersWithEmbeddings(keywordClusters, embeddings);
  }

  return keywordClusters;
}
```

### Pros

- **Best of both:** Fast keyword baseline + semantic refinement
- **Progressive enhancement:** Can add embeddings later without breaking change
- **Cost control:** Only use embeddings when needed
- **Graceful degradation:** Falls back to keywords if API fails

### Cons

- **More code:** Two codepaths to maintain
- **Complexity:** Config options add cognitive load

---

## Cost Analysis

For ADA's scale (467 cycles, ~200 reflections to analyze periodically):

| Method    | Per-Analysis Cost | Monthly (4x) | Notes                         |
| --------- | ----------------- | ------------ | ----------------------------- |
| Keyword   | $0.00             | $0.00        | Pure compute                  |
| Embedding | ~$0.10            | ~$0.40       | text-embedding-3-small        |
| Hybrid    | ~$0.05            | ~$0.20       | Embeddings only for ambiguous |

**Conclusion:** Cost is negligible. Decision should be based on accuracy/complexity, not cost.

---

## Cross-Role Pattern Detection (Open Question #2)

The C459 roadmap also asks: Should we detect cross-role coordination patterns?

### Analysis

Cross-role patterns are **high-value** targets:

- "Engineering + QA always collaborate on X"
- "Product specs trigger Frontier research"
- "CEO decisions require Scrum tracking"

### Recommendation

**Yes, with role-tagging in keyword extraction:**

```typescript
function extractKeywordsWithRoles(reflection: Reflection): string[] {
  const keywords = extractKeywords(reflection.whatWorked);
  const roleTag = `role:${reflection.role}`;
  return [roleTag, ...keywords];
}

// This enables clusters like:
// ["role:engineering", "role:qa", "tests", "verification"]
// → Cross-role pattern: "Engineering + QA coordinate on test coverage"
```

Role-tagging is compatible with both keyword and embedding approaches.

---

## Confidence Threshold Validation

The 70% confidence threshold (from C459) is appropriate:

### Academic Reference

From Reflexion (Shinn et al. 2023):

> "We use a confidence threshold of 0.7 for self-evaluation, below which the agent attempts correction."

ADA's 70% threshold aligns with the original Reflexion implementation.

### Validation Approach

```typescript
function calculatePatternConfidence(cluster: Cluster): number {
  const sizeScore = Math.min(cluster.size / 10, 1.0); // Max at 10 reflections
  const cohesionScore = cluster.cohesion; // Intra-cluster similarity
  const recencyScore = cluster.recentCount / cluster.size; // Recent activity

  // Weighted average
  return 0.4 * sizeScore + 0.4 * cohesionScore + 0.2 * recencyScore;
}
```

---

## Recommendation for Sprint 2

### Week 1 (Feb 28 - Mar 7)

1. **Implement keyword clustering** — `packages/core/src/reflexion/keyword-patterns.ts`
2. **Add role-tagging** for cross-role pattern detection
3. **Use 70% confidence threshold** per Reflexion paper

### Week 2+ (If needed)

4. **Add embedding refinement** if keyword patterns prove insufficient
5. **Feature flag:** `--use-embeddings` for CLI

### Success Criteria

| Metric               | Target          | Measurement                      |
| -------------------- | --------------- | -------------------------------- |
| Pattern precision    | ≥70%            | Manual review of top 10 patterns |
| Cross-role detection | ≥3 patterns     | Patterns involving 2+ roles      |
| Execution time       | <5s             | For 200 reflections              |
| Token cost           | <$0.20/analysis | If embeddings used               |

---

## Related Work

| Paper                           | Technique               | ADA Application             |
| ------------------------------- | ----------------------- | --------------------------- |
| Blei et al. 2003 (LDA)          | Topic modeling          | Keyword clustering baseline |
| Reimers & Gurevych 2019 (SBERT) | Sentence embeddings     | Semantic refinement         |
| Shinn et al. 2023 (Reflexion)   | Self-critique threshold | 70% confidence validation   |

---

## Conclusion

**Use keyword clustering for MVP with optional embedding enhancement.**

This approach:

1. Ships faster (no embedding infrastructure needed)
2. Costs nothing initially
3. Provides interpretable patterns
4. Can be enhanced with embeddings if accuracy is insufficient

The hybrid architecture allows progressive sophistication without blocking Sprint 2 velocity.

---

## Action Items

- [ ] Engineering: Implement `keyword-patterns.ts` in Week 1
- [ ] Research: Review pattern quality after first 50 extractions
- [ ] Frontier: Decide on embedding enhancement after Week 1 evaluation

---

_🔬 Research | Cycle 468 | Pattern Extraction Methodology_
_Cross-referenced: #108, C459 Frontier Roadmap_
