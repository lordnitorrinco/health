import { desc, eq, gte, lte, and } from 'drizzle-orm';
import { getDb, runWithDb } from '@/db/client';
import { shoppingList } from '@/db/schema';
import { nowIso, toolErr, toolOk, weekStartIso } from '../utils';

export async function setShoppingList(input: {
  items: string;
  week_start?: string;
}) {
  if (!input.items?.trim()) return toolErr('items requeridos');
  return runWithDb(async () => {
    const weekStart = weekStartIso(input.week_start);
    const updatedAt = nowIso();
    await getDb()
      .insert(shoppingList)
      .values({ weekStart, items: input.items.trim(), updatedAt })
      .onConflictDoUpdate({
        target: shoppingList.weekStart,
        set: { items: input.items.trim(), updatedAt },
      });
    return toolOk({ week_start: weekStart, items: input.items.trim() });
  });
}

export async function getShoppingList(input: { week_start?: string }) {
  return runWithDb(async () => {
    const weekStart = weekStartIso(input.week_start);
    const [row] = await getDb()
      .select()
      .from(shoppingList)
      .where(eq(shoppingList.weekStart, weekStart));
    return toolOk(row ?? { week_start: weekStart, items: null });
  });
}

export async function listShoppingLists(input: { from?: string; to?: string }) {
  return runWithDb(async () => {
    let rows;
    if (input.from && input.to) {
      rows = await getDb()
        .select()
        .from(shoppingList)
        .where(
          and(
            gte(shoppingList.weekStart, weekStartIso(input.from)),
            lte(shoppingList.weekStart, weekStartIso(input.to))
          )
        )
        .orderBy(desc(shoppingList.weekStart));
    } else {
      rows = await getDb()
        .select()
        .from(shoppingList)
        .orderBy(desc(shoppingList.weekStart));
    }
    return toolOk(rows);
  });
}

export async function deleteShoppingList(input: { week_start?: string }) {
  return runWithDb(async () => {
    const weekStart = weekStartIso(input.week_start);
    await getDb().delete(shoppingList).where(eq(shoppingList.weekStart, weekStart));
    return toolOk({ deleted: weekStart });
  });
}
