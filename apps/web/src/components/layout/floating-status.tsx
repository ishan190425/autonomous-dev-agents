'use client';

import { AnimatePresence, motion } from 'framer-motion';

export function FloatingStatus({
  isRunning,
  roleName,
}: {
  isRunning: boolean;
  roleName?: string | null;
}) {
  return (
    <AnimatePresence>
      {isRunning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="glass border border-n-cyan/20 shadow-glow-cyan-lg rounded-full px-5 py-2.5 flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-n-cyan opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-n-cyan" />
            </span>
            <span className="text-sm text-n-text font-medium">
              Cycle running{roleName ? ` — ${roleName}` : ''}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
