'use client';

import Link from 'next/link';

/**
 * Header Component — Top navigation bar
 * Per C1112: Logo, search, user menu
 */
export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-bg-primary border-b z-50">
      <div className="flex items-center justify-between h-full px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <span className="font-semibold text-lg">ADA</span>
        </Link>

        {/* Search (placeholder) */}
        <div className="flex-1 max-w-md mx-8">
          <input
            type="search"
            placeholder="Search cycles, memory..."
            className="w-full px-4 py-1.5 rounded-lg bg-bg-secondary border border-transparent focus:border-ada-primary focus:outline-none text-sm"
            disabled
          />
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-bg-secondary transition-colors">
            <span className="text-lg">🔔</span>
          </button>

          {/* User Menu */}
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg-secondary transition-colors">
            <span className="w-8 h-8 rounded-full bg-ada-primary flex items-center justify-center text-white text-sm font-medium">
              U
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
