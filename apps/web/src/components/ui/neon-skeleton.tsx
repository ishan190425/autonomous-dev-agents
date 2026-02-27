import { cn } from '@/lib/utils';

export function NeonSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('skeleton-shimmer', className)}
      {...props}
    />
  );
}
