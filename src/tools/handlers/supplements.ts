import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { getDb, runWithDb } from '@/db/client';
import { supplements, supplementIntake } from '@/db/schema';
import { dayEnd, dayStart, nowIso, toolErr, toolOk } from '../utils';

export async function listSupplements(input: { include_inactive?: boolean }) {
  return runWithDb(async () => {
    const rows = await getDb().select().from(supplements).orderBy(supplements.name);
    const filtered = input.include_inactive ? rows : rows.filter((r) => r.active === 1);
    return toolOk(filtered);
  });
}

export async function createSupplement(input: {
  name: string;
  dose?: string;
  schedule?: string;
  notes?: string;
}) {
  if (!input.name?.trim()) return toolErr('name requerido');
  return runWithDb(async () => {
    const [row] = await getDb()
      .insert(supplements)
      .values({
        name: input.name.trim(),
        dose: input.dose?.trim() ?? null,
        schedule: input.schedule?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
        active: 1,
        createdAt: nowIso(),
      })
      .returning();
    return toolOk(row);
  });
}

export async function updateSupplement(input: {
  id: number;
  name?: string;
  dose?: string;
  schedule?: string;
  notes?: string;
  active?: boolean;
}) {
  return runWithDb(async () => {
    const updates: Partial<{
      name: string;
      dose: string | null;
      schedule: string | null;
      notes: string | null;
      active: number;
    }> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.dose !== undefined) updates.dose = input.dose.trim() || null;
    if (input.schedule !== undefined) updates.schedule = input.schedule.trim() || null;
    if (input.notes !== undefined) updates.notes = input.notes.trim() || null;
    if (input.active !== undefined) updates.active = input.active ? 1 : 0;

    const [row] = await getDb()
      .update(supplements)
      .set(updates)
      .where(eq(supplements.id, input.id))
      .returning();
    if (!row) return toolErr('suplemento no encontrado');
    return toolOk(row);
  });
}

export async function deleteSupplement(input: { id: number }) {
  return runWithDb(async () => {
    await getDb().delete(supplements).where(eq(supplements.id, input.id));
    return toolOk({ deleted: input.id });
  });
}

export async function logSupplementIntake(input: {
  supplement_id?: number;
  supplement_name?: string;
  taken_at?: string;
  dose?: string;
  notes?: string;
}) {
  return runWithDb(async () => {
    let supplementId = input.supplement_id;

    if (!supplementId && input.supplement_name?.trim()) {
      const name = input.supplement_name.trim();
      const [existing] = await getDb()
        .select()
        .from(supplements)
        .where(eq(supplements.name, name));
      if (existing) {
        supplementId = existing.id;
      } else {
        const [created] = await getDb()
          .insert(supplements)
          .values({ name, active: 1, createdAt: nowIso() })
          .returning();
        supplementId = created.id;
      }
    }

    if (!supplementId) return toolErr('Indica supplement_id o supplement_name');

    const [row] = await getDb()
      .insert(supplementIntake)
      .values({
        supplementId,
        takenAt: input.taken_at ?? nowIso(),
        dose: input.dose?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
      })
      .returning();
    return toolOk(row);
  });
}

export async function listSupplementIntake(input: {
  from: string;
  to: string;
  supplement_id?: number;
}) {
  return runWithDb(async () => {
    const conditions = [
      gte(supplementIntake.takenAt, dayStart(input.from)),
      lte(supplementIntake.takenAt, dayEnd(input.to)),
    ];
    if (input.supplement_id) {
      conditions.push(eq(supplementIntake.supplementId, input.supplement_id));
    }
    const rows = await getDb()
      .select()
      .from(supplementIntake)
      .where(and(...conditions))
      .orderBy(desc(supplementIntake.takenAt));
    return toolOk(rows);
  });
}

export async function deleteSupplementIntake(input: { id: number }) {
  return runWithDb(async () => {
    await getDb().delete(supplementIntake).where(eq(supplementIntake.id, input.id));
    return toolOk({ deleted: input.id });
  });
}
