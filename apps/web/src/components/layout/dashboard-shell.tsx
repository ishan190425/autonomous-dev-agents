'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useSidebar } from '@/lib/sidebar-context';

export function DashboardShell({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <motion.main
      animate={{ marginLeft: collapsed ? 64 : 256 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="pt-16 px-4 pb-10 lg:px-8 xl:px-12 min-h-screen"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {children}
      </div>
    </motion.main>
  );
}
