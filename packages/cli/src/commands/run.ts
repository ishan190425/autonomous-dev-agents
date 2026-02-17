/**
 * `ada run` — Execute one dispatch cycle.
 *
 * Loads context, determines the current role, executes one action,
 * updates the memory bank, and advances the rotation.
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
  .action(
    async (options: {
      dir: string;
      dryRun?: boolean;
      watch?: boolean;
      interval: string;
    }) => {
      const cwd = process.cwd();

      const cycleNumber = await getCycleNumber(cwd, options.dir);
      console.log(`🏭 ADA Dispatch Cycle ${cycleNumber}\n`);

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
        
        const actionResult = await executeAgentAction(context, executorType);
        
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
