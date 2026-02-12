/**
 * `ada heat` — Heat scoring commands for cognitive memory system.
 *
 * Manage and inspect heat scores that determine which memories stay "hot"
 * (in context), "warm" (retrieved on demand), or "cold" (archived).
 *
 * Commands:
 *   ada heat              Show heat score summary and distribution
 *   ada heat list         List all entries with scores and tiers
 *   ada heat decay        Apply time-based decay to scores
 *   ada heat boost        Manually boost an entry's heat score
 *   ada heat get          Get heat score for a specific entry
 *
 * @see Issue #118 — Heat Scoring Implementation
 * @see docs/engineering/sprint-2-implementation-contract.md
 * @packageDocumentation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';

// Import heat module types and functions from heat subpath
import {
  HeatStore,
  createHeatStore,
  getHeatEmoji,
  formatHeatScore,
  getHeatTier,
  type HeatTier,
  type HeatStats,
  type HeatEntry,
  type DecayResult,
} from '@ada/core/heat';

/** Options for heat commands */
interface HeatOptions {
  dir: string;
  json?: boolean;
}

/** Options for heat list command */
interface HeatListOptions extends HeatOptions {
  tier?: HeatTier;
  limit?: string;
}

/** Options for heat decay command */
interface HeatDecayOptions extends HeatOptions {
  dryRun?: boolean;
}

/** Options for heat boost command */
interface HeatBoostOptions extends HeatOptions {
  amount?: string;
}

/**
 * Initialize heat store from directory
 */
async function initStore(dir: string): Promise<HeatStore> {
  const store = createHeatStore(path.join(dir, 'agents'));
  await store.load();
  return store;
}

/**
 * Format a heat entry for display
 */
function formatEntry(entry: HeatEntry & { heatScore?: number; tier?: HeatTier }): string {
  const tier = entry.tier ?? getHeatTier(entry.heatScore ?? 0);
  const emoji = getHeatEmoji(tier);
  const score = formatHeatScore(entry.heatScore ?? 0);
  const age = formatAge(entry.lastAccessedAt);
  return `${emoji} ${chalk.bold(entry.id)} ${score} (${entry.memoryClass}, ${age})`;
}

/**
 * Format a timestamp as relative age
 */
function formatAge(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  if (hours > 0) {
    return hours === 1 ? '1h ago' : `${hours}h ago`;
  }
  return 'recently';
}

/**
 * Format heat stats summary
 */
function formatStats(stats: HeatStats): string {
  const total = stats.total;
  if (total === 0) {
    return chalk.yellow('No entries in heat store.');
  }

  const lines: string[] = [
    chalk.bold('Heat Distribution'),
    '',
    `  ${chalk.red('🔥 Hot:')}   ${stats.byTier.hot.toString().padStart(4)} (${((stats.byTier.hot / total) * 100).toFixed(1)}%)`,
    `  ${chalk.yellow('🌡️  Warm:')}  ${stats.byTier.warm.toString().padStart(4)} (${((stats.byTier.warm / total) * 100).toFixed(1)}%)`,
    `  ${chalk.blue('❄️  Cold:')}  ${stats.byTier.cold.toString().padStart(4)} (${((stats.byTier.cold / total) * 100).toFixed(1)}%)`,
    '',
    `  ${chalk.dim('Total:')}   ${total.toString().padStart(4)}`,
    `  ${chalk.dim('Avg Heat:')}${stats.averageHeat.toFixed(3).padStart(8)}`,
    `  ${chalk.dim('Avg Refs:')}${stats.averageReferences.toFixed(1).padStart(8)}`,
    '',
    chalk.dim('By Memory Class:'),
    `  Innate:   ${stats.byClass.innate}`,
    `  Learned:  ${stats.byClass.learned}`,
    `  Episodic: ${stats.byClass.episodic}`,
  ];
  return lines.join('\n');
}

/**
 * Format decay results
 */
