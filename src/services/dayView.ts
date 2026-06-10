import { asc, eq, sql } from 'drizzle-orm';
import { getDb, runWithDb } from '@/db/client';
import {
  batchCooking,
  meals,
  routineExercises,
  routines,
  schedule,
  shoppingList,
  type MealSlot,
} from '@/db/schema';
import { weekStartIso } from '@/tools/utils';
import { addDaysYmd } from '@/utils/localDate';

export type DayMeal = {
  id: number;
  slot: MealSlot;
  description: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  time: string | null;
};

export type DayWorkout = {
  routineId: number;
  routineName: string;
};

export type RoutineExercise = {
  sortOrder: number;
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string | null;
};

export type DayPlan = {
  date: string;
  meals: DayMeal[];
  workout: DayWorkout | null;
  weekStart: string;
  shoppingList: string | null;
  batchCooking: string | null;
  nextWeekStart: string;
  nextWeekShoppingList: string | null;
  nextWeekBatchCooking: string | null;
};

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Desayuno',
  morning_snack: 'Media mañana',
  lunch: 'Comida',
  afternoon_snack: 'Merienda',
  dinner: 'Cena',
};

const SLOT_ORDER: Record<string, number> = {
  breakfast: 0,
  morning_snack: 1,
  lunch: 2,
  afternoon_snack: 3,
  dinner: 4,
};

export function mealSlotLabel(slot: MealSlot): string {
  return SLOT_LABELS[slot] ?? slot;
}

export async function getDayPlan(date: string): Promise<DayPlan> {
  return runWithDb(async () => {
    const db = getDb();

    const mealRows = await db.select().from(meals).where(eq(meals.date, date));
    const sortedMeals: DayMeal[] = mealRows
      .map((m) => ({
        id: m.id,
        slot: m.slot as MealSlot,
        description: m.description,
        calories: m.calories,
        proteinG: m.proteinG,
        carbsG: m.carbsG,
        fatG: m.fatG,
        time: m.time,
      }))
      .sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return (SLOT_ORDER[a.slot] ?? 99) - (SLOT_ORDER[b.slot] ?? 99);
      });

    const [sched] = await db
      .select({
        routineId: schedule.routineId,
        routineName: routines.name,
      })
      .from(schedule)
      .innerJoin(routines, eq(schedule.routineId, routines.id))
      .where(eq(schedule.date, date));

    const weekStart = weekStartIso(date);
    const nextWeekStart = addDaysYmd(weekStart, 7);

    const [shop] = await db
      .select()
      .from(shoppingList)
      .where(eq(shoppingList.weekStart, weekStart));
    const [batch] = await db
      .select()
      .from(batchCooking)
      .where(eq(batchCooking.weekStart, weekStart));
    const [nextShop] = await db
      .select()
      .from(shoppingList)
      .where(eq(shoppingList.weekStart, nextWeekStart));
    const [nextBatch] = await db
      .select()
      .from(batchCooking)
      .where(eq(batchCooking.weekStart, nextWeekStart));

    return {
      date,
      meals: sortedMeals,
      workout: sched ? { routineId: sched.routineId, routineName: sched.routineName } : null,
      weekStart,
      shoppingList: shop?.items ?? null,
      batchCooking: batch?.instructions ?? null,
      nextWeekStart,
      nextWeekShoppingList: nextShop?.items ?? null,
      nextWeekBatchCooking: nextBatch?.instructions ?? null,
    };
  });
}

export async function getRoutineExercises(routineId: number): Promise<RoutineExercise[]> {
  return runWithDb(async () => {
    const items = await getDb()
      .select({
        sortOrder: routineExercises.sortOrder,
        exerciseId: routineExercises.exerciseId,
        exerciseName: sql<string>`(SELECT name FROM exercises WHERE id = ${routineExercises.exerciseId})`,
        muscleGroup: sql<string | null>`(SELECT muscle_group FROM exercises WHERE id = ${routineExercises.exerciseId})`,
      })
      .from(routineExercises)
      .where(eq(routineExercises.routineId, routineId))
      .orderBy(asc(routineExercises.sortOrder));
    return items;
  });
}
