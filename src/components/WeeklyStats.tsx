'use client';

import React from 'react';
import type { Workout } from '@/lib/types';

const WeeklyStats = ({ workouts }: { workouts: Workout[] }) => {
  const completedWorkouts = workouts.filter(w => w.completed && !w.skipped);

  const runDuration = completedWorkouts.filter(w => w.type === 'RUNNING').reduce((acc, curr) => acc + curr.duration, 0);
  const walkDuration = completedWorkouts.filter(w => w.type === 'WALKING').reduce((acc, curr) => acc + curr.duration, 0);
  const strengthDuration = completedWorkouts.filter(w => w.type === 'STRENGTH').reduce((acc, curr) => acc + curr.duration, 0);
  const totalDuration = runDuration + walkDuration + strengthDuration;

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  return (
    <div className="min-h-[80px] lg:min-h-[100px] p-2 bg-zinc-900/50 flex flex-col justify-center gap-1">
      <h3 className="text-zinc-500 text-[12px] uppercase tracking-wider font-bold mb-0.5">Weekly Load</h3>

      <div className="flex items-center gap-1.5 text-[11px]">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
        <span className="text-zinc-400 flex-1">Runs</span>
        <span className="text-white font-mono">{formatDuration(runDuration)}</span>
      </div>

      <div className="flex items-center gap-1.5 text-[11px]">
        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
        <span className="text-zinc-400 flex-1">Lifts</span>
        <span className="text-white font-mono">{formatDuration(strengthDuration)}</span>
      </div>

      <div className="flex items-center gap-1.5 text-[11px]">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
        <span className="text-zinc-400 flex-1">Walks</span>
        <span className="text-white font-mono">{formatDuration(walkDuration)}</span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-zinc-400 text-[11px]">Total</span>
        <span className="text-white font-mono text-xs font-bold">{formatDuration(totalDuration)}</span>
      </div>
    </div>
  );
};

export default WeeklyStats;
