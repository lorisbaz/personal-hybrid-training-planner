## Instructions
I want you to act as my expert running coach specialized into training for long term longevity and physical health. Your mission is to get me in the best shape possible to achieve my next goal. I want you to first understand my targets and then understand my health and sport state. Then, create a running plan to the goal race date following my preferences described below. Be particoularly attentive of the VO2-Max and Lactate Threshold which can guide you to calibrate how to push myself, while not overtraining.

You must output exclusively a json structure (as defined below). No additional explanation od description should be added. Keep structure and indentation within the json.

## Targets
- Race distance: $RACE_DISTANCE Km
- Race time: $RACE_TIME minutes
- Race date: $DATE_DATE
- After the race: add a week of recovery with low-effort easy running
- Long-term: 
    - Improve endurance and VO2-Max
    - Run an half marathon
    - Improve general fitness and cardiovascular health

## My health and sport state
- Age: $AGE
- Weight: $WEIGHT Kg 
- Height: $HEIGHT cm 
- VO2-Max: $VO2_MAX
- Lactate Threshold: 
    - Heart Rate: $HR bpm
    - Pace: $PACE min/Km
    - Power: $POWER W
- Sport history: $SPORT_HISTORY
- Running experience: $RUNNING_EXPERIENCE 
- Past injuries: ___
- Work & lifestyle: $WORK_LIFESTYLE 
- Current training baseline (last 4 weeks): $CURRENT_BASELINE
- Longest run: $LONGEST_RUN Km
- Run days: $PREFERRED_RUN_DAYS
- Long run day: $PREFERRED_LONG_RUN_DAY
- Hard run sessions: $HARD_RUN_SESSIONS per week

## Output format
The planned output should be put in a json format that is compantible with Garmin's Node.js wrapper garmin-connect: https://www.npmjs.com/package/@flow-js/garmin-connect 

Today is $TODAY_DATE and the race is on $DATE_DATE, giving us a total of $NUMBER_OF_WEEKS_TO_RACE weeks for training. Each day that I run must have a running activity, which should also be an entry of the list in the json structure. These are the fields of the json structure you must follow for each activity:

### 1. Top-Level Structure (The Workout)
The root object defines the identity of the session.
* **`workout_type`**: (String) The activity category. From your snippet: `Running`.
* **`workout_name`**: (String) A unique identifier or timestamped string. Note: the day of the race must include "RACE DAY" in the name.
* **`scheduled_date`**: (String) The date of the workout in format `YYYY-MM-DD`.
* **`steps`**: (Array) A chronological list of `Step` objects.

### 2. The Step Object
Each entry in the `steps` array represents a distinct phase of the run. Every step must contain the following four components:
#### A. Step Classification (`StepType`)
Defines the intent of the interval.
* **Options**: `WarmUp`, `Run`, `Recovery`, `CoolDown`, `Rest`.

#### B. Duration (`Duration`)
Defines when the step ends. This is a polymorphic object with two primary types:
* **`TimeDuration`**:
* `value`: Seconds or HH:MM:SS format.
* *Instruction*: Use `fromSeconds` for short sprints and `hhmmss` for long-form endurance.
* **`HeartRateDuration`**:
* `condition`: (e.g., `greaterThan`).
* `value`: Beats per minute (BPM).

#### C. Intensity Target (`Target`)

Defines the "goal" or "bound" for the athlete during the step.
* **`NoTarget`**: Use when the effort is perceived (RPE) or unstructured.
* **`PaceTarget`**:
* `value`: Target pace (min/km).
* `tolerance`: Buffer range in seconds (e.g., $\pm 10$ seconds).
* **`HrmZoneTarget`**:
* `zone`: Integer (1 through 5) representing the specific HR zone.

#### D. Metadata
* **`note`**: (String) Instructions that appear on the watch/device display for the user.

### 3. Hierarchical Schema Map

