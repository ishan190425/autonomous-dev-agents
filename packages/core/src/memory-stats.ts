/**
 * @ada/core — Memory Stats Extraction
 *
 * Utilities for extracting statistics and health information from the memory bank.
 * Supports the `ada memory stats` CLI command (Issue #52, Phase 2).
 *
 * @see docs/architecture/cli-memory-stats-ux-spec.md for UX specification
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { extractVersion, extractCycle, countLines } from './memory.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Bank metadata extracted from the header.
 */
export interface BankInfo {
  /** Bank version number (e.g., 4) */
  version: number;
  /** ISO timestamp of last update */
  lastUpdated: string | null;
  /** Date of last compression (YYYY-MM-DD format) */
  lastCompression: string | null;
  /** Number of lines in the bank */
  lines: number;
}

/**
 * Cycle information extracted from the bank.
 */
export interface CycleInfo {
  /** Total cycles recorded */
  total: number;
  /** Cycles since last compression */
  sinceCompression: number;
  /** Average cycles per day (null if insufficient data) */
  perDay: number | null;
}

/**
 * Count of items in each memory section.
 */
export interface SectionCounts {
  /** Number of active blockers */
  blockers: number;
  /** Number of active threads */
  activeThreads: number;
  /** Number of architecture decisions */
  decisions: number;
  /** Number of lessons learned */
  lessons: number;
  /** Whether metrics section is present */
  hasMetrics: boolean;
}

/**
 * Health status of the memory system.
 */
export type HealthStatusLevel = 'healthy' | 'warning' | 'unhealthy';

/**
 * Health assessment with status and any warnings.
 */
export interface HealthStatus {
  /** Overall health status */
  status: HealthStatusLevel;
  /** List of warning messages (if any) */
  warnings: string[];
}

/**
 * Complete memory stats output.
 */
export interface MemoryStats {
  /** Bank metadata */
  bank: BankInfo;
  /** Cycle information */
  cycles: CycleInfo;
  /** Role activity counts from rotation history */
  roleActivity: Record<string, number>;
  /** Section counts */
  sections: SectionCounts;
  /** Health assessment */
  health: HealthStatus;
}

/**
 * Archive file information.
 */
export interface ArchiveInfo {
  /** Archive filename */
  filename: string;
  /** Version number from filename */
  version: number;
  /** Date from filename */
  date: string;
  /** Full path to archive */
  path: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Line threshold for compression warning */
const LINE_THRESHOLD_WARNING = 150;
/** Line threshold for compression required */
const LINE_THRESHOLD_UNHEALTHY = 200;
/** Cycle threshold for compression warning */
const CYCLE_THRESHOLD_WARNING = 8;
/** Cycle threshold for compression required */
const CYCLE_THRESHOLD_UNHEALTHY = 10;
/** Blocker count for warning */
const BLOCKER_THRESHOLD_WARNING = 1;
/** Blocker count for unhealthy */
const BLOCKER_THRESHOLD_UNHEALTHY = 3;
/** Active thread count for warning */
const THREAD_THRESHOLD_WARNING = 15;
/** Active thread count for unhealthy */
const THREAD_THRESHOLD_UNHEALTHY = 20;

// ─── Extraction Functions ────────────────────────────────────────────────────

/**
 * Extract last updated timestamp from bank header.
 *
 * Looks for pattern: `**Last updated:** <timestamp>`
 */
export function extractLastUpdated(content: string): string | null {
  // Pattern: **Last updated:** 2026-02-06 02:18:00 EST | **Cycle:** 83
  const match = content.match(
    /\*\*Last updated:\*\*\s*([^|*\n]+)/i
  );
  if (match?.[1]) {
    return match[1].trim();
  }
  return null;
}

/**
 * Extract last compression date from bank header.
 *
 * Looks for pattern: `**Last compression:** <date>`
 */
export function extractLastCompression(content: string): string | null {
  const match = content.match(
    /\*\*Last compression:\*\*\s*(\d{4}-\d{2}-\d{2})/i
  );
  return match?.[1] ?? null;
}

/**
 * Extract bank info from content.
 */
export function extractBankInfo(content: string): BankInfo {
  return {
    version: extractVersion(content),
    lastUpdated: extractLastUpdated(content),
    lastCompression: extractLastCompression(content),
    lines: countLines(content),
  };
}

/**
 * Calculate cycles since compression.
 */
export function calculateCyclesSinceCompression(
  content: string,
  rotationHistoryLength: number
): number {
  // The rotation.json history only keeps last 10 cycles
  // We can estimate from the version and total cycles
  const lastCompression = extractLastCompression(content);
  if (!lastCompression) {
    // Never compressed — all cycles are since compression
    return extractCycle(content);
  }

  // Try to find compression mention in the bank itself
  const versionMatch = content.match(/Compressed from v\d+ on (\d{4}-\d{2}-\d{2})/);
  if (versionMatch) {
    // Count cycles from history that are after compression date
    return rotationHistoryLength;
  }

  // Fallback: use history length as approximation
  return rotationHistoryLength;
}

/**
 * Extract role activity from rotation history.
 *
 * @param history - Array of history entries from rotation.json
 * @param limit - Maximum entries to consider (default 10)
 */
export function extractRoleActivity(
  history: Array<{ role: string; cycle: number; timestamp: string }>,
  limit: number = 10
): Record<string, number> {
  const activity: Record<string, number> = {};

  const recentHistory = history.slice(0, limit);
  for (const entry of recentHistory) {
    const role = entry.role;
    activity[role] = (activity[role] ?? 0) + 1;
  }

  return activity;
}

/**
 * Count blockers in the Blockers section.
 *
 * Filters out "None" patterns and counts actual blocker items.
 */
export function countBlockers(content: string): number {
  // Find the Blockers section
  const blockersMatch = content.match(
    /###?\s*Blockers\s*\n([\s\S]*?)(?=\n##|\n---|\n\*\*|$)/i
  );

  if (!blockersMatch?.[1]) return 0;

  const section = blockersMatch[1].trim();

  // Check for "none" patterns
  const nonePatterns = [
    /^none\s*🎉?\s*$/im,
    /^-?\s*none\s*$/im,
    /^no blockers/im,
    /^✅/m,
  ];

  for (const pattern of nonePatterns) {
    if (pattern.test(section)) {
      return 0;
    }
  }

  // Count actual blocker items (lines starting with - that aren't "none")
  const lines = section.split('\n');
  let count = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') && !/none/i.test(trimmed)) {
      count++;
    }
  }

  return count;
}

