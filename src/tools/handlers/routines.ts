import { asc, eq, like, or, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { routineExercises, routines } from '@/db/schema';
import { getOrCreateExercise, findExerciseByName } from './exercises';
import { toolErr, toolOk } from '../utils';

export async function listRoutines() {
  const rows = await getDb().select().from(routines);
  return toolOk(rows);
}

export async function getRoutine(input: { id?: number; name?: string }) {
  let routine;
  if (input.id) {
    [routine] = await getDb().select().from(routines).where(eq(routines.id, input.id));
  } else if (input.name) {
    [routine] = await getDb()
      .select()
      .from(routines)
      .where(like(routines.name, `%${input.name}%`));
  } else {
    return toolErr('id o name requerido');
  }
  if (!routine) return toolErr('rutina no encontrada');

  const items = await getDb()
    .select({
      sortOrder: routineExercises.sortOrder,
      exerciseId: routineExercises.exerciseId,
      exerciseName: sql<string>`(SELECT name FROM exercises WHERE id = ${routineExercises.exerciseId})`,
      muscleGroup: sql<string | null>`(SELECT muscle_group FROM exercises WHERE id = ${routineExercises.exerciseId})`,
    })
    .from(routineExercises)
    .where(eq(routineExercises.routineId, routine.id))
    .orderBy(asc(routineExercises.sortOrder));

  return toolOk({ ...routine, exercises: items });
}

export async function createRoutine(input: { name: string }) {
  const [row] = await getDb().insert(routines).values({ name: input.name }).returning();
  return toolOk(row);
}

export async function deleteRoutine(input: { id: number }) {
  await getDb().delete(routines).where(eq(routines.id, input.id));
  return toolOk({ deleted: input.id });
}

export async function addExerciseToRoutine(input: {
  routine_id: number;
  exercise_id?: number;
  exercise_name?: string;
  sort_order: number;
}) {
  let exerciseId = input.exercise_id;
  if (!exerciseId && input.exercise_name) {
    const found = await findExerciseByName(input.exercise_name);
    if (found.length === 0) return toolErr('ejercicio no encontrado');
    exerciseId = found[0].id;
  }
  if (!exerciseId) return toolErr('exercise_id o exercise_name requerido');

  const [row] = await getDb()
    .insert(routineExercises)
    .values({
      routineId: input.routine_id,
      exerciseId,
      sortOrder: input.sort_order,
    })
    .returning();
  return toolOk(row);
}

export async function removeExerciseFromRoutine(input: {
  routine_id: number;
  exercise_id?: number;
  exercise_name?: string;
}) {
  let exerciseId = input.exercise_id;
  if (!exerciseId && input.exercise_name) {
    const found = await findExerciseByName(input.exercise_name);
    if (found.length === 0) return toolErr('ejercicio no encontrado');
    exerciseId = found[0].id;
  }
  if (!exerciseId) return toolErr('exercise_id o exercise_name requerido');

  await getDb()
    .delete(routineExercises)
    .where(
      sql`${routineExercises.routineId} = ${input.routine_id} AND ${routineExercises.exerciseId} = ${exerciseId}`
    );
  return toolOk({ removed: true });
}

export async function swapExercisesInRoutine(input: {
  routine_id?: number;
  routine_name?: string;
  old_exercise: string;
  new_exercise: string;
  new_muscle_group?: string;
}) {
  let routineId = input.routine_id;
  if (!routineId && input.routine_name) {
    const [r] = await getDb()
      .select()
      .from(routines)
      .where(like(routines.name, `%${input.routine_name}%`));
    if (!r) return toolErr('rutina no encontrada');
    routineId = r.id;
  }
  if (!routineId) return toolErr('routine_id o routine_name requerido');

  const oldEx = await findExerciseByName(input.old_exercise);
  if (oldEx.length === 0) return toolErr('ejercicio original no encontrado');

  const newEx = await getOrCreateExercise(input.new_exercise, input.new_muscle_group);

  const [updated] = await getDb()
    .update(routineExercises)
    .set({ exerciseId: newEx.id })
    .where(
      sql`${routineExercises.routineId} = ${routineId} AND ${routineExercises.exerciseId} = ${oldEx[0].id}`
    )
    .returning();

  if (!updated) return toolErr('ejercicio no está en esa rutina');
  return toolOk(updated);
}

export async function reorderRoutineExercises(input: {
  routine_id: number;
  exercise_ids_in_order: number[];
}) {
  for (let i = 0; i < input.exercise_ids_in_order.length; i++) {
    await getDb()
      .update(routineExercises)
      .set({ sortOrder: i + 1 })
      .where(
        sql`${routineExercises.routineId} = ${input.routine_id} AND ${routineExercises.exerciseId} = ${input.exercise_ids_in_order[i]}`
      );
  }
  return toolOk({ reordered: true });
}

export async function createRoutineWithExercises(input: {
  name: string;
  exercises: { name: string; muscle_group?: string; sort_order: number }[];
}) {
  const db = getDb();
  const [routine] = await db.insert(routines).values({ name: input.name }).returning();

  const created = [];
  for (const ex of input.exercises) {
    const exercise = await getOrCreateExercise(ex.name, ex.muscle_group);
    const [link] = await db
      .insert(routineExercises)
      .values({
        routineId: routine.id,
        exerciseId: exercise.id,
        sortOrder: ex.sort_order,
      })
      .returning();
    created.push({ ...link, exerciseName: exercise.name });
  }
  return toolOk({ routine, exercises: created });
}

async function findRoutineByName(name: string) {
  const [r] = await getDb()
    .select()
    .from(routines)
    .where(or(like(routines.name, `%${name}%`), sql`lower(${routines.name}) = lower(${name})`));
  return r;
}

export { findRoutineByName };
