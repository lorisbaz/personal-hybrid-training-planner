'use client';

import React from 'react';

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`bg-zinc-800 rounded animate-pulse ${className ?? ''}`} />
);

const WeekSkeleton = ({ dim = false }: { dim?: boolean }) => (
  <div className={`border rounded-xl overflow-hidden ${dim ? 'border-zinc-800 bg-zinc-900 opacity-50' : 'border-zinc-500/40 bg-zinc-800/60'}`}>
    {/* Week header */}
    <div className="px-4 py-2 border-b border-zinc-700/40 bg-zinc-950/50">
      <SkeletonBlock className="h-3 w-28" />
    </div>
    {/* Day cells */}
    <div className="grid grid-cols-8 divide-x divide-zinc-800">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="p-1.5 min-h-[100px] space-y-2">
          <SkeletonBlock className="h-2 w-6 mx-auto mt-1" />
          {i % 3 === 0 && <SkeletonBlock className="h-14 w-full rounded-lg" />}
          {i % 5 === 0 && <SkeletonBlock className="h-14 w-full rounded-lg" />}
        </div>
      ))}
      {/* Stats column */}
      <div className="p-2 bg-zinc-900/50 min-h-[100px] space-y-2 flex flex-col justify-center">
        <SkeletonBlock className="h-2 w-16" />
        <SkeletonBlock className="h-2 w-12" />
        <SkeletonBlock className="h-2 w-14" />
        <SkeletonBlock className="h-2 w-10" />
      </div>
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div className="max-w-[1600px] mx-auto p-6 flex flex-col gap-4">
    {/* Current week */}
    <WeekSkeleton />

    {/* Future weeks header + 2 rows */}
    <div className="border-b border-zinc-800 pb-8 space-y-4">
      <SkeletonBlock className="h-7 w-24" />
      <WeekSkeleton dim />
      <WeekSkeleton dim />
    </div>

    {/* Previous */}
    <div className="space-y-4 opacity-40">
      <SkeletonBlock className="h-7 w-24" />
      <WeekSkeleton dim />
    </div>
  </div>
);

export default LoadingSkeleton;
