import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { alimentadoresApi, horariosApi, mascotasApi, otaApi } from '@/api/endpoints';
import type { ArtefactoOtaDto, ComandoDto, HorarioDto, TipoArtefactoOta } from '@/api/types';
import { BotonCircular, BotonIcono } from '@/components/Buttons';
import { HorarioModal } from '@/components/HorarioModal';
import { Screen } from '@/components/Screen';
import { Aviso, Barra, Cargador, Interruptor, Pildora, TextoError } from '@/components/Ui';
import { useAlimentador } from '@/context/AlimentadorContext';
import type { PreferenciasAlertas } from '@/storage/preferencias';
import { colors, fonts } from '@/theme';
import { haceTiempo, horaDeTimeOnly, minutosDeHora, porcentaje, timeOnly } from '@/utils/format';

function confirmar(titulo: string, mensaje: string, accion: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${titulo}\n\n${mensaje}`) ?? false);
  return new Promise((resolve) =>
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: accion, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/** Compara versiones tipo "1.2.10" por segmentos numéricos. */
function compararVersion(a: string, b: string): number {
  const pa = a.split(/[.\-+]/).map((x) => Number.parseInt(x, 10) || 0);
  const pb = b.split(/[.\-+]/).map((x) => Number.parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

function estadoOta(c: ComandoDto | undefined): string | null {
  if (!c) return null;
  switch (c.estado) {
    case 'Pendiente':
      return 'Actualización en cola…';
    case 'Entregado':
      return 'Instalando…';
    case 'Completado':
      return 'Actualización completada';
    case 'Fallido':
      return c.error ? `Falló: ${c.error}` : 'La actualización falló';
    case 'Vencido':
      return 'El dispensador no respondió';
  }
}

/**
 * Mockup "Dispenser".
 * Datos: GET /api/alimentadores/{id} (estado por SignalR), GET/POST /api/alimentadores/{id}/horarios,
 * PUT/DELETE /api/horarios/{id}, PUT /api/mascotas/{id} (comidas por día),
 * GET /api/ota/artefactos y POST /api/alimentadores/{id}/ota (solo Dueño).
 */
export default function Dispenser() {
  const {
    alimentador,
    mascotas,
    mascota,
    horarios,
    comandos,
    esDueno,
    cargando,
    preferenciasAlertas,
    guardarPreferencias,
    recargar,
    recargarHorarios,
    recargarMascotas,
    registrarComando,
  } = useAlimentador();

  // Cambios pendientes hasta "Guardar cambios".
  const [activos, setActivos] = useState<Record<number, boolean>>({});
  const [comidas, setComidas] = useState<number | null>(null);
  const [prefs, setPrefs] = useState<PreferenciasAlertas>(preferenciasAlertas);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const [artefactos, setArtefactos] = useState<ArtefactoOtaDto[]>([]);
  const [otaId, setOtaId] = useState<number | null>(null);
  const [lanzando, setLanzando] = useState<TipoArtefactoOta | null>(null);

  useEffect(() => setPrefs(preferenciasAlertas), [preferenciasAlertas]);
  useEffect(() => setComidas(null), [mascota?.id]);

  useEffect(() => {
    let vivo = true;
    otaApi
      .artefactos()
      .then((a) => vivo && setArtefactos(a))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [alimentador?.id]);

  const ordenados = useMemo(
    () => horarios.slice().sort((a, b) => minutosDeHora(a.hora) - minutosDeHora(b.hora)),
    [horarios],
  );

  if (!alimentador) {
    return (
      <Screen fondo={colors.bg} edges={['top']}>
        <View style={styles.cabecera}>
          <Text style={styles.titulo}>Dispensador</Text>
          <BotonIcono icono="plus" etiqueta="Agregar dispensador" onPress={() => router.push('/ajustes')} />
        </View>
        {cargando ? <Cargador /> : <Aviso icono="cpu" titulo="Aún no tienes un dispensador" accion="Configurar" onAccion={() => router.push('/ajustes')} />}
      </Screen>
    );
  }

  const estado = alimentador.estado;
  const conectado = estado.enLinea && estado.gatewayEnLinea;
  const subtitulo = !estado.gatewayEnLinea
    ? 'Raspberry sin conexión'
    : !estado.enLinea
      ? 'Raspberry en línea · dispensador sin conexión'
      : estado.ultimaSincronizacion
        ? `En línea · sincronizado ${haceTiempo(estado.ultimaSincronizacion)}`
        : 'En línea';

  const activo = (h: HorarioDto) => activos[h.id] ?? h.activo;
  const comidasActuales = comidas ?? mascota?.comidasPorDia ?? 1;
  const porcion = mascota ? mascota.gramosPorDiaRecomendados / comidasActuales : 0;
  const hayCambios =
    Object.entries(activos).some(([id, v]) => horarios.find((h) => h.id === Number(id))?.activo !== v) ||
    (comidas !== null && comidas !== mascota?.comidasPorDia) ||
    prefs.pocoAlimento !== preferenciasAlertas.pocoAlimento ||
    prefs.atasco !== preferenciasAlertas.atasco ||
    prefs.desconexion !== preferenciasAlertas.desconexion;

  const nombreMascota = (id: number | null) => (id === null ? null : (mascotas.find((m) => m.id === id)?.nombre ?? null));
  const gramosHorario = (h: HorarioDto) => {
    const m = h.mascotaId === null ? (mascotas.length === 1 ? mascotas[0] : null) : mascotas.find((x) => x.id === h.mascotaId);
    return m ? `${Math.round(m.gramosPorComida)} g` : 'porción de cada mascota';
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    setMensaje(null);
    try {
      const pendientes = horarios.filter((h) => activos[h.id] !== undefined && activos[h.id] !== h.activo);
      await Promise.all(
        pendientes.map((h) => horariosApi.actualizar(h.id, { mascotaId: h.mascotaId, hora: h.hora, activo: activos[h.id] })),
      );
      if (mascota && comidas !== null && comidas !== mascota.comidasPorDia) {
        await mascotasApi.actualizar(mascota.id, {
          nombre: mascota.nombre,
          especie: mascota.especie,
          pesoKg: mascota.pesoKg,
          edadMeses: mascota.edadMeses,
          nivelActividad: mascota.nivelActividad,
          esterilizado: mascota.esterilizado,
          comidasPorDia: comidas,
          etiquetaRfid: mascota.etiquetaRfid,
        });
      }
      await guardarPreferencias(prefs);
      await Promise.all([recargarHorarios(), recargarMascotas()]);
      setActivos({});
      setComidas(null);
      setMensaje('Cambios guardados');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const agregarHorario = async (horas: number, minutos: number, mascotaId: number | null) => {
    await horariosApi.crear(alimentador.id, { mascotaId, hora: timeOnly(horas, minutos), activo: true });
    await recargarHorarios();
  };

  const eliminarHorario = async (h: HorarioDto) => {
    if (!esDueno) return;
    if (!(await confirmar('¿Eliminar horario?', `Se quitará la comida de las ${horaDeTimeOnly(h.hora)}.`, 'Eliminar'))) return;
    try {
      await horariosApi.eliminar(h.id);
      await recargarHorarios();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // OTA: última versión publicada de cada tipo frente a la instalada.
  const ultimo = (tipo: TipoArtefactoOta) =>
    artefactos.filter((a) => a.tipo === tipo).sort((a, b) => compararVersion(b.version, a.version))[0];
  const firmware = ultimo('Firmware');
  const modelo = ultimo('Modelo');
  const hayNuevo = (a: ArtefactoOtaDto | undefined, instalada: string | null) =>
    !!a && (!instalada || compararVersion(a.version, instalada) > 0);
  const comandoOta = comandos.find((c) => c.id === otaId) ?? comandos.find((c) => c.tipo === 'Ota');
  const otaEnCurso = comandoOta?.estado === 'Pendiente' || comandoOta?.estado === 'Entregado';

  const actualizar = async (a: ArtefactoOtaDto) => {
    const nombre = a.tipo === 'Firmware' ? 'firmware' : 'modelo';
    if (!(await confirmar(`¿Actualizar ${nombre}?`, `Se instalará la versión ${a.version} en el dispensador.`, 'Actualizar'))) return;
    setLanzando(a.tipo);
    setError(null);
    try {
      const c = await alimentadoresApi.lanzarOta(alimentador.id, a.id);
      registrarComando(c);
      setOtaId(c.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLanzando(null);
    }
  };

  const filaVersion = (titulo: string, instalada: string | null, disponible: ArtefactoOtaDto | undefined, ultimaFila = false) => {
    const nuevo = hayNuevo(disponible, instalada);
    return (
      <View style={[styles.fila, ultimaFila && styles.filaUltima]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.alertaTexto}>{titulo}</Text>
          <Text style={styles.filaSub}>
            {instalada ? `Versión ${instalada}` : 'Versión desconocida'}
            {nuevo && disponible ? ` · disponible ${disponible.version}` : disponible ? ' · al día' : ''}
          </Text>
        </View>
        {esDueno && nuevo && disponible ? (
          <Pressable
            onPress={() => actualizar(disponible)}
            disabled={otaEnCurso || lanzando !== null}
            style={[styles.actualizar, (otaEnCurso || lanzando !== null) && { opacity: 0.5 }]}
            accessibilityRole="button">
            <Text style={styles.actualizarTexto}>{lanzando === disponible.tipo ? 'Enviando…' : 'Actualizar'}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <Screen
      fondo={colors.bg}
      edges={['top']}
      contenido={styles.contenido}
      refrescando={refrescando}
      alRefrescar={async () => {
        setRefrescando(true);
        await recargar();
        setRefrescando(false);
      }}>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>Dispensador</Text>
        <BotonIcono icono="plus" etiqueta="Agregar dispensador" onPress={() => router.push('/ajustes')} />
      </View>

      {/* Tarjeta oscura de estado */}
      <Pressable style={styles.oscura} onPress={() => router.push('/ajustes')} accessibilityRole="button">
        <View style={styles.oscuraCabecera}>
          <View style={{ flex: 1 }}>
            <Text style={styles.oscuraTitulo} numberOfLines={1}>
              {alimentador.nombre}
            </Text>
            <Text style={styles.oscuraSub} numberOfLines={1}>
              {subtitulo}
            </Text>
          </View>
          <Pildora
            texto={conectado ? 'Conectado' : 'Desconectado'}
            fondo="#4A4A4A"
            color={conectado ? colors.white : '#FF8A8A'}
            style={{ height: 30, borderRadius: 15, paddingHorizontal: 14 }}
            textoStyle={{ fontSize: 14, color: colors.white }}
          />
        </View>
        <View style={styles.niveles}>
          {[
            { etiqueta: 'Tolva de perro', valor: estado.nivelTolvaPerroPorcentaje },
            { etiqueta: 'Tolva de gato', valor: estado.nivelTolvaGatoPorcentaje },
          ].map((n) => (
            <View key={n.etiqueta} style={styles.nivel}>
              <Text style={styles.nivelEtiqueta}>{n.etiqueta}</Text>
              <Text style={styles.nivelValor}>{porcentaje(n.valor)}</Text>
              <Barra valor={n.valor} color="#F2F2F2" pista="#5E5E5E" alto={6} />
            </View>
          ))}
        </View>
      </Pressable>

      {/* Horarios */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Horarios de comida</Text>
        <Text style={styles.seccionDato}>{ordenados.filter(activo).length} al día</Text>
      </View>
      {ordenados.length ? (
        <View style={styles.tarjeta}>
          {ordenados.map((h, i) => {
            const nombre = nombreMascota(h.mascotaId);
            return (
              <Pressable
                key={h.id}
                onLongPress={() => eliminarHorario(h)}
                delayLongPress={400}
                style={[styles.fila, i === ordenados.length - 1 && styles.filaUltima]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.horaTexto}>{horaDeTimeOnly(h.hora)}</Text>
                  <Text style={styles.filaSub} numberOfLines={1}>
                    {['Todos los días', nombre, gramosHorario(h)].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Interruptor
                  valor={activo(h)}
                  deshabilitado={!esDueno}
                  etiqueta={`Comida de las ${horaDeTimeOnly(h.hora)}`}
                  onCambio={(v) => setActivos((a) => ({ ...a, [h.id]: v }))}
                />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.vacio}>Aún no hay horarios programados.</Text>
      )}
      {esDueno ? (
        <Pressable onPress={() => setModal(true)} style={styles.agregar} accessibilityRole="button">
          <Feather name="plus" size={22} color={colors.text} />
          <Text style={styles.agregarTexto}>Agregar comida</Text>
        </Pressable>
      ) : null}
      {esDueno && ordenados.length ? <Text style={styles.ayuda}>Mantén presionado un horario para eliminarlo.</Text> : null}

      {/* Porción por comida */}
      {mascota ? (
        <View style={[styles.tarjeta, styles.porcion]}>
          <Text style={styles.porcionTitulo}>Porción por comida</Text>
          <Text style={styles.porcionSub}>
            Sugerido para {mascota.nombre}: {Math.round(mascota.gramosPorDiaRecomendados)} g al día
          </Text>
          <View style={styles.porcionFila}>
            {/* Menos gramos por comida = más comidas al día y viceversa. */}
            <BotonCircular
              icono="minus"
              etiqueta="Porción más chica"
              size={52}
              deshabilitado={!esDueno || comidasActuales >= 6}
              onPress={() => setComidas(Math.min(6, comidasActuales + 1))}
            />
            <View style={{ alignItems: 'center' }}>
              <View style={styles.porcionValor}>
                <Text style={styles.porcionNumero}>{Math.round(porcion)}</Text>
                <Text style={styles.porcionUnidad}>g</Text>
              </View>
              <Text style={styles.porcionComidas}>
                {comidasActuales === 1 ? '1 comida al día' : `${comidasActuales} comidas al día`}
              </Text>
            </View>
            <BotonCircular
              icono="plus"
              etiqueta="Porción más grande"
              size={52}
              deshabilitado={!esDueno || comidasActuales <= 1}
              onPress={() => setComidas(Math.max(1, comidasActuales - 1))}
            />
          </View>
        </View>
      ) : null}

      {/* Alertas */}
      <Text style={[styles.seccionTitulo, styles.alertasTitulo]}>Alertas</Text>
      <View style={styles.tarjeta}>
        {(
          [
            ['pocoAlimento', 'Poco alimento'],
            ['atasco', 'Atasco del dispensador'],
            ['desconexion', 'Desconexión'],
          ] as const
        ).map(([clave, etiqueta], i) => (
          <View key={clave} style={[styles.fila, styles.filaAlerta, i === 2 && styles.filaUltima]}>
            <Text style={styles.alertaTexto}>{etiqueta}</Text>
            <Interruptor valor={prefs[clave]} etiqueta={etiqueta} onCambio={(v) => setPrefs((p) => ({ ...p, [clave]: v }))} />
          </View>
        ))}
      </View>

      {/* Firmware y modelo (OTA) */}
      <Text style={[styles.seccionTitulo, styles.alertasTitulo]}>Firmware y modelo</Text>
      <View style={styles.tarjeta}>
        {filaVersion('Firmware', estado.versionFirmware, firmware)}
        {filaVersion('Modelo de reconocimiento', estado.versionModelo, modelo, true)}
      </View>
      {comandoOta && otaId !== null ? <Text style={styles.ayuda}>{estadoOta(comandoOta)}</Text> : null}
      {!esDueno ? <Text style={styles.ayuda}>Solo el dueño puede cambiar horarios y actualizar el dispensador.</Text> : null}

      <TextoError mensaje={error} />
      {mensaje && !hayCambios ? <Text style={styles.ayuda}>{mensaje}</Text> : null}
      <Pressable
        onPress={guardar}
        disabled={!hayCambios || guardando}
        style={[styles.guardar, (!hayCambios || guardando) && { opacity: 0.5 }]}
        accessibilityRole="button">
        <Text style={styles.guardarTexto}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Text>
      </Pressable>

      <HorarioModal
        visible={modal}
        mascotas={mascotas}
        mascotaInicial={mascotas.length > 1 ? (mascota?.id ?? null) : null}
        onCerrar={() => setModal(false)}
        onGuardar={agregarHorario}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenido: { paddingHorizontal: 16, paddingBottom: 28 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 16, paddingHorizontal: 4 },
  titulo: { fontFamily: fonts.jakartaBold, fontSize: 26, color: colors.text, letterSpacing: -0.5 },
  oscura: { backgroundColor: colors.card, borderRadius: 24, padding: 16, paddingTop: 18 },
  oscuraCabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  oscuraTitulo: { fontFamily: fonts.jakartaBold, fontSize: 18, color: colors.white },
  oscuraSub: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.border, marginTop: 1 },
  niveles: { flexDirection: 'row', gap: 10, marginTop: 14 },
  nivel: { flex: 1, backgroundColor: colors.cardInner, borderRadius: 16, padding: 14, gap: 8 },
  nivelEtiqueta: { fontFamily: fonts.jakarta, fontSize: 12, color: '#C8C8C8' },
  nivelValor: { fontFamily: fonts.jakartaBold, fontSize: 22, color: colors.white },
  seccion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24, marginBottom: 10 },
  seccionTitulo: { fontFamily: fonts.jakartaBold, fontSize: 17, color: colors.text },
  seccionDato: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.muted },
  tarjeta: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: 16 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  filaUltima: { borderBottomWidth: 0 },
  filaAlerta: { paddingVertical: 14 },
  horaTexto: { fontFamily: fonts.jakartaBold, fontSize: 20, color: colors.text },
  filaSub: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.muted, marginTop: 1 },
  vacio: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.muted, paddingHorizontal: 4 },
  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A6A6A6',
    marginTop: 12,
  },
  agregarTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 15, color: colors.text },
  ayuda: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 8 },
  porcion: { marginTop: 16, paddingVertical: 18 },
  porcionTitulo: { fontFamily: fonts.jakartaBold, fontSize: 17, color: colors.text },
  porcionSub: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.muted, marginTop: 2 },
  porcionFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  porcionValor: { flexDirection: 'row', alignItems: 'flex-end' },
  porcionNumero: { fontFamily: fonts.jakartaBold, fontSize: 44, lineHeight: 52, color: colors.text },
  porcionUnidad: { fontFamily: fonts.jakartaBold, fontSize: 18, color: colors.muted, marginLeft: 6, marginBottom: 6 },
  porcionComidas: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.muted },
  alertasTitulo: { marginTop: 22, marginBottom: 10 },
  alertaTexto: { flex: 1, fontFamily: fonts.jakartaSemibold, fontSize: 15, color: colors.text },
  actualizar: { backgroundColor: colors.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  actualizarTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 13, color: colors.white },
  guardar: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  guardarTexto: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.white },
});