/**
 * Count active threads in the Active Threads section.
 */
export function countActiveThreads(content: string): number {
  const threadsMatch = content.match(
    /##?\s*Active Threads\s*\n([\s\S]*?)(?=\n##|\n---|\n\*\*|$)/i
  );

  if (!threadsMatch?.[1]) return 0;

  const section = threadsMatch[1].trim();
  const lines = section.split('\n');

  let count = 0;
  for (const line of lines) {
    if (line.trim().startsWith('-')) {
      count++;
    }
  }

  return count;
}

/**
 * Count architecture decisions in the table.
 */
export function countDecisions(content: string): number {
  const decisionsMatch = content.match(
    /##?\s*Architecture Decisions\s*\n([\s\S]*?)(?=\n##|\n---|\n\*\*|$)/i
  );

  if (!decisionsMatch?.[1]) return 0;

  const section = decisionsMatch[1].trim();
  const lines = section.split('\n');

  // Count table rows (lines starting with |, excluding header and separator)
  let count = 0;
  let foundTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|')) {
      if (!foundTable) {
        foundTable = true;
        continue; // Skip header
      }
      if (/^\|[\s-:]+\|/.test(trimmed)) {
        continue; // Skip separator
      }
      count++;
    }
  }

  return count;
}

/**
 * Count lessons learned (numbered list items).
 */
export function countLessons(content: string): number {
  const lessonsMatch = content.match(
    /##?\s*(?:Key )?Lessons(?:\s*Learned)?\s*\n([\s\S]*?)(?=\n##|\n---|\n\*\*|$)/i
  );

  if (!lessonsMatch?.[1]) return 0;

  const section = lessonsMatch[1].trim();

  // Count numbered list items
  const numberedItems = section.match(/^\d+\.\s+/gm);
  return numberedItems?.length ?? 0;
}

/**
 * Check if metrics section exists.
 */
export function hasMetricsSection(content: string): boolean {
  return /##?\s*Project Metrics/i.test(content);
}

/**
 * Extract all section counts.
 */
export function extractSectionCounts(content: string): SectionCounts {
  return {
    blockers: countBlockers(content),
    activeThreads: countActiveThreads(content),
    decisions: countDecisions(content),
    lessons: countLessons(content),
    hasMetrics: hasMetricsSection(content),
  };
}

// ─── Health Assessment ───────────────────────────────────────────────────────

/**
 * Calculate health status based on stats.
 */
