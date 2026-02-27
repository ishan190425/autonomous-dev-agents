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
  cycle_count: number;
  history: { role: string; action: string; timestamp: string }[];
}

interface DispatchEntry {
  roleId: string | null;
  action: string | null;
  status: string;
  createdAt: Date;
}

const ROLE_BORDER_COLORS: Record<string, string> = {
  ceo: 'border-l-role-ceo',
  growth: 'border-l-role-growth',
  research: 'border-l-role-research',
  frontier: 'border-l-role-frontier',
  product: 'border-l-role-product',
  scrum: 'border-l-role-scrum',
  qa: 'border-l-role-qa',
  engineering: 'border-l-role-engineering',
  ops: 'border-l-role-ops',
  design: 'border-l-role-design',
};

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

export function AgentStatusGrid({
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
  const dispatchByRole = new Map<string, DispatchEntry>();
  for (const d of dispatches) {
    if (d.roleId && !dispatchByRole.has(d.roleId)) {
      dispatchByRole.set(d.roleId, d);
    }
  }

  const historyByRole = new Map<string, { action: string; timestamp: string }>();
  if (rotationState?.history) {
    for (const h of rotationState.history) {
      if (!historyByRole.has(h.role)) {
        historyByRole.set(h.role, h);
      }
    }
  }

  const currentRoleId = roster && rotationState
    ? roster.rotation_order[rotationState.current_index] ?? null
    : null;

  const roles: {
    id: string;
    name: string;
    emoji: string;
    title: string;
    lastAction: string | null;
    isActive: boolean;
    isNext: boolean;
  }[] = [];

  if (roster) {
    for (const role of roster.roles) {
      const dispatch = dispatchByRole.get(role.id);
      const history = historyByRole.get(role.id);
      const isActive = isRunning && role.id === currentRoleId;
      const isNext = !isRunning && role.id === currentRoleId;
      const lastAction = dispatch?.action ?? history?.action ?? null;

      roles.push({
        id: role.id,
        name: role.name,
        emoji: role.emoji,
        title: role.title,
        lastAction,
        isActive,
        isNext,
      });
    }
  } else {
    const seenRoles = new Set<string>();
    for (const d of dispatches) {
      if (d.roleId && !seenRoles.has(d.roleId)) {
        seenRoles.add(d.roleId);
        roles.push({
          id: d.roleId,
          name: d.roleId,
          emoji: '🤖',
          title: d.roleId,
          lastAction: d.action,
          isActive: false,
          isNext: false,
        });
      }
    }
  }

  return (
    <GlassCard>
      <GlassCardHeader className="pb-3">
        <GlassCardTitle>Agent Team Status</GlassCardTitle>
        <GlassCardDescription>
          Snapshot of each role in your autonomous team and its latest action.
        </GlassCardDescription>
      </GlassCardHeader>

      <GlassCardContent className="pt-0">
        {roles.length === 0 ? (
          <p className="text-sm text-n-text-muted">No agent roles configured.</p>
        ) : (
          <StaggerChildren className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {roles.map((agent) => {
              const borderColor = ROLE_BORDER_COLORS[agent.id] ?? 'border-l-white/20';
              const ringColor = ROLE_RING_COLORS[agent.id] ?? 'ring-white/20';

              return (
                <StaggerItem key={agent.id}>
                  <div
                    className={cn(
                      'group relative overflow-hidden rounded-xl border border-white/[0.06] border-l-2 px-3 py-3 transition-all',
                      borderColor,
                      agent.isActive
                        ? 'bg-n-cyan/[0.06] shadow-glow-cyan'
                        : agent.isNext
                          ? 'bg-n-status-warning/[0.04]'
                          : agent.lastAction
                            ? 'bg-white/[0.03] hover:bg-white/[0.06]'
                            : 'border-dashed bg-white/[0.01] opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        'inline-flex h-8 w-8 items-center justify-center rounded-full bg-n-bg-elevated ring-2 text-lg',
                        ringColor,
                        agent.isActive && 'shadow-glow-cyan animate-glow-pulse'
                      )}>
                        {agent.emoji}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-n-text truncate">{agent.name}</p>
                        <p className="text-[10px] text-n-text-muted truncate">{agent.title}</p>
                      </div>
                      {agent.isActive && (
                        <span className="ml-auto relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-n-cyan opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-n-cyan" />
                        </span>
                      )}
                      {agent.isNext && !agent.isActive && (
                        <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-n-status-warning shadow-[0_0_6px_#ffaa00]" />
                      )}
                    </div>
                    <p
                      className="text-[11px] text-n-text-muted line-clamp-2"
                      title={agent.lastAction ?? agent.title}
                    >
                      {agent.isActive
                        ? 'Running...'
                        : agent.lastAction
                          ? agent.lastAction
                          : agent.title}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerChildren>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
