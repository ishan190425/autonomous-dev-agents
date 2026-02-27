import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { listInstallationRepos } from '@/lib/github/app';
import { TIER_CONFIG } from '@/lib/billing/tiers';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const installationId = req.nextUrl.searchParams.get('installation_id');
  const setupAction = req.nextUrl.searchParams.get('setup_action');

  if (!installationId || setupAction !== 'install') {
    return NextResponse.redirect(
      new URL('/dashboard?error=invalid_callback', req.url)
    );
  }

  const installId = parseInt(installationId, 10);
  if (isNaN(installId)) {
    return NextResponse.redirect(
      new URL('/dashboard?error=invalid_installation', req.url)
    );
  }

  try {
    const repos = await listInstallationRepos(installId);

    // Check tier repo limit
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true, _count: { select: { repositories: true } } },
    });

    const tier = (user?.tier ?? 'FREE') as keyof typeof TIER_CONFIG;
    const maxRepos = TIER_CONFIG[tier].maxRepos;
    const currentCount = user?._count?.repositories ?? 0;

    // Calculate how many we can add (-1 means unlimited)
    const canAdd =
      maxRepos === -1 ? repos.length : Math.max(0, maxRepos - currentCount);

    if (canAdd === 0) {
      return NextResponse.redirect(
        new URL('/repos/new?error=repo_limit', req.url)
      );
    }

    const reposToAdd = repos.slice(0, canAdd);

    // Upsert each repository
    for (const repo of reposToAdd) {
      await prisma.repository.upsert({
        where: { githubId: repo.id },
        update: {
          name: repo.name,
          fullName: repo.full_name,
          installationId: installId,
          defaultBranch: repo.default_branch,
          avatarUrl: repo.owner.avatar_url,
          status: 'ACTIVE',
        },
        create: {
          name: repo.name,
          fullName: repo.full_name,
          githubId: repo.id,
          installationId: installId,
          defaultBranch: repo.default_branch,
          avatarUrl: repo.owner.avatar_url,
          ownerId: session.user.id,
          status: 'ACTIVE',
        },
      });
    }

    return NextResponse.redirect(new URL('/dashboard', req.url));
  } catch (error) {
    console.error('[GitHub Callback] Error:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=github_sync_failed', req.url)
    );
  }
}
