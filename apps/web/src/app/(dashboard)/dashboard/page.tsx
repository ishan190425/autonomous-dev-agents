import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getRepoJsonFile } from '@/lib/github/app';
import { CycleStats } from '@/components/dashboard/cycle-stats';
import { RotationTimeline } from '@/components/dashboard/rotation-timeline';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { AgentStatusGrid } from '@/components/dashboard/agent-status-grid';
import { RunCycleButton } from '@/components/dashboard/run-cycle-button';

interface Dispatch {
  id: string;
  status: string;
  triggeredBy: string;
  roleId: string | null;
  action: string | null;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

interface Role {
  id: string;
  name: string;
  title: string;
  emoji: string;
  focus: string[];
}

interface Roster {
  company: string;
  product: string;
  roles: Role[];
  rotation_order: string[];
}

interface RotationState {
  current_index: number;
  last_role: string | null;
  last_run: string | null;
  cycle_count: number;
  history: {
    role: string;
    action: string;
    timestamp: string;
    // Optional reflection metadata from rotation.json — used for success rate
    reflection?: {
      outcome?: string;
    };
    // Other fields (e.g. cycle) may exist but are ignored here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }[];
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const cookieStore = cookies();
  const selectedRepoId = cookieStore.get('ada.selected-repo')?.value;

  // Check if user has any repos
  const repoCount = await prisma.repository.count({
    where: { ownerId: session.user.id },
  });

  if (repoCount === 0) {
    redirect('/repos/new');
  }

  // Load selected repo
  const repo: {
    id: string;
    fullName: string;
    installationId: number;
    defaultBranch: string;
    currentCycle: number;
    isRunning: boolean;
  } | null = selectedRepoId
    ? await prisma.repository.findUnique({
        where: { id: selectedRepoId },
        select: {
          id: true,
          fullName: true,
          installationId: true,
          defaultBranch: true,
          currentCycle: true,
          isRunning: true,
        },
      })
    : null;

  // Load dispatches from DB
  const dbDispatches: Dispatch[] = selectedRepoId
    ? await prisma.dispatch.findMany({
        where: { repositoryId: selectedRepoId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    : [];

  // Fetch agents files from GitHub repo
  let roster: Roster | null = null;
  let rotationState: RotationState | null = null;

  if (repo) {
    try {
      console.log(`[Dashboard] Fetching agents data for ${repo.fullName} (installation: ${repo.installationId}, branch: ${repo.defaultBranch})`);
      const [rosterData, stateData] = await Promise.all([
        getRepoJsonFile<Roster>(
          repo.installationId,
          repo.fullName,
          'agents/roster.json',
          repo.defaultBranch
        ),
        getRepoJsonFile<RotationState>(
          repo.installationId,
          repo.fullName,
          'agents/state/rotation.json',
          repo.defaultBranch
        ),
      ]);
      roster = rosterData;
      rotationState = stateData;
      console.log(`[Dashboard] roster: ${roster ? 'loaded' : 'null'}, rotation: ${rotationState ? 'loaded' : 'null'}`);
    } catch (err) {
      console.error('[Dashboard] Failed to fetch agents data from GitHub:', err);
    }
  } else {
    console.log(`[Dashboard] No repo loaded. selectedRepoId=${selectedRepoId}`);
  }

  // Use GitHub rotation state cycle count if available, fallback to DB
  const cycleCount = rotationState?.cycle_count ?? repo?.currentCycle ?? 0;

  const history = rotationState?.history ?? [];

  // Prefer repo rotation history as source of truth when available
  const historyDispatches: Dispatch[] = history.map((entry, index) => {
    const isFailure = entry.reflection?.outcome === 'failure';
    return {
      id: `history-${index}`,
      status: isFailure ? 'FAILED' : 'COMPLETED',
      triggeredBy: 'rotation',
      roleId: entry.role,
      action: entry.action,
      error: null,
      createdAt: new Date(entry.timestamp),
      completedAt: new Date(entry.timestamp),
    };
  });

  const hasHistory = historyDispatches.length > 0;
  const hasDbDispatches = dbDispatches.length > 0;

  // Stats: repo rotation history → fallback to DB if repo data missing
  let totalCycles = 0;
  let completedCycles = 0;
  let failedCycles = 0;

  if (hasHistory) {
    totalCycles = historyDispatches.length;
    completedCycles = historyDispatches.filter((d) => d.status === 'COMPLETED').length;
    failedCycles = historyDispatches.filter((d) => d.status === 'FAILED').length;
  } else if (hasDbDispatches) {
    totalCycles = dbDispatches.length;
    completedCycles = dbDispatches.filter((d) => d.status === 'COMPLETED').length;
    failedCycles = dbDispatches.filter((d) => d.status === 'FAILED').length;
  }

  // Activity / downstream components should also use repo as truth when present
  const effectiveDispatches: Dispatch[] =
    hasHistory ? historyDispatches : dbDispatches;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-1">
            Control Tower
          </p>
          <h1 className="text-heading-1 text-balance">Agent Dashboard</h1>
          <p className="text-body text-text-secondary">
            {repo ? repo.fullName : 'Select a repository to get started'}
          </p>
        </div>
        {selectedRepoId && (
          <div className="flex items-center gap-3">
            {repo?.isRunning && (
              <div className="flex items-center gap-2 rounded-full bg-bg-secondary px-3 py-1 text-xs text-text-muted">
                <span className="w-2 h-2 rounded-full bg-ada-primary animate-pulse" />
                Cycle in progress
              </div>
            )}
            <RunCycleButton repoId={selectedRepoId} />
          </div>
        )}
      </div>

      {/* Stats Row */}
      <CycleStats
        totalCycles={totalCycles}
        completedCycles={completedCycles}
        failedCycles={failedCycles}
        isRunning={repo?.isRunning ?? false}
        repoCycleCount={cycleCount}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <RotationTimeline
            roster={roster}
            rotationState={rotationState}
            dispatches={effectiveDispatches}
            isRunning={repo?.isRunning ?? false}
          />
          <AgentStatusGrid
            roster={roster}
            rotationState={rotationState}
            dispatches={effectiveDispatches}
            isRunning={repo?.isRunning ?? false}
          />
        </div>
        <div className="space-y-6">
          <ActivityFeed dispatches={effectiveDispatches.slice(0, 20)} />
        </div>
      </div>
    </div>
  );
}
