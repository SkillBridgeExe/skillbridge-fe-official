import { Skeleton } from "@/components/ui/skeleton";

export function MentorListSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2" aria-label="Loading mentors">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="min-h-[320px] rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="mt-7 h-4 w-1/3" />
          <div className="mt-5 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className="mt-6 flex gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-11 w-32 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
