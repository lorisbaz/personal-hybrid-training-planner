## Instructions
I want you to act as my expert strength trainer coach specialized into training for long term longevity and physical health. Your mission is to get me in the best shape possible to achieve my next goal. I want you to first understand my targets and then understand my health and sport state. Then, create a strength training plan for the next weeks following my preferences described below. I provided a list of execises in the list below; you must choose exercises. Each week must repeat the same exercises for the given day of the week and for the whole duration of the training. Note that this strength training plan is in addition to a running plan that I already have; so be considerate to not overtrain me.

You must output exclusively a json structure (as defined below). No additional explanation od description should be added. Keep structure and indentation within the json.

## Targets
- Strength training targets: $STRENGTH_TRAINING_TARGETS
- Long-term: 
    - Improve general fitness and cardiovascular health
    - Improve lower body strength for running 

## Additional constraints
- Total duration of training **must be 8 weeks**
- Maximum 2 exercises per muscle group. The exercises must remain consistent for the full weeks to allow for measurable progress.
- Running-specific low body sessions: focus on what helps for running. E.g., prioritize unilateral exercises (e.g., Bulgarian Split Squats, Single-Leg Deadlifts) to fix muscle imbalances and improve running economy. Ensure a 2:1 ratio of pulling (Back/Hamstrings) to pushing (Chest/Quads) movements to maintain posture.
- You are only allow to change the volume of each set over the weeks, if needed. Use common practices depending of the "strength training targets" defined above.
- Given the running plan, avoid 'failure' sets. Keep a RPE (Rate of Perceived Exertion) of 7-8.
- Every session must include at least one 'hinge' or 'pull' movement to balance the repetitive 'push' nature of running.

## Additional constraints
- I prefer machines (vs. full-body or dumbells)
- My favourite exercises are: Machine Chest Press;  Dumbbell Flat Bench Press;  Machine Shoulder Press; Cable Rope Triceps Push-Down; Bodyweight Ab Crunch; Machine Lateral Pulldown; Machine Row (Wide Grip); Dumbbell Alternate Biceps Curl; Machine Seated Leg Press; Machine Laying Leg Curl; Machine Seated Leg Extension; Machine Hip Adduction. Try to incorporate them in the plan.


## My health and sport state
- Age: $AGE
- Weight: $WEIGHT Kg 
- Height: $HEIGHT cm 
- Sport history: $SPORT_HISTORY
- Strength training experience: $STRENGTH_TRAINING_EXPERIENCE 
- Past injuries: ___
- Work & lifestyle: $WORK_LIFESTYLE 
- Strength training days: $PREFERRED_STRENGTH_TRAINING_DAYS

## Output format
Today is $TODAY_DATE giving us a total of 8 weeks for training. Each day that I train must have a strength training activity, which should also be an entry of the list in the json structure. These are the fields of the json structure you must follow for each activity:

### 1. Top-Level Structure (The Workout)
The root object defines the identity of the session.
* **`workout_type`**: (String) The activity category. From your snippet: `Strength`.
* **`workout_name`**: (String) A unique name to provide to the user to have an high level idea about the type of session of that day.
* **`scheduled_date`**: (String) The date of the workout in format `YYYY-MM-DD`.
* **`exercises`**: (Array) A chronological list of `execises` objects.

### 2. The Exercise Object
Each entry in the `execises` array represents a distinct exercise. Every exercise must contain the following components: 
* **`name`**: (String) The name of the exercise. This must be an execise name from the list of strength training execises reported below. 
* **`muscleGroup`**: (String) The muscle group corresponding to the exercise in `name`. This must be a muscle group name from the list of strength training execises reported below. 
* **`sets`**: (List) The list of sets for this exercise.  
    * **`reps`**: (Integer) The number of reps per set.
    * **`weight`**: (Integer) The weigth for the set. 

### 3. Instructions for Automation

To ensure the JSON is valid for your `WorkoutBuilder` class, follow these logic rules during generation:
1. **Date Handling**: If the filename or name includes a date, use the `ISO 8601` format (`YYYY-MM-DD`) to match the `scheduleDate` variable.


