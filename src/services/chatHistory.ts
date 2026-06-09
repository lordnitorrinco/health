import { asc, lt } from 'drizzle-orm';
import { getDb, runWithDb } from '@/db/client';
import { chatMessages } from '@/db/schema';
import { nowIso } from '@/tools/utils';
import type { ChatMessage } from '@/agent/loop';

const MAX_HISTORY = 200;

export async function loadChatHistory(): Promise<ChatMessage[]> {
  return runWithDb(async () => {
    const rows = await getDb()
      .select()
      .from(chatMessages)
      .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id));
    return rows.map((r) => ({
      role: r.role === 'assistant' ? 'assistant' : 'user',
      content: r.content,
    }));
  });
}

export async function appendChatMessage(message: ChatMessage): Promise<void> {
  await runWithDb(async () => {
    await getDb().insert(chatMessages).values({
      role: message.role,
      content: message.content,
      createdAt: nowIso(),
    });
  });
}

export async function clearChatHistory(): Promise<void> {
  await runWithDb(async () => {
    await getDb().delete(chatMessages);
  });
}

export async function trimChatHistory(): Promise<void> {
  await runWithDb(async () => {
    const rows = await getDb()
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id));
    if (rows.length <= MAX_HISTORY) return;
    const cutoff = rows[rows.length - MAX_HISTORY].id;
    await getDb()
      .delete(chatMessages)
      .where(lt(chatMessages.id, cutoff));
  });
}
