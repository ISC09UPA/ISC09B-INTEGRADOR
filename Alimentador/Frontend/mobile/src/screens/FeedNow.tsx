import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { alimentadoresApi } from '@/api/endpoints';
import type { ComandoDto } from '@/api/types';
import { BotonCircular } from '@/components/Buttons';
import { CabeceraTitulo } from '@/components/Headers';
import { Screen } from '@/components/Screen';
import { SelectorMascota } from '@/components/SelectorMascota';
import { Aviso, Barra, TextoError } from '@/components/Ui';
import { useAlimentador } from '@/context/AlimentadorContext';
import { useConsumo, useVisitas } from '@/hooks/useMascotaDatos';
import { colors, fonts } from '@/theme';
import { haceTiempo, horaDeFecha, redondear } from '@/utils/format';

const PRESETS = [30, 60, 90, 120];
const MIN = 5;
const MAX = 200; // límite del backend (DispensarValidator)

function textoComando(c: ComandoDto | null | undefined, enviando: boolean): { texto: string; tono: 'ok' | 'espera' | 'error' } | null {
  if (enviando) return { texto: 'Enviando orden…', tono: 'espera' };
  if (!c) return null;
  switch (c.estado) {
    case 'Pendiente':
      return { texto: 'Esperando al dispensador…', tono: 'espera' };
    case 'Entregado':
      return { texto: 'Dispensando…', tono: 'espera' };
    case 'Completado':
      return { texto: `Listo: se dispensaron ${Math.round(c.dispensadoG ?? c.gramos ?? 0)} g`, tono: 'ok' };
    case 'Fallido':
      return { texto: c.error ? `No se pudo dispensar: ${c.error}` : 'No se pudo dispensar', tono: 'error' };
    case 'Vencido':
      return { texto: 'El dispensador no respondió a tiempo', tono: 'error' };
  }
}

/**
 * Mockup "Feed Now".
 * POST /api/alimentadores/{id}/dispensar (202) y el resultado llega por SignalR (ComandoActualizado).
 * Datos: GET /api/mascotas/{id}/visitas y /consumo.
 */
