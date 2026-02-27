/**
 * @ada/core — Self-update utilities
 *
 * Core diffing and prompt-building logic for `ada update`.
 * Compares template snapshots, detects changes, and builds
 * an executor prompt for autonomous agent-file migration.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single file-level diff between two template snapshots. */
export interface TemplateDiff {
  /** Relative path inside the templates dir (e.g. "agents/rules/RULES.md") */
  path: string;
  type: 'added' | 'modified' | 'removed';
  oldContent?: string;
  newContent?: string;
}

/** Everything the executor needs to perform an update. */
export interface UpdateContext {
  oldVersion: string;
  newVersion: string;
  templateDiffs: TemplateDiff[];
  currentAgentFiles: { path: string; content: string }[];
  executorType: string;
  repoRoot: string;
  noCommit?: boolean;
}

// ---------------------------------------------------------------------------
// Snapshot helpers
// ---------------------------------------------------------------------------

/**
 * Recursively read every file under `dir` into a Map<relativePath, content>.
 */
export async function snapshotTemplates(
  templatesDir: string,
): Promise<Map<string, string>> {
  const snap = new Map<string, string>();
  await walk(templatesDir, templatesDir, snap);
  return snap;
}

async function walk(
  root: string,
  dir: string,
  out: Map<string, string>,
): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    // Directory doesn't exist — return empty snapshot
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(root, full, out);
    } else if (entry.isFile()) {
      const rel = path.relative(root, full);
      const content = await fs.readFile(full, 'utf-8');
      out.set(rel, content);
    }
  }
}

// ---------------------------------------------------------------------------
// Diffing
// ---------------------------------------------------------------------------

/**
 * Compare two template snapshots and return the list of changes.
 */
export function diffSnapshots(
  oldSnap: Map<string, string>,
  newSnap: Map<string, string>,
): TemplateDiff[] {
  const diffs: TemplateDiff[] = [];

  // Files added or modified
  for (const [filePath, newContent] of newSnap) {
    const oldContent = oldSnap.get(filePath);
    if (oldContent === undefined) {
      diffs.push({ path: filePath, type: 'added', newContent });
    } else if (oldContent !== newContent) {
      diffs.push({ path: filePath, type: 'modified', oldContent, newContent });
    }
  }

  // Files removed
  for (const filePath of oldSnap.keys()) {
    if (!newSnap.has(filePath)) {
      diffs.push({
        path: filePath,
        type: 'removed',
        oldContent: oldSnap.get(filePath)!,
      });
    }
  }

  return diffs;
}

// ---------------------------------------------------------------------------
// Current agent files
// ---------------------------------------------------------------------------

/**
 * Read the repo's current files that correspond to changed template paths.
 */
export async function readCurrentAgentFiles(
  repoRoot: string,
  changedPaths: string[],
): Promise<{ path: string; content: string }[]> {
  const results: { path: string; content: string }[] = [];

  for (const relPath of changedPaths) {
    const fullPath = path.join(repoRoot, relPath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      results.push({ path: relPath, content });
    } catch {
      // File doesn't exist in the repo yet — skip it
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

const MAX_FILE_LINES = 300;

function truncate(content: string): string {
  const lines = content.split('\n');
  if (lines.length <= MAX_FILE_LINES) return content;
  return (
    `${lines.slice(0, MAX_FILE_LINES).join('\n') 
    }\n\n... (truncated — ${lines.length - MAX_FILE_LINES} more lines)`
  );
}

/**
 * Build the prompt that an executor will use to autonomously apply updates.
 */
export function buildUpdatePrompt(ctx: UpdateContext): string {
  const lines: string[] = [];

  lines.push(
    `You are performing an ADA framework update from v${ctx.oldVersion} to v${ctx.newVersion}.`,
  );
  lines.push('');

  // --- Template changes ---
  lines.push('## Template Changes (what changed in the framework)');
  lines.push('');

  for (const diff of ctx.templateDiffs) {
    lines.push(`### ${diff.type.toUpperCase()}: ${diff.path}`);
    lines.push('');
    lines.push('OLD:');
    lines.push('```');
    lines.push(diff.oldContent ? truncate(diff.oldContent) : '(new file)');
    lines.push('```');
    lines.push('');
    lines.push('NEW:');
    lines.push('```');
    lines.push(diff.newContent ? truncate(diff.newContent) : '(deleted)');
    lines.push('```');
    lines.push('');
  }

  // --- Current repo files ---
  lines.push('## Current Repo Files (what the user has)');
  lines.push('');

  for (const file of ctx.currentAgentFiles) {
    lines.push(`### ${file.path}`);
    lines.push('```');
    lines.push(truncate(file.content));
    lines.push('```');
    lines.push('');
  }

  // --- Instructions ---
  lines.push('## Instructions');
  lines.push('');
  lines.push(
    '1. Merge the framework template changes into this repo\'s agents/ directory.',
  );
  lines.push('2. PRESERVE all user customizations:');
  lines.push(
    '   - Custom roles added to roster.json (keep them, merge new fields if any)',
  );
  lines.push(
    '   - Custom playbook content (append new actions, don\'t remove existing ones)',
  );
  lines.push(
    '   - Memory bank content, rotation state, stream — DO NOT touch these',
  );
  lines.push('   - Custom rules added by the user');
  lines.push('3. APPLY new framework changes:');
  lines.push('   - New or updated rules in RULES.md');
  lines.push('   - New playbook actions or updated dispatch protocol');
  lines.push('   - New fields in roster.json schema');
  lines.push('   - Updated DISPATCH.md sections');
  lines.push('4. DO NOT modify these files (they contain runtime state):');
  lines.push('   - agents/state/rotation.json');
  lines.push('   - agents/memory/bank.md');
  lines.push('   - agents/memory/stream.jsonl');
  lines.push('   - agents/memory/archives/*');
  lines.push('   - agents/memory/heat.jsonl');

  // Executor-specific config
  lines.push('5. Create/update executor-specific configuration:');
  lines.push(`   - For executor "${ctx.executorType}":`);
  if (ctx.executorType === 'claude-code') {
    lines.push(
      '     - Create or update CLAUDE.md at repo root with ADA dispatch protocol instructions',
    );
  } else if (ctx.executorType === 'codex') {
    lines.push('     - Create or update .codex/instructions.md');
  } else {
    lines.push('     - No additional config needed');
  }

  // Commit instruction
  if (!ctx.noCommit) {
    lines.push(
      `6. Commit all changes: git add agents/ CLAUDE.md .codex/ && git commit -m "chore(agents): update ADA framework from v${ctx.oldVersion} to v${ctx.newVersion}"`,
    );
  }

  return lines.join('\n');
}
