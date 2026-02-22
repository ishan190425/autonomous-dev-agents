'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/cycles', label: 'Cycles', icon: '🔄' },
  { href: '/memory', label: 'Memory', icon: '🧠' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

/**
 * Sidebar Navigation Component
 * Per C1112 Design System: Fixed left sidebar with role-color accents
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-14 w-64 h-[calc(100vh-3.5rem)] bg-bg-primary border-r overflow-y-auto">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-ada-primary-light text-ada-primary dark:bg-ada-primary/20'
                : 'text-text-secondary hover:bg-bg-secondary'
            )}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Team Status */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-bg-secondary/50">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-ada-success animate-pulse"></span>
          <span className="text-sm text-text-muted">Team Active</span>
        </div>
        <p className="text-xs text-text-muted mt-1">Cycle 1120 in progress</p>
      </div>
    </aside>
  );
}
