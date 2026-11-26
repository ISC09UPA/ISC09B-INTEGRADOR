// Todo el acceso a datos está aquí. La API real es la que publicó Sebastián en Azure (contrato del 12 nov 2026).
import { Platform } from 'react-native';
import { guardar, leer, borrar } from './plataforma';
import { leerJwt, fakeJwt } from './jwt';

import { USE_MOCK, USUARIOS_EN_API, ALERTAS_EN_API, PEDIDOS_EN_API, PROVEEDORES_EN_API, FOTO_EN_API, CAMERA_URL } from './banderas';
export { USE_MOCK, CAMERA_URL };
const real = (flag) => !USE_MOCK && flag;
export const hayRutas = USE_MOCK || PROVEEDORES_EN_API; // el botón Ver ruta solo aparece si hay de dónde sacar la ruta
const BASE_URL = 'https://api-almacen-srg3-h0h8gxbraechakar.norwayeast-01.azurewebsites.net/api';

let token = '';
let alExpirar = () => {};
export const onExpira = (fn) => { alExpirar = fn; };

// La API está en un plan B1: la primera llamada puede tardar. Se llama al abrir la app.
export const despertar = () => { if (!USE_MOCK) fetch(BASE_URL + '/salud').catch(() => {}); };

async function http(path, opt = {}) {
  try { leerJwt(token); } catch (e) { alExpirar(); throw e; }
  let r;
  try {
    r = await fetch(BASE_URL + path, {
      ...opt,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: opt.body && JSON.stringify(opt.body),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  if (r.status === 401) { alExpirar(); throw new Error('Sesión no autorizada'); }
  if (!r.ok) {
    let m = 'Error del servidor';
    try {
      const d = await r.json();
      m = d.error || d.title || (d.errors && Object.values(d.errors).flat().join(' ')) || m;
    } catch {}
    throw new Error(m);
  }
  return r.status === 204 ? null : r.json();
}
const wait = (v, ms = 250) => new Promise((r) => setTimeout(() => r(v), ms));
const ago = (min) => Date.now() - min * 60000;

// ---------- datos de ejemplo (solo con USE_MOCK = true) ----------
let USERS = [
  { id: 1, email: 'admin@almacen.com', rol: 'admin', nombre: 'Administrador' },
  { id: 2, email: 'operador@almacen.com', rol: 'operador', nombre: 'Luis Hernández' },
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

// ---------- conversión API -> forma que usa la app ----------
const ultimoDe = (u) => u && { tipo: String(u.tipoMovimiento).toLowerCase(), cant: u.cantidad, t: Date.parse(u.timestamp) };
const productoDeApi = (p) => ({
  id: p.id,
  nombre: p.nombre,
  anaquel: (p.ubicacion && p.ubicacion.anaquelId) || 'Sin espacio',
  stock: p.existencia,
  reorden: p.puntoReorden,
  // capacidad null = sin límite; para dibujar la barra se usa una escala razonable
  max: p.capacidad || Math.max(p.existencia * 2, p.puntoReorden * 3, 1),
  salidas30: p.salidas30Dias || 0,
  proveedorId: p.proveedorId,
  ultimo: ultimoDe(p.ultimoMovimiento),
});
const movDeApi = (m) => ({
  id: m.id, productoId: m.productoId, producto: m.productoNombre,
  tipo: String(m.tipoMovimiento).toLowerCase(), cant: m.cantidad, t: Date.parse(m.fechaHora), usuario: m.usuarioNombre,
});

// ---------- sesión ----------
export async function login(usuario, pass) {
  let t, u;
  if (USE_MOCK) {
    const x = USERS.find((y) => y.email === usuario); // demo: acepta cualquier contraseña
    await wait();
    if (!x) throw new Error('Usuario o contraseña incorrectos');
    t = fakeJwt(x);
    u = { id: x.id, email: x.email, nombre: x.nombre, rol: x.rol };
  } else {
    let r;
    try {
      r = await fetch(BASE_URL + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, contrasena: pass }) });
    } catch {
      throw new Error('No se pudo conectar con el servidor');
    }
    if (r.status === 400 || r.status === 401) throw new Error('Usuario o contraseña incorrectos');
    if (!r.ok) throw new Error('El servidor no pudo iniciar sesión');
    const d = await r.json();
    t = d.token;
    u = { id: d.usuario.id, email: d.usuario.usuario, nombre: d.usuario.nombre, rol: d.usuario.rol };
  }
  if (u.rol !== 'admin' && u.rol !== 'operador') throw new Error('Tu cuenta no tiene un rol válido.'); // valor exacto
  leerJwt(t); // aquí se revisa el JWT (formato y vigencia)
  token = t;
  await guardar('jwt', t);
  await guardar('user', JSON.stringify(u));
  return { ...u, token: t };
}

// Al abrir la app: si hay un JWT guardado y sigue vigente, se entra directo
export async function restaurarSesion() {
  try {
    const t = await leer('jwt');
    const u = JSON.parse(await leer('user'));
    leerJwt(t);
    token = t;
    return { ...u, token: t };
  } catch {
    await borrar('jwt').catch(() => {});
    await borrar('user').catch(() => {});
    return null;
  }
}

export async function cerrarSesion() {
  token = '';
  await borrar('jwt').catch(() => {});
  await borrar('user').catch(() => {});
}

// ---------- productos ----------
export const getProductos = async () => {
  if (!USE_MOCK) return (await http('/productos')).map(productoDeApi);
  return wait(productos.map((p) => ({ ...p, proveedorId: 1, ultimo: movs.find((m) => m.productoId === p.id) })), 100);
};

// p = { nombre, anaquel, stock, reorden, max, peso, imagenUrl? }
export const crearProducto = async (p) => {
  if (p.stock > p.max) throw new Error('Las existencias iniciales no caben en la capacidad del espacio.');
  if (USE_MOCK) {
    productos.push({ ...p, id: Date.now(), salidas30: 0 });
    return wait(true);
  }
  // Orden del contrato: 1) buscar espacio libre (si no hay, no se crea nada), 2) crear producto,
  // 3) asignar el espacio (si falla, se borra el producto), 4) entrada inicial
  const espacios = await http('/espacios?anaquelId=' + encodeURIComponent(p.anaquel));
  const libre = espacios.find((e) => !e.productoId);
  if (!libre) throw new Error('No hay espacio libre: da de baja un producto o libera un espacio.');
  const nuevo = await http('/productos', { method: 'POST', body: { nombre: p.nombre, pesoUnitarioGramos: p.peso, puntoReorden: p.reorden, imagenUrl: p.imagenUrl } });
  try {
    await http('/espacios/' + libre.id, { method: 'PUT', body: { productoId: nuevo.id, capacidad: p.max, taraGramos: null } });
  } catch (e) {
    await http('/productos/' + nuevo.id, { method: 'DELETE' }).catch(() => {});
    throw e;
  }
  if (p.stock > 0) {
    try {
      await http('/movimientos', { method: 'POST', body: { productoId: nuevo.id, tipoMovimiento: 'ENTRADA', cantidad: p.stock } });
    } catch (e) {
      throw new Error('El producto se creó, pero no se registró el stock inicial: ' + e.message);
    }
  }
  return true;
};

export const eliminarProducto = async (id) => {
  if (!USE_MOCK) return http('/productos/' + id, { method: 'DELETE' });
  productos = productos.filter((p) => p.id !== id);
  return wait(true);
};

export const setReorden = async (id, reorden) => {
  if (!USE_MOCK) return http('/productos/' + id + '/reorden', { method: 'PUT', body: { puntoReorden: reorden } });
  productos.find((p) => p.id === id).reorden = reorden;
  return wait(true);
};

// ---------- movimientos ----------
// Con usuario = historial propio (operador). Sin usuario = historial general (admin).
export const getMovimientos = async (usuario) => {
  if (!USE_MOCK) return (await http(usuario ? '/movimientos/mios?limite=50' : '/movimientos?limite=50')).map(movDeApi);
  return wait(movs.filter((m) => !usuario || m.usuario === usuario), 100);
};

// Respuesta de la API: { movimiento, producto, alerta }. "alerta" es la que se creó o se atendió con este movimiento, o null.
export const registrarMovimiento = async ({ productoId, tipo, cant, usuario }) => {
  if (!USE_MOCK) return http('/movimientos', { method: 'POST', body: { productoId, tipoMovimiento: tipo.toUpperCase(), cantidad: cant } });
  const p = productos.find((x) => x.id === productoId);
  if (!p) throw new Error('Elige un producto');
  if (!(cant > 0)) throw new Error('Escribe una cantidad mayor a 0');
  if (tipo === 'salida' && cant > p.stock) throw new Error('No hay suficientes existencias: quedan ' + p.stock);
  if (tipo === 'entrada' && p.stock + cant > p.max) throw new Error('Excede la capacidad del espacio (máx. ' + p.max + ')');
  const antes = p.stock <= p.reorden;
  p.stock += tipo === 'entrada' ? cant : -cant;
  const ahora = p.stock <= p.reorden;
  if (tipo === 'salida') p.salidas30 += cant;
  movs.unshift({ id: Date.now(), productoId, producto: p.nombre, tipo, cant, t: Date.now(), usuario });
  await wait(null);
  return { alerta: !antes && ahora ? { estado: 'ACTIVA', productoNombre: p.nombre } : antes && !ahora ? { estado: 'ATENDIDA', productoNombre: p.nombre } : null };
};

// ---------- foto del producto ----------
// Con FOTO_EN_API = true envía la foto a Azure. Respuesta esperada: { encontrado, confianza, etiqueta, producto? }
export const identificarProducto = async (uri) => {
  if (FOTO_EN_API) {
    const fd = new FormData();
    if (Platform.OS === 'web') fd.append('foto', await (await fetch(uri)).blob(), 'foto.jpg');
    else fd.append('foto', { uri, name: 'foto.jpg', type: 'image/jpeg' });
    const r = await fetch(BASE_URL + '/productos/identificar', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd });
    if (!r.ok) {
      let m = 'El servidor no pudo analizar la foto';
      try { m = (await r.json()).error || m; } catch {}
      throw new Error(m);
    }
    const d = await r.json();
    return { ...d, producto: d.producto ? productoDeApi(d.producto) : null };
  }
  // Simulación: elige un producto al azar de los que hay en el almacén
  await wait(null, 1400);
  const ps = await getProductos();
  if (ps.length && Math.random() < 0.7) return { encontrado: true, confianza: 0.9, producto: ps[Math.floor(Math.random() * ps.length)] };
  return { encontrado: false, etiqueta: 'Producto sin identificar' };
};

