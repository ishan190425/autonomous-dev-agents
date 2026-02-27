import { NeonSkeleton } from '@/components/ui/neon-skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <NeonSkeleton className="h-3 w-24" />
        <NeonSkeleton className="h-7 w-48" />
        <NeonSkeleton className="h-4 w-64" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <NeonSkeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <NeonSkeleton className="h-40 rounded-xl" />
          <NeonSkeleton className="h-64 rounded-xl" />
        </div>
        <div className="xl:col-span-2">
          <NeonSkeleton className="h-[420px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
