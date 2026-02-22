/**
 * Cycle Stats Component — Key metrics cards
 * Per C1112: Stats row with cycle count, consecutive, tests, coverage
 */
export function CycleStats() {
  const stats = [
    { label: 'Total Cycles', value: '1,120', icon: '🔄', color: 'text-ada-primary' },
    { label: 'Consecutive', value: '700', icon: '🏆', color: 'text-ada-success' },
    { label: 'Tests Passing', value: '2,358', icon: '✅', color: 'text-status-success' },
    { label: 'Coverage', value: '89%', icon: '📊', color: 'text-role-research' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-bg-primary rounded-lg border p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">{stat.icon}</span>
            <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
          </div>
          <p className="text-sm text-text-muted mt-2">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
