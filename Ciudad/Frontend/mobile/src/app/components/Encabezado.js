import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../constants/theme';

export default function Encabezado({ titulo, subtitulo = 'CruceSmart', onAlertas, onAtras }) {
  return (
    <View style={styles.barra}>
      <View style={styles.izquierda}>
        {onAtras && (
          <TouchableOpacity style={styles.botonAtras} onPress={onAtras}>
            <Ionicons name="chevron-back" size={22} color={colores.texto} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.subtitulo}>{subtitulo}</Text>
          <Text style={styles.titulo}>{titulo}</Text>
        </View>
      </View>

      {onAlertas && (
        <TouchableOpacity style={styles.botonAlertas} onPress={onAlertas}>
          <Ionicons name="notifications-outline" size={22} color={colores.texto} />
          <View style={styles.punto} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  izquierda: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botonAtras: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colores.linea,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitulo: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colores.azulClaro,
    fontWeight: '700',
    marginBottom: 4,
  },
  titulo: { fontSize: 23, fontWeight: '700', color: colores.texto },
  botonAlertas: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colores.linea,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  punto: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colores.rojo,
    borderWidth: 2,
    borderColor: colores.tarjeta,
  },
});
