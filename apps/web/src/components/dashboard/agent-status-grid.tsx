import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
  // Build map of latest dispatch per role
  const dispatchByRole = new Map<string, DispatchEntry>();
  for (const d of dispatches) {
    if (d.roleId && !dispatchByRole.has(d.roleId)) {
      dispatchByRole.set(d.roleId, d);
    }
  }

  // Build map of latest history entry per role (from rotation.json)
  const historyByRole = new Map<string, { action: string; timestamp: string }>();
  if (rotationState?.history) {
    for (const h of rotationState.history) {
      if (!historyByRole.has(h.role)) {
        historyByRole.set(h.role, h);
      }
    }
  }

  // Determine current/next role from rotation state
  const currentRoleId = roster && rotationState
    ? roster.rotation_order[rotationState.current_index] ?? null
    : null;

  // Use roster roles if available, otherwise derive from dispatches
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

      // Prefer dispatch action, fallback to history action
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
    // Fallback: show roles from dispatches
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Agent Team Status</CardTitle>
        <CardDescription>
          Snapshot of each role in your autonomous team and its latest action.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {roles.length === 0 ? (
          <p className="text-sm text-text-muted">No agent roles configured.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {roles.map((agent) => (
              <div
                key={agent.id}
                className={`group relative overflow-hidden rounded-xl border px-3 py-3 transition-colors ${
                  agent.isActive
                    ? 'border-ada-primary bg-ada-primary-light/60 shadow-sm'
                    : agent.isNext
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10'
                      : agent.lastAction
                        ? 'border-transparent bg-bg-secondary/80 hover:bg-bg-secondary'
                        : 'border-dashed border-bg-tertiary bg-bg-secondary/40 opacity-70'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-bg-primary shadow-sm text-lg">
                    {agent.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{agent.name}</p>
                    <p className="text-[10px] text-text-muted truncate">{agent.title}</p>
                  </div>
                  {agent.isActive && (
                    <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-ada-success animate-pulse" />
                  )}
                  {agent.isNext && !agent.isActive && (
                    <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-amber-400" />
                  )}
                </div>
                <p
                  className="text-[11px] text-text-muted line-clamp-2"
                  title={agent.lastAction ?? agent.title}
                >
                  {agent.isActive
                    ? 'Running...'
                    : agent.lastAction
                      ? agent.lastAction
                      : agent.title}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
