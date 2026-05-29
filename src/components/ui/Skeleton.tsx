interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-surface-container-high rounded-none ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <div className="mb-12">
        <Skeleton className="h-10 w-64 mb-3" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        <div className="md:col-span-8 bg-surface-container border-t-2 border-surface-container-highest p-8 flex gap-8">
          <Skeleton className="w-48 h-48 shrink-0" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-40" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <div className="md:col-span-4 bg-surface-container border-t-2 border-surface-container-highest p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PaymentsSkeleton() {
  return (
    <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <Skeleton className="h-10 w-56 mb-4" />
      <Skeleton className="h-1 w-24 mb-12" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container p-6 flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-6">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnnouncementsSkeleton() {
  return (
    <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <Skeleton className="h-10 w-64 mb-4" />
      <Skeleton className="h-1 w-24 mb-12" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface-container p-6 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <Skeleton className="h-10 w-48 mb-4" />
      <Skeleton className="h-1 w-24 mb-12" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="flex flex-col items-center gap-6">
          <Skeleton className="w-48 h-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
          <Skeleton className="h-14" />
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        </div>
      </div>
    </div>
  );
}
