/**
 * NextAuth.js Handler
 *
 * Main authentication handler with Prisma adapter.
 * Exports auth(), signIn(), signOut() for use throughout the app.
 *
 * @author ⚙️ Engineering (Cycle 1190)
 * @see Sprint 3 Day 3-4 — AUTH-1 through AUTH-7
 */

import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';

import { prisma } from '../prisma';
import { authConfig } from './auth.config';

/**
 * NextAuth.js handler with Prisma adapter
 *
 * The Prisma adapter automatically:
 * - Creates users in the database on first sign in
 * - Links OAuth accounts to users
 * - Manages sessions in the database
 * - Handles verification tokens
 */
export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
});

/**
 * Type-safe session getter
 * Use in server components and API routes
 *
 * @example
 * ```tsx
 * import { getSession } from '@/lib/auth/auth';
 *
 * export default async function Page() {
 *   const session = await getSession();
 *   if (!session) redirect('/auth/signin');
 *   return <div>Hello {session.user.name}</div>;
 * }
 * ```
 */
export const getSession = auth;

/**
 * Type-safe session getter that throws if unauthenticated
 * Use when you're certain the route requires auth
 *
 * @example
 * ```tsx
 * import { getRequiredSession } from '@/lib/auth/auth';
 *
 * export default async function DashboardPage() {
 *   const session = await getRequiredSession(); // Throws if not authenticated
 *   return <div>Hello {session.user.name}</div>;
 * }
 * ```
 */
export async function getRequiredSession() {
  const session = await auth();
  if (!session) {
    throw new Error('Unauthenticated');
  }
  return session;
}

export default auth;
