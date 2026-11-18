import { Fragment } from 'react';
import type { ReactNode } from 'react';
import {
  Checkbox,
  makeStyles,
  mergeClasses,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableSelectionCell,
  tokens,
} from '@fluentui/react-components';
import { CONSULTA_ESCRITORIO, CONSULTA_MOVIL, useMediaQuery } from '../hooks/useMediaQuery';

export type IdFila = number | string;

export interface Columna<T> {
  id: string;
  encabezado: ReactNode;
  celda: (item: T) => ReactNode;
  /** Ancho CSS de la columna (la tabla usa table-layout fijo). */
  ancho?: string;
  /** Columna secundaria: se oculta por debajo de 768 px. */
  secundaria?: boolean;
  alinear?: 'start' | 'end';
}

export interface Seleccion<T> {
  seleccionados: ReadonlySet<IdFila>;
  onCambiar: (nuevos: Set<IdFila>) => void;
  /** Nombre accesible de la casilla de cada fila: "Seleccionar feeder01". */
  etiquetaFila: (item: T) => string;
  deshabilitada?: (item: T) => boolean;
}

interface Props<T> {
  items: T[];
  columnas: Columna<T>[];
  getId: (item: T) => IdFila;
  /** Nombre accesible de la tabla y de su región desplazable. */
  etiqueta: string;
  /** Ancho mínimo antes de activar el desplazamiento horizontal. */
  anchoMinimo?: number;
  seleccion?: Seleccion<T>;
  claseFila?: (item: T) => string | undefined;
  tamano?: 'small' | 'medium';
}

const useEstilos = makeStyles({
  region: {
    overflowX: 'auto',
    maxWidth: '100%',
    borderRadius: tokens.borderRadiusMedium,
    ':focus-visible': {
      outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '2px',
    },
  },
  tabla: { tableLayout: 'fixed', width: '100%' },
  celda: { paddingTop: tokens.spacingVerticalS, paddingBottom: tokens.spacingVerticalS, overflowWrap: 'anywhere' },
  encabezado: { fontWeight: tokens.fontWeightSemibold },
  fin: { textAlign: 'end', justifyContent: 'flex-end' },
  seleccion: { width: '44px' },
  // Vista de lista para pantallas angostas (< 640 px)
  lista: { listStyleType: 'none', margin: 0, padding: 0 },
  todos: { paddingBottom: tokens.spacingVerticalXS, borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    columnGap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    ':last-child': { borderBottom: 'none' },
  },
  cuerpoItem: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalS },
  tituloItem: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', columnGap: tokens.spacingHorizontalS },
  pares: {
    display: 'grid',
    gridTemplateColumns: 'minmax(96px, 38%) minmax(0, 1fr)',
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalS,
    margin: 0,
    alignItems: 'center',
  },
  termino: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200, lineHeight: tokens.lineHeightBase200 },
  definicion: { margin: 0, minWidth: 0, overflowWrap: 'anywhere' },
});

/**
 * Tabla de Fluent (Table) con columnas declarativas, selección opcional y desplazamiento
 * horizontal accesible (región con nombre y enfocable) en pantallas angostas.
 */
