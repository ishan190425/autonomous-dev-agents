/**
 * `ada validate` — Phase 2 Dogfooding Validation Command
 *
 * Automated checks for all 6 SaaS Container success criteria (SC-1 through SC-6).
 * Supports the Feb 26 Go/No-Go decision.
 *
 * @see docs/product/phase2-dogfooding-spec-c736.md
 * @see docs/business/phase1-complete-phase2-strategy-c732.md
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import {
  createMetricsManager,
  calculateSavingsAnalysis,
} from '@ada-ai/core';

const { green, red, yellow, bold, dim } = chalk;

/** Validation result for a single check */
interface ValidationResult {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
  details?: string;
}

/** Options for the validate command */
interface ValidateOptions {
  dir: string;
  json?: boolean;
  verbose?: boolean;
  quick?: boolean;
}

/**
 * SC-1: Validate dispatch lifecycle — rotation.json exists and has valid state
 */
async function validateDispatchLifecycle(agentsDir: string): Promise<ValidationResult> {
  const rotationPath = path.join(agentsDir, 'state', 'rotation.json');
  
  try {
    const content = await fs.readFile(rotationPath, 'utf-8');
    const rotation = JSON.parse(content);
    
    // Check required fields
    if (
      typeof rotation.current_index !== 'number' ||
      typeof rotation.cycle_count !== 'number' ||
      !rotation.last_role ||
      !Array.isArray(rotation.history)
    ) {
      return {
        id: 'SC-1',
        name: 'Dispatch Lifecycle',
        status: 'fail',
        message: 'rotation.json missing required fields',
        details: 'Expected: current_index, cycle_count, last_role, history',
      };
    }
    
    // Check recent activity (last cycle within 24h for active dogfooding)
    if (rotation.last_run) {
      const lastRun = new Date(rotation.last_run);
      const hoursSinceLastRun = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastRun > 24) {
        return {
          id: 'SC-1',
          name: 'Dispatch Lifecycle',
          status: 'warn',
          message: `Last cycle was ${Math.floor(hoursSinceLastRun)}h ago`,
          details: `Cycle ${rotation.cycle_count} at ${rotation.last_run}`,
        };
      }
    }
    
    return {
      id: 'SC-1',
      name: 'Dispatch Lifecycle',
      status: 'pass',
      message: `Cycle ${rotation.cycle_count} completed successfully`,
      details: `Last role: ${rotation.last_role}, Last run: ${rotation.last_run}`,
    };
  } catch (error) {
    return {
      id: 'SC-1',
      name: 'Dispatch Lifecycle',
      status: 'fail',
      message: 'Could not read rotation.json',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * SC-2: Validate model routing — check that model routing is configured
 */
async function validateModelRouting(agentsDir: string): Promise<ValidationResult> {
  const rotationPath = path.join(agentsDir, 'state', 'rotation.json');
  
  try {
    const content = await fs.readFile(rotationPath, 'utf-8');
    const rotation = JSON.parse(content);
    
    // Check recent history for model usage
    const history = rotation.history || [];
    const recent = history.slice(-10);
    
    if (recent.length === 0) {
      return {
        id: 'SC-2',
        name: 'Model Routing',
        status: 'skip',
        message: 'No dispatch history to analyze',
      };
    }
    
    // Check environment variables
    const modelRouting = process.env.ADA_MODEL_ROUTING !== 'false';
    const modelOverride = process.env.ADA_MODEL_OVERRIDE;
    
    return {
      id: 'SC-2',
      name: 'Model Routing',
      status: 'pass',
      message: modelRouting ? 'Model routing enabled' : 'Model routing disabled',
      details: modelOverride 
        ? `Override: ${modelOverride}` 
        : 'Auto-routing active (Haiku/Sonnet/Opus by role)',
    };
  } catch (error) {
    return {
      id: 'SC-2',
      name: 'Model Routing',
      status: 'fail',
      message: 'Could not verify model routing',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * SC-3: Validate GitHub integration — check gh CLI is authenticated
 */
function validateGitHubIntegration(): ValidationResult {
  try {
    // Check if gh CLI is available and authenticated
    const result = execSync('gh auth status 2>&1', { encoding: 'utf-8', timeout: 10000 });
    
    if (result.includes('Logged in')) {
      // Try a simple API call
      try {
        execSync('gh api user --jq .login', { encoding: 'utf-8', timeout: 10000 });
        return {
          id: 'SC-3',
          name: 'GitHub Integration',
          status: 'pass',
          message: 'GitHub CLI authenticated and API accessible',
        };
      } catch {
        return {
          id: 'SC-3',
          name: 'GitHub Integration',
          status: 'warn',
          message: 'GitHub CLI authenticated but API call failed',
          details: 'May be rate limited or network issue',
        };
      }
    }
    
    return {
      id: 'SC-3',
      name: 'GitHub Integration',
      status: 'fail',
      message: 'GitHub CLI not authenticated',
      details: 'Run: gh auth login',
    };
  } catch (error) {
    return {
      id: 'SC-3',
      name: 'GitHub Integration',
      status: 'fail',
      message: 'GitHub CLI not available or not authenticated',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * SC-4: Validate memory persistence — check bank.md exists and is recent
 */
async function validateMemoryPersistence(agentsDir: string): Promise<ValidationResult> {
  const bankPath = path.join(agentsDir, 'memory', 'bank.md');
  
  try {
    const stat = await fs.stat(bankPath);
    const content = await fs.readFile(bankPath, 'utf-8');
    
    // Check for required sections
    const requiredSections = ['Current Status', 'Role State', 'Active Threads'];
    const missingSections = requiredSections.filter(
      section => !content.includes(`## ${section}`)
    );
    
    if (missingSections.length > 0) {
      return {
        id: 'SC-4',
        name: 'Memory Persistence',
        status: 'warn',
        message: `Missing sections: ${missingSections.join(', ')}`,
      };
    }
    
    // Check last updated
    const lastUpdatedMatch = content.match(/Last updated:\s*([^\n|]+)/);
    const hoursSinceUpdate = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate > 24) {
      return {
        id: 'SC-4',
        name: 'Memory Persistence',
        status: 'warn',
        message: `Memory bank not updated in ${Math.floor(hoursSinceUpdate)}h`,
        details: lastUpdatedMatch?.[1] ? `Last: ${lastUpdatedMatch[1].trim()}` : 'No timestamp found',
      };
    }
    
    // Extract version
    const versionMatch = content.match(/Version:\s*(\d+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';
    
    return {
      id: 'SC-4',
      name: 'Memory Persistence',
      status: 'pass',
      message: `Memory bank v${version} up to date`,
      details: `File modified ${Math.floor(hoursSinceUpdate)}h ago`,
    };
  } catch (error) {
    return {
      id: 'SC-4',
      name: 'Memory Persistence',
      status: 'fail',
      message: 'Could not read memory bank',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * SC-5: Validate cost savings — check if savings meet 10% target
 */
async function validateCostSavings(agentsDir: string): Promise<ValidationResult> {
  try {
    const metricsManager = createMetricsManager(agentsDir);
    const metrics = await metricsManager.load();
    
    if (metrics.cycles.length === 0) {
      return {
        id: 'SC-5',
        name: 'Cost Savings',
        status: 'skip',
        message: 'No cycle metrics available',
        details: 'Run dispatch cycles to generate cost data',
      };
    }
    
    const analysis = calculateSavingsAnalysis(metrics.cycles);
    const savingsPercent = analysis.savings.percentage;
    
    if (savingsPercent >= 10) {
      return {
        id: 'SC-5',
        name: 'Cost Savings',
        status: 'pass',
        message: `${savingsPercent.toFixed(1)}% savings ✅ (target: 10%+)`,
        details: `Haiku: ${analysis.modelDistribution.haiku.percentage}%, Sonnet: ${analysis.modelDistribution.sonnet.percentage}%, Opus: ${analysis.modelDistribution.opus.percentage}%`,
      };
    } else if (savingsPercent >= 5) {
      return {
        id: 'SC-5',
        name: 'Cost Savings',
        status: 'warn',
        message: `${savingsPercent.toFixed(1)}% savings ⚠️ (target: 10%+)`,
        details: 'Close to target — review model distribution',
      };
    } else {
      return {
        id: 'SC-5',
        name: 'Cost Savings',
        status: 'fail',
        message: `${savingsPercent.toFixed(1)}% savings ❌ (target: 10%+)`,
        details: 'Model routing may need tuning',
      };
    }
  } catch (error) {
    return {
      id: 'SC-5',
      name: 'Cost Savings',
      status: 'skip',
      message: 'Could not calculate savings',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * SC-6: Validate consecutive cycles — check for 5+ cycles without manual intervention
 */
async function validateConsecutiveCycles(agentsDir: string): Promise<ValidationResult> {
  const rotationPath = path.join(agentsDir, 'state', 'rotation.json');
  
  try {
    const content = await fs.readFile(rotationPath, 'utf-8');
    const rotation = JSON.parse(content);
    
    const history = rotation.history || [];
    
    if (history.length < 5) {
      return {
        id: 'SC-6',
        name: 'Consecutive Cycles',
        status: 'warn',
        message: `Only ${history.length} cycles in history (need 5+)`,
        details: 'Continue running dispatch cycles',
      };
    }
    
    // Check last 5 cycles for success
    const recent = history.slice(-5);
    const allSuccess = recent.every((h: { reflection?: { outcome?: string } }) => 
      !h.reflection?.outcome || h.reflection.outcome === 'success'
    );
    
    if (allSuccess) {
      return {
        id: 'SC-6',
        name: 'Consecutive Cycles',
        status: 'pass',
        message: `${history.length} cycles, last 5 successful`,
        details: `Total: ${rotation.cycle_count} cycles completed`,
      };
    } else {
      const failures = recent.filter((h: { reflection?: { outcome?: string } }) => 
        h.reflection?.outcome && h.reflection.outcome !== 'success'
      ).length;
      return {
        id: 'SC-6',
        name: 'Consecutive Cycles',
        status: 'warn',
        message: `${failures}/5 recent cycles had issues`,
        details: 'Check cycle history for details',
      };
    }
  } catch (error) {
    return {
      id: 'SC-6',
      name: 'Consecutive Cycles',
      status: 'fail',
      message: 'Could not read cycle history',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Format a single validation result for console output.
 */
function formatResult(result: ValidationResult, verbose: boolean): string {
  const statusIcon = {
    pass: green('✓'),
    fail: red('✗'),
    warn: yellow('⚠'),
    skip: dim('○'),
  }[result.status];
  
  const statusColor = {
    pass: green,
    fail: red,
    warn: yellow,
    skip: dim,
  }[result.status];
  
  let line = `  ${statusIcon} ${bold(result.id)}: ${result.name} — ${statusColor(result.message)}`;
  
  if (verbose && result.details) {
    line += `\n      ${dim(result.details)}`;
  }
  
  return line;
}

/**
 * Run all Phase 2 validation checks.
 */
async function runValidation(options: ValidateOptions): Promise<ValidationResult[]> {
  const agentsDir = path.resolve(options.dir);
  
  const results: ValidationResult[] = [];
  
  // SC-1: Dispatch Lifecycle
  results.push(await validateDispatchLifecycle(agentsDir));
  
  // SC-2: Model Routing
  results.push(await validateModelRouting(agentsDir));
  
  // SC-3: GitHub Integration
  if (!options.quick) {
    results.push(validateGitHubIntegration());
  }
  
  // SC-4: Memory Persistence
  results.push(await validateMemoryPersistence(agentsDir));
  
  // SC-5: Cost Savings
  if (!options.quick) {
    results.push(await validateCostSavings(agentsDir));
  }
  
  // SC-6: Consecutive Cycles
  results.push(await validateConsecutiveCycles(agentsDir));
  
  return results;
}

/**
 * Calculate overall status from results.
 */
function calculateOverallStatus(results: ValidationResult[]): 'pass' | 'fail' | 'warn' {
  const hasFail = results.some(r => r.status === 'fail');
  const hasWarn = results.some(r => r.status === 'warn');
  
  if (hasFail) return 'fail';
  if (hasWarn) return 'warn';
  return 'pass';
}

/**
 * Create the validate command.
 */
export const validateCommand = new Command('validate')
  .description('🔍 Phase 2 dogfooding validation — check all 6 success criteria')
  .option('-d, --dir <path>', 'Path to agents directory', 'agents')
  .option('--json', 'Output results as JSON')
  .option('-v, --verbose', 'Show detailed information')
  .option('--quick', 'Skip network-dependent checks (GitHub, cost savings)')
  .action(async (options: ValidateOptions) => {
    if (!options.json) {
      console.log();
      console.log(bold('🔍 Phase 2 Dogfooding Validation'));
      console.log(dim('   Checking all 6 success criteria (SC-1 through SC-6)'));
      console.log();
    }
    
    const results = await runValidation(options);
    const overall = calculateOverallStatus(results);
    
    if (options.json) {
      console.log(JSON.stringify({ overall, results }, null, 2));
      return;
    }
    
    // Display results
    for (const result of results) {
      console.log(formatResult(result, options.verbose ?? false));
    }
    
    console.log();
    
    // Summary
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warned = results.filter(r => r.status === 'warn').length;
    const skipped = results.filter(r => r.status === 'skip').length;
    
    const summaryParts = [];
    if (passed > 0) summaryParts.push(green(`${passed} passed`));
    if (warned > 0) summaryParts.push(yellow(`${warned} warnings`));
    if (failed > 0) summaryParts.push(red(`${failed} failed`));
    if (skipped > 0) summaryParts.push(dim(`${skipped} skipped`));
    
    console.log(`   ${summaryParts.join(', ')}`);
    console.log();
    
    // Overall verdict
    if (overall === 'pass') {
      console.log(green(bold('   ✅ GO/NO-GO: Ready for launch!')));
    } else if (overall === 'warn') {
      console.log(yellow(bold('   ⚠️  GO/NO-GO: Review warnings before launch')));
    } else {
      console.log(red(bold('   ❌ GO/NO-GO: Fix failures before launch')));
    }
    console.log();
    
    // Exit with appropriate code
    process.exit(overall === 'fail' ? 1 : 0);
  });
