'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { RepoSwitcher } from './repo-switcher';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/cycles', label: 'Cycles', icon: '🔄' },
  { href: '/memory', label: 'Memory', icon: '🧠' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

interface Repo {
  id: string;
  name: string;
  fullName: string;
  avatarUrl: string | null;
  status: string;
  isRunning: boolean;
}

export function Sidebar({
  repos,
  selectedRepoId,
}: {
  repos?: Repo[];
  selectedRepoId?: string | null;
}) {
  const pathname = usePathname();

  const selectedRepo = repos?.find((r) => r.id === selectedRepoId);

  return (
    <aside className="fixed left-0 top-14 w-64 h-[calc(100vh-3.5rem)] bg-bg-primary border-r overflow-y-auto">
      <div className="p-4">
        {/* Repo Switcher */}
        {repos && repos.length > 0 && (
          <RepoSwitcher repos={repos} selectedRepoId={selectedRepoId ?? null} />
        )}

        {/* Navigation */}
        <nav className="space-y-1">
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
      </div>

      {/* Status */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-bg-secondary/50">
        {selectedRepo ? (
          <>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  selectedRepo.isRunning
                    ? 'bg-ada-primary animate-pulse'
                    : selectedRepo.status === 'ACTIVE'
                      ? 'bg-ada-success'
                      : 'bg-text-muted'
                )}
              />
              <span className="text-sm text-text-muted">
                {selectedRepo.isRunning ? 'Cycle running...' : selectedRepo.status}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1 truncate">
              {selectedRepo.fullName}
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-text-muted" />
            <span className="text-sm text-text-muted">No repo selected</span>
          </div>
        )}
      </div>
    </aside>
  );
}
