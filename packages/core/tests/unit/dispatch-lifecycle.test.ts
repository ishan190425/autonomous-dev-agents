/**
 * @ada/core — Dispatch lifecycle tests
 *
 * Comprehensive tests for dispatch module async functions:
 * - loadContext: Phase 1 context loading
 * - checkCompression: Phase 5 compression check
 * - completeDispatch: Phase 7 dispatch completion
 *
 * These tests use temp directories to simulate real file operations
 * without affecting the actual project state.
 *
 * @author ⚙️ Engineering (Cycle 673)
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadContext,
  checkCompression,
  completeDispatch,
  type CompleteDispatchOptions,
} from '../../src/dispatch.js';
import type { Roster, RotationState } from '../../src/types.js';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

const createTestRoster = (): Roster => ({
  name: 'Test Team',
  description: 'Test roster for dispatch tests',
  roles: [
    {
      id: 'engineering',
      name: 'The Builder',
      title: 'Lead Engineer',
      emoji: '⚙️',
      focus: ['typescript', 'testing'],
      actions: ['write_code', 'review'],
    },
    {
      id: 'ops',
      name: 'The Operator',
      title: 'DevOps Lead',
      emoji: '🛡️',
      focus: ['infrastructure'],
      actions: ['deploy', 'monitor'],
    },
    {
      id: 'product',
      name: 'The PM',
      title: 'Product Manager',
      emoji: '📦',
      focus: ['features'],
      actions: ['spec', 'prioritize'],
    },
  ],
  rotation_order: ['engineering', 'ops', 'product'],
});

const createTestRotationState = (cycleCount: number = 100): RotationState => ({
  current_index: 0,
  last_role: 'product',
  last_run: new Date().toISOString(),
  cycle_count: cycleCount,
  history: [
    {
      role: 'product',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      cycle: cycleCount - 1,
      action: '📦 Previous product action',
    },
  ],
});

const createTestMemoryBank = (cycle: number = 100, version: number = 5): string => `# 🧠 Memory Bank

> **Last updated:** ${new Date().toISOString()} | **Cycle:** ${cycle} | **Version:** ${version}

---

## Current Status

- Sprint 2 in progress
- All tests passing

## Role State

### ⚙️ Engineering
- **Last:** Test implementation
- **Next:** More tests

---

## Lessons Learned

- L1: Always write tests
- L2: Compression is important
`;

const createLargeMemoryBank = (cycle: number = 100, version: number = 5): string => {
  // Create a bank that exceeds 200 lines to trigger compression
  const lines: string[] = [
    '# 🧠 Memory Bank',
    '',
    `> **Last updated:** ${new Date().toISOString()} | **Cycle:** ${cycle} | **Version:** ${version}`,
    '',
    '---',
    '',
    '## Current Status',
    '',
  ];

  // Add enough content to exceed 200 lines
  for (let i = 1; i <= 200; i++) {
    lines.push(`- Item ${i}: Some content that takes up space`);
  }

  lines.push('', '---', '');

  return lines.join('\n');
};

// ─── Test Helpers ────────────────────────────────────────────────────────────

interface TestFixture {
  rootDir: string;
  agentsDir: string;
  roster: Roster;
  state: RotationState;
  bank: string;
}

async function createTestFixture(
  options: {
    cycleCount?: number;
    version?: number;
    largeBank?: boolean;
  } = {}
): Promise<TestFixture> {
  const { cycleCount = 100, version = 5, largeBank = false } = options;

  // Create temp directory
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ada-dispatch-test-'));
  const agentsDir = path.join(rootDir, 'agents');

  // Create directory structure
  await fs.mkdir(path.join(agentsDir, 'state'), { recursive: true });
  await fs.mkdir(path.join(agentsDir, 'memory', 'archives'), { recursive: true });
  await fs.mkdir(path.join(agentsDir, 'playbooks'), { recursive: true });

  // Create test files
  const roster = createTestRoster();
  const state = createTestRotationState(cycleCount);
  const bank = largeBank
    ? createLargeMemoryBank(cycleCount, version)
    : createTestMemoryBank(cycleCount, version);

  await fs.writeFile(
    path.join(agentsDir, 'roster.json'),
    JSON.stringify(roster, null, 2)
  );
  await fs.writeFile(
    path.join(agentsDir, 'state', 'rotation.json'),
    JSON.stringify(state, null, 2)
  );
  await fs.writeFile(path.join(agentsDir, 'memory', 'bank.md'), bank);

  // Create playbooks for each role
  for (const role of roster.roles) {
    await fs.writeFile(
      path.join(agentsDir, 'playbooks', `${role.id}.md`),
      `# ${role.emoji} ${role.name} Playbook\n\nTest playbook for ${role.id}.`
    );
  }

  return { rootDir, agentsDir, roster, state, bank };
}

async function cleanupFixture(fixture: TestFixture): Promise<void> {
  try {
    await fs.rm(fixture.rootDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

// ─── loadContext Tests ───────────────────────────────────────────────────────

describe('loadContext', () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await createTestFixture();
  });

  afterEach(async () => {
    await cleanupFixture(fixture);
  });

  it('loads all context files successfully', async () => {
    const context = await loadContext(fixture.rootDir);

    expect(context).not.toBeNull();
    expect(context!.state).toBeDefined();
    expect(context!.roster).toBeDefined();
    expect(context!.role).toBeDefined();
    expect(context!.memoryBank).toBeDefined();
    expect(context!.paths).toBeDefined();
  });

  it('returns the current role based on rotation state', async () => {
    const context = await loadContext(fixture.rootDir);

    // current_index is 0, so role should be 'engineering' (first in rotation)
    expect(context!.role.id).toBe('engineering');
    expect(context!.role.name).toBe('The Builder');
    expect(context!.role.emoji).toBe('⚙️');
  });

  it('resolves all paths correctly', async () => {
    const context = await loadContext(fixture.rootDir);
    const paths = context!.paths;

    expect(paths.root).toBe(fixture.rootDir);
    expect(paths.roster).toContain('roster.json');
    expect(paths.state).toContain('rotation.json');
    expect(paths.memoryBank).toContain('bank.md');
    expect(paths.archives).toContain('archives');
    expect(paths.playbook).toContain('engineering.md');
    expect(paths.stream).toContain('stream.jsonl');
  });

  it('enables MemoryStream by default', async () => {
    const context = await loadContext(fixture.rootDir);

    expect(context!.memoryStream).toBeDefined();
  });

  it('disables MemoryStream when option is false', async () => {
    const context = await loadContext(fixture.rootDir, {}, {
      enableMemoryStream: false,
    });

    expect(context!.memoryStream).toBeUndefined();
  });

  it('uses custom stream path when provided', async () => {
    const customPath = path.join(fixture.rootDir, 'custom-stream.jsonl');
    const context = await loadContext(fixture.rootDir, {}, {
      streamPath: customPath,
    });

    expect(context!.paths.stream).toBe(customPath);
  });

  it('loads reflection context by default (Phase 1b)', async () => {
    const context = await loadContext(fixture.rootDir);

    // reflectionContext is a string (may be empty if no reflections in history)
    expect(typeof context!.reflectionContext).toBe('string');
  });

  it('disables reflection context when option is false', async () => {
    const context = await loadContext(fixture.rootDir, {}, {
      enableReflections: false,
    });

    expect(context!.reflectionContext).toBe('');
  });

  it('respects custom reflection count', async () => {
    // Create state with multiple reflections in history
    const stateWithReflections: RotationState = {
      current_index: 0,
      last_role: 'engineering',
      last_run: new Date().toISOString(),
      cycle_count: 105,
      history: Array.from({ length: 10 }, (_, i) => ({
        role: 'engineering',
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        cycle: 104 - i,
        action: `Action ${i + 1}`,
        reflection: {
          outcome: 'success' as const,
          whatWorked: `What worked in cycle ${104 - i}`,
        },
      })),
    };

    await fs.writeFile(
      path.join(fixture.agentsDir, 'state', 'rotation.json'),
      JSON.stringify(stateWithReflections, null, 2)
    );

    const context = await loadContext(fixture.rootDir, {}, {
      reflectionCount: 5,
    });

    // Should include reflections (exact format depends on formatting function)
    expect(context!.reflectionContext).toBeDefined();
  });

  it('loads memory bank content', async () => {
    const context = await loadContext(fixture.rootDir);

    expect(context!.memoryBank).toContain('Memory Bank');
    expect(context!.memoryBank).toContain('Current Status');
    expect(context!.memoryBank).toContain('Role State');
  });

  it('uses custom agentsDir from config', async () => {
    // Create custom agents directory
    const customDir = path.join(fixture.rootDir, '.ada');
    await fs.mkdir(path.join(customDir, 'state'), { recursive: true });
    await fs.mkdir(path.join(customDir, 'memory', 'archives'), { recursive: true });
    await fs.mkdir(path.join(customDir, 'playbooks'), { recursive: true });

    await fs.writeFile(
      path.join(customDir, 'roster.json'),
      JSON.stringify(fixture.roster, null, 2)
    );
    await fs.writeFile(
      path.join(customDir, 'state', 'rotation.json'),
      JSON.stringify(fixture.state, null, 2)
    );
    await fs.writeFile(path.join(customDir, 'memory', 'bank.md'), fixture.bank);
    await fs.writeFile(
      path.join(customDir, 'playbooks', 'engineering.md'),
      '# Test'
    );

    const context = await loadContext(fixture.rootDir, { agentsDir: '.ada' });

    expect(context).not.toBeNull();
    expect(context!.paths.roster).toContain('.ada');
  });

  it('returns null when no roles are configured', async () => {
    // Write empty roster
    const emptyRoster: Roster = {
      name: 'Empty Team',
      description: 'No roles',
      roles: [],
      rotation_order: [],
    };

    await fs.writeFile(
      path.join(fixture.agentsDir, 'roster.json'),
      JSON.stringify(emptyRoster, null, 2)
    );

    const context = await loadContext(fixture.rootDir);

    expect(context).toBeNull();
  });

  it('handles different rotation positions', async () => {
    // Set current_index to 1 (ops)
    const state: RotationState = {
      ...fixture.state,
      current_index: 1,
      last_role: 'engineering',
    };

    await fs.writeFile(
      path.join(fixture.agentsDir, 'state', 'rotation.json'),
      JSON.stringify(state, null, 2)
    );

    const context = await loadContext(fixture.rootDir);

    expect(context!.role.id).toBe('ops');
    expect(context!.paths.playbook).toContain('ops.md');
  });
});

// ─── checkCompression Tests ──────────────────────────────────────────────────

describe('checkCompression', () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await createTestFixture();
  });

  afterEach(async () => {
    await cleanupFixture(fixture);
  });

  it('returns false when bank is below threshold', async () => {
    const context = await loadContext(fixture.rootDir);
    const compressed = await checkCompression(context!);

    expect(compressed).toBe(false);
  });

  it('returns true and archives when bank exceeds line threshold', async () => {
    // Create fixture with large bank
    await cleanupFixture(fixture);
    fixture = await createTestFixture({ largeBank: true, version: 10 });

    const context = await loadContext(fixture.rootDir);
    const compressed = await checkCompression(context!);

    expect(compressed).toBe(true);

    // Verify archive was created
    const archives = await fs.readdir(path.join(fixture.agentsDir, 'memory', 'archives'));
    expect(archives.length).toBeGreaterThan(0);
  });

  it('respects custom compression threshold', async () => {
    // Create fixture with medium-sized bank
    await cleanupFixture(fixture);
    fixture = await createTestFixture({ largeBank: false });

    const context = await loadContext(fixture.rootDir);

    // Use very low line threshold (bank is ~20 lines, threshold = 5)
    // This should trigger compression
    const compressed = await checkCompression(context!, {
      compressionThreshold: 5,
    });

    expect(compressed).toBe(true);
  });

  it('triggers compression based on cycle threshold', async () => {
    // Create fixture where cycles since compression exceeds threshold
    await cleanupFixture(fixture);
    // Bank says cycle 50, but state says cycle 100 = 50 cycles difference
    // needsCompression uses default cycle threshold of 10
    fixture = await createTestFixture({ cycleCount: 100 });

    // Rewrite bank with old cycle number (50 cycles behind = exceeds default 10 cycle threshold)
    const oldBank = createTestMemoryBank(50, 5);
    await fs.writeFile(path.join(fixture.agentsDir, 'memory', 'bank.md'), oldBank);

    const context = await loadContext(fixture.rootDir);
    // High line threshold so only cycle threshold triggers
    const compressed = await checkCompression(context!, {
      compressionThreshold: 500,
    });

    expect(compressed).toBe(true);
  });

  it('updates bank header after compression', async () => {
    await cleanupFixture(fixture);
    fixture = await createTestFixture({ largeBank: true, version: 7 });

    const context = await loadContext(fixture.rootDir);
    await checkCompression(context!);

    // Read updated bank
    const updatedBank = await fs.readFile(
      path.join(fixture.agentsDir, 'memory', 'bank.md'),
      'utf-8'
    );

    // Version should be incremented
    expect(updatedBank).toContain('Version:** 8');
  });
});

// ─── completeDispatch Tests ──────────────────────────────────────────────────

describe('completeDispatch', () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await createTestFixture({ cycleCount: 100 });
  });

  afterEach(async () => {
    await cleanupFixture(fixture);
  });

  it('advances rotation state', async () => {
    const context = await loadContext(fixture.rootDir);
    const result = await completeDispatch(context!, '⚙️ Test action');

    expect(result.success).toBe(true);
    expect(result.cycle).toBe(101); // Incremented from 100

    // Verify state file was updated
    const stateContent = await fs.readFile(
      path.join(fixture.agentsDir, 'state', 'rotation.json'),
      'utf-8'
    );
    const newState = JSON.parse(stateContent) as RotationState;

    expect(newState.cycle_count).toBe(101);
    expect(newState.current_index).toBe(1); // Advanced from 0
    expect(newState.last_role).toBe('engineering');
  });

  it('returns correct role information', async () => {
    const context = await loadContext(fixture.rootDir);
    const result = await completeDispatch(context!, '⚙️ Engineering work');

    expect(result.role).toBe('engineering');
    expect(result.roleName).toBe('The Builder');
  });

  it('accepts string action (backward compatibility)', async () => {
    const context = await loadContext(fixture.rootDir);
    const result = await completeDispatch(context!, 'Simple action string');

    expect(result.action).toBe('Simple action string');
  });

  it('accepts CompleteDispatchOptions object', async () => {
    const context = await loadContext(fixture.rootDir);
    const options: CompleteDispatchOptions = {
      action: '⚙️ Detailed action',
      importance: 8,
      type: 'action',
      tags: ['test', 'engineering'],
      content: 'Additional content about the action',
    };

    const result = await completeDispatch(context!, options);

    expect(result.action).toBe('⚙️ Detailed action');
  });

  it('logs to MemoryStream when enabled', async () => {
    const streamPath = path.join(fixture.agentsDir, 'memory', 'stream.jsonl');

    const context = await loadContext(fixture.rootDir, {}, { streamPath });
    await completeDispatch(context!, {
      action: '⚙️ Stream test action',
      importance: 7,
      type: 'action',
    });

    // Verify stream was written
    const streamContent = await fs.readFile(streamPath, 'utf-8');
    expect(streamContent).toContain('Stream test action');
  });

  it('skips MemoryStream logging when skipMemoryLog is true', async () => {
    const streamPath = path.join(fixture.agentsDir, 'memory', 'stream.jsonl');

    const context = await loadContext(fixture.rootDir, {}, { streamPath });
    await completeDispatch(context!, {
      action: '⚙️ Skip log action',
      skipMemoryLog: true,
    });

    // Stream should not exist or be empty
    try {
      const streamContent = await fs.readFile(streamPath, 'utf-8');
      expect(streamContent).not.toContain('Skip log action');
    } catch {
      // File doesn't exist, which is also valid
    }
  });

  it('stores reflection in rotation history (Phase 1b)', async () => {
    const context = await loadContext(fixture.rootDir);
    await completeDispatch(context!, {
      action: '⚙️ Action with reflection',
      reflection: {
        outcome: 'success',
        whatWorked: 'Testing worked well',
        toImprove: 'Could add more edge cases',
        lesson: 'Always test thoroughly',
      },
    });

    // Verify reflection was stored
    const stateContent = await fs.readFile(
      path.join(fixture.agentsDir, 'state', 'rotation.json'),
      'utf-8'
    );
    const newState = JSON.parse(stateContent) as RotationState;
    const lastEntry = newState.history[newState.history.length - 1];

    expect(lastEntry.reflection).toBeDefined();
    expect(lastEntry.reflection?.outcome).toBe('success');
    expect(lastEntry.reflection?.whatWorked).toBe('Testing worked well');
  });

  it('auto-extracts issue references from action', async () => {
    const streamPath = path.join(fixture.agentsDir, 'memory', 'stream.jsonl');

    const context = await loadContext(fixture.rootDir, {}, { streamPath });
    await completeDispatch(context!, '⚙️ Fixed bug per #123 and relates to #456');

    const streamContent = await fs.readFile(streamPath, 'utf-8');
    const entry = JSON.parse(streamContent.trim().split('\n').pop()!);

    expect(entry.issueRefs).toContain(123);
    expect(entry.issueRefs).toContain(456);
  });

  it('auto-extracts PR references from action', async () => {
    const streamPath = path.join(fixture.agentsDir, 'memory', 'stream.jsonl');

    const context = await loadContext(fixture.rootDir, {}, { streamPath });
    await completeDispatch(context!, '⚙️ Merged PR #789');

    const streamContent = await fs.readFile(streamPath, 'utf-8');
    const entry = JSON.parse(streamContent.trim().split('\n').pop()!);

    expect(entry.prRefs).toContain(789);
  });

  it('uses provided refs over auto-extracted', async () => {
    const streamPath = path.join(fixture.agentsDir, 'memory', 'stream.jsonl');

    const context = await loadContext(fixture.rootDir, {}, { streamPath });
    await completeDispatch(context!, {
      action: '⚙️ Action mentioning #999',
      issueRefs: [111],
      prRefs: [222],
    });

    const streamContent = await fs.readFile(streamPath, 'utf-8');
    const entry = JSON.parse(streamContent.trim().split('\n').pop()!);

    expect(entry.issueRefs).toContain(111);
    expect(entry.prRefs).toContain(222);
    expect(entry.issueRefs).not.toContain(999);
  });

  it('handles MemoryStream disabled gracefully', async () => {
    const context = await loadContext(fixture.rootDir, {}, {
      enableMemoryStream: false,
    });

    expect(context!.memoryStream).toBeUndefined();

    // Should still complete without error
    const result = await completeDispatch(context!, '⚙️ No stream action');
    expect(result.success).toBe(true);
  });

  it('includes timestamp in result', async () => {
    const context = await loadContext(fixture.rootDir);
    const beforeTime = new Date().toISOString();
    const result = await completeDispatch(context!, '⚙️ Timed action');
    const afterTime = new Date().toISOString();

    expect(result.timestamp).toBeDefined();
    expect(result.timestamp >= beforeTime).toBe(true);
    expect(result.timestamp <= afterTime).toBe(true);
  });

  it('lists modified files in result', async () => {
    const context = await loadContext(fixture.rootDir);
    const result = await completeDispatch(context!, '⚙️ File mod action');

    expect(result.modifiedFiles).toContain(context!.paths.state);
    expect(result.modifiedFiles).toContain(context!.paths.memoryBank);
  });

  it('wraps rotation correctly at end of rotation_order', async () => {
    // Set to last position (product)
    const state: RotationState = {
      ...fixture.state,
      current_index: 2, // product (last in rotation)
      last_role: 'ops',
    };

    await fs.writeFile(
      path.join(fixture.agentsDir, 'state', 'rotation.json'),
      JSON.stringify(state, null, 2)
    );

    const context = await loadContext(fixture.rootDir);
    expect(context!.role.id).toBe('product');

    await completeDispatch(context!, '📦 Product action');

    // Verify wrap to beginning
    const stateContent = await fs.readFile(
      path.join(fixture.agentsDir, 'state', 'rotation.json'),
      'utf-8'
    );
    const newState = JSON.parse(stateContent) as RotationState;

    expect(newState.current_index).toBe(0); // Wrapped back to engineering
  });
});

// ─── Integration Tests ───────────────────────────────────────────────────────

describe('dispatch lifecycle integration', () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await createTestFixture({ cycleCount: 50 });
  });

  afterEach(async () => {
    await cleanupFixture(fixture);
  });

  it('full dispatch cycle: load → check → complete', async () => {
    // Phase 1: Load context
    const context = await loadContext(fixture.rootDir);
    expect(context).not.toBeNull();
    expect(context!.role.id).toBe('engineering');

    // Phase 5: Check compression (should not trigger on small bank)
    const compressed = await checkCompression(context!);
    expect(compressed).toBe(false);

    // Phase 7: Complete dispatch
    const result = await completeDispatch(context!, {
      action: '⚙️ INTEGRATION TEST — Full dispatch cycle verified',
      type: 'action',
      reflection: {
        outcome: 'success',
        whatWorked: 'Full cycle works end-to-end',
      },
    });

    expect(result.success).toBe(true);
    expect(result.cycle).toBe(51);
    expect(result.role).toBe('engineering');
  });

  it('multiple cycles advance correctly', async () => {
    // Run 3 complete cycles
    for (let i = 0; i < 3; i++) {
      const context = await loadContext(fixture.rootDir);
      expect(context).not.toBeNull();

      await completeDispatch(context!, `Cycle ${51 + i} action`);
    }

    // Verify final state
    const stateContent = await fs.readFile(
      path.join(fixture.agentsDir, 'state', 'rotation.json'),
      'utf-8'
    );
    const finalState = JSON.parse(stateContent) as RotationState;

    expect(finalState.cycle_count).toBe(53);
    expect(finalState.history.length).toBeGreaterThanOrEqual(3);
  });

  it('stream accumulates across cycles', async () => {
    const streamPath = path.join(fixture.agentsDir, 'memory', 'stream.jsonl');

    for (let i = 0; i < 3; i++) {
      const context = await loadContext(fixture.rootDir, {}, { streamPath });
      await completeDispatch(context!, `Stream cycle ${i + 1}`);
    }

    const streamContent = await fs.readFile(streamPath, 'utf-8');
    const lines = streamContent.trim().split('\n');

    expect(lines.length).toBe(3);
    expect(streamContent).toContain('Stream cycle 1');
    expect(streamContent).toContain('Stream cycle 2');
    expect(streamContent).toContain('Stream cycle 3');
  });
});