function formatDecayResults(result: DecayResult, dryRun: boolean): string {
  if (result.tierChanges.length === 0 && result.archived.length === 0) {
    return chalk.green('No entries needed decay.');
  }

  const header = dryRun
    ? chalk.yellow('Would apply the following changes:')
    : chalk.green('Applied changes:');

  const lines: string[] = [header, ''];

  if (result.tierChanges.length > 0) {
    lines.push(chalk.bold('Tier Changes:'));
    for (const change of result.tierChanges) {
      const arrow = chalk.dim('→');
      lines.push(
        `  ${change.id}: ${change.oldScore.toFixed(3)} ${arrow} ${change.newScore.toFixed(3)} [${change.oldTier} ${arrow} ${change.newTier}]`
      );
    }
    lines.push('');
  }

  if (result.archived.length > 0) {
    lines.push(chalk.bold('Would Archive:'));
    for (const id of result.archived) {
      lines.push(`  ${chalk.red('×')} ${id}`);
    }
    lines.push('');
  }

  lines.push(chalk.dim(`Processed ${result.processed} entries`));

  if (dryRun) {
    lines.push('');
    lines.push(chalk.dim('This was a dry run. Use --no-dry-run to apply.'));
  }

  return lines.join('\n');
}

// ─── Commands ───────────────────────────────────────────────────────────────

/**
 * ada heat — Show heat score summary
 */
async function heatSummary(options: HeatOptions): Promise<void> {
  try {
    const store = await initStore(options.dir);
    const stats = store.stats();

    if (options.json) {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }

    console.log('');
    console.log(formatStats(stats));
    console.log('');
    console.log(chalk.dim('Use `ada heat list` to see all entries.'));
    console.log(chalk.dim('Use `ada heat decay --dry-run` to preview decay.'));
    console.log('');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(chalk.yellow('No heat store found. Heat scoring not yet initialized.'));
      console.log(chalk.dim('Heat scores will be created when agents start tracking memory access.'));
      return;
    }
    throw error;
  }
}

/**
 * ada heat list — List entries by tier
 */
async function heatList(options: HeatListOptions): Promise<void> {
  try {
    const store = await initStore(options.dir);
    const limit = options.limit ? parseInt(options.limit, 10) : 20;

    let entries: ReadonlyArray<HeatEntry & { heatScore: number; tier?: HeatTier }>;

    if (options.tier) {
      entries = store.getByTier(options.tier);
    } else {
      entries = store.getAllWithScores();
    }

    // Apply limit
    const displayed = entries.slice(0, limit);

    if (options.json) {
      console.log(JSON.stringify(displayed, null, 2));
      return;
    }

    if (displayed.length === 0) {
      console.log(chalk.yellow('No entries found.'));
      return;
    }

    console.log('');
    console.log(chalk.bold(`Heat Scores${options.tier ? ` (${options.tier} only)` : ''}`));
    console.log('');

    for (const entry of displayed) {
      console.log(`  ${formatEntry(entry)}`);
    }

    if (entries.length > limit) {
      console.log('');
      console.log(chalk.dim(`Showing ${limit} of ${entries.length}. Use --limit to see more.`));
    }

    console.log('');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(chalk.yellow('No heat store found.'));
      return;
    }
    throw error;
  }
}

/**
 * ada heat decay — Apply decay to all entries
 */
