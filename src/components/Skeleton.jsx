export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {/* Month navigator */}
      <div className="flex items-center justify-between mb-5">
        <div className="w-9 h-9 rounded-xl bg-gray-200 animate-pulse" />
        <div className="text-center space-y-1.5">
          <div className="h-6 w-28 bg-gray-200 rounded-lg animate-pulse mx-auto" />
          <div className="h-4 w-10 bg-gray-100 rounded animate-pulse mx-auto" />
        </div>
        <div className="w-9 h-9 rounded-xl bg-gray-200 animate-pulse" />
      </div>

      {/* Total card */}
      <div className="bg-gray-200 animate-pulse rounded-2xl h-24 mb-5" />

      {/* Category rows */}
      <div className="space-y-2.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse" />
              <div className={`h-4 bg-gray-200 rounded animate-pulse ${i % 2 === 0 ? 'w-20' : 'w-28'}`} />
            </div>
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function HistorySkeleton() {
  return (
    <div className="p-4">
      <div className="h-6 w-24 bg-gray-200 rounded-lg animate-pulse mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="px-4 py-2 space-y-2">
              {[1, 2, 3].map(j => (
                <div key={j} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200 animate-pulse" />
                    <div className={`h-3.5 bg-gray-200 rounded animate-pulse ${j === 2 ? 'w-16' : 'w-24'}`} />
                  </div>
                  <div className="h-3.5 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartsSkeleton() {
  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto">
      <div className="h-6 w-24 bg-gray-200 rounded-lg animate-pulse" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-3 border border-gray-100 space-y-2">
            <div className="h-3 w-14 bg-gray-200 rounded animate-pulse mx-auto" />
            <div className="h-5 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      </div>
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-56 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
