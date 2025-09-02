// Dashboard route skeleton used by app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header skeleton */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-56 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
          <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
        </div>
      </header>

      {/* Metrics grid skeleton */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </section>

      {/* Chart area skeleton */}
      <section className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="h-[200px] sm:h-[300px] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      </section>
    </div>
  );
}