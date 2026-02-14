/**
 * `ada reflexion` — Pattern extraction and formalization commands.
 *
 * Implements Reflexion Phase 2: Extract patterns from reflection history,
 * suggest formalizations, and track accept/reject decisions.
 *
 * Commands:
 *   ada reflexion patterns   Show extracted patterns with confidence scores
 *   ada reflexion suggest    Suggest patterns to formalize as lessons/rules
 *   ada reflexion accept     Accept a suggested pattern formalization
 *   ada reflexion reject     Reject a suggested pattern
 *   ada reflexion stats      Show Reflexion system statistics
 *
 * @see Issue #108 — Reflexion Phase 2
 * @see docs/design/reflexion-cli-ux-spec-c615.md
 * @packageDocumentation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Import reflexion types and functions from core
import {
  extractPatterns,
  generateLessonSuggestion,
  type ReflexionPattern,
  type ReflectionInput,
} from '@ada-ai/core';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Options for reflexion commands */
interface ReflexionOptions {
  dir: string;
  json?: boolean;
}

/** Options for patterns command */
interface PatternsOptions extends ReflexionOptions {
  minConfidence?: string;
  limit?: string;
  format?: 'table' | 'json' | 'compact';
  includeRejected?: boolean;
}

/** Options for suggest command */
interface SuggestOptions extends ReflexionOptions {
  threshold?: string;
  format?: 'detail' | 'list' | 'json';
}

/** Options for accept command */
interface AcceptOptions extends ReflexionOptions {
  as?: 'lesson' | 'rule' | 'playbook';
  id?: string;
  apply?: boolean;
}

/** Options for reject command */
interface RejectOptions extends ReflexionOptions {
  reason?: string;
  permanent?: boolean;
}

/** Rotation history entry with reflection */
interface RotationHistoryEntry {
  role: string;
  timestamp: string;
  cycle: number;
  action: string;
  reflection?: {
    outcome?: string;
    whatWorked?: string;
    lesson?: string;
  };
}

/** Rotation state file structure */
interface RotationState {
  current_index: number;
  last_role: string;
  last_run: string;
  cycle_count: number;
  history: RotationHistoryEntry[];
}

