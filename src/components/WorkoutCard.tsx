'use client';

import React, { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Dumbbell, Activity, Clock, X, GripVertical, CheckCircle2, Footprints, Trash2, RotateCcw, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Workout } from '@/lib/types';
import GarminAuthModal from './GarminAuthModal';

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
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [pendingUploadEmail, setPendingUploadEmail] = useState('');

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: workout.id,
    data: { workout },
    disabled: isCompleted || isSkipped,
  });

  useEffect(() => {
    if (uploadStatus === 'success' || uploadStatus === 'error') {
      setShowStatusMessage(true);
      const timer = setTimeout(() => setShowStatusMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

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
    e.stopPropagation();
  };

  const handleGarminUpload = async (e: React.MouseEvent | null, emailOverride?: string, passwordOverride?: string, confirmed = false) => {
    if (e) e.stopPropagation();
    if (uploadStatus === 'uploading') return;

    const garminEmail = emailOverride || localStorage.getItem('garminEmail') || '';

    if (!garminEmail) {
      setShowGarminAuth(true);
      return;
    }

    if (!passwordOverride && !confirmed) {
      setPendingUploadEmail(garminEmail);
      setShowUploadConfirm(true);
      return;
    }

    setUploadStatus('uploading');
    try {
      const res = await fetch('/api/garmin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: workout.id, email: garminEmail, password: passwordOverride || '' }),
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

      if (passwordOverride) {
        localStorage.setItem('garminEmail', garminEmail);
      }

      setUploadStatus('success');
    } catch (err: any) {
      console.error(err);
      setUploadStatus('error');
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        className={cn(baseStyles, cursorStyle, colorStyles, completedStyles, draggingStyles, overlayStyles)}
        onClick={!isOverlay ? onClick : undefined}
      >
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
        <div className={cn("pr-8", isRun && "pr-14")}>
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

        {showStatusMessage && (uploadStatus === 'success' || uploadStatus === 'error') && (
          <div className={cn(
            "absolute bottom-0 left-0 right-0 text-[10px] uppercase font-bold text-center py-0.5 animate-in fade-in slide-in-from-bottom-1 duration-300",
            uploadStatus === 'success' ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
          )}>
            {uploadStatus === 'success' ? 'Upload Success' : 'Upload Failed'}
          </div>
        )}
      </div>
      {showUploadConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <UploadCloud size={20} className="text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Upload to Garmin</h3>
            </div>
            <p className="text-zinc-400 text-sm">
              Upload <span className="text-white font-medium">"{workout.title}"</span> to Garmin Connect?
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowUploadConfirm(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUploadConfirm(false);
                  handleGarminUpload(null, pendingUploadEmail, undefined, true);
                }}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-lg transition-colors font-medium text-sm"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
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

export default WorkoutCard;
