/**
 * @ada/core — Cross-Role Insights Detection
 *
 * Phase 1c of the Reflexion roadmap (Issue #108).
 * Detects patterns that emerge across multiple roles and surfaces
 * them as candidates for RULES.md or shared best practices.
 *
 * When 3+ roles independently discover the same lesson, that's a
 * strong signal for a team-wide rule.
 *
 * @see docs/research/reflexion-phase1c-cross-role-insights-spec.md
 *
 * 🌌 Frontier Prototype — Cycle 269
 */

import type {
  Reflection,
  RotationHistoryEntry,
  RoleId,
} from './types.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Types of cross-role insights we can detect */
export type InsightType = 'convergent' | 'complementary' | 'cascading';

/** Proposed action for a detected insight */
export type InsightAction = 'rules' | 'best_practice' | 'discussion';

/**
 * A cross-role insight detected from rotation history.
 *
 * Represents a pattern that emerged across multiple roles,
 * suggesting a team-wide learning opportunity.
 */
export interface CrossRoleInsight {
  /** Unique identifier for this insight */
  readonly id: string;
  /** Type of cross-role pattern detected */
  readonly type: InsightType;
  /** Synthesized insight text */
  readonly insight: string;
  /** Roles that contributed to this pattern */
  readonly roles: readonly RoleId[];
  /** Cycles where the pattern was observed */
  readonly cycles: readonly number[];
  /** Confidence score (0-1) */
  readonly confidence: number;
  /** Source reflections that contributed */
  readonly sourceReflections: readonly ReflectionSource[];
  /** Recommended action for this insight */
  readonly proposedAction: InsightAction;
  /** Proposed text for RULES.md or playbook */
  readonly proposedText: string;
}

/**
 * A reflection entry with its source context.
 */
export interface ReflectionSource {
  readonly role: RoleId;
  readonly cycle: number;
  readonly timestamp: string;
  readonly text: string;
  readonly field: 'whatWorked' | 'whatToImprove' | 'lessonLearned';
}

/**
 * A cluster of similar reflections across roles.
 */
export interface ReflectionCluster {
  /** The common theme/keywords */
  readonly theme: string;
  /** All reflections in this cluster */
  readonly entries: readonly ReflectionSource[];
  /** Unique roles represented */
  readonly roles: readonly RoleId[];
  /** Cycles where observed */
  readonly cycles: readonly number[];
  /** Average similarity within cluster */
  readonly avgSimilarity: number;
}

/**
 * Options for cross-role insight detection.
 */
export interface DetectionOptions {
  /** Number of recent cycles to analyze (default: 50) */
  readonly lookbackCycles?: number;
  /** Minimum roles for convergent insight (default: 3) */
  readonly minRoles?: number;
  /** Minimum confidence to surface (default: 0.6) */
  readonly minConfidence?: number;
  /** Keyword similarity threshold (default: 0.4) */
  readonly similarityThreshold?: number;
}

/** Default detection options */
export const DEFAULT_DETECTION_OPTIONS: Required<DetectionOptions> = {
  lookbackCycles: 50,
  minRoles: 3,
  minConfidence: 0.6,
  similarityThreshold: 0.4,
} as const;

// ─── Keyword Extraction ──────────────────────────────────────────────────────

/** Common stop words to filter out */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once',
  'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
  'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
  'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its',
  'our', 'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why',
  'how', 'all', 'each', 'every', 'any', 'some', 'no', 'more', 'most',
  'other', 'such', 'as', 'if', 'because', 'until', 'while', 'although',
  'always', 'never', 'already', 'still', 'now', 'new', 'first', 'last',
]);

/**
 * Extract meaningful keywords from text.
 *
 * @param text - Text to extract keywords from
 * @returns Set of lowercase keywords
 */
export function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  return new Set(words);
}

/**
 * Calculate Jaccard similarity between two keyword sets.
 *
 * @param set1 - First keyword set
 * @param set2 - Second keyword set
 * @returns Similarity score (0-1)
 */
export function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 0;

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

// ─── Reflection Extraction ───────────────────────────────────────────────────

/**
 * Extract all reflection texts from rotation history.
 *
 * @param history - Rotation history entries
 * @param lookbackCycles - Number of recent cycles to analyze
 * @returns Array of reflection sources
 */
