/**
 * @ada/cli — Pre-flight Checks Module
 *
 * Validates environment prerequisites before running `ada init`.
 * Part of Issue #183 (Interactive Onboarding Wizard with Validation).
 *
 * Checks:
 * - Git repository exists (required)
 * - Node.js version >= 18 (required)
 * - GitHub CLI installed (recommended)
 *
 * @packageDocumentation
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Result of a single pre-flight check.
 */
export interface CheckResult {
  /** Check name for display */
  readonly name: string;
  /** Whether the check passed */
  readonly passed: boolean;
  /** Whether this check is required (blocks init if failed) */
  readonly required: boolean;
  /** Human-readable message */
  readonly message: string;
  /** Suggestion for fixing the issue */
  readonly suggestion?: string;
  /** Detected value (for display) */
  readonly value?: string;
}

/**
 * Aggregated pre-flight results.
 */
export interface PreflightResults {
  /** All individual check results */
  readonly checks: CheckResult[];
  /** Whether all required checks passed */
  readonly canProceed: boolean;
  /** Number of warnings (non-required checks failed) */
  readonly warnings: number;
}

// ─── Check Implementations ───────────────────────────────────────────────────

/**
 * Check if current directory is a git repository.
 */
async function checkGitRepo(cwd: string): Promise<CheckResult> {
  const gitDir = path.join(cwd, '.git');

  try {
    const stat = await fs.stat(gitDir);
    if (stat.isDirectory()) {
      return {
        name: 'Git Repository',
        passed: true,
        required: true,
        message: 'Git repository detected',
        value: '.git/',
      };
    }
  } catch {
    // .git doesn't exist
  }

  return {
    name: 'Git Repository',
    passed: false,
    required: true,
    message: 'Not a git repository',
    suggestion: 'Run `git init` to initialize a repository',
  };
}

/**
 * Check Node.js version (minimum 18.x).
 */
function checkNodeVersion(): CheckResult {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0] || '0', 10);

  if (major >= 18) {
    return {
      name: 'Node.js Version',
      passed: true,
      required: true,
      message: 'Node.js version supported',
      value: version,
    };
  }

  return {
    name: 'Node.js Version',
    passed: false,
    required: true,
    message: `Node.js ${version} is below minimum (v18.0.0)`,
    suggestion: 'Upgrade Node.js to v18 or later: https://nodejs.org',
    value: version,
  };
}

/**
 * Check if GitHub CLI is installed.
 */
function checkGitHubCLI(): CheckResult {
  try {
    const result = execSync('gh --version', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Extract version from output like "gh version 2.45.0 (2024-02-21)"
    const versionMatch = result.match(/gh version ([\d.]+)/);
    const version = versionMatch?.[1] || 'unknown';

    return {
      name: 'GitHub CLI',
      passed: true,
      required: false,
      message: 'GitHub CLI detected',
      value: `v${version}`,
    };
  } catch {
    return {
      name: 'GitHub CLI',
      passed: false,
      required: false,
      message: 'GitHub CLI not found (recommended)',
      suggestion: 'Install gh: https://cli.github.com',
    };
  }
}

/**
 * Check if package.json exists (for project context detection).
 */
async function checkPackageJson(cwd: string): Promise<CheckResult> {
  const packagePath = path.join(cwd, 'package.json');

  try {
    await fs.access(packagePath);
    const content = await fs.readFile(packagePath, 'utf-8');
    const pkg = JSON.parse(content) as { name?: string };

    return {
      name: 'package.json',
      passed: true,
      required: false,
      message: 'package.json detected',
      value: pkg.name || path.basename(cwd),
    };
  } catch {
    return {
      name: 'package.json',
      passed: false,
      required: false,
      message: 'No package.json found',
      suggestion: 'Run `npm init -y` for Node.js projects (optional)',
    };
  }
}

// ─── Main API ────────────────────────────────────────────────────────────────

/**
 * Run all pre-flight checks.
 *
 * @param cwd - Current working directory to check
 * @returns Aggregated pre-flight results
 *
 * @example
 * ```typescript
 * const results = await runPreflightChecks(process.cwd());
 * if (!results.canProceed) {
 *   console.error('Pre-flight checks failed');
 *   process.exit(1);
 * }
 * ```
 */
export async function runPreflightChecks(cwd: string): Promise<PreflightResults> {
  const checks: CheckResult[] = [];

  // Run all checks
  checks.push(await checkGitRepo(cwd));
  checks.push(checkNodeVersion());
  checks.push(checkGitHubCLI());
  checks.push(await checkPackageJson(cwd));

  // Calculate aggregates
  const failedRequired = checks.filter((c) => c.required && !c.passed);
  const warnings = checks.filter((c) => !c.required && !c.passed).length;

  return {
    checks,
    canProceed: failedRequired.length === 0,
    warnings,
  };
}

/**
 * Format pre-flight results for console output.
 *
 * @param results - Pre-flight check results
 * @returns Formatted string for display
 */
export function formatPreflightResults(results: PreflightResults): string {
  const lines: string[] = [];

  lines.push(chalk.blue('🔍 Pre-flight Checks\n'));

  for (const check of results.checks) {
    const icon = check.passed ? chalk.green('✓') : check.required ? chalk.red('✗') : chalk.yellow('⚠');
    const status = check.passed
      ? chalk.green(check.message)
      : check.required
        ? chalk.red(check.message)
        : chalk.yellow(check.message);

    const valuePart = check.value ? chalk.gray(` (${check.value})`) : '';

    lines.push(`  ${icon} ${chalk.bold(check.name)}${valuePart}`);
    lines.push(`    ${status}`);

    if (!check.passed && check.suggestion) {
      lines.push(`    ${chalk.gray(`→ ${check.suggestion}`)}`);
    }
  }

  lines.push('');

  if (!results.canProceed) {
    lines.push(chalk.red('❌ Pre-flight checks failed. Please fix required issues above.'));
  } else if (results.warnings > 0) {
    lines.push(chalk.yellow(`⚠️  ${results.warnings} warning(s). You can proceed, but some features may be limited.`));
  } else {
    lines.push(chalk.green('✅ All pre-flight checks passed!'));
  }

  return lines.join('\n');
}

/**
 * Print pre-flight results to console.
 *
 * @param results - Pre-flight check results
 */
export function printPreflightResults(results: PreflightResults): void {
  console.log(formatPreflightResults(results));
  console.log('');
}
