'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { NeonButton } from '@/components/ui/neon-button';

const INTERVAL_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '6 hours', value: 360 },
  { label: '12 hours', value: 720 },
  { label: '24 hours', value: 1440 },
];

interface RepoScheduleFormProps {
  repoId: string;
  repoName: string;
  initialEnabled: boolean;
  initialInterval: number | null;
  lastDispatchAt: string | null;
  nextDispatchAt: string | null;
}

export function RepoScheduleForm({
  repoId,
  repoName,
  initialEnabled,
  initialInterval,
  lastDispatchAt,
  nextDispatchAt,
}: RepoScheduleFormProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [interval, setInterval] = useState(initialInterval ?? 60);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/dispatch/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId,
          enabled,
          intervalMinutes: interval,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setMessage('Schedule saved');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-n-text">Auto-run cycles</h3>
          <p className="text-xs text-n-text-muted">{repoName}</p>
        </div>
        <motion.button
          onClick={() => setEnabled(!enabled)}
          className={
            'relative w-11 h-6 rounded-full transition-colors ' +
            (enabled ? 'bg-n-cyan' : 'bg-white/[0.12]')
          }
          whileTap={{ scale: 0.95 }}
        >
          <motion.span
            animate={{ x: enabled ? 20 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
          />
        </motion.button>
      </div>

      {enabled && (
        <div>
          <label className="text-sm text-n-text-muted block mb-1">
            Run every
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-n-bg-elevated border border-white/[0.08] text-sm text-n-text focus:border-n-cyan/30 focus:outline-none transition-colors"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {lastDispatchAt && (
        <p className="text-xs text-n-text-muted">
          Last run: {new Date(lastDispatchAt).toLocaleString()}
        </p>
      )}
      {nextDispatchAt && enabled && (
        <p className="text-xs text-n-text-muted">
          Next run: {new Date(nextDispatchAt).toLocaleString()}
        </p>
      )}

      <div className="flex items-center gap-3">
        <NeonButton onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Schedule'}
        </NeonButton>
        {message && (
          <span className="text-sm text-n-text-muted">{message}</span>
        )}
      </div>
    </div>
  );
}