// El operador solo da de alta productos desde la foto. El producto queda sin espacio hasta que un administrador se lo asigne.
// p = { imagenUrl, nombre, peso, reorden }
export const crearDesdeFoto = async (p) => {
  if (USE_MOCK) {
    productos.push({ id: Date.now(), nombre: p.nombre, anaquel: 'Sin espacio', stock: 0, reorden: p.reorden, max: 1, salidas30: 0 });
    return wait(true);
  }
  if (!FOTO_EN_API) throw new Error('El alta desde foto todavía no está disponible en el servidor.');
  return http('/productos/desde-foto', { method: 'POST', body: { imagenUrl: p.imagenUrl, nombre: p.nombre, pesoUnitarioGramos: p.peso, puntoReorden: p.reorden } });
};

// ---------- espacios (para asignar un espacio a los productos creados desde foto) ----------
let espaciosLibres = [{ id: 'A1-E3', anaquelId: 'A1', productoId: null }, { id: 'B2-E2', anaquelId: 'B2', productoId: null }];
export const getEspacios = async (anaquelId) =>
  USE_MOCK ? wait(espaciosLibres, 100) : http('/espacios' + (anaquelId ? '?anaquelId=' + encodeURIComponent(anaquelId) : ''));

// Contrato 4.1: 1) PUT del espacio con la capacidad, 2) si hay existencia inicial, ENTRADA
export const asignarEspacio = async (espacioId, productoId, capacidad, stock = 0) => {
  if (stock > capacidad) throw new Error('La existencia inicial no cabe en la capacidad del espacio.');
  if (!USE_MOCK) {
    await http('/espacios/' + espacioId, { method: 'PUT', body: { productoId, capacidad, taraGramos: null } });
    if (stock > 0) {
      try {
        await http('/movimientos', { method: 'POST', body: { productoId, tipoMovimiento: 'ENTRADA', cantidad: stock } });
      } catch (e) {
        throw new Error('El espacio se asignó, pero no se registró la existencia inicial: ' + e.message);
      }
    }
    return true;
  }
  const e = espaciosLibres.find((x) => x.id === espacioId);
  const p = productos.find((x) => x.id === productoId);
  p.anaquel = e.anaquelId;
  p.max = capacidad;
  p.stock = stock;
  espaciosLibres = espaciosLibres.filter((x) => x.id !== espacioId);
  return wait(true);
};

