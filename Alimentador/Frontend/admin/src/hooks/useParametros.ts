import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Estado de filtros y paginación en la URL (?buscar=&pagina=), para que el botón Atrás
 * y los enlaces compartidos conserven la vista.
 */
export function useParametros() {
  const [params, setParams] = useSearchParams();

  const texto = useCallback((clave: string, porDefecto = '') => params.get(clave) ?? porDefecto, [params]);
  const numero = useCallback(
    (clave: string, porDefecto: number) => {
      const n = Number(params.get(clave));
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : porDefecto;
    },
    [params],
  );
  const numeroOpcional = useCallback(
    (clave: string): number | null => {
      const n = Number(params.get(clave));
      return params.has(clave) && Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    },
    [params],
  );

  /** Cambia uno o varios parámetros; `null` o '' los quita. Reinicia la página salvo que se indique. */
  const cambiar = useCallback(
    (cambios: Record<string, string | number | null | undefined>, opciones?: { conservarPagina?: boolean }) => {
      setParams(
        (previos) => {
          const nuevos = new URLSearchParams(previos);
          for (const [k, v] of Object.entries(cambios)) {
            if (v === null || v === undefined || v === '') nuevos.delete(k);
            else nuevos.set(k, String(v));
          }
          if (!opciones?.conservarPagina && !('pagina' in cambios)) nuevos.delete('pagina');
          return nuevos;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { params, texto, numero, numeroOpcional, cambiar };
}

export const TAMANO_PAGINA = 25;
