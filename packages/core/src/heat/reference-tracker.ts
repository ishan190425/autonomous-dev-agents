/**
 * @ada/core — Dispatch Heat Reference Tracker
 *
 * Tracks memory references from dispatch action text and updates heat scores.
 * When agents reference lessons (L297), decisions (ADR-001), issues (#118),
 * or cycles (C776), those entries get their heat scores boosted.
 *
 * This closes the feedback loop: frequently-referenced memories stay hot,
 * rarely-referenced memories decay to cold storage.
 *
 * @example
 * ```typescript
 * import { trackActionReferences } from '@ada/core/heat';
 *
 * const result = await trackActionReferences(
 *   '🌌 DISPATCH HEAT INTEGRATION (C776) — Per L410, using heat scoring. Relates to #113.',
 *   heatStore
 * );
 * // result.tracked = ['L410', '#113', 'C776']
 * // result.created = ['L410'] (if new)
 * // result.incremented = ['#113', 'C776'] (if existed)
 * ```
 *
 * @see docs/design/memory-heat-cli-spec-c629.md §4.2 Reference Tracking
 * @see Issue #113 — Cognitive Memory Architecture
 * @packageDocumentation
 */

import type { HeatStore, HeatEntry } from './store.js';
import type { MemoryClass } from './types.js';

// ─── Reference Types ────────────────────────────────────────────────────────

/**
 * Types of references we track from action text.
 */
export type ReferenceType = 'lesson' | 'decision' | 'issue' | 'cycle';

/**
 * A parsed reference from action text.
 */
export interface ParsedReference {
  /** The full reference string (e.g., 'L410', 'ADR-001', '#113', 'C776') */
  readonly ref: string;

  /** The type of reference */
  readonly type: ReferenceType;

  /** The numeric ID extracted */
  readonly id: number;
}

/**
 * Result of tracking references in action text.
 */
export interface TrackingResult {
  /** All references found in the text */
  readonly found: readonly ParsedReference[];

  /** References that were incremented (already existed) */
  readonly incremented: readonly string[];

  /** References that were created (new entries) */
  readonly created: readonly string[];

  /** References that failed to track (errors) */
  readonly errors: readonly string[];
}

// ─── Reference Patterns ─────────────────────────────────────────────────────

/**
 * Patterns to detect references in action text.
 * Order matters for extraction precedence.
 */
const REFERENCE_PATTERNS: ReadonlyArray<{
  readonly type: ReferenceType;
  readonly pattern: RegExp;
}> = [
  // Lessons: L1, L297, L410
  { type: 'lesson', pattern: /\bL(\d+)\b/g },

  // Architecture Decisions: ADR-001, adr-001
  { type: 'decision', pattern: /\bADR-(\d+)\b/gi },

  // Issues: #113, #118, #155
  { type: 'issue', pattern: /\B#(\d+)\b/g },

  // Cycles: C776, C629
  { type: 'cycle', pattern: /\bC(\d+)\b/g },
];

// ─── Memory Class Mapping ───────────────────────────────────────────────────

/**
 * Base importance by reference type.
 * Higher importance = slower decay.
 *
 * @see docs/design/memory-heat-cli-spec-c629.md §2 Memory Heat Types
 */
const BASE_IMPORTANCE: Record<ReferenceType, number> = {
  lesson: 0.8, // Lessons are highly valuable
  decision: 0.9, // Architecture decisions are critical
  issue: 0.6, // Issues have moderate importance
  cycle: 0.5, // Cycles are contextual
};

/**
 * Memory class by reference type.
 */
const MEMORY_CLASS: Record<ReferenceType, MemoryClass> = {
  lesson: 'learned', // Lessons are learned from experience
  decision: 'innate', // Decisions should be stable (near-innate)
  issue: 'learned', // Issues are operational context
  cycle: 'learned', // Cycles are ephemeral context
};

// ─── Extraction ─────────────────────────────────────────────────────────────

/**
 * Extract all references from action text.
 *
 * @param text - Action description or reflection text
 * @returns Array of parsed references (deduplicated)
 */
export function extractReferences(text: string): ParsedReference[] {
  const seen = new Set<string>();
  const refs: ParsedReference[] = [];

  for (const { type, pattern } of REFERENCE_PATTERNS) {
    // Reset regex state for each pattern
    const regex = new RegExp(pattern.source, pattern.flags);

    for (const match of text.matchAll(regex)) {
      const ref = match[0].toUpperCase(); // Normalize to uppercase
      const idStr = match[1];

      // Skip if no capture group (shouldn't happen with our patterns)
      if (!idStr) continue;

      const id = parseInt(idStr, 10);

      // Deduplicate
      if (!seen.has(ref)) {
        seen.add(ref);
        refs.push({ ref, type, id });
      }
    }
  }

  return refs;
}

// ─── Tracking ───────────────────────────────────────────────────────────────

/**
 * Track references from action text and update heat store.
 *
 * For each reference found:
 * - If entry exists: increment reference count
 * - If entry doesn't exist: create with base importance
 *
 * @param text - Action description (from dispatch complete)
 * @param store - Heat store to update
 * @param persist - Whether to save after each update (default: false for batch, save once at end)
 * @returns Tracking result with found, incremented, created, errors
 */
export async function trackActionReferences(
  text: string,
  store: HeatStore,
  persist: boolean = true
): Promise<TrackingResult> {
  const found = extractReferences(text);
  const incremented: string[] = [];
  const created: string[] = [];
  const errors: string[] = [];

  const now = Date.now();

  for (const { ref, type } of found) {
    try {
      const existing = store.get(ref);

      if (existing) {
        // Increment existing entry
        await store.increment(ref, false); // Batch: don't persist yet
        incremented.push(ref);
      } else {
        // Create new entry
        const entry: HeatEntry = {
          id: ref,
          memoryClass: MEMORY_CLASS[type],
          baseImportance: BASE_IMPORTANCE[type],
          referenceCount: 1, // First reference
          lastAccessedAt: now,
          createdAt: now,
        };
        await store.set(entry, false); // Batch: don't persist yet
        created.push(ref);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[ReferenceTracker] Failed to track ${ref}: ${message}`);
      errors.push(ref);
    }
  }

  // Persist once at end (if requested)
  if (persist && (incremented.length > 0 || created.length > 0)) {
    await store.save();
  }

  return {
    found,
    incremented,
    created,
    errors,
  };
}

/**
 * Track references from multiple text sources (e.g., action + reflection).
 *
 * @param texts - Array of text sources to scan
 * @param store - Heat store to update
 * @returns Combined tracking result
 */
export function trackMultipleReferences(
  texts: string[],
  store: HeatStore
): Promise<TrackingResult> {
  // Combine all texts
  const combined = texts.filter(Boolean).join('\n');
  return trackActionReferences(combined, store);
}

/**
 * Get a summary string for the tracking result.
 * Useful for logging or display.
 *
 * @param result - Tracking result
 * @returns Human-readable summary
 */
export function formatTrackingResult(result: TrackingResult): string {
  const parts: string[] = [];

  if (result.created.length > 0) {
    parts.push(`created: ${result.created.join(', ')}`);
  }

  if (result.incremented.length > 0) {
    parts.push(`boosted: ${result.incremented.join(', ')}`);
  }

  if (result.errors.length > 0) {
    parts.push(`errors: ${result.errors.join(', ')}`);
  }

  if (parts.length === 0) {
    return 'no references tracked';
  }

  return parts.join(' | ');
}
