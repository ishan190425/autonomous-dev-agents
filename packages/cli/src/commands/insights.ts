/**
 * `ada insights` — Cross-Role Insights Detection
 *
 * Analyzes rotation history to detect patterns that emerge across
 * multiple roles. Surfaces candidates for RULES.md or shared best practices.
 *
 * Part of Reflexion Phase 1c (Issue #108).
 *
 * @see packages/core/src/cross-role-insights.ts for detection algorithm
 * @see docs/research/reflexion-phase1c-cross-role-insights-spec.md
 *
 * ⚙️ Engineering — Cycle 273
 */

import { Command } from 'commander';
import * as path from 'node:path';
import chalk from 'chalk';
import {
  readRotationState,
  detectCrossRoleInsights,
  formatInsightsForRetro,
  generateInsightIssueBody,
  DEFAULT_DETECTION_OPTIONS,
} from '@ada-ai/core';
import type { DetectionOptions } from '@ada-ai/core';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InsightsListOptions {
  dir: string;
  cycles?: number;
  minRoles?: number;
  minConfidence?: number;
  json?: boolean;
  verbose?: boolean;
}

interface InsightsShowOptions {
  dir: string;
  json?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CONFIDENCE_COLORS = {
  high: chalk.green,
  medium: chalk.yellow,
  low: chalk.red,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getConfidenceLevel(
  confidence: number
): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

function formatConfidence(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  const color = CONFIDENCE_COLORS[level];
  const percent = Math.round(confidence * 100);
  const bar = '█'.repeat(Math.round(confidence * 10)) +
    '░'.repeat(10 - Math.round(confidence * 10));
  return color(`${bar} ${percent}%`);
}

function formatInsightType(type: string): string {
  switch (type) {
    case 'convergent':
      return chalk.cyan('🔀 Convergent');
    case 'complementary':
      return chalk.magenta('🧩 Complementary');
    case 'cascading':
      return chalk.yellow('⚡ Cascading');
    default:
      return type;
  }
}

function formatAction(action: string): string {
  switch (action) {
    case 'rules':
      return chalk.green('📜 Add to RULES.md');
    case 'best_practice':
      return chalk.blue('💡 Best Practice');
    case 'discussion':
      return chalk.yellow('💬 Discussion');
    default:
      return action;
  }
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function listInsights(opts: InsightsListOptions): Promise<void> {
  const stateFile = path.join(opts.dir, 'agents/state/rotation.json');

  // Load state
  const state = await readRotationState(stateFile);

  if (!state.history || state.history.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ insights: [], count: 0 }));
    } else {
      console.log(chalk.yellow('\n⚠️  No rotation history found.'));
      console.log(
        chalk.dim('   Run some dispatch cycles first to generate reflections.')
      );
    }
    return;
  }

  // Build detection options
  const detectionOptions: DetectionOptions = {
    lookbackCycles: opts.cycles ?? DEFAULT_DETECTION_OPTIONS.lookbackCycles,
    minRoles: opts.minRoles ?? DEFAULT_DETECTION_OPTIONS.minRoles,
    minConfidence:
      opts.minConfidence ?? DEFAULT_DETECTION_OPTIONS.minConfidence,
  };

  // Detect insights
  const insights = detectCrossRoleInsights(state.history, detectionOptions);

  if (opts.json) {
    console.log(
      JSON.stringify({ insights, count: insights.length }, null, 2)
    );
    return;
  }

  // Display header
  console.log();
  console.log(
    chalk.bold('🔍 Cross-Role Insights Detection')
  );
  console.log(chalk.dim('─'.repeat(50)));
  const lookback = detectionOptions.lookbackCycles ?? DEFAULT_DETECTION_OPTIONS.lookbackCycles;
  const minRoles = detectionOptions.minRoles ?? DEFAULT_DETECTION_OPTIONS.minRoles;
  const minConf = detectionOptions.minConfidence ?? DEFAULT_DETECTION_OPTIONS.minConfidence;
  console.log(
    chalk.dim(
      `   Analyzed ${Math.min(state.history.length, lookback)} cycles | ` +
        `Min roles: ${minRoles} | ` +
        `Min confidence: ${Math.round(minConf * 100)}%`
    )
  );
  console.log();

  if (insights.length === 0) {
    console.log(chalk.yellow('   No cross-role patterns detected.'));
    console.log(
      chalk.dim(
        '   Try adjusting --cycles or --min-confidence to cast a wider net.'
      )
    );
    console.log();
    return;
  }

  // Display each insight
  for (const insight of insights) {
    console.log(
      chalk.bold(`   ${formatInsightType(insight.type)}`)
    );
    console.log(`   ${chalk.white(insight.insight)}`);
    console.log();
    console.log(
      `   ${chalk.dim('Roles:')} ${insight.roles.map((r) => chalk.cyan(r)).join(', ')}`
    );
    console.log(
      `   ${chalk.dim('Cycles:')} ${insight.cycles.join(', ')}`
    );
    console.log(
      `   ${chalk.dim('Confidence:')} ${formatConfidence(insight.confidence)}`
    );
    console.log(`   ${chalk.dim('Action:')} ${formatAction(insight.proposedAction)}`);

    if (opts.verbose) {
      console.log();
      console.log(chalk.dim('   Proposed text:'));
      console.log(
        chalk.italic(
          `   "${insight.proposedText.substring(0, 100)}${insight.proposedText.length > 100 ? '...' : ''}"`
        )
      );
      console.log();
      console.log(chalk.dim('   Source reflections:'));
      for (const source of insight.sourceReflections.slice(0, 3)) {
        console.log(
          chalk.dim(
            `     - ${source.role} (C${source.cycle}): "${source.text.substring(0, 60)}..."`
          )
        );
      }
      if (insight.sourceReflections.length > 3) {
        console.log(
          chalk.dim(
            `     ... and ${insight.sourceReflections.length - 3} more`
          )
        );
      }
    }

    console.log(chalk.dim('─'.repeat(50)));
  }

  // Summary
  console.log();
  console.log(
    chalk.bold(`   📊 Found ${insights.length} cross-role pattern(s)`)
  );

  const rulesCount = insights.filter(
    (i) => i.proposedAction === 'rules'
  ).length;
  const practiceCount = insights.filter(
    (i) => i.proposedAction === 'best_practice'
  ).length;

  if (rulesCount > 0) {
    console.log(
      chalk.green(`      ${rulesCount} candidate(s) for RULES.md`)
    );
  }
  if (practiceCount > 0) {
    console.log(
      chalk.blue(`      ${practiceCount} best practice(s) to consider`)
    );
  }
  console.log();
}

