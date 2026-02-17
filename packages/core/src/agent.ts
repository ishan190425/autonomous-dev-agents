/**
 * @ada/core — Agent execution engine
 *
 * Implements agent execution via multiple backends (Clawdbot, Claude Code, etc.),
 * following RES-001 (Hybrid Clawdbot orchestration) and R-015 (Code Reuse & Abstract Classes).
 *
 * Uses abstract base class pattern for extensibility and code reuse.
 */

import type { DispatchContext } from './dispatch.js';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execCb);

/** Result of agent action execution */
export interface ActionResult {
  /** Whether the action completed successfully */
  success: boolean;
  /** Description of what was accomplished */
  action: string;
  /** Detailed description of work done */
  details: string;
  /** Files modified during execution */
  modifiedFiles?: string[];
  /** Issues created */
  createdIssues?: number[];
  /** PRs created */
  createdPRs?: number[];
  /** Error message if action failed */
  error?: string;
}

/** Agent execution engine interface */
export interface AgentExecutor {
  executeAction(context: DispatchContext): Promise<ActionResult>;
}

/** Raw response structure from Clawdbot agent session */
interface ClawdbotResponse {
  response?: string;
  message?: string;
  error?: string;
}

/**
 * Abstract base class for agent executors.
 *
 * Provides shared functionality for parsing responses, extracting metadata,
 * and error handling. Concrete implementations must provide executor-specific
 * prompt building, command execution, and response parsing.
 *
 * Follows R-015 (Code Reuse & Abstract Classes) to reduce duplication and
 * enable easy extension for new executor backends (Claude Code, Codex, etc.).
 */
export abstract class BaseAgentExecutor implements AgentExecutor {
  /**
   * Template method that orchestrates the execution flow.
   * Provides common error handling wrapper around executor-specific logic.
   *
   * @param context - Dispatch context with role, memory bank, and paths
   * @returns Action result with work accomplished
   */
  async executeAction(context: DispatchContext): Promise<ActionResult> {
    try {
      // Build executor-specific prompt
      const prompt = this.buildPrompt(context);

      // Execute via executor-specific command
      const output = await this.executeCommand(prompt, context);

      // Parse executor-specific response
      const parsedResult = this.parseResponse(output, context);

      // Enrich with shared metadata extraction
      return this.enrichResult(parsedResult, output, context);
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Build the prompt/context for the executor.
   * Each executor formats context differently (Clawdbot vs Claude Code vs Codex).
   *
   * @param context - Dispatch context
   * @returns Formatted prompt/context for the executor
   */
  protected abstract buildPrompt(context: DispatchContext): string;

  /**
   * Execute the command via the executor's CLI.
   * Each executor has different command syntax and options.
   *
   * @param prompt - Formatted prompt/context
   * @param context - Dispatch context for working directory and environment
   * @returns Raw output from the executor
   */
  protected abstract executeCommand(
    prompt: string,
    context: DispatchContext
  ): Promise<string>;

  /**
   * Parse the executor's output into a partial action result.
   * Each executor returns different output formats.
   *
   * @param output - Raw output from executor
   * @param context - Dispatch context
   * @returns Partial action result (will be enriched by enrichResult)
   */
  protected abstract parseResponse(
    output: string,
    context: DispatchContext
  ): Partial<ActionResult>;

  /**
   * Enrich parsed result with shared metadata extraction.
   * Extracts files, issues, PRs from response text using common patterns.
   *
   * @param parsedResult - Partially parsed result from executor
   * @param output - Raw output text for additional extraction
   * @param context - Dispatch context
   * @returns Complete action result
   */
  protected enrichResult(
    parsedResult: Partial<ActionResult>,
    output: string,
    context: DispatchContext
  ): ActionResult {
    // Extract metadata from output text
    const modifiedFiles = this.extractModifiedFiles(output);
    const createdIssues = this.extractIssueNumbers(output);
    const createdPRs = this.extractPRNumbers(output);

    // Generate action summary
    const actionSummary = this.generateActionSummary(
      context,
      output,
      modifiedFiles,
      createdIssues,
      createdPRs
    );

    // Merge parsed result with extracted metadata
    const result: ActionResult = {
      success: parsedResult.success ?? true,
      action: parsedResult.action ?? actionSummary,
      details: parsedResult.details ?? output.substring(0, 1000),
      modifiedFiles: parsedResult.modifiedFiles ?? modifiedFiles,
      createdIssues: parsedResult.createdIssues ?? createdIssues,
      createdPRs: parsedResult.createdPRs ?? createdPRs,
    };
    if (parsedResult.error) {
      result.error = parsedResult.error;
    }
    return result;
  }

  /**
   * Handle errors with consistent formatting.
   *
   * @param error - Error that occurred
   * @param context - Dispatch context
   * @returns Error action result
   */
  protected handleError(error: unknown, context: DispatchContext): ActionResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      action: `${context.role.name} execution failed`,
      details: `Agent execution error: ${errorMessage}`,
      error: errorMessage,
    };
  }

