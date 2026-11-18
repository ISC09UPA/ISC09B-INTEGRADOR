import { useEffect } from 'react';

/** Título del documento por página (lo anuncian los lectores de pantalla al navegar). */
export function useTitulo(titulo: string) {
  useEffect(() => {
    document.title = `${titulo} · Alimentador Administración`;
  }, [titulo]);
}
