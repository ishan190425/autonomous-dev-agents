/**
 * `ada costs` — Quick cost check for agent operations.
 *
 * A shortcut command that shows just the cost summary.
 * For detailed observability, use `ada observe`.
 *
 * @see Issue #69 for full specification
 * @see docs/product/observability-cli-spec.md for user stories
 * @see Issue #94 for export specification
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  createMetricsManager,
  formatCost,
} from '@ada/core';
import type { CycleMetrics } from '@ada/core';
import {
  detectFormat,
  getSupportedExtensions,
  confirmOverwrite,
  fileExists,
  writeFile,
  toCSV,
  toTSV,
  type ExportFormat,
  type CostExportRow,
  COST_HEADERS,
} from '../lib/export.js';

/** Options for the costs command */
interface CostsOptions {
  dir: string;
  json?: boolean;
  export?: string;
  force?: boolean;
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

/**
 * Export cost summary to file.
 */
function exportCostsToFile(
  filePath: string,
  format: ExportFormat,
  data: {
    today: { cost: number; count: number };
    week: { cost: number; count: number };
    total: { cost: number; cycles: number };
    avgPerCycle: number;
    model: string;
  }
): void {
  let content: string;

  if (format === 'json') {
    content = `${JSON.stringify({
      today: { cost: data.today.cost, cycles: data.today.count },
      week: { cost: data.week.cost, cycles: data.week.count },
      total: { cost: data.total.cost, cycles: data.total.cycles },
      avgPerCycle: data.avgPerCycle,
      model: data.model,
    }, null, 2)  }\n`;
  } else {
    // CSV/TSV export with period rows
    const rows: CostExportRow[] = [
      { period: 'today', cost: data.today.cost, cycles: data.today.count },
      { period: 'week', cost: data.week.cost, cycles: data.week.count },
      { period: 'total', cost: data.total.cost, cycles: data.total.cycles },
    ];
    const converter = format === 'tsv' ? toTSV : toCSV;
    content = converter(rows, COST_HEADERS);
  }

  writeFile(filePath, content);
}

export const costsCommand = new Command('costs')
  .description('Quick cost check for agent operations')
  .option('-d, --dir <path>', 'Agents directory (default: "agents/")', 'agents')
  .option('--json', 'Output as JSON for scripting')
  .option('-e, --export <file>', 'Export costs to file (auto-detects format from extension: .csv, .json, .tsv)')
  .option('-f, --force', 'Overwrite existing file without confirmation')
  .action(async (options: CostsOptions) => {
    const cwd = process.cwd();

    // Validate export format if --export is used
    let exportFormat: ExportFormat | null = null;
    if (options.export) {
      exportFormat = detectFormat(options.export);
      if (!exportFormat) {
        console.error(chalk.red(`❌ Unsupported file extension. Supported formats: ${getSupportedExtensions().join(', ')}`));
        process.exit(1);
      }

      // Check for file overwrite
      if (fileExists(options.export) && !options.force) {
        const confirmed = await confirmOverwrite(options.export);
        if (!confirmed) {
          console.log(chalk.gray('Export cancelled.'));
          return;
        }
      }
    }

    try {
      const metricsManager = createMetricsManager(cwd, options.dir);
      const cycles = await metricsManager.getRecent(100);
      const aggregated = await metricsManager.aggregate();

      // Handle empty state
      if (cycles.length === 0 || !aggregated) {
        if (options.export && exportFormat) {
          // Export empty data
          exportCostsToFile(options.export, exportFormat, {
            today: { cost: 0, count: 0 },
            week: { cost: 0, count: 0 },
            total: { cost: 0, cycles: 0 },
            avgPerCycle: 0,
            model: 'unknown',
          });
          console.log(chalk.green(`✅ Exported empty cost data to ${options.export}`));
        } else if (options.json) {
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

      // Export mode
      if (options.export && exportFormat) {
        exportCostsToFile(options.export, exportFormat, {
          today,
          week,
          total: { cost: aggregated.totalCost.totalCost, cycles: aggregated.totalCycles },
          avgPerCycle: aggregated.avgCostPerCycle.totalCost,
          model,
        });
        console.log(chalk.green(`✅ Exported cost summary to ${options.export}`));
        return;
      }

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
      if (options.export || options.json) {
        console.error(JSON.stringify({ error: (err as Error).message }));
      } else {
        console.error(chalk.red('❌ Could not load cost data:'), (err as Error).message);
      }
      process.exit(1);
    }
  });
