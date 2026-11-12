import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BotonIcono } from '@/components/Buttons';
import { Screen } from '@/components/Screen';
import { Avatar, Aviso, Cargador } from '@/components/Ui';
import { useAlimentador } from '@/context/AlimentadorContext';
import { colors, fonts } from '@/theme';
import { edadTexto, pesoTexto } from '@/utils/format';

/**
 * Pestaña Mascotas (sin mockup propio; sigue el estilo de Dispensador).
 * Datos: GET /api/alimentadores/{id}/mascotas.
 */
export default function PetsScreen() {
  const { alimentador, mascotas, mascota, extras, esDueno, cargando, recargar, seleccionarMascota } = useAlimentador();
  const [refrescando, setRefrescando] = useState(false);
  const puedeAgregar = esDueno && mascotas.length < 3;

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
        <Text style={styles.titulo}>Mascotas</Text>
        {puedeAgregar ? (
          <BotonIcono icono="plus" etiqueta="Registrar mascota" onPress={() => router.push('/mascota/nueva')} />
        ) : null}
      </View>

      {cargando && !mascotas.length ? <Cargador /> : null}

      {!alimentador && !cargando ? (
        <Aviso icono="cpu" titulo="Configura tu alimentador" accion="Configurar" onAccion={() => router.push('/ajustes')} />
      ) : null}

      {alimentador && !cargando && !mascotas.length ? (
        <Aviso
          icono="heart"
          titulo="Aún no hay mascotas"
          texto="El alimentador admite hasta 3 mascotas entre perros y gatos."
          accion={esDueno ? 'Registrar mascota' : undefined}
          onAccion={() => router.push('/mascota/nueva')}
        />
      ) : null}

      {mascotas.map((m) => {
        const extra = extras[m.id];
        const activa = m.id === mascota?.id;
        return (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            onPress={() => {
              seleccionarMascota(m.id);
              router.push(`/mascota/${m.id}`);
            }}
            style={({ pressed }) => [styles.tarjeta, pressed && { opacity: 0.8 }]}>
            <Avatar uri={extra?.fotoUri} size={60} fondo={colors.white} />
            <View style={{ flex: 1 }}>
              <View style={styles.filaNombre}>
                <Text style={styles.nombre} numberOfLines={1}>
                  {m.nombre}
                </Text>
                {activa ? <View style={styles.activa}><Text style={styles.activaTexto}>En inicio</Text></View> : null}
              </View>
              <Text style={styles.detalle} numberOfLines={1}>
                {[extra?.raza ?? m.especie, edadTexto(m.edadMeses), pesoTexto(m.pesoKg)].join(' · ')}
              </Text>
              <Text style={styles.racion}>
                {Math.round(m.gramosPorDiaRecomendados)} g al día · {m.comidasPorDia} comidas de {Math.round(m.gramosPorComida)} g
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color={colors.muted} />
          </Pressable>
        );
      })}

      {puedeAgregar && mascotas.length ? (
        <Pressable onPress={() => router.push('/mascota/nueva')} style={styles.agregar} accessibilityRole="button">
          <Feather name="plus" size={20} color={colors.text} />
          <Text style={styles.agregarTexto}>Registrar mascota</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenido: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  titulo: { fontFamily: fonts.jakartaBold, fontSize: 26, color: colors.text, letterSpacing: -0.5 },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 16,
  },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombre: { flexShrink: 1, fontFamily: fonts.jakartaBold, fontSize: 18, color: colors.text },
  activa: { backgroundColor: colors.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  activaTexto: { fontFamily: fonts.jakartaMedium, fontSize: 11, color: colors.text },
  detalle: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.muted, marginTop: 2 },
  racion: { fontFamily: fonts.jakartaMedium, fontSize: 12, color: colors.text, marginTop: 6 },
  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.subtle,
  },
  agregarTexto: { fontFamily: fonts.jakartaSemibold, fontSize: 15, color: colors.text },
});
