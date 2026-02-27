'use client';

import { RefreshCw, Radio, CheckCircle2, BarChart3 } from 'lucide-react';
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { StaggerChildren, StaggerItem } from '@/components/ui/motion-wrapper';

interface CycleStatsProps {
  totalCycles: number;
  completedCycles: number;
  failedCycles: number;
  isRunning: boolean;
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
      value: repoCycleCount,
      icon: RefreshCw,
      glow: 'cyan' as const,
      color: 'text-n-cyan',
      iconBg: 'bg-n-cyan/10 text-n-cyan',
    },
    {
      label: 'Dispatched',
      value: totalCycles,
      icon: Radio,
      glow: 'purple' as const,
      color: 'text-n-purple',
      iconBg: 'bg-n-purple/10 text-n-purple',
    },
    {
      label: 'Completed',
      value: completedCycles,
      icon: CheckCircle2,
      glow: 'none' as const,
      color: 'text-n-status-success',
      iconBg: 'bg-n-status-success/10 text-n-status-success',
    },
    {
      label: 'Success Rate',
      value: successRate,
      icon: BarChart3,
      glow: 'none' as const,
      color:
        successRate >= 80
          ? 'text-n-status-success'
          : successRate >= 50
            ? 'text-n-status-warning'
            : totalCycles > 0
              ? 'text-n-status-error'
              : 'text-n-text-muted',
      iconBg:
        successRate >= 80
          ? 'bg-n-status-success/10 text-n-status-success'
          : successRate >= 50
            ? 'bg-n-status-warning/10 text-n-status-warning'
            : 'bg-white/[0.06] text-n-text-muted',
      format: (n: number) => (totalCycles > 0 ? `${n}%` : '—'),
    },
  ];

  return (
    <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <StaggerItem key={stat.label}>
            <GlassCard glow={stat.glow}>
              <GlassCardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${stat.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-n-text-muted mb-1">
                      {stat.label}
                    </p>
                    <p className={`text-2xl font-semibold tabular-nums ${stat.color}`}>
                      {stat.format ? (
                        totalCycles > 0 ? (
                          <AnimatedNumber
                            value={stat.value}
                            format={stat.format}
                            className={stat.color}
                          />
                        ) : (
                          '—'
                        )
                      ) : (
                        <AnimatedNumber
                          value={stat.value}
                          className={stat.color}
                        />
                      )}
                    </p>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          </StaggerItem>
        );
      })}
      {isRunning && (
        <StaggerItem className="sm:col-span-2 xl:col-span-4">
          <GlassCard glow="cyan">
            <GlassCardContent className="flex items-center gap-3 p-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-n-cyan opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-n-cyan" />
              </span>
              <span className="text-sm text-n-cyan font-medium">
                Cycle in progress...
              </span>
            </GlassCardContent>
          </GlassCard>
        </StaggerItem>
      )}
    </StaggerChildren>
  );
}
