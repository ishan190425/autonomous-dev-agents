/**
 * `ada observe` — Show agent observability metrics (cost, tokens, health).
 *
 * Surfaces the observability data collected by @ada/core to users.
 * Shows cost breakdown, token usage, success rates, and per-role analysis.
 *
 * @see Issue #69 for full specification
 * @see docs/product/observability-cli-spec.md for user stories
 */

import { Command } from 'commander';
import * as path from 'node:path';
import chalk from 'chalk';
import {
  createMetricsManager,
  formatCost,
  formatTokens,
  readRoster,
} from '@ada/core';
import type { AggregatedMetrics, CycleMetrics, Roster } from '@ada/core';

/** Options for the observe command */
interface ObserveOptions {
  dir: string;
  byRole?: boolean;
  cycle?: string;
  last?: string;
  json?: boolean;
}

/**
 * Format a duration in milliseconds to human-readable string.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(0);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format a date for display.
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get emoji for a role by id.
 */
function getRoleEmoji(roleId: string, roster: Roster | null): string {
  if (!roster) return '❓';
  const role = roster.roles.find((r) => r.id === roleId);
  return role?.emoji ?? '❓';
}

/**
 * Calculate cost for a specific day from cycle metrics.
 */
function calculateTodayCost(cycles: readonly CycleMetrics[]): { cost: number; count: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cost = 0;
  let count = 0;
  for (const cycle of cycles) {
    const cycleDate = new Date(cycle.startedAt);
    if (cycleDate >= today) {
      cost += cycle.cost.totalCost;
      count++;
    }
  }
  return { cost, count };
}

/**
 * Print the main observability dashboard.
 */
