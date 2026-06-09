import { eq, gte, lte, and } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { bodyMetrics } from '@/db/schema';
import { nowIso, toolErr, toolOk } from '../utils';

export async function logBodyMetrics(input: {
  weight_kg: number;
  body_fat_pct?: number;
  water_pct?: number;
  muscle_pct?: number;
  recorded_at?: string;
}) {
  const [row] = await getDb()
    .insert(bodyMetrics)
    .values({
      weightKg: input.weight_kg,
      bodyFatPct: input.body_fat_pct ?? null,
      waterPct: input.water_pct ?? null,
      musclePct: input.muscle_pct ?? null,
      recordedAt: input.recorded_at ?? nowIso(),
    })
    .returning();
  return toolOk(row);
}

export async function listBodyMetrics(input: { from?: string; to?: string; limit?: number }) {
  let rows = await getDb().select().from(bodyMetrics);
  if (input.from) {
    rows = rows.filter((r) => r.recordedAt >= input.from!);
  }
  if (input.to) {
    rows = rows.filter((r) => r.recordedAt <= input.to! + 'T23:59:59.999Z');
  }
  rows.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  if (input.limit) rows = rows.slice(0, input.limit);
  return toolOk(rows);
}

export async function updateBodyMetrics(input: {
  id: number;
  weight_kg?: number;
  body_fat_pct?: number;
  water_pct?: number;
  muscle_pct?: number;
}) {
  const updates: Partial<{
    weightKg: number;
    bodyFatPct: number | null;
    waterPct: number | null;
    musclePct: number | null;
  }> = {};
  if (input.weight_kg !== undefined) updates.weightKg = input.weight_kg;
  if (input.body_fat_pct !== undefined) updates.bodyFatPct = input.body_fat_pct;
  if (input.water_pct !== undefined) updates.waterPct = input.water_pct;
  if (input.muscle_pct !== undefined) updates.musclePct = input.muscle_pct;

  const [row] = await getDb()
    .update(bodyMetrics)
    .set(updates)
    .where(eq(bodyMetrics.id, input.id))
    .returning();
  if (!row) return toolErr('registro no encontrado');
  return toolOk(row);
}

export async function deleteBodyMetrics(input: { id: number }) {
  await getDb().delete(bodyMetrics).where(eq(bodyMetrics.id, input.id));
  return toolOk({ deleted: input.id });
}
