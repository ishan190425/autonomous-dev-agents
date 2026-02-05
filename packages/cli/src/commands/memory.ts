/**
 * `ada memory` — Semantic search over agent memories
 *
 * Expose the embedding-based semantic memory system to users via CLI.
 * Makes ADA's unique persistent memory architecture visible and queryable.
 *
 * Subcommands:
 *   search <query>  — Search memories by semantic similarity
 *   list            — List recent memory entries
 *
 * @see Issue #40 for full specification
 */

import { Command } from 'commander';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import chalk from 'chalk';
import {
  extractMemoryEntries,
  TfIdfEmbeddingProvider,
  InMemoryVectorStore,
  SemanticMemoryManager,
} from '@ada/core';
import type { MemoryEntry } from '@ada/core';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemorySearchOptions {
  dir: string;
  limit?: string;
  threshold?: string;
  role?: string;
  json?: boolean;
  verbose?: boolean;
}

interface MemoryListOptions {
  dir: string;
  limit?: string;
  role?: string;
  kind?: string;
  json?: boolean;
}

interface MemorySearchResult {
  score: number;
  entry: MemoryEntry;
}

interface MemoryListResult {
  entries: MemoryEntry[];
  total: number;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Load memory bank content from the agents directory.
 */
async function loadMemoryBank(agentsDir: string): Promise<string> {
  const bankPath = path.join(agentsDir, 'memory', 'bank.md');

  try {
    return await fs.readFile(bankPath, 'utf-8');
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      throw new Error(
        `Memory bank not found at ${bankPath}. Run 'ada init' first.`
      );
    }
    throw error;
  }
}

/**
 * Load all archived memory banks.
 */
async function loadArchives(agentsDir: string): Promise<string[]> {
  const archivesDir = path.join(agentsDir, 'memory', 'archives');
  const contents: string[] = [];

  try {
    const files = await fs.readdir(archivesDir);
    const mdFiles = files.filter((f) => f.endsWith('.md')).sort().reverse();

    for (const file of mdFiles) {
      try {
        const content = await fs.readFile(path.join(archivesDir, file), 'utf-8');
        contents.push(content);
      } catch {
        // Skip files we can't read
      }
    }
  } catch {
    // Archives directory doesn't exist yet — that's fine
  }

  return contents;
}

/**
 * Format similarity score with color coding.
 */
function formatScore(score: number): string {
  const percent = Math.round(score * 100);
  const str = `[${percent.toString().padStart(3)}%]`;

  if (score >= 0.8) return chalk.green(str);
  if (score >= 0.6) return chalk.yellow(str);
  if (score >= 0.4) return chalk.cyan(str);
  return chalk.gray(str);
}

/**
 * Format a memory entry kind with icon.
 */
function formatKind(kind: string): string {
  const icons: Record<string, string> = {
    decision: '📋',
    lesson: '💡',
    status: '📊',
    role_state: '👤',
    blocker: '🚧',
    question: '❓',
    metric: '📈',
    thread: '🔗',
  };
  return icons[kind] ?? '📝';
}

/**
 * Format a role name with color.
 */
function formatRole(role: string | undefined): string {
  if (!role) return chalk.gray('unknown');

  const colors: Record<string, (s: string) => string> = {
    ceo: chalk.magenta,
    research: chalk.blue,
    product: chalk.green,
    scrum: chalk.yellow,
    qa: chalk.red,
    engineering: chalk.cyan,
    ops: chalk.gray,
    growth: chalk.magentaBright,
    design: chalk.blueBright,
    frontier: chalk.cyanBright,
  };

  const colorFn = colors[role.toLowerCase()] ?? chalk.white;
  return colorFn(role);
}

/**
 * Truncate content to a reasonable length for display.
 */
