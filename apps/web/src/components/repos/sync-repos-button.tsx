'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DiscoveredRepo {
  githubId: number;
  name: string;
  fullName: string;
  defaultBranch: string;
  avatarUrl: string;
  installationId: number;
  connected: boolean;
}

export function SyncReposButton() {
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState<DiscoveredRepo[] | null>(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const router = useRouter();

  async function discover() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/repos/discover');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Discovery failed');
      setRepos(data.repos);
      if (data.repos.length === 0) {
        setError('No repos found. Install the GitHub App on your repos first.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setLoading(false);
    }
  }

  async function connectRepo(repo: DiscoveredRepo) {
    setActionLoading(repo.githubId);
    setError('');
    try {
      const res = await fetch('/api/repos/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connect failed');

      // Update local state
      setRepos((prev) =>
        prev?.map((r) =>
          r.githubId === repo.githubId ? { ...r, connected: true } : r
        ) ?? null
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connect failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function disconnectRepo(repo: DiscoveredRepo) {
    setActionLoading(repo.githubId);
    setError('');
    try {
      const res = await fetch('/api/repos/sync', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubId: repo.githubId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Disconnect failed');

      setRepos((prev) =>
        prev?.map((r) =>
          r.githubId === repo.githubId ? { ...r, connected: false } : r
        ) ?? null
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setActionLoading(null);
    }
  }

  // Initial state: show discover button
  if (repos === null) {
    return (
      <div>
        <button
          onClick={discover}
          disabled={loading}
          className={
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ' +
            (loading
              ? 'bg-bg-secondary text-text-muted cursor-not-allowed'
              : 'bg-bg-primary text-text-primary hover:bg-bg-secondary')
          }
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {loading ? 'Discovering...' : 'Sync from GitHub'}
        </button>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  // After discovery: show repo list with connect/disconnect buttons
  return (
    <div className="mt-6 bg-bg-primary rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-heading-3">Available Repositories</h2>
        <button
          onClick={discover}
          disabled={loading}
          className="text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      {repos.length === 0 ? (
        <p className="text-sm text-text-muted">
          No repos found. Install the GitHub App on your repos first.
        </p>
      ) : (
        <div className="divide-y">
          {repos.map((repo) => (
            <div
              key={repo.githubId}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                {repo.avatarUrl && (
                  <img src={repo.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                )}
                <div>
                  <p className="text-sm font-medium">{repo.fullName}</p>
                  <p className="text-xs text-text-muted">{repo.defaultBranch}</p>
                </div>
              </div>

              <button
                onClick={() =>
                  repo.connected ? disconnectRepo(repo) : connectRepo(repo)
                }
                disabled={actionLoading === repo.githubId}
                className={
                  'text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ' +
                  (actionLoading === repo.githubId
                    ? 'bg-bg-secondary text-text-muted cursor-not-allowed'
                    : repo.connected
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                      : 'bg-ada-primary/10 text-ada-primary hover:bg-ada-primary/20')
                }
              >
                {actionLoading === repo.githubId
                  ? '...'
                  : repo.connected
                    ? 'Disconnect'
                    : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
