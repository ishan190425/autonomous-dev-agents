'use client';

import { useState, useCallback, useRef } from 'react';
import { Loader2, Play } from 'lucide-react';
import { NeonButton } from '@/components/ui/neon-button';
import { motion } from 'framer-motion';

export function RunCycleButton({ repoId }: { repoId: string }) {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = undefined;
    }
  }, []);

  const startCycle = useCallback(async () => {
    setState('running');
    setMessage('Starting cycle...');

    try {
      const res = await fetch('/api/dispatch/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start cycle');
      }

      const { dispatchId } = await res.json();
      setMessage('Cycle running...');

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/dispatch/status?dispatchId=${dispatchId}`
          );
          const status = await statusRes.json();

          if (status.status === 'COMPLETED') {
            stopPolling();
            setState('done');
            setMessage(
              status.action
                ? `Done: ${status.action.slice(0, 80)}`
                : 'Cycle completed'
            );
            setTimeout(() => setState('idle'), 5000);
          } else if (status.status === 'FAILED') {
            stopPolling();
            setState('error');
            setMessage(status.error || 'Cycle failed');
            setTimeout(() => setState('idle'), 5000);
          }
        } catch {
          // Ignore polling errors, keep trying
        }
      }, 3000);
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Failed to start cycle');
      setTimeout(() => setState('idle'), 5000);
    }
  }, [repoId, stopPolling]);

  return (
    <motion.div
      className="flex items-center gap-3"
      whileTap={{ scale: 0.98 }}
    >
      <NeonButton
        onClick={startCycle}
        disabled={state === 'running'}
        variant={state === 'running' ? 'primary' : 'default'}
      >
        {state === 'running' ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Play className="w-4 h-4 mr-2" />
        )}
        {state === 'running' ? 'Running...' : 'Run Cycle'}
      </NeonButton>

      {message && (
        <span
          className={
            'text-sm ' +
            (state === 'error'
              ? 'text-n-status-error'
              : state === 'done'
                ? 'text-n-status-success'
                : 'text-n-text-muted')
          }
        >
          {message}
        </span>
      )}
    </motion.div>
  );
}
