import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { TIER_CONFIG } from '@/lib/billing/tiers';
import { canUseCycles } from '@/lib/billing/tiers';
import { executeDispatch } from '@/lib/dispatch/execute';

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

  // Check if already running
  if (repo.isRunning) {
    return NextResponse.json(
      { error: 'A cycle is already running for this repository' },
      { status: 409 }
    );
  }

  // Check tier limits
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true, cyclesUsed: true },
  });

  const tier = (user?.tier ?? 'FREE') as keyof typeof TIER_CONFIG;
  const cycleCheck = canUseCycles(tier, user?.cyclesUsed ?? 0);
  if (!cycleCheck.allowed) {
    return NextResponse.json(
      { error: cycleCheck.reason },
      { status: 429 }
    );
  }

  // Create dispatch record
  const dispatch = await prisma.dispatch.create({
    data: {
      repositoryId: repoId,
      status: 'PENDING',
      triggeredBy: 'manual',
    },
  });

  // Set repo as running
  await prisma.repository.update({
    where: { id: repoId },
    data: { isRunning: true },
  });

  // Fire async — don't await
  executeDispatch(repoId, dispatch.id).catch((err) => {
    console.error('[Dispatch Start] Unhandled error:', err);
  });

  return NextResponse.json({
    dispatchId: dispatch.id,
    status: 'started',
  });
}
