import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Fetch user's repos
  const repos: {
    id: string;
    name: string;
    fullName: string;
    avatarUrl: string | null;
    status: string;
    isRunning: boolean;
  }[] = await prisma.repository.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      fullName: true,
      avatarUrl: true,
      status: true,
      isRunning: true,
    },
  });

  // Read selected repo from cookie, auto-select first if none
  const cookieStore = cookies();
  let selectedRepoId = cookieStore.get('ada.selected-repo')?.value ?? null;

  // Validate the selected repo is owned by user
  if (selectedRepoId && !repos.find((r) => r.id === selectedRepoId)) {
    selectedRepoId = null;
  }

  // Auto-select first repo if none selected, and persist to cookie
  if (!selectedRepoId && repos.length > 0) {
    selectedRepoId = repos[0].id;
    cookieStore.set('ada.selected-repo', selectedRepoId, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  // Onboarding gate: redirect to /repos/new if no repos and not already there
  // We check headers to get the current path since layout doesn't receive pathname directly
  // Instead, we'll let the page render — the repos/new page is within this layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-bg-primary to-bg-secondary">
      <Header />
      <div className="flex">
        <Sidebar repos={repos} selectedRepoId={selectedRepoId} />
        <main className="flex-1 ml-0 lg:ml-64 pt-16 px-4 pb-10 lg:px-8 xl:px-12">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
