/**
 * `ada status` — Show the current rotation state, last actions, and memory bank summary.
 *
 * Provides a quick, human-readable snapshot of the agent team's current state.
 * Essential for understanding what happened while you were away, debugging issues,
 * and getting a pulse on team health and velocity.
 *
 * @see Issue #35 for full specification
 */

import { Command } from 'commander';
import * as path from 'node:path';
import chalk from 'chalk';
import {
  readRotationState,
  readRoster,
  readMemoryBank,
  countLines,
  extractVersion,
  extractCycle,
  getCurrentRole,
  createMetricsManager,
  formatCost,
} from '@ada/core';
import type { RotationState, Roster, RotationHistoryEntry, Role, CycleMetrics } from '@ada/core';

/** Options for the status command */
interface StatusOptions {
  dir: string;
  json?: boolean;
  verbose?: boolean;
  history?: string;
}

/** Cost summary for a time period */
interface CostSummary {
  /** Total cost in USD */
  cost: number;
  /** Number of cycles */
  cycles: number;
}

/** Parsed status data for output */
interface StatusData {
  rotation: RotationState;
  roster: Roster;
  currentRole: Role | null;
  nextRole: Role | null;
  memoryBank: {
    content: string;
    lines: number;
    version: number;
    cycle: number;
  };
  stats: {
    issues: { open: number; closed: number };
    prs: { open: number; merged: number };
    tests: number;
  };
  activeThreads: string[];
  blockers: string[];
  costToday: CostSummary;
}

/**
 * Format a timestamp as a relative time string (e.g., "2h ago", "3 days ago")
 *
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns Human-readable relative time
 */
function formatTimeAgo(isoTimestamp: string | null): string {
  if (!isoTimestamp) {
    return 'never';
  }

  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  if (hours > 0) {
    return hours === 1 ? '1h ago' : `${hours}h ago`;
  }
  if (minutes > 0) {
    return minutes === 1 ? '1m ago' : `${minutes}m ago`;
  }
  return 'just now';
}

/**
 * Get the role at a specific offset from the current index.
 *
 * @param roster - Team roster
 * @param currentIndex - Current rotation index
 * @param offset - Offset from current (0 = current, 1 = next, etc.)
 * @returns The role at that position, or null if roster is empty
 */
function getRoleAtOffset(roster: Roster, currentIndex: number, offset: number): Role | null {
  const { rotation_order, roles } = roster;

  if (rotation_order.length === 0) {
    return null;
  }

  const index = (currentIndex + offset) % rotation_order.length;
  const roleId = rotation_order[index];
  return roles.find((r) => r.id === roleId) ?? null;
}

/**
 * Extract stats from the memory bank content.
 * Parses the Project Metrics section for issue/PR/test counts.
 *
 * @param bankContent - Raw memory bank markdown content
 * @returns Parsed stats object
 */
function extractStats(bankContent: string): StatusData['stats'] {
  const stats = {
    issues: { open: 0, closed: 0 },
    prs: { open: 0, merged: 0 },
    tests: 0,
  };

  // Try to extract from "Project Metrics" section
  // Pattern: **Issues:** 29 total (6 closed, 23 open)
  // Or: - **Total issues:** 0
  const issueMatch = bankContent.match(/\*\*(?:Issues|Total issues):\*\*\s*(\d+)(?:\s*total)?\s*\((\d+)\s*closed,\s*(\d+)\s*open\)/i);
  if (issueMatch) {
    stats.issues.closed = parseInt(issueMatch[2] ?? '0', 10);
    stats.issues.open = parseInt(issueMatch[3] ?? '0', 10);
  } else {
    // Try simpler pattern: - **Total issues:** 0
    const simpleIssueMatch = bankContent.match(/\*\*Total issues:\*\*\s*(\d+)/i);
    if (simpleIssueMatch) {
      stats.issues.open = parseInt(simpleIssueMatch[1] ?? '0', 10);
    }
  }

  // Pattern: **Open PRs:** 5 (#24, #28, #32, #33, #36)
  const openPrMatch = bankContent.match(/\*\*Open PRs:\*\*\s*(\d+)/i);
  if (openPrMatch) {
    stats.prs.open = parseInt(openPrMatch[1] ?? '0', 10);
  }

  // Pattern: **Merged PRs:** 6 (#4, #13, #20, #21, #22)
  const mergedPrMatch = bankContent.match(/\*\*Merged PRs:\*\*\s*(\d+)/i);
  if (mergedPrMatch) {
    stats.prs.merged = parseInt(mergedPrMatch[1] ?? '0', 10);
  }

  // Pattern: **Tests:** 88 merged or **Test count:** 0
  const testsMatch = bankContent.match(/\*\*Tests?(?:\s*count)?:\*\*\s*(\d+)/i);
  if (testsMatch) {
    stats.tests = parseInt(testsMatch[1] ?? '0', 10);
  }

  return stats;
}