export function extractReflectionSources(
  history: readonly RotationHistoryEntry[],
  lookbackCycles: number = 50
): ReflectionSource[] {
  const sources: ReflectionSource[] = [];

  // Get the most recent N entries with reflections
  const recentWithReflections = history
    .filter((h): h is RotationHistoryEntry & { reflection: Reflection } =>
      h.reflection !== undefined
    )
    .slice(-lookbackCycles);

  for (const entry of recentWithReflections) {
    const { role, cycle, timestamp, reflection } = entry;

    // Extract each reflection field as a separate source
    if (reflection.whatWorked) {
      sources.push({
        role,
        cycle,
        timestamp,
        text: reflection.whatWorked,
        field: 'whatWorked',
      });
    }

    if (reflection.whatToImprove) {
      sources.push({
        role,
        cycle,
        timestamp,
        text: reflection.whatToImprove,
        field: 'whatToImprove',
      });
    }

    if (reflection.lessonLearned) {
      sources.push({
        role,
        cycle,
        timestamp,
        text: reflection.lessonLearned,
        field: 'lessonLearned',
      });
    }
  }

  return sources;
}

// ─── Clustering ──────────────────────────────────────────────────────────────

/**
 * Cluster reflections by keyword similarity.
 *
 * Uses single-linkage clustering with Jaccard similarity.
 *
 * @param sources - Reflection sources to cluster
 * @param threshold - Minimum similarity to link clusters
 * @returns Array of reflection clusters
 */
export function clusterReflections(
  sources: readonly ReflectionSource[],
  threshold: number = 0.4
): ReflectionCluster[] {
  if (sources.length === 0) return [];

  // Pre-compute keywords for each source
  const sourceKeywords = sources.map(s => ({
    source: s,
    keywords: extractKeywords(s.text),
  }));

  // Build clusters using single-linkage
  const clusters: ReflectionCluster[] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < sourceKeywords.length; i++) {
    if (assigned.has(i)) continue;

    const sourceI = sourceKeywords[i];
    if (!sourceI) continue;

    const cluster: ReflectionSource[] = [sourceI.source];
    assigned.add(i);

    // Find all sources similar to any in the cluster
    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < sourceKeywords.length; j++) {
        if (assigned.has(j)) continue;

        // Check similarity against all cluster members
        const sourceJ = sourceKeywords[j];
        if (!sourceJ) continue;

        for (const member of cluster) {
          const memberKw = extractKeywords(member.text);
          const sim = jaccardSimilarity(memberKw, sourceJ.keywords);

          if (sim >= threshold) {
            cluster.push(sourceJ.source);
            assigned.add(j);
            changed = true;
            break;
          }
        }
      }
    }

    // Only keep clusters with 2+ members
    if (cluster.length >= 2) {
      const roles = [...new Set(cluster.map(c => c.role))];
      const cycles = [...new Set(cluster.map(c => c.cycle))].sort((a, b) => a - b);

      // Calculate average similarity within cluster
      let totalSim = 0;
      let pairs = 0;
      for (let a = 0; a < cluster.length; a++) {
        for (let b = a + 1; b < cluster.length; b++) {
          const entryA = cluster[a];
          const entryB = cluster[b];
          if (entryA && entryB) {
            const kwA = extractKeywords(entryA.text);
            const kwB = extractKeywords(entryB.text);
            totalSim += jaccardSimilarity(kwA, kwB);
            pairs++;
          }
        }
      }
      const avgSimilarity = pairs > 0 ? totalSim / pairs : 0;

      // Synthesize theme from common keywords
      const allKeywords = cluster.flatMap(c => [...extractKeywords(c.text)]);
      const keywordCounts = new Map<string, number>();
      for (const kw of allKeywords) {
        keywordCounts.set(kw, (keywordCounts.get(kw) ?? 0) + 1);
      }
      const topKeywords = [...keywordCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([kw]) => kw);

      clusters.push({
        theme: topKeywords.join(', '),
        entries: cluster,
        roles,
        cycles,
        avgSimilarity,
      });
    }
  }

  return clusters;
}

// ─── Confidence Scoring ──────────────────────────────────────────────────────

/**
 * Factors for confidence calculation.
 *
 * Based on the spec:
 * - Role diversity: 0.4 (more roles = higher confidence)
 * - Temporal spread: 0.2 (spread across cycles = more robust)
 * - Outcome correlation: 0.2 (reserved for future)
 * - Semantic clarity: 0.2 (how specific and actionable)
 */
export interface ConfidenceFactors {
  readonly roleDiversity: number;
  readonly temporalSpread: number;
  readonly semanticClarity: number;
}

/**
 * Calculate confidence factors for a cluster.
 *
 * @param cluster - The reflection cluster
 * @returns Individual confidence factors
 */
