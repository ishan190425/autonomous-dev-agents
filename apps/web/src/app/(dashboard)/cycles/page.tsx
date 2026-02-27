import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { getRepoJsonFile } from '@/lib/github/app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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

  const cookieStore = cookies();
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
      <div>
        <h1 className="text-heading-1">Cycles</h1>
        <p className="text-body text-text-secondary">
          View dispatch history and cycle details sourced directly from your repo rotation log.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Cycles</CardTitle>
            <CardDescription>Ground truth from agents/state/rotation.json</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-semibold tabular-nums">{total.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Successful</CardTitle>
            <CardDescription>Cycles marked as successes</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-semibold tabular-nums text-ada-success">
              {successes.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Failures</CardTitle>
            <CardDescription>Cycles marked as failures</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-semibold tabular-nums text-status-error">
              {failures.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Cycle History</CardTitle>
          <CardDescription>
            Latest cycles from the rotation history in your repository (showing all available entries).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <p className="text-sm text-text-muted py-6">
              No rotation history found. Make sure your repo has{' '}
              <code className="text-xs bg-bg-secondary px-1 py-0.5 rounded">
                agents/state/rotation.json
              </code>
              .
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-bg-primary">
              <table className="min-w-full text-sm">
                <thead className="bg-bg-secondary/60 text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Cycle</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">Outcome</th>
                    <th className="px-3 py-2 text-left">Summary</th>
                    <th className="px-3 py-2 text-left">Timestamp</th>
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
                        className="border-t border-bg-secondary/80 hover:bg-bg-secondary/60"
                      >
                        <td className="px-3 py-2 tabular-nums text-text-secondary">
                          {entry.cycle ?? '—'}
                        </td>
                        <td className="px-3 py-2 capitalize">{entry.role}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              isFailure
                                ? 'bg-red-50 text-status-error'
                                : 'bg-emerald-50 text-ada-success'
                            }`}
                          >
                            {isFailure ? 'Failed' : 'Success'}
                          </span>
                        </td>
                        <td className="px-3 py-2 max-w-xl">
                          <p className="line-clamp-2 text-xs text-text-secondary" title={entry.action}>
                            {entry.action}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-xs text-text-muted whitespace-nowrap">
                          {date.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
