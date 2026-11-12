import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { ApiError } from '@/api/client';
import { AuthForm, authStyles } from '@/components/AuthForm';
import { Campo } from '@/components/Inputs';
import { useAuth } from '@/context/AuthContext';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mockup "Log in": POST /api/auth/login. */
export default function LogIn() {
  const { iniciarSesion } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const continuar = async () => {
    setError(null);
    if (!EMAIL.test(email.trim())) return setError('Escribe un correo electrónico válido.');
    if (!password) return setError('Escribe tu contraseña.');
    setCargando(true);
    try {
      await iniciarSesion(email, password);
    } catch (e) {
      const err = e as ApiError;
      setError(err.status === 401 ? 'Correo o contraseña incorrectos.' : err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <AuthForm
      titulo="Inicia sesión en tu cuenta"
      subtitulo="Ingresa tu correo electrónico para ingresar a esta aplicación"
      cargando={cargando}
      error={error}
      aviso={aviso}
      onContinuar={continuar}
      onGoogle={() => setAviso('El acceso con Google todavía no está disponible.')}
      campos={
        <>
          <Campo
            placeholder="correoelectrónico@dominio.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel="Correo electrónico"
          />
          <Campo
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={continuar}
            accessibilityLabel="Contraseña"
          />
        </>
      }
      enlace={
        <Text style={authStyles.enlaceTexto}>
          No tienes cuenta?,{' '}
          <Link href="/registro" replace style={authStyles.enlaceAzul}>
            Registrate aquí
          </Link>
        </Text>
      }
    />
  );
}
