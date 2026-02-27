import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { SidebarProvider } from '@/lib/sidebar-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { CommandPalette } from '@/components/layout/command-palette';
import { DashboardShell } from '@/components/layout/dashboard-shell';

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
  const cookieStore = await cookies();
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
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-n-bg">
        <Header session={session} />
        <div className="flex">
          <Sidebar repos={repos} selectedRepoId={selectedRepoId} />
          <DashboardShell>
            {children}
          </DashboardShell>
        </div>
        <CommandPalette />
      </div>
    </SidebarProvider>
  );
}