| Level | Field | Description | Example Values |
| --- | --- | --- | --- |
| **0** | `workout_type` | Global activity type | `Running` |
| **0** | `workout_name` | The title of the session | `Run 2026-03-11` |
| **1** | `steps[]` | List of workout intervals | `[Step1, Step2, ...]` |
| **2** | `type` | The phase of the step | `WarmUp`, `Recovery` |
| **2** | `duration` | The "Exit" criteria | `{ type: "Time", value: 45 }` |
| **2** | `target` | The "Constraint" criteria | `{ type: "Pace", min: "5:20", max: "5:40" }` |
| **2** | `note` | Display text | `"Keep it steady"` |


### 4. Instructions for Automation

To ensure the JSON is valid for your `WorkoutBuilder` class, follow these logic rules during generation:
1. **Date Handling**: If the filename or name includes a date, use the `ISO 8601` format (`YYYY-MM-DD`) to match the `scheduleDate` variable.
2. **Duration Logic**:
* If the duration is **Condition-based** (e.g., "Until HR is X"), use `HeartRateDuration`.
* If the duration is **Clock-based**, use `TimeDuration`.
3. **Target Priority**:
* If the step is a `Recovery` or `WarmUp`, default to `NoTarget` unless a specific zone is required.
* For `Run` types, prioritize `PaceTarget` for intervals and `HrmZoneTarget` for threshold/tempo runs.
4. **Tolerance**: Always include a $\pm$ integer for `PaceTarget` to prevent the device from constantly "beeping" at the athlete for minor fluctuations.



### Example of Json output

