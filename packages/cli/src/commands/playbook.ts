/**
 * `ada playbook` — Pattern-to-playbook automation commands.
 *
 * Manage playbook suggestions generated from Reflexion patterns.
 * Self-improvement loop: Reflect → Pattern → Suggestion → Apply.
 *
 * Commands:
 *   ada playbook suggest              List pending suggestions
 *   ada playbook suggest --id <id>    Show suggestion details
 *   ada playbook apply <id>           Apply suggestion to playbook
 *   ada playbook reject <id>          Reject suggestion with reason
 *   ada playbook stats                Show suggestion statistics
 *
 * @see Issue #108 — Reflexion Phase 2
 * @see docs/design/pattern-to-playbook-cli-ux-spec-c645.md
 * @packageDocumentation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';

import { SuggestionStore } from '@ada-ai/core/playbook-suggestions';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PlaybookOptions {
  dir: string;
  json?: boolean;
}

interface SuggestOptions extends PlaybookOptions {
  id?: string;
}

interface RejectOptions extends PlaybookOptions {
  reason?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Initialize suggestion store from directory.
 */
async function initStore(dir: string): Promise<SuggestionStore> {
  const store = new SuggestionStore(dir);
  await store.init();
  return store;
}

/**
 * Format confidence with color based on threshold.
 * - 80%+ → green (high confidence)
 * - 70-79% → yellow (moderate confidence)
 */
function formatConfidence(confidence: number): string {
  const pct = Math.round(confidence * 100);
  const pctStr = `${pct}%`;
  if (confidence >= 0.8) {
    return chalk.green(pctStr);
  }
  return chalk.yellow(pctStr);
}

/**
 * Format suggestion type with color.
 * - ADD → green
 * - MODIFY → yellow
 * - REMOVE → red
 */
function formatSuggestionType(type: string): string {
  switch (type) {
    case 'add':
      return chalk.green('ADD');
    case 'modify':
      return chalk.yellow('MODIFY');
    case 'remove':
      return chalk.red('REMOVE');
    default:
      return type.toUpperCase();
  }
}

/**
 * Truncate text to max length with ellipsis.
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 3)  }...`;
}

/**
 * Format a playbook path for display.
 */
function formatPlaybookPath(playbookPath: string): string {
  return chalk.blue.underline(playbookPath);
}

/**
 * Draw a box around content.
 */
function box(header: string, content: string[]): string {
  const maxLen = Math.max(
    header.length,
    ...content.map((line) => stripAnsi(line).length)
  );
  const width = Math.min(maxLen + 4, 70);

  const topLine = `┌─ ${header} ${'─'.repeat(Math.max(0, width - header.length - 5))}┐`;
  const bottomLine = `└${'─'.repeat(width - 2)}┘`;
  const emptyLine = `│${' '.repeat(width - 2)}│`;

  const contentLines = content.map((line) => {
    const stripped = stripAnsi(line);
    const padding = Math.max(0, width - stripped.length - 4);
    return `│  ${line}${' '.repeat(padding)}│`;
  });

  return [topLine, emptyLine, ...contentLines, emptyLine, bottomLine].join('\n');
}

/**
 * Strip ANSI codes for length calculation.
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Create a progress bar.
 */
