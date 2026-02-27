'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus } from 'lucide-react';

interface Repo {
  id: string;
  name: string;
  fullName: string;
  avatarUrl: string | null;
  status: string;
  isRunning: boolean;
}

export function RepoSwitcher({
  repos,
  selectedRepoId,
}: {
  repos: Repo[];
  selectedRepoId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const selected = repos.find((r) => r.id === selectedRepoId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function selectRepo(repoId: string) {
    setOpen(false);
    await fetch('/api/repos/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoId }),
    });
    router.refresh();
  }

  return (
    <div ref={ref} className="relative mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg glass glass-hover text-left"
      >
        {selected?.avatarUrl && (
          <img
            src={selected.avatarUrl}
            alt=""
            className="w-5 h-5 rounded-full ring-1 ring-white/[0.08]"
          />
        )}
        <span className="flex-1 text-sm font-medium text-n-text truncate">
          {selected?.fullName ?? 'Select repo'}
        </span>
        {selected?.isRunning && (
          <span className="w-2 h-2 rounded-full bg-n-cyan animate-glow-pulse shadow-glow-cyan" />
        )}
        <ChevronDown
          className={`w-4 h-4 text-n-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full mt-1 glass border border-white/[0.12] shadow-lg z-50 overflow-hidden"
          >
            {repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => selectRepo(repo.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${
                  repo.id === selectedRepoId
                    ? 'bg-n-cyan/10 text-n-cyan'
                    : 'text-n-text-secondary hover:bg-white/[0.06] hover:text-n-text'
                }`}
              >
                {repo.avatarUrl && (
                  <img src={repo.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                )}
                <span className="flex-1 truncate">{repo.fullName}</span>
                {repo.isRunning && (
                  <span className="w-2 h-2 rounded-full bg-n-cyan animate-glow-pulse" />
                )}
              </button>
            ))}

            <Link
              href="/repos/new"
              className="flex items-center gap-2 px-3 py-2 text-sm text-n-cyan hover:bg-white/[0.06] transition-colors border-t border-white/[0.08]"
              onClick={() => setOpen(false)}
            >
              <Plus className="w-4 h-4" />
              Add Repository
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
