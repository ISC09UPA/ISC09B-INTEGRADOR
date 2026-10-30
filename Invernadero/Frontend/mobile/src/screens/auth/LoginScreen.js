/**
 * Pantalla de Iniciar sesión (avance 2, solo interfaz).
 * Validaciones visuales en vivo (correo válido, contraseña presente),
 * botón deshabilitado hasta que el formulario sea válido, spinner al
 * «entrar», estado de error en recuadro rosa y enlace para ir a
 * «Crear cuenta». Sin backend.
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

export default function LoginScreen({ navigation, onIrACrearCuenta }) {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
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
    contrasena: !contrasena ? 'Ingresa tu contraseña.' : null,
  };

  const formularioValido = !validaciones.email && !validaciones.contrasena;

  /** El error de un campo solo se muestra después de tocarlo. */
  const errorDe = (campo) => (visitados[campo] ? validaciones[campo] : null);

  const marcarVisitado = (campo) =>
    setVisitados((prev) => (prev[campo] ? prev : { ...prev, [campo]: true }));

  const limpiarBanner = () => setErrorGeneral(null);

  /** Origen del enlace «Crea una»: prop directa o navegación de stack. */
  const irACrearCuenta =
    onIrACrearCuenta || (navigation ? () => navigation.navigate('Registro') : null);

  const onSubmit = () => {
    if (!formularioValido) return;
    // DEMO: no hay backend. Se simula el envío con el spinner y se
    // muestra el estado de error «credenciales incorrectas» del mockup.
    setEnviando(true);
    setTimeout(() => {
      setEnviando(false);
      setErrorGeneral('Correo o contraseña incorrectos.');
    }, 900);
  };

  return (
    <AuthLayout>
      {/* Cabecera verde oscuro: la barra de estado debe ser clara */}
      <StatusBar style="light" />

      <Text style={styles.titulo}>Bienvenido de nuevo</Text>
      <Text style={styles.subtitulo}>Inicia sesión en tu invernadero.</Text>

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
        autoComplete="password"
        error={errorDe('contrasena')}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      {/* Enlace de recuperación (solo visual por ahora) */}
      <Pressable
        accessibilityRole="button"
        onPress={() => setErrorGeneral('Recuperación de contraseña próximamente.')}
        style={styles.olvidaste}
      >
        <Text style={styles.olvidasteTexto}>¿Olvidaste tu contraseña?</Text>
      </Pressable>

      <PrimaryButton
        label="Iniciar sesión"
        onPress={onSubmit}
        loading={enviando}
        disabled={!formularioValido}
        style={styles.boton}
      />

      {irACrearCuenta ? (
        <Pressable
          accessibilityRole="button"
          onPress={irACrearCuenta}
          style={styles.pie}
        >
          <Text style={styles.pieTexto}>
            ¿No tienes una cuenta?{' '}
            <Text style={styles.pieEnlace}>Crea una</Text>
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
  olvidaste: {
    alignSelf: 'flex-end',
    marginTop: spacing.md,
  },
  olvidasteTexto: {
    ...typography.captionBold,
    color: colors.primary,
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
