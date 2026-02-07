/**
 * `ada pause` — Pause dispatch cycles.
 *
 * Sets a paused flag in rotation.json to prevent future cycles
 * from executing until `ada resume` is called.
 */

import { Command } from 'commander';
import { readRotationState, writeRotationState } from '@ada/core';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

export const pauseCommand = new Command('pause')
  .description('Pause dispatch — set paused flag to prevent future cycles')
  .option('-r, --reason <text>', 'Reason for pausing')
  .option('-d, --dir <path>', 'Agents directory (default: "agents/")', 'agents')
  .option('--no-commit', 'Skip git commit after pausing')
  .action(
    async (options: {
      reason?: string;
      dir: string;
      commit: boolean;
    }) => {
      const cwd = process.cwd();
      const statePath = path.join(cwd, options.dir, 'state', 'rotation.json');

      console.log('⏸️  ADA Pause');
      console.log();

      try {
        // Read current state
        const state = await readRotationState(statePath);

        if (state.paused) {
          console.log('ℹ️  ADA is already paused.');
          console.log(`   Paused at: ${state.paused_at}`);
          if (state.pause_reason) {
            console.log(`   Reason: ${state.pause_reason}`);
          }
          return;
        }

        // Set paused state
        const now = new Date().toISOString();
        const reason = options.reason || 'Manual pause via ada pause';

        state.paused = true;
        state.paused_at = now;
        state.pause_reason = reason;

        // Write updated state
        await writeRotationState(statePath, state);

        console.log('✅ ADA is now paused.');
        console.log(`   Time: ${now}`);
        console.log(`   Reason: ${reason}`);
        console.log();
        console.log('   Future dispatch cycles will be skipped until you run:');
        console.log('   ada resume');

        // Commit the change
        if (options.commit) {
          try {
            const relativeStatePath = path.relative(cwd, statePath);
            execSync(`git add "${relativeStatePath}"`, { cwd, stdio: 'pipe' });
            execSync(
              `git commit -m "chore(agents): pause dispatch — ${reason.substring(0, 50)}"`,
              { cwd, stdio: 'pipe' }
            );
            execSync('git push', { cwd, stdio: 'pipe' });
            console.log();
            console.log('📤 Changes committed and pushed.');
          } catch {
            console.log();
            console.log('⚠️  Git commit skipped (no changes or git error).');
          }
        }
      } catch (err) {
        console.error('❌ Pause failed:', (err as Error).message);
        console.log();
        console.log('   Make sure you are in a repo with ADA initialized.');
        console.log('   Run `ada init` first if needed.');
        process.exit(1);
      }
    }
  );
