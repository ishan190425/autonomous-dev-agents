import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { TIER_CONFIG } from '@/lib/billing/tiers';
import { ConnectRepoButton } from '@/components/repos/connect-repo-button';
import { SyncReposButton } from '@/components/repos/sync-repos-button';

export default async function NewRepoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const params = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true },
  });

  const repos: {
    id: string;
    name: string;
    fullName: string;
    avatarUrl: string | null;
    defaultBranch: string;
    status: string;
    createdAt: Date;
  }[] = await prisma.repository.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  const tier = (user?.tier ?? 'FREE') as keyof typeof TIER_CONFIG;
  const maxRepos = TIER_CONFIG[tier].maxRepos;
  const atLimit = maxRepos !== -1 && repos.length >= maxRepos;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1">Connect Repository</h1>
        <p className="text-body text-text-secondary">
          Connect a GitHub repository to start running autonomous agent cycles.
        </p>
      </div>

      {params.error === 'repo_limit' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            You&apos;ve reached your repository limit. Upgrade your plan to connect more repos.
          </p>
        </div>
      )}

      {/* Connect Card */}
      <div className="bg-bg-primary rounded-lg border p-6">
        <h2 className="text-heading-3 mb-2">Add a Repository</h2>
        <p className="text-body text-text-muted mb-4">
          Install the ADA GitHub App on your repository to get started.
          {maxRepos !== -1 && (
            <span className="ml-1">
              ({repos.length}/{maxRepos} repos used on {TIER_CONFIG[tier].displayName} plan)
            </span>
          )}
        </p>
        <ConnectRepoButton disabled={atLimit} />
        {atLimit && (
          <p className="text-sm text-text-muted mt-2">
            Upgrade to {TIER_CONFIG[tier].displayName === 'Free' ? 'Pro' : 'Team'} for more repositories.
          </p>
        )}
      </div>

      {/* Discover & pick repos from GitHub */}
      <div className="bg-bg-primary rounded-lg border p-6">
        <h2 className="text-heading-3 mb-2">Already installed the GitHub App?</h2>
        <p className="text-body text-text-muted mb-4">
          Click below to discover repos from your GitHub App installations and choose which to connect.
          {maxRepos !== -1 && (
            <span className="ml-1">
              ({repos.length}/{maxRepos} repos used)
            </span>
          )}
        </p>
        <SyncReposButton />
      </div>

      {/* Connected Repos */}
      {repos.length > 0 && (
        <div className="bg-bg-primary rounded-lg border p-6">
          <h2 className="text-heading-3 mb-4">Connected Repositories</h2>
          <div className="divide-y">
            {repos.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  {repo.avatarUrl && (
                    <img
                      src={repo.avatarUrl}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium">{repo.fullName}</p>
                    <p className="text-xs text-text-muted">{repo.defaultBranch}</p>
                  </div>
                </div>
                <span
                  className={
                    'text-xs px-2 py-0.5 rounded-full ' +
                    (repo.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : repo.status === 'ERROR'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300')
                  }
                >
                  {repo.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
