/**
 * ADA Auth Types
 *
 * TypeScript types for authentication and authorization.
 * Aligned with Prisma schema and NextAuth.js session types.
 *
 * @author ⚙️ Engineering (Cycle 1180)
 * @see prisma/schema.prisma
 * @see docs/frontier/sprint3-day1-3-technical-kickoff-runbook-c1156.md
 */

// ============================================================================
// Enums (mirror Prisma schema)
// ============================================================================

/** User subscription tier */
export type Tier = 'FREE' | 'PRO' | 'ENTERPRISE';

/** Billing plan */
export type Plan = 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';

/** Stripe subscription status */
export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'CANCELED'
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'PAST_DUE'
  | 'UNPAID'
  | 'PAUSED';

/** Team member role */
export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

// ============================================================================
// User Types
// ============================================================================

/** Core user fields (from Prisma User model) */
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  githubId: string | null;
  tier: Tier;
  cyclesUsed: number;
  cyclesLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

/** User with subscription data */
export interface UserWithSubscription extends User {
  subscription: Subscription | null;
}

/** User with team memberships */
export interface UserWithTeams extends User {
  teams: TeamMembership[];
  ownedTeams: Team[];
}

// ============================================================================
// Session Types (NextAuth.js compatible)
// ============================================================================

/** Session user — returned from getServerSession() */
export interface SessionUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  tier: Tier;
  cyclesUsed: number;
  cyclesLimit: number;
  teamId?: string;
}

/** Full session object */
export interface Session {
  user: SessionUser;
  expires: string;
  accessToken?: string;
}

/** Session with team context */
export interface SessionWithTeam extends Session {
  team: TeamContext | null;
}

// ============================================================================
// Subscription Types
// ============================================================================

/** Subscription record */
export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  status: SubscriptionStatus;
  plan: Plan;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cyclesUsedThisPeriod: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Subscription status check result */
export interface SubscriptionCheck {
  hasActiveSubscription: boolean;
  plan: Plan;
  cyclesRemaining: number | null; // null = unlimited
  renewsAt: Date | null;
  cancelsPending: boolean;
}

// ============================================================================
// Team Types
// ============================================================================

/** Team record */
export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: Plan;
  memberLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Team with member count */
export interface TeamWithMemberCount extends Team {
  memberCount: number;
}

/** Team membership record */
export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
  team: Team;
}

/** Team context for session */
export interface TeamContext {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  role: TeamRole;
  memberCount: number;
}

// ============================================================================
// Auth Context Types
// ============================================================================

/** Full auth context — user + subscription + team */
export interface AuthContext {
  user: SessionUser;
  subscription: SubscriptionCheck;
  team: TeamContext | null;
  permissions: Permissions;
}

/** User permissions based on tier and role */
export interface Permissions {
  /** Can create new agent teams */
  canCreateTeams: boolean;
  /** Can access premium features */
  canAccessPremium: boolean;
  /** Can invite team members */
  canInviteMembers: boolean;
  /** Can manage billing */
  canManageBilling: boolean;
  /** Can use API access */
  canUseApi: boolean;
  /** Max concurrent agent runs */
  maxConcurrentRuns: number;
  /** Max repos per team */
  maxRepos: number;
}

// ============================================================================
// OAuth Provider Types
// ============================================================================

/** GitHub user profile (from OAuth) */
export interface GitHubProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  company: string | null;
  blog: string | null;
  location: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

/** GitHub App installation info */
export interface GitHubInstallation {
  installationId: number;
  accountLogin: string;
  accountType: 'User' | 'Organization';
  repositorySelection: 'all' | 'selected';
  selectedRepositories?: string[];
}

// ============================================================================
// API Response Types
// ============================================================================

/** Standard API error response */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/** Auth error codes */
export type AuthErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'SESSION_EXPIRED'
  | 'INVALID_TOKEN'
  | 'SUBSCRIPTION_REQUIRED'
  | 'RATE_LIMITED'
  | 'GITHUB_ERROR'
  | 'STRIPE_ERROR';

/** API session response */
export interface SessionResponse {
  success: true;
  session: SessionWithTeam;
}

/** API error response */
export interface ErrorResponse {
  success: false;
  error: AuthError;
}
