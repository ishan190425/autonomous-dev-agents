import { CycleStats } from '@/components/dashboard/cycle-stats';
import { RotationTimeline } from '@/components/dashboard/rotation-timeline';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { AgentStatusGrid } from '@/components/dashboard/agent-status-grid';

/**
 * Dashboard Overview — Real-time agent team status
 * Shows: Current cycle, rotation state, recent activity, team health
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-heading-1">Dashboard</h1>
        <p className="text-body text-text-secondary">
          Real-time overview of your autonomous dev team
        </p>
      </div>

      {/* Stats Row */}
      <CycleStats />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rotation Timeline */}
          <RotationTimeline />
          
          {/* Agent Status Grid */}
          <AgentStatusGrid />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Activity Feed */}
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
