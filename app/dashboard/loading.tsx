function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-200/70 ${className}`}
    />
  );
}

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#f7f8fc]">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="space-y-10">
          <div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-10 w-72" />
            <Skeleton className="mt-3 h-5 w-96 max-w-full" />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <div className="flex gap-4">
              <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />

              <div className="flex-1">
                <Skeleton className="h-6 w-64 max-w-full" />
                <Skeleton className="mt-3 h-4 w-80 max-w-full" />
                <Skeleton className="mt-7 h-2 w-full" />
                <Skeleton className="mt-7 h-10 w-28" />
              </div>
            </div>
          </div>

          <div>
            <Skeleton className="h-4 w-28" />

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
            </div>
          </div>

          <Skeleton className="h-40 rounded-2xl" />

          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}