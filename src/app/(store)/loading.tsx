import React from "react";

export default function StoreLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Category Strip Skeleton */}
      <div className="bg-surface border-y border-border py-2.5 px-4 overflow-hidden">
        <div className="flex gap-2 max-w-7xl mx-auto">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-24 bg-border/60 rounded-full shrink-0"
            />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Banner Skeleton */}
        <div className="h-36 sm:h-48 w-full bg-border/40 rounded-xl" />

        {/* Section Header Skeleton */}
        <div className="space-y-2">
          <div className="h-6 w-48 bg-border/70 rounded" />
          <div className="h-4 w-64 bg-border/40 rounded" />
        </div>

        {/* Product Cards Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-lg p-3 space-y-3 shadow-xs"
            >
              <div className="aspect-square w-full bg-border/40 rounded-md" />
              <div className="space-y-1.5">
                <div className="h-4 w-3/4 bg-border/60 rounded" />
                <div className="h-3 w-1/2 bg-border/40 rounded" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="h-5 w-16 bg-border/70 rounded" />
                <div className="h-8 w-16 bg-border/50 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
