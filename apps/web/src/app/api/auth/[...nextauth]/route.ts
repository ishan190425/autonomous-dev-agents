/**
 * NextAuth.js API Route Handler
 *
 * Handles all authentication-related requests:
 * - GET /api/auth/signin — Sign in page
 * - POST /api/auth/signin/:provider — Initiate OAuth flow
 * - GET /api/auth/callback/:provider — OAuth callback
 * - GET /api/auth/signout — Sign out page
 * - POST /api/auth/signout — Sign out action
 * - GET /api/auth/session — Get current session
 * - GET /api/auth/providers — List available providers
 *
 * @author ⚙️ Engineering (Cycle 1190)
 * @see Sprint 3 Day 3-4 — AUTH-1 through AUTH-7
 */

import { handlers } from '@/lib/auth/auth';

export const { GET, POST } = handlers;
