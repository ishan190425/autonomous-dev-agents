'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/lib/sidebar-context';

interface HeaderSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Header({ session }: { session: HeaderSession | null }) {
  const { collapsed } = useSidebar();

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-n-bg/80 backdrop-blur-xl border-b border-white/[0.06] z-50">
      <div className="flex items-center justify-between h-full px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="text-xl font-bold bg-gradient-to-r from-n-cyan to-n-purple bg-clip-text text-transparent">
            ADA
          </span>
        </Link>

        {/* Cmd+K Trigger */}
        <button
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-n-text-muted text-sm hover:bg-white/[0.06] transition-colors"
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
            document.dispatchEvent(event);
          }}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search...</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-n-text-muted">
            ⌘K
          </kbd>
        </button>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {session?.user ? (
            <div className="flex items-center gap-2">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name ?? 'User'}
                  className="w-8 h-8 rounded-full ring-1 ring-white/[0.1]"
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-n-purple/20 ring-1 ring-n-purple/30 flex items-center justify-center text-n-purple text-sm font-medium">
                  {session.user.name?.[0]?.toUpperCase() ?? 'U'}
                </span>
              )}
              <span className="text-sm font-medium text-n-text-secondary hidden sm:inline">
                {session.user.name}
              </span>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs rounded-md text-n-text-muted hover:text-n-text hover:bg-white/[0.06] transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm text-n-cyan hover:text-n-cyan/80 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
