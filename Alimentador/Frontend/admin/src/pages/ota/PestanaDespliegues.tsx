import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Body1, Button, Caption1, Card, makeStyles, mergeClasses, Text, tokens } from '@fluentui/react-components';
import { DismissCircleRegular, HistoryRegular } from '@fluentui/react-icons';
import { admin, claves, ota } from '../../api/endpoints';
import { ESTADOS_COMANDO } from '../../api/types';
import type { ComandoAdminDto, EstadoComando } from '../../api/types';
import { Actualizacion, AUTO_ACTUALIZAR } from '../../components/Actualizacion';
import { BarraFiltros, useEstilosFiltros } from '../../components/BarraFiltros';
import { DialogoConfirmacion } from '../../components/DialogoConfirmacion';
import { EnlaceRuta } from '../../components/EnlaceRuta';
import { AvisoDesactualizado, CargandoTabla, EstadoError, EstadoVacio } from '../../components/Estados';
import { Fecha, FechaEnLinea } from '../../components/Fecha';
import { FiltroOpciones } from '../../components/FiltroOpciones';
import { InsigniaComando } from '../../components/Insignias';
import { useNotificar } from '../../components/Notificaciones';
import { OcultoVisual } from '../../components/OcultoVisual';
import { Paginador } from '../../components/Paginador';
import { Tabla } from '../../components/Tabla';
import type { Columna } from '../../components/Tabla';
import { useOpcionesAlimentadores } from '../../hooks/useOpcionesAlimentadores';
import { TAMANO_PAGINA, useParametros } from '../../hooks/useParametros';
import { ETIQUETAS_ESTADO_COMANDO } from '../../utils/formato';
import { InsigniaTipo } from './InsigniaTipo';

