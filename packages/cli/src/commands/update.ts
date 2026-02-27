/**
 * `ada update` — Self-updating agent command.
 *
 * Updates the @ada-ai/cli npm package, diffs old vs new templates,
 * and spawns the configured executor to autonomously merge changes
 * into the repo's agents/ directory while preserving customizations.
 */

import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
import chalk from 'chalk';
import {
  snapshotTemplates,
  diffSnapshots,
  readCurrentAgentFiles,
  buildUpdatePrompt,
} from '@ada-ai/core/update.js';
import type { ExecutorType } from '@ada-ai/core';

const exec = promisify(execCb);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UpdateOptions {
  dryRun: boolean;
  executor?: string;
  skipNpm: boolean;
  noCommit: boolean;
}

/**
 * Resolve the templates directory shipped with @ada-ai/cli.
 */
function resolveTemplatesDir(): string {
  // Walk up from packages/cli/dist/commands/ → packages/cli/templates/
  return path.resolve(__dirname, '..', '..', 'templates');
}

/**
 * Read the installed CLI version from package.json.
 */
async function readCliVersion(): Promise<string> {
  const pkgPath = path.resolve(__dirname, '..', '..', 'package.json');
  const raw = await fs.readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(raw);
  return pkg.version ?? 'unknown';
}

/**
 * Detect whether the CLI was installed globally or locally.
 */
function isGlobalInstall(): boolean {
  const resolved = path.resolve(__dirname);
  // If running from a project's node_modules, it's local
  return !resolved.includes('node_modules');
}

/**
 * Spawn the appropriate executor with the update prompt.
 */
async function spawnExecutor(
  executorType: string,
  prompt: string,
): Promise<{ stdout: string; stderr: string }> {
  // Write prompt to temp file to avoid shell escaping issues
  const tmpFile = path.join(os.tmpdir(), `ada-update-${Date.now()}.md`);
  await fs.writeFile(tmpFile, prompt, 'utf-8');

  let command: string;

  switch (executorType as ExecutorType) {
    case 'claude-code':
      command = `cat "${tmpFile}" | claude -p -`;
      break;
    case 'codex':
      command = `cat "${tmpFile}" | codex --quiet -`;
      break;
    case 'clawdbot':
      command = `clawdbot agent --local --message "$(cat "${tmpFile}")" --json --timeout 600`;
      break;
    default:
      throw new Error(`Unknown executor type: ${executorType}`);
  }

  try {
    const result = await exec(command, {
      maxBuffer: 10 * 1024 * 1024, // 10 MB
      timeout: 10 * 60 * 1000, // 10 minutes
    });
    return result;
  } finally {
    // Clean up temp file
    await fs.unlink(tmpFile).catch(() => {});
  }
}

export const updateCommand = new Command('update')
  .description(
    'Update ADA framework — pulls new templates and merges into agents/',
  )
  .option('--dry-run', 'Show diffs and prompt without executing', false)
  .option(
    '--executor <type>',
    'Override executor type (claude-code, codex, clawdbot)',
  )
  .option('--skip-npm', 'Skip npm update, just diff current templates', false)
  .option('--no-commit', 'Apply changes but don\'t auto-commit')
  .action(async (options: UpdateOptions) => {
    try {
      const repoRoot = process.cwd();
      const templatesDir = resolveTemplatesDir();
      const executorType =
        options.executor ||
        process.env.ADA_EXECUTOR ||
        'claude-code';

      // 1. Snapshot current templates
      console.log(chalk.blue('Snapshotting current templates...'));
      const oldVersion = await readCliVersion();
      const oldSnapshot = await snapshotTemplates(templatesDir);

      // 2. npm update (unless --skip-npm)
      if (!options.skipNpm) {
        console.log(chalk.blue('Updating @ada-ai/cli and @ada-ai/core...'));
        const npmCmd = isGlobalInstall()
          ? 'npm update -g @ada-ai/cli @ada-ai/core'
          : 'npm update @ada-ai/cli @ada-ai/core';
        try {
          await exec(npmCmd, { timeout: 120_000 });
          console.log(chalk.green('npm update complete.'));
        } catch (err) {
          console.error(
            chalk.yellow(
              'npm update failed — continuing with current version.',
            ),
          );
          console.error(
            chalk.yellow(
              err instanceof Error ? err.message : String(err),
            ),
          );
        }
      }

      // 3. Snapshot new templates and diff
      const newVersion = await readCliVersion();
      const newSnapshot = await snapshotTemplates(templatesDir);
      const diffs = diffSnapshots(oldSnapshot, newSnapshot);

      if (diffs.length === 0) {
        console.log(chalk.green('Already up to date — no template changes.'));
        return;
      }

      // 4. Print diff summary
      console.log(
        chalk.blue(
          `\nFound ${diffs.length} template change(s) (v${oldVersion} → v${newVersion}):`,
        ),
      );
      for (const diff of diffs) {
        const icon =
          diff.type === 'added'
            ? chalk.green('+')
            : diff.type === 'removed'
              ? chalk.red('-')
              : chalk.yellow('~');
        console.log(`  ${icon} ${diff.path} (${diff.type})`);
      }
      console.log('');

      // 5. Read current agent files
      const changedPaths = diffs.map((d) => d.path);
      const currentAgentFiles = await readCurrentAgentFiles(
        repoRoot,
        changedPaths,
      );

      // 6. Build prompt
      const prompt = buildUpdatePrompt({
        oldVersion,
        newVersion,
        templateDiffs: diffs,
        currentAgentFiles,
        executorType,
        repoRoot,
        noCommit: options.noCommit,
      });

      // 7. Dry run — print and exit
      if (options.dryRun) {
        console.log(chalk.blue('=== Generated Update Prompt ===\n'));
        console.log(prompt);
        console.log(chalk.blue('\n=== End of Prompt ==='));
        console.log(
          chalk.yellow(
            '\nDry run — no changes applied. Remove --dry-run to execute.',
          ),
        );
        return;
      }

      // 8. Spawn executor
      console.log(
        chalk.blue(
          `Spawning ${executorType} executor to apply updates...\n`,
        ),
      );
      const result = await spawnExecutor(executorType, prompt);

      if (result.stdout) {
        console.log(result.stdout);
      }
      if (result.stderr) {
        console.error(chalk.yellow(result.stderr));
      }

      console.log(
        chalk.green(
          `\nUpdate complete (v${oldVersion} → v${newVersion}).`,
        ),
      );
    } catch (error) {
      console.error(chalk.red('Update failed:'));
      console.error(
        chalk.red(
          error instanceof Error ? error.message : String(error),
        ),
      );
      process.exit(1);
    }
  });
