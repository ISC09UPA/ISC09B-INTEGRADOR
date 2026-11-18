import { useEffect, useRef } from 'react';
import { useAnnounce } from '@fluentui/react-components';

/**
 * Anuncia un mensaje de estado (WCAG 4.1.3) cuando cambia, p. ej. el número de resultados
 * de una búsqueda. Usa el AriaLiveAnnouncer de Fluent montado en App.
 */
export function useAnunciar(mensaje: string | null, activo = true) {
  const { announce } = useAnnounce();
  const ultimo = useRef<string | null>(null);
  useEffect(() => {
    if (!activo || !mensaje || mensaje === ultimo.current) return;
    ultimo.current = mensaje;
    announce(mensaje, { polite: true });
  }, [mensaje, activo, announce]);
}
