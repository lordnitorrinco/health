import { eq, gte, lte, and } from 'drizzle-orm';
import { getDb, runWithDb } from '@/db/client';
import { dailySteps, settings } from '@/db/schema';
import { nowIso, todayIso, toolErr, toolOk } from '../utils';

const STEPS_GOAL_KEY = 'daily_steps_goal';

export async function setDailyStepsGoal(input: { steps: number }) {
  if (input.steps < 0) return toolErr('steps debe ser >= 0');
  return runWithDb(async () => {
    const value = String(Math.round(input.steps));
    await getDb()
      .insert(settings)
      .values({ key: STEPS_GOAL_KEY, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
    return toolOk({ daily_steps_goal: Math.round(input.steps) });
  });
}

export async function getDailyStepsGoalValue(): Promise<number | null> {
  return runWithDb(async () => {
    const [row] = await getDb().select().from(settings).where(eq(settings.key, STEPS_GOAL_KEY));
    return row ? Number(row.value) : null;
  });
}

export async function getDailyStepsGoal() {
  const goal = await getDailyStepsGoalValue();
  return toolOk({ daily_steps_goal: goal });
}

export async function getStepsForDay(input: { date?: string }) {
  return runWithDb(async () => {
    const date = input.date ?? todayIso();
    const [row] = await getDb().select().from(dailySteps).where(eq(dailySteps.date, date));
    return toolOk(row ?? { date, steps: 0, updatedAt: null });
  });
}

export async function setDailySteps(input: { date?: string; steps: number }) {
  return runWithDb(async () => {
    if (input.steps < 0) return toolErr('steps debe ser >= 0');
    const date = input.date ?? todayIso();
    const [row] = await getDb()
      .insert(dailySteps)
      .values({ date, steps: Math.round(input.steps), updatedAt: nowIso() })
      .onConflictDoUpdate({
        target: dailySteps.date,
        set: { steps: Math.round(input.steps), updatedAt: nowIso() },
      })
      .returning();
    return toolOk(row);
  });
}

export async function addDailySteps(input: { date?: string; steps: number }) {
  return runWithDb(async () => {
    if (input.steps < 0) return toolErr('steps debe ser >= 0');
    const date = input.date ?? todayIso();
    const [existing] = await getDb().select().from(dailySteps).where(eq(dailySteps.date, date));
    const total = (existing?.steps ?? 0) + Math.round(input.steps);
    const [row] = await getDb()
      .insert(dailySteps)
      .values({ date, steps: total, updatedAt: nowIso() })
      .onConflictDoUpdate({
        target: dailySteps.date,
        set: { steps: total, updatedAt: nowIso() },
      })
      .returning();
    return toolOk(row);
  });
}

export async function listDailySteps(input: { from: string; to: string }) {
  return runWithDb(async () => {
    const rows = await getDb()
      .select()
      .from(dailySteps)
      .where(and(gte(dailySteps.date, input.from), lte(dailySteps.date, input.to)))
      .orderBy(dailySteps.date);
    return toolOk(rows);
  });
}

export async function getStepsProgression(input: { from: string; to: string }) {
  return runWithDb(async () => {
    const rows = await getDb()
      .select()
      .from(dailySteps)
      .where(and(gte(dailySteps.date, input.from), lte(dailySteps.date, input.to)))
      .orderBy(dailySteps.date);

    const total = rows.reduce((s, r) => s + r.steps, 0);
    const avg = rows.length ? Math.round(total / rows.length) : 0;
    const max = rows.length ? Math.max(...rows.map((r) => r.steps)) : 0;

    return toolOk({ from: input.from, to: input.to, days: rows, total, average: avg, max });
  });
}

export async function getTodayStepsCount(): Promise<number> {
  return runWithDb(async () => {
    const date = todayIso();
    const [row] = await getDb().select().from(dailySteps).where(eq(dailySteps.date, date));
    return row?.steps ?? 0;
  });
}

export async function upsertTodaySteps(steps: number): Promise<void> {
  await runWithDb(async () => {
    const date = todayIso();
    await getDb()
      .insert(dailySteps)
      .values({ date, steps: Math.round(steps), updatedAt: nowIso() })
      .onConflictDoUpdate({
        target: dailySteps.date,
        set: { steps: Math.round(steps), updatedAt: nowIso() },
      });
  });
}
