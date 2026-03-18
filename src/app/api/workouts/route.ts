// src/app/api/workouts/route.ts

import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool, { initDB } from './db';

// --- Types (Mirrored from frontend for consistency) ---
type WorkoutType = 'RUNNING' | 'STRENGTH' | 'WALKING';

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

interface Workout {
  id: string;
  title: string;
  type: WorkoutType;
  duration: number;
  date: Date | string;
  completed: boolean;
  skipped?: boolean;
  isRace?: boolean;
  runningDetails?: any;
  exercises?: Exercise[];
}

// --- Zod Schemas ---

const ExerciseSetSchema = z.object({
  weight: z.number(),
  reps: z.number(),
});

const ExerciseSchema = z.object({
  name: z.string(),
  muscleGroup: z.string(),
  sets: z.array(ExerciseSetSchema),
  volume: z.number(),
});

const WorkoutSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  type: z.enum(['RUNNING', 'STRENGTH', 'WALKING']),
  duration: z.number().min(0),
  date: z.string(),
  completed: z.boolean(),
  skipped: z.boolean().optional(),
  isRace: z.boolean().optional(),
  runningDetails: z.any().optional(),
  exercises: z.array(ExerciseSchema).optional(),
});

const WriteWorkoutsSchema = z.array(WorkoutSchema);

const AIWorkoutSchema = z.object({
  workout_type: z.string(),
  workout_name: z.string().optional(),
  scheduled_date: z.string(),
}).passthrough();

const ImportWorkoutsSchema = z.array(AIWorkoutSchema);

// --- Helpers ---

// Single source of truth for volume: always recompute from raw sets.
// This ensures writeDb and importAIWorkouts produce identical values regardless
// of what the client sent in the exercise.volume field.
function computeVolume(exercises: any[]): { exercises: any[]; totalVolume: number } {
  const enriched = exercises.map(ex => {
    const volume = (ex.sets ?? []).reduce(
      (acc: number, s: any) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0),
      0
    );
    return { ...ex, volume };
  });
  const totalVolume = enriched.reduce((acc: number, ex: any) => acc + ex.volume, 0);
  return { exercises: enriched, totalVolume };
}

// --- Database Logic ---

async function readDb(): Promise<Workout[]> {
  const res = await pool.query('SELECT * FROM activities ORDER BY workout_date ASC, id ASC');

  return res.rows.map(row => {
    let exercises: Exercise[] | undefined = undefined;
    let runningDetails: any | undefined = undefined;
    let isRace = false;

    if (row.activity_type === 'RUNNING') {
      runningDetails = row.data;
      isRace = (runningDetails?.workout_name || row.title || '').includes('RACE DAY');
    } else if (Array.isArray(row.data)) {
      exercises = row.data;
    } else if (row.data && typeof row.data === 'object') {
      exercises = row.data.exercises;
      isRace = row.data.isRace;
    }

    return {
      id: row.id.toString(),
      title: row.title,
      type: row.activity_type as WorkoutType,
      duration: row.duration_minutes || 0,
      date: row.workout_date,
      completed: row.is_completed,
      skipped: row.is_skipped,
      isRace,
      runningDetails,
      exercises
    };
  });
}

async function writeDb(data: Workout[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM activities');

    for (const w of data) {
      let dataPayload;
      let totalVolume = 0;
      if (w.type === 'RUNNING') {
        dataPayload = w.runningDetails;
      } else if (w.exercises?.length) {
        const computed = computeVolume(w.exercises);
        dataPayload = { exercises: computed.exercises };
        totalVolume = computed.totalVolume;
      } else {
        dataPayload = { exercises: [] };
      }

      await client.query(`
        INSERT INTO activities (title, activity_type, duration_minutes, is_completed, is_skipped, workout_date, total_volume, data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        w.title,
        w.type,
        w.duration,
        w.completed,
        w.skipped,
        w.date,
        totalVolume,
        JSON.stringify(dataPayload)
      ]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function importAIWorkouts(data: any[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM activities WHERE workout_date >= CURRENT_DATE');

    let i = 0;
    for (const w of data) {
      const rawType = w.workout_type || 'Unknown';
      const activityType = rawType.toUpperCase();
      const title = w.workout_name || 'Untitled Workout';
      const workoutDate = w.scheduled_date;
      const externalId = `gen-${Date.now()}-${i++}`;

      let durationMinutes = 0;
      let totalVolume = 0;
      let dataPayload = w;

      if (activityType === 'RUNNING') {
        let totalMinutes = 0;
        if (w.steps && Array.isArray(w.steps)) {
          w.steps.forEach((s: any) => {
            if (s.duration?.type === 'Time' && typeof s.duration.value === 'string') {
              const parts = s.duration.value.split(':').map(Number);
              if (parts.length === 3) {
                totalMinutes += parts[0] * 60 + parts[1] + parts[2] / 60;
              } else if (parts.length === 2) {
                totalMinutes += parts[0] + parts[1] / 60;
              }
            }
          });
        }
        durationMinutes = Math.round(totalMinutes) || 30;
      } else if (activityType === 'STRENGTH') {
        durationMinutes = 60;
        if (w.exercises && Array.isArray(w.exercises)) {
          const computed = computeVolume(w.exercises);
          dataPayload = { exercises: computed.exercises };
          totalVolume = computed.totalVolume;
        }
      } else if (activityType === 'WALKING') {
        durationMinutes = w.duration || 60;
      }

      await client.query(`
        INSERT INTO activities (
          external_id, title, activity_type, workout_date,
          duration_minutes, is_completed, is_skipped, total_volume, data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        externalId,
        title,
        activityType,
        workoutDate,
        durationMinutes,
        false,
        false,
        totalVolume,
        JSON.stringify(dataPayload)
      ]);
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// --- API Handlers ---

export async function GET() {
  try {
    const workouts = await readDb();
    return NextResponse.json(workouts);
  } catch (error: any) {
    // DB/table not yet created — return empty list so the app still loads on first run
    if (error.code === '3D000' || error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
      return NextResponse.json([]);
    }
    // Connection refused — surface a clear message to the UI
    if (error.code === 'ECONNREFUSED' || error.message?.includes('localhost:5432')) {
      return NextResponse.json({ error: 'PostgreSQL is not running on localhost:5432. Start it and reload.' }, { status: 503 });
    }
    console.error('Database/API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDB();
    const body = await request.json();

    // Detect AI import vs. regular save based on shape of first item
    const isAIImport = Array.isArray(body) && body.length > 0 && body[0].workout_type !== undefined;

    if (isAIImport) {
      const parsed = ImportWorkoutsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid AI workout data', details: parsed.error.flatten() }, { status: 400 });
      }
      await importAIWorkouts(parsed.data);
    } else {
      const parsed = WriteWorkoutsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid workout data', details: parsed.error.flatten() }, { status: 400 });
      }
      await writeDb(parsed.data as Workout[]);
    }

    const workouts = await readDb();
    return NextResponse.json(workouts);
  } catch (error: any) {
    console.error('Database/API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
