import { useCallback, useEffect, useState } from 'react';

import { api, mensajeDe } from './api';
import { parseHora } from './format';
import { EstadoServicios, Foto } from './types';

/** Últimas fotos de accesos guardadas en Azure Blob Storage (las sube la Raspberry). */
export function useFotos(max = 40, cadaMs = 25000) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setFotos(await api.get<Foto[]>(`/api/fotos?max=${max}`, 20000));
      setError(null);
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setCargando(false);
    }
  }, [max]);

  useEffect(() => {
    void cargar();
    const id = setInterval(() => void cargar(), cadaMs);
    return () => clearInterval(id);
  }, [cargar, cadaMs]);

  return { fotos, cargando, error, recargar: cargar };
}

/** Foto tomada a menos de `seg` segundos del evento (para mostrarla en la línea de tiempo). */
export function fotoCercana(fotos: Foto[], hora: string, seg = 25): Foto | undefined {
  const t = parseHora(hora).getTime();
  return fotos.find((f) => Math.abs(parseHora(f.hora).getTime() - t) <= seg * 1000);
}

export function useServicios() {
  const [estado, setEstado] = useState<EstadoServicios | null>(null);
  const recargar = useCallback(async () => {
    try {
      setEstado(await api.get<EstadoServicios>('/api/estado'));
    } catch {
      setEstado(null);
    }
  }, []);
  useEffect(() => {
    void recargar();
  }, [recargar]);
  return { estado, recargar };
}
