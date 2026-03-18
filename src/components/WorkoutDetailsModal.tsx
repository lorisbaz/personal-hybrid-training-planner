'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Workout } from '@/lib/types';

const WorkoutDetailsModal = ({
  workout,
  onClose,
  onToggleComplete,
  onUpdate,
  onLocalUpdate,
}: {
  workout: Workout;
  onClose: () => void;
  onToggleComplete: (workoutId: string) => void;
  onUpdate: (workout: Workout) => void;
  onLocalUpdate?: (workout: Workout) => void;
}) => {
  const isStrength = workout.type === 'STRENGTH';
  const isSkipped = workout.skipped;

  const [editedWorkout, setEditedWorkout] = useState(workout);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    setEditedWorkout(workout);
  }, [workout]);

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    if (!editedWorkout.exercises) return;

    const newExercises = [...editedWorkout.exercises];
    const newSets = [...newExercises[exerciseIndex].sets];

    newSets[setIndex] = {
      ...newSets[setIndex],
      [field]: value
    } as any;

    const newVolume = newSets.reduce((acc, s) => acc + (Number(s.weight) * Number(s.reps)), 0);

    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      sets: newSets,
      volume: newVolume
    };

    const newWorkout = { ...editedWorkout, exercises: newExercises };
    setEditedWorkout(newWorkout);
    onLocalUpdate?.(newWorkout);
  };

  const formatStepDuration = (duration: any) => {
    if (!duration) return '';
    if (duration.type === 'Time') {
      const [h, m, s] = (duration.value || "00:00:00").split(':').map(Number);
      if (h > 0) return `${h}h ${m}m`;
      if (m > 0 && s > 0) return `${m}m ${s}s`;
      if (m > 0) return `${m} min`;
      return `${s} sec`;
    }
    return duration.value || '';
  };

  const formatStepTarget = (target: any) => {
    if (!target || target.type === 'NoTarget') return null;
    if (target.type === 'Pace') return `@ ${target.value} /km`;
    if (target.type === 'HrmZoneTarget') return `HR Zone ${target.zone}`;
    return target.type;
  };

  const saveChanges = () => {
    if (!editedWorkout.exercises) return;
    const finalExercises = editedWorkout.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({
        weight: Number(s.weight),
        reps: Number(s.reps)
      }))
    }));
    onUpdate({ ...editedWorkout, exercises: finalExercises });
  };

  // Suppress unused warning for showInfo
  void showInfo;

  if (!isStrength) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-900">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "px-2 py-1 rounded text-[10px] font-bold tracking-wider border",
                  editedWorkout.type === 'RUNNING' ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                )}>
                  {editedWorkout.type}
                </span>
                <span className="text-zinc-400 text-sm">{format(new Date(editedWorkout.date), 'EEEE, MMMM do')}</span>
              </div>
              <h2 className="text-2xl font-bold text-white">{editedWorkout.title}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 text-zinc-300">
              <Clock size={16} />
              <span>Duration:</span>
              {isSkipped ? (
                <span className="text-white font-bold">{editedWorkout.duration}</span>
              ) : (
                <input
                  type="number"
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white font-bold w-20 focus:border-cyan-500 focus:outline-none"
                  value={editedWorkout.duration}
                  onChange={(e) => {
                    const newWorkout = { ...editedWorkout, duration: parseInt(e.target.value) || 0 };
                    setEditedWorkout(newWorkout);
                    onLocalUpdate?.(newWorkout);
                  }}
                  onBlur={() => onUpdate(editedWorkout)}
                />
              )}
              <span>minutes</span>
            </div>

            {editedWorkout.runningDetails?.steps ? (
              <div className="mt-6 space-y-4">
                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Workout Structure</div>
                    <div className="text-xs text-zinc-600">{editedWorkout.runningDetails.steps.length} Steps</div>
                  </div>
                  <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {editedWorkout.runningDetails.steps.map((step: any, i: number) => {
                      const dur = formatStepDuration(step.duration);
                      const tgt = formatStepTarget(step.target);
                      return (
                        <div key={i} className="bg-zinc-800/40 p-3 rounded-lg border border-zinc-700/50 flex flex-col gap-1.5 hover:bg-zinc-800/60 transition-colors">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                step.type === 'WarmUp'   ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                step.type === 'CoolDown' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                step.type === 'Recovery' ? "bg-slate-500/10 text-slate-400 border border-slate-500/20" :
                                step.type === 'Rest'     ? "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20" :
                                step.type === 'Run'      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                                "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                              )}>
                                {step.type === 'Run' ? 'Interval' : step.type}
                              </span>
                              <span className="text-zinc-200 text-sm font-bold font-mono">{dur}</span>
                            </div>
                            {tgt && (
                              <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                {tgt}
                              </span>
                            )}
                          </div>
                          {step.note && (
                            <p className="text-xs text-zinc-400 leading-relaxed pl-1 border-l-2 border-zinc-700">
                              {step.note}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : editedWorkout.runningDetails && (
              <div className="mt-6 space-y-4">
                <div className="bg-zinc-800/50 p-3 rounded-lg">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Session Details</div>
                  <div className="text-white">{editedWorkout.runningDetails.sessionDetails}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/50 p-3 rounded-lg">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Target Pace</div>
                    <div className="text-white font-medium">{editedWorkout.runningDetails.targetPace}</div>
                  </div>
                  <div className="bg-zinc-800/50 p-3 rounded-lg">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Planner Run</div>
                    <div className="text-white">{editedWorkout.runningDetails.plannerRun}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex justify-end items-center">
            {!isSkipped && (
              <button
                onClick={() => onToggleComplete(editedWorkout.id)}
                className={cn(
                  "px-4 py-2 text-sm font-bold rounded-md transition-all",
                  editedWorkout.completed
                    ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                    : "bg-zinc-700 hover:bg-zinc-600 text-white"
                )}
              >
                {editedWorkout.completed ? 'Mark as Incomplete' : 'Mark as Completed'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Strength workout modal
  if (!editedWorkout.exercises) return null;
  const totalVolume = editedWorkout.exercises.reduce((acc, ex) => acc + ex.volume, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-900">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                STRENGTH
              </span>
              <span className="text-zinc-400 text-sm">{format(new Date(editedWorkout.date), 'EEEE, MMMM do')}</span>
            </div>
            <h2 className="text-2xl font-bold text-white">{editedWorkout.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="flex items-center gap-2 text-zinc-300 mb-6">
            <Clock size={16} />
            <span>Duration:</span>
            {isSkipped ? (
              <span className="text-white font-bold">{editedWorkout.duration}</span>
            ) : (
              <input
                type="number"
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white font-bold w-20 focus:border-purple-500 focus:outline-none"
                value={editedWorkout.duration}
                onChange={(e) => {
                  const newWorkout = { ...editedWorkout, duration: parseInt(e.target.value) || 0 };
                  setEditedWorkout(newWorkout);
                  onLocalUpdate?.(newWorkout);
                }}
                onBlur={() => onUpdate(editedWorkout)}
              />
            )}
            <span>minutes</span>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="pb-3 font-medium pl-2">Exercise</th>
                <th className="pb-3 font-medium text-center">Set 1</th>
                <th className="pb-3 font-medium text-center">Set 2</th>
                <th className="pb-3 font-medium text-center">Set 3</th>
                <th className="pb-3 font-medium text-right pr-2">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {editedWorkout.exercises.map((ex, idx) => (
                <tr key={idx} className="group hover:bg-zinc-800/30 transition-colors">
                  <td className="py-4 pl-2">
                    <div className="font-medium text-zinc-200">{ex.name}</div>
                    <div className="text-xs text-zinc-500">{ex.muscleGroup}</div>
                  </td>
                  {ex.sets.map((set, sIdx) => (
                    <td key={sIdx} className="py-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-1">
                          {isSkipped ? (
                            <span className="w-12 text-right text-xs font-mono text-zinc-300">{set.weight}</span>
                          ) : (
                            <input
                              type="number"
                              className="w-12 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-right text-xs font-mono text-zinc-300 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                              value={set.weight}
                              onChange={(e) => handleSetChange(idx, sIdx, 'weight', e.target.value)}
                              onBlur={saveChanges}
                              placeholder="kg"
                            />
                          )}
                          <span className="text-zinc-600 text-[10px] w-6 text-left">kg</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isSkipped ? (
                            <span className="w-12 text-right text-xs font-mono text-zinc-300">{set.reps}</span>
                          ) : (
                            <input
                              type="number"
                              className="w-12 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-right text-xs font-mono text-zinc-300 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                              value={set.reps}
                              onChange={(e) => handleSetChange(idx, sIdx, 'reps', e.target.value)}
                              onBlur={saveChanges}
                              placeholder="reps"
                            />
                          )}
                          <span className="text-zinc-600 text-[10px] w-6 text-left">reps</span>
                        </div>
                      </div>
                    </td>
                  ))}
                  <td className="py-4 text-right pr-2 font-mono text-purple-400 font-bold">
                    {ex.volume.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex justify-between items-center">
          <span className="text-xs text-zinc-500">
            Total Volume: <span className="text-purple-400 font-mono ml-1">{totalVolume.toLocaleString()} kg</span>
          </span>
          {!isSkipped && (
            <button
              onClick={() => onToggleComplete(editedWorkout.id)}
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-md transition-all",
                editedWorkout.completed
                  ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                  : "bg-zinc-700 hover:bg-zinc-600 text-white"
              )}
            >
              {editedWorkout.completed ? 'Mark as Incomplete' : 'Mark as Completed'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkoutDetailsModal;
