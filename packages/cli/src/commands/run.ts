/**
 * `ada run` — Execute one dispatch cycle.
 *
 * Loads context, determines the current role, executes one action,
 * updates the memory bank, and advances the rotation.
 */

import { Command } from 'commander';
import * as path from 'node:path';
import { loadContext, completeDispatch, checkCompression } from '@ada/core';

export const runCommand = new Command('run')
  .description('Execute one dispatch cycle as the current role')
  .option('-d, --dir <path>', 'Agents directory (default: "agents/")', 'agents')
  .option('--dry-run', 'Show what would happen without executing')
  .option('-w, --watch', 'Run continuously (execute a cycle, then wait)')
  .option('-i, --interval <minutes>', 'Interval between cycles in watch mode', '30')
  .action(async (options: { dir: string; dryRun?: boolean; watch?: boolean; interval: string }) => {
    const cwd = process.cwd();

    console.log('🤖 ADA — Dispatch Cycle\n');

    try {
      const context = await loadContext(cwd, { agentsDir: options.dir });

      if (!context) {
        console.error('❌ No roles configured. Run `ada init` first or check roster.json.');
        process.exit(1);
      }

      const { role, state } = context;
      console.log(`🎭 Role:  ${role.emoji} ${role.name} (${role.title})`);
      console.log(`🔄 Cycle: ${state.cycle_count + 1}`);
      console.log(`📋 Focus: ${role.focus.join(', ')}\n`);

      if (options.dryRun) {
        console.log('🏃 DRY RUN — no changes will be made\n');
        console.log(`Available actions:`);
        for (const action of role.actions) {
          console.log(`  • ${action}`);
        }
        console.log('\nMemory bank loaded. Playbook ready. Would execute one action.\n');
        return;
      }

      // TODO: Integrate with LLM to actually pick and execute an action
      // For now, advance rotation as a placeholder
      console.log('⏳ Executing dispatch cycle...\n');

      // Check compression
      const compressed = await checkCompression(context);
      if (compressed) {
        console.log('📦 Memory bank compressed\n');
      }

      // Complete the dispatch
      const result = await completeDispatch(context, '(manual run — action pending)');
      console.log(`✅ Cycle ${result.cycle} complete`);
      console.log(`   Role: ${result.roleName}`);
      console.log(`   Time: ${result.timestamp}\n`);
    } catch (err) {
      console.error('❌ Dispatch failed:', (err as Error).message);
      process.exit(1);
    }
  });
