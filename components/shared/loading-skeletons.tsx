import React from "react";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-muted/60 ${className || ""}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-lg border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-[250px] w-full" />
        </div>
        <div className="col-span-3 rounded-lg border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LeadTableSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="border-b border-border p-4 flex justify-between">
        <Skeleton className="h-9 w-[250px]" />
        <Skeleton className="h-9 w-[120px]" />
      </div>
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-96" />
            </div>
            <div className="flex items-center gap-6">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[95%]" />
        </div>
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 rounded border border-border/40 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-24" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
