/**
 * NextAuth.js Configuration
 *
 * Core authentication configuration for the ADA SaaS platform.
 * Uses GitHub OAuth as the primary authentication provider.
 *
 * @author ⚙️ Engineering (Cycle 1190)
 * @see Sprint 3 Day 3-4 — AUTH-1 through AUTH-7
 */

import type { NextAuthConfig, Session, User, Account, Profile } from 'next-auth';
import GitHub from 'next-auth/providers/github';

import { AUTH_ENV, AUTH_URLS, SESSION_CONFIG, GITHUB_SCOPES } from './config';
import type { Tier } from './types';

/**
 * Extended session user type with ADA fields
 */
interface ADASessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  tier?: Tier;
  githubId?: string;
}

/**
 * User from database adapter with ADA fields
 */
interface DatabaseUser {
  id: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: Date | null;
  image?: string | null;
  tier?: Tier;
  githubId?: string;
}

/** Callback params types */
interface SignInParams {
  user: User;
  account?: Account | null;
  profile?: Profile;
}

interface SessionParams {
  session: Session;
  user?: User;
  token?: unknown;
}

interface RedirectParams {
  url: string;
  baseUrl: string;
}

interface CreateUserParams {
  user: User;
}

interface SignInEventParams {
  user: User;
  isNewUser?: boolean;
  account?: Account | null;
}

/**
 * NextAuth.js configuration object
 * Used by auth() handler and middleware
 */
export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: AUTH_ENV.GITHUB_CLIENT_ID ?? '',
      clientSecret: AUTH_ENV.GITHUB_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: GITHUB_SCOPES.join(' '),
        },
      },
    }),
  ],

  pages: {
    signIn: AUTH_URLS.signIn,
    signOut: AUTH_URLS.signOut,
    error: AUTH_URLS.error,
  },

  session: {
    strategy: 'database',
    maxAge: SESSION_CONFIG.maxAge,
    updateAge: SESSION_CONFIG.updateAge,
  },

  callbacks: {
    /**
     * Control who can sign in
     * For now, allow all GitHub users
     */
    signIn: async (params: SignInParams): Promise<boolean> => {
      const user = params.user as DatabaseUser;
      // Require email for sign in
      if (!user.email) {
        return false;
      }

      // Future: Add allowlist check for beta period
      // Future: Block users who have been banned

      return true;
    },

    /**
     * Customize session object sent to client
     * Adds ADA-specific fields (tier, cyclesRemaining)
     */
    session: async (params: SessionParams): Promise<Session> => {
      const { session } = params;
      const user = params.user as DatabaseUser | undefined;

      // user comes from database adapter
      const sessionUser = session.user as ADASessionUser;
      if (sessionUser && user) {
        sessionUser.id = user.id;
        sessionUser.tier = user.tier ?? 'FREE';
        sessionUser.githubId = user.githubId;
      }
      return session;
    },

    /**
     * Redirect after sign in/out
     */
    redirect: async (params: RedirectParams): Promise<string> => {
      const { url, baseUrl } = params;
      // Redirect to same origin only (security)
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl + AUTH_URLS.afterSignIn;
    },
  },

  events: {
    /**
     * User created for the first time
     */
    createUser: async (params: CreateUserParams): Promise<void> => {
      const user = params.user as DatabaseUser;
      console.log(`[ADA Auth] New user created: ${user.email}`);
      // Future: Send welcome email
      // Future: Check waitlist for priority badge
    },

    /**
     * User signed in
     */
    signIn: async (params: SignInEventParams): Promise<void> => {
      const user = params.user as DatabaseUser;
      const isNewUser = params.isNewUser;
      console.log(
        `[ADA Auth] User signed in: ${user.email} (new: ${isNewUser})`
      );
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

export default authConfig;
