type LoadingSkeletonProps = {
  className?: string;
};

export function LoadingSkeleton({
  className = "",
}: LoadingSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`}
    />
  );
}

export function AuthLoadingSkeleton() {
  return (
    <div className="w-full max-w-md rounded-[2rem] border border-gray-200/80 bg-white p-8 shadow-sm">
      <LoadingSkeleton className="h-4 w-24" />

      <LoadingSkeleton className="mt-4 h-9 w-64" />

      <LoadingSkeleton className="mt-3 h-4 w-full" />
      <LoadingSkeleton className="mt-2 h-4 w-4/5" />

      <div className="mt-8 space-y-5">
        <LoadingSkeleton className="h-12 w-full" />
        <LoadingSkeleton className="h-12 w-full" />
        <LoadingSkeleton className="h-12 w-full" />
      </div>

      <LoadingSkeleton className="mt-6 h-12 w-full" />
    </div>
  );
}