/**
 * Extract active threads from the memory bank.
 * Looks for bullet points in the "Active Threads" section.
 *
 * @param bankContent - Raw memory bank markdown content
 * @returns Array of active thread descriptions
 */
function extractActiveThreads(bankContent: string): string[] {
  const threads: string[] = [];

  // Find the Active Threads section
  const sectionMatch = bankContent.match(/## Active Threads\n([\s\S]*?)(?=\n## |---|\n\n---)/);
  if (sectionMatch && sectionMatch[1]) {
    const sectionContent = sectionMatch[1];
    // Extract bullet points
    const bulletMatches = sectionContent.matchAll(/^[-•*]\s+(.+)$/gm);
    for (const match of bulletMatches) {
      if (match[1] && !match[1].startsWith('#')) {
        threads.push(match[1].trim());
      }
    }
  }

  return threads;
}

/**
 * Check if a timestamp is from today (local time).
 *
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns True if the timestamp is from today
 */
function isToday(isoTimestamp: string): boolean {
  const date = new Date(isoTimestamp);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Calculate cost summary for cycles from today.
 *
 * @param cycles - Array of cycle metrics
 * @returns Cost summary with total cost and cycle count
 */
function calculateTodayCost(cycles: readonly CycleMetrics[]): CostSummary {
  let cost = 0;
  let count = 0;

  for (const cycle of cycles) {
    if (isToday(cycle.startedAt)) {
      cost += cycle.cost.totalCost;
      count++;
    }
  }

  return { cost, cycles: count };
}

/**
 * Extract blockers from the memory bank.
 * Looks for content in the "Blockers" section.
 *
 * @param bankContent - Raw memory bank markdown content
 * @returns Array of blocker descriptions
 */
function extractBlockers(bankContent: string): string[] {
  const blockers: string[] = [];

  // Find the Blockers section
  const sectionMatch = bankContent.match(/### Blockers\n([\s\S]*?)(?=\n### |\n## |\n---)/);
  if (sectionMatch && sectionMatch[1]) {
    const sectionContent = sectionMatch[1].trim();
    // Check if it's "(none)" or similar
    if (sectionContent.toLowerCase().includes('none') || sectionContent === '-') {
      return [];
    }
    // Extract bullet points
    const bulletMatches = sectionContent.matchAll(/^[-•*]\s+(.+)$/gm);
    for (const match of bulletMatches) {
      if (match[1]) {
        blockers.push(match[1].trim());
      }
    }
  }

  return blockers;
}

/**
 * Load all status data from disk.
 *
 * @param agentsDir - Path to the agents directory
 * @returns Parsed status data
 */
async function loadStatusData(agentsDir: string): Promise<StatusData> {
  const statePath = path.join(agentsDir, 'state', 'rotation.json');
  const rosterPath = path.join(agentsDir, 'roster.json');
  const bankPath = path.join(agentsDir, 'memory', 'bank.md');

  const [rotation, roster, bankContent] = await Promise.all([
    readRotationState(statePath),
    readRoster(rosterPath),
    readMemoryBank(bankPath),
  ]);

  const currentRole = getCurrentRole(rotation, roster);
  const nextRole = getRoleAtOffset(roster, rotation.current_index, 1);

  // Load observability metrics for today's cost
  const rootDir = path.dirname(agentsDir);
  const metricsManager = createMetricsManager(rootDir, path.basename(agentsDir));
  let costToday: CostSummary = { cost: 0, cycles: 0 };
  try {
    const allCycles = await metricsManager.getRecent(100); // Get recent cycles
    costToday = calculateTodayCost(allCycles);
  } catch {
    // Metrics file may not exist yet — that's fine
  }

  return {
    rotation,
    roster,
    currentRole,
    nextRole,
    memoryBank: {
      content: bankContent,
      lines: countLines(bankContent),
      version: extractVersion(bankContent),
      cycle: extractCycle(bankContent),
    },
    stats: extractStats(bankContent),
    activeThreads: extractActiveThreads(bankContent),
    blockers: extractBlockers(bankContent),
    costToday,
  };
}

/**
 * Format a history entry for display.
 *
 * @param entry - History entry
 * @param roster - Team roster for emoji lookup
 * @returns Formatted string
 */
function formatHistoryEntry(entry: RotationHistoryEntry, roster: Roster): string {
  const roleInfo = roster.roles.find((r) => r.id === entry.role);
  const emoji = roleInfo?.emoji ?? '❓';
  const name = roleInfo?.name ?? entry.role;

  // Get action text and strip leading emoji if present (avoids duplication with role emoji)
  // Emoji pattern: starts with emoji (surrogate pairs or emoji sequences)
  let action = entry.action ?? '';
  action = action.replace(
    /^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}\uFE0F]+\s*/u,
    ''
  );

  // Truncate at word boundary if too long
  if (action.length > 50) {
    const truncateAt = action.lastIndexOf(' ', 47);
    action = `${action.substring(0, truncateAt > 30 ? truncateAt : 47)}...`;
  }

  const actionSuffix = action ? `  ${action}` : '';
  return `  ${chalk.gray(`#${entry.cycle}`)}  ${emoji} ${chalk.cyan(name.padEnd(12))}${actionSuffix}`;
}

/**
 * Print default status output.
 *
 * @param data - Parsed status data
 * @param historyCount - Number of history entries to show
 */
function printDefaultStatus(data: StatusData, historyCount: number): void {
  const { rotation, roster, currentRole, nextRole, memoryBank, stats, costToday } = data;

  // Header
  console.log(chalk.bold.blue(`🤖 ADA Status — ${roster.product}\n`));

  // Paused state warning
  if (rotation.paused) {
    console.log(chalk.bgYellow.black(' ⏸️  PAUSED '));
    console.log(`${chalk.gray('   Paused at:')}  ${rotation.paused_at || '(unknown)'}`);
    if (rotation.pause_reason) {
      console.log(`${chalk.gray('   Reason:')}     ${rotation.pause_reason}`);
    }
    console.log(chalk.yellow('   Use `ada resume` to continue dispatch cycles.'));
    console.log();
  }

  // Rotation summary
  const currentRoleStr = currentRole
    ? `${currentRole.emoji} ${currentRole.name} (${currentRole.title})`
    : '(none)';
  const nextRoleStr = nextRole
    ? `${nextRole.emoji} ${nextRole.name} (${nextRole.title})`
    : '(none)';

  // Find last action from history
  const lastEntry = rotation.history.length > 0
    ? rotation.history[rotation.history.length - 1]
    : null;
  const lastRoleInfo = lastEntry
    ? roster.roles.find((r) => r.id === lastEntry.role)
    : null;
  // Strip leading emoji from action text (avoids duplication with role emoji)
  const lastActionText = lastEntry?.action?.replace(
    /^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}\uFE0F]+\s*/u,
    ''
  ) ?? '';
  const lastActionStr = lastEntry
    ? `${lastRoleInfo?.emoji ?? '❓'} ${lastRoleInfo?.name ?? lastEntry.role} ${lastActionText ? `— ${lastActionText}` : ''} (${formatTimeAgo(lastEntry.timestamp)})`
    : '(none)';

  console.log(`${chalk.gray('Current Role:')}    ${currentRoleStr}`);
  console.log(`${chalk.gray('Last Action:')}     ${lastActionStr}`);
  console.log(`${chalk.gray('Next Role:')}       ${nextRoleStr}`);
  console.log(`${chalk.gray('Cycle:')}           ${rotation.cycle_count}`);
  console.log(`${chalk.gray('Cost Today:')}      ${formatCost(costToday.cost)} (${costToday.cycles} cycle${costToday.cycles !== 1 ? 's' : ''})`);
  console.log();

  // Memory bank
  console.log(`${chalk.gray('Memory Bank:')}     agents/memory/bank.md (v${memoryBank.version}, ${memoryBank.lines} lines)`);
  console.log(`${chalk.gray('Last Updated:')}    ${rotation.last_run ? new Date(rotation.last_run).toLocaleString() : 'never'}`);
  console.log();

  // Recent activity
  const historyToShow = rotation.history.slice(-historyCount).reverse();
  if (historyToShow.length > 0) {
    console.log(chalk.bold(`📊 Recent Activity (last ${historyToShow.length} cycles)`));
    console.log(chalk.gray('────────────────────────────────────────────────'));
    for (const entry of historyToShow) {
      console.log(formatHistoryEntry(entry, roster));
    }
    console.log();
  }

  // Stats
  console.log(chalk.bold('📈 Stats'));
  console.log(chalk.gray('────────────────────────────────────────────────'));
  console.log(`  ${chalk.gray('Issues:')}  ${stats.issues.open} open / ${stats.issues.closed} closed`);
  console.log(`  ${chalk.gray('PRs:')}     ${stats.prs.open} open / ${stats.prs.merged} merged`);
  console.log(`  ${chalk.gray('Tests:')}   ${stats.tests} passing`);
  console.log();
}

