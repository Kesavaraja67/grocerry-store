import React from "react";

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-border/80 rounded" />
        <div className="h-4 w-72 bg-border/40 rounded" />
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 bg-surface border border-border rounded-lg space-y-2 shadow-xs"
          >
            <div className="h-3.5 w-24 bg-border/60 rounded" />
            <div className="h-7 w-32 bg-border/80 rounded" />
            <div className="h-3 w-20 bg-border/40 rounded" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-surface border border-border rounded-lg p-4 space-y-4 shadow-xs">
        <div className="flex justify-between items-center">
          <div className="h-9 w-64 bg-border/60 rounded-md" />
          <div className="h-9 w-24 bg-border/60 rounded-md" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 w-full bg-border/30 rounded flex items-center justify-between px-4"
            >
              <div className="h-4 w-1/4 bg-border/60 rounded" />
              <div className="h-4 w-1/6 bg-border/40 rounded" />
              <div className="h-4 w-1/8 bg-border/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