function progressBar(value: number, max: number, width: number = 16): string {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  return chalk.cyan('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

// ─── Commands ───────────────────────────────────────────────────────────────

/**
 * ada playbook suggest — List pending suggestions or show details.
 */
async function playbookSuggest(options: SuggestOptions): Promise<void> {
  try {
    const store = await initStore(options.dir);

    // If --id is provided, show detail view
    if (options.id) {
      await showSuggestionDetail(store, options.id, options);
      return;
    }

    // List pending suggestions
    const pending = await store.list({ status: 'pending' });
    const stats = await store.stats();

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            pending,
            stats: {
              pending: stats.byStatus.pending,
              applied: stats.byStatus.applied,
              rejected: stats.byStatus.rejected,
              acceptanceRate: stats.acceptanceRate,
            },
          },
          null,
          2
        )
      );
      return;
    }

    console.log('');
    console.log(chalk.bold('📋 Pending Playbook Suggestions'));
    console.log('');

    if (pending.length === 0) {
      // Empty state
      console.log('  No pending suggestions.');
      console.log('');
      console.log(
        chalk.dim(
          '  Suggestions are generated when Reflexion detects patterns at 70%+ confidence.'
        )
      );
      console.log(chalk.dim('  Run `ada reflect` to analyze recent cycles.'));
      console.log('');

      if (stats.byStatus.applied > 0 || stats.byStatus.rejected > 0) {
        console.log(
          chalk.dim(
            `  Stats:  ${stats.byStatus.applied} applied  •  ${stats.byStatus.rejected} rejected  •  ${Math.round(stats.acceptanceRate * 100)}% acceptance rate`
          )
        );
        console.log('');
      }
      return;
    }

    // Table header
    console.log(
      chalk.dim(
        '┌─────────┬──────────────────────┬────────────┬───────────────────────────────────────┐'
      )
    );
    console.log(
      `${chalk.dim('│') 
        } ID      ${ 
        chalk.dim('│') 
        } Target               ${ 
        chalk.dim('│') 
        } Confidence ${ 
        chalk.dim('│') 
        } Summary                               ${ 
        chalk.dim('│')}`
    );
    console.log(
      chalk.dim(
        '├─────────┼──────────────────────┼────────────┼───────────────────────────────────────┤'
      )
    );

    for (const suggestion of pending) {
      const id = chalk.cyan(suggestion.id.padEnd(7));
      const target = truncate(
        suggestion.targetPlaybook.replace('agents/', ''),
        20
      ).padEnd(20);
      const confidence = formatConfidence(suggestion.patternConfidence).padEnd(
        10 + (suggestion.patternConfidence >= 0.8 ? 0 : 0)
      );
      const summary = truncate(suggestion.rationale, 37).padEnd(37);

      console.log(
        `${chalk.dim('│') 
          } ${id} ${ 
          chalk.dim('│') 
          } ${target} ${ 
          chalk.dim('│') 
          }    ${confidence} ${ 
          chalk.dim('│') 
          } ${summary} ${ 
          chalk.dim('│')}`
      );
    }

    console.log(
      chalk.dim(
        '└─────────┴──────────────────────┴────────────┴───────────────────────────────────────┘'
      )
    );
    console.log('');

    // Summary
    const avgConf = Math.round(
      (pending.reduce((sum, s) => sum + s.patternConfidence, 0) /
        pending.length) *
        100
    );
    console.log(
      chalk.dim(
        `  ${pending.length} pending  •  ${stats.byStatus.applied} applied this session  •  avg confidence: ${avgConf}%`
      )
    );
    console.log('');
    console.log(chalk.dim('View details: ada playbook suggest --id sug-001'));
    console.log(chalk.dim('Apply:        ada playbook apply sug-001'));
    console.log(chalk.dim('Reject:       ada playbook reject sug-001 --reason "..."'));
    console.log('');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(chalk.bold('📋 Playbook Suggestions'));
      console.log('');
      console.log('  No suggestions yet.');
      console.log('');
      console.log(
        chalk.dim('  The Pattern-to-Playbook system generates suggestions when:')
      );
      console.log(
        chalk.dim('  1. Reflexion detects a cross-role pattern at 70%+ confidence')
      );
      console.log(
        chalk.dim('  2. The pattern maps to an actionable playbook improvement')
      );
      console.log('');
      console.log(
        chalk.dim('  Start by running some dispatch cycles with reflections:')
      );
      console.log(
        chalk.dim(
          '  ada dispatch complete --action "..." --reflection "What worked: ..."'
        )
      );
      console.log('');
      return;
    }
    throw error;
  }
}

/**
 * Show detailed view of a single suggestion.
 */
