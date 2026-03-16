// src/app/api/workouts/route.ts

import { NextResponse } from 'next/server';
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
  date: Date | string; // Date on server, string in JSON
  completed: boolean;
  skipped?: boolean;
  isRace?: boolean;
  runningDetails?: any;
  exercises?: Exercise[];
}

// --- Database Logic ---

async function readDb(): Promise<Workout[]> {
  const res = await pool.query('SELECT * FROM activities ORDER BY workout_date ASC, id ASC');
  
  return res.rows.map(row => {
    // Handle 'data' column which might be just an array of exercises (from migration) 
    let exercises: Exercise[] | undefined = undefined;
    let runningDetails: any | undefined = undefined;
    let isRace = false;

    if (row.activity_type === 'RUNNING') {
      // For running workouts, the `data` column holds the raw plan object.
      // We pass this raw object to the frontend via `runningDetails`.
      runningDetails = row.data;
      isRace = (runningDetails?.workout_name || row.title || '').includes('RACE DAY');
    } else if (Array.isArray(row.data)) {
      // Legacy support for old strength migrations where data was just the exercises array.
      exercises = row.data;
    } else if (row.data && typeof row.data === 'object') {
      // For STRENGTH/WALKING, data is a wrapped object from previous saves.
      exercises = row.data.exercises;
      isRace = row.data.isRace; // isRace might be on old strength/walk wrappers
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
    // Full sync strategy: Clear and Insert. 
    // This ensures the DB exactly matches the frontend state, handling deletions and re-ordering.
    await client.query('DELETE FROM activities');

    for (const w of data) {
      let dataPayload;
      if (w.type === 'RUNNING') {
        // For running workouts, `runningDetails` holds the raw data object. Write it back.
        dataPayload = w.runningDetails;
      } else {
        // For other types, construct a wrapper for exercises.
        dataPayload = { exercises: w.exercises };
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
        w.exercises ? w.exercises.reduce((acc, ex) => acc + ex.volume, 0) : 0,
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
    // We are generating a brand new plan, so clear existing future plans
    // Keep past activities (older than today)
    await client.query('DELETE FROM activities WHERE workout_date >= CURRENT_DATE');
    
    let i = 0;
    for (const w of data) {
      const rawType = w.workout_type || 'Unknown';
      const activityType = rawType.toUpperCase();
      const title = w.workout_name || 'Untitled Workout';
      const workoutDate = w.scheduled_date; // Assumes YYYY-MM-DD
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
        durationMinutes = 60; // Default duration for strength
        if (w.exercises && Array.isArray(w.exercises)) {
          const enrichedExercises = w.exercises.map((ex: any) => {
            let exVolume = 0;
            if (ex.sets && Array.isArray(ex.sets)) {
              ex.sets.forEach((set: any) => {
                exVolume += (Number(set.weight) || 0) * (Number(set.reps) || 0);
              });
            }
            return { ...ex, volume: exVolume };
          });
          dataPayload = { exercises: enrichedExercises };
          totalVolume = enrichedExercises.reduce((acc: number, ex: any) => acc + ex.volume, 0);
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
    // If the database or table doesn't exist yet, return an empty array
    if (error.code === '3D000' || error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
      return NextResponse.json([]);
    }
    console.error('Database/API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDB();
    const body = await request.json();
    
    if (Array.isArray(body) && body.length > 0 && body[0].workout_type) {
      await importAIWorkouts(body);
    } else {
      await writeDb(body);
    }
    
    const workouts = await readDb(); // Return the fresh state with correct IDs
    return NextResponse.json(workouts); // Return full list instead of just success
  } catch (error: any) {
    console.error('Database/API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