  /**
   * Extract key information from memory bank for context.
   * Shared across all executors.
   *
   * @param memoryBank - Full memory bank content
   * @returns Summarized context for the agent
   */
  protected extractMemoryBankSummary(memoryBank: string): string {
    const lines = memoryBank.split('\n');

    // Find key sections
    const currentStatusIndex = lines.findIndex((line) =>
      line.includes('## Current Status')
    );
    const activeThreadsIndex = lines.findIndex((line) =>
      line.includes('## Active Threads')
    );

    let summary = '';

    // Add current status
    if (currentStatusIndex >= 0) {
      const statusLines = lines
        .slice(currentStatusIndex, currentStatusIndex + 20)
        .filter((line) => line.trim())
        .slice(0, 10); // First 10 non-empty lines
      summary += `${statusLines.join('\n')}\n\n`;
    }

    // Add active threads if they exist
    if (activeThreadsIndex >= 0) {
      const threadsLines = lines
        .slice(activeThreadsIndex, activeThreadsIndex + 15)
        .filter((line) => line.trim())
        .slice(0, 8); // First 8 non-empty lines
      summary += `${threadsLines.join('\n')}\n\n`;
    }

    return summary || 'Memory bank loaded successfully.';
  }

  /**
   * Extract modified file paths from agent response text.
   * Shared parsing logic for all executors.
   */
  protected extractModifiedFiles(text: string): string[] {
    const files: string[] = [];
    // Look for common patterns like "modified:", "changed:", file paths, etc.
    const patterns = [
      /(?:modified|changed|updated|created|edited):\s*([^\n]+)/gi,
      /(?:file|path):\s*([^\s\n]+\.(ts|js|tsx|jsx|md|json|yml|yaml))/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const file = match[1]?.trim();
        if (file && !files.includes(file)) {
          files.push(file);
        }
      }
    }

    return files;
  }

  /**
   * Extract GitHub issue numbers from agent response text.
   * Shared parsing logic for all executors.
   */
  protected extractIssueNumbers(text: string): number[] {
    const issues: number[] = [];
    // Look for patterns like "#123", "issue #123", "Issue #123"
    const pattern = /(?:issue\s*)?#(\d+)/gi;
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      const issueMatch = match[1];
      if (issueMatch) {
        const issueNum = parseInt(issueMatch, 10);
        if (!isNaN(issueNum) && !issues.includes(issueNum)) {
          issues.push(issueNum);
        }
      }
    }

    return issues;
  }

  /**
   * Extract GitHub PR numbers from agent response text.
   * Shared parsing logic for all executors.
   */
  protected extractPRNumbers(text: string): number[] {
    const prs: number[] = [];
    // Look for patterns like "PR #123", "pull request #123", "#123"
    const pattern = /(?:pr|pull\s*request)\s*#(\d+)/gi;
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      const prMatch = match[1];
      if (prMatch) {
        const prNum = parseInt(prMatch, 10);
        if (!isNaN(prNum) && !prs.includes(prNum)) {
          prs.push(prNum);
        }
      }
    }

    return prs;
  }

  /**
   * Generate a concise action summary from the execution results.
   * Shared formatting logic for all executors.
   */
  protected generateActionSummary(
    context: DispatchContext,
    responseText: string,
    modifiedFiles: string[],
    createdIssues: number[],
    createdPRs: number[]
  ): string {
    const parts: string[] = [];

    // Add role name
    parts.push(context.role.name);

    // Add what was accomplished
    if (createdPRs.length > 0) {
      parts.push(
        `created PR${createdPRs.length > 1 ? 's' : ''} #${createdPRs.join(', #')}`
      );
    } else if (createdIssues.length > 0) {
      parts.push(
        `created issue${createdIssues.length > 1 ? 's' : ''} #${createdIssues.join(', #')}`
      );
    } else if (modifiedFiles.length > 0) {
      parts.push(
        `modified ${modifiedFiles.length} file${modifiedFiles.length > 1 ? 's' : ''}`
      );
    } else {
      // Extract first sentence or key phrase from response
      const firstLine =
        responseText.split('\n')[0]?.substring(0, 100) || 'executed action';
      parts.push(firstLine);
    }

    return parts.join(' — ');
  }
}

/**
 * Clawdbot-based agent executor implementing RES-001.
 *
 * Spawns a Clawdbot session with the role context and executes
 * one action from the role's playbook following the dispatch protocol.
 */