/** Reflexion state for tracking accepted/rejected patterns */
interface ReflexionState {
  lastAnalysisCycle: number;
  patterns: ReflexionPattern[];
  rejectedPermanently: string[];
  acceptedCount: number;
  rejectedCount: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BOX_TOP_LEFT = '┌';
const BOX_TOP_RIGHT = '┐';
const BOX_BOTTOM_LEFT = '└';
const BOX_BOTTOM_RIGHT = '┘';
const BOX_HORIZONTAL = '─';
const BOX_VERTICAL = '│';
const CONFIDENCE_BAR_FILLED = '━';
const CONFIDENCE_BAR_EMPTY = '─';
const PIPE = '│';
const CORNER = '└';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Load rotation state from agents directory.
 */
async function loadRotationState(dir: string): Promise<RotationState | null> {
  const statePath = path.join(dir, 'agents', 'state', 'rotation.json');
  try {
    const content = await fs.readFile(statePath, 'utf-8');
    return JSON.parse(content) as RotationState;
  } catch {
    return null;
  }
}

/**
 * Load or initialize reflexion state.
 */
async function loadReflexionState(dir: string): Promise<ReflexionState> {
  const statePath = path.join(dir, '.ada', 'reflexion', 'state.json');
  try {
    const content = await fs.readFile(statePath, 'utf-8');
    return JSON.parse(content) as ReflexionState;
  } catch {
    return {
      lastAnalysisCycle: 0,
      patterns: [],
      rejectedPermanently: [],
      acceptedCount: 0,
      rejectedCount: 0,
    };
  }
}

/**
 * Save reflexion state.
 */
async function saveReflexionState(
  dir: string,
  state: ReflexionState
): Promise<void> {
  const stateDir = path.join(dir, '.ada', 'reflexion');
  await fs.mkdir(stateDir, { recursive: true });
  const statePath = path.join(stateDir, 'state.json');
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

/**
 * Convert rotation history to reflection inputs.
 */
function historyToReflections(
  history: RotationHistoryEntry[]
): ReflectionInput[] {
  return history
    .filter((entry) => entry.reflection?.whatWorked)
    .map((entry) => {
      const input: ReflectionInput = {
        cycle: `C${entry.cycle}`,
        role: entry.role as ReflectionInput['role'],
        whatWorked: entry.reflection!.whatWorked!,
      };
      // Only add lessonLearned if it exists
      if (entry.reflection?.lesson) {
        input.lessonLearned = entry.reflection.lesson;
      }
      return input;
    });
}

/**
 * Draw a box header.
 */
function drawBoxHeader(title: string, width = 78): string {
  const padding = width - title.length - 4;
  return [
    chalk.dim(
      BOX_TOP_LEFT + BOX_HORIZONTAL.repeat(width) + BOX_TOP_RIGHT
    ),
    `${chalk.dim(BOX_VERTICAL) 
      }  ${ 
      chalk.bold(title) 
      }${' '.repeat(Math.max(0, padding)) 
      }${chalk.dim(BOX_VERTICAL)}`,
    chalk.dim(
      BOX_BOTTOM_LEFT + BOX_HORIZONTAL.repeat(width) + BOX_BOTTOM_RIGHT
    ),
  ].join('\n');
}

/**
 * Draw a confidence bar with star rating.
 */
function drawConfidenceBar(confidence: number, width = 55): string {
  const filledCount = Math.round(confidence * width);
  const filled = CONFIDENCE_BAR_FILLED.repeat(filledCount);
  const empty = CONFIDENCE_BAR_EMPTY.repeat(width - filledCount);
  const stars = getConfidenceStars(confidence);
  const color =
    confidence >= 0.85
      ? chalk.green
      : confidence >= 0.7
        ? chalk.yellow
        : chalk.red;
  return `${color(filled)}${chalk.dim(empty)} ${confidence.toFixed(2)} ${stars}`;
}

/**
 * Get star rating from confidence score.
 */
function getConfidenceStars(confidence: number): string {
  if (confidence >= 0.95) return '★★★★★';
  if (confidence >= 0.85) return '★★★★☆';
  if (confidence >= 0.7) return '★★★☆☆';
  if (confidence >= 0.5) return '★★☆☆☆';
  return '★☆☆☆☆';
}

/**
 * Format pattern for display.
 */
function formatPattern(
  pattern: ReflexionPattern,
  index: number,
  compact = false
): string {
  if (compact) {
    return `  ${chalk.dim(`#${index + 1}`)} ${pattern.theme} (${(pattern.confidence * 100).toFixed(0)}%)`;
  }

  const lines: string[] = [
    '',
    `  ${chalk.bold(`#${index + 1}`)} ${drawConfidenceBar(pattern.confidence)}`,
    `  ${chalk.dim(PIPE)} ${pattern.theme}`,
    `  ${chalk.dim(PIPE)} ${chalk.dim('Keywords:')} ${pattern.keywords.slice(0, 5).join(', ')}`,
    `  ${chalk.dim(PIPE)} ${chalk.dim('Evidence:')} ${pattern.sourceCluster.size} reflections across ${pattern.roles.length} roles`,
    `  ${chalk.dim(PIPE)} ${chalk.dim('First seen:')} C${pattern.sourceCluster.reflectionIds[0]?.replace('C', '')} • ${chalk.dim('Last seen:')} C${pattern.sourceCluster.reflectionIds[pattern.sourceCluster.reflectionIds.length - 1]?.replace('C', '')}`,
    `  ${chalk.dim(CORNER + BOX_HORIZONTAL.repeat(73))}`,
  ];

  return lines.join('\n');
}

// ─── Commands ────────────────────────────────────────────────────────────────

/**
 * Create the reflexion command group.
 */
export const reflexionCommand = new Command('reflexion')
  .description('📊 Pattern extraction and formalization from reflection history')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('--json', 'Output as JSON');

/**
 * `ada reflexion patterns` — Display extracted patterns.
 */
reflexionCommand
  .command('patterns')
  .description('Display extracted patterns with confidence scores')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option(
    '--min-confidence <n>',
    'Minimum confidence threshold (0.0-1.0)',
    '0.7'
  )
  .option('--limit <n>', 'Maximum patterns to display', '10')
  .option(
    '--format <fmt>',
    'Output format: table, json, compact',
    'table'
  )
  .option('--include-rejected', 'Include previously rejected patterns')
  .action(async function (this: Command, options: PatternsOptions) {
    // Check parent options as fallback (Commander assigns -d to parent when used before subcommand)
    const parentOpts = this.parent?.opts() as ReflexionOptions | undefined;
    const dir = (options.dir !== '.' ? options.dir : parentOpts?.dir) || '.';
    const minConfidence = parseFloat(options.minConfidence || '0.7');
    const limit = parseInt(options.limit || '10', 10);
    const format = options.format || 'table';

    // Load rotation state
    const rotationState = await loadRotationState(dir);
    if (!rotationState) {
      console.error(
        chalk.red('Error: Could not load rotation state. Run from ADA project root.')
      );
      process.exit(1);
    }

    // Convert history to reflections
    const reflections = historyToReflections(rotationState.history);
    if (reflections.length === 0) {
      console.log(drawBoxHeader('📊 Reflexion Patterns'));
      console.log('');
      console.log('  No reflections found with "whatWorked" field.');
      console.log('');
      console.log(
        chalk.dim(
          '  Suggestions:'
        )
      );
      console.log(
        chalk.dim(
          '    • Ensure --reflection flag used on dispatch complete'
        )
      );
      console.log(
        chalk.dim(
          '    • More cycles needed: Reflexion works best with 50+ reflections'
        )
      );
      console.log('');
      process.exit(0);
    }

    // Extract patterns
    const patterns = extractPatterns(reflections, {
      confidenceThreshold: minConfidence,
      maxPatterns: limit,
    });

    // Load reflexion state for rejected patterns
    const reflexionState = await loadReflexionState(dir);
    const filteredPatterns = options.includeRejected
      ? patterns
      : patterns.filter(
          (p) => !reflexionState.rejectedPermanently.includes(p.id)
        );

    // Output
    if (format === 'json' || options.json) {
      console.log(JSON.stringify(filteredPatterns, null, 2));
      return;
    }

    // Header
    console.log(drawBoxHeader('📊 Reflexion Patterns'));
    console.log(
      chalk.dim(
        `  Extracted from ${rotationState.cycle_count} cycles • Threshold: ${minConfidence.toFixed(2)} • ${filteredPatterns.length} patterns found`
      )
    );

    if (filteredPatterns.length === 0) {
      console.log('');
      console.log(`  No patterns found at confidence ≥ ${minConfidence.toFixed(2)}`);
      console.log('');
      console.log(chalk.dim('  Suggestions:'));
      console.log(
        chalk.dim(
          '    • Lower threshold: ada reflexion patterns --min-confidence 0.5'
        )
      );
      console.log(
        chalk.dim(
          '    • More cycles needed: Reflexion works best with 50+ reflections'
        )
      );
      console.log('');
      return;
    }

    // Display patterns
    filteredPatterns.forEach((pattern, i) => {
      console.log(formatPattern(pattern, i, format === 'compact'));
    });

    console.log('');
    console.log(drawBoxHeader('💡 Tip: Run `ada reflexion suggest` to see which patterns to formalize'));
  });

/**
 * `ada reflexion suggest` — Suggest patterns to formalize.
 */
reflexionCommand
  .command('suggest')
  .description('Suggest patterns that should be formalized as lessons or rules')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option(
    '--threshold <n>',
    'Minimum confidence for suggestions',
    '0.85'
  )
  .option(
    '--format <fmt>',
    'Output format: detail, list, json',
    'detail'
  )
  .action(async function (this: Command, options: SuggestOptions) {
    // Check parent options as fallback (Commander assigns -d to parent when used before subcommand)
    const parentOpts = this.parent?.opts() as ReflexionOptions | undefined;
    const dir = (options.dir !== '.' ? options.dir : parentOpts?.dir) || '.';
    const threshold = parseFloat(options.threshold || '0.85');
    const format = options.format || 'detail';

    // Load rotation state
    const rotationState = await loadRotationState(dir);
    if (!rotationState) {
      console.error(
        chalk.red('Error: Could not load rotation state. Run from ADA project root.')
      );
      process.exit(1);
    }

    // Convert and extract
    const reflections = historyToReflections(rotationState.history);
    const patterns = extractPatterns(reflections, {
      confidenceThreshold: threshold,
    });

    // Load reflexion state
    const reflexionState = await loadReflexionState(dir);

    // Filter out already processed patterns
    const suggestions = patterns.filter(
      (p) =>
        p.confidence >= threshold &&
        !reflexionState.rejectedPermanently.includes(p.id) &&
        p.status === 'candidate'
    );

    if (format === 'json' || options.json) {
      console.log(JSON.stringify(suggestions, null, 2));
      return;
    }

    // Header
    console.log(drawBoxHeader('💡 Suggested Formalizations'));
    console.log(chalk.dim('  Patterns ready to become lessons or rules'));
    console.log('');

    if (suggestions.length === 0) {
      console.log('  No patterns ready for formalization.');
      console.log('');
      console.log(chalk.dim('  Suggestions:'));
      console.log(
        chalk.dim('    • Lower threshold: ada reflexion suggest --threshold 0.7')
      );
      console.log(
        chalk.dim('    • More reflections needed for pattern confidence')
      );
      console.log('');
      return;
    }

    suggestions.forEach((pattern, i) => {
      const lesson = generateLessonSuggestion(pattern);

      console.log(
        `  ${chalk.bold(`SUGGEST #${i + 1}`)} ${drawConfidenceBar(pattern.confidence, 45)} Confidence: ${pattern.confidence.toFixed(2)}`
      );
      console.log(`  ${chalk.cyan('┃')}`);
      console.log(`  ${chalk.cyan('┃')}  ${chalk.bold('Pattern:')}    ${pattern.theme}`);
      console.log(`  ${chalk.cyan('┃')}`);
      console.log(`  ${chalk.cyan('┃')}  ${chalk.bold('Evidence:')}`);

      // Show evidence (first 3 reflection IDs)
      const evidenceIds = pattern.sourceCluster.reflectionIds.slice(0, 3);
      for (const id of evidenceIds) {
        console.log(`  ${chalk.cyan('┃')}    • ${id}: "${pattern.description.slice(0, 60)}..."`);
      }

      console.log(`  ${chalk.cyan('┃')}`);
      console.log(`  ${chalk.cyan('┃')}  ${chalk.bold('Suggested Action:')}`);
      console.log(`  ${chalk.cyan('┃')}    → ${lesson}`);
      console.log(`  ${chalk.cyan('┃')}`);
      console.log(
        `  ${chalk.dim(CORNER + BOX_HORIZONTAL.repeat(73))}`
      );
      console.log('');
    });

    console.log(
      chalk.dim(
        '  Accept: ada reflexion accept <pattern-id>'
      )
    );
    console.log(
      chalk.dim(
        '  Reject: ada reflexion reject <pattern-id>'
      )
    );
    console.log('');
  });

/**
 * `ada reflexion accept` — Accept a pattern formalization.
 */
reflexionCommand
  .command('accept <patternId>')
  .description('Accept a suggested pattern formalization')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option(
    '--as <type>',
    'Formalization type: lesson, rule, playbook',
    'lesson'
  )
  .option('--id <id>', 'Override auto-generated ID (e.g., L298, R-014)')
  .option('--apply', 'Apply changes immediately (vs staging)')
  .action(async function (this: Command, patternId: string, options: AcceptOptions) {
    // Check parent options as fallback (Commander assigns -d to parent when used before subcommand)
    const parentOpts = this.parent?.opts() as ReflexionOptions | undefined;
    const dir = (options.dir !== '.' ? options.dir : parentOpts?.dir) || '.';
    const formalizeAs = options.as || 'lesson';

    // Load states
    const rotationState = await loadRotationState(dir);
    if (!rotationState) {
      console.error(
        chalk.red('Error: Could not load rotation state.')
      );
      process.exit(1);
    }

    const reflections = historyToReflections(rotationState.history);
    const patterns = extractPatterns(reflections);
    const reflexionState = await loadReflexionState(dir);

    // Find pattern
    const foundPattern = patterns.find((p) => p.id === patternId);
    if (!foundPattern) {
      console.error(chalk.red(`Error: Pattern ${patternId} not found.`));
      console.log(chalk.dim('Run `ada reflexion patterns` to see available patterns.'));
      process.exit(1);
    }
    const pattern: ReflexionPattern = foundPattern;

    // Mark as accepted
    pattern.status = 'accepted';
    reflexionState.acceptedCount++;
    reflexionState.patterns.push(pattern);
    await saveReflexionState(dir, reflexionState);

    // Generate output
    const lessonId = options.id || 'L-NEW';
    const lessonText = generateLessonSuggestion(pattern);

    console.log(drawBoxHeader('✅ Pattern Accepted'));
    console.log('');
    console.log(`  ${chalk.bold('Pattern:')}    ${pattern.theme}`);
    console.log(`  ${chalk.bold('Lesson:')}     ${lessonText}`);
    console.log(`  ${chalk.bold('Formalized:')} ${lessonId} (${formalizeAs})`);
    console.log('');
    console.log(chalk.dim('  Changes staged:'));
    console.log(chalk.dim('    • agents/memory/bank.md — Add lesson to Key Lessons'));
    if (formalizeAs === 'rule') {
      console.log(chalk.dim('    • agents/rules/RULES.md — Add new rule'));
    }
    console.log('');
    console.log(chalk.dim('  Commit with: ada dispatch complete --action "..."'));
    console.log('');
  });

/**
 * `ada reflexion reject` — Reject a pattern.
 */
reflexionCommand
  .command('reject <patternId>')
  .description('Reject a suggested pattern with optional reasoning')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('--reason <text>', 'Reason for rejection')
  .option('--permanent', 'Never suggest this pattern again')
  .action(async function (this: Command, patternId: string, options: RejectOptions) {
    // Check parent options as fallback (Commander assigns -d to parent when used before subcommand)
    const parentOpts = this.parent?.opts() as ReflexionOptions | undefined;
    const dir = (options.dir !== '.' ? options.dir : parentOpts?.dir) || '.';

    // Load states
    const reflexionState = await loadReflexionState(dir);

    // Mark as rejected
    reflexionState.rejectedCount++;
    if (options.permanent) {
      reflexionState.rejectedPermanently.push(patternId);
    }
    await saveReflexionState(dir, reflexionState);

    console.log(drawBoxHeader('⏭️  Pattern Rejected'));
    console.log('');
    console.log(`  ${chalk.bold('Pattern:')}  ${patternId}`);
    if (options.reason) {
      console.log(`  ${chalk.bold('Reason:')}   ${options.reason}`);
    }
    console.log(
      `  ${chalk.bold('Status:')}   ${options.permanent ? 'Will NOT be suggested again' : 'Will re-suggest if confidence increases to 0.90+'}`
    );
    console.log('');
  });

/**
 * `ada reflexion stats` — Show Reflexion statistics.
 */
reflexionCommand
  .command('stats')
  .description('Show Reflexion system statistics')
  .option('-d, --dir <path>', 'Project directory', '.')
  .action(async function (this: Command, options: ReflexionOptions) {
    // Check parent options as fallback (Commander assigns -d to parent when used before subcommand)
    const parentOpts = this.parent?.opts() as ReflexionOptions | undefined;
    const dir = (options.dir !== '.' ? options.dir : parentOpts?.dir) || '.';

    // Load states
    const rotationState = await loadRotationState(dir);
    if (!rotationState) {
      console.error(
        chalk.red('Error: Could not load rotation state.')
      );
      process.exit(1);
    }

    const reflections = historyToReflections(rotationState.history);
    const patterns = extractPatterns(reflections, { confidenceThreshold: 0 });
    const reflexionState = await loadReflexionState(dir);

    // Calculate stats
    const totalCycles = rotationState.cycle_count;
    const reflectionsWithData = reflections.length;
    const reflectionRate =
      totalCycles > 0
        ? Math.round((reflectionsWithData / totalCycles) * 100)
        : 0;

    // Confidence distribution
    const above95 = patterns.filter((p) => p.confidence >= 0.95).length;
    const above85 = patterns.filter(
      (p) => p.confidence >= 0.85 && p.confidence < 0.95
    ).length;
    const above70 = patterns.filter(
      (p) => p.confidence >= 0.7 && p.confidence < 0.85
    ).length;
    const below70 = patterns.filter((p) => p.confidence < 0.7).length;

    // Output
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            cyclesAnalyzed: totalCycles,
            reflectionsParsed: reflectionsWithData,
            reflectionRate,
            patternsExtracted: patterns.length,
            distribution: { above95, above85, above70, below70 },
            acceptedCount: reflexionState.acceptedCount,
            rejectedCount: reflexionState.rejectedCount,
            lastAnalysis: reflexionState.lastAnalysisCycle,
          },
          null,
          2
        )
      );
      return;
    }

    console.log(drawBoxHeader('📈 Reflexion Statistics'));
    console.log('');
    console.log(
      `  ${chalk.bold('Cycles Analyzed:')}        ${totalCycles}`
    );
    console.log(
      `  ${chalk.bold('Reflections Parsed:')}     ${reflectionsWithData} (${reflectionRate}%)`
    );
    console.log(
      `  ${chalk.bold('Patterns Extracted:')}     ${patterns.length}`
    );
    console.log('');

    // Distribution chart
    const maxBar = 25;
    const maxCount = Math.max(above95, above85, above70, below70, 1);

    console.log('  ┌─────────────────────────────────────┐');
    console.log('  │  Confidence Distribution            │');
    console.log(
      `  │  ${chalk.green(CONFIDENCE_BAR_FILLED.repeat(Math.round((above95 / maxCount) * maxBar)))}${chalk.dim('░'.repeat(maxBar - Math.round((above95 / maxCount) * maxBar)))}  0.95+  │ ${above95}`
    );
    console.log(
      `  │  ${chalk.green(CONFIDENCE_BAR_FILLED.repeat(Math.round((above85 / maxCount) * maxBar)))}${chalk.dim('░'.repeat(maxBar - Math.round((above85 / maxCount) * maxBar)))}  0.85+  │ ${above85}`
    );
    console.log(
      `  │  ${chalk.yellow(CONFIDENCE_BAR_FILLED.repeat(Math.round((above70 / maxCount) * maxBar)))}${chalk.dim('░'.repeat(maxBar - Math.round((above70 / maxCount) * maxBar)))}  0.70+  │ ${above70}`
    );
    console.log(
      `  │  ${chalk.red(CONFIDENCE_BAR_FILLED.repeat(Math.round((below70 / maxCount) * maxBar)))}${chalk.dim('░'.repeat(maxBar - Math.round((below70 / maxCount) * maxBar)))}  <0.70  │ ${below70}`
    );
    console.log('  └─────────────────────────────────────┘');
    console.log('');

    console.log(
      `  ${chalk.bold('Accepted:')}               ${reflexionState.acceptedCount} patterns`
    );
    console.log(
      `  ${chalk.bold('Rejected (Permanent):')}   ${reflexionState.rejectedPermanently.length} patterns`
    );
    console.log('');
    console.log(
      `  ${chalk.dim('Last Analysis:')}          C${reflexionState.lastAnalysisCycle || 'N/A'}`
    );
    console.log('');
  });