const useEstilos = makeStyles({
  tarjeta: { padding: 0, overflow: 'hidden' },
  contenidoTarjeta: { padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL} ${tokens.spacingVerticalM}` },
  pila: { display: 'flex', flexDirection: 'column', rowGap: '2px', minWidth: 0, alignItems: 'flex-start' },
  mono: { fontFamily: tokens.fontFamilyMonospace },
  secundario: { color: tokens.colorNeutralForeground3 },
  error: { color: tokens.colorPaletteRedForeground1 },
});

export function PestanaDespliegues() {
  const s = useEstilos();
  const f = useEstilosFiltros();
  const queryClient = useQueryClient();
  const notificar = useNotificar();
  const { texto, numero, numeroOpcional, cambiar } = useParametros();
  const pagina = numero('pagina', 1);
  const estadoUrl = texto('estado');
  const estado = (ESTADOS_COMANDO as readonly string[]).includes(estadoUrl) ? (estadoUrl as EstadoComando) : null;
  const artefactoId = numeroOpcional('artefactoId');
  const alimentadorId = numeroOpcional('alimentadorId');
  const [porCancelar, setPorCancelar] = useState<ComandoAdminDto | null>(null);

  const artefactos = useQuery({ queryKey: claves.artefactos, queryFn: ({ signal }) => ota.artefactos(signal) });
  const alimentadores = useOpcionesAlimentadores();
  const consulta = useQuery({
    queryKey: [...claves.despliegues, { estado, artefactoId, alimentadorId, pagina }],
    queryFn: ({ signal }) =>
      admin.despliegues({ estado, artefactoId, alimentadorId, pagina, tamano: TAMANO_PAGINA }, signal),
    placeholderData: keepPreviousData,
    ...AUTO_ACTUALIZAR,
  });
  const cancelar = useMutation({
    mutationFn: (c: ComandoAdminDto) => admin.cancelarDespliegue(c.id),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: claves.despliegues });
      void queryClient.invalidateQueries({ queryKey: claves.resumen });
      notificar.exito(`Se canceló la actualización de ${r.alimentadorCodigo}`);
    },
  });
  const datos = consulta.data;
  const filtrando = estado !== null || artefactoId !== null || alimentadorId !== null;

  const columnas: Columna<ComandoAdminDto>[] = [
    {
      id: 'alimentador',
      encabezado: 'Alimentador',
      ancho: '18%',
      celda: (c) => (
        <span className={s.pila}>
          <EnlaceRuta to={`/alimentadores/${c.alimentadorId}`}>{c.alimentadorNombre}</EnlaceRuta>
          <Caption1 className={mergeClasses(s.secundario, s.mono)}>{c.alimentadorCodigo}</Caption1>
        </span>
      ),
    },
    {
      id: 'artefacto',
      encabezado: 'Artefacto',
      ancho: '16%',
      celda: (c) =>
        c.artefacto ? (
          <span className={s.pila}>
            <InsigniaTipo tipo={c.artefacto.tipo} />
            <Text className={s.mono}>{c.artefacto.version}</Text>
          </span>
        ) : (
          '—'
        ),
    },
    { id: 'estado', encabezado: 'Estado', ancho: '13%', celda: (c) => <InsigniaComando estado={c.estado} size="small" /> },
    { id: 'por', encabezado: 'Solicitado por', ancho: '13%', secundaria: true, celda: (c) => c.solicitadoPor?.nombre ?? '—' },
    { id: 'creado', encabezado: 'Creado', ancho: '15%', celda: (c) => <Fecha iso={c.creadoEn} /> },
    {
      id: 'resultado',
      encabezado: 'Resultado',
      ancho: '15%',
      secundaria: true,
      celda: (c) =>
        c.error ? (
          <Caption1 className={s.error}>{c.error}</Caption1>
        ) : c.completadoEn ? (
          <Caption1 className={s.secundario}>
            Terminó <FechaEnLinea iso={c.completadoEn} />
          </Caption1>
        ) : c.entregadoEn ? (
          <Caption1 className={s.secundario}>
            Entregado <FechaEnLinea iso={c.entregadoEn} />
          </Caption1>
        ) : (
          <Caption1 className={s.secundario}>Esperando a la Raspberry Pi</Caption1>
        ),
    },
    {
      id: 'acciones',
      encabezado: <OcultoVisual>Acciones</OcultoVisual>,
      ancho: '10%',
      celda: (c) =>
        c.estado === 'Pendiente' ? (
          <Button size="small" icon={<DismissCircleRegular />} onClick={() => setPorCancelar(c)} aria-label={`Cancelar actualización de ${c.alimentadorCodigo}`}>
            Cancelar
          </Button>
        ) : null,
    },
  ];

  const opcionesArtefacto = [
    { valor: '', texto: 'Todos' },
    ...(artefactos.data ?? []).map((a) => ({ valor: String(a.id), texto: `${a.tipo === 'Firmware' ? 'Firmware' : 'Modelo'} ${a.version}` })),
  ];
  const opcionesAlimentador = [
    { valor: '', texto: 'Todos' },
    ...(alimentadores.data ?? []).map((a) => ({ valor: String(a.id), texto: `${a.codigo} · ${a.nombre}` })),
  ];
  if (alimentadorId !== null && !opcionesAlimentador.some((o) => o.valor === String(alimentadorId))) {
    opcionesAlimentador.push({ valor: String(alimentadorId), texto: `Alimentador ${alimentadorId}` });
  }

  return (
    <>
      <BarraFiltros
        fin={
          <Actualizacion
            actualizadoEn={consulta.dataUpdatedAt}
            actualizando={consulta.isFetching}
            onActualizar={() => void consulta.refetch()}
            automatico
          />
        }
      >
        <FiltroOpciones
          etiqueta="Estado"
          className={f.filtro}
          valor={estado ?? ''}
          opciones={[{ valor: '', texto: 'Todos' }, ...ESTADOS_COMANDO.map((e) => ({ valor: e, texto: ETIQUETAS_ESTADO_COMANDO[e] }))]}
          onCambiar={(v) => cambiar({ estado: v || null })}
        />
        <FiltroOpciones
          etiqueta="Artefacto"
          className={f.filtro}
          valor={artefactoId === null ? '' : String(artefactoId)}
          opciones={opcionesArtefacto}
          onCambiar={(v) => cambiar({ artefactoId: v || null })}
        />
        <FiltroOpciones
          etiqueta="Alimentador"
          className={f.filtro}
          valor={alimentadorId === null ? '' : String(alimentadorId)}
          opciones={opcionesAlimentador}
          onCambiar={(v) => cambiar({ alimentadorId: v || null })}
        />
      </BarraFiltros>
      {datos && consulta.isError && <AvisoDesactualizado error={consulta.error} onReintentar={() => void consulta.refetch()} />}
      <Card className={s.tarjeta}>
        <div className={s.contenidoTarjeta}>
          {consulta.isPending && <CargandoTabla etiqueta="Cargando despliegues" />}
          {consulta.isError && !datos && (
            <EstadoError error={consulta.error} onReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
          )}
          {datos && datos.elementos.length === 0 && (
            <EstadoVacio
              icono={<HistoryRegular />}
              titulo={filtrando ? 'Ningún despliegue coincide' : 'Aún no hay despliegues'}
              descripcion={filtrando ? 'Cambia los filtros para ver más.' : 'Lanza uno desde “Lanzar despliegue”.'}
              accion={
                filtrando ? (
                  <Button onClick={() => cambiar({ estado: null, artefactoId: null, alimentadorId: null })}>Quitar filtros</Button>
                ) : undefined
              }
            />
          )}
          {datos && datos.elementos.length > 0 && (
            <>
              <Tabla items={datos.elementos} columnas={columnas} getId={(c) => c.id} etiqueta="Despliegues OTA" anchoMinimo={980} />
              <Paginador
                pagina={datos.pagina}
                tamano={datos.tamano}
                total={datos.total}
                etiqueta="despliegues"
                cargando={consulta.isFetching}
                onCambiar={(p) => cambiar({ pagina: p })}
              />
            </>
          )}
        </div>
      </Card>

      <DialogoConfirmacion
        abierto={porCancelar !== null}
        titulo={`¿Cancelar la actualización de ${porCancelar?.alimentadorCodigo ?? ''}?`}
        textoConfirmar="Cancelar actualización"
        textoCancelar="Mantener"
        peligroso
        onCerrar={() => setPorCancelar(null)}
        onConfirmar={() => (porCancelar ? cancelar.mutateAsync(porCancelar) : Promise.resolve())}
      >
        <Body1>
          Solo se puede cancelar mientras la Raspberry Pi no la haya recogido. Quedará como fallida con el motivo “Cancelado
          por un administrador”.
        </Body1>
      </DialogoConfirmacion>
    </>
  );
}
