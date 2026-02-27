import fs from 'node:fs/promises';
import path from 'node:path';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface HeatEntry {
  id: string;
  memoryClass: string;
  baseImportance: number;
  referenceCount: number;
  lastAccessedAt: number;
  createdAt: number;
}

async function loadHeat(): Promise<HeatEntry[]> {
  // Next.js app dir cwd is apps/web — step up to repo root then into agents/memory
  const heatPath = path.join(process.cwd(), '..', '..', 'agents', 'memory', 'heat.jsonl');
  try {
    const content = await fs.readFile(heatPath, 'utf8');
    return content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as HeatEntry);
  } catch {
    // In environments without a local memory file, fall back to empty list
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
      <div>
        <h1 className="text-heading-1">Memory Bank</h1>
        <p className="text-body text-text-secondary">
          Shared team memory with heat scoring, sourced directly from agents/memory.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Last Updated</CardTitle>
            <CardDescription>From memory bank header</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm">{bankMeta.lastUpdated || 'Unknown'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cycle</CardTitle>
            <CardDescription>Bank cycle marker</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold tabular-nums">
              {bankMeta.cycle ? Number(bankMeta.cycle).toLocaleString() : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tracked Memories</CardTitle>
            <CardDescription>Total entries in heat.jsonl</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold tabular-nums">
              {heatEntries.length.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Top Heat Memories</CardTitle>
          <CardDescription>
            Ranked by importance × reference count from <code>agents/memory/heat.jsonl</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {ranked.length === 0 ? (
            <p className="text-sm text-text-muted py-6">
              No memory heat data found. Make sure{' '}
              <code className="text-xs bg-bg-secondary px-1 py-0.5 rounded">
                agents/memory/heat.jsonl
              </code>{' '}
              exists and contains entries.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-bg-primary">
              <table className="min-w-full text-sm">
                <thead className="bg-bg-secondary/60 text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">ID</th>
                    <th className="px-3 py-2 text-left">Class</th>
                    <th className="px-3 py-2 text-left">Importance</th>
                    <th className="px-3 py-2 text-left">Refs</th>
                    <th className="px-3 py-2 text-left">Heat Score</th>
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
                        className="border-t border-bg-secondary/80 hover:bg-bg-secondary/60"
                      >
                        <td className="px-3 py-2 font-mono text-xs">
                          <Link
                            href={`/memory/${encodeURIComponent(entry.id)}`}
                            className="hover:underline text-ada-primary"
                          >
                            {entry.id}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-xs capitalize">{entry.memoryClass}</td>
                        <td className="px-3 py-2 tabular-nums text-xs">
                          {entry.baseImportance.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-xs">
                          {entry.referenceCount.toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="relative h-2 w-32 rounded-full bg-bg-secondary overflow-hidden">
                              <div
                                className={`h-full ${
                                  bucket === 'high'
                                    ? 'bg-ada-primary'
                                    : bucket === 'medium'
                                      ? 'bg-role-product'
                                      : 'bg-text-muted'
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="text-[11px] tabular-nums text-text-muted">
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
        </CardContent>
      </Card>
    </div>
  );
}
