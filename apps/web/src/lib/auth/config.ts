/**
 * ADA Auth Configuration
 *
 * Configuration constants for authentication and authorization.
 * Environment variables are validated at runtime.
 *
 * @author ⚙️ Engineering (Cycle 1180)
 * @see docs/frontier/sprint3-environment-variables-reference-c1146.md
 */

// ============================================================================
// Environment Variables
// ============================================================================

/**
 * Required auth environment variables
 * Sprint 3 Day 1: These must be configured in Vercel
 */
export const AUTH_ENV = {
  // NextAuth.js
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,

  // GitHub OAuth App
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,

  // GitHub App (for repo installations)
  GITHUB_APP_ID: process.env.GITHUB_APP_ID,
  GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,

  // Database
  DATABASE_URL: process.env.DATABASE_URL,
} as const;

/**
 * Validate required environment variables
 * Call this at app startup
 */
export function validateAuthEnv(): { valid: boolean; missing: string[] } {
  const required = [
    'NEXTAUTH_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'DATABASE_URL',
  ];

  const missing = required.filter(
    (key) => !process.env[key]
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

// ============================================================================
// OAuth Configuration
// ============================================================================

/** GitHub OAuth scopes requested */
export const GITHUB_SCOPES = [
  'read:user',
  'user:email',
  'repo', // For GitHub App installation
] as const;

/** GitHub App permissions */
export const GITHUB_APP_PERMISSIONS = {
  // Repository permissions
  contents: 'write',
  issues: 'write',
  pull_requests: 'write',
  workflows: 'write',

  // Account permissions
  members: 'read',
} as const;

// ============================================================================
// Session Configuration
// ============================================================================

/** Session configuration */
export const SESSION_CONFIG = {
  /** Session max age in seconds (30 days) */
  maxAge: 30 * 24 * 60 * 60,

  /** Session update interval in seconds (24 hours) */
  updateAge: 24 * 60 * 60,

  /** Cookie name */
  cookieName: 'ada.session-token',

  /** Cookie options */
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  },
} as const;

// ============================================================================
// Rate Limiting
// ============================================================================

/** Rate limit configuration by tier */
export const RATE_LIMITS = {
  FREE: {
    /** Requests per minute */
    requestsPerMinute: 60,
    /** Concurrent agent runs */
    concurrentRuns: 1,
  },
  PRO: {
    requestsPerMinute: 300,
    concurrentRuns: 3,
  },
  ENTERPRISE: {
    requestsPerMinute: 1000,
    concurrentRuns: 10,
  },
} as const;

// ============================================================================
// URL Configuration
// ============================================================================

/** Auth-related URLs */
export const AUTH_URLS = {
  /** Sign in page */
  signIn: '/auth/signin',

  /** Sign out callback */
  signOut: '/auth/signout',

  /** OAuth callback */
  callback: '/api/auth/callback/github',

  /** After sign in */
  afterSignIn: '/dashboard',

  /** After sign out */
  afterSignOut: '/',

  /** Error page */
  error: '/auth/error',
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

/** Auth feature flags */
export const AUTH_FEATURES = {
  /** Enable team workspaces (Sprint 4+) */
  teamsEnabled: false,

  /** Enable API key authentication */
  apiKeysEnabled: false,

  /** Enable email/password auth (never for v1) */
  passwordAuthEnabled: false,

  /** Enable magic link auth (future) */
  magicLinkEnabled: false,
} as const;
