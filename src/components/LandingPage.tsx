'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Activity, X, Info, Copy, Check, ClipboardPaste, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    // Try API first (source of truth), fall back to localStorage cache
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const profile = await res.json();
          if (profile) {
            setFormData(prev => ({ ...prev, ...profile }));
            localStorage.setItem('userProfile', JSON.stringify(profile));
            return;
          }
        }
      } catch {}
      // Fallback: use cached localStorage value
      const saved = localStorage.getItem('userProfile');
      if (saved) {
        try { setFormData(prev => ({ ...prev, ...JSON.parse(saved) })); } catch {}
      }
    };
    loadProfile();
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
        const textArea = document.createElement("textarea");
        textArea.value = text;
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
      endDate.setDate(endDate.getDate() + 8 * 7);

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
          const fetchRes = await fetch('/api/workouts');
          if (fetchRes.ok) {
            const existingWorkouts = await fetchRes.json();
            if (Array.isArray(existingWorkouts)) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const hasFuture = existingWorkouts.some((w: any) => new Date(w.date) >= today);
              if (hasFuture) {
                setShowOverwriteWarning(true);
                return;
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

    // Save to DB (source of truth) and keep localStorage as fast-load cache
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
    } catch (err) {
      console.error('Failed to save profile to server:', err);
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
                    <p className="text-zinc-400 text-sm">Note: we tested the prompt with Gemini; results might differ with other assistants.</p>
                  </div>
                  <button type="button" onClick={() => handleCopy(runningPromptPreview)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-300 hover:text-white flex items-center gap-2 shrink-0" title="Copy to clipboard">
                    {isCopied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                    <span className="text-sm font-medium">{isCopied ? 'Copied!' : 'Copy Prompt'}</span>
                  </button>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <pre className="whitespace-pre-wrap font-sans text-zinc-300 text-sm leading-relaxed">{runningPromptPreview}</pre>
                </div>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <button type="button" onClick={() => setStep(1)} title="Previous" aria-label="Previous" className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center">
                  <ArrowLeft size={24} />
                </button>
                <button type="submit" disabled={!hasCopied} title="Next" aria-label="Next" className={cn("px-6 py-4 rounded-xl transition-all flex items-center justify-center", hasCopied ? "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]" : "bg-zinc-800 text-zinc-500 cursor-not-allowed")}>
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
                  <button type="button" onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setRunningAiOutput(text);
                    } catch (err) {
                      console.error('Failed to read clipboard contents: ', err);
                    }
                  }} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-300 hover:text-white flex items-center gap-2 shrink-0" title="Paste from clipboard">
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
                    onChange={(e) => { setRunningAiOutput(e.target.value); if (jsonError) setJsonError(null); }}
                    required
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <button type="button" onClick={() => setStep(2)} title="Previous" aria-label="Previous" className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center">
                  <ArrowLeft size={24} />
                </button>
                <button type="submit" disabled={!runningAiOutput.trim()} title="Next" aria-label="Next" className={cn("px-6 py-4 rounded-xl transition-all flex items-center justify-center", runningAiOutput.trim() ? "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]" : "bg-zinc-800 text-zinc-500 cursor-not-allowed")}>
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
                    <p className="text-zinc-400 text-sm">Note: we tested the prompt with Gemini; results might differ with other assistants.</p>
                  </div>
                  <button type="button" onClick={() => handleCopy(strengthPromptPreview)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-300 hover:text-white flex items-center gap-2 shrink-0" title="Copy to clipboard">
                    {isCopied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                    <span className="text-sm font-medium">{isCopied ? 'Copied!' : 'Copy Prompt'}</span>
                  </button>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <pre className="whitespace-pre-wrap font-sans text-zinc-300 text-sm leading-relaxed">{strengthPromptPreview}</pre>
                </div>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <button type="button" onClick={() => setStep(3)} title="Previous" aria-label="Previous" className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center">
                  <ArrowLeft size={24} />
                </button>
                <button type="submit" disabled={!hasCopied} title="Next" aria-label="Next" className={cn("px-6 py-4 rounded-xl transition-all flex items-center justify-center", hasCopied ? "bg-purple-500 hover:bg-purple-400 text-zinc-950 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]" : "bg-zinc-800 text-zinc-500 cursor-not-allowed")}>
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
                  <button type="button" onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setStrengthAiOutput(text);
                    } catch (err) {
                      console.error('Failed to read clipboard contents: ', err);
                    }
                  }} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-300 hover:text-white flex items-center gap-2 shrink-0" title="Paste from clipboard">
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
                    onChange={(e) => { setStrengthAiOutput(e.target.value); if (jsonError) setJsonError(null); }}
                    required
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <button type="button" onClick={() => setStep(4)} title="Previous" aria-label="Previous" className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center">
                  <ArrowLeft size={24} />
                </button>
                <button type="submit" disabled={!strengthAiOutput.trim()} className={cn("px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-2", strengthAiOutput.trim() ? "bg-purple-500 hover:bg-purple-400 text-zinc-950 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]" : "bg-zinc-800 text-zinc-500 cursor-not-allowed")}>
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
              <button onClick={() => setShowOverwriteWarning(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors font-medium">
                Cancel
              </button>
              <button onClick={() => { setShowOverwriteWarning(false); handleFinalSubmit(undefined, true); }} className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-lg transition-colors font-medium shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                Yes, Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
