import type { ReactNode } from 'react';
import { Body1, makeStyles, Title2, tokens } from '@fluentui/react-components';

const useEstilos = makeStyles({
  raiz: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalXL,
  },
  textos: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalXS,
    minWidth: 0,
  },
  titulo: { margin: 0, overflowWrap: 'anywhere' },
  descripcion: { color: tokens.colorNeutralForeground2 },
  acciones: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  antes: { marginBottom: tokens.spacingVerticalS },
});

interface Props {
  titulo: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  /** Contenido arriba del título (p. ej. Breadcrumb). */
  antes?: ReactNode;
}

/** Encabezado de página: un solo h1 por vista, descripción breve y acciones a la derecha. */
export function Encabezado({ titulo, descripcion, acciones, antes }: Props) {
  const s = useEstilos();
  return (
    <>
      {antes && <div className={s.antes}>{antes}</div>}
      <header className={s.raiz}>
        <div className={s.textos}>
          <Title2 as="h1" className={s.titulo}>
            {titulo}
          </Title2>
          {descripcion && <Body1 className={s.descripcion}>{descripcion}</Body1>}
        </div>
        {acciones && <div className={s.acciones}>{acciones}</div>}
      </header>
    </>
  );
}