export function calculateConfidenceFactors(
  cluster: ReflectionCluster
): ConfidenceFactors {
  // Role diversity: More roles = higher confidence (max at 5)
  const roleDiversity = Math.min(cluster.roles.length / 5, 1);

  // Temporal spread: Spread across 10+ cycles = robust pattern
  const cycleRange = cluster.cycles.length > 1
    ? Math.max(...cluster.cycles) - Math.min(...cluster.cycles)
    : 0;
  const temporalSpread = Math.min(cycleRange / 10, 1);

  // Semantic clarity: Based on keyword overlap (avgSimilarity)
  // Higher overlap = clearer shared concept
  const semanticClarity = cluster.avgSimilarity;

  return {
    roleDiversity,
    temporalSpread,
    semanticClarity,
  };
}

/**
 * Calculate overall confidence score for a cluster.
 *
 * @param cluster - The reflection cluster
 * @returns Confidence score (0-1)
 */
export function calculateConfidence(cluster: ReflectionCluster): number {
  const factors = calculateConfidenceFactors(cluster);

  // Weighted sum per spec
  return (
    factors.roleDiversity * 0.4 +
    factors.temporalSpread * 0.2 +
    factors.semanticClarity * 0.4  // Using 0.4 instead of 0.2+0.2 (outcome reserved)
  );
}

// ─── Insight Generation ──────────────────────────────────────────────────────

/**
 * Generate a unique insight ID.
 *
 * @param cycle - Current cycle number
 * @param index - Index within the cycle's insights
 * @returns Unique ID string
 */
export function generateInsightId(cycle: number, index: number): string {
  return `cri-${cycle}-${String(index + 1).padStart(3, '0')}`;
}

/**
 * Synthesize an insight text from a cluster.
 *
 * @param cluster - The reflection cluster
 * @returns Synthesized insight text
 */
