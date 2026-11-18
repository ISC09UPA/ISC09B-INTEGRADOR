import { Field, ProgressBar, makeStyles, tokens } from '@fluentui/react-components';
import { porciento } from '../utils/formato';

const useEstilos = makeStyles({
  compacto: { display: 'flex', alignItems: 'center', columnGap: tokens.spacingHorizontalS, minWidth: '96px' },
  barra: { flexGrow: 1, minWidth: '48px' },
  valor: { fontVariantNumeric: 'tabular-nums', minWidth: '3.5ch', textAlign: 'end' },
});

/** Umbral visual de tolva baja (el backend alerta con HOPPER_LOW del ESP32). */
const UMBRAL_BAJO = 20;

function color(p: number) {
  return p < UMBRAL_BAJO ? 'error' : p < 40 ? 'warning' : 'brand';
}

interface Props {
  etiqueta: string;
  porcentaje: number | null;
  /** Versión compacta para tablas: barra y número en una línea. */
  compacto?: boolean;
}

/** Nivel de una tolva (0–100 %) con ProgressBar; el texto acompaña siempre al color. */
export function NivelTolva({ etiqueta, porcentaje, compacto }: Props) {
  const s = useEstilos();
  if (porcentaje === null) {
    return compacto ? <span aria-label={`${etiqueta}: sin dato`}>—</span> : (
      <Field label={etiqueta} validationMessage="Sin dato" validationState="none">
        <ProgressBar value={0} aria-valuetext="Sin dato" />
      </Field>
    );
  }
  const p = Math.max(0, Math.min(100, porcentaje));
  const texto = `${porciento(p / 100)}${p < UMBRAL_BAJO ? ' (baja)' : ''}`;
  if (compacto) {
    return (
      <span className={s.compacto}>
        <ProgressBar
          className={s.barra}
          value={p}
          max={100}
          color={color(p)}
          aria-label={etiqueta}
          aria-valuetext={texto}
        />
        <span className={s.valor} aria-hidden>
          {porciento(p / 100)}
        </span>
      </span>
    );
  }
  return (
    <Field
      label={etiqueta}
      validationMessage={texto}
      validationState={p < UMBRAL_BAJO ? 'warning' : 'none'}
    >
      <ProgressBar value={p} max={100} color={color(p)} thickness="large" aria-valuetext={texto} />
    </Field>
  );
}
