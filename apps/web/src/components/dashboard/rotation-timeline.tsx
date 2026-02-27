'use client';

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/glass-card';
import { StaggerChildren, StaggerItem } from '@/components/ui/motion-wrapper';
import { cn } from '@/lib/utils';

interface Role {
  id: string;
  name: string;
  title: string;
  emoji: string;
}

interface Roster {
  roles: Role[];
  rotation_order: string[];
}

interface RotationState {
  current_index: number;
  last_role: string | null;
  last_run: string | null;
  cycle_count: number;
}

interface DispatchEntry {
  roleId: string | null;
  status: string;
  createdAt: Date;
}

const ROLE_RING_COLORS: Record<string, string> = {
  ceo: 'ring-role-ceo',
  growth: 'ring-role-growth',
  research: 'ring-role-research',
  frontier: 'ring-role-frontier',
  product: 'ring-role-product',
  scrum: 'ring-role-scrum',
  qa: 'ring-role-qa',
  engineering: 'ring-role-engineering',
  ops: 'ring-role-ops',
  design: 'ring-role-design',
};

const ROLE_TEXT_COLORS: Record<string, string> = {
  ceo: 'text-role-ceo',
  growth: 'text-role-growth',
  research: 'text-role-research',
  frontier: 'text-role-frontier',
  product: 'text-role-product',
  scrum: 'text-role-scrum',
  qa: 'text-role-qa',
  engineering: 'text-role-engineering',
  ops: 'text-role-ops',
  design: 'text-role-design',
};

export function RotationTimeline({
  roster,
  rotationState,
  dispatches,
  isRunning,
}: {
  roster: Roster | null;
  rotationState: RotationState | null;
  dispatches: DispatchEntry[];
  isRunning: boolean;
}) {
  if (roster && rotationState) {
    const roleMap = new Map(roster.roles.map((r) => [r.id, r]));
    const currentIndex = rotationState.current_index;

    return (
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <GlassCardTitle>Rotation Timeline</GlassCardTitle>
          <GlassCardDescription>
            Live view of your multi-agent rotation across roles.
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="pt-0">
          {/* Connecting line */}
          <div className="relative">
            <div className="absolute top-6 left-6 right-6 h-px bg-gradient-to-r from-n-cyan/30 via-n-purple/20 to-transparent z-0" />
            <StaggerChildren className="flex items-stretch gap-2 overflow-x-auto pb-3 scrollbar-thin relative z-10">
              {roster.rotation_order.map((roleId, index) => {
                const role = roleMap.get(roleId);
                const isCurrent = index === currentIndex;
                const isPast = index < currentIndex;
                const ringColor = ROLE_RING_COLORS[roleId] ?? 'ring-white/20';

                return (
                  <StaggerItem
                    key={roleId}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-2xl border px-3 py-3 min-w-[72px] transition-all',
                      isCurrent
                        ? 'border-n-cyan/30 bg-n-cyan/[0.06]'
                        : isPast
                          ? 'border-transparent opacity-50'
                          : 'border-transparent opacity-30'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full bg-n-bg-elevated flex items-center justify-center text-lg ring-2',
                        ringColor,
                        isCurrent && isRunning && 'animate-glow-pulse shadow-glow-cyan'
                      )}
                    >
                      {role?.emoji ?? '🤖'}
                    </div>
                    <span className="text-xs font-medium capitalize text-center text-n-text-secondary">
                      {role?.name ?? roleId}
                    </span>
                    {isCurrent && (
                      <span className={cn(
                        'text-[10px] font-semibold tracking-wide uppercase',
                        isRunning ? 'text-n-cyan' : 'text-n-status-warning'
                      )}>
                        {isRunning ? 'Running' : 'Next'}
                      </span>
                    )}
                  </StaggerItem>
                );
              })}
            </StaggerChildren>
          </div>

          <p className="mt-2 text-xs text-n-text-muted">
            Cycle {rotationState.cycle_count.toLocaleString()}
            {rotationState.last_role && (
              <>
                {' · '}
                Last:{' '}
                {roleMap.get(rotationState.last_role)?.emoji ?? '🤖'}{' '}
                <span className="capitalize">
                  {roleMap.get(rotationState.last_role)?.name ?? rotationState.last_role}
                </span>
              </>
            )}
            {rotationState.last_run && (
              <> · {new Date(rotationState.last_run).toLocaleString()}</>
            )}
          </p>
        </GlassCardContent>
      </GlassCard>
    );
  }

  // Fallback
  const recentRoles: { roleId: string; status: string }[] = [];
  const seen = new Set<string>();
  for (const d of dispatches) {
    if (d.roleId && !seen.has(d.roleId)) {
      seen.add(d.roleId);
      recentRoles.push({ roleId: d.roleId, status: d.status });
    }
  }

  return (
    <GlassCard>
      <GlassCardHeader className="pb-3">
        <GlassCardTitle>Rotation Timeline</GlassCardTitle>
        <GlassCardDescription>
          We&apos;ll visualize your agent rotation here once your repo is configured.
        </GlassCardDescription>
      </GlassCardHeader>

      <GlassCardContent className="pt-0">
        {recentRoles.length === 0 ? (
          <p className="text-sm text-n-text-muted">
            No agents data found. Make sure your repo has{' '}
            <code className="text-xs bg-n-bg-elevated px-1.5 py-0.5 rounded text-n-cyan">agents/roster.json</code> and{' '}
            <code className="text-xs bg-n-bg-elevated px-1.5 py-0.5 rounded text-n-cyan">agents/state/rotation.json</code>.
          </p>
        ) : (
          <StaggerChildren className="flex items-stretch gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {[...recentRoles].reverse().map((entry, index) => {
              const ringColor = ROLE_RING_COLORS[entry.roleId] ?? 'ring-white/20';
              const isLatest = index === recentRoles.length - 1;

              return (
                <StaggerItem
                  key={`${entry.roleId}-${index}`}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-2xl border px-3 py-3 min-w-[72px]',
                    isLatest
                      ? 'border-n-cyan/30 bg-n-cyan/[0.06]'
                      : 'opacity-50 border-transparent'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full bg-n-bg-elevated flex items-center justify-center text-lg ring-2',
                      ringColor
                    )}
                  >
                    🤖
                  </div>
                  <span className="text-xs font-medium capitalize text-center text-n-text-secondary">
                    {entry.roleId}
                  </span>
                </StaggerItem>
              );
            })}
          </StaggerChildren>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
