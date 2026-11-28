/**
 * Datos personales (dentro de Perfil): edición de nombre, correo y contraseña.
 * Pantalla simple sin mockup; sigue los mismos patrones de formulario.
 */
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { PrimaryButton, ScreenHeader, TextField } from '../../components';
import { colors, radii, spacing } from '../../theme';

const esCorreoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

export default function ProfileEditScreen({ navigation }) {
  const { perfil, actualizarPerfil, mostrarToast } = useApp();

  const [nombreCompleto, setNombreCompleto] = useState(perfil?.nombreCompleto ?? '');
  const [email, setEmail] = useState(perfil?.email ?? '');
  const [contrasena, setContrasena] = useState(''); // Opcional: solo si se quiere cambiar
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const validar = () => {
    const resultado = {};
    if (!nombreCompleto.trim()) resultado.nombreCompleto = 'Ingresa tu nombre.';
    if (!email.trim()) resultado.email = 'Ingresa tu correo electrónico.';
    else if (!esCorreoValido(email.trim())) resultado.email = 'Ingresa un correo electrónico válido.';
    if (contrasena && contrasena.length < 8) {
      resultado.contrasena = 'La contraseña debe tener al menos 8 caracteres.';
    }
    return resultado;
  };

  const guardar = async () => {
    const resultado = validar();
    setErrores(resultado);
    if (Object.keys(resultado).length > 0) return;

    setGuardando(true);
    try {
      await actualizarPerfil({
        nombreCompleto: nombreCompleto.trim(),
        email: email.trim(),
        ...(contrasena ? { contrasena } : {}),
      });
      mostrarToast('exito', 'Datos actualizados.');
      navigation.goBack();
    } catch (error) {
      mostrarToast('error', error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.pantalla}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title="Datos personales"
            left={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Regresar"
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [styles.volver, pressed && styles.pulsado]}
              >
                <Feather name="chevron-left" size={20} color={colors.primary} />
              </Pressable>
            }
          />

          <TextField
            label="Nombre completo"
            placeholder="Mariana Ríos"
            value={nombreCompleto}
            onChangeText={(v) => setNombreCompleto(v)}
            error={errores.nombreCompleto}
          />

          <TextField
            label="Correo electrónico"
            placeholder="mariana@invernadero.app"
            value={email}
            onChangeText={(v) => setEmail(v)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errores.email}
          />

          <TextField
            label="Nueva contraseña"
            placeholder="••••••••••"
            value={contrasena}
            onChangeText={(v) => setContrasena(v)}
            secureTextEntry
            autoCapitalize="none"
            error={errores.contrasena}
            helper="Déjala vacía para no cambiarla."
          />

          <PrimaryButton
            label="Guardar cambios"
            onPress={guardar}
            loading={guardando}
            style={styles.boton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  contenido: {
    padding: spacing.screen,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  volver: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsado: {
    opacity: 0.7,
  },
  boton: {
    marginTop: spacing.sm,
  },
});
