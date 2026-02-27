import { NextRequest, NextResponse } from 'next/server';
import { AUTH_URLS } from '@/lib/auth/config';

/**
 * Edge middleware for route protection.
 *
 * With database sessions, NextAuth's auth() wrapper can't run in Edge
 * (no Prisma/DB access). Instead, we check for the session cookie directly.
 * Actual session validation happens server-side via auth() from auth.ts.
 */
export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Check for NextAuth session cookie (database strategy stores a session token)
  const sessionCookie =
    req.cookies.get('__Secure-authjs.session-token') ??
    req.cookies.get('authjs.session-token');
  const isAuthenticated = !!sessionCookie?.value;

  // Protected routes — require authentication
  const protectedPaths = [
    '/dashboard',
    '/settings',
    '/cycles',
    '/memory',
    '/repos',
    '/api/user',
    '/api/repos',
    '/api/dispatch',
    '/api/github/callback',
  ];

  const isProtected = protectedPaths.some(
    (path) => pathname.startsWith(path)
  );

  if (isProtected && !isAuthenticated) {
    const signInUrl = new URL(AUTH_URLS.signIn, req.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect to dashboard if already signed in and accessing auth pages
  const authPages = ['/auth/signin', '/login'];
  const isAuthPage = authPages.some((path) => pathname.startsWith(path));

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL(AUTH_URLS.afterSignIn, req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/settings/:path*',
    '/cycles/:path*',
    '/memory/:path*',
    '/repos/:path*',
    '/api/user/:path*',
    '/api/repos/:path*',
    '/api/dispatch/:path*',
    '/api/github/callback',
    // Auth pages (for redirect when already signed in)
    '/auth/:path*',
    '/login',
    // Note: /api/github/webhook is NOT in the matcher — it uses signature verification
  ],
};
