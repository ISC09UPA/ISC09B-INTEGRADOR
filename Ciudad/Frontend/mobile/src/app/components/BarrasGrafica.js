import { View, Text, StyleSheet } from 'react-native';
import { colores } from '../constants/theme';

// Gráfica de barras sencilla hecha con Views.
// Si se manda "valores2" dibuja dos barras por grupo (comparativo).
export default function BarrasGrafica({ etiquetas = [], valores = [], valores2 = null }) {
  return (
    <View style={styles.grafica}>
      {valores.map((v, i) => (
        <View key={i} style={styles.grupo}>
          <View style={styles.barras}>
            {valores2 && (
              <View style={[styles.barra, { height: `${valores2[i]}%`, backgroundColor: '#475569' }]} />
            )}
            <View style={[styles.barra, { height: `${v}%`, backgroundColor: colores.azul }]} />
          </View>
          <Text style={styles.etiqueta}>{etiquetas[i]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grafica: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  grupo: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  barras: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3, width: '100%', justifyContent: 'center' },
  barra: { width: 14, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  etiqueta: { fontSize: 10, color: colores.gris, marginTop: 6 },
});
