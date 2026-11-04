import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Pantalla from '../components/Pantalla';
import Encabezado from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import Etiqueta from '../components/Etiqueta';
import Boton from '../components/Boton';
import { useAuth } from '../context/AuthContext';
import { colores } from '../constants/theme';

const OPCIONES = [
  { texto: 'Datos personales', icono: 'person-outline' },
  { texto: 'Preferencias de notificación', icono: 'notifications-outline' },
  { texto: 'Privacidad y seguridad', icono: 'eye-outline' },
  { texto: 'Ayuda y soporte', icono: 'document-text-outline' },
];

export default function PerfilScreen() {
  const { usuario, setUsuario } = useAuth();

  const iniciales = usuario.nombre
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <Pantalla>
      <Encabezado
        titulo="Perfil"
        subtitulo={usuario.rol === 'admin' ? 'Cuenta administrativa' : 'Cuenta ciudadana'}
      />

      <View style={styles.cabecera}>
        <View style={styles.avatar}>
          <Text style={styles.iniciales}>{iniciales}</Text>
        </View>
        <Text style={styles.nombre}>{usuario.nombre}</Text>
        <Text style={styles.detalle}>{usuario.detalle}</Text>
        <View style={{ marginTop: 10 }}>
          <Etiqueta texto="Cuenta verificada" tono="green" />
        </View>
      </View>

      <Tarjeta style={{ paddingVertical: 4 }}>
        {OPCIONES.map((o, i) => (
          <View key={o.texto} style={[styles.opcion, i < OPCIONES.length - 1 && styles.opcionLinea]}>
            <View style={styles.icono}>
              <Ionicons name={o.icono} size={18} color={colores.azulClaro} />
            </View>
            <Text style={styles.opcionTexto}>{o.texto}</Text>
            <Ionicons name="chevron-forward" size={17} color={colores.gris} />
          </View>
        ))}
      </Tarjeta>

      <Boton titulo="Cerrar sesión" variante="secundario" onPress={() => setUsuario(null)} />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  cabecera: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1e3a5f',
    borderWidth: 2,
    borderColor: colores.azul,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iniciales: { color: colores.texto, fontSize: 26, fontWeight: '700' },
  nombre: { color: colores.texto, fontSize: 20, fontWeight: '700' },
  detalle: { color: colores.gris, fontSize: 13, marginTop: 4 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  opcionLinea: { borderBottomWidth: 1, borderBottomColor: colores.linea },
  icono: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionTexto: { flex: 1, color: colores.texto, fontWeight: '600', fontSize: 14 },
});
