import { Skeleton } from "@/components/ui/skeleton";

export default function VerificationLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Score card */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="mb-2 h-3 w-40" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="mt-1 h-3 w-28" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="ml-auto h-3 w-28" />
            <Skeleton className="ml-auto h-3 w-24" />
          </div>
        </div>
      </div>

      {/* Per-role breakdown */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-3 w-32" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-2 w-16 rounded-full" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="ml-auto h-4 w-10" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border p-4">
        <Skeleton className="mb-3 h-3 w-24" />
        <Skeleton className="h-[240px] w-full rounded" />
      </div>

      {/* Recent sessions */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-3 w-40" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="ml-auto h-4 w-12" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>

      {/* Phase gate */}
      <div className="rounded-lg border border-border p-4">
        <Skeleton className="mb-3 h-3 w-36" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-52" />
              <Skeleton className="ml-auto h-3 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-4 h-9 w-full rounded-md" />
      </div>
    </div>
  );
}
