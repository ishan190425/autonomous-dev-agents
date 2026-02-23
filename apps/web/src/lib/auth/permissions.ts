/**
 * ADA Permission Helpers
 *
 * Utility functions for checking user permissions based on tier and role.
 * Central source of truth for authorization logic.
 *
 * @author ⚙️ Engineering (Cycle 1180)
 * @see types.ts
 */

import type {
  Tier,
  Plan,
  TeamRole,
  Permissions,
  SessionUser,
  TeamContext,
} from './types';

// ============================================================================
// Permission Defaults by Tier
// ============================================================================

/** Permission defaults for each tier */
const TIER_PERMISSIONS: Record<Tier, Omit<Permissions, 'canManageBilling'>> = {
  FREE: {
    canCreateTeams: false,
    canAccessPremium: false,
    canInviteMembers: false,
    canUseApi: false,
    maxConcurrentRuns: 1,
    maxRepos: 1,
  },
  PRO: {
    canCreateTeams: true,
    canAccessPremium: true,
    canInviteMembers: false,
    canUseApi: true,
    maxConcurrentRuns: 3,
    maxRepos: 10,
  },
  ENTERPRISE: {
    canCreateTeams: true,
    canAccessPremium: true,
    canInviteMembers: true,
    canUseApi: true,
    maxConcurrentRuns: 10,
    maxRepos: -1, // Unlimited
  },
};

/** Cycle limits by tier */
export const CYCLE_LIMITS: Record<Tier, number> = {
  FREE: 100,
  PRO: -1, // Unlimited
  ENTERPRISE: -1, // Unlimited
};

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Get user permissions based on tier and team context
 */
export function getPermissions(
  user: SessionUser,
  team: TeamContext | null
): Permissions {
  const basePermissions = TIER_PERMISSIONS[user.tier];

  // Team context can upgrade permissions
  const teamPermissions = team
    ? getTeamPermissions(team.role, team.plan)
    : null;

  // Start with base tier permissions
  const permissions: Permissions = {
    ...basePermissions,
    // Billing management requires ownership or admin role
    canManageBilling: team
      ? ['OWNER', 'ADMIN'].includes(team.role)
      : true, // Solo users can always manage their own billing
  };

  // Elevate permissions based on team plan if applicable
  if (teamPermissions) {
    permissions.canInviteMembers =
      teamPermissions.canInviteMembers || basePermissions.canInviteMembers;
    permissions.maxConcurrentRuns = Math.max(
      teamPermissions.maxConcurrentRuns,
      basePermissions.maxConcurrentRuns
    );
    permissions.maxRepos =
      teamPermissions.maxRepos === -1
        ? -1
        : Math.max(teamPermissions.maxRepos, basePermissions.maxRepos);
  }

  return permissions;
}

/** Team plan permissions configuration */
interface TeamPlanPermissions {
  canInviteMembers: boolean;
  maxConcurrentRuns: number;
  maxRepos: number;
}

/**
 * Get permissions based on team role and plan
 */
function getTeamPermissions(
  role: TeamRole,
  plan: Plan
): TeamPlanPermissions | null {
  const canManage = ['OWNER', 'ADMIN'].includes(role);

  const planPermissionsMap: Partial<Record<Plan, TeamPlanPermissions>> = {
    TEAM: {
      canInviteMembers: canManage,
      maxConcurrentRuns: 5,
      maxRepos: 25,
    },
    ENTERPRISE: {
      canInviteMembers: canManage,
      maxConcurrentRuns: 10,
      maxRepos: -1,
    },
  };

  return planPermissionsMap[plan] ?? null;
}

/**
 * Check if user has cycles remaining
 */
export function hasCyclesRemaining(user: SessionUser): boolean {
  // -1 means unlimited
  if (user.cyclesLimit === -1) return true;
  return user.cyclesUsed < user.cyclesLimit;
}

/**
 * Get remaining cycles count
 * Returns null for unlimited
 */
export function getCyclesRemaining(user: SessionUser): number | null {
  if (user.cyclesLimit === -1) return null;
  return Math.max(0, user.cyclesLimit - user.cyclesUsed);
}

/**
 * Check if user can perform an action
 */
export function can(
  permission: keyof Omit<Permissions, 'maxConcurrentRuns' | 'maxRepos'>,
  user: SessionUser,
  team: TeamContext | null
): boolean {
  const permissions = getPermissions(user, team);
  return permissions[permission];
}

/**
 * Check if user is team owner
 */
export function isTeamOwner(team: TeamContext | null): boolean {
  return team?.role === 'OWNER';
}

/**
 * Check if user is team admin (owner or admin)
 */
export function isTeamAdmin(team: TeamContext | null): boolean {
  if (!team) return false;
  return ['OWNER', 'ADMIN'].includes(team.role);
}

/**
 * Check if tier is at least the specified level
 */
export function isTierAtLeast(userTier: Tier, requiredTier: Tier): boolean {
  const tierOrder: Tier[] = ['FREE', 'PRO', 'ENTERPRISE'];
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier);
}