### List of strength training execises for each muscle group 
```json 
{
    "Quadriceps": [
        "Barbell Box Squat",
        "Barbell Bulgarian Split-Squat",
        "Barbell Front Squat",
        "Barbell Jump Squat",
        "Barbell Squat",
        "Barbell Standing Lunge",
        "Barbell Step Up",
        "Barbell Walking Lunge",
        "Body Weight Bulgarian Split-Squat",
        "Body Weight Pistol Squat",
        "Body Weight Squat",
        "Body Weight Standing Lunge",
        "Body Weight Step Up",
        "Body Weight Walking Lunge",
        "Dumbbell Body Weight Squat",
        "Dumbbell Bulgarian Split-Squat",
        "Dumbbell Goblet Squat",
        "Dumbbell Standing Lunge",
        "Dumbbell Step Up",
        "Dumbbell Walking Lunge",
        "Machine Hack Squat",
        "Machine Laying Leg Press",
        "Machine Leg Press",
        "Machine Seated Leg Press",
        "Machine Single-Leg Press",
        "Machine Seated Leg Extension"
    ],
    "Glutes_Hamstrings": [
        "Barbell Deadlift",
        "Barbell Deadlifts from Blocks",
        "Barbell Deadlifts from Deficit",
        "Barbell Glute Bridge",
        "Barbell Hip Thrust",
        "Barbell Romanian Deadlift",
        "Barbell Stiff-Legged Deadlift",
        "Barbell Sumo Deadlift",
        "Body Weight Glute-Ham Raise",
        "Cable One-Legged Kickback",
        "Cable Pull Through",
        "Dumbbell Glute Bridge",
        "Dumbbell Hip Thrust",
        "Dumbbell Romanian Deadlift",
        "Dumbbell Stiff-Legged Deadlift",
        "Machine Glute-Ham Raise",
        "Machine Laying Leg Curl",
        "Machine Reverse Hyperextension",
        "Machine Seated Leg Curl",
        "Machine Standing Leg Curl",
        "Machine Hip Abduction",
        "Machine Hip Adduction"
    ],
    "Calves": [
        "Barbell Calf Raise",
        "Dumbbell Calf Raise",
        "Machine Calf Extension (Seated)",
        "Machine Calf Raise",
        "Machine Leg Press Calf Extension (Seated/Laying)"
    ],
    "Chest": [
        "Barbell Decline Bench Press",
        "Barbell Flat Bench Press",
        "Barbell Incline Bench Press",
        "Body Weight Decline Push-Up",
        "Body Weight Dip (Chest Variation)",
        "Body Weight Incline Push-Up",
        "Body Weight Push-Up",
        "Cable Chest Press (Seated)",
        "Cable Chest Press (Standing)",
        "Cable Crossover",
        "Cable Crossover (High Angle)",
        "Cable Crossover (Low Angle)",
        "Cable Flat Bench Fly",
        "Cable Incline Bench Fly",
        "Cable Incline Bench Press",
        "Dumbbell Decline Bench Fly",
        "Dumbbell Decline Bench Press",
        "Dumbbell Flat Bench Fly",
        "Dumbbell Flat Bench Press",
        "Dumbbell Incline Bench Fly",
        "Dumbbell Incline Bench Press",
        "Machine Assisted Dip (Chest Variation)",
        "Machine Butterfly",
        "Machine Chest Press",
        "Machine Decline Chest Press",
        "Machine Incline Chest Press",
        "Smith Machine Bench Press",
        "Smith Machine Decline Chest Press",
        "Smith Machine Incline Bench Press",
        "Weighted Decline Push-Up",
        "Weighted Dip (Chest Variation)",
        "Weighted Incline Push-Up",
        "Weighted Push-Up"
    ],
    "Back": [
        "Barbell Bent Over Row",
        "Barbell Chest-Supported T-Bar Row",
        "Barbell Incline Bench Row",
        "Barbell One-Arm Row",
        "Barbell Pendlay Row",
        "Barbell Reverse Grip Bent Over",
        "Barbell Shrug",
        "Barbell T-Bar Row",
        "Body Weight Back Extension",
        "Body Weight Inverted Row",
        "Body Weight Pull-Up",
        "Cable Narrow-Grip Lat Pull-Down",
        "Cable One-Arm Lat Pull-Down",
        "Cable One-Arm Row (Seated)",
        "Cable Reverse-Grip Lat Pull-Down",
        "Cable Row (Seated)",
        "Cable Straight-Arm Pull-Down",
        "Cable V-Bar Lat Pull-Down",
        "Cable Wide-Grip Lat Pull-Down",
        "Dumbbell Bent Over Row",
        "Dumbbell Incline Bench Row",
        "Dumbbell One-Arm Row",
        "Dumbbell Reverse Grip Bent Over",
        "Dumbbell Shrug",
        "Machine Assisted Pull-Up",
        "Machine Back Extension",
        "Machine Chest Supported Row",
        "Machine Iso Row",
        "Machine Shrug",
        "Smith Machine Bent Over Row",
        "Weighted Pull-Up",
        "Machine Lateral Pulldown",
        "Machine Row (Wide Grip)"
    ],
    "Shoulders": [
        "Barbell Front Raise",
        "Barbell One-Arm Linear Jammer",
        "Barbell Push Press",
        "Barbell Seated Shoulder Press",
        "Barbell Standing Shoulder Press",
        "Barbell Upright Row",
        "Body Weight Handstand Push-Up",
        "Body Weight Pike Push-Up",
        "Cable Face Pull",
        "Cable Front Raise",
        "Cable Lateral Raise",
        "Cable Rear Delt Fly",
        "Cable Shoulder Press (Seated)",
        "Cable Standing Shoulder Press (Standing)",
        "Cable Upright Row",
        "Dumbbell Arnold Press",
        "Dumbbell Front Raise",
        "Dumbbell One-Arm Lateral Raise",
        "Dumbbell Rear Delt Raise",
        "Dumbbell Reverse Fly",
        "Dumbbell Seated Shoulder Press",
        "Dumbbell Side Lateral Raise",
        "Dumbbell Standing One-Arm Press",
        "Dumbbell Standing Shoulder Press",
        "Dumbbell Upright Row",
        "Machine Lateral Raise",
        "Machine Reverse Fly",
        "Machine Shoulder Press",
        "Machine Upright Row",
        "Smith Machine Shoulder Press",
        "Machine Rear Delt Fly"
    ],
    "Triceps": [
        "Barbell Close-Grip Bench Press",
        "Barbell Decline Bench Triceps Extension",
        "Barbell Flat Bench Triceps Extension",
        "Barbell Incline Bench Triceps Extension",
        "Barbell Overhead Triceps Extension",
        "Body Weight Bench Dip",
        "Body Weight Dips (Triceps Variation)",
        "Cable Decline Bench Triceps Extension",
        "Cable Flat Bench Triceps Extension",
        "Cable Incline Bench Triceps Extension",
        "Cable One-Arm Overhead Triceps Extension",
        "Cable Overhead Triceps Extension",
        "Cable Reverse-Grip Triceps Push-Down",
        "Cable Rope Triceps Push-Down",
        "Cable Straight-Bar Triceps Push-Down",
        "Cable Triceps Kickback",
        "Cable V-Bar Triceps Push-Down",
        "Dumbbell Bent Over Triceps Extension",
        "Dumbbell Close-Grip Bench Press",
        "Dumbbell Decline Bench Triceps Extension",
        "Dumbbell Flat Bench Triceps Extension",
        "Dumbbell Incline Bench Triceps Extension",
        "Dumbbell One-Arm Overhead Triceps Extension",
        "Dumbbell Overhead Triceps Extension",
        "Dumbbell Triceps Kickback",
        "Machine Assisted Dips (Triceps Variation)",
        "Machine Triceps Extension",
        "Smith Machine Close-Grip Bench Press",
        "Weighted Bench Dip",
        "Weighted Dips (Triceps Variation)",
        "Dumbbell Incline Skull Crushers"
    ],
    "Biceps": [
        "Barbell Close-Grip Biceps Curl",
        "Barbell Concentration Biceps Curl",
        "Barbell Preacher Biceps Curl",
        "Barbell Regular-Grip Biceps Curl",
        "Barbell Reverse-Grip Biceps Curl",
        "Barbell Wide-Grip Biceps Curl",
        "Body Weight Chin-Up",
        "Cable Bar Biceps Curl",
        "Cable Incline Bench Biceps Curl",
        "Cable One-Arm Biceps Curl",
        "Cable Overhead Curl",
        "Cable Rope Biceps Curl",
        "Dumbbell Alternate Biceps Curl",
        "Dumbbell Concentration Biceps Curl",
        "Dumbbell Hammer Biceps Curl",
        "Dumbbell Incline Bench Biceps Curl",
        "Dumbbell One-Arm Biceps Curl",
        "Dumbbell Preacher Biceps Curl",
        "Dumbbell Reverse-Grip Biceps Curl",
        "Dumbbell Reverse-Grip Biceps Curl",
        "Machine Assisted Chin-Up",
        "Machine Biceps Curl",
        "Machine Preacher Biceps Curl",
        "Weighted Chin-Up"
    ],
    "Abs": [
        "Barbell Plate Ab Twist",
        "Body Weight Ab Crunch",
        "Body Weight Hanging Leg Raise",
        "Body Weight Plank",
        "Dumbbell Ab Twist",
        "Machine Ab Crunch",
        "Weighted Hanging Leg Raise",
        "Weighted Plank"
    ],
    "Other": [
        "Barbell Wrist Curl",
        "Dumbbell Wrist Curl",
        "Neck Curl",
        "Neck Extension"
    ]
}
```


