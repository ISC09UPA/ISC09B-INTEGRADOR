import type { ReactNode } from 'react';
import { Card, makeStyles, mergeClasses, Subtitle2, tokens, useId } from '@fluentui/react-components';

const useEstilos = makeStyles({
  card: { rowGap: tokens.spacingVerticalM, minWidth: 0 },
  encabezado: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
  },
  titulo: { margin: 0 },
});

interface Props {
  titulo: string;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Bloque de contenido con título (h2) dentro de una Card de Fluent. */
export function Seccion({ titulo, acciones, children, className }: Props) {
  const s = useEstilos();
  const id = useId('seccion');
  return (
    <Card className={mergeClasses(s.card, className)} role="region" aria-labelledby={id}>
      <div className={s.encabezado}>
        <Subtitle2 as="h2" id={id} className={s.titulo}>
          {titulo}
        </Subtitle2>
        {acciones}
      </div>
      {children}
    </Card>
  );
}
