/**
 * `ada run` — Execute one dispatch cycle.
 *
 * Loads context, determines the current role, executes one action,
 * updates the memory bank, and advances the rotation.
 *
 * Terminal Mode (--mode=terminal):
 * Enables shell command execution for CLI-based benchmarks like Terminal-Bench.
 * Agents can execute shell commands, verify results, and diagnose issues.
 *
 * @see docs/engineering/terminal-mode-technical-spec.md
 * @see Issue #125 — Terminal Mode for shell-based benchmarks
 */

import { Command } from 'commander';
import { 
  loadContext, 
  completeDispatch, 
  checkCompression,
  executeAgentAction,
  readRotationState
} from '@ada-ai/core';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import chalk from 'chalk';
import { createTerminalRunner, type TerminalRunner } from '../lib/terminal-runner.js';

/**
 * Dispatch mode for cycle execution.
 * - default: Standard agent execution (file edits, GitHub ops)
 * - terminal: Shell command execution (benchmarks, CLI tasks)
 */
export type DispatchMode = 'default' | 'terminal';

/**
 * Get the current cycle number for display
 */
async function getCycleNumber(cwd: string, agentsDir: string): Promise<number> {
  try {
    const statePath = path.join(cwd, agentsDir, 'state', 'rotation.json');
    const state = await readRotationState(statePath);
    return state.cycle_count + 1;
  } catch {
    return 1;
  }
}

/**
 * Parse integer CLI option
 */
