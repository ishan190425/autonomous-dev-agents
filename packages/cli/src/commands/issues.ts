/**
 * `ada issues` — Issue tracking verification and management
 *
 * Commands for verifying issue tracking compliance (R-013) and managing
 * Active Threads in the memory bank.
 *
 * Subcommands:
 *   verify  — Check if all open issues are tracked in Active Threads
 *   sync    — Automatically update Active Threads with missing issues
 *   list    — List categorized issues (active/backlog/closed)
 *
 * @see R-013: Issue Tracking Protocol
 */

import { Command } from 'commander';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import chalk from 'chalk';
import {
  parseGitHubIssues,
  extractActiveThreads,
  verifyIssueTracking,
  formatIssueForThreads,
  extractPriorityFromLabels,
  suggestRoleFromIssue,
  DEFAULT_CONFIG,
  resolvePaths,
} from '@ada/core';
import type { ParsedIssue } from '@ada/core';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IssuesVerifyOptions {
  dir: string;
  json?: boolean;
  verbose?: boolean;
}

interface IssuesSyncOptions {
  dir: string;
  dryRun?: boolean;
  json?: boolean;
}

interface IssuesListOptions {
  dir: string;
  category?: string;
  json?: boolean;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Get GitHub issues using `gh` CLI.
 */
function getGitHubIssues(state: 'open' | 'closed' = 'open'): ParsedIssue[] {
  try {
    const output = execSync(
      `gh issue list --state ${state} --limit 200 --json number,title,labels,state,createdAt,updatedAt`,
      { encoding: 'utf-8' }
    );
    return parseGitHubIssues(output);
  } catch (error) {
    throw new Error(
      `Failed to fetch GitHub issues: ${error instanceof Error ? error.message : String(error)}. Make sure 'gh' CLI is installed and authenticated.`
    );
  }
}

/**
 * Read memory bank content.
 */
async function readBankContent(agentsDir: string): Promise<string> {
  const bankPath = path.join(agentsDir, 'memory', 'bank.md');
  try {
    return await fs.readFile(bankPath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to read memory bank: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Write memory bank content.
 */
async function writeBankContent(agentsDir: string, content: string): Promise<void> {
  const bankPath = path.join(agentsDir, 'memory', 'bank.md');
  await fs.writeFile(bankPath, content, 'utf-8');
}

/**
 * Insert issue into Active Threads section.
 */
function insertIssueIntoThreads(
  bankContent: string,
  issue: ParsedIssue,
  priority?: string,
  role?: string,
  size?: string
): string {
  const formatted = formatIssueForThreads(issue, priority, role, size);
  const entry = `- ${formatted}\n`;

  // Find Active Threads section
  const sectionMatch = bankContent.match(/(## Active Threads\n)([\s\S]*?)(?=\n## |---|\n\n---|$)/);
  if (!sectionMatch || !sectionMatch[2]) {
    // No Active Threads section, create it
    const insertPoint = bankContent.indexOf('---\n\n## ');
    if (insertPoint === -1) {
      // Add at end
      return `${bankContent}\n\n## Active Threads\n\n${entry}`;
    }
    return `${bankContent.slice(0, insertPoint)}## Active Threads\n\n${entry}${bankContent.slice(insertPoint)}`;
  }

  // Determine category (active vs backlog)
  const category = priority === 'P0' || priority === 'P1' ? 'active' : 'backlog';
  const sectionContent = sectionMatch[2];

  // Check if already exists
  if (sectionContent.includes(`**#${issue.number}**`)) {
    return bankContent; // Already tracked
  }

  // Find appropriate subsection
  let insertPoint = -1;
  const sectionIndex = sectionMatch.index ?? 0;
  const sectionHeaderLength = sectionMatch[1]?.length ?? 0;

  if (category === 'active') {
    const activeMatch = sectionContent.match(/(### Active[^\n]*\n)([\s\S]*?)(?=\n### |$)/);
    if (activeMatch && activeMatch.index !== undefined && activeMatch[1]) {
      insertPoint = sectionIndex + sectionHeaderLength + activeMatch.index + activeMatch[1].length;
    }
  } else {
    const backlogMatch = sectionContent.match(/(### Backlog[^\n]*\n)([\s\S]*?)(?=\n### |$)/);
    if (backlogMatch && backlogMatch.index !== undefined && backlogMatch[1]) {
      insertPoint = sectionIndex + sectionHeaderLength + backlogMatch.index + backlogMatch[1].length;
    }
  }

  if (insertPoint === -1) {
    // Add to end of section
    insertPoint = sectionIndex + sectionHeaderLength + sectionContent.length;
  }

  return `${bankContent.slice(0, insertPoint)}${entry}${bankContent.slice(insertPoint)}`;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/**
 * `ada issues verify` — Verify issue tracking compliance
 */
async function verifyCommand(options: IssuesVerifyOptions): Promise<void> {
  const { dir, json, verbose } = options;
  const paths = resolvePaths(dir, 'scrum', DEFAULT_CONFIG);
  const agentsDir = path.dirname(paths.memoryBank);

  try {
    const openIssues = getGitHubIssues('open');
    const closedIssues = getGitHubIssues('closed');
    const bankContent = await readBankContent(agentsDir);
    const activeThreads = extractActiveThreads(bankContent);

    const result = verifyIssueTracking(openIssues, activeThreads, closedIssues);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // Human-readable output
    console.log(chalk.bold('\n📋 Issue Tracking Verification\n'));

    const compliancePercent = Math.round(result.compliance * 100);
    const statusColor = result.compliance === 1 ? chalk.green : result.compliance >= 0.8 ? chalk.yellow : chalk.red;
    const statusIcon = result.compliance === 1 ? '✅' : result.compliance >= 0.8 ? '⚠️' : '❌';

    console.log(`${statusIcon} Compliance: ${statusColor(compliancePercent + '%')}`);
    console.log(`   Total Open Issues: ${result.totalOpenIssues}`);
    console.log(`   Tracked Issues: ${result.trackedIssues}`);
    console.log(`   Missing Issues: ${chalk.red(result.missingIssues.length)}`);
    console.log(`   Closed in Threads: ${chalk.yellow(result.closedInThreads.length)}\n`);

    if (result.missingIssues.length > 0) {
      console.log(chalk.red.bold('Missing from Active Threads:\n'));
      for (const issue of result.missingIssues) {
        const priority = extractPriorityFromLabels(issue.labels);
        const role = suggestRoleFromIssue(issue.title, issue.labels);
        console.log(`  ${chalk.dim('#')}${chalk.bold(issue.number)} ${issue.title}`);
        if (verbose) {
          console.log(`    Priority: ${priority || 'unlabeled'}`);
          console.log(`    Suggested Role: ${role || 'unassigned'}`);
          console.log(`    Labels: ${issue.labels.join(', ') || 'none'}`);
        }
      }
      console.log();
    }

    if (result.closedInThreads.length > 0) {
      console.log(chalk.yellow.bold('Closed Issues Still in Active Threads:\n'));
      for (const num of result.closedInThreads) {
        console.log(`  ${chalk.dim('#')}${chalk.bold(num)}`);
      }
      console.log();
    }

    if (result.compliance < 1) {
      console.log(chalk.yellow('💡 Run `ada issues sync` to automatically update Active Threads\n'));
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * `ada issues sync` — Sync Active Threads with GitHub issues
 */
async function syncCommand(options: IssuesSyncOptions): Promise<void> {
  const { dir, dryRun, json } = options;
  const paths = resolvePaths(dir, 'scrum', DEFAULT_CONFIG);
  const agentsDir = path.dirname(paths.memoryBank);

  try {
    const openIssues = getGitHubIssues('open');
    const closedIssues = getGitHubIssues('closed');
    const bankContent = await readBankContent(agentsDir);
    const activeThreads = extractActiveThreads(bankContent);

    const result = verifyIssueTracking(openIssues, activeThreads, closedIssues);
    let updatedContent = bankContent;
    const changes: string[] = [];

    // Add missing issues
    for (const issue of result.missingIssues) {
      const priority = extractPriorityFromLabels(issue.labels) || 'P3';
      const role = suggestRoleFromIssue(issue.title, issue.labels);
      updatedContent = insertIssueIntoThreads(updatedContent, issue, priority, role);
      changes.push(`Added #${issue.number} to Active Threads`);
    }

    // Remove closed issues (simple approach: remove lines with closed issue numbers)
    for (const num of result.closedInThreads) {
      const regex = new RegExp(`^\\s*-\\s+\\*\\*#${num}\\*\\*[^\\n]*\\n`, 'gm');
      updatedContent = updatedContent.replace(regex, '');
      changes.push(`Removed #${num} from Active Threads (closed)`);
    }

    if (json) {
      console.log(JSON.stringify({ changes, dryRun }, null, 2));
      return;
    }

    console.log(chalk.bold('\n🔄 Syncing Active Threads\n'));

    if (changes.length === 0) {
      console.log(chalk.green('✅ All issues are already tracked. No changes needed.\n'));
      return;
    }

    console.log(`Found ${changes.length} change(s):\n`);
    for (const change of changes) {
      console.log(`  ${chalk.green('+')} ${change}`);
    }

    if (dryRun) {
      console.log(chalk.yellow('\n💡 Dry run mode. No changes written. Remove --dry-run to apply.\n'));
    } else {
      await writeBankContent(agentsDir, updatedContent);
      console.log(chalk.green('\n✅ Active Threads updated successfully.\n'));
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * `ada issues list` — List categorized issues
 */
async function listCommand(options: IssuesListOptions): Promise<void> {
  const { dir, category, json } = options;
  const paths = resolvePaths(dir, 'scrum', DEFAULT_CONFIG);
  const agentsDir = path.dirname(paths.memoryBank);

  try {
    const openIssues = getGitHubIssues('open');
    const bankContent = await readBankContent(agentsDir);
    const activeThreads = extractActiveThreads(bankContent);
    const trackedNumbers = new Set(activeThreads.map((t) => t.issueNumber));

    const active: ParsedIssue[] = [];
    const backlog: ParsedIssue[] = [];

    for (const issue of openIssues) {
      const threadEntry = activeThreads.find((t) => t.issueNumber === issue.number);
      const priority = threadEntry?.priority || extractPriorityFromLabels(issue.labels);
      if (priority === 'P0' || priority === 'P1') {
        active.push(issue);
      } else {
        backlog.push(issue);
      }
    }

    if (json) {
      const output: Record<string, unknown> = {};
      if (!category || category === 'active') output.active = active;
      if (!category || category === 'backlog') output.backlog = backlog;
      if (!category || category === 'all') {
        output.all = openIssues;
        output.tracked = activeThreads.map((t) => t.issueNumber);
      }
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    console.log(chalk.bold('\n📋 Issue List\n'));

    if (!category || category === 'active') {
      console.log(chalk.bold.green('Active Issues (P0-P1):\n'));
      for (const issue of active) {
        const threadEntry = activeThreads.find((t) => t.issueNumber === issue.number);
        const tracked = trackedNumbers.has(issue.number) ? chalk.green('✓') : chalk.red('✗');
        console.log(`  ${tracked} ${chalk.dim('#')}${chalk.bold(issue.number)} ${issue.title}`);
        if (threadEntry) {
          console.log(`      ${threadEntry.priority || 'unlabeled'} | ${threadEntry.role || 'unassigned'} | ${threadEntry.size || 'unknown'}`);
        }
      }
      console.log();
    }

    if (!category || category === 'backlog') {
      console.log(chalk.bold.yellow('Backlog Issues (P2-P3):\n'));
      for (const issue of backlog) {
        const tracked = trackedNumbers.has(issue.number) ? chalk.green('✓') : chalk.red('✗');
        console.log(`  ${tracked} ${chalk.dim('#')}${chalk.bold(issue.number)} ${issue.title}`);
      }
      console.log();
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// ─── Command Definition ──────────────────────────────────────────────────────

export const issuesCommand = new Command('issues')
  .description('Issue tracking verification and management (R-013)')
  .addCommand(
    new Command('verify')
      .description('Verify all open issues are tracked in Active Threads')
      .option('--dir <path>', 'Path to repo root', process.cwd())
      .option('--json', 'Output as JSON')
      .option('--verbose', 'Show detailed information')
      .action(verifyCommand)
  )
  .addCommand(
    new Command('sync')
      .description('Sync Active Threads with GitHub issues (add missing, remove closed)')
      .option('--dir <path>', 'Path to repo root', process.cwd())
      .option('--dry-run', 'Show what would change without writing')
      .option('--json', 'Output as JSON')
      .action(syncCommand)
  )
  .addCommand(
    new Command('list')
      .description('List categorized issues (active/backlog)')
      .option('--dir <path>', 'Path to repo root', process.cwd())
      .option('--category <type>', 'Filter by category: active, backlog, all', 'all')
      .option('--json', 'Output as JSON')
      .action(listCommand)
  );
