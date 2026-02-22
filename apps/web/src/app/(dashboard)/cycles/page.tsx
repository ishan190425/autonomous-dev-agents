/**
 * Cycles Page — Dispatch history and cycle details
 * Sprint 3: Full cycle history with search, filters, and detail views
 */
export default function CyclesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1">Cycles</h1>
        <p className="text-body text-text-secondary">
          View dispatch history and cycle details
        </p>
      </div>

      {/* Placeholder: CycleTable component */}
      <div className="bg-bg-primary rounded-lg border p-8 text-center text-text-muted">
        <p className="text-6xl mb-4">📋</p>
        <p className="text-heading-3">Cycle History</p>
        <p className="text-body mt-2">
          Sprint 3 Day 3: Full cycle table with filtering and search
        </p>
      </div>
    </div>
  );
}
