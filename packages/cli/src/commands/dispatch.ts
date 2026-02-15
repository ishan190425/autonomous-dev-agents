/**
 * `ada dispatch` — Dispatch cycle lifecycle management
 *
 * Commands for managing autonomous agent dispatch cycles:
 *   start    — Initialize a dispatch cycle
 *   complete — Finalize cycle, update rotation, commit, push
 *   status   — Show current dispatch state
 *
 * Required for Issue #111 (MANDATORY CLI dogfooding).
 *
 * @see Issue #112 for full specification
 * @see docs/product/dispatch-cli-spec.md
 * @see docs/design/dispatch-cli-ux-review.md
 */

import { Command } from 'commander';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout } from 'node:timers/promises';
import chalk from 'chalk';
import {
  readRotationState,
  readRoster,
  writeRotationState,
  getCurrentRole,
  advanceRotation,
  createCycleTracker,
  createMetricsManager,
  // PR Workflow (Issue #128, R-014)
  classifyFile,
  generateBranchName,
  validateBranchName,
  generatePRTitle,
  generatePRBody,
} from '@ada-ai/core';
import type { Role, Roster, RotationState, Reflection, CodeChangeResult } from '@ada-ai/core';

const exec = promisify(execCb);

// ─── Types ───────────────────────────────────────────────────────────────────

/** Dispatch cycle in-progress state stored in lock file */
interface DispatchLock {
  /** Cycle number when started */
  cycle: number;
  /** Role ID for this cycle */
  role: string;
  /** ISO timestamp when started */
  startedAt: string;
}

/** Exit codes per UX spec */
const EXIT_CODES = {
  SUCCESS: 0,
  CYCLE_IN_PROGRESS: 1,
  NOT_THIS_ROLES_TURN: 2,
  GIT_FAILED: 3,
  MISSING_REQUIRED_FLAG: 4,
  STATE_CORRUPTION: 5,
} as const;

// ─── Options Interfaces ──────────────────────────────────────────────────────

interface DispatchStartOptions {
  dir: string;
  role?: string;
  dryRun?: boolean;
  json?: boolean;
  quiet?: boolean;
  noBanner?: boolean;
  force?: boolean;
}

interface DispatchCompleteOptions {
  dir: string;
  action: string;
  outcome?: 'success' | 'partial' | 'blocked';
  reflection?: string;
  skipPush?: boolean;
  json?: boolean;
  quiet?: boolean;
  /** Input tokens consumed (for observability tracking) */
  tokensIn?: number;
  /** Output tokens generated (for observability tracking) */
  tokensOut?: number;
  /** Model used (for cost calculation, default: claude-4-sonnet) */
  model?: string;
  /** Force action even if similar to previous cycle (bypass duplicate warning) */
  force?: boolean;
  /** Create a PR instead of direct commit (R-014) */
  pr?: boolean;
  /** Custom branch name (overrides auto-generation) */
  branch?: string;
  /** Create PR as draft */
  draft?: boolean;
}

interface DispatchStatusOptions {
  dir: string;
  json?: boolean;
  verbose?: boolean;
  quiet?: boolean;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Parse an integer option value (for Commander.js).
 */
function parseIntOption(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }
  return parsed;
}

/**
 * Get the path to the dispatch lock file.
 */
function getLockPath(agentsDir: string): string {
  return path.join(agentsDir, 'state', '.dispatch.lock');
}

/**
 * Check if a dispatch cycle is currently in progress.
 */
async function getActiveLock(agentsDir: string): Promise<DispatchLock | null> {
  const lockPath = getLockPath(agentsDir);
  try {
    const content = await fs.readFile(lockPath, 'utf-8');
    return JSON.parse(content) as DispatchLock;
  } catch {
    return null;
  }
}

/**
 * Create a dispatch lock file.
 */
async function createLock(
  agentsDir: string,
  lock: DispatchLock
): Promise<void> {
  const lockPath = getLockPath(agentsDir);
  await fs.writeFile(lockPath, JSON.stringify(lock, null, 2), 'utf-8');
}

/**
 * Remove the dispatch lock file.
 */
async function removeLock(agentsDir: string): Promise<void> {
  const lockPath = getLockPath(agentsDir);
  try {
    await fs.unlink(lockPath);
  } catch {
    // Lock file doesn't exist — that's fine
  }
}

/**
 * Format a timestamp as a relative time string.
 */
function formatTimeAgo(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return days === 1 ? '1d ago' : `${days}d ago`;
  if (hours > 0) return hours === 1 ? '1h ago' : `${hours}h ago`;
  if (minutes > 0) return minutes === 1 ? '1m ago' : `${minutes}m ago`;
  return 'just now';
}

/**
 * Format duration from start time to now.
 */
