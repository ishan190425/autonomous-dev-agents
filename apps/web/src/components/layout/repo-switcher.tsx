'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
    <div ref={ref} className="relative mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary hover:bg-bg-secondary/80 transition-colors text-left"
      >
        {selected?.avatarUrl && (
          <img
            src={selected.avatarUrl}
            alt=""
            className="w-5 h-5 rounded-full"
          />
        )}
        <span className="flex-1 text-sm font-medium truncate">
          {selected?.fullName ?? 'Select repo'}
        </span>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-bg-primary border rounded-lg shadow-lg z-50 overflow-hidden">
          {repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => selectRepo(repo.id)}
              className={
                'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-secondary transition-colors text-left ' +
                (repo.id === selectedRepoId ? 'bg-bg-secondary' : '')
              }
            >
              {repo.avatarUrl && (
                <img src={repo.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
              )}
              <span className="flex-1 truncate">{repo.fullName}</span>
              {repo.isRunning && (
                <span className="w-2 h-2 rounded-full bg-ada-primary animate-pulse" />
              )}
            </button>
          ))}

          <Link
            href="/repos/new"
            className="flex items-center gap-2 px-3 py-2 text-sm text-ada-primary hover:bg-bg-secondary transition-colors border-t"
            onClick={() => setOpen(false)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Repository
          </Link>
        </div>
      )}
    </div>
  );
}
