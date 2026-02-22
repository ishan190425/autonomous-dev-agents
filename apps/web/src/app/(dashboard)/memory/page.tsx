/**
 * Memory Page — Memory bank viewer with heat scoring
 * Sprint 3: Memory visualization, search, and heat map
 */
export default function MemoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1">Memory Bank</h1>
        <p className="text-body text-text-secondary">
          Shared team memory with heat scoring visualization
        </p>
      </div>

      {/* Placeholder: MemoryViewer component */}
      <div className="bg-bg-primary rounded-lg border p-8 text-center text-text-muted">
        <p className="text-6xl mb-4">🧠</p>
        <p className="text-heading-3">Memory Viewer</p>
        <p className="text-body mt-2">
          Sprint 3: Memory visualization with heat-weighted search
        </p>
      </div>
    </div>
  );
}
