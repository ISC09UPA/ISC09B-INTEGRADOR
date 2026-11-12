import { useCallback, useEffect, useState } from 'react';

import { mascotasApi } from '@/api/endpoints';
import type { ComandoDto, ConsumoDiarioDto, HorarioDto, MascotaDto, VisitaDto } from '@/api/types';
import { useAlimentador } from '@/context/AlimentadorContext';
import { fechaIso, inicioDelDia, minutosDeHora } from '@/utils/format';

/** Visitas de una mascota desde hace `dias` días; se recarga cuando llega una visita por SignalR. */
export function useVisitas(mascotaId: number | null | undefined, dias = 2) {
  const { ultimaVisita } = useAlimentador();
  const [visitas, setVisitas] = useState<VisitaDto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!mascotaId) {
      setVisitas([]);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const desde = inicioDelDia(new Date(Date.now() - (dias - 1) * 86_400_000));
      const lista = await mascotasApi.visitas(mascotaId, desde.toISOString());
      setVisitas(lista.slice().sort((a, b) => Date.parse(b.iniciadaEn) - Date.parse(a.iniciadaEn)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }, [mascotaId, dias]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (ultimaVisita && ultimaVisita.mascotaId === mascotaId) cargar();
  }, [ultimaVisita, mascotaId, cargar]);

  return { visitas, cargando, error, recargar: cargar };
}

/** Consumo diario (recomendado vs. real) de los últimos `dias` días, hoy incluido. */
export function useConsumo(mascotaId: number | null | undefined, dias = 7) {
  const { ultimaVisita } = useAlimentador();
  const [consumo, setConsumo] = useState<ConsumoDiarioDto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!mascotaId) {
      setConsumo([]);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const hasta = new Date();
      const desde = new Date(Date.now() - (dias - 1) * 86_400_000);
      setConsumo(await mascotasApi.consumo(mascotaId, fechaIso(desde), fechaIso(hasta)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }, [mascotaId, dias]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (ultimaVisita && ultimaVisita.mascotaId === mascotaId) cargar();
  }, [ultimaVisita, mascotaId, cargar]);

  return { consumo, cargando, error, recargar: cargar };
}

/** Horarios activos que aplican a la mascota (los suyos y los generales), ordenados por hora. */
export function horariosDeMascota(horarios: HorarioDto[], mascota: MascotaDto | null, soloActivos = true): HorarioDto[] {
  return horarios
    .filter((h) => (!soloActivos || h.activo) && (h.mascotaId === null || h.mascotaId === mascota?.id))
    .sort((a, b) => minutosDeHora(a.hora) - minutosDeHora(b.hora));
}

export type EstadoComida = 'listo' | 'pendiente' | 'omitida';

export interface ComidaDelDia {
  horario: HorarioDto;
  estado: EstadoComida;
}

/**
 * Marca cada horario de hoy como listo si hubo una visita entre 15 min antes de su hora
 * y 15 min antes del siguiente horario.
 */
export function comidasDeHoy(horarios: HorarioDto[], visitas: VisitaDto[], ahora = new Date()): ComidaDelDia[] {
  const hoy = inicioDelDia(ahora).getTime();
  const minutosVisitas = visitas
    .filter((v) => Date.parse(v.iniciadaEn) >= hoy)
    .map((v) => {
      const d = new Date(v.iniciadaEn);
      return d.getHours() * 60 + d.getMinutes();
    });
  const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();

  return horarios.map((h, i) => {
    const inicio = minutosDeHora(h.hora) - 15;
    const fin = i + 1 < horarios.length ? minutosDeHora(horarios[i + 1].hora) - 15 : 24 * 60;
    const comio = minutosVisitas.some((m) => m >= inicio && m < fin);
    const estado: EstadoComida = comio ? 'listo' : ahoraMin >= fin ? 'omitida' : 'pendiente';
    return { horario: h, estado };
  });
}

/** Siguiente horario (hoy o mañana) a partir de ahora. */
export function proximoHorario(horarios: HorarioDto[], ahora = new Date()): HorarioDto | null {
  if (!horarios.length) return null;
  const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
  return horarios.find((h) => minutosDeHora(h.hora) > ahoraMin) ?? horarios[0];
}

/** "manual" si hubo un dispensado manual completado poco antes de la visita. */
export function modoDeVisita(visita: VisitaDto, comandos: ComandoDto[]): 'manual' | 'automático' {
  const inicio = Date.parse(visita.iniciadaEn);
  const manual = comandos.some(
    (c) =>
      c.tipo === 'Dispensar' &&
      c.estado === 'Completado' &&
      (c.mascotaId === visita.mascotaId || c.mascotaId === null) &&
      inicio - Date.parse(c.creadoEn) >= -60_000 &&
      inicio - Date.parse(c.creadoEn) <= 10 * 60_000,
  );
  return manual ? 'manual' : 'automático';
}

/** Nivel de la tolva que usa la mascota (1 perro, 2 gato). */
export function nivelTolva(
  estado: { nivelTolvaPerroPorcentaje: number | null; nivelTolvaGatoPorcentaje: number | null } | undefined,
  tolva: number | undefined,
): number | null {
  if (!estado) return null;
  if (tolva === 2) return estado.nivelTolvaGatoPorcentaje;
  if (tolva === 1) return estado.nivelTolvaPerroPorcentaje;
  return estado.nivelTolvaPerroPorcentaje ?? estado.nivelTolvaGatoPorcentaje;
}
