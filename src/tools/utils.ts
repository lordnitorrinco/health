export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function parseDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + 'T12:00:00');
  const end = new Date(to + 'T12:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function dayStart(date: string): string {
  return `${date}T00:00:00.000Z`;
}

export function dayEnd(date: string): string {
  return `${date}T23:59:59.999Z`;
}

export function toolOk(data: unknown) {
  return JSON.stringify({ ok: true, data });
}

export function toolErr(message: string) {
  return JSON.stringify({ ok: false, error: message });
}
