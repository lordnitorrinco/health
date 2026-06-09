import { desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { sessions, routines } from '@/db/schema';
import { nowIso, toolErr, toolOk } from '../utils';

export async function startSession(input: { routine_id?: number; routine_name?: string }) {
  const active = await getActiveSession({});
  if (active.startsWith('{"ok":true')) {
    return toolErr('ya hay una sesión activa; complétala antes de iniciar otra');
  }

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

  const [row] = await getDb()
    .insert(sessions)
    .values({ routineId, startedAt: nowIso(), completedAt: null })
    .returning();
  return toolOk(row);
}

export async function getActiveSession(_input: Record<string, never>) {
  const [row] = await getDb()
    .select({
      id: sessions.id,
      routineId: sessions.routineId,
      startedAt: sessions.startedAt,
      routineName: routines.name,
    })
    .from(sessions)
    .innerJoin(routines, eq(sessions.routineId, routines.id))
    .where(isNull(sessions.completedAt))
    .orderBy(desc(sessions.startedAt))
    .limit(1);
  if (!row) return toolOk(null);
  return toolOk(row);
}

export async function completeSession(input: { session_id?: number }) {
  let sessionId = input.session_id;
  if (!sessionId) {
    const active = JSON.parse(await getActiveSession({}));
    if (!active.data?.id) return toolErr('no hay sesión activa');
    sessionId = active.data.id;
  }
  if (!sessionId) return toolErr('session_id requerido');
  const [row] = await getDb()
    .update(sessions)
    .set({ completedAt: nowIso() })
    .where(eq(sessions.id, sessionId))
    .returning();
  if (!row) return toolErr('sesión no encontrada');
  return toolOk(row);
}

export async function listSessions(input: { limit?: number }) {
  const rows = await getDb()
    .select({
      id: sessions.id,
      routineId: sessions.routineId,
      routineName: routines.name,
      startedAt: sessions.startedAt,
      completedAt: sessions.completedAt,
    })
    .from(sessions)
    .innerJoin(routines, eq(sessions.routineId, routines.id))
    .orderBy(desc(sessions.startedAt))
    .limit(input.limit ?? 20);
  return toolOk(rows);
}

export async function deleteSession(input: { id: number }) {
  await getDb().delete(sessions).where(eq(sessions.id, input.id));
  return toolOk({ deleted: input.id });
}
