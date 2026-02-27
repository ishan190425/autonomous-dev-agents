/**
 * CLI Banner Art — First-run experience for ADA
 *
 * Shows a memorable banner on first run and provides
 * visual polish for the CLI. Per design spec C435.
 *
 * @module banner
 */

import chalk from 'chalk';
import { getUserConfig, updateUserConfig } from './user-config.js';

/**
 * Package version — read at build time from package.json
 * For now hardcoded; in production this should be injected
 */
const VERSION = '1.0.0-alpha';

/**
 * Full ASCII art banner with ADA letters
 * Shown on first `ada init`
 */
const FULL_BANNER_ART = `
    ╭─────────────────────────────────────────────────────╮
    │                                                     │
    │      █████╗ ██████╗  █████╗                         │
    │     ██╔══██╗██╔══██╗██╔══██╗                        │
    │     ███████║██║  ██║███████║                        │
    │     ██╔══██║██║  ██║██╔══██║                        │
    │     ██║  ██║██████╔╝██║  ██║                        │
    │     ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝                        │
    │                                                     │
    │     Autonomous Dev Agents                           │
    │     Multi-agent teams for your codebase             │
    │                                                     │
    │     vVERSION_PLACEHOLDER                            │
    │                                                     │
    ╰─────────────────────────────────────────────────────╯
`;

/**
 * Quick-start tips panel shown after first-run banner
 */
const QUICK_START_PANEL = `
  ┌─ Quick Start ──────────────────────────────────────────┐
  │                                                        │
  │  ada init             Set up your agent team            │
  │  ada run              Execute one dispatch cycle        │
  │  ada status           Check team & rotation state       │
  │  ada dispatch start   Start a managed cycle             │
  │                                                        │
  │  Docs: https://github.com/ishan190425/autonomous-dev-agents │
  │                                                        │
  └────────────────────────────────────────────────────────┘
`;

/**
 * Compact banner for version checks and non-first-run
 */
const COMPACT_BANNER_ART = `
    ┌──────────────────────────────────────────────┐
    │  🤖 ADA — Autonomous Dev Agents              │
    │  Multi-agent teams for your codebase         │
    │                                     vVERSION │
    └──────────────────────────────────────────────┘
`;

/**
 * No-color ASCII-only fallback
 */
const ASCII_BANNER_ART = `
    +--------------------------------------------------+
    |                                                  |
    |       A D A                                      |
    |       Autonomous Dev Agents                      |
    |       Multi-agent teams for your codebase        |
    |                                                  |
    |       vVERSION_PLACEHOLDER                       |
    |                                                  |
    +--------------------------------------------------+
`;

/**
 * Role introduction panel shown after banner on init
 */
const ROLE_INTRO_PANEL = `
  Creating your agent team...

  ┌─ Your Team ─────────────────────────────────────────┐
  │                                                     │
  │  👔 CEO           Strategic direction & vision      │
  │  🔬 Research      Discovery & analysis              │
  │  📦 Product       Features & roadmap                │
  │  📋 Scrum         Coordination & retros             │
  │  ⚙️  Engineering   Code & implementation             │
  │  🔍 QA            Testing & quality                 │
  │  🛡️  Ops           Infrastructure & CI               │
  │  🎨 Design        UX & architecture                 │
  │                                                     │
  └─────────────────────────────────────────────────────┘
`;

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.JENKINS_URL ||
    !process.stdout.isTTY
  );
}

/**
 * Check if colors are disabled
 */
export function isNoColor(): boolean {
  return !!(process.env.NO_COLOR || process.argv.includes('--no-color'));
}

/**
 * Apply colors to the full banner
 */
function colorizeFullBanner(banner: string): string {
  // Replace ASCII art letters with cyan color (using string replace to avoid regex lint issues)
  const artLines = [
    '█████╗ ██████╗  █████╗',
    '██╔══██╗██╔══██╗██╔══██╗',
    '███████║██║  ██║███████║',
    '██╔══██║██║  ██║██╔══██║',
    '██║  ██║██████╔╝██║  ██║',
    '╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝',
  ];

  let result = banner;
  for (const line of artLines) {
    result = result.replace(line, chalk.cyan(line));
  }

  return result
    .replace('Autonomous Dev Agents', chalk.white('Autonomous Dev Agents'))
    .replace('Multi-agent teams for your codebase', chalk.dim('Multi-agent teams for your codebase'))
    .replace(/vVERSION_PLACEHOLDER\s*/g, chalk.green(`v${VERSION}`))
    .replace(/[╭╮╰╯│─]/g, (match) => chalk.dim(match));
}