/**
 * Print verbose status output (includes full rotation order, threads, blockers).
 *
 * @param data - Parsed status data
 * @param historyCount - Number of history entries to show
 */
function printVerboseStatus(data: StatusData, historyCount: number): void {
  // First print the default status
  printDefaultStatus(data, historyCount);

  const { rotation, roster, blockers, activeThreads } = data;

  // Full rotation order
  console.log(chalk.bold('🔄 Role Rotation'));
  console.log(chalk.gray('────────────────────────────────────────────────'));
  const rotationLength = roster.rotation_order.length;
  const currentIndex = rotation.current_index % rotationLength;

  for (let i = 0; i < roster.rotation_order.length; i++) {
    const roleId = roster.rotation_order[i];
    const role = roster.roles.find((r) => r.id === roleId);
    if (!role) continue;

    const isCurrent = i === currentIndex;
    const cyclesUntil = (i - currentIndex + rotationLength) % rotationLength;

    const marker = isCurrent
      ? chalk.green(' ← CURRENT')
      : chalk.gray(` → next in ${cyclesUntil} cycle${cyclesUntil !== 1 ? 's' : ''}`);

    const line = `  ${String(i + 1).padStart(2)}. ${role.emoji} ${role.name.padEnd(14)}${marker}`;
    console.log(isCurrent ? chalk.bold(line) : line);
  }
  console.log();

  // Blockers
  console.log(chalk.bold('🚨 Active Blockers'));
  console.log(chalk.gray('────────────────────────────────────────────────'));
  if (blockers.length === 0) {
    console.log(chalk.green('  (none)'));
  } else {
    for (const blocker of blockers) {
      console.log(chalk.red(`  • ${blocker}`));
    }
  }
  console.log();

  // Active threads
  console.log(chalk.bold('🧵 Active Threads'));
  console.log(chalk.gray('────────────────────────────────────────────────'));
  if (activeThreads.length === 0) {
    console.log(chalk.gray('  (none)'));
  } else {
    for (const thread of activeThreads.slice(0, 10)) {
      console.log(`  • ${thread}`);
    }
    if (activeThreads.length > 10) {
      console.log(chalk.gray(`  ... and ${activeThreads.length - 10} more`));
    }
  }
  console.log();
}

