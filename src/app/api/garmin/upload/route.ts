import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '../../workouts/db';
import { getPassword, setPassword } from 'cross-keychain';
import {
    GarminConnect,
    HrmZoneTarget,
    PaceTarget,
    TimeDuration,
    WorkoutBuilder,
    Step,
    NoTarget,
    StepType,
    WorkoutType
} from '@flow-js/garmin-connect';

const GarminUploadSchema = z.object({
    id: z.string().min(1),
    email: z.string().email().optional(),
    password: z.string().optional(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = GarminUploadSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request data', details: parsed.error.flatten() }, { status: 400 });
        }

        const { id, email, password } = parsed.data;

        const client = await pool.connect();
        let workoutDataDB;

        try {
            const res = await client.query(
                `SELECT title, workout_date, data
                 FROM activities
                 WHERE id = $1 AND activity_type = 'RUNNING'`,
                [id]
            );

            if (res.rows.length === 0) {
                return NextResponse.json({ error: 'Workout not found or not a running activity' }, { status: 404 });
            }

            workoutDataDB = res.rows[0];
        } finally {
            client.release();
        }

        const GCClient = await connectGarminClient(email, password);
        const garminId = await addRunningWorkout(GCClient, workoutDataDB);

        return NextResponse.json({ success: true, garminId });

    } catch (error: any) {
        console.error('Garmin Upload Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function connectGarminClient(email?: string, providedPassword?: string) {
    let password: string | null | undefined = providedPassword;
    const garminEmail = email || process.env.GARMIN_EMAIL;

    if (!password && garminEmail) {
        try {
            password = await getPassword('garmin-app', garminEmail);
        } catch (e) {
            console.warn("Keychain access failed, checking env vars");
        }
    }

    if (!password) {
        password = process.env.GARMIN_PASSWORD;
    }

    if (!password) {
        throw new Error("Password not found in Keychain or GARMIN_PASSWORD env var.");
    }

    if (!garminEmail) {
        throw new Error("Garmin email not provided. Please update your profile settings.");
    }

    const GCClient = new GarminConnect({
        username: garminEmail,
        password: password
    });

    try {
        if (typeof window === 'undefined') {
            GCClient.loadTokenByFile('.tokens');
        }
    } catch (error) {
        await GCClient.login();
        GCClient.exportTokenToFile('.tokens');
        console.log('Token reuse failed, proceeding to login.');
    }

    if (providedPassword) {
        try {
            await setPassword('garmin-app', garminEmail, providedPassword);
        } catch (e) {
            console.error('Failed to save password to keychain:', e);
        }
    }

    return GCClient;
}

export async function addRunningWorkout(GCClient: GarminConnect, workoutDataDB: any) {
    // Build the schedule date using local date methods so the correct calendar day
    // is used regardless of the machine's UTC offset (avoids the old +10hr hack).
    // Garmin requires a datetime string, so we append 09:00:00 as a neutral morning time.
    const d = new Date(workoutDataDB.workout_date);
    const localDateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
    ].join('-');
    const scheduleDate = `${localDateStr}T09:00:00`;
    const workoutData = workoutDataDB.data;
    console.log(`Creating and scheduling workout: "${workoutData.workout_name}" for ${scheduleDate}`);

    const wb = new WorkoutBuilder(
        WorkoutType.Running,
        workoutData.workout_name
    );

    for (const step of workoutData.steps) {
        let stepType = StepType.Run;
        const typeMap: Record<string, any> = {
            'WarmUp': StepType.WarmUp,
            'Run': StepType.Run,
            'Recovery': StepType.Recovery,
            'Rest': StepType.Rest,
            'CoolDown': StepType.Cooldown
        };
        if (typeMap[step.type]) {
            stepType = typeMap[step.type];
        }

        let duration: any = new NoTarget();
        if (step.duration?.type === 'Time') {
            const val = step.duration.value || "00:00:00";
            const [h, m, s] = val.split(':').map(Number);
            duration = TimeDuration.hhmmss(h, m, s);
        }

        let target: any = new NoTarget();
        if (step.target?.type === 'Pace') {
            const val = step.target.value || "05:00";
            const [m, s] = val.split(':').map(Number);
            target = PaceTarget.pace(m, s, step.target.tolerance || 10);
        } else if (step.target?.type === 'HrmZoneTarget') {
            target = new HrmZoneTarget(step.target.zone);
        }

        wb.addStep(new Step(stepType, duration, target, step.note || ''));
    }

    const workout = wb.build();
    const GCWorkout = await GCClient.createWorkout(workout);

    await GCClient.scheduleWorkout(
        { workoutId: String(GCWorkout.workoutId) },
        scheduleDate
    );

    console.log(`✅ Scheduled for ${scheduleDate}`);
    return GCWorkout.workoutId;
}
