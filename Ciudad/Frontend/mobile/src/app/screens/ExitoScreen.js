import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tarjeta from '../components/Tarjeta';
import Etiqueta from '../components/Etiqueta';
import Boton from '../components/Boton';
import { colores } from '../constants/theme';

export default function ExitoScreen({ navigation, route }) {
  const { folio, hora } = route.params;

  return (
    <SafeAreaView style={styles.pantalla}>
      <View style={styles.contenedor}>
        <View style={styles.icono}>
          <Ionicons name="checkmark" size={42} color={colores.verde} />
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.eyebrow}>Reporte enviado</Text>
          <Text style={styles.titulo}>Gracias por ayudar</Text>
          <Text style={styles.descripcion}>
            Tu reporte fue recibido y será revisado por el centro de monitoreo.
          </Text>
        </View>

        <Tarjeta style={{ width: '100%' }}>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Folio</Text>
            <Text style={styles.valor}>{folio}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Estado</Text>
            <Etiqueta texto="En revisión" tono="yellow" />
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Enviado</Text>
            <Text style={styles.valor}>Hoy · {hora}</Text>
          </View>
        </Tarjeta>

        <View style={{ width: '100%' }}>
          <Boton titulo="Volver al tráfico" onPress={() => navigation.navigate('CiudadanoTabs')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenedor: { flex: 1, alignItems: 'center', justifyContent: 'space-around', padding: 24 },
  icono: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#133c2d',
    borderWidth: 2,
    borderColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colores.azulClaro,
    fontWeight: '700',
    marginBottom: 6,
  },
  titulo: { fontSize: 28, fontWeight: '700', color: colores.texto },
  descripcion: { color: colores.gris, fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 12 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  etiqueta: { color: colores.gris, fontSize: 13 },
  valor: { color: colores.texto, fontWeight: '700', fontSize: 14 },
});
