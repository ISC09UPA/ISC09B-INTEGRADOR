import type { ReactNode } from 'react';
import {
  Body1,
  Button,
  makeStyles,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Skeleton,
  SkeletonItem,
  Subtitle2,
  tokens,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, ErrorCircleFilled, WarningRegular } from '@fluentui/react-icons';
import { mensajeDeError } from '../api/cliente';

const useEstilos = makeStyles({
  cuerpo: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalXXS },
  aviso: { marginBottom: tokens.spacingVerticalL },
  vacio: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    rowGap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalXXXL,
    paddingBottom: tokens.spacingVerticalXXXL,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    color: tokens.colorNeutralForeground2,
  },
  icono: { fontSize: '40px', color: tokens.colorNeutralForeground3 },
  filas: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalM,
  },
  fila: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    columnGap: tokens.spacingHorizontalL,
  },
});

interface PropsError {
  error: unknown;
  titulo?: string;
  onReintentar?: () => void;
  reintentando?: boolean;
}

/** Error al cargar datos: siempre con una salida (Reintentar). */
export function EstadoError({ error, titulo = 'No se pudo cargar la información', onReintentar, reintentando }: PropsError) {
  const s = useEstilos();
  return (
    <MessageBar intent="error" layout="multiline" icon={<ErrorCircleFilled />}>
      <MessageBarBody className={s.cuerpo}>
        <MessageBarTitle>{titulo}</MessageBarTitle>
        {mensajeDeError(error)}
      </MessageBarBody>
      {onReintentar && (
        <MessageBarActions>
          <Button icon={<ArrowClockwiseRegular />} onClick={onReintentar} disabled={reintentando}>
            Reintentar
          </Button>
        </MessageBarActions>
      )}
    </MessageBar>
  );
}

interface PropsVacio {
  icono: ReactNode;
  titulo: string;
  descripcion?: ReactNode;
  accion?: ReactNode;
}

export function EstadoVacio({ icono, titulo, descripcion, accion }: PropsVacio) {
  const s = useEstilos();
  return (
    <div className={s.vacio}>
      <span className={s.icono} aria-hidden>
        {icono}
      </span>
      <Subtitle2 as="h2">{titulo}</Subtitle2>
      {descripcion && <Body1>{descripcion}</Body1>}
      {accion}
    </div>
  );
}

/** Esqueleto de tabla mientras carga la primera página. */
export function CargandoTabla({ filas = 6, etiqueta = 'Cargando datos' }: { filas?: number; etiqueta?: string }) {
  const s = useEstilos();
  return (
    <div aria-busy="true">
      <Skeleton aria-label={etiqueta} className={s.filas}>
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className={s.fila}>
            <SkeletonItem size={16} />
            <SkeletonItem size={16} />
            <SkeletonItem size={16} />
            <SkeletonItem size={16} />
          </div>
        ))}
      </Skeleton>
    </div>
  );
}

/** La recarga falló pero hay datos previos: se muestran y se avisa que pueden estar desactualizados. */
export function AvisoDesactualizado({ error, onReintentar }: { error: unknown; onReintentar: () => void }) {
  const s = useEstilos();
  return (
    <MessageBar intent="warning" layout="multiline" className={s.aviso} icon={<WarningRegular />}>
      <MessageBarBody className={s.cuerpo}>
        <MessageBarTitle>No se pudo actualizar</MessageBarTitle>
        Se muestran los últimos datos disponibles. {mensajeDeError(error)}
      </MessageBarBody>
      <MessageBarActions>
        <Button icon={<ArrowClockwiseRegular />} onClick={onReintentar}>
          Reintentar
        </Button>
      </MessageBarActions>
    </MessageBar>
  );
}
