/**
 * NextAuth.js Middleware
 *
 * Protects routes that require authentication.
 * Redirects unauthenticated users to sign in page.
 *
 * @author ⚙️ Engineering (Cycle 1190)
 * @see Sprint 3 Day 3-4 — AUTH-4, AUTH-5
 */

import { auth } from '@/lib/auth/auth';
import { AUTH_URLS } from '@/lib/auth/config';

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const pathname = req.nextUrl.pathname;

  // Protected routes — require authentication
  const protectedPaths = [
    '/dashboard',
    '/settings',
    '/cycles',
    '/memory',
    '/api/user',
    '/api/repos',
  ];

  const isProtected = protectedPaths.some(
    (path) => pathname.startsWith(path)
  );

  // Redirect to sign in if accessing protected route while unauthenticated
  if (isProtected && !isAuthenticated) {
    const signInUrl = new URL(AUTH_URLS.signIn, req.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return Response.redirect(signInUrl);
  }

  // Redirect to dashboard if already signed in and accessing auth pages
  const authPages = ['/auth/signin', '/login'];
  const isAuthPage = authPages.some((path) => pathname.startsWith(path));

  if (isAuthPage && isAuthenticated) {
    return Response.redirect(new URL(AUTH_URLS.afterSignIn, req.nextUrl.origin));
  }
});

/**
 * Matcher configuration
 * Only run middleware on these paths (improves performance)
 */
export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/settings/:path*',
    '/cycles/:path*',
    '/memory/:path*',
    '/api/user/:path*',
    '/api/repos/:path*',
    // Auth pages (for redirect when already signed in)
    '/auth/:path*',
    '/login',
  ],
};
