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
  extractMemoryStats,
  listArchives,
  formatActivityBar,
  getRelativeTime,
  createJsonVectorStore,
  createImportanceTracker,
  createLifecycleManager,
} from '@ada-ai/core';
import type { MemoryEntry, HealthStatus } from '@ada-ai/core';

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
  since?: string;
  until?: string;
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

interface MemoryStatsOptions {
  dir: string;
  json?: boolean;
  verbose?: boolean;
  noColor?: boolean;
}

interface MemoryExportOptions {
  dir: string;
  output?: string;
  includeArchives?: boolean;
  json?: boolean;
}

/** Export data format with schema versioning */
interface MemoryExport {
  schemaVersion: '1.0';
  exportedAt: string;
  bank: {
    content: string;
    entries: MemoryEntry[];
  };
  archives?: Array<{
    filename: string;
    content: string;
    entries: MemoryEntry[];
  }>;
}

interface MemoryEmbedOptions {
  dir: string;
  force?: boolean;
  json?: boolean;
  verbose?: boolean;
}

interface MemoryLifecycleOptions {
  dir: string;
  json?: boolean;
  verbose?: boolean;
  noColor?: boolean;
}

interface LifecycleStats {
  tiers: {
    hot: number;
    warm: number;
    cold: number;
  };
  total: number;
  dimensions: number;
  provider: string;
  lastModified: string;
  importance: {
    tracked: number;
    avgScore: number;
    aboveForgetThreshold: number;
    belowForgetThreshold: number;
  };
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

/**
 * Parse a date string into a Date object.
 * Supports ISO dates (YYYY-MM-DD) and relative dates (today, yesterday).
 */
function parseDate(dateStr: string): Date | null {
  const trimmed = dateStr.trim().toLowerCase();

  // Relative dates
  if (trimmed === 'today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (trimmed === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ISO date format YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1; // 0-indexed
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day);
  }

  // Try Date.parse as fallback
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}

/**
 * Check if an entry's date is within the specified range.
 */