export function synthesizeInsight(cluster: ReflectionCluster): string {
  // Extract the most common field type to understand the pattern
  const fieldCounts = new Map<string, number>();
  for (const entry of cluster.entries) {
    fieldCounts.set(entry.field, (fieldCounts.get(entry.field) ?? 0) + 1);
  }
  const dominantField = [...fieldCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'lessonLearned';

  // Generate insight based on field type and theme
  const roleList = cluster.roles.join(', ');

  if (dominantField === 'whatWorked') {
    return `Multiple roles (${roleList}) found success with: ${cluster.theme}`;
  } else if (dominantField === 'whatToImprove') {
    return `Multiple roles (${roleList}) identified improvement area: ${cluster.theme}`;
  } else {
    return `Cross-role learning discovered by ${roleList}: ${cluster.theme}`;
  }
}

/**
 * Generate proposed rule text from a cluster.
 *
 * @param cluster - The reflection cluster
 * @param ruleId - Rule ID to use (e.g., "R-XXX")
 * @returns Proposed RULES.md text
 */
export function generateRuleProposal(
  cluster: ReflectionCluster,
  ruleId: string = 'R-XXX'
): string {
  const lines = [
    `## ${ruleId}: ${capitalize(cluster.theme)}`,
    '',
  ];

  // Extract unique lesson texts
  const uniqueLessons = [...new Set(cluster.entries.map(e => e.text))];

  if (uniqueLessons.length === 1 && uniqueLessons[0]) {
    lines.push(uniqueLessons[0]);
  } else if (uniqueLessons.length > 0) {
    // Combine as bullet points
    lines.push('Best practices identified across multiple roles:');
    lines.push('');
    for (const lesson of uniqueLessons.slice(0, 3)) {
      lines.push(`- ${lesson}`);
    }
  }

  lines.push('');
  lines.push(`**Evidence:** Discovered independently by ${cluster.roles.join(', ')} across cycles ${cluster.cycles.join(', ')}.`);

  return lines.join('\n');
}

/**
 * Capitalize first letter of a string.
 */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Determine the appropriate action for an insight.
 *
 * @param cluster - The reflection cluster
 * @returns Recommended action
 */
export function determineAction(cluster: ReflectionCluster): InsightAction {
  // 5+ roles with high similarity → strong candidate for RULES.md
  if (cluster.roles.length >= 5 && cluster.avgSimilarity >= 0.5) {
    return 'rules';
  }

  // 3-4 roles → best practice candidate
  if (cluster.roles.length >= 3) {
    return 'best_practice';
  }

  // Otherwise, surface for discussion
  return 'discussion';
}

// ─── Main Detection ──────────────────────────────────────────────────────────

/**
 * Detect convergent cross-role insights.
 *
 * Convergent insights are patterns where multiple roles independently
 * discovered the same lesson or approach.
 *
 * @param history - Rotation history entries
 * @param options - Detection options
 * @returns Array of convergent insights
 */
export function detectConvergentInsights(
  history: readonly RotationHistoryEntry[],
  options: DetectionOptions = {}
): CrossRoleInsight[] {
  const opts = { ...DEFAULT_DETECTION_OPTIONS, ...options };

  // Extract reflection sources
  const sources = extractReflectionSources(history, opts.lookbackCycles);

  if (sources.length < opts.minRoles) {
    return []; // Not enough data
  }

  // Cluster by similarity
  const clusters = clusterReflections(sources, opts.similarityThreshold);

  // Filter to clusters with minimum role diversity
  const crossRoleClusters = clusters.filter(c => c.roles.length >= opts.minRoles);

  // Generate insights
  const currentCycle = Math.max(...history.map(h => h.cycle), 0);
  const insights: CrossRoleInsight[] = [];

  for (let i = 0; i < crossRoleClusters.length; i++) {
    const cluster = crossRoleClusters[i];
    if (!cluster) continue;

    const confidence = calculateConfidence(cluster);

    // Filter by minimum confidence
    if (confidence < opts.minConfidence) continue;

    insights.push({
      id: generateInsightId(currentCycle, i),
      type: 'convergent',
      insight: synthesizeInsight(cluster),
      roles: cluster.roles,
      cycles: cluster.cycles,
      confidence,
      sourceReflections: cluster.entries,
      proposedAction: determineAction(cluster),
      proposedText: generateRuleProposal(cluster),
    });
  }

  // Sort by confidence descending
  return insights.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect all types of cross-role insights.
 *
 * This is the main entry point for Phase 1c detection.
 *
 * @param history - Rotation history entries
 * @param options - Detection options
 * @returns Array of all detected insights
 */
export function detectCrossRoleInsights(
  history: readonly RotationHistoryEntry[],
  options: DetectionOptions = {}
): CrossRoleInsight[] {
  const insights: CrossRoleInsight[] = [];

  // 1. Convergent insights (same lesson by 3+ roles)
  insights.push(...detectConvergentInsights(history, options));

  // 2. Complementary insights — TODO in Phase 1c-b
  // 3. Cascading failures — TODO in Phase 1c-b

  return insights;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/**
 * Format insights for memory bank / retro output.
 *
 * @param insights - Detected insights
 * @returns Formatted markdown string
 */
export function formatInsightsForRetro(insights: readonly CrossRoleInsight[]): string {
  if (insights.length === 0) {
    return '## 🔗 Cross-Role Insights\n\nNo cross-role patterns detected this period.';
  }

  const lines = [
    '## 🔗 Cross-Role Insights Detected',
    '',
  ];

  for (const insight of insights) {
    const confidencePct = Math.round(insight.confidence * 100);
    lines.push(`### ${insight.id}: ${insight.insight.slice(0, 60)}... (${confidencePct}%)`);
    lines.push('');
    lines.push(`**Type:** ${insight.type}`);
    lines.push(`**Roles:** ${insight.roles.join(', ')} (${insight.roles.length} roles)`);
    lines.push(`**Cycles:** ${insight.cycles.join(', ')}`);
    lines.push(`**Recommended Action:** ${insight.proposedAction}`);
    lines.push('');
    lines.push('**Source Reflections:**');
    for (const source of insight.sourceReflections.slice(0, 3)) {
      lines.push(`- ${source.role} C${source.cycle}: "${source.text}"`);
    }
    if (insight.sourceReflections.length > 3) {
      lines.push(`- ... and ${insight.sourceReflections.length - 3} more`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate GitHub issue body for a cross-role insight.
 *
 * @param insight - The insight to create an issue for
 * @returns GitHub issue body markdown
 */
export function generateInsightIssueBody(insight: CrossRoleInsight): string {
  const lines = [
    `## 🔗 Cross-Role Insight: ${insight.insight.slice(0, 50)}`,
    '',
    `**Type:** \`${insight.type}\``,
    `**Confidence:** ${Math.round(insight.confidence * 100)}%`,
    `**Roles:** ${insight.roles.join(', ')}`,
    '',
    '### Pattern Summary',
    '',
    insight.insight,
    '',
    '### Evidence',
    '',
    '| Role | Cycle | Reflection |',
    '|------|-------|------------|',
  ];

  for (const source of insight.sourceReflections.slice(0, 5)) {
    lines.push(`| ${source.role} | ${source.cycle} | "${source.text}" |`);
  }

  lines.push('');
  lines.push('### Proposed Amendment');
  lines.push('');
  lines.push('```markdown');
  lines.push(insight.proposedText);
  lines.push('```');
  lines.push('');
  lines.push('### Review Required');
  lines.push('');
  lines.push('- [ ] **Approve** — Add to RULES.md');
  lines.push('- [ ] **Reject** — Not valuable enough for team-wide rule');
  lines.push('- [ ] **Modify** — Propose different wording');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`_Auto-generated by Phase 1c Cross-Role Detection — ${insight.id}_`);

  return lines.join('\n');
}
