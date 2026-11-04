import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Boton from '../components/Boton';
import { colores } from '../constants/theme';

export default function SplashScreen({ onComenzar }) {
  return (
    <View style={styles.pantalla}>
      <View style={styles.logo}>
        <Ionicons name="git-network-outline" size={48} color={colores.azulClaro} />
      </View>

      <View style={styles.centro}>
        <Text style={styles.titulo}>
          Cruce<Text style={styles.tituloAzul}>Smart</Text>
        </Text>
        <Text style={styles.lema}>La ciudad se mueve mejor.</Text>
      </View>

      <View style={styles.abajo}>
        <Boton titulo="Comenzar" onPress={onComenzar} />
        <Text style={styles.version}>Movilidad inteligente · v1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 28,
    paddingTop: 120,
    paddingBottom: 50,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 32,
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: colores.azul,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: { alignItems: 'center' },
  titulo: { fontSize: 38, fontWeight: '800', color: colores.texto },
  tituloAzul: { color: colores.azul },
  lema: { fontSize: 15, color: colores.gris, marginTop: 8 },
  abajo: { width: '100%', alignItems: 'center' },
  version: { fontSize: 11, color: colores.gris, marginTop: 16 },
});
