'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, RefreshCw, Brain, Settings, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/lib/sidebar-context';
import { RepoSwitcher } from './repo-switcher';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cycles', label: 'Cycles', icon: RefreshCw },
  { href: '/memory', label: 'Memory', icon: Brain },
  { href: '/settings', label: 'Settings', icon: Settings },
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
  const { collapsed, toggle } = useSidebar();
  const selectedRepo = repos?.find((r) => r.id === selectedRepoId);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-n-bg-surface/80 backdrop-blur-xl border-r border-white/[0.06] z-40 overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* Repo Switcher */}
        <div className="p-3">
          {!collapsed && repos && repos.length > 0 && (
            <RepoSwitcher repos={repos} selectedRepoId={selectedRepoId ?? null} />
          )}
          {collapsed && selectedRepo?.avatarUrl && (
            <div className="flex justify-center">
              <img
                src={selectedRepo.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full ring-1 ring-white/[0.08]"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'text-n-cyan bg-n-cyan/10'
                    : 'text-n-text-secondary hover:text-n-text hover:bg-white/[0.06]'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-n-cyan"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className="w-5 h-5 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Status */}
        <div className="p-3 border-t border-white/[0.06]">
          {!collapsed && selectedRepo && (
            <div className="glass rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    selectedRepo.isRunning
                      ? 'bg-n-cyan animate-glow-pulse shadow-glow-cyan'
                      : selectedRepo.status === 'ACTIVE'
                        ? 'bg-n-status-success'
                        : 'bg-n-text-muted'
                  )}
                />
                <span className="text-xs text-n-text-muted">
                  {selectedRepo.isRunning ? 'Cycle running...' : selectedRepo.status}
                </span>
              </div>
              <p className="text-[11px] text-n-text-muted mt-1 truncate">
                {selectedRepo.fullName}
              </p>
            </div>
          )}
          {collapsed && selectedRepo && (
            <div className="flex justify-center">
              <span
                className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  selectedRepo.isRunning
                    ? 'bg-n-cyan animate-glow-pulse shadow-glow-cyan'
                    : selectedRepo.status === 'ACTIVE'
                      ? 'bg-n-status-success'
                      : 'bg-n-text-muted'
                )}
              />
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={toggle}
          className="flex items-center justify-center h-10 border-t border-white/[0.06] text-n-text-muted hover:text-n-text hover:bg-white/[0.04] transition-colors"
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
