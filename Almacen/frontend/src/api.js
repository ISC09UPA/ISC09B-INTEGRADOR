// Todo el acceso a datos está aquí. Con USE_MOCK = true (src/config.js) la app funciona sola, con datos de ejemplo.
// Cuando el backend en Azure esté listo: USE_MOCK = false y ajustar BASE_URL. El contrato de la API está en docs/API.md.
import { guardar, leer, borrar } from './plataforma';
import { leerJwt, fakeJwt } from './jwt';
import { USE_MOCK, BASE_URL, CAMERA_URL, TIMEOUT_MS } from './config';

export { CAMERA_URL };

let token = '';
let alExpirar = () => {};
export const onExpira = (fn) => { alExpirar = fn; };

// Saca un mensaje legible de la respuesta de error del servidor (texto plano o JSON: message, mensaje, title, error)
function mensajeError(texto, status) {
  try {
    const j = JSON.parse(texto);
    const m = j.message || j.mensaje || j.title || j.error;
    if (m) return String(m);
  } catch {}
  return texto && texto.length < 200 ? texto : 'Error del servidor (' + status + ')';
}

// Una petición con tiempo límite, errores claros y respuesta vacía (204) permitida
async function pedir(path, init, conSesion = true) {
  if (BASE_URL.includes('TU-APP')) throw new Error('Falta configurar BASE_URL en src/config.js');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let r;
  try {
    r = await fetch(BASE_URL + path, { ...init, signal: ctl.signal });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión a internet.');
  } finally {
    clearTimeout(timer);
  }
  const texto = await r.text();
  if (r.status === 401 && conSesion) { alExpirar(); throw new Error('Sesión no autorizada'); }
  if (r.status === 403) throw new Error('No tienes permiso para realizar esta acción');
  if (!r.ok) {
    const e = new Error(mensajeError(texto, r.status));
    e.status = r.status;
    throw e;
  }
  if (!texto) return true; // 204 No Content u otra respuesta sin cuerpo
  try { return JSON.parse(texto); } catch { return texto; }
}

// Petición autenticada con el JWT. body = objeto (se envía como JSON); form = FormData (para fotos)
async function http(path, { method = 'GET', body, form } = {}) {
  try { leerJwt(token); } catch (e) { alExpirar(); throw e; }
  const headers = { Authorization: 'Bearer ' + token };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return pedir(path, { method, headers, body: form || (body !== undefined ? JSON.stringify(body) : undefined) });
}

const wait = (v, ms = 250) => new Promise((r) => setTimeout(() => r(v), ms));
const ago = (min) => Date.now() - min * 60000;

// ---------- datos de ejemplo (solo modo demo) ----------
let USERS = [
  { id: 1, email: 'admin@almacen.com', pass: 'admin123', rol: 'admin', nombre: 'Administrador' },
  { id: 2, email: 'operador@almacen.com', pass: 'op123', rol: 'operador', nombre: 'Luis Hernández' },
];
let productos = [
  { id: 1, nombre: 'Tornillos hexagonales', anaquel: 'A1', stock: 420, reorden: 150, max: 600, salidas30: 310 },
  { id: 2, nombre: 'Tuercas M8', anaquel: 'A1', stock: 95, reorden: 120, max: 500, salidas30: 380 },
  { id: 3, nombre: 'Cinta industrial', anaquel: 'A2', stock: 60, reorden: 25, max: 100, salidas30: 40 },
  { id: 4, nombre: 'Guantes de carga', anaquel: 'A2', stock: 140, reorden: 50, max: 200, salidas30: 90 },
  { id: 5, nombre: 'Cable calibre 12', anaquel: 'B1', stock: 38, reorden: 30, max: 120, salidas30: 110 },
  { id: 6, nombre: 'Cajas de cartón', anaquel: 'B1', stock: 260, reorden: 80, max: 300, salidas30: 150 },
  { id: 7, nombre: 'Etiquetas térmicas', anaquel: 'B2', stock: 12, reorden: 20, max: 80, salidas30: 70 },
];
const nom = (id) => productos.find((p) => p.id === id).nombre;
const mov = (id, pid, tipo, cant, min, usuario) => ({ id, productoId: pid, producto: nom(pid), tipo, cant, t: ago(min), usuario });
let movs = [
  mov(8, 7, 'salida', 10, 15, 'Luis Hernández'), mov(7, 2, 'salida', 40, 90, 'Luis Hernández'),
  mov(6, 6, 'entrada', 60, 180, 'Ana Torres'), mov(5, 5, 'salida', 12, 300, 'Luis Hernández'),
  mov(4, 1, 'salida', 50, 600, 'Ana Torres'), mov(3, 3, 'entrada', 30, 1500, 'Luis Hernández'),
  mov(2, 4, 'salida', 20, 1700, 'Ana Torres'), mov(1, 2, 'entrada', 100, 2900, 'Luis Hernández'),
];

