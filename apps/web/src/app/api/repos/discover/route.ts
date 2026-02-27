import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { getAppJWT } from '@/lib/github/app';

/**
 * GET /api/repos/discover
 *
 * Lists all repos available through GitHub App installations
 * so the user can choose which ones to connect.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const appJwt = getAppJWT();
    const installationsRes = await fetch(
      'https://api.github.com/app/installations',
      {
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!installationsRes.ok) {
      const body = await installationsRes.text();
      throw new Error(`Failed to list installations: ${installationsRes.status} ${body}`);
    }

    const installations: {
      id: number;
      account: { login: string; avatar_url: string; id: number };
    }[] = await installationsRes.json();

    if (installations.length === 0) {
      return NextResponse.json({ repos: [], message: 'No GitHub App installations found.' });
    }

    // Get already-connected repo githubIds
    const connectedRepos: { githubId: number }[] = await prisma.repository.findMany({
      where: { ownerId: session.user.id },
      select: { githubId: true },
    });
    const connectedIds = new Set(connectedRepos.map((r) => r.githubId));

    // Discover all repos from all installations
    const allRepos: {
      githubId: number;
      name: string;
      fullName: string;
      defaultBranch: string;
      avatarUrl: string;
      installationId: number;
      connected: boolean;
    }[] = [];

    for (const installation of installations) {
      const tokenRes = await fetch(
        `https://api.github.com/app/installations/${installation.id}/access_tokens`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${appJwt}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );

      if (!tokenRes.ok) continue;
      const { token } = await tokenRes.json();

      const reposRes = await fetch(
        'https://api.github.com/installation/repositories?per_page=100',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );

      if (!reposRes.ok) continue;
      const { repositories } = await reposRes.json();

      for (const repo of repositories) {
        allRepos.push({
          githubId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          defaultBranch: repo.default_branch,
          avatarUrl: repo.owner.avatar_url,
          installationId: installation.id,
          connected: connectedIds.has(repo.id),
        });
      }
    }

    return NextResponse.json({ repos: allRepos });
  } catch (err) {
    console.error('[Repo Discover] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Discovery failed' },
      { status: 500 }
    );
  }
}
