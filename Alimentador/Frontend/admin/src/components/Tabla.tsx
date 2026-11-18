import type { ReactNode } from 'react';
import {
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
import { CONSULTA_ESCRITORIO, useMediaQuery } from '../hooks/useMediaQuery';

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
});

/**
 * Tabla de Fluent (Table) con columnas declarativas, selección opcional y desplazamiento
 * horizontal accesible (región con nombre y enfocable) en pantallas angostas.
 */
export function Tabla<T>({ items, columnas, getId, etiqueta, anchoMinimo = 720, seleccion, claseFila, tamano = 'medium' }: Props<T>) {
  const s = useEstilos();
  const escritorio = useMediaQuery(CONSULTA_ESCRITORIO);
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

  return (
    <div className={s.region} role="region" aria-label={etiqueta} tabIndex={0}>
      <Table
        className={s.tabla}
        aria-label={etiqueta}
        size={tamano}
        style={{ minWidth: escritorio ? `${anchoMinimo}px` : `${Math.round(anchoMinimo * 0.75)}px` }}
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
