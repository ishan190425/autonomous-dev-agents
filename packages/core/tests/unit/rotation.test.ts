/**
 * @ada/core — Rotation logic unit tests
 *
 * Tests for the role rotation state machine:
 * getCurrentRole, getCurrentRoleId, advanceRotation, getRotationSummary
 */

import { describe, it, expect } from 'vitest';
import type { Reflection, Roster, RotationState } from '../../src/types.js';
import {
  getCurrentRole,
  getCurrentRoleId,
  advanceRotation,
  getRotationSummary,
} from '../../src/rotation.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function createTestRoster(overrides: Partial<Roster> = {}): Roster {
  return {
    company: 'Test Co',
    product: 'Test Product',
    tagline: 'Test tagline',
    roles: [
      {
        id: 'engineering',
        name: 'The Builder',
        title: 'Lead Engineer',
        emoji: '⚙️',
        focus: ['typescript'],
        actions: ['write_code', 'create_prs'],
      },
      {
        id: 'product',
        name: 'The PM',
        title: 'Product Lead',
        emoji: '📦',
        focus: ['features'],
        actions: ['create_feature_issues', 'write_specs'],
      },
      {
        id: 'ops',
        name: 'The Guardian',
        title: 'DevOps Lead',
        emoji: '🛡️',
        focus: ['ci_cd'],
        actions: ['merge_prs', 'fix_ci'],
      },
    ],
    rotation_order: ['engineering', 'product', 'ops'],
    ...overrides,
  };
}

function createTestState(overrides: Partial<RotationState> = {}): RotationState {
  return {
    current_index: 0,
    last_role: null,
    last_run: null,
    cycle_count: 0,
    history: [],
    ...overrides,
  };
}

// ─── getCurrentRole ───────────────────────────────────────────────────────────

describe('getCurrentRole', () => {
  it('returns the role at current_index', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 0 });

    const role = getCurrentRole(state, roster);

    expect(role).not.toBeNull();
    expect(role?.id).toBe('engineering');
    expect(role?.name).toBe('The Builder');
  });

  it('returns the correct role for middle index', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 1 });

    const role = getCurrentRole(state, roster);

    expect(role).not.toBeNull();
    expect(role?.id).toBe('product');
  });

  it('returns the correct role for last index', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 2 });

    const role = getCurrentRole(state, roster);

    expect(role).not.toBeNull();
    expect(role?.id).toBe('ops');
  });

  it('wraps around when index exceeds rotation order length', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 3 }); // 3 % 3 = 0

    const role = getCurrentRole(state, roster);

    expect(role).not.toBeNull();
    expect(role?.id).toBe('engineering');
  });

  it('wraps around for large index values', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 100 }); // 100 % 3 = 1

    const role = getCurrentRole(state, roster);

    expect(role).not.toBeNull();
    expect(role?.id).toBe('product');
  });

  it('returns null when rotation_order is empty', () => {
    const roster = createTestRoster({ rotation_order: [] });
    const state = createTestState();

    const role = getCurrentRole(state, roster);

    expect(role).toBeNull();
  });

  it('returns null when role ID is in rotation_order but not in roles', () => {
    const roster = createTestRoster({
      rotation_order: ['nonexistent_role'],
    });
    const state = createTestState();

    const role = getCurrentRole(state, roster);

    expect(role).toBeNull();
  });
});

// ─── getCurrentRoleId ─────────────────────────────────────────────────────────

describe('getCurrentRoleId', () => {
  it('returns the role ID at current_index', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 0 });

    const roleId = getCurrentRoleId(state, roster);

    expect(roleId).toBe('engineering');
  });

  it('returns the correct ID for any valid index', () => {
    const roster = createTestRoster();

    expect(getCurrentRoleId(createTestState({ current_index: 0 }), roster)).toBe('engineering');
    expect(getCurrentRoleId(createTestState({ current_index: 1 }), roster)).toBe('product');
    expect(getCurrentRoleId(createTestState({ current_index: 2 }), roster)).toBe('ops');
  });

  it('wraps around for out-of-bounds index', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 5 }); // 5 % 3 = 2

    const roleId = getCurrentRoleId(state, roster);

    expect(roleId).toBe('ops');
  });

  it('returns null when rotation_order is empty', () => {
    const roster = createTestRoster({ rotation_order: [] });
    const state = createTestState();

    const roleId = getCurrentRoleId(state, roster);

    expect(roleId).toBeNull();
  });
});

// ─── advanceRotation ──────────────────────────────────────────────────────────

