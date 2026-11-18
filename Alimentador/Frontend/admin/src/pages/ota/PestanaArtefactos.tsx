import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Body1, Button, Card, makeStyles, Text, tokens, Tooltip } from '@fluentui/react-components';
import { ArrowUploadRegular, BoxRegular, DeleteRegular, RocketRegular } from '@fluentui/react-icons';
import { claves, ota } from '../../api/endpoints';
import type { ArtefactoOtaDto } from '../../api/types';
import { BotonCopiar } from '../../components/BotonCopiar';
import { BotonRuta } from '../../components/BotonRuta';
import { DialogoConfirmacion } from '../../components/DialogoConfirmacion';
import { AvisoDesactualizado, CargandoTabla, EstadoError, EstadoVacio } from '../../components/Estados';
import { Fecha } from '../../components/Fecha';
import { useNotificar } from '../../components/Notificaciones';
import { OcultoVisual } from '../../components/OcultoVisual';
import { Tabla } from '../../components/Tabla';
import type { Columna } from '../../components/Tabla';
import { shaCorto, tamanoLegible } from '../../utils/formato';
import { DialogoSubida } from './DialogoSubida';
import { InsigniaTipo } from './InsigniaTipo';

const useEstilos = makeStyles({
  barra: { display: 'flex', justifyContent: 'flex-end', marginBottom: tokens.spacingVerticalM },
  tarjeta: { padding: 0, overflow: 'hidden' },
  contenidoTarjeta: { padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL} ${tokens.spacingVerticalM}` },
  mono: { fontFamily: tokens.fontFamilyMonospace },
  sha: { display: 'inline-flex', alignItems: 'center', columnGap: tokens.spacingHorizontalXS },
  acciones: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: tokens.spacingHorizontalXS },
  numero: { fontVariantNumeric: 'tabular-nums' },
});

export function PestanaArtefactos() {
  const s = useEstilos();
  const queryClient = useQueryClient();
  const notificar = useNotificar();
  const [subir, setSubir] = useState(false);
  const [porBorrar, setPorBorrar] = useState<ArtefactoOtaDto | null>(null);
  const consulta = useQuery({ queryKey: claves.artefactos, queryFn: ({ signal }) => ota.artefactos(signal) });
  const borrar = useMutation({
    mutationFn: (a: ArtefactoOtaDto) => ota.eliminar(a.id),
    onSuccess: (_, a) => {
      void queryClient.invalidateQueries({ queryKey: claves.artefactos });
      void queryClient.invalidateQueries({ queryKey: claves.resumen });
      notificar.exito(`Se eliminó ${a.tipo === 'Firmware' ? 'el firmware' : 'el modelo'} ${a.version}`);
    },
  });
  const datos = consulta.data;

  const columnas: Columna<ArtefactoOtaDto>[] = [
    { id: 'tipo', encabezado: 'Tipo', ancho: '14%', celda: (a) => <InsigniaTipo tipo={a.tipo} /> },
    { id: 'version', encabezado: 'Versión', ancho: '18%', celda: (a) => <Text weight="semibold" className={s.mono}>{a.version}</Text> },
    { id: 'tamano', encabezado: 'Tamaño', ancho: '11%', alinear: 'end', celda: (a) => <Text className={s.numero}>{tamanoLegible(a.tamanoBytes)}</Text> },
    {
      id: 'sha',
      encabezado: 'SHA-256',
      ancho: '21%',
      secundaria: true,
      celda: (a) => (
        <span className={s.sha}>
          <Text className={s.mono}>{shaCorto(a.sha256)}</Text>
          <BotonCopiar valor={a.sha256} etiqueta={`Copiar SHA-256 de ${a.version}`} />
        </span>
      ),
    },
    { id: 'creado', encabezado: 'Publicado', ancho: '17%', celda: (a) => <Fecha iso={a.creadoEn} /> },
    {
      id: 'acciones',
      encabezado: <OcultoVisual>Acciones</OcultoVisual>,
      ancho: '19%',
      celda: (a) => (
        <span className={s.acciones}>
          <BotonRuta to={`/ota/desplegar?artefacto=${a.id}`} size="small" icon={<RocketRegular />}>
            Desplegar
          </BotonRuta>
          <Tooltip content={`Eliminar ${a.version}`} relationship="label">
            <Button size="small" appearance="subtle" icon={<DeleteRegular />} onClick={() => setPorBorrar(a)} />
          </Tooltip>
        </span>
      ),
    },
  ];

  return (
    <>
      <div className={s.barra}>
        <Button icon={<ArrowUploadRegular />} onClick={() => setSubir(true)}>
          Subir artefacto
        </Button>
      </div>
      {datos && consulta.isError && <AvisoDesactualizado error={consulta.error} onReintentar={() => void consulta.refetch()} />}
      <Card className={s.tarjeta}>
        <div className={s.contenidoTarjeta}>
          {consulta.isPending && <CargandoTabla etiqueta="Cargando artefactos" />}
          {consulta.isError && !datos && (
            <EstadoError error={consulta.error} onReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
          )}
          {datos && datos.length === 0 && (
            <EstadoVacio
              icono={<BoxRegular />}
              titulo="Aún no hay artefactos"
              descripcion="Sube un firmware o un modelo para poder desplegarlo."
              accion={
                <Button appearance="primary" icon={<ArrowUploadRegular />} onClick={() => setSubir(true)}>
                  Subir artefacto
                </Button>
              }
            />
          )}
          {datos && datos.length > 0 && (
            <Tabla items={datos} columnas={columnas} getId={(a) => a.id} etiqueta="Artefactos OTA" anchoMinimo={860} />
          )}
        </div>
      </Card>

      <DialogoSubida abierto={subir} onCerrar={() => setSubir(false)} />
      <DialogoConfirmacion
        abierto={porBorrar !== null}
        titulo={`¿Eliminar ${porBorrar?.tipo === 'Modelo' ? 'el modelo' : 'el firmware'} ${porBorrar?.version ?? ''}?`}
        textoConfirmar="Eliminar"
        peligroso
        onCerrar={() => setPorBorrar(null)}
        onConfirmar={() => (porBorrar ? borrar.mutateAsync(porBorrar) : Promise.resolve())}
      >
        <Body1>Se borra el archivo del almacenamiento. Solo es posible si ninguna actualización lo ha usado.</Body1>
      </DialogoConfirmacion>
    </>
  );
}
