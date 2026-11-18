import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Badge, Button, Caption1, Card, makeStyles, tokens } from '@fluentui/react-components';
import { BoxMultipleRegular, WarningRegular, ErrorCircleRegular } from '@fluentui/react-icons';
import { admin, claves } from '../../api/endpoints';
import type { EventoAdminDto, TipoEvento } from '../../api/types';
import { AUTO_ACTUALIZAR } from '../../components/Actualizacion';
import { BarraFiltros, useEstilosFiltros } from '../../components/BarraFiltros';
import { EnlaceRuta } from '../../components/EnlaceRuta';
import { AvisoDesactualizado, CargandoTabla, EstadoError, EstadoVacio } from '../../components/Estados';
import { Fecha } from '../../components/Fecha';
import { FiltroOpciones } from '../../components/FiltroOpciones';
import { Paginador } from '../../components/Paginador';
import { Tabla } from '../../components/Tabla';
import type { Columna } from '../../components/Tabla';
import { useOpcionesAlimentadores } from '../../hooks/useOpcionesAlimentadores';
import { TAMANO_PAGINA, useParametros } from '../../hooks/useParametros';
import { ETIQUETAS_EVENTO, nombreTolva } from '../../utils/formato';

const useEstilos = makeStyles({
  tarjeta: { padding: 0, overflow: 'hidden' },
  contenidoTarjeta: { padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL} ${tokens.spacingVerticalM}` },
  mono: { fontFamily: tokens.fontFamilyMonospace },
  secundario: { color: tokens.colorNeutralForeground3 },
});

function InsigniaEvento({ tipo }: { tipo: TipoEvento }) {
  return tipo === 'Jam' ? (
    <Badge appearance="tint" color="danger" icon={<ErrorCircleRegular />} size="small">
      {ETIQUETAS_EVENTO.Jam}
    </Badge>
  ) : (
    <Badge appearance="tint" color="warning" icon={<WarningRegular />} size="small">
      {ETIQUETAS_EVENTO.HopperLow}
    </Badge>
  );
}

export function PestanaEventos() {
  const s = useEstilos();
  const f = useEstilosFiltros();
  const { texto, numero, numeroOpcional, cambiar } = useParametros();
  const pagina = numero('pagina', 1);
  const alimentadorId = numeroOpcional('alimentadorId');
  const tipoUrl = texto('tipo');
  const tipo: TipoEvento | null = tipoUrl === 'Jam' || tipoUrl === 'HopperLow' ? tipoUrl : null;
  const opciones = useOpcionesAlimentadores();

  const consulta = useQuery({
    queryKey: [...claves.eventos, { alimentadorId, tipo, pagina }],
    queryFn: ({ signal }) => admin.eventos({ alimentadorId, tipo, pagina, tamano: TAMANO_PAGINA }, signal),
    placeholderData: keepPreviousData,
    ...AUTO_ACTUALIZAR,
  });
  const datos = consulta.data;
  const filtrando = alimentadorId !== null || tipo !== null;

  const columnas: Columna<EventoAdminDto>[] = [
    { id: 'fecha', encabezado: 'Cuándo', ancho: '22%', celda: (e) => <Fecha iso={e.ocurridoEn} /> },
    {
      id: 'alimentador',
      encabezado: 'Alimentador',
      ancho: '20%',
      celda: (e) => (
        <EnlaceRuta to={`/alimentadores/${e.alimentadorId}`} className={s.mono}>
          {e.alimentadorCodigo}
        </EnlaceRuta>
      ),
    },
    { id: 'tipo', encabezado: 'Evento', ancho: '18%', celda: (e) => <InsigniaEvento tipo={e.tipo} /> },
    { id: 'tolva', encabezado: 'Tolva', ancho: '12%', celda: (e) => nombreTolva(e.tolva) },
    {
      id: 'detalle',
      encabezado: 'Detalle',
      ancho: '28%',
      celda: (e) => (e.detalle ? e.detalle : <Caption1 className={s.secundario}>—</Caption1>),
    },
  ];

  const opcionesAlimentador = [
    { valor: '', texto: 'Todos' },
    ...(opciones.data ?? []).map((a) => ({ valor: String(a.id), texto: `${a.codigo} · ${a.nombre}` })),
  ];
  // Si llega un id por URL que aún no está en la lista, se muestra igual.
  if (alimentadorId !== null && !opcionesAlimentador.some((o) => o.valor === String(alimentadorId))) {
    opcionesAlimentador.push({ valor: String(alimentadorId), texto: `Alimentador ${alimentadorId}` });
  }

  return (
    <>
      <BarraFiltros>
        <FiltroOpciones
          etiqueta="Alimentador"
          className={f.filtro}
          valor={alimentadorId === null ? '' : String(alimentadorId)}
          opciones={opcionesAlimentador}
          onCambiar={(v) => cambiar({ alimentadorId: v || null })}
        />
        <FiltroOpciones
          etiqueta="Tipo"
          className={f.filtro}
          valor={tipo ?? ''}
          opciones={[
            { valor: '', texto: 'Todos' },
            { valor: 'Jam', texto: ETIQUETAS_EVENTO.Jam },
            { valor: 'HopperLow', texto: ETIQUETAS_EVENTO.HopperLow },
          ]}
          onCambiar={(v) => cambiar({ tipo: v || null })}
        />
      </BarraFiltros>
      {datos && consulta.isError && <AvisoDesactualizado error={consulta.error} onReintentar={() => void consulta.refetch()} />}
      <Card className={s.tarjeta}>
        <div className={s.contenidoTarjeta}>
          {consulta.isPending && <CargandoTabla etiqueta="Cargando eventos" />}
          {consulta.isError && !datos && (
            <EstadoError error={consulta.error} onReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
          )}
          {datos && datos.elementos.length === 0 && (
            <EstadoVacio
              icono={<BoxMultipleRegular />}
              titulo={filtrando ? 'Ningún evento coincide' : 'Sin eventos'}
              descripcion={filtrando ? 'Cambia los filtros para ver más.' : 'Aquí aparecen los atascos y avisos de tolva baja de los ESP32.'}
              accion={filtrando ? <Button onClick={() => cambiar({ alimentadorId: null, tipo: null })}>Quitar filtros</Button> : undefined}
            />
          )}
          {datos && datos.elementos.length > 0 && (
            <>
              <Tabla items={datos.elementos} columnas={columnas} getId={(e) => e.id} etiqueta="Eventos" anchoMinimo={720} />
              <Paginador
                pagina={datos.pagina}
                tamano={datos.tamano}
                total={datos.total}
                etiqueta="eventos"
                cargando={consulta.isFetching}
                onCambiar={(p) => cambiar({ pagina: p })}
              />
            </>
          )}
        </div>
      </Card>
    </>
  );
}