function formatDuration(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Get role display string with emoji.
 */
function formatRole(role: Role): string {
  return `${role.emoji} ${role.name} (${role.title})`;
}

/**
 * Get role at a specific offset from current index.
 */
function getRoleAtOffset(roster: Roster, currentIndex: number, offset: number): Role | null {
  const { rotation_order, roles } = roster;
  if (rotation_order.length === 0) return null;

  const index = (currentIndex + offset) % rotation_order.length;
  const roleId = rotation_order[index];
  return roles.find((r) => r.id === roleId) ?? null;
}

/**
 * Format rotation visualization.
 */
function formatRotationBanner(roster: Roster, currentIndex: number): string {
  const { rotation_order, roles } = roster;
  const lines: string[] = [];

  // Build rotation string with current marker
  const parts: string[] = [];
  for (let i = 0; i < rotation_order.length; i++) {
    const roleId = rotation_order[i];
    const role = roles.find((r) => r.id === roleId);
    if (!role) continue;

    if (i === currentIndex) {
      parts.push(`${role.id}*`);
    } else {
      parts.push(role.id);
    }
  }

  // Split into two rows for readability
  const midPoint = Math.ceil(parts.length / 2);
  const row1 = parts.slice(0, midPoint).join(' → ');
  const row2 = parts.slice(midPoint).join(' → ');

  lines.push('┌─────────────────────────────────────────────────┐');
  lines.push(`│  Rotation: ${row1.padEnd(35)} │`);
  lines.push(`│            ${row2.padEnd(35)} │`);
  lines.push('└─────────────────────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * Normalize action text for similarity comparison.
 * Removes emojis, extra whitespace, and converts to lowercase.
 */
function normalizeAction(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
    .replace(/\(C\d+\)/g, '') // Remove cycle references like (C423)
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toLowerCase();
}

/**
 * Calculate similarity between two action descriptions.
 * Uses word-based Jaccard similarity (intersection / union).
 * Returns a value between 0 and 1.
 */
function calculateSimilarity(action1: string, action2: string): number {
  const words1 = new Set(normalizeAction(action1).split(' ').filter(w => w.length > 2));
  const words2 = new Set(normalizeAction(action2).split(' ').filter(w => w.length > 2));

  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;

  // Calculate Jaccard similarity
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/** Exit code for duplicate action requiring --force */
const EXIT_DUPLICATE_ACTION = 6;

/**
 * Execute a git command and return the output.
 */
async function gitExec(cwd: string, args: string): Promise<{ stdout: string; stderr: string }> {
  try {
    return await exec(`git ${args}`, { cwd });
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    throw new Error(err.stderr || err.message || 'Git command failed');
  }
}

// ─── PR Workflow Helpers (Issue #128, R-014) ─────────────────────────────────

/**
 * Detect modified files and classify them as code or docs.
 */
async function detectCodeChanges(cwd: string): Promise<CodeChangeResult> {
  const { stdout } = await gitExec(cwd, 'status --porcelain');
  const lines = stdout.trim().split('\n').filter(Boolean);

  const codeFiles: string[] = [];
  const docFiles: string[] = [];
  const allFiles: string[] = [];

  for (const line of lines) {
    // git status --porcelain format: XY filename
    const filePath = line.substring(3).trim();
    // Handle renamed files (old -> new)
    const actualPath = filePath.includes(' -> ') ? filePath.split(' -> ')[1]! : filePath;
    allFiles.push(actualPath);

    const classification = classifyFile(actualPath);
    if (classification === 'code') {
      codeFiles.push(actualPath);
    } else {
      docFiles.push(actualPath);
    }
  }

  return {
    hasCodeChanges: codeFiles.length > 0,
    hasDocChanges: docFiles.length > 0,
    codeFiles,
    docFiles,
    allFiles,
  };
}

/**
 * Display code change detection warning (per UX spec C625).
 */
function displayCodeChangeWarning(
  codeFiles: string[],
  json: boolean | undefined,
  quiet: boolean | undefined
): void {
  if (json) {
    console.log(JSON.stringify({
      error: 'code_changes_detected',
      message: 'Code changes require --pr or --force',
      codeFiles,
      hint: 'Run with --pr to create a PR, or --force to commit directly',
    }));
  } else if (!quiet) {
    console.log(chalk.yellow('\n⚠️  Code Changes Detected\n'));
    console.log('  You have uncommitted changes to source files:\n');
    for (const file of codeFiles.slice(0, 10)) {
      console.log(chalk.gray(`    M  ${file}`));
    }
    if (codeFiles.length > 10) {
      console.log(chalk.gray(`    ... and ${codeFiles.length - 10} more`));
    }
    console.log();
    console.log('  Per R-014, code changes should go through Pull Requests.\n');
    console.log(`  → Run with ${chalk.cyan('--pr')} to create a PR, or ${chalk.cyan('--force')} to commit directly\n`);
    console.log(`    ${chalk.cyan('ada dispatch complete --action "..." --pr')}`);
    console.log(`    ${chalk.cyan('ada dispatch complete --action "..." --force')}`);
    console.log();
  }
}

/**
 * Execute PR workflow: create branch, commit, push, create PR.
 */
async function executePRWorkflow(
  cwd: string,
  options: {
    cycle: number;
    roleId: string;
    action: string;
    branch?: string;
    draft?: boolean;
    json?: boolean;
    quiet?: boolean;
  }
): Promise<{
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  branch: string;
  commitSha?: string;
  error?: string;
}> {
  const { cycle, roleId, action, draft, json, quiet } = options;

  // Generate or validate branch name
  let branch: string;
  if (options.branch) {
    const validation = validateBranchName(options.branch);
    if (!validation.valid) {
      return {
        success: false,
        branch: options.branch,
        error: validation.error ?? 'Invalid branch name',
      };
    }
    branch = options.branch;
  } else {
    branch = generateBranchName(cycle, roleId, action);
  }

  // Step 1: Create branch
  if (!quiet && !json) {
    console.log(chalk.gray('🌿 Creating branch...\n'));
    console.log(`  ${chalk.gray('Branch:')} ${branch}`);
    console.log(`  ${chalk.gray('Base:')}   main (up-to-date)\n`);
  }

  try {
    await gitExec(cwd, `checkout -b ${branch}`);
    if (!quiet && !json) {
      console.log(`  ${chalk.green('✓')} Branch created\n`);
    }
  } catch (err) {
    // Branch might already exist
    const error = (err as Error).message;
    if (error.includes('already exists')) {
      // Try with suffix
      branch = `${branch}-${cycle}`;
      await gitExec(cwd, `checkout -b ${branch}`);
    } else {
      return { success: false, branch, error: `Failed to create branch: ${error}` };
    }
  }

  // Step 2: Stage and commit
  if (!quiet && !json) {
    console.log(chalk.gray('📝 Committing changes...\n'));
  }

  await gitExec(cwd, 'add -A');

  const prTitle = generatePRTitle(action, roleId);
  let commitSha = '';

  try {
    const escapedTitle = prTitle.replace(/"/g, '\\"');
    const { stdout } = await gitExec(cwd, `commit -m "${escapedTitle}"`);
    const shaMatch = stdout.match(/\[[\w/-]+\s+([a-f0-9]+)\]/);
    commitSha = shaMatch?.[1] ?? '';

    if (!quiet && !json) {
      console.log(`  ${chalk.gray('Commit:')} ${prTitle}`);
      console.log(`  ${chalk.green('✓')} Changes committed\n`);
    }
  } catch (err) {
    return { success: false, branch, error: `Failed to commit: ${(err as Error).message}` };
  }

  // Step 3: Push branch
  if (!quiet && !json) {
    console.log(chalk.gray('🚀 Pushing branch...\n'));
  }

  try {
    await gitExec(cwd, `push -u origin ${branch}`);
    if (!quiet && !json) {
      console.log(`  ${chalk.gray('Remote:')} origin`);
      console.log(`  ${chalk.gray('Branch:')} ${branch}`);
      console.log(`  ${chalk.green('✓')} Branch pushed\n`);
    }
  } catch (err) {
    // Return to main but keep the commit
    await gitExec(cwd, 'checkout main');
    return { success: false, branch, commitSha, error: `Failed to push: ${(err as Error).message}` };
  }

  // Step 4: Create PR via gh CLI
  if (!quiet && !json) {
    console.log(chalk.gray(draft ? '📋 Creating Pull Request (Draft)...\n' : '📋 Creating Pull Request...\n'));
  }

  const prBody = generatePRBody({ cycle, role: roleId, action });
  const escapedBody = prBody.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const draftFlag = draft ? '--draft' : '';

  let prNumber: number | undefined;
  let prUrl: string | undefined;

  try {
    const ghCmd = `gh pr create --title "${prTitle.replace(/"/g, '\\"')}" --body "${escapedBody}" --base main ${draftFlag}`;
    const { stdout } = await exec(ghCmd, { cwd });
    // gh pr create outputs the PR URL
    prUrl = stdout.trim();
    // Extract PR number from URL
    const prMatch = prUrl.match(/\/pull\/(\d+)/);
    prNumber = prMatch ? parseInt(prMatch[1]!, 10) : undefined;

    if (!quiet && !json) {
      console.log(`  ${chalk.gray('Title:')}  ${prTitle}`);
      console.log(`  ${chalk.gray('Base:')}   main`);
      console.log(`  ${chalk.gray('Head:')}   ${branch}`);
      console.log(`  ${chalk.green('✓')} ${draft ? 'Draft PR' : 'PR'} created: #${prNumber}\n`);
    }
  } catch (err) {
    // Return to main
    await gitExec(cwd, 'checkout main');
    return {
      success: false,
      branch,
      commitSha,
      error: `Failed to create PR: ${(err as Error).message}. Branch pushed — create PR manually.`,
    };
  }

  // Return to main
  await gitExec(cwd, 'checkout main');

  return {
    success: true,
    prNumber: prNumber as number,
    prUrl: prUrl as string,
    branch,
    commitSha,
  };
}

// ─── Start Command ───────────────────────────────────────────────────────────

/**
 * Execute dispatch start command.
 */
async function executeStart(options: DispatchStartOptions): Promise<void> {
  const cwd = process.cwd();
  const agentsDir = path.resolve(cwd, options.dir, 'agents');
  const statePath = path.join(agentsDir, 'state', 'rotation.json');
  const rosterPath = path.join(agentsDir, 'roster.json');

  // Load state
  let state: RotationState;
  let roster: Roster;

  try {
    [state, roster] = await Promise.all([
      readRotationState(statePath),
      readRoster(rosterPath),
    ]);
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ error: (err as Error).message }));
    } else {
      console.error(chalk.red('❌ Could not read agent state:'), (err as Error).message);
      console.error(chalk.gray("   Run 'ada init' to set up an agent team.\n"));
    }
    process.exit(EXIT_CODES.STATE_CORRUPTION);
  }

  // Check for active lock
  const activeLock = await getActiveLock(agentsDir);
  if (activeLock && !options.force) {
    const activeRole = roster.roles.find((r) => r.id === activeLock.role);
    const expectedRole = getCurrentRole(state, roster);
    const elapsed = formatDuration(activeLock.startedAt);

    if (options.json) {
      console.log(JSON.stringify({
        error: 'cycle_in_progress',
        activeCycle: activeLock.cycle,
        activeRole: activeLock.role,
        elapsed,
        expectedRole: expectedRole?.id ?? null,
      }));
    } else {
      console.log(chalk.yellow('\n⚠️  Cycle Already in Progress\n'));
      console.log(`  ${chalk.gray('Active:')}    Cycle ${activeLock.cycle} (${activeRole?.emoji ?? '❓'} ${activeRole?.name ?? activeLock.role}) — started ${elapsed} ago`);
      console.log(`  ${chalk.gray('Expected:')}  Cycle ${state.cycle_count + 1} (${expectedRole ? formatRole(expectedRole) : '(none)'})`);
      console.log();
      console.log('  A cycle is already running. Options:\n');
      console.log(`${chalk.cyan('    ada dispatch complete --action "..."')}   # Complete current cycle`);
      console.log(`${chalk.red('    ada dispatch start --force')}             # Override (dangerous)`);
      console.log();
      console.log(chalk.gray('  Concurrent cycles corrupt rotation state.'));
    }
    process.exit(EXIT_CODES.CYCLE_IN_PROGRESS);
  }

  // Determine current role
  const currentRole = options.role
    ? roster.roles.find((r) => r.id === options.role)
    : getCurrentRole(state, roster);

  if (!currentRole) {
    if (options.json) {
      console.log(JSON.stringify({ error: 'no_role_found', requestedRole: options.role ?? null }));
    } else {
      console.error(chalk.red(`❌ Role not found: ${options.role ?? '(none configured)'}`));
    }
    process.exit(EXIT_CODES.STATE_CORRUPTION);
  }

  // Check if it's this role's turn (warn if forcing different role)
  const expectedRole = getCurrentRole(state, roster);
  if (options.role && expectedRole && options.role !== expectedRole.id) {
    if (!options.json && !options.quiet) {
      console.log(chalk.yellow(`\n⚠️  Forcing role ${currentRole.emoji} ${currentRole.name} (expected: ${expectedRole.emoji} ${expectedRole.name})\n`));
    }
  }

  // Get memory bank version
  let bankVersion = 0;
  try {
    const bankPath = path.join(agentsDir, 'memory', 'bank.md');
    const bankContent = await fs.readFile(bankPath, 'utf-8');
    const versionMatch = bankContent.match(/\*\*Version:\*\*\s*(\d+)/i) ??
                         bankContent.match(/\| \*\*Cycle:\*\*.*\| \*\*Version:\*\*\s*(\d+)/);
    if (versionMatch?.[1]) {
      bankVersion = parseInt(versionMatch[1], 10);
    }
  } catch {
    // Bank might not exist yet
  }

  const nextCycle = state.cycle_count + 1;
  const playbookPath = path.join(agentsDir, 'playbooks', `${currentRole.id}.md`);

  // Create lock (unless dry-run)
  if (!options.dryRun) {
    const lock: DispatchLock = {
      cycle: nextCycle,
      role: currentRole.id,
      startedAt: new Date().toISOString(),
    };
    await createLock(agentsDir, lock);
  }

  // Output
  if (options.json) {
    console.log(JSON.stringify({
      cycle: nextCycle,
      role: {
        id: currentRole.id,
        emoji: currentRole.emoji,
        name: currentRole.name,
        title: currentRole.title,
      },
      playbook: playbookPath,
      memoryBank: {
        path: path.join(agentsDir, 'memory', 'bank.md'),
        version: bankVersion,
      },
      dryRun: options.dryRun ?? false,
    }));
    return;
  }

  if (options.quiet) {
    console.log(`Cycle ${nextCycle} started (${currentRole.emoji} ${currentRole.name})`);
    return;
  }

  // Full output
  console.log(chalk.bold.green(`\n🚀 Cycle ${nextCycle} Started\n`));
  console.log(`  ${chalk.gray('Role:')}      ${formatRole(currentRole)}`);
  console.log(`  ${chalk.gray('Playbook:')}  ${path.relative(cwd, playbookPath)}`);
  console.log(`  ${chalk.gray('Memory:')}    agents/memory/bank.md (v${bankVersion})`);

  if (!options.noBanner) {
    console.log();
    console.log(formatRotationBanner(roster, state.current_index));
  }

  console.log();
  console.log(`Complete with: ${chalk.cyan('ada dispatch complete --action "..."')}`);
  console.log();
}

// ─── Complete Command ────────────────────────────────────────────────────────

/**
 * Execute dispatch complete command.
 */
async function executeComplete(options: DispatchCompleteOptions): Promise<void> {
  const cwd = process.cwd();
  const agentsDir = path.resolve(cwd, options.dir, 'agents');
  const statePath = path.join(agentsDir, 'state', 'rotation.json');
  const rosterPath = path.join(agentsDir, 'roster.json');

  // Validate action flag
  if (!options.action) {
    if (options.json) {
      console.log(JSON.stringify({ error: 'missing_action' }));
    } else {
      console.log(chalk.red('\n❌ Missing --action flag\n'));
      console.log('  The --action flag describes what you did this cycle.\n');
      console.log('  Usage:');
      console.log(chalk.cyan('    ada dispatch complete --action "Reviewed PR #110 — approved"'));
      console.log(chalk.cyan('    ada dispatch complete -a "Wrote docs for memory API"'));
      console.log();
      console.log(chalk.gray('  This text appears in commit history and rotation logs.'));
    }
    process.exit(EXIT_CODES.MISSING_REQUIRED_FLAG);
  }

  // Load state
  let state: RotationState;
  let roster: Roster;

  try {
    [state, roster] = await Promise.all([
      readRotationState(statePath),
      readRoster(rosterPath),
    ]);
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ error: (err as Error).message }));
    } else {
      console.error(chalk.red('❌ Could not read agent state:'), (err as Error).message);
    }
    process.exit(EXIT_CODES.STATE_CORRUPTION);
  }

  // Check for active lock
  const activeLock = await getActiveLock(agentsDir);
  const startTime = activeLock?.startedAt ?? new Date().toISOString();
  const duration = formatDuration(startTime);

  // Determine current role
  const currentRole = getCurrentRole(state, roster);
  if (!currentRole) {
    if (options.json) {
      console.log(JSON.stringify({ error: 'no_current_role' }));
    } else {
      console.error(chalk.red('❌ No current role in rotation'));
    }
    process.exit(EXIT_CODES.STATE_CORRUPTION);
  }

  // Check for duplicate action (Issue #135, L175)
  const previousEntry = state.history.length > 0 ? state.history[state.history.length - 1] : null;
  const previousAction = previousEntry?.action ?? '';
  if (previousEntry && previousAction && !options.force) {
    const similarity = calculateSimilarity(options.action, previousAction);
    const SIMILARITY_THRESHOLD = 0.8;

    if (similarity >= SIMILARITY_THRESHOLD) {
      const previousRole = roster.roles.find((r) => r.id === previousEntry.role);

      if (options.json) {
        console.log(JSON.stringify({
          error: 'duplicate_action',
          similarity: Math.round(similarity * 100),
          previous: {
            cycle: previousEntry.cycle,
            role: previousEntry.role,
            action: previousAction,
          },
          current: options.action,
          hint: 'Use --force to bypass this check',
        }));
      } else {
        console.log(chalk.yellow('\n⚠️  Duplicate Action Warning\n'));
        console.log('  Action description is similar to previous cycle\'s action.\n');
        console.log(`  ${chalk.gray(`Previous (C${previousEntry.cycle} by ${previousRole?.emoji ?? '❓'} ${previousRole?.name ?? previousEntry.role}):`)}  `);
        console.log(`    ${previousAction.substring(0, 80)}${previousAction.length > 80 ? '...' : ''}\n`);
        console.log(`  ${chalk.gray('Current:')}`);
        console.log(`    ${options.action.substring(0, 80)}${options.action.length > 80 ? '...' : ''}\n`);
        console.log(`  ${chalk.gray('Similarity:')} ${Math.round(similarity * 100)}% (threshold: ${SIMILARITY_THRESHOLD * 100}%)\n`);
        console.log('  This might indicate:');
        console.log('  • Workflow confusion about cycle ownership');
        console.log('  • Copy-paste error in action description');
        console.log('  • Work that should be attributed to a different role\n');
        console.log(`  Use ${chalk.cyan('--force')} to proceed anyway.`);
        console.log();
      }
      process.exit(EXIT_DUPLICATE_ACTION);
    }
  }

  // R-014: Code change detection (US-128-2)
  // Detect if there are code changes that should go through PR
  const codeChanges = await detectCodeChanges(cwd);
  const nextCycle = state.cycle_count + 1;

  // If code changes detected and neither --pr nor --force, warn and exit
  if (codeChanges.hasCodeChanges && !options.pr && !options.force) {
    displayCodeChangeWarning(codeChanges.codeFiles, options.json, options.quiet);
    process.exit(EXIT_CODES.MISSING_REQUIRED_FLAG);
  }

  // If --pr flag is set, use PR workflow (US-128-1)
  if (options.pr) {
    // Validate there are actually changes to commit
    if (codeChanges.allFiles.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({
          error: 'no_changes',
          message: 'No changes to commit. Did you forget to stage your changes?',
        }));
      } else {
        console.log(chalk.red('\n❌ No Changes to Commit\n'));
        console.log('  There are no staged or modified files to commit.\n');
        console.log('  Did you forget to stage your changes?');
        console.log(`    ${chalk.cyan('git add <files>')}\n`);
        console.log('  Or run without --pr for docs/state-only updates.\n');
      }
      process.exit(EXIT_CODES.GIT_FAILED);
    }

    const prResult = await executePRWorkflow(cwd, {
      cycle: nextCycle,
      roleId: currentRole.id,
      action: options.action,
      ...(options.branch ? { branch: options.branch } : {}),
      ...(options.draft ? { draft: options.draft } : {}),
      ...(options.json ? { json: options.json } : {}),
      ...(options.quiet ? { quiet: options.quiet } : {}),
    });

    if (!prResult.success) {
      if (options.json) {
        console.log(JSON.stringify({
          error: 'pr_failed',
          message: prResult.error,
          branch: prResult.branch,
          commitSha: prResult.commitSha,
        }));
      } else {
        console.error(chalk.red('❌ PR Creation Failed:'), prResult.error);
        if (prResult.commitSha) {
          console.error(chalk.gray('   Commit was made. Create PR manually or retry.'));
        }
      }
      process.exit(EXIT_CODES.GIT_FAILED);
    }

    // Update action to include PR reference
    const prAction = `${options.action} — PR #${prResult.prNumber}`;

    // Parse reflection if provided
    let reflection: Reflection | undefined;
    if (options.reflection) {
      reflection = {
        outcome: options.outcome ?? 'success',
        whatWorked: options.reflection,
      };
    }

    // Advance rotation with PR-enriched action
    const outcome = options.outcome ?? 'success';
    const newState = advanceRotation(state, roster, {
      action: prAction,
      ...(reflection ? { reflection } : {}),
    });

    // Write new state
    await writeRotationState(statePath, newState);

    // Remove lock
    await removeLock(agentsDir);

    // Record observability metrics if tokens provided
    if (options.tokensIn !== undefined || options.tokensOut !== undefined) {
      const model = options.model ?? 'claude-4-sonnet';
      const tracker = createCycleTracker(newState.cycle_count, currentRole.id, model);
      tracker.recordPhase('action_execution', options.tokensIn ?? 0, options.tokensOut ?? 0);
      const metrics = tracker.finalize(outcome !== 'blocked');
      const manager = createMetricsManager(cwd, 'agents/');
      await manager.record(metrics);
    }

    // Get next role
    const nextRole = getRoleAtOffset(roster, newState.current_index, 0);

    // Output success
    if (options.json) {
      console.log(JSON.stringify({
        cycle: newState.cycle_count,
        role: currentRole.id,
        action: prAction,
        outcome,
        pr: {
          number: prResult.prNumber,
          url: prResult.prUrl,
          branch: prResult.branch,
          draft: options.draft ?? false,
        },
        commit: {
          sha: prResult.commitSha,
        },
        nextRole: nextRole ? { id: nextRole.id, emoji: nextRole.emoji, name: nextRole.name } : null,
      }));
      return;
    }

    if (options.quiet) {
      console.log(`Cycle ${newState.cycle_count} complete (${outcome}) — PR #${prResult.prNumber}`);
      return;
    }

    // Full PR success output (per UX spec C625)
    console.log(chalk.bold.green(`\n🎉 Cycle ${newState.cycle_count} Complete — ${options.draft ? 'Draft PR' : 'PR'} Created\n`));

    console.log('┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log(`│  PR:     #${prResult.prNumber} — ${generatePRTitle(options.action, currentRole.id).substring(0, 50).padEnd(50)} │`);
    console.log(`│  URL:    ${(prResult.prUrl ?? '').substring(0, 66).padEnd(66)} │`);
    console.log(`│  Status: ${options.draft ? 'Draft (CI Running)'.padEnd(66) : 'Open (CI Running)'.padEnd(66)} │`);
    console.log('│                                                                              │');
    console.log(`│  Next:   ${nextRole ? formatRole(nextRole).substring(0, 58).padEnd(58) : '(none)'.padEnd(58)}       │`);
    console.log('│                                                                              │');
    console.log(`${`│  💡 Tip: Run ${chalk.cyan(`gh pr checks ${prResult.prNumber}`)} to monitor CI status`.padEnd(84)  }│`);
    console.log('└──────────────────────────────────────────────────────────────────────────────┘');
    console.log();

    return;
  }

  // Parse reflection if provided
  let reflection: Reflection | undefined;
  if (options.reflection) {
    reflection = {
      outcome: options.outcome ?? 'success',
      whatWorked: options.reflection,
    };
  }

  // Advance rotation
  const outcome = options.outcome ?? 'success';
  const newState = advanceRotation(state, roster, {
    action: options.action,
    ...(reflection ? { reflection } : {}),
  });

  // Write new state
  await writeRotationState(statePath, newState);

  // Remove lock
  await removeLock(agentsDir);

  // Record observability metrics if tokens provided (Issue #83 — Dogfooding)
  if (options.tokensIn !== undefined || options.tokensOut !== undefined) {
    const model = options.model ?? 'claude-4-sonnet';
    const tracker = createCycleTracker(newState.cycle_count, currentRole.id, model);
    
    // Record tokens in the action_execution phase
    tracker.recordPhase(
      'action_execution',
      options.tokensIn ?? 0,
      options.tokensOut ?? 0
    );
    
    // Finalize with success status
    const metrics = tracker.finalize(outcome !== 'blocked');
    
    // Record to metrics.json
    const manager = createMetricsManager(cwd, 'agents/');
    await manager.record(metrics);
  }

  // Get next role
  const nextRole = getRoleAtOffset(roster, newState.current_index, 0);

  // Build commit message
  // Create a clean subject line (remove emojis, limit to 72 chars for git best practice)
  const roleShort = currentRole.id;
  
  // Strip emojis and clean up action for subject line
  const cleanAction = options.action
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Create concise subject (first sentence or first 50 chars)
  const subjectAction = cleanAction.split(/[.!?]\s/)[0] || cleanAction;
  const maxSubjectLength = 72 - `chore(agents): cycle ${newState.cycle_count} — ${roleShort} — `.length;
  const subjectShort = subjectAction.length > maxSubjectLength
    ? `${subjectAction.substring(0, maxSubjectLength - 3)}...`
    : subjectAction;
  
  const commitSubject = `chore(agents): cycle ${newState.cycle_count} — ${roleShort} — ${subjectShort}`;
  
  // Full commit message for display (subject + body)
  const commitMessage = `${commitSubject}\n\n${options.action}`;

  // Git operations
  let pushed = false;
  let commitSha = '';
  let pushError: string | null = null;

  try {
    // Stage all changes in the repository (not just agents directory)
    // This ensures actual work (packages/, docs/, etc.) is included in commits
    await gitExec(cwd, 'add -A');

    // Commit with multi-line message (use multiple -m flags for subject and body)
    // Escape quotes properly for git
    const escapedSubject = commitSubject.replace(/"/g, '\\"');
    const escapedBody = options.action.replace(/"/g, '\\"');
    const { stdout: commitOut } = await gitExec(cwd, `commit -m "${escapedSubject}" -m "${escapedBody}"`);
    const shaMatch = commitOut.match(/\[[\w-]+\s+([a-f0-9]+)\]/);
    commitSha = shaMatch?.[1] ?? '';

    // Push (unless skip-push)
    if (!options.skipPush) {
      try {
        await gitExec(cwd, 'push origin HEAD');
        pushed = true;
      } catch (err) {
        pushError = (err as Error).message;
        // Retry once after 2 seconds
        await setTimeout(2000);
        try {
          await gitExec(cwd, 'push origin HEAD');
          pushed = true;
          pushError = null;
        } catch (retryErr) {
          pushError = (retryErr as Error).message;
        }
      }
    }
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({
        error: 'git_failed',
        message: (err as Error).message,
        cycle: newState.cycle_count,
        action: options.action,
      }));
    } else {
      console.error(chalk.red('❌ Git operation failed:'), (err as Error).message);
      console.error(chalk.gray('   Rotation state was updated. Manual git commit may be needed.'));
    }
    process.exit(EXIT_CODES.GIT_FAILED);
  }

  // Output
  if (options.json) {
    const output: Record<string, unknown> = {
      cycle: newState.cycle_count,
      role: currentRole.id,
      action: options.action,
      outcome,
      duration,
      git: {
        commit: commitSha,
        message: commitMessage,
        pushed,
        pushError,
      },
      nextRole: nextRole ? {
        id: nextRole.id,
        emoji: nextRole.emoji,
        name: nextRole.name,
      } : null,
    };
    // Include observability data if tokens were provided
    if (options.tokensIn !== undefined || options.tokensOut !== undefined) {
      output.observability = {
        tokensIn: options.tokensIn ?? 0,
        tokensOut: options.tokensOut ?? 0,
        model: options.model ?? 'claude-4-sonnet',
        recorded: true,
      };
    }
    console.log(JSON.stringify(output));
    return;
  }

  if (options.quiet) {
    const pushStatus = options.skipPush ? 'committed' : (pushed ? 'pushed' : 'push failed');
    console.log(`Cycle ${newState.cycle_count} complete (${outcome}) — ${pushStatus}`);
    return;
  }

  // Full output
  if (pushed || options.skipPush) {
    console.log(chalk.bold.green(`\n✅ Cycle ${newState.cycle_count} Complete\n`));
  } else {
    console.log(chalk.bold.yellow(`\n⚠️ Cycle ${newState.cycle_count} Committed (Push Failed)\n`));
  }

  console.log(`  ${chalk.gray('Role:')}      ${formatRole(currentRole)}`);
  console.log(`  ${chalk.gray('Action:')}    ${options.action}`);
  console.log(`  ${chalk.gray('Outcome:')}   ${outcome}`);
  console.log(`  ${chalk.gray('Duration:')} ${duration}`);
  console.log();

  console.log(`  ${chalk.gray('Git:')}`);
  console.log(`    ${chalk.gray('Commit:')}  ${commitMessage}`);
  console.log(`    ${chalk.gray('Branch:')}  main`);

  if (options.skipPush) {
    console.log(`    ${chalk.gray('Pushed:')}  ${chalk.yellow('⏭ skipped (--skip-push)')}`);
  } else if (pushed) {
    console.log(`    ${chalk.gray('Pushed:')}  ${chalk.green('✓ origin/main')}`);
  } else {
    console.log(`    ${chalk.gray('Pushed:')}  ${chalk.red('✗ Failed')}`);
    console.log();
    console.log('  ┌─────────────────────────────────────────────────┐');
    console.log('  │  Changes are committed locally but not pushed.  │');
    console.log('  │                                                 │');
    console.log('  │  Run: git push origin main                      │');
    console.log('  └─────────────────────────────────────────────────┘');
  }

  console.log();
  if (nextRole) {
    console.log(`  ${chalk.gray('Next:')}      ${formatRole(nextRole)}`);
  }
  console.log();
}

