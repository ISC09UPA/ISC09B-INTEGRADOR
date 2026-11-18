import { Button, Caption1, makeStyles, tokens } from '@fluentui/react-components';
import { ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';
import { numero } from '../utils/formato';

const useEstilos = makeStyles({
  raiz: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
  },
  botones: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  texto: { color: tokens.colorNeutralForeground2 },
});

interface Props {
  pagina: number;
  tamano: number;
  total: number;
  onCambiar: (pagina: number) => void;
  /** Nombre de lo que se pagina, para el nombre accesible de la navegación. */
  etiqueta: string;
  cargando?: boolean;
}

export function Paginador({ pagina, tamano, total, onCambiar, etiqueta, cargando }: Props) {
  const s = useEstilos();
  const paginas = Math.max(1, Math.ceil(total / tamano));
  const desde = total === 0 ? 0 : (pagina - 1) * tamano + 1;
  const hasta = Math.min(total, pagina * tamano);

  return (
    <nav className={s.raiz} aria-label={`Paginación de ${etiqueta}`}>
      <Caption1 className={s.texto} aria-live="polite">
        {total === 0 ? 'Sin resultados' : `${numero(desde)}–${numero(hasta)} de ${numero(total)}`}
      </Caption1>
      {paginas > 1 && (
        <div className={s.botones}>
          <Button
            size="small"
            icon={<ChevronLeftRegular />}
            disabled={pagina <= 1 || cargando}
            onClick={() => onCambiar(pagina - 1)}
          >
            Anterior
          </Button>
          <Caption1 className={s.texto}>
            Página {numero(pagina)} de {numero(paginas)}
          </Caption1>
          <Button
            size="small"
            icon={<ChevronRightRegular />}
            iconPosition="after"
            disabled={pagina >= paginas || cargando}
            onClick={() => onCambiar(pagina + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </nav>
  );
}