function truncateContent(content: string, maxLength: number = 100): string {
  const singleLine = content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength - 3)  }...`;
}

// ─── Search Command ──────────────────────────────────────────────────────────

/**
 * Execute semantic search over agent memories.
 */
async function executeSearch(
  query: string,
  options: MemorySearchOptions
): Promise<void> {
  const agentsDir = path.resolve(options.dir, 'agents');
  const limit = parseInt(options.limit ?? '10', 10);
  const threshold = parseFloat(options.threshold ?? '0.3');

  // Load memory content
  const bankContent = await loadMemoryBank(agentsDir);
  const archives = await loadArchives(agentsDir);
  const allContent = [bankContent, ...archives].join('\n\n---\n\n');

  // Extract entries
  const entries = extractMemoryEntries(allContent);

  if (entries.length === 0) {
    console.log(chalk.yellow('⚠️  No memory entries found.'));
    console.log(chalk.gray('   The memory bank might be empty or in an unexpected format.'));
    return;
  }

  // Filter by role if specified
  const filteredEntries = options.role
    ? entries.filter((e) => e.role?.toLowerCase() === options.role?.toLowerCase())
    : entries;

  if (filteredEntries.length === 0) {
    console.log(chalk.yellow(`⚠️  No memories found for role '${options.role}'.`));
    return;
  }

  // Build semantic search
  const provider = new TfIdfEmbeddingProvider(256);
  provider.buildVocabulary(filteredEntries.map((e) => e.content));

  const store = new InMemoryVectorStore();
  const manager = new SemanticMemoryManager(provider, store);

  await manager.indexBank(allContent);

  // Search
  const results = await manager.query(query, limit * 2, threshold);

  // Apply role filter and limit
  const filtered = (options.role
    ? results.filter((r) => r.entry.role?.toLowerCase() === options.role?.toLowerCase())
    : results
  ).slice(0, limit);

  // Output
  if (options.json) {
    const output: MemorySearchResult[] = filtered.map((r) => ({
      score: Math.round(r.score * 1000) / 1000,
      entry: r.entry,
    }));
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Human-readable output
  if (filtered.length === 0) {
    console.log(chalk.yellow(`\n⚠️  No memories found matching "${query}"`));
    console.log(chalk.gray(`   Threshold: ${threshold}, Entries searched: ${filteredEntries.length}`));
    return;
  }

  console.log(chalk.bold(`\n📝 Found ${filtered.length} relevant memories`));
  console.log(chalk.gray(`   Query: "${query}" | Threshold: ${threshold}\n`));

  for (const result of filtered) {
    const { entry, score } = result;
    const scoreStr = formatScore(score);
    const kindIcon = formatKind(entry.kind);
    const roleStr = formatRole(entry.role);

    console.log(`${scoreStr} ${kindIcon} ${chalk.bold(entry.id)}`);

    if (options.verbose) {
      console.log(chalk.gray(`       Role: ${roleStr}`));
      if (entry.date) console.log(chalk.gray(`       Date: ${entry.date}`));
      console.log(chalk.gray(`       Tags: ${entry.tags.join(', ')}`));
      console.log(`       ${entry.content}`);
    } else {
      console.log(`       ${truncateContent(entry.content, 80)}`);
      console.log(chalk.gray(`       ${roleStr}${entry.date ? ` · ${entry.date}` : ''}`));
    }
    console.log();
  }
}

// ─── List Command ────────────────────────────────────────────────────────────

/**
 * List recent memory entries.
 */
async function executeList(options: MemoryListOptions): Promise<void> {
  const agentsDir = path.resolve(options.dir, 'agents');
  const limit = parseInt(options.limit ?? '20', 10);

  // Load memory content
  const bankContent = await loadMemoryBank(agentsDir);

  // Extract entries
  let entries = extractMemoryEntries(bankContent);

  if (entries.length === 0) {
    console.log(chalk.yellow('⚠️  No memory entries found.'));
    return;
  }

  // Apply filters
  if (options.role) {
    entries = entries.filter(
      (e) => e.role?.toLowerCase() === options.role?.toLowerCase()
    );
  }

  if (options.kind) {
    entries = entries.filter((e) => e.kind === options.kind);
  }

  // Limit
  const limited = entries.slice(0, limit);

  // Output
  if (options.json) {
    const output: MemoryListResult = {
      entries: limited,
      total: entries.length,
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Human-readable output
  console.log(chalk.bold(`\n📚 Memory Entries (${limited.length} of ${entries.length} total)\n`));

  // Group by kind for better readability
  const byKind = new Map<string, MemoryEntry[]>();
  for (const entry of limited) {
    const kind = entry.kind;
    if (!byKind.has(kind)) {
      byKind.set(kind, []);
    }
    byKind.get(kind)!.push(entry);
  }

  for (const [kind, kindEntries] of byKind) {
    const icon = formatKind(kind);
    console.log(chalk.bold(`${icon} ${kind.toUpperCase()} (${kindEntries.length})`));
    console.log();

    for (const entry of kindEntries) {
      const roleStr = formatRole(entry.role);
      console.log(`  ${chalk.cyan(entry.id)}`);
      console.log(`    ${truncateContent(entry.content, 70)}`);
      console.log(chalk.gray(`    ${roleStr}${entry.date ? ` · ${entry.date}` : ''} · [${entry.tags.join(', ')}]`));
      console.log();
    }
  }
}

// ─── Command Definition ──────────────────────────────────────────────────────

export const memoryCommand = new Command('memory')
  .description('🧠 Semantic search over agent memories')
  .addCommand(
    new Command('search')
      .description('Search memories by semantic similarity')
      .argument('<query>', 'Natural language search query')
      .option('-d, --dir <path>', 'Project root directory', '.')
      .option('-l, --limit <n>', 'Maximum results to return', '10')
      .option('-t, --threshold <n>', 'Similarity threshold 0-1', '0.3')
      .option('-r, --role <role>', 'Filter by role (e.g., engineering)')
      .option('--json', 'Output as JSON')
      .option('-v, --verbose', 'Show full entry details')
      .action(async (query: string, options: MemorySearchOptions) => {
        try {
          await executeSearch(query, options);
        } catch (err) {
          const error = err as Error;
          console.error(chalk.red(`\n❌ Error: ${error.message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List recent memory entries')
      .option('-d, --dir <path>', 'Project root directory', '.')
      .option('-l, --limit <n>', 'Maximum entries to show', '20')
      .option('-r, --role <role>', 'Filter by role')
      .option('-k, --kind <kind>', 'Filter by kind (decision, lesson, status, etc.)')
      .option('--json', 'Output as JSON')
      .action(async (options: MemoryListOptions) => {
        try {
          await executeList(options);
        } catch (err) {
          const error = err as Error;
          console.error(chalk.red(`\n❌ Error: ${error.message}`));
          process.exit(1);
        }
      })
  );

// Default action: show help
memoryCommand.action(() => {
  memoryCommand.outputHelp();
});
