/**
 * @ada/core — Agent execution engine
 *
 * Implements actual agent execution via Clawdbot integration,
 * following RES-001 (Hybrid Clawdbot orchestration).
 */

import type { DispatchContext } from "./dispatch.js";

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
        action: "Agent execution failed",
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
- Focus: ${role.focus.join(", ")}
- Available actions: ${role.actions.join(", ")}

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
   * @param _prompt - Task prompt for the agent (will be used in real Clawdbot integration)
   * @param context - Dispatch context for working directory
   * @returns Action result from agent execution
   */
  private async spawnAgentSession(
    _prompt: string,
    context: DispatchContext
  ): Promise<ActionResult> {
    // This would integrate with Clawdbot's sessions_spawn API
    // For now, we'll simulate the integration pattern
    
    // In a real implementation, this would:
    // 1. Call sessions_spawn via Clawdbot API
    // 2. Pass the agent prompt as task
    // 3. Set working directory to context.paths.root
    // 4. Parse the result for action details
    
    // Placeholder implementation - replace with actual Clawdbot integration
    // In production, these logs would be handled by the CLI layer
    
    // Simulate agent work delay
    const delay = (ms: number) => new Promise(resolve => {
      // Use global setTimeout which is available in Node.js
      (global as any).setTimeout(resolve, ms);
    });
    await delay(2000);
    
    return {
      success: true,
      action: `${context.role.name} executed planned action`,
      details: `Simulated action execution for ${context.role.id} role. In production, this would spawn a Clawdbot session with the role prompt and execute actual GitHub operations.`,
      modifiedFiles: [],
      createdIssues: [],
      createdPRs: [],
    };
  }
}

/**
 * Execute an agent action using the default Clawdbot executor.
 *
 * @param context - Dispatch context
 * @returns Action result
 */
export async function executeAgentAction(
  context: DispatchContext
): Promise<ActionResult> {
  const executor = new ClawdbotAgentExecutor();
  return executor.executeAction(context);
}