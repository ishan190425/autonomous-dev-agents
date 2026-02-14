/**
 * @ada-ai/core — Confidence Scoring for Reflexion Phase 2
 *
 * Calculates confidence scores for detected patterns.
 * Based on Reflexion paper (Shinn et al. 2023) with 0.7 threshold.
 *
 * @see docs/frontier/reflexion-phase2-impl-spec-c469.md
 */

import type { ReflectionCluster } from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Default confidence threshold per Reflexion paper */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/** Minimum reflections per role for cross-role detection */
const MIN_REFLECTIONS_PER_ROLE = 2;

/** Maximum cluster size for normalization */
const MAX_SIZE_NORMALIZATION = 10;

// ─── Confidence Weights ──────────────────────────────────────────────────────

/**
 * Weights for confidence calculation.
 * Per C468 recommendation: 40% size, 40% cohesion, 20% recency.
 */
const CONFIDENCE_WEIGHTS = {
  size: 0.4,
  cohesion: 0.4,
  recency: 0.2,
} as const;

// ─── Scoring Functions ───────────────────────────────────────────────────────

/**
 * Calculate pattern confidence per Reflexion paper (Shinn et al. 2023).
 * Uses size, cohesion, and recency as weighted factors.
 *
 * Formula: 0.4 * sizeScore + 0.4 * cohesionScore + 0.2 * recencyScore
 *
 * @param cluster - Cluster to score
 * @returns Confidence score between 0 and 1
 */
export function calculateConfidence(cluster: ReflectionCluster): number {
  // Size score: caps at MAX_SIZE_NORMALIZATION reflections
  const sizeScore = Math.min(cluster.size / MAX_SIZE_NORMALIZATION, 1.0);

  // Cohesion score: already 0-1 from cluster calculation
  const cohesionScore = cluster.cohesion;

  // Recency score: fraction of cluster that's recent
  const recencyScore =
    cluster.size > 0 ? cluster.recentCount / cluster.size : 0;

  // Weighted average per C468 recommendation
  const confidence =
    CONFIDENCE_WEIGHTS.size * sizeScore +
    CONFIDENCE_WEIGHTS.cohesion * cohesionScore +
    CONFIDENCE_WEIGHTS.recency * recencyScore;

  // Round to 3 decimal places
  return Math.round(confidence * 1000) / 1000;
}

// ─── Pattern Classification ──────────────────────────────────────────────────

/**
 * Determine if a cluster represents a cross-role pattern.
 * Cross-role = 2+ roles each with 2+ reflections.
 *
 * @param cluster - Cluster to check
 * @returns True if pattern involves multiple roles significantly
 */
export function isCrossRolePattern(cluster: ReflectionCluster): boolean {
  const significantRoles = Object.values(cluster.roleDistribution).filter(
    (count) => count >= MIN_REFLECTIONS_PER_ROLE
  );
  return significantRoles.length >= 2;
}

// ─── Theme Generation ────────────────────────────────────────────────────────

/**
 * Generate a theme name from cluster keywords.
 * Capitalizes and joins the top 3 keywords.
 *
 * @param cluster - Cluster to generate theme for
 * @returns Human-readable theme string
 */
export function generateTheme(cluster: ReflectionCluster): string {
  const keywords = cluster.keywords.slice(0, 3);

  if (keywords.length === 0) {
    return 'Unnamed Pattern';
  }

  // Capitalize first letter of each keyword and join with " + "
  return keywords
    .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
    .join(' + ');
}

/**
 * Generate a description for the pattern.
 * Creates context-aware description based on cross-role status.
 *
 * @param cluster - Source cluster
 * @param crossRole - Whether this is a cross-role pattern
 * @returns Human-readable description
 */
export function generateDescription(
  cluster: ReflectionCluster,
  crossRole: boolean
): string {
  const roleList = Object.keys(cluster.roleDistribution);
  const keywordList = cluster.keywords.slice(0, 3).join(', ');

  if (crossRole) {
    return `Cross-role pattern involving ${roleList.join(', ')} around: ${keywordList}. Detected in ${cluster.size} reflections.`;
  }

  return `Pattern around: ${keywordList}. Detected in ${cluster.size} reflections from ${roleList.join(', ')}.`;
}

/**
 * Get a summary of confidence factors for debugging/display.
 *
 * @param cluster - Cluster to analyze
 * @returns Object with individual factor scores
 */
export function getConfidenceBreakdown(
  cluster: ReflectionCluster
): {
  sizeScore: number;
  cohesionScore: number;
  recencyScore: number;
  weightedTotal: number;
} {
  const sizeScore = Math.min(cluster.size / MAX_SIZE_NORMALIZATION, 1.0);
  const cohesionScore = cluster.cohesion;
  const recencyScore =
    cluster.size > 0 ? cluster.recentCount / cluster.size : 0;

  return {
    sizeScore: Math.round(sizeScore * 100) / 100,
    cohesionScore: Math.round(cohesionScore * 100) / 100,
    recencyScore: Math.round(recencyScore * 100) / 100,
    weightedTotal: calculateConfidence(cluster),
  };
}