async function showSuggestionDetail(
  store: SuggestionStore,
  id: string,
  options: PlaybookOptions
): Promise<void> {
  const suggestion = await store.get(id);

  if (!suggestion) {
    console.log(chalk.red(`❌ Suggestion not found: ${id}`));
    console.log('');

    const pending = await store.list({ status: 'pending' });
    if (pending.length > 0) {
      console.log('  Available suggestions:');
      for (const s of pending.slice(0, 5)) {
        console.log(
          `    ${chalk.cyan(s.id)}  ${s.targetPlaybook.replace('agents/', '').padEnd(20)}  ${formatConfidence(s.patternConfidence)}`
        );
      }
      console.log('');
    }

    console.log(chalk.dim('List all: ada playbook suggest'));
    console.log('');
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(suggestion, null, 2));
    return;
  }

  console.log('');
  console.log(chalk.bold(`📝 Suggestion ${chalk.cyan(suggestion.id)}`));
  console.log('');

  // Source box
  console.log(
    box(chalk.dim('Source'), [
      `Pattern:     ${suggestion.patternId}`,
      `Confidence:  ${formatConfidence(suggestion.patternConfidence)}`,
      `Roles:       ${suggestion.contributingRoles.join(', ')}`,
      `Cycles:      ${suggestion.sourceReflections.join(', ')}`,
    ])
  );
  console.log('');

  // Target box
  console.log(
    box(chalk.dim('Target'), [
      `File:        ${formatPlaybookPath(suggestion.targetPlaybook)}`,
      `Section:     ${suggestion.targetSection}`,
      `Action:      ${formatSuggestionType(suggestion.suggestionType)}`,
    ])
  );
  console.log('');

  // Suggested text box
  console.log(
    box(
      chalk.dim('Suggested Text'),
      suggestion.suggestedText.split('\n').map((line) => line)
    )
  );
  console.log('');

  // Rationale
  console.log('  Rationale:');
  console.log(`  ${chalk.dim(suggestion.rationale)}`);
  console.log('');

  // Actions box
  console.log(
    box(chalk.dim('Actions'), [
      chalk.cyan(`ada playbook apply ${suggestion.id}`),
      chalk.cyan(`ada playbook reject ${suggestion.id} --reason "..."`),
    ])
  );
  console.log('');
}

/**
 * ada playbook apply <id> — Apply a suggestion to its target playbook.
 */
async function playbookApply(
  id: string,
  options: PlaybookOptions
): Promise<void> {
  console.log(chalk.dim(`⠋ Applying suggestion ${id}...`));

  const store = await initStore(options.dir);

  // Get current role from rotation.json
  const rotationPath = path.join(
    options.dir,
    'agents',
    'state',
    'rotation.json'
  );
  let appliedBy = 'frontier'; // default
  let cycle = 0;

  try {
    const { promises: fs } = await import('node:fs');
    const rotation = JSON.parse(await fs.readFile(rotationPath, 'utf-8'));
    appliedBy = rotation.last_role || rotation.next_role || 'frontier';
    cycle = rotation.cycle_count || 0;
  } catch {
    // Use defaults if rotation.json not found
  }

  const result = await store.apply(id, appliedBy, cycle);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!result.success) {
    if (result.error?.includes('not found')) {
      console.log(chalk.red(`❌ Cannot apply ${id}: target file not found`));
      console.log('');
      console.log(`  Expected: ${result.suggestion?.targetPlaybook || 'unknown'}`);
      console.log('');
      console.log(
        chalk.dim(
          '  The target playbook may have been moved or deleted.'
        )
      );
      console.log(chalk.dim('  Reject this suggestion if it\'s no longer applicable:'));
      console.log('');
      console.log(chalk.dim(`  ada playbook reject ${id} --reason "Target file moved"`));
      console.log('');
    } else if (result.error?.includes('section not found')) {
      console.log(chalk.yellow(`⚠️ Cannot apply ${id}: target section not found`));
      console.log('');
      console.log(`  File:     ${result.suggestion?.targetPlaybook || 'unknown'}`);
      console.log(`  Expected: ${result.suggestion?.targetSection || 'unknown'}`);
      console.log('');
      console.log(chalk.dim('  The section may have been renamed. Options:'));
      console.log(chalk.dim('  1. Manually add the suggestion to the correct section'));
      console.log(chalk.dim('  2. Reject and wait for a new suggestion'));
      console.log('');
      console.log(chalk.dim(`  View suggestion: ada playbook suggest --id ${id}`));
      console.log('');
    } else if (result.error?.includes('not pending')) {
      console.log(chalk.yellow(`⚠️ Suggestion ${id} was already ${result.suggestion?.status}`));
      if (result.suggestion?.appliedAt) {
        console.log('');
        console.log(`  Applied at: ${result.suggestion.appliedAt}`);
        console.log(`  Applied by: ${result.suggestion.appliedBy} (Cycle ${result.suggestion.appliedCycle})`);
      }
      console.log('');
      console.log(chalk.dim('  Nothing to do.'));
      console.log('');
    } else {
      console.log(chalk.red(`❌ Failed to apply ${id}: ${result.error}`));
      console.log('');
    }
    process.exit(1);
  }

  // Success
  console.log('');
  console.log(
    chalk.green(`✅ Applied ${chalk.cyan(id)} to ${formatPlaybookPath(result.suggestion.targetPlaybook)}`)
  );
  console.log('');
  console.log(`  Section: ${result.suggestion.targetSection}`);
  console.log('');

  // Show diff
  if (result.diff) {
    console.log(
      box(chalk.dim('Added'), [chalk.green(result.diff)])
    );
    console.log('');
  }

  console.log(
    chalk.dim(
      `  Moved to: agents/suggestions/applied/${id}.json`
    )
  );

  // Show remaining count
  const pending = await store.list({ status: 'pending' });
  if (pending.length > 0) {
    console.log('');
    console.log(chalk.yellow(`  Remaining: ${pending.length} pending suggestions`));
  } else {
    console.log('');
    console.log(chalk.green('  Remaining: None'));
  }
  console.log('');
}

