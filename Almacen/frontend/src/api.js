// Todo el acceso a datos está aquí. Con USE_MOCK = true la app funciona sola, con datos de ejemplo.
// Cuando tu compañero del backend tenga la API en Azure: pon USE_MOCK = false y ajusta BASE_URL.
const USE_MOCK = true;
const BASE_URL = 'https://TU-APP.azurewebsites.net/api';
export const CAMERA_URL = 'http://IP_DE_LA_RASPBERRY:8000/stream.mjpg'; // stream de la cámara del almacén

let token = '';
async function http(path, opt = {}) {
  const r = await fetch(BASE_URL + path, {
    ...opt,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: opt.body && JSON.stringify(opt.body),
  });
  if (!r.ok) throw new Error((await r.text()) || 'Error del servidor');
  return r.json();
}
const wait = (v, ms = 250) => new Promise((r) => setTimeout(() => r(v), ms));
const ago = (min) => Date.now() - min * 60000;

// ---------- datos de ejemplo ----------
const USERS = [
  { email: 'admin@almacen.com', pass: 'admin123', rol: 'admin', nombre: 'Administrador' },
  { email: 'operador@almacen.com', pass: 'op123', rol: 'operador', nombre: 'Luis Hernández' },
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

// ---------- funciones que usa la app ----------
export const login = (email, pass) => {
  if (!USE_MOCK) return http('/auth/login', { method: 'POST', body: { email, pass } }).then((r) => { token = r.token; return r; });
  const u = USERS.find((x) => x.email === email && x.pass === pass);
  return u ? wait(u) : wait().then(() => { throw new Error('Correo o contraseña incorrectos'); });
};

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

export const getMovimientos = (usuario) =>
  USE_MOCK ? wait(movs.filter((m) => !usuario || m.usuario === usuario), 100) : http('/movimientos' + (usuario ? '?usuario=' + encodeURIComponent(usuario) : ''));

export const registrarMovimiento = async ({ productoId, tipo, cant, usuario }) => {
  if (!USE_MOCK) return http('/movimientos', { method: 'POST', body: { productoId, tipo, cant, usuario } });
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

// Envía la foto al servidor en Azure. Respuesta esperada: { encontrado, confianza, etiqueta, producto? }
export const identificarProducto = async (uri) => {
  if (!USE_MOCK) {
    const fd = new FormData();
    fd.append('foto', { uri, name: 'foto.jpg', type: 'image/jpeg' });
    const r = await fetch(BASE_URL + '/productos/identificar', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd });
    if (!r.ok) throw new Error('El servidor no pudo analizar la foto');
    return r.json();
  }
  await wait(null, 1400);
  if (Math.random() < 0.7) {
    const p = productos[Math.floor(Math.random() * productos.length)];
    return { encontrado: true, confianza: 0.9, producto: { ...p, ultimo: movs.find((m) => m.productoId === p.id) } };
  }
  return { encontrado: false, etiqueta: 'Producto sin identificar' };
};
