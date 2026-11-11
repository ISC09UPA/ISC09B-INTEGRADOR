import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Logo } from '@/components/Brand';
import { BotonIcono } from '@/components/Buttons';
import { Screen } from '@/components/Screen';
import { SelectorMascota } from '@/components/SelectorMascota';
import { Avatar, Aviso, Barra, Cargador, Pildora } from '@/components/Ui';
import { useAlimentador } from '@/context/AlimentadorContext';
import {
  comidasDeHoy,
  horariosDeMascota,
  modoDeVisita,
  nivelTolva,
  proximoHorario,
  useVisitas,
} from '@/hooks/useMascotaDatos';
import { colors, fonts } from '@/theme';
import { edadTexto, fechaCabecera, horaDeFecha, horaDeTimeOnly, pesoTexto, porcentaje } from '@/utils/format';

const iconoDispensador = require('@/assets/images/icons/dispensador.png');

/**
 * Mockup "Home Screen".
 * Datos: GET /api/alimentadores (estado), /api/alimentadores/{id}/mascotas, /horarios, /comandos,
 * /alertas y GET /api/mascotas/{id}/visitas; se actualiza con SignalR.
 */
export default function HomeScreen() {
  const {
    alimentador,
    alimentadores,
    mascota,
    extras,
    horarios,
    comandos,
    noLeidas,
    cargando,
    error,
    recargar,
  } = useAlimentador();
  const { visitas, recargar: recargarVisitas } = useVisitas(mascota?.id, 2);
  const [selector, setSelector] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const refrescar = async () => {
    setRefrescando(true);
    await Promise.all([recargar(), recargarVisitas()]);
    setRefrescando(false);
  };

  const propios = horariosDeMascota(horarios, mascota);
  const comidas = comidasDeHoy(propios, visitas);
  const listas = comidas.filter((c) => c.estado === 'listo').length;
  const ultima = visitas[0];
  const proxima = proximoHorario(propios);
  const estado = alimentador?.estado;
  const conectado = !!estado?.enLinea && !!estado?.gatewayEnLinea;
  const nivel = nivelTolva(estado, mascota?.tolva);
  const extra = mascota ? extras[mascota.id] : undefined;

  return (
    <Screen fondo={colors.bgHome} edges={['top']} contenido={styles.contenido} refrescando={refrescando} alRefrescar={refrescar}>
      <Logo size={38} style={styles.logo} />
      <View style={styles.fechaFila}>
        <Text style={styles.fecha} numberOfLines={1} adjustsFontSizeToFit>
          {fechaCabecera()}
        </Text>
        <BotonIcono
          icono="bell"
          etiqueta="Alertas"
          onPress={() => router.push('/alertas')}
          fondo={colors.homeButton}
          borde={false}
          radio={8}
          size={{ w: 48, h: 40 }}
          tamanoIcono={22}
          color={colors.homeAvatar}
          insignia={noLeidas}
        />
        <BotonIcono
          icono="settings"
          etiqueta="Ajustes"
          onPress={() => router.push('/ajustes')}
          fondo={colors.homeButton}
          borde={false}
          radio={8}
          size={{ w: 48, h: 40 }}
          tamanoIcono={22}
          color={colors.homeAvatar}
        />
      </View>

      {cargando && !alimentador ? <Cargador /> : null}

      {!cargando && !alimentadores.length ? (
        <View style={styles.tarjetaBlanca}>
          <Aviso
            icono="cpu"
            titulo="Configura tu alimentador"
            texto={error ?? 'Registra tu Raspberry Pi y tu alimentador para empezar.'}
            accion="Configurar"
            onAccion={() => router.push('/ajustes')}
          />
        </View>
      ) : null}

      {alimentador ? (
        <>
          {/* Tarjeta de la mascota */}
          <View style={styles.mascota}>
            {mascota ? (
              <>
                <View style={styles.mascotaFila}>
                  <Pressable onPress={() => router.push(`/mascota/${mascota.id}`)} accessibilityRole="button">
                    <Avatar uri={extra?.fotoUri} size={54} />
                  </Pressable>
                  <Pressable style={styles.mascotaTextos} onPress={() => router.push(`/mascota/${mascota.id}`)}>
                    <Text style={styles.mascotaNombre} numberOfLines={1}>
                      {mascota.nombre}
                    </Text>
                    <Text style={styles.mascotaDetalle} numberOfLines={1}>
                      {[extra?.raza ?? mascota.especie, edadTexto(mascota.edadMeses), pesoTexto(mascota.pesoKg)].join(' · ')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cambiar de mascota"
                    onPress={() => setSelector(true)}
                    style={styles.desplegar}>
                    <Feather name="chevron-down" size={24} color={colors.homeAvatar} />
                  </Pressable>
                </View>
                <View style={styles.comidas}>
                  <View style={styles.comida}>
                    <Text style={styles.comidaTitulo}>Ultima Comida</Text>
                    <View style={styles.comidaLinea} />
                    <Text style={styles.comidaHora} numberOfLines={1} adjustsFontSizeToFit>
                      {ultima ? horaDeFecha(ultima.terminadaEn) : '—'}
                    </Text>
                    <Text style={styles.comidaDetalle} numberOfLines={1}>
                      {ultima ? `${Math.round(ultima.consumidoG)}g · ${modoDeVisita(ultima, comandos)}` : 'Sin registros'}
                    </Text>
                  </View>
                  <View style={styles.comida}>
                    <Text style={styles.comidaTitulo}>Próxima Comida</Text>
                    <View style={styles.comidaLinea} />
                    <Text style={styles.comidaHora} numberOfLines={1} adjustsFontSizeToFit>
                      {proxima ? horaDeTimeOnly(proxima.hora) : '—'}
                    </Text>
                    <Text style={styles.comidaDetalle} numberOfLines={1}>
                      {proxima ? `${Math.round(mascota.gramosPorComida)}g · programada` : 'Sin horarios'}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <Aviso
                icono="heart"
                titulo="Aún no hay mascotas"
                texto="Registra a tu perro o gato para que el alimentador lo reconozca."
                accion="Registrar mascota"
                onAccion={() => router.push('/mascota/nueva')}
              />
            )}
          </View>

          {/* Alimentar ahora */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/alimentar')}
            style={({ pressed }) => [styles.alimentar, pressed && { opacity: 0.7 }]}>
            <View style={styles.alimentarIcono}>
              <Image source={iconoDispensador} style={{ width: 17, height: 24 }} contentFit="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alimentarTitulo}>Alimentar ahora</Text>
              <Text style={styles.alimentarSub}>Dispensar una porcion manual</Text>
            </View>
            <Feather name="chevron-right" size={30} color={colors.homeAvatar} />
          </Pressable>

          {/* Dispensador */}
          <Pressable style={styles.tarjetaBlanca} onPress={() => router.navigate('/dispensador')}>
            <View style={styles.filaEntre}>
              <Text style={styles.tarjetaTitulo}>Dispensador</Text>
              <Pildora
                texto={conectado ? 'Conectado' : 'Desconectado'}
                fondo={conectado ? colors.greenSoft : '#F6E3E3'}
                color={conectado ? colors.green : '#A33A3A'}
                textoStyle={{ color: conectado ? colors.greenText : '#5C1F1F', fontFamily: fonts.jakartaMedium, fontSize: 13 }}
                style={{ height: 25 }}
              />
            </View>
            <View style={[styles.filaEntre, { marginTop: 14 }]}>
              <Text style={styles.nivelTexto}>Nivel de alimento</Text>
              <Text style={styles.nivelValor}>{porcentaje(nivel)}</Text>
            </View>
            <Barra valor={nivel} color={colors.green} pista={colors.greenTrack} alto={9} style={{ marginTop: 10 }} />
          </Pressable>

          {/* Comidas de hoy */}
          {mascota ? (
            <View style={styles.tarjetaBlanca}>
              <View style={styles.filaEntre}>
                <Text style={styles.tarjetaTitulo}>
                  Comidas de hoy · {listas} de {comidas.length}
                </Text>
                <Pressable onPress={() => router.navigate('/historial')} hitSlop={8} accessibilityRole="link">
                  <Text style={styles.verHistorial}>Ver historial</Text>
                </Pressable>
              </View>
              {comidas.length ? (
                <View style={styles.horarios}>
                  {comidas.map(({ horario, estado: e }) => (
                    <View key={horario.id} style={styles.horario}>
                      {e === 'listo' ? (
                        <View style={styles.check}>
                          <Feather name="check" size={15} color={colors.white} />
                        </View>
                      ) : (
                        <View style={[styles.anillo, e === 'omitida' && { borderColor: colors.warning }]} />
                      )}
                      <Text style={styles.horarioHora}>{horaDeTimeOnly(horario.hora)}</Text>
                      <Text style={styles.horarioEstado}>
                        {e === 'listo' ? 'Listo' : e === 'pendiente' ? 'Pendiente' : 'Sin comer'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.sinHorarios}>No hay horarios activos. Agrégalos en Dispensador.</Text>
              )}
            </View>
          ) : null}
        </>
      ) : null}

      <SelectorMascota visible={selector} onCerrar={() => setSelector(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenido: { paddingHorizontal: 18, paddingBottom: 24, gap: 16 },
  logo: { marginTop: 4, marginBottom: -10 },
  fechaFila: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 13 },
  fecha: { flex: 1, fontFamily: fonts.regular, fontSize: 22, color: colors.black },

  mascota: { backgroundColor: colors.homeCard, borderRadius: 25, padding: 22, paddingTop: 16 },
  mascotaFila: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  mascotaTextos: { flex: 1, marginTop: -12 },
  mascotaNombre: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
  mascotaDetalle: { fontFamily: fonts.medium, fontSize: 10.5, color: '#434343', marginTop: 2 },
  desplegar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comidas: { flexDirection: 'row', gap: 12, marginTop: 6 },
  comida: { flex: 1, backgroundColor: colors.homeTile, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 8 },
  comidaTitulo: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.homeTileText, textAlign: 'center' },
  comidaLinea: { height: 1, backgroundColor: colors.homeTileText, marginHorizontal: 6, marginTop: 4, marginBottom: 6 },
  comidaHora: { fontFamily: fonts.medium, fontSize: 20, color: '#F6F6F6', paddingHorizontal: 2 },
  comidaDetalle: { fontFamily: fonts.medium, fontSize: 11, color: '#AEAEB2', paddingHorizontal: 2, marginTop: 2 },

  alimentar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.homeCard,
    borderRadius: 15,
    paddingVertical: 8,
    paddingLeft: 9,
    paddingRight: 18,
  },
  alimentarIcono: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alimentarTitulo: { fontFamily: fonts.semibold, fontSize: 20, color: colors.black, lineHeight: 24 },
  alimentarSub: { fontFamily: fonts.medium, fontSize: 10, color: colors.black },

  tarjetaBlanca: {
    backgroundColor: colors.white,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginHorizontal: 4,
  },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tarjetaTitulo: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.greenText, letterSpacing: -0.2 },
  nivelTexto: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.muted },
  nivelValor: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.greenText },
  verHistorial: {
    fontFamily: fonts.jakartaSemibold,
    fontSize: 12,
    color: colors.greenText,
    textDecorationLine: 'underline',
  },
  horarios: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14 },
  horario: { alignItems: 'center', gap: 5, minWidth: 70 },
  check: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anillo: { width: 27, height: 27, borderRadius: 14, borderWidth: 1.5, borderColor: '#8BA298' },
  horarioHora: { fontFamily: fonts.jakartaMedium, fontSize: 12, color: colors.greenText },
  horarioEstado: { fontFamily: fonts.jakarta, fontSize: 11, color: '#8A8A8A', marginTop: -2 },
  sinHorarios: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.muted, marginTop: 12 },
});
