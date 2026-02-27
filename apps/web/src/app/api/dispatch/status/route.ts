import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dispatchId = req.nextUrl.searchParams.get('dispatchId');
  if (!dispatchId) {
    return NextResponse.json({ error: 'dispatchId required' }, { status: 400 });
  }

  const dispatch = await prisma.dispatch.findUnique({
    where: { id: dispatchId },
    include: {
      repository: {
        select: { ownerId: true },
      },
    },
  });

  if (!dispatch || dispatch.repository.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: dispatch.id,
    status: dispatch.status,
    roleId: dispatch.roleId,
    action: dispatch.action,
    error: dispatch.error,
    triggeredBy: dispatch.triggeredBy,
    startedAt: dispatch.startedAt,
    completedAt: dispatch.completedAt,
    createdAt: dispatch.createdAt,
  });
}
