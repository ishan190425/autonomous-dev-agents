/**
 * @ada/core — Issue Tracking Utilities
 *
 * Functions for parsing GitHub issues, extracting Active Threads from memory bank,
 * and verifying issue tracking compliance.
 *
 * Implements R-013: Issue Tracking Protocol
 */

export interface ParsedIssue {
  readonly number: number;
  readonly title: string;
  readonly labels: readonly string[];
  readonly state: 'open' | 'closed';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ActiveThreadEntry {
  readonly issueNumber: number;
  readonly priority?: string; // P0, P1, P2, P3
  readonly role?: string;
  readonly size?: string; // S, M, L
  readonly description: string;
  readonly category?: 'active' | 'backlog' | 'closed';
}

export interface IssueTrackingResult {
  readonly totalOpenIssues: number;
  readonly trackedIssues: number;
  readonly missingIssues: readonly ParsedIssue[];
  readonly untrackedIssues: readonly ParsedIssue[];
  readonly closedInThreads: readonly number[];
  readonly compliance: number; // 0-1, percentage of issues tracked
}

/**
 * Parse GitHub issue list output (from `gh issue list --json ...`).
 *
 * @param jsonOutput - JSON string from `gh issue list --json number,title,labels,state,createdAt,updatedAt`
 * @returns Array of parsed issues
 */
export function parseGitHubIssues(jsonOutput: string): ParsedIssue[] {
  try {
    const issues = JSON.parse(jsonOutput) as Array<{
      number: number;
      title: string;
      labels: Array<{ name: string }>;
      state: 'open' | 'closed';
      createdAt: string;
      updatedAt: string;
    }>;

    return issues.map((issue) => ({
      number: issue.number,
      title: issue.title,
      labels: issue.labels.map((l) => l.name),
      state: issue.state,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    }));
  } catch (error) {
    throw new Error(
      `Failed to parse GitHub issues JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Extract Active Threads entries from memory bank markdown.
 *
 * Looks for entries in format: `**#N** (Priority, Role, Size) — Description`
 * or variations like `**Issue #N:** Description`
 *
 * @param bankContent - Raw memory bank markdown content
 * @returns Array of parsed Active Threads entries
 */
export function extractActiveThreads(bankContent: string): ActiveThreadEntry[] {
  const entries: ActiveThreadEntry[] = [];

  // Find the Active Threads section
  const sectionMatch = bankContent.match(/## Active Threads\n([\s\S]*?)(?=\n## |---|\n\n---|$)/);
  if (!sectionMatch || !sectionMatch[1]) {
    return entries;
  }

  const sectionContent = sectionMatch[1];

  // Pattern 1: **#N** (Priority, Role, Size) — Description
  const pattern1 = /\*\*#(\d+)\*\*\s*\(([^)]*)\)\s*—\s*(.+?)(?=\n|$)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern1.exec(sectionContent)) !== null) {
    const [, number, metadata, description] = match;
    if (!number || !metadata || !description) continue;
    const parts = metadata.split(',').map((p) => p.trim());
    const priority = parts.find((p) => /^P[0-3]$/.test(p));
    const role = parts.find((p) => !/^P[0-3]$/.test(p) && !/^[SML]$/.test(p));
    const size = parts.find((p) => /^[SML]$/.test(p));

    const entry: ActiveThreadEntry = {
      issueNumber: parseInt(number, 10),
      description: description.trim(),
      ...(priority && { priority }),
      ...(role && { role }),
      ...(size && { size }),
    };
    entries.push(entry);
  }

  // Pattern 2: **Issue #N:** Description (simpler format)
  const pattern2 = /\*\*Issue\s+#(\d+):\*\*\s*(.+?)(?=\n|$)/g;
  while ((match = pattern2.exec(sectionContent)) !== null) {
    const [, number, description] = match;
    if (!number || !description) continue;
    const issueNum = parseInt(number, 10);

    // Skip if already captured by pattern1
    if (!entries.some((e) => e.issueNumber === issueNum)) {
      entries.push({
        issueNumber: issueNum,
        description: description.trim(),
      });
    }
  }

  // Pattern 3: **#N** Description (minimal format)
  const pattern3 = /^\*\*#(\d+)\*\*\s*[:—]\s*(.+?)(?=\n|$)/gm;
  while ((match = pattern3.exec(sectionContent)) !== null) {
    const [, number, description] = match;
    if (!number || !description) continue;
    const issueNum = parseInt(number, 10);

    // Skip if already captured
    if (!entries.some((e) => e.issueNumber === issueNum)) {
      entries.push({
        issueNumber: issueNum,
        description: description.trim(),
      });
    }
  }

  return entries;
}

/**
 * Find issues that are open on GitHub but not tracked in Active Threads.
 *
 * @param openIssues - Array of open GitHub issues
 * @param activeThreads - Array of Active Threads entries from memory bank
 * @returns Array of issues missing from Active Threads
 */
export function findMissingIssues(
  openIssues: readonly ParsedIssue[],
  activeThreads: readonly ActiveThreadEntry[]
): ParsedIssue[] {
  const trackedNumbers = new Set(activeThreads.map((t) => t.issueNumber));
  return openIssues.filter((issue) => !trackedNumbers.has(issue.number));
}

/**
 * Find issue numbers that appear in Active Threads but are closed on GitHub.
 *
 * @param activeThreads - Array of Active Threads entries
 * @param closedIssues - Array of closed GitHub issues
 * @returns Array of issue numbers that should be removed from Active Threads
 */
export function findClosedInThreads(
  activeThreads: readonly ActiveThreadEntry[],
  closedIssues: readonly ParsedIssue[]
): number[] {
  const closedNumbers = new Set(closedIssues.map((i) => i.number));
  return activeThreads
    .filter((t) => closedNumbers.has(t.issueNumber))
    .map((t) => t.issueNumber);
}

/**
 * Format an issue for Active Threads entry.
 *
 * @param issue - Parsed GitHub issue
 * @param priority - Optional priority (P0-P3)
 * @param role - Optional role assignment
 * @param size - Optional size estimate (S/M/L)
 * @returns Formatted string for Active Threads
 */
export function formatIssueForThreads(
  issue: ParsedIssue,
  priority?: string,
  role?: string,
  size?: string
): string {
  const parts: string[] = [];
  if (priority) parts.push(priority);
  if (role) parts.push(role);
  if (size) parts.push(size);

  const metadata = parts.length > 0 ? ` (${parts.join(', ')})` : '';
  return `**#${issue.number}**${metadata} — ${issue.title}`;
}

/**
 * Verify issue tracking compliance.
 *
 * Compares open GitHub issues with Active Threads in memory bank.
 *
 * @param openIssues - Array of open GitHub issues
 * @param closedIssues - Array of closed GitHub issues (optional, for cleanup check)
 * @param activeThreads - Array of Active Threads entries from memory bank
 * @returns Issue tracking verification result
 */
export function verifyIssueTracking(
  openIssues: readonly ParsedIssue[],
  activeThreads: readonly ActiveThreadEntry[],
  closedIssues?: readonly ParsedIssue[]
): IssueTrackingResult {
  const missingIssues = findMissingIssues(openIssues, activeThreads);
  const trackedNumbers = new Set(activeThreads.map((t) => t.issueNumber));
  const untrackedIssues = openIssues.filter((issue) => !trackedNumbers.has(issue.number));

  const closedInThreads = closedIssues
    ? findClosedInThreads(activeThreads, closedIssues)
    : [];

  const compliance =
    openIssues.length > 0
      ? (openIssues.length - missingIssues.length) / openIssues.length
      : 1;

  return {
    totalOpenIssues: openIssues.length,
    trackedIssues: openIssues.length - missingIssues.length,
    missingIssues,
    untrackedIssues,
    closedInThreads,
    compliance,
  };
}

/**
 * Extract priority from issue labels.
 *
 * @param labels - Array of issue labels
 * @returns Priority string (P0, P1, P2, P3) or undefined
 */
export function extractPriorityFromLabels(labels: readonly string[]): string | undefined {
  const priorityLabels = labels.filter((l) => /^P[0-3]$/.test(l));
  if (priorityLabels.length > 0) {
    // Return highest priority (P0 > P1 > P2 > P3)
    return priorityLabels.sort()[0];
  }
  return undefined;
}

/**
 * Suggest role assignment based on issue title and labels.
 *
 * @param title - Issue title
 * @param labels - Array of issue labels
 * @returns Suggested role or undefined
 */
export function suggestRoleFromIssue(
  title: string,
  labels: readonly string[]
): string | undefined {
  // Check for role labels
  const roleLabel = labels.find((l) => l.startsWith('role:'));
  if (roleLabel) {
    return roleLabel.replace('role:', '');
  }

  // Heuristic matching based on title
  const titleLower = title.toLowerCase();
  if (titleLower.includes('research') || titleLower.includes('benchmark')) {
    return 'Research';
  }
  if (titleLower.includes('engineering') || titleLower.includes('feat(core)') || titleLower.includes('feat(cli)')) {
    return 'Engineering';
  }
  if (titleLower.includes('product') || titleLower.includes('spec')) {
    return 'Product';
  }
  if (titleLower.includes('ops') || titleLower.includes('ci') || titleLower.includes('deploy')) {
    return 'Ops';
  }
  if (titleLower.includes('design') || titleLower.includes('ux') || titleLower.includes('ui')) {
    return 'Design';
  }
  if (titleLower.includes('qa') || titleLower.includes('test') || titleLower.includes('e2e')) {
    return 'QA';
  }
  if (titleLower.includes('scrum') || titleLower.includes('sprint') || titleLower.includes('retro')) {
    return 'Scrum';
  }
  if (titleLower.includes('ceo') || titleLower.includes('launch') || titleLower.includes('strategy')) {
    return 'CEO';
  }
  if (titleLower.includes('growth') || titleLower.includes('fundraising') || titleLower.includes('demo')) {
    return 'Growth';
  }
  if (titleLower.includes('frontier') || titleLower.includes('memory') || titleLower.includes('cognitive')) {
    return 'Frontier';
  }

  return undefined;
}
