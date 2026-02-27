import { NeonSkeleton } from '@/components/ui/neon-skeleton';

export default function MemoryLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <NeonSkeleton className="h-7 w-40" />
        <NeonSkeleton className="h-4 w-72" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <NeonSkeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Table */}
      <NeonSkeleton className="h-[500px] rounded-xl" />
    </div>
  );
}
