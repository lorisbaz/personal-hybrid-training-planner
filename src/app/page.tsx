'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
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
import { Dumbbell, Activity, Clock, Calendar as CalendarIcon, X, GripVertical, CheckCircle2, Footprints, Trash2, RotateCcw, ChevronDown, ChevronUp, Info, UploadCloud, User, Copy, Check, ClipboardPaste, ArrowLeft, ArrowRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';


// --- Utility for Tailwind classes ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type WorkoutTypeIn = 'RUNNING' | 'STRENGTH' | 'WALKING';

interface ExerciseSet {
  weight: number;
  reps: number;
}

interface Exercise {
  name: string;
  muscleGroup: string;
  sets: ExerciseSet[];
  volume: number;
}

interface RunningDetails {
  phase?: string;
  sessionDetails?: string;
  targetPace?: string;
  plannerRun?: string;
  steps?: any[];
}

interface Workout {
  id: string;
  title: string;
  type: WorkoutTypeIn;
  duration: number; // in minutes
  date: Date;
  completed: boolean;
  skipped?: boolean;
  isRace?: boolean;
  runningDetails?: RunningDetails;
  exercises?: Exercise[];
}

// --- Components ---

// Garmin Authentication Modal
const GarminAuthModal = ({
  onSubmit,
  onCancel
}: {
  onSubmit: (email: string, pass: string) => void;
  onCancel: () => void;
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setEmail(localStorage.getItem('garminEmail') || '');
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-6">
        <h3 className="text-xl font-bold text-white">Garmin Connect Login</h3>
        <p className="text-zinc-400 text-sm">
          Please enter your Garmin credentials to upload workouts. Your password will be securely stored in your system's keychain.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email</label>
            <input type="email" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Password</label>
            <input type="password" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors font-medium">
            Cancel
          </button>
          <button type="button" onClick={() => onSubmit(email, password)} disabled={!email || !password} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            Upload Activity
          </button>
        </div>
      </div>
    </div>
  );
};

// 0. Workout Details Modal
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
  const isRun = workout.type === 'RUNNING';
  const isSkipped = workout.skipped;
  
  // Local state for editing
  const [editedWorkout, setEditedWorkout] = useState(workout);
  const [showInfo, setShowInfo] = useState(false);

  // Sync prop changes to local state
  useEffect(() => {
    setEditedWorkout(workout);
  }, [workout]);

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    if (!editedWorkout.exercises) return;

    const newExercises = [...editedWorkout.exercises];
    const newSets = [...newExercises[exerciseIndex].sets];
    
    // Store as string/number to support decimal editing (e.g. "17.")
    newSets[setIndex] = {
      ...newSets[setIndex],
      [field]: value
    } as any;

    // Recalculate volume for this exercise
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

  // Helper functions for step formatting
  const formatStepDuration = (duration: any) => {
    if (!duration) return '';
    if (duration.type === 'Time') {
      // value is HH:MM:SS
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
    if (target.type === 'Pace') {
      return `@ ${target.value} /km`;
    }
    if (target.type === 'HrmZoneTarget') {
      return `HR Zone ${target.zone}`;
    }
    return target.type;
  };

  const saveChanges = () => {
    if (!editedWorkout.exercises) return;
    
    // Ensure all values are numbers before saving
    const finalExercises = editedWorkout.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({
        weight: Number(s.weight),
        reps: Number(s.reps)
      }))
    }));
    
    onUpdate({ ...editedWorkout, exercises: finalExercises });
  };

  if (!isStrength) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
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
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
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
                                  "bg-gray-500/10 text-gray-400 border border-gray-500/20" // Fallback
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
          
          {/* Footer */}
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
        {/* Header */}
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
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
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
        
        {/* Footer */}
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

