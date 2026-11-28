/**
 * Pantalla 14: Crear cuenta.
 * Valida correo, contraseña (mínimo 8 caracteres) y confirmación idéntica.
 * El botón queda deshabilitado hasta que el formulario sea válido (sugerido)
 * y muestra spinner mientras se envía.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AuthLayout from './AuthLayout';
import ErrorBanner from '../../components/ui/ErrorBanner';
import PrimaryButton from '../../components/ui/PrimaryButton';
import TextField from '../../components/ui/TextField';
import { useApp } from '../../context/AppContext';
import { colors, spacing, typography } from '../../theme';

const esCorreoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
const LONGITUD_MINIMA = 8;

export default function RegisterScreen({ navigation }) {
  const { registrar } = useApp();

  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [visitados, setVisitados] = useState({}); // Campos que ya se tocaron
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  /** Errores calculados en vivo para cada campo. */
  const validaciones = {
    email: !email.trim()
      ? 'Ingresa tu correo electrónico.'
      : !esCorreoValido(email.trim())
        ? 'Ingresa un correo electrónico válido.'
        : null,
    contrasena: !contrasena
      ? 'Ingresa una contraseña.'
      : contrasena.length < LONGITUD_MINIMA
        ? 'La contraseña debe tener al menos 8 caracteres.'
        : null,
    confirmacion: !confirmacion
      ? 'Confirma tu contraseña.'
      : confirmacion !== contrasena
        ? 'Las contraseñas no coinciden.'
        : null,
  };

  const formularioValido = !validaciones.email && !validaciones.contrasena && !validaciones.confirmacion;

  /** El error de un campo solo se muestra después de tocarlo. */
  const errorDe = (campo) => (visitados[campo] ? validaciones[campo] : null);

  const marcarVisitado = (campo) =>
    setVisitados((prev) => (prev[campo] ? prev : { ...prev, [campo]: true }));

  const limpiarBanner = () => setErrorGeneral(null);

  const onSubmit = async () => {
    if (!formularioValido) return;
    setEnviando(true);
    try {
      // Al crear la cuenta la sesión inicia sola y RootNavigator
      // muestra automáticamente las pestañas principales.
      await registrar({ email: email.trim(), contrasena });
    } catch (error) {
      // «Este correo ya está registrado.» y fallos de red.
      setErrorGeneral(error.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout>
      <StatusBar style="light" />

      <Text style={styles.titulo}>Crea tu cuenta</Text>
      <Text style={styles.subtitulo}>Configura tu primer invernadero.</Text>

      {errorGeneral ? <ErrorBanner mensaje={errorGeneral} style={styles.banner} /> : null}

      <TextField
        label="Correo electrónico"
        placeholder="mariana@invernadero.app"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          limpiarBanner();
        }}
        onBlur={() => marcarVisitado('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={errorDe('email')}
        returnKeyType="next"
      />

      <TextField
        label="Contraseña"
        placeholder="••••••••••"
        value={contrasena}
        onChangeText={(v) => {
          setContrasena(v);
          limpiarBanner();
        }}
        onBlur={() => marcarVisitado('contrasena')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
        error={errorDe('contrasena')}
        returnKeyType="next"
      />

      <TextField
        label="Confirmar contraseña"
        placeholder="••••••••••"
        value={confirmacion}
        onChangeText={(v) => {
          setConfirmacion(v);
          limpiarBanner();
        }}
        onBlur={() => marcarVisitado('confirmacion')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
        error={errorDe('confirmacion')}
        helper="Mínimo 8 caracteres"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      <PrimaryButton
        label="Crear cuenta"
        onPress={onSubmit}
        loading={enviando}
        disabled={!formularioValido}
        style={styles.boton}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Login')}
        style={styles.iniciarSesion}
      >
        <Text style={styles.iniciarSesionTexto}>
          ¿Ya tienes cuenta? <Text style={styles.iniciarSesionEnlace}>Iniciar sesión</Text>
        </Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  titulo: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitulo: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  banner: {
    marginBottom: spacing.lg,
  },
  boton: {
    marginTop: spacing.xl,
  },
  iniciarSesion: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  iniciarSesionTexto: {
    ...typography.body,
    color: colors.textSecondary,
  },
  iniciarSesionEnlace: {
    color: colors.primary,
    fontWeight: '700',
  },
});