function isInDateRange(
  entry: MemoryEntry,
  since: Date | null,
  until: Date | null
): boolean {
  // If entry has no date, it cannot be filtered by date
  if (!entry.date) return true;

  const entryDate = parseDate(entry.date);
  if (!entryDate) return true; // Can't parse, include by default

  if (since && entryDate < since) return false;

  if (until) {
    // Until is inclusive — set to end of day
    const untilEnd = new Date(until);
    untilEnd.setHours(23, 59, 59, 999);
    if (entryDate > untilEnd) return false;
  }

  return true;
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

  // Date range filters
  const sinceDate = options.since ? parseDate(options.since) : null;
  const untilDate = options.until ? parseDate(options.until) : null;

  if (sinceDate || untilDate) {
    if (options.since && !sinceDate) {
      console.error(chalk.red(`❌ Invalid --since date: ${options.since}`));
      console.error(chalk.gray('   Use format: YYYY-MM-DD, today, or yesterday'));
      process.exit(1);
    }
    if (options.until && !untilDate) {
      console.error(chalk.red(`❌ Invalid --until date: ${options.until}`));
      console.error(chalk.gray('   Use format: YYYY-MM-DD, today, or yesterday'));
      process.exit(1);
    }

    entries = entries.filter((e) => isInDateRange(e, sinceDate, untilDate));
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
    const kindEntries = byKind.get(kind);
    if (kindEntries) {
      kindEntries.push(entry);
    } else {
      byKind.set(kind, [entry]);
    }
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

// ─── Stats Command ───────────────────────────────────────────────────────────

/**
 * Role emoji mapping for stats display.
 */
const ROLE_EMOJIS: Record<string, string> = {
  ceo: '👔',
  research: '🔬',
  product: '📦',
  scrum: '📋',
  qa: '🔍',
  engineering: '⚙️',
  ops: '🛡️',
  growth: '🚀',
  design: '🎨',
  frontier: '🌌',
};

/**
 * Format health status with color.
 */
function formatHealthStatus(health: HealthStatus, useColor: boolean): string {
  const colorFn = useColor ? {
    healthy: chalk.green,
    warning: chalk.yellow,
    unhealthy: chalk.red,
  }[health.status] : (s: string): string => s;

  const icons: Record<string, string> = {
    healthy: '✅',
    warning: '⚠️',
    unhealthy: '❌',
  };

  return colorFn(`${icons[health.status]} ${health.status.charAt(0).toUpperCase()}${health.status.slice(1)}`);
}

/**
 * Execute memory stats command.
 */
async function executeStats(options: MemoryStatsOptions): Promise<void> {
  const agentsDir = path.resolve(options.dir, 'agents');
  const useColor = !options.noColor && process.stdout.isTTY;

  // Load memory bank
  const bankPath = path.join(agentsDir, 'memory', 'bank.md');
  let bankContent: string;

  try {
    bankContent = await fs.readFile(bankPath, 'utf-8');
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      console.error(chalk.red('❌ Memory bank not found'));
      console.error(chalk.gray(`\nExpected: ${bankPath}`));
      console.error(chalk.gray("Run 'ada init' to create project structure."));
      process.exit(1);
    }
    throw error;
  }

  // Load rotation state for history
  const rotationPath = path.join(agentsDir, 'state', 'rotation.json');
  let rotationHistory: Array<{ role: string; cycle: number; timestamp: string }> = [];

  try {
    const rotationContent = await fs.readFile(rotationPath, 'utf-8');
    const rotation = JSON.parse(rotationContent) as { history?: Array<{ role: string; cycle: number; timestamp: string }> };
    rotationHistory = rotation.history ?? [];
  } catch {
    // Rotation file may not exist — that's okay
  }

  // Extract stats
  const stats = extractMemoryStats(bankContent, rotationHistory);

  // JSON output
  if (options.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  // Human-readable output
  console.log(chalk.bold('\n📊 Memory System Stats\n'));

  // Bank section
  console.log(chalk.bold('Bank'));
  console.log(`  Version:          ${useColor ? chalk.cyan(`v${stats.bank.version}`) : `v${stats.bank.version}`}`);

  if (stats.bank.lastUpdated) {
    const relative = getRelativeTime(stats.bank.lastUpdated);
    console.log(`  Last updated:     ${useColor ? chalk.cyan(relative) : relative} (${stats.bank.lastUpdated.split('T')[0] ?? stats.bank.lastUpdated})`);
  } else {
    console.log(`  Last updated:     ${chalk.gray('unknown')}`);
  }

  if (stats.bank.lastCompression) {
    const compressionDate = new Date(stats.bank.lastCompression);
    const daysAgo = Math.floor((Date.now() - compressionDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`  Last compression: ${useColor ? chalk.cyan(`${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`) : `${daysAgo} days ago`} (${stats.bank.lastCompression})`);
  } else {
    console.log(`  Last compression: ${chalk.gray('never')}`);
  }

  console.log(`  Size:             ${useColor ? chalk.cyan(`${stats.bank.lines} lines`) : `${stats.bank.lines} lines`}`);
  console.log();

  // Cycles section
  console.log(chalk.bold('Cycles'));
  console.log(`  Total:            ${useColor ? chalk.cyan(stats.cycles.total.toString()) : stats.cycles.total}`);
  console.log(`  Since compression: ${useColor ? chalk.cyan(stats.cycles.sinceCompression.toString()) : stats.cycles.sinceCompression}`);
  if (stats.cycles.perDay !== null) {
    console.log(`  Avg per day:      ${useColor ? chalk.cyan(stats.cycles.perDay.toFixed(1)) : stats.cycles.perDay.toFixed(1)}`);
  }
  console.log();

  // Role Activity section
  const roleEntries = Object.entries(stats.roleActivity);
  if (roleEntries.length > 0) {
    console.log(chalk.bold(`Role Activity (last ${rotationHistory.length} cycles)`));

    // Sort by count descending
    roleEntries.sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...roleEntries.map(([, count]) => count));

    for (const [role, count] of roleEntries) {
      const emoji = ROLE_EMOJIS[role] ?? '📝';
      const bar = formatActivityBar(count, maxCount);
      const barColored = useColor ? chalk.green(bar) : bar;
      console.log(`  ${emoji}  ${role.padEnd(12)} ${barColored} ${count}`);
    }
    console.log();
  } else {
    console.log(chalk.bold('Role Activity (last 10 cycles)'));
    console.log(chalk.gray('  (no activity recorded yet)'));
    console.log();
  }

  // Sections
  console.log(chalk.bold('Sections'));
  const blockerStatus = stats.sections.blockers === 0 ? chalk.green('(healthy)') : chalk.yellow('');
  console.log(`  ${stats.sections.blockers === 0 ? '✅' : '🚧'} Blockers:       ${stats.sections.blockers} active ${blockerStatus}`);
  console.log(`  📌 Active Threads: ${stats.sections.activeThreads} tracked`);
  console.log(`  📋 Decisions:      ${stats.sections.decisions} ADRs`);
  console.log(`  💡 Lessons:        ${stats.sections.lessons} learned`);
  console.log(`  📈 Metrics:        ${stats.sections.hasMetrics ? 'current' : 'missing'}`);
  console.log();

  // Verbose: show archives
  if (options.verbose) {
    const archivesDir = path.join(agentsDir, 'memory', 'archives');
    const archives = await listArchives(archivesDir);

    if (archives.length > 0) {
      console.log(chalk.bold(`Archives (${archives.length} total)`));
      for (const archive of archives) {
        console.log(`  v${archive.version}  ${archive.date}  ${archive.filename}`);
      }
      console.log();
    }
  }

  // Health
  console.log(`Health: ${formatHealthStatus(stats.health, useColor)}`);

  if (stats.health.warnings.length > 0) {
    for (const warning of stats.health.warnings) {
      console.log(`  - ${useColor ? chalk.yellow(warning) : warning}`);
    }
  }

  console.log();
}

// ─── Export Command ──────────────────────────────────────────────────────────

/**
 * Export memory bank and archives to JSON.
 */
async function executeExport(options: MemoryExportOptions): Promise<void> {
  const agentsDir = path.resolve(options.dir, 'agents');

  // Load memory bank
  const bankPath = path.join(agentsDir, 'memory', 'bank.md');
  let bankContent: string;

  try {
    bankContent = await fs.readFile(bankPath, 'utf-8');
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      console.error(chalk.red('❌ Memory bank not found'));
      console.error(chalk.gray(`\nExpected: ${bankPath}`));
      console.error(chalk.gray("Run 'ada init' to create project structure."));
      process.exit(1);
    }
    throw error;
  }

  // Extract entries from bank
  const bankEntries = extractMemoryEntries(bankContent);

  // Build export object
  const exportData: MemoryExport = {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    bank: {
      content: bankContent,
      entries: [...bankEntries],
    },
  };

  // Include archives if requested
  if (options.includeArchives) {
    const archivesDir = path.join(agentsDir, 'memory', 'archives');
    exportData.archives = [];

    try {
      const files = await fs.readdir(archivesDir);
      const mdFiles = files.filter((f) => f.endsWith('.md')).sort();

      for (const filename of mdFiles) {
        try {
          const content = await fs.readFile(path.join(archivesDir, filename), 'utf-8');
          const entries = extractMemoryEntries(content);
          exportData.archives.push({
            filename,
            content,
            entries: [...entries],
          });
        } catch {
          // Skip files we can't read
        }
      }
    } catch {
      // Archives directory doesn't exist — that's fine
      exportData.archives = [];
    }
  }

  // Output
  const jsonOutput = JSON.stringify(exportData, null, 2);

  if (options.output) {
    // Write to file
    const outputPath = path.resolve(options.output);
    await fs.writeFile(outputPath, jsonOutput, 'utf-8');
    console.log(chalk.green(`✅ Exported memory to ${outputPath}`));

    // Summary
    console.log(chalk.gray(`\n   Bank entries: ${bankEntries.length}`));
    if (exportData.archives) {
      const archiveEntryCount = exportData.archives.reduce((sum, a) => sum + a.entries.length, 0);
      console.log(chalk.gray(`   Archives: ${exportData.archives.length} files, ${archiveEntryCount} entries`));
    }
    console.log(chalk.gray(`   Schema version: ${exportData.schemaVersion}`));
  } else {
    // Output to stdout
    console.log(jsonOutput);
  }
}

// ─── Embed Command ───────────────────────────────────────────────────────────

/** TF-IDF embedding dimensions (must match core library) */
const EMBEDDING_DIMENSIONS = 256;
const EMBEDDING_PROVIDER = 'tfidf';

/**
 * Initialize or reindex the persistent vector store.
 *
 * Creates the three-tier memory system:
 * - Hot tier: bank.md (markdown, read every cycle)
 * - Warm tier: Vector store (semantic search on demand)
 * - Cold tier: Archives (explicit search only)
 */
async function executeEmbed(options: MemoryEmbedOptions): Promise<void> {
  const agentsDir = path.resolve(options.dir, 'agents');

  // Load memory bank
  const bankContent = await loadMemoryBank(agentsDir);
  const entries = extractMemoryEntries(bankContent);

  if (entries.length === 0) {
    console.log(chalk.yellow('⚠️  No memory entries found to embed.'));
    console.log(chalk.gray('   The memory bank might be empty or in an unexpected format.'));
    return;
  }

  // Check if vector store already exists
  const vectorStorePath = path.join(agentsDir, 'state', 'vectors.json');
  let existingEntries = 0;
  try {
    const existing = await fs.readFile(vectorStorePath, 'utf-8');
    const parsed = JSON.parse(existing) as { entryCount?: number };
    existingEntries = parsed.entryCount ?? 0;
  } catch {
    // Doesn't exist yet — that's fine
  }

  if (existingEntries > 0 && !options.force) {
    if (!options.json) {
      console.log(chalk.yellow(`⚠️  Vector store already exists with ${existingEntries} entries.`));
      console.log(chalk.gray('   Use --force to reindex all entries.'));
    }
    return;
  }

  if (!options.json) {
    console.log(chalk.bold('\n🧬 Initializing persistent memory system...\n'));
    console.log(chalk.gray(`   Found ${entries.length} memory entries to embed`));
  }

  // Create embedding provider
  const provider = new TfIdfEmbeddingProvider(EMBEDDING_DIMENSIONS);
  provider.buildVocabulary(entries.map((e) => e.content));

  if (options.verbose && !options.json) {
    console.log(chalk.gray(`   Provider: ${EMBEDDING_PROVIDER} (${EMBEDDING_DIMENSIONS}D)`));
  }

  // Create and load vector store
  const vectorStore = await createJsonVectorStore(
    agentsDir,
    EMBEDDING_PROVIDER,
    EMBEDDING_DIMENSIONS
  );

  // Create importance tracker
  const importanceTracker = await createImportanceTracker(agentsDir);

  // Create lifecycle manager
  const lifecycleManager = await createLifecycleManager(
    provider,
    vectorStore,
    importanceTracker,
    { agentsDir }
  );

  // Reindex all entries
  const indexed = await lifecycleManager.reindex(1);

  // Get final stats
  const stats = lifecycleManager.getStats();

  // Output
  if (options.json) {
    const output = {
      indexed,
      stats: {
        hot: stats.hot,
        warm: stats.warm,
        cold: stats.cold,
        total: stats.total,
        avgImportance: Math.round(stats.avgImportance * 1000) / 1000,
      },
      provider: EMBEDDING_PROVIDER,
      dimensions: EMBEDDING_DIMENSIONS,
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Human-readable output
  console.log(chalk.green(`\n✅ Indexed ${indexed} memory entries\n`));
  console.log(chalk.bold('Memory Tiers:'));
  console.log(`  🔥 Hot:   ${chalk.cyan(stats.hot.toString())} entries (active, in bank.md)`);
  console.log(`  💧 Warm:  ${chalk.cyan(stats.warm.toString())} entries (vector store)`);
  console.log(`  ❄️  Cold:  ${chalk.cyan(stats.cold.toString())} entries (archived)`);
  console.log();
  console.log(chalk.gray(`   Provider: ${EMBEDDING_PROVIDER} (${EMBEDDING_DIMENSIONS}D)`));
  console.log(chalk.gray(`   Store: ${vectorStorePath}`));
  console.log();
}

// ─── Lifecycle Command ───────────────────────────────────────────────────────

/**
 * Show memory lifecycle statistics.
 */
async function executeLifecycle(options: MemoryLifecycleOptions): Promise<void> {
  const agentsDir = path.resolve(options.dir, 'agents');
  const useColor = !options.noColor && process.stdout.isTTY;

  // Check if vector store file exists
  const vectorStorePath = path.join(agentsDir, 'state', 'vectors.json');
  let vectorStoreExists = false;
  try {
    await fs.access(vectorStorePath);
    vectorStoreExists = true;
  } catch {
    // File doesn't exist
  }

  // Try to load vector store
  let vectorStats: LifecycleStats['tiers'] & { total: number; dimensions: number; provider: string; lastModified: string } | null = null;

  if (vectorStoreExists) {
    try {
      const store = await createJsonVectorStore(
        agentsDir,
        EMBEDDING_PROVIDER,
        EMBEDDING_DIMENSIONS
      );
      const stats = store.getStats();
      vectorStats = {
        hot: stats.byTier.hot,
        warm: stats.byTier.warm,
        cold: stats.byTier.cold,
        total: stats.total,
        dimensions: stats.dimensions,
        provider: stats.provider,
        lastModified: stats.lastModified,
      };
    } catch {
      // Vector store exists but couldn't be loaded
    }
  }

  // Try to load importance tracker (only if vector store exists)
  let importanceStats: LifecycleStats['importance'] | null = null;

  if (vectorStoreExists) {
    try {
      const tracker = await createImportanceTracker(agentsDir);
      const stats = tracker.getStats();
      importanceStats = {
        tracked: stats.total,
        avgScore: stats.avgScore,
        aboveForgetThreshold: stats.total - stats.belowForgetThreshold,
        belowForgetThreshold: stats.belowForgetThreshold,
      };
    } catch {
      // Importance tracker doesn't exist yet
    }
  }

  // JSON output
  if (options.json) {
    const output: Partial<LifecycleStats> = {};
    if (vectorStats) {
      output.tiers = {
        hot: vectorStats.hot,
        warm: vectorStats.warm,
        cold: vectorStats.cold,
      };
      output.total = vectorStats.total;
      output.dimensions = vectorStats.dimensions;
      output.provider = vectorStats.provider;
      output.lastModified = vectorStats.lastModified;
    }
    if (importanceStats) {
      output.importance = importanceStats;
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Human-readable output
  console.log(chalk.bold('\n📊 Memory Lifecycle Status\n'));

  if (!vectorStats) {
    console.log(chalk.yellow('⚠️  Vector store not initialized.'));
    console.log(chalk.gray("   Run 'ada memory embed' to create the three-tier memory system."));
    console.log();
    return;
  }

  // Tier distribution
  console.log(chalk.bold('Tier Distribution'));
  const tierTotal = vectorStats.hot + vectorStats.warm + vectorStats.cold;
  const hotPct = tierTotal > 0 ? Math.round((vectorStats.hot / tierTotal) * 100) : 0;
  const warmPct = tierTotal > 0 ? Math.round((vectorStats.warm / tierTotal) * 100) : 0;
  const coldPct = tierTotal > 0 ? Math.round((vectorStats.cold / tierTotal) * 100) : 0;

  const hotBar = '█'.repeat(Math.max(1, Math.round(hotPct / 5)));
  const warmBar = '█'.repeat(Math.max(0, Math.round(warmPct / 5)));
  const coldBar = '█'.repeat(Math.max(0, Math.round(coldPct / 5)));

  console.log(`  🔥 Hot   ${useColor ? chalk.red(hotBar) : hotBar} ${vectorStats.hot} (${hotPct}%)`);
  console.log(`  💧 Warm  ${useColor ? chalk.yellow(warmBar) : warmBar} ${vectorStats.warm} (${warmPct}%)`);
  console.log(`  ❄️  Cold  ${useColor ? chalk.blue(coldBar) : coldBar} ${vectorStats.cold} (${coldPct}%)`);
  console.log();

  // Importance tracking
  if (importanceStats) {
    console.log(chalk.bold('Importance Tracking'));
    console.log(`  Entries tracked:   ${useColor ? chalk.cyan(importanceStats.tracked.toString()) : importanceStats.tracked}`);
    console.log(`  Average score:     ${useColor ? chalk.cyan(`${(importanceStats.avgScore * 100).toFixed(1)  }%`) : `${(importanceStats.avgScore * 100).toFixed(1)  }%`}`);
    console.log(`  Above threshold:   ${useColor ? chalk.green(importanceStats.aboveForgetThreshold.toString()) : importanceStats.aboveForgetThreshold}`);
    console.log(`  Below threshold:   ${useColor ? chalk.red(importanceStats.belowForgetThreshold.toString()) : importanceStats.belowForgetThreshold}`);
    console.log();
  }

  // Store info (verbose)
  if (options.verbose) {
    console.log(chalk.bold('Store Info'));
    console.log(`  Provider:     ${vectorStats.provider}`);
    console.log(`  Dimensions:   ${vectorStats.dimensions}`);
    console.log(`  Last updated: ${getRelativeTime(vectorStats.lastModified)}`);
    console.log(`  Store path:   ${vectorStorePath}`);
    console.log();
  }

  // Health assessment
  const healthyConditions = vectorStats.hot > 0 && vectorStats.total > 0;
  if (healthyConditions) {
    console.log(useColor ? chalk.green('✅ Memory lifecycle system healthy') : '✅ Memory lifecycle system healthy');
  } else {
    console.log(useColor ? chalk.yellow('⚠️  Memory lifecycle system needs attention') : '⚠️  Memory lifecycle system needs attention');
    if (vectorStats.hot === 0) {
      console.log(chalk.gray("   - No hot entries. Run 'ada memory embed' to index."));
    }
  }
  console.log();
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
      .option('--since <date>', 'Filter entries from this date (YYYY-MM-DD, today, yesterday)')
      .option('--until <date>', 'Filter entries up to this date (YYYY-MM-DD, today, yesterday)')
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
  )
  .addCommand(
    new Command('stats')
      .description('Show memory system health and metrics')
      .option('-d, --dir <path>', 'Project root directory', '.')
      .option('--json', 'Output as JSON')
      .option('--no-color', 'Disable colored output')
      .option('-v, --verbose', 'Include archive history')
      .action(async (options: MemoryStatsOptions) => {
        try {
          await executeStats(options);
        } catch (err) {
          const error = err as Error;
          console.error(chalk.red(`\n❌ Error: ${error.message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('export')
      .description('Export memory bank and archives to JSON')
      .option('-d, --dir <path>', 'Project root directory', '.')
      .option('-o, --output <file>', 'Output file path (default: stdout)')
      .option('--include-archives', 'Include archived memory banks')
      .action(async (options: MemoryExportOptions) => {
        try {
          await executeExport(options);
        } catch (err) {
          const error = err as Error;
          console.error(chalk.red(`\n❌ Error: ${error.message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('embed')
      .description('Initialize persistent vector store for three-tier memory (Phase 3.3)')
      .option('-d, --dir <path>', 'Project root directory', '.')
      .option('-f, --force', 'Force reindex even if store exists')
      .option('--json', 'Output as JSON')
      .option('-v, --verbose', 'Show detailed output')
      .action(async (options: MemoryEmbedOptions) => {
        try {
          await executeEmbed(options);
        } catch (err) {
          const error = err as Error;
          console.error(chalk.red(`\n❌ Error: ${error.message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('lifecycle')
      .description('Show memory lifecycle and tier statistics')
      .option('-d, --dir <path>', 'Project root directory', '.')
      .option('--json', 'Output as JSON')
      .option('--no-color', 'Disable colored output')
      .option('-v, --verbose', 'Show store details')
      .action(async (options: MemoryLifecycleOptions) => {
        try {
          await executeLifecycle(options);
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
