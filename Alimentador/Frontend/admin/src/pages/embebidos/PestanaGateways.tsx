import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Body1,
  Button,
  Caption1,
  Card,
  CardHeader,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  makeStyles,
  mergeClasses,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Subtitle2,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import { DeveloperBoardRegular, KeyResetRegular, MoreHorizontalRegular, WarningRegular } from '@fluentui/react-icons';
import { admin, claves } from '../../api/endpoints';
import type { AlimentadorDeGatewayDto, GatewayAdminDto, GatewayClaveResponse } from '../../api/types';
import { Actualizacion, AUTO_ACTUALIZAR } from '../../components/Actualizacion';
import { BotonCopiar } from '../../components/BotonCopiar';
import { DialogoConfirmacion } from '../../components/DialogoConfirmacion';
import { EnlaceRuta } from '../../components/EnlaceRuta';
import { AvisoDesactualizado, CargandoTabla, EstadoError, EstadoVacio } from '../../components/Estados';
import { Fecha, FechaEnLinea } from '../../components/Fecha';
import { InsigniaConexion } from '../../components/Insignias';
import { NivelTolva } from '../../components/NivelTolva';
import { useNotificar } from '../../components/Notificaciones';
import { Tabla } from '../../components/Tabla';
import type { Columna } from '../../components/Tabla';
import { numero } from '../../utils/formato';

const useEstilos = makeStyles({
  barra: { display: 'flex', justifyContent: 'flex-end', marginBottom: tokens.spacingVerticalM },
  lista: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalL },
  card: { rowGap: tokens.spacingVerticalM },
  cabecera: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  nombre: { fontFamily: tokens.fontFamilyMonospace, margin: 0 },
  datos: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    margin: 0,
  },
  dato: { display: 'flex', flexDirection: 'column', rowGap: '2px', minWidth: 0 },
  termino: { color: tokens.colorNeutralForeground3 },
  definicion: { margin: 0, overflowWrap: 'anywhere' },
  pila: { display: 'flex', flexDirection: 'column', rowGap: '2px', minWidth: 0 },
  secundario: { color: tokens.colorNeutralForeground3 },
  mono: { fontFamily: tokens.fontFamilyMonospace },
  sinEsp: { color: tokens.colorNeutralForeground3 },
  clave: { fontFamily: tokens.fontFamilyMonospace },
  filaClave: { display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'flex-end' },
  campoClave: { flexGrow: 1, minWidth: 0 },
  contenido: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalM },
  cuerpo: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalXXS },
});

