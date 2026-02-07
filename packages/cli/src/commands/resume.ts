/**
 * `ada resume` — Resume dispatch cycles.
 *
 * Clears the paused flag in rotation.json, allowing dispatch
 * cycles to execute again.
 */

import { Command } from 'commander';
import { readRotationState, writeRotationState } from '@ada/core';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

export const resumeCommand = new Command('resume')
  .description('Resume dispatch — clear paused flag to allow cycles')
  .option('-d, --dir <path>', 'Agents directory (default: "agents/")', 'agents')
  .option('--no-commit', 'Skip git commit after resuming')
  .action(
    async (options: {
      dir: string;
      commit: boolean;
    }) => {
      const cwd = process.cwd();
      const statePath = path.join(cwd, options.dir, 'state', 'rotation.json');

      console.log('▶️  ADA Resume');
      console.log();

      try {
        // Read current state
        const state = await readRotationState(statePath);

        if (!state.paused) {
          console.log('ℹ️  ADA is not paused — already running.');
          console.log(`   Last run: ${state.last_run || '(never)'}`);
          console.log(`   Cycle count: ${state.cycle_count}`);
          return;
        }

        // Store pause info for display
        const pausedAt = state.paused_at;
        const pauseReason = state.pause_reason;

        // Clear paused state
        delete state.paused;
        delete state.paused_at;
        delete state.pause_reason;

        // Write updated state
        await writeRotationState(statePath, state);

        console.log('✅ ADA is now resumed.');
        console.log();
        console.log('   Pause info (cleared):');
        console.log(`   - Paused at: ${pausedAt || '(unknown)'}`);
        console.log(`   - Reason: ${pauseReason || '(none)'}`);
        console.log();
        console.log('   Dispatch cycles will now execute normally.');

        // Commit the change
        if (options.commit) {
          try {
            const relativeStatePath = path.relative(cwd, statePath);
            execSync(`git add "${relativeStatePath}"`, { cwd, stdio: 'pipe' });
            execSync('git commit -m "chore(agents): resume dispatch"', {
              cwd,
              stdio: 'pipe',
            });
            execSync('git push', { cwd, stdio: 'pipe' });
            console.log('📤 Changes committed and pushed.');
          } catch {
            console.log('⚠️  Git commit skipped (no changes or git error).');
          }
        }
      } catch (err) {
        console.error('❌ Resume failed:', (err as Error).message);
        console.log();
        console.log('   Make sure you are in a repo with ADA initialized.');
        console.log('   Run `ada init` first if needed.');
        process.exit(1);
      }
    }
  );
