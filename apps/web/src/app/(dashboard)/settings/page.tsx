import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { RepoScheduleForm } from '@/components/settings/repo-schedule-form';
import { FadeIn } from '@/components/ui/motion-wrapper';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const cookieStore = await cookies();
  const selectedRepoId = cookieStore.get('ada.selected-repo')?.value;

  const selectedRepo = selectedRepoId
    ? await prisma.repository.findFirst({
        where: { id: selectedRepoId, ownerId: session.user.id },
      })
    : null;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-heading-1 text-n-text">Settings</h1>
          <p className="text-body text-n-text-secondary">
            Configure your team, billing, and API access
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-heading-3 text-n-text mb-4">Repository Schedule</h2>
            {selectedRepo ? (
              <RepoScheduleForm
                repoId={selectedRepo.id}
                repoName={selectedRepo.fullName}
                initialEnabled={selectedRepo.scheduleEnabled}
                initialInterval={selectedRepo.scheduleIntervalMinutes}
                lastDispatchAt={selectedRepo.lastDispatchAt?.toISOString() ?? null}
                nextDispatchAt={selectedRepo.nextDispatchAt?.toISOString() ?? null}
              />
            ) : (
              <p className="text-body text-n-text-muted">
                Select a repository to configure its schedule.
              </p>
            )}
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-heading-3 text-n-text mb-4">Team Configuration</h2>
            <p className="text-body text-n-text-muted">
              Edit roster, rotation order, and role settings
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-heading-3 text-n-text mb-4">API Keys</h2>
            <p className="text-body text-n-text-muted">
              Generate and manage API keys
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-heading-3 text-n-text mb-4">Billing</h2>
            <p className="text-body text-n-text-muted">
              Stripe subscription management
            </p>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
