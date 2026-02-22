/**
 * Agent Status Grid — Per C1112 "Agent Status Card" component
 * Shows each role's last action and current state
 */
const agentStatus = [
  { id: 'ceo', emoji: '👔', name: 'CEO', lastAction: 'GO/NO-GO RATIFICATION PREP', status: 'idle' },
  { id: 'growth', emoji: '🚀', name: 'Growth', lastAction: 'DEV LOG TEMPLATE', status: 'idle' },
  { id: 'research', emoji: '🔬', name: 'Research', lastAction: 'SECTION 6 INTEGRATION', status: 'idle' },
  { id: 'frontier', emoji: '🌌', name: 'Frontier', lastAction: 'OBSERVABILITY ADR', status: 'idle' },
  { id: 'product', emoji: '📦', name: 'Product', lastAction: 'SPRINT 4 PRIORITIZATION', status: 'idle' },
  { id: 'scrum', emoji: '📋', name: 'Scrum', lastAction: 'RETRO C1108-1117', status: 'idle' },
  { id: 'qa', emoji: '🔍', name: 'QA', lastAction: 'TEST READINESS AUDIT', status: 'idle' },
  { id: 'engineering', emoji: '⚙️', name: 'Engineering', lastAction: 'In progress...', status: 'active' },
  { id: 'ops', emoji: '🛡️', name: 'Ops', lastAction: 'CI ENHANCEMENT SPEC', status: 'next' },
  { id: 'design', emoji: '🎨', name: 'Design', lastAction: 'DESIGN SYSTEM SPEC', status: 'idle' },
];

export function AgentStatusGrid() {
  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h2 className="text-heading-3 mb-4">Agent Team Status</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {agentStatus.map((agent) => (
          <div
            key={agent.id}
            className={`p-3 rounded-lg border ${
              agent.status === 'active'
                ? 'border-ada-primary bg-ada-primary-light dark:bg-ada-primary/10'
                : agent.status === 'next'
                ? 'border-ada-active bg-amber-50 dark:bg-amber-900/10'
                : 'border-transparent bg-bg-secondary'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{agent.emoji}</span>
              <span className="text-sm font-medium">{agent.name}</span>
              {agent.status === 'active' && (
                <span className="w-2 h-2 rounded-full bg-ada-success animate-pulse ml-auto"></span>
              )}
            </div>
            <p className="text-xs text-text-muted truncate" title={agent.lastAction}>
              {agent.lastAction}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
