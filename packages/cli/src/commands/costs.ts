/**
 * `ada costs` — Quick cost check for agent operations.
 *
 * A shortcut command that shows just the cost summary.
 * For detailed observability, use `ada observe`.
 *
 * @see Issue #69 for full specification
 * @see docs/product/observability-cli-spec.md for user stories
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  createMetricsManager,
  formatCost,
} from '@ada/core';
import type { CycleMetrics } from '@ada/core';

/** Options for the costs command */
interface CostsOptions {
  dir: string;
  json?: boolean;
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
 * Calculate cost for the last 7 days.
 */
function calculateWeekCost(cycles: readonly CycleMetrics[]): { cost: number; count: number } {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  let cost = 0;
  let count = 0;
  for (const cycle of cycles) {
    const cycleDate = new Date(cycle.startedAt);
    if (cycleDate >= weekAgo) {
      cost += cycle.cost.totalCost;
      count++;
    }
  }
  return { cost, count };
}

export const costsCommand = new Command('costs')
  .description('Quick cost check for agent operations')
  .option('-d, --dir <path>', 'Agents directory (default: "agents/")', 'agents')
  .option('--json', 'Output as JSON for scripting')
  .action(async (options: CostsOptions) => {
    const cwd = process.cwd();

    try {
      const metricsManager = createMetricsManager(cwd, options.dir);
      const cycles = await metricsManager.getRecent(100);
      const aggregated = await metricsManager.aggregate();

      // Handle empty state
      if (cycles.length === 0 || !aggregated) {
        if (options.json) {
          console.log(JSON.stringify({ error: 'No cost data collected yet.' }));
        } else {
          console.log(chalk.yellow('💰 No cost data collected yet.'));
          console.log();
          console.log(chalk.gray('Run `ada run` to execute dispatch cycles and collect metrics.'));
        }
        return;
      }

      const today = calculateTodayCost(cycles);
      const week = calculateWeekCost(cycles);
      const lastCycle = cycles[cycles.length - 1];
      const model = lastCycle?.model ?? 'unknown';

      if (options.json) {
        console.log(JSON.stringify({
          today: { cost: today.cost, cycles: today.count },
          week: { cost: week.cost, cycles: week.count },
          total: { cost: aggregated.totalCost.totalCost, cycles: aggregated.totalCycles },
          avgPerCycle: aggregated.avgCostPerCycle.totalCost,
          model,
        }, null, 2));
        return;
      }

      console.log(chalk.bold.blue('💰 ADA Agent Costs'));
      console.log(chalk.gray('═'.repeat(45)));
      console.log();
      console.log(`${chalk.gray('Today:')}        ${chalk.green(formatCost(today.cost))} (${today.count} cycles)`);
      console.log(`${chalk.gray('This week:')}    ${formatCost(week.cost)} (${week.count} cycles)`);
      console.log(`${chalk.gray('All time:')}     ${formatCost(aggregated.totalCost.totalCost)} (${aggregated.totalCycles} cycles)`);
      console.log(`${chalk.gray('Avg/cycle:')}    ${formatCost(aggregated.avgCostPerCycle.totalCost)}`);
      console.log();
      console.log(`${chalk.gray('Model:')} ${model}`);
      console.log();
      console.log(chalk.gray("Use 'ada observe' for full breakdown"));
    } catch (err) {
      if (options.json) {
        console.error(JSON.stringify({ error: (err as Error).message }));
      } else {
        console.error(chalk.red('❌ Could not load cost data:'), (err as Error).message);
      }
      process.exit(1);
    }
  });
