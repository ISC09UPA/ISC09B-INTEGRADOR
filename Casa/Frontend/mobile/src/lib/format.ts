import { TipoEvento } from './types';

/** El backend manda fechas como 2026-11-18T01:34:22.1234567 (sin zona). Se recortan los decimales para que todos los motores las lean. */
export function parseHora(h: string): Date {
  return new Date(h.replace(/(\.\d{3})\d+/, '$1'));
}

const dos = (n: number) => String(n).padStart(2, '0');

export function horaCorta(h: string): string {
  const d = parseHora(h);
  if (isNaN(d.getTime())) return '--:--';
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export function hace(h: string): string {
  const ms = Date.now() - parseHora(h).getTime();
  if (isNaN(ms)) return '';
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 10) return 'ahora mismo';
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const hh = Math.floor(m / 60);
  if (hh < 24) return `hace ${hh} h`;
  return `hace ${Math.floor(hh / 24)} d`;
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "Hoy", "Ayer" o "lun 12 nov". */
export function diaTitulo(h: string): string {
  const d = parseHora(h);
  if (isNaN(d.getTime())) return '';
  const hoy = new Date();
  const inicio = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dif = Math.round((inicio(hoy) - inicio(d)) / 86400000);
  if (dif === 0) return 'Hoy';
  if (dif === 1) return 'Ayer';
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function saludo(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas madrugadas';
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** "Movimiento detectado en Entrada" -> "Entrada" */
export function zonaDe(mensaje: string): string | null {
  const m = /detectad[oa] en (.+)$/i.exec(mensaje);
  return m ? m[1].trim() : null;
}

export function tipoDe(mensaje: string): TipoEvento {
  if (/concedido|abierta/i.test(mensaje)) return 'ok';
  if (/movimiento/i.test(mensaje)) return 'mov';
  return 'warn';
}

export function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}
