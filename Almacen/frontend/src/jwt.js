// Lee y valida un JWT en el celular. La firma solo la puede verificar el servidor (es quien tiene la clave secreta).
const dec = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function leerJwt(token) {
  const partes = String(token).split('.');
  if (partes.length !== 3) throw new Error('Token inválido');
  let c;
  try { c = JSON.parse(dec(partes[1])); } catch { throw new Error('Token inválido'); }
  if (!c.exp || c.exp * 1000 <= Date.now()) throw new Error('La sesión expiró, inicia sesión de nuevo');
  const rol = String(c.rol || c.role || c['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || '').toLowerCase();
  if (rol !== 'admin' && rol !== 'operador') throw new Error('El token no trae un rol válido');
  return { rol, nombre: c.nombre || c.name || c.unique_name || c.email || 'Usuario', email: c.email || c.sub || '' };
}

// Solo para el modo demo: fabrica un token con vigencia de 8 horas
export const fakeJwt = (u) =>
  enc({ alg: 'HS256', typ: 'JWT' }) + '.' +
  enc({ email: u.email, nombre: u.nombre, rol: u.rol, exp: Math.floor(Date.now() / 1000) + 8 * 3600 }) + '.demo';
