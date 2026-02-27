import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'ada.selected-repo';

export async function getSelectedRepoId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function getSelectedRepo(userId: string) {
  const repoId = await getSelectedRepoId();
  if (!repoId) return null;

  const repo = await prisma.repository.findFirst({
    where: { id: repoId, ownerId: userId },
  });

  return repo;
}