export class ClawdbotAgentExecutor extends BaseAgentExecutor {
  /**
   * Build the agent task prompt for Clawdbot session spawning.
   *
   * @param context - Dispatch context
   * @returns Formatted prompt for the agent role
   */
  protected buildPrompt(context: DispatchContext): string {
    const { role, state, memoryBank, paths } = context;

    return `You are ${role.emoji} ${role.name} (${role.title}) for ADA (Autonomous Dev Agents).

CRITICAL: You are executing Phase 3 of the dispatch protocol. Follow agents/DISPATCH.md exactly:

1. Read agents/playbooks/${role.id}.md for your available actions
2. Read agents/memory/bank.md for current project state
3. Check GitHub: gh issue list and gh pr list 
4. Pick ONE action from your playbook based on current state
5. Execute it via GitHub (create issue, write code + PR, add docs, comment)
6. All work branches from main, PRs target main
7. Follow conventional commits format

CURRENT STATE:
- Cycle: ${state.cycle_count + 1}
- Role: ${role.id}
- Focus: ${role.focus.join(', ')}
- Available actions: ${role.actions.join(', ')}

WORKING DIRECTORY: ${paths.root}

MEMORY BANK SUMMARY:
${this.extractMemoryBankSummary(memoryBank)}

RULES:
- Follow ALL rules in agents/rules/RULES.md
- Pick exactly ONE action this cycle
- Create meaningful work, no placeholders
- Update memory bank after acting (handled by dispatch cycle)
- Use conventional commit format: <type>(<scope>): <description>

Execute ONE meaningful action from your playbook now. Focus on high-impact work that moves the project forward.`;
  }

