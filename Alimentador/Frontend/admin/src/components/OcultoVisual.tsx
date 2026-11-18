import type { ReactNode } from 'react';
import { makeStyles } from '@fluentui/react-components';

const useEstilos = makeStyles({
  oculto: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: 0,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
});

/** Texto solo para lectores de pantalla (p. ej. encabezado de la columna de acciones). */
export function OcultoVisual({ children }: { children: ReactNode }) {
  const s = useEstilos();
  return <span className={s.oculto}>{children}</span>;
}
