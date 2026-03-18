'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Workout } from '@/lib/types';
import WorkoutCard from './WorkoutCard';

const DayCell = ({
  date,
  workouts,
  onWorkoutClick,
  onToggleSkip
}: {
  date: Date;
  workouts: Workout[];
  onWorkoutClick: (w: Workout) => void;
  onToggleSkip: (id: string) => void;
}) => {
  const dateStr = date.toISOString();
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
    data: { date },
  });

  const isToday = isSameDay(date, new Date());

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[80px] lg:min-h-[100px] p-1.5 transition-colors",
        isOver ? "bg-zinc-800/50" : "bg-transparent",
        isToday ? "bg-zinc-800/20" : ""
      )}
    >
      <div className="mb-1.5 flex items-baseline justify-center gap-1.5">
        <span className={cn(
          "text-xs font-medium uppercase tracking-wide",
          isToday ? "text-white" : "text-zinc-500"
        )}>
          {format(date, 'EEE')}
        </span>
        <span className={cn(
          "text-sm font-bold",
          isToday ? "text-cyan-400" : "text-zinc-400"
        )}>
          {format(date, 'd')}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {workouts.map((w) => (
          <WorkoutCard
            key={w.id}
            workout={w}
            onClick={() => onWorkoutClick(w)}
            onToggleSkip={(e) => {
              e.stopPropagation();
              onToggleSkip(w.id);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default DayCell;