export default function FeedNow() {
  const { alimentador, mascota, comandos, registrarComando } = useAlimentador();
  const { visitas } = useVisitas(mascota?.id, 2);
  const { consumo, recargar: recargarConsumo } = useConsumo(mascota?.id, 1);

  const sugerido = mascota ? Math.min(MAX, redondear(mascota.gramosPorComida)) : 60;
  const [gramos, setGramos] = useState(sugerido);
  const [ajustado, setAjustado] = useState(false);
  const [selector, setSelector] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [comandoId, setComandoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mientras el usuario no toque la cantidad, sigue la porción sugerida de la mascota elegida.
  useEffect(() => {
    if (!ajustado) setGramos(sugerido);
  }, [sugerido, ajustado]);

  const comando = comandos.find((c) => c.id === comandoId);
  const enCurso = enviando || comando?.estado === 'Pendiente' || comando?.estado === 'Entregado';

  useEffect(() => {
    if (comando?.estado === 'Completado') recargarConsumo();
  }, [comando?.estado, recargarConsumo]);

  if (!alimentador || !mascota) {
    return (
      <Screen fondo={colors.bg}>
        <CabeceraTitulo titulo="Alimentar ahora" />
        <Aviso
          icono="alert-circle"
          titulo={!alimentador ? 'Configura tu alimentador' : 'Registra una mascota primero'}
          accion={!alimentador ? 'Configurar' : 'Registrar mascota'}
          onAccion={() => router.replace(!alimentador ? '/ajustes' : '/mascota/nueva')}
        />
      </Screen>
    );
  }

  const cambiar = (g: number) => {
    setAjustado(true);
    setGramos(Math.max(MIN, Math.min(MAX, g)));
  };

  const ultima = visitas[0];
  const hoy = consumo[consumo.length - 1];
  const llevaHoy = hoy?.dispensadoG ?? 0;
  const recomendado = hoy?.recomendadoG || mascota.gramosPorDiaRecomendados;
  const conPorcion = llevaHoy + gramos;
  const disponible = alimentador.estado.dispensadoRemotoDisponible;
  const estadoComando = textoComando(comando, enviando);

  const dispensar = async () => {
    setError(null);
    setEnviando(true);
    try {
      const c = await alimentadoresApi.dispensar(alimentador.id, { gramos, mascotaId: mascota.id });
      registrarComando(c);
      setComandoId(c.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  let mensajeTotal: string;
  if (conPorcion < recomendado - 1) mensajeTotal = `Con esta porción llegaría a ${Math.round(conPorcion)} g de ${Math.round(recomendado)} g recomendados.`;
  else if (conPorcion <= recomendado + 1) mensajeTotal = `Con esta porción llegaría a ${Math.round(conPorcion)} g, su total recomendado.`;
  else mensajeTotal = `Con esta porción llegaría a ${Math.round(conPorcion)} g y pasaría su total recomendado de ${Math.round(recomendado)} g.`;

  return (
    <Screen
      fondo={colors.bg}
      contenido={styles.contenido}
      pie={
        <View style={styles.pie}>
          <View style={styles.estado}>
            <View
              style={[
                styles.punto,
                {
                  backgroundColor:
                    estadoComando?.tono === 'error' || (!estadoComando && !disponible)
                      ? colors.danger
                      : estadoComando?.tono === 'ok'
                        ? colors.green
                        : colors.text,
                },
              ]}
            />
            <Text style={styles.estadoTexto} numberOfLines={2}>
              {estadoComando?.texto ?? (disponible ? 'Dispensador listo' : 'Dispensador sin conexión')}
            </Text>
          </View>
          <TextoError mensaje={error} />
          <Pressable
            accessibilityRole="button"
            disabled={!disponible || enCurso}
            onPress={dispensar}
            style={({ pressed }) => [styles.dispensar, (pressed || !disponible || enCurso) && { opacity: 0.6 }]}>
            <MaterialCommunityIcons name="timer-sand-empty" size={26} color={colors.white} />
            <Text style={styles.dispensarTexto}>Dispensar {gramos} g</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.cancelar} accessibilityRole="button">
            <Text style={styles.cancelarTexto}>{comando?.estado === 'Completado' ? 'Listo' : 'Cancelar'}</Text>
          </Pressable>
        </View>
      }>
      <CabeceraTitulo
        titulo="Alimentar ahora"
        derecha={
          <Pressable onPress={() => setSelector(true)} style={styles.chip} accessibilityRole="button" accessibilityLabel="Cambiar de mascota">
            <View style={styles.chipIcono}>
              <MaterialCommunityIcons name="paw-outline" size={18} color={colors.text} />
            </View>
            <Text style={styles.chipTexto} numberOfLines={1}>
              {mascota.nombre}
            </Text>
          </Pressable>
        }
      />

      <View style={styles.info}>
        <View style={styles.reloj}>
          <Feather name="clock" size={20} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          {ultima ? (
            <>
              <Text style={styles.infoTitulo}>
                {mascota.nombre} comió {haceTiempo(ultima.terminadaEn)}
              </Text>
              <Text style={styles.infoTexto}>
                Recibió {Math.round(ultima.dispensadoG)} g a las {horaDeFecha(ultima.iniciadaEn)}. Revisa antes de dar otra porción.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.infoTitulo}>Sin comidas recientes</Text>
              <Text style={styles.infoTexto}>No hay visitas de {mascota.nombre} en los últimos dos días.</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.cantidadTitulo}>Cantidad a dispensar</Text>
        <View style={styles.cantidadFila}>
          <BotonCircular icono="minus" etiqueta="Menos" onPress={() => cambiar(gramos - 5)} deshabilitado={gramos <= MIN} />
          <View style={styles.cantidad}>
            <Text style={styles.cantidadNumero}>{gramos}</Text>
            <Text style={styles.cantidadUnidad}>g</Text>
          </View>
          <BotonCircular icono="plus" etiqueta="Más" onPress={() => cambiar(gramos + 5)} deshabilitado={gramos >= MAX} />
        </View>
        <View style={styles.presets}>
          {PRESETS.map((p) => {
            const activo = p === gramos;
            return (
              <Pressable
                key={p}
                onPress={() => cambiar(p)}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                style={[styles.preset, activo && styles.presetActivo]}>
                <Text style={[styles.presetTexto, activo && { color: colors.white }]}>{p} g</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.tarjeta, styles.tarjetaHoy]}>
        <View style={styles.hoyFila}>
          <Text style={styles.hoyEtiqueta}>Hoy lleva</Text>
          <Text style={styles.hoyValor}>
            {Math.round(llevaHoy)} g de {Math.round(recomendado)} g
          </Text>
        </View>
        <Barra valor={(llevaHoy / Math.max(1, recomendado)) * 100} color={colors.text} alto={9} style={{ marginTop: 12 }} />
        <Text style={styles.hoyTexto}>{mensajeTotal}</Text>
      </View>

      <SelectorMascota visible={selector} onCerrar={() => setSelector(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenido: { paddingBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingLeft: 6,
    paddingRight: 14,
    height: 44,
    maxWidth: 140,
  },
  chipIcono: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 15, color: colors.text, flexShrink: 1 },
  info: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 16,
  },
  reloj: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D6D6D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitulo: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.text },
  infoTexto: { fontFamily: fonts.jakarta, fontSize: 13, lineHeight: 18, color: colors.text, marginTop: 2 },
  tarjeta: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginHorizontal: 20,
    marginTop: 18,
    padding: 20,
  },
  cantidadTitulo: { fontFamily: fonts.jakartaSemibold, fontSize: 14, color: colors.muted, textAlign: 'center' },
  cantidadFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  cantidad: { flexDirection: 'row', alignItems: 'flex-end' },
  cantidadNumero: { fontFamily: fonts.jakartaBold, fontSize: 68, lineHeight: 76, color: colors.text, letterSpacing: -2 },
  cantidadUnidad: { fontFamily: fonts.jakartaBold, fontSize: 24, color: colors.muted, marginLeft: 6, marginBottom: 6 },
  presets: { flexDirection: 'row', gap: 8, marginTop: 20 },
  preset: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetActivo: { backgroundColor: colors.camButton, borderColor: colors.camButton },
  presetTexto: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.text },
  tarjetaHoy: { borderRadius: 20 },
  hoyFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  hoyEtiqueta: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.muted },
  hoyValor: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.text },
  hoyTexto: { fontFamily: fonts.jakarta, fontSize: 13, lineHeight: 17, color: colors.muted, marginTop: 10 },
  pie: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6, gap: 10, backgroundColor: colors.bg },
  estado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  estadoTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 14, color: colors.text, textAlign: 'center', flexShrink: 1 },
  dispensar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  dispensarTexto: { fontFamily: fonts.jakartaBold, fontSize: 18, color: colors.white },
  cancelar: { alignItems: 'center', paddingVertical: 10 },
  cancelarTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 14, color: colors.text },
});
