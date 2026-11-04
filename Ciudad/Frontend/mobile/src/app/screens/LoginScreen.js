import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Boton from '../components/Boton';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/authService';
import { colores } from '../constants/theme';

export default function LoginScreen() {
  const { setUsuario } = useAuth();

  const [rol, setRol] = useState('admin'); // 'admin' | 'ciudadano'
  const [correo, setCorreo] = useState('admin@crucesmart.mx');
  const [password, setPassword] = useState('12345678');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  function cambiarRol(nuevoRol) {
    setRol(nuevoRol);
    setCorreo(nuevoRol === 'admin' ? 'admin@crucesmart.mx' : 'ana@email.com');
    setError('');
  }

  async function iniciarSesion() {
    if (!correo.trim() || !password.trim()) {
      setError('Escribe tu correo y contraseña');
      return;
    }
    try {
      setCargando(true);
      setError('');
      const datos = await login(correo, password, rol);
      setUsuario(datos); // al haber usuario, la navegación cambia sola
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Correo, contraseña o rol incorrectos');
      } else {
        setError('No se pudo conectar con el servidor');
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenedor} keyboardShouldPersistTaps="handled">
        <Text style={styles.marca}>
          Cruce<Text style={{ color: colores.azul }}>Smart</Text>
        </Text>

        <Text style={styles.eyebrow}>Bienvenido</Text>
        <Text style={styles.titulo}>Tu cruce, más inteligente</Text>
        <Text style={styles.descripcion}>Monitorea el tráfico y ayuda a que la ciudad avance.</Text>

        {/* Selector de rol */}
        <View style={styles.selector}>
          <TouchableOpacity
            style={[styles.rolBoton, rol === 'admin' && styles.rolActivo]}
            onPress={() => cambiarRol('admin')}
          >
            <Text style={[styles.rolTexto, rol === 'admin' && styles.rolTextoActivo]}>Administrador</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rolBoton, rol === 'ciudadano' && styles.rolActivo]}
            onPress={() => cambiarRol('ciudadano')}
          >
            <Text style={[styles.rolTexto, rol === 'ciudadano' && styles.rolTextoActivo]}>Ciudadano</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={colores.gris}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={colores.gris}
        />

        {error !== '' && <Text style={styles.error}>{error}</Text>}

        <View style={{ marginTop: 20 }}>
          <Boton titulo="Iniciar sesión" icono="arrow-forward" onPress={iniciarSesion} cargando={cargando} />
        </View>

        <Text style={styles.seguro}>Conexión segura y cifrada</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenedor: { padding: 24 },
  marca: { fontSize: 20, fontWeight: '800', color: colores.texto, marginBottom: 32, marginTop: 8 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colores.azulClaro,
    fontWeight: '700',
    marginBottom: 6,
  },
  titulo: { fontSize: 28, fontWeight: '700', color: colores.texto },
  descripcion: { fontSize: 14, color: colores.gris, marginTop: 8, marginBottom: 24 },
  selector: {
    flexDirection: 'row',
    backgroundColor: colores.tarjeta,
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  rolBoton: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  rolActivo: { backgroundColor: colores.azul },
  rolTexto: { color: colores.gris, fontWeight: '600', fontSize: 14 },
  rolTextoActivo: { color: colores.texto },
  label: { fontSize: 13, fontWeight: '600', color: colores.gris, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: colores.tarjeta,
    color: colores.texto,
  },
  error: { color: '#f87171', marginTop: 12, fontSize: 13 },
  seguro: { textAlign: 'center', color: colores.gris, fontSize: 11, marginTop: 18 },
});