export function Tabla<T>({ items, columnas, getId, etiqueta, anchoMinimo = 720, seleccion, claseFila, tamano = 'medium' }: Props<T>) {
  const s = useEstilos();
  const escritorio = useMediaQuery(CONSULTA_ESCRITORIO);
  const movil = useMediaQuery(CONSULTA_MOVIL);
  const visibles = escritorio ? columnas : columnas.filter((c) => !c.secundaria);

  const seleccionables = seleccion ? items.filter((i) => !seleccion.deshabilitada?.(i)) : [];
  const marcados = seleccion ? seleccionables.filter((i) => seleccion.seleccionados.has(getId(i))).length : 0;
  const todos = marcados > 0 && marcados === seleccionables.length;
  const estadoTodos = todos ? true : marcados > 0 ? 'mixed' : false;

  const alternarTodos = () => {
    if (!seleccion) return;
    const nuevos = new Set(seleccion.seleccionados);
    for (const i of seleccionables) {
      if (todos) nuevos.delete(getId(i));
      else nuevos.add(getId(i));
    }
    seleccion.onCambiar(nuevos);
  };

  const alternar = (item: T) => {
    if (!seleccion || seleccion.deshabilitada?.(item)) return;
    const nuevos = new Set(seleccion.seleccionados);
    const id = getId(item);
    if (nuevos.has(id)) nuevos.delete(id);
    else nuevos.add(id);
    seleccion.onCambiar(nuevos);
  };

  if (movil) {
    // En móvil cada fila es un bloque: la primera columna es el título y el resto pares etiqueta–valor.
    const [primera, ...resto] = visibles;
    const acciones = resto.find((c) => c.id === 'acciones');
    const pares = resto.filter((c) => c.id !== 'acciones');
    return (
      <>
        {seleccion && seleccionables.length > 0 && (
          <div className={s.todos}>
            <Checkbox checked={estadoTodos} onChange={alternarTodos} label="Seleccionar todos los de esta página" />
          </div>
        )}
        <ul className={s.lista} aria-label={etiqueta}>
          {items.map((item) => {
            const id = getId(item);
            return (
              <li key={id} className={mergeClasses(s.item, claseFila?.(item))}>
                {seleccion && (
                  <Checkbox
                    checked={seleccion.seleccionados.has(id)}
                    onChange={() => alternar(item)}
                    aria-label={seleccion.etiquetaFila(item)}
                    disabled={seleccion.deshabilitada?.(item)}
                  />
                )}
                <div className={s.cuerpoItem}>
                  <div className={s.tituloItem}>
                    <div>{primera?.celda(item)}</div>
                    {acciones?.celda(item)}
                  </div>
                  {pares.length > 0 && (
                    <dl className={s.pares}>
                      {pares.map((c) => (
                        <Fragment key={c.id}>
                          <dt className={s.termino}>{c.encabezado}</dt>
                          <dd className={s.definicion}>{c.celda(item)}</dd>
                        </Fragment>
                      ))}
                    </dl>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  return (
    <div className={s.region} role="region" aria-label={etiqueta} tabIndex={0}>
      <Table
        className={s.tabla}
        aria-label={etiqueta}
        size={tamano}
        style={{ minWidth: `${escritorio ? anchoMinimo : Math.round(anchoMinimo * 0.8)}px` }}
      >
        <TableHeader>
          <TableRow>
            {seleccion && (
              <TableSelectionCell
                className={s.seleccion}
                checked={estadoTodos}
                onClick={alternarTodos}
                checkboxIndicator={{ 'aria-label': 'Seleccionar todos los de esta página' }}
                type="checkbox"
              />
            )}
            {visibles.map((c) => (
              <TableHeaderCell
                key={c.id}
                className={mergeClasses(s.encabezado, c.alinear === 'end' && s.fin)}
                button={c.alinear === 'end' ? { className: s.fin } : undefined}
                style={c.ancho ? { width: c.ancho } : undefined}
              >
                {c.encabezado}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const id = getId(item);
            const marcado = seleccion?.seleccionados.has(id) ?? false;
            return (
              <TableRow key={id} className={claseFila?.(item)} aria-selected={seleccion ? marcado : undefined}>
                {seleccion && (
                  <TableSelectionCell
                    className={s.seleccion}
                    checked={marcado}
                    onClick={() => alternar(item)}
                    checkboxIndicator={{
                      'aria-label': seleccion.etiquetaFila(item),
                      disabled: seleccion.deshabilitada?.(item),
                    }}
                    type="checkbox"
                  />
                )}
                {visibles.map((c) => (
                  <TableCell key={c.id} className={mergeClasses(s.celda, c.alinear === 'end' && s.fin)}>
                    {c.celda(item)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
