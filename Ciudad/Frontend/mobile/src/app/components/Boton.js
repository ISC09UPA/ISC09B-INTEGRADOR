import { Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../constants/theme';

// variante: 'primario' | 'peligro' | 'secundario'
export default function Boton({ titulo, onPress, variante = 'primario', icono, cargando = false }) {
  return (
    <TouchableOpacity
      style={[styles.boton, styles[variante]]}
      onPress={onPress}
      disabled={cargando}
    >
      {cargando ? (
        <ActivityIndicator color={colores.texto} />
      ) : (
        <>
          {icono && <Ionicons name={icono} size={18} color={variante === 'secundario' ? '#fca5a5' : colores.texto} />}
          <Text style={[styles.texto, variante === 'secundario' && { color: '#fca5a5' }]}>{titulo}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  boton: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primario: { backgroundColor: colores.azul },
  peligro: { backgroundColor: '#dc2f3d', marginTop: 4 },
  secundario: {
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.linea,
    marginTop: 8,
  },
  texto: { color: colores.texto, fontWeight: '700', fontSize: 14 },
});
