import { Caption1, makeStyles, tokens } from '@fluentui/react-components';
import { useAhora } from '../hooks/useAhora';
import { fechaAbsoluta, fechaRelativa } from '../utils/formato';

const useEstilos = makeStyles({
  raiz: { display: 'inline-flex', flexDirection: 'column', minWidth: 0 },
  secundaria: { color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap' },
  primaria: { whiteSpace: 'nowrap' },
});

interface Props {
  iso: string | null | undefined;
  /** Muestra la fecha absoluta en una segunda línea (por defecto sí). */
  conAbsoluta?: boolean;
  vacio?: string;
}

/** Fecha relativa ("hace 5 minutos") con la absoluta debajo, ambas visibles para no depender de un tooltip. */
export function Fecha({ iso, conAbsoluta = true, vacio = 'Nunca' }: Props) {
  const s = useEstilos();
  const ahora = useAhora();
  if (!iso) return <span>{vacio}</span>;
  return (
    <span className={s.raiz}>
      <time dateTime={iso} className={s.primaria}>
        {fechaRelativa(iso, ahora)}
      </time>
      {conAbsoluta && <Caption1 className={s.secundaria}>{fechaAbsoluta(iso)}</Caption1>}
    </span>
  );
}

/** Variante en una sola línea: "hace 5 minutos (17 nov 2026, 14:02)". */
export function FechaEnLinea({ iso, vacio = 'Nunca' }: { iso: string | null | undefined; vacio?: string }) {
  const ahora = useAhora();
  if (!iso) return <span>{vacio}</span>;
  return (
    <time dateTime={iso}>
      {fechaRelativa(iso, ahora)} ({fechaAbsoluta(iso)})
    </time>
  );
}