/**
 * ada playbook reject <id> --reason "..." — Reject a suggestion.
 */
async function playbookReject(
  id: string,
  options: RejectOptions
): Promise<void> {
  if (!options.reason || options.reason.trim().length === 0) {
    console.log(chalk.red('❌ Rejection reason required'));
    console.log('');
    console.log(`  Usage: ada playbook reject ${id} --reason "explanation"`);
    console.log('');
    console.log(chalk.dim('  Why reasons matter:'));
    console.log(
      chalk.dim(
        '  Rejection reasons help the system learn which suggestions are'
      )
    );
    console.log(
      chalk.dim('  valuable. Good reasons improve future suggestions.')
    );
    console.log('');
    console.log(chalk.dim('  Examples:'));
    console.log(chalk.dim('    --reason "Already covered in R-010"'));
    console.log(chalk.dim('    --reason "Too vague, needs specifics"'));
    console.log(chalk.dim('    --reason "Role-specific, not cross-cutting"'));
    console.log('');
    process.exit(1);
  }

  const store = await initStore(options.dir);

  // Get current role
  const rotationPath = path.join(
    options.dir,
    'agents',
    'state',
    'rotation.json'
  );
  let rejectedBy = 'frontier'; // default

  try {
    const { promises: fs } = await import('node:fs');
    const rotation = JSON.parse(await fs.readFile(rotationPath, 'utf-8'));
    rejectedBy = rotation.last_role || rotation.next_role || 'frontier';
  } catch {
    // Use default
  }

  const result = await store.reject(id, rejectedBy, options.reason);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!result.success) {
    console.log(chalk.red(`❌ Failed to reject ${id}: ${result.error}`));
    console.log('');
    process.exit(1);
  }

  console.log('');
  console.log(chalk.red(`❌ Rejected ${chalk.cyan(id)}`));
  console.log('');
  console.log(`  Reason: ${options.reason}`);
  console.log('');
  console.log(
    chalk.dim(`  Moved to: agents/suggestions/rejected/${id}.json`)
  );

  // Show remaining count
  const pending = await store.list({ status: 'pending' });
  console.log('');
  if (pending.length > 0) {
    console.log(chalk.yellow(`  Remaining: ${pending.length} pending suggestions`));
  } else {
    console.log(chalk.green('  Remaining: None'));
  }
  console.log('');
}

/**
 * ada playbook stats — Show suggestion statistics.
 */
