/**
 * `ada observe` — Show agent observability metrics (cost, tokens, health, latency).
 *
 * Surfaces the observability data collected by @ada/core to users.
 * Shows cost breakdown, token usage, success rates, per-role analysis,
 * and Phase 2 latency timing with visual progress bars.
 *
 * Phase 2 Feature 3/4: `--last N` flag for filtering to recent cycles.
 *
 * @see Issue #69 for full specification
 * @see Issue #85 for `--last N` specification
 * @see docs/product/observability-cli-spec.md for user stories
 * @see docs/design/last-n-cli-ux-spec.md for `--last N` UX design
 */

import { Command } from 'commander';
import * as path from 'node:path';
import chalk from 'chalk';
import {
  createMetricsManager,
  formatCost,
  formatTokens,
  readRoster,
  emptyUsage,
  emptyCost,
  addUsage,
  addCost,
  divideUsage,
  divideCost,
} from '@ada/core';
import type {
  AggregatedMetrics,
  CycleMetrics,
  Roster,
  DispatchPhase,
  TokenUsage,
  TokenCost,
  PhaseLatencyStats,
} from '@ada/core';
import {
  detectFormat,
  getSupportedExtensions,
  confirmOverwrite,
  fileExists,
  writeFile,
  toCSV,
  toTSV,
  type ExportFormat,
  type CycleExportRow,
  type RoleExportRow,
  CYCLE_HEADERS,
  ROLE_HEADERS,
} from '../lib/export.js';

/** Options for the observe command */
interface ObserveOptions {
  dir: string;
  byRole?: boolean;
  cycle?: string;
  last?: string;
  json?: boolean;
  export?: string;
  force?: boolean;
}

/** Filter state for --last N */
interface FilterState {
  /** Number of cycles requested */
  readonly last: number;
  /** Actual cycle range shown [start, end] */
  readonly cycleRange: readonly [number, number];
  /** Total cycles before filtering */
  readonly unfilteredTotal: number;
}

/** Phase display name abbreviations per design spec */
const PHASE_DISPLAY_NAMES: Record<DispatchPhase, string> = {
  context_load: 'context_load',
  situational_awareness: 'situational',
  action_selection: 'selection',
  action_execution: 'execution',
  memory_update: 'memory_update',
  compression_check: 'compression',
  evolution_check: 'evolution',
  state_update: 'state_update',
};

/** Order phases appear in output */
const PHASE_ORDER: DispatchPhase[] = [
  'context_load',
  'situational_awareness',
  'action_selection',
  'action_execution',
  'memory_update',
  'compression_check',
  'evolution_check',
  'state_update',
];

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
 * Render a progress bar for latency visualization.
 * Uses █ (full) and ░ (empty) characters.
 * 
 * @param ratio - Value between 0 and 1
 * @param width - Total width in characters (default: 20)
 */
function renderProgressBar(ratio: number, width: number = 20): string {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  // Ensure at least 1 bar if there's any duration
  const filled = clampedRatio > 0 ? Math.max(1, Math.round(clampedRatio * width)) : 0;
  const empty = width - filled;
  return chalk.green('█'.repeat(filled)) + '░'.repeat(empty);
}

/**
 * Calculate hourly spend rate from cost and duration.
 */
function calculateSpendRate(cost: number, durationMs: number): number {
  if (durationMs === 0) return 0;
  const hoursElapsed = durationMs / (1000 * 60 * 60);
  return cost / hoursElapsed;
}

/**
 * Calculate efficiency: tokens per second.
 * Useful for comparing roles or models.
 */
function calculateEfficiency(tokens: number, durationMs: number): number {
  if (durationMs === 0) return 0;
  return Math.round((tokens / durationMs) * 1000);
}

/**
 * Check if cycle has latency data (Phase 2+).
 */
function hasLatencyData(cycle: CycleMetrics): boolean {
  return !!cycle.latency && Object.keys(cycle.latency).length > 0;
}

/**
 * Aggregate metrics from a filtered set of cycles.
 * Used when --last N is applied to re-compute aggregates.
 */
