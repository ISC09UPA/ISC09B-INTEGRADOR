import { Platform } from 'react-native';

// Dirección del back (ProyectoInteligente.API). Puerto http de launchSettings: 5071.
// Desde el celular usa la IP de la laptop: EXPO_PUBLIC_API_URL=http://192.168.1.50:5071 npx expo start
const BASE = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5071' : 'http://localhost:5071');

// El back responde { message } en errores propios y ProblemDetails ({ errors, title }) en validaciones.
function errorText(data, status) {
  if (data && data.message) return data.message === 'Invalid credentials' ? 'Correo o contraseña incorrectos' : data.message;
  if (data && data.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (first) return first;
  }
  if (data && data.title) return data.title;
  return 'Error del servidor (' + status + ')';
}

async function post(path, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(errorText(data, res.status));
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('El servidor no responde');
    if (e instanceof TypeError) throw new Error('No se pudo conectar al servidor');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/v1/auth/login  ->  { token, nombre, rol }
export const login = (correo, password) => post('/api/v1/auth/login', { correo, password });
// POST /api/v1/auth/register  ->  201 { message }
export const register = (nombre, correo, password) => post('/api/v1/auth/register', { nombre, correo, password });
