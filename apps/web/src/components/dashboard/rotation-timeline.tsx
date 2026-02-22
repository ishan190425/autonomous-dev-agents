/**
 * Rotation Timeline Component — Visual rotation state
 * Per C1112: Show current position in rotation with role colors
 */
const roles = [
  { id: 'ceo', emoji: '👔', color: 'bg-role-ceo' },
  { id: 'growth', emoji: '🚀', color: 'bg-role-growth' },
  { id: 'research', emoji: '🔬', color: 'bg-role-research' },
  { id: 'frontier', emoji: '🌌', color: 'bg-role-frontier' },
  { id: 'product', emoji: '📦', color: 'bg-role-product' },
  { id: 'scrum', emoji: '📋', color: 'bg-role-scrum' },
  { id: 'qa', emoji: '🔍', color: 'bg-role-qa' },
  { id: 'engineering', emoji: '⚙️', color: 'bg-role-engineering' },
  { id: 'ops', emoji: '🛡️', color: 'bg-role-ops' },
  { id: 'design', emoji: '🎨', color: 'bg-role-design' },
];

export function RotationTimeline() {
  const currentIndex = 7; // Engineering is current (0-indexed)

  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h2 className="text-heading-3 mb-4">Rotation Timeline</h2>
      
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
        {roles.map((role, index) => (
          <div
            key={role.id}
            className={`flex flex-col items-center gap-2 p-2 rounded-lg min-w-[60px] ${
              index === currentIndex
                ? 'ring-2 ring-ada-primary bg-ada-primary-light dark:bg-ada-primary/20'
                : index < currentIndex
                ? 'opacity-50'
                : ''
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full ${role.color} flex items-center justify-center text-white text-lg`}
            >
              {role.emoji}
            </div>
            <span className="text-xs font-medium capitalize">{role.id}</span>
            {index === currentIndex && (
              <span className="text-xs text-ada-primary font-medium">Current</span>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-text-muted mt-4">
        Cycle 1120 • ⚙️ Engineering is building
      </p>
    </div>
  );
}
