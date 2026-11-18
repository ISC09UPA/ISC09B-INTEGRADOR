import type { EstadoComando, TipoAlerta, TipoEvento } from '../api/types';

const LOCALE = 'es-MX';

const absoluta = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
const soloFecha = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });
const relativa = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto', style: 'long' });
const entero = new Intl.NumberFormat(LOCALE);
const decimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const porcentaje = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 });

export function fechaAbsoluta(iso: string | null | undefined): string {
  if (!iso) return '—';
  return absoluta.format(new Date(iso));
}

export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—';
  return soloFecha.format(new Date(iso));
}

const UNIDADES: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "hace 5 minutos", "ayer", "en 2 horas". */
export function fechaRelativa(iso: string | null | undefined, ahora = Date.now()): string {
  if (!iso) return 'Nunca';
  const segundos = (new Date(iso).getTime() - ahora) / 1000;
  const abs = Math.abs(segundos);
  if (abs < 45) return 'justo ahora';
  for (const [unidad, s] of UNIDADES) {
    if (abs >= s || unidad === 'minute') {
      return relativa.format(Math.round(segundos / s), unidad);
    }
  }
  return relativa.format(Math.round(segundos / 60), 'minute');
}

export function numero(n: number): string {
  return entero.format(n);
}

export function decimal1(n: number | null | undefined, unidad = ''): string {
  if (n === null || n === undefined) return '—';
  return `${decimal.format(n)}${unidad ? ` ${unidad}` : ''}`;
}

export function porciento(fraccion: number): string {
  return porcentaje.format(fraccion);
}

/** 1536 → "1.5 KB" (múltiplos de 1024). */
export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${entero.format(bytes)} B`;
  const unidades = ['KB', 'MB', 'GB'];
  let valor = bytes / 1024;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  return `${decimal.format(valor)} ${unidades[i]}`;
}

export function shaCorto(sha: string): string {
  return sha.length > 12 ? `${sha.slice(0, 8)}…${sha.slice(-4)}` : sha;
}

export function nombreTolva(tolva: number | null): string {
  if (tolva === null) return '—';
  return tolva === 1 ? 'Perro' : tolva === 2 ? 'Gato' : `Tolva ${tolva}`;
}

export const ETIQUETAS_EVENTO: Record<TipoEvento, string> = {
  Jam: 'Atasco',
  HopperLow: 'Tolva baja',
};

export const ETIQUETAS_ALERTA: Record<TipoAlerta, string> = {
  NoHaComido: 'No ha comido',
  BajaApetito: 'Baja de apetito',
  Atasco: 'Atasco',
  TolvaBaja: 'Tolva baja',
  AlimentadorSinConexion: 'Alimentador sin conexión',
  GatewaySinConexion: 'Raspberry Pi sin conexión',
  ConexionRestablecida: 'Conexión restablecida',
};

export const ETIQUETAS_ESTADO_COMANDO: Record<EstadoComando, string> = {
  Pendiente: 'Pendiente',
  Entregado: 'Entregado',
  Completado: 'Completado',
  Fallido: 'Fallido',
  Vencido: 'Vencido',
};

export function plural(n: number, singular: string, pluralTexto = `${singular}s`): string {
  return `${numero(n)} ${n === 1 ? singular : pluralTexto}`;
}
