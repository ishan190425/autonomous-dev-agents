import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { repoId } = await req.json();
  if (!repoId || typeof repoId !== 'string') {
    return NextResponse.json({ error: 'repoId required' }, { status: 400 });
  }

  // Verify ownership
  const repo = await prisma.repository.findFirst({
    where: { id: repoId, ownerId: session.user.id },
  });

  if (!repo) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('ada.selected-repo', repoId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return res;
}
