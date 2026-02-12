/**
 * @ada/core — Agent execution engine
 *
 * Implements actual agent execution via Clawdbot integration,
 * following RES-001 (Hybrid Clawdbot orchestration).
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
 * Clawdbot-based agent executor implementing RES-001.
 *
 * Spawns a Clawdbot session with the role context and executes
 * one action from the role's playbook following the dispatch protocol.
 */
export class ClawdbotAgentExecutor implements AgentExecutor {
  /**
   * Execute one agent action via Clawdbot session spawning.
   *
   * @param context - Dispatch context with role, memory bank, and paths
   * @returns Action result with work accomplished
   */
  async executeAction(context: DispatchContext): Promise<ActionResult> {
    try {
      // Construct the agent task prompt for Clawdbot
      const agentPrompt = this.buildAgentPrompt(context);

      // Use Clawdbot's sessions_spawn functionality to execute the agent
      const result = await this.spawnAgentSession(agentPrompt, context);

      return result;
    } catch (error) {
      return {
        success: false,
        action: 'Agent execution failed',
        details: `Error during agent execution: ${error}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build the agent task prompt for Clawdbot session spawning.
   *
   * @param context - Dispatch context
   * @returns Formatted prompt for the agent role
   */
  private buildAgentPrompt(context: DispatchContext): string {
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
   * Extract key information from memory bank for context.
   *
   * @param memoryBank - Full memory bank content
   * @returns Summarized context for the agent
   */
  private extractMemoryBankSummary(memoryBank: string): string {
    const lines = memoryBank.split('\n');
    
    // Find key sections
    const currentStatusIndex = lines.findIndex(line => line.includes('## Current Status'));
    const activeThreadsIndex = lines.findIndex(line => line.includes('## Active Threads'));
    
    let summary = '';
    
    // Add current status
    if (currentStatusIndex >= 0) {
      const statusLines = lines.slice(currentStatusIndex, currentStatusIndex + 20)
        .filter(line => line.trim())
        .slice(0, 10); // First 10 non-empty lines
      summary += `${statusLines.join('\n')}\n\n`;
    }
    
    // Add active threads if they exist
    if (activeThreadsIndex >= 0) {
      const threadsLines = lines.slice(activeThreadsIndex, activeThreadsIndex + 15)
        .filter(line => line.trim())
        .slice(0, 8); // First 8 non-empty lines
      summary += `${threadsLines.join('\n')}\n\n`;
    }
    
    return summary || 'Memory bank loaded successfully.';
  }

  /**
   * Spawn a Clawdbot session to execute the agent action.
   *
   * @param prompt - Task prompt for the agent
   * @param context - Dispatch context for working directory
   * @returns Action result from agent execution
   */
  private async spawnAgentSession(
    prompt: string,
    context: DispatchContext
  ): Promise<ActionResult> {
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
      
      // Parse JSON response from Clawdbot
      let clawdbotResult: ClawdbotResponse;
      try {
        // Clawdbot may output JSON mixed with other text, try to extract it
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          clawdbotResult = JSON.parse(jsonMatch[0]) as ClawdbotResponse;
        } else {
          // If no JSON found, treat the entire stdout as the response
          clawdbotResult = { response: stdout.trim() };
        }
      } catch {
        // If JSON parsing fails, use the raw output
        clawdbotResult = { response: stdout.trim(), error: stderr.trim() };
      }
      
      // Extract action details from Clawdbot response
      const responseText = clawdbotResult.response || clawdbotResult.message || stdout || 'Agent execution completed';
      
      // Try to extract structured information from the response
      // Look for mentions of files, issues, PRs in the response
      const modifiedFiles = this.extractModifiedFiles(responseText);
      const createdIssues = this.extractIssueNumbers(responseText);
      const createdPRs = this.extractPRNumbers(responseText);
      
      // Generate a summary action description
      const actionSummary = this.generateActionSummary(context, responseText, modifiedFiles, createdIssues, createdPRs);
      
      return {
        success: true,
        action: actionSummary,
        details: responseText.substring(0, 1000), // Limit details length
        modifiedFiles,
        createdIssues,
        createdPRs,
      };
    } catch (error) {
      // If Clawdbot execution fails, return error result
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        action: `${context.role.name} execution failed`,
        details: `Clawdbot agent execution error: ${errorMessage}. Make sure Clawdbot is installed and configured with model provider API keys.`,
        error: errorMessage,
      };
    }
  }
  
  /**
   * Extract modified file paths from agent response text.
   */
  private extractModifiedFiles(text: string): string[] {
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
   */
  private extractIssueNumbers(text: string): number[] {
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
   */
  private extractPRNumbers(text: string): number[] {
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
   */
  private generateActionSummary(
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
      parts.push(`created PR${createdPRs.length > 1 ? 's' : ''} #${createdPRs.join(', #')}`);
    } else if (createdIssues.length > 0) {
      parts.push(`created issue${createdIssues.length > 1 ? 's' : ''} #${createdIssues.join(', #')}`);
    } else if (modifiedFiles.length > 0) {
      parts.push(`modified ${modifiedFiles.length} file${modifiedFiles.length > 1 ? 's' : ''}`);
    } else {
      // Extract first sentence or key phrase from response
      const firstLine = responseText.split('\n')[0]?.substring(0, 100) || 'executed action';
      parts.push(firstLine);
    }
    
    return parts.join(' — ');
  }
}

/**
 * Execute an agent action using the default Clawdbot executor.
 *
 * @param context - Dispatch context
 * @returns Action result
 */
export function executeAgentAction(
  context: DispatchContext
): Promise<ActionResult> {
  const executor = new ClawdbotAgentExecutor();
  return executor.executeAction(context);
}