// Aquí se configura la app. Cambia cada bandera a true el mismo día en que Sebastián publique su ruta.
export const USE_MOCK = false; // true = datos de ejemplo sin internet, false = API real

export const USUARIOS_EN_API = true; // /usuarios. Publicada (contrato 2.3)
export const ALERTAS_EN_API = true; // /alertas. Publicada (contrato 2.3)
export const PEDIDOS_EN_API = true; // /pedidos (con correo al proveedor). Publicada el 24 nov (contrato 2.3)
export const FOTO_EN_API = false; // /productos/identificar y /productos/desde-foto. Meta: 26 nov (la primera foto se prueba con Sebastián)
export const PROVEEDORES_EN_API = false; // /proveedores/{id}/ruta (botón Ver ruta). Meta: 27 nov

// Dirección del stream de la cámara de la Raspberry. El celular y la Raspberry deben estar en la misma red.
export const CAMERA_URL = 'http://IP_DE_LA_RASPBERRY:8000/stream.mjpg';
