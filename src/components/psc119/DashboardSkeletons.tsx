type CountProps = {
  count?: number
}

export function SummaryCardsSkeleton({ count = 4 }: CountProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`summary-skeleton-${index}`}
          className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm"
        >
          <div className="mx-auto mb-4 h-14 w-14 animate-pulse rounded-full bg-gray-200" />
          <div className="mx-auto mb-3 h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mx-auto mb-4 h-10 w-24 animate-pulse rounded bg-gray-200" />
          <div className="mx-auto mb-4 h-8 w-20 animate-pulse rounded-full bg-gray-200" />
          <div className="mx-auto h-3 w-28 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

export function StatCardsSkeleton({ count = 3 }: CountProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:h-full">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`stat-skeleton-${index}`}
          className="flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm"
        >
          <div className="mx-auto mb-4 h-4 w-36 animate-pulse rounded bg-gray-200" />
          <div className="mx-auto h-10 w-24 animate-pulse rounded bg-gray-200" />
          <div className="mx-auto mt-4 h-3 w-28 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

export function ChartCardsSkeleton({ count = 3 }: CountProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`chart-skeleton-${index}`}
          className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200" />
          </div>
          <div className="h-[280px] animate-pulse rounded-xl bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

export function RealtimeTableSkeleton({ count = 6 }: CountProps) {
  return (
    <div className="rounded-2xl border border-teal-100 bg-white p-3">
      <div className="mb-3 rounded-xl bg-gray-50 px-4 py-3">
        <div className="h-6 w-72 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={`table-skeleton-${index}`}
            className="grid grid-cols-7 gap-3 rounded-xl border border-gray-100 px-4 py-4"
          >
            {Array.from({ length: 7 }).map((__, cellIndex) => (
              <div
                key={`cell-skeleton-${index}-${cellIndex}`}
                className="h-4 animate-pulse rounded bg-gray-100"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
