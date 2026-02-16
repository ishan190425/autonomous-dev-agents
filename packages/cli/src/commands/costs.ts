/**
 * `ada costs` — Quick cost check for agent operations.
 *
 * A shortcut command that shows just the cost summary.
 * For detailed observability, use `ada observe`.
 *
 * @see Issue #69 for full specification
 * @see docs/product/observability-cli-spec.md for user stories
 * @see Issue #94 for export specification
 * @see docs/frontier/model-routing-validation-spec-c735.md for --savings
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  createMetricsManager,
  formatCost,
  calculateSavingsAnalysis,
} from '@ada-ai/core';
import type { CycleMetrics, SavingsAnalysis } from '@ada-ai/core';
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
  savings?: boolean;
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

/**
 * Render a progress bar for model distribution.
 */
function renderDistributionBar(percentage: number, width: number = 26): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Get status emoji and color for savings analysis.
 */
function getSavingsStatus(analysis: SavingsAnalysis): { emoji: string; color: typeof chalk } {
  if (analysis.savings.percentage >= analysis.targetPercentage) {
    return { emoji: '✅', color: chalk.green };
  } else if (analysis.savings.percentage >= 5) {
    return { emoji: '⚠️', color: chalk.yellow };
  }
  return { emoji: '❌', color: chalk.red };
}

/**
 * Display savings analysis output.
 */
function displaySavingsAnalysis(analysis: SavingsAnalysis, jsonOutput: boolean): void {
  if (jsonOutput) {
    console.log(JSON.stringify({
      modelDistribution: {
        haiku: analysis.modelDistribution.haiku,
        sonnet: analysis.modelDistribution.sonnet,
        opus: analysis.modelDistribution.opus,
      },
      actualCost: analysis.actualCost,
      baselineCost: analysis.baselineCost,
      savings: analysis.savings,
      perCycle: analysis.perCycle,
      status: analysis.status,
      target: analysis.targetPercentage,
      projected: analysis.projectedPercentage,
      cycleCount: analysis.cycleCount,
    }, null, 2));
    return;
  }

  const { emoji, color } = getSavingsStatus(analysis);

  console.log(chalk.bold.blue('💰 ADA Cost Savings Analysis'));
  console.log(chalk.gray('═'.repeat(55)));
  console.log();

  // Model Distribution
  console.log(chalk.bold('📊 MODEL DISTRIBUTION') + chalk.gray(` (${analysis.cycleCount} cycles)`));
  console.log(chalk.gray('─'.repeat(55)));

  const dist = analysis.modelDistribution;
  console.log(`${chalk.cyan('Haiku')}     │ ${chalk.cyan(renderDistributionBar(dist.haiku.percentage))}  ${String(dist.haiku.cycles).padStart(3)} cycles (${dist.haiku.percentage}%)`);
  console.log(`${chalk.yellow('Sonnet')}    │ ${chalk.yellow(renderDistributionBar(dist.sonnet.percentage))}  ${String(dist.sonnet.cycles).padStart(3)} cycles (${dist.sonnet.percentage}%)`);
  console.log(`${chalk.magenta('Opus')}      │ ${chalk.magenta(renderDistributionBar(dist.opus.percentage))}  ${String(dist.opus.cycles).padStart(3)} cycles (${dist.opus.percentage}%)`);
  console.log(chalk.gray('─'.repeat(55)));
  console.log();

  // Cost Comparison
  console.log(chalk.bold('💵 COST COMPARISON'));
  console.log(chalk.gray('─'.repeat(55)));
  console.log(`${chalk.gray('Actual Cost:')}     ${chalk.white(formatCost(analysis.actualCost))} (${analysis.cycleCount} cycles)`);
  console.log(`${chalk.gray('Baseline Cost:')}   ${chalk.white(formatCost(analysis.baselineCost))} (if all Sonnet)`);
  console.log(chalk.gray('─'.repeat(55)));
  console.log(`${chalk.bold('Savings:')}         ${color(formatCost(analysis.savings.amount))} (${color(`${analysis.savings.percentage}%`)})`);
  console.log(chalk.gray('─'.repeat(55)));
  console.log();

  // Status
  console.log(`${emoji} ${chalk.bold('Status:')} ${color(analysis.status === 'on_track' ? 'ON TRACK' : analysis.status === 'above_target' ? 'ABOVE TARGET' : 'BELOW TARGET')}`);
  console.log(`   Target: ${analysis.targetPercentage}%+  |  Actual: ${analysis.savings.percentage}%  |  Projected: ${analysis.projectedPercentage}%`);
  console.log();

  // Per-Cycle Analysis
  console.log(chalk.bold('📈 Per-Cycle Analysis'));
  console.log(chalk.gray('─'.repeat(55)));
  console.log(`${chalk.gray('Avg Actual:')}      ${formatCost(analysis.perCycle.actual)}/cycle`);
  console.log(`${chalk.gray('Avg Baseline:')}    ${formatCost(analysis.perCycle.baseline)}/cycle`);
  console.log(`${chalk.gray('Avg Savings:')}     ${formatCost(analysis.perCycle.savings)}/cycle`);
}

export const costsCommand = new Command('costs')
  .description('Quick cost check for agent operations')
  .option('-d, --dir <path>', 'Agents directory (default: "agents/")', 'agents')
  .option('--json', 'Output as JSON for scripting')
  .option('-e, --export <file>', 'Export costs to file (auto-detects format from extension: .csv, .json, .tsv)')
  .option('-f, --force', 'Overwrite existing file without confirmation')
  .option('-s, --savings', 'Show model routing savings analysis (Phase 2 dogfooding)')
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

      // Savings analysis mode (Phase 2 dogfooding)
      if (options.savings) {
        const analysis = calculateSavingsAnalysis(cycles);
        displaySavingsAnalysis(analysis, !!options.json);
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
