import { useCallback, useEffect, useRef, useState } from 'react';
import { escucharEnVivo, RECONECTADO } from '../api/tiempoReal';

/**
 * Carga datos de la API al abrir la pantalla.
 * const { datos, cargando, error, recargar } = useCarga(() => cajones.mapa(), []);
 * - dependencias: cuando cambian, se vuelve a cargar (por ejemplo, el filtro elegido).
 * - enVivo: eventos de SignalR (EVENTOS.cajon, EVENTOS.pluma...) que hacen que se recargue sola.
 *   También se recarga si la conexión en vivo se cayó y volvió, por si se perdió algún aviso.
 * - cadaMs: si se pasa, recarga sola cada ese tiempo.
 */
export function useCarga(cargar, dependencias, { cadaMs, enVivo } = {}) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const montado = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recargar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      const datos = await cargar();
      if (montado.current) setEstado({ datos, cargando: false, error: null });
    } catch (err) {
      if (montado.current) setEstado((e) => ({ ...e, cargando: false, error: err.message }));
    }
  }, dependencias);

  useEffect(() => {
    montado.current = true;
    recargar();
    return () => {
      montado.current = false;
    };
  }, [recargar]);

  useEffect(() => {
    if (!cadaMs) return undefined;
    const id = setInterval(() => recargar({ silencioso: true }), cadaMs);
    return () => clearInterval(id);
  }, [recargar, cadaMs]);

  // La lista se compara como texto para no volver a suscribirse en cada render.
  const eventos = enVivo?.length ? [...enVivo, RECONECTADO].join('|') : '';
  useEffect(() => {
    if (!eventos) return undefined;
    const alLlegar = () => recargar({ silencioso: true });
    const cancelar = eventos.split('|').map((e) => escucharEnVivo(e, alLlegar));
    return () => cancelar.forEach((fn) => fn());
  }, [recargar, eventos]);

  return { ...estado, recargar };
}
