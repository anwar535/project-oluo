import { Skeleton } from "@/components/ui/skeleton";

export function UnitGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="جاري تحميل الوحدات" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between"><Skeleton className="h-9 w-20" /><Skeleton className="h-6 w-16 rounded-full" /></div>
          <div className="mt-5 grid grid-cols-3 gap-2">{Array.from({ length: 3 }, (_, stat) => <Skeleton key={stat} className="h-20" />)}</div>
          <Skeleton className="mt-5 h-4 w-16" /><Skeleton className="mt-2 h-8 w-32" /><Skeleton className="mt-4 h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
