import { Card, CardContent } from '@/components/ui/card';

interface CycleStatsProps {
  totalCycles: number;
  completedCycles: number;
  failedCycles: number;
  isRunning: boolean;
  /** Cycle count from the repo's rotation.json (ground truth) */
  repoCycleCount: number;
}

export function CycleStats({
  totalCycles,
  completedCycles,
  failedCycles,
  isRunning,
  repoCycleCount,
}: CycleStatsProps) {
  const successRate =
    totalCycles > 0 ? Math.round((completedCycles / totalCycles) * 100) : 0;

  const stats = [
    {
      label: 'Repo Cycles',
      value: repoCycleCount.toLocaleString(),
      icon: '🔄',
      color: 'text-ada-primary',
    },
    {
      label: 'Dispatched',
      value: totalCycles.toLocaleString(),
      icon: '📡',
      color: 'text-role-frontier',
    },
    {
      label: 'Completed',
      value: completedCycles.toLocaleString(),
      icon: '✅',
      color: 'text-status-success',
    },
    {
      label: 'Success Rate',
      value: totalCycles > 0 ? `${successRate}%` : '—',
      icon: '📊',
      color:
        successRate >= 80
          ? 'text-ada-success'
          : successRate >= 50
            ? 'text-amber-500'
            : totalCycles > 0
              ? 'text-red-500'
              : 'text-text-muted',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className="relative overflow-hidden border-none bg-gradient-to-br from-bg-primary to-bg-secondary/60 shadow-sm"
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary text-xl">
                {stat.icon}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-text-muted mb-1">
                  {stat.label}
                </p>
                <p className={`text-2xl font-semibold tabular-nums ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {isRunning && (
        <Card className="sm:col-span-2 xl:col-span-4 border-dashed border-ada-primary/40 bg-ada-primary-light/40">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-ada-primary">
            <span className="w-2 h-2 rounded-full bg-ada-primary animate-pulse" />
            Cycle in progress...
          </CardContent>
        </Card>
      )}
    </div>
  );
}