### Example of Json output

```json 
[
{"workout_type": "Strength",
"workout_name": "Push Chest, Shoulders, Triceps + Core",
"scheduled_date": "2026-03-16",
"exercises": [{"name": "Machine Lateral Pulldown", "sets": [{"reps": 10, "weight": 30}, {"reps": 9, "weight": 40}, {"reps": 7, "weight": 45}], "muscleGroup": "Back"}, {"name": "Machine Row (Wide Grip)", "sets": [{"reps": 9, "weight": 35}, {"reps": 8, "weight": 40}, {"reps": 8, "weight": 40}], "muscleGroup": "Back"}, {"name": "Machine Rear Delt Fly", "sets": [{"reps": 8, "weight": 15}, {"reps": 8, "weight": 15}, {"reps": 6, "weight": 15}], "muscleGroup": "Shoulders"}, {"name": "Dumbbell Alternate Biceps Curl", "sets": [{"reps": 10, "weight": 20}, {"reps": 8, "weight": 24}, {"reps": 6, "weight": 24}], "muscleGroup": "Biceps"}, {"name": "Barbell Preacher Biceps Curl", "sets": [{"reps": 0, "weight": 19.5}, {"reps": 0, "weight": 22}, {"reps": 0, "weight": 22}], "muscleGroup": "Biceps"}, {"name": "Bodyweight Ab Crunch", "sets": [{"reps": 20, "weight": 10}, {"reps": 20, "weight": 10}, {"reps": 20, "weight": 10}], "muscleGroup": "Abs"}]},
{"workout_type": "Strength",
"workout_name": "Pull Back, Biceps + Core",
"scheduled_date": "2026-03-18",
"exercises": [{"name": "Machine Chest Press", "sets": [{"reps": 10, "weight": 30}, {"reps": 10, "weight": 40}, {"reps": 9, "weight": 40}], "muscleGroup": "Chest"}, {"name": "Dumbbell Flat Bench Press", "sets": [{"reps": 10, "weight": 24}, {"reps": 10, "weight": 24}, {"reps": 8, "weight": 28}], "muscleGroup": "Chest"}, {"name": "Machine Shoulder Press", "sets": [{"reps": 8, "weight": 17.5}, {"reps": 7, "weight": 17.5}, {"reps": 7, "weight": 17.5}], "muscleGroup": "Shoulders"}, {"name": "Dumbbell Side Lateral Raise", "sets": [{"reps": 10, "weight": 10}, {"reps": 10, "weight": 14}, {"reps": 8, "weight": 16}], "muscleGroup": "Shoulders"}, {"name": "Cable Rope Triceps Push-Down", "sets": [{"reps": 10, "weight": 12.5}, {"reps": 10, "weight": 15}, {"reps": 8, "weight": 17.5}], "muscleGroup": "Triceps"}, {"name": "Bodyweight Ab Crunch", "sets": [{"reps": 20, "weight": 10}, {"reps": 20, "weight": 10}, {"reps": 20, "weight": 10}], "muscleGroup": "Abs"}]}
]
```