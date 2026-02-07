/**
 * `ada stop` — Graceful shutdown command.
 *
 * Signals ADA to stop after the current cycle completes.
 * Use --force for immediate termination.
 */

import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/** PID file location for watch mode signaling */
const PID_FILE = '.ada-watch.pid';

/**
 * Check if a process is running.
 */
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Send a signal to a process.
 */
function sendSignal(pid: number, signal: NodeJS.Signals): boolean {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

export const stopCommand = new Command('stop')
  .description('Graceful stop — finish current cycle, then exit')
  .option('-f, --force', 'Immediate termination (SIGKILL)')
  .option('-d, --dir <path>', 'Agents directory (default: "agents/")', 'agents')
  .action(
    async (options: {
      force?: boolean;
      dir: string;
    }) => {
      const cwd = process.cwd();
      const pidPath = path.join(cwd, options.dir, PID_FILE);

      console.log(options.force ? '🛑 ADA Force Stop' : '⏹️  ADA Graceful Stop');
      console.log();

      try {
        // Check for PID file (watch mode)
        const pidData = await fs.readFile(pidPath, 'utf-8').catch(() => null);

        if (pidData) {
          const pid = parseInt(pidData.trim(), 10);

          if (isNaN(pid)) {
            console.log('⚠️  Invalid PID file. Cleaning up...');
            await fs.unlink(pidPath).catch(() => {});
            return;
          }

          const running = isProcessRunning(pid);

          if (running) {
            const signal: NodeJS.Signals = options.force ? 'SIGKILL' : 'SIGTERM';
            const success = sendSignal(pid, signal);

            if (success) {
              console.log(`✅ Signal sent to ADA process (PID: ${pid})`);
              console.log(
                options.force
                  ? '   Process terminated immediately.'
                  : '   Process will exit after current cycle completes.'
              );
            } else {
              console.log(`❌ Failed to signal process ${pid}`);
            }
          } else {
            console.log('ℹ️  No active ADA watch mode found.');
            console.log('   PID file exists but process is not running.');
            console.log('   Cleaning up stale PID file...');
            await fs.unlink(pidPath).catch(() => {});
          }
        } else {
          console.log('ℹ️  No active ADA watch mode detected.');
          console.log('');
          console.log('   If ADA is running via external scheduler (cron, OpenClaw),');
          console.log('   use `ada pause` to prevent future cycles from executing.');
        }
      } catch (err) {
        console.error('❌ Stop failed:', (err as Error).message);
        process.exit(1);
      }
    }
  );