async function heatDecay(options: HeatDecayOptions): Promise<void> {
  try {
    const store = await initStore(options.dir);

    const result = await store.decay({
      dryRun: options.dryRun ?? true, // Default to dry-run for safety
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log('');
    console.log(formatDecayResults(result, options.dryRun ?? true));
    console.log('');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(chalk.yellow('No heat store found. Nothing to decay.'));
      return;
    }
    throw error;
  }
}

/**
 * ada heat boost — Boost an entry's heat score
 *
 * Note: This increments the reference count, which increases heat.
 * Direct score manipulation is not supported (heat is calculated).
 */
async function heatBoost(
  entityId: string,
  options: HeatBoostOptions
): Promise<void> {
  try {
    const store = await initStore(options.dir);
    const times = options.amount ? parseInt(options.amount, 10) : 1;

    const entry = store.get(entityId);
    if (!entry) {
      console.log(chalk.red(`Entry not found: ${entityId}`));
      process.exit(1);
    }

    const oldRefs = entry.referenceCount;

    // Increment reference count (which boosts heat)
    let updated = entry;
    for (let i = 0; i < times; i++) {
      const result = await store.increment(entityId, i === times - 1);
      if (result) updated = result;
    }

    // Get updated entry with scores
    const allWithScores = store.getAllWithScores();
    const withScore = allWithScores.find((e) => e.id === entityId);

    if (options.json) {
      console.log(JSON.stringify({ before: entry, after: withScore }, null, 2));
      return;
    }

    console.log('');
    console.log(chalk.green(`Boosted ${entityId}`));
    console.log(`  References: ${oldRefs} → ${updated.referenceCount} (+${times})`);
    if (withScore) {
      console.log(`  Heat: ${formatHeatScore(withScore.heatScore)} (${withScore.tier})`);
    }
    console.log('');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(chalk.yellow('No heat store found.'));
      return;
    }
    throw error;
  }
}

/**
 * ada heat get — Get heat score for a specific entry
 */
async function heatGet(
  entityId: string,
  options: HeatOptions
): Promise<void> {
  try {
    const store = await initStore(options.dir);
    const entry = store.get(entityId);

    if (!entry) {
      console.log(chalk.red(`Entry not found: ${entityId}`));
      process.exit(1);
    }

    // Get with score
    const allWithScores = store.getAllWithScores();
    const withScore = allWithScores.find((e) => e.id === entityId);

    if (options.json) {
      console.log(JSON.stringify(withScore ?? entry, null, 2));
      return;
    }

    console.log('');
    console.log(formatEntry(withScore ?? entry));
    console.log('');
    console.log(chalk.dim(`  Reference count: ${entry.referenceCount}`));
    console.log(chalk.dim(`  Base importance: ${entry.baseImportance.toFixed(2)}`));
    console.log(chalk.dim(`  Memory class:    ${entry.memoryClass}`));
    console.log(chalk.dim(`  Created: ${new Date(entry.createdAt).toISOString()}`));
    console.log(chalk.dim(`  Last accessed: ${new Date(entry.lastAccessedAt).toISOString()}`));
    console.log('');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(chalk.yellow('No heat store found.'));
      return;
    }
    throw error;
  }
}

// ─── Command Definition ─────────────────────────────────────────────────────

export const heatCommand = new Command('heat')
  .description('Heat scoring for cognitive memory — hot/warm/cold memory tiers')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('--json', 'Output as JSON')
  .action(heatSummary);

heatCommand
  .command('list')
  .description('List heat scores for all entries')
  .option('-t, --tier <tier>', 'Filter by tier (hot, warm, cold)')
  .option('-l, --limit <n>', 'Maximum entries to show', '20')
  .option('--json', 'Output as JSON')
  .action(async (cmdOptions) => {
    const parentOptions = heatCommand.opts();
    await heatList({ ...parentOptions, ...cmdOptions });
  });

heatCommand
  .command('decay')
  .description('Apply time-based decay to heat scores')
  .option('--dry-run', 'Preview changes without applying (default)', true)
  .option('--no-dry-run', 'Apply decay changes')
  .option('--json', 'Output as JSON')
  .action(async (cmdOptions) => {
    const parentOptions = heatCommand.opts();
    await heatDecay({ ...parentOptions, ...cmdOptions });
  });

heatCommand
  .command('boost <entityId>')
  .description('Boost an entry\'s heat by incrementing references')
  .option('-n, --amount <n>', 'Number of reference increments (default: 1)', '1')
  .option('--json', 'Output as JSON')
  .action(async (entityId, cmdOptions) => {
    const parentOptions = heatCommand.opts();
    await heatBoost(entityId, { ...parentOptions, ...cmdOptions });
  });

heatCommand
  .command('get <entityId>')
  .description('Get heat score for a specific entry')
  .option('--json', 'Output as JSON')
  .action(async (entityId, cmdOptions) => {
    const parentOptions = heatCommand.opts();
    await heatGet(entityId, { ...parentOptions, ...cmdOptions });
  });