describe('advanceRotation', () => {
  it('increments current_index by 1', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 0, cycle_count: 0 });

    const newState = advanceRotation(state, roster, 'test action');

    expect(newState.current_index).toBe(1);
  });

  it('wraps current_index at end of rotation', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 2, cycle_count: 2 });

    const newState = advanceRotation(state, roster, 'test action');

    expect(newState.current_index).toBe(0); // wraps to start
  });

  it('increments cycle_count', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 0, cycle_count: 5 });

    const newState = advanceRotation(state, roster, 'test action');

    expect(newState.cycle_count).toBe(6);
  });

  it('sets last_role to the role that just acted', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 1 }); // product

    const newState = advanceRotation(state, roster, 'test action');

    expect(newState.last_role).toBe('product');
  });

  it('sets last_run to an ISO timestamp', () => {
    const roster = createTestRoster();
    const state = createTestState();

    const before = new Date().toISOString();
    const newState = advanceRotation(state, roster, 'test action');
    const after = new Date().toISOString();

    expect(newState.last_run).not.toBeNull();
    expect(newState.last_run).toBeDefined();
    // Verify it's a valid ISO timestamp within range
    const lastRun = newState.last_run ?? '';
    expect(lastRun >= before).toBe(true);
    expect(lastRun <= after).toBe(true);
  });

  it('adds a history entry with role, timestamp, and cycle', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 0, cycle_count: 10 });

    const newState = advanceRotation(state, roster, 'built something');

    expect(newState.history).toHaveLength(1);
    const entry = newState.history[0];
    expect(entry).toBeDefined();
    expect(entry?.role).toBe('engineering');
    expect(entry?.cycle).toBe(11);
    expect(entry?.action).toBe('built something');
    expect(entry?.timestamp).toBeDefined();
  });

  it('omits action from history when no description provided', () => {
    const roster = createTestRoster();
    const state = createTestState();

    const newState = advanceRotation(state, roster);

    expect(newState.history).toHaveLength(1);
    expect(newState.history[0]?.action).toBeUndefined();
  });

  it('trims history to 10 entries', () => {
    const roster = createTestRoster();
    const existingHistory = Array.from({ length: 10 }, (_, i) => ({
      role: 'engineering' as const,
      timestamp: new Date().toISOString(),
      cycle: i + 1,
    }));
    const state = createTestState({
      current_index: 0,
      cycle_count: 10,
      history: existingHistory,
    });

    const newState = advanceRotation(state, roster, 'new action');

    expect(newState.history).toHaveLength(10);
    // First entry should be the second from old history (first was trimmed)
    expect(newState.history[0]?.cycle).toBe(2);
    // Last entry should be the new one
    expect(newState.history[9]?.action).toBe('new action');
    expect(newState.history[9]?.cycle).toBe(11);
  });

  it('does not mutate the input state', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 0, cycle_count: 5 });
    const originalIndex = state.current_index;
    const originalCount = state.cycle_count;

    advanceRotation(state, roster, 'test');

    expect(state.current_index).toBe(originalIndex);
    expect(state.cycle_count).toBe(originalCount);
  });

  it('returns the same state when rotation_order is empty', () => {
    const roster = createTestRoster({ rotation_order: [] });
    const state = createTestState({ current_index: 0, cycle_count: 5 });

    const newState = advanceRotation(state, roster, 'test');

    expect(newState).toBe(state); // same reference
  });

  // Issue #123: next_role_title for README badge
  describe('next_role_title (Issue #123)', () => {
    it('sets next_role_title to emoji + role id', () => {
      const roster = createTestRoster();
      const state = createTestState({ current_index: 0 }); // engineering

      const newState = advanceRotation(state, roster, 'test action');

      // After engineering (index 0), next is product (index 1)
      expect(newState.next_role_title).toBe('📦 product');
    });

    it('wraps next_role_title at end of rotation', () => {
      const roster = createTestRoster();
      const state = createTestState({ current_index: 2 }); // ops (last)

      const newState = advanceRotation(state, roster, 'test action');

      // After ops (index 2), wraps to engineering (index 0)
      expect(newState.next_role_title).toBe('⚙️ engineering');
    });

    it('updates next_role_title on each advance', () => {
      const roster = createTestRoster();
      let state = createTestState({ current_index: 0 });

      // engineering acts, next up is product
      state = advanceRotation(state, roster, 'action 1');
      expect(state.next_role_title).toBe('📦 product');

      // product acts, next up is ops
      state = advanceRotation(state, roster, 'action 2');
      expect(state.next_role_title).toBe('🛡️ ops');

      // ops acts, wraps to engineering
      state = advanceRotation(state, roster, 'action 3');
      expect(state.next_role_title).toBe('⚙️ engineering');
    });

    it('falls back to role id when role not found in roster', () => {
      const roster = createTestRoster({
        rotation_order: ['engineering', 'unknown_role', 'product'],
        // 'unknown_role' is in rotation_order but not in roles array
      });
      const state = createTestState({ current_index: 0 }); // engineering

      const newState = advanceRotation(state, roster, 'test action');

      // Next is unknown_role which isn't in roles, should fall back to id
      expect(newState.next_role_title).toBe('unknown_role');
    });
  });

  // Phase 1b: Reflection storage tests
  describe('reflection storage (Phase 1b)', () => {
    it('stores reflection in history entry when provided', () => {
      const roster = createTestRoster();
      const state = createTestState({ current_index: 0, cycle_count: 10 });
      const reflection: Reflection = {
        outcome: 'success',
        whatWorked: 'Good approach',
        whatToImprove: 'Could be faster',
      };

      const newState = advanceRotation(state, roster, {
        action: 'wrote tests',
        reflection,
      });

      expect(newState.history).toHaveLength(1);
      const entry = newState.history[0];
      expect(entry?.reflection).toBeDefined();
      expect(entry?.reflection?.outcome).toBe('success');
      expect(entry?.reflection?.whatWorked).toBe('Good approach');
      expect(entry?.reflection?.whatToImprove).toBe('Could be faster');
    });

    it('handles reflection with all fields', () => {
      const roster = createTestRoster();
      const state = createTestState();
      const reflection: Reflection = {
        outcome: 'partial',
        whatWorked: 'Research was thorough',
        whatToImprove: 'Should have checked existing code',
        lessonLearned: 'Always review before writing',
      };

      const newState = advanceRotation(state, roster, {
        action: 'refactored module',
        reflection,
      });

      const entry = newState.history[0];
      expect(entry?.reflection?.outcome).toBe('partial');
      expect(entry?.reflection?.lessonLearned).toBe('Always review before writing');
    });

    it('handles reflection with minimal fields', () => {
      const roster = createTestRoster();
      const state = createTestState();
      const reflection: Reflection = {
        outcome: 'unknown',
      };

      const newState = advanceRotation(state, roster, {
        action: 'experimental change',
        reflection,
      });

      const entry = newState.history[0];
      expect(entry?.reflection?.outcome).toBe('unknown');
      expect(entry?.reflection?.whatWorked).toBeUndefined();
    });

    it('does not include reflection field when not provided', () => {
      const roster = createTestRoster();
      const state = createTestState();

      const newState = advanceRotation(state, roster, {
        action: 'simple action',
      });

      const entry = newState.history[0];
      expect(entry?.action).toBe('simple action');
      expect(entry?.reflection).toBeUndefined();
    });

    it('accepts string for backward compatibility', () => {
      const roster = createTestRoster();
      const state = createTestState();

      const newState = advanceRotation(state, roster, 'legacy action');

      const entry = newState.history[0];
      expect(entry?.action).toBe('legacy action');
      expect(entry?.reflection).toBeUndefined();
    });

    it('handles blocked outcome reflection', () => {
      const roster = createTestRoster();
      const state = createTestState();
      const reflection: Reflection = {
        outcome: 'blocked',
        whatToImprove: 'Wait for dependency PR to merge',
      };

      const newState = advanceRotation(state, roster, {
        action: 'attempted feature',
        reflection,
      });

      const entry = newState.history[0];
      expect(entry?.reflection?.outcome).toBe('blocked');
    });
  });
});