// ---------- usuarios (solo administrador) ----------
const usuariosLocal = USE_MOCK || !USUARIOS_EN_API;
export const getUsuarios = async () =>
  usuariosLocal
    ? wait(USERS.map(({ pass, ...u }) => u), 100)
    : (await http('/usuarios')).map((u) => ({ id: u.id, email: u.usuario, nombre: u.nombre, rol: u.rol }));

// u = { nombre, email (es el usuario), pass, rol }
export const crearUsuario = async (u) => {
  if (!usuariosLocal) return http('/usuarios', { method: 'POST', body: { nombre: u.nombre, usuario: u.email, contrasena: u.pass, rol: u.rol } });
  if (USERS.some((x) => x.email === u.email)) throw new Error('Ese usuario ya existe.');
  USERS.push({ ...u, id: Date.now() });
  return wait(true);
};

export const eliminarUsuario = (id) => {
  if (!usuariosLocal) return http('/usuarios/' + id, { method: 'DELETE' });
  USERS = USERS.filter((x) => x.id !== id);
  return wait(true);
};

// ---------- alertas (las crea el backend) ----------
// Alerta: { id, productoId, productoNombre, existencia, puntoReorden, estado, fechaCreacion, pedidoId }
export const getAlertas = async () => {
  if (real(ALERTAS_EN_API)) return http('/alertas?estado=ACTIVA');
  // Mientras la ruta no exista: se calculan con la lista de productos
  const ps = await getProductos();
  return ps
    .filter((p) => p.stock <= p.reorden && p.anaquel !== 'Sin espacio')
    .map((p) => ({ id: p.id, productoId: p.id, productoNombre: p.nombre, existencia: p.stock, puntoReorden: p.reorden, estado: 'ACTIVA', pedidoId: null }));
};

