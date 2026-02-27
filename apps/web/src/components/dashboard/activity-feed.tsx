'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardFooter } from '@/components/ui/glass-card';

interface DispatchEntry {
  id: string;
  status: string;
  triggeredBy: string;
  roleId: string | null;
  action: string | null;
  error: string | null;
  createdAt: Date;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusDot(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'bg-n-status-success shadow-[0_0_6px_#00ff88]';
    case 'RUNNING': return 'bg-n-cyan shadow-[0_0_6px_#00f0ff] animate-glow-pulse';
    case 'FAILED': return 'bg-n-status-error shadow-[0_0_6px_#ff4466]';
    case 'PENDING': return 'bg-n-text-muted';
    default: return 'bg-n-text-muted';
  }
}

export function ActivityFeed({ dispatches }: { dispatches: DispatchEntry[] }) {
  return (
    <GlassCard className="h-full" hover={false}>
      <GlassCardHeader className="pb-3">
        <GlassCardTitle>Recent Activity</GlassCardTitle>
        <GlassCardDescription>
          Latest cycles, errors, and dispatches from your agent team.
        </GlassCardDescription>
      </GlassCardHeader>

      <GlassCardContent className="pt-0">
        {dispatches.length === 0 ? (
          <p className="text-sm text-n-text-muted py-8 text-center">
            No cycles run yet. Click &quot;Run Cycle&quot; to start.
          </p>
        ) : (
          <div className="space-y-1 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
            {dispatches.map((d, index) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors"
              >
                <div className="mt-1.5">
                  <span className={`block w-2 h-2 rounded-full ${statusDot(d.status)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-n-text truncate">
                    {d.action || d.error || d.status}
                  </p>
                  <p className="text-[11px] text-n-text-muted">
                    {d.roleId && (
                      <span className="capitalize">
                        {d.roleId}
                        {' · '}
                      </span>
                    )}
                    {d.triggeredBy} · {timeAgo(d.createdAt)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </GlassCardContent>

      <GlassCardFooter className="pt-2">
        <Link
          href="/cycles"
          className="w-full py-2 text-xs font-medium text-center text-n-cyan hover:text-n-cyan/80 transition-colors"
        >
          View all activity →
        </Link>
      </GlassCardFooter>
    </GlassCard>
  );
}
