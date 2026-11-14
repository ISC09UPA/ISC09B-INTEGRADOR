import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../api';
import { MensajeError } from '../components/EstadoCarga';
import { colors, radius } from '../theme';

const MIN_CONTRASENA = 8; // Igual que [MinLength(8)] en RegistroRequest del back.

/**
 * Crear cuenta. El back siempre la crea con rol Usuario y ya regresa el token,
 * así que al terminar entra directo sin pasar por el login.
 */
export default function RegisterScreen({ onRegistrado, onVolver }) {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const contrasenaCorta = contrasena.length > 0 && contrasena.length < MIN_CONTRASENA;
  const valido =
    nombre.trim() !== '' && correo.includes('@') && contrasena.length >= MIN_CONTRASENA;

  const crear = async () => {
    if (!valido || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const sesion = await auth.registro({
        nombre: nombre.trim(),
        correo: correo.trim(),
        contrasena,
      });
      onRegistrado(sesion);
    } catch (err) {
      setError(err.message); // 409: "Ya existe una cuenta con ese correo."
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Pressable style={styles.back} onPress={onVolver}>
            <Ionicons name="chevron-back" size={20} color={colors.green900} />
          </Pressable>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>
            Regístrate para ver dónde está tu auto y tu historial de entradas y salidas.
          </Text>
        </View>

        <View style={styles.sheet}>
          <Campo label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Tu nombre" />
          <Campo
            label="Correo"
            value={correo}
            onChangeText={setCorreo}
            placeholder="tu@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Campo
            label="Contraseña"
            value={contrasena}
            onChangeText={setContrasena}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
          />
          {contrasenaCorta && (
            <Text style={styles.hint}>La contraseña debe tener al menos {MIN_CONTRASENA} caracteres.</Text>
          )}

          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={18} color={colors.inkSoft} />
            <Text style={styles.noteText}>
              Para ver tu auto en la app, el administrador debe registrar tu placa con este mismo correo.
            </Text>
          </View>

          <MensajeError mensaje={error} />

          <Pressable
            onPress={crear}
            disabled={!valido || enviando}
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && { opacity: 0.85 },
              (!valido || enviando) && { opacity: 0.5 },
            ]}
          >
            {enviando ? (
              <ActivityIndicator color={colors.green900} />
            ) : (
              <Text style={styles.btnPrimaryText}>Crear cuenta</Text>
            )}
          </Pressable>

          <View style={styles.login}>
            <Text style={styles.loginText}>¿Ya tienes cuenta?</Text>
            <Pressable onPress={onVolver}>
              <Text style={styles.loginLink}>Iniciar sesión</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Campo({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#8a9b92"
        autoCorrect={false}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.green900 },
  scroll: { flexGrow: 1 },

  hero: { paddingTop: 60, paddingHorizontal: 28, paddingBottom: 32, gap: 12 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 12, fontSize: 30, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 15, lineHeight: 22, color: colors.green100 },

  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 28,
    paddingBottom: 36,
    gap: 16,
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.inkSoft },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    fontSize: 15,
    color: colors.ink,
  },
  hint: { fontSize: 12, color: colors.red, marginTop: -8 },

  note: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: colors.green50,
    borderRadius: radius.md,
    padding: 12,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.inkSoft },

  btnPrimary: {
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.green700,
    alignItems: 'center',
  },
  btnPrimaryText: { color: colors.green900, fontSize: 16, fontWeight: '700' },

  login: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  loginText: { fontSize: 14, color: colors.inkSoft },
  loginLink: { fontSize: 14, fontWeight: '800', color: colors.ink },
});