async function showInsightsForRetro(opts: InsightsShowOptions): Promise<void> {
  const stateFile = path.join(opts.dir, 'agents/state/rotation.json');

  const state = await readRotationState(stateFile);

  if (!state.history || state.history.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ markdown: '', insights: [] }));
    } else {
      console.log(chalk.yellow('\n⚠️  No rotation history found.'));
    }
    return;
  }

  // Detect insights with default options
  const insights = detectCrossRoleInsights(state.history);

  if (opts.json) {
    const markdown = formatInsightsForRetro(insights);
    console.log(JSON.stringify({ markdown, insights }, null, 2));
    return;
  }

  // Format for retro document
  const retroMarkdown = formatInsightsForRetro(insights);

  console.log();
  console.log(
    chalk.bold('📋 Cross-Role Insights for Retrospective')
  );
  console.log(chalk.dim('─'.repeat(50)));
  console.log();
  console.log(retroMarkdown);
  console.log();
  console.log(
    chalk.dim(
      'Copy this section into your retro document or use --json for structured output.'
    )
  );
  console.log();
}

async function generateIssue(
  insightId: string,
  opts: { dir: string; json?: boolean }
): Promise<void> {
  const stateFile = path.join(opts.dir, 'agents/state/rotation.json');

  const state = await readRotationState(stateFile);

  if (!state.history || state.history.length === 0) {
    console.error(chalk.red('No rotation history found.'));
    process.exit(1);
  }

  const insights = detectCrossRoleInsights(state.history);
  const insight = insights.find((i) => i.id === insightId);

  if (!insight) {
    console.error(
      chalk.red(`Insight with ID "${insightId}" not found.`)
    );
    console.log(
      chalk.dim(`Available IDs: ${insights.map((i) => i.id).join(', ')}`)
    );
    process.exit(1);
  }

  const issueBody = generateInsightIssueBody(insight);

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          title: `chore(agents): ${insight.proposedAction === 'rules' ? 'new rule' : 'best practice'} — ${insight.insight.substring(0, 50)}`,
          body: issueBody,
          labels: ['enhancement', 'agents'],
        },
        null,
        2
      )
    );
    return;
  }

  console.log();
  console.log(chalk.bold('📝 Generated Issue'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log();
  console.log(
    chalk.bold('Title:'),
    `chore(agents): ${insight.proposedAction === 'rules' ? 'new rule' : 'best practice'} — ${insight.insight.substring(0, 50)}`
  );
  console.log();
  console.log(chalk.bold('Body:'));
  console.log(issueBody);
  console.log();
  console.log(
    chalk.dim(
      'Use --json to pipe to `gh issue create` or copy above to create manually.'
    )
  );
  console.log();
}

// ─── Command Definition ──────────────────────────────────────────────────────

export const insightsCommand = new Command('insights')
  .description(
    '🔍 Detect cross-role patterns from rotation history (Reflexion Phase 1c)'
  )
  .addCommand(
    new Command('list')
      .description('Detect and list cross-role insights')
      .option(
        '-d, --dir <path>',
        'Path to repo root',
        process.cwd()
      )
      .option(
        '-c, --cycles <n>',
        'Number of recent cycles to analyze',
        (v) => parseInt(v, 10)
      )
      .option(
        '--min-roles <n>',
        'Minimum roles for convergent insight',
        (v) => parseInt(v, 10)
      )
      .option(
        '--min-confidence <n>',
        'Minimum confidence (0-1)',
        (v) => parseFloat(v)
      )
      .option('-j, --json', 'Output as JSON')
      .option('-v, --verbose', 'Show detailed source reflections')
      .action(async function(this: Command, opts: InsightsListOptions) {
        // Merge global options (--json, --verbose from parent)
        const globalOpts = this.optsWithGlobals();
        const mergedOpts: InsightsListOptions = {
          ...opts,
          json: opts.json || globalOpts.json,
          verbose: opts.verbose || globalOpts.verbose,
        };
        await listInsights(mergedOpts);
      })
  )
  .addCommand(
    new Command('retro')
      .description('Format insights for retrospective documents')
      .option(
        '-d, --dir <path>',
        'Path to repo root',
        process.cwd()
      )
      .option('-j, --json', 'Output as JSON with markdown')
      .action(async function(this: Command, opts: InsightsShowOptions) {
        // Merge global options (--json from parent)
        const globalOpts = this.optsWithGlobals();
        const mergedOpts: InsightsShowOptions = {
          ...opts,
          json: opts.json || globalOpts.json,
        };
        await showInsightsForRetro(mergedOpts);
      })
  )
  .addCommand(
    new Command('issue')
      .description('Generate a GitHub issue for an insight')
      .argument('<id>', 'Insight ID (from list output)')
      .option(
        '-d, --dir <path>',
        'Path to repo root',
        process.cwd()
      )
      .option('-j, --json', 'Output as JSON for gh CLI')
      .action(async function(this: Command, id: string, opts: InsightsShowOptions) {
        // Merge global options (--json from parent)
        const globalOpts = this.optsWithGlobals();
        const mergedOpts: InsightsShowOptions = {
          ...opts,
          json: opts.json || globalOpts.json,
        };
        await generateIssue(id, mergedOpts);
      })
  );

// Default action: list insights
insightsCommand.action(async function(this: Command, opts: Record<string, unknown>) {
  // Merge global options (--json, --verbose from parent)
  const globalOpts = this.optsWithGlobals();
  await listInsights({
    dir: (opts.dir as string) ?? process.cwd(),
    json: (opts.json as boolean) || globalOpts.json,
    verbose: (opts.verbose as boolean) || globalOpts.verbose,
  });
});
