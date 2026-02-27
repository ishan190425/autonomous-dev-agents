import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

interface DispatchEntry {
  id: string;
  status: string;
  triggeredBy: string;
  roleId: string | null;
  action: string | null;
  error: string | null;
  createdAt: Date;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusEmoji(status: string): string {
  switch (status) {
    case 'COMPLETED': return '✅';
    case 'RUNNING': return '⏳';
    case 'FAILED': return '❌';
    case 'PENDING': return '⏸️';
    default: return '❓';
  }
}

export function ActivityFeed({ dispatches }: { dispatches: DispatchEntry[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest cycles, errors, and dispatches from your agent team.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {dispatches.length === 0 ? (
          <p className="text-sm text-text-muted py-8 text-center">
            No cycles run yet. Click &quot;Run Cycle&quot; to start.
          </p>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
            {dispatches.map((d) => (
              <div
                key={d.id}
                className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-bg-secondary/80 transition-colors"
              >
                <div className="mt-0.5">
                  <span className="text-lg">{statusEmoji(d.status)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {d.action || d.error || d.status}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    {d.roleId && (
                      <span className="capitalize">
                        {d.roleId}
                        {' • '}
                      </span>
                    )}
                    {d.triggeredBy} • {timeAgo(d.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2">
        <Link
          href="/cycles"
          className="w-full py-2 text-xs font-medium text-center text-ada-primary hover:text-ada-primary-hover hover:underline"
        >
          View all activity →
        </Link>
      </CardFooter>
    </Card>
  );
}
