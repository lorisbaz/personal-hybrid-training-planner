import { NextResponse } from 'next/server';
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

export async function POST(request: Request) {
    try {
        const { id, email, password } = await request.json();
        
        if (!id) {
            return NextResponse.json({ error: 'Workout ID is required' }, { status: 400 });
        }

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
    
    // Fallback to env var if keychain fails or isn't set
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

    // Try to reuse session tokens to avoid repeated logins
    try {
        // Note: usage of local file system for tokens works locally but may need adjustment for serverless deployment
        if (typeof window === 'undefined') { 
             // Ensure we are on server
            GCClient.loadTokenByFile('.tokens'); // Uncomment if you want file persistence
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
};

export async function addRunningWorkout(GCClient: GarminConnect, workoutDataDB: any) {
    const scheduleDate = new Date(workoutDataDB.workout_date);
    scheduleDate.setHours(scheduleDate.getHours()+10) // HACK: since the time start from 11PM, move it to 9AM
    console.log(scheduleDate)
    const workoutData = workoutDataDB.data
    console.log(`Creating and scheduling workout: "${workoutData.workout_name}" for ${scheduleDate.toISOString().split('T')[0]}`);
    

    const wb = new WorkoutBuilder(
        WorkoutType.Running,
        workoutData.workout_name
    );

    for (const step of workoutData.steps) {
        // 1. Map Step Type
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

        // 2. Map Duration
        let duration: any = new NoTarget();
        if (step.duration?.type === 'Time') {
            const val = step.duration.value || "00:00:00";
            const [h, m, s] = val.split(':').map(Number);
            duration = TimeDuration.hhmmss(h, m, s);
        }

        // 3. Map Target
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
        scheduleDate.toISOString()
    );

    console.log(`✅ Scheduled for ${scheduleDate.toISOString().split('T')[0]}`);
    return GCWorkout.workoutId;
}