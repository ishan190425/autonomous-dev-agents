/**
 * `ada config` — View and edit agent configuration.
 */

import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { readRoster } from '@ada/core';

export const configCommand = new Command('config')
  .description('View and edit agent team configuration')
  .option('-d, --dir <path>', 'Agents directory (default: "agents/")', 'agents')
  .addCommand(
    new Command('show')
      .description('Show current configuration')
      .action(async () => {
        const options = configCommand.opts() as { dir: string };
        const cwd = process.cwd();
        const rosterPath = path.resolve(cwd, options.dir, 'roster.json');

        try {
          const roster = await readRoster(rosterPath);
          console.log('🤖 ADA — Configuration\n');
          console.log(`Company:  ${roster.company}`);
          console.log(`Product:  ${roster.product}`);
          console.log(`Tagline:  ${roster.tagline}`);
          console.log(`Roles:    ${roster.roles.length}`);
          console.log(`Rotation: ${roster.rotation_order.join(' → ')}\n`);

          console.log('📋 Roles:');
          for (const role of roster.roles) {
            console.log(`  ${role.emoji} ${role.id}: ${role.name} — ${role.title}`);
            console.log(`     Focus: ${role.focus.join(', ')}`);
          }
          console.log('');
        } catch (err) {
          console.error('❌ Could not read config:', (err as Error).message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('edit')
      .description('Open roster.json in your editor')
      .action(async () => {
        const options = configCommand.opts() as { dir: string };
        const cwd = process.cwd();
        const rosterPath = path.resolve(cwd, options.dir, 'roster.json');

        const editor = process.env['EDITOR'] || process.env['VISUAL'] || 'vim';
        console.log(`Opening ${rosterPath} in ${editor}...`);

        const { execSync } = await import('node:child_process');
        try {
          execSync(`${editor} "${rosterPath}"`, { stdio: 'inherit' });
        } catch {
          console.error(`❌ Could not open editor: ${editor}`);
          console.error('   Set $EDITOR environment variable to your preferred editor.\n');
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('path')
      .description('Print the path to the agents directory')
      .action(() => {
        const options = configCommand.opts() as { dir: string };
        const cwd = process.cwd();
        console.log(path.resolve(cwd, options.dir));
      })
  );
