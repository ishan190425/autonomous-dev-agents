/**
 * @ada/core — Agent execution unit tests
 *
 * Tests for the ClawdbotAgentExecutor and related functions.
 * Covers the agent execution engine that spawns Clawdbot sessions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ClawdbotAgentExecutor,
  ClaudeCodeAgentExecutor,
  BaseAgentExecutor,
  executeAgentAction,
  getExecutor,
  type ActionResult,
} from '../../src/agent.js';
import type { DispatchContext } from '../../src/dispatch.js';
import type { Role, RotationState, Roster } from '../../src/types.js';

// ─── Test Fixtures ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createMockRole = (overrides: Partial<Role> = {}) => ({
  id: 'engineering',
  name: 'The Builder',
  title: 'Lead Engineer',
  emoji: '⚙️',
  focus: ['typescript_cli', 'core_library', 'github_api'],
  actions: ['write_code', 'create_prs', 'code_review'],
  memory_bank: 'agents/memory/banks/engineering.md',
  ...overrides,
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createMockState = (overrides: Partial<RotationState> = {}) => ({
  current_index: 5,
  last_role: 'product',
  last_run: '2026-02-06T08:00:00.000Z',
  cycle_count: 42,
  history: [],
  next_role: 'engineering',
  next_role_title: '⚙️ The Builder',
  ...overrides,
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createMockRoster = (overrides: Partial<Roster> = {}) => ({
  company: 'ADA (Autonomous Dev Agents)',
  product: 'ADA — Autonomous Dev Agent Teams for Any Repo',
  tagline: 'Ship software with autonomous AI dev teams',
  roles: [createMockRole()],
  rotation_order: ['engineering'],
  ...overrides,
});

const createMockContext = (overrides: Partial<DispatchContext> = {}): DispatchContext => ({
  state: createMockState(),
  roster: createMockRoster(),
  role: createMockRole(),
  memoryBank: `# 🧠 Memory Bank

> The shared brain of the ADA autonomous development team.
> **Last updated:** 2026-02-06 08:00:00 EST | **Cycle:** 42 | **Version:** 3

---

## Current Status

### Active Sprint
- **Sprint 0: Foundation** (ends 2026-02-14, ~95% complete)

### In Progress
- Issue #26: v1.0-alpha Launch Coordination

---

## Active Threads

- **CEO → Ops:** npm publish pipeline
- **Product → All:** Launch Sign-Off

---

## Role State

### ⚙️ Engineering
- **Last:** Implemented memory stats
- **Next:** Phase 2 filters
`,
  paths: {
    root: '/home/user/project',
    roster: '/home/user/project/agents/roster.json',
    state: '/home/user/project/agents/state/rotation.json',
    memoryBank: '/home/user/project/agents/memory/bank.md',
    archives: '/home/user/project/agents/memory/archives',
    playbook: '/home/user/project/agents/playbooks/engineering.md',
  },
  ...overrides,
});

// Note: createMockResult removed - tests now use executeCommand mocks directly

// ─── ClawdbotAgentExecutor Tests ──────────────────────────────────────────────

describe('ClawdbotAgentExecutor', () => {
  let executor: ClawdbotAgentExecutor;
  let executeCommandSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    executor = new ClawdbotAgentExecutor();
    // Mock executeCommand to avoid actual CLI calls
    executeCommandSpy = vi.spyOn(executor as unknown as { executeCommand: (prompt: string, context: DispatchContext) => Promise<string> }, 'executeCommand');
    executeCommandSpy.mockResolvedValue('{"response": "Agent execution completed", "success": true}');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeAction', () => {
    it('returns success result for valid context', async () => {
      const context = createMockContext();
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
      expect(result.action).toBeDefined();
      expect(result.details).toBeDefined();
    });

    it('includes role name in action description', async () => {
      const context = createMockContext({
        role: createMockRole({ name: 'The Scout', id: 'research' }),
      });
      
      const result = await executor.executeAction(context);
      
      expect(result.action).toContain('The Scout');
    });

    it('returns arrays for modified files, issues, and PRs', async () => {
      const context = createMockContext();
      
      const result = await executor.executeAction(context);
      
      expect(Array.isArray(result.modifiedFiles)).toBe(true);
      expect(Array.isArray(result.createdIssues)).toBe(true);
      expect(Array.isArray(result.createdPRs)).toBe(true);
    });

    it('handles different role emojis', async () => {
      const context = createMockContext({
        role: createMockRole({ emoji: '🔬', id: 'research' }),
      });
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
    });

    it('works with minimal memory bank', async () => {
      const context = createMockContext({
        memoryBank: '# Memory Bank\n\nMinimal content.',
      });
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
    });

    it('works with empty memory bank', async () => {
      const context = createMockContext({
        memoryBank: '',
      });
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
    });

    it('handles role with empty focus array', async () => {
      const context = createMockContext({
        role: createMockRole({ focus: [] }),
      });
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
    });

    it('handles role with empty actions array', async () => {
      const context = createMockContext({
        role: createMockRole({ actions: [] }),
      });
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
    });

    it('processes context with high cycle count', async () => {
      const context = createMockContext({
        state: createMockState({ cycle_count: 9999 }),
      });
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
    });

    it('catches errors and returns failure result', async () => {
      const context = createMockContext();
      executeCommandSpy.mockRejectedValue(new Error('Test error'));
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.action).toContain('failed');
    });

    it('handles non-Error exceptions', async () => {
      const context = createMockContext();
      executeCommandSpy.mockRejectedValue('String error');
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('calls executeCommand with prompt', async () => {
      const context = createMockContext();
      
      await executor.executeAction(context);
      
      expect(executeCommandSpy).toHaveBeenCalledTimes(1);
      expect(executeCommandSpy).toHaveBeenCalledWith(expect.any(String), context);
    });
  });
});

// ─── executeAgentAction Factory Tests ─────────────────────────────────────────

describe('executeAgentAction', () => {
  it('creates executor and executes action', async () => {
    const context = createMockContext();
    
    // Mock the prototype method
    const spy = vi.spyOn(ClawdbotAgentExecutor.prototype as unknown as { executeCommand: () => Promise<string> }, 'executeCommand');
    spy.mockResolvedValue('{"response": "test", "success": true}');
    
    const result = await executeAgentAction(context);
    
    expect(result.success).toBe(true);
    expect(result.action).toBeDefined();
    expect(result.details).toBeDefined();
    
    spy.mockRestore();
  });

  it('returns ActionResult interface shape', async () => {
    const context = createMockContext();
    
    const spy = vi.spyOn(ClawdbotAgentExecutor.prototype as unknown as { executeCommand: () => Promise<string> }, 'executeCommand');
    spy.mockResolvedValue('{"response": "test", "success": true}');
    
    const result = await executeAgentAction(context);
    
    // Verify ActionResult interface
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.action).toBe('string');
    expect(typeof result.details).toBe('string');
    expect(result.modifiedFiles === undefined || Array.isArray(result.modifiedFiles)).toBe(true);
    expect(result.createdIssues === undefined || Array.isArray(result.createdIssues)).toBe(true);
    expect(result.createdPRs === undefined || Array.isArray(result.createdPRs)).toBe(true);
    expect(result.error === undefined || typeof result.error === 'string').toBe(true);
    
    spy.mockRestore();
  });

  it('works with all role types', async () => {
    const roles = ['ceo', 'research', 'product', 'scrum', 'qa', 'engineering', 'ops', 'growth', 'design', 'frontier'];
    
    const spy = vi.spyOn(ClawdbotAgentExecutor.prototype as unknown as { executeCommand: () => Promise<string> }, 'executeCommand');
    spy.mockResolvedValue('{"response": "test", "success": true}');
    
    for (const roleId of roles) {
      const context = createMockContext({
        role: createMockRole({ id: roleId, name: `Test ${roleId}` }),
      });
      
      const result = await executeAgentAction(context);
      
      expect(result.success).toBe(true);
    }
    
    spy.mockRestore();
  });
});

// ─── Agent Prompt Building Tests ──────────────────────────────────────────────

describe('Agent prompt building (via executeAction call)', () => {
  let executor: ClawdbotAgentExecutor;
  let executeCommandSpy: ReturnType<typeof vi.spyOn>;
  let capturedPrompt: string;

  beforeEach(() => {
    executor = new ClawdbotAgentExecutor();
    executeCommandSpy = vi.spyOn(executor as unknown as { executeCommand: (prompt: string, context: DispatchContext) => Promise<string> }, 'executeCommand');
    executeCommandSpy.mockImplementation((prompt) => {
      capturedPrompt = prompt;
      return Promise.resolve('{"response": "test", "success": true}');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes role emoji and name in prompt', async () => {
    const context = createMockContext({
      role: createMockRole({ emoji: '🔬', name: 'The Scout', title: 'Head of Research' }),
    });
    
    await executor.executeAction(context);
    
    expect(capturedPrompt).toContain('🔬');
    expect(capturedPrompt).toContain('The Scout');
    expect(capturedPrompt).toContain('Head of Research');
  });

  it('includes role ID in playbook path', async () => {
    const context = createMockContext({
      role: createMockRole({ id: 'research' }),
    });
    
    await executor.executeAction(context);
    
    expect(capturedPrompt).toContain('agents/playbooks/research.md');
  });

  it('includes cycle count in prompt', async () => {
    const context = createMockContext({
      state: createMockState({ cycle_count: 99 }),
    });
    
    await executor.executeAction(context);
    
    expect(capturedPrompt).toContain('Cycle: 100'); // cycle_count + 1
  });

  it('includes focus areas in prompt', async () => {
    const context = createMockContext({
      role: createMockRole({ focus: ['typescript_cli', 'core_library'] }),
    });
    
    await executor.executeAction(context);
    
    expect(capturedPrompt).toContain('typescript_cli');
    expect(capturedPrompt).toContain('core_library');
  });

  it('includes actions in prompt', async () => {
    const context = createMockContext({
      role: createMockRole({ actions: ['write_code', 'create_prs'] }),
    });
    
    await executor.executeAction(context);
    
    expect(capturedPrompt).toContain('write_code');
    expect(capturedPrompt).toContain('create_prs');
  });

  it('includes working directory in prompt', async () => {
    const context = createMockContext({
      paths: {
        root: '/custom/path/to/project',
        roster: '/custom/path/to/project/agents/roster.json',
        state: '/custom/path/to/project/agents/state/rotation.json',
        memoryBank: '/custom/path/to/project/agents/memory/bank.md',
        archives: '/custom/path/to/project/agents/memory/archives',
        playbook: '/custom/path/to/project/agents/playbooks/engineering.md',
      },
    });
    
    await executor.executeAction(context);
    
    expect(capturedPrompt).toContain('/custom/path/to/project');
  });

  it('includes memory bank summary in prompt', async () => {
    const context = createMockContext({
      memoryBank: `# Memory Bank

## Current Status

### Active Sprint
- Sprint 0: Foundation (95% complete)

### In Progress  
- Issue #26: Launch

## Active Threads

- CEO → Ops: npm publish
`,
    });
    
    await executor.executeAction(context);
    
    expect(capturedPrompt).toContain('Current Status');
    expect(capturedPrompt).toContain('Active Threads');
  });

  it('extracts Current Status section from memory bank', async () => {
    const context = createMockContext({
      memoryBank: `# Memory Bank

## Current Status

### Sprint Status
- Sprint 0 is 95% complete

### Blockers
- None
`,
    });
    
    await executor.executeAction(context);
    
    expect(capturedPrompt).toContain('Sprint Status');
  });

  it('extracts Active Threads section from memory bank', async () => {
    const context = createMockContext({
      memoryBank: `# Memory Bank

## Active Threads

- Thread A: Important dependency
- Thread B: Cross-team coordination
`,
    });
    
    await executor.executeAction(context);
    
    expect(capturedPrompt).toContain('Thread A');
    expect(capturedPrompt).toContain('Thread B');
  });

  it('handles memory bank without expected sections', async () => {
    const context = createMockContext({
      memoryBank: `# Memory Bank

Just some content without the expected headings.
This should still work gracefully.
`,
    });
    
    await executor.executeAction(context);
    
    // Should still generate a valid prompt
    expect(capturedPrompt).toContain('MEMORY BANK SUMMARY');
  });

  it('handles empty memory bank', async () => {
    const context = createMockContext({
      memoryBank: '',
    });
    
    await executor.executeAction(context);
    
    expect(capturedPrompt).toContain('Memory bank loaded successfully');
  });
});

// ─── Error Handling Tests ─────────────────────────────────────────────────────

describe('Error handling', () => {
  let executor: ClawdbotAgentExecutor;
  let executeCommandSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    executor = new ClawdbotAgentExecutor();
    executeCommandSpy = vi.spyOn(executor as unknown as { executeCommand: () => Promise<string> }, 'executeCommand');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('catches Error instances and extracts message', async () => {
    const context = createMockContext();
    executeCommandSpy.mockRejectedValue(new Error('Database connection failed'));
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.action).toContain('failed');
    expect(result.details).toContain('Database connection failed');
  });

  it('handles string thrown as error', async () => {
    const context = createMockContext();
    executeCommandSpy.mockRejectedValue('String thrown as error');
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles number thrown as error', async () => {
    const context = createMockContext();
    executeCommandSpy.mockRejectedValue(404);
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles null thrown as error', async () => {
    const context = createMockContext();
    executeCommandSpy.mockRejectedValue(null);
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles undefined thrown as error', async () => {
    const context = createMockContext();
    executeCommandSpy.mockRejectedValue(undefined);
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles object thrown as error', async () => {
    const context = createMockContext();
    executeCommandSpy.mockRejectedValue({ code: 'ERR_NETWORK', message: 'Network error' });
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.details).toBeDefined();
  });
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  let executor: ClawdbotAgentExecutor;
  let executeCommandSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    executor = new ClawdbotAgentExecutor();
    executeCommandSpy = vi.spyOn(executor as unknown as { executeCommand: () => Promise<string> }, 'executeCommand');
    executeCommandSpy.mockResolvedValue('{"response": "test", "success": true}');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles context with zero cycle count', async () => {
    const context = createMockContext({
      state: createMockState({ cycle_count: 0 }),
    });
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(true);
  });

  it('handles context with negative cycle count', async () => {
    const context = createMockContext({
      state: createMockState({ cycle_count: -1 }),
    });
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(true);
  });

  it('handles role with unicode in name', async () => {
    const context = createMockContext({
      role: createMockRole({ name: '测试角色', title: 'テストリーダー' }),
    });
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(true);
  });

  it('handles empty roster company name', async () => {
    const context = createMockContext({
      roster: createMockRoster({ company: '' }),
    });
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(true);
  });

  it('handles very long role focus list', async () => {
    const longFocus = Array(100).fill('focus_item').map((item, i) => `${item}_${i}`);
    const context = createMockContext({
      role: createMockRole({ focus: longFocus }),
    });
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(true);
  });

  it('handles very long role actions list', async () => {
    const longActions = Array(50).fill('action').map((item, i) => `${item}_${i}`);
    const context = createMockContext({
      role: createMockRole({ actions: longActions }),
    });
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(true);
  });

  it('handles memory bank with only whitespace', async () => {
    const context = createMockContext({
      memoryBank: '   \n\n   \t\t\n   ',
    });
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(true);
  });

  it('handles paths with spaces', async () => {
    const context = createMockContext({
      paths: {
        root: '/home/user/my project/test dir',
        roster: '/home/user/my project/test dir/agents/roster.json',
        state: '/home/user/my project/test dir/agents/state/rotation.json',
        memoryBank: '/home/user/my project/test dir/agents/memory/bank.md',
        archives: '/home/user/my project/test dir/agents/memory/archives',
        playbook: '/home/user/my project/test dir/agents/playbooks/engineering.md',
      },
    });
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(true);
  });
});

// ─── ActionResult Interface Tests ─────────────────────────────────────────────

describe('ActionResult interface compliance', () => {
  it('success result has all required fields', async () => {
    const executor = new ClawdbotAgentExecutor();
    const spy = vi.spyOn(executor as unknown as { executeCommand: () => Promise<string> }, 'executeCommand');
    spy.mockResolvedValue('{"response": "test", "success": true}');
    
    const context = createMockContext();
    const result = await executor.executeAction(context);
    
    // Required fields
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('action');
    expect(result).toHaveProperty('details');
    
    spy.mockRestore();
  });

  it('failure result has error field', async () => {
    const executor = new ClawdbotAgentExecutor();
    const spy = vi.spyOn(executor as unknown as { executeCommand: () => Promise<string> }, 'executeCommand');
    spy.mockRejectedValue(new Error('Test failure'));
    
    const context = createMockContext();
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    
    spy.mockRestore();
  });

  it('optional fields are correct types when present', async () => {
    const executor = new ClawdbotAgentExecutor();
    const spy = vi.spyOn(executor as unknown as { executeCommand: () => Promise<string> }, 'executeCommand');
    // Mock output that will be parsed and enriched
    spy.mockResolvedValue('Modified files: file1.ts, file2.ts. Created issues: #1, #2, #3. Created PR: #10');
    
    const context = createMockContext();
    const result = await executor.executeAction(context);
    
    expect(Array.isArray(result.modifiedFiles)).toBe(true);
    expect(Array.isArray(result.createdIssues)).toBe(true);
    expect(Array.isArray(result.createdPRs)).toBe(true);
    
    spy.mockRestore();
  });
});

// ─── BaseAgentExecutor Shared Functionality Tests ────────────────────────────────

describe('BaseAgentExecutor shared functionality', () => {
  // Create a concrete implementation for testing
  class TestExecutor extends BaseAgentExecutor {
    protected buildPrompt(): string {
      return 'test prompt';
    }

    protected executeCommand(): Promise<string> {
      return Promise.resolve('test output');
    }

    protected parseResponse(): Partial<ActionResult> {
      return { success: true, details: 'test' };
    }
  }

  let executor: TestExecutor;

  beforeEach(() => {
    executor = new TestExecutor();
  });

  describe('extractModifiedFiles', () => {
    it('extracts files from "modified:" pattern', () => {
      const text = 'modified: src/file1.ts\nmodified: src/file2.ts';
      const files = (executor as unknown as { extractModifiedFiles: (text: string) => string[] }).extractModifiedFiles(text);
      expect(files).toContain('src/file1.ts');
      expect(files).toContain('src/file2.ts');
    });

    it('extracts files from "created:" pattern', () => {
      const text = 'created: new-file.ts';
      const files = (executor as unknown as { extractModifiedFiles: (text: string) => string[] }).extractModifiedFiles(text);
      expect(files).toContain('new-file.ts');
    });

    it('returns empty array when no files found', () => {
      const text = 'No files mentioned here';
      const files = (executor as unknown as { extractModifiedFiles: (text: string) => string[] }).extractModifiedFiles(text);
      expect(files).toEqual([]);
    });
  });

  describe('extractIssueNumbers', () => {
    it('extracts issue numbers from #123 pattern', () => {
      const text = 'Fixed issue #123 and #456';
      const issues = (executor as unknown as { extractIssueNumbers: (text: string) => number[] }).extractIssueNumbers(text);
      expect(issues).toContain(123);
      expect(issues).toContain(456);
    });

    it('returns empty array when no issues found', () => {
      const text = 'No issues mentioned';
      const issues = (executor as unknown as { extractIssueNumbers: (text: string) => number[] }).extractIssueNumbers(text);
      expect(issues).toEqual([]);
    });
  });

  describe('extractPRNumbers', () => {
    it('extracts PR numbers from "PR #123" pattern', () => {
      const text = 'Merged PR #123 and PR #456';
      const prs = (executor as unknown as { extractPRNumbers: (text: string) => number[] }).extractPRNumbers(text);
      expect(prs).toContain(123);
      expect(prs).toContain(456);
    });

    it('returns empty array when no PRs found', () => {
      const text = 'No PRs mentioned';
      const prs = (executor as unknown as { extractPRNumbers: (text: string) => number[] }).extractPRNumbers(text);
      expect(prs).toEqual([]);
    });
  });

  describe('extractMemoryBankSummary', () => {
    it('extracts Current Status section', () => {
      const memoryBank = `# Memory Bank

## Current Status

### Sprint
- Sprint 0: 95% complete
`;
      const summary = (executor as unknown as { extractMemoryBankSummary: (text: string) => string }).extractMemoryBankSummary(memoryBank);
      expect(summary).toContain('Current Status');
      expect(summary).toContain('Sprint');
    });

    it('returns default message when sections not found', () => {
      const memoryBank = '# Memory Bank\n\nSome content';
      const summary = (executor as unknown as { extractMemoryBankSummary: (text: string) => string }).extractMemoryBankSummary(memoryBank);
      expect(summary).toBe('Memory bank loaded successfully.');
    });
  });
});

// ─── ClaudeCodeAgentExecutor Tests ──────────────────────────────────────────────

describe('ClaudeCodeAgentExecutor', () => {
  let executor: ClaudeCodeAgentExecutor;

  beforeEach(() => {
    executor = new ClaudeCodeAgentExecutor();
  });

  describe('buildPrompt', () => {
    it('includes role information in prompt', () => {
      const context = createMockContext({
        role: createMockRole({ emoji: '🔬', name: 'The Scout', id: 'research' }),
      });
      const prompt = (executor as unknown as { buildPrompt: (context: DispatchContext) => string }).buildPrompt(context);
      expect(prompt).toContain('🔬');
      expect(prompt).toContain('The Scout');
      expect(prompt).toContain('research');
    });

    it('includes cycle count', () => {
      const context = createMockContext({
        state: createMockState({ cycle_count: 42 }),
      });
      const prompt = (executor as unknown as { buildPrompt: (context: DispatchContext) => string }).buildPrompt(context);
      expect(prompt).toContain('Cycle: 43');
    });
  });

  describe('parseResponse', () => {
    it('parses JSON response', () => {
      const output = 'Some text\n{"response": "Success", "success": true}\nMore text';
      const context = createMockContext();
      const parseMethod = (executor as unknown as { parseResponse: (output: string, context: DispatchContext) => Partial<ActionResult> }).parseResponse;
      const result = parseMethod(output, context);
      expect(result.success).toBe(true);
      expect(result.details).toBe('Success');
    });

    it('handles plain text response', () => {
      const output = 'Plain text output from Claude Code';
      const context = createMockContext();
      const parseMethod = (executor as unknown as { parseResponse: (output: string, context: DispatchContext) => Partial<ActionResult> }).parseResponse;
      const result = parseMethod(output, context);
      expect(result.success).toBe(true);
      expect(result.details).toBe('Plain text output from Claude Code');
    });
  });
});

// ─── Executor Selection Tests ───────────────────────────────────────────────────

describe('getExecutor', () => {
  it('returns ClawdbotAgentExecutor by default', () => {
    const executor = getExecutor();
    expect(executor).toBeInstanceOf(ClawdbotAgentExecutor);
  });

  it('returns ClaudeCodeAgentExecutor for "claude-code"', () => {
    const executor = getExecutor('claude-code');
    expect(executor).toBeInstanceOf(ClaudeCodeAgentExecutor);
  });

  it('handles case-insensitive input', () => {
    const executor1 = getExecutor('CLAUDE-CODE');
    const executor2 = getExecutor('Claude-Code');
    expect(executor1).toBeInstanceOf(ClaudeCodeAgentExecutor);
    expect(executor2).toBeInstanceOf(ClaudeCodeAgentExecutor);
  });

  it('falls back to Clawdbot for unknown executor', () => {
    const executor = getExecutor('unknown-executor');
    expect(executor).toBeInstanceOf(ClawdbotAgentExecutor);
  });
});

// ─── executeAgentAction with Executor Selection Tests ───────────────────────────

describe('executeAgentAction with executor selection', () => {
  it('uses Clawdbot by default', async () => {
    const context = createMockContext();
    const spy = vi.spyOn(ClawdbotAgentExecutor.prototype as unknown as { executeCommand: () => Promise<string> }, 'executeCommand');
    spy.mockResolvedValue('{"response": "test"}');

    await executeAgentAction(context);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('uses Claude Code when specified', async () => {
    const context = createMockContext();
    const spy = vi.spyOn(ClaudeCodeAgentExecutor.prototype as unknown as { executeCommand: () => Promise<string> }, 'executeCommand');
    spy.mockResolvedValue('{"response": "test"}');

    await executeAgentAction(context, 'claude-code');

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
