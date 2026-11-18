import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  ProgressBar,
  Radio,
  RadioGroup,
  Text,
  tokens,
} from '@fluentui/react-components';
import { DocumentRegular, ErrorCircleFilled } from '@fluentui/react-icons';
import type { Subida } from '../../api/cliente';
import { mensajeDeError } from '../../api/cliente';
import { claves, ota } from '../../api/endpoints';
import { MAX_TAMANO_ARTEFACTO } from '../../api/types';
import type { ArtefactoOtaDto } from '../../api/types';
import { useNotificar } from '../../components/Notificaciones';
import { porciento, tamanoLegible } from '../../utils/formato';

const useEstilos = makeStyles({
  contenido: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalL },
  selector: { display: 'flex', alignItems: 'center', columnGap: tokens.spacingHorizontalM, minWidth: 0 },
  nombreArchivo: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, color: tokens.colorNeutralForeground2 },
  oculto: { display: 'none' },
});

interface Props {
  abierto: boolean;
  onCerrar: () => void;
}

/** Publicar un firmware o modelo: tipo, versión y archivo (máx. 32 MB) con progreso de subida. */
export function DialogoSubida({ abierto, onCerrar }: Props) {
  const s = useEstilos();
  const queryClient = useQueryClient();
  const notificar = useNotificar();
  const [tipo, setTipo] = useState<'firmware' | 'modelo'>('firmware');
  const [version, setVersion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const subida = useRef<Subida<ArtefactoOtaDto> | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) {
      setTipo('firmware');
      setVersion('');
      setArchivo(null);
      setIntentado(false);
      setProgreso(null);
      setError(null);
    }
  }, [abierto]);

  const subiendo = progreso !== null;
  const versionInvalida = version.trim().length === 0 || version.trim().length > 50;
  const archivoGrande = archivo !== null && archivo.size > MAX_TAMANO_ARTEFACTO;
  const archivoVacio = archivo !== null && archivo.size === 0;
  const errorArchivo = archivoGrande
    ? `El archivo pesa ${tamanoLegible(archivo.size)}; el máximo es 32 MB.`
    : archivoVacio
      ? 'El archivo está vacío.'
      : intentado && !archivo
        ? 'Elige el archivo .bin del firmware o el modelo.'
        : undefined;

  const cerrar = () => {
    subida.current?.cancelar();
    subida.current = null;
    onCerrar();
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setIntentado(true);
    if (versionInvalida || !archivo || archivoGrande || archivoVacio) return;
    setError(null);
    setProgreso(0);
    const s2 = ota.publicar({ tipo, version: version.trim(), archivo }, setProgreso);
    subida.current = s2;
    try {
      const creado = await s2.promesa;
      void queryClient.invalidateQueries({ queryKey: claves.artefactos });
      void queryClient.invalidateQueries({ queryKey: claves.resumen });
      notificar.exito(`Se publicó ${creado.tipo === 'Firmware' ? 'el firmware' : 'el modelo'} ${creado.version}`);
      subida.current = null;
      onCerrar();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) setError(err);
      setProgreso(null);
      subida.current = null;
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(_, d) => !d.open && cerrar()}>
      <DialogSurface aria-describedby={undefined}>
        <form onSubmit={enviar} noValidate>
          <DialogBody>
            <DialogTitle>Subir artefacto</DialogTitle>
            <DialogContent className={s.contenido}>
              <Field label="Tipo" required>
                <RadioGroup
                  layout="horizontal"
                  value={tipo}
                  onChange={(_, d) => setTipo(d.value as 'firmware' | 'modelo')}
                  disabled={subiendo}
                >
                  <Radio value="firmware" label="Firmware del ESP32" />
                  <Radio value="modelo" label="Modelo de visión" />
                </RadioGroup>
              </Field>
              <Field
                label="Versión"
                required
                hint={!(intentado && versionInvalida) ? 'Debe ser única para su tipo, p. ej. 1.3.0 o m-2026-11-15.' : undefined}
                validationState={intentado && versionInvalida ? 'error' : 'none'}
                validationMessage={intentado && versionInvalida ? 'Escribe una versión de 1 a 50 caracteres.' : undefined}
              >
                <Input value={version} onChange={(_, d) => setVersion(d.value)} disabled={subiendo} autoComplete="off" />
              </Field>
              <Field
                label="Archivo"
                required
                hint={!errorArchivo ? (archivo ? `${tamanoLegible(archivo.size)} de 32 MB como máximo.` : 'Máximo 32 MB.') : undefined}
                validationState={errorArchivo ? 'error' : 'none'}
                validationMessage={errorArchivo}
              >
                {({ 'aria-required': _requerido, 'aria-invalid': _invalido, ...props }) => (
                  <div className={s.selector}>
                    {/* El input nativo queda oculto; el botón de Fluent lo abre y recibe la etiqueta del Field. */}
                    <Button {...props} icon={<DocumentRegular />} disabled={subiendo} onClick={() => entrada.current?.click()}>
                      {archivo ? 'Cambiar archivo' : 'Elegir archivo'}
                    </Button>
                    <Text className={s.nombreArchivo}>{archivo ? archivo.name : 'Ningún archivo elegido'}</Text>
                    <input
                      ref={entrada}
                      type="file"
                      className={s.oculto}
                      tabIndex={-1}
                      aria-hidden
                      accept=".bin,.tflite,.onnx,.hef,.pt,application/octet-stream"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setArchivo(e.target.files?.[0] ?? null)}
                    />
                  </div>
                )}
              </Field>
              {subiendo && (
                <Field label="Subiendo" validationMessage={porciento(progreso)} validationState="none">
                  <ProgressBar value={progreso} max={1} />
                </Field>
              )}
              {error !== null && (
                <MessageBar intent="error" layout="multiline" icon={<ErrorCircleFilled />}>
                  <MessageBarBody>{mensajeDeError(error)}</MessageBarBody>
                </MessageBar>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={cerrar}>
                {subiendo ? 'Cancelar subida' : 'Cancelar'}
              </Button>
              <Button appearance="primary" type="submit" disabled={subiendo}>
                Subir
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}
