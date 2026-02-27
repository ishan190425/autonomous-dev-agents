import fs from 'node:fs/promises';
import path from 'node:path';

import Link from 'next/link';

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/glass-card';
import { FadeIn } from '@/components/ui/motion-wrapper';

interface HeatEntry {
  id: string;
  memoryClass: string;
  baseImportance: number;
  referenceCount: number;
  lastAccessedAt: number;
  createdAt: number;
}

async function loadHeat(): Promise<HeatEntry[]> {
  const heatPath = path.join(process.cwd(), '..', '..', 'agents', 'memory', 'heat.jsonl');
  try {
    const content = await fs.readFile(heatPath, 'utf8');
    return content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as HeatEntry);
  } catch {
    return [];
  }
}

async function loadBankMeta() {
  const bankPath = path.join(process.cwd(), '..', '..', 'agents', 'memory', 'bank.md');
  let content = '';
  try {
    content = await fs.readFile(bankPath, 'utf8');
  } catch {
    return { lastUpdated: '', cycle: '' };
  }

  const headerLine = content.split('\n').find((line) => line.startsWith('> **Last updated:**'));
  let lastUpdated = '';
  let cycle = '';
  if (headerLine) {
    const updatedMatch = headerLine.match(/\*\*Last updated:\*\*\s*([^|]+)\s*\|/);
    const cycleMatch = headerLine.match(/\*\*Cycle:\*\*\s*([0-9]+)/);
    if (updatedMatch) lastUpdated = updatedMatch[1].trim();
    if (cycleMatch) cycle = cycleMatch[1].trim();
  }

  return { lastUpdated, cycle };
}

export default async function MemoryPage() {
  const [heatEntries, bankMeta] = await Promise.all([loadHeat(), loadBankMeta()]);

  const ranked = heatEntries
    .slice()
    .sort((a, b) => {
      const aScore = a.baseImportance * (1 + a.referenceCount / 10);
      const bScore = b.baseImportance * (1 + b.referenceCount / 10);
      return bScore - aScore;
    })
    .slice(0, 40);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-heading-1 text-n-text">Memory Bank</h1>
          <p className="text-body text-n-text-secondary">
            Shared team memory with heat scoring, sourced directly from agents/memory.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-sm">Last Updated</GlassCardTitle>
              <GlassCardDescription>From memory bank header</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="pt-0">
              <p className="text-sm text-n-text">{bankMeta.lastUpdated || 'Unknown'}</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard glow="purple">
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-sm">Cycle</GlassCardTitle>
              <GlassCardDescription>Bank cycle marker</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="pt-0">
              <p className="text-2xl font-semibold tabular-nums text-n-purple">
                {bankMeta.cycle ? Number(bankMeta.cycle).toLocaleString() : '—'}
              </p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-sm">Tracked Memories</GlassCardTitle>
              <GlassCardDescription>Total entries in heat.jsonl</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="pt-0">
              <p className="text-2xl font-semibold tabular-nums text-n-text">
                {heatEntries.length.toLocaleString()}
              </p>
            </GlassCardContent>
          </GlassCard>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <GlassCard hover={false}>
          <GlassCardHeader className="pb-3">
            <GlassCardTitle>Top Heat Memories</GlassCardTitle>
            <GlassCardDescription>
              Ranked by importance x reference count from <code className="text-n-cyan">agents/memory/heat.jsonl</code>.
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="pt-0">
            {ranked.length === 0 ? (
              <p className="text-sm text-n-text-muted py-6">
                No memory heat data found. Make sure{' '}
                <code className="text-xs bg-n-bg-elevated px-1.5 py-0.5 rounded text-n-cyan">
                  agents/memory/heat.jsonl
                </code>{' '}
                exists and contains entries.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-white/[0.06] bg-n-bg-surface/50">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-n-text-muted">
                    <tr>
                      <th className="px-3 py-2.5 text-left">ID</th>
                      <th className="px-3 py-2.5 text-left">Class</th>
                      <th className="px-3 py-2.5 text-left">Importance</th>
                      <th className="px-3 py-2.5 text-left">Refs</th>
                      <th className="px-3 py-2.5 text-left">Heat Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((entry) => {
                      const heatScore = entry.baseImportance * (1 + entry.referenceCount / 10);
                      const bucket =
                        heatScore >= 1.2 ? 'high' : heatScore >= 0.9 ? 'medium' : 'low';
                      const barWidth = Math.min(100, Math.round(heatScore * 80 + 20));
                      return (
                        <tr
                          key={entry.id}
                          className="border-t border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                        >
                          <td className="px-3 py-2.5 font-mono text-xs">
                            <Link
                              href={`/memory/${encodeURIComponent(entry.id)}`}
                              className="hover:underline text-n-cyan"
                            >
                              {entry.id}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-xs capitalize text-n-text-secondary">{entry.memoryClass}</td>
                          <td className="px-3 py-2.5 tabular-nums text-xs text-n-text-secondary">
                            {entry.baseImportance.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-xs text-n-text-secondary">
                            {entry.referenceCount.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="relative h-2 w-32 rounded-full bg-n-bg-elevated overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    bucket === 'high'
                                      ? 'bg-gradient-to-r from-n-cyan to-n-purple'
                                      : bucket === 'medium'
                                        ? 'bg-n-purple/60'
                                        : 'bg-n-text-muted/40'
                                  }`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <span className="text-[11px] tabular-nums text-n-text-muted">
                                {heatScore.toFixed(2)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      </FadeIn>
    </div>
  );
}
