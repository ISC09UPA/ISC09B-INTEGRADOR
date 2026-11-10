import type { IsoTime, MascotaDto } from '@/api/types';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "8:00 a. m." como en los mockups (formato es-MX). */
export function horaAmPm(horas: number, minutos: number): string {
  const sufijo = horas < 12 ? 'a. m.' : 'p. m.';
  const h12 = horas % 12 === 0 ? 12 : horas % 12;
  return `${h12}:${String(minutos).padStart(2, '0')} ${sufijo}`;
}

export function horaDeFecha(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return horaAmPm(d.getHours(), d.getMinutes());
}

/** TimeOnly del backend ("08:00:00") a minutos desde medianoche. */
export function minutosDeHora(hora: IsoTime): number {
  const [h = '0', m = '0'] = hora.split(':');
  return Number(h) * 60 + Number(m);
}

export function horaDeTimeOnly(hora: IsoTime): string {
  const total = minutosDeHora(hora);
  return horaAmPm(Math.floor(total / 60), total % 60);
}

export function timeOnly(horas: number, minutos: number): IsoTime {
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:00`;
}

/** "Lunes · 10 nov · 2026" para la cabecera de inicio (Dia · fecha · Año). */
export function fechaCabecera(fecha = new Date()): string {
  return `${DIAS[fecha.getDay()]} · ${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]} · ${fecha.getFullYear()}`;
}

export function fechaLarga(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function fechaCorta(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

export function diaCorto(fechaIso: string): string {
  // DateOnly llega como "2026-11-10"; se interpreta como fecha local.
  const [y, m, d] = fechaIso.split('-').map(Number);
  const fecha = new Date(y, (m ?? 1) - 1, d ?? 1);
  return DIAS_CORTOS[fecha.getDay()];
}

/** "hace 1 h 10 min". */
export function haceTiempo(fecha: Date | string, ahora = new Date()): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const min = Math.max(0, Math.round((ahora.getTime() - d.getTime()) / 60_000));
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  if (h < 24) return resto ? `hace ${h} h ${resto} min` : `hace ${h} h`;
  const dias = Math.floor(h / 24);
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
}

export function gramos(valor: number | null | undefined, decimales = 0): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  return `${valor.toFixed(decimales)} g`;
}

export function porcentaje(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '— %';
  return `${Math.round(valor)} %`;
}

export function edadTexto(edadMeses: number): string {
  if (edadMeses < 12) return edadMeses === 1 ? '1 mes' : `${edadMeses} meses`;
  const anios = Math.floor(edadMeses / 12);
  return anios === 1 ? '1 año' : `${anios} años`;
}

export function pesoTexto(pesoKg: number): string {
  return `${pesoKg.toFixed(pesoKg < 10 ? 1 : 0)} kg`;
}

/** Fecha local como DateOnly ("2026-11-10"). */
export function fechaIso(fecha = new Date()): string {
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}-${d}`;
}

export function inicioDelDia(fecha = new Date()): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

export function nombreEspecie(m: Pick<MascotaDto, 'especie'>): string {
  return m.especie === 'Perro' ? 'Perro' : 'Gato';
}

export function redondear(valor: number, paso = 5): number {
  return Math.max(paso, Math.round(valor / paso) * paso);
}
