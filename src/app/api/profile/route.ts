import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool, { initDB } from '../workouts/db';

const ProfileSchema = z.object({
  name: z.string(),
  age: z.string(),
  weight: z.string(),
  height: z.string(),
  raceDistance: z.string().optional(),
  raceTarget: z.string().optional(),
  raceDate: z.string().optional(),
  vo2max: z.string().optional(),
  lactateHr: z.string().optional(),
  lactatePace: z.string().optional(),
  lactatePower: z.string().optional(),
  sportHistory: z.array(z.string()),
  runningExperience: z.string(),
  strengthExperience: z.string(),
  workLifestyle: z.string().optional(),
  weeklyAvailability: z.string(),
  trainingBaseline: z.string(),
  longestRun: z.string(),
  runDays: z.array(z.string()),
  longRunDay: z.string().optional(),
  walkDays: z.array(z.string()),
  strengthDays: z.array(z.string()),
  strengthTargets: z.array(z.string()),
  hardSessions: z.string(),
}).passthrough();

export async function GET() {
  try {
    await initDB();
    const res = await pool.query('SELECT data FROM user_profile ORDER BY id DESC LIMIT 1');
    if (res.rows.length === 0) {
      return NextResponse.json(null);
    }
    return NextResponse.json(res.rows[0].data);
  } catch (error: any) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDB();
    const body = await request.json();

    const parsed = ProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid profile data', details: parsed.error.flatten() }, { status: 400 });
    }

    // Single-user app: replace the one profile row
    await pool.query('DELETE FROM user_profile');
    await pool.query('INSERT INTO user_profile (data) VALUES ($1)', [JSON.stringify(parsed.data)]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Profile POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
