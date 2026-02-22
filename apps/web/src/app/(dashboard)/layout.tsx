import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

/**
 * Dashboard Layout — Protected routes wrapper
 * Sprint 3: Add auth check middleware, redirect if not authenticated
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header */}
      <Header />
      
      <div className="flex">
        {/* Sidebar Navigation */}
        <Sidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6 ml-64">
          {children}
        </main>
      </div>
    </div>
  );
}
