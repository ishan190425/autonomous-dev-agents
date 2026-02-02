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

const program = new Command();

program
  .name('ada')
  .description('🤖 Autonomous Dev Agents — AI agent teams for any repo')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(runCommand);
program.addCommand(statusCommand);
program.addCommand(configCommand);

program.parse();
