export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 animate-pulse">
      {/* Dashboard Top Header Skeleton */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-indigo-600/30" />
            <div className="h-6 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end gap-1.5">
              <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-36 rounded bg-slate-100 dark:bg-slate-800/60" />
            </div>
            <div className="h-9 w-20 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-96 rounded bg-slate-100 dark:bg-slate-800/60" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-800 mb-6" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-36 rounded bg-slate-100 dark:bg-slate-800/60" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-48 rounded bg-slate-100 dark:bg-slate-800/60" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="h-6 w-36 rounded bg-slate-200 dark:bg-slate-800 mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800/60" />
              <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800/60" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
