/**
 * Activity Feed Component — Recent cycle actions
 * Per C1112: Scrollable feed of recent agent activity
 */
const recentActivity = [
  {
    cycle: 1119,
    role: 'qa',
    emoji: '🔍',
    action: 'PRE-SPRINT 3 TEST READINESS AUDIT',
    time: '2 hours ago',
  },
  {
    cycle: 1118,
    role: 'scrum',
    emoji: '📋',
    action: 'RETRO C1108-1117 — L637-L640 added',
    time: '3 hours ago',
  },
  {
    cycle: 1117,
    role: 'product',
    emoji: '📦',
    action: 'SPRINT 4 FEATURE PRIORITIZATION',
    time: '4 hours ago',
  },
  {
    cycle: 1116,
    role: 'frontier',
    emoji: '🌌',
    action: 'OBSERVABILITY ARCHITECTURE ADR',
    time: '5 hours ago',
  },
  {
    cycle: 1115,
    role: 'research',
    emoji: '🔬',
    action: 'SECTION 6 INTEGRATION',
    time: '6 hours ago',
  },
];

export function ActivityFeed() {
  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h2 className="text-heading-3 mb-4">Recent Activity</h2>
      
      <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
        {recentActivity.map((activity) => (
          <div
            key={activity.cycle}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <span className="text-xl">{activity.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{activity.action}</p>
              <p className="text-xs text-text-muted">
                C{activity.cycle} • {activity.role} • {activity.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-4 py-2 text-sm text-ada-primary hover:underline">
        View all activity →
      </button>
    </div>
  );
}
