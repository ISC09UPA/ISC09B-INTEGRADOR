import { View, Text, StyleSheet } from 'react-native';
import { colorChip } from '../constants/theme';

export default function Etiqueta({ texto, tono = 'blue' }) {
  const c = colorChip[tono] || colorChip.blue;
  return (
    <View style={[styles.chip, { backgroundColor: c.fondo }]}>
      <Text style={[styles.texto, { color: c.texto }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  texto: { fontSize: 10, fontWeight: '700' },
});
