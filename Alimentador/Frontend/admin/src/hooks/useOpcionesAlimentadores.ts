import { useQuery } from '@tanstack/react-query';
import { admin, claves } from '../api/endpoints';

/** Lista corta de alimentadores (máx. 100) para filtros por alimentador. */
export function useOpcionesAlimentadores() {
  return useQuery({
    queryKey: [...claves.alimentadores, 'opciones'],
    queryFn: ({ signal }) => admin.alimentadores({ pagina: 1, tamano: 100 }, signal),
    staleTime: 60_000,
    select: (p) => p.elementos.map((a) => ({ id: a.id, codigo: a.codigo, nombre: a.nombre })),
  });
}
