'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, RefreshCw, Brain, Settings, Search, Plus, Play } from 'lucide-react';

const commands = [
  { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, action: 'navigate', path: '/dashboard' },
  { id: 'cycles', label: 'Go to Cycles', icon: RefreshCw, action: 'navigate', path: '/cycles' },
  { id: 'memory', label: 'Go to Memory', icon: Brain, action: 'navigate', path: '/memory' },
  { id: 'settings', label: 'Go to Settings', icon: Settings, action: 'navigate', path: '/settings' },
  { id: 'new-repo', label: 'Connect Repository', icon: Plus, action: 'navigate', path: '/repos/new' },
  { id: 'run-cycle', label: 'Run Cycle', icon: Play, action: 'run-cycle', path: '' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    },
    []
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function execute(cmd: (typeof commands)[number]) {
    setOpen(false);
    if (cmd.action === 'navigate' && cmd.path) {
      router.push(cmd.path);
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[selected]) {
      execute(filtered[selected]);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[101]"
          >
            <div className="glass border border-white/[0.12] shadow-glow-cyan-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08]">
                <Search className="w-4 h-4 text-n-text-muted" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(0);
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Type a command..."
                  className="flex-1 bg-transparent text-sm text-n-text placeholder-n-text-muted outline-none"
                />
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-n-text-muted">
                  ESC
                </kbd>
              </div>
              <div className="py-2 max-h-64 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-n-text-muted text-center">No results found</p>
                ) : (
                  filtered.map((cmd, index) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => execute(cmd)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          index === selected
                            ? 'bg-n-cyan/10 text-n-cyan'
                            : 'text-n-text-secondary hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {cmd.label}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
