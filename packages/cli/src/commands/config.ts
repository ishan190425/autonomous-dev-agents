/**
 * `ada config` — View and edit agent configuration.
 */

import { Command } from 'commander';
import * as path from 'node:path';
import chalk from 'chalk';
import { readRoster, loadAgentConfig, writeAgentConfig, sendTestNotification, type NotificationChannel } from '@ada-ai/core';

export const configCommand = new Command('config')
  .description('View and edit agent team configuration')
  .option('-d, --dir <path>', 'Agents directory (default: "agents/")', 'agents')
  .addCommand(
    new Command('show')
      .description('Show current configuration')
      .action(async () => {
        const options = configCommand.opts() as { dir: string };
        const cwd = process.cwd();
        const dir = options.dir ?? 'agents';
        const rosterPath = path.resolve(cwd, dir, 'roster.json');

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
            console.log(
              `  ${role.emoji} ${role.id}: ${role.name} — ${role.title}`
            );
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
        const dir = options.dir ?? 'agents';
        const rosterPath = path.resolve(cwd, dir, 'roster.json');

        const editor = process.env['EDITOR'] || process.env['VISUAL'] || 'vim';
        console.log(`Opening ${rosterPath} in ${editor}...`);

        const { execSync } = await import('node:child_process');
        try {
          execSync(`${editor} "${rosterPath}"`, { stdio: 'inherit' });
        } catch {
          console.error(`❌ Could not open editor: ${editor}`);
          console.error(
            '   Set $EDITOR environment variable to your preferred editor.\n'
          );
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
        const dir = options.dir ?? 'agents';
        console.log(path.resolve(cwd, dir));
      })
  )
  .addCommand(
    new Command('notifications')
      .description('Manage notification settings')
      .addCommand(
        new Command('show')
          .description('Show current notification configuration')
          .action(() => {
            const options = configCommand.opts() as { dir: string };
            const cwd = process.cwd();
            const configPath = path.resolve(cwd, options.dir, 'config.json');

            try {
              const config = loadAgentConfig(configPath);
              const notifications = config?.notifications;

              console.log('🔔 ADA — Notification Configuration\n');

              if (!notifications || !notifications.enabled) {
                console.log(chalk.gray('Notifications: disabled\n'));
                console.log('To enable notifications, run:');
                console.log(chalk.cyan('  ada config notifications enable\n'));
                return;
              }

              console.log(`Notifications: ${chalk.green('enabled')}\n`);

              const channels = notifications.channels || {};
              
              // Slack
              if (channels.slack?.enabled) {
                const url = channels.slack.webhookUrl || '';
                const maskedUrl = url ? (url.substring(0, 30) + '...') : 'not set';
                console.log(`  ${chalk.green('✓')} Slack: ${chalk.green('enabled')}`);
                console.log(`    Webhook: ${maskedUrl}\n`);
              } else {
                console.log(`  ${chalk.gray('○')} Slack: ${chalk.gray('disabled')}\n`);
              }

              // Telegram
              if (channels.telegram?.enabled) {
                const token = channels.telegram.botToken || '';
                const chatId = channels.telegram.chatId || '';
                const maskedToken = token ? (token.substring(0, 10) + '...') : 'not set';
                console.log(`  ${chalk.green('✓')} Telegram: ${chalk.green('enabled')}`);
                console.log(`    Bot Token: ${maskedToken}`);
                console.log(`    Chat ID: ${chatId || 'not set'}\n`);
              } else {
                console.log(`  ${chalk.gray('○')} Telegram: ${chalk.gray('disabled')}\n`);
              }

              // Discord
              if (channels.discord?.enabled) {
                const url = channels.discord.webhookUrl || '';
                const maskedUrl = url ? (url.substring(0, 30) + '...') : 'not set';
                console.log(`  ${chalk.green('✓')} Discord: ${chalk.green('enabled')}`);
                console.log(`    Webhook: ${maskedUrl}\n`);
              } else {
                console.log(`  ${chalk.gray('○')} Discord: ${chalk.gray('disabled')}\n`);
              }
            } catch (err) {
              console.error(chalk.red('❌ Could not read notification config:'), (err as Error).message);
              process.exit(1);
            }
          })
      )
      .addCommand(
        new Command('set')
          .description('Set notification channel configuration')
          .argument('<channel>', 'Channel: slack, telegram, or discord')
          .argument('[value...]', 'Configuration values (webhook URL for slack/discord, bot token and chat ID for telegram)')
          .action((channel: string, values: string[]) => {
            const options = configCommand.opts() as { dir: string };
            const cwd = process.cwd();
            const configPath = path.resolve(cwd, options.dir, 'config.json');

            const normalizedChannel = channel.toLowerCase() as NotificationChannel;
            if (!['slack', 'telegram', 'discord'].includes(normalizedChannel)) {
              console.error(chalk.red(`❌ Invalid channel: ${channel}`));
              console.error('   Valid channels: slack, telegram, discord');
              process.exit(1);
            }

            try {
              const config = loadAgentConfig(configPath) || {};

              // Ensure notifications structure exists
              if (!config.notifications) {
                config.notifications = {
                  enabled: true,
                  channels: {},
                };
              }
              if (!config.notifications.channels) {
                config.notifications.channels = {};
              }

              if (normalizedChannel === 'slack' || normalizedChannel === 'discord') {
                if (values.length === 0) {
                  console.error(chalk.red(`❌ Missing webhook URL for ${normalizedChannel}`));
                  console.error(`   Usage: ada config notifications set ${normalizedChannel} <webhook-url>`);
                  process.exit(1);
                }
                const webhookUrl = values[0];
                config.notifications.channels[normalizedChannel] = {
                  enabled: true,
                  webhookUrl: webhookUrl,
                };
                console.log(chalk.green(`✓ ${normalizedChannel} webhook configured and enabled`));
              } else if (normalizedChannel === 'telegram') {
                if (values.length < 2) {
                  console.error(chalk.red('❌ Missing bot token or chat ID for telegram'));
                  console.error('   Usage: ada config notifications set telegram <bot-token> <chat-id>');
                  process.exit(1);
                }
                const [botToken, chatId] = values;
                config.notifications.channels.telegram = {
                  enabled: true,
                  botToken: botToken,
                  chatId: chatId,
                };
                console.log(chalk.green('✓ Telegram bot configured and enabled'));
              }

              writeAgentConfig(configPath, config);
              console.log(chalk.gray(`   Config saved to ${configPath}`));
            } catch (err) {
              console.error(chalk.red('❌ Failed to update config:'), (err as Error).message);
              process.exit(1);
            }
          })
      )
      .addCommand(
        new Command('enable')
          .description('Enable notifications or a specific channel')
          .argument('[channel]', 'Channel to enable (slack, telegram, or discord (optional, enables all if omitted))')
          .action((channel?: string) => {
            const options = configCommand.opts() as { dir: string };
            const cwd = process.cwd();
            const configPath = path.resolve(cwd, options.dir, 'config.json');

            try {
              const config = loadAgentConfig(configPath) || {};

              if (!config.notifications) {
                config.notifications = {
                  enabled: true,
                  channels: {},
                };
              }
              if (!config.notifications.channels) {
                config.notifications.channels = {};
              }

              if (!channel) {
                // Enable all notifications
                config.notifications.enabled = true;
                console.log(chalk.green('✓ Notifications enabled'));
              } else {
                const normalizedChannel = channel.toLowerCase() as NotificationChannel;
                if (!['slack', 'telegram', 'discord'].includes(normalizedChannel)) {
                  console.error(chalk.red(`❌ Invalid channel: ${channel}`));
                  process.exit(1);
                }

                // Enable specific channel
                if (!config.notifications.channels[normalizedChannel]) {
                  // Create default config for channel
                  if (normalizedChannel === 'slack' || normalizedChannel === 'discord') {
                    config.notifications.channels[normalizedChannel] = {
                      enabled: true,
                      webhookUrl: '',
                    };
                  } else {
                    config.notifications.channels.telegram = {
                      enabled: true,
                      botToken: '',
                      chatId: '',
                    };
                  }
                } else {
                  const channelConfig = config.notifications.channels[normalizedChannel];
                  if (channelConfig) {
                    channelConfig.enabled = true;
                  }
                }
                console.log(chalk.green(`✓ ${normalizedChannel} notifications enabled`));
              }

              writeAgentConfig(configPath, config);
            } catch (err) {
              console.error(chalk.red('❌ Failed to update config:'), (err as Error).message);
              process.exit(1);
            }
          })
      )
      .addCommand(
        new Command('disable')
          .description('Disable notifications or a specific channel')
          .argument('[channel]', 'Channel to disable (slack, telegram, or discord) (optional, disables all if omitted)')
          .action((channel?: string) => {
            const options = configCommand.opts() as { dir: string };
            const cwd = process.cwd();
            const configPath = path.resolve(cwd, options.dir, 'config.json');

            try {
              const config = loadAgentConfig(configPath);

              if (!config?.notifications) {
                console.log(chalk.gray('Notifications already disabled'));
                return;
              }

              if (!channel) {
                // Disable all notifications
                config.notifications.enabled = false;
                console.log(chalk.yellow('⚠ Notifications disabled'));
              } else {
                const normalizedChannel = channel.toLowerCase() as NotificationChannel;
                if (!['slack', 'telegram', 'discord'].includes(normalizedChannel)) {
                  console.error(chalk.red(`❌ Invalid channel: ${channel}`));
                  process.exit(1);
                }

                // Disable specific channel
                const channelConfig = config.notifications.channels?.[normalizedChannel];
                if (channelConfig) {
                  channelConfig.enabled = false;
                  console.log(chalk.yellow(`⚠ ${normalizedChannel} notifications disabled`));
                } else {
                  console.log(chalk.gray(`${normalizedChannel} notifications already disabled`));
                }
              }

              writeAgentConfig(configPath, config);
            } catch (err) {
              console.error(chalk.red('❌ Failed to update config:'), (err as Error).message);
              process.exit(1);
            }
          })
      )
      .addCommand(
        new Command('test')
          .description('Send a test notification to a channel')
          .argument('<channel>', 'Channel to test: slack, telegram, or discord')
          .action(async (channel: string) => {
            const options = configCommand.opts() as { dir: string };
            const cwd = process.cwd();
            const configPath = path.resolve(cwd, options.dir, 'config.json');

            const normalizedChannel = channel.toLowerCase() as NotificationChannel;
            if (!['slack', 'telegram', 'discord'].includes(normalizedChannel)) {
              console.error(chalk.red(`❌ Invalid channel: ${channel}`));
              console.error('   Valid channels: slack, telegram, discord');
              process.exit(1);
            }

            try {
              console.log(chalk.blue(`Sending test notification to ${normalizedChannel}...`));
              const result = await sendTestNotification(configPath, normalizedChannel);

              if (result.success) {
                console.log(chalk.green(`✓ Test notification sent successfully to ${normalizedChannel}`));
              } else {
                console.error(chalk.red(`❌ Test notification failed: ${result.error}`));
                process.exit(1);
              }
            } catch (err) {
              console.error(chalk.red('❌ Failed to send test notification:'), (err as Error).message);
              process.exit(1);
            }
          })
      )
  );