// ─── Status Command ──────────────────────────────────────────────────────────

/**
 * Execute dispatch status command.
 */
async function executeStatus(options: DispatchStatusOptions): Promise<void> {
  const cwd = process.cwd();
  const agentsDir = path.resolve(cwd, options.dir, 'agents');
  const statePath = path.join(agentsDir, 'state', 'rotation.json');
  const rosterPath = path.join(agentsDir, 'roster.json');

  // Load state
  let state: RotationState;
  let roster: Roster;

  try {
    [state, roster] = await Promise.all([
      readRotationState(statePath),
      readRoster(rosterPath),
    ]);
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ error: (err as Error).message }));
    } else {
      console.error(chalk.red('❌ Could not read agent state:'), (err as Error).message);
      console.error(chalk.gray("   Run 'ada init' to set up an agent team.\n"));
    }
    process.exit(EXIT_CODES.STATE_CORRUPTION);
  }

  // Check for active lock
  const activeLock = await getActiveLock(agentsDir);
  const isInProgress = activeLock !== null;

  // Get roles
  const currentRole = getCurrentRole(state, roster);
  const nextRole = getRoleAtOffset(roster, state.current_index, 1);

  // Get last entry from history
  const lastEntry = state.history.length > 0
    ? state.history[state.history.length - 1]
    : null;
  const lastRole = lastEntry
    ? roster.roles.find((r) => r.id === lastEntry.role)
    : null;

  // Output
  if (options.json) {
    console.log(JSON.stringify({
      cycle: state.cycle_count + (isInProgress ? 1 : 0),
      state: isInProgress ? 'in_progress' : 'ready',
      inProgress: isInProgress,
      activeLock: activeLock ?? null,
      currentRole: currentRole ? {
        id: currentRole.id,
        emoji: currentRole.emoji,
        name: currentRole.name,
        title: currentRole.title,
      } : null,
      lastCycle: lastEntry ? {
        cycle: lastEntry.cycle,
        role: lastEntry.role,
        action: lastEntry.action,
        timestamp: lastEntry.timestamp,
        ageMs: lastEntry.timestamp ? Date.now() - new Date(lastEntry.timestamp).getTime() : null,
      } : null,
      nextRole: nextRole ? {
        id: nextRole.id,
        emoji: nextRole.emoji,
        name: nextRole.name,
      } : null,
      history: options.verbose ? state.history.slice(-10) : state.history.slice(-5),
    }));
    return;
  }

  if (options.quiet) {
    const stateStr = isInProgress ? '🔄 In Progress' : 'Ready';
    const roleStr = currentRole ? `${currentRole.emoji} ${currentRole.name}` : '(none)';
    const lastStr = lastEntry && lastEntry.timestamp
      ? `Last: ${lastEntry.cycle} (${formatTimeAgo(lastEntry.timestamp)})`
      : '';
    console.log(`${stateStr} | ${roleStr} | ${lastStr}`);
    return;
  }

  // Full output
  console.log(chalk.bold('\n📊 Dispatch Status\n'));

  // State box
  console.log('  ┌─────────────────────────────────────────────────┐');
  console.log(`  │  ${chalk.gray('Cycle:')}     ${(state.cycle_count + (isInProgress ? 1 : 0)).toString().padEnd(33)} │`);

  if (isInProgress && activeLock) {
    const elapsed = formatDuration(activeLock.startedAt);
    console.log(`  │  ${chalk.gray('State:')}     ${chalk.yellow('🔄 In Progress').padEnd(42)} │`);
    console.log(`  │  ${chalk.gray('Active:')}    ${(currentRole ? formatRole(currentRole) : '(none)').substring(0, 31).padEnd(31)} │`);
    console.log(`  │  ${chalk.gray('Started:')}   ${elapsed.padEnd(33)} │`);
  } else {
    console.log(`  │  ${chalk.gray('State:')}     ${chalk.green('Ready (no cycle in progress)').padEnd(42)} │`);
    console.log(`  │  ${chalk.gray('Current:')}   ${(currentRole ? formatRole(currentRole) : '(none)').substring(0, 31).padEnd(31)} │`);
    if (lastEntry && lastEntry.timestamp) {
      const lastStr = `${lastRole?.emoji ?? '❓'} ${lastRole?.name ?? lastEntry.role} — ${formatTimeAgo(lastEntry.timestamp)} (Cycle ${lastEntry.cycle})`;
      console.log(`  │  ${chalk.gray('Last:')}      ${lastStr.substring(0, 31).padEnd(31)} │`);
    }
  }

  if (nextRole) {
    console.log(`  │  ${chalk.gray('Next:')}      ${formatRole(nextRole).substring(0, 31).padEnd(31)} │`);
  }
  console.log('  └─────────────────────────────────────────────────┘');

  // Rotation order
  console.log();
  console.log(chalk.gray('  Rotation Order:'));
  const parts: string[] = [];
  for (let i = 0; i < roster.rotation_order.length; i++) {
    const roleId = roster.rotation_order[i];
    if (!roleId) continue; // TypeScript strict array access
    const isCurrent = i === state.current_index;
    parts.push(isCurrent ? `${roleId}*` : roleId);
  }
  const rotationStr = `    ${parts.join(' → ')}`;
  console.log(rotationStr);

  // History
  const historyCount = options.verbose ? 10 : 5;
  const historyToShow = state.history.slice(-historyCount).reverse();
  if (historyToShow.length > 0) {
    console.log();
    console.log(chalk.gray(`  History (last ${historyToShow.length}):`));
    for (const entry of historyToShow) {
      const role = roster.roles.find((r) => r.id === entry.role);
      const emoji = role?.emoji ?? '❓';
      const name = (role?.name ?? entry.role).padEnd(10);
      // Strip leading emoji from action (already have role emoji)
      const action = (entry.action ?? '').replace(
        /^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}\uFE0F]+\s*/u,
        ''
      );
      const actionTrunc = action.length > 35 ? `${action.substring(0, 32)}...` : action;
      const timeAgo = entry.timestamp ? formatTimeAgo(entry.timestamp) : 'unknown';
      console.log(`    ${chalk.gray(entry.cycle.toString().padStart(3))}  ${emoji} ${chalk.cyan(name)} ${actionTrunc.padEnd(35)} ${chalk.gray(timeAgo)}`);
    }
  }

  // Call to action if in progress
  if (isInProgress) {
    console.log();
    console.log(`  Complete with: ${chalk.cyan('ada dispatch complete --action "..."')}`);
  }

  console.log();
}

