export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-bg-tertiary ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex gap-4 px-4 py-3 border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="w-full h-[400px] bg-bg-secondary rounded border border-border flex items-center justify-center">
      <div className="text-text-muted text-sm font-mono">Loading chart…</div>
    </div>
  );
}
