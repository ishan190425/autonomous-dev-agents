/**
 * ADA Dispatch Scheduler
 *
 * Standalone Node.js process that triggers scheduled dispatches.
 * Run separately from Next.js: npx tsx apps/web/scripts/scheduler.ts
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const POLL_INTERVAL_MS = 60_000; // Check every 60 seconds

async function tick() {
  const now = new Date();

  // Find repos due for a scheduled dispatch
  const dueRepos = await prisma.repository.findMany({
    where: {
      scheduleEnabled: true,
      isRunning: false,
      nextDispatchAt: { lte: now },
      status: 'ACTIVE',
    },
    include: {
      owner: { select: { id: true, tier: true, cyclesUsed: true, cyclesLimit: true } },
    },
  });

  for (const repo of dueRepos) {
    try {
      // Simple cycle limit check
      const limit = repo.owner.cyclesLimit;
      if (limit !== -1 && repo.owner.cyclesUsed >= limit) {
        console.log(
          `[Scheduler] Skipping ${repo.fullName}: cycle limit reached (${repo.owner.cyclesUsed}/${limit})`
        );
        continue;
      }

      // Create dispatch
      const dispatch = await prisma.dispatch.create({
        data: {
          repositoryId: repo.id,
          status: 'PENDING',
          triggeredBy: 'schedule',
        },
      });

      // Set repo running and update next dispatch time
      const intervalMs = (repo.scheduleIntervalMinutes ?? 60) * 60 * 1000;
      await prisma.repository.update({
        where: { id: repo.id },
        data: {
          isRunning: true,
          nextDispatchAt: new Date(now.getTime() + intervalMs),
        },
      });

      console.log(
        `[Scheduler] Triggered dispatch ${dispatch.id} for ${repo.fullName} (schedule)`
      );

      // Import and run executeDispatch dynamically
      // In production, this would call the dispatch pipeline
      const { executeDispatch } = await import('../src/lib/dispatch/execute');
      executeDispatch(repo.id, dispatch.id).catch((err: unknown) => {
        console.error(
          `[Scheduler] Dispatch ${dispatch.id} failed:`,
          err
        );
      });
    } catch (err) {
      console.error(`[Scheduler] Error processing ${repo.fullName}:`, err);
    }
  }
}

async function main() {
  console.log('[Scheduler] Starting ADA dispatch scheduler...');
  console.log(`[Scheduler] Polling every ${POLL_INTERVAL_MS / 1000}s`);

  // Run immediately on start
  await tick();

  // Then poll
  setInterval(tick, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error('[Scheduler] Fatal error:', err);
  process.exit(1);
});
