import { formatLocalYmd, parseYmd } from '@/utils/localDate';

/** Fecha de hoy en hora LOCAL (YYYY-MM-DD), coherente con la vista de día. */
export function todayIso(): string {
  return formatLocalYmd(new Date());
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Devuelve el lunes (YYYY-MM-DD) de la semana de la fecha dada (o de hoy), en hora local. */
export function weekStartIso(date?: string): string {
  const base = date ? parseYmd(date) : new Date();
  const day = base.getDay();
  const diff = (day + 6) % 7;
  base.setDate(base.getDate() - diff);
  return formatLocalYmd(base);
}

export function parseDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const end = parseYmd(to);
  for (let d = parseYmd(from); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(formatLocalYmd(d));
  }
  return dates;
}

/** Instante UTC del inicio del día LOCAL indicado, para comparar con timestamps (loggedAt). */
export function dayStart(date: string): string {
  const d = parseYmd(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
}

export function dayEnd(date: string): string {
  const d = parseYmd(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();
}

export function toolOk(data: unknown) {
  return JSON.stringify({ ok: true, data });
}

export function toolErr(message: string) {
  return JSON.stringify({ ok: false, error: message });
}
