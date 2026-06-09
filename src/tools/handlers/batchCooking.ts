import { desc, eq, gte, lte, and } from 'drizzle-orm';
import { getDb, runWithDb } from '@/db/client';
import { batchCooking } from '@/db/schema';
import { nowIso, toolErr, toolOk, weekStartIso } from '../utils';

export async function setBatchCooking(input: {
  instructions: string;
  week_start?: string;
}) {
  if (!input.instructions?.trim()) return toolErr('instructions requeridas');
  return runWithDb(async () => {
    const weekStart = weekStartIso(input.week_start);
    const updatedAt = nowIso();
    await getDb()
      .insert(batchCooking)
      .values({ weekStart, instructions: input.instructions.trim(), updatedAt })
      .onConflictDoUpdate({
        target: batchCooking.weekStart,
        set: { instructions: input.instructions.trim(), updatedAt },
      });
    return toolOk({ week_start: weekStart, instructions: input.instructions.trim() });
  });
}

export async function getBatchCooking(input: { week_start?: string }) {
  return runWithDb(async () => {
    const weekStart = weekStartIso(input.week_start);
    const [row] = await getDb()
      .select()
      .from(batchCooking)
      .where(eq(batchCooking.weekStart, weekStart));
    return toolOk(row ?? { week_start: weekStart, instructions: null });
  });
}

export async function listBatchCooking(input: { from?: string; to?: string }) {
  return runWithDb(async () => {
    let rows;
    if (input.from && input.to) {
      rows = await getDb()
        .select()
        .from(batchCooking)
        .where(
          and(
            gte(batchCooking.weekStart, weekStartIso(input.from)),
            lte(batchCooking.weekStart, weekStartIso(input.to))
          )
        )
        .orderBy(desc(batchCooking.weekStart));
    } else {
      rows = await getDb()
        .select()
        .from(batchCooking)
        .orderBy(desc(batchCooking.weekStart));
    }
    return toolOk(rows);
  });
}

export async function deleteBatchCooking(input: { week_start?: string }) {
  return runWithDb(async () => {
    const weekStart = weekStartIso(input.week_start);
    await getDb().delete(batchCooking).where(eq(batchCooking.weekStart, weekStart));
    return toolOk({ deleted: weekStart });
  });
}
