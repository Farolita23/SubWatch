import { CATEGORY_LABELS, Category } from '../core/models';

export function categoryLabel(c: Category | null | undefined): string {
  return c ? CATEGORY_LABELS[c] : 'Sin categoría';
}

/** "hoy", "mañana", "en N días". */
export function daysLabel(days: number): string {
  if (days <= 0) return 'hoy';
  if (days === 1) return 'mañana';
  return `en ${days} días`;
}

/** Fecha local de hoy como yyyy-MM-dd. */
export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0'); // taste-skill-ignore: fecha ISO, no numeracion
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Dias naturales desde hoy hasta una fecha yyyy-MM-dd (negativo si pasada). */
export function daysFromToday(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date();
  const a = Date.UTC(y, m - 1, d);
  const b = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((a - b) / 86_400_000);
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
/** Importe en euros con formato es-ES ("1.234,56 €"). */
export function eur(n: number): string {
  return EUR.format(n);
}
