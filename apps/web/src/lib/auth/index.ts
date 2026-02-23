/**
 * ADA Auth Module
 *
 * Authentication and authorization for the ADA SaaS platform.
 * Sprint 3 foundation for GitHub OAuth + Stripe billing.
 *
 * @author ⚙️ Engineering (Cycle 1180)
 * @module @ada-ai/web/lib/auth
 *
 * @example
 * ```typescript
 * import {
 *   type SessionUser,
 *   type AuthContext,
 *   getPermissions,
 *   can,
 *   hasCyclesRemaining,
 * } from '@/lib/auth';
 *
 * // Check permissions
 * const permissions = getPermissions(user, team);
 * if (can('canAccessPremium', user, team)) {
 *   // Show premium features
 * }
 *
 * // Check cycles
 * if (!hasCyclesRemaining(user)) {
 *   // Show upgrade prompt
 * }
 * ```
 */

// Types
export type {
  // Enums
  Tier,
  Plan,
  SubscriptionStatus,
  TeamRole,
  // User
  User,
  UserWithSubscription,
  UserWithTeams,
  // Session
  SessionUser,
  Session,
  SessionWithTeam,
  // Subscription
  Subscription,
  SubscriptionCheck,
  // Team
  Team,
  TeamWithMemberCount,
  TeamMembership,
  TeamContext,
  // Auth Context
  AuthContext,
  Permissions,
  // OAuth
  GitHubProfile,
  GitHubInstallation,
  // API
  AuthError,
  AuthErrorCode,
  SessionResponse,
  ErrorResponse,
} from './types';

// Permission helpers
export {
  getPermissions,
  hasCyclesRemaining,
  getCyclesRemaining,
  can,
  isTeamOwner,
  isTeamAdmin,
  isTierAtLeast,
  CYCLE_LIMITS,
} from './permissions';

// Configuration
export {
  AUTH_ENV,
  validateAuthEnv,
  GITHUB_SCOPES,
  GITHUB_APP_PERMISSIONS,
  SESSION_CONFIG,
  RATE_LIMITS,
  AUTH_URLS,
  AUTH_FEATURES,
} from './config';
