import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carga datos de la API al abrir la pantalla.
 * const { datos, cargando, error, recargar } = useCarga(() => cajones.mapa(), []);
 * - dependencias: cuando cambian, se vuelve a cargar (por ejemplo, el filtro elegido).
 * - cadaMs: si se pasa, recarga sola cada ese tiempo (mientras llega SignalR).
 */
export function useCarga(cargar, dependencias, { cadaMs } = {}) {
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

  return { ...estado, recargar };
}
