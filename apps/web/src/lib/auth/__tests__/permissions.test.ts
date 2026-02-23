/**
 * Permission Helpers Tests
 *
 * @author ⚙️ Engineering (Cycle 1180)
 */

import { describe, it, expect } from 'vitest';
import {
  getPermissions,
  hasCyclesRemaining,
  getCyclesRemaining,
  can,
  isTeamOwner,
  isTeamAdmin,
  isTierAtLeast,
  CYCLE_LIMITS,
} from '../permissions';
import type { SessionUser, TeamContext } from '../types';

// ============================================================================
// Test Fixtures
// ============================================================================

const freeUser: SessionUser = {
  id: 'user-free',
  name: 'Free User',
  email: 'free@example.com',
  image: null,
  tier: 'FREE',
  cyclesUsed: 50,
  cyclesLimit: 100,
};

const proUser: SessionUser = {
  id: 'user-pro',
  name: 'Pro User',
  email: 'pro@example.com',
  image: null,
  tier: 'PRO',
  cyclesUsed: 500,
  cyclesLimit: -1, // Unlimited
};

const enterpriseUser: SessionUser = {
  id: 'user-enterprise',
  name: 'Enterprise User',
  email: 'enterprise@example.com',
  image: null,
  tier: 'ENTERPRISE',
  cyclesUsed: 5000,
  cyclesLimit: -1,
  teamId: 'team-1',
};

const teamContext: TeamContext = {
  id: 'team-1',
  name: 'Test Team',
  slug: 'test-team',
  plan: 'TEAM',
  role: 'OWNER',
  memberCount: 3,
};

const memberTeamContext: TeamContext = {
  ...teamContext,
  role: 'MEMBER',
};

// ============================================================================
// getPermissions Tests
// ============================================================================

describe('getPermissions', () => {
  it('returns correct permissions for FREE tier', () => {
    const permissions = getPermissions(freeUser, null);

    expect(permissions.canCreateTeams).toBe(false);
    expect(permissions.canAccessPremium).toBe(false);
    expect(permissions.canInviteMembers).toBe(false);
    expect(permissions.canUseApi).toBe(false);
    expect(permissions.maxConcurrentRuns).toBe(1);
    expect(permissions.maxRepos).toBe(1);
  });

  it('returns correct permissions for PRO tier', () => {
    const permissions = getPermissions(proUser, null);

    expect(permissions.canCreateTeams).toBe(true);
    expect(permissions.canAccessPremium).toBe(true);
    expect(permissions.canInviteMembers).toBe(false);
    expect(permissions.canUseApi).toBe(true);
    expect(permissions.maxConcurrentRuns).toBe(3);
    expect(permissions.maxRepos).toBe(10);
  });

  it('returns correct permissions for ENTERPRISE tier', () => {
    const permissions = getPermissions(enterpriseUser, null);

    expect(permissions.canCreateTeams).toBe(true);
    expect(permissions.canAccessPremium).toBe(true);
    expect(permissions.canInviteMembers).toBe(true);
    expect(permissions.canUseApi).toBe(true);
    expect(permissions.maxConcurrentRuns).toBe(10);
    expect(permissions.maxRepos).toBe(-1); // Unlimited
  });

  it('allows billing management for solo users', () => {
    const permissions = getPermissions(freeUser, null);
    expect(permissions.canManageBilling).toBe(true);
  });

  it('allows billing management for team owners', () => {
    const permissions = getPermissions(enterpriseUser, teamContext);
    expect(permissions.canManageBilling).toBe(true);
  });

  it('denies billing management for team members', () => {
    const permissions = getPermissions(enterpriseUser, memberTeamContext);
    expect(permissions.canManageBilling).toBe(false);
  });

  it('elevates permissions based on team plan', () => {
    // Free user in a TEAM plan should get elevated concurrent runs
    const permissions = getPermissions(freeUser, teamContext);
    expect(permissions.maxConcurrentRuns).toBe(5); // TEAM plan limit
  });
});

// ============================================================================
// hasCyclesRemaining Tests
// ============================================================================