// ---------- pedidos de reabastecimiento ----------
// Con la API, el backend manda el correo al proveedor y al recibir registra la ENTRADA (origen PEDIDO).
// Sin la API, los pedidos viven en la app y al recibirlos se registra la entrada desde aquí.
let pedidos = [];
const pedidoDeApi = (x) => ({
  id: x.id, productoId: x.productoId, producto: x.productoNombre, cant: x.cantidad, t: Date.parse(x.fechaSolicitud),
  proveedor: x.proveedor, correoEnviado: x.correoEnviado, alertaId: x.alertaId,
});

export const getPedidos = async () =>
  real(PEDIDOS_EN_API) ? (await http('/pedidos?estado=SOLICITADO')).map(pedidoDeApi) : wait(pedidos.filter((x) => x.estado === 'pendiente'), 50);

export const crearPedido = async (productoId, cant, nombre) => {
  if (real(PEDIDOS_EN_API)) return pedidoDeApi(await http('/pedidos', { method: 'POST', body: { productoId, cantidad: cant } }));
  if (!(cant > 0)) throw new Error('Escribe una cantidad mayor a 0');
  if (pedidos.some((x) => x.productoId === productoId && x.estado === 'pendiente')) throw new Error('Ya hay un pedido en camino para este producto.');
  const x = {
    id: Date.now(), productoId, producto: nombre, cant, estado: 'pendiente', t: Date.now(),
    proveedor: USE_MOCK ? { id: 1, nombre: 'Tornillería del Centro' } : null, correoEnviado: USE_MOCK ? true : null,
  };
  pedidos.push(x);
  return x;
};

// Con la API responde { pedido, movimiento, producto, alerta }
export const recibirPedido = async (id, usuario) => {
  if (real(PEDIDOS_EN_API)) return http('/pedidos/' + id + '/recibir', { method: 'PUT', body: {} });
  const x = pedidos.find((y) => y.id === id);
  const r = await registrarMovimiento({ productoId: x.productoId, tipo: 'entrada', cant: x.cant, usuario });
  x.estado = 'recibido';
  return r;
};

