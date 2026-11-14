import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

const VARIANTS = {
  libre: {
    label: 'Libre',
    box: { backgroundColor: colors.surface, borderColor: colors.green700 },
    text: colors.inkSoft,
    icon: null,
  },
  ocupado: {
    label: 'Ocupado',
    box: { backgroundColor: colors.green900, borderColor: colors.green900 },
    text: '#fff',
    icon: '#fff',
  },
  mio: {
    label: 'Tú',
    box: { backgroundColor: colors.green700, borderColor: colors.green900 },
    text: colors.green900,
    icon: colors.green900,
  },
};

/** Variante visual según el CajonDto del back: { numero, estado: "Libre" | "Ocupado", esMio }. */
export function varianteCajon({ estado, esMio }) {
  if (esMio) return 'mio';
  return estado === 'Libre' ? 'libre' : 'ocupado';
}

/** cajon: un CajonDto del back ({ numero, estado, esMio }). */
export default function ParkingSlot({ cajon, onPress }) {
  const v = VARIANTS[varianteCajon(cajon)];
  return (
    <Pressable
      onPress={() => onPress?.(cajon.numero)}
      style={({ pressed }) => [styles.slot, v.box, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.id, { color: v.text }]}>C{cajon.numero}</Text>
      <View style={styles.iconBox}>
        {v.icon && <Ionicons name="car-sport" size={26} color={v.icon} />}
      </View>
      <Text style={[styles.label, { color: v.text }]}>{v.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    height: 118,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  id: { fontSize: 12, fontWeight: '800' },
  iconBox: { height: 30, justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '700' },
});
