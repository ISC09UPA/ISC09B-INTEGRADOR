import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ConsumoDiarioDto } from '@/api/types';
import { Screen } from '@/components/Screen';
import { Aviso, Cargador, TextoError } from '@/components/Ui';
import { useAlimentador } from '@/context/AlimentadorContext';
import { useConsumo, useVisitas } from '@/hooks/useMascotaDatos';
import { colors, fonts } from '@/theme';
import { diaCorto, fechaCorta, horaDeFecha } from '@/utils/format';

const ALTO_GRAFICA = 140;

/** Barras de consumo diario con una marca de la ración recomendada; tocar una barra muestra su detalle. */
function GraficaConsumo({ datos }: { datos: ConsumoDiarioDto[] }) {
  const [elegido, setElegido] = useState<number>(datos.length - 1);
  const maximo = Math.max(1, ...datos.map((d) => Math.max(d.consumidoG, d.recomendadoG)));
  const actual = datos[Math.min(elegido, datos.length - 1)];

  return (
    <View>
      {actual ? (
        <Text style={styles.graficaDetalle}>
          {fechaCorta(new Date(`${actual.dia}T12:00:00`))}: comió {Math.round(actual.consumidoG)} g de{' '}
          {Math.round(actual.recomendadoG)} g · {actual.visitas} {actual.visitas === 1 ? 'visita' : 'visitas'}
        </Text>
      ) : null}
      <View style={styles.grafica} accessibilityLabel="Consumo de los últimos 7 días">
        {datos.map((d, i) => {
          const alto = (d.consumidoG / maximo) * ALTO_GRAFICA;
          const meta = (d.recomendadoG / maximo) * ALTO_GRAFICA;
          const activo = i === elegido;
          return (
            <Pressable
              key={d.dia}
              onPress={() => setElegido(i)}
              style={styles.columna}
              accessibilityRole="button"
              accessibilityLabel={`${d.dia}: ${Math.round(d.consumidoG)} gramos`}>
              <View style={[styles.area, { height: ALTO_GRAFICA }]}>
                {d.recomendadoG > 0 ? <View style={[styles.meta, { bottom: meta }]} /> : null}
                <View
                  style={[
                    styles.barra,
                    { height: Math.max(alto, d.consumidoG > 0 ? 3 : 0), backgroundColor: activo ? colors.text : '#8C8C8C' },
                  ]}
                />
              </View>
              <Text style={[styles.dia, activo && { color: colors.text, fontFamily: fonts.jakartaBold }]}>{diaCorto(d.dia)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.leyenda}>
        <View style={styles.leyendaItem}>
          <View style={[styles.leyendaMarca, { backgroundColor: colors.text }]} />
          <Text style={styles.leyendaTexto}>Consumido</Text>
        </View>
        <View style={styles.leyendaItem}>
          <View style={styles.leyendaMeta} />
          <Text style={styles.leyendaTexto}>Recomendado</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Pestaña Estadísticas / historial (sin mockup propio; estilo del Dispensador).
 * Datos: GET /api/mascotas/{id}/consumo (7 días) y GET /api/mascotas/{id}/visitas.
 */
export default function StatsScreen() {
  const { mascotas, mascota, seleccionarMascota, cargando: cargandoCtx } = useAlimentador();
  const { consumo, cargando, error, recargar } = useConsumo(mascota?.id, 7);
  const { visitas, recargar: recargarVisitas } = useVisitas(mascota?.id, 7);
  const [refrescando, setRefrescando] = useState(false);

  const totalConsumido = consumo.reduce((s, d) => s + d.consumidoG, 0);
  const totalRecomendado = consumo.reduce((s, d) => s + d.recomendadoG, 0);
  const totalVisitas = consumo.reduce((s, d) => s + d.visitas, 0);
  const promedio = consumo.length ? totalConsumido / consumo.length : 0;
  const cumplimiento = totalRecomendado > 0 ? Math.round((totalConsumido / totalRecomendado) * 100) : null;

  return (
    <Screen
      fondo={colors.bg}
      edges={['top']}
      contenido={styles.contenido}
      refrescando={refrescando}
      alRefrescar={async () => {
        setRefrescando(true);
        await Promise.all([recargar(), recargarVisitas()]);
        setRefrescando(false);
      }}>
      <Text style={styles.titulo}>Estadísticas</Text>

      {!mascota && !cargandoCtx ? (
        <Aviso icono="bar-chart-2" titulo="Sin mascotas" texto="Registra una mascota para ver su historial." accion="Registrar mascota" onAccion={() => router.push('/mascota/nueva')} />
      ) : null}

      {mascotas.length > 1 ? (
        <View style={styles.chips}>
          {mascotas.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => seleccionarMascota(m.id)}
              style={[styles.chip, m.id === mascota?.id && styles.chipActivo]}
              accessibilityRole="button">
              <Text style={[styles.chipTexto, m.id === mascota?.id && { color: colors.white }]}>{m.nombre}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {mascota ? (
        <>
          <View style={styles.resumen}>
            <View style={styles.dato}>
              <Text style={styles.datoEtiqueta}>Promedio diario</Text>
              <Text style={styles.datoValor}>{Math.round(promedio)} g</Text>
            </View>
            <View style={styles.dato}>
              <Text style={styles.datoEtiqueta}>Visitas</Text>
              <Text style={styles.datoValor}>{totalVisitas}</Text>
            </View>
            <View style={styles.dato}>
              <Text style={styles.datoEtiqueta}>De lo recomendado</Text>
              <Text style={styles.datoValor}>{cumplimiento === null ? '—' : `${cumplimiento} %`}</Text>
            </View>
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaTitulo}>Consumo · últimos 7 días</Text>
            {cargando && !consumo.length ? <Cargador /> : <GraficaConsumo key={mascota.id} datos={consumo} />}
            <TextoError mensaje={error} />
          </View>

          <Text style={styles.seccion}>Visitas recientes</Text>
          {visitas.length ? (
            <View style={styles.tarjetaLista}>
              {visitas.slice(0, 15).map((v, i, arr) => (
                <View key={v.id} style={[styles.fila, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.icono}>
                    <MaterialCommunityIcons name={v.clase === 'Gato' ? 'cat' : 'dog'} size={20} color={colors.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.filaTitulo}>
                      {fechaCorta(v.iniciadaEn)} · {horaDeFecha(v.iniciadaEn)}
                    </Text>
                    <Text style={styles.filaSub}>
                      Recibió {Math.round(v.dispensadoG)} g · comió {Math.round(v.consumidoG)} g
                    </Text>
                  </View>
                  <Text style={styles.filaValor}>{Math.round(v.consumidoG)} g</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.vacio}>Sin visitas en los últimos 7 días.</Text>
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenido: { paddingHorizontal: 16, paddingBottom: 28 },
  titulo: { fontFamily: fonts.jakartaBold, fontSize: 26, color: colors.text, letterSpacing: -0.5, paddingVertical: 14, paddingHorizontal: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.white },
  chipActivo: { backgroundColor: colors.camButton, borderColor: colors.camButton },
  chipTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 14, color: colors.text },
  resumen: { flexDirection: 'row', gap: 8 },
  dato: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 12, gap: 6 },
  datoEtiqueta: { fontFamily: fonts.jakarta, fontSize: 11, color: '#C8C8C8' },
  datoValor: { fontFamily: fonts.jakartaBold, fontSize: 20, color: colors.white },
  tarjeta: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.borderSoft, padding: 16, marginTop: 14 },
  tarjetaTitulo: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.text },
  graficaDetalle: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.muted, marginTop: 4 },
  grafica: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  columna: { flex: 1, alignItems: 'center' },
  area: { width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  barra: { width: 18, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  meta: { position: 'absolute', left: '18%', right: '18%', height: 2, backgroundColor: colors.green, borderRadius: 1 },
  dia: { fontFamily: fonts.jakarta, fontSize: 11, color: colors.muted, marginTop: 6, marginBottom: 4 },
  leyenda: { flexDirection: 'row', gap: 16, marginTop: 10 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaMarca: { width: 10, height: 10, borderRadius: 2 },
  leyendaMeta: { width: 14, height: 2, backgroundColor: colors.green },
  leyendaTexto: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.muted },
  seccion: { fontFamily: fonts.jakartaBold, fontSize: 17, color: colors.text, marginTop: 22, marginBottom: 10, paddingHorizontal: 4 },
  tarjetaLista: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: 16 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  icono: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { fontFamily: fonts.jakartaSemibold, fontSize: 14, color: colors.text },
  filaSub: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.muted, marginTop: 1 },
  filaValor: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.text },
  vacio: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.muted, paddingHorizontal: 4 },
});