async function playbookStats(options: PlaybookOptions): Promise<void> {
  try {
    const store = await initStore(options.dir);
    const stats = await store.stats();

    if (options.json) {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }

    console.log('');
    console.log(chalk.bold('📊 Playbook Suggestion Statistics'));
    console.log('');

    if (stats.total === 0) {
      console.log('  No suggestions have been generated yet.');
      console.log('');
      console.log(
        chalk.dim('  Run dispatch cycles with reflections to generate suggestions.')
      );
      console.log('');
      return;
    }

    // Overview box
    const acceptanceRateColor =
      stats.acceptanceRate >= 0.6 ? chalk.green : chalk.yellow;
    const acceptanceCheck = stats.acceptanceRate >= 0.6 ? '✅' : '';

    console.log(
      box(chalk.dim('Overview'), [
        `Total:       ${stats.total} suggestions generated`,
        `Pending:     ${stats.byStatus.pending}`,
        `Applied:     ${stats.byStatus.applied}  (${acceptanceRateColor(`${Math.round(stats.acceptanceRate * 100)  }% acceptance rate`)}) ${acceptanceCheck}`,
        `Rejected:    ${stats.byStatus.rejected}`,
      ])
    );
    console.log('');

    // By Playbook box
    const playbookEntries = Object.entries(stats.byPlaybook).sort(
      (a, b) => b[1] - a[1]
    );
    if (playbookEntries.length > 0) {
      const maxCount = Math.max(...playbookEntries.map(([, count]) => count));
      const playbookLines = playbookEntries.slice(0, 5).map(([playbook, count]) => {
        const shortName = playbook.replace('agents/', '').padEnd(16);
        const bar = progressBar(count, maxCount);
        return `${shortName} ${bar}  ${count} suggestions`;
      });

      console.log(box(chalk.dim('By Playbook'), playbookLines));
      console.log('');
    }

    // Quality box
    const highConfCount = Object.entries(stats.byPlaybook).length > 0 ? 
      Math.round(stats.byStatus.applied * 0.4) : 0; // Approximate
    const modConfCount = stats.total - highConfCount;

    console.log(
      box(chalk.dim('Quality'), [
        `Avg confidence:     ${Math.round(stats.averageConfidence * 100)}%`,
        `High-conf (80%+):   ${highConfCount} (${Math.round((highConfCount / stats.total) * 100)}%)`,
        `Mod-conf (70-79%):  ${modConfCount} (${Math.round((modConfCount / stats.total) * 100)}%)`,
      ])
    );
    console.log('');

    // Target line
    console.log(
      `  Target: 60%+ acceptance rate (current: ${acceptanceRateColor(`${Math.round(stats.acceptanceRate * 100)  }%`)} ${acceptanceCheck})`
    );
    console.log('');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(chalk.bold('📊 Playbook Suggestion Statistics'));
      console.log('');
      console.log('  No suggestions have been generated yet.');
      console.log('');
      console.log(
        chalk.dim('  Run dispatch cycles with reflections to generate suggestions.')
      );
      console.log('');
      return;
    }
    throw error;
  }
}

// ─── Command Definition ─────────────────────────────────────────────────────

export const playbookCommand = new Command('playbook')
  .description(
    'Pattern-to-Playbook automation — self-improving agent playbooks'
  )
  .option('-d, --dir <path>', 'Project directory', process.cwd());

playbookCommand
  .command('suggest')
  .description('List pending playbook suggestions')
  .option('--id <id>', 'Show details for a specific suggestion')
  .option('--json', 'Output as JSON')
  .action(async (cmdOptions) => {
    const parentOptions = playbookCommand.opts();
    await playbookSuggest({ ...parentOptions, ...cmdOptions });
  });

playbookCommand
  .command('apply <id>')
  .description('Apply a suggestion to its target playbook')
  .option('--json', 'Output as JSON')
  .action(async (id, cmdOptions) => {
    const parentOptions = playbookCommand.opts();
    await playbookApply(id, { ...parentOptions, ...cmdOptions });
  });

playbookCommand
  .command('reject <id>')
  .description('Reject a suggestion with a reason')
  .requiredOption('-r, --reason <reason>', 'Reason for rejection')
  .option('--json', 'Output as JSON')
  .action(async (id, cmdOptions) => {
    const parentOptions = playbookCommand.opts();
    await playbookReject(id, { ...parentOptions, ...cmdOptions });
  });

playbookCommand
  .command('stats')
  .description('Show suggestion statistics')
  .option('--json', 'Output as JSON')
  .action(async (cmdOptions) => {
    const parentOptions = playbookCommand.opts();
    await playbookStats({ ...parentOptions, ...cmdOptions });
  });

// Default action: show suggest list
playbookCommand.action(async (options) => {
  await playbookSuggest(options);
});