function DialogoClave({ clave, onCerrar }: { clave: GatewayClaveResponse | null; onCerrar: () => void }) {
  const s = useEstilos();
  return (
    <Dialog open={clave !== null} modalType="alert">
      <DialogSurface aria-describedby={undefined}>
        <DialogBody>
          <DialogTitle>Nueva clave de {clave?.deviceId}</DialogTitle>
          <DialogContent className={s.contenido}>
            <MessageBar intent="warning" layout="multiline" icon={<WarningRegular />}>
              <MessageBarBody className={s.cuerpo}>
                <MessageBarTitle>Solo se muestra esta vez</MessageBarTitle>
                Cópiala ahora y configúrala en la Raspberry Pi. En el servidor solo queda su hash.
              </MessageBarBody>
            </MessageBar>
            <div className={s.filaClave}>
              <Field label="Clave del dispositivo" className={s.campoClave}>
                <Input readOnly value={clave?.clave ?? ''} className={s.clave} onFocus={(e) => e.currentTarget.select()} />
              </Field>
              {clave && <BotonCopiar valor={clave.clave} etiqueta="Copiar clave" conTexto size="medium" appearance="secondary" />}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={onCerrar}>
              Ya la guardé
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

function TarjetaGateway({ g, onRegenerar }: { g: GatewayAdminDto; onRegenerar: () => void }) {
  const s = useEstilos();
  const columnas: Columna<AlimentadorDeGatewayDto>[] = [
    {
      id: 'esp',
      encabezado: 'ESP32',
      ancho: '22%',
      celda: (a) => (
        <span className={s.pila}>
          <EnlaceRuta to={`/alimentadores/${a.id}`}>{a.nombre}</EnlaceRuta>
          <Caption1 className={mergeClasses(s.secundario, s.mono)}>{a.codigo}</Caption1>
        </span>
      ),
    },
    { id: 'conexion', encabezado: 'Conexión', ancho: '16%', celda: (a) => <InsigniaConexion enLinea={a.enLinea} size="small" /> },
    {
      id: 'versiones',
      encabezado: 'Firmware · modelo',
      ancho: '17%',
      celda: (a) => (
        <span className={s.pila}>
          <Text className={s.mono}>{a.versionFirmware ?? '—'}</Text>
          <Caption1 className={mergeClasses(s.secundario, s.mono)}>{a.versionModelo ?? '—'}</Caption1>
        </span>
      ),
    },
    {
      id: 'perro',
      encabezado: 'Tolva perro',
      ancho: '14%',
      celda: (a) => <NivelTolva etiqueta={`Tolva de perro de ${a.nombre}`} porcentaje={a.nivelTolvaPerroPorcentaje} compacto />,
    },
    {
      id: 'gato',
      encabezado: 'Tolva gato',
      ancho: '14%',
      celda: (a) => <NivelTolva etiqueta={`Tolva de gato de ${a.nombre}`} porcentaje={a.nivelTolvaGatoPorcentaje} compacto />,
    },
    { id: 'estado', encabezado: 'Último estado', ancho: '17%', secundaria: true, celda: (a) => <Fecha iso={a.ultimoEstado} /> },
  ];

  return (
    <Card className={s.card} role="region" aria-labelledby={`gw-${g.id}`}>
      <CardHeader
        image={<DeveloperBoardRegular fontSize={24} aria-hidden />}
        header={
          <span className={s.cabecera}>
            <Subtitle2 as="h2" id={`gw-${g.id}`} className={s.nombre}>
              {g.deviceId}
            </Subtitle2>
            <InsigniaConexion enLinea={g.enLinea} sincronizando={g.sincronizando} />
          </span>
        }
        description={
          <Caption1 className={s.secundario}>
            {g.propietario ? `${g.propietario.nombre} · ${g.propietario.email}` : 'Sin propietario'}
          </Caption1>
        }
        action={
          <Menu positioning={{ autoSize: true }}>
            <MenuTrigger disableButtonEnhancement>
              <Tooltip content={`Acciones para ${g.deviceId}`} relationship="label">
                <Button appearance="subtle" icon={<MoreHorizontalRegular />} />
              </Tooltip>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<KeyResetRegular />} onClick={onRegenerar}>
                  Regenerar clave
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        }
      />
      <dl className={s.datos}>
        <div className={s.dato}>
          <dt className={s.termino}><Caption1>Último heartbeat</Caption1></dt>
          <dd className={s.definicion}><Fecha iso={g.ultimoHeartbeat} /></dd>
        </div>
        {g.sinConexionDesde && (
          <div className={s.dato}>
            <dt className={s.termino}><Caption1>Sin conexión desde</Caption1></dt>
            <dd className={s.definicion}><FechaEnLinea iso={g.sinConexionDesde} /></dd>
          </div>
        )}
        {g.sincronizando && (
          <div className={s.dato}>
            <dt className={s.termino}><Caption1>Sincronizando desde</Caption1></dt>
            <dd className={s.definicion}><FechaEnLinea iso={g.sincronizandoDesde} vacio="—" /></dd>
          </div>
        )}
        <div className={s.dato}>
          <dt className={s.termino}><Caption1>Registrada</Caption1></dt>
          <dd className={s.definicion}><FechaEnLinea iso={g.creadoEn} /></dd>
        </div>
        <div className={s.dato}>
          <dt className={s.termino}><Caption1>Alimentadores</Caption1></dt>
          <dd className={s.definicion}>{numero(g.alimentadores.length)}</dd>
        </div>
      </dl>
      {g.alimentadores.length === 0 ? (
        <Body1 className={s.sinEsp}>No tiene alimentadores ligados.</Body1>
      ) : (
        <Tabla items={g.alimentadores} columnas={columnas} getId={(a) => a.id} etiqueta={`ESP32 de ${g.deviceId}`} anchoMinimo={760} tamano="small" />
      )}
    </Card>
  );
}

export function PestanaGateways() {
  const s = useEstilos();
  const notificar = useNotificar();
  const consulta = useQuery({
    queryKey: claves.gateways,
    queryFn: ({ signal }) => admin.gateways(signal),
    ...AUTO_ACTUALIZAR,
  });
  const [porRegenerar, setPorRegenerar] = useState<GatewayAdminDto | null>(null);
  const [clave, setClave] = useState<GatewayClaveResponse | null>(null);
  const regenerar = useMutation({
    mutationFn: (id: number) => admin.regenerarClave(id),
    onSuccess: (r) => {
      setClave(r);
      notificar.exito(`Se generó una nueva clave para ${r.deviceId}`);
    },
  });
  const datos = consulta.data;

  return (
    <>
      <div className={s.barra}>
        <Actualizacion
          actualizadoEn={consulta.dataUpdatedAt}
          actualizando={consulta.isFetching}
          onActualizar={() => void consulta.refetch()}
          automatico
        />
      </div>
      {datos && consulta.isError && <AvisoDesactualizado error={consulta.error} onReintentar={() => void consulta.refetch()} />}
      {consulta.isPending && <CargandoTabla etiqueta="Cargando Raspberry Pi" />}
      {consulta.isError && !datos && (
        <EstadoError error={consulta.error} onReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
      )}
      {datos && datos.length === 0 && (
        <Card>
          <EstadoVacio
            icono={<DeveloperBoardRegular />}
            titulo="No hay Raspberry Pi registradas"
            descripcion="Los usuarios registran su Pi desde la app; aparecerá aquí con sus ESP32."
          />
        </Card>
      )}
      {datos && datos.length > 0 && (
        <div className={s.lista}>
          {datos.map((g) => (
            <TarjetaGateway key={g.id} g={g} onRegenerar={() => setPorRegenerar(g)} />
          ))}
        </div>
      )}

      <DialogoConfirmacion
        abierto={porRegenerar !== null}
        titulo={`¿Regenerar la clave de ${porRegenerar?.deviceId ?? ''}?`}
        textoConfirmar="Regenerar clave"
        peligroso
        onCerrar={() => setPorRegenerar(null)}
        onConfirmar={() => (porRegenerar ? regenerar.mutateAsync(porRegenerar.id) : Promise.resolve())}
      >
        <Body1>
          La clave actual deja de funcionar de inmediato. La Raspberry Pi no podrá sincronizar hasta que le configures la
          nueva.
        </Body1>
      </DialogoConfirmacion>
      <DialogoClave clave={clave} onCerrar={() => setClave(null)} />
    </>
  );
}
