import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { TIER_CONFIG } from '@/lib/billing/tiers';

/**
 * POST /api/repos/sync
 *
 * Connects a single repo by githubId. The user must have already
 * installed the GitHub App on that repo (discovered via /api/repos/discover).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { githubId, name, fullName, defaultBranch, avatarUrl, installationId } = body;

    if (!githubId || !fullName || !installationId) {
      return NextResponse.json(
        { error: 'Missing required fields: githubId, fullName, installationId' },
        { status: 400 }
      );
    }

    // Check tier limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true, _count: { select: { repositories: true } } },
    });

    const tier = (user?.tier ?? 'FREE') as keyof typeof TIER_CONFIG;
    const maxRepos = TIER_CONFIG[tier].maxRepos;
    const currentCount = user?._count?.repositories ?? 0;

    if (maxRepos !== -1 && currentCount >= maxRepos) {
      return NextResponse.json(
        { error: `Repository limit reached (${currentCount}/${maxRepos}). Upgrade your plan.` },
        { status: 403 }
      );
    }

    // Upsert the repo
    await prisma.repository.upsert({
      where: { githubId: githubId },
      update: {
        name,
        fullName,
        installationId,
        defaultBranch: defaultBranch ?? 'main',
        avatarUrl,
        status: 'ACTIVE',
      },
      create: {
        name,
        fullName,
        githubId,
        installationId,
        defaultBranch: defaultBranch ?? 'main',
        avatarUrl,
        ownerId: session.user.id,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ message: `Connected ${fullName}` });
  } catch (err) {
    console.error('[Repo Sync] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/repos/sync
 *
 * Disconnects a repo by githubId.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { githubId } = body;

    if (!githubId) {
      return NextResponse.json({ error: 'Missing githubId' }, { status: 400 });
    }

    // Verify ownership before deleting
    const repo = await prisma.repository.findFirst({
      where: { githubId, ownerId: session.user.id },
    });

    if (!repo) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    await prisma.repository.delete({ where: { id: repo.id } });

    return NextResponse.json({ message: `Disconnected ${repo.fullName}` });
  } catch (err) {
    console.error('[Repo Disconnect] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Disconnect failed' },
      { status: 500 }
    );
  }
}
