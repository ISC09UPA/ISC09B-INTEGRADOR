import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { ApiError } from '@/api/client';
import { AuthForm, authStyles } from '@/components/AuthForm';
import { Campo } from '@/components/Inputs';
import { useAuth } from '@/context/AuthContext';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mockup "Sign In" (Crea una cuenta): POST /api/auth/registro. */
export default function SignIn() {
  const { registrarse } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});
  const [aviso, setAviso] = useState<string | null>(null);

  const continuar = async () => {
    setError(null);
    const nuevos: Record<string, string | undefined> = {};
    if (!nombre.trim()) nuevos.nombre = 'Escribe tu nombre.';
    if (!EMAIL.test(email.trim())) nuevos.email = 'Escribe un correo electrónico válido.';
    if (password.length < 8) nuevos.password = 'La contraseña debe tener al menos 8 caracteres.';
    if (confirmacion !== password) nuevos.confirmacion = 'Las contraseñas no coinciden.';
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) return;

    setCargando(true);
    try {
      await registrarse(nombre, email, password);
    } catch (e) {
      const err = e as ApiError;
      if (err instanceof ApiError && err.problema?.errors) {
        setErrores({ nombre: err.campo('Nombre'), email: err.campo('Email'), password: err.campo('Password') });
      }
      setError(err.status === 409 ? 'Ya existe una cuenta con ese correo.' : err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <AuthForm
      titulo="Crea una cuenta"
      subtitulo="Ingresa tu correo electrónico para registrarte en esta aplicación"
      cargando={cargando}
      error={error}
      aviso={aviso}
      onContinuar={continuar}
      onGoogle={() => setAviso('El registro con Google todavía no está disponible.')}
      campos={
        <>
          <Campo
            placeholder="¿Cómo te llamas?"
            value={nombre}
            onChangeText={setNombre}
            autoComplete="name"
            textContentType="name"
            error={errores.nombre}
            accessibilityLabel="Nombre"
          />
          <Campo
            placeholder="correoelectrónico@dominio.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            error={errores.email}
            accessibilityLabel="Correo electrónico"
          />
          <Campo
            placeholder="Ingresa una contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={errores.password}
            accessibilityLabel="Contraseña"
          />
          <Campo
            placeholder="Confirma tu contraseña"
            value={confirmacion}
            onChangeText={setConfirmacion}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={continuar}
            error={errores.confirmacion}
            accessibilityLabel="Confirmar contraseña"
          />
        </>
      }
      enlace={
        <Text style={authStyles.enlaceTexto}>
          Ya tienes cuenta?,{' '}
          <Link href="/login" replace style={authStyles.enlaceAzul}>
            Inicia sesión aquí
          </Link>
        </Text>
      }
    />
  );
}
