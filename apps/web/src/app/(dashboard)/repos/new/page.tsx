import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { TIER_CONFIG } from '@/lib/billing/tiers';
import { ConnectRepoButton } from '@/components/repos/connect-repo-button';
import { SyncReposButton } from '@/components/repos/sync-repos-button';
import { FadeIn } from '@/components/ui/motion-wrapper';

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
      <FadeIn>
        <div>
          <h1 className="text-heading-1 text-n-text">Connect Repository</h1>
          <p className="text-body text-n-text-secondary">
            Connect a GitHub repository to start running autonomous agent cycles.
          </p>
        </div>
      </FadeIn>

      {params.error === 'repo_limit' && (
        <FadeIn delay={0.05}>
          <div className="glass border border-n-status-error/20 rounded-xl p-4">
            <p className="text-sm text-n-status-error">
              You&apos;ve reached your repository limit. Upgrade your plan to connect more repos.
            </p>
          </div>
        </FadeIn>
      )}

      <FadeIn delay={0.1}>
        <div className="glass rounded-xl p-6">
          <h2 className="text-heading-3 text-n-text mb-2">Add a Repository</h2>
          <p className="text-body text-n-text-muted mb-4">
            Install the ADA GitHub App on your repository to get started.
            {maxRepos !== -1 && (
              <span className="ml-1 text-n-text-secondary">
                ({repos.length}/{maxRepos} repos used on {TIER_CONFIG[tier].displayName} plan)
              </span>
            )}
          </p>
          <ConnectRepoButton disabled={atLimit} />
          {atLimit && (
            <p className="text-sm text-n-text-muted mt-2">
              Upgrade to {TIER_CONFIG[tier].displayName === 'Free' ? 'Pro' : 'Team'} for more repositories.
            </p>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div className="glass rounded-xl p-6">
          <h2 className="text-heading-3 text-n-text mb-2">Already installed the GitHub App?</h2>
          <p className="text-body text-n-text-muted mb-4">
            Click below to discover repos from your GitHub App installations and choose which to connect.
            {maxRepos !== -1 && (
              <span className="ml-1 text-n-text-secondary">
                ({repos.length}/{maxRepos} repos used)
              </span>
            )}
          </p>
          <SyncReposButton />
        </div>
      </FadeIn>

      {repos.length > 0 && (
        <FadeIn delay={0.2}>
          <div className="glass rounded-xl p-6">
            <h2 className="text-heading-3 text-n-text mb-4">Connected Repositories</h2>
            <div className="divide-y divide-white/[0.06]">
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
                        className="w-8 h-8 rounded-full ring-1 ring-white/[0.08]"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-n-text">{repo.fullName}</p>
                      <p className="text-xs text-n-text-muted">{repo.defaultBranch}</p>
                    </div>
                  </div>
                  <span
                    className={
                      'text-xs px-2.5 py-0.5 rounded-full border ' +
                      (repo.status === 'ACTIVE'
                        ? 'bg-n-status-success/10 text-n-status-success border-n-status-success/20'
                        : repo.status === 'ERROR'
                          ? 'bg-n-status-error/10 text-n-status-error border-n-status-error/20'
                          : 'bg-white/[0.06] text-n-text-muted border-white/[0.08]')
                    }
                  >
                    {repo.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
