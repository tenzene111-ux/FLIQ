import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded-lg", className)} aria-hidden="true" />;
}

export function VideoGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-[9/16] rounded-none" />
      ))}
    </div>
  );
}

export function FeedItemSkeleton() {
  return (
    <div className="h-full w-full bg-surface flex items-center justify-center">
      <Skeleton className="w-full h-full rounded-none" />
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-11 h-11 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}
