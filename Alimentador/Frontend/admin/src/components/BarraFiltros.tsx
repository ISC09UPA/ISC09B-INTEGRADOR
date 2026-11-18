import type { ReactNode } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';

const useEstilos = makeStyles({
  raiz: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL,
  },
  busqueda: { flexGrow: 1, flexBasis: '260px', maxWidth: '420px', minWidth: 0 },
  filtro: { flexBasis: '180px', minWidth: '160px', '@media (max-width: 639px)': { flexGrow: 1 } },
  fin: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
});

export function useEstilosFiltros() {
  return useEstilos();
}

/** Fila de filtros encima de una tabla; cada control lleva su etiqueta visible (Field). */
export function BarraFiltros({ children, fin }: { children: ReactNode; fin?: ReactNode }) {
  const s = useEstilos();
  return (
    <div className={s.raiz} role="search">
      {children}
      {fin && <div className={s.fin}>{fin}</div>}
    </div>
  );
}
