import { View, StyleSheet } from 'react-native';
import { colores } from '../constants/theme';

export default function Tarjeta({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: '#26354b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
});