function aggregateFilteredCycles(cycles: readonly CycleMetrics[]): AggregatedMetrics | null {
  if (cycles.length === 0) {
    return null;
  }

  let totalTokens: TokenUsage = emptyUsage();
  let totalCost: TokenCost = emptyCost();
  let totalDurationMs = 0;
  let successfulCycles = 0;
  let failedCycles = 0;
  const byRole: Record<string, { cycles: number; tokens: TokenUsage; cost: TokenCost }> = {};

  // Phase latency aggregation (Phase 2)
  const phaseLatencyData: Partial<Record<DispatchPhase, { durations: number[] }>> = {};

  for (const cycle of cycles) {
    totalTokens = addUsage(totalTokens, cycle.totals);
    totalCost = addCost(totalCost, cycle.cost);
    totalDurationMs += cycle.durationMs;

    if (cycle.success) {
      successfulCycles++;
    } else {
      failedCycles++;
    }

    // Aggregate by role
    let roleStats = byRole[cycle.role];
    if (!roleStats) {
      roleStats = { cycles: 0, tokens: emptyUsage(), cost: emptyCost() };
      byRole[cycle.role] = roleStats;
    }
    roleStats.cycles++;
    roleStats.tokens = addUsage(roleStats.tokens, cycle.totals);
    roleStats.cost = addCost(roleStats.cost, cycle.cost);

    // Aggregate phase latency (Phase 2)
    if (cycle.latency) {
      for (const [phase, latency] of Object.entries(cycle.latency)) {
        const phaseKey = phase as DispatchPhase;
        let data = phaseLatencyData[phaseKey];
        if (!data) {
          data = { durations: [] };
          phaseLatencyData[phaseKey] = data;
        }
        data.durations.push(latency.durationMs);
      }
    }
  }

  const totalCycleCount = cycles.length;
  const firstCycle = cycles[0]!;
  const lastCycle = cycles[cycles.length - 1]!;

  // Calculate phase latency stats (Phase 2)
  const hasPhaseLatencyData = Object.keys(phaseLatencyData).length > 0;
  let phaseLatency: Partial<Record<DispatchPhase, PhaseLatencyStats>> | undefined;

  if (hasPhaseLatencyData) {
    phaseLatency = {};
    for (const [phase, data] of Object.entries(phaseLatencyData)) {
      const durations = data.durations;
      const count = durations.length;
      const totalMs = durations.reduce((sum, d) => sum + d, 0);
      phaseLatency[phase as DispatchPhase] = {
        count,
        totalMs,
        avgMs: Math.round(totalMs / count),
        minMs: Math.min(...durations),
        maxMs: Math.max(...durations),
      };
    }
  }

  return {
    totalCycles: totalCycleCount,
    successfulCycles,
    failedCycles,
    totalTokens,
    totalCost,
    avgTokensPerCycle: divideUsage(totalTokens, totalCycleCount),
    avgCostPerCycle: divideCost(totalCost, totalCycleCount),
    byRole,
    firstCycle: firstCycle.cycle,
    lastCycle: lastCycle.cycle,
    timeRange: {
      start: firstCycle.startedAt,
      end: lastCycle.completedAt,
    },
    avgDurationMs: Math.round(totalDurationMs / totalCycleCount),
    ...(phaseLatency && { phaseLatency }),
  };
}

/**
 * Print phase timing section for a cycle (Phase 2 feature).
 */
function printPhaseTimingSection(cycle: CycleMetrics): void {
  if (!cycle.latency || Object.keys(cycle.latency).length === 0) {
    return;
  }

  const latency = cycle.latency;
  const totalDuration = cycle.durationMs;

  console.log();
  console.log(chalk.bold('⏱️  Phase Timing'));
  console.log(chalk.gray('─'.repeat(60)));

  for (const phase of PHASE_ORDER) {
    const phaseLatency = latency[phase];
    if (!phaseLatency) continue;

    const displayName = PHASE_DISPLAY_NAMES[phase];
    const duration = phaseLatency.durationMs;
    const ratio = totalDuration > 0 ? duration / totalDuration : 0;
    const percent = Math.round(ratio * 100);
    const bar = renderProgressBar(ratio, 20);

    console.log(
      `${displayName.padEnd(14)} │ ${formatDuration(duration).padStart(6)} │ ${bar} │ ${String(percent).padStart(3)}%`
    );
  }

  console.log(chalk.gray('─'.repeat(60)));
  console.log(
    `${'TOTAL'.padEnd(14)} │ ${formatDuration(totalDuration).padStart(6)} │${''.padStart(22)}│ 100%`
  );
}

/**
 * Print efficiency section for a cycle (Phase 2 feature).
 */
