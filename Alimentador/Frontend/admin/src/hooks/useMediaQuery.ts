import { useSyncExternalStore } from 'react';

/** true mientras la media query coincide; se actualiza al cambiar el tamaño o el tema del sistema. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', avisar);
      return () => media.removeEventListener('change', avisar);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Ancho a partir del cual la navegación lateral se muestra fija (inline). */
export const CONSULTA_ESCRITORIO = '(min-width: 768px)';
export const CONSULTA_MOVIL = '(max-width: 639px)';