/**
 * Print JSON output.
 *
 * @param data - Parsed status data
 * @param historyCount - Number of history entries to include
 */
function printJsonStatus(data: StatusData, historyCount: number): void {
  const { rotation, roster, currentRole, nextRole, memoryBank, stats, activeThreads, blockers, costToday } = data;

  const output = {
    rotation: {
      currentIndex: rotation.current_index,
      cycleCount: rotation.cycle_count,
      lastRole: rotation.last_role,
      lastRun: rotation.last_run,
      history: rotation.history.slice(-historyCount),
    },
    currentRole: currentRole
      ? {
          id: currentRole.id,
          name: currentRole.name,
          title: currentRole.title,
          emoji: currentRole.emoji,
        }
      : null,
    nextRole: nextRole
      ? {
          id: nextRole.id,
          name: nextRole.name,
          title: nextRole.title,
          emoji: nextRole.emoji,
        }
      : null,
    roster: {
      company: roster.company,
      product: roster.product,
      roleCount: roster.roles.length,
      rotationOrder: roster.rotation_order,
    },
    memoryBank: {
      path: 'agents/memory/bank.md',
      lines: memoryBank.lines,
      version: memoryBank.version,
      cycle: memoryBank.cycle,
    },
    stats,
    blockers,
    activeThreads,
    costToday: costToday.cost,
    cyclesToday: costToday.cycles,
  };

  console.log(JSON.stringify(output, null, 2));
}

export const statusCommand = new Command('status')
  .description('Show rotation state, last actions, and memory bank summary')
  .option('-d, --dir <path>', 'Agents directory (default: "agents/")', 'agents')
  .option('--json', 'Output as JSON (for piping to other tools)')
  .option('-v, --verbose', 'Include full role state details, active threads, and blockers')
  .option('--history <n>', 'Show last n cycles (default: 5)', '5')
  .action(async (options: StatusOptions) => {
    const cwd = process.cwd();
    const agentsDir = path.resolve(cwd, options.dir);

    // Verbose mode defaults to 10 history entries if --history wasn't explicitly set
    const explicitHistory = process.argv.includes('--history') || process.argv.some(arg => arg.startsWith('--history='));
    const historyCount = explicitHistory
      ? parseInt(options.history ?? '5', 10)
      : (options.verbose ? 10 : 5);

    try {
      const data = await loadStatusData(agentsDir);

      if (options.json) {
        printJsonStatus(data, historyCount);
      } else if (options.verbose) {
        printVerboseStatus(data, historyCount);
      } else {
        printDefaultStatus(data, historyCount);
      }
    } catch (err) {
      if (options.json) {
        console.error(JSON.stringify({ error: (err as Error).message }));
      } else {
        console.error(chalk.red('❌ Could not read agent state:'), (err as Error).message);
        console.error(chalk.gray('   Run `ada init` to set up an agent team.\n'));
      }
      process.exit(1);
    }
  });