function printDashboard(
  metrics: AggregatedMetrics,
  cycles: readonly CycleMetrics[],
  projectName: string
): void {
  const today = calculateTodayCost(cycles);
  const lastCycle = cycles[cycles.length - 1];
  const model = lastCycle?.model ?? 'unknown';

  // Calculate time range
  const startDate = new Date(metrics.timeRange.start);
  const endDate = new Date(metrics.timeRange.end);
  const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate average duration from recent cycles
  const recentCycles = cycles.slice(-20);
  const avgDuration = recentCycles.length > 0
    ? recentCycles.reduce((sum, c) => sum + c.durationMs, 0) / recentCycles.length
    : 0;

  console.log(chalk.bold.blue(`📊 Agent Observability — ${projectName}`));
  console.log(chalk.gray('═'.repeat(50)));
  console.log();
  console.log(`${chalk.gray('Cycles:')}    ${metrics.totalCycles} tracked (last 100 retained)`);
  console.log(`${chalk.gray('Period:')}    ${formatDate(metrics.timeRange.start)} → ${formatDate(metrics.timeRange.end)} (${daysDiff} day${daysDiff !== 1 ? 's' : ''})`);
  console.log();

  // Cost Summary Box
  console.log(chalk.bold('💰 COST SUMMARY'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  ${chalk.gray('Total:')}          ${chalk.green(formatCost(metrics.totalCost.totalCost))}`);
  console.log(`  ${chalk.gray('Avg per cycle:')}  ${formatCost(metrics.avgCostPerCycle.totalCost)}`);
  console.log(`  ${chalk.gray('Today:')}          ${formatCost(today.cost)} (${today.count} cycles)`);
  console.log(`  ${chalk.gray('Model:')}          ${model}`);
  console.log();

  // Token Usage Box
  const inputPercent = metrics.totalTokens.totalTokens > 0
    ? Math.round((metrics.totalTokens.inputTokens / metrics.totalTokens.totalTokens) * 100)
    : 0;
  const outputPercent = 100 - inputPercent;

  console.log(chalk.bold('⚡ TOKEN USAGE'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  ${chalk.gray('Total:')}          ${formatTokens(metrics.totalTokens.totalTokens)} tokens`);
  console.log(`  ${chalk.gray('Input:')}          ${formatTokens(metrics.totalTokens.inputTokens)} (${inputPercent}%)`);
  console.log(`  ${chalk.gray('Output:')}         ${formatTokens(metrics.totalTokens.outputTokens)} (${outputPercent}%)`);
  console.log(`  ${chalk.gray('Avg per cycle:')}  ${formatTokens(metrics.avgTokensPerCycle.totalTokens)} tokens`);
  console.log();

  // Health Box
  const successRate = metrics.totalCycles > 0
    ? Math.round((metrics.successfulCycles / metrics.totalCycles) * 100)
    : 100;
  const healthColor = successRate >= 95 ? chalk.green : successRate >= 80 ? chalk.yellow : chalk.red;
  const healthEmoji = successRate >= 95 ? '✅' : successRate >= 80 ? '⚠️' : '❌';

  console.log(chalk.bold('📈 HEALTH'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  ${chalk.gray('Success rate:')}   ${healthColor(`${successRate}%`)} (${metrics.successfulCycles}/${metrics.totalCycles})`);
  console.log(`  ${chalk.gray('Failed:')}         ${metrics.failedCycles} cycles`);
  console.log(`  ${chalk.gray('Avg duration:')}   ${formatDuration(avgDuration)} per cycle`);
  console.log(`  ${chalk.gray('Status:')}         ${healthEmoji} ${successRate >= 95 ? 'Healthy' : successRate >= 80 ? 'Degraded' : 'Unhealthy'}`);
  console.log();

  console.log(chalk.gray("Use 'ada observe --by-role' for per-role breakdown"));
  console.log(chalk.gray(`Use 'ada observe --cycle ${metrics.lastCycle}' for specific cycle details`));
}

/**
 * Print per-role breakdown.
 */
function printByRole(metrics: AggregatedMetrics, roster: Roster | null): void {
  console.log(chalk.bold.blue(`📊 Cost by Role — last ${metrics.totalCycles} cycles`));
  console.log(chalk.gray('═'.repeat(60)));
  console.log();

  // Header
  console.log(
    `${chalk.gray('Role'.padEnd(16))} │ ${chalk.gray('Cycles'.padStart(6))} │ ${chalk.gray('Tokens'.padStart(8))} │ ${chalk.gray('Cost'.padStart(8))} │ ${chalk.gray('Avg/Cycle'.padStart(9))}`
  );
  console.log(chalk.gray('─'.repeat(60)));

  // Sort roles by cost (descending)
  const sortedRoles = Object.entries(metrics.byRole).sort(
    ([, a], [, b]) => b.cost.totalCost - a.cost.totalCost
  );

  for (const [roleId, stats] of sortedRoles) {
    const emoji = getRoleEmoji(roleId, roster);
    const avgCost = stats.cycles > 0 ? stats.cost.totalCost / stats.cycles : 0;

    console.log(
      `${emoji}  ${roleId.padEnd(13)} │ ${String(stats.cycles).padStart(6)} │ ${formatTokens(stats.tokens.totalTokens).padStart(8)} │ ${formatCost(stats.cost.totalCost).padStart(8)} │ ${formatCost(avgCost).padStart(9)}`
    );
  }

  console.log(chalk.gray('─'.repeat(60)));
  console.log(
    `${'TOTAL'.padEnd(16)} │ ${String(metrics.totalCycles).padStart(6)} │ ${formatTokens(metrics.totalTokens.totalTokens).padStart(8)} │ ${formatCost(metrics.totalCost.totalCost).padStart(8)} │ ${formatCost(metrics.avgCostPerCycle.totalCost).padStart(9)}`
  );
  console.log();

  // Add insight if one role is significantly more expensive
  const avgTokensPerRole = metrics.totalTokens.totalTokens / Object.keys(metrics.byRole).length;
  const expensiveRoles = sortedRoles.filter(
    ([, stats]) => stats.tokens.totalTokens > avgTokensPerRole * 1.5
  );
  if (expensiveRoles.length > 0 && expensiveRoles[0]) {
    const [roleId] = expensiveRoles[0];
    const emoji = getRoleEmoji(roleId, roster);
    const percentAboveAvg = Math.round(
      ((expensiveRoles[0][1].tokens.totalTokens / avgTokensPerRole) - 1) * 100
    );
    console.log(chalk.yellow(`💡 Insight: ${emoji} ${roleId} uses ${percentAboveAvg}% more tokens than average.`));
    console.log(chalk.gray('   Consider reviewing its playbook for optimization.'));
  }
}

/**
 * Print specific cycle details.
 */
function printCycleDetails(cycle: CycleMetrics, roster: Roster | null): void {
  const emoji = getRoleEmoji(cycle.role, roster);
  const statusEmoji = cycle.success ? '✅' : '❌';
  const statusText = cycle.success ? 'Success' : 'Failed';
  const statusColor = cycle.success ? chalk.green : chalk.red;

  console.log(chalk.bold.blue(`📊 Cycle ${cycle.cycle} — ${emoji} ${cycle.role}`));
  console.log(chalk.gray('═'.repeat(50)));
  console.log();
  console.log(`${chalk.gray('Started:')}    ${formatDate(cycle.startedAt)}`);
  console.log(`${chalk.gray('Completed:')}  ${formatDate(cycle.completedAt)}`);
  console.log(`${chalk.gray('Duration:')}   ${formatDuration(cycle.durationMs)}`);
  console.log(`${chalk.gray('Status:')}     ${statusEmoji} ${statusColor(statusText)}`);
  console.log(`${chalk.gray('Model:')}      ${cycle.model}`);
  console.log();

  // Token Usage by Phase
  console.log(chalk.bold('Token Usage by Phase'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(
    `${chalk.gray('Phase'.padEnd(24))} │ ${chalk.gray('Input'.padStart(10))} │ ${chalk.gray('Output'.padStart(10))}`
  );
  console.log(chalk.gray('─'.repeat(50)));

  const phaseOrder = [
    'context_load',
    'situational_awareness',
    'action_selection',
    'action_execution',
    'memory_update',
    'compression_check',
    'evolution_check',
    'state_update',
  ];

  for (const phase of phaseOrder) {
    const usage = cycle.phases[phase as keyof typeof cycle.phases];
    if (usage) {
      const phaseName = phase.replace(/_/g, ' ');
      console.log(
        `${phaseName.padEnd(24)} │ ${formatTokens(usage.inputTokens).padStart(10)} │ ${formatTokens(usage.outputTokens).padStart(10)}`
      );
    }
  }

  console.log(chalk.gray('─'.repeat(50)));
  console.log(
    `${'TOTAL'.padEnd(24)} │ ${formatTokens(cycle.totals.inputTokens).padStart(10)} │ ${formatTokens(cycle.totals.outputTokens).padStart(10)}`
  );
  console.log();
  console.log(`${chalk.gray('Cost:')} ${formatCost(cycle.cost.totalCost)} (input: ${formatCost(cycle.cost.inputCost)}, output: ${formatCost(cycle.cost.outputCost)})`);

  if (cycle.error) {
    console.log();
    console.log(chalk.red.bold('Error:'));
    console.log(chalk.red(`  ${cycle.error}`));
  }
}

/**
 * Print JSON output.
 */
function printJson(
  metrics: AggregatedMetrics | null,
  cycles: readonly CycleMetrics[],
  cycleDetail: CycleMetrics | null
): void {
  const output: Record<string, unknown> = {};

  if (cycleDetail) {
    output.cycle = cycleDetail;
  } else if (metrics) {
    output.aggregated = metrics;
    output.recentCycles = cycles.slice(-10);
  }

  console.log(JSON.stringify(output, null, 2));
}

export const observeCommand = new Command('observe')
  .description('Show agent observability metrics (cost, tokens, health)')
  .option('-d, --dir <path>', 'Agents directory (default: "agents/")', 'agents')
  .option('--by-role', 'Show per-role cost and token breakdown')
  .option('--cycle <n>', 'Show detailed metrics for a specific cycle')
  .option('--last <n>', 'Show last n cycles', '10')
  .option('--json', 'Output as JSON for scripting')
  .action(async (options: ObserveOptions) => {
    const cwd = process.cwd();
    const agentsDir = path.resolve(cwd, options.dir);
    const rosterPath = path.join(agentsDir, 'roster.json');

    try {
      // Load roster for role emoji lookup
      let roster: Roster | null = null;
      try {
        roster = await readRoster(rosterPath);
      } catch {
        // Roster not available, continue without emoji
      }

      // Create metrics manager and load data
      const metricsManager = createMetricsManager(cwd, options.dir);
      const cycles = await metricsManager.getRecent(100);
      const aggregated = await metricsManager.aggregate();

      // Handle empty state
      if (cycles.length === 0 || !aggregated) {
        if (options.json) {
          console.log(JSON.stringify({ error: 'No observability data collected yet.' }));
        } else {
          console.log(chalk.yellow('📊 No observability data collected yet.'));
          console.log();
          console.log(chalk.gray('Run `ada run` to execute dispatch cycles and collect metrics.'));
          console.log(chalk.gray('Metrics are stored in agents/state/metrics.json'));
        }
        return;
      }

      // Specific cycle view
      if (options.cycle) {
        const cycleNumber = parseInt(options.cycle, 10);
        const cycle = await metricsManager.getCycle(cycleNumber);

        if (!cycle) {
          if (options.json) {
            console.log(JSON.stringify({ error: `Cycle ${cycleNumber} not found in tracked metrics.` }));
          } else {
            console.error(chalk.red(`❌ Cycle ${cycleNumber} not found in tracked metrics.`));
            console.log(chalk.gray(`   Tracked range: cycles ${aggregated.firstCycle} to ${aggregated.lastCycle}`));
          }
          process.exit(1);
        }

        if (options.json) {
          printJson(null, cycles, cycle);
        } else {
          printCycleDetails(cycle, roster);
        }
        return;
      }

      // JSON output
      if (options.json) {
        printJson(aggregated, cycles, null);
        return;
      }

      // By-role view
      if (options.byRole) {
        printByRole(aggregated, roster);
        return;
      }

      // Default dashboard view
      const projectName = roster?.product ?? 'ADA Project';
      printDashboard(aggregated, cycles, projectName);
    } catch (err) {
      if (options.json) {
        console.error(JSON.stringify({ error: (err as Error).message }));
      } else {
        console.error(chalk.red('❌ Could not load observability data:'), (err as Error).message);
        console.error(chalk.gray('   Ensure the agents directory exists and contains state/metrics.json'));
      }
      process.exit(1);
    }
  });