export const cancelarPedido = async (id) => {
  if (real(PEDIDOS_EN_API)) return http('/pedidos/' + id + '/cancelar', { method: 'PUT' });
  pedidos = pedidos.filter((y) => y.id !== id);
  return true;
};

// ---------- ruta del proveedor al almacén (solo texto: distancia y tiempo) ----------
export const getRuta = async (proveedorId) => {
  if (real(PROVEEDORES_EN_API)) return http('/proveedores/' + proveedorId + '/ruta');
  if (USE_MOCK) return wait({ distanciaKm: 42, minutosEstimados: 55, mapaPngBase64: MAPA_EJEMPLO });
  throw new Error('Sin ruta');
};

// Mapa de ejemplo para el modo demo (en la API real llega en mapaPngBase64)
const MAPA_EJEMPLO = 'iVBORw0KGgoAAAANSUhEUgAAAPAAAACWCAIAAABvmpKCAAAD00lEQVR42u3dMY4TQRBA0T0BCcch5hJcgWtxIRJCIgIiAp9gLVlaIYxmxt6u7qqaJzXx19Y8jcy4p/3y4+cvy2qzXq7/fv+5zF+6uhELaF2gDVoXaBdYF2hdXaB1gTZoXaANWhdoF1gXaF1doHWBNmhdoA1aF2gXWBdoXV2gdYE2aF2gDVoXaF1doHV1gdYF2qB1gTZo3f3u98+fgNYt3706vl9A65bs/lfzcNNA687obmgeaxpo3fDuruaBpoHWBdoF1s0M2rLi1kHNt+X0Ud3s3Q9fvvrIoduhe6V8W0Drlu++aQZat3z3b80HTXsOrZuxe0/5iGnfFOpm7G5o3jBtL4duxu6uZrvtdGt0H6JsP7Ru6m4qzUDrBlKerxlo3SjNXsHSLdM9cmMGWrdA9/jHDKB1s3cf+sQMtG7q7qP//wNaN2n3uacZQOtm7D79YA5o3XTd9zxmBlo3Uff9X5oArZulO+T7P6B1U3RHfZsNtO7i7ti9GUDrruwO32YEtO6ybsSmOaB1F3Tj9n8CrTu7G7qbGWjdqd3ovflA68Z2jzzEGPiaCdC6C16RintpaiVoq8d6TvA/701VX+7QnV+Fmn9j9pFDd41goMFKuustA1+gge4mGGjdGYL9NDLQWZ4HD7kHAw103mcRhfYlA92zu/xzMNBAZ6FszkBn6eZ5FgE00PM0mzPQqbsJHwkDbdBRms0Z6DLdtAeAA23QITdmcwa6QNdX0ED3GXSJA8CBNuiQ//+ZM9BJu889zTBnoNN17XoDus+gi56XDLRBh3xpYs5Ap+iO+jbbnIFe321wXjLQBh2yN8OcgV7Wjdg0Z85Ar+l6FQroPoPudwA40CcddPTefHOeB9o6w7GcJ1nu0BdvX/vI0WTQZzgAHOizDHryK4BAAx3YPc95yUA3/4NXvZsNNNB9NAMNdCvNQAM9z7EjuYDO/gcn/LkGoIGOdTz5eC6ggQ507NBEoHP9weV+GApooMc7BgvoAq9COZJLtwBoP3Om2wF09CdjsIBOsY3TcQK6i0Ffvn3c/oP9bp9uAdBXx/dr5ocKFxjoWM23leSxMVhAD9D8nGkXWHcZ6F3Nx027wLrlQbvAuh1Au8C6GUEf1Pxm2gXWbXKHdoF1gXaBdYF2gYGONu0C684APXBtaHYwplXy9NHde7M7lm7P3XYusO4ZX8HS1QVaF2iD1gXaoHWBdoF1gdbVBVoXaIPWBdqgdYHW1QVaVxdoXaANWhdog9YFWlcXaF1doHWBNmhdoA1aF2hdXaB1dYHWBdqgdYE2aF2gdXWB1tUFWrdj9xWPgCQFGKpkYAAAAABJRU5ErkJggg==';
