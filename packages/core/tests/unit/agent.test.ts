/**
 * @ada/core — Agent execution unit tests
 *
 * Tests for the ClawdbotAgentExecutor and related functions.
 * Covers the agent execution engine that spawns Clawdbot sessions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ClawdbotAgentExecutor,
  executeAgentAction,
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

// Mock result for spawnAgentSession
const createMockResult = (roleId: string, roleName: string): ActionResult => ({
  success: true,
  action: `${roleName} executed planned action`,
  details: `Simulated action execution for ${roleId} role. In production, this would spawn a Clawdbot session with the role prompt and execute actual GitHub operations.`,
  modifiedFiles: [],
  createdIssues: [],
  createdPRs: [],
});

// ─── ClawdbotAgentExecutor Tests ──────────────────────────────────────────────

describe('ClawdbotAgentExecutor', () => {
  let executor: ClawdbotAgentExecutor;
  let spawnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    executor = new ClawdbotAgentExecutor();
    // Mock the private spawnAgentSession to avoid 2s delay
    spawnSpy = vi.spyOn(executor as unknown as { spawnAgentSession: () => Promise<ActionResult> }, 'spawnAgentSession');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeAction', () => {
    it('returns success result for valid context', async () => {
      const context = createMockContext();
      spawnSpy.mockResolvedValue(createMockResult('engineering', 'The Builder'));
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
      expect(result.action).toContain('The Builder');
      expect(result.details).toContain('engineering');
    });

    it('includes role name in action description', async () => {
      const context = createMockContext({
        role: createMockRole({ name: 'The Scout', id: 'research' }),
      });
      spawnSpy.mockResolvedValue(createMockResult('research', 'The Scout'));
      
      const result = await executor.executeAction(context);
      
      expect(result.action).toContain('The Scout');
    });

    it('includes role ID in action details', async () => {
      const context = createMockContext({
        role: createMockRole({ id: 'product', name: 'The PM' }),
      });
      spawnSpy.mockResolvedValue(createMockResult('product', 'The PM'));
      
      const result = await executor.executeAction(context);
      
      expect(result.details).toContain('product');
    });

    it('returns arrays for modified files, issues, and PRs', async () => {
      const context = createMockContext();
      spawnSpy.mockResolvedValue(createMockResult('engineering', 'The Builder'));
      
      const result = await executor.executeAction(context);
      
      expect(Array.isArray(result.modifiedFiles)).toBe(true);
      expect(Array.isArray(result.createdIssues)).toBe(true);
      expect(Array.isArray(result.createdPRs)).toBe(true);
    });

    it('handles different role emojis', async () => {
      const context = createMockContext({
        role: createMockRole({ emoji: '🔬', id: 'research' }),
      });
      spawnSpy.mockResolvedValue(createMockResult('research', 'Test'));
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
    });

    it('works with minimal memory bank', async () => {
      const context = createMockContext({
        memoryBank: '# Memory Bank\n\nMinimal content.',
      });
      spawnSpy.mockResolvedValue(createMockResult('engineering', 'The Builder'));
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
    });

    it('works with empty memory bank', async () => {
      const context = createMockContext({
        memoryBank: '',
      });
      spawnSpy.mockResolvedValue(createMockResult('engineering', 'The Builder'));
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
    });

    it('handles role with empty focus array', async () => {
      const context = createMockContext({
        role: createMockRole({ focus: [] }),
      });
      spawnSpy.mockResolvedValue(createMockResult('engineering', 'The Builder'));
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
    });

    it('handles role with empty actions array', async () => {
      const context = createMockContext({
        role: createMockRole({ actions: [] }),
      });
      spawnSpy.mockResolvedValue(createMockResult('engineering', 'The Builder'));
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
    });

    it('processes context with high cycle count', async () => {
      const context = createMockContext({
        state: createMockState({ cycle_count: 9999 }),
      });
      spawnSpy.mockResolvedValue(createMockResult('engineering', 'The Builder'));
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(true);
    });

    it('catches errors and returns failure result', async () => {
      const context = createMockContext();
      spawnSpy.mockRejectedValue(new Error('Test error'));
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.action).toContain('failed');
    });

    it('handles non-Error exceptions', async () => {
      const context = createMockContext();
      spawnSpy.mockRejectedValue('String error');
      
      const result = await executor.executeAction(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });

    it('calls spawnAgentSession with prompt', async () => {
      const context = createMockContext();
      spawnSpy.mockResolvedValue(createMockResult('engineering', 'The Builder'));
      
      await executor.executeAction(context);
      
      expect(spawnSpy).toHaveBeenCalledTimes(1);
      // First arg is the prompt, second is context
      expect(spawnSpy).toHaveBeenCalledWith(expect.any(String), context);
    });
  });
});

// ─── executeAgentAction Factory Tests ─────────────────────────────────────────

describe('executeAgentAction', () => {
  it('creates executor and executes action', async () => {
    const context = createMockContext();
    
    // Mock the prototype method
    const spy = vi.spyOn(ClawdbotAgentExecutor.prototype as unknown as { spawnAgentSession: () => Promise<ActionResult> }, 'spawnAgentSession');
    spy.mockResolvedValue(createMockResult('engineering', 'The Builder'));
    
    const result = await executeAgentAction(context);
    
    expect(result.success).toBe(true);
    expect(result.action).toBeDefined();
    expect(result.details).toBeDefined();
    
    spy.mockRestore();
  });

  it('returns ActionResult interface shape', async () => {
    const context = createMockContext();
    
    const spy = vi.spyOn(ClawdbotAgentExecutor.prototype as unknown as { spawnAgentSession: () => Promise<ActionResult> }, 'spawnAgentSession');
    spy.mockResolvedValue(createMockResult('engineering', 'The Builder'));
    
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
    
    const spy = vi.spyOn(ClawdbotAgentExecutor.prototype as unknown as { spawnAgentSession: () => Promise<ActionResult> }, 'spawnAgentSession');
    
    for (const roleId of roles) {
      spy.mockResolvedValue(createMockResult(roleId, `Test ${roleId}`));
      
      const context = createMockContext({
        role: createMockRole({ id: roleId, name: `Test ${roleId}` }),
      });
      
      const result = await executeAgentAction(context);
      
      expect(result.success).toBe(true);
      expect(result.details).toContain(roleId);
    }
    
    spy.mockRestore();
  });
});

// ─── Agent Prompt Building Tests ──────────────────────────────────────────────

describe('Agent prompt building (via executeAction call)', () => {
  let executor: ClawdbotAgentExecutor;
  let spawnSpy: ReturnType<typeof vi.spyOn>;
  let capturedPrompt: string;

  beforeEach(() => {
    executor = new ClawdbotAgentExecutor();
    spawnSpy = vi.spyOn(executor as unknown as { spawnAgentSession: (prompt: string, context: DispatchContext) => Promise<ActionResult> }, 'spawnAgentSession');
    spawnSpy.mockImplementation((prompt) => {
      capturedPrompt = prompt;
      return Promise.resolve(createMockResult('test', 'Test'));
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
  let spawnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    executor = new ClawdbotAgentExecutor();
    spawnSpy = vi.spyOn(executor as unknown as { spawnAgentSession: () => Promise<ActionResult> }, 'spawnAgentSession');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('catches Error instances and extracts message', async () => {
    const context = createMockContext();
    spawnSpy.mockRejectedValue(new Error('Database connection failed'));
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Database connection failed');
    expect(result.action).toBe('Agent execution failed');
    expect(result.details).toContain('Database connection failed');
  });

  it('handles string thrown as error', async () => {
    const context = createMockContext();
    spawnSpy.mockRejectedValue('String thrown as error');
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('String thrown as error');
  });

  it('handles number thrown as error', async () => {
    const context = createMockContext();
    spawnSpy.mockRejectedValue(404);
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('404');
  });

  it('handles null thrown as error', async () => {
    const context = createMockContext();
    spawnSpy.mockRejectedValue(null);
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('null');
  });

  it('handles undefined thrown as error', async () => {
    const context = createMockContext();
    spawnSpy.mockRejectedValue(undefined);
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('undefined');
  });

  it('handles object thrown as error', async () => {
    const context = createMockContext();
    spawnSpy.mockRejectedValue({ code: 'ERR_NETWORK', message: 'Network error' });
    
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.details).toContain('Error during agent execution');
  });
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  let executor: ClawdbotAgentExecutor;
  let spawnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    executor = new ClawdbotAgentExecutor();
    spawnSpy = vi.spyOn(executor as unknown as { spawnAgentSession: () => Promise<ActionResult> }, 'spawnAgentSession');
    spawnSpy.mockResolvedValue(createMockResult('test', 'Test'));
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
    const spy = vi.spyOn(executor as unknown as { spawnAgentSession: () => Promise<ActionResult> }, 'spawnAgentSession');
    spy.mockResolvedValue(createMockResult('test', 'Test'));
    
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
    const spy = vi.spyOn(executor as unknown as { spawnAgentSession: () => Promise<ActionResult> }, 'spawnAgentSession');
    spy.mockRejectedValue(new Error('Test failure'));
    
    const context = createMockContext();
    const result = await executor.executeAction(context);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    
    spy.mockRestore();
  });

  it('optional fields are correct types when present', async () => {
    const executor = new ClawdbotAgentExecutor();
    const spy = vi.spyOn(executor as unknown as { spawnAgentSession: () => Promise<ActionResult> }, 'spawnAgentSession');
    spy.mockResolvedValue({
      success: true,
      action: 'Test action',
      details: 'Test details',
      modifiedFiles: ['file1.ts', 'file2.ts'],
      createdIssues: [1, 2, 3],
      createdPRs: [10],
    });
    
    const context = createMockContext();
    const result = await executor.executeAction(context);
    
    expect(Array.isArray(result.modifiedFiles)).toBe(true);
    expect(result.modifiedFiles).toHaveLength(2);
    expect(Array.isArray(result.createdIssues)).toBe(true);
    expect(result.createdIssues).toHaveLength(3);
    expect(Array.isArray(result.createdPRs)).toBe(true);
    expect(result.createdPRs).toHaveLength(1);
    
    spy.mockRestore();
  });
});