/**
 * Apply colors to the compact banner
 */
function colorizeCompactBanner(banner: string): string {
  return banner
    .replace('ADA', chalk.cyan('ADA'))
    .replace('Multi-agent teams for your codebase', chalk.dim('Multi-agent teams for your codebase'))
    .replace(/vVERSION/g, chalk.green(`v${VERSION}`))
    .replace(/┌|┐|└|┘|│|─/g, (match) => chalk.dim(match));
}

/**
 * Banner display options
 */
export interface BannerOptions {
  /** Force show even if already seen */
  force?: boolean;
  /** Use compact variant */
  compact?: boolean;
  /** Skip color (ASCII-only) */
  noColor?: boolean;
  /** Show role introduction panel */
  showRolePanel?: boolean;
}

/**
 * Show the CLI banner
 *
 * @param options - Display options
 * @returns true if banner was shown, false if skipped
 */
export function showBanner(options: BannerOptions = {}): boolean {
  // Never show in CI unless forced
  if (isCI() && !options.force) {
    return false;
  }

  // Check if we should skip (already seen)
  const config = getUserConfig();
  if (config.banner?.seenFullBanner && !options.force && !options.compact) {
    return false;
  }

  // Determine if we need no-color mode
  const useNoColor = options.noColor || isNoColor();

  // Select and render the appropriate banner
  let output: string;
  
  if (options.compact) {
    output = useNoColor 
      ? COMPACT_BANNER_ART.replace(/vVERSION/g, `v${VERSION}`)
      : colorizeCompactBanner(COMPACT_BANNER_ART);
  } else if (useNoColor) {
    output = ASCII_BANNER_ART.replace(/vVERSION_PLACEHOLDER\s*/g, `v${VERSION}`);
  } else {
    output = colorizeFullBanner(FULL_BANNER_ART);
  }

  console.log(output);

  // Show role panel if requested
  if (options.showRolePanel && !options.compact) {
    const rolePanel = useNoColor
      ? ROLE_INTRO_PANEL.replace(/┌|┐|└|┘|│|─/g, (match) => {
          const asciiMap: Record<string, string> = {
            '┌': '+', '┐': '+', '└': '+', '┘': '+',
            '│': '|', '─': '-'
          };
          return asciiMap[match] || match;
        })
      : ROLE_INTRO_PANEL.replace(/┌|┐|└|┘|│|─/g, (match) => chalk.dim(match));
    console.log(rolePanel);
  }

  // Show quick-start tips on first run (not compact, not seen before)
  if (!options.compact && !config.banner?.seenFullBanner && !options.showRolePanel) {
    const quickStart = useNoColor
      ? QUICK_START_PANEL.replace(/┌|┐|└|┘|│|─/g, (match) => {
          const asciiMap: Record<string, string> = {
            '┌': '+', '┐': '+', '└': '+', '┘': '+',
            '│': '|', '─': '-'
          };
          return asciiMap[match] || match;
        })
      : QUICK_START_PANEL.replace(/┌|┐|└|┘|│|─/g, (match) => chalk.dim(match));
    console.log(quickStart);
  }

  // Mark as seen (only for full banner on first display)
  if (!options.compact && !config.banner?.seenFullBanner) {
    updateUserConfig({
      banner: {
        seenFullBanner: true,
        firstSeenVersion: VERSION,
        firstSeenAt: new Date().toISOString(),
      },
    });
  }

  return true;
}

/**
 * Get a simple version string with banner-style formatting
 */
export function getVersionString(): string {
  if (isNoColor()) {
    return `ADA v${VERSION}`;
  }
  return `${chalk.cyan('ADA')} ${chalk.green(`v${VERSION}`)}`;
}
