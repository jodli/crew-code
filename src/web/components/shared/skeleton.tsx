export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-bg-active ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-4 w-64" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}

export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-3">
      <div className="flex items-end justify-between mb-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      {Array.from({ length: cards }, (_, n) => `skeleton-${n}`).map((key) => (
        <CardSkeleton key={key} />
      ))}
    </div>
  );
}
