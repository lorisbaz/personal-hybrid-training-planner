'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  startOfWeek,
  format,
  isSameDay,
  endOfWeek,
  eachDayOfInterval
} from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Workout } from '@/lib/types';
import Header from '@/components/Header';
import DayCell from '@/components/DayCell';
import WeeklyStats from '@/components/WeeklyStats';
import WorkoutCard from '@/components/WorkoutCard';
import WorkoutDetailsModal from '@/components/WorkoutDetailsModal';
import LandingPage from '@/components/LandingPage';

function WorkoutPlanner({ onOpenProfile }: { onOpenProfile: () => void }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showAllFuture, setShowAllFuture] = useState(false);

  const saveWorkouts = async (newWorkouts: Workout[]) => {
    setWorkouts(newWorkouts);
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorkouts),
      });
      if (res.ok) {
        const savedWorkouts = await res.json();
        if (Array.isArray(savedWorkouts)) {
          const parsed = savedWorkouts.map((w: any) => ({ ...w, date: new Date(w.date) }));
          setWorkouts(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to save workouts:', error);
    }
  };

  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        const res = await fetch('/api/workouts');
        if (!res.ok) throw new Error(`Failed to fetch workouts: ${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid data format received from API');
        const parsed = data.map((w: any) => ({ ...w, date: new Date(w.date) }));
        setWorkouts(parsed);
      } catch (error) {
        console.error('Failed to fetch workouts:', error);
      } finally {
        setIsMounted(true);
      }
    };
    fetchWorkouts();
  }, []);

  const { pastWeeks, currentWeek, futureWeeks } = useMemo(() => {
    if (!workouts.length) return { pastWeeks: [], currentWeek: null, futureWeeks: [] };

    const weekStarts = Array.from(new Set(workouts.map(w =>
      startOfWeek(w.date, { weekStartsOn: 1 }).toISOString()
    )))
    .map(d => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());

    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

    const past = weekStarts.filter(d => d < currentWeekStart).reverse();
    const current = weekStarts.find(d => isSameDay(d, currentWeekStart)) || currentWeekStart;
    const future = weekStarts.filter(d => d > currentWeekStart);

    return { pastWeeks: past, currentWeek: current, futureWeeks: future };
  }, [workouts]);

  const propagateWorkoutUpdate = (currentWorkouts: Workout[], sourceWorkout: Workout): Workout[] => {
    if (sourceWorkout.type !== 'STRENGTH' || !sourceWorkout.exercises) return currentWorkouts;
    return currentWorkouts.map(w => {
      if (
        w.id !== sourceWorkout.id &&
        w.type === 'STRENGTH' &&
        w.title === sourceWorkout.title &&
        w.date > sourceWorkout.date &&
        !w.completed
      ) {
        return {
          ...w,
          exercises: sourceWorkout.exercises!.map(ex => ({
            ...ex,
            sets: ex.sets.map(s => ({ ...s })),
            volume: ex.volume
          }))
        };
      }
      return w;
    });
  };

  const handleToggleComplete = (workoutId: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;
    const updatedWorkout = { ...workout, completed: !workout.completed };
    let updatedWorkouts = workouts.map(w => w.id === workoutId ? updatedWorkout : w);
    if (updatedWorkout.completed) {
      updatedWorkouts = propagateWorkoutUpdate(updatedWorkouts, updatedWorkout);
    }
    saveWorkouts(updatedWorkouts);
    setSelectedWorkout(prev =>
      prev && prev.id === workoutId ? { ...prev, completed: !prev.completed } : prev
    );
  };

  const handleToggleSkip = (workoutId: string) => {
    const updatedWorkouts = workouts.map(w => {
      if (w.id === workoutId) {
        return { ...w, skipped: !w.skipped, completed: !w.skipped ? false : w.completed };
      }
      return w;
    });
    saveWorkouts(updatedWorkouts);
    if (selectedWorkout && selectedWorkout.id === workoutId) {
      setSelectedWorkout(null);
    }
  };

  const handleWorkoutUpdate = (updatedWorkout: Workout) => {
    let updatedWorkouts = workouts.map(w => w.id === updatedWorkout.id ? updatedWorkout : w);
    if (updatedWorkout.completed) {
      updatedWorkouts = propagateWorkoutUpdate(updatedWorkouts, updatedWorkout);
    }
    saveWorkouts(updatedWorkouts);
    setSelectedWorkout(updatedWorkout);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id) {
      const newDate = new Date(over.id as string);
      const updatedWorkouts = workouts.map((w) =>
        w.id === active.id ? { ...w, date: newDate } : w
      );
      saveWorkouts(updatedWorkouts);
    }
    setActiveId(null);
  };

  const activeWorkout = useMemo(
    () => workouts.find((w) => w.id === activeId),
    [activeId, workouts]
  );

  const renderWeekRow = (weekStart: Date, isCurrent: boolean = false) => {
    const days = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 1 })
    });
    const weekWorkouts = workouts.filter(w =>
      w.date >= weekStart && w.date <= endOfWeek(weekStart, { weekStartsOn: 1 })
    );

    return (
      <div key={weekStart.toISOString()} className={cn(
        "border rounded-xl overflow-hidden shadow-2xl transition-all",
        isCurrent
          ? "bg-zinc-800/60 border-zinc-500/40 ring-1 ring-zinc-400/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]"
          : "bg-zinc-900 border-zinc-800"
      )}>
        <div className={cn(
          "px-4 py-2 border-b flex justify-between items-center",
          isCurrent ? "bg-zinc-700/30 border-zinc-600/40" : "bg-zinc-950/50 border-zinc-800"
        )}>
          <span className={cn(
            "text-[13px] font-bold uppercase tracking-widest",
            isCurrent ? "text-zinc-100" : "text-zinc-500"
          )}>
            {isCurrent ? "Current Week" : `Week of ${format(weekStart, 'MMM d')}`}
          </span>
        </div>

        <div className={cn(
          "grid grid-cols-1 lg:grid-cols-8 divide-y lg:divide-y-0 lg:divide-x",
          isCurrent ? "divide-zinc-700/40" : "divide-zinc-800"
        )}>
          {days.map((day) => (
            <DayCell
              key={day.toISOString()}
              date={day}
              workouts={workouts.filter(w => isSameDay(w.date, day))}
              onWorkoutClick={(w) => setSelectedWorkout(w)}
              onToggleSkip={handleToggleSkip}
            />
          ))}
          <WeeklyStats workouts={weekWorkouts} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-cyan-500/30">
      <Header isLoaded={isMounted} onOpenProfile={onOpenProfile} />

      <main className={cn("max-w-[1600px] mx-auto p-6", isMounted && "flex flex-col gap-4")}>
        {!isMounted ? null : (
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {currentWeek && (
              <div>{renderWeekRow(currentWeek, true)}</div>
            )}

            {futureWeeks.length > 0 && (
              <div className="border-b border-zinc-800 pb-8">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  Next
                  <span className="text-sm font-normal text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full border border-zinc-800">
                    {futureWeeks.length} weeks
                  </span>
                </h3>
                <div className="flex flex-col gap-4">
                  {(showAllFuture ? futureWeeks : futureWeeks.slice(0, 2)).map(week => renderWeekRow(week, false))}
                </div>
                {futureWeeks.length > 2 && (
                  <button
                    onClick={() => setShowAllFuture(!showAllFuture)}
                    className="w-full py-4 mt-4 flex items-center justify-center gap-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-lg transition-all border border-transparent hover:border-zinc-800"
                  >
                    {showAllFuture ? <><ChevronUp size={16} /> Show Less</> : <><ChevronDown size={16} /> Show {futureWeeks.length - 2} More Weeks</>}
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-4 opacity-60 hover:opacity-100 transition-opacity duration-500">
              <h3 className="text-2xl font-bold text-zinc-500 mt-4 mb-2">Previous</h3>
              {pastWeeks.map(week => renderWeekRow(week, false))}
            </div>

            <DragOverlay>
              {activeWorkout ? <WorkoutCard workout={activeWorkout} isOverlay /> : null}
            </DragOverlay>

            {selectedWorkout && (
              <WorkoutDetailsModal
                workout={selectedWorkout}
                onClose={() => setSelectedWorkout(null)}
                onToggleComplete={handleToggleComplete}
                onUpdate={handleWorkoutUpdate}
                onLocalUpdate={(updatedWorkout) => {
                  setWorkouts(prev => prev.map(w => w.id === updatedWorkout.id ? updatedWorkout : w));
                }}
              />
            )}
          </DndContext>
        )}
      </main>
    </div>
  );
}

export default function App() {
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setHasProfile(localStorage.getItem('userProfile') !== null);
  }, []);

  if (hasProfile === null) return null;

  if (!hasProfile || isEditing) {
    return (
      <LandingPage
        onComplete={() => { setHasProfile(true); setIsEditing(false); }}
        onCancel={isEditing ? () => setIsEditing(false) : undefined}
      />
    );
  }
  return <WorkoutPlanner onOpenProfile={() => setIsEditing(true)} />;
}
