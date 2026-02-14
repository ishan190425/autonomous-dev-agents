#!/usr/bin/env node

/**
 * @ada/cli — Autonomous Dev Agents CLI
 *
 * Set up and run autonomous AI dev agent teams on any repo.
 *
 * Usage:
 *   ada init       Initialize agent team in current repo
 *   ada run        Execute one dispatch cycle
 *   ada status     Show rotation state and last actions
 *   ada config     View/edit agent configuration
 */

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';
import { statusCommand } from './commands/status.js';
import { configCommand } from './commands/config.js';
import { memoryCommand } from './commands/memory.js';
import { stopCommand } from './commands/stop.js';
import { pauseCommand } from './commands/pause.js';
import { resumeCommand } from './commands/resume.js';
import { observeCommand } from './commands/observe.js';
import { costsCommand } from './commands/costs.js';
import { dispatchCommand } from './commands/dispatch.js';
import { insightsCommand } from './commands/insights.js';
import { issuesCommand } from './commands/issues.js';
import { heatCommand } from './commands/heat.js';
import { reflexionCommand } from './commands/reflexion.js';
import { showBanner } from './lib/banner.js';

const VERSION = '1.0.0-alpha';

const program = new Command();

program
  .name('ada')
  .description('🤖 Autonomous Dev Agents — AI agent teams for any repo')
  .version(VERSION, '-v, --version', 'Output the current version')
  .option('--banner', 'Show the ADA banner')
  .hook('preAction', (thisCommand) => {
    // Show banner if --banner flag is passed
    if (thisCommand.opts().banner) {
      showBanner({ force: true });
    }
  });

program.addCommand(initCommand);
program.addCommand(runCommand);
program.addCommand(statusCommand);
program.addCommand(configCommand);
program.addCommand(memoryCommand);
program.addCommand(dispatchCommand);
program.addCommand(insightsCommand);
program.addCommand(issuesCommand);
program.addCommand(heatCommand);
program.addCommand(reflexionCommand);
program.addCommand(stopCommand);
program.addCommand(pauseCommand);
program.addCommand(resumeCommand);
program.addCommand(observeCommand);
program.addCommand(costsCommand);

// Show compact banner if no command is provided
if (process.argv.length === 2) {
  showBanner({ compact: true });
  program.help();
}

// Handle --banner standalone (without subcommand)
// preAction hook only fires with subcommands, so we catch it here
if (process.argv.includes('--banner') && process.argv.length === 3) {
  showBanner({ force: true });
  process.exit(0);
}

program.parse();