function parseIntOption(value: string, defaultValue: number): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const runCommand = new Command('run')
  .description('Execute one dispatch cycle as the current role')
  .option('-d, --dir <path>', 'Agents directory (default: "agents/")', 'agents')
  .option('--dry-run', 'Show what would happen without executing')
  .option('-w, --watch', 'Run continuously (execute a cycle, then wait)')
  .option(
    '-i, --interval <minutes>',
    'Interval between cycles in watch mode',
    '30'
  )
  // Terminal Mode options (Issue #125)
  .option(
    '-m, --mode <mode>',
    'Dispatch mode: "default" or "terminal" for shell-based execution',
    'default'
  )
  .option(
    '--max-commands <count>',
    'Maximum commands per cycle in terminal mode (default: 50)',
    '50'
  )
  .option(
    '--command-timeout <ms>',
    'Per-command timeout in milliseconds (default: 60000)',
    '60000'
  )
  .option(
    '--shell <path>',
    'Shell to use for terminal mode (default: auto-detect)'
  )
  .option('--verbose', 'Enable verbose output')
  .option('--json', 'Output results as JSON')
  .option('--quiet', 'Minimal output')
  .action(
    async (options: {
      dir: string;
      dryRun?: boolean;
      watch?: boolean;
      interval: string;
      mode: string;
      maxCommands: string;
      commandTimeout: string;
      shell?: string;
      verbose?: boolean;
      json?: boolean;
      quiet?: boolean;
    }) => {
      const cwd = process.cwd();
      const isTerminalMode = options.mode === 'terminal';

      const cycleNumber = await getCycleNumber(cwd, options.dir);
      
      // Initialize terminal runner if in terminal mode
      let terminalRunner: TerminalRunner | null = null;
      if (isTerminalMode) {
        terminalRunner = createTerminalRunner({
          maxCommands: parseIntOption(options.maxCommands, 50),
          commandTimeout: parseIntOption(options.commandTimeout, 60000),
          cwd,
          shell: options.shell ?? '',
          verbose: options.verbose ?? false,
          json: options.json ?? false,
          quiet: options.quiet ?? false,
        });

        if (!options.quiet && !options.json) {
          console.log(chalk.bold.cyan(`🖥️  ADA Terminal Mode — Cycle ${cycleNumber}\n`));
          console.log(chalk.gray('  Mode: Shell command execution'));
          console.log(chalk.gray(`  Max commands: ${options.maxCommands}`));
          console.log(chalk.gray(`  Timeout: ${options.commandTimeout}ms`));
        }

        try {
          await terminalRunner.initialize();
          if (!options.quiet && !options.json) {
            console.log(chalk.green('  ✓ Terminal initialized\n'));
          }
        } catch (err) {
          console.error(chalk.red('❌ Failed to initialize terminal mode:'), (err as Error).message);
          process.exit(1);
        }
      } else {
        console.log(`🏭 ADA Dispatch Cycle ${cycleNumber}\n`);
      }

      try {
        // Check for paused state before dispatch
        const statePath = path.join(cwd, options.dir, 'state', 'rotation.json');
        const initialState = await readRotationState(statePath).catch(() => null);
        
        if (initialState?.paused) {
          console.log('⏸️  ADA is paused.');
          console.log();
          console.log(`   Paused at: ${initialState.paused_at || '(unknown)'}`);
          if (initialState.pause_reason) {
            console.log(`   Reason: ${initialState.pause_reason}`);
          }
          console.log();
          console.log('   Use `ada resume` to continue dispatch cycles.');
          process.exit(0);
        }

        // Phase 1: Context Load
        console.log('📋 Phase 1: Loading context...');
        const context = await loadContext(cwd, { agentsDir: options.dir });

        if (!context) {
          console.error(
            '❌ No roles configured. Run `ada init` first or check roster.json.'
          );
          process.exit(1);
        }

        const { role, state } = context;
        console.log('✅ Context loaded');
        console.log(`🎭 Role:  ${role.emoji} ${role.name} (${role.title})`);
        console.log(`🔄 Cycle: ${state.cycle_count + 1}`);
        console.log(`📋 Focus: ${role.focus.join(', ')}\n`);
        
        // Phase 2: Situational Awareness
        console.log('🔍 Phase 2: Situational awareness...');
        console.log('✅ Memory bank and role playbook ready\n');

        if (options.dryRun) {
          console.log('🏃 DRY RUN — no changes will be made\n');
          console.log('Available actions:');
          for (const action of role.actions) {
            console.log(`  • ${action}`);
          }
          console.log(
            '\nMemory bank loaded. Playbook ready. Would execute one action.\n'
          );
          return;
        }

        // Phase 3: Execute agent action
        console.log('⚙️ Phase 3: Executing agent action...\n');
        
        // Read executor from lock file if available (Issue #64 — Claude Code Integration)
        let executorType: string | undefined;
        try {
          const lockPath = path.join(cwd, options.dir, 'state', '.dispatch.lock');
          const lockContent = await fs.readFile(lockPath, 'utf-8');
          const lock = JSON.parse(lockContent) as { executor?: string };
          executorType = lock.executor;
        } catch {
          // Lock file doesn't exist or is invalid — use default
        }
        
        // Execute action based on mode
        let actionResult: Awaited<ReturnType<typeof executeAgentAction>>;
        
        if (isTerminalMode && terminalRunner) {
          // Terminal Mode: Pass terminal runner context to agent execution
          // The agent executor will use this to execute shell commands
          actionResult = await executeAgentAction(context, executorType, {
            terminalRunner,
            onCommand: async (command: string) => {
              // Execute command through terminal runner
              const result = await terminalRunner.executeAction({
                type: 'execute',
                command,
              });
              return {
                success: result.success,
                stdout: result.execution?.stdout ?? '',
                stderr: result.execution?.stderr ?? '',
                exitCode: result.execution?.exitCode ?? -1,
              };
            },
          });
          
          // Show terminal session summary
          if (!options.quiet && !options.json) {
            const session = terminalRunner.finalize(actionResult.action);
            console.log(chalk.gray('\n📊 Terminal Session Summary:'));
            console.log(chalk.gray(`   Commands: ${session.commandsExecuted} (${session.commandsSucceeded} ✓, ${session.commandsFailed} ✗)`));
            console.log(chalk.gray(`   Duration: ${session.totalDurationMs}ms`));
            console.log();
          }
        } else {
          // Default mode: Standard agent execution
          actionResult = await executeAgentAction(context, executorType);
        }
        
        if (actionResult.success) {
          console.log(`✅ Action completed: ${actionResult.action}`);
          console.log(`📝 Details: ${actionResult.details}`);
          
          if (actionResult.createdIssues && actionResult.createdIssues.length > 0) {
            console.log(`📋 Created issues: #${actionResult.createdIssues.join(', #')}`);
          }
          
          if (actionResult.createdPRs && actionResult.createdPRs.length > 0) {
            console.log(`🔀 Created PRs: #${actionResult.createdPRs.join(', #')}`);
          }
          
          if (actionResult.modifiedFiles && actionResult.modifiedFiles.length > 0) {
            console.log(`📄 Modified files: ${actionResult.modifiedFiles.length}`);
          }
          
          console.log(); // Empty line
        } else {
          console.error(`❌ Action failed: ${actionResult.action}`);
          console.error(`💥 Error: ${actionResult.error || actionResult.details}`);
          console.log(); // Empty line
        }

        // Phase 5: Check compression
        console.log('📦 Phase 5: Checking compression...');
        const compressed = await checkCompression(context);
        if (compressed) {
          console.log('✅ Memory bank compressed\n');
        } else {
          console.log('ℹ️  No compression needed\n');
        }

        // Phase 7: Complete the dispatch
        console.log('🔄 Phase 7: Advancing rotation...');
        const result = await completeDispatch(
          context,
          actionResult.success ? actionResult.action : 'Action execution failed'
        );
        console.log(`✅ Cycle ${result.cycle} complete`);
        console.log('📊 Summary:');
        console.log(`   Role: ${result.roleName}`);
        console.log(`   Action: ${result.action}`);
        console.log('   Next: Advancing to next role in rotation');
        console.log(`   Time: ${new Date(result.timestamp).toLocaleString()}\n`);
      } catch (err) {
        console.error('❌ Dispatch failed:', (err as Error).message);
        process.exit(1);
      }
    }
  );
