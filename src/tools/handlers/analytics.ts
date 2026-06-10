import { asc, eq, gte, lte, and, like, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  exercises,
  routineExercises,
  schedule,
  routines,
  sets,
  meals,
  bodyMetrics,
} from '@/db/schema';
import { getActiveSession } from './sessions';
import { getDailyCalorieTarget } from './intake';
import { sumPlannedCalories } from './meals';
import { dayEnd, dayStart, todayIso, toolOk, weekStartIso } from '../utils';
import { getTodayStepsCount, getDailyStepsGoalValue } from './stepCount';
import { supplements, supplementIntake, batchCooking } from '@/db/schema';

export async function getTodayContext(_input: Record<string, never>) {
  const date = todayIso();
  const [sched] = await getDb()
    .select({
      date: schedule.date,
      routineId: schedule.routineId,
      routineName: routines.name,
    })
    .from(schedule)
    .innerJoin(routines, eq(schedule.routineId, routines.id))
    .where(eq(schedule.date, date));

  const activeRaw = JSON.parse(await getActiveSession({}));
  const activeSession = activeRaw.data;

  let currentExercise = null;
  if (activeSession) {
    const routineItems = await getDb()
      .select({
        sortOrder: routineExercises.sortOrder,
        exerciseId: routineExercises.exerciseId,
        exerciseName: exercises.name,
      })
      .from(routineExercises)
      .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
      .where(eq(routineExercises.routineId, activeSession.routineId))
      .orderBy(asc(routineExercises.sortOrder));

    const loggedSets = await getDb()
      .select()
      .from(sets)
      .where(eq(sets.sessionId, activeSession.id));

    const doneExerciseIds = new Set(loggedSets.map((s) => s.exerciseId));
    currentExercise =
      routineItems.find((item) => !doneExerciseIds.has(item.exerciseId)) ??
      routineItems[routineItems.length - 1] ??
      null;
  } else if (sched) {
    const routineItems = await getDb()
      .select({
        sortOrder: routineExercises.sortOrder,
        exerciseId: routineExercises.exerciseId,
        exerciseName: exercises.name,
      })
      .from(routineExercises)
      .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
      .where(eq(routineExercises.routineId, sched.routineId))
      .orderBy(asc(routineExercises.sortOrder));
    currentExercise = routineItems[0] ?? null;
  }

  const todayMeals = await getDb().select().from(meals).where(eq(meals.date, date));
  const target = await getDailyCalorieTarget();
  const plannedCal = await sumPlannedCalories(date);
  const stepsToday = await getTodayStepsCount();
  const stepsGoal = await getDailyStepsGoalValue();

  const activeSupplements = (
    await getDb().select().from(supplements)
  ).filter((s) => s.active === 1);
  const supplementsTakenToday = await getDb()
    .select()
    .from(supplementIntake)
    .where(
      and(
        gte(supplementIntake.takenAt, dayStart(date)),
        lte(supplementIntake.takenAt, dayEnd(date))
      )
    );

  const weekStart = weekStartIso(date);
  const [weekBatchCooking] = await getDb()
    .select()
    .from(batchCooking)
    .where(eq(batchCooking.weekStart, weekStart));

  return toolOk({
    date,
    schedule: sched ?? null,
    active_session: activeSession,
    current_exercise: currentExercise,
    today_meals: todayMeals,
    daily_calorie_target: target,
    planned_calories_today: plannedCal,
    steps_today: stepsToday,
    daily_steps_goal: stepsGoal,
    steps_goal_reached: stepsGoal !== null ? stepsToday >= stepsGoal : null,
    active_supplements: activeSupplements,
    supplements_taken_today: supplementsTakenToday,
    week_start: weekStart,
    batch_cooking: weekBatchCooking ?? null,
  });
}

export async function getExerciseProgression(input: {
  exercise_name?: string;
  muscle_group?: string;
  from: string;
  to: string;
}) {
  let exerciseIds: number[] = [];

  if (input.exercise_name) {
    const rows = await getDb()
      .select()
      .from(exercises)
      .where(like(exercises.name, `%${input.exercise_name}%`));
    exerciseIds = rows.map((r) => r.id);
  } else if (input.muscle_group) {
    const rows = await getDb()
      .select()
      .from(exercises)
      .where(like(exercises.muscleGroup, `%${input.muscle_group}%`));
    exerciseIds = rows.map((r) => r.id);
  }

  if (exerciseIds.length === 0) {
    return toolOk({ sessions: [], message: 'sin ejercicios coincidentes' });
  }

  const fromTs = dayStart(input.from);
  const toTs = dayEnd(input.to);

  const rows = await getDb()
    .select({
      setId: sets.id,
      weightKg: sets.weightKg,
      reps: sets.reps,
      repWeights: sets.repWeights,
      loggedAt: sets.loggedAt,
      exerciseName: exercises.name,
      sessionId: sets.sessionId,
    })
    .from(sets)
    .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
    .where(
      and(
        gte(sets.loggedAt, fromTs),
        lte(sets.loggedAt, toTs),
        sql`${sets.exerciseId} IN (${sql.join(
          exerciseIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
    )
    .orderBy(asc(sets.loggedAt));

  const setVolume = (r: { weightKg: number; reps: number; repWeights: string | null }): number => {
    if (r.repWeights) {
      try {
        const arr = JSON.parse(r.repWeights);
        if (Array.isArray(arr)) return arr.reduce((s, w) => s + Number(w), 0);
      } catch {
        /* usa fallback */
      }
    }
    return r.weightKg * r.reps;
  };

  const byDate: Record<string, { maxWeight: number; totalVolume: number; sets: typeof rows }> = {};
  for (const r of rows) {
    const d = r.loggedAt.slice(0, 10);
    if (!byDate[d]) byDate[d] = { maxWeight: 0, totalVolume: 0, sets: [] };
    byDate[d].maxWeight = Math.max(byDate[d].maxWeight, r.weightKg);
    byDate[d].totalVolume += setVolume(r);
    byDate[d].sets.push(r);
  }

  return toolOk({
    from: input.from,
    to: input.to,
    filter: input.exercise_name ?? input.muscle_group,
    by_date: byDate,
    total_sets: rows.length,
    max_weight: rows.length ? Math.max(...rows.map((r) => r.weightKg)) : 0,
  });
}

export async function getBodyMetricsProgression(input: { from: string; to: string }) {
  const fromTs = dayStart(input.from);
  const toTs = dayEnd(input.to);
  const rows = await getDb()
    .select()
    .from(bodyMetrics)
    .where(and(gte(bodyMetrics.recordedAt, fromTs), lte(bodyMetrics.recordedAt, toTs)));

  return toolOk({ from: input.from, to: input.to, records: rows });
}
