/**
 * Pantalla 13: Login.
 * Estados: normal, error de credenciales (recuadro rosa), cargando
 * (spinner en el botón) y campos con foco resaltado.
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

export default function LoginScreen({ navigation }) {
  const { iniciarSesion, mostrarToast } = useApp();

  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState({}); // Errores por campo
  const [errorGeneral, setErrorGeneral] = useState(null); // Banner rosa
  const [enviando, setEnviando] = useState(false);

  /** Valida ambos campos y devuelve un objeto con los errores. */
  const validar = () => {
    const resultado = {};
    if (!email.trim()) resultado.email = 'Ingresa tu correo electrónico.';
    else if (!esCorreoValido(email.trim())) resultado.email = 'Ingresa un correo electrónico válido.';
    if (!contrasena) resultado.contrasena = 'Ingresa tu contraseña.';
    return resultado;
  };

  /** Limpia el error del campo y el banner al escribir. */
  const cambiarEmail = (valor) => {
    setEmail(valor);
    setErrores((prev) => ({ ...prev, email: null }));
    setErrorGeneral(null);
  };
  const cambiarContrasena = (valor) => {
    setContrasena(valor);
    setErrores((prev) => ({ ...prev, contrasena: null }));
    setErrorGeneral(null);
  };

  /** Valida el campo correo al salir de él. */
  const validarEmailAlSalir = () => {
    setErrores((prev) => ({
      ...prev,
      email: !email.trim()
        ? 'Ingresa tu correo electrónico.'
        : !esCorreoValido(email.trim())
          ? 'Ingresa un correo electrónico válido.'
          : null,
    }));
  };

  const onSubmit = async () => {
    const resultado = validar();
    setErrores(resultado);
    setErrorGeneral(null);
    if (Object.keys(resultado).length > 0) return;

    setEnviando(true);
    try {
      // Al iniciar sesión, RootNavigator muestra automáticamente las pestañas.
      await iniciarSesion(email.trim(), contrasena);
    } catch (error) {
      // Credenciales incorrectas u otros fallos del servicio.
      setErrorGeneral(error.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout>
      {/* Cabecera verde oscuro: la barra de estado debe ser clara */}
      <StatusBar style="light" />

      <Text style={styles.titulo}>Bienvenida de nuevo</Text>
      <Text style={styles.subtitulo}>Ingresa para ver cómo están tus plantas.</Text>

      {errorGeneral ? <ErrorBanner mensaje={errorGeneral} style={styles.banner} /> : null}

      <TextField
        label="Correo electrónico"
        placeholder="mariana@invernadero.app"
        value={email}
        onChangeText={cambiarEmail}
        onBlur={validarEmailAlSalir}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={errores.email}
        returnKeyType="next"
      />

      <TextField
        label="Contraseña"
        placeholder="••••••••••"
        value={contrasena}
        onChangeText={cambiarContrasena}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        error={errores.contrasena}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      {/* Enlace sugerido (no aparece en el mockup) */}
      <Pressable
        accessibilityRole="button"
        onPress={() => mostrarToast('info', 'Próximamente podrás restablecer tu contraseña.')}
        style={styles.olvidada}
      >
        <Text style={styles.olvidadaTexto}>¿Olvidaste tu contraseña?</Text>
      </Pressable>

      <PrimaryButton
        label="Iniciar sesión"
        onPress={onSubmit}
        loading={enviando}
        style={styles.boton}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('CrearCuenta')}
        style={styles.crearCuenta}
      >
        <Text style={styles.crearCuentaTexto}>
          ¿No tienes cuenta? <Text style={styles.crearCuentaEnlace}>Crear cuenta</Text>
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
  olvidada: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  olvidadaTexto: {
    ...typography.captionBold,
    color: colors.primary,
  },
  boton: {
    marginTop: spacing.xs,
  },
  crearCuenta: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  crearCuentaTexto: {
    ...typography.body,
    color: colors.textSecondary,
  },
  crearCuentaEnlace: {
    color: colors.primary,
    fontWeight: '700',
  },
});
