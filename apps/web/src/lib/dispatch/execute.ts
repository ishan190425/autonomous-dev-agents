import { prisma } from '@/lib/prisma';
import { getInstallationToken } from '@/lib/github/app';
import {
  loadContext,
  executeAgentAction,
  completeDispatch,
} from '@ada-ai/core';

/**
 * Bridge between web API and @ada/core dispatch pipeline.
 * Executes a full dispatch cycle for a repository.
 */
export async function executeDispatch(
  repoId: string,
  dispatchId: string
): Promise<void> {
  try {
    // 1. Get repo from DB
    const repo = await prisma.repository.findUniqueOrThrow({
      where: { id: repoId },
      include: { owner: true },
    });

    // 2. Update dispatch to RUNNING
    await prisma.dispatch.update({
      where: { id: dispatchId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    // 3. Get installation token (available for future GitHub API calls)
    await getInstallationToken(repo.installationId);

    // 4. Run dispatch pipeline: loadContext → executeAgentAction → completeDispatch
    const context = await loadContext(process.cwd());
    if (!context) {
      throw new Error('No roles configured — loadContext returned null');
    }

    const actionResult = await executeAgentAction(context);

    const result = await completeDispatch(context, {
      action: actionResult.action,
    });

    // 5. Update Dispatch record
    await prisma.dispatch.update({
      where: { id: dispatchId },
      data: {
        status: 'COMPLETED',
        roleId: result.role,
        action: result.action,
        completedAt: new Date(),
      },
    });

    // 6. Update Repository
    await prisma.repository.update({
      where: { id: repoId },
      data: {
        isRunning: false,
        lastDispatchAt: new Date(),
        currentCycle: { increment: 1 },
      },
    });

    // 7. Increment user cyclesUsed
    await prisma.user.update({
      where: { id: repo.ownerId },
      data: { cyclesUsed: { increment: 1 } },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Dispatch] Error:', errorMsg);

    // Mark dispatch as failed
    await prisma.dispatch
      .update({
        where: { id: dispatchId },
        data: {
          status: 'FAILED',
          error: errorMsg,
          completedAt: new Date(),
        },
      })
      .catch(() => {});

    // Reset repo running state
    await prisma.repository
      .update({
        where: { id: repoId },
        data: { isRunning: false },
      })
      .catch(() => {});
  }
}
