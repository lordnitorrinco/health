import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { meals, type MealSlot } from '@/db/schema';
import { toolErr, toolOk } from '../utils';

export async function getMealsForDay(input: { date: string; slot?: MealSlot }) {
  const conditions = [eq(meals.date, input.date)];
  if (input.slot) conditions.push(eq(meals.slot, input.slot));

  const rows = await getDb()
    .select()
    .from(meals)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions));
  return toolOk(rows);
}

export async function setMeal(input: {
  date: string;
  slot: MealSlot;
  description: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  time?: string;
}) {
  await getDb()
    .delete(meals)
    .where(and(eq(meals.date, input.date), eq(meals.slot, input.slot)));

  const [row] = await getDb()
    .insert(meals)
    .values({
      date: input.date,
      slot: input.slot,
      description: input.description,
      calories: input.calories ?? null,
      proteinG: input.protein_g ?? null,
      carbsG: input.carbs_g ?? null,
      fatG: input.fat_g ?? null,
      time: input.time?.trim() ?? null,
    })
    .returning();
  return toolOk(row);
}

export async function deleteMeal(input: { id: number }) {
  await getDb().delete(meals).where(eq(meals.id, input.id));
  return toolOk({ deleted: input.id });
}

export async function setMealsBatch(input: {
  meals: {
    date: string;
    slot: MealSlot;
    description: string;
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    time?: string;
  }[];
}) {
  if (!input.meals?.length) return toolErr('meals vacío');
  const db = getDb();
  const created = [];
  for (const m of input.meals) {
    await db
      .delete(meals)
      .where(and(eq(meals.date, m.date), eq(meals.slot, m.slot)));
    const [row] = await db
      .insert(meals)
      .values({
        date: m.date,
        slot: m.slot,
        description: m.description,
        calories: m.calories ?? null,
        proteinG: m.protein_g ?? null,
        carbsG: m.carbs_g ?? null,
        fatG: m.fat_g ?? null,
        time: m.time?.trim() ?? null,
      })
      .returning();
    created.push(row);
  }
  return toolOk({ count: created.length, meals: created });
}

export async function sumPlannedCalories(date: string): Promise<number> {
  const rows = await getDb().select().from(meals).where(eq(meals.date, date));
  return rows.reduce((s, m) => s + (m.calories ?? 0), 0);
}
