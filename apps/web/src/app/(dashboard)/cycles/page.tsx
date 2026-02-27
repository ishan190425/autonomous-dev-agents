import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { getRepoJsonFile } from '@/lib/github/app';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/glass-card';
import { FadeIn } from '@/components/ui/motion-wrapper';

interface RotationHistoryEntry {
  role: string;
  timestamp: string;
  cycle?: number;
  action: string;
  reflection?: {
    outcome?: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface RotationState {
  cycle_count: number;
  history: RotationHistoryEntry[];
}

export default async function CyclesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const cookieStore = await cookies();
  const selectedRepoId = cookieStore.get('ada.selected-repo')?.value ?? null;

  const repo = selectedRepoId
    ? await prisma.repository.findUnique({
        where: { id: selectedRepoId },
        select: {
          id: true,
          fullName: true,
          installationId: true,
          defaultBranch: true,
        },
      })
    : null;

  let rotationState: RotationState | null = null;

  if (repo) {
    try {
      rotationState = await getRepoJsonFile<RotationState>(
        repo.installationId,
        repo.fullName,
        'agents/state/rotation.json',
        repo.defaultBranch
      );
    } catch (err) {
      console.error('[Cycles] Failed to load rotation.json from repo:', err);
    }
  }

  const history = rotationState?.history ?? [];

  const rows = history
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 200);

  const total = rotationState?.cycle_count ?? history.length;
  const successes = history.filter((h) => h.reflection?.outcome !== 'failure').length;
  const failures = history.filter((h) => h.reflection?.outcome === 'failure').length;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-heading-1 text-n-text">Cycles</h1>
          <p className="text-body text-n-text-secondary">
            View dispatch history and cycle details sourced directly from your repo rotation log.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard glow="cyan">
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-sm">Total Cycles</GlassCardTitle>
              <GlassCardDescription>Ground truth from agents/state/rotation.json</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="pt-0">
              <p className="text-3xl font-semibold tabular-nums text-n-cyan">{total.toLocaleString()}</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-sm">Successful</GlassCardTitle>
              <GlassCardDescription>Cycles marked as successes</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="pt-0">
              <p className="text-3xl font-semibold tabular-nums text-n-status-success">
                {successes.toLocaleString()}
              </p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-sm">Failures</GlassCardTitle>
              <GlassCardDescription>Cycles marked as failures</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="pt-0">
              <p className="text-3xl font-semibold tabular-nums text-n-status-error">
                {failures.toLocaleString()}
              </p>
            </GlassCardContent>
          </GlassCard>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <GlassCard hover={false}>
          <GlassCardHeader className="pb-3">
            <GlassCardTitle>Cycle History</GlassCardTitle>
            <GlassCardDescription>
              Latest cycles from the rotation history in your repository (showing all available entries).
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="pt-0">
            {rows.length === 0 ? (
              <p className="text-sm text-n-text-muted py-6">
                No rotation history found. Make sure your repo has{' '}
                <code className="text-xs bg-n-bg-elevated px-1.5 py-0.5 rounded text-n-cyan">
                  agents/state/rotation.json
                </code>
                .
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-white/[0.06] bg-n-bg-surface/50">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-n-text-muted">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Cycle</th>
                      <th className="px-3 py-2.5 text-left">Role</th>
                      <th className="px-3 py-2.5 text-left">Outcome</th>
                      <th className="px-3 py-2.5 text-left">Summary</th>
                      <th className="px-3 py-2.5 text-left">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((entry) => {
                      const outcome = entry.reflection?.outcome ?? 'success';
                      const isFailure = outcome === 'failure';
                      const date = new Date(entry.timestamp);
                      return (
                        <tr
                          key={`${entry.cycle ?? entry.timestamp}-${entry.role}`}
                          className="border-t border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                        >
                          <td className="px-3 py-2.5 tabular-nums text-n-text-secondary">
                            {entry.cycle ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 capitalize text-n-text">{entry.role}</td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                                isFailure
                                  ? 'bg-n-status-error/10 text-n-status-error border-n-status-error/20'
                                  : 'bg-n-status-success/10 text-n-status-success border-n-status-success/20'
                              }`}
                            >
                              {isFailure ? 'Failed' : 'Success'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 max-w-xl">
                            <p className="line-clamp-2 text-xs text-n-text-secondary" title={entry.action}>
                              {entry.action}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-n-text-muted whitespace-nowrap">
                            {date.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      </FadeIn>
    </div>
  );
}