// ---------- sesión ----------
export async function login(email, pass) {
  let t;
  if (USE_MOCK) {
    const u = USERS.find((x) => x.email === email && x.pass === pass);
    await wait();
    if (!u) throw new Error('Correo o contraseña incorrectos');
    t = fakeJwt(u);
  } else {
    try {
      t = (await pedir('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      }, false)).token;
    } catch (e) {
      if (e.status === 400 || e.status === 401) throw new Error('Correo o contraseña incorrectos');
      throw e;
    }
    if (!t) throw new Error('El servidor no devolvió un token de sesión');
  }
  const user = { ...leerJwt(t), token: t }; // aquí se revisa el JWT (formato, vigencia y rol)
  token = t;
  await guardar('jwt', t);
  return user;
}

// Al abrir la app: si hay un JWT guardado y sigue vigente, se entra directo
export async function restaurarSesion() {
  try {
    const t = await leer('jwt');
    if (!t) return null;
    const u = leerJwt(t);
    token = t;
    return { ...u, token: t };
  } catch {
    await borrar('jwt').catch(() => {});
    return null;
  }
}

export async function cerrarSesion() {
  token = '';
  await borrar('jwt').catch(() => {});
}

// ---------- productos ----------
// El backend puede mandar en cada producto "rotacion" y "diasAgotamiento" ya calculados en la nube;
// si no vienen, la pantalla de Estadísticas los calcula con salidas30 y stock.
export const getProductos = () =>
  USE_MOCK ? wait(productos.map((p) => ({ ...p, ultimo: movs.find((m) => m.productoId === p.id) })), 100) : http('/productos');

export const crearProducto = (p) => {
  if (!USE_MOCK) return http('/productos', { method: 'POST', body: p });
  productos.push({ ...p, id: Date.now(), salidas30: 0 });
  return wait(true);
};

export const eliminarProducto = (id) => {
  if (!USE_MOCK) return http('/productos/' + id, { method: 'DELETE' });
  productos = productos.filter((p) => p.id !== id);
  return wait(true);
};

export const setReorden = (id, reorden) => {
  if (!USE_MOCK) return http('/productos/' + id + '/reorden', { method: 'PUT', body: { reorden } });
  productos.find((p) => p.id === id).reorden = reorden;
  return wait(true);
};

// ---------- movimientos ----------
// mios = true: solo los del usuario de la sesión (el backend lo toma del token). En modo demo se filtra por nombre.
export const getMovimientos = ({ mios = false, usuario } = {}) =>
  USE_MOCK ? wait(movs.filter((m) => !mios || m.usuario === usuario), 100) : http(mios ? '/movimientos/mios' : '/movimientos');

// El usuario que registra NO se manda: el backend lo obtiene del token. "usuario" solo se usa en modo demo.
export const registrarMovimiento = async ({ productoId, tipo, cant, usuario }) => {
  if (!USE_MOCK) return http('/movimientos', { method: 'POST', body: { productoId, tipo, cant } });
  const p = productos.find((x) => x.id === productoId);
  if (!p) throw new Error('Elige un producto');
  if (!(cant > 0)) throw new Error('Escribe una cantidad mayor a 0');
  if (tipo === 'salida' && cant > p.stock) throw new Error('No hay suficientes existencias: quedan ' + p.stock);
  if (tipo === 'entrada' && p.stock + cant > p.max) throw new Error('Excede la capacidad del espacio (máx. ' + p.max + ')');
  p.stock += tipo === 'entrada' ? cant : -cant;
  if (tipo === 'salida') p.salidas30 += cant;
  movs.unshift({ id: Date.now(), productoId, producto: p.nombre, tipo, cant, t: Date.now(), usuario });
  return wait(true);
};

// ---------- identificación por foto ----------
// Envía la foto al servidor en Azure. Respuesta esperada: { encontrado, confianza, etiqueta, producto? }
export const identificarProducto = async (uri) => {
  if (!USE_MOCK) {
    const fd = new FormData();
    fd.append('foto', { uri, name: 'foto.jpg', type: 'image/jpeg' });
    try {
      return await http('/productos/identificar', { method: 'POST', form: fd });
    } catch (e) {
      if (e.status) throw new Error('El servidor no pudo analizar la foto');
      throw e;
    }
  }
  await wait(null, 1400);
  if (Math.random() < 0.7) {
    const p = productos[Math.floor(Math.random() * productos.length)];
    return { encontrado: true, confianza: 0.9, producto: { ...p, ultimo: movs.find((m) => m.productoId === p.id) } };
  }
  return { encontrado: false, etiqueta: 'Producto sin identificar' };
};

// ---------- usuarios (solo administrador) ----------
export const getUsuarios = () => (USE_MOCK ? wait(USERS.map(({ pass, ...u }) => u), 100) : http('/usuarios'));

export const crearUsuario = async (u) => {
  if (!USE_MOCK) return http('/usuarios', { method: 'POST', body: { nombre: u.nombre, email: u.email, password: u.pass, rol: u.rol } });
  if (USERS.some((x) => x.email === u.email)) throw new Error('Ese correo ya está registrado');
  USERS.push({ ...u, id: Date.now() });
  return wait(true);
};

export const eliminarUsuario = (id) => {
  if (!USE_MOCK) return http('/usuarios/' + id, { method: 'DELETE' });
  USERS = USERS.filter((x) => x.id !== id);
  return wait(true);
};

// ---------- pedidos de reorden ----------
let pedidos = [];
export const getPedidos = () => (USE_MOCK ? wait(pedidos.filter((x) => x.estado === 'pendiente'), 100) : http('/pedidos?estado=pendiente'));

export const crearPedido = async (productoId, cant) => {
  if (!USE_MOCK) return http('/pedidos', { method: 'POST', body: { productoId, cant } });
  if (!(cant > 0)) throw new Error('Escribe una cantidad mayor a 0');
  pedidos.push({ id: Date.now(), productoId, producto: nom(productoId), cant, estado: 'pendiente', t: Date.now() });
  return wait(true);
};

// Al recibir el pedido el backend registra la entrada (con el usuario del token) y suben las existencias
export const recibirPedido = async (id, usuario) => {
  if (!USE_MOCK) return http('/pedidos/' + id + '/recibir', { method: 'POST' });
  const x = pedidos.find((y) => y.id === id);
  await registrarMovimiento({ productoId: x.productoId, tipo: 'entrada', cant: x.cant, usuario });
  x.estado = 'recibido';
  return true;
};
