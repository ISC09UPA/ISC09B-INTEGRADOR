import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAlimentador } from '@/context/AlimentadorContext';
import { colors, fonts } from '@/theme';
import { edadTexto, pesoTexto } from '@/utils/format';

import { Avatar } from './Ui';

/** Hoja para cambiar de mascota (flecha de la tarjeta de inicio y chip de Alimentar ahora). */
export function SelectorMascota({ visible, onCerrar }: { visible: boolean; onCerrar: () => void }) {
  const { mascotas, mascota, seleccionarMascota, extras, esDueno } = useAlimentador();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable style={styles.velo} onPress={onCerrar}>
        <Pressable style={styles.hoja}>
          <Text style={styles.titulo}>Elige una mascota</Text>
          {mascotas.map((m) => {
            const activa = m.id === mascota?.id;
            const raza = extras[m.id]?.raza;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                onPress={() => {
                  seleccionarMascota(m.id);
                  onCerrar();
                }}
                style={({ pressed }) => [styles.fila, (pressed || activa) && styles.filaActiva]}>
                <Avatar uri={extras[m.id]?.fotoUri} size={40} fondo={colors.white} />
                <View style={styles.textos}>
                  <Text style={styles.nombre}>{m.nombre}</Text>
                  <Text style={styles.detalle}>
                    {[raza ?? m.especie, edadTexto(m.edadMeses), pesoTexto(m.pesoKg)].join(' · ')}
                  </Text>
                </View>
                {activa ? <Feather name="check" size={20} color={colors.text} /> : null}
              </Pressable>
            );
          })}
          {esDueno && mascotas.length < 3 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onCerrar();
                router.push('/mascota/nueva');
              }}
              style={styles.agregar}>
              <Feather name="plus" size={18} color={colors.text} />
              <Text style={styles.agregarTexto}>Registrar mascota</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  hoja: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 8,
  },
  titulo: { fontFamily: fonts.semibold, fontSize: 16, color: colors.black, marginBottom: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14 },
  filaActiva: { backgroundColor: colors.surfaceAlt },
  textos: { flex: 1 },
  nombre: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  detalle: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 2 },
  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.subtle,
    marginTop: 6,
  },
  agregarTexto: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
});