// ─── getRotationSummary ───────────────────────────────────────────────────────

describe('getRotationSummary', () => {
  it('includes the current role name and title', () => {
    const roster = createTestRoster();
    const state = createTestState({ current_index: 0 });

    const summary = getRotationSummary(state, roster);

    expect(summary).toContain('The Builder');
    expect(summary).toContain('Lead Engineer');
    expect(summary).toContain('⚙️');
  });

  it('includes cycle count and last role', () => {
    const roster = createTestRoster();
    const state = createTestState({
      current_index: 1,
      cycle_count: 42,
      last_role: 'engineering',
    });

    const summary = getRotationSummary(state, roster);

    expect(summary).toContain('42');
    expect(summary).toContain('engineering');
  });

  it('handles empty rotation gracefully', () => {
    const roster = createTestRoster({ rotation_order: [] });
    const state = createTestState();

    const summary = getRotationSummary(state, roster);

    expect(summary).toContain('none');
  });

  it('includes recent history entries', () => {
    const roster = createTestRoster();
    const state = createTestState({
      current_index: 0,
      cycle_count: 3,
      history: [
        {
          role: 'engineering',
          timestamp: new Date().toISOString(),
          cycle: 1,
          action: 'wrote tests',
        },
        {
          role: 'product',
          timestamp: new Date().toISOString(),
          cycle: 2,
          action: 'created spec',
        },
      ],
    });

    const summary = getRotationSummary(state, roster);

    expect(summary).toContain('wrote tests');
    expect(summary).toContain('created spec');
  });

  it('shows (never) when last_run is null', () => {
    const roster = createTestRoster();
    const state = createTestState({ last_run: null });

    const summary = getRotationSummary(state, roster);

    expect(summary).toContain('(never)');
  });
});
