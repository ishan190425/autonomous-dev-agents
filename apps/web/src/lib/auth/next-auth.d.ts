/**
 * NextAuth.js Type Augmentations
 *
 * Extends NextAuth types with ADA-specific fields.
 * These fields are added to the session via callbacks.
 *
 * @author ⚙️ Engineering (Cycle 1190)
 * @see Sprint 3 Day 3-4
 */

import type { Tier } from './types';

declare module 'next-auth' {
  /**
   * Extended User type with ADA fields
   */
  interface User {
    /** User's subscription tier */
    tier?: Tier;
    /** GitHub user ID */
    githubId?: string;
    /** Cycles used this period */
    cyclesUsed?: number;
    /** Cycle limit (-1 = unlimited) */
    cyclesLimit?: number;
  }

  /**
   * Extended Session type with ADA fields
   */
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      /** User's subscription tier */
      tier?: Tier;
      /** GitHub user ID */
      githubId?: string;
    };
  }
}

declare module '@auth/core/adapters' {
  /**
   * Adapter User with ADA fields
   * Matches our Prisma schema
   */
  interface AdapterUser {
    tier?: Tier;
    githubId?: string;
    cyclesUsed?: number;
    cyclesLimit?: number;
  }
}
