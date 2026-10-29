import { ScrollView, View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores } from '../constants/theme';

// Contenedor base de todas las pantallas: respeta el notch, hace scroll,
// permite "jalar para refrescar" y muestra errores de la API.
export default function Pantalla({ children, error = '', onRefrescar, refrescando = false }) {
  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.contenedor}
        refreshControl={
          onRefrescar ? (
            <RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor={colores.azulClaro} />
          ) : undefined
        }
      >
        {error !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTexto}>{error}</Text>
            {onRefrescar && (
              <TouchableOpacity onPress={onRefrescar}>
                <Text style={styles.reintentar}>Reintentar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenedor: { padding: 18, paddingBottom: 30 },
  errorBox: {
    backgroundColor: '#451f28',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorTexto: { color: '#f87171', fontSize: 13 },
  reintentar: { color: colores.texto, fontWeight: '700', marginTop: 6 },
});
