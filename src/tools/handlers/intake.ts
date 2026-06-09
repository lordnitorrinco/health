import { eq, gte, lte, and, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { intakeLog, settings } from '@/db/schema';
import { sumPlannedCalories } from './meals';
import {
  dayEnd,
  dayStart,
  nowIso,
  parseDateRange,
  toolErr,
  toolOk,
} from '../utils';

const TARGET_KEY = 'daily_calorie_target';

export async function setDailyCalorieTarget(input: { calories: number }) {
  await getDb()
    .insert(settings)
    .values({ key: TARGET_KEY, value: String(input.calories) })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(input.calories) } });
  return toolOk({ daily_calorie_target: input.calories });
}

export async function getDailyCalorieTarget() {
  const [row] = await getDb().select().from(settings).where(eq(settings.key, TARGET_KEY));
  return row ? Number(row.value) : null;
}

export async function logIntake(input: {
  description: string;
  calories: number;
  logged_at?: string;
}) {
  if (!input.description?.trim()) return toolErr('description requerida');
  const [row] = await getDb()
    .insert(intakeLog)
    .values({
      description: input.description.trim(),
      calories: input.calories,
      loggedAt: input.logged_at ?? nowIso(),
    })
    .returning();
  return toolOk(row);
}

export async function listIntake(input: { from: string; to: string }) {
  const rows = await getDb()
    .select()
    .from(intakeLog)
    .where(
      and(gte(intakeLog.loggedAt, dayStart(input.from)), lte(intakeLog.loggedAt, dayEnd(input.to)))
    );
  return toolOk(rows);
}

export async function updateIntake(input: {
  id: number;
  description?: string;
  calories?: number;
}) {
  const updates: Partial<{ description: string; calories: number }> = {};
  if (input.description !== undefined) updates.description = input.description;
  if (input.calories !== undefined) updates.calories = input.calories;
  const [row] = await getDb()
    .update(intakeLog)
    .set(updates)
    .where(eq(intakeLog.id, input.id))
    .returning();
  if (!row) return toolErr('registro no encontrado');
  return toolOk(row);
}

export async function deleteIntake(input: { id: number }) {
  await getDb().delete(intakeLog).where(eq(intakeLog.id, input.id));
  return toolOk({ deleted: input.id });
}

async function sumIntakeCalories(date: string): Promise<number> {
  const rows = await getDb()
    .select()
    .from(intakeLog)
    .where(
      and(gte(intakeLog.loggedAt, dayStart(date)), lte(intakeLog.loggedAt, dayEnd(date)))
    );
  return rows.reduce((s, r) => s + r.calories, 0);
}

export async function getCalorieSummary(input: { date: string }) {
  const target = await getDailyCalorieTarget();
  const consumed = await sumIntakeCalories(input.date);
  const planned = await sumPlannedCalories(input.date);
  const remaining = target !== null ? target - consumed : null;

  const intakeRows = await getDb()
    .select()
    .from(intakeLog)
    .where(
      and(gte(intakeLog.loggedAt, dayStart(input.date)), lte(intakeLog.loggedAt, dayEnd(input.date)))
    );

  return toolOk({
    date: input.date,
    daily_calorie_target: target,
    planned_calories: planned,
    consumed_calories: consumed,
    remaining_calories: remaining,
    intake_entries: intakeRows,
  });
}

export async function getDietAdherence(input: { from: string; to: string }) {
  const target = await getDailyCalorieTarget();
  const dates = parseDateRange(input.from, input.to);
  const days = [];

  for (const date of dates) {
    const consumed = await sumIntakeCalories(date);
    const planned = await sumPlannedCalories(date);
    const intakeRows = await getDb()
      .select()
      .from(intakeLog)
      .where(
        and(gte(intakeLog.loggedAt, dayStart(date)), lte(intakeLog.loggedAt, dayEnd(date)))
      );
    const overTarget = target !== null && consumed > target;
    const withinTarget = target !== null && consumed <= target;

    days.push({
      date,
      daily_calorie_target: target,
      planned_calories: planned,
      consumed_calories: consumed,
      extra_entries: intakeRows.length,
      extras: intakeRows,
      over_target: overTarget,
      within_target: withinTarget,
    });
  }

  const daysWithTarget = target !== null ? days.filter((d) => d.consumed_calories > 0 || d.planned_calories > 0) : days;
  const withinCount = daysWithTarget.filter((d) => d.within_target).length;
  const overCount = daysWithTarget.filter((d) => d.over_target).length;
  const totalExtras = days.reduce((s, d) => s + d.consumed_calories, 0);

  return toolOk({
    from: input.from,
    to: input.to,
    daily_calorie_target: target,
    days,
    summary: {
      days_in_range: days.length,
      days_within_target: withinCount,
      days_over_target: overCount,
      total_consumed_calories: totalExtras,
    },
  });
}
