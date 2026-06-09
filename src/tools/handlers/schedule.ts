import { asc, eq, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { schedule, routines } from '@/db/schema';
import { toolErr, toolOk } from '../utils';

export async function getSchedule(input: { from: string; to: string }) {
  const rows = await getDb()
    .select({
      id: schedule.id,
      date: schedule.date,
      routineId: schedule.routineId,
      routineName: routines.name,
    })
    .from(schedule)
    .innerJoin(routines, eq(schedule.routineId, routines.id))
    .where(sql`${schedule.date} >= ${input.from} AND ${schedule.date} <= ${input.to}`)
    .orderBy(asc(schedule.date));
  return toolOk(rows);
}

export async function setScheduleDay(input: { date: string; routine_id?: number; routine_name?: string }) {
  let routineId = input.routine_id;
  if (!routineId && input.routine_name) {
    const [r] = await getDb()
      .select()
      .from(routines)
      .where(sql`lower(${routines.name}) LIKE lower(${'%' + input.routine_name + '%'})`);
    if (!r) return toolErr('rutina no encontrada');
    routineId = r.id;
  }
  if (!routineId) return toolErr('routine_id o routine_name requerido');

  await getDb().delete(schedule).where(eq(schedule.date, input.date));
  const [row] = await getDb()
    .insert(schedule)
    .values({ date: input.date, routineId })
    .returning();
  return toolOk(row);
}

export async function clearScheduleDay(input: { date: string }) {
  await getDb().delete(schedule).where(eq(schedule.date, input.date));
  return toolOk({ cleared: input.date });
}