```json 
[
{
"workout_type": "Running",
"workout_name": "Intervals: VO2-Max Push",
"scheduled_date": "2026-03-12",
"steps": [
{
"type": "WarmUp",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" },
"note": "Focus on dynamic hip mobility and calf activation."
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:03:00" },
"target": { "type": "Pace", "value": "05:15", "tolerance": 10 },
"note": "Interval 1/5: Hard effort."
},
{
"type": "Recovery",
"duration": { "type": "Time", "value": "00:02:00" },
"target": { "type": "NoTarget" },
"note": "Light jog or walk."
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:03:00" },
"target": { "type": "Pace", "value": "05:15", "tolerance": 10 },
"note": "Interval 2/5."
},
{
"type": "Recovery",
"duration": { "type": "Time", "value": "00:02:00" },
"target": { "type": "NoTarget" },
"note": "Light jog or walk."
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:03:00" },
"target": { "type": "Pace", "value": "05:15", "tolerance": 10 },
"note": "Interval 3/5."
},
{
"type": "Recovery",
"duration": { "type": "Time", "value": "00:02:00" },
"target": { "type": "NoTarget" },
"note": "Light jog or walk."
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:03:00" },
"target": { "type": "Pace", "value": "05:15", "tolerance": 10 },
"note": "Interval 4/5."
},
{
"type": "Recovery",
"duration": { "type": "Time", "value": "00:02:00" },
"target": { "type": "NoTarget" },
"note": "Light jog or walk."
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:03:00" },
"target": { "type": "Pace", "value": "05:15", "tolerance": 10 },
"note": "Interval 5/5."
},
{
"type": "CoolDown",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" },
"note": "Gentle cool down. Stretch calves well."
}
]
},
{
"workout_type": "Running",
"workout_name": "Long Aerobic Base",
"scheduled_date": "2026-03-14",
"steps": [
{
"type": "WarmUp",
"duration": { "type": "Time", "value": "00:05:00" },
"target": { "type": "NoTarget" },
"note": "Ease into the movement."
},
{
"type": "Run",
"duration": { "type": "Time", "value": "01:05:00" },
"target": { "type": "HrmZoneTarget", "zone": 2 },
"note": "Keep effort conversational. Stop immediately if hip pain increases."
},
{
"type": "CoolDown",
"duration": { "type": "Time", "value": "00:05:00" },
"target": { "type": "NoTarget" },
"note": "Walk it out."
}
]
},
{
"workout_type": "Running",
"workout_name": "Recovery Run",
"scheduled_date": "2026-03-16",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "00:40:00" },
"target": { "type": "HrmZoneTarget", "zone": 1 },
"note": "Very easy recovery pace. Focus on light footfalls."
}
]
},
{
"workout_type": "Running",
"workout_name": "Threshold Tempo",
"scheduled_date": "2026-03-19",
"steps": [
{
"type": "WarmUp",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" },
"note": "Warm up thoroughly."
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:25:00" },
"target": { "type": "Pace", "value": "05:45", "tolerance": 10 },
"note": "Sustained threshold effort."
},
{
"type": "CoolDown",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" },
"note": "Relaxed finish."
}
]
},
{
"workout_type": "Running",
"workout_name": "Long Run: Endurance Build",
"scheduled_date": "2026-03-21",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "01:15:00" },
"target": { "type": "HrmZoneTarget", "zone": 2 },
"note": "Steady state on road or trail. Monitor right calf."
}
]
},
{
"workout_type": "Running",
"workout_name": "Easy Monday",
"scheduled_date": "2026-03-23",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "00:45:00" },
"target": { "type": "HrmZoneTarget", "zone": 2 },
"note": "Low intensity."
}
]
},
{
"workout_type": "Running",
"workout_name": "Intervals: Speed Endurance",
"scheduled_date": "2026-03-26",
"steps": [
{
"type": "WarmUp",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" }
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:04:00" },
"target": { "type": "Pace", "value": "05:20", "tolerance": 10 },
"note": "Repeat 4x with 90s recovery jog between."
},
{
"type": "Recovery",
"duration": { "type": "Time", "value": "00:01:30" },
"target": { "type": "NoTarget" }
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:04:00" },
"target": { "type": "Pace", "value": "05:20", "tolerance": 10 }
},
{
"type": "Recovery",
"duration": { "type": "Time", "value": "00:01:30" },
"target": { "type": "NoTarget" }
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:04:00" },
"target": { "type": "Pace", "value": "05:20", "tolerance": 10 }
},
{
"type": "Recovery",
"duration": { "type": "Time", "value": "00:01:30" },
"target": { "type": "NoTarget" }
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:04:00" },
"target": { "type": "Pace", "value": "05:20", "tolerance": 10 }
},
{
"type": "CoolDown",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" }
}
]
},
{
"workout_type": "Running",
"workout_name": "Peak Long Run",
"scheduled_date": "2026-03-28",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "01:25:00" },
"target": { "type": "HrmZoneTarget", "zone": 2 },
"note": "12-13km target distance. Stay consistent."
}
]
},
{
"workout_type": "Running",
"workout_name": "Aerobic Maintenance",
"scheduled_date": "2026-03-30",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "00:45:00" },
"target": { "type": "HrmZoneTarget", "zone": 2 }
}
]
},
{
"workout_type": "Running",
"workout_name": "Tempo: Race Pace Feel",
"scheduled_date": "2026-04-02",
"steps": [
{
"type": "WarmUp",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" }
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:30:00" },
"target": { "type": "Pace", "value": "05:35", "tolerance": 10 },
"note": "Testing sustainability near race pace."
},
{
"type": "CoolDown",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" }
}
]
},
{
"workout_type": "Running",
"workout_name": "Long Run: Trail Focus",
"scheduled_date": "2026-04-04",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "01:20:00" },
"target": { "type": "NoTarget" },
"note": "Low-stress trail run. Enjoy the scenery."
}
]
},
{
"workout_type": "Running",
"workout_name": "Easy Monday",
"scheduled_date": "2026-04-06",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "00:45:00" },
"target": { "type": "HrmZoneTarget", "zone": 1 }
}
]
},
{
"workout_type": "Running",
"workout_name": "1km Repeats",
"scheduled_date": "2026-04-09",
"steps": [
{
"type": "WarmUp",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" }
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:05:15" },
"target": { "type": "Pace", "value": "05:15", "tolerance": 10 },
"note": "Repeat 4 times with 2m recovery."
},
{
"type": "Recovery",
"duration": { "type": "Time", "value": "00:02:00" },
"target": { "type": "NoTarget" }
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:05:15" },
"target": { "type": "Pace", "value": "05:15", "tolerance": 10 }
},
{
"type": "Recovery",
"duration": { "type": "Time", "value": "00:02:00" },
"target": { "type": "NoTarget" }
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:05:15" },
"target": { "type": "Pace", "value": "05:15", "tolerance": 10 }
},
{
"type": "Recovery",
"duration": { "type": "Time", "value": "00:02:00" },
"target": { "type": "NoTarget" }
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:05:15" },
"target": { "type": "Pace", "value": "05:15", "tolerance": 10 }
},
{
"type": "CoolDown",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" }
}
]
},
{
"workout_type": "Running",
"workout_name": "Pre-Taper Long Run",
"scheduled_date": "2026-04-11",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "01:00:00" },
"target": { "type": "HrmZoneTarget", "zone": 2 },
"note": "Reducing volume slightly to begin recovery."
}
]
},
{
"workout_type": "Running",
"workout_name": "Taper: Recovery",
"scheduled_date": "2026-04-13",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "00:30:00" },
"target": { "type": "HrmZoneTarget", "zone": 1 }
}
]
},
{
"workout_type": "Running",
"workout_name": "Taper: Pace Sharpening",
"scheduled_date": "2026-04-16",
"steps": [
{
"type": "WarmUp",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" }
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:15:00" },
"target": { "type": "Pace", "value": "05:30", "tolerance": 5 },
"note": "Goal race pace. Dial it in."
},
{
"type": "CoolDown",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" }
}
]
},
{
"workout_type": "Running",
"workout_name": "Taper: Easy Shakeout",
"scheduled_date": "2026-04-18",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "00:40:00" },
"target": { "type": "HrmZoneTarget", "zone": 2 }
}
]
},
{
"workout_type": "Running",
"workout_name": "Race Week: Easy",
"scheduled_date": "2026-04-20",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "00:25:00" },
"target": { "type": "HrmZoneTarget", "zone": 1 },
"note": "Save energy."
}
]
},
{
"workout_type": "Running",
"workout_name": "Race Week: Leg Opener",
"scheduled_date": "2026-04-23",
"steps": [
{
"type": "WarmUp",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" }
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:05:00" },
"target": { "type": "Pace", "value": "05:30", "tolerance": 10 },
"note": "Short burst at race pace."
},
{
"type": "CoolDown",
"duration": { "type": "Time", "value": "00:05:00" },
"target": { "type": "NoTarget" }
}
]
},
{
"workout_type": "Running",
"workout_name": "RACE DAY: 10K Sub-55",
"scheduled_date": "2026-04-25",
"steps": [
{
"type": "WarmUp",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" },
"note": "Good luck! Keep the right calf loose."
},
{
"type": "Run",
"duration": { "type": "Time", "value": "00:54:50" },
"target": { "type": "Pace", "value": "05:29", "tolerance": 5 },
"note": "Target sub-55 goal."
},
{
"type": "CoolDown",
"duration": { "type": "Time", "value": "00:10:00" },
"target": { "type": "NoTarget" }
}
]
},
{
"workout_type": "Running",
"workout_name": "Recovery: Week 1 Mon",
"scheduled_date": "2026-04-27",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "00:20:00" },
"target": { "type": "HrmZoneTarget", "zone": 1 },
"note": "Active recovery."
}
]
},
{
"workout_type": "Running",
"workout_name": "Recovery: Week 1 Thu",
"scheduled_date": "2026-04-30",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "00:30:00" },
"target": { "type": "HrmZoneTarget", "zone": 1 }
}
]
},
{
"workout_type": "Running",
"workout_name": "Recovery: Week 1 Sat",
"scheduled_date": "2026-05-02",
"steps": [
{
"type": "Run",
"duration": { "type": "Time", "value": "00:40:00" },
"target": { "type": "HrmZoneTarget", "zone": 1 }
}
]
}
]
```