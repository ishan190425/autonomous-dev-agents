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
  last_run: string | null;
  cycle_count: number;
}

interface DispatchEntry {
  roleId: string | null;
  status: string;
  createdAt: Date;
}

// Fallback colors for roles
const ROLE_COLORS: Record<string, string> = {
  ceo: 'bg-role-ceo',
  growth: 'bg-role-growth',
  research: 'bg-role-research',
  frontier: 'bg-role-frontier',
  product: 'bg-role-product',
  scrum: 'bg-role-scrum',
  qa: 'bg-role-qa',
  engineering: 'bg-role-engineering',
  ops: 'bg-role-ops',
  design: 'bg-role-design',
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
  // If we have the roster from GitHub, use the real rotation order
  if (roster && rotationState) {
    const roleMap = new Map(roster.roles.map((r) => [r.id, r]));
    const currentIndex = rotationState.current_index;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Rotation Timeline</CardTitle>
          <CardDescription>
            Live view of your multi-agent rotation across roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-stretch gap-2 overflow-x-auto pb-3 scrollbar-thin">
          {roster.rotation_order.map((roleId, index) => {
            const role = roleMap.get(roleId);
            const isCurrent = index === currentIndex;
            const isPast = index < currentIndex;
            const color = ROLE_COLORS[roleId] ?? 'bg-gray-500';

            return (
              <div
                key={roleId}
                className={`flex flex-col items-center gap-2 rounded-2xl border bg-bg-secondary/60 px-3 py-3 min-w-[72px] ${
                  isCurrent
                    ? 'border-ada-primary bg-ada-primary-light/60 shadow-sm'
                    : isPast
                      ? 'opacity-60'
                      : 'border-transparent'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white text-lg shadow-sm`}
                >
                  {role?.emoji ?? '🤖'}
                </div>
                <span className="text-xs font-medium capitalize text-center">
                  {role?.name ?? roleId}
                </span>
                {isCurrent && (
                  <span className="text-[10px] text-ada-primary font-semibold tracking-wide uppercase">
                    {isRunning ? 'Running' : 'Next'}
                  </span>
                )}
              </div>
            );
          })}
          </div>

          <p className="mt-2 text-xs text-text-muted">
            Cycle {rotationState.cycle_count.toLocaleString()}
            {rotationState.last_role && (
              <>
                {' • '}
                Last:{' '}
                {roleMap.get(rotationState.last_role)?.emoji ?? '🤖'}{' '}
                <span className="capitalize">
                  {roleMap.get(rotationState.last_role)?.name ?? rotationState.last_role}
                </span>
              </>
            )}
            {rotationState.last_run && (
              <> • {new Date(rotationState.last_run).toLocaleString()}</>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Fallback: derive from dispatches if no GitHub data available
  const recentRoles: { roleId: string; status: string }[] = [];
  const seen = new Set<string>();
  for (const d of dispatches) {
    if (d.roleId && !seen.has(d.roleId)) {
      seen.add(d.roleId);
      recentRoles.push({ roleId: d.roleId, status: d.status });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Rotation Timeline</CardTitle>
        <CardDescription>
          We’ll visualize your agent rotation here once your repo is configured.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {recentRoles.length === 0 ? (
          <p className="text-sm text-text-muted">
            No agents data found. Make sure your repo has{' '}
            <code className="text-xs bg-bg-secondary px-1 py-0.5 rounded">agents/roster.json</code> and{' '}
            <code className="text-xs bg-bg-secondary px-1 py-0.5 rounded">agents/state/rotation.json</code>.
          </p>
        ) : (
        <div className="flex items-stretch gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {[...recentRoles].reverse().map((entry, index) => {
            const color = ROLE_COLORS[entry.roleId] ?? 'bg-gray-500';
            const isLatest = index === recentRoles.length - 1;

            return (
              <div
                key={`${entry.roleId}-${index}`}
                className={`flex flex-col items-center gap-2 rounded-2xl border bg-bg-secondary/60 px-3 py-3 min-w-[72px] ${
                  isLatest
                    ? 'border-ada-primary bg-ada-primary-light/60 shadow-sm'
                    : 'opacity-60 border-transparent'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white text-lg shadow-sm`}
                >
                  🤖
                </div>
                <span className="text-xs font-medium capitalize text-center">
                  {entry.roleId}
                </span>
              </div>
            );
          })}
        </div>
      )}
      </CardContent>
    </Card>
  );
}