function printEfficiencySection(cycle: CycleMetrics): void {
  const totalTokens = cycle.totals.totalTokens;
  const durationMs = cycle.durationMs;
  const cost = cycle.cost.totalCost;

  const throughput = calculateEfficiency(totalTokens, durationMs);
  const spendRate = calculateSpendRate(cost, durationMs);

  console.log();
  console.log(chalk.bold('📊 Efficiency'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`${chalk.gray('Throughput:')}    ${throughput.toLocaleString()} tokens/sec`);
  console.log(`${chalk.gray('Spend Rate:')}    $${spendRate.toFixed(2)}/hour (at this pace)`);
}

/**
 * Print the main observability dashboard.
 */
function printDashboard(
  metrics: AggregatedMetrics,
  cycles: readonly CycleMetrics[],
  projectName: string,
  filter: FilterState | null
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

  // Header with filter indicator
  const filterSuffix = filter ? ` (last ${filter.last} cycles)` : '';
  console.log(chalk.bold.blue(`📊 Agent Observability — ${projectName}${filterSuffix}`));
  console.log(chalk.gray('═'.repeat(50)));
  console.log();

  // Cycles line with filter info
  if (filter) {
    console.log(`${chalk.gray('Cycles:')}    ${metrics.totalCycles} of ${filter.unfilteredTotal} tracked`);
  } else {
    console.log(`${chalk.gray('Cycles:')}    ${metrics.totalCycles} tracked (last 100 retained)`);
  }
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

  // Latency Section (Phase 2) — only show if ≥10 cycles have timing data
  const cyclesWithLatency = cycles.filter(hasLatencyData);
  if (cyclesWithLatency.length >= 10) {
    // Calculate slowest/fastest roles
    const roleLatencies: Record<string, { totalMs: number; count: number }> = {};
    for (const cycle of cyclesWithLatency) {
      const existing = roleLatencies[cycle.role] ?? { totalMs: 0, count: 0 };
      existing.totalMs += cycle.durationMs;
      existing.count++;
      roleLatencies[cycle.role] = existing;
    }

    const roleAvgs = Object.entries(roleLatencies)
      .filter(([, stats]) => stats.count >= 3) // Need ≥3 cycles for significance
      .map(([role, stats]) => ({ role, avgMs: stats.totalMs / stats.count }));

    // Find slowest/fastest roles (only if we have data)
    let slowestRole: { role: string; avgMs: number } | undefined;
    let fastestRole: { role: string; avgMs: number } | undefined;
    if (roleAvgs.length > 0) {
      slowestRole = roleAvgs.reduce((max, r) => r.avgMs > max.avgMs ? r : max, roleAvgs[0]!);
      fastestRole = roleAvgs.reduce((min, r) => r.avgMs < min.avgMs ? r : min, roleAvgs[0]!);
    }

    // Overall throughput
    const totalTokens = cyclesWithLatency.reduce((sum, c) => sum + c.totals.totalTokens, 0);
    const totalDuration = cyclesWithLatency.reduce((sum, c) => sum + c.durationMs, 0);
    const avgThroughput = calculateEfficiency(totalTokens, totalDuration);
    
    // Calculate avg duration from cycles (fallback if not in aggregated metrics)
    const avgDurationMs = totalDuration / cyclesWithLatency.length;

    console.log(chalk.bold('⏱️  LATENCY'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  ${chalk.gray('Avg cycle:')}      ${formatDuration(avgDurationMs)}`);
    if (slowestRole) {
      const slowEmoji = getRoleEmoji(slowestRole.role, null);
      console.log(`  ${chalk.gray('Slowest role:')}   ${slowEmoji} ${slowestRole.role.charAt(0).toUpperCase() + slowestRole.role.slice(1)} (${formatDuration(slowestRole.avgMs)} avg)`);
    }
    if (fastestRole) {
      const fastEmoji = getRoleEmoji(fastestRole.role, null);
      console.log(`  ${chalk.gray('Fastest role:')}   ${fastEmoji} ${fastestRole.role.charAt(0).toUpperCase() + fastestRole.role.slice(1)} (${formatDuration(fastestRole.avgMs)} avg)`);
    }
    console.log(`  ${chalk.gray('Throughput:')}     ${avgThroughput.toLocaleString()} tokens/sec`);
    console.log();
  }

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
 * Print per-role breakdown with Phase 2 latency column.
 */
function printByRole(
  metrics: AggregatedMetrics,
  cycles: readonly CycleMetrics[],
  roster: Roster | null,
  filter: FilterState | null
): void {
  // Header with filter indicator
  const filterSuffix = filter ? ` (last ${filter.last} cycles)` : '';
  console.log(chalk.bold.blue(`📊 Cost by Role — ${metrics.totalCycles} cycles${filterSuffix}`));
  console.log(chalk.gray('═'.repeat(72)));
  console.log();

  // Calculate per-role latency averages from cycles with latency data
  const roleLatencies: Record<string, { totalMs: number; count: number }> = {};
  const cyclesWithLatency = cycles.filter(hasLatencyData);
  
  for (const cycle of cyclesWithLatency) {
    const existing = roleLatencies[cycle.role] ?? { totalMs: 0, count: 0 };
    existing.totalMs += cycle.durationMs;
    existing.count++;
    roleLatencies[cycle.role] = existing;
  }

  const hasAnyLatency = cyclesWithLatency.length > 0;

  // Header with optional Avg Time column
  if (hasAnyLatency) {
    console.log(
      `${chalk.gray('Role'.padEnd(16))} │ ${chalk.gray('Cycles'.padStart(6))} │ ${chalk.gray('Tokens'.padStart(8))} │ ${chalk.gray('Cost'.padStart(8))} │ ${chalk.gray('Avg/Cycle'.padStart(9))} │ ${chalk.gray('Avg Time'.padStart(8))}`
    );
    console.log(chalk.gray('─'.repeat(72)));
  } else {
    console.log(
      `${chalk.gray('Role'.padEnd(16))} │ ${chalk.gray('Cycles'.padStart(6))} │ ${chalk.gray('Tokens'.padStart(8))} │ ${chalk.gray('Cost'.padStart(8))} │ ${chalk.gray('Avg/Cycle'.padStart(9))}`
    );
    console.log(chalk.gray('─'.repeat(60)));
  }

  // Sort roles by cost (descending)
  const sortedRoles = Object.entries(metrics.byRole).sort(
    ([, a], [, b]) => b.cost.totalCost - a.cost.totalCost
  );

  // Calculate overall avg duration for insight comparison
  const overallAvgDuration = cyclesWithLatency.length > 0
    ? cyclesWithLatency.reduce((sum, c) => sum + c.durationMs, 0) / cyclesWithLatency.length
    : 0;

  let slowRoleInsight: { role: string; emoji: string; avgMs: number; percentSlower: number } | null = null;

  for (const [roleId, stats] of sortedRoles) {
    const emoji = getRoleEmoji(roleId, roster);
    const avgCost = stats.cycles > 0 ? stats.cost.totalCost / stats.cycles : 0;

    // Get latency data for this role
    const roleLatency = roleLatencies[roleId];
    const avgTime = roleLatency && roleLatency.count > 0
      ? formatDuration(roleLatency.totalMs / roleLatency.count)
      : '--';

    // Check for slow role insight (30% slower than average, ≥3 cycles)
    if (roleLatency && roleLatency.count >= 3 && overallAvgDuration > 0) {
      const roleAvgMs = roleLatency.totalMs / roleLatency.count;
      const percentSlower = Math.round(((roleAvgMs / overallAvgDuration) - 1) * 100);
      if (percentSlower >= 30 && (!slowRoleInsight || roleAvgMs > slowRoleInsight.avgMs)) {
        slowRoleInsight = { role: roleId, emoji, avgMs: roleAvgMs, percentSlower };
      }
    }

    if (hasAnyLatency) {
      console.log(
        `${emoji}  ${roleId.padEnd(13)} │ ${String(stats.cycles).padStart(6)} │ ${formatTokens(stats.tokens.totalTokens).padStart(8)} │ ${formatCost(stats.cost.totalCost).padStart(8)} │ ${formatCost(avgCost).padStart(9)} │ ${avgTime.padStart(8)}`
      );
    } else {
      console.log(
        `${emoji}  ${roleId.padEnd(13)} │ ${String(stats.cycles).padStart(6)} │ ${formatTokens(stats.tokens.totalTokens).padStart(8)} │ ${formatCost(stats.cost.totalCost).padStart(8)} │ ${formatCost(avgCost).padStart(9)}`
      );
    }
  }

  // Total row
  const totalAvgTime = cyclesWithLatency.length > 0
    ? formatDuration(cyclesWithLatency.reduce((sum, c) => sum + c.durationMs, 0) / cyclesWithLatency.length)
    : '--';

  if (hasAnyLatency) {
    console.log(chalk.gray('─'.repeat(72)));
    console.log(
      `${'TOTAL'.padEnd(16)} │ ${String(metrics.totalCycles).padStart(6)} │ ${formatTokens(metrics.totalTokens.totalTokens).padStart(8)} │ ${formatCost(metrics.totalCost.totalCost).padStart(8)} │ ${formatCost(metrics.avgCostPerCycle.totalCost).padStart(9)} │ ${totalAvgTime.padStart(8)}`
    );
  } else {
    console.log(chalk.gray('─'.repeat(60)));
    console.log(
      `${'TOTAL'.padEnd(16)} │ ${String(metrics.totalCycles).padStart(6)} │ ${formatTokens(metrics.totalTokens.totalTokens).padStart(8)} │ ${formatCost(metrics.totalCost.totalCost).padStart(8)} │ ${formatCost(metrics.avgCostPerCycle.totalCost).padStart(9)}`
    );
  }
  console.log();

  // Add token usage insight if one role is significantly more expensive
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

  // Add latency insight if a role is significantly slower
  if (slowRoleInsight) {
    console.log(chalk.yellow(`💡 Insight: ${slowRoleInsight.emoji} ${slowRoleInsight.role} cycles are ${slowRoleInsight.percentSlower}% slower than average (${formatDuration(slowRoleInsight.avgMs)} vs ${formatDuration(overallAvgDuration)}).`));
    console.log(chalk.gray('   Execution phase dominates — review action complexity.'));
  }

  // Footer with filter info
  if (filter && filter.unfilteredTotal > metrics.totalCycles) {
    console.log();
    console.log(chalk.gray(`Showing: last ${metrics.totalCycles} cycles (of ${filter.unfilteredTotal} total)`));
  }

  // Footer note for partial latency data
  if (hasAnyLatency && cyclesWithLatency.length < cycles.length) {
    console.log();
    console.log(chalk.gray(`* Avg Time based on ${cyclesWithLatency.length}/${cycles.length} cycles (timing unavailable for older cycles)`));
  }
}

/**
 * Print specific cycle details with Phase 2 latency sections.
 */
function printCycleDetails(
  cycle: CycleMetrics, 
  roster: Roster | null, 
  firstTrackedCycle: number,
  filter: FilterState | null
): void {
  const emoji = getRoleEmoji(cycle.role, roster);
  const statusEmoji = cycle.success ? '✅' : '❌';
  const statusText = cycle.success ? 'Success' : 'Failed';
  const statusColor = cycle.success ? chalk.green : chalk.red;

  console.log(chalk.bold.blue(`📊 Cycle ${cycle.cycle} — ${emoji} ${cycle.role}`));
  console.log(chalk.gray('═'.repeat(50)));

  // Warning if cycle is outside filter window
  if (filter) {
    const [rangeStart, rangeEnd] = filter.cycleRange;
    if (cycle.cycle < rangeStart || cycle.cycle > rangeEnd) {
      console.log();
      console.log(chalk.yellow(`⚠️  Note: Cycle ${cycle.cycle} is outside the --last ${filter.last} window (cycles ${rangeStart}-${rangeEnd})`));
      console.log(chalk.yellow('   Showing cycle anyway.'));
    }
  }

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

  for (const phase of PHASE_ORDER) {
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

  // Phase Timing Section (Phase 2)
  if (hasLatencyData(cycle)) {
    printPhaseTimingSection(cycle);
  }

  console.log();
  console.log(`${chalk.gray('Cost:')} ${formatCost(cycle.cost.totalCost)} (input: ${formatCost(cycle.cost.inputCost)}, output: ${formatCost(cycle.cost.outputCost)})`);

  // Efficiency Section (Phase 2)
  if (hasLatencyData(cycle)) {
    printEfficiencySection(cycle);
  }

  if (cycle.error) {
    console.log();
    console.log(chalk.red.bold('Error:'));
    console.log(chalk.red(`  ${cycle.error}`));
  }

  // Note for cycles without latency data (graceful degradation)
  if (!hasLatencyData(cycle)) {
    console.log();
    console.log(chalk.gray(`ℹ️  Phase timing not available for cycles before ${firstTrackedCycle + 10}.`));
    console.log(chalk.gray(`    Timing data is collected for cycles ${firstTrackedCycle + 10}+.`));
  }
}

/**
 * Print JSON output with Phase 2 latency fields and --last filter info.
 */
function printJson(
  metrics: AggregatedMetrics | null,
  cycles: readonly CycleMetrics[],
  cycleDetail: CycleMetrics | null,
  filter: FilterState | null
): void {
  const output: Record<string, unknown> = {};

  // Add filter info if present
  if (filter) {
    output.filter = {
      last: filter.last,
      cycleRange: filter.cycleRange,
    };
  }

  if (cycleDetail) {
    // Enhanced cycle detail with efficiency metrics
    const efficiency = cycleDetail.durationMs > 0 ? {
      tokensPerSecond: calculateEfficiency(cycleDetail.totals.totalTokens, cycleDetail.durationMs),
      spendRatePerHour: calculateSpendRate(cycleDetail.cost.totalCost, cycleDetail.durationMs),
    } : null;

    output.cycle = {
      ...cycleDetail,
      ...(efficiency && { efficiency }),
    };
  } else if (metrics) {
    // Enhanced aggregated metrics with efficiency
    const cyclesWithLatency = cycles.filter(hasLatencyData);
    const totalTokens = cyclesWithLatency.reduce((sum, c) => sum + c.totals.totalTokens, 0);
    const totalDuration = cyclesWithLatency.reduce((sum, c) => sum + c.durationMs, 0);
    const totalCost = cyclesWithLatency.reduce((sum, c) => sum + c.cost.totalCost, 0);

    const efficiency = cyclesWithLatency.length > 0 ? {
      avgTokensPerSecond: calculateEfficiency(totalTokens, totalDuration),
      avgSpendRatePerHour: calculateSpendRate(totalCost, totalDuration),
    } : null;

    // Calculate by-role latency
    const roleLatencies: Record<string, { avgDurationMs: number; cycles: number }> = {};
    for (const cycle of cyclesWithLatency) {
      const existing = roleLatencies[cycle.role] ?? { avgDurationMs: 0, cycles: 0 };
      existing.avgDurationMs += cycle.durationMs;
      existing.cycles++;
      roleLatencies[cycle.role] = existing;
    }
    for (const role of Object.keys(roleLatencies)) {
      const roleData = roleLatencies[role];
      if (roleData) {
        roleData.avgDurationMs = Math.round(roleData.avgDurationMs / roleData.cycles);
      }
    }

    // Build summary with filter info
    const summary: Record<string, unknown> = {
      totalCycles: metrics.totalCycles,
    };
    if (filter) {
      summary.unfilteredTotal = filter.unfilteredTotal;
    }

    output.summary = summary;
    output.aggregated = {
      ...metrics,
      ...(efficiency && { efficiency }),
      byRoleLatency: Object.keys(roleLatencies).length > 0 ? roleLatencies : undefined,
    };
    output.recentCycles = cycles.slice(-10);
  }

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Convert cycles array to export rows.
 */
function cyclesToExportRows(cycles: readonly CycleMetrics[]): CycleExportRow[] {
  return cycles.map((cycle) => ({
    cycle: cycle.cycle,
    role: cycle.role,
    timestamp: cycle.startedAt,
    tokens_input: cycle.totals.inputTokens,
    tokens_output: cycle.totals.outputTokens,
    tokens_total: cycle.totals.totalTokens,
    cost: cycle.cost.totalCost,
    duration_ms: cycle.durationMs,
    status: cycle.success ? 'success' : 'failure',
    model: cycle.model,
    error: cycle.error,
  }));
}

/**
 * Convert by-role metrics to export rows.
 */
function byRoleToExportRows(
  metrics: AggregatedMetrics,
  cycles: readonly CycleMetrics[]
): RoleExportRow[] {
  // Calculate per-role latency averages
  const roleLatencies: Record<string, { totalMs: number; count: number }> = {};
  for (const cycle of cycles.filter(hasLatencyData)) {
    const existing = roleLatencies[cycle.role] ?? { totalMs: 0, count: 0 };
    existing.totalMs += cycle.durationMs;
    existing.count++;
    roleLatencies[cycle.role] = existing;
  }

  return Object.entries(metrics.byRole)
    .sort(([, a], [, b]) => b.cost.totalCost - a.cost.totalCost)
    .map(([roleId, stats]) => {
      const roleLatency = roleLatencies[roleId];
      return {
        role: roleId,
        cycles: stats.cycles,
        tokens_input: stats.tokens.inputTokens,
        tokens_output: stats.tokens.outputTokens,
        tokens_total: stats.tokens.totalTokens,
        cost: stats.cost.totalCost,
        avg_cost: stats.cycles > 0 ? stats.cost.totalCost / stats.cycles : 0,
        avg_duration_ms: roleLatency && roleLatency.count > 0
          ? Math.round(roleLatency.totalMs / roleLatency.count)
          : undefined,
      };
    });
}

/**
 * Export data to file based on format.
 *
 * @param filePath - Destination file path
 * @param format - Export format (csv, json, tsv)
 * @param data - Data to export (varies by mode)
 * @param mode - Export mode (dashboard, byRole, cycle)
 */
function exportToFile(
  filePath: string,
  format: ExportFormat,
  data: {
    cycles?: readonly CycleMetrics[];
    metrics?: AggregatedMetrics | null;
    cycleDetail?: CycleMetrics | null;
    byRole?: boolean | undefined;
  }
): void {
  let content: string;

  if (format === 'json') {
    // JSON export uses same structure as --json output
    const output: Record<string, unknown> = {};

    if (data.cycleDetail) {
      const efficiency = data.cycleDetail.durationMs > 0 ? {
        tokensPerSecond: calculateEfficiency(data.cycleDetail.totals.totalTokens, data.cycleDetail.durationMs),
        spendRatePerHour: calculateSpendRate(data.cycleDetail.cost.totalCost, data.cycleDetail.durationMs),
      } : null;

      output.cycle = {
        ...data.cycleDetail,
        ...(efficiency && { efficiency }),
      };
    } else if (data.metrics && data.cycles) {
      const cyclesWithLatency = data.cycles.filter(hasLatencyData);
      const totalTokens = cyclesWithLatency.reduce((sum, c) => sum + c.totals.totalTokens, 0);
      const totalDuration = cyclesWithLatency.reduce((sum, c) => sum + c.durationMs, 0);
      const totalCost = cyclesWithLatency.reduce((sum, c) => sum + c.cost.totalCost, 0);

      const efficiency = cyclesWithLatency.length > 0 ? {
        avgTokensPerSecond: calculateEfficiency(totalTokens, totalDuration),
        avgSpendRatePerHour: calculateSpendRate(totalCost, totalDuration),
      } : null;

      output.aggregated = {
        ...data.metrics,
        ...(efficiency && { efficiency }),
      };
      output.cycles = data.cycles;
    }

    content = `${JSON.stringify(output, null, 2)  }\n`;
  } else {
    // CSV/TSV export
    const converter = format === 'tsv' ? toTSV : toCSV;

    if (data.cycleDetail) {
      // Single cycle export
      const rows = cyclesToExportRows([data.cycleDetail]);
      content = converter(rows, CYCLE_HEADERS);
    } else if (data.byRole && data.metrics && data.cycles) {
      // By-role export
      const rows = byRoleToExportRows(data.metrics, data.cycles);
      content = converter(rows, ROLE_HEADERS);
    } else if (data.cycles) {
      // Dashboard export (all cycles)
      const rows = cyclesToExportRows(data.cycles);
      content = converter(rows, CYCLE_HEADERS);
    } else {
      content = '';
    }
  }

  writeFile(filePath, content);
}

export const observeCommand = new Command('observe')
  .description('Show agent observability metrics (cost, tokens, health, latency)')
  .option('-d, --dir <path>', 'Agents directory (default: "agents/")', 'agents')
  .option('--by-role', 'Show per-role cost and token breakdown')
  .option('--cycle <n>', 'Show detailed metrics for a specific cycle')
  .option('-l, --last <n>', 'Filter to last N cycles only')
  .option('--json', 'Output as JSON for scripting')
  .option('-e, --export <file>', 'Export metrics to file (auto-detects format from extension: .csv, .json, .tsv)')
  .option('-f, --force', 'Overwrite existing file without confirmation')
  .action(async (options: ObserveOptions) => {
    const cwd = process.cwd();
    const agentsDir = path.resolve(cwd, options.dir);
    const rosterPath = path.join(agentsDir, 'roster.json');

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
      // Validate --last option
      let lastN: number | undefined;
      if (options.last !== undefined) {
        lastN = parseInt(options.last, 10);
        if (isNaN(lastN) || lastN < 1) {
          if (options.json) {
            console.log(JSON.stringify({ error: 'Invalid value for --last: must be at least 1' }));
          } else {
            console.error(chalk.red('❌ Invalid value for --last: must be at least 1'));
          }
          process.exit(1);
        }
      }

      // Load roster for role emoji lookup
      let roster: Roster | null = null;
      try {
        roster = await readRoster(rosterPath);
      } catch {
        // Roster not available, continue without emoji
      }

      // Create metrics manager and load data
      const metricsManager = createMetricsManager(cwd, options.dir);
      const allCycles = await metricsManager.getRecent(100);
      const unfilteredTotal = allCycles.length;

      // Handle empty state
      if (allCycles.length === 0) {
        if (options.export || options.json) {
          if (options.export && exportFormat) {
            // Export empty file with headers
            exportToFile(options.export, exportFormat, { cycles: [], metrics: null, byRole: options.byRole });
            console.log(chalk.green(`✅ Exported empty dataset to ${options.export}`));
          } else {
            console.log(JSON.stringify({ error: 'No observability data collected yet.' }));
          }
        } else {
          console.log(chalk.yellow('📊 No observability data collected yet.'));
          console.log();
          console.log(chalk.gray('Run `ada run` to execute dispatch cycles and collect metrics.'));
          console.log(chalk.gray('Metrics are stored in agents/state/metrics.json'));
        }
        return;
      }

      // Apply --last N filter
      let cycles: readonly CycleMetrics[];
      let filter: FilterState | null = null;
      
      if (lastN !== undefined) {
        // Filter to last N cycles
        cycles = allCycles.slice(-lastN);
        
        // Build filter state
        if (cycles.length > 0) {
          filter = {
            last: lastN,
            cycleRange: [cycles[0]!.cycle, cycles[cycles.length - 1]!.cycle],
            unfilteredTotal,
          };
        }
      } else {
        cycles = allCycles;
      }

      // Aggregate metrics (re-compute for filtered cycles)
      const aggregated = filter 
        ? aggregateFilteredCycles(cycles)
        : await metricsManager.aggregate();

      if (!aggregated) {
        if (options.export || options.json) {
          if (options.export && exportFormat) {
            exportToFile(options.export, exportFormat, { cycles: [], metrics: null, byRole: options.byRole });
            console.log(chalk.green(`✅ Exported empty dataset to ${options.export}`));
          } else {
            console.log(JSON.stringify({ error: 'No observability data collected yet.' }));
          }
        } else {
          console.log(chalk.yellow('📊 No observability data collected yet.'));
        }
        return;
      }

      // Specific cycle view
      if (options.cycle) {
        const cycleNumber = parseInt(options.cycle, 10);
        const cycle = await metricsManager.getCycle(cycleNumber);

        if (!cycle) {
          if (options.export || options.json) {
            console.error(JSON.stringify({ error: `Cycle ${cycleNumber} not found in tracked metrics.` }));
          } else {
            console.error(chalk.red(`❌ Cycle ${cycleNumber} not found in tracked metrics.`));
            console.log(chalk.gray(`   Tracked range: cycles ${aggregated.firstCycle} to ${aggregated.lastCycle}`));
          }
          process.exit(1);
        }

        if (options.export && exportFormat) {
          exportToFile(options.export, exportFormat, { cycleDetail: cycle });
          console.log(chalk.green(`✅ Exported cycle ${cycleNumber} to ${options.export}`));
          return;
        }

        if (options.json) {
          printJson(null, cycles, cycle, filter);
        } else {
          printCycleDetails(cycle, roster, aggregated.firstCycle, filter);
        }
        return;
      }

      // Export mode
      if (options.export && exportFormat) {
        exportToFile(options.export, exportFormat, {
          cycles,
          metrics: aggregated,
          byRole: options.byRole,
        });
        const recordCount = options.byRole ? Object.keys(aggregated.byRole).length : cycles.length;
        console.log(chalk.green(`✅ Exported ${recordCount} records to ${options.export}`));
        return;
      }

      // JSON output
      if (options.json) {
        printJson(aggregated, cycles, null, filter);
        return;
      }

      // By-role view
      if (options.byRole) {
        printByRole(aggregated, cycles, roster, filter);
        return;
      }

      // Default dashboard view
      const projectName = roster?.product ?? 'ADA Project';
      printDashboard(aggregated, cycles, projectName, filter);
    } catch (err) {
      if (options.export || options.json) {
        console.error(JSON.stringify({ error: (err as Error).message }));
      } else {
        console.error(chalk.red('❌ Could not load observability data:'), (err as Error).message);
        console.error(chalk.gray('   Ensure the agents directory exists and contains state/metrics.json'));
      }
      process.exit(1);
    }
  });
