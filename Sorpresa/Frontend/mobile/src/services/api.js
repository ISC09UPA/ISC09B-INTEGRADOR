// Cliente HTTP para el backend de Consultorio Inteligente
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5071';

async function get(path) {
  try {
    const r = await fetch(`${BASE}${path}`);
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function post(path, body) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function put(path, body) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function patch(path, body) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

export const api = {
  // Turnos
  getCola:          () => get('/api/turnos/cola'),
  getTurnoActual:   () => get('/api/turnos/actual'),
  llamarSiguiente:  () => post('/api/turnos/llamar-siguiente'),
  iniciarConsulta:  () => post('/api/turnos/iniciar-consulta'),
  finalizarConsulta:() => post('/api/turnos/finalizar-consulta'),
  agregarTurno:     (nombre) => post('/api/turnos', { nombrePaciente: nombre }),

  // Usuarios
  getUsuarios:   () => get('/api/usuarios'),
  crearUsuario:  (dto) => post('/api/usuarios', dto),
  toggleUsuario: (id) => patch(`/api/usuarios/${id}/toggle-activo`),

  // Auth
  login: (email, password) => post('/api/auth/login', { email, password }),

  // Sala / Bitácora
  getEstadoSala:    () => get('/api/sala/estado'),
  actualizarPuerta: (estado) => put('/api/sala/puerta', { estado }),
  getBitacora:      () => get('/api/sala/bitacora'),
  registrarAcceso:  (who, ok) => post('/api/sala/bitacora', { usuarioTag: who, concedido: ok }),
};
