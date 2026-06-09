import { eq, like, or, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { exercises } from '@/db/schema';
import { toolErr, toolOk } from '../utils';

export async function listExercises() {
  const rows = await getDb().select().from(exercises);
  return toolOk(rows);
}

export async function createExercise(input: {
  name: string;
  muscle_group?: string;
}) {
  if (!input.name?.trim()) return toolErr('name es obligatorio');
  const [row] = await getDb()
    .insert(exercises)
    .values({ name: input.name.trim(), muscleGroup: input.muscle_group ?? null })
    .returning();
  return toolOk(row);
}

export async function updateExercise(input: {
  id: number;
  name?: string;
  muscle_group?: string;
}) {
  const updates: Partial<{ name: string; muscleGroup: string | null }> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.muscle_group !== undefined) updates.muscleGroup = input.muscle_group;
  const [row] = await getDb()
    .update(exercises)
    .set(updates)
    .where(eq(exercises.id, input.id))
    .returning();
  if (!row) return toolErr('ejercicio no encontrado');
  return toolOk(row);
}

export async function deleteExercise(input: { id: number }) {
  await getDb().delete(exercises).where(eq(exercises.id, input.id));
  return toolOk({ deleted: input.id });
}

export async function findExerciseByName(name: string) {
  const rows = await getDb()
    .select()
    .from(exercises)
    .where(
      or(
        like(exercises.name, `%${name}%`),
        sql`lower(${exercises.name}) = lower(${name})`
      )
    );
  return rows;
}

export async function getOrCreateExercise(name: string, muscleGroup?: string) {
  const existing = await findExerciseByName(name);
  if (existing.length > 0) return existing[0];
  const [row] = await getDb()
    .insert(exercises)
    .values({ name: name.trim(), muscleGroup: muscleGroup ?? null })
    .returning();
  return row;
}
