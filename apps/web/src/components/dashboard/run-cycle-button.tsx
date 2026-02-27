'use client';

import { useState, useCallback, useRef } from 'react';

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

      // Poll for status
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
    <div className="flex items-center gap-3">
      <button
        onClick={startCycle}
        disabled={state === 'running'}
        className={
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
          (state === 'running'
            ? 'bg-ada-primary/50 text-white cursor-not-allowed'
            : 'bg-ada-primary text-white hover:bg-ada-primary/90')
        }
      >
        {state === 'running' && (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {state === 'running' ? 'Running...' : 'Run Cycle'}
      </button>

      {message && (
        <span
          className={
            'text-sm ' +
            (state === 'error'
              ? 'text-red-500'
              : state === 'done'
                ? 'text-green-500'
                : 'text-text-muted')
          }
        >
          {message}
        </span>
      )}
    </div>
  );
}
