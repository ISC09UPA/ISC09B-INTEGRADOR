import { useEffect, useState } from 'react';
import { useDebounce } from './useDebounce';
import { useParametros } from './useParametros';

/** Texto de búsqueda con retraso que se refleja en la URL (?buscar=). */
export function useBusqueda(clave = 'buscar') {
  const { texto, cambiar } = useParametros();
  const enUrl = texto(clave);
  const [valor, setValor] = useState(enUrl);
  const retrasado = useDebounce(valor.trim());

  useEffect(() => {
    if (retrasado !== enUrl) cambiar({ [clave]: retrasado || null });
    // Solo reaccionamos al texto escrito; la URL se sincroniza desde aquí.
  }, [retrasado]);

  return { valor, setValor, aplicado: enUrl };
}
