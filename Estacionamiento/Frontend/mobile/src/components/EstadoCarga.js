import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

/** Lo que se muestra mientras llega la respuesta de la API, o si falló. */
export function Cargando() {
  return (
    <View style={styles.caja}>
      <ActivityIndicator color={colors.green900} />
    </View>
  );
}

export function ErrorCarga({ mensaje, onReintentar }) {
  return (
    <View style={[styles.caja, styles.error]}>
      <Ionicons name="cloud-offline-outline" size={28} color={colors.red} />
      <Text style={styles.texto}>{mensaje}</Text>
      {onReintentar && (
        <Pressable style={styles.boton} onPress={() => onReintentar()}>
          <Text style={styles.botonTexto}>Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Mensaje de error dentro de un formulario o modal. */
export function MensajeError({ mensaje }) {
  if (!mensaje) return null;
  return (
    <View style={styles.inline}>
      <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
      <Text style={styles.inlineTexto}>{mensaje}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  error: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  texto: { fontSize: 13, lineHeight: 19, textAlign: 'center', color: colors.inkSoft },
  boton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.green900,
  },
  botonTexto: { fontSize: 13, fontWeight: '800', color: '#fff' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineTexto: { flex: 1, fontSize: 13, color: colors.red },
});