export function calculateHealth(
  bank: BankInfo,
  cycles: CycleInfo,
  sections: SectionCounts
): HealthStatus {
  const warnings: string[] = [];
  let status: HealthStatusLevel = 'healthy';

  // Check line count
  if (bank.lines > LINE_THRESHOLD_UNHEALTHY) {
    warnings.push(`Bank needs compression (${bank.lines}/${LINE_THRESHOLD_UNHEALTHY} lines)`);
    status = 'unhealthy';
  } else if (bank.lines > LINE_THRESHOLD_WARNING) {
    warnings.push(`Bank approaching compression threshold (${bank.lines}/${LINE_THRESHOLD_UNHEALTHY} lines)`);
    if (status === 'healthy') status = 'warning';
  }

  // Check cycles since compression
  if (cycles.sinceCompression >= CYCLE_THRESHOLD_UNHEALTHY) {
    warnings.push(`Compression overdue (${cycles.sinceCompression}/${CYCLE_THRESHOLD_UNHEALTHY} cycles)`);
    status = 'unhealthy';
  } else if (cycles.sinceCompression >= CYCLE_THRESHOLD_WARNING) {
    warnings.push(`Compression due soon (${cycles.sinceCompression}/${CYCLE_THRESHOLD_UNHEALTHY} cycles)`);
    if (status === 'healthy') status = 'warning';
  }

  // Check blockers
  if (sections.blockers >= BLOCKER_THRESHOLD_UNHEALTHY) {
    warnings.push(`Multiple blockers need attention (${sections.blockers} active)`);
    status = 'unhealthy';
  } else if (sections.blockers >= BLOCKER_THRESHOLD_WARNING) {
    warnings.push(`${sections.blockers} active blocker${sections.blockers > 1 ? 's' : ''}`);
    if (status === 'healthy') status = 'warning';
  }

  // Check thread count
  if (sections.activeThreads > THREAD_THRESHOLD_UNHEALTHY) {
    warnings.push(`Thread sprawl — consider cleanup (${sections.activeThreads} active)`);
    status = 'unhealthy';
  } else if (sections.activeThreads > THREAD_THRESHOLD_WARNING) {
    warnings.push(`High thread count (${sections.activeThreads} active)`);
    if (status === 'healthy') status = 'warning';
  }

  return { status, warnings };
}

// ─── Main Stats Function ─────────────────────────────────────────────────────

/**
 * Extract complete memory stats from bank content and rotation state.
 *
 * @param bankContent - Raw content of bank.md
 * @param rotationHistory - History array from rotation.json
 * @returns Complete memory stats
 */
export function extractMemoryStats(
  bankContent: string,
  rotationHistory: Array<{ role: string; cycle: number; timestamp: string }>
): MemoryStats {
  const bank = extractBankInfo(bankContent);

  const cycles: CycleInfo = {
    total: extractCycle(bankContent),
    sinceCompression: calculateCyclesSinceCompression(
      bankContent,
      rotationHistory.length
    ),
    perDay: null, // Would need date range to calculate
  };

  const roleActivity = extractRoleActivity(rotationHistory);
  const sections = extractSectionCounts(bankContent);
  const health = calculateHealth(bank, cycles, sections);

  return {
    bank,
    cycles,
    roleActivity,
    sections,
    health,
  };
}

// ─── Archive Functions ───────────────────────────────────────────────────────

/**
 * List archive files in the archives directory.
 */
export async function listArchives(archivesDir: string): Promise<ArchiveInfo[]> {
  const archives: ArchiveInfo[] = [];

  try {
    const files = await fs.readdir(archivesDir);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      // Parse filename: bank-2026-02-05-v3.md
      const match = file.match(/bank-(\d{4}-\d{2}-\d{2})-v(\d+)\.md/);
      if (match) {
        archives.push({
          filename: file,
          date: match[1]!,
          version: parseInt(match[2]!, 10),
          path: path.join(archivesDir, file),
        });
      }
    }

    // Sort by version descending
    archives.sort((a, b) => b.version - a.version);
  } catch {
    // Archives directory doesn't exist — that's fine
  }

  return archives;
}

/**
 * Format an activity bar for the given count.
 *
 * @param count - Activity count for this role
 * @param maxCount - Maximum count across all roles (for scaling)
 * @param maxWidth - Maximum bar width in characters
 */
export function formatActivityBar(
  count: number,
  maxCount: number,
  maxWidth: number = 12
): string {
  if (count === 0 || maxCount === 0) return '';

  const width = Math.max(1, Math.round((count / maxCount) * maxWidth));
  return '█'.repeat(width);
}

/**
 * Get relative time description.
 *
 * @param timestamp - ISO timestamp or date string
 * @returns Human-readable relative time (e.g., "2 hours ago", "3 days ago")
 */
export function getRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();

  if (isNaN(date.getTime())) {
    return timestamp; // Return as-is if not parseable
  }

  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return timestamp.split('T')[0] ?? timestamp;
}