  /**
   * Execute Clawdbot command via CLI.
   *
   * @param prompt - Task prompt for the agent
   * @param context - Dispatch context for working directory
   * @returns Raw output from Clawdbot
   */
  protected async executeCommand(
    prompt: string,
    context: DispatchContext
  ): Promise<string> {
    try {
      // Escape the prompt for shell execution
      const escapedPrompt = prompt.replace(/'/g, "'\\''");
      
      // Build the Clawdbot command
      // Use --local to run embedded agent locally (requires model provider API keys)
      // Use --json to get structured output
      // Use --session-id to create a unique session per cycle
      const sessionId = `ada:${context.role.id}:${context.state.cycle_count + 1}`;
      const command = `clawdbot agent --local --message '${escapedPrompt}' --session-id '${sessionId}' --json --timeout 600`;
      
      // Execute in the project root directory
      const { stdout, stderr } = await exec(command, {
        cwd: context.paths.root,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        env: {
          ...process.env,
          // Ensure we're in the right directory context
          PWD: context.paths.root,
        },
      });

      // Return combined output (stdout + stderr if present)
      return stderr ? `${stdout}\n${stderr}` : stdout;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Clawdbot execution failed: ${errorMessage}. Make sure Clawdbot is installed and configured with model provider API keys.`
      );
    }
  }

  /**
   * Parse Clawdbot's JSON response format.
   *
   * @param output - Raw output from Clawdbot
   * @param _context - Dispatch context (unused but required by interface)
   * @returns Partial action result
   */
  protected parseResponse(
    output: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: DispatchContext
  ): Partial<ActionResult> {
    // Parse JSON response from Clawdbot
    let clawdbotResult: ClawdbotResponse;
    try {
      // Clawdbot may output JSON mixed with other text, try to extract it
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        clawdbotResult = JSON.parse(jsonMatch[0]) as ClawdbotResponse;
      } else {
        // If no JSON found, treat the entire output as the response
        clawdbotResult = { response: output.trim() };
      }
    } catch {
      // If JSON parsing fails, use the raw output
      clawdbotResult = { response: output.trim() };
    }

    // Extract response text
    const responseText =
      clawdbotResult.response ||
      clawdbotResult.message ||
      output ||
      'Agent execution completed';

    const result: Partial<ActionResult> = {
      success: !clawdbotResult.error,
      details: responseText,
    };
    if (clawdbotResult.error) {
      result.error = clawdbotResult.error;
    }
    return result;
  }
}

/**
 * Claude Code-based agent executor.
 *
 * Executes agent actions via Claude Code CLI, leveraging Anthropic's
 * native coding agent capabilities while maintaining ADA's coordination layer.
 *
 * @see Issue #64 — Claude Code Integration
 */
export class ClaudeCodeAgentExecutor extends BaseAgentExecutor {
  /**
   * Build the prompt/context for Claude Code.
   * Formats ADA context in a way Claude Code understands.
   *
   * @param context - Dispatch context
   * @returns Formatted prompt for Claude Code
   */
  protected buildPrompt(context: DispatchContext): string {
    const { role, state, memoryBank, paths } = context;

    return `You are ${role.emoji} ${role.name} (${role.title}) for ADA (Autonomous Dev Agents).

You are executing Phase 3 of the dispatch protocol. Your task is to:

1. Read agents/playbooks/${role.id}.md for your available actions
2. Read agents/memory/bank.md for current project state
3. Check GitHub: gh issue list and gh pr list
4. Pick ONE action from your playbook based on current state
5. Execute it via GitHub (create issue, write code + PR, add docs, comment)
6. All work branches from main, PRs target main
7. Follow conventional commits format

CURRENT STATE:
- Cycle: ${state.cycle_count + 1}
- Role: ${role.id}
- Focus: ${role.focus.join(', ')}
- Available actions: ${role.actions.join(', ')}

WORKING DIRECTORY: ${paths.root}

MEMORY BANK SUMMARY:
${this.extractMemoryBankSummary(memoryBank)}

RULES:
- Follow ALL rules in agents/rules/RULES.md
- Pick exactly ONE action this cycle
- Create meaningful work, no placeholders
- Update memory bank after acting (handled by dispatch cycle)
- Use conventional commit format: <type>(<scope>): <description>

Execute ONE meaningful action from your playbook now. Focus on high-impact work that moves the project forward.`;
  }

  /**
   * Execute Claude Code command via CLI.
   *
   * @param prompt - Task prompt for the agent
   * @param context - Dispatch context for working directory
   * @returns Raw output from Claude Code
   */
  protected async executeCommand(
    prompt: string,
    context: DispatchContext
  ): Promise<string> {
    try {
      // Escape the prompt for shell execution
      const escapedPrompt = prompt.replace(/'/g, "'\\''");

      // Build the Claude Code command
      // Claude Code uses a different command structure than Clawdbot
      // Session ID for tracking
      const sessionId = `ada:${context.role.id}:${context.state.cycle_count + 1}`;
      const command = `claude-code run --prompt '${escapedPrompt}' --session-id '${sessionId}' --timeout 600`;

      // Execute in the project root directory
      const { stdout, stderr } = await exec(command, {
        cwd: context.paths.root,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        env: {
          ...process.env,
          // Ensure we're in the right directory context
          PWD: context.paths.root,
        },
      });

      // Return combined output (stdout + stderr if present)
      return stderr ? `${stdout}\n${stderr}` : stdout;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Check if Claude Code is not installed
      if (
        errorMessage.includes('command not found') ||
        errorMessage.includes('claude-code: not found')
      ) {
        throw new Error(
          `Claude Code CLI not found. Please install it with: npm install -g @anthropic-ai/claude-code`
        );
      }
      throw new Error(
        `Claude Code execution failed: ${errorMessage}. Make sure Claude Code is installed and configured with API keys.`
      );
    }
  }

  /**
   * Parse Claude Code's output format.
   * Claude Code may return structured output or plain text.
   *
   * @param output - Raw output from Claude Code
   * @param _context - Dispatch context (unused but required by interface)
   * @returns Partial action result
   */
  protected parseResponse(
    output: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: DispatchContext
  ): Partial<ActionResult> {
    // Claude Code may output JSON or plain text
    // Try to parse as JSON first
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          response?: string;
          message?: string;
          error?: string;
          success?: boolean;
        };
        const result: Partial<ActionResult> = {
          success: parsed.success ?? !parsed.error,
          details: parsed.response || parsed.message || output,
        };
        if (parsed.error) {
          result.error = parsed.error;
        }
        return result;
      }
    } catch {
      // Not JSON, continue with plain text parsing
    }

    // Plain text response
    return {
      success: true,
      details: output.trim() || 'Claude Code execution completed',
    };
  }
}

/**
 * Executor type identifier.
 */
export type ExecutorType = 'clawdbot' | 'claude-code';

/**
 * Get the appropriate executor instance based on configuration.
 *
 * @param executorType - Executor type (from env var or CLI flag)
 * @returns Executor instance
 */
export function getExecutor(executorType?: string): AgentExecutor {
  const type = (executorType || process.env.ADA_EXECUTOR || 'clawdbot').toLowerCase() as ExecutorType;

  switch (type) {
    case 'claude-code':
      return new ClaudeCodeAgentExecutor();
    case 'clawdbot':
    default:
      return new ClawdbotAgentExecutor();
  }
}

/**
 * Execute an agent action using the configured executor.
 *
 * Supports executor selection via:
 * - `ADA_EXECUTOR` environment variable
 * - `executorType` parameter (from CLI flag)
 *
 * Defaults to Clawdbot for backward compatibility.
 *
 * @param context - Dispatch context
 * @param executorType - Optional executor type override
 * @returns Action result
 */
export function executeAgentAction(
  context: DispatchContext,
  executorType?: string
): Promise<ActionResult> {
  const executor = getExecutor(executorType);
  return executor.executeAction(context);
}