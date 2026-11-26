// Lee y valida un JWT en el celular. La firma solo la puede verificar el servidor (es quien tiene la clave secreta).
// Base64url <-> JSON en UTF-8, sin depender de funciones que el celular podría no tener
const dec = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return decodeURIComponent(bin.split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
};
const enc = (o) =>
  btoa(encodeURIComponent(JSON.stringify(o)).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function leerJwt(token) {
  const partes = String(token).split('.');
  if (partes.length !== 3) throw new Error('Token inválido');
  let c;
  try { c = JSON.parse(dec(partes[1])); } catch { throw new Error('Token inválido'); }
  if (!c.exp || c.exp * 1000 <= Date.now()) throw new Error('La sesión expiró, inicia sesión de nuevo');
  const rol = String(c.rol || c.role || c['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || '').toLowerCase();
  return { rol, nombre: c.nombre || c.name || c.unique_name || c.email || 'Usuario', email: c.email || c.sub || '' };
}

// Solo para el modo demo: fabrica un token con vigencia de 8 horas
export const fakeJwt = (u) =>
  enc({ alg: 'HS256', typ: 'JWT' }) + '.' +
  enc({ email: u.email, nombre: u.nombre, rol: u.rol, exp: Math.floor(Date.now() / 1000) + 8 * 3600 }) + '.demo';