// 1. The Draggable Workout Card
const WorkoutCard = ({ 
  workout, 
  isOverlay = false,
  onClick,
  onToggleSkip
}: { 
  workout: Workout; 
  isOverlay?: boolean;
  onClick?: () => void;
  onToggleSkip?: (e: React.MouseEvent) => void;
}) => {
  const isRun = workout.type === 'RUNNING';
  const isWalk = workout.type === 'WALKING';
  const isCompleted = workout.completed;
  const isSkipped = workout.skipped;
  const isRace = workout.isRace;
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [showStatusMessage, setShowStatusMessage] = useState(false);
  const [showGarminAuth, setShowGarminAuth] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: workout.id,
    data: { workout },
    disabled: isCompleted || isSkipped,
  });
  
  // Auto-clear message after 3 seconds if success or error, but keep the icon status
  useEffect(() => {
    if (uploadStatus === 'success' || uploadStatus === 'error') {
      setShowStatusMessage(true);
      const timer = setTimeout(() => setShowStatusMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  // Styles based on type. The main card is clickable, the handle is draggable.
  const baseStyles = "p-2 rounded-lg border-l-4 shadow-sm transition-all select-none mb-1 group relative overflow-hidden";
  const cursorStyle = !isOverlay && !isSkipped ? 'cursor-pointer' : '';
  const colorStyles = isSkipped
    ? "bg-zinc-900 border-zinc-800 text-zinc-500"
    : isRace
      ? "bg-rose-950/30 border-rose-500 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
      : isRun
      ? "bg-cyan-950/30 border-cyan-400 text-cyan-100"
      : isWalk
        ? "bg-amber-950/30 border-amber-500 text-amber-100"
        : "bg-purple-950/30 border-purple-500 text-purple-100";
  
  const draggingStyles = isDragging ? "opacity-30" : "opacity-100";
  const overlayStyles = isOverlay ? "scale-105 shadow-xl z-50 cursor-grabbing ring-2 ring-white/20" : "";
  const completedStyles = isCompleted
    ? "opacity-90 !border-emerald-500 bg-emerald-950/30"
    : (isRun ? "" : "hover:bg-purple-900/40");

  const handleDragClick = (e: React.MouseEvent) => {
    // Prevent the card's onClick from firing when interacting with the drag handle
    e.stopPropagation();
  };

  const handleGarminUpload = async (e: React.MouseEvent | null, emailOverride?: string, passwordOverride?: string) => {
    if (e) e.stopPropagation();
    
    if (uploadStatus === 'uploading') return;
    
    let garminEmail = emailOverride || localStorage.getItem('garminEmail') || '';
    let garminPassword = passwordOverride || '';

    if (!garminEmail) {
      setShowGarminAuth(true);
      return;
    }

    if (!passwordOverride && !confirm(`Upload "${workout.title}" to Garmin Connect?`)) return;

    setUploadStatus('uploading');
    try {
        const res = await fetch('/api/garmin/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: workout.id, email: garminEmail, password: garminPassword }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            if (data.error && data.error.includes("Password not found")) {
                setShowGarminAuth(true);
                setUploadStatus('idle');
                return;
            }
            throw new Error(data.error || 'Upload failed');
        }
        
        if (garminPassword) {
            localStorage.setItem('garminEmail', garminEmail);
        }

        setUploadStatus('success');
    } catch (err: any) {
        console.error(err);
        setUploadStatus('error');
        // Optional: Reset to idle after a delay if desired, but user requested manual reset
    }
  };

  return (
    <>
    <div
      ref={setNodeRef}
      className={cn(baseStyles, cursorStyle, colorStyles, completedStyles, draggingStyles, overlayStyles)}
      // The main onClick for opening the modal is here.
      onClick={!isOverlay ? onClick : undefined}
    >
      {/* Drag Handle - only this part is draggable */}
      {!isOverlay && !isCompleted && !isSkipped && (
        <div
          {...listeners}
          {...attributes}
          onClick={handleDragClick}
          className="absolute top-1/2 -translate-y-1/2 right-1 p-2 text-zinc-500 hover:text-white cursor-grab active:cursor-grabbing rounded-md touch-none z-10"
        >
          <GripVertical size={16} />
        </div>
      )}
      
      {/* Skip/Restore Button */}
      {!isOverlay && !isCompleted && (
        <button
          onClick={onToggleSkip}
          className={cn(
            "absolute top-1 right-1 p-1.5 rounded-md transition-all z-20",
            isSkipped 
              ? "text-zinc-400 hover:text-white hover:bg-zinc-800" 
              : "text-zinc-500 hover:text-red-400 hover:bg-zinc-900/80"
          )}
          title={isSkipped ? "Restore Workout" : "Skip Workout"}
        >
          {isSkipped ? <RotateCcw size={14} /> : <Trash2 size={14} />}
        </button>
      )}

      {/* Garmin Upload Button (Placeholder) */}
      {!isOverlay && isRun && !isCompleted && !isSkipped && (
        <button
          onClick={handleGarminUpload}
          className="absolute top-1 right-8 p-1.5 rounded-md transition-all z-20 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-900/80"
          title="Upload to Garmin"
          disabled={uploadStatus === 'uploading'}
        >
          {uploadStatus === 'idle' && <UploadCloud size={14} />}
          {uploadStatus === 'uploading' && <UploadCloud size={14} className="animate-pulse text-cyan-400" />}
          {uploadStatus === 'success' && <CheckCircle2 size={14} className="text-emerald-400" />}
          {uploadStatus === 'error' && <X size={14} className="text-red-400" />}
        </button>
      )}

      {isCompleted && (
        <div className="absolute top-1/2 -translate-y-1/2 right-1 p-2 text-emerald-400">
          <CheckCircle2 size={16} />
        </div>
      )}
      <div className={cn("pr-8", isRun && "pr-14")}> {/* Add padding to avoid content overlapping with handle/icon */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold tracking-wider opacity-80">{workout.type}</span>
          {isRun 
            ? <Activity size={14} className="text-cyan-400" /> 
            : isWalk 
              ? <Footprints size={14} className="text-amber-500" /> 
              : <Dumbbell size={14} className="text-purple-500" />}
        </div>
        <h4 className={cn("font-semibold text-sm truncate", isSkipped && "line-through opacity-50")}>
          {workout.title}
        </h4>
        <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
          <Clock size={12} />
          <span>{workout.duration}  min</span>
        </div>
      </div>

      {/* Status Message */}
      {showStatusMessage && (uploadStatus === 'success' || uploadStatus === 'error') && (
        <div className={cn(
          "absolute bottom-0 left-0 right-0 text-[10px] uppercase font-bold text-center py-0.5 animate-in fade-in slide-in-from-bottom-1 duration-300",
          uploadStatus === 'success' ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
        )}>
          {uploadStatus === 'success' ? 'Upload Success' : 'Upload Failed'}
        </div>
      )}
    </div>
    {showGarminAuth && (
      <GarminAuthModal 
        onSubmit={(email, password) => {
          setShowGarminAuth(false);
          handleGarminUpload(null, email, password);
        }}
        onCancel={() => setShowGarminAuth(false)}
      />
    )}
    </>
  );
};

// 2. The Droppable Day Cell
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

// 3. The Stats Block (End of Row)
const WeeklyStats = ({ workouts }: { workouts: Workout[] }) => {
  const completedWorkouts = workouts.filter(w => w.completed && !w.skipped);

  const totalDuration = completedWorkouts.reduce((acc, curr) => acc + curr.duration, 0);
  
  const runDuration = completedWorkouts.filter(w => w.type === 'RUNNING').reduce((acc, curr) => acc + curr.duration, 0);
  const walkDuration = completedWorkouts.filter(w => w.type === 'WALKING').reduce((acc, curr) => acc + curr.duration, 0);
  const strengthDuration = completedWorkouts.filter(w => w.type === 'STRENGTH').reduce((acc, curr) => acc + curr.duration, 0);

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

const Header = ({ isLoaded, onOpenProfile }: { isLoaded: boolean; onOpenProfile: () => void }) => (
  <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
    <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg">
          <CalendarIcon className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Your Personal Training Plan</h1>
        </div>
      </div>
      <button
        onClick={onOpenProfile}
        className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors text-zinc-400 hover:text-white"
        title="Edit Profile"
      >
        <User size={20} />
      </button>
    </div>
  </header>
);

// --- Landing Page Component ---
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SPORT_OPTIONS = ['Soccer', 'Swimming', 'Basketball', 'HIIT', 'Gym', 'Cycling', 'Tennis', 'Other'];
const STRENGTH_TARGET_OPTIONS = ['Hypertrophy', 'Max Strength', 'Power', 'Endurance', 'General Fitness', 'Longevity', 'Injury Prevention'];

const InputGroup = ({ label, children, optional }: { label: string, children: React.ReactNode, optional?: boolean }) => (
  <div>
    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
      {label} {optional && <span className="text-zinc-600 text-xs font-normal ml-1">(Optional)</span>}
    </label>
    {children}
  </div>
);

const LandingPage = ({ onComplete, onCancel }: { onComplete: () => void; onCancel?: () => void }) => {
  const [step, setStep] = useState(1);
  const [isCopied, setIsCopied] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [runningPromptPreview, setRunningPromptPreview] = useState('');
  const [strengthPromptPreview, setStrengthPromptPreview] = useState('');
  const [runningAiOutput, setRunningAiOutput] = useState('');
  const [strengthAiOutput, setStrengthAiOutput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    weight: '',
    height: '',
    raceDistance: '',
    raceTarget: '',
    raceDate: '',
    vo2max: '',
    lactateHr: '',
    lactatePace: '',
    lactatePower: '',
    sportHistory: [] as string[],
    runningExperience: '',
    strengthExperience: '',
    workLifestyle: '',
    weeklyAvailability: '3',
    trainingBaseline: '',
    longestRun: '',
    runDays: [] as string[],
    longRunDay: '',
    walkDays: [] as string[],
    strengthDays: [] as string[],
    strengthTargets: [] as string[],
    hardSessions: '1'
  });

  useEffect(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {}
    }
  }, []);

  const toggleArrayItem = (field: 'sportHistory' | 'walkDays' | 'strengthDays' | 'strengthTargets', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((x: string) => x !== item)
        : [...prev[field], item]
    }));
  };

  const toggleRunDay = (day: string) => {
    setFormData(prev => {
      const newRunDays = prev.runDays.includes(day)
        ? prev.runDays.filter((x: string) => x !== day)
        : [...prev.runDays, day];
      
      return {
        ...prev,
        runDays: newRunDays,
        weeklyAvailability: newRunDays.length > 0 ? String(newRunDays.length) : '1',
        longRunDay: newRunDays.includes(prev.longRunDay) ? prev.longRunDay : ''
      };
    });
  };

  const handleCopy = async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for mobile or insecure contexts
        const textArea = document.createElement("textarea");
        textArea.value = text;
        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setIsCopied(true);
      setHasCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      
      const today = new Date();
      let weeksToRace = '___';
      let formattedRaceDate = formData.raceDate || '___';
      
      if (formData.raceDate) {
        const raceDate = new Date(formData.raceDate + 'T12:00:00');
        const diffTime = raceDate.getTime() - today.getTime();
        const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
        weeksToRace = diffWeeks > 0 ? diffWeeks.toString() : '0';
        formattedRaceDate = format(raceDate, 'MMMM d, yyyy');
      }

      const mapping: Record<string, string> = {
        '$TODAY_DATE': format(today, 'MMMM d, yyyy'),
        '$NUMBER_OF_WEEKS_TO_RACE': weeksToRace,
        '$RACE_DISTANCE': formData.raceDistance || '___',
        '$RACE_TIME': formData.raceTarget || '___',
        '$DATE_DATE': formattedRaceDate,
        '$AGE': formData.age || '___',
        '$WEIGHT': formData.weight || '___',
        '$HEIGHT': formData.height || '___',
        '$VO2_MAX': formData.vo2max || '___',
        '$HR': formData.lactateHr || '___',
        '$PACE': formData.lactatePace || '___',
        '$POWER': formData.lactatePower || '___',
        '$SPORT_HISTORY': formData.sportHistory.length > 0 ? formData.sportHistory.join(', ') : '___',
        '$RUNNING_EXPERIENCE': formData.runningExperience || '___',
        '$WORK_LIFESTYLE': formData.workLifestyle || '___',
        '$CURRENT_BASELINE': formData.trainingBaseline || '___',
        '$LONGEST_RUN': formData.longestRun || '___',
        '$PREFERRED_RUN_DAYS': formData.runDays.length > 0 ? formData.runDays.join(', ') : '___',
        '$PREFERRED_LONG_RUN_DAY': formData.longRunDay || '___',
        '$PREFERRED_WALK_DAYS': formData.walkDays.length > 0 ? formData.walkDays.join(', ') : '___',
        '$PREFERRED_STRENGTH_DAYS': formData.strengthDays.length > 0 ? formData.strengthDays.join(', ') : '___',
        '$PREFERRED_STRENGTH_TRAINING_DAYS': formData.strengthDays.length > 0 ? formData.strengthDays.join(', ') : '___',
        '$STRENGTH_TRAINING_TARGETS': formData.strengthTargets.length > 0 ? formData.strengthTargets.join(', ') : '___',
        '$STRENGTH_TRAINING_EXPERIENCE': formData.strengthExperience || '___',
        '$HARD_RUN_SESSIONS': formData.hardSessions || '___',
      };

      const runRes = await fetch('/running-planner-program.md');
      if (runRes.ok) {
        let runText = await runRes.text();
        Object.entries(mapping).forEach(([placeholder, value]) => {
          runText = runText.split(placeholder).join(value);
        });
        setRunningPromptPreview(runText);
      } else {
        setRunningPromptPreview("Could not load running-planner-program.md. Please make sure it exists in your public folder.");
      }

      const strRes = await fetch('/strength-training-planner-program.md');
      if (strRes.ok) {
        let strText = await strRes.text();
        Object.entries(mapping).forEach(([placeholder, value]) => {
          strText = strText.split(placeholder).join(value);
        });
        setStrengthPromptPreview(strText);
      } else {
        setStrengthPromptPreview("Could not load strength-training-planner-program.md. Please make sure it exists in your public folder.");
      }
    } catch {
      setRunningPromptPreview("Could not load planner programs. Please make sure they exist in your public folder.");
      setStrengthPromptPreview("Could not load planner programs. Please make sure they exist in your public folder.");
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e?: React.FormEvent, skipWarning = false) => {
    if (e) e.preventDefault();
    setJsonError(null);

    let allWorkouts: any[] = [];

    if (runningAiOutput.trim()) {
      try {
        const runningWorkouts = JSON.parse(runningAiOutput);
        
        if (!Array.isArray(runningWorkouts)) {
          setJsonError('The running AI output must be an array of workouts.');
          return;
        }
        allWorkouts = [...allWorkouts, ...runningWorkouts];
      } catch (err) {
        console.error('Failed to parse or save AI output:', err);
        setJsonError('Failed to parse running JSON. Please make sure the output is valid JSON.');
        return;
      }
    }

    if (strengthAiOutput.trim()) {
      try {
        const strengthWorkouts = JSON.parse(strengthAiOutput);
        
        if (!Array.isArray(strengthWorkouts)) {
          setJsonError('The strength AI output must be an array of workouts.');
          return;
        }
        allWorkouts = [...allWorkouts, ...strengthWorkouts];
      } catch (err) {
        console.error('Failed to parse strength AI output:', err);
        setJsonError('Failed to parse strength JSON. Please make sure the output is valid JSON.');
        return;
      }
    }

    if (formData.walkDays.length > 0 && allWorkouts.length > 0) {
      let startDate = new Date();
      let endDate = new Date();
      endDate.setDate(endDate.getDate() + 8 * 7); // Default 8 weeks

      const dates = allWorkouts
        .map(w => new Date(w.scheduled_date).getTime())
        .filter(t => !isNaN(t));
      
      if (dates.length > 0) {
        startDate = new Date(Math.min(...dates));
        endDate = new Date(Math.max(...dates));
      }

      const daysMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
      const targetDays = formData.walkDays.map(d => daysMap[d]);

      let current = new Date(startDate);
      while (current <= endDate) {
        if (targetDays.includes(current.getDay())) {
          allWorkouts.push({
            workout_type: "Walking",
            workout_name: "Active Recovery Walk",
            scheduled_date: format(current, 'yyyy-MM-dd'),
            duration: 60
          });
        }
        current.setDate(current.getDate() + 1);
      }
    }

    if (allWorkouts.length > 0) {
      if (!skipWarning) {
        try {
          // Check if there are any future workouts before overwriting
          const fetchRes = await fetch('/api/workouts');
          if (fetchRes.ok) {
            const existingWorkouts = await fetchRes.json();
            if (Array.isArray(existingWorkouts)) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const hasFuture = existingWorkouts.some((w: any) => new Date(w.date) >= today);
              
              if (hasFuture) {
                setShowOverwriteWarning(true);
                return; // Abort and wait for modal confirmation
              }
            }
          }
        } catch (err) {
          console.error("Failed to check existing workouts:", err);
        }
      }
      
      try {
        await fetch('/api/workouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allWorkouts),
        });
      } catch (err) {
        console.error('Failed to save AI output:', err);
        setJsonError('Failed to save workouts to the server.');
        return;
      }
    }

    localStorage.setItem('userProfile', JSON.stringify(formData));
    onComplete();
  };

  const inputClasses = "w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-zinc-700";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 py-12 px-4 overflow-y-auto selection:bg-cyan-500/30 relative">
      {onCancel && (
        <button 
          onClick={onCancel}
          className="fixed top-4 right-4 md:top-8 md:right-8 p-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white z-[60] shadow-xl"
          title="Back to Plan"
        >
          <X size={24} />
        </button>
      )}
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 rounded-2xl mb-2 border border-cyan-500/30">
            <Activity className="text-cyan-400" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Create Your Hybrid Athlete Profile</h1>
          <p className="text-zinc-400">Let's build a personalized training plan that fits your life.</p>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          if (step === 1) handleNext(e);
          else if (step === 2) { setStep(3); setHasCopied(false); setIsCopied(false); }
          else if (step === 3) { setStep(4); setHasCopied(false); setIsCopied(false); }
          else if (step === 4) { setStep(5); setHasCopied(false); setIsCopied(false); }
          else handleFinalSubmit(e);
        }} className="space-y-6">
          {step === 1 && (
            <>
          {/* Personal Details */}
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <h2 className="text-xl font-bold text-white border-b border-zinc-800/50 pb-4">Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <InputGroup label="Name">
                <input required type="text" placeholder="John Doe" className={inputClasses} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </InputGroup>
              <InputGroup label="Age">
                <input required type="number" placeholder="30" className={inputClasses} value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
              </InputGroup>
              <InputGroup label="Weight (kg)">
                <input required type="number" placeholder="70" className={inputClasses} value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
              </InputGroup>
              <InputGroup label="Height (cm)">
                <input required type="number" placeholder="175" className={inputClasses} value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} />
              </InputGroup>
            </div>
          </div>

          {/* Experience */}
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <h2 className="text-xl font-bold text-white border-b border-zinc-800/50 pb-4">Background & Experience</h2>
            
            <InputGroup label="Sport History">
              <div className="flex flex-wrap gap-2">
                {SPORT_OPTIONS.map(sport => (
                  <button key={sport} type="button" onClick={() => toggleArrayItem('sportHistory', sport)} className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-all", formData.sportHistory.includes(sport) ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.1)]" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700 hover:text-white")}>
                    {sport}
                  </button>
                ))}
              </div>
            </InputGroup>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <InputGroup label="Running Experience">
                <select required value={formData.runningExperience} onChange={e => setFormData({...formData, runningExperience: e.target.value})} className={cn(inputClasses, "appearance-none")}>
                  <option value="" disabled>Select experience...</option>
                  <option value="<1 year">&lt; 1 year</option>
                  <option value="1-5 years">1 - 5 years</option>
                  <option value=">5 years">&gt; 5 years</option>
                </select>
              </InputGroup>
              <InputGroup label="Current Baseline (km/week)">
                <input required type="number" placeholder="e.g. 20" className={inputClasses} value={formData.trainingBaseline} onChange={e => setFormData({...formData, trainingBaseline: e.target.value})} />
              </InputGroup>
              <InputGroup label="Longest Run (km)">
                <input required type="number" placeholder="e.g. 12" className={inputClasses} value={formData.longestRun} onChange={e => setFormData({...formData, longestRun: e.target.value})} />
              </InputGroup>
              <InputGroup label="Strength Training Experience">
                <select required value={formData.strengthExperience} onChange={e => setFormData({...formData, strengthExperience: e.target.value})} className={cn(inputClasses, "appearance-none")}>
                  <option value="" disabled>Select experience...</option>
                  <option value="<1 year">&lt; 1 year</option>
                  <option value="1-5 years">1 - 5 years</option>
                  <option value=">5 years">&gt; 5 years</option>
                </select>
              </InputGroup>
            </div>

              <InputGroup label="Work & Lifestyle" optional>
                <textarea placeholder="e.g. 9-5 desk job, active job, high stress, travel often..." className={cn(inputClasses, "resize-none h-24")} value={formData.workLifestyle} onChange={e => setFormData({...formData, workLifestyle: e.target.value})} />
              </InputGroup>
          </div>

          {/* Goals */}
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-bold text-white border-b border-zinc-800/50 pb-4 flex items-center gap-2 mb-4">Target Race <span className="text-sm font-normal text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-md border border-zinc-700/50">Optional</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputGroup label="Distance (Km)">
                  <input type="text" placeholder="e.g. 10k, Half Marathon" className={inputClasses} value={formData.raceDistance} onChange={e => setFormData({...formData, raceDistance: e.target.value})} />
                </InputGroup>
                <InputGroup label="Target Time">
                  <input type="text" placeholder="e.g. sub-55 mins" className={inputClasses} value={formData.raceTarget} onChange={e => setFormData({...formData, raceTarget: e.target.value})} />
                </InputGroup>
                <InputGroup label="Race Date">
                  <input 
                    type="date" 
                    className={cn(inputClasses, "cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer")} 
                    value={formData.raceDate} 
                    onClick={(e) => {
                      // Safely call showPicker to open the native calendar popup on click
                      if ('showPicker' in e.currentTarget) (e.currentTarget as any).showPicker();
                    }}
                    onChange={e => setFormData({...formData, raceDate: e.target.value})} 
                  />
                </InputGroup>
              </div>
            </div>

            <div className="pt-4">
              <h2 className="text-xl font-bold text-white border-b border-zinc-800/50 pb-4 flex items-center gap-2 mb-4">Strength Training Targets <span className="text-sm font-normal text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-md border border-zinc-700/50">Optional</span></h2>
              <InputGroup label="Primary Goals">
                <div className="flex flex-wrap gap-2">
                  {STRENGTH_TARGET_OPTIONS.map(target => (
                    <button key={target} type="button" onClick={() => toggleArrayItem('strengthTargets', target)} className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-all", formData.strengthTargets.includes(target) ? "bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.1)]" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700 hover:text-white")}>
                      {target}
                    </button>
                  ))}
                </div>
              </InputGroup>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <h2 className="text-xl font-bold text-white border-b border-zinc-800/50 pb-4">Schedule</h2>
            
            <InputGroup label="Preferred Run Days">
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button key={day} type="button" onClick={() => toggleRunDay(day)} className={cn("w-14 h-14 rounded-xl text-sm font-medium border transition-all flex items-center justify-center", formData.runDays.includes(day) ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700 hover:text-white")}>
                    {day}
                  </button>
                ))}
              </div>
            </InputGroup>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup label="Preferred Long Run Day">
                <select value={formData.longRunDay} onChange={e => setFormData({...formData, longRunDay: e.target.value})} className={cn(inputClasses, "appearance-none")}>
                  <option value="" disabled>Select day...</option>
                  {DAYS.filter(day => formData.runDays.includes(day)).map(day => <option key={day} value={day}>{day}</option>)}
                </select>
              </InputGroup>
              <InputGroup label="Hard Sessions">
                <select value={formData.hardSessions} onChange={e => setFormData({...formData, hardSessions: e.target.value})} className={cn(inputClasses, "appearance-none")}>
                  {[0,1,2].map(n => <option key={n} value={n}>{n}x per week</option>)}
                </select>
              </InputGroup>
            </div>

            <InputGroup label="Preferred Strength Training Days" optional>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button key={day} type="button" onClick={() => toggleArrayItem('strengthDays', day)} className={cn("w-14 h-14 rounded-xl text-sm font-medium border transition-all flex items-center justify-center", formData.strengthDays.includes(day) ? "bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700 hover:text-white")}>
                    {day}
                  </button>
                ))}
              </div>
            </InputGroup>

            <InputGroup label="Preferred Walk Days" optional>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button key={day} type="button" onClick={() => toggleArrayItem('walkDays', day)} className={cn("w-14 h-14 rounded-xl text-sm font-medium border transition-all flex items-center justify-center", formData.walkDays.includes(day) ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700 hover:text-white")}>
                    {day}
                  </button>
                ))}
              </div>
            </InputGroup>

          </div>

          {/* Advanced Metrics */}
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <h2 className="text-xl font-bold text-white border-b border-zinc-800/50 pb-4 flex items-center gap-2">Advanced Running Metrics <span className="text-sm font-normal text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-md border border-zinc-700/50">Optional</span></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <InputGroup label="VO2-Max">
                <input type="number" placeholder="e.g. 45" className={inputClasses} value={formData.vo2max} onChange={e => setFormData({...formData, vo2max: e.target.value})} />
              </InputGroup>
              <InputGroup label="Lactate Heart Rate (bpm)">
                <input type="number" placeholder="e.g. 172" className={inputClasses} value={formData.lactateHr} onChange={e => setFormData({...formData, lactateHr: e.target.value})} />
              </InputGroup>
              <InputGroup label="Lactate Pace (min/Km)">
                <input type="text" placeholder="e.g. 5:30/km" className={inputClasses} value={formData.lactatePace} onChange={e => setFormData({...formData, lactatePace: e.target.value})} />
              </InputGroup>
              <InputGroup label="Lactate Power (W)">
                <input type="number" placeholder="e.g. 336" className={inputClasses} value={formData.lactatePower} onChange={e => setFormData({...formData, lactatePower: e.target.value})} />
              </InputGroup>
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center">
            <button type="button" disabled title="Previous" aria-label="Previous" className="bg-zinc-800 text-zinc-500 px-6 py-4 rounded-xl cursor-not-allowed flex items-center justify-center">
              <ArrowLeft size={24} />
            </button>
            <button type="submit" title="Next" aria-label="Next" className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 px-6 py-4 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center justify-center">
              <ArrowRight size={24} />
            </button>
          </div>
          </>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-800/50 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Running - Copy and paste this text to your favourite AI Assistant</h2>
                    <p className="text-zinc-400 text-sm">
                       Note: we tested the prompt with Gemini; results might differ with other assistants.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(runningPromptPreview)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-300 hover:text-white flex items-center gap-2 shrink-0"
                    title="Copy to clipboard"
                  >
                    {isCopied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                    <span className="text-sm font-medium">{isCopied ? 'Copied!' : 'Copy Prompt'}</span>
                  </button>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <pre className="whitespace-pre-wrap font-sans text-zinc-300 text-sm leading-relaxed">
                    {runningPromptPreview}
                  </pre>
                </div>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <button type="button" onClick={() => setStep(1)} title="Previous" aria-label="Previous" className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center">
                  <ArrowLeft size={24} />
                </button>
                <button 
                  type="submit" 
                  disabled={!hasCopied}
                  title="Next"
                  aria-label="Next"
                  className={cn(
                    "px-6 py-4 rounded-xl transition-all flex items-center justify-center",
                    hasCopied 
                      ? "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}>
                  <ArrowRight size={24} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-800/50 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Running - Paste here the output generated by your AI assistant</h2>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        setRunningAiOutput(text);
                      } catch (err) {
                        console.error('Failed to read clipboard contents: ', err);
                      }
                    }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-300 hover:text-white flex items-center gap-2 shrink-0"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste size={18} />
                    <span className="text-sm font-medium">Paste</span>
                  </button>
                </div>
                {jsonError && (
                  <div className="mb-4 p-3 bg-red-950/50 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
                    <Info size={16} className="shrink-0" />
                    <span>{jsonError}</span>
                  </div>
                )}
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-0 overflow-hidden focus-within:border-cyan-500 transition-colors">
                  <textarea
                    className="w-full bg-transparent text-zinc-300 text-sm font-mono leading-relaxed resize-none h-[40vh] p-4 focus:outline-none focus:ring-0 custom-scrollbar placeholder:text-zinc-700 placeholder:font-sans"
                    placeholder="Paste your AI-generated JSON here..."
                    value={runningAiOutput}
                    onChange={(e) => {
                      setRunningAiOutput(e.target.value);
                      if (jsonError) setJsonError(null);
                    }}
                    required
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <button type="button" onClick={() => setStep(2)} title="Previous" aria-label="Previous" className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center">
                  <ArrowLeft size={24} />
                </button>
                <button 
                  type="submit" 
                  disabled={!runningAiOutput.trim()}
                  title="Next"
                  aria-label="Next"
                  className={cn(
                    "px-6 py-4 rounded-xl transition-all flex items-center justify-center",
                    runningAiOutput.trim() 
                      ? "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}>
                  <ArrowRight size={24} />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-800/50 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Strength - Copy and paste this text to your favourite AI Assistant</h2>
                    <p className="text-zinc-400 text-sm">
                       Note: we tested the prompt with Gemini; results might differ with other assistants.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(strengthPromptPreview)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-300 hover:text-white flex items-center gap-2 shrink-0"
                    title="Copy to clipboard"
                  >
                    {isCopied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                    <span className="text-sm font-medium">{isCopied ? 'Copied!' : 'Copy Prompt'}</span>
                  </button>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <pre className="whitespace-pre-wrap font-sans text-zinc-300 text-sm leading-relaxed">
                    {strengthPromptPreview}
                  </pre>
                </div>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <button type="button" onClick={() => setStep(3)} title="Previous" aria-label="Previous" className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center">
                  <ArrowLeft size={24} />
                </button>
                <button 
                  type="submit" 
                  disabled={!hasCopied}
                  title="Next"
                  aria-label="Next"
                  className={cn(
                    "px-6 py-4 rounded-xl transition-all flex items-center justify-center",
                    hasCopied 
                      ? "bg-purple-500 hover:bg-purple-400 text-zinc-950 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}>
                  <ArrowRight size={24} />
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-800/50 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Strength - Paste here the output generated by your AI assistant</h2>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        setStrengthAiOutput(text);
                      } catch (err) {
                        console.error('Failed to read clipboard contents: ', err);
                      }
                    }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-300 hover:text-white flex items-center gap-2 shrink-0"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste size={18} />
                    <span className="text-sm font-medium">Paste</span>
                  </button>
                </div>
                {jsonError && (
                  <div className="mb-4 p-3 bg-red-950/50 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
                    <Info size={16} className="shrink-0" />
                    <span>{jsonError}</span>
                  </div>
                )}
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-0 overflow-hidden focus-within:border-purple-500 transition-colors">
                  <textarea
                    className="w-full bg-transparent text-zinc-300 text-sm font-mono leading-relaxed resize-none h-[40vh] p-4 focus:outline-none focus:ring-0 custom-scrollbar placeholder:text-zinc-700 placeholder:font-sans"
                    placeholder="Paste your AI-generated JSON here..."
                    value={strengthAiOutput}
                    onChange={(e) => {
                      setStrengthAiOutput(e.target.value);
                      if (jsonError) setJsonError(null);
                    }}
                    required
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <button type="button" onClick={() => setStep(4)} title="Previous" aria-label="Previous" className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center">
                  <ArrowLeft size={24} />
                </button>
                <button 
                  type="submit" 
                  disabled={!strengthAiOutput.trim()}
                  className={cn(
                    "px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-2",
                    strengthAiOutput.trim() 
                      ? "bg-purple-500 hover:bg-purple-400 text-zinc-950 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}>
                  Finish
                  <Check size={20} />
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Overwrite Warning Modal */}
      {showOverwriteWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-6">
            <h3 className="text-xl font-bold text-white">Overwrite Future Workouts?</h3>
            <p className="text-zinc-400">
              You already have future workouts scheduled. Generating a new program will overwrite them. Your past history will be preserved.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowOverwriteWarning(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowOverwriteWarning(false);
                  handleFinalSubmit(undefined, true);
                }}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-lg transition-colors font-medium shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              >
                Yes, Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Page Component ---
function WorkoutPlanner({ onOpenProfile }: { onOpenProfile: () => void }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showAllFuture, setShowAllFuture] = useState(false);

  // Helper to save workouts to the API
  const saveWorkouts = async (newWorkouts: Workout[]) => {
    // Optimistic update
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
        if (!res.ok) {
          throw new Error(`Failed to fetch workouts: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format received from API');
        }

        // Convert date strings back to Date objects
        const parsed = data
          // .filter((w: any) => w.type !== 'RUNNING') // Removed filter to show running plan
          .map((w: any) => ({ ...w, date: new Date(w.date) }));
        setWorkouts(parsed);
      } catch (error) {
        console.error('Failed to fetch workouts:', error);
      } finally {
        setIsMounted(true);
      }
    };

    fetchWorkouts();
  }, []);

  // Organize weeks into Past, Present, Future
  const { pastWeeks, currentWeek, futureWeeks } = useMemo(() => {
    if (!workouts.length) return { pastWeeks: [], currentWeek: null, futureWeeks: [] };

    // Get all unique week starts from the data
    const weekStarts = Array.from(new Set(workouts.map(w => 
      startOfWeek(w.date, { weekStartsOn: 1 }).toISOString()
    )))
    .map(d => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());

    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

    const past = weekStarts.filter(d => d < currentWeekStart).reverse(); // Reverse to show newest past first
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

    const newCompleted = !workout.completed;
    const updatedWorkout = { ...workout, completed: newCompleted };
    
    let updatedWorkouts = workouts.map(w => w.id === workoutId ? updatedWorkout : w);

    if (newCompleted) {
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
        return { 
          ...w, 
          skipped: !w.skipped,
          // If we are skipping, ensure it's not marked as completed
          completed: !w.skipped ? false : w.completed 
        };
      }
      return w;
    });
    saveWorkouts(updatedWorkouts);
    
    // If the currently selected workout is the one being skipped, close the modal
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

  // Drag Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id) {
      const newDateStr = over.id as string;
      const newDate = new Date(newDateStr);

      const updatedWorkouts = workouts.map((w) => {
        if (w.id === active.id) {
          return { ...w, date: newDate };
        }
        return w;
      });
      saveWorkouts(updatedWorkouts);
    }
    setActiveId(null);
  };

  const activeWorkout = useMemo(
    () => workouts.find((w) => w.id === activeId),
    [activeId, workouts]
  );

  // Helper to render a single week row
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
        {/* Week Header */}
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

        {/* Week Grid: 7 Days + 1 Stats Column */}
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
          
          {/* Stats Column */}
          <WeeklyStats workouts={weekWorkouts} />
        </div>
      </div>
    );
  };

  // On the server, and for the initial client render, `isMounted` is false.
  // We return a placeholder to prevent rendering anything that depends on the current date.
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-cyan-500/30">
      <Header isLoaded={isMounted} onOpenProfile={onOpenProfile} />

      <main className={cn("max-w-[1600px] mx-auto p-6", isMounted && "flex flex-col gap-4")}>
        {!isMounted ? (
          /* You can add a more detailed skeleton UI here */
          null
        ) : (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* 1. Current Week */}
          {currentWeek && (
            <div>
              {renderWeekRow(currentWeek, true)}
            </div>
          )}

          {/* 2. Future Drawer (Collapsible) */}
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

          {/* 3. History Drawer (Scrollable Below) */}
          <div className="flex flex-col gap-4 opacity-60 hover:opacity-100 transition-opacity duration-500">
             <h3 className="text-2xl font-bold text-zinc-500 mt-4 mb-2">Previous</h3>
             {pastWeeks.map(week => renderWeekRow(week, false))}
          </div>

          {/* Drag Overlay (The item being dragged) */}
          <DragOverlay>
            {activeWorkout ? <WorkoutCard workout={activeWorkout} isOverlay /> : null}
          </DragOverlay>

          {/* Modal */}
          {selectedWorkout && <WorkoutDetailsModal 
            workout={selectedWorkout} 
            onClose={() => setSelectedWorkout(null)}
            onToggleComplete={handleToggleComplete}
            onUpdate={handleWorkoutUpdate}
            onLocalUpdate={(updatedWorkout) => {
              setWorkouts(prevWorkouts => prevWorkouts.map(w => w.id === updatedWorkout.id ? updatedWorkout : w));
            }}
          />}
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
