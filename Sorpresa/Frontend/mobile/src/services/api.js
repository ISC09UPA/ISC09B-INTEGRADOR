const API_BASE_URL = 'http://localhost:5071/api';

export const api = {
  // --- TURNOS ---
  async getCola() {
    try {
      const res = await fetch(`${API_BASE_URL}/turnos/cola`);
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },

  async getTurnoActual() {
    try {
      const res = await fetch(`${API_BASE_URL}/turnos/actual`);
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },

  async llamarSiguiente() {
    try {
      const res = await fetch(`${API_BASE_URL}/turnos/llamar-siguiente`, { method: 'POST' });
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },

  async iniciarConsulta() {
    try {
      const res = await fetch(`${API_BASE_URL}/turnos/iniciar-consulta`, { method: 'POST' });
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },

  async finalizarConsulta() {
    try {
      const res = await fetch(`${API_BASE_URL}/turnos/finalizar-consulta`, { method: 'POST' });
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },

  // --- USUARIOS ---
  async getUsuarios() {
    try {
      const res = await fetch(`${API_BASE_URL}/usuarios`);
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },

  async toggleUsuario(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/usuarios/${id}/toggle-activo`, { method: 'PATCH' });
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },

  async crearUsuario(usuario) {
    try {
      const res = await fetch(`${API_BASE_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuario)
      });
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },

  // --- ESTADO SALA & BITACORA ---
  async getEstadoSala() {
    try {
      const res = await fetch(`${API_BASE_URL}/sala/estado`);
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },

  async actualizarPuerta(door) {
    try {
      const res = await fetch(`${API_BASE_URL}/sala/puerta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ door })
      });
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },

  async getBitacora() {
    try {
      const res = await fetch(`${API_BASE_URL}/sala/bitacora`);
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },

  async registrarAcceso(who, ok) {
    try {
      const res = await fetch(`${API_BASE_URL}/sala/bitacora`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ who, ok })
      });
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },

  // --- AUTH ---
  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return await res.json();
    } catch { return null; }
  }
};
