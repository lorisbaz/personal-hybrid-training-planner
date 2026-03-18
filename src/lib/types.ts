export type WorkoutType = 'RUNNING' | 'STRENGTH' | 'WALKING';

export interface ExerciseSet {
  weight: number;
  reps: number;
}

export interface Exercise {
  name: string;
  muscleGroup: string;
  sets: ExerciseSet[];
  volume: number;
}

export interface RunningDetails {
  phase?: string;
  sessionDetails?: string;
  targetPace?: string;
  plannerRun?: string;
  steps?: any[];
}

export interface Workout {
  id: string;
  title: string;
  type: WorkoutType;
  duration: number; // in minutes
  date: Date;
  completed: boolean;
  skipped?: boolean;
  isRace?: boolean;
  runningDetails?: RunningDetails;
  exercises?: Exercise[];
}
