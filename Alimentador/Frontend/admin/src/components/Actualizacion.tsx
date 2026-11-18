import { Button, Caption1, makeStyles, tokens, Tooltip } from '@fluentui/react-components';
import { ArrowClockwiseRegular } from '@fluentui/react-icons';
import { useAhora } from '../hooks/useAhora';
import { fechaRelativa } from '../utils/formato';

const useEstilos = makeStyles({
  raiz: { display: 'flex', alignItems: 'center', columnGap: tokens.spacingHorizontalXS },
  texto: { color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap' },
});

interface Props {
  actualizadoEn: number;
  actualizando: boolean;
  onActualizar: () => void;
  /** Indica que la vista se recarga sola cada 30 s. */
  automatico?: boolean;
}

/** "Actualizado hace 1 minuto" + botón para recargar a mano. */
export function Actualizacion({ actualizadoEn, actualizando, onActualizar, automatico }: Props) {
  const s = useEstilos();
  const ahora = useAhora();
  const cuando = actualizadoEn ? fechaRelativa(new Date(actualizadoEn).toISOString(), Math.max(ahora, actualizadoEn)) : null;
  return (
    <div className={s.raiz}>
      {cuando && (
        <Caption1 className={s.texto}>
          {actualizando ? 'Actualizando…' : `Actualizado ${cuando}`}
          {automatico && !actualizando ? ' · cada 30 s' : ''}
        </Caption1>
      )}
      <Tooltip content="Actualizar ahora" relationship="label">
        <Button appearance="subtle" icon={<ArrowClockwiseRegular />} onClick={onActualizar} disabled={actualizando} />
      </Tooltip>
    </div>
  );
}

/** Intervalo de auto-actualización; TanStack Query lo pausa con la pestaña oculta. */
export const AUTO_ACTUALIZAR = {
  refetchInterval: 30_000,
  refetchIntervalInBackground: false,
} as const;
