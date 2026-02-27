import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { repoId, intervalMinutes, enabled } = await req.json();

  if (!repoId || typeof repoId !== 'string') {
    return NextResponse.json({ error: 'repoId required' }, { status: 400 });
  }

  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be boolean' }, { status: 400 });
  }

  if (enabled && (typeof intervalMinutes !== 'number' || intervalMinutes < 15)) {
    return NextResponse.json(
      { error: 'intervalMinutes must be >= 15' },
      { status: 400 }
    );
  }

  // Verify ownership
  const repo = await prisma.repository.findFirst({
    where: { id: repoId, ownerId: session.user.id },
  });

  if (!repo) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
  }

  const nextDispatchAt = enabled
    ? new Date(Date.now() + intervalMinutes * 60 * 1000)
    : null;

  const updated = await prisma.repository.update({
    where: { id: repoId },
    data: {
      scheduleEnabled: enabled,
      scheduleIntervalMinutes: enabled ? intervalMinutes : null,
      nextDispatchAt,
    },
    select: {
      scheduleEnabled: true,
      scheduleIntervalMinutes: true,
      lastDispatchAt: true,
      nextDispatchAt: true,
    },
  });

  return NextResponse.json(updated);
}
