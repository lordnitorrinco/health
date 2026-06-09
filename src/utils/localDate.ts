export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayLocalYmd(): string {
  return formatLocalYmd(new Date());
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDaysYmd(s: string, n: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return formatLocalYmd(d);
}

export function diffDays(from: string, to: string): number {
  const a = parseYmd(from).getTime();
  const b = parseYmd(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function formatLongDate(s: string): string {
  const d = parseYmd(s);
  const wd = WEEKDAYS[d.getDay()];
  return `${wd}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month][0].toUpperCase()}${MONTHS[month].slice(1)} ${year}`;
}
