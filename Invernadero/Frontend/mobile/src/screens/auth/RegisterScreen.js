/**
 * Pantalla de Crear cuenta (avance 1, solo interfaz).
 * Validaciones visuales en vivo (correo, contraseña ≥ 8 caracteres,
 * confirmación idéntica), botón deshabilitado hasta que el formulario
 * sea válido, spinner al «enviar» y estado de error en recuadro rosa.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AuthLayout from './AuthLayout';
import ErrorBanner from '../../components/ui/ErrorBanner';
import PrimaryButton from '../../components/ui/PrimaryButton';
import TextField from '../../components/ui/TextField';
import { colors, spacing, typography } from '../../theme';

const esCorreoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
const LONGITUD_MINIMA = 8;

export default function RegisterScreen({ onIrALogin = null }) {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [visitados, setVisitados] = useState({}); // Campos que ya se tocaron
  const [errorGeneral, setErrorGeneral] = useState(null); // Banner rosa
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

  const onSubmit = () => {
    if (!formularioValido) return;
    // DEMO: no hay backend. Se simula el envío con el spinner y se
    // muestra el estado de error «correo ya registrado» del mockup.
    setEnviando(true);
    setTimeout(() => {
      setEnviando(false);
      setErrorGeneral('Este correo ya está registrado.');
    }, 900);
  };

  return (
    <AuthLayout>
      {/* Cabecera verde oscuro: la barra de estado debe ser clara */}
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

      {/* Solo visible en el avance 2, cuando el stack pasa el enlace */}
      {onIrALogin ? (
        <Pressable
          accessibilityRole="button"
          onPress={onIrALogin}
          style={styles.pie}
        >
          <Text style={styles.pieTexto}>
            ¿Ya tienes una cuenta?{' '}
            <Text style={styles.pieEnlace}>Inicia sesión</Text>
          </Text>
        </Pressable>
      ) : null}
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
  pie: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  pieTexto: {
    ...typography.body,
    color: colors.textSecondary,
  },
  pieEnlace: {
    fontWeight: '700',
    color: colors.primary,
  },
});
