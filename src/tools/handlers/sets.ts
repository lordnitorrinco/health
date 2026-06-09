import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { sets } from '@/db/schema';
import { findExerciseByName } from './exercises';
import { nowIso, toolErr, toolOk } from '../utils';
import { getActiveSession } from './sessions';

export async function logSet(input: {
  session_id?: number;
  exercise_id?: number;
  exercise_name?: string;
  weight_kg: number;
  reps: number;
}) {
  let sessionId = input.session_id;
  if (!sessionId) {
    const active = JSON.parse(await getActiveSession({}));
    if (!active.data?.id) return toolErr('no hay sesión activa');
    sessionId = active.data.id;
  }

  let exerciseId = input.exercise_id;
  if (!exerciseId && input.exercise_name) {
    const found = await findExerciseByName(input.exercise_name);
    if (found.length === 0) return toolErr('ejercicio no encontrado');
    exerciseId = found[0].id;
  }
  if (!exerciseId) return toolErr('exercise_id o exercise_name requerido');
  if (!sessionId) return toolErr('no hay sesión activa');

  const [row] = await getDb()
    .insert(sets)
    .values({
      sessionId,
      exerciseId,
      weightKg: input.weight_kg,
      reps: input.reps,
      loggedAt: nowIso(),
    })
    .returning();
  return toolOk(row);
}

export async function listSets(input: {
  session_id?: number;
  exercise_id?: number;
  exercise_name?: string;
}) {
  let exerciseId = input.exercise_id;
  if (!exerciseId && input.exercise_name) {
    const found = await findExerciseByName(input.exercise_name);
    if (found.length === 0) return toolErr('ejercicio no encontrado');
    exerciseId = found[0].id;
  }

  if (!input.session_id && !exerciseId) return toolErr('session_id o exercise requerido');

  const conditions = [];
  if (input.session_id) conditions.push(eq(sets.sessionId, input.session_id));
  if (exerciseId) conditions.push(eq(sets.exerciseId, exerciseId));

  const rows = await getDb()
    .select()
    .from(sets)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions));
  return toolOk(rows);
}

export async function updateSet(input: {
  id: number;
  weight_kg?: number;
  reps?: number;
}) {
  const updates: Partial<{ weightKg: number; reps: number }> = {};
  if (input.weight_kg !== undefined) updates.weightKg = input.weight_kg;
  if (input.reps !== undefined) updates.reps = input.reps;
  const [row] = await getDb().update(sets).set(updates).where(eq(sets.id, input.id)).returning();
  if (!row) return toolErr('serie no encontrada');
  return toolOk(row);
}

export async function deleteSet(input: { id: number }) {
  await getDb().delete(sets).where(eq(sets.id, input.id));
  return toolOk({ deleted: input.id });
}