describe('hasCyclesRemaining', () => {
  it('returns true when cycles remaining', () => {
    expect(hasCyclesRemaining(freeUser)).toBe(true);
  });

  it('returns true for unlimited (-1) cycles', () => {
    expect(hasCyclesRemaining(proUser)).toBe(true);
  });

  it('returns false when cycles exhausted', () => {
    const exhaustedUser: SessionUser = {
      ...freeUser,
      cyclesUsed: 100,
    };
    expect(hasCyclesRemaining(exhaustedUser)).toBe(false);
  });

  it('returns false when over limit', () => {
    const overLimitUser: SessionUser = {
      ...freeUser,
      cyclesUsed: 150,
    };
    expect(hasCyclesRemaining(overLimitUser)).toBe(false);
  });
});

// ============================================================================
// getCyclesRemaining Tests
// ============================================================================

describe('getCyclesRemaining', () => {
  it('returns remaining cycles count', () => {
    expect(getCyclesRemaining(freeUser)).toBe(50);
  });

  it('returns null for unlimited', () => {
    expect(getCyclesRemaining(proUser)).toBeNull();
  });

  it('returns 0 when exhausted', () => {
    const exhaustedUser: SessionUser = {
      ...freeUser,
      cyclesUsed: 100,
    };
    expect(getCyclesRemaining(exhaustedUser)).toBe(0);
  });

  it('returns 0 (not negative) when over limit', () => {
    const overLimitUser: SessionUser = {
      ...freeUser,
      cyclesUsed: 150,
    };
    expect(getCyclesRemaining(overLimitUser)).toBe(0);
  });
});

// ============================================================================
// can Tests
// ============================================================================

describe('can', () => {
  it('checks permission correctly', () => {
    expect(can('canAccessPremium', freeUser, null)).toBe(false);
    expect(can('canAccessPremium', proUser, null)).toBe(true);
  });

  it('considers team context', () => {
    expect(can('canInviteMembers', freeUser, null)).toBe(false);
    expect(can('canInviteMembers', freeUser, teamContext)).toBe(true);
  });
});

// ============================================================================
// Team Role Helpers Tests
// ============================================================================

describe('isTeamOwner', () => {
  it('returns true for owner role', () => {
    expect(isTeamOwner(teamContext)).toBe(true);
  });

  it('returns false for other roles', () => {
    expect(isTeamOwner(memberTeamContext)).toBe(false);
  });

  it('returns false for null team', () => {
    expect(isTeamOwner(null)).toBe(false);
  });
});

describe('isTeamAdmin', () => {
  it('returns true for owner', () => {
    expect(isTeamAdmin(teamContext)).toBe(true);
  });

  it('returns true for admin', () => {
    const adminContext: TeamContext = { ...teamContext, role: 'ADMIN' };
    expect(isTeamAdmin(adminContext)).toBe(true);
  });

  it('returns false for member', () => {
    expect(isTeamAdmin(memberTeamContext)).toBe(false);
  });

  it('returns false for null team', () => {
    expect(isTeamAdmin(null)).toBe(false);
  });
});

// ============================================================================
// isTierAtLeast Tests
// ============================================================================

describe('isTierAtLeast', () => {
  it('FREE is at least FREE', () => {
    expect(isTierAtLeast('FREE', 'FREE')).toBe(true);
  });

  it('PRO is at least FREE', () => {
    expect(isTierAtLeast('PRO', 'FREE')).toBe(true);
  });

  it('FREE is not at least PRO', () => {
    expect(isTierAtLeast('FREE', 'PRO')).toBe(false);
  });

  it('ENTERPRISE is at least everything', () => {
    expect(isTierAtLeast('ENTERPRISE', 'FREE')).toBe(true);
    expect(isTierAtLeast('ENTERPRISE', 'PRO')).toBe(true);
    expect(isTierAtLeast('ENTERPRISE', 'ENTERPRISE')).toBe(true);
  });
});

// ============================================================================
// CYCLE_LIMITS Tests
// ============================================================================

describe('CYCLE_LIMITS', () => {
  it('has correct limits for each tier', () => {
    expect(CYCLE_LIMITS.FREE).toBe(100);
    expect(CYCLE_LIMITS.PRO).toBe(-1);
    expect(CYCLE_LIMITS.ENTERPRISE).toBe(-1);
  });
});