// ─── Command Definitions ─────────────────────────────────────────────────────

export const dispatchCommand = new Command('dispatch')
  .description('🏭 Dispatch cycle lifecycle management')
  .addCommand(
    new Command('start')
      .description('Initialize a dispatch cycle')
      .option('-d, --dir <path>', 'Project root directory', '.')
      .option('-r, --role <id>', 'Force a specific role (for debugging)')
      .option('-n, --dry-run', 'Validate without starting')
      .option('-j, --json', 'Output as JSON for programmatic use')
      .option('-q, --quiet', 'Minimal output')
      .option('--no-banner', 'Skip rotation visualization')
      .option('--force', 'Override active cycle (dangerous)')
      .action(async (options: DispatchStartOptions) => {
        try {
          await executeStart(options);
        } catch (err) {
          const error = err as Error;
          if ((options as DispatchStartOptions).json) {
            console.log(JSON.stringify({ error: error.message }));
          } else {
            console.error(chalk.red(`\n❌ Error: ${error.message}`));
          }
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('complete')
      .description('Finalize cycle, update rotation, commit, and push')
      .requiredOption('-a, --action <text>', 'Description of what was done (required)')
      .option('-d, --dir <path>', 'Project root directory', '.')
      .option('-o, --outcome <type>', 'Outcome: success (default), partial, blocked', 'success')
      .option('-R, --reflection <text>', 'Self-critique reflection (Reflexion Phase 1b)')
      .option('--skip-push', 'Commit but do not push')
      .option('-j, --json', 'Output as JSON')
      .option('-q, --quiet', 'Minimal output')
      .option('-f, --force', 'Bypass code change warning and duplicate action check')
      .option('-p, --pr', 'Create a PR instead of direct commit (R-014)')
      .option('-b, --branch <name>', 'Custom branch name (with --pr)')
      .option('--draft', 'Create PR as draft (with --pr)')
      .option('--tokens-in <number>', 'Input tokens consumed (for observability)', parseIntOption)
      .option('--tokens-out <number>', 'Output tokens generated (for observability)', parseIntOption)
      .option('--model <name>', 'Model used for cost calculation (default: claude-4-sonnet)')
      .action(async (options: DispatchCompleteOptions) => {
        try {
          await executeComplete(options);
        } catch (err) {
          const error = err as Error;
          if ((options as DispatchCompleteOptions).json) {
            console.log(JSON.stringify({ error: error.message }));
          } else {
            console.error(chalk.red(`\n❌ Error: ${error.message}`));
          }
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('status')
      .description('Show current dispatch state')
      .option('-d, --dir <path>', 'Project root directory', '.')
      .option('-j, --json', 'Output as JSON')
      .option('-v, --verbose', 'Show full history (10 entries)')
      .option('-q, --quiet', 'State only, no history')
      .action(async (options: DispatchStatusOptions) => {
        try {
          await executeStatus(options);
        } catch (err) {
          const error = err as Error;
          if ((options as DispatchStatusOptions).json) {
            console.log(JSON.stringify({ error: error.message }));
          } else {
            console.error(chalk.red(`\n❌ Error: ${error.message}`));
          }
          process.exit(1);
        }
      })
  );

// Default action: show help
dispatchCommand.action(() => {
  dispatchCommand.outputHelp();
});